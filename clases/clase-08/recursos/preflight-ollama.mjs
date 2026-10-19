// Prueba de preparación: inferencia y tool calling locales; no prueba MCP ni la API.
const model = 'llama3.2:3b';
const pedidoId = '000000000000000000000001';
const tools = [{ type: 'function', function: {
  name: 'consultar_estado_pedido', description: 'Consulta el estado actual de un pedido por ID.',
  parameters: { type: 'object', properties: { pedidoId: { type: 'string' } }, required: ['pedidoId'] }
} }];
async function chat(messages, availableTools) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, ...(availableTools ? { tools: availableTools } : {}),
      stream: false, keep_alive: '5m', options: { temperature: 0, num_ctx: 4096, num_predict: 128 } }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`Ollama respondió HTTP ${response.status}. Comprobá servicio y modelo descargado.`);
  return response.json();
}
try {
  let passed = true;
  for (let index = 0; index < 4; index++) {
    const start = performance.now();
    const messages = [
      { role: 'system', content: 'Sos un asistente de pedidos. Para consultar estado usá la herramienta con el ID exacto. Después del resultado, respondé en español con el estado recibido y no repitas la llamada.' },
      { role: 'user', content: `Consultá el estado del pedido ${pedidoId}.` }
    ];
    const first = await chat(messages, tools);
    const call = first.message.tool_calls?.length === 1 ? first.message.tool_calls[0] : undefined;
    if (call?.function?.name !== 'consultar_estado_pedido' || call.function.arguments?.pedidoId !== pedidoId) {
      throw new Error('El modelo no seleccionó la herramienta y el ID esperados. Conservá este resultado y corregí la preparación con el docente antes de iniciar la actividad.');
    }
    // La aplicación ejecuta aquí una fixture explícita, no una consulta a la API.
    messages.push(first.message, { role: 'tool', tool_name: 'consultar_estado_pedido',
      content: JSON.stringify({ pedidoId, estado: 'pendiente' }) });
    const final = await chat(messages);
    const ms = Math.round(performance.now() - start);
    const correct = /\bpendiente\b/i.test(final.message.content);
    console.log(JSON.stringify({ prueba: index === 0 ? 'primera' : 'caliente', modelo: model,
      cicloMs: ms, seleccionCorrecta: true, mencionaEstadoRecibido: correct }));
    if (!correct || (index > 0 && ms > 15000)) passed = false;
  }
  console.log(passed
    ? 'Preparación local aprobada: tres ciclos calientes correctos de hasta 15 segundos. No acredita MCP ni backend real.'
    : 'Preparación local no aprobada: corregí el entorno con el docente antes de iniciar. El modelo local es obligatorio.');
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error(`Preparación no aprobada: ${error.message}`);
  process.exitCode = 1;
}
