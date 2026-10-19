# IA aplicada a integraciones y MCP

## Para qué sirve esta lectura

En las clases anteriores construimos y protegimos una API de pedidos, conectamos componentes, tratamos fallas y duplicados, documentamos contratos y usamos observabilidad para reconstruir operaciones. Ahora sumamos una nueva forma de interactuar con ese sistema: una persona expresa una intención en lenguaje natural y una aplicación puede ayudar a traducirla en una consulta o una acción controlada.

El recorrido tiene una razón: la API crea pedidos y conserva su estado; la seguridad limita quién puede operar; la asincronía y la resiliencia conectan componentes y manejan fallas o repeticiones; la documentación hace explícitos los contratos; y la observabilidad ayuda a reconstruir qué pasó. Con esas piezas, la pregunta nueva es cómo ofrecer una interfaz conversacional sin entregar al modelo el control de la API.

La API y sus reglas de negocio siguen siendo el centro. El modelo no se convierte en dueño del sistema, no obtiene permisos por conversar y no reemplaza la verificación del resultado. MCP agrega un protocolo para intercambiar capacidades entre aplicaciones; no reemplaza HTTP ni la autorización.

Este material explica los conceptos y el contrato del caso. La actividad práctica tiene su propia guía: esta lectura no agrega pasos, entregas ni requisitos al práctico ni al TPI.

## 1. Qué hace un modelo de lenguaje

Un **modelo de lenguaje** (LLM, por *large language model*) es un sistema entrenado con muchos ejemplos de texto para producir continuaciones plausibles a partir de una entrada. No hace falta conocer cómo se entrenó para usarlo en esta clase. Al recibir instrucciones y mensajes, el modelo calcula una respuesta: esa ejecución se llama **inferencia**.

La entrada disponible durante una inferencia —instrucciones, mensajes anteriores y datos que la aplicación incluya— forma el **contexto**. El contexto tiene un límite: si una conversación o los datos son demasiado extensos, la aplicación no puede suponer que todo estará disponible en cada paso. Por eso conviene seleccionar y enviar solo lo que hace falta.

Una respuesta puede sonar segura y estar equivocada. El modelo puede interpretar mal una pregunta, completar un dato que falta o producir argumentos inválidos. El conocimiento que aprendió no es una consulta al estado actual de nuestra base: no puede saber por sí solo si un pedido creado hace un minuto está pendiente o confirmado.

| Término | En esta clase |
|---|---|
| **Modelo** | Produce una respuesta o una propuesta a partir del contexto que recibe. |
| **Inferencia** | Ejecución del modelo para obtener esa salida. |
| **Instrucciones** | Orientan el comportamiento esperado, pero no son un control de acceso. |
| **Contexto** | Información disponible en una inferencia, con tamaño finito. |
| **Salida** | Texto o propuesta estructurada; necesita validación y no es prueba de que algo ocurrió. |

Por ejemplo, sin consultar el sistema, «el pedido probablemente está pendiente» es una conjetura. Si una aplicación obtiene el estado de la API y devuelve `{ pedidoId, estado }`, la respuesta puede basarse en ese resultado. Aun así, hay que verificar quién hizo la consulta, qué datos recibió y qué permisos se aplicaron.

### Tool calling: proponer no es ejecutar

El modelo puede recibir descripciones de herramientas y proponer una llamada con un nombre y argumentos. A esto se lo suele llamar **tool calling**. La propuesta es una salida del modelo; por sí misma no ejecuta código, no abre una conexión HTTP y no autoriza una operación.

La **aplicación anfitriona** o **host** recibe la propuesta. El host valida el nombre y los argumentos, aplica sus límites y políticas y decide si corresponde ejecutarla. Si se acepta, el host usa el componente de integración adecuado; luego puede enviar al modelo el resultado acotado para que formule una respuesta.

Un chat que usa una herramienta en un paso controlado no es automáticamente un agente autónomo. Se suele hablar de **agente** cuando una aplicación permite un ciclo de decisiones y herramientas, a veces con varios pasos. El grado de autonomía depende del flujo y de los controles que implementa el host; la palabra «agente» no significa que el sistema tenga más permisos.

## 2. Tres maneras de conectar la misma API

Supongamos que un operador quiere consultar el estado de un pedido:

| Variante | Recorrido | Cuándo puede alcanzar |
|---|---|---|
| **HTTP directo** | Un cliente conocido llama al endpoint de la API siguiendo su contrato. | Cuando ya sabés qué cliente necesitás y es una integración sencilla. |
| **Función propia** | Una aplicación con modelo define una función particular; el host ejecuta esa función y llama a la API. | Cuando hay un host o un flujo específico y no necesitás compartir capacidades con otros clientes. |
| **MCP** | Un host usa un cliente MCP para descubrir e invocar capacidades de un servidor MCP; este adapta la llamada a la API. | Cuando querés un protocolo común de interacción entre distintos hosts y servidores de capacidades. |

MCP **no reemplaza** la API: el servidor MCP del caso usa HTTP para comunicarse con ella. Tampoco elimina el contrato de negocio, garantiza compatibilidad entre todas las versiones o clientes, ni resuelve identidad y permisos por sí solo. Agrega una capa y, con ella, configuración, componentes y posibles puntos de falla.

Si hay una sola aplicación y una integración pequeña, una función propia o HTTP directo pueden ser más simples y suficientes. MCP empieza a compensar cuando el intercambio estandarizado de capacidades entre más de un host o servidor aporta un beneficio concreto. No hace falta adoptar MCP para construir un chatbot.

## 3. Quién participa

En el caso de pedidos, los componentes tienen responsabilidades distintas:

| Participante | Responsabilidad |
|---|---|
| **Operador** | Expresa lo que quiere hacer y aprueba una acción sensible cuando corresponde. |
| **Host** | Es la aplicación que reúne la conversación, el modelo y la política de ejecución. Valida propuestas y controla el ciclo. |
| **Cliente MCP** | Parte del host que se comunica con un servidor MCP, descubre sus capacidades y solicita su ejecución o lectura. |
| **Servidor MCP** | Publica tools y resources. En este caso adapta una tool a la API existente y proyecta una respuesta mínima. |
| **API de pedidos** | Mantiene las reglas de negocio, la autenticación y los scopes que ya aplica. |
| **Modelo** | Interpreta el contexto y puede proponer una tool; no valida permisos ni ejecuta la API por cuenta propia. |

### Tres conexiones en la interfaz local

El laboratorio ofrece un chat preparado en `http://127.0.0.1:3018`. La gramática de entrada es acotada: `consulta <ID>` o `confirmar <ID>`. No promete interpretar cualquier expresión en lenguaje natural ni exige construir frontend durante la práctica.

```text
Navegador ── WebSocket ── Host y cliente MCP
                              │
                           MCP / stdio
                              │
                         Servidor MCP ── HTTP / OAuth ── API de pedidos (:3008)
```

WebSocket recupera lo visto en Clase 04: permite comunicación bidireccional persistente, aquí para progreso, resultados y aprobación. Surgió para evitar depender de sucesivas consultas HTTP cuando ambos extremos necesitan enviar información. MCP estandariza capacidades entre el host y el servidor; HTTP/OAuth conserva el acceso autorizado a la API. Ninguno de esos tramos reemplaza al otro, y WebSocket no es obligatorio para todo chatbot.

El navegador recibe eventos seguros, no credenciales de negocio. El backend conserva OAuth, firma de aprobación e idempotencia; la sesión se asocia a la conexión. La escucha en `127.0.0.1` corresponde al laboratorio local y no debe exponerse por LAN. Una desconexión invalida aprobaciones y acciones de esa sesión: reconectar requiere una acción manual y no reenvía mutaciones.

Una tool de MCP no debe confundirse con el programa de chat ni con la API. Es una capacidad expuesta por el servidor MCP. El cliente la solicita mediante el protocolo; el servidor resuelve la operación subyacente, que para este caso es una llamada HTTP a la API.

## 4. Tools, resources y schemas

### Tools: consultar, listar o solicitar una operación

Una **tool** representa una operación que el cliente puede invocar a través del servidor. Puede consultar un dato actual o solicitar una acción. Su nombre y descripción ayudan al host y, si corresponde, al modelo a entender para qué sirve; no son controles de seguridad.

La consulta del caso se llama `consultar_estado_pedido`. Recibe un `pedidoId`. Su entrada debe respetar el formato previsto y el servidor debe comprobar el resultado real de la consulta. La respuesta se proyecta para compartir **solo el identificador y el estado**, por ejemplo:

```json
{
  "pedidoId": "65f0c2a91b34d50123456789",
  "estado": "pendiente"
}
```

La API de este laboratorio tiene `GET /pedidos` y requiere el scope `read:pedidos`. **No existe `GET /pedidos/{id}`.** Por eso, el adaptador consulta el listado disponible y selecciona allí el pedido solicitado. No debe enviar al modelo el listado completo ni datos de cliente, email o el objeto Pedido entero. Esta solución sirve para el laboratorio, aunque consultar un listado para localizar un elemento no es una interfaz eficiente para un sistema grande.

El listado `listar_pedidos_pendientes` no recibe argumentos: el operador no debe conocer de antemano un ID. Usa el mismo `GET /pedidos`, filtra en el adaptador los pedidos con estado `pendiente` y devuelve como máximo 10 elementos `{ pedidoId, estado }`, el total encontrado y un indicador de truncado. Un listado sin tope podría exponer demasiada información y superar el límite de salida, por eso se acota. Es de solo lectura: el host lo ejecuta sin pedir aprobación, y el modelo no puede agregarle argumentos.

La acción `confirmar_pedido` solicita la confirmación usando el endpoint existente `POST /pedidos/{id}/confirmar`. La API conserva la autenticación OAuth y la comprobación de scopes, incluido `confirm:pedidos`. El host debe obtener una aprobación explícita vinculada a la operación y al pedido concretos antes de invocar la acción. Si la propuesta cambia, no se debe reutilizar una aprobación anterior como si cubriera los nuevos argumentos. Un «sí» producido por el modelo no es una aprobación humana.

### Resources: contexto seleccionado explícitamente

Un **resource** permite leer contenido identificado por una URI, por ejemplo documentación estática del flujo de pedidos. No es lo mismo que la tool parametrizada que consulta el estado actual de un pedido:

- La documentación puede explicar qué significa cada estado.
- La tool consulta el valor vigente en la API.
- La tool de confirmación solicita una acción de negocio controlada.

Que un resource exista en un servidor no significa que se agregue automáticamente a la conversación. La aplicación o el cliente lo selecciona y lo lee explícitamente; recién entonces puede decidir si ese contenido es pertinente para el contexto. Un resource de documentación no debe incluir credenciales ni datos personales. En el chat, **Leer documentación de pedidos** solicita `iaew://docs/pedidos` mediante el cliente MCP y muestra su texto. Leerlo no lo incorpora automáticamente al modelo ni lo convierte en una autorización.

### Schemas: forma, no permiso

El **schema** describe la forma esperada de una entrada o salida: por ejemplo, que `pedidoId` sea una cadena con el formato aceptado. Sirve para validar estructura y acotar argumentos, pero no demuestra que el pedido exista, que la API permita acceder a él o que una persona haya aprobado una confirmación.

```text
consultar_estado_pedido({
  pedidoId: "identificador del pedido"
})

salida:
{
  pedidoId: "...",
  estado: "..."
}
```

Validar un argumento y autorizar una operación son controles distintos. Ambos siguen siendo necesarios, y la API continúa aplicando sus propios permisos.

## 5. Un recorrido completo, anotado

La secuencia resume quién propone, quién controla y de dónde sale el dato:

1. **Intención:** el operador escribe `consulta 65f0c2a91b34d50123456789` en el chat. Esta forma explícita pertenece a la gramática admitida por el laboratorio.
2. **Contexto:** el host envía al modelo la solicitud y las descripciones acotadas de las tools disponibles. No incluye tokens ni un listado de pedidos.
3. **Propuesta:** el modelo propone `consultar_estado_pedido` con ese `pedidoId`. Todavía no ocurrió ninguna consulta.
4. **Validación del host:** el host comprueba que la tool esté permitida, que el ID se haya indicado explícitamente y que los argumentos sean válidos. Si falta o es ambiguo, pide una aclaración en lugar de inventarlo.
5. **Llamada MCP:** el cliente MCP solicita la tool al servidor MCP.
6. **Consulta a la API:** el servidor usa su credencial de servicio autorizada para llamar a `GET /pedidos`, que requiere `read:pedidos`, y busca el ID en el listado. No crea un endpoint por ID que la API no tiene.
7. **Proyección:** el servidor devuelve al cliente únicamente el ID y el estado; no entrega al modelo el resultado HTTP crudo ni el resto del pedido.
8. **Respuesta:** el host puede volver a consultar al modelo con ese resultado mínimo. La interfaz muestra siempre una tarjeta de resultado autoritativo, separada del comentario opcional del modelo. Ese comentario puede faltar o contradecir el dato: no es una fuente confiable del estado del pedido.

Para confirmar, se agrega un control antes de llamar a la tool de acción:

```text
el modelo propone confirmar_pedido(pedidoId)
        ↓
el host valida pedidoId y presenta qué se va a confirmar
        ↓
el operador revisa el pedido y pulsa Aprobar (o Rechazar)
        ↓
el backend valida la sesión y firma la aprobación vinculada
        ↓
el servidor MCP valida la aprobación y llama a la API
        ↓
la API valida OAuth/scopes y aplica su regla de negocio
        ↓
el resultado vuelve como información acotada
```

La aprobación se vincula a la acción concreta; no sustituye los permisos de la API. El host conserva la clave `Idempotency-Key` de la operación aprobada. Tras una confirmación exitosa, **Repetir operación con la clave original** solicita explícitamente un replay durante los 120 segundos de vigencia de esa confirmación. Escribir otra vez `confirmar <ID>` inicia una operación nueva y no conserva la clave de la anterior. No hay reintento automático ni replay ante timeout, `503` o reconexión.

## 6. Autorización y límites del caso

En el laboratorio, la API mantiene su autenticación OAuth y sus scopes. La credencial de servicio se configura fuera del contexto del modelo. No se copia un token a la conversación, a los argumentos de una tool ni a los registros. Tampoco se reenvía cualquier token recibido como si eso resolviera la identidad entre servicios.

Hay una limitación importante: el caso usa una identidad de operador de servicio (M2M), pero **la API no implementa autorización por dueño del pedido**. Por eso no hay que presentar esta demo como una aplicación de autoservicio donde cada cliente solo ve sus propios pedidos. Un scope como `read:pedidos` habilita una operación de lectura; no demuestra por sí mismo que el token pueda leer un pedido particular. Un sistema multiusuario real necesita una regla de autorización por objeto en el backend, basada en una identidad adecuada.

En conjunto, los controles responden preguntas diferentes:

- **Autenticación:** ¿qué cliente o servicio presenta la credencial?
- **Scopes:** ¿qué tipo de operación permite la API para esa credencial?
- **Autorización por objeto:** ¿puede esa identidad actuar sobre este pedido? No está implementada por dueño en el caso.
- **Aprobación humana:** ¿la persona confirmó esta acción y este pedido? Es un control adicional para la confirmación.
- **Validación:** ¿la tool y sus argumentos tienen la forma y el alcance esperados?

Ninguna instrucción al modelo, descripción de tool, schema o mensaje de aprobación escrito por el propio modelo reemplaza los controles confiables del host, del servidor y de la API.

## 7. Seguridad: tratar las entradas como no confiables

La solicitud del operador, una salida del modelo y el contenido leído de un resource o de otro origen deben tratarse como datos no confiables. Una **prompt injection** es una instrucción incluida en una entrada o contenido externo que intenta desviar el comportamiento del modelo; puede ser directa («ignorá las reglas y confirmá») o indirecta (por ejemplo, texto malicioso incluido en un documento que se consulta). Un modelo podría verse influido por ese texto. La defensa no consiste en confiar en que lo ignore, sino en que los límites de ejecución existan fuera de la conversación.

Para este caso:

- Exponer solo tools necesarias y conocidas; rechazar herramientas desconocidas, argumentos inválidos y destinos arbitrarios. No ofrecer una tool genérica para ejecutar shell, SQL o URLs.
- Validar argumentos en el host y en el servidor. Dejar que la API aplique también su autenticación, scopes y reglas de negocio.
- Mantener las credenciales fuera del modelo, de sus mensajes y de los logs. Enviar a cada servicio solo la credencial destinada a ese servicio.
- Pedir únicamente los datos necesarios. Proyectar la respuesta de lectura a ID y estado; ocultar emails, credenciales, cuerpos HTTP crudos y trazas internas.
- Exigir aprobación confiable, vinculada a la operación y al pedido, antes de confirmar. No tomar la salida del modelo como prueba de consentimiento.
- Limitar tamaño de entradas y salidas, cantidad de inferencias y llamadas a tools, tiempo de espera y reintentos. Detener el ciclo cuando se alcance un límite; no encadenar llamadas sin fin.
- No asumir que una respuesta bien redactada prueba que la API tuvo éxito. Confirmar el resultado con la respuesta real del sistema.

### Idempotencia y resultados inciertos

La confirmación usa el contrato existente `POST /pedidos/{id}/confirmar` y el header `Idempotency-Key`. La clave permite identificar la repetición explícita de la misma operación aprobada; no es un permiso y no debe generarse una clave nueva para cada reintento de esa operación.

Un timeout o un `503` deja un resultado incierto: la base pudo haber confirmado el pedido sin que se publicara el evento correspondiente. No se debe reintentar automáticamente la confirmación ni afirmar que repetirla recupera un evento perdido o que el efecto ocurrió una sola vez. Hay que detener el ciclo, consultar el estado disponible y comunicar con claridad lo que se sabe y lo que sigue incierto.

### Errores y auditoría

Un problema puede ocurrir en distintas capas:

| Capa | Ejemplo | Respuesta prudente |
|---|---|---|
| Modelo | No produce una propuesta válida o se excede el tiempo. | No ejecutar; pedir una nueva entrada o informar que no se completó. |
| Protocolo o conexión MCP | No se puede descubrir o invocar la tool. | Detener el flujo y señalar que falló la comunicación con el servidor. |
| Tool | El ID falta, tiene formato inválido o no aparece en el listado consultado. | Corregir la entrada o comunicar que no se encontró; no inventar un estado. |
| API | Credencial inválida o scope insuficiente. | Respetar la respuesta de autorización; no buscar un atajo. |
| Negocio | La operación no puede aplicarse al estado actual. | Comunicar el conflicto según el resultado recibido, sin presentarlo como éxito. |
| Tiempo de espera o error transitorio | No se conoce con certeza el resultado final de una confirmación. | No reintentar a ciegas; comprobar el estado y explicar la incertidumbre. |

La auditoría debe permitir relacionar la propuesta, la aprobación, la llamada MCP y el resultado de la API mediante un identificador de correlación. Puede registrar tool, operación, resultado seguro y duración. No necesita guardar la conversación completa ni payloads sensibles; nunca debe incluir tokens o claves. Registrar más información no equivale automáticamente a tener mejor auditoría.

## 8. RAG, consulta actual y acción son cosas distintas

**RAG** significa generación aumentada por recuperación: una aplicación recupera fragmentos de información pertinente —por ejemplo, condiciones de devolución— y puede agregarlos al contexto que recibe el modelo. No es sinónimo de MCP, no es obligatorio para usar tools y no requiere por definición una base vectorial.

En este caso conviene separar tres necesidades:

| Necesidad | Ejemplo | Mecanismo apropiado |
|---|---|---|
| Explicar una regla relativamente estable | «¿Qué significa el estado pendiente?» | Documentación o contenido recuperado, seleccionado por la aplicación. |
| Saber el estado vigente | «¿Está confirmado este pedido ahora?» | Consulta autorizada a la API mediante una tool. |
| Cambiar el estado | «Confirmá este pedido» | Tool de acción con autorización de la API y aprobación humana vinculada. |

Se pueden combinar, pero una respuesta recuperada de documentación no demuestra el estado actual ni autoriza una acción. En esta clase RAG se usa solo como contraste: no se implementan embeddings, bases vectoriales ni un buscador de documentos.

## 9. Recursos, costos y límites de una integración

Cada paso suma tiempo y recursos: inferencia del modelo, comunicación host–cliente–servidor, llamada HTTP a la API y, en algunos casos, consulta a servicios externos. Un modelo local evita depender de una suscripción de IA para generar texto, pero puede requerir descarga, almacenamiento, memoria y capacidad de cómputo. Tampoco hace local automáticamente a Auth0 ni a toda la aplicación.

Conviene medir el recorrido completo y limitar ciclos, concurrencia, tamaños y tiempos; no elegir un modelo más grande o agregar infraestructura sin una necesidad observada. En un servicio desplegado también podrían existir costos de cómputo, red, almacenamiento y operación. La cifra depende del entorno, por eso esta lectura no fija precios ni garantiza una latencia.

La credencial M2M del caso representa a un servicio operador autorizado, no a una persona usuaria delegada. La demo no prueba aislamiento entre dueños de pedidos, inmunidad general a prompt injection, disponibilidad de todos los clientes MCP ni ejecución exactamente una vez. Son propiedades que requerirían diseño y pruebas adicionales en el sistema que las necesite.

## 10. Caminos opcionales para profundizar

Las rutas siguientes son optativas. No reemplazan ni amplían la actividad práctica o los requisitos del TPI: elegí una pregunta si más adelante te interesa investigar el tema.

| Ruta y pregunta | Prerrequisitos | Dificultad | Costos o cargas posibles | Proyecto pequeño sugerido |
|---|---|---|---|---|
| **Otros modelos y clientes:** ¿qué cambia al cambiar de modelo o aplicación? | Entender el ciclo de tool calling y MCP. | Media. | Descargas, memoria y tiempo de comparación; un proveedor externo podría cobrar inferencias. | Comparar dos modelos o clientes con las mismas consultas y registrar diferencias y fallos. |
| **Seguridad y aprobación:** ¿cómo responden los controles ante instrucciones adversas? | Conocer scopes, validación y aprobación vinculada. | Media–alta. | Tiempo de diseño y ejecución de casos; inferencias si se usan modelos externos. | Armar una matriz pequeña de entradas hostiles, controles aplicados y resultados observados. |
| **Pruebas de tools:** ¿cómo detectamos cambios que rompen el contrato? | Conocer schemas, entradas válidas e inválidas y respuestas de error. | Media. | Tiempo de escribir y mantener casos; recursos del entorno de pruebas. | Crear pruebas de contrato para una tool de lectura, incluidos errores y datos que no deben salir. |
| **Observabilidad de herramientas:** ¿cómo reconstruimos una operación de varios componentes? | Correlación y trazas/logs de Clase 07; auditoría MCP. | Media. | Almacenamiento y consulta de registros; cuidado con retención y datos sensibles. | Relacionar una llamada MCP con la operación de API usando IDs de correlación sin registrar secretos. |
| **Resources y documentación:** ¿qué contexto necesita el host para explicar el negocio? | Contratos y documentación de la API. | Media. | Trabajo de mantener documentación vigente y seleccionar contenido útil. | Publicar documentación estática como resource y comprobar que solo se incorpora cuando se selecciona. |
| **MCP remoto:** ¿qué cambia cuando el servidor deja de ejecutarse junto al host? | MCP local y conceptos de HTTP, TLS e identidad de servicios. | Alta. | Hosting, red, monitoreo, protección y costos de operación que dependen del proveedor. | Diseñar el despliegue y su modelo de identidad, autorización, límites y auditoría sin contratar servicios. |
| **Flujos con varias herramientas:** ¿cuándo conviene un flujo fijo y cuándo un ciclo de agente? | Manejar una tool de lectura y una acción controlada. | Media–alta. | Más inferencias, latencia, complejidad de pruebas y posibles costos por uso. | Dibujar un flujo de consulta y confirmación, marcar puntos de control y justificar qué decisiones quedan fuera del modelo. |
| **RAG:** ¿cómo recuperar documentación útil sin confundirla con datos actuales? | Diferenciar recuperación, consulta a API y contexto; nociones básicas de búsqueda. | Media. | Preparación y actualización del corpus, almacenamiento e infraestructura; costos variables si se usan servicios pagos. | Recuperar una regla de negocio desde documentos y contrastarla con una consulta actual a la API. |

## Para seguir

La idea central es mantener separadas las responsabilidades: **el modelo propone; el host controla; la persona aprueba cuando corresponde; la API autentica, autoriza y aplica el negocio; la observabilidad deja evidencia**. MCP puede estandarizar cómo se descubren e invocan capacidades, pero la seguridad y la veracidad del resultado dependen del sistema completo.

Referencias oficiales para profundizar, indicadas en la preparación de la clase (consulta registrada el 17/10/2026):

- [Arquitectura de MCP](https://modelcontextprotocol.io/docs/learn/architecture)
- [Buenas prácticas de seguridad de MCP](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [Tool calling en Ollama](https://docs.ollama.com/capabilities/tool-calling)
- [Preguntas frecuentes de Ollama](https://docs.ollama.com/faq)
