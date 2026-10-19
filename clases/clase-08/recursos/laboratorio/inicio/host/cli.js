import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { connectMcpServer, runTurn, replayOperation, readDocumentation } from './host.js';

const deterministic = process.argv.includes('--deterministic');
const io = createInterface({ input: stdin, output: stdout });
let connection;
const operations = new Map();

try {
  connection = await connectMcpServer();
  const tools = await connection.client.listTools();
  console.log(`MCP stdio conectado. Tools: ${tools.tools.map(tool => tool.name).join(', ')}. Resource: iaew://docs/pedidos.`);
  console.log('También: documentacion, repetir <operationId>, salir.');
  console.log(deterministic ? 'Modo determinista; no requiere Ollama.' : 'Modelo local; ingresá pendientes, consulta <pedidoId> o confirmar <pedidoId>.');
  for (;;) {
    let text;
    try { text = await io.question('> '); } catch { break; }
    if (text.trim().toLowerCase() === 'salir') break;
    for (const [id, record] of operations) if (record.expiresAt <= Date.now()) operations.delete(id);
    if (text.trim() === 'documentacion') { console.log(await readDocumentation(connection.client)); continue; }
    if (text.trim().startsWith('repetir ')) {
      try { console.log(JSON.stringify(await replayOperation({ operationId: text.trim().slice(8), operations, client: connection.client }))); }
      catch { console.log('No se puede repetir esa operación; consultá su estado.'); }
      continue;
    }
    if (operations.size >= 20) { console.log('Límite de sesión. Esperá el vencimiento o reiniciá y consultá el estado.'); continue; }
    const result = await runTurn({
      text,
      operations,
      onEvent: event => { if (event.type === 'operation.result' && event.replayAvailable) console.log(`Operación para repetir: ${event.operationId} (120 s como máximo)`); },
      client: connection.client,
      deterministic,
      approvalSecret: connection.approvalSecret,
      approvalQuestion: async (prompt, signal) => io.question(prompt, { signal })
    });
    console.log(result);
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'host.startup', code: error?.message || 'STARTUP_FAILED' }));
  process.exitCode = 1;
} finally {
  io.close();
  if (connection) {
    await connection.client.close().catch(() => {});
    await connection.transport.close().catch(() => {});
  }
}
