# Portal de Documentos — Miguel Ortecho Romero

Portal privado para subir documentos escaneados (PDF/imágenes) y que cada
cliente los descargue con su propio usuario y contraseña.

- **Frontend/Backend:** Next.js 15 (App Router)
- **Base de datos:** Neon (PostgreSQL) vía Prisma
- **Almacenamiento de archivos:** Cloudinary (recurso `private`, con links de
  descarga firmados y temporales de 60 segundos)
- **Autenticación:** NextAuth (credenciales), roles `ADMIN` y `CLIENT`
- **Despliegue:** Vercel

## Cómo funciona

1. El **administrador** entra a `/admin` con su cuenta y:
   - Crea una cuenta (correo + contraseña) para cada cliente.
   - Sube el documento escaneado asignado a ese cliente.
2. Le comparte al cliente el **link del sitio** + su **usuario y contraseña**
   (por WhatsApp, correo, etc. — fuera de la app).
3. El **cliente** entra a `/login`, ve solo sus propios documentos en
   `/dashboard` y los descarga.
4. Los archivos se guardan como recurso **privado** en Cloudinary: nadie puede
   acceder a ellos con la URL directa. Cada descarga genera un link firmado
   que expira en 60 segundos.

## 1. Configurar variables de entorno

Copia `.env.example` a `.env` y completa:

```bash
cp .env.example .env
```

- `DATABASE_URL`: cadena de conexión "pooled" de tu proyecto en
  [Neon](https://neon.tech).
- `NEXTAUTH_SECRET`: genera uno con `openssl rand -base64 32`.
- `NEXTAUTH_URL`: `http://localhost:3000` en desarrollo, y la URL de Vercel en
  producción.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: los
  encuentras en el dashboard de [Cloudinary](https://cloudinary.com).
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: credenciales del primer
  usuario administrador (se crean con el seed, ver abajo).

## 2. Instalar dependencias

```bash
npm install
```

## 3. Crear las tablas en Neon

```bash
npx prisma migrate dev --name init
```

## 4. Crear el usuario administrador

```bash
npm run seed
```

Esto crea (o actualiza) un usuario `ADMIN` con el correo y contraseña que
pusiste en `.env`. Con esa cuenta entras a `/admin`.

## 5. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000 — te redirige a `/login`.

## 6. Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel, "New Project" → importa el repositorio.
3. En **Environment Variables**, agrega las mismas variables de `.env`
   (con `NEXTAUTH_URL` apuntando al dominio de Vercel).
4. Despliega. El script `build` ya ejecuta `prisma generate` automáticamente.
5. Ejecuta la migración y el seed contra la base de Neon de producción, por
   ejemplo desde tu máquina apuntando `DATABASE_URL` a la base de producción:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

## Notas de seguridad

- Los documentos se suben con `type: "private"` en Cloudinary: no son
  accesibles públicamente, solo mediante enlaces firmados generados al vuelo
  por el servidor, después de validar la sesión y que el documento pertenece
  al usuario (o que es el administrador).
- Las contraseñas se guardan con hash `bcrypt`, nunca en texto plano.
- Las rutas `/admin/*` y `/dashboard/*` están protegidas por middleware; el
  panel de administrador además valida el rol en cada endpoint de la API.

## Mantenimiento de dependencias

Corre `npm audit` de vez en cuando. Al momento de crear este proyecto se fijó
`next@15.5.24` porque corrige una vulnerabilidad crítica (RCE) presente en
toda la serie 14.x. Queda una advertencia "high" de `postcss` (usada
internamente por Next para compilar CSS en el build, no procesa datos de
usuarios en producción) que solo se corrige subiendo a Next 16; evalúa migrar
cuando el proyecto lo permita.

## Próximos pasos sugeridos (no incluidos en esta versión)

- Recuperación de contraseña por correo.
- Notificación automática (correo/WhatsApp) al cliente cuando se sube un
  documento nuevo.
- Historial de descargas por documento.
