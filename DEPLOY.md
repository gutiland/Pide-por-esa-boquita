# Despliegue de Copas a la carta

## Un único servicio
Express sirve /api y frontend/dist. No se despliega Vite como servidor de producción.
HTTPS y la dirección estable los proporciona el alojamiento.

Con Docker: construir desde la raíz del repositorio usando Dockerfile.
Sin Docker, desde la raíz:
- Build: npm run build
- Start: npm start
- Node: 24
- Health check: /api/health
- Puerto: PORT del proveedor (no fijarlo a 5173).

## Variables privadas del servicio (copiar desde backend/.env sin subir el archivo)
DB
JWT_SECRET
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
NODE_ENV=production

PORT lo asigna el proveedor. DNS_SERVERS es un ajuste local opcional; no hace falta
copiarlo salvo que el alojamiento también tenga problemas de DNS.
Mantener las claves VAPID. Cambiar el dominio requiere activar de nuevo los avisos.

## MongoDB Atlas
Autorizar el acceso del alojamiento en Network Access.
Usar las IP de salida indicadas por el proveedor cuando estén disponibles.
No incluir credenciales ni archivos .env en Git.
El servicio usa la base de datos existente; no ejecutar semillas al desplegar.

## Comprobar antes del piloto
- /api/health devuelve 200.
- /pub/bar-central?mesa=4 carga carta e imágenes.
- /pub/login y /pub/orders funcionan al recargar.
- /sw.js devuelve JavaScript, no HTML, y Cache-Control: no-cache.
- /manifest.webmanifest e iconos accesibles.
- El acceso sin token a pedidos devuelve 401.
- Pedido desde móvil -> panel -> servido -> pagado.
- Activar avisos en la dirección definitiva y probar con el teléfono bloqueado.
- Desactivar el túnel temporal cuando termine la prueba.

No se han creado aún recursos de alojamiento ni se ha contratado ningún plan.
## Render
render.yaml está preparado para un Web Service Docker gratuito en Frankfurt.
No se ha aplicado ni creado el servicio. El plan Free suspende el servicio tras
15 minutos sin tráfico; antes del piloto real, elegir un plan activo y confirmar
el precio en Render. autoDeployTrigger está desactivado para publicar versiones
manualmente durante las pruebas.

Publicar primero el código en un repositorio privado de GitHub.
Conectar ese repositorio en Render usando New > Blueprint, o New > Web Service:
- Root Directory: vacía (raíz del repositorio).
- Runtime: Docker.
- Dockerfile: ./Dockerfile.
- Health check: /api/health.
- Variables: las seis indicadas arriba, tomadas del .env local.
- No subir el archivo .env al repositorio.

Si las IP de salida de Render no están autorizadas en Atlas, el arranque fallará
hasta permitir esas IP en Atlas. Revisar los logs antes de tocar datos.