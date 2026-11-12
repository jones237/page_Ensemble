-- 009_public_catalog.sql — catalogue consultable par les visiteurs non connectés (décision du propriétaire, 2026-11-12).
-- Principe : la table `books` reste fermée aux visiteurs (RLS inchangée). Une fonction SECURITY DEFINER
-- ne renvoie que des champs non sensibles : AUCUN propriétaire, téléphone, email, fichier, ISBN ni identifiant de groupe.
-- Livres numériques exclus (bibliothèque séparée).
create or replace function public.public_catalog(
  p_search    text default null,
  p_categorie text default null,
  p_limit     int  default 24,
  p_offset    int  default 0
) returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  with params as (
    select nullif(left(trim(coalesce(p_search, '')), 100), '') as q,
           nullif(trim(coalesce(p_categorie, '')), '')          as cat
  ), f as (
    select b.id, b.titre, b.auteur, b.categorie, b.condition, b.statut, b.image_url,
           b.prix_location, b.montant_caution, g.nom as groupe_nom, b.created_at
    from public.books b
    left join public.groups g on g.id = b.groupe_id
    cross join params p
    where b.type is distinct from 'numerique'
      and (p.cat is null or b.categorie = p.cat)
      and (p.q is null
           or b.titre  ilike '%' || replace(replace(replace(p.q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
           or b.auteur ilike '%' || replace(replace(replace(p.q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'items', coalesce((
      select jsonb_agg(x) from (
        select * from f order by created_at desc, id
        limit least(greatest(coalesce(p_limit, 24), 1), 48)
        offset greatest(coalesce(p_offset, 0), 0)
      ) x), '[]'::jsonb)
  )
$$;

revoke all on function public.public_catalog(text, text, int, int) from public;
grant execute on function public.public_catalog(text, text, int, int) to anon, authenticated;
