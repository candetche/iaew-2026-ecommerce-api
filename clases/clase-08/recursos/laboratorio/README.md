# Laboratorio T03 — MCP para pedidos

El paquete público contiene el proyecto de la actividad:

- [`inicio/`](./inicio/): versión estudiantil; completás tres fragmentos de `servidor-mcp/server.js`: consulta, proyección de pendientes y registro de su tool; seguí el paso a paso de la actividad.

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

## Antes de la práctica

La [actividad autocontenida](../../actividad-practica.md) es el punto de entrada desde un clon nuevo de `main`. Este laboratorio incluye `compose.yaml`, que reutiliza el código de API/worker de Clase 07 y levanta MongoDB/RabbitMQ sin el stack gráfico LGTM. Desde `inicio/`, con `config.local.env` preparado, ejecutá `docker compose --env-file ./config.local.env -f ../compose.yaml up -d --build --wait --wait-timeout 180` y `node --env-file=./config.local.env ../../datos-practica.mjs preparar`. La API queda en `http://127.0.0.1:3008`. `node --env-file=./config.local.env ../../datos-practica.mjs estado` comprueba el pedido directamente por HTTP sin imprimir tokens. La actividad contiene instalación, scopes, controles esperados y datos ficticios; no presupone otra práctica ejecutada.

El contrato conserva `GET /pedidos` y `POST /pedidos/:id/confirmar`; no existe `GET /pedidos/:id`. El adaptador proyecta solo ID y estado. La identidad M2M necesita `read:pedidos`, `write:pedidos` para preparar datos y `confirm:pedidos`.

Para el recorrido obligatorio, prepará Node.js 22.17.0, Ollama con `llama3.2:3b` descargado y ejecutá antes el preflight de [preparación de entorno](../../preparacion-entorno.md). El chat debe mostrar **Modelo local**; las pruebas automatizadas aisladas no sustituyen la inferencia de la actividad.

La autenticación es M2M de operador para un entorno de laboratorio. La API no verifica propiedad de pedido por `sub`; no es un flujo de autoservicio. Configurá las credenciales Auth0 asignadas para esta API en un archivo local `config.local.env` (no versionado), nunca en el prompt, el modelo ni un repositorio compartido. No copies el `.env` raíz del workspace ni uses credenciales compartidas. El servidor MCP adquiere el token client-credentials y lo conserva fuera de Ollama. También se acepta `API_TOKEN` para fixtures locales; no lo uses como sustituto de la autorización de Auth0 en una demostración real.

Ejemplo de `config.local.env`, para completar con valores propios autorizados:

```dotenv
API_BASE_URL=http://127.0.0.1:3008
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=https://iaew-pedidos-api
```

Desde el paquete elegido, podés copiar el ejemplo vacío con `cp config.example.env config.local.env` y editar solamente ese archivo local. No se incluye ni se copia ningún secreto. No hay que modificar el tenant. Pedir `read:pedidos` al endpoint de tokens no garantiza que Auth0 quite `confirm:pedidos`: el backend es quien aplica los permisos efectivos.

Para una consulta HTTP independiente de comparación, usá un cliente HTTP local configurado con OAuth 2.0 `client_credentials`, token URL `https://<AUTH0_DOMAIN>/oauth/token`, audience `https://iaew-pedidos-api` y scope solicitado `read:pedidos`; consultá `GET http://127.0.0.1:3008/pedidos`. No pegues el token en una URL, comandos compartidos, capturas o evidencias. La respuesta de la API contiene el listado; localizá el pedido de prueba y compará solo su ID y estado. No copies el cuerpo completo.

## Ejecución web (recorrido principal)

Después de configurar `config.local.env` en el paquete elegido y levantar la API de Clase 07:

```bash
node --env-file=./config.local.env host/web.js
```

Abrí **http://127.0.0.1:3018**. Usá esa dirección exacta: Host y Origin se validan en el servidor. El indicador debe mostrar **Modelo local**. El preflight aprobado es requisito para iniciar.

También existe `npm run web` cuando ya proporcionaste la configuración mediante variables de entorno. `WEB_PORT` permite elegir otro puerto antes de arrancar; usá la dirección que informa el proceso. El servidor escucha solo en loopback y no publica un sitio en Internet.

La interfaz admite `pendientes`, `consulta <ID>` y `confirmar <ID>`. Muestra propuesta, resultado autoritativo y comentario del modelo separado. **Aprobar/Rechazar** responde a una operación pendiente de esa conexión; el backend verifica y firma, y la API aplica sus permisos. **Leer documentación de pedidos** invoca explícitamente el resource. Después de una confirmación exitosa, **Repetir operación con la clave original** vuelve a invocar esa misma operación dentro de la vigencia de 120 segundos, sin generar otra clave.

Volver a escribir `confirmar <ID>` crea una operación nueva y no equivale a replay. No usar repetición ante timeout/503: consultar estado y registrar incertidumbre. Al desconectar, las aprobaciones y las repeticiones de esa sesión se invalidan. Reconectar es manual y no reenvía operaciones.

La API real y la prueba fixture se distinguen en [validacion-web.md](../../validacion-web.md). Las pruebas automatizadas del navegador no se presentan como aprobación humana.

## Instalación y pruebas previas

Desde `inicio/`:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
npm test
```

En `inicio/`, antes de completar los tres fragmentos, son esperables seis fallas. Al completarlos, la suite debe pasar 29/29. No continúes si aparecen otras fallas. No uses la opción `--env-file` si vas a proporcionar las variables por el entorno; no crees ni leas un archivo `.env` de otra carpeta. Las credenciales se pueden proporcionar por un gestor de secretos o variables de entorno. La suite local usa un servidor HTTP de fixture y un servidor MCP stdio, no requiere Docker, Ollama, Auth0 ni credenciales.

En el chat web usá `pendientes`, `consulta <ID>` y `confirmar <ID>`. La lectura del resource y el replay se realizan con los botones de la interfaz.

Una confirmación siempre presenta una segunda pregunta fuera del modelo. En el chat web, la decisión de Aprobar/Rechazar se vincula al pendiente de esa sesión en backend antes de emitir la aprobación firmada. El host genera la clave de idempotencia y el nonce; nunca son argumentos del modelo. El rechazo no invoca la operación.

## Seguridad, límites y alcance de evidencia

- MCP descubre `consultar_estado_pedido({ pedidoId })`, `listar_pedidos_pendientes()` (hasta 10 pendientes, solo ID y estado, sin aprobación porque no muta) y `confirmar_pedido({ pedidoId })`, además del resource de texto `iaew://docs/pedidos` (`text/plain`).
- Las tools emiten un sobre estructurado mínimo, con el mismo schema para resultados correctos y errores: estado del resultado y sólo ID/estado/repetición o código seguro/resultado parcial. No pasan al modelo email, datos completos, cuerpos HTTP ni stacks.
- La aprobación HMAC-SHA256 del host está vinculada a acción, pedido, clave idempotente, nonce y vencimiento de 120 segundos. La API conserva su autorización; aprobación no sustituye `confirm:pedidos`.
- ID de chat: máximo 4096 caracteres; salida de tool y resultado al modelo: máximo 8192 bytes; ciclo: máximo 90 segundos; inferencia: 45 segundos; llamada MCP/API: 10/5 segundos. Una operación confirmada no se reintenta automáticamente ante timeout ni HTTP 503: el resultado es `VERIFICAR_ESTADO`.
- La prueba de scope insuficiente usa una fixture con un token firmado de lectura; no afirma que una credencial Auth0 real esté restringida. La base representa al operador M2M, no autorización por propietario. La protección frente a inyección se demuestra con fixtures puntuales y no prueba inmunidad general.
- `npm test` verifica contrato/schemas, salidas minimizadas, consulta, aclaración de ID faltante sin llamar al modelo/tool, aprobación y rechazo, idempotencia, scope, conflicto, estado parcial y fixtures de inyección con MCP stdio real y API simulada. No valida la API de Clase 07, una interacción humana real, Auth0 real ni Ollama. No se declara validado el recorrido integrado con modelo.


## Preparación y límites de la interfaz web

WebSocket une navegador y host. MCP usa stdio entre el cliente y servidor; HTTP/OAuth une el adaptador con la API. No se envían secretos al navegador ni al modelo.

Límites locales: máximo 4 conexiones, 30 mensajes/minuto por conexión, 8192 bytes por frame, una operación activa por sesión, 100 requestId y hasta 20 operaciones retenidas por sesión. Pedir aprobación no ejecuta la mutación. El servidor valida Origin/Host y cookie de arranque HttpOnly SameSite=Strict; no es un login ni permite exponer el laboratorio por LAN. Al alcanzar el límite de sesión se necesita reconectar y consultar el estado antes de continuar. La aprobación pendiente dura como máximo el resto del ciclo de 90 s; la firma emitida conserva su vigencia de 120 s para replay manual.

Los resultados de API se muestran siempre como datos autoritativos. Un comentario generado puede ser incorrecto y no reemplaza esos datos. La interfaz utiliza texto seguro, no HTML del modelo. Para detenerla usá Ctrl+C; cierra las conexiones MCP y los procesos hijos asociados.
