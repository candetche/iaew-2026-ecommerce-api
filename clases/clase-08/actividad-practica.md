# Actividad práctica individual — IA, tools y MCP

## Propósito

Vas a conectar un asistente preparado con la API de pedidos mediante un servidor MCP. Primero vas a consultar un pedido y comprobar la salida; luego vas a observar una acción controlada, rechazarla y aprobarla explícitamente. El objetivo no es construir un chatbot desde cero, sino reconocer quién propone, valida, aprueba, autoriza y ejecuta.

**Duración:** 45 minutos. **Modalidad:** individual. **Entrega:** un `.zip` con el proyecto funcionando (ver [Entrega](#entrega)).  
**Preparación obligatoria antes de clase:** [preparacion-entorno.md](preparacion-entorno.md) y [laboratorio/README.md](recursos/laboratorio/README.md).

La guía usa el laboratorio local de la clase. Completá sus instrucciones, instalá las dependencias del paquete elegido y dejá la API de Clase 07 disponible antes de iniciar el cronómetro. La actividad tiene un único recorrido obligatorio: chat web → host con Ollama y `llama3.2:3b` → cliente/servidor MCP → API real. No exige una cuenta paga de IA. El preflight debe aprobarse antes de iniciar; si falla, resolvé la preparación con el docente en un equipo que ejecute ese mismo recorrido.

## Qué está preparado y qué vas a completar

La [base `clase-08-inicio`](https://github.com/utn-frc-iaew/iaew-2026-ecommerce-api/tree/clase-08-inicio) contiene la Clase 07 resuelta. El laboratorio aporta por separado:

- un armazón en `recursos/laboratorio/inicio/`;
- una resolución docente en `recursos/laboratorio/solucion-docente/`;
- tres fragmentos de `src/server.js` que completás en el armazón, con el código indicado paso a paso en esta guía;
- la interfaz web, el host, el cliente MCP, la aprobación, las herramientas de acción y las pruebas preparadas. No construís frontend ni infraestructura durante la práctica.

Seguí el README del laboratorio para preparar el armazón. Los tres fragmentos están marcados con `TODO T03-A`, `TODO T03-B` y `TODO T03-C`. No copies la solución docente sobre tu armazón. No edites la rama publicada `clase-08-inicio`.

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

## Recorrido de 45 minutos

### 1. Preflight del modelo local · 5 minutos

1. Confirmá que la preparación previa está completa y que los servicios del laboratorio están disponibles.
2. Verificá `GET /pedidos` con un cliente HTTP local configurado para `client_credentials`, según el README del laboratorio; compará solo el ID y el estado del pedido de prueba. No pegues ni compartas el token.
3. Ejecutá el preflight del modelo local. Debe aprobarse para continuar. Si falla, resolvé el entorno con el docente; no amplíes permisos ni sustituyas la inferencia por llamadas programadas.
4. Con la API de Clase 07 activa en `http://127.0.0.1:3008`, iniciá desde `inicio/` el host preparado: `node --env-file=./config.local.env src/web.js`. Abrí `http://127.0.0.1:3018` y verificá que la interfaz muestre **Modelo local**. Las dependencias y `config.local.env` ya deben estar preparados.

**Antes de continuar:** el modelo local pasó el preflight y el chat está conectado en modo **Modelo local**.

### 2. Completar el servidor MCP y consultar · 10 minutos

Todo el código de este paso va en `src/server.js`, dentro de `inicio/`. Antes de editar, ejecutá `npm test`: deben fallar exactamente 6 pruebas, porque faltan los tres fragmentos. Al terminar los tres pasos, la suite debe pasar completa (29/29).

**Paso A · Proyectar la consulta (`TODO T03-A`).** Buscá la función `mapPedidoFromListado` al final del archivo y reemplazá su cuerpo. La API no tiene `GET /pedidos/{id}`: se pide el listado y el adaptador elige el pedido y devuelve solo ID y estado.

```js
export function mapPedidoFromListado(pedidos, pedidoId) {
  const pedido = pedidos.find(item => item?._id === pedidoId);
  if (!pedido || typeof pedido.estado !== 'string') return undefined;
  return { pedidoId, estado: pedido.estado };
}
```

**Paso B · Proyectar el listado (`TODO T03-C`).** Reemplazá la función `mapPendientesFromListado`, que está justo encima. Filtra los pendientes, limita la salida y no deja pasar ningún otro dato del pedido (emails, ítems, direcciones).

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

**Paso C · Registrar la tool de listado (`TODO T03-B`).** Dentro de `createMcpServer`, entre `consultar_estado_pedido` y `confirmar_pedido`, reemplazá el comentario `TODO T03-B` por este bloque. Una tool MCP se declara con nombre, descripción, schema de entrada y schema de salida; el listado no recibe argumentos y llama a la misma API existente.

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
    return result({ status: 'ok',...mapPendientesFromListado(payload) });
  });
```

**Comprobar.**

1. Ejecutá `npm test`: deben pasar las 29 pruebas. Si falla alguna, leé el nombre de la prueba y revisá el paso correspondiente (consulta, listado o descubrimiento de tools).
2. **Detené el host con Ctrl+C, volvé a iniciarlo con el mismo comando del paso 1 y recargá la página.** El servidor MCP carga el código al conectarse; `npm test` no actualiza la sesión abierta.
3. Escribí `pendientes` en el chat, elegí un ID de esa lista y escribí `consulta <ID>`. Compará la tarjeta **Resultado autoritativo de la operación** con una consulta HTTP autorizada.
4. Pulsá **Leer documentación de pedidos** para leer el resource `iaew://docs/pedidos` y explicá quién lo seleccionó. No supongas que el servidor lo agregó automáticamente al contexto.

**Evidencia:** suite 29/29, nombres de las tres tools descubiertas, entrada y salida mínima de la consulta, y diferencia entre tool y resource. Identificá al host como consumidor MCP: el modelo no se conecta directamente al servidor.

### 3. Recorrer una intención sin inventar datos · 10 minutos

1. Usá el chat web con Ollama y `llama3.2:3b` después de aprobar el preflight. La gramática admitida es `consulta <ID>` o `confirmar <ID>`; no es lenguaje natural irrestricto.
2. Observá la propuesta estructurada para consultar el pedido y señalá qué valida el host antes de invocar MCP.
3. Probá la interacción sin un ID suficiente: el host debe detenerse y pedir aclaración; no debe inventar un identificador ni invocar una acción.
4. Compará el **Comentario opcional del asistente · no autoritativo** con la tarjeta de resultado y la API. El comentario generado puede fallar o contradecir el dato; nunca reemplaza la evidencia autoritativa.

**Evidencia:** secuencia intención → propuesta → validación → llamada → resultado → respuesta, con el responsable de cada etapa, que vas a anotar en la nota de entrega. Registrá la propuesta generada por el modelo y comprobá que el host la validó antes de invocar MCP.

### 4. Rechazar, aprobar y repetir · 15 minutos

1. Escribí `confirmar <ID>` con el identificador del pedido de prueba.
2. Revisá el pedido y la acción del panel de aprobación, pulsá **Rechazar** y comprobá que el pedido siga pendiente.
3. Volvé a solicitar la operación, revisá el pedido y la acción y pulsá **Aprobar** antes de que venza el panel. El backend valida la sesión y firma esa aprobación; el botón no concede scopes.
4. Observá la respuesta segura de la API y el estado final; no confundas aceptación del modelo con autorización ni aprobación.
5. Observá los eventos estructurados `host.tool` y `mcp.api`; comprobá que comparten `correlationId` y registrá solo la operación y el resultado HTTP, sin secretos ni cuerpo crudo.
6. Tras una confirmación exitosa, pulsá **Repetir operación con la clave original** dentro de los 120 segundos de vigencia de esa confirmación y observá el marcador de repetición. Escribir otra vez `confirmar <ID>` crea una operación nueva y no demuestra replay.
7. Si aparece un timeout, `503`, una desconexión o un resultado incierto, **no repitas la confirmación ni uses replay**. La interfaz no reenvía operaciones y **Reconectar** abre una sesión nueva manualmente. Seguí el procedimiento de consulta de estado del README y registrá qué quedó sin confirmar.

**Evidencia:** rechazo sin mutación, aprobación vinculada, resultado confirmado y repetición idempotente; anotá el `correlationId` y el status HTTP observado, nunca secretos o datos crudos. No infieras garantías de concurrencia ni “exactamente una vez”.

### 5. Nota y entrega · 5 minutos

Creá `nota.md` dentro de `inicio/`, sin credenciales ni datos personales, con estas dos partes.

**Tabla del flujo observado.** Completala con lo que viste en los pasos 2 a 4; en «control o evidencia» anotá qué comprobaste y en qué límite ocurre, sin atribuir autorización al modelo.

| Momento | Quién actúa | Qué viaja o qué ocurre | Control o evidencia |
|---|---|---|---|
| La persona pide consultar el pedido | | | |
| El host valida la propuesta | | | |
| Se invoca la tool MCP | | | |
| Se consulta la API | | | |
| El resultado vuelve y se responde | | | |
| Se solicita confirmación y la persona aprueba o rechaza | | | |
| La API ejecuta o bloquea | | | |

**Respuestas breves.**

1. ¿Qué aporta el modelo y qué estandariza MCP?
2. ¿Quién consume MCP? ¿Cómo interactuás como usuario y dónde interviene el modelo?
3. ¿Qué componentes, conexiones y permisos tuvieron que estar disponibles para que funcionara? Ubicá WebSocket (navegador–host), stdio (cliente–servidor MCP) y HTTP/OAuth (servidor–API), y qué componente guarda las credenciales.
4. ¿Quién propone, valida, aprueba, autoriza y ejecuta?
5. ¿Qué evidencia demuestra que el rechazo no modificó el pedido y que la propuesta de herramienta provino del modelo local?

## Entrega

Entregá un único archivo `apellido-nombre-clase08.zip` con el contenido de `inicio/` ya completado:

- `src/`, `public/`, `test/`, `fixtures/`, `package.json`, `package-lock.json`, `config.example.env` y los demás archivos del armazón;
- `nota.md` con la tabla y las respuestas;
- `resultado-tests.txt`, generado con `npm test > resultado-tests.txt 2>&1` (debe mostrar 29 pruebas aprobadas).

Excluí `node_modules/`, `config.local.env` y cualquier `.env`. Desde `inicio/` en macOS o Linux:

```bash
npm test > resultado-tests.txt 2>&1
zip -r apellido-nombre-clase08.zip. -x "node_modules/*" "config.local.env" ".env"
```

En Windows, comprimí la carpeta desde el explorador después de mover o borrar `node_modules` y `config.local.env`. Antes de enviar, abrí el zip y comprobá que no contiene credenciales. Para validar que funciona: descomprimilo en otra carpeta, ejecutá `npm ci` y `npm test`.

## Criterios de logro

- `npm test` pasa 29/29 con los tres fragmentos completados.
- La consulta y el listado devuelven únicamente ID y estado obtenidos de la API.
- Se explica la diferencia entre una tool y el resource seleccionado explícitamente.
- La nota distingue persona, host/cliente MCP, modelo, servidor MCP y API; ubica credenciales y aprobación donde corresponden.
- La entrada ambigua detiene el flujo y requiere aclaración.
- El rechazo de aprobación no cambia el estado.
- La confirmación aprobada preserva scopes e idempotencia.
- La evidencia acredita el recorrido completo con modelo local y no contiene secretos.

## Alcance y límites

La actividad no prueba autorización por propietario, seguridad general frente a toda inyección, comportamiento concurrente ni entrega exactamente una vez. Una corrida MCP y otra Auth0 realizadas por separado no se deben presentar como una única ejecución end-to-end con modelo local.


El zip no debe incluir `.env`, `config.local.env`, tokens, claves de aprobación, emails ni payloads completos.
