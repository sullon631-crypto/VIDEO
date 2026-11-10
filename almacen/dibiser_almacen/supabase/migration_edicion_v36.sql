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
