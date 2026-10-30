# Inventario del Archivo General

Aplicación web para buscar los archivos del Archivo General por categoría (área), año, tipo y contenido específico, y ver en qué **estante, nivel y bloque** están. También permite **agregar, editar y eliminar** archivos, **registrar préstamos** (quién se llevó un archivo y cuándo lo devolvió) y **descargar un respaldo en Excel**.

- **App:** https://adepcr.github.io/Inventario--archivo-/
- **Repositorio oficial:** https://github.com/adepcr/Inventario--archivo- (organización de ADEP en GitHub)
- **Datos:** [Supabase](https://supabase.com) (base de datos PostgreSQL en la nube, plan gratis)
- **Página:** GitHub Pages, carpeta [`docs/`](docs)
- Se puede **instalar como app** en celular y computadora.
- **¿Traspasar el proyecto a otra persona?** Vea [ENTREGA.md](ENTREGA.md).

## Seguridad

- Hay que iniciar sesión con correo y contraseña. Sin sesión no se ve ningún dato.
- Nadie puede crearse una cuenta solo: los usuarios los crea el administrador en Supabase.
- Hay dos roles (tabla `roles_usuario`, por correo):
  - **Editor:** buscar, agregar, editar, eliminar, prestar y devolver, ver el historial, descargar el respaldo y restablecer contraseñas de compañeros.
  - **Solo consulta (lector):** solo buscar y ver los archivos, incluido qué está prestado y a quién. Puede cambiar o recuperar su propia contraseña.
  - Quien no esté en la tabla es **solo consulta**. Ver *Roles* más abajo para cambiarlo.
- Los permisos los controla la base de datos (Row Level Security), no la página.
- Cada cambio queda en la tabla `historial` con el correo de quien lo hizo y la fecha.
- Los datos del inventario **no están en este repositorio** (es público). Solo están en Supabase.
- La clave de `docs/config.js` es la clave **pública** de Supabase; puede estar aquí sin problema. Nunca ponga la clave `service_role` / `secret`.

## Estructura

```
docs/                     la app (lo que publica GitHub Pages)
  index.html              estructura de la página
  estilos.css             colores y diseño
  app.js                  lógica: sesión, búsqueda, agregar, editar, eliminar, préstamos, respaldo
  xlsx.js                 arma el archivo de Excel del respaldo (sin librerías externas)
  config.js               dirección y clave pública de Supabase
  manifest.webmanifest    datos para instalarla como app
  sw.js                   service worker (abre rápido, instalable)
  iconos/                 íconos de la app
  lib/supabase.js         librería oficial de Supabase (v2.117.2)
supabase/
  1_estructura.sql        tablas, seguridad e historial
  3_prestamos.sql         préstamos y la función "mantener activo"
.github/workflows/
  mantener-activo.yml     tarea de GitHub que evita que Supabase pause el proyecto
```

El archivo con los datos iniciales (`2_datos.sql`, 1310 archivos del Excel original) se entrega aparte y se ejecuta una sola vez en Supabase.

## Propiedad y licencias

- El código de esta aplicación fue desarrollado para la **Asociación de Educadores Pensionados (ADEP)** y le pertenece. Que el repositorio sea público permite verlo, pero no da permiso para usarlo o copiarlo en otros proyectos.
- El logo de ADEP (`docs/iconos/logo-adep.png`) es de la institución.
- `docs/lib/supabase.js` es la librería oficial de Supabase, con licencia MIT: ver [`docs/lib/LICENSE-supabase-js.txt`](docs/lib/LICENSE-supabase-js.txt).
- Las letras Outfit e Inter se cargan desde Google Fonts (licencia SIL Open Font License).

## Puesta en marcha

### 1. Supabase

1. Cree una cuenta en https://supabase.com y un proyecto nuevo (guarde la contraseña de la base de datos).
2. **SQL Editor → New query**: pegue todo [`supabase/1_estructura.sql`](supabase/1_estructura.sql) y presione **Run**.
3. **SQL Editor → New query**: pegue todo `2_datos.sql` y presione **Run**. Debe mostrar `archivos_cargados = 1310`.
4. **SQL Editor → New query**: pegue todo [`supabase/3_prestamos.sql`](supabase/3_prestamos.sql) y presione **Run**. (Préstamos y "mantener activo". Se puede ejecutar de nuevo sin perder datos.)
5. **Authentication → Sign In / Providers**: desactive **Allow new users to sign up**.
6. **Authentication → Users → Add user → Create new user**: cree el usuario de cada persona (marque *Auto Confirm User*).
7. **Authentication → URL Configuration → Site URL**: `https://adepcr.github.io/Inventario--archivo-/`

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

### 6. Préstamos

Cada archivo tiene el botón **Prestar**: se escribe quién se lo lleva, hasta cuándo (opcional) y una nota.
Mientras está afuera, la tarjeta se ve dorada con «Prestado a… desde…» y el botón cambia a **Devolver**.
Si pasó la fecha de devolución, se ve en rojo («debía volver el…»).

- El botón **Prestados** (arriba) muestra los archivos prestados, con los atrasados primero, y los ya devueltos.
- El filtro **Estado** muestra solo los prestados o solo los que están en el archivo.
- Cada préstamo y devolución queda en el **Historial** (filtro *Prestados*) con el correo de quien lo registró.
- Nadie puede editar ni borrar un préstamo desde la app. Si se elimina un archivo prestado, su préstamo se conserva.

Si `3_prestamos.sql` no se ha ejecutado en Supabase, la app funciona igual pero sin los botones de préstamos.

### 7. Respaldo en Excel

El botón **Respaldo** descarga `Respaldo-Inventario-Archivo-AAAA-MM-DD.xlsx` con todo lo que hay en Supabase en ese momento:
- Hoja **Inventario**: todos los archivos, con a quién está prestado cada uno.
- Hoja **Prestados**: todos los préstamos, abiertos y devueltos.

Recomendado: descargarlo **una vez al mes** y guardarlo en una carpeta compartida de ADEP (no en este repositorio, que es público).

### 8. Que Supabase no pause el proyecto

En el plan gratis, Supabase pausa el proyecto si pasa 7 días sin uso. La tarea
[`.github/workflows/mantener-activo.yml`](.github/workflows/mantener-activo.yml) le hace una consulta pequeña
**los lunes y jueves**, que no lee ni cambia datos. Necesita que `3_prestamos.sql` esté ejecutado.

- Para probarla: pestaña **Actions** de este repositorio → *Mantener activa la base de datos* → **Run workflow**. Debe terminar en verde y decir `Supabase respondió: true`.
- GitHub apaga las tareas programadas de los repositorios que pasan 60 días sin cambios. La tarea se vuelve a activar sola cada vez que corre. Si aun así GitHub manda un correo avisando que la desactivó, entre a **Actions** y presione **Enable workflow**.
- Si la tarea falla (se ve en rojo en **Actions** y GitHub avisa por correo), revise que `docs/config.js` tenga la dirección y la clave pública correctas.

## Roles

Editores iniciales: `eescobar@adepcr.org`, `camora@adepcr.org` y los usuarios que ya existían al activar los roles.
Solo consulta: `pmendez@adepcr.org`, `dugalde@adepcr.org` y cualquier usuario nuevo.

Para cambiar el rol de alguien, en Supabase → **SQL Editor**:

```sql
-- Hacer editor (o 'lector' para dejarlo en solo consulta)
insert into public.roles_usuario (correo, rol) values ('persona@adepcr.org', 'editor')
on conflict (correo) do update set rol = excluded.rol, actualizado = now();

-- Ver los roles actuales
select correo, rol, actualizado from public.roles_usuario order by rol, correo;
```

El cambio se aplica al instante en la base de datos; en la app se ve al volver a entrar. El correo se escribe en minúsculas.

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
- **Respaldo:** botón **Respaldo** de la app (Excel con el inventario y los préstamos). Recomendado una vez al mes.
- **Plan gratis:** Supabase pausa el proyecto si pasa 7 días seguidos sin uso. La tarea *mantener activo* lo evita (vea el punto 8). Si aun así se pausara, se reactiva con *Restore project* sin perder datos.
