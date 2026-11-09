# Avisos push al personal

## Qué está implementado

- Activar/desactivar avisos por dispositivo desde el panel autenticado.
- Aviso de prueba enviado exclusivamente al dispositivo de ese pub.
- Aviso automático al guardar un nuevo pedido, incluso sin la página abierta.
- Suscripciones separadas por pub; caducan a los 30 días y se renuevan al abrir el panel.
- Al cerrar sesión se revoca la suscripción del navegador y se intenta borrar del servidor.
- El worker abre siempre /pub/orders; no guarda tokens ni cachea datos privados.
- Una suscripción por navegador y origen: se utiliza para un pub a la vez.
- Sonido y vibración los decide el teléfono. No se pueden forzar con modo silencio/No molestar.

## Requisitos para la prueba real

Publicar frontend y API bajo el mismo origen HTTPS (o proxy de /api al backend).
La URL local http://192.168... no es un contexto seguro y no permite activar push.
http://localhost sirve para pruebas en el ordenador, no en el móvil.

iPhone/iPad: abrir con Safari, añadir a pantalla de inicio, abrir desde su icono,
iniciar sesión y pulsar Activar avisos. Requiere iOS/iPadOS compatible con Web Push.
Android: usar Chrome u otro navegador compatible, conceder el permiso y revisar
los ajustes de notificaciones/batería del sistema.

## Configuración

Las claves VAPID ya se han generado una vez en backend/.env.
La clave privada nunca va en frontend ni se devuelve por la API.
En el alojamiento del backend deben conservarse las mismas variables:
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT.
No regenerar las claves en cada despliegue: invalidaría suscripciones existentes.
VAPID_SUBJECT contiene el email técnico indicado por el propietario.

Conservar GET /sw.js y /manifest.webmanifest como archivos estáticos, sin
redirigirlos a index.html. Servir sw.js con Cache-Control: no-cache.
La app no necesita permanecer abierta para recibir el push, pero el servidor
sí debe estar encendido. No se ha desplegado aún.

## Pruebas

1. Reiniciar backend y frontend.
2. Entrar al panel desde HTTPS e iniciar sesión.
3. Activar avisos y conceder permiso.
4. Enviar aviso de prueba: comprobar la notificación del sistema.
5. Bloquear el teléfono y enviar un pedido desde otro dispositivo.
6. Comprobar mesa y nombre del bar; tocar el aviso debe abrir el panel.
7. Hacer lo mismo con otra cuenta/pub: no debe recibir pedidos del primero.
8. Desactivar avisos o cerrar sesión: dejar de recibirlos.
9. Revocar el permiso desde el navegador: el panel debe indicar el problema al activar.
10. Si se elimina la suscripción, el servidor la limpia al recibir un 404/410 del proveedor.

## Límites actuales

Se mantiene la actualización del panel cada cinco segundos; push no añade sondeos
periódicos a MongoDB. Consulta los dispositivos al crear un pedido.
Los avisos caducan en el proveedor a los cinco minutos para evitar avisos antiguos.
El envío es de mejor esfuerzo: no hay una cola persistente de reintentos.
Un reinicio en el momento de enviar o un fallo del proveedor puede perder el aviso.
El pedido siempre queda en el panel; nunca se considera que el push sustituya esa lista.
