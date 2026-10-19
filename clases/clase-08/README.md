# Clase 08 — IA aplicada a integraciones y MCP

La clase parte de la API de pedidos de las clases anteriores y agrega una interfaz conversacional controlada. El modelo puede proponer una herramienta; el host valida y controla el ciclo; la API conserva las reglas de negocio, OAuth y scopes. MCP estandariza el intercambio de capacidades, no reemplaza HTTP ni la autorización.

## Orden de lectura

1. [Preparación del entorno](preparacion-entorno.md): instalar Ollama, descargar el modelo y ejecutar el preflight antes de clase.
2. [Presentación](presentacion/index.html) y [notas del orador](presentacion/presenter.html).
3. [Material adicional](material-adicional/material-completo.md): fundamentos, arquitectura, seguridad y rutas opcionales.
4. [Actividad práctica individual](actividad-practica.md), de 45 minutos.
5. [Guía docente](guia-docente.md).
6. [Laboratorio](recursos/laboratorio/README.md): armazón estudiantil, solución docente y pruebas.

## Chat web local

Iniciá primero la API de Clase 07 en el puerto `3008`. Prepará `config.local.env` y las dependencias desde `recursos/laboratorio/inicio/` (o `solucion-docente/` para la demo), según la [preparación del entorno](preparacion-entorno.md#7-iniciá-el-chat-web-del-laboratorio). Después ejecutá:

```bash
node --env-file=./config.local.env src/web.js
# Alternativa sin inferencia de modelo:
node --env-file=./config.local.env src/web.js --deterministic
```

Abrí `http://127.0.0.1:3018`. La interfaz y el host están preparados: en los 45 minutos solo completás el mapper indicado. Escribí `consulta <ID>` o `confirmar <ID>`; el chat admite una gramática acotada. El botón **Leer documentación de pedidos** selecciona explícitamente el resource. **Aprobar** y **Rechazar** responden por la operación y el pedido mostrados; el backend valida la sesión y genera la firma. La tarjeta de resultado autoritativo queda separada del comentario opcional del modelo.

Tras una confirmación exitosa, **Repetir operación con la clave original** permite una repetición explícita dentro de los 120 segundos de vigencia de esa confirmación. Escribir otra vez `confirmar <ID>` inicia una operación nueva: no es replay. No uses replay ante timeout, `503` o desconexión. Reconectar es manual y abre otra sesión.

El navegador habla con el host por WebSocket, el cliente MCP con el servidor por stdio, y el servidor con la API por HTTP/OAuth. El primer tramo recupera lo visto en Clase 04 y no reemplaza los otros protocolos. El servicio escucha solo en `127.0.0.1`; los secretos permanecen en el backend, fuera del navegador y del modelo. No lo expongas por LAN.

La terminal sigue disponible: `node --env-file=./config.local.env src/cli.js`, con `--deterministic` si corresponde. Admite `consulta <ID>`, `confirmar <ID>`, `documentacion`, `repetir <operationId>` y `salir`.

## Caso y límites

El laboratorio representa un operador M2M en un entorno didáctico aislado, no autoservicio de clientes. La API tiene `GET /pedidos`, no un endpoint por ID; la tool selecciona el pedido y comparte solo `pedidoId` y `estado`. La lectura y la confirmación requieren autorización de API; la segunda suma una aprobación explícita vinculada. No hay autorización por dueño del pedido en esta base.

La [rama `clase-08-inicio`](https://github.com/utn-frc-iaew/iaew-2026-ecommerce-api/tree/clase-08-inicio) contiene la Clase 07 resuelta. El armazón MCP y la solución docente están separados en el laboratorio, fuera de esa rama.

Si el modelo local no pasa el preflight, la práctica se puede hacer con un cliente MCP determinista. Ese recorrido acredita MCP y los controles, no selección de herramientas por inferencia. La actividad no requiere suscripción de IA y no agrega requisitos al TPI.

## Estado del paquete

El armazón estudiantil conserva un único mapper pendiente: 24/26 pruebas antes de resolverlo y 26/26 al completarlo. La solución pasó 26/26. La integración web con modelo local, MCP, Auth0 y API real pasó 11/11 comprobaciones. Consultá la [validación web](validacion-web.md): la aprobación fue automatizada; sigue pendiente el ensayo hablado de 15 minutos con una persona. No se presume validación con estudiantes ni en otros sistemas.
