# Cuentas de pubs y separación de datos

Una cuenta por pub. No hay cuentas individuales de camareros ni registro público.

## Compatibilidad de los datos existentes

El modelo Pub utiliza la colección pubs. Al arrancar se copian desde users solo las cuentas con pub explícito, conservando ID, email y hash. Los usuarios antiguos sin pub no se migran ni se borran.
El antiguo campo pub es el identificador público único e inmutable (slug).
Productos y pedidos se separan con ese identificador. El JWT contiene pubId y auth
carga la cuenta real antes de autorizar cualquier operación privada.

Al arrancar:

- Si hay un solo pub, las bebidas antiguas sin pub se asocian a ese bar.
- Con varios pubs, las bebidas sin propietario no se asignan automáticamente.
- Si varias cuentas comparten el mismo identificador de pub, se detiene el arranque
  para revisar esa ambigüedad. No se borran cuentas ni pedidos.

Los JWT antiguos de usuario dejan de servir: es necesario iniciar sesión de nuevo.

## Enlaces

Carta: /pub/bar-central?mesa=4
Login de cualquier pub: /pub/login
Panel del pub autenticado: /pub/orders
La raíz conserva temporalmente los enlaces de prueba de bar-central.

## Crear otro pub desde PowerShell (en backend)

No introduzcas una contraseña real en archivos del repositorio.
Para recogerla sin mostrarla en pantalla:

$secretInput = Read-Host "Contraseña del nuevo pub (mínimo 12 caracteres)" -AsSecureString
$env:PUB_PASSWORD = [System.Net.NetworkCredential]::new("", $secretInput).Password
npm run create-pub -- bar-norte "Bar Norte" contacto@ejemplo.com
Remove-Item Env:PUB_PASSWORD

El script comprueba duplicados y guarda un hash bcrypt.
Después se puede cargar la carta inicial del nuevo bar:
npm run seed -- bar-norte

ATENCIÓN: la semilla sustituye los productos de ESE bar. No modifica los demás pubs.
No ejecutes la semilla sobre pedidos reales si quieres conservar sus referencias
a los productos actuales. Para el uso normal, DELETE de bebidas las desactiva.

## API

POST /api/pubs/login
GET /api/pubs/me (JWT)
GET /api/pubs/:slug (datos públicos, sin email ni contraseña)
GET /api/drinks?pub=bar-central (solo disponibles)
POST /api/drinks (JWT, asignación al pub de la cuenta)
PUT /api/drinks/:id (JWT, solo propio pub)
DELETE /api/drinks/:id (JWT, desactiva solo una bebida propia)
POST /api/orders (público, valida que bebida y mezcla pertenecen al pub indicado)
GET /api/orders (JWT, solo propio pub)
PATCH /api/orders/:id/status (JWT, solo propio pub)

Los archivos antiguos de User se conservan como referencia de la práctica,
pero sus rutas no están montadas ni tienen registro público.

## Comprobación manual

1. Reiniciar backend e iniciar sesión con la cuenta existente.
2. Abrir /pub/bar-central?mesa=4 y enviar un pedido.
3. Comprobar que llega al panel y se puede servir/pagar.
4. Crear bar-norte y cargar su carta con los comandos anteriores.
5. Iniciar sesión con bar-norte: no debe ver pedidos de bar-central.
6. Intentar enviar a bar-norte un ID de bebida de bar-central: debe rechazarse.
7. Probar editar una bebida o pedido ajeno: debe responder 404.
8. GET /api/pubs/bar-central nunca debe contener email ni password.

El esquema está preparado para varios bares. La selección comercial de productos,
la configuración visual desde un panel, límites de mesas, protección contra pedidos
abusivos y puesta en producción se desarrollan aparte.
