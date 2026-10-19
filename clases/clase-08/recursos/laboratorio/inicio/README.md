# Inicio de T03

Seguí primero el [README del laboratorio](../README.md) para preparar la API, el entorno y las credenciales. Este proyecto ya incluye el host, el cliente MCP stdio, el servidor MCP, las policies y la suite de fixtures.

## Única tarea pendiente

En `src/server.js`, completá únicamente `mapPedidoFromListado(pedidos, pedidoId)`. La API ofrece `GET /pedidos`, no `GET /pedidos/:id`: encontrá el registro cuyo `_id` coincide y devolvé la proyección `{ pedidoId, estado }`. Si falta o no tiene un estado válido, devolvé `undefined`. No pases el documento original al host/modelo.

Ejecutá la suite con:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
npm test
```

Antes de resolver el mapeo, las pruebas de consulta y del flujo de salida indirecta fallan intencionalmente por esa misma tarea pendiente; las restantes describen los controles ya provistos. No agregues otra tarea pendiente ni modifiques las políticas de aprobación, autorización o manejo de errores.


## Chat web y alternativa terminal

Con API Clase 07 preparada y config.local.env completado, ejecutá:

```bash
node --env-file=./config.local.env src/web.js
```

Abrí http://127.0.0.1:3018. Para el recorrido sin Ollama agregá `--deterministic`. La interfaz muestra resultado autoritativo separado, aprobación de la sesión, botón de documentación y replay manual dentro de 120 s. WebSocket no reemplaza MCP ni HTTP. No expongas el servidor fuera del equipo.

La terminal sigue disponible con src/cli.js: `consulta <ID>`, `confirmar <ID>`, `documentacion`, `repetir <operationId>` y `salir`. Repetir una operación por ID conserva la clave original; escribir otra confirmación crea una nueva operación. [Contrato completo](../README.md).

Las pruebas incluyen una frontera WebSocket real y fixtures de la API; no equivalen a Auth0/Ollama reales. Consultá el registro de validación actual para esas evidencias.
