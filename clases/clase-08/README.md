# Clase 08 — IA aplicada a integraciones y MCP

La clase parte de la API de pedidos de las clases anteriores y agrega una interfaz conversacional controlada. El modelo puede proponer una herramienta; el host valida y controla el ciclo; la API conserva las reglas de negocio, OAuth y scopes. MCP estandariza el intercambio de capacidades, no reemplaza HTTP ni la autorización.

## Orden de lectura

1. [Actividad autocontenida desde cero](actividad-practica.md): clonar el repo, instalar herramientas, configurar identidad, iniciar servicios y completar el servidor. La sección 2 se realiza antes de clase.
2. [Presentación](presentacion/index.html) y [notas del orador](presentacion/presenter.html).
3. [Material adicional](material-adicional/material-completo.md): fundamentos, arquitectura, seguridad y rutas opcionales.
4. [Actividad práctica individual](actividad-practica.md), de 45 minutos.
5. [Guía docente](guia-docente.md).
6. [Laboratorio](recursos/laboratorio/README.md): armazón estudiantil y pruebas.

## Chat web local

Seguí primero la sección 2 de la [actividad](actividad-practica.md): el Compose de Clase 08 reutiliza la API de Clase 07 y la publica en `3008`. Prepará `config.local.env` y las dependencias desde `recursos/laboratorio/inicio/`, según la [preparación del entorno](preparacion-entorno.md#7-iniciá-el-chat-web-del-laboratorio). Después ejecutá:

```bash
node --env-file=./config.local.env host/web.js
```

Abrí `http://127.0.0.1:3018`. La interfaz y el host están preparados: en los 45 minutos completás los tres fragmentos indicados en la actividad. Escribí `consulta <ID>` o `confirmar <ID>`; el chat admite una gramática acotada. El botón **Leer documentación de pedidos** selecciona explícitamente el resource. **Aprobar** y **Rechazar** responden por la operación y el pedido mostrados; el backend valida la sesión y genera la firma. La tarjeta de resultado autoritativo queda separada del comentario opcional del modelo.

Tras una confirmación exitosa, **Repetir operación con la clave original** permite una repetición explícita dentro de los 120 segundos de vigencia de esa confirmación. Escribir otra vez `confirmar <ID>` inicia una operación nueva: no es replay. No uses replay ante timeout, `503` o desconexión. Reconectar es manual y abre otra sesión.

El navegador habla con el host por WebSocket, el cliente MCP con el servidor por stdio, y el servidor con la API por HTTP/OAuth. El primer tramo recupera lo visto en Clase 04 y no reemplaza los otros protocolos. El servicio escucha solo en `127.0.0.1`; los secretos permanecen en el backend, fuera del navegador y del modelo. No lo expongas por LAN.


## Caso y límites

El laboratorio representa un operador M2M en un entorno didáctico aislado, no autoservicio de clientes. La API tiene `GET /pedidos`, no un endpoint por ID; la tool selecciona el pedido y comparte solo `pedidoId` y `estado`. La lectura y la confirmación requieren autorización de API; la segunda suma una aprobación explícita vinculada. No hay autorización por dueño del pedido en esta base.

La [rama `clase-08-inicio`](https://github.com/utn-frc-iaew/iaew-2026-ecommerce-api/tree/clase-08-inicio) contiene la Clase 07 resuelta. El armazón MCP está en `recursos/laboratorio/inicio/`, dentro de `main`.

El modelo local es obligatorio. Si el preflight falla, corregí la preparación con el docente antes de iniciar. La actividad se completa con inferencia real y no requiere suscripción paga de IA.

## Estado del paquete

El armazón estudiantil contiene tres fragmentos pendientes de `servidor-mcp/server.js`, explicados en la actividad. Antes de completarlos se esperan seis fallas; al resolverlos, la suite debe pasar 29/29. La resolución obligatoria usa modelo local, MCP y API real. La entrega es un ZIP del proyecto y su evidencia, según la guía de actividad. Las pruebas aisladas no sustituyen el recorrido integrado; consultá la [validación web](validacion-web.md) para distinguir la evidencia registrada del ensayo humano todavía pendiente.
