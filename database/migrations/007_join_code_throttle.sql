-- ============================================================
-- Migration 007 — Limite les essais de code de groupe (anti « force brute »)
-- Le code d'accès fait 8 caractères hexadécimaux (~4 milliards de combinaisons) mais
-- join_group_by_code pouvait être appelé sans limite. Désormais : 10 mauvais codes par
-- heure et par utilisateur, puis blocage jusqu'à l'heure suivante.
-- Particularité : un mauvais code ne LÈVE plus d'exception (elle annulerait l'enregistrement
-- de la tentative) ; la fonction renvoie zéro ligne et le front affiche « Code invalide ».
-- Idempotente. À appliquer après 004.
-- ============================================================
create table if not exists join_code_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_join_attempts_user on join_code_attempts(user_id, attempted_at);
alter table join_code_attempts enable row level security;   -- aucune politique : seul le code SECURITY DEFINER y accède
revoke all on join_code_attempts from anon, authenticated;

create or replace function join_group_by_code(p_code text)
returns table(id uuid, nom text, description text, photo_url text, admin_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare g record; v_recent int;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;

  delete from join_code_attempts where attempted_at < now() - interval '1 day';
  select count(*) into v_recent from join_code_attempts
   where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'Trop de tentatives. Réessayez dans une heure.';
  end if;

  select * into g from groups where code_acces = upper(btrim(p_code));
  if g is null then
    insert into join_code_attempts (user_id) values (auth.uid());
    return;                                   -- zéro ligne = « Code invalide » côté application
  end if;

  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = g.id where profiles.id = auth.uid();
  return query select g.id, g.nom, g.description, g.photo_url, g.admin_id, g.created_at;
end; $$;
revoke all on function join_group_by_code(text) from public, anon;
grant execute on function join_group_by_code(text) to authenticated;
