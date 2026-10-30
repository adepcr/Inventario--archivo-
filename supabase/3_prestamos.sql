-- =====================================================================
-- Inventario del Archivo General: préstamos y "mantener activo" (Supabase)
-- Ejecútelo DESPUÉS de 1_estructura.sql (usa la función es_editor de ese archivo):
-- Supabase > SQL Editor > New query > pegue todo este archivo > Run
-- Se puede ejecutar de nuevo sin perder datos.
--
-- Préstamos: quién se llevó un archivo, cuándo y cuándo lo devolvió.
-- Todos los usuarios con sesión ven los préstamos; solo los editores prestan y devuelven.
-- Solo se prestan y devuelven con las funciones prestar_archivo y
-- devolver_archivo, que anotan quién lo hizo. Nadie puede editar ni borrar
-- un préstamo desde la app. Cada préstamo y devolución queda en el historial.
-- =====================================================================

-- ---------- Tabla ----------

create table if not exists public.prestamos (
  id              bigint generated always as identity primary key,
  -- Si se elimina el archivo del inventario, el préstamo se conserva (con su copia en "archivo")
  archivo_id      bigint references public.archivos (id) on delete set null,
  archivo         jsonb not null,          -- copia del archivo al prestarlo (tipo, ubicación…)
  persona         text not null check (length(persona) between 2 and 120),
  nota            text check (length(nota) <= 300),
  devolver_antes  date,                    -- fecha en que se espera de vuelta (opcional)
  prestado_en     timestamptz not null default now(),
  prestado_por    text,                    -- correo de quien registró el préstamo
  devuelto_en     timestamptz,             -- vacío mientras el archivo está prestado
  devuelto_por    text                     -- correo de quien registró la devolución
);

-- Un archivo solo puede tener un préstamo sin devolver
create unique index if not exists prestamos_un_activo_idx
  on public.prestamos (archivo_id) where devuelto_en is null;
create index if not exists prestamos_fecha_idx on public.prestamos (prestado_en desc);

-- ---------- Seguridad ----------
-- Con sesión se pueden ver. Para prestar y devolver se usan las funciones de abajo.

alter table public.prestamos enable row level security;
revoke all on public.prestamos from anon, authenticated;
grant select on public.prestamos to authenticated;

drop policy if exists "ver prestamos" on public.prestamos;
create policy "ver prestamos" on public.prestamos
  for select to authenticated using (true);

-- ---------- Prestar y devolver ----------

create or replace function public.prestar_archivo(p_archivo bigint, p_persona text, p_devolver_antes date default null, p_nota text default null)
returns public.prestamos
language plpgsql security definer set search_path = ''
as $$
declare
  mail text := (select email from auth.users where id = auth.uid());
  arch public.archivos;
  nuevo public.prestamos;
  quien text := btrim(regexp_replace(coalesce(p_persona, ''), '\s+', ' ', 'g'));
  nota  text := nullif(btrim(regexp_replace(coalesce(p_nota, ''), '\s+', ' ', 'g')), '');
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión.';
  end if;
  if not public.es_editor() then
    raise exception 'Su usuario es de solo consulta: no puede registrar préstamos.';
  end if;
  if length(quien) < 2 then
    raise exception 'Escriba quién se lleva el archivo.';
  end if;
  if p_devolver_antes is not null and p_devolver_antes < current_date then
    raise exception 'La fecha de devolución no puede ser anterior a hoy.';
  end if;

  select * into arch from public.archivos where id = p_archivo for update;
  if arch.id is null then
    raise exception 'Ese archivo ya no existe. Recargue la página.';
  end if;
  if exists (select 1 from public.prestamos where archivo_id = p_archivo and devuelto_en is null) then
    raise exception 'Ese archivo ya está prestado. Recargue la página.';
  end if;

  insert into public.prestamos (archivo_id, archivo, persona, nota, devolver_antes, prestado_por)
  values (arch.id,
          jsonb_build_object('estante', arch.estante, 'nivel', arch.nivel, 'bloque', arch.bloque,
                             'anio', arch.anio, 'tipo', arch.tipo, 'contenido', arch.contenido, 'area', arch.area),
          left(quien, 120), left(nota, 300), p_devolver_antes, mail)
  returning * into nuevo;

  insert into public.historial (accion, archivo_id, usuario, correo, despues)
  values ('prestado', arch.id, auth.uid(), mail,
          nuevo.archivo || jsonb_build_object('persona', nuevo.persona, 'devolver_antes', nuevo.devolver_antes, 'nota', nuevo.nota));
  return nuevo;
end;
$$;

create or replace function public.devolver_archivo(p_prestamo bigint)
returns public.prestamos
language plpgsql security definer set search_path = ''
as $$
declare
  mail text := (select email from auth.users where id = auth.uid());
  p public.prestamos;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión.';
  end if;
  if not public.es_editor() then
    raise exception 'Su usuario es de solo consulta: no puede registrar devoluciones.';
  end if;

  update public.prestamos
  set devuelto_en = now(), devuelto_por = mail
  where id = p_prestamo and devuelto_en is null
  returning * into p;
  if p.id is null then
    raise exception 'Ese préstamo ya se había devuelto. Recargue la página.';
  end if;

  insert into public.historial (accion, archivo_id, usuario, correo, antes, despues)
  values ('devuelto', p.archivo_id, auth.uid(), mail,
          jsonb_build_object('prestado_en', p.prestado_en, 'prestado_por', p.prestado_por),
          p.archivo || jsonb_build_object('persona', p.persona));
  return p;
end;
$$;

revoke execute on function public.prestar_archivo(bigint, text, date, text) from public, anon;
revoke execute on function public.devolver_archivo(bigint) from public, anon;
grant execute on function public.prestar_archivo(bigint, text, date, text) to authenticated;
grant execute on function public.devolver_archivo(bigint) to authenticated;

-- ---------- Mantener activo ----------
-- Supabase (plan gratis) pausa el proyecto tras 7 días sin uso. Una tarea de GitHub
-- (.github/workflows/mantener-activo.yml) llama a esta función dos veces por semana.
-- No lee ni cambia ningún dato: solo responde "true".

create or replace function public.mantener_activo()
returns boolean
language sql stable set search_path = ''
as $$ select true $$;

revoke execute on function public.mantener_activo() from public;
grant execute on function public.mantener_activo() to anon, authenticated;
