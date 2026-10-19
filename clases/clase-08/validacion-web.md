# Validación del laboratorio — Clase 08

Evidencia técnica del 17/10/2026; empaquetado para el repositorio el 19/10/2026.

- Node 22.17.0, MCP SDK 1.32.1, Zod 4.6.7, ws 8.22.0 y Ollama con llama3.2:3b.
- Solución: 26/26 pruebas. Inicio: 24/26 por las dos fallas dependientes del único mapper. Copia temporal completando únicamente el mapper: 26/26.
- Integración real: 11/11 comprobaciones con WebSocket, modelo local, MCP, Auth0 y API. Consulta, rechazo sin mutación, confirmación con aprobación automatizada, replay con clave original sin duplicar stock/evento, worker y credencial sin scopes rechazada por API con 403. [Resultado registrado](recursos/evidencias/validacion-web-runtime.json).
- Muestra docente: consulta completa 6916 ms; confirmación con aprobación automatizada 1302 ms. No extrapolar a hardware estudiantil ni tiempo humano de decisión.
- Navegador real automatizado: resource, consulta, rechazo, nueva solicitud, aprobación y tarjeta «Repetición: Sí». [Captura del chat](recursos/evidencias/clase08-chat-web-final.png).
- Regresiones web: Origin/cookie, aislamiento de sesiones, aprobación cruzada, mensajes inválidos/duplicados, expiración/desconexión, límites, replay fallido y resultado autoritativo ante comentario vacío o contradictorio. Sintaxis y ocho regresiones web aprobadas tras el último ajuste de auditoría.
- Fixture de interfaz separado: resultado indeterminado sin replay; HTML hostil mostrado como texto. No equivale a ejecución contra API real.
- Presentación: 29 diapositivas y 29 notas; geometría sin solapamiento con el pie y revisión visual del [diagrama de conexiones](recursos/evidencias/clase08-conexiones.png).

## Revisión y límites

Revisado desde alumno simulado, docente y especialista IA. Ajustes incorporados: reiniciar host tras editar mapper; pedir una nueva confirmación después de rechazar; recuperación RAG sin exigir embeddings. Sin hallazgos importantes abiertos dentro del alcance revisado. La revisión simulada no prueba aprendizaje real.

Pendiente: una persona operando la demo y ensayo hablado/cronometrado de 15 minutos de la [guía docente](guia-docente.md). Los clics automatizados no acreditan aprobación humana. No se acredita instalación limpia en todos los sistemas, seguridad general ante cualquier inyección ni entrega exactamente una vez. No hay autorización por propietario: se usa una identidad M2M de operador del laboratorio.
