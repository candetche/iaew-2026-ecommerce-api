# Inicio de T03

Seguí primero el [README del laboratorio](../README.md) para preparar la API, el entorno y las credenciales. Este proyecto ya incluye el host, el cliente MCP stdio, el servidor MCP, las policies y la suite de fixtures.

## Tareas pendientes

En `src/server.js` hay tres fragmentos marcados con TODO: `T03-A` (`mapPedidoFromListado`), `T03-B` (registrar la tool `listar_pedidos_pendientes`) y `T03-C` (`mapPendientesFromListado`). El código a agregar en cada lugar está en la [actividad práctica](../../../actividad-practica.md#2-completar-el-servidor-mcp-y-consultar--10-minutos). La API ofrece `GET /pedidos`, no `GET /pedidos/:id`: la consulta y el listado se resuelven filtrando esa respuesta y proyectando solo `{ pedidoId, estado }`. No pases el documento original al host ni al modelo.

Ejecutá la suite con:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
npm test
```

Antes de completar los tres TODO fallan intencionalmente 6 pruebas (consulta, listado, descubrimiento de tools y salida indirecta); al terminar deben pasar las 29. No modifiques las políticas de aprobación, autorización o manejo de errores.


## Chat web con modelo local obligatorio

Con API Clase 07 preparada y config.local.env completado, ejecutá:

```bash
node --env-file=./config.local.env src/web.js
```

Abrí http://127.0.0.1:3018. La interfaz muestra resultado autoritativo separado, aprobación de la sesión, botón de documentación y replay manual dentro de 120 s. WebSocket no reemplaza MCP ni HTTP. No expongas el servidor fuera del equipo.


Las pruebas incluyen una frontera WebSocket real y fixtures de la API; no equivalen a Auth0/Ollama reales. Consultá el registro de validación actual para esas evidencias.
