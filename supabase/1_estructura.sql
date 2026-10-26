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

-- Registro de cada cambio: quién, cuándo y qué había antes / después
create table if not exists public.historial (
  id         bigint generated always as identity primary key,
  fecha      timestamptz not null default now(),
  accion     text not null,              -- agregado | modificado | eliminado
  archivo_id bigint not null,
  usuario    uuid,
  correo     text,
  antes      jsonb,
  despues    jsonb
);
create index if not exists historial_archivo_idx on public.historial (archivo_id);

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
