-- DIBISER | Ejecute en Supabase SQL Editor una sola vez.
-- Antes de invitar personal, desactive los registros públicos de Auth
-- y cree solamente usuarios autorizados.
create sequence if not exists public.dibiser_guide_seq as bigint start with 1;
create table if not exists public.dibiser_movements (
 id text primary key,
 guia text not null unique,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.dibiser_catalog_items (
 kind text not null,
 value text not null,
 primary key(kind,value)
);
alter table public.dibiser_movements enable row level security;
alter table public.dibiser_catalog_items enable row level security;
revoke all on public.dibiser_movements from anon;
revoke all on public.dibiser_catalog_items from anon;
grant select,insert on public.dibiser_movements to authenticated;
grant select,insert on public.dibiser_catalog_items to authenticated;
drop policy if exists dibiser_movements_team_read on public.dibiser_movements;
drop policy if exists dibiser_movements_team_insert on public.dibiser_movements;
drop policy if exists dibiser_catalog_team_read on public.dibiser_catalog_items;
drop policy if exists dibiser_catalog_team_insert on public.dibiser_catalog_items;
create policy dibiser_movements_team_read on public.dibiser_movements for select to authenticated using (auth.uid() is not null);
create policy dibiser_movements_team_insert on public.dibiser_movements for insert to authenticated with check (auth.uid() is not null);
create policy dibiser_catalog_team_read on public.dibiser_catalog_items for select to authenticated using (auth.uid() is not null);
create policy dibiser_catalog_team_insert on public.dibiser_catalog_items for insert to authenticated with check (auth.uid() is not null);

-- Cada inserción usa una secuencia central; incluso si dos celulares guardan a la vez.
create or replace function public.dibiser_save_movement(p_record jsonb, p_manual_guia text default null, p_import boolean default false)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare rid text; code text; result jsonb; oldcode text;
begin
 if auth.uid() is null then raise exception 'Inicia sesión para guardar movimientos'; end if;
 rid := nullif(trim(p_record->>'id'),'');
 if rid is null or nullif(trim(p_record->>'iso'),'') is null then raise exception 'Movimiento sin código o fecha'; end if;
 select payload into result from public.dibiser_movements where id=rid;
 if found then return result; end if;
 code := nullif(btrim(p_manual_guia),'');
 if p_import and code is null then code := nullif(btrim(p_record->>'guia'),'');
 oldcode := code;
 if code is not null and exists(select 1 from public.dibiser_movements where guia=code) then
   if p_import then code:=null; else raise exception 'Ese número de guía ya está registrado'; end if;
 end if;
 if code is null then
   loop
     code := 'DIB-INT-' || lpad(nextval('public.dibiser_guide_seq')::text,6,'0');
     exit when not exists(select 1 from public.dibiser_movements where guia=code);
   end loop;
 end if;
 result := p_record || jsonb_build_object('guia',code);
 if p_import and oldcode is not null and oldcode<>code then result:=result || jsonb_build_object('guiaOriginal',oldcode); end if;
 insert into public.dibiser_movements(id,guia,payload) values(rid,code,result);
 return result;
end $$;
create or replace function public.dibiser_preview_guide()
returns text language plpgsql security definer set search_path=public
as $$
declare n bigint;
begin
 if auth.uid() is null then raise exception 'Inicio de sesión requerido'; end if;
 select case when is_called then last_value+1 else last_value end into n from public.dibiser_guide_seq;
 return 'DIB-INT-' || lpad(n::text,6,'0');
end $$;
revoke all on function public.dibiser_save_movement(jsonb,text,boolean) from public,anon;
revoke all on function public.dibiser_preview_guide() from public,anon;
grant execute on function public.dibiser_save_movement(jsonb,text,boolean) to authenticated;
grant execute on function public.dibiser_preview_guide() to authenticated;

-- Edición auditada, solo para usuarios autorizados; no modifica fecha, código ni guía.
create table if not exists public.dibiser_movement_edits(
 id bigint generated always as identity primary key,
 movement_id text not null,
 edited_at timestamptz not null default now(),
 edited_by uuid not null,
 old_payload jsonb not null,
 new_payload jsonb not null
);
alter table public.dibiser_movement_edits enable row level security;
revoke all on public.dibiser_movement_edits from anon;
grant select on public.dibiser_movement_edits to authenticated;
drop policy if exists dibiser_edits_team_read on public.dibiser_movement_edits;
create policy dibiser_edits_team_read on public.dibiser_movement_edits for select to authenticated using (auth.uid() is not null);
create or replace function public.dibiser_update_movement(p_id text,p_record jsonb,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare original jsonb; result jsonb; old_version integer;
begin
 if auth.uid() is null then raise exception 'Inicio de sesión requerido'; end if;
 select payload into original from public.dibiser_movements where id=p_id for update;
 if not found then raise exception 'Movimiento no encontrado'; end if;
 old_version:=coalesce((original->>'editVersion')::integer,0);
 if old_version<>p_expected_version then raise exception 'Otro usuario modificó este movimiento. Actualiza el historial antes de editarlo.'; end if;
 result := p_record || jsonb_build_object(
  'id',original->>'id',
  'iso',original->>'iso',
  'guia',original->>'guia',
  'editVersion',old_version+1,
  'editedAt',now(),
  'editedBy',auth.uid()
 );
 update public.dibiser_movements set payload=result,updated_at=now() where id=p_id;
 insert into public.dibiser_movement_edits(movement_id,edited_by,old_payload,new_payload)
 values(p_id,auth.uid(),original,result);
 return result;
end $$;
revoke all on function public.dibiser_update_movement(text,jsonb,integer) from public,anon;
grant execute on function public.dibiser_update_movement(text,jsonb,integer) to authenticated;
