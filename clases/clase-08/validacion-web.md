# Validación del laboratorio — Clase 08

Evidencia técnica del 17/10/2026; empaquetado para el repositorio el 19/10/2026.

- Node 22.17.0, MCP SDK 1.32.1, Zod 4.6.7, ws 8.22.0 y Ollama con llama3.2:3b.
- Solución: 26/26 pruebas. Inicio: 24/26 por las dos fallas dependientes del único mapper. Copia temporal completando únicamente el mapper: 26/26.
- Integración real: 11/11 comprobaciones con WebSocket, modelo local, MCP, Auth0 y API. Consulta, rechazo sin mutación, confirmación con aprobación automatizada, replay con clave original sin duplicar stock/evento, worker y credencial sin scopes rechazada por API con 403.
- Muestra docente: consulta completa 6916 ms; confirmación con aprobación automatizada 1302 ms. No extrapolar a hardware estudiantil ni tiempo humano de decisión.
- Navegador real automatizado: resource, consulta, rechazo, nueva solicitud, aprobación y tarjeta «Repetición: Sí».
- Regresiones web: Origin/cookie, aislamiento de sesiones, aprobación cruzada, mensajes inválidos/duplicados, expiración/desconexión, límites, replay fallido y resultado autoritativo ante comentario vacío o contradictorio. Sintaxis y ocho regresiones web aprobadas tras el último ajuste de auditoría.
- Fixture de interfaz separado: resultado indeterminado sin replay; HTML hostil mostrado como texto. No equivale a ejecución contra API real.
- Presentación: 29 diapositivas y 29 notas; geometría sin solapamiento con el pie y revisión visual del diagrama de conexiones.

## Revisión y límites

Revisado desde alumno simulado, docente y especialista IA. Ajustes incorporados: reiniciar host tras editar mapper; pedir una nueva confirmación después de rechazar; recuperación RAG sin exigir embeddings. Sin hallazgos importantes abiertos dentro del alcance revisado. La revisión simulada no prueba aprendizaje real.

Pendiente: una persona operando la demo y ensayo hablado/cronometrado de 15 minutos de la [guía docente](guia-docente.md). Los clics automatizados no acreditan aprobación humana. No se acredita instalación limpia en todos los sistemas, seguridad general ante cualquier inyección ni entrega exactamente una vez. No hay autorización por propietario: se usa una identidad M2M de operador del laboratorio.


## Comprobación desde copia limpia — 19/10/2026

Se extrajo una copia nueva del repositorio y se incorporaron los cambios locales propuestos para publicación. Sin `node_modules` ni configuración previa: `npm ci` y sintaxis aprobados; armazón 23/29 con seis fallas previstas. Aplicando solo los tres bloques de código de la actividad: 29/29. Se levantó el Compose de Clase 08 reutilizando la API/worker de Clase 07; cuatro servicios disponibles. Auth0 real validó la identidad y los scopes, y el script incluido creó producto/pedido ficticios. Ollama pasó el preflight (primera carga 8984 ms; ciclos calientes 1099, 1248 y 1908 ms).

Diez comprobaciones WebSocket con inferencia real aprobadas: resource, listado implementado desde el MD, consulta, aclaración de ID, rechazo sin mutación, aprobación, stock 10→8, replay con el mismo evento y procesamiento del worker. La aprobación fue automatizada, no humana. Se comprobó el comando ZIP y sus exclusiones..

La actividad ahora incluye preparación completa en el mismo Markdown. Requiere herramientas instaladas, acceso de red y una identidad M2M autorizada que no se distribuye en Git. No se afirma una instalación limpia de cada sistema operativo ni una publicación remota de estos cambios locales. Los pasos de clase y pruebas se realizaron en copia temporal; el armazón distribuido conserva sus tres TODO.


## Separación de componentes — 19/10/2026

Inicio y solución distinguen `chat-web/`, `host/`, `servidor-mcp/` y `compartido/`. Se actualizaron imports, ruta del proceso MCP, archivos estáticos, scripts de npm, tests, actividad y notas. Sintaxis aprobada; solución 29/29; armazón 23/29 con las seis fallas previstas; copia temporal completada exclusivamente con los tres bloques del Markdown, 29/29. Se verificaron enlaces y sincronización con la fuente canónica.

Prueba real adicional del nuevo árbol: el host sirvió HTML/JS/CSS desde `chat-web/`, aceptó WebSocket en modo modelo, inició el hijo `servidor-mcp/server.js` y obtuvo el pedido pendiente mediante Ollama, MCP y API/Auth0 reales. Consulta de lectura; no se modificó el pedido. La copia de demostración en `demo-clase-08` no se migró automáticamente. Este registro no acredita un ensayo humano de clase.
