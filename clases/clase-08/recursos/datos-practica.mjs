// Preparación y comprobación independientes del modelo/MCP. Nunca imprime tokens.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const mode = process.argv[2];
const file = resolve('datos-practica.json');
const base = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:3008');
const idPattern = /^[a-f0-9]{24}$/;
function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name} en config.local.env.`);
  return value;
}
async function request(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error('Sin conexión o timeout: comprobá servicio, red y puertos. No repitas una mutación sin revisar el estado.'); }
  if (!response.ok) {
    const target = new URL(url);
    const local = target.origin === base.origin;
    const stage = local ? `API ${options.method || 'GET'} ${target.pathname}` : 'Auth0 POST /oauth/token';
    let hint = 'revisá los servicios y sus logs';
    if (!local) hint = 'revisá que dominio, client ID y client secret pertenezcan a la misma aplicación M2M y que esté autorizada para el audience';
    else if (response.status === 401 && target.pathname === '/productos') hint = 'INTERNAL_API_KEY no coincide con la usada al levantar la API; recreá los servicios con el mismo config.local.env';
    else if (response.status === 401) hint = 'la API rechazó el token; verificá su dominio/issuer y audience y recreá los servicios después de corregir config.local.env';
    else if (response.status === 403) hint = 'revisá los scopes efectivos de la aplicación M2M';
    throw new Error(`${stage} → HTTP ${response.status}: ${hint}.`);
  }
  return response.json();
}
try {
  if (!['preparar', 'estado'].includes(mode)) throw new Error('Uso: node --env-file=./config.local.env ../../datos-practica.mjs preparar|estado');
  if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Usá API_BASE_URL=http://127.0.0.1:3008 para esta preparación local.');
  const health = await request(new URL('/health', base));
  if (health.status !== 'ok') throw new Error('La API no pasó /health.');
  const domain = requireValue('AUTH0_DOMAIN');
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) throw new Error('AUTH0_DOMAIN debe ser el dominio del tenant, sin https:// ni barras.');
  const auth = await request(`https://${domain}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: requireValue('AUTH0_CLIENT_ID'),
      client_secret: requireValue('AUTH0_CLIENT_SECRET'), audience: requireValue('AUTH0_AUDIENCE') })
  });
  if (typeof auth.access_token !== 'string') throw new Error('Auth0 no devolvió un access token.');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.access_token}` };
  // La API valida firma, issuer, audience y scope; no se confía en decodificar JWT aquí.
  let orders = await request(new URL('/pedidos', base), { headers });
  if (!Array.isArray(orders)) throw new Error('GET /pedidos no devolvió una lista.');
  const identity = await request(new URL('/token-info', base), { headers });
  const scopes = new Set(String(identity.scopes || '').split(' '));
  const required = mode === 'preparar' ? ['read:pedidos', 'write:pedidos', 'confirm:pedidos'] : ['read:pedidos'];
  if (required.some(scope => !scopes.has(scope))) throw new Error(`La identidad validada por la API necesita ${required.join(', ')}. Pedí al docente una credencial autorizada.`);
  if (mode === 'preparar') {
    let previous;
    try { previous = JSON.parse(await readFile(file, 'utf8')); } catch { /* Primera ejecución. */ }
    if (previous && idPattern.test(previous.pedidoId) && orders.some(o => o._id === previous.pedidoId && o.estado === 'pendiente')) {
      console.log(JSON.stringify({ preparado: true, reutilizado: true, pedidoId: previous.pedidoId, estado: 'pendiente' }));
    } else {
      const product = await request(new URL('/productos', base), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': requireValue('INTERNAL_API_KEY') },
        body: JSON.stringify({ nombre: `Producto ficticio Clase 08 ${randomUUID().slice(0,8)}`, categoria: 'laboratorio', precio: 100, stock: 10 })
      });
      const order = await request(new URL('/pedidos', base), { method: 'POST', headers,
        body: JSON.stringify({ cliente: { nombre: 'Operador ficticio', email: 'clase08@example.invalid' }, items: [{ productoId: product._id, cantidad: 2 }] }) });
      if (!idPattern.test(order._id) || order.estado !== 'pendiente') throw new Error('No se obtuvo un pedido pendiente válido.');
      const data = { pedidoId: order._id, productoId: product._id };
      await writeFile(file, JSON.stringify(data, null, 2) + '\n');
      console.log(JSON.stringify({ preparado: true, ...data, estado: order.estado, stock: product.stock }));
    }
  } else {
    let data;
    try { data = JSON.parse(await readFile(file, 'utf8')); } catch { throw new Error('Falta datos-practica.json: ejecutá primero preparar.'); }
    if (!idPattern.test(data.pedidoId) || !idPattern.test(data.productoId)) throw new Error('Identificadores locales inválidos.');
    const order = orders.find(o => o._id === data.pedidoId);
    const products = await request(new URL('/productos', base));
    const product = products.find(p => p._id === data.productoId);
    if (!order || !product) throw new Error('No se encontraron los datos de prueba; revisá qué entorno está activo.');
    console.log(JSON.stringify({ pedidoId: order._id, estado: order.estado, stock: product.stock,
      notificacionEstado: order.notificacionEstado, eventoId: order.confirmacionEvento?.eventId || null }));
  }
} catch (error) {
  console.error(`Preparación detenida: ${error.message}`);
  process.exitCode = 1;
}
