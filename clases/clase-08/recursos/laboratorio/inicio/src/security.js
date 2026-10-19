import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const ORDER_ID = /^[a-f0-9]{24}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const APPROVAL_TTL_MS = 120_000;

export function parseIntent(text) {
  if (typeof text !== 'string' || text.length > 4096) return undefined;
  if (/^(?:por favor\s+)?(?:(?:listar|listá|mostrar|mostrá|ver|consultar|consultá)\s+)?(?:los\s+|el listado de\s+)?(?:pedidos\s+)?pendientes[.!?]?$/i.test(text.trim())) {
    return { action: 'listar_pedidos_pendientes' };
  }
  const query = /^(?:por favor\s+)?(?:consulta|consultar|consultá|estado)\s+(?:el estado (?:del )?)?(?:pedido\s+)?([a-f0-9]{24})[.!?]?$/i.exec(text.trim());
  if (query) return { action: 'consultar_estado_pedido', pedidoId: query[1].toLowerCase() };
  const confirm = /^(?:por favor\s+)?(?:confirmar|confirmá)\s+(?:el pedido\s+|pedido\s+)?([a-f0-9]{24})[.!?]?$/i.exec(text.trim());
  if (confirm) return { action: 'confirmar_pedido', pedidoId: confirm[1].toLowerCase() };
  return undefined;
}

export function validateProposal(intent, call) {
  if (!intent || !call || typeof call !== 'object') return false;
  const name = call.function?.name;
  let args = call.function?.arguments;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { return false; }
  }
  if (name !== intent.action) return false;
  if (intent.action === 'listar_pedidos_pendientes') {
    return args === undefined || args === null || (typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length === 0);
  }
  return args && typeof args === 'object' && !Array.isArray(args) &&
    Object.keys(args).length === 1 &&
    args.pedidoId === intent.pedidoId &&
    ORDER_ID.test(args.pedidoId);
}

export function createApproval({ action, pedidoId, secret, now = Date.now(), key = randomUUID(), nonce = randomUUID() }) {
  if (action !== 'confirmar_pedido' || !ORDER_ID.test(pedidoId) || typeof secret !== 'string' || secret.length < 32) {
    throw new Error('APPROVAL_INVALID');
  }
  const grant = { action, pedidoId, key, nonce, exp: now + APPROVAL_TTL_MS };
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyApproval(token, { pedidoId, secret, now = Date.now(), seen = new Map() }) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('APPROVAL_REQUIRED');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('APPROVAL_INVALID');
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  let supplied;
  try { supplied = Buffer.from(parts[1], 'base64url'); } catch { throw new Error('APPROVAL_INVALID'); }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('APPROVAL_INVALID');
  let grant;
  try { grant = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { throw new Error('APPROVAL_INVALID'); }
  if (grant.action !== 'confirmar_pedido' || grant.pedidoId !== pedidoId ||
      !UUID.test(grant.key) || !UUID.test(grant.nonce) ||
      !Number.isFinite(grant.exp) || grant.exp <= now || grant.exp > now + APPROVAL_TTL_MS) {
    throw new Error('APPROVAL_INVALID');
  }
  const previous = seen.get(grant.nonce);
  if (previous && previous !== parts[0]) throw new Error('APPROVAL_INVALID');
  seen.set(grant.nonce, parts[0]);
  return grant;
}

export function approvalForAnswer({ answer, pedidoId, secret, now = Date.now() }) {
  if (!/^[a-f0-9]{24}$/.test(pedidoId)) throw new Error('ORDER_ID_INVALID');
  if (answer !== `CONFIRMAR ${pedidoId}`) return undefined;
  return createApproval({ action: 'confirmar_pedido', pedidoId, secret, now });
}
