# Inicio de T03

## Qué hay en cada carpeta

```text
inicio/                         # Proyecto Node: ejecutar npm ci y npm test acá
├── chat-web/                   # Código que ejecuta el navegador
│   ├── index.html              # Página, formulario y botones
│   ├── app.js                  # Mensajes WebSocket y presentación de resultados
│   └── styles.css              # Estilos de la interfaz
├── host/                       # Backend que atiende al navegador y coordina el modelo
│   ├── web.js                  # Sirve el chat y recibe conexiones WebSocket
│   ├── host.js                 # Ollama, validación de propuestas y cliente MCP
│   └── cli.js                  # Utilidad técnica de terminal; no se usa en la actividad
├── servidor-mcp/               # Proceso que publica capacidades MCP
│   └── server.js               # Tools, resource y adaptación a la API HTTP; editás acá
├── compartido/
│   └── security.js             # Validación de intención/propuesta y firma/verificación de aprobación
├── test/                       # Pruebas automáticas de los componentes
├── fixtures/                   # Datos controlados para esas pruebas
├── package.json                # Dependencias y comandos de todo el proyecto
├── config.example.env          # Plantilla sin credenciales reales
└── config.local.env            # Tu configuración privada, no incluida en Git
```

**Las carpetas separan responsabilidades, no son cuatro instalaciones:** ejecutás `npm ci` una sola vez desde `inicio/`. El frontend usa JavaScript del navegador; no necesita otro servidor ni instalar npm dentro de `chat-web/`.

Al iniciar `node --env-file=./config.local.env host/web.js`, el host sirve los archivos de `chat-web/` y recibe WebSocket. Cuando el navegador conecta, el host inicia `servidor-mcp/server.js` como proceso hijo y se comunica con él por stdio. No tenés que iniciar MCP en otra terminal. Ollama es un servicio aparte en 11434 y la API es otro servicio en 3008, levantado por Compose con el código de Clase 07. `compartido/` no es un servicio: es código importado por los componentes que lo necesitan.


Empezá por la [actividad autocontenida](../../../actividad-practica.md), que incluye instalación, configuración, servicios y controles desde un clon nuevo. El [README del laboratorio](../README.md) amplía el contrato. Este proyecto ya incluye el host, el cliente MCP stdio, el servidor MCP, las policies y la suite de fixtures.

## Tareas pendientes

En `servidor-mcp/server.js` hay tres fragmentos marcados con TODO: `T03-A` (`mapPedidoFromListado`), `T03-B` (registrar la tool `listar_pedidos_pendientes`) y `T03-C` (`mapPendientesFromListado`). El código a agregar en cada lugar está en la [actividad práctica autocontenida](../../../actividad-practica.md). La API ofrece `GET /pedidos`, no `GET /pedidos/:id`: la consulta y el listado se resuelven filtrando esa respuesta y proyectando solo `{ pedidoId, estado }`. No pases el documento original al host ni al modelo.

Ejecutá la suite con:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
npm test
```

Antes de completar los tres TODO fallan intencionalmente 6 pruebas (consulta, listado, descubrimiento de tools y salida indirecta); al terminar deben pasar las 29. No modifiques las políticas de aprobación, autorización o manejo de errores.


## Chat web con modelo local obligatorio

Con API Clase 07 preparada y config.local.env completado, ejecutá:

```bash
node --env-file=./config.local.env host/web.js
```

Abrí http://127.0.0.1:3018. La interfaz muestra resultado autoritativo separado, aprobación de la sesión, botón de documentación y replay manual dentro de 120 s. WebSocket no reemplaza MCP ni HTTP. No expongas el servidor fuera del equipo.


Las pruebas incluyen una frontera WebSocket real y fixtures de la API; no equivalen a Auth0/Ollama reales. Consultá el registro de validación actual para esas evidencias.
