# Guía docente — Clase 08

## Propósito de la clase

La clase agrega una interfaz posible al sistema de pedidos existente: un operador expresa una intención y una aplicación puede convertirla en una propuesta estructurada. El foco es separar modelo, host, cliente/servidor MCP, API, permisos, aprobación y evidencia. La clase conserva las reglas del negocio.

**Duración total:** 120 minutos. **Actividad:** individual, 45 minutos con entorno preparado.  
**Materiales:** [presentación](presentacion/index.html), [material adicional](material-adicional/material-completo.md), [actividad práctica](actividad-practica.md), [preparación del entorno](preparacion-entorno.md) y [README del laboratorio](recursos/laboratorio/README.md).

## Antes de la clase

1. Revisá el [README del laboratorio](recursos/laboratorio/README.md), su preflight y las instrucciones para iniciar el armazón docente. No uses una configuración del alumno para demostrar credenciales.
2. Seguí la sección 2 de la actividad autocontenida: levantá `recursos/laboratorio/compose.yaml` con `--env-file ./config.local.env`, validá el modelo y ejecutá `datos-practica.mjs preparar` desde `inicio/` para crear el pedido ficticio. La API reutilizada de Clase 07 queda en `http://127.0.0.1:3008`. Desde `solucion-docente/`, con dependencias y `config.local.env` preparados, ejecutá `node --env-file=./config.local.env src/web.js` y abrí `http://127.0.0.1:3018`. Prepará la vista del orador y el modo de pantalla completa.
3. Ejecutá una vez el recorrido que vayas a presentar: consulta, rechazo sin cambio y acción aprobada. Si el entorno no está disponible, pasá al ejemplo anotado y explicitá que no es una ejecución en vivo.
4. Mantené separadas las evidencias históricas: el spike usó un issuer fixture y la corrida integrada de terminal del 17/10/2026 registró 20 checks. No son validación de la nueva interfaz web. Consultá [validacion-web.md](validacion-web.md): la integración web pasó 11/11 comprobaciones con aprobación automatizada; quedan pendientes la intervención humana y el ensayo hablado de 15 minutos. Mostrá siempre la tarjeta autoritativa separada del comentario opcional del modelo, que puede fallar o contradecir el resultado.
5. No incluyas secretos, tokens, pedidos personales o payloads crudos en las diapositivas ni en la proyección.

El paquete `inicio/` debe pasar 29/29 pruebas después de completar los tres fragmentos; antes de resolverlos, son esperables seis fallas relacionadas con esos puntos. La interfaz web ya está preparada y no agrega implementación frontend a los 45 minutos.

Para el nuevo recorrido web, no des por probados la aprobación humana, el ciclo completo con modelo/Auth0 ni otros sistemas operativos sin evidencia específica. La evidencia automatizada debe identificarse como tal.

## Secuencia de 120 minutos

| Tiempo | Bloque | Orientación |
|---|---|---|
| 0–12 | Continuidad y necesidad | Abrí con el mismo pedido. Por cada etapa previa nombrá el resultado y la pregunta que dejó. Pedí al grupo que identifique lo que ya está resuelto y quién autoriza la operación nueva. |
| 12–32 | Fundamentos de IA | Definí modelo de lenguaje, inferencia y contexto limitado. Contrastá una conjetura con un dato consultado. Explicá tool calling como propuesta, control del host y la diferencia entre asistente con una llamada y un agente con ciclo. Usá RAG solo como contraste. |
| 32–47 | Integraciones y MCP | Compará HTTP directo, función particular y MCP para la misma operación. Definí MCP como protocolo de intercambio de capacidades; recorré el diagrama de izquierda a derecha e identificá quién consume el servidor (host mediante su cliente). Recuperá Clase 04: navegador → WebSocket → host; luego MCP por stdio y HTTP/OAuth hacia la API. Son tramos diferentes dentro del mismo bloque. Diferenciá modelo, política del host, cliente, servidor, API, tool, resource y schema. |
| 47–62 | Demo y controles | Seguí el recorrido desde el mensaje del usuario hasta la respuesta y enumerá qué debe estar disponible/configurado. Mostrá propuesta del modelo, validación del host, llamada MCP, API, rechazo sin mutación, aprobación explícita, scopes, minimización, correlación y manejo del resultado incierto. |
| 62–107 | Práctica individual | Seguí la [actividad](actividad-practica.md), con checkpoints a los 5, 15, 25, 40 y 45 minutos. La instalación y descarga del modelo ya debieron completarse antes. |
| 107–115 | Evidencias y testing | Pedí reconstruir la inferencia real, la invocación MCP y la respuesta de la API. Conectá schemas y errores con testing de integración de la clase siguiente. |
| 115–120 | Profundización opcional | Presentá una pregunta de continuación, su prerrequisito, dificultad, carga/costo posible y proyecto pequeño. No agregues entrega ni actividad obligatoria. |

## Guion de demo de 15 minutos

| Min | Acción docente | Pregunta o control que debe quedar visible |
|---:|---|---|
| 0–2 | Mostrar el sistema acumulativo: host y cliente MCP entre el operador y el servidor/API existentes. Recuperar una evidencia registrada de Clase 07. | ¿Qué componentes reutilizamos y cuál es la capa nueva? |
| 2–5 | Situar interfaz, modelo, política y cliente dentro del host; identificar consumidores posibles y pulsar **Leer documentación de pedidos** para leer explícitamente `iaew://docs/pedidos`. | ¿Quién consume el servidor MCP? ¿El resource se agrega solo al contexto? |
| 5–8 | Escribir `consulta <ID>` para un pedido de prueba; mostrar resultado autoritativo separado del comentario y narrar persona → propuesta → validación → MCP → API → resultado → respuesta. | ¿Qué parte propuso el modelo? ¿Qué evidencia viene de la API? |
| 8–11 | Escribir `confirmar <ID>` y pulsar **Rechazar**; volver a consultar el pedido. | ¿Qué prueba que el rechazo no mutó el estado? |
| 11–13 | Volver a escribir `confirmar <ID>`, revisar el nuevo panel y pulsar **Aprobar** para esa operación concreta, verificar la API y pulsar **Repetir operación con la clave original** tras el éxito, dentro de sus 120 segundos de vigencia. | ¿Qué aporta la aprobación además del scope? |
| 13–15 | Revisar el registro correlacionado y señalar una instrucción maliciosa de fixture. | ¿Por qué un texto adverso no puede fabricar aprobación ni permiso? |

Si falla una etapa, detené la demo, registrá el error y corregí la dependencia antes de reanudar el mismo flujo con modelo local. Una captura o un ejemplo anotado pueden ayudar al diagnóstico, pero no acreditan que la actividad esté completada.

La interfaz admite `consulta <ID>` y `confirmar <ID>`, no lenguaje natural libre. El backend vincula y firma la aprobación de la sesión; los secretos nunca llegan al navegador. El host escucha solo en `127.0.0.1`, sin exposición por LAN. Reenviar el texto de confirmación crea otra operación: no es replay. Ante timeout, `503` o desconexión, detené la acción y consultá el estado; no uses replay ni reenvío automático. **Reconectar** abre una sesión nueva manualmente.


## Preguntas de facilitación y respuestas esperadas

- **¿MCP reemplaza HTTP o la API?** No. En este caso el servidor MCP adapta una operación a la API HTTP existente.
- **¿Quién consume MCP y cómo interactúa la persona?** El host mediante un cliente MCP. La persona usa la interfaz del host; el modelo puede proponer la tool, pero no habla directamente con el servidor ni conserva credenciales.
- **¿Qué hace falta para el recorrido?** Host con cliente MCP y política, servidor configurado y alcanzable, tools/schemas, API disponible y credencial con scopes en el proceso de confianza; Ollama con `llama3.2:3b` y tool calling comprobado mediante preflight.
- **¿La propuesta del modelo ejecuta la herramienta?** No. El host valida y decide si la envía al cliente MCP.
- **¿Un schema otorga permiso?** No. Describe y valida forma; la autorización permanece en la API y la política del host.
- **¿Una tool equivale a un resource?** No. La tool ejecuta una operación; el resource aporta contenido que el host selecciona explícitamente.
- **¿El token M2M prueba que un cliente es dueño del pedido?** No. Este laboratorio representa un operador M2M y no implementa autorización por propietario.
- **¿Qué hacer ante timeout o `503` de una confirmación?** No reintentar automáticamente. Consultar el estado disponible y explicar cualquier resultado parcial o incierto.

## Checklist de observación del práctico

- La consulta obtiene el pedido real y solo proyecta ID y estado.
- El mapa de la actividad identifica quién propone, consume, valida, autoriza y responde, y qué dependencias permiten ejecutar cada tramo.
- El ID ausente/ambiguo detiene la acción y requiere aclaración.
- El resource se lee por selección explícita.
- El rechazo de aprobación deja el pedido sin cambios.
- La acción aprobada conserva la autorización de API y usa idempotencia administrada por el host.
- Los registros `host.tool` y `mcp.api` comparten `correlationId` y permiten seguir la solicitud sin exponer credenciales ni cuerpos HTTP.
- Los errores no exponen credenciales, stack traces ni cuerpos crudos.
- Se registra la propuesta del modelo local y su validación por el host.

## Límites didácticos que deben explicitarse

El laboratorio no demuestra autorización por objeto, seguridad general frente a prompt injection, ausencia de carreras concurrentes ni entrega exactamente una vez. Las corridas históricas y las nuevas pruebas web deben informarse por separado; el estado vigente del recorrido web está en `validacion-web.md`. No extrapoles la latencia medida en un M2 Pro a los equipos del curso.
