# Solución docente

Es el paquete completo del laboratorio T03. La versión estudiantil [`../inicio/`](../inicio/) deja tres fragmentos pendientes: `mapPedidoFromListado`, `mapPendientesFromListado` y el registro de `listar_pedidos_pendientes`.

## Ejecutar

Desde esta carpeta:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
npm run check
npm test
cp config.example.env config.local.env
```

Editá `config.local.env` sólo con credenciales M2M propias autorizadas. El archivo está ignorado por Git. La suite no lee ese archivo: levanta una API HTTP de fixture y servidor MCP real sobre stdio, con token ficticio de prueba. No requiere Auth0, Ollama ni Docker.

Para demo, prepará la API de Clase 07 y Ollama según el README del laboratorio. `node --env-file=./config.local.env src/web.js` inicia el chat con Ollama. El recorrido requiere modelo local, API disponible y credenciales válidas del operador.

Los resultados parciales y timeouts de `POST` se devuelven como `VERIFICAR_ESTADO` sin reintentos. No declares completado el recorrido modelo + Auth0 a partir de las pruebas de fixture.



## Chat web con modelo local obligatorio

Con API Clase 07 preparada y config.local.env completado, ejecutá:

```bash
node --env-file=./config.local.env src/web.js
```

Abrí http://127.0.0.1:3018. La interfaz muestra resultado autoritativo separado, aprobación de la sesión, botón de documentación y replay manual dentro de 120 s. WebSocket no reemplaza MCP ni HTTP. No expongas el servidor fuera del equipo.


Las pruebas incluyen una frontera WebSocket real y fixtures de la API; no equivalen a Auth0/Ollama reales. Consultá el registro de validación actual para esas evidencias.
