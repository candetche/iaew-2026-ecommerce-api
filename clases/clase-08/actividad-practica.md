# Actividad individual — Del chat a una API mediante IA y MCP

## 1. Qué vas a construir y comprobar

Vas a completar un servidor MCP para que un chat web consulte y confirme pedidos en una API real. Vas a usar **un único recorrido con modelo local obligatorio**:

```text
Navegador: chat y botones
    │ WebSocket
Host: coordina Ollama/llama3.2:3b, valida propuestas y pide aprobación
    │ Cliente MCP, por stdio
Servidor MCP: herramientas y adaptación a HTTP
    │ HTTP + token OAuth obtenido de Auth0
API de pedidos → MongoDB / RabbitMQ → worker
```

El modelo propone una herramienta y sus argumentos; no ejecuta la API directamente. El host valida la propuesta, la persona aprueba las confirmaciones y la API verifica permisos y reglas de negocio. El resultado real se muestra separado del comentario opcional del modelo.

### 1.1. Componentes: qué son y dónde están

Las rutas de esta tabla parten de `clases/clase-08/recursos/laboratorio/inicio/`, salvo la API, Compose y los servicios externos, indicados expresamente. **Tu carpeta de trabajo es `inicio/`; el archivo que vas a programar es `servidor-mcp/server.js`.**

| Componente | Dónde está | Para qué sirve y qué vas a hacer |
|---|---|---|
| **Chat web** | `chat-web/index.html`, `app.js` y `styles.css` | Pantalla que abrís en el navegador. Escribís solicitudes y usás Aprobar/Rechazar; no modificás estos archivos. |
| **Servidor web del host** | `host/web.js` | Sirve la pantalla y recibe WebSocket. Lo iniciás con Node después de completar el código; no lo modificás. |
| **Coordinador y cliente MCP** | `host/host.js` | Llama al modelo, valida la propuesta y usa el cliente MCP para invocar herramientas. Ya está implementado. |
| **Servidor MCP** | `servidor-mcp/server.js` | Publica tools y el resource, llama a la API y reduce su respuesta. **Acá completás los tres TODO de la actividad.** |
| **Validaciones y aprobación** | `compartido/security.js` | Define validaciones y firma/verificación de aprobaciones. Se importa desde otros componentes; no es otro servicio y no lo modificás. |
| **Pruebas y datos de prueba** | `test/` y `fixtures/` | Comprueban el código en situaciones controladas. Ejecutás `npm test`; no cambiás los tests para hacerlos pasar. |
| **Configuración personal** | `config.local.env` | Completás dominio, audience y credenciales M2M. Queda fuera de Git y de la entrega. |
| **Servicios de la API** | `../compose.yaml`, desde `inicio/` | Levanta API, MongoDB, RabbitMQ y worker. Lo ejecutás con Docker Compose; no tenés que construir esos servicios. |
| **Código de API y worker** | Desde la raíz del repo: `clases/clase-07/recursos/laboratorio/src/` | Sistema de pedidos que reutiliza el Compose de Clase 08. No modificás ese código en esta actividad. |
| **Modelo local** | Ollama, instalado fuera del repo, en el puerto `11434` | Descargás `llama3.2:3b`, iniciás Ollama y validás inferencia con el preflight. Los pesos del modelo no están en Git. |
| **Proveedor de identidad** | Auth0, fuera del repo | Emite el token para que el servidor acceda a la API. Usás una aplicación M2M previamente autorizada. |

#### Estructura de la carpeta de trabajo

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

### 1.2. Qué vas a completar

El repositorio incluye la página del chat y el código que conecta sus mensajes con el modelo y con MCP. También incluye la operación para confirmar pedidos, los botones para aprobarla o rechazarla y las pruebas automáticas. No tenés que construir esas partes.

Tu trabajo está en `clases/clase-08/recursos/laboratorio/inicio/servidor-mcp/server.js`. Ese archivo tiene tres partes incompletas, marcadas con `TODO`:

1. **Consultar un pedido:** buscar el identificador solicitado en la respuesta de la API y devolver solamente su identificador y estado.
2. **Listar pedidos pendientes:** seleccionar los pedidos cuyo estado sea `pendiente` y devolver hasta diez, también con identificador y estado.
3. **Habilitar ese listado como herramienta MCP:** agregar la declaración que permite al host descubrir y llamar a `listar_pedidos_pendientes`.

La sección 3.2 explica dónde agregar cada bloque, incluye el código completo y muestra cómo comprobar que funciona. Trabajá sobre la carpeta `inicio/`, que contiene los tres puntos pendientes de la actividad.

**Modalidad:** individual. **Práctica:** 45 minutos después de preparar el entorno. **Entrega:** `servidor-mcp/server.js` completado y `resultado-tests.txt`. La instalación y las descargas pueden tardar bastante: hacé la sección 2 antes de clase.

Este documento contiene el recorrido desde la descarga del repo. No necesitás haber ejecutado otra actividad. El Compose incluido reutiliza el código de la API de Clase 07 que ya está en el mismo repositorio; levanta API, MongoDB, RabbitMQ y worker. La actividad observa logs y correlación del host/MCP; no requiere iniciar Grafana ni el stack completo de observabilidad.

## 2. Preparación desde cero — antes de iniciar los 45 minutos

### 2.1. Instalá y verificá las herramientas

Necesitás Git, Node.js **22.17.0 o posterior**, npm, Docker con Compose v2 y Ollama. Abrí Docker Desktop y Ollama antes de verificar. No alcanza con tenerlos instalados: sus servicios deben estar activos.

- Git: instalalo desde <https://git-scm.com/downloads> si falta.
- Node.js: instalador de <https://nodejs.org/en/download>. Si usás nvm, ejecutá `nvm install 22.17.0` y `nvm use 22.17.0`. Después abrí una terminal nueva si el comando todavía informa una versión vieja.
- Docker Desktop: seguí el instalador para tu sistema en <https://docs.docker.com/desktop/>. En Windows usá contenedores Linux y WSL 2 cuando el instalador lo requiera. En Linux también sirve Docker Engine con el plugin Compose v2.
- Ollama: descargá e instalá desde <https://ollama.com/download> y abrí la aplicación. En Linux iniciá `ollama serve` en una terminal si el servicio no está activo. Si dice que el puerto ya está ocupado, comprobá si Ollama ya está ejecutándose; no inicies una segunda instancia.

En una terminal ejecutá, uno por uno:

```bash
git --version
node --version
npm --version
docker --version
docker compose version
docker info
ollama --version
```

**Control:** todos deben funcionar; Node no puede ser menor que 22.17.0. `docker info` debe mostrar el servidor, sin error de conexión. Si algo falla, corregilo antes de seguir.

El equipo debe poder ejecutar Docker y el modelo al mismo tiempo. La evidencia docente corresponde a macOS con M2 Pro y 16 GiB; no es un requisito universal ni una garantía para otro equipo. La prueba de Ollama del paso 2.5 decide si tu entorno está listo. Si falta memoria, trabajá con el docente en un equipo preparado que ejecute el mismo recorrido; no reemplaces el modelo por llamadas programadas.

### 2.2. Descargá el repositorio y ubicá la carpeta

En la carpeta donde guardás tus proyectos:

```bash
git clone https://github.com/utn-frc-iaew/iaew-2026-ecommerce-api.git
cd iaew-2026-ecommerce-api
git switch main
cd clases/clase-08/recursos/laboratorio/inicio
```

**Usá `main`:** ahí están los materiales y el armazón de esta clase. La rama `clase-08-inicio` conserva la base anterior y no es el recorrido de descarga de esta guía. Si ya tenías el repo, actualizá tu copia sin sobrescribir cambios propios; no vuelvas a clonar encima de una carpeta existente.

Desde ahora, todos los comandos de esta guía se ejecutan en **`clases/clase-08/recursos/laboratorio/inicio/`**, salvo que se indique otra carpeta. Abrí esa carpeta en el editor. Si abrís otra terminal, volvé a ubicarte en ella.

Comprobá archivos y Node sin depender de comandos del sistema operativo:

```bash
node -e "const fs=require('node:fs');for(const p of ['package.json','package-lock.json','servidor-mcp/server.js','host/web.js','chat-web/index.html','compartido/security.js','../compose.yaml','../../datos-practica.mjs','../../preflight-ollama.mjs','../../../../clase-07/recursos/laboratorio/Dockerfile']){if(fs.existsSync(p) === false)throw new Error('Falta '+p)}console.log('Archivos encontrados')"
```

**Control:** debe decir `Archivos encontrados`. Si falta Clase 08, revisá la rama o consultá si el docente ya publicó el paquete. No crees archivos vacíos para eludir este control.

### 2.3. Configurá la identidad de la API

Necesitás que el docente te proporcione por un canal privado una aplicación **M2M autorizada** de Auth0 con dominio, client ID, client secret y audience de esta API. Debe tener estos scopes efectivos:

| Scope | Uso |
|---|---|
| `read:pedidos` | Comparar por HTTP, consultar y listar pedidos. |
| `write:pedidos` | Crear el pedido ficticio en la preparación. |
| `confirm:pedidos` | Confirmar el pedido desde el chat con aprobación. |

No alcanza con escribir esos nombres en el archivo o en un prompt: la aplicación M2M debe estar autorizada en Auth0. La preparación no modifica el tenant. Si no tenés una identidad autorizada, pedila antes de iniciar: **el repo no incluye credenciales reales**. Se usa identidad de servicio de operador, no login de alumnos ni autorización por dueño de pedido.

Primero creá tu archivo de configuración local a partir de la plantilla incluida. La plantilla `config.example.env` contiene los nombres de las variables y valores de ejemplo; `config.local.env` será tu copia personal, donde completarás las credenciales. Este comando **solo copia el archivo**: no instala dependencias, no obtiene tokens, no completa los secretos ni inicia servicios.

Ejecutalo desde `clases/clase-08/recursos/laboratorio/inicio/`:

```bash
node -e "require('node:fs').copyFileSync('config.example.env','config.local.env',require('node:fs').constants.COPYFILE_EXCL)"
```

Qué significa cada parte:

- `node -e`: ejecuta directamente el código JavaScript escrito entre las comillas dobles.
- `require('node:fs')`: usa el módulo de archivos incluido en Node; no requiere instalar otro paquete.
- `copyFileSync`: copia el contenido de `config.example.env` al archivo `config.local.env`, en la carpeta actual.
- `COPYFILE_EXCL`: impide reemplazar un archivo de destino existente, para conservar cualquier configuración o credencial que ya hayas cargado.

**Resultado esperado:** si la copia se realiza correctamente, vuelve el prompt sin imprimir un mensaje. Abrí `config.local.env` en el editor y completalo. Si aparece `EEXIST`, el archivo ya existía y quedó intacto: usá ese archivo, no lo borres para repetir el comando. Si aparece `ENOENT`, comprobá que estés en `inicio/` y que exista `config.example.env`. No muestres el contenido de tu configuración en capturas ni la subas a Git; está ignorada mediante `.gitignore`.

**Compatibilidad:** el mismo comando utiliza la API de archivos de Node y comillas dobles externas; está previsto para zsh/Bash en macOS/Linux y PowerShell/CMD en Windows, con Node instalado. Se ejecutaron pruebas reales de copia y rechazo de sobrescritura en macOS (zsh/Bash) y Linux (contenedor con Node 22.17.0). Windows se revisó contra la documentación de Node, pero no se ejecutó en esta validación. Referencias: [copia de archivos y COPYFILE_EXCL](https://nodejs.org/docs/latest-v22.x/api/fs.html#fscopyfilesyncsrc-dest-mode) y [node -e y comillas de terminal](https://nodejs.org/api/cli.html#-e---eval-script).

Editá `config.local.env` en tu editor:

```dotenv
API_BASE_URL=http://127.0.0.1:3008
AUTH0_DOMAIN=TU_TENANT.us.auth0.com
AUTH0_CLIENT_ID=TU_CLIENT_ID
AUTH0_CLIENT_SECRET=TU_CLIENT_SECRET
AUTH0_AUDIENCE=https://iaew-pedidos-api
WEB_PORT=3018
OLLAMA_MODEL=llama3.2:3b
OLLAMA_URL=http://127.0.0.1:11434
INTERNAL_API_KEY=iaew-clase08-local
```

Reemplazá los tres valores `TU_...` y confirmá el audience con el docente. `AUTH0_DOMAIN` va **sin `https://` ni barras**. Conservá el formato `NOMBRE=valor`, sin espacios alrededor de `=`. No copies el archivo de configuración de otra persona.

`INTERNAL_API_KEY` es una clave exclusiva del entorno local para crear el producto ficticio; no sustituye OAuth en pedidos. El Compose y el script leen el mismo archivo, pero solo el host/servidor MCP reciben las credenciales M2M necesarias; el navegador y el modelo no las reciben.

### 2.4. Instalá dependencias y comprobá el estado inicial del código

Ejecutá estos comandos **uno por uno**, desde `inicio/`:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
```

Instala las dependencias con las versiones de `package-lock.json`. Los dos archivos `.conf` incluidos contienen solo comentarios: evitan heredar configuraciones de npm con credenciales ajenas. No hace falta ejecutar además `npm install`.

```bash
npm run check
```

Comprueba la **sintaxis JavaScript** de los archivos del paquete. Debe terminar sin errores. Todavía no comprueba que una consulta devuelva el resultado correcto: para eso usamos las pruebas siguientes.

```bash
npm test
```

**¿Qué hace `npm test`?** Ejecuta el script `test` definido en `package.json`, que en este proyecto es `node --test`. Node busca y ejecuta las pruebas de `test/lab.test.js` y `test/web.test.js`. Cada prueba prepara una situación controlada, llama al código y compara el resultado obtenido con el esperado. Por ejemplo: que se descubran tres herramientas, que una consulta devuelva solo ID/estado y que rechazar una confirmación no modifique el pedido.

Las pruebas levantan una API de prueba local, un servidor MCP real por stdio y conexiones WebSocket para los casos que lo necesitan. Las respuestas del modelo y la identidad de la API se simulan de manera controlada. **No necesitás iniciar Docker, Ollama ni configurar Auth0 para ejecutar esta suite.** No usa tu `config.local.env`, no consulta tus pedidos reales y no acredita todavía el recorrido integrado con el modelo.

**Cómo leer la salida:**

- `✔` u `ok`: la prueba aprobó.
- `✖` o `not ok`: el resultado obtenido no coincide con el esperado; debajo aparece el nombre de la prueba y el detalle.
- `AssertionError`, `actual` y `expected`: indican qué resultado obtuvo la prueba y cuál esperaba. No significan por sí mismos un error de instalación.
- Las líneas JSON con `host.tool` o `host.approval` son registros de las operaciones de prueba; una aprobación o confirmación que aparezca ahí no es una aprobación humana ni una modificación de la API real.
- Al final, buscá `tests`, `pass` y `fail` —el formato exacto puede variar según la terminal— para conocer el total y el resultado.

**Resultado esperado antes de completar el código:**

```text
tests 29
pass 23
fail 6
```

El comando termina indicando fallas porque el armazón se entrega incompleto. En esta etapa son esperables exactamente estas seis:

| Prueba que falla | Motivo en el armazón inicial |
|---|---|
| MCP descubre tres tools con schemas de salida y el resource estático | Todavía no registraste la herramienta de listado (`T03-B`). |
| Listado de pendientes filtra por estado, limita a 10 y proyecta solo ID/estado | Faltan la herramienta y la proyección de pendientes (`T03-B` y `T03-C`). |
| Listado de pendientes informa errores de la API sin datos crudos | La herramienta aún no está registrada (`T03-B`). |
| El host ejecuta el listado sin aprobación y no acepta argumentos propuestos por el modelo | El host intenta usar la herramienta de listado que todavía falta (`T03-B`). |
| Consulta proyecta solo ID/estado y excluye datos personales e inyección indirecta | `mapPedidoFromListado` todavía devuelve `undefined` (`T03-A`). |
| El host no pasa texto malicioso de respuesta indirecta al modelo | Ese recorrido también depende de la consulta incompleta (`T03-A`). |

Por eso podés ver errores como `TOOL_RESULT_INVALID`, `ORDER_NOT_FOUND` o comparaciones `1 !== 2` en estas pruebas iniciales: son consecuencias de los fragmentos pendientes dentro de los casos controlados. **No los soluciones cambiando credenciales, reinstalando paquetes ni modificando los tests.** Completá A, B y C en la sección 3.2 y volvé a ejecutar `npm test`; entonces deben aprobar **29/29, con cero fallas**.

Si ahora obtenés esas seis fallas y las otras 23 pruebas aprueban, el control inicial está cumplido: continuá con la preparación de Ollama. Si falla `npm run check`, faltan dependencias o aparece una falla distinta, resolvé ese problema antes de seguir.

### 2.5. Descargá Llama y probá inferencia real

**Ollama** es el programa que ejecuta modelos; **Llama** es el modelo que vas a descargar. No son el mismo componente.

```bash
ollama pull llama3.2:3b
ollama list
node ../../preflight-ollama.mjs
```

**Control:** `ollama list` muestra `llama3.2:3b`. El preflight ejecuta cuatro ciclos con el modelo; el primero permite la carga inicial y los tres calientes deben seleccionar la tool/ID esperados, mencionar el estado recibido y tardar hasta 15 segundos cada uno. Al final debe decir `Preparación local aprobada`. Esa prueba usa un resultado de herramienta ficticio: comprueba inferencia, no MCP ni la API real.

Si no aprueba, conservá el error, verificá que Ollama esté activo, cerrá aplicaciones que consumen memoria y repetí la preparación con el docente. No cambies permisos, modelo ni recorrido para simular un resultado aprobado. Los modelos locales no requieren una suscripción paga; Auth0 y la descarga inicial sí requieren conexión de red.

### 2.6. Levantá la API, la base, el broker y el worker

Todavía desde `inicio/`:

```bash
docker compose --env-file ./config.local.env -f ../compose.yaml up -d --build --wait --wait-timeout 180
docker compose --env-file ./config.local.env -f ../compose.yaml ps
node -e "fetch('http://127.0.0.1:3008/health').then(async r=>{if(r.ok === false)throw new Error('HTTP '+r.status);console.log(await r.json())}).catch(e=>{console.error(e.message);process.exitCode=1})"
```

**Control:** Compose informa API, MongoDB y RabbitMQ saludables y worker en ejecución; `/health` devuelve `{ status: 'ok' }`. La primera construcción descarga imágenes y dependencias. No necesitás instalar MongoDB o RabbitMQ en tu máquina, ni iniciar el Compose de otra clase. MongoDB y RabbitMQ no publican puertos al host; la API se publica solo en `127.0.0.1:3008`.

Si ya tenías una API usando el puerto 3008, detené únicamente el entorno propio que lo ocupa antes de iniciar este. No ejecutes limpiezas globales ni borres contenedores de otros proyectos.

Para diagnóstico:

```bash
docker compose --env-file ./config.local.env -f ../compose.yaml logs --tail 40 api worker
```

No uses `docker compose config` para generar evidencia: su salida puede expandir valores del entorno. `/health` solo verifica que la API responda; el paso siguiente verifica identidad, lectura y datos de negocio.

### 2.7. Creá y verificá el pedido de prueba

```bash
node --env-file=./config.local.env ../../datos-practica.mjs preparar
node --env-file=./config.local.env ../../datos-practica.mjs estado
```

El script incluido obtiene un token de Auth0 sin imprimirlo, consulta la API, comprueba los scopes a partir de la identidad validada por la API y crea un producto ficticio con stock 10 y un pedido de **dos unidades**. Guarda únicamente IDs en `datos-practica.json`; **no tenés que escribir este script ni crear datos a mano**.

**Control:** la salida muestra `preparado: true`, un `pedidoId` de 24 caracteres hexadecimales y `estado: "pendiente"`. La consulta `estado` debe mostrar stock **10** y `eventoId: null`. Copiá el valor de `pedidoId` a tu nota temporal: reemplaza `<ID>` en todos los mensajes siguientes. No copies tokens ni el cuerpo completo de `/pedidos`.

Si volvés a ejecutar `preparar` y el pedido guardado sigue pendiente, lo reutiliza. Después de confirmarlo, otra ejecución de `preparar` crea nuevos datos para una nueva práctica. No lo ejecutes entre confirmación y replay: en ese tramo tenemos que comprobar la misma operación y el mismo pedido.

### 2.8. Puerta de entrada a la práctica

Solo iniciá los 45 minutos si podés marcar todos estos puntos:

- [ ] Estás en `main` y existen los archivos de Clase 08 y la API reutilizada.
- [ ] Node ≥22.17.0, dependencias instaladas y sintaxis correcta.
- [ ] Suite inicial: 29 pruebas, exactamente 6 fallas por los tres TODO.
- [ ] Ollama tiene `llama3.2:3b` y el preflight aprobó.
- [ ] Compose está activo y `/health` responde.
- [ ] Auth0 autorizó lectura, creación y confirmación; el script de preparación terminó correctamente.
- [ ] Tenés un pedido pendiente propio del laboratorio y stock 10.

Todavía **no inicies el chat**: primero completás los tres fragmentos. Así el proceso MCP se abrirá con el código actualizado.

## 3. Práctica de 45 minutos

### 3.1. Validación inicial · 5 minutos

Repasá el checklist anterior y ejecutá otra vez:

```bash
node --env-file=./config.local.env ../../datos-practica.mjs estado
```

Debe seguir pendiente, con stock 10. Usá ese mismo ID durante todo el recorrido. No cambies las políticas de seguridad ni el código de confirmación.

### 3.2. Completá el servidor MCP · 10 minutos

#### ¿Qué tiene de particular este servidor?

`servidor-mcp/server.js` **no es otra API REST ni el servidor de la página del chat**. Es un adaptador construido con el SDK de MCP: publica capacidades que el cliente MCP del host puede descubrir e invocar mediante un contrato común.

En este laboratorio:

- El host inicia el servidor como un proceso local y se comunica con él por **stdio** (entrada y salida estándar). Este servidor MCP no abre un puerto HTTP para recibir conexiones.
- Las operaciones se declaran con `server.registerTool`: cada una tiene nombre, descripción, schema de entrada, schema de salida y una función que la ejecuta. No se declaran rutas de Express para exponerlas al host.
- Dentro de esa función, el servidor sí llama por **HTTP a la API de pedidos existente**. Obtiene el token OAuth en backend y adapta el resultado al contrato de la herramienta. La API sigue verificando permisos y reglas de negocio.
- También publica el resource `iaew://docs/pedidos`, un documento que el host puede leer explícitamente. No es una ruta REST ni una consulta del estado actual.

Por ejemplo, el host solicita `consultar_estado_pedido({ pedidoId })` por MCP. El servidor traduce esa solicitud a `GET /pedidos`, busca el pedido en la lista y devuelve un resultado mínimo. La herramienta existe para que la aplicación pueda ofrecer esa capacidad al modelo; el modelo solo propone usarla y el host controla su invocación.

#### ¿Qué significa «proyectar una consulta»?

Acá **proyectar significa construir un objeto con solo los campos que necesitamos de la respuesta de la API**. No significa ejecutar otra consulta, cambiar el pedido ni copiar su documento completo. Es una transformación de datos en el adaptador.

La consulta tiene dos operaciones distintas:

1. **Seleccionar el pedido:** buscar en el listado el elemento cuyo `_id` coincide con `pedidoId`.
2. **Proyectar sus datos:** construir la salida con `pedidoId` y `estado`, dejando afuera los demás campos.

Ejemplo simplificado de un elemento recibido de la API:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "estado": "pendiente",
  "total": 200,
  "cliente": { "nombre": "Cliente ficticio" }
}
```

Datos de ese pedido que conserva la proyección:

```json
{
  "pedidoId": "507f1f77bcf86cd799439011",
  "estado": "pendiente"
}
```

Observá que `_id` se transforma en `pedidoId` y que `total` y `cliente` no se copian. Así el host recibe lo necesario para responder sin exponer el objeto completo al modelo. El servidor envolverá esta proyección en el resultado MCP, que también informa si la operación fue correcta o produjo un error.

En el listado de pendientes aplicás la misma idea a varios pedidos: primero filtrás por estado, después conservás ID/estado y finalmente limitás la lista a diez elementos. **Reducir campos no reemplaza la autorización:** la API debe permitir la lectura antes de que el adaptador transforme la respuesta.

#### Ahora completá los tres fragmentos

Abrí `servidor-mcp/server.js` de **`inicio/`**. Los imports, `ORDER_ID`, `MAX_PENDIENTES`, `OUTPUT_SCHEMA`, `result`, `api` y los manejadores de error ya existen: no los vuelvas a declarar. Solo reemplazás los tres lugares indicados.

#### A. Proyectar una consulta — `TODO T03-A`

Buscá `mapPedidoFromListado` al final del archivo y reemplazá **toda esa función** por:

```js
export function mapPedidoFromListado(pedidos, pedidoId) {
  const pedido = pedidos.find(item => item?._id === pedidoId);
  if (!pedido || typeof pedido.estado !== 'string') return undefined;
  return { pedidoId, estado: pedido.estado };
}
```

La API ofrece `GET /pedidos`, no `GET /pedidos/{id}`. Esta función selecciona el ID del listado y proyecta solamente los campos necesarios. No devuelve email, ítems ni el documento original.

#### B. Proyectar los pendientes — `TODO T03-C`

Justo encima está `mapPendientesFromListado`. Reemplazá **toda esa función** por:

```js
export function mapPendientesFromListado(pedidos) {
  const pendientes = pedidos
    .filter(item => item?.estado === 'pendiente' && typeof item._id === 'string' && ORDER_ID.test(item._id))
    .map(item => ({ pedidoId: item._id, estado: item.estado }));
  return {
    total: pendientes.length,
    pedidos: pendientes.slice(0, MAX_PENDIENTES),
    truncado: pendientes.length > MAX_PENDIENTES
  };
}
```

Filtrás pedidos pendientes válidos y devolvés hasta 10. `total` cuenta todos los pendientes; `truncado` informa si el límite dejó algunos afuera.

#### C. Registrar la herramienta — `TODO T03-B`

Dentro de `createMcpServer`, buscá el comentario `TODO T03-B`, entre el registro de `consultar_estado_pedido` y el de `confirmar_pedido`. **Reemplazá ese comentario por el bloque siguiente**, dentro de la función existente:

```js
  server.registerTool('listar_pedidos_pendientes', {
    description: 'Lista como máximo 10 pedidos en estado pendiente, solo con ID y estado. No recibe argumentos.',
    inputSchema: {},
    outputSchema: OUTPUT_SCHEMA
  }, async (_args, extra) => {
    const correlationId = typeof extra?._meta?.correlationId === 'string' && extra._meta.correlationId.length <= 64
      ? extra._meta.correlationId : randomUUID();
    const { response, payload, failure, ambiguous } = await api.request('/pedidos', {
      correlationId, operation: 'listar_pedidos_pendientes'
    });
    if (failure) return result(errorResultForFailure(failure, 'listar_pedidos_pendientes', ambiguous), true);
    if (!response.ok) return result(mapApiError(response.status, payload, 'listar_pedidos_pendientes'), true);
    if (!Array.isArray(payload)) return result({ status: 'error', code: 'API_RESPONSE_INVALID' }, true);
    return result({ status: 'ok', ...mapPendientesFromListado(payload) });
  });
```

El nombre permite descubrir la capacidad; el schema vacío indica que no recibe argumentos; el schema de salida limita el contrato. El handler consulta la API, conserva errores seguros y usa la proyección que completaste. No necesita aprobación porque no modifica datos, pero la API exige `read:pedidos`.

#### D. Comprobá antes de abrir el chat

```bash
npm run check
npm test
```

**Control:** 29 pruebas aprobadas y ninguna fallida. Si falla consulta, revisá A; si falla proyección de pendientes, B; si no aparece la tercera tool, C. No cambies los tests para conseguir un resultado aprobado.

### 3.3. Iniciá el chat y recorré una consulta · 10 minutos

En esta terminal ejecutá y **dejá el proceso abierto**:

```bash
node --env-file=./config.local.env host/web.js
```

Debe informar `Chat local: http://127.0.0.1:3018`. Abrí exactamente esa dirección y comprobá **Conectado** y **Modelo local**. Esta terminal muestra los logs del host y MCP; usá una **segunda terminal en la misma carpeta `inicio/`** para las comprobaciones HTTP.

Si editás `server.js` después de iniciar el chat, detené el host con Ctrl+C, ejecutá otra vez el comando y recargá el navegador. Ejecutar tests no recarga el proceso abierto.

En el navegador:

1. Pulsá **Leer documentación de pedidos**. Debe aparecer el contenido de `iaew://docs/pedidos`. Lo seleccionaste explícitamente; no apareció automáticamente en el contexto del modelo.
2. Escribí `pendientes`. Debe devolver tu pedido pendiente y solo ID/estado, total y límite de listado. Se usa `listar_pedidos_pendientes()`.
3. Escribí `consulta <ID>`, reemplazando `<ID>` por el ID guardado. No escribas los signos `< >`. Debe aparecer la tool validada y una tarjeta autoritativa con el mismo ID y estado pendiente. Se usa `consultar_estado_pedido({ pedidoId })`.
4. En la segunda terminal ejecutá `node --env-file=./config.local.env ../../datos-practica.mjs estado`. Compará el estado HTTP con la tarjeta. El script consulta la API directamente: es tu comprobación independiente del modelo y MCP.
5. Escribí `consulta` sin ID. El host debe pedir el identificador y detener el flujo, sin consultar ni inventarlo.

La gramática es acotada: `pendientes`, `consulta <ID>` y `confirmar <ID>`. La interfaz muestra la propuesta después de validarla y el resultado de la operación; no es un visor de todo el contexto o la respuesta cruda del modelo. El comentario opcional puede equivocarse: la tarjeta y la comprobación HTTP acreditan el dato.

### 3.4. Rechazá, aprobá y repetí la misma operación · 20 minutos

Usá el **mismo pedido** y mantené abierta la página:

1. Escribí `confirmar <ID>`. Revisá el pedido y la acción del panel y pulsá **Rechazar**.
2. En la segunda terminal ejecutá el comando `estado`. Debe seguir **pendiente**, con stock **10** y `eventoId: null`. Esta es tu evidencia de rechazo sin mutación.
3. Escribí nuevamente `confirmar <ID>`. Es una **nueva solicitud**; el pendiente rechazado ya terminó. Revisá el nuevo panel y pulsá **Aprobar** antes de que venza.
4. Esperá el resultado autoritativo **confirmado**. Ejecutá `estado` y guardá el `eventoId`: el stock debe ser **8**, porque el pedido consume dos unidades. `notificacionEstado` pasará a `procesada` cuando el worker termine; si todavía está pendiente, repetí solo la consulta `estado` unos segundos después.
5. **Sin cerrar ni reconectar**, pulsá **Repetir operación con la clave original** antes de que venzan los 120 segundos de la aprobación firmada. La tarjeta debe indicar `Repetición: Sí`.
6. Ejecutá `estado` otra vez. Debe seguir confirmado, con stock **8** y el **mismo `eventoId`**. Esa evidencia acredita que el replay no descontó stock ni creó otro evento en este recorrido. No prueba concurrencia ni entrega exactamente una vez bajo cualquier falla.
7. En la terminal del host ubicá `host.tool` y `mcp.api` de una llamada: deben compartir `correlationId`. Anotá solo ID de correlación, tool, operación y resultado seguro; no copies credenciales o cuerpos completos.

Escribir otra vez `confirmar <ID>` después del éxito crea otra operación y **no es replay**. El permiso `confirm:pedidos` lo verifica la API; la aprobación expresa la decisión de la persona sobre la solicitud concreta. Ninguno sustituye al otro.

**Ante timeout, 503, desconexión o `VERIFICAR_ESTADO`:** detené las acciones. Ejecutá `estado` y registrá lo observado; no pulses replay ni reenvíes confirmación automáticamente. Una desconexión invalida aprobaciones y replay de la sesión. La consulta puede mostrar que el pedido se confirmó aunque la respuesta se haya perdido; no supongas que falló solo porque el chat no respondió.

## 4. Entrega

Entregá dos archivos:

1. `servidor-mcp/server.js` con los tres fragmentos completados.
2. `resultado-tests.txt` con todas las pruebas aprobadas.

Generá el segundo desde `inicio/`:

```bash
npm test > resultado-tests.txt 2>&1
```

**Control:** abrí `resultado-tests.txt` y comprobá que muestre 29/29 pruebas aprobadas y ninguna falla. No entregues `config.local.env`, tokens ni datos personales.

## 5. Si algo no funciona

| Síntoma | Qué revisar antes de continuar |
|---|---|
| `node` antiguo o `--env-file` falla | Abrí una terminal con Node ≥22.17.0. |
| Docker no responde | Abrí Docker Desktop; comprobá `docker info`. |
| `Falta ...` en archivos | Carpeta y rama `main`; no falta descargar un repo diferente. |
| `ECONNREFUSED` / timeout con Ollama | Servicio Ollama activo en 11434; modelo descargado y preflight aprobado. |
| `Auth0 POST /oauth/token → HTTP 401` | Dominio, client ID y secreto de la misma aplicación M2M autorizada para el audience. |
| `API GET /pedidos → HTTP 401` | La API rechazó el token. Si corregiste dominio/audience en el archivo, recreá API y worker para que lean los valores actuales. |
| HTTP 403 o `SCOPE_INSUFFICIENT` | Scopes efectivos de Auth0; no se resuelve ampliando permisos del modelo. |
| Error al crear producto | `INTERNAL_API_KEY` idéntica en el archivo usado por Compose y el script; si la cambiaste, recreá los servicios con `up`. |
| Puerto 3008 o 3018 ocupado | Detené solo la instancia propia que lo usa; no inicies dos hosts. |
| `pendientes` no descubre su tool | Completá C, reiniciá host y recargá. |
| Suite inicial distinta de 23/29 | Revisá instalación y cambios; la versión inicial tiene seis fallas intencionales. |
| Suite completada no pasa 29/29 | Revisá A, B y C sin modificar políticas ni tests. |
| Confirmación con conflicto 409 | Verificá el ID: posiblemente ya fue confirmado con otra clave. No confundas nueva confirmación con replay. |
| Stock 8 pero notificación pendiente | Consultá otra vez el estado y revisá logs del worker; no confirmes de nuevo. |
| Reconectaste y no hay replay | Era propio de la sesión anterior; no se recupera ni reenvía automáticamente. |

Si una dependencia sigue fallando, guardá el error seguro y pedí ayuda al docente. El recorrido sin modelo no es una resolución alternativa de esta actividad.

**Si corregís dominio o audience después de iniciar Docker:** guardar el archivo no actualiza las variables de los contenedores. Desde `inicio/`, ejecutá `docker compose --env-file ./config.local.env -f ../compose.yaml up -d --force-recreate --wait --wait-timeout 90 api worker` y repetí la preparación. Esto conserva la base. Un `restart` reutiliza la configuración anterior.

## 6. Cierre del entorno

Detené el host con Ctrl+C y luego, desde `inicio/`:

```bash
docker compose --env-file ./config.local.env -f ../compose.yaml down
```

Esto detiene únicamente el proyecto de Clase 08; el volumen conserva sus datos. No agregues `-v` salvo que quieras borrar expresamente esa base de laboratorio después de guardar evidencia. Cerrá Ollama si no lo vas a seguir usando. Conservá tus credenciales solo en el archivo local ignorado por Git.
