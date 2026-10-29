# Entrega del proyecto: Inventario del Archivo General

Guía para traspasar la app a otra persona y que siga funcionando sin depender de quien la creó.

> **Este repositorio es público.** No escriba aquí contraseñas, claves secretas ni datos del inventario. Entréguelos en persona, en sobre cerrado o con un gestor de contraseñas.

## Enlaces

| Qué | Dónde |
|---|---|
| App | https://adepcr.github.io/Inventario--archivo-/ |
| Código (este repositorio) | https://github.com/adepcr/Inventario--archivo- (organización `adepcr`) |
| Base de datos y usuarios | https://supabase.com/dashboard (proyecto `inventario-archivo`) |
| Correo que envía los avisos | `encuesta@adepcr.org` (Microsoft 365, cuenta de la institución) |
| Instrucciones técnicas | [README.md](README.md) |

## Cómo está armado

- **GitHub Pages** publica la página desde la carpeta `docs/` de este repositorio.
- **Supabase** guarda los archivos del inventario, los usuarios de la app y el historial.
- **Microsoft 365** (`encuesta@adepcr.org`) envía los correos de "¿Olvidó su contraseña?".

Si una de las tres cuentas se pierde, se pierde esa parte. Por eso hay que traspasar las tres.

## 1. Accesos a traspasar

No se entregan las contraseñas personales de quien se va: **se agrega a la persona nueva** en cada servicio.

### Supabase (lo más importante: ahí están los datos)

- [ ] Organización → **Team** → **Invite member** → correo de la persona nueva → rol **Owner**.
- [ ] La persona acepta la invitación desde su correo y aparece como **Owner** (no como invitación pendiente).
- [ ] La persona entra y confirma que ve el proyecto y la tabla `archivos`.
- [ ] Contraseña de la base de datos: se entrega en sobre cerrado, o la persona nueva la cambia en **Project Settings → Database → Reset database password**. (Casi nunca se usa; la app no la necesita.)
- [ ] Si la cuenta de Supabase se creó con **Continue with GitHub**, recordar que quien tenga esa cuenta de GitHub también entra a Supabase.

### GitHub (la página)

El repositorio está en la **organización `adepcr`** de GitHub, que es de la institución. No hay que transferirlo: solo cambiar quién lo administra.

- [ ] Organización `adepcr` → **People → Invite member** → cuenta de GitHub de la persona nueva → rol **Owner**.
- [ ] La persona acepta la invitación y aparece como **Owner**.
- [ ] Que siempre haya **al menos dos Owners** (por ejemplo, la jefatura y alguien de informática).
- [ ] Recién entonces, quien se va puede salir de la organización (**People** → su nombre → **Remove from organization**) o quedar como **Member**.

El enlace de la app (`https://adepcr.github.io/Inventario--archivo-/`) no cambia al cambiar de administradores.

### Correo `encuesta@adepcr.org`

- [ ] Confirmar que **TI** conoce la contraseña de este correo.
- [ ] Si alguien cambia esa contraseña, hay que actualizarla en Supabase → **Authentication → Emails → SMTP Settings → Password**. Si no, dejan de llegar los correos de "¿Olvidó su contraseña?". (El restablecimiento por un compañero, en **Cuenta**, sigue funcionando igual.)

### Recomendado

- [ ] Que haya **dos administradores** en Supabase y GitHub (por ejemplo, la persona que sigue y alguien de TI).

## 2. Archivos a entregar

- [ ] **Respaldo actual de los datos:** Supabase → **Table Editor → archivos → Export → Export to CSV**. Se abre en Excel.
- [ ] **Respaldo del historial** (opcional): igual, con la tabla `historial`.
- [ ] **Datos originales** (respaldo histórico, ya no se usan): `2_datos.sql` y el Excel `INVENTARIO_ARCHIVO_GENERAL.xlsx`. No están en este repositorio porque es público.

## 3. Lo que la persona nueva debe saber

**Usuarios de la app**

- Agregar: Supabase → **Authentication → Users → Add user → Create new user** (marcar *Auto Confirm User*).
- Los usuarios nuevos entran como **solo consulta**. Para que alguien pueda agregar, editar y eliminar, darle el rol **editor** (ver *Roles* en el [README](README.md)).
- Quitar acceso: eliminar el usuario en esa misma lista.
- Contraseñas olvidadas: botón **¿Olvidó su contraseña?** (por correo) o, en la app, **Cuenta → Restablecer contraseña de un compañero**.
- Nadie puede crearse una cuenta solo: **Authentication → Sign In / Providers → Allow new users to sign up** debe seguir **desactivado**.

**Tareas periódicas**

| Cada cuánto | Tarea |
|---|---|
| Mensual | Respaldo CSV de la tabla `archivos` |
| Cuando cambie la contraseña de `encuesta@adepcr.org` | Actualizarla en **SMTP Settings** |
| Si la app deja de cargar datos | Revisar si Supabase pausó el proyecto (pasa tras 7 días sin uso) y presionar **Restore project**. No se pierden datos. |

**Recuperar algo borrado o revisar cambios:** botón **Historial** en la app, o las consultas de la sección *Administración* del [README](README.md).

## 4. Antes de irse

- [ ] La persona nueva confirmó que entra a **Supabase** como Owner.
- [ ] La persona nueva confirmó que puede editar el **repositorio** (o recibió la cuenta).
- [ ] TI confirmó que tiene la contraseña de **`encuesta@adepcr.org`**.
- [ ] Se entregó el último **respaldo CSV**.
- [ ] Recién entonces: salir del equipo de Supabase (**Team → Leave team**) y, si corresponde, del repositorio.
- [ ] Si el usuario propio de la app ya no se usará, eliminarlo en **Authentication → Users**.

## Datos de la entrega

Completar a mano al entregar (no subir con contraseñas):

- Entregado por: ______________________
- Recibido por: ______________________
- Fecha: ______________________
- Administradores de Supabase: ______________________
- Dueño del repositorio de GitHub: ______________________
- Usuarios con acceso a la app: ______________________
