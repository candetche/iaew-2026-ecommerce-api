# Clase 08 — Preparación del modelo y del chat web local

Completá esta preparación antes de la clase. La descarga del modelo y la instalación no forman parte de los 45 minutos de actividad. El modelo local es obligatorio y no requiere una suscripción paga. Si el preflight falla, resolvé la preparación con el docente antes de iniciar la actividad.

## 1. Identificá qué vas a instalar

**Ollama** es el programa que ejecuta modelos en tu equipo. **Llama 3.2 3B** es el modelo que vamos a descargar con el identificador `llama3.2:3b`. **MCP** es otro componente: instalar y conversar con Llama todavía no conecta el modelo con nuestra API.

Necesitás acceso a Internet para descargar, espacio para Ollama y el modelo (aproximadamente 2 GB de descarga del modelo, más instalación y archivos de trabajo), y Node.js para ejecutar la comprobación. La referencia docente probada es Node 22.17.0 y Ollama 0.34.4. Otra versión necesita pasar las mismas comprobaciones.

El ensayo docente usó un Mac M2 Pro con 16 GiB de memoria. No es un requisito mínimo garantizado: la prueba debe hacerse con los servicios de tu práctica también levantados cuando estén disponibles.

## 2. Instalá Ollama

### Windows

Descargá y ejecutá el instalador desde [Ollama para Windows](https://ollama.com/download/windows). Abrí Ollama y una nueva terminal PowerShell. Para este recorrido ejecutá Node y el cliente del chat en Windows, junto al Ollama nativo. Docker Desktop puede seguir ejecutando la API y sus dependencias.

Si elegís ejecutar el cliente en WSL o dentro de un contenedor, `localhost` puede referirse a otro entorno. Ese recorrido requiere verificar la conexión por separado; no cambies la dirección de escucha de Ollama para exponerlo en la red.

### macOS

Descargá Ollama desde [Ollama para macOS](https://ollama.com/download/mac), instalalo y abrí la aplicación. Abrí una terminal nueva.

### Linux

Seguí la [instalación oficial de Ollama para Linux](https://docs.ollama.com/linux). Comprobá que el servicio esté activo. Si lo instalaste para ejecutarlo manualmente y todavía no está iniciado, usá `ollama serve` en otra terminal. No inicies un segundo servidor si el servicio ya está funcionando.

## 3. Comprobá el programa y descargá el modelo

En una terminal:

```bash
ollama --version
ollama pull llama3.2:3b
ollama list
ollama show llama3.2:3b
node --version
```

Esperado: Ollama y Node informan sus versiones; el listado incluye exactamente `llama3.2:3b`; la información del modelo incluye soporte de herramientas (`tools`). No hace falta crear una cuenta ni una API key de Ollama para este modelo local.

## 4. Probá una conversación simple

```bash
ollama run llama3.2:3b
```

Escribí: `Explicá en una frase qué es una API.` Después salí con `/bye`.

Esto comprueba generación de texto. No demuestra que el modelo pueda consultar pedidos ni que MCP esté conectado.

## 5. Comprobá herramientas y latencia

Desde la carpeta de esta clase:

```bash
node recursos/preflight-ollama.mjs
```

La prueba usa un pedido ficticio y una respuesta preparada, sin credenciales ni acceso a la API. Comprueba que el modelo propone la herramienta con el ID exacto y utiliza el resultado que le devuelve la aplicación. Ejecuta una primera consulta y tres consultas calientes.

Esperado: tres ciclos calientes correctos de hasta 15 segundos y mensaje de preparación aprobada. Conservá la salida con modelo, duración y resultado; no hace falta una captura de la conversación completa.

Todavía falta la prueba integrada de la actividad: cliente MCP, servidor MCP y API real con autenticación. Un preflight aprobado no reemplaza esa evidencia. Tampoco garantiza que el modelo siempre siga las instrucciones: la aplicación debe validar argumentos y permisos.

## 6. Si algo falla

- **No encuentra `ollama` o `node`:** cerrá y abrí la terminal después de instalar; comprobá que el programa esté disponible en ella.
- **Conexión rechazada en el puerto 11434:** abrí Ollama o verificá su servicio. Cliente y servidor deben compartir el entorno de red previsto.
- **Modelo no encontrado:** repetí la descarga antes de la clase y verificá el nombre exacto.
- **Lentitud o falta de memoria:** cerrá aplicaciones que no uses y repetí la prueba con el entorno de laboratorio previsto. Si sigue fallando, registrá el error y revisá con el docente un equipo preparado con el mismo modelo antes de iniciar la actividad.
- **Tool o ID incorrectos:** conservá el resultado y corregí la preparación con el docente; no se corrige concediendo más permisos al modelo.

Para liberar el modelo de memoria al terminar:

```bash
ollama stop llama3.2:3b
```

El modelo descargado se conserva para la próxima ejecución.

## Credenciales de la actividad

La preparación de Ollama no utiliza credenciales Auth0. Para configurar las credenciales de la práctica integrada, seguí la sección “Antes de la práctica” del [README del laboratorio](recursos/laboratorio/README.md) y completá únicamente el `config.local.env` local del paquete elegido. Los secretos no se envían al modelo, no se incluyen en evidencias y no se comparte el archivo docente de credenciales.

Fuentes de instalación: [inicio oficial](https://docs.ollama.com/quickstart), [Windows](https://docs.ollama.com/windows) y [Linux](https://docs.ollama.com/linux). Consultadas el 17/10/2026. Instalación limpia validada solo cuando se ejecute en cada sistema; el ensayo docente comprueba macOS con Ollama previamente instalado.


## 7. Iniciá el chat web del laboratorio

Esta preparación se completa antes de los 45 minutos. La interfaz viene construida; durante la práctica completás los tres fragmentos de `src/server.js` indicados en la actividad. Iniciá primero la API de Clase 07 y sus dependencias según su guía; la API debe estar en `http://127.0.0.1:3008`.

Abrí una terminal dentro de `recursos/laboratorio/inicio/` (o `solucion-docente/` para el docente). Prepará `config.local.env` como indica el README del laboratorio. Instalá las dependencias locales con el lockfile:

```bash
npm ci --userconfig=./npm-user-empty.conf --globalconfig=./npm-global-empty.conf --registry=https://registry.npmjs.org
node --env-file=./config.local.env src/web.js
```

Abrí `http://127.0.0.1:3018` y verificá que la interfaz muestre **Modelo local**. Si no conecta o el modelo falla, resolvé ese problema antes de continuar con la actividad.

Con las variables ya cargadas en el entorno también podés usar `npm run web`. `WEB_PORT=3018` es opcional y conserva el puerto predeterminado; si lo cambiás en `config.local.env`, abrí ese puerto. No cargues el archivo de credenciales de otra carpeta.

El servicio escucha solo en `127.0.0.1`. No lo expongas por LAN. El navegador usa WebSocket con el host; MCP conserva stdio entre cliente y servidor, y la API conserva HTTP/OAuth. No copies tokens, secretos ni claves de aprobación al navegador o al chat.

Usá `consulta <ID>` o `confirmar <ID>` con un identificador real de prueba. **Leer documentación de pedidos** lee explícitamente `iaew://docs/pedidos`. Una confirmación presenta **Aprobar/Rechazar** para el pedido exacto: el backend valida y firma la aprobación de la sesión. El resultado autoritativo aparece separado del comentario opcional del modelo.

Tras una confirmación exitosa, el botón **Repetir operación con la clave original** permite replay durante los 120 segundos de vigencia de esa confirmación. Escribir nuevamente `confirmar <ID>` crea una operación nueva. Ante timeout, `503` o desconexión, verificá el estado antes de cualquier nueva acción y no uses replay. La reconexión es manual y no reenvía operaciones.



Si el chat no conecta, comprobá que el host siga activo, que usás el puerto configurado y que la API haya iniciado antes. **Reconectar** abre una sesión nueva: no restaura aprobaciones ni repeticiones de la anterior. La evidencia de preparación no equivale a una corrida integrada: consultá la [validación web](validacion-web.md), con integración técnica comprobada y ensayo humano pendiente.
