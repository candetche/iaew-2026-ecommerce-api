import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createWebServer } from '../src/web.js';
import { verifyApproval } from '../src/security.js';
import { runTurn, replayOperation } from '../src/host.js';
const ID = '507f1f77bcf86cd799439011';
const packet = (type, data = {}, id = randomUUID()) => ({ version: 1, type, requestId: id, ...data });
function setup() {
  const backend = { state: 'pendiente', stock: 10, events: 0, postCalls: 0, keys: [], closed: 0 };
  const connect = async () => {
    const secret = randomUUID() + randomUUID();
    return { approvalSecret: secret, transport: { close: async () => {} }, client: {
      close: async () => { backend.closed++; }, listTools: async () => ({ tools: [] }),
      readResource: async () => ({ contents: [{ uri: 'iaew://docs/pedidos', text: 'Documentación de pedidos.' }] }),
      callTool: async request => {
        if (request.name === 'confirmar_pedido') {
          const grant = verifyApproval(request._meta?.approval, { pedidoId: ID, secret });
          backend.postCalls++; backend.keys.push(grant.key);
          if (backend.state === 'pendiente') { backend.stock--; backend.events++; backend.state = 'confirmado'; }
          else assert.equal(grant.key, backend.keys[0]);
          return { structuredContent: { status: 'ok', pedidoId: ID, estado: backend.state, repetido: backend.postCalls > 1 } };
        }
        return { structuredContent: { status: 'ok', pedidoId: ID, estado: backend.state } };
      }
    } };
  };
  return { connect, backend };
}
async function open(app, overrides = {}) {
  const bootstrap = await fetch(app.url);
  const cookie = bootstrap.headers.get('set-cookie').split(';')[0];
  const ws = new WebSocket(app.url.replace('http:', 'ws:') + '/ws', { headers: { Origin: app.url, Cookie: cookie, ...overrides } });
  const messages = []; const waiters = [];
  ws.on('message', raw => { const message = JSON.parse(raw); messages.push(message); for (const fn of [...waiters]) fn(message); });
  const wait = (predicate, ms = 3000) => {
    const prior = messages.find(predicate); if (prior) return Promise.resolve(prior);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(fn), 1); reject(new Error('WAIT_TIMEOUT')); }, ms);
      const fn = message => { if (predicate(message)) { clearTimeout(timer); waiters.splice(waiters.indexOf(fn), 1); resolve(message); } };
      waiters.push(fn);
    });
  };
  await once(ws, 'open'); await wait(m => m.type === 'session.ready');
  return { ws, messages, wait, send: message => ws.send(JSON.stringify(message)), close: () => ws.close() };
}
async function withWeb(options, action) {
  const fixture = setup(); const app = await createWebServer({ port: 0, deterministic: true, connect: fixture.connect, ...options });
  try { await action(app, fixture.backend); } finally { await app.close(); }
}
test('WebSocket rechaza Origin ajeno y cookie ausente', async () => {
  await withWeb({}, async app => {
    const rejected = headers => new Promise(resolve => {
      const ws = new WebSocket(app.url.replace('http:', 'ws:') + '/ws', { headers });
      ws.on('unexpected-response', (_req, res) => { res.resume(); ws.terminate(); resolve(res.statusCode); }); ws.on('error', () => {});
    });
    assert.equal(await rejected({ Origin: 'http://malicioso.invalid' }), 403);
    assert.equal(await rejected({ Origin: app.url }), 403);
  });
});
test('resource explícito, JSON inválido y requestId repetido no ejecutan tools', async () => {
  await withWeb({}, async (app, backend) => {
    const user = await open(app);
    user.ws.send('no json'); await user.wait(m => m.code === 'MESSAGE_INVALID');
    const request = packet('resource.read', { uri: 'iaew://docs/pedidos' }); user.send(request);
    assert.match((await user.wait(m => m.type === 'resource.result')).text, /Documentación/);
    await user.wait(m => m.type === 'operation.done'); user.send(request);
    await user.wait(m => m.code === 'DUPLICATE_REQUEST'); assert.equal(backend.postCalls, 0);
  });
});
test('aprobación de otra sesión rechazada; replay original conserva clave y efecto único', async () => {
  await withWeb({}, async (app, backend) => {
    const a = await open(app), b = await open(app);
    const action = packet('chat.send', { text: `confirmar ${ID}` }); a.send(action);
    const approval = await a.wait(m => m.type === 'approval.requested');
    b.send(packet('approval.respond', { approvalId: approval.approvalId, decision: 'approve' }));
    await b.wait(m => m.code === 'APPROVAL_INVALID'); assert.equal(backend.postCalls, 0);
    a.send(packet('approval.respond', { approvalId: approval.approvalId, decision: 'approve' }));
    const result = await a.wait(m => m.type === 'operation.result'); await a.wait(m => m.type === 'operation.done');
    assert.equal(result.result.estado, 'confirmado');
    b.send(packet('operation.replay', { operationId: result.operationId })); await b.wait(m => m.code === 'REPLAY_UNAVAILABLE');
    a.send(packet('operation.replay', { operationId: result.operationId }));
    const replay = await a.wait(m => m.type === 'operation.result' && m.result.repetido);
    assert.equal(replay.result.repetido, true); assert.equal(backend.stock, 9); assert.equal(backend.events, 1);
    assert.equal(backend.keys[0], backend.keys[1]);
    assert.equal(b.messages.some(m => m.type === 'operation.result'), false);
    assert.doesNotMatch(JSON.stringify(a.messages), /approvalSecret|access_token|signature|"approval":/);
  });
});
test('rechazo, expiración y desconexión no despachan la mutación', async () => {
  await withWeb({ approvalTimeoutMs: 40 }, async (app, backend) => {
    const a = await open(app); const request = packet('chat.send', { text: `confirmar ${ID}` }); a.send(request);
    const approval = await a.wait(m => m.type === 'approval.requested');
    await a.wait(m => m.type === 'operation.done');
    a.send(packet('approval.respond', { approvalId: approval.approvalId, decision: 'approve' }));
    await a.wait(m => m.code === 'APPROVAL_INVALID'); assert.equal(backend.postCalls, 0);
    const b = await open(app); b.send(packet('chat.send', { text: `confirmar ${ID}` }));
    await b.wait(m => m.type === 'approval.requested'); b.close();
    await new Promise(resolve => setTimeout(resolve, 70)); assert.equal(backend.postCalls, 0);
    assert.ok(backend.closed >= 1);
  });
});
test('límites de mensajes y payload impiden trabajo adicional', async () => {
  await withWeb({ limits: { connections: 4, messagesPerMinute: 2, requestIds: 100, operations: 20 } }, async (app, backend) => {
    const a = await open(app);
    a.send(packet('chat.send', { text: 'x'.repeat(4097) })); await a.wait(m => m.code === 'MESSAGE_INVALID');
    a.send(packet('chat.send', { text: 'sin ID' })); await a.wait(m => m.type === 'operation.done');
    a.send(packet('chat.send', { text: `confirmar ${ID}` })); await a.wait(m => m.code === 'RATE_LIMIT');
    assert.equal(backend.postCalls, 0);
    const b = await open(app); b.ws.send('x'.repeat(9000));
    const [code] = await once(b.ws, 'close'); assert.equal(code, 1009);
  });
});
test('resultado autoritativo permanece aunque el modelo contradiga o esté vacío', async () => {
  const client = { listTools: async () => ({ tools: [] }), callTool: async () => ({ structuredContent: { status: 'ok', pedidoId: ID, estado: 'confirmado' } }) };
  for (const comment of ['El pedido está cancelado.', '']) {
    const events = [];
    const output = await runTurn({ text: `consulta ${ID}`, client, onEvent: event => events.push(event),
      askModel: async ({ body }) => body.tools ? { tool_calls: [{ function: { name: 'consultar_estado_pedido', arguments: { pedidoId: ID } } }] } : { content: comment } });
    assert.equal(JSON.parse(output.split('\n')[0]).estado, 'confirmado');
    assert.equal(events.find(e => e.type === 'operation.result').result.estado, 'confirmado');
  }
  await assert.rejects(replayOperation({ operationId: 'ajeno', operations: new Map(), client }), /REPLAY_UNAVAILABLE/);
});


test('aprobación web muestra el deadline efectivo restante y parcial no habilita replay', async () => {
  await withWeb({ turn: async options => {
    await options.approvalQuestion(`Pedido: ${ID}`, options.signal, Date.now() + 60);
    options.onEvent({ type: 'operation.result', operationId: options.operationId,
      result: { status: 'error', code: 'PARTIAL', resultado: 'VERIFICAR_ESTADO' }, replayAvailable: false });
    return 'Estado indeterminado';
  } }, async (app, backend) => {
    const user = await open(app);
    user.send(packet('chat.send', { text: `confirmar ${ID}` }));
    const approval = await user.wait(m => m.type === 'approval.requested');
    assert.ok(Date.parse(approval.expiresAt) <= Date.now() + 60);
    const result = await user.wait(m => m.type === 'operation.result');
    assert.equal(result.result.resultado, 'VERIFICAR_ESTADO'); assert.equal(result.replayAvailable, false);
    assert.equal(backend.postCalls, 0);
  });
});


test('replay fallido o vencido no conserva permiso para otra llamada', async () => {
  const operations = new Map([['original', { successful: true, expiresAt: Date.now()+1000,
    approval: 'fixture', intent: { action: 'confirmar_pedido', pedidoId: ID } }]]);
  let calls = 0;
  const client = { callTool: async () => { calls++; throw new Error('timeout'); } };
  const result = await replayOperation({ operationId: 'original', operations, client });
  assert.equal(result.resultado, 'VERIFICAR_ESTADO'); assert.equal(operations.size, 0);
  await assert.rejects(replayOperation({ operationId: 'original', operations, client }), /REPLAY_UNAVAILABLE/);
  operations.set('vencido', { successful: true, expiresAt: Date.now()-1 });
  await assert.rejects(replayOperation({ operationId: 'vencido', operations, client }), /REPLAY_UNAVAILABLE/);
  assert.equal(calls, 1);
});
