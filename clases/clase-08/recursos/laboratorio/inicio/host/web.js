import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { connectMcpServer, runTurn, replayOperation, readDocumentation } from './host.js';

const requestId = z.string().uuid();
const envelope = { version: z.literal(1), requestId };
const messageSchema = z.discriminatedUnion('type', [
  z.object({ ...envelope, type: z.literal('chat.send'), text: z.string().min(1).max(4096) }).strict(),
  z.object({ ...envelope, type: z.literal('approval.respond'), approvalId: z.string().uuid(), decision: z.enum(['approve', 'reject']) }).strict(),
  z.object({ ...envelope, type: z.literal('resource.read'), uri: z.literal('iaew://docs/pedidos') }).strict(),
  z.object({ ...envelope, type: z.literal('operation.replay'), operationId: z.string().uuid() }).strict()
]);
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
]);

export async function createWebServer({ port = 3018, deterministic = false,
  connect = connectMcpServer, turn = runTurn,
  limits = { connections: 4, messagesPerMinute: 30, requestIds: 100, operations: 20 },
  approvalTimeoutMs = 90_000
} = {}) {
  const bootstrap = randomBytes(32).toString('hex');
  const sessions = new Set();
  let closing = false;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
  const expectedHost = () => `127.0.0.1:${http.address().port}`;
  const origin = () => `http://${expectedHost()}`;
  const http = createServer(async (req, res) => {
    if (req.headers.host !== expectedHost() || req.method !== 'GET') {
      res.writeHead(403); return res.end('Solicitud rechazada');
    }
    const route = req.url;
    if (route === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const asset = staticFiles.get(route);
    if (!asset) { res.writeHead(404); return res.end('No encontrado'); }
    try {
      const body = await readFile(new URL(`../chat-web/${asset[0]}`, import.meta.url));
      res.writeHead(200, {
        'Content-Type': asset[1], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ws://${expectedHost()}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
        ...(route === '/' ? { 'Set-Cookie': `iaew08_web=${bootstrap}; HttpOnly; SameSite=Strict; Path=/` } : {})
      });
      res.end(body);
    } catch { res.writeHead(500); res.end('No se pudo cargar la interfaz'); }
  });

  http.on('upgrade', (req, socket, head) => {
    const cookies = (req.headers.cookie || '').split(';').map(part => part.trim());
    if (closing || req.url !== '/ws' || req.headers.host !== expectedHost() || req.headers.origin !== origin() ||
        !cookies.includes(`iaew08_web=${bootstrap}`) || sessions.size >= limits.connections) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });

  wss.on('connection', ws => {
    const session = { ws, busy: false, closed: false, pending: undefined,
      operations: new Map(), ids: new Set(), timestamps: [], connection: undefined, controller: undefined };
    sessions.add(session);
    const send = data => {
      if (!session.closed && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ version: 1, ...data }));
    };
    const error = (code, id) => { send({ type: 'operation.error', ...(id ? { requestId: id } : {}), code,
      message: ({ BUSY: 'Esperá que termine la operación actual.', APPROVAL_INVALID: 'La aprobación no corresponde a una operación pendiente de esta conexión.', REPLAY_UNAVAILABLE: 'La operación no se puede repetir; consultá su estado.', RATE_LIMIT: 'Se alcanzó el límite de mensajes. Esperá un minuto.', SESSION_LIMIT: 'Se alcanzó el límite de la sesión. Reconectá y consultá el estado antes de continuar.', CYCLE_FAILED: 'No se pudo completar la operación. Consultá el estado antes de repetir una confirmación.' })[code] || 'Mensaje rechazado: verificá formato, identificadores y límites.' });
      if (id) send({ type: 'operation.done', requestId: id });
    };
    const connectionPromise = connect({ stderr: 'pipe' }).then(async connection => {
      if (session.closed) {
        await connection.client.close(); await connection.transport?.close(); return undefined;
      }
      session.connection = connection;
      // Solo se reenvía auditoría de campos conocidos a la terminal del backend.
      // El navegador recibe su correlationId, nunca stderr crudo ni credenciales.
      let pendingAudit = '';
      connection.transport?.stderr?.on('data', chunk => {
        pendingAudit += chunk.toString();
        if (pendingAudit.length > 16384) { pendingAudit = ''; return; }
        const lines = pendingAudit.split('\n'); pendingAudit = lines.pop();
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.event !== 'mcp.api') continue;
            const safe = { event: 'mcp.api' };
            for (const key of ['correlationId', 'tool', 'operation', 'httpMethod', 'pedidoId', 'status', 'durationMs', 'result']) {
              if (typeof record[key] === 'string' && record[key].length <= 100 || typeof record[key] === 'number') safe[key] = record[key];
            }
            console.error(JSON.stringify(safe));
          } catch { /* No exponer logs no estructurados del hijo. */ }
        }
      });
      return connection;
    }).catch(() => {
      error('MCP_UNAVAILABLE'); ws.close(1011, 'MCP no disponible'); return undefined;
    });
    send({ type: 'session.ready', mode: deterministic ? 'determinista' : 'modelo' });

    async function cleanup() {
      if (session.closed) return;
      session.closed = true;
      session.controller?.abort();
      session.pending?.resolve('');
      session.pending = undefined;
      session.operations.clear();
      const connection = session.connection;
      if (connection) {
        await connection.client.close().catch(() => {});
        await connection.transport?.close().catch(() => {});
      }
      sessions.delete(session);
    }
    ws.on('close', cleanup);
    ws.on('error', () => { void cleanup(); });
    session.cleanup = cleanup;

    ws.on('message', async (raw, isBinary) => {
      const now = Date.now();
      session.timestamps = session.timestamps.filter(t => t > now - 60_000);
      if (session.timestamps.length >= limits.messagesPerMinute) { error('RATE_LIMIT'); ws.close(1008, 'Límite de mensajes'); return; }
      session.timestamps.push(now);
      let message;
      try {
        if (isBinary || raw.length > 8192) throw new Error();
        message = messageSchema.parse(JSON.parse(raw.toString()));
      } catch { return error('MESSAGE_INVALID'); }
      const id = message.requestId;
      if (session.ids.has(id)) return error('DUPLICATE_REQUEST', id);
      if (session.ids.size >= limits.requestIds) { error('SESSION_LIMIT', id); ws.close(1008, 'Límite de sesión'); return; }
      session.ids.add(id);

      if (message.type === 'approval.respond') {
        const pending = session.pending;
        if (!pending || pending.approvalId !== message.approvalId || pending.expiresAt <= now) return error('APPROVAL_INVALID', id);
        session.pending = undefined;
        pending.resolve(message.decision === 'approve' ? `CONFIRMAR ${pending.pedidoId}` : 'NO');
        return;
      }
      if (session.busy) return error('BUSY', id);
      for (const [key, value] of session.operations) if (value.expiresAt <= now) session.operations.delete(key);
      if (session.operations.size >= limits.operations && message.type === 'chat.send') return error('SESSION_LIMIT', id);
      session.busy = true;
      session.controller = new AbortController();
      let resultEmitted = false;
      const onEvent = event => {
        if (event.type === 'operation.result') resultEmitted = true;
        send({ ...event, requestId: id });
      };
      try {
        const connection = await connectionPromise;
        if (!connection || session.closed) return;
        if (message.type === 'resource.read') {
          const text = await readDocumentation(connection.client);
          send({ type: 'resource.result', requestId: id, uri: message.uri, text });
        } else if (message.type === 'operation.replay') {
          await replayOperation({ operationId: message.operationId, operations: session.operations,
            client: connection.client, onEvent });
        } else {
          const operationId = randomUUID();
          const output = await turn({ text: message.text, client: connection.client, deterministic,
            approvalSecret: connection.approvalSecret, operations: session.operations, operationId,
            signal: session.controller.signal, onEvent,
            approvalQuestion: (_prompt, signal, deadlineAt) => new Promise(resolve => {
              const pedidoId = /[a-f0-9]{24}/.exec(_prompt)?.[0];
              if (!pedidoId || session.closed || signal.aborted) return resolve('');
              const approvalId = randomUUID();
              const expiresAt = Math.min(deadlineAt, Date.now() + Math.min(120_000, approvalTimeoutMs));
              const timer = setTimeout(() => finish(''), expiresAt - Date.now());
              const abort = () => finish('');
              function finish(answer) {
                clearTimeout(timer); signal.removeEventListener('abort', abort);
                if (session.pending?.approvalId === approvalId) session.pending = undefined;
                resolve(answer);
              }
              session.pending = { approvalId, pedidoId, expiresAt, resolve: finish };
              signal.addEventListener('abort', abort, { once: true });
              send({ type: 'approval.requested', requestId: id, operationId, approvalId,
                pedidoId, action: 'confirmar_pedido', expiresAt: new Date(expiresAt).toISOString() });
            }) });
          if (!resultEmitted) send({ type: 'operation.error', requestId: id, code: 'HOST_STOPPED', message: output });
        }
      } catch (e) {
        error(e.message === 'REPLAY_UNAVAILABLE' ? e.message : 'CYCLE_FAILED', id);
      } finally {
        session.pending?.resolve(''); session.pending = undefined;
        session.busy = false;
        send({ type: 'operation.done', requestId: id });
      }
    });
  });

  await new Promise((resolve, reject) => {
    http.once('error', reject);
    http.listen(port, '127.0.0.1', resolve);
  });
  return { server: http, url: origin(), sessions,
    async close() {
      closing = true;
      await Promise.all([...sessions].map(async session => { session.ws.terminate(); await session.cleanup(); }));
      await new Promise(resolve => wss.close(resolve));
      await new Promise(resolve => http.close(resolve));
    }
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.WEB_PORT || 3018);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('WEB_PORT_INVALID');
  try {
    const app = await createWebServer({ port, deterministic: process.argv.includes('--deterministic') });
    console.log(`Chat local: ${app.url} (${process.argv.includes('--deterministic') ? 'sin modelo' : 'Ollama local'})`);
    const stop = async () => { await app.close(); process.exit(0); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch { console.error('No se pudo iniciar el chat local. Revisá puerto, configuración y conexión MCP.'); process.exitCode = 1; }
}
