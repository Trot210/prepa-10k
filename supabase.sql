-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
-- La table n'est pas lisible directement : seules deux fonctions y accèdent,
-- et il faut connaître le code secret (32 caractères minimum) pour lire ou écrire.

create table if not exists public.sync_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sync_state enable row level security;   -- aucune policy : accès direct refusé

create or replace function public.sync_get(p_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.sync_state where id = p_id;
$$;

create or replace function public.sync_put(p_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(p_id) < 32 then raise exception 'code trop court'; end if;
  if length(p_data::text) > 200000 then raise exception 'données trop volumineuses'; end if;
  insert into public.sync_state (id, data, updated_at)
  values (p_id, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.sync_get(text) from public;
revoke all on function public.sync_put(text, jsonb) from public;
grant execute on function public.sync_get(text) to anon;
grant execute on function public.sync_put(text, jsonb) to anon;
