-- Migration 008 — statistiques de la page d'accueil (déjà appliquée en ligne le 2026-10-30
-- sous le nom `public_home_stats_for_home_page`). Idempotente.
-- SECURITY DEFINER voulu : ne renvoie que des compteurs et le nom/description des 3 derniers groupes.
create or replace function public.public_home_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'books',              (select count(*) from public.books),
    'groups',             (select count(*) from public.groups),
    'reservations_month', (select count(*) from public.reservations where date_debut >= date_trunc('month', now())),
    'top_groups', coalesce((
      select jsonb_agg(x) from (
        select g.id, g.nom, g.description,
               (select count(*) from public.group_members gm where gm.group_id = g.id) as membres,
               (select count(*) from public.books b where b.groupe_id = g.id)           as livres
        from public.groups g order by g.created_at desc limit 3
      ) x), '[]'::jsonb)
  )
$$;
revoke all on function public.public_home_stats() from public;
grant execute on function public.public_home_stats() to anon, authenticated;
