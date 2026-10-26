# Inventario del Archivo General

Aplicación web para buscar los archivos del Archivo General por categoría (área), año, tipo y contenido específico, y ver en qué **estante, nivel y bloque** están. También permite **agregar, editar y eliminar** archivos.

- **App:** https://adepcr.github.io/Inventario--archivo-/
- **Repositorio oficial:** https://github.com/adepcr/Inventario--archivo- (organización de ADEP en GitHub)
- **Datos:** [Supabase](https://supabase.com) (base de datos PostgreSQL en la nube, plan gratis)
- **Página:** GitHub Pages, carpeta [`docs/`](docs)
- Se puede **instalar como app** en celular y computadora.
- **¿Traspasar el proyecto a otra persona?** Vea [ENTREGA.md](ENTREGA.md).

## Seguridad

- Hay que iniciar sesión con correo y contraseña. Sin sesión no se ve ningún dato.
- Nadie puede crearse una cuenta solo: los usuarios los crea el administrador en Supabase.
- Todas las personas con usuario pueden buscar, agregar, editar y eliminar.
- Los permisos los controla la base de datos (Row Level Security), no la página.
- Cada cambio queda en la tabla `historial` con el correo de quien lo hizo y la fecha.
- Los datos del inventario **no están en este repositorio** (es público). Solo están en Supabase.
- La clave de `docs/config.js` es la clave **pública** de Supabase; puede estar aquí sin problema. Nunca ponga la clave `service_role` / `secret`.

## Estructura

```
docs/                     la app (lo que publica GitHub Pages)
  index.html              estructura de la página
  estilos.css             colores y diseño
  app.js                  lógica: sesión, búsqueda, agregar, editar, eliminar
  config.js               dirección y clave pública de Supabase
  manifest.webmanifest    datos para instalarla como app
  sw.js                   service worker (abre rápido, instalable)
  iconos/                 íconos de la app
  lib/supabase.js         librería oficial de Supabase (v2.117.2)
supabase/
  1_estructura.sql        tablas, seguridad e historial
```

El archivo con los datos iniciales (`2_datos.sql`, 1310 archivos del Excel original) se entrega aparte y se ejecuta una sola vez en Supabase.

## Puesta en marcha

### 1. Supabase

1. Cree una cuenta en https://supabase.com y un proyecto nuevo (guarde la contraseña de la base de datos).
2. **SQL Editor → New query**: pegue todo [`supabase/1_estructura.sql`](supabase/1_estructura.sql) y presione **Run**.
3. **SQL Editor → New query**: pegue todo `2_datos.sql` y presione **Run**. Debe mostrar `archivos_cargados = 1310`.
4. **Authentication → Sign In / Providers**: desactive **Allow new users to sign up**.
5. **Authentication → Users → Add user → Create new user**: cree el usuario de cada persona (marque *Auto Confirm User*).
6. **Authentication → URL Configuration → Site URL**: `https://adepcr.github.io/Inventario--archivo-/`

### 2. Conectar la app

1. En Supabase: **Project Settings → Data API / API Keys**. Copie la **Project URL** y la clave pública (**anon** o **publishable**).
2. En GitHub abra [`docs/config.js`](docs/config.js), clic en el lápiz (✏️ *Edit*), pegue los dos datos y presione **Commit changes**.

### 3. Activar GitHub Pages

1. En este repositorio: **Settings → Pages**.
2. *Source*: **Deploy from a branch**. *Branch*: **main** y carpeta **/docs**. **Save**.
3. En uno o dos minutos la app queda en https://adepcr.github.io/Inventario--archivo-/

Cada vez que se cambie algo en `docs/` y se haga commit, GitHub Pages publica la versión nueva sola. Si cambia archivos de la app, suba también el número de `VERSION` en `docs/sw.js` para que los celulares tomen la versión nueva.

### 4. Contraseñas

**¿Olvidó su contraseña? (por correo)**
En la pantalla de ingreso, la persona escribe su correo y recibe un enlace. Al abrirlo, la app le pide la contraseña nueva y entra. Si el enlace venció o ya se usó, la app lo indica.

Configuración en Supabase (ya hecha):
- **Authentication → Emails → SMTP Settings** (*Enable custom SMTP*): remitente `encuesta@adepcr.org`, host `smtp.office365.com`, puerto `587`, usuario `encuesta@adepcr.org` y la contraseña de ese correo. Si se cambia la contraseña de ese correo, hay que actualizarla aquí o dejarán de llegar los mensajes.
- **Authentication → URL Configuration → Redirect URLs**: `https://adepcr.github.io/Inventario--archivo-/**`
- Opcional, correo en español: **Authentication → Emails → Templates → Reset Password**
  - Asunto: `Restablecer contraseña - Inventario Archivo General`
  - Mensaje:
    ```html
    <h2>Restablecer contraseña</h2>
    <p>Se pidió cambiar la contraseña del Inventario del Archivo General para este correo.</p>
    <p><a href="{{ .ConfirmationURL }}">Crear contraseña nueva</a></p>
    <p>Si usted no lo pidió, ignore este mensaje. El enlace vence en 1 hora y sirve una sola vez.</p>
    ```

**Desde la app, botón Cuenta** (no usa correo):
- **Cambiar mi contraseña:** pide la actual y la nueva (mínimo 8 caracteres).
- **Restablecer contraseña de un compañero:** respaldo por si el correo no llega. Se elige a la persona, la app genera una contraseña temporal (por ejemplo `KMPT-4827-QXRA`) y se le dicta. Su contraseña anterior deja de servir y se cierran sus sesiones abiertas. Al entrar con la temporal, debe crear una propia.

Todo queda en el **Historial**: quién restableció la contraseña de quién, quién cambió la suya y quién la recuperó por correo.

Si nadie puede entrar (por ejemplo, todos olvidaron la contraseña), el administrador la cambia en **SQL Editor**:

```sql
update auth.users
set encrypted_password = extensions.crypt('Temporal-2026', extensions.gen_salt('bf')),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"debe_cambiar_clave": true}'::jsonb
where email = 'persona@correo.com';
```

### 5. Historial

El botón **Historial** muestra, del más reciente al más antiguo, quién hizo qué y cuándo:

- **Archivos:** agregó, editó (con lo que cambió, por ejemplo `Estante: 4 → 6`) y eliminó.
- **Contraseñas:** restableció la contraseña de un compañero, cambió la suya o la recuperó por correo.
- Se puede filtrar por *Todo*, *Archivos* o *Contraseñas*.

El historial lo escribe la base de datos: desde la app **nadie lo puede editar ni borrar**. Los cambios hechos directamente desde el panel de Supabase aparecen como *Administrador (panel de Supabase)*.

## Instalar como app

- **Android (Chrome):** menú ⋮ → *Instalar app* / *Agregar a la pantalla principal*.
- **iPhone (Safari):** Compartir → *Agregar a inicio*.
- **Computadora (Chrome / Edge):** ícono de instalar en la barra de direcciones.

## Administración

```sql
-- Últimos 50 movimientos (también se ven en la app, botón Historial)
select fecha, accion, correo, coalesce(despues, antes) as detalle
from public.historial order by fecha desc limit 50;

-- Recuperar un archivo eliminado (cambie 1234 por el archivo_id del historial)
insert into public.archivos (estante, nivel, bloque, anio, tipo, contenido, area)
select antes->>'estante', antes->>'nivel', antes->>'bloque', antes->>'anio',
       antes->>'tipo', antes->>'contenido', antes->>'area'
from public.historial where accion = 'eliminado' and archivo_id = 1234;
```

- **Quitar acceso a alguien:** Authentication → Users → eliminar el usuario.
- **Respaldo:** Table Editor → `archivos` → Export → CSV (se abre en Excel). Recomendado una vez al mes.
- **Plan gratis:** Supabase pausa el proyecto si pasa 7 días seguidos sin uso. Se reactiva con *Restore project* sin perder datos.
