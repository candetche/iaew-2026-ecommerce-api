'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const history = byId('history');
  let socket;
  let ready = false;
  let activeRequest = null;
  let pendingApproval = null;
  let approvalTimer;
  const replayButtons = new Set();

  const display = (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  function entry(title, text, kind = '') {
    const nearBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 80;
    const card = document.createElement('article');
    card.className = `entry ${kind}`;
    const heading = document.createElement('h3');
    heading.textContent = title;
    card.append(heading);
    if (text !== undefined) {
      const body = document.createElement('pre');
      body.textContent = text;
      card.append(body);
    }
    history.append(card);
    while (history.children.length > 100) {
      const first = history.firstElementChild;
      for (const button of first.querySelectorAll('button')) replayButtons.delete(button);
      first.remove();
    }
    if (nearBottom) requestAnimationFrame(() => { history.scrollTop = history.scrollHeight; });
    return card;
  }

  function controls() {
    const unavailable = !ready || activeRequest !== null;
    byId('message').disabled = unavailable;
    byId('send').disabled = unavailable;
    byId('documentation').disabled = unavailable;
    byId('reconnect').disabled = Boolean(socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState));
    for (const button of replayButtons) button.disabled = unavailable || button.dataset.invalid === 'true';
  }

  function clearApproval() {
    clearInterval(approvalTimer);
    pendingApproval = null;
    byId('approval').hidden = true;
  }

  function disconnected(message) {
    ready = false;
    activeRequest = null;
    clearApproval();
    for (const button of replayButtons) button.dataset.invalid = 'true';
    byId('connection').textContent = 'Sin conexión';
    byId('connection').dataset.connected = 'false';
    byId('mode').textContent = 'Sesión finalizada';
    byId('progress').textContent = message;
    controls();
  }

  function send(type, payload, startsTurn = true) {
    if (!ready || socket.readyState !== WebSocket.OPEN || (startsTurn && activeRequest)) return false;
    const requestId = crypto.randomUUID();
    try {
      socket.send(JSON.stringify({ version: 1, type, requestId, ...payload }));
      if (startsTurn) activeRequest = requestId;
      controls();
      return true;
    } catch {
      disconnected('No se pudo enviar. Verificá el estado de la operación antes de iniciar otra.');
      socket.close();
      return false;
    }
  }

  function resultCard(message) {
    const result = message.result || {};
    const card = entry('Resultado autoritativo de la operación', undefined, result.status === 'ok' ? 'result' : 'error');
    if (result.resultado === 'VERIFICAR_ESTADO') {
      const warning = document.createElement('p');
      warning.setAttribute('role', 'alert');
      warning.textContent = 'Resultado indeterminado: la confirmación pudo aplicarse. Consultá el estado antes de decidir otro intento; no repitas automáticamente.';
      card.append(warning);
    }
    const fields = [
      ['Resultado', result.status === 'ok' ? 'Correcto' : 'Error'],
      ['Pedido', result.pedidoId], ['Estado', result.estado],
      ['Pendientes', typeof result.total === 'number' ? result.total : undefined],
      ['Lista parcial', typeof result.truncado === 'boolean' ? (result.truncado ? 'Sí (máximo 10)' : 'No') : undefined],
      ['Repetición', typeof result.repetido === 'boolean' ? (result.repetido ? 'Sí' : 'No') : undefined],
      ['Código', result.code], ['Detalle', result.resultado],
      ['Operación', message.operationId], ['Correlación', message.correlationId]
    ];
    const list = document.createElement('dl');
    for (const [label, value] of fields) {
      if (value === undefined || value === null) continue;
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = display(value);
      list.append(term, detail);
    }
    card.append(list);
    if (Array.isArray(result.pedidos)) {
      const items = document.createElement('ul');
      for (const pedido of result.pedidos) {
        const item = document.createElement('li');
        item.textContent = `${pedido.pedidoId} · ${pedido.estado}`;
        items.append(item);
      }
      card.append(items);
    }
    if (result.status === 'ok' && message.replayAvailable && message.operationId) {
      const replay = document.createElement('button');
      replay.type = 'button';
      replay.textContent = 'Repetir operación con la clave original';
      replay.addEventListener('click', () => {
        if (send('operation.replay', { operationId: message.operationId })) {
          byId('progress').textContent = 'Repetición manual solicitada…';
        }
      });
      card.append(replay);
      replayButtons.add(replay);
      controls();
    }
  }

  function requestApproval(message) {
    clearApproval();
    pendingApproval = message;
    byId('approval-detail').textContent = `Acción: ${message.action}. Pedido: ${message.pedidoId}. Operación: ${message.operationId}.`;
    byId('approval').hidden = false;
    byId('approve').disabled = false;
    byId('reject').disabled = false;
    const update = () => {
      const remaining = Date.parse(message.expiresAt) - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        byId('approval-expiry').textContent = 'Aprobación vencida. El servidor valida el vencimiento y finaliza la operación.';
        byId('approve').disabled = true;
        byId('reject').disabled = true;
        pendingApproval = null;
        clearInterval(approvalTimer);
      } else {
        byId('approval-expiry').textContent = `Vence en ${Math.ceil(remaining / 1000)} segundos.`;
      }
    };
    update();
    if (pendingApproval) approvalTimer = setInterval(update, 1000);
  }

  function receive(message) {
    if (message.version !== 1 || typeof message.type !== 'string') return;
    switch (message.type) {
      case 'session.ready':
        ready = true;
        byId('connection').textContent = 'Conectado';
        byId('connection').dataset.connected = 'true';
        byId('mode').textContent = message.mode === 'modelo' ? 'Modelo local' : 'Modo determinista';
        byId('progress').textContent = 'Listo para recibir una solicitud.';
        controls();
        break;
      case 'operation.progress':
        byId('progress').textContent = [message.stage, message.tool && `Tool: ${message.tool}`, message.pedidoId && `Pedido: ${message.pedidoId}`].filter(Boolean).join(' · ');
        break;
      case 'approval.requested': requestApproval(message); break;
      case 'operation.result': clearApproval(); resultCard(message); break;
      case 'assistant.message': entry('Comentario opcional del asistente · no autoritativo', message.text, 'comment'); break;
      case 'resource.result': entry(`Documentación · ${message.uri}`, message.text); break;
      case 'operation.error':
        clearApproval();
        entry(`Error · ${message.code}`, message.message, 'error');
        byId('progress').textContent = 'El servidor informó un error. Esperando cierre de la solicitud.';
        break;
      case 'operation.done':
        if (message.requestId === activeRequest) {
          activeRequest = null;
          clearApproval();
          byId('progress').textContent = 'Solicitud finalizada.';
          controls();
        }
        break;
      default: break;
    }
  }

  function connect() {
    if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;
    byId('connection').textContent = 'Conectando…';
    byId('progress').textContent = 'Abriendo una sesión nueva…';
    const current = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    socket = current;
    controls();
    current.addEventListener('message', (event) => {
      if (socket !== current) return;
      try { receive(JSON.parse(event.data)); }
      catch { entry('Error de comunicación', 'Se recibió un mensaje inválido.', 'error'); }
    });
    current.addEventListener('close', () => {
      if (socket !== current) return;
      disconnected('Conexión cerrada. La aprobación y las acciones de esta sesión ya no están disponibles. Reconectá manualmente; verificá el pedido antes de volver a confirmar.');
    });
    current.addEventListener('error', () => {
      if (socket !== current) return;
      byId('progress').textContent = 'No se pudo mantener la conexión con el servidor local.';
    });
  }

  byId('chat').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = byId('message').value.trim();
    if (text && send('chat.send', { text })) {
      entry('Tu solicitud', text, 'user');
      byId('message').value = '';
      byId('progress').textContent = 'Procesando solicitud…';
    }
  });
  byId('documentation').addEventListener('click', () => {
    if (send('resource.read', { uri: 'iaew://docs/pedidos' })) byId('progress').textContent = 'Leyendo resource de pedidos…';
  });
  for (const [id, decision] of [['approve', 'approve'], ['reject', 'reject']]) {
    byId(id).addEventListener('click', () => {
      if (!pendingApproval || Date.parse(pendingApproval.expiresAt) <= Date.now()) return;
      if (send('approval.respond', { approvalId: pendingApproval.approvalId, decision }, false)) {
        clearApproval();
        byId('progress').textContent = decision === 'approve' ? 'Aprobación enviada. Esperando resultado…' : 'Rechazo enviado. Esperando cierre…';
      }
    });
  }
  byId('reconnect').addEventListener('click', connect);
  connect();
})();
