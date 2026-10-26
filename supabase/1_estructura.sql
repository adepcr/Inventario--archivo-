-- =====================================================================
-- Inventario del Archivo General: estructura y seguridad (Supabase)
-- Copie todo este archivo en Supabase > SQL Editor > New query > Run
-- Se puede ejecutar de nuevo sin perder datos.
--
-- Un solo tipo de usuario: quien tenga usuario y contraseña puede buscar,
-- agregar, editar y eliminar. Sin sesión no se ve nada.
-- =====================================================================

-- ---------- Tablas ----------

create table if not exists public.archivos (
  id            bigint generated always as identity primary key,
  estante       text not null check (length(estante)   between 1 and 50),
  nivel         text not null check (length(nivel)     between 1 and 50),
  bloque        text not null check (length(bloque)    between 1 and 50),
  anio          text not null default 'No especifico' check (length(anio) <= 50),
  tipo          text not null check (length(tipo)      between 1 and 200),
  contenido     text not null default 'No especifico' check (length(contenido) <= 200),
  area          text not null check (length(area)      between 1 and 100),
  creado_en     timestamptz not null default now(),
  modificado_en timestamptz
);

-- Registro de cada cambio: quién, cuándo y qué pasó.
-- Archivos:     agregado | modificado | eliminado   (antes / después del archivo)
-- Contraseñas:  clave_restablecida (despues = {"para": correo}) | clave_cambiada
create table if not exists public.historial (
  id         bigint generated always as identity primary key,
  fecha      timestamptz not null default now(),
  accion     text not null,
  archivo_id bigint,                     -- vacío en los eventos de contraseña
  usuario    uuid,                       -- quién lo hizo
  correo     text,                       -- correo de quién lo hizo
  antes      jsonb,
  despues    jsonb
);
alter table public.historial alter column archivo_id drop not null;
create index if not exists historial_archivo_idx on public.historial (archivo_id);
create index if not exists historial_fecha_idx on public.historial (fecha desc);

-- ---------- Limpieza de la versión anterior con roles (si se había ejecutado) ----------

drop policy if exists "agregar archivos"       on public.archivos;
drop policy if exists "editar archivos"        on public.archivos;
drop policy if exists "eliminar archivos"      on public.archivos;
drop policy if exists "editores ven historial" on public.historial;
drop trigger if exists al_crear_usuario on auth.users;
drop function if exists public.crear_perfil();
drop function if exists public.es_editor();
drop table if exists public.perfiles;

-- ---------- Limpieza y validación de datos ----------

-- Limpia y normaliza los datos antes de guardarlos (no se puede saltar desde la página)
create or replace function public.normalizar_archivo()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.estante   := btrim(regexp_replace(new.estante, '\s+', ' ', 'g'));
  new.nivel     := upper(btrim(regexp_replace(new.nivel, '\s+', ' ', 'g')));
  new.bloque    := upper(btrim(regexp_replace(new.bloque, '\s+', ' ', 'g')));
  new.anio      := coalesce(nullif(btrim(regexp_replace(coalesce(new.anio, ''), '\s+', ' ', 'g')), ''), 'No especifico');
  new.tipo      := upper(btrim(regexp_replace(new.tipo, '\s+', ' ', 'g')));
  new.contenido := coalesce(nullif(btrim(regexp_replace(coalesce(new.contenido, ''), '\s+', ' ', 'g')), ''), 'No especifico');
  new.area      := btrim(regexp_replace(new.area, '\s+', ' ', 'g'));
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.creado_en := old.creado_en;
    new.modificado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists archivos_normalizar on public.archivos;
create trigger archivos_normalizar
  before insert or update on public.archivos
  for each row execute function public.normalizar_archivo();

-- Anota cada cambio en historial
create or replace function public.anotar_historial()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  quien uuid := auth.uid();
  mail  text := (select email from auth.users where id = auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.historial (accion, archivo_id, usuario, correo, despues)
    values ('agregado', new.id, quien, mail, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.historial (accion, archivo_id, usuario, correo, antes, despues)
    values ('modificado', new.id, quien, mail, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.historial (accion, archivo_id, usuario, correo, antes)
    values ('eliminado', old.id, quien, mail, to_jsonb(old));
    return old;
  end if;
end;
$$;

drop trigger if exists archivos_historial on public.archivos;
create trigger archivos_historial
  after insert or update or delete on public.archivos
  for each row execute function public.anotar_historial();

-- ---------- Seguridad (Row Level Security) ----------
-- Sin sesión iniciada no se puede ver ni modificar nada.
-- Con sesión: buscar, agregar, editar y eliminar. El historial solo se lee.

alter table public.archivos  enable row level security;
alter table public.historial enable row level security;

revoke all on public.archivos, public.historial from anon;
revoke all on public.historial from authenticated;
grant select, insert, update, delete on public.archivos to authenticated;
grant select on public.historial to authenticated;

drop policy if exists "ver archivos" on public.archivos;
create policy "ver archivos" on public.archivos
  for select to authenticated using (true);

drop policy if exists "modificar archivos" on public.archivos;
create policy "modificar archivos" on public.archivos
  for all to authenticated using (true) with check (true);

drop policy if exists "ver historial" on public.historial;
create policy "ver historial" on public.historial
  for select to authenticated using (true);

-- ---------- Contraseñas: restablecer la de un compañero ----------
-- Si alguien olvida su contraseña, otra persona con sesión le asigna una temporal
-- desde la app. Al entrar con ella, la app le pide crear una propia.
-- Cada restablecimiento y cada cambio de contraseña queda en el historial.

-- Versión anterior: los restablecimientos se guardaban en otra tabla. Se pasan al historial.
do $$
begin
  if to_regclass('public.claves_restablecidas') is not null then
    insert into public.historial (fecha, accion, correo, despues)
    select fecha, 'clave_restablecida', quien, jsonb_build_object('para', para)
    from public.claves_restablecidas;
    drop table public.claves_restablecidas;
  end if;
end $$;

-- Lista de correos con cuenta (para elegir al compañero)
create or replace function public.listar_usuarios()
returns table (correo text)
language sql stable security definer set search_path = ''
as $$
  select u.email::text
  from auth.users u
  where auth.uid() is not null and u.email is not null
  order by u.email;
$$;

-- Asigna una contraseña temporal a otra persona y cierra sus sesiones abiertas
create or replace function public.restablecer_clave(p_correo text, p_clave text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  destino uuid;
  correo_destino text;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión.';
  end if;
  if length(coalesce(p_clave, '')) < 8 then
    raise exception 'La contraseña temporal debe tener al menos 8 caracteres.';
  end if;

  select id, email into destino, correo_destino
  from auth.users where lower(email) = lower(btrim(p_correo));
  if destino is null then
    raise exception 'No hay ningún usuario con ese correo.';
  end if;
  if destino = auth.uid() then
    raise exception 'Para su propia contraseña use «Cambiar mi contraseña».';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"debe_cambiar_clave": true}'::jsonb,
      updated_at = now()
  where id = destino;

  delete from auth.sessions where user_id = destino;

  -- Queda en el historial quién lo hizo y a quién (no se puede saltar desde la app)
  insert into public.historial (accion, usuario, correo, despues)
  values ('clave_restablecida', auth.uid(),
          (select email from auth.users where id = auth.uid()),
          jsonb_build_object('para', correo_destino));
end;
$$;

-- La app la llama cuando alguien cambia su propia contraseña
create or replace function public.anotar_cambio_clave()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión.';
  end if;
  insert into public.historial (accion, usuario, correo)
  values ('clave_cambiada', auth.uid(), (select email from auth.users where id = auth.uid()));
end;
$$;

revoke execute on function public.listar_usuarios() from public, anon;
revoke execute on function public.restablecer_clave(text, text) from public, anon;
revoke execute on function public.anotar_cambio_clave() from public, anon;
grant execute on function public.listar_usuarios() to authenticated;
grant execute on function public.restablecer_clave(text, text) to authenticated;
grant execute on function public.anotar_cambio_clave() to authenticated;
