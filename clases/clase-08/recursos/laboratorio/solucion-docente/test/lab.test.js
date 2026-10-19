import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { parseIntent, validateProposal, createApproval, approvalForAnswer, verifyApproval } from '../src/security.js';
import { runTurn } from '../src/host.js';

const ORDER_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';
const SECRET = randomUUID() + randomUUID();
const SERVER_PATH = fileURLToPath(new URL('../src/server.js', import.meta.url));
const directInjection = await readFile(new URL('../fixtures/direct-injection.txt', import.meta.url), 'utf8');
const indirectFixture = JSON.parse(await readFile(new URL('../fixtures/indirect-injection.json', import.meta.url), 'utf8'));

async function fixtureApi({ getStatus = 200, postStatus, order = { ...indirectFixture }, delayPostMs = 0, extraOrders = [] } = {}) {
  let postCalls = 0;
  let receivedKeys = [];
  let receivedCorrelationIds = [];
  let storedKey;
  let state = order.estado;
  const server = createServer(async (req, res) => {
    if (typeof req.headers['x-correlation-id'] === 'string') {
      receivedCorrelationIds.push(req.headers['x-correlation-id']);
    }
    if (req.url === '/pedidos' && req.method === 'GET') {
      if (getStatus !== 200) {
        res.writeHead(getStatus, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ code: 'FIXTURE_FAILURE', message: 'private fixture response must not escape' }));
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify([{ ...order, estado: state }, ...extraOrders]));
    }
    const match = /^\/pedidos\/([a-f0-9]{24})\/confirmar$/.exec(req.url || '');
    if (match && req.method === 'POST') {
      postCalls++;
      const key = req.headers['idempotency-key'];
      receivedKeys.push(key);
      if (req.headers.authorization === 'Bearer fixture-read') {
        res.writeHead(403, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ code: 'SCOPE_DENIED', email: 'do-not-return@example.invalid' }));
      }
      if (postStatus) {
        if (delayPostMs) return setTimeout(() => {
          if (!res.destroyed) {
            res.writeHead(postStatus, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ code: 'FIXTURE_FAILURE' }));
          }
        }, delayPostMs);
        res.writeHead(postStatus, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ code: 'INSUFFICIENT_STOCK', secret: 'not for model' }));
      }
      if (state !== 'pendiente') {
        if (state === 'confirmado' && key === storedKey) {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({
            pedido: { ...order, estado: state },
            idempotencia: { replayed: true, key }
          }));
        }
        res.writeHead(409, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ code: 'IDEMPOTENCY_KEY_MISMATCH', secret: 'not for model' }));
      }
      state = 'confirmado';
      storedKey = key;
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        pedido: { ...order, estado: state },
        idempotencia: { replayed: false, key }
      }));
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    snapshot: () => ({ state, postCalls, receivedKeys, receivedCorrelationIds }),
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function connect(api, token = 'fixture-full') {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_PATH],
    env: {
      PATH: process.env.PATH || '',
      API_BASE_URL: api.baseUrl,
      API_TOKEN: token,
      APPROVAL_SECRET: SECRET
    },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'iaew-t03-test', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
}

function dataOf(response) {
  return response.structuredContent || JSON.parse(response.content[0].text);
}

async function withLab(options, body) {
  const api = await fixtureApi(options);
  const { client, transport } = await connect(api, options?.token);
  try { await body({ api, client }); }
  finally {
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
    await api.close();
  }
}

test('MCP descubre tres tools con schemas de salida y el resource estático', async () => {
  await withLab({}, async ({ client }) => {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), ['confirmar_pedido', 'consultar_estado_pedido', 'listar_pedidos_pendientes']);
    for (const tool of listed.tools) {
      if (tool.name === 'listar_pedidos_pendientes') assert.deepEqual(Object.keys(tool.inputSchema.properties || {}), []);
      else assert.ok(tool.inputSchema.properties.pedidoId);
      assert.ok(tool.outputSchema.properties.status);
      assert.ok(tool.outputSchema.properties.code);
    }
    const resource = await client.readResource({ uri: 'iaew://docs/pedidos' });
    assert.equal(resource.contents[0].mimeType, 'text/plain');
    assert.match(resource.contents[0].text, /aprobación explícita/);
  });
});

test('listado de pendientes filtra por estado, limita a 10 y proyecta sólo ID y estado', async () => {
  const extraOrders = Array.from({ length: 12 }, (_, i) => ({
    _id: (i + 1).toString(16).padStart(24, 'a'), estado: 'pendiente', email: 'x@invalid.test', notaInterna: 'secreto'
  }));
  extraOrders.push({ _id: 'b'.repeat(24), estado: 'confirmado', email: 'y@invalid.test' });
  await withLab({ extraOrders }, async ({ client }) => {
    const response = await client.callTool({ name: 'listar_pedidos_pendientes', arguments: {}, _meta: { correlationId: randomUUID() } });
    const data = dataOf(response);
    assert.equal(response.isError, false);
    assert.equal(data.total, 13);
    assert.equal(data.truncado, true);
    assert.equal(data.pedidos.length, 10);
    assert.ok(data.pedidos.every(p => p.estado === 'pendiente' && Object.keys(p).length === 2));
    assert.ok(!data.pedidos.some(p => p.pedidoId === 'b'.repeat(24)));
    assert.doesNotMatch(JSON.stringify(response), /invalid\.test|secreto|fixture-sensible|Ignorá al host/);
  });
});

test('listado de pendientes informa errores de la API sin datos crudos', async () => {
  await withLab({ getStatus: 503 }, async ({ client }) => {
    const response = await client.callTool({ name: 'listar_pedidos_pendientes', arguments: {} });
    const data = dataOf(response);
    assert.equal(response.isError, true);
    assert.equal(data.status, 'error');
    assert.doesNotMatch(JSON.stringify(response), /private fixture/);
  });
});

test('el host ejecuta el listado sin aprobación y no acepta argumentos propuestos por el modelo', async () => {
  assert.deepEqual(parseIntent('pendientes'), { action: 'listar_pedidos_pendientes' });
  assert.deepEqual(parseIntent('Mostrá los pedidos pendientes'), { action: 'listar_pedidos_pendientes' });
  assert.equal(validateProposal({ action: 'listar_pedidos_pendientes' }, { function: { name: 'listar_pedidos_pendientes', arguments: {} } }), true);
  assert.equal(validateProposal({ action: 'listar_pedidos_pendientes' }, { function: { name: 'listar_pedidos_pendientes', arguments: { pedidoId: ORDER_ID } } }), false);
  assert.equal(validateProposal({ action: 'listar_pedidos_pendientes' }, { function: { name: 'confirmar_pedido', arguments: {} } }), false);
  await withLab({}, async ({ client }) => {
    let asked = 0;
    const events = [];
    const output = await runTurn({
      text: 'pendientes', client, deterministic: true,
      approvalQuestion: async () => { asked++; return ''; },
      onEvent: event => events.push(event)
    });
    assert.equal(asked, 0);
    const result = events.find(event => event.type === 'operation.result').result;
    assert.equal(result.status, 'ok');
    assert.equal(result.pedidos[0].pedidoId, ORDER_ID);
    assert.match(output, /pendiente/);
  });
});

test('consulta proyecta sólo ID y estado, excluye PII e inyección indirecta', async () => {
  await withLab({}, async ({ client }) => {
    const response = await client.callTool({
      name: 'consultar_estado_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { correlationId: randomUUID() }
    });
    const data = dataOf(response);
    assert.deepEqual(data, { status: 'ok', pedidoId: ORDER_ID, estado: 'pendiente' });
    assert.equal(response.isError, false);
    assert.doesNotMatch(JSON.stringify(response), /fixture-sensible|notaInterna|Ignorá al host|private fixture/);
  });
});

test('ID inválido y pedido ausente devuelven errores con el schema mínimo', async () => {
  await withLab({}, async ({ client }) => {
    const invalid = await client.callTool({ name: 'consultar_estado_pedido', arguments: { pedidoId: 'no-es-id' } });
    assert.deepEqual(dataOf(invalid), { status: 'error', code: 'ORDER_ID_INVALID' });
    const oversized = await client.callTool({
      name: 'consultar_estado_pedido',
      arguments: { pedidoId: 'x'.repeat(8193) }
    });
    assert.deepEqual(dataOf(oversized), { status: 'error', code: 'TOOL_INPUT_LIMIT' });
    const absent = await client.callTool({
      name: 'consultar_estado_pedido',
      arguments: { pedidoId: '507f1f77bcf86cd799439099' }
    });
    assert.deepEqual(dataOf(absent), { status: 'error', code: 'ORDER_NOT_FOUND', pedidoId: '507f1f77bcf86cd799439099' });
  });
});

test('confirmación sin aprobación o con booleano no muta el pedido', async () => {
  await withLab({}, async ({ api, client }) => {
    const result = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID, aprobado: true },
      _meta: { correlationId: randomUUID() }
    });
    assert.deepEqual(dataOf(result), { status: 'error', code: 'APPROVAL_REQUIRED', pedidoId: ORDER_ID });
    assert.equal(api.snapshot().postCalls, 0);
    assert.equal(api.snapshot().state, 'pendiente');
  });
});

test('aprobación sólo se emite ante texto exacto y queda vinculada a acción/pedido', () => {
  assert.equal(approvalForAnswer({ answer: 'NO', pedidoId: ORDER_ID, secret: SECRET }), undefined);
  const approval = approvalForAnswer({ answer: `CONFIRMAR ${ORDER_ID}`, pedidoId: ORDER_ID, secret: SECRET });
  assert.equal(typeof approval, 'string');
  assert.equal(approvalForAnswer({ answer: `CONFIRMAR ${OTHER_ID}`, pedidoId: ORDER_ID, secret: SECRET }), undefined);
});

test('propuesta de modelo debe coincidir exactamente con la intención explícita', () => {
  const intent = parseIntent(`consulta ${ORDER_ID}`);
  assert.deepEqual(intent, { action: 'consultar_estado_pedido', pedidoId: ORDER_ID });
  assert.equal(validateProposal(intent, { function: { name: intent.action, arguments: { pedidoId: ORDER_ID } } }), true);
  assert.equal(validateProposal(intent, { function: { name: 'confirmar_pedido', arguments: { pedidoId: ORDER_ID } } }), false);
  assert.equal(validateProposal(intent, { function: { name: intent.action, arguments: { pedidoId: OTHER_ID } } }), false);
  assert.equal(validateProposal(intent, { function: { name: intent.action, arguments: '{"pedidoId":"broken"}' } }), false);
});

test('el host detiene la inyección directa y pide el ID faltante sin llamar al modelo/tool', async () => {
  let modelCalls = 0;
  let toolCalls = 0;
  const client = { callTool: async () => { toolCalls++; } };
  const askModel = async () => { modelCalls++; return {}; };
  const output = await runTurn({
    text: directInjection,
    client,
    askModel
  });
  assert.match(output, /Solicitud no reconocida/);
  const clarification = await runTurn({ text: 'consulta', client, askModel });
  assert.match(clarification, /¿Qué pedido querés consultar\?/);
  const confirmationClarification = await runTurn({ text: 'confirmar', client, askModel });
  assert.match(confirmationClarification, /¿Qué pedido querés confirmar\?/);
  assert.equal(modelCalls, 0);
  assert.equal(toolCalls, 0);
});

test('host rechaza la confirmación si el operador no aprueba exactamente', async () => {
  let toolCalls = 0;
  const output = await runTurn({
    text: `confirmar ${ORDER_ID}`,
    deterministic: true,
    client: { callTool: async () => { toolCalls++; } },
    approvalSecret: SECRET,
    approvalQuestion: async prompt => {
      assert.match(prompt, new RegExp(`confirmar_pedido.*${ORDER_ID}`));
      return 'NO';
    }
  });
  assert.match(output, /Aprobación rechazada/);
  assert.equal(toolCalls, 0);
});

test('host firma aprobación ligada a operación e ID y conserva la clave fuera de argumentos', async () => {
  let dispatched = 0;
  const output = await runTurn({
    text: `confirmar ${ORDER_ID}`,
    deterministic: true,
    client: {
      callTool: async request => {
        dispatched++;
        assert.equal(request.name, 'confirmar_pedido');
        assert.deepEqual(request.arguments, { pedidoId: ORDER_ID });
        const grant = verifyApproval(request._meta.approval, { pedidoId: ORDER_ID, secret: SECRET });
        assert.equal(grant.action, 'confirmar_pedido');
        assert.equal(typeof grant.key, 'string');
        assert.equal(Object.hasOwn(request.arguments, 'idempotencyKey'), false);
        return {
          isError: false,
          structuredContent: { status: 'ok', pedidoId: ORDER_ID, estado: 'confirmado', repetido: false }
        };
      }
    },
    approvalSecret: SECRET,
    approvalQuestion: async () => `CONFIRMAR ${ORDER_ID}`
  });
  assert.deepEqual(JSON.parse(output), { status: 'ok', pedidoId: ORDER_ID, estado: 'confirmado', repetido: false });
  assert.equal(dispatched, 1);
});

test('confirmación exacta aprobada funciona y replay conserva la clave idempotente', async () => {
  await withLab({}, async ({ api, client }) => {
    const approval = createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET });
    const first = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { correlationId: randomUUID(), approval }
    });
    assert.deepEqual(dataOf(first), { status: 'ok', pedidoId: ORDER_ID, estado: 'confirmado', repetido: false });
    const replay = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { correlationId: randomUUID(), approval }
    });
    assert.equal(dataOf(replay).estado, 'confirmado');
    assert.equal(api.snapshot().postCalls, 2);
    assert.equal(api.snapshot().receivedKeys[0], api.snapshot().receivedKeys[1]);
    assert.match(api.snapshot().receivedKeys[0], /^[0-9a-f-]{36}$/i);
  });
});

test('firma alterada, aprobación de otro pedido y vencimiento no mutan', async () => {
  await withLab({}, async ({ api, client }) => {
    const invalidTokens = [
      `${createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET })}x`,
      createApproval({ action: 'confirmar_pedido', pedidoId: OTHER_ID, secret: SECRET }),
      createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET, now: Date.now() - 130_000 })
    ];
    for (const approval of invalidTokens) {
      const response = await client.callTool({
        name: 'confirmar_pedido',
        arguments: { pedidoId: ORDER_ID },
        _meta: { approval }
      });
      assert.equal(dataOf(response).status, 'error');
      assert.equal(dataOf(response).code, 'APPROVAL_INVALID');
    }
    assert.equal(api.snapshot().postCalls, 0);
    assert.equal(api.snapshot().state, 'pendiente');
  });
});

test('scope insuficiente se distingue y no cambia el pedido', async () => {
  await withLab({ token: 'fixture-read' }, async ({ api, client }) => {
    const approval = createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET });
    const response = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { approval, correlationId: randomUUID() }
    });
    assert.deepEqual(dataOf(response), { status: 'error', code: 'SCOPE_INSUFFICIENT', pedidoId: ORDER_ID });
    assert.equal(api.snapshot().state, 'pendiente');
  });
});

test('conflicto de negocio devuelve error mínimo y no presenta datos crudos', async () => {
  await withLab({ order: { ...indirectFixture, estado: 'cancelado' } }, async ({ api, client }) => {
    const approval = createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET });
    const response = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { approval }
    });
    assert.equal(dataOf(response).status, 'error');
    assert.equal(dataOf(response).code, 'IDEMPOTENCY_KEY_MISMATCH');
    assert.doesNotMatch(JSON.stringify(response), /secret|fixture-sensible|private fixture/);
    assert.equal(api.snapshot().state, 'cancelado');
  });
});

test('503 se informa como parcial y no se reintenta automáticamente', async () => {
  await withLab({ postStatus: 503 }, async ({ api, client }) => {
    const approval = createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET });
    const response = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { approval }
    });
    assert.deepEqual(dataOf(response), { status: 'error', code: 'PARTIAL', resultado: 'VERIFICAR_ESTADO', pedidoId: ORDER_ID });
    assert.equal(api.snapshot().postCalls, 1);
  });
});

test('timeout de POST informa estado indeterminado sin segundo POST', async () => {
  await withLab({ postStatus: 503, delayPostMs: 5_500 }, async ({ api, client }) => {
    const approval = createApproval({ action: 'confirmar_pedido', pedidoId: ORDER_ID, secret: SECRET });
    const response = await client.callTool({
      name: 'confirmar_pedido',
      arguments: { pedidoId: ORDER_ID },
      _meta: { approval }
    }, undefined, { timeout: 8_000 });
    assert.deepEqual(dataOf(response), { status: 'error', code: 'TIMEOUT', resultado: 'VERIFICAR_ESTADO', pedidoId: ORDER_ID });
    assert.equal(api.snapshot().postCalls, 1);
  });
});

test('límite de entrada bloquea propuestas y salida del modelo supera el límite', async () => {
  let calls = 0;
  const client = {
    listTools: async () => ({ tools: [{ name: 'consultar_estado_pedido', description: 'Consulta', inputSchema: { type: 'object' } }] }),
    callTool: async () => {
      calls++;
      return {
        isError: false,
        structuredContent: { status: 'ok', pedidoId: ORDER_ID, estado: 'pendiente' }
      };
    }
  };
  const tooLong = await runTurn({ text: 'x'.repeat(4097), client, deterministic: true });
  assert.match(tooLong, /4096/);
  assert.equal(calls, 0);

  let inference = 0;
  const longResponse = await runTurn({
    text: `consulta ${ORDER_ID}`,
    client,
    askModel: async () => {
      inference++;
      return inference === 1
        ? { tool_calls: [{ function: { name: 'consultar_estado_pedido', arguments: { pedidoId: ORDER_ID } } }] }
        : { content: 'á'.repeat(4097) };
    }
  });
  assert.deepEqual(JSON.parse(longResponse), { status: 'ok', pedidoId: ORDER_ID, estado: 'pendiente' });
  assert.equal(calls, 1);
});

test('el host no acepta texto del modelo como sustituto de la tool requerida', async () => {
  let calls = 0;
  const output = await runTurn({
    text: `consulta ${ORDER_ID}`,
    client: {
      listTools: async () => ({ tools: [] }),
      callTool: async () => { calls++; }
    },
    askModel: async () => ({ content: 'El pedido está confirmado.' })
  });
  assert.match(output, /No se ejecutó ninguna herramienta/);
  assert.equal(calls, 0);
});

test('el host no pasa texto malicioso de respuesta indirecta al modelo', async () => {
  await withLab({}, async ({ api, client }) => {
    let hostCorrelationId;
    const correlatedClient = {
      listTools: (...args) => client.listTools(...args),
      callTool: (request, ...args) => {
        hostCorrelationId = request._meta.correlationId;
        return client.callTool(request, ...args);
      }
    };
    let modelCalls = 0;
    const output = await runTurn({
      text: `consulta ${ORDER_ID}`,
      client: correlatedClient,
      askModel: async ({ body }) => {
        modelCalls++;
        if (body.tools) return { tool_calls: [{ function: { name: 'consultar_estado_pedido', arguments: { pedidoId: ORDER_ID } } }] };
        assert.doesNotMatch(JSON.stringify(body.messages), /fixture-sensible|Ignorá al host|notaInterna/);
        return { content: 'El estado es pendiente.' };
      }
    });
    assert.match(hostCorrelationId, /^[0-9a-f-]{36}$/i);
    assert.deepEqual(api.snapshot().receivedCorrelationIds, [hostCorrelationId]);
    assert.equal(modelCalls, 2);
    assert.match(output, /\"estado\":\"pendiente\"/);
    assert.match(output, /Comentario generado \(no autoritativo\): El estado es pendiente\./);
  });
});
