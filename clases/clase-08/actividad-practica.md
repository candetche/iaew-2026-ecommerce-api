# Actividad práctica individual — IA, tools y MCP

## Propósito

Vas a conectar un asistente preparado con la API de pedidos mediante un servidor MCP. Primero vas a consultar un pedido y comprobar la salida; luego vas a observar una acción controlada, rechazarla y aprobarla explícitamente. El objetivo no es construir un chatbot desde cero, sino reconocer quién propone, valida, aprueba, autoriza y ejecuta.

**Duración:** 45 minutos. **Modalidad:** individual.  
**Preparación obligatoria antes de clase:** [preparacion-entorno.md](preparacion-entorno.md) y [laboratorio/README.md](recursos/laboratorio/README.md).

La guía usa el laboratorio local de la clase. Completá sus instrucciones, instalá las dependencias del paquete elegido y dejá la API de Clase 07 disponible antes de iniciar el cronómetro. La actividad no exige una cuenta paga de IA: si tu equipo no pasa el preflight de Ollama, usá el chat web en modo determinista y el ciclo de IA anotado que indica el README. Ese recorrido acredita MCP y los controles, pero no demuestra selección de herramientas por un modelo.

## Qué está preparado y qué vas a completar

La [base `clase-08-inicio`](https://github.com/utn-frc-iaew/iaew-2026-ecommerce-api/tree/clase-08-inicio) contiene la Clase 07 resuelta. El laboratorio aporta por separado:

- un armazón en `recursos/laboratorio/inicio/`;
- una resolución docente en `recursos/laboratorio/solucion-docente/`;
- un único mapeo de consulta por completar en el armazón;
- la interfaz web, el host, el cliente MCP, la aprobación, las herramientas de acción y las pruebas preparadas. No construís frontend ni infraestructura durante la práctica.

Seguí el README del laboratorio para preparar el armazón y ubicar el mapeo indicado. No copies la solución docente sobre tu armazón. No edites la rama publicada `clase-08-inicio`.

## Contrato de la actividad

| Elemento | Contrato |
|---|---|
| Caso | Operador de un laboratorio aislado; no es autoservicio de clientes. |
| Consulta | `consultar_estado_pedido({ pedidoId })`, salida mínima `{ pedidoId, estado }`. |
| Listado | `listar_pedidos_pendientes()`, sin argumentos; devuelve como máximo 10 pedidos pendientes con `{ pedidoId, estado }`, el total y si la lista fue truncada. No requiere aprobación porque no modifica nada. |
| API de consulta | `GET /pedidos`, con scope `read:pedidos`, para la consulta y el listado. No existe `GET /pedidos/{id}`; el adaptador selecciona el pedido desde el listado y proyecta solo ID y estado. |
| Acción | `confirmar_pedido({ pedidoId })`, protegida por `confirm:pedidos` y aprobación explícita vinculada a la operación y al pedido. |
| Idempotencia | La clave la conserva el host; no la elige el modelo. |
| Resource | `iaew://docs/pedidos`, documentación estática que el cliente lee de manera explícita. |
| Evidencia | Resultados y errores mínimos, sin tokens, claves, emails ni cuerpos crudos de la API. |

Los scopes y la aprobación resuelven controles distintos. La API de este laboratorio utiliza una identidad M2M de operador y no implementa autorización por dueño del pedido.

## Mapa de flujo individual

Completá este mapa mientras ejecutás los pasos 2 a 4. No suma tiempo ni requiere otra herramienta: registra lo que observaste en el laboratorio. En «control o evidencia», anotá qué comprobaste y en qué límite ocurre; no atribuyas autorización al modelo.

| Momento | Quién actúa | Qué viaja o qué ocurre | Control o evidencia |
|---|---|---|---|
| La persona pide consultar el pedido |  |  |  |
| Se propone una tool con argumentos |  |  |  |
| Se descubre/invoca la capacidad MCP |  |  |  |
| Se consulta la API |  |  |  |
| El resultado vuelve y se responde |  |  |  |
| Se solicita una confirmación y la persona aprueba o rechaza |  |  |  |
| La API ejecuta o bloquea la operación |  |  |  |

Marcá además quién consume el servidor MCP, dónde está el modelo y qué componente conserva las credenciales. Identificá WebSocket entre navegador y host (retomando Clase 04), MCP por stdio entre cliente y servidor, y HTTP/OAuth entre servidor y API. La conclusión debe distinguir petición, propuesta, ejecución y resultado observado.

## Recorrido de 45 minutos

### 1. Preflight y recorrido elegido · 5 minutos

1. Confirmá que la preparación previa está completa y que los servicios del laboratorio están disponibles.
2. Verificá `GET /pedidos` con un cliente HTTP local configurado para `client_credentials`, según el README del laboratorio; compará solo el ID y el estado del pedido de prueba. No pegues ni compartas el token.
3. Ejecutá el preflight del modelo local. Si no lo pasa, cambiá al cliente MCP determinista; no intentes resolverlo ampliando permisos.
4. Con la API de Clase 07 activa en `http://127.0.0.1:3008`, iniciá desde `inicio/` el host preparado: `node --env-file=./config.local.env src/web.js` (agregá `--deterministic` si no usás modelo). Abrí `http://127.0.0.1:3018` y anotá el modo que muestra la interfaz. Las dependencias y `config.local.env` ya deben estar preparados.

**Antes de continuar:** conocés si tu evidencia incluirá inferencia real o solo integración MCP.

### 2. Descubrir y consultar · 10 minutos

1. Identificá en el armazón las tools que descubre el host mediante su cliente MCP: `consultar_estado_pedido`, `listar_pedidos_pendientes` y `confirmar_pedido`. La interfaz web no es el servidor MCP.
2. Completá el mapeo acotado de `consultar_estado_pedido` siguiendo el README: consultar la API existente, seleccionar el ID indicado y devolver solo el ID y el estado.
3. Ejecutá `npm test` desde `inicio/` y comprobá que pase la suite del paquete. Antes de completar el mapeo son esperables exactamente dos fallas vinculadas a ese único TODO; después, no deberían quedar fallas. **Después de editar, detené el host con Ctrl+C, volvé a iniciarlo con el mismo comando del paso 1 y recargá la página.** El servidor MCP carga el código al conectarse; `npm test` no actualiza la sesión abierta.
4. Escribí `pendientes` en el chat para ver qué pedidos hay disponibles; elegí uno de esa lista y escribí `consulta <ID>`, reemplazando `<ID>` por el identificador de un pedido de prueba conocido. Compará la tarjeta **Resultado autoritativo de la operación** con una consulta HTTP autorizada.
5. Pulsá **Leer documentación de pedidos** para leer el resource `iaew://docs/pedidos` y explicá quién lo seleccionó. No supongas que el servidor lo agregó automáticamente al contexto.

**Evidencia:** nombres de tools descubiertos, entrada y salida mínima de la consulta, diferencia entre tool y resource, y primeras filas del mapa de flujo. Identificá al host como consumidor MCP: el modelo no se conecta directamente al servidor.

### 3. Recorrer una intención sin inventar datos · 10 minutos

1. Usá el chat con modelo si pasó el preflight; si no, usá el mismo chat en modo determinista y seguí el ejemplo anotado. La gramática admitida es `consulta <ID>` o `confirmar <ID>`; no es lenguaje natural irrestricto.
2. Observá la propuesta estructurada para consultar el pedido y señalá qué valida el host antes de invocar MCP.
3. Probá la interacción sin un ID suficiente: el host debe detenerse y pedir aclaración; no debe inventar un identificador ni invocar una acción.
4. Compará el **Comentario opcional del asistente · no autoritativo** con la tarjeta de resultado y la API. El comentario generado puede fallar o contradecir el dato; nunca reemplaza la evidencia autoritativa.

**Evidencia:** secuencia intención → propuesta → validación → llamada → resultado → respuesta, con el responsable de cada etapa. Aclarar si la selección de tool provino de una inferencia real o del cliente determinista.

### 4. Rechazar, aprobar y repetir · 15 minutos

1. Escribí `confirmar <ID>` con el identificador del pedido de prueba.
2. Revisá el pedido y la acción del panel de aprobación, pulsá **Rechazar** y comprobá que el pedido siga pendiente.
3. Volvé a solicitar la operación, revisá el pedido y la acción y pulsá **Aprobar** antes de que venza el panel. El backend valida la sesión y firma esa aprobación; el botón no concede scopes.
4. Observá la respuesta segura de la API y el estado final; no confundas aceptación del modelo con autorización ni aprobación.
5. Observá los eventos estructurados `host.tool` y `mcp.api`; comprobá que comparten `correlationId` y registrá solo la operación y el resultado HTTP, sin secretos ni cuerpo crudo.
6. Tras una confirmación exitosa, pulsá **Repetir operación con la clave original** dentro de los 120 segundos de vigencia de esa confirmación y observá el marcador de repetición. Escribir otra vez `confirmar <ID>` crea una operación nueva y no demuestra replay.
7. Si aparece un timeout, `503`, una desconexión o un resultado incierto, **no repitas la confirmación ni uses replay**. La interfaz no reenvía operaciones y **Reconectar** abre una sesión nueva manualmente. Seguí el procedimiento de consulta de estado del README y registrá qué quedó sin confirmar.

**Evidencia:** rechazo sin mutación, aprobación vinculada, resultado confirmado y repetición idempotente; anotá el `correlationId` y el status HTTP observado, nunca secretos o datos crudos. No infieras garantías de concurrencia ni “exactamente una vez”.

### 5. Explicar y guardar la evidencia · 5 minutos

Guardá una nota individual breve, sin credenciales ni datos personales, que responda:

1. ¿Qué aporta el modelo y qué estandariza MCP?
2. ¿Quién consume MCP? ¿Cómo interactuás como usuario y dónde interviene el modelo?
3. ¿Qué componentes, conexiones y permisos tuvieron que estar disponibles para que funcionara?
4. ¿Quién propone, valida, aprueba, autoriza y ejecuta?
5. ¿Qué evidencia demuestra que el rechazo no modificó el pedido? ¿Qué demostró tu recorrido: inferencia real, integración MCP determinista o ambos?

## Criterios de logro

- La consulta devuelve únicamente ID y estado obtenidos de la API.
- Se explica la diferencia entre una tool y el resource seleccionado explícitamente.
- El mapa distingue persona, host/cliente MCP, modelo, servidor MCP y API; ubica credenciales y aprobación donde corresponden.
- La entrada ambigua detiene el flujo y requiere aclaración.
- El rechazo de aprobación no cambia el estado.
- La confirmación aprobada preserva scopes e idempotencia.
- La evidencia identifica el recorrido usado y no contiene secretos.

## Alcance y límites

El laboratorio no agrega requisitos ni entregables al TPI. La actividad no prueba autorización por propietario, seguridad general frente a toda inyección, comportamiento concurrente ni entrega exactamente una vez. Una corrida MCP y otra Auth0 realizadas por separado no se deben presentar como una única ejecución end-to-end con modelo local.

La terminal es una alternativa preparada, no otro ejercicio: `node --env-file=./config.local.env src/cli.js [--deterministic]` (el argumento entre corchetes es opcional). Sus comandos son `consulta <ID>`, `confirmar <ID>`, `documentacion`, `repetir <operationId>` y `salir`.

No incluyas `.env`, tokens, claves de aprobación, emails, payloads completos ni capturas con secretos en tu entrega.
