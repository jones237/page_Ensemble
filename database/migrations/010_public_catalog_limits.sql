-- 010_public_catalog_limits.sql — borne le coût du catalogue public (appelable par les visiteurs anonymes).
-- DÉJÀ APPLIQUÉ EN LIGNE le 2026-11-12 (migrations public_catalog_limits, public_catalog_limits_not_materialized,
-- public_catalog_index_friendly). Ce fichier est l'état final, idempotent, pour garder le dépôt à jour.
--
-- Mesure (100 000 livres simulés, transaction annulée), appel anonyme :
--   avant : liste 214 ms · recherche 516 ms · 1 lettre 488 ms · décalage 90000 405 ms · (aucune limite de total)
--   après : liste 3 ms · recherche fréquente 5 ms · rare 21 ms · sans résultat 5 ms · 2 lettres 1 ms · décalage 3 ms
-- Contrat inchangé : mêmes paramètres, même JSON { total, items[11 clés] } que 009.
-- Bornes : recherche >= 3 caractères (sinon ignorée), 100 max · total plafonné à 1000 · décalage <= 1000 · page <= 48.
-- Limite connue : pas de limitation par IP possible en SQL (voir SECURITY_CHECKLIST.md).

create extension if not exists pg_trgm with schema extensions;
create index if not exists idx_books_titre_trgm  on public.books using gin (titre  extensions.gin_trgm_ops);
create index if not exists idx_books_auteur_trgm on public.books using gin (auteur extensions.gin_trgm_ops);
create index if not exists idx_books_created_id  on public.books (created_at desc, id);

-- Deux branches (sans recherche / avec recherche) : le motif n'est pas noyé dans un « OU ... IS NULL »,
-- ce qui permet d'utiliser les index de trigrammes.
create or replace function public.public_catalog(
  p_search    text default null,
  p_categorie text default null,
  p_limit     int  default 24,
  p_offset    int  default 0
) returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_q     text := case when char_length(trim(coalesce(p_search, ''))) >= 3 then left(trim(p_search), 100) end;
  v_cat   text := nullif(left(trim(coalesce(p_categorie, '')), 60), '');
  v_lim   int  := least(greatest(coalesce(p_limit, 24), 1), 48);
  v_off   int  := least(greatest(coalesce(p_offset, 0), 0), 1000);
  v_pat   text;
  v_total int;
  v_items jsonb;
begin
  if v_q is null then
    select count(*) into v_total from (
      select 1 from public.books b
      where b.type is distinct from 'numerique' and (v_cat is null or b.categorie = v_cat)
      limit 1000) c;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_items from (
      select b.id, b.titre, b.auteur, b.categorie, b.condition, b.statut, b.image_url,
             b.prix_location, b.montant_caution, g.nom as groupe_nom, b.created_at
      from public.books b left join public.groups g on g.id = b.groupe_id
      where b.type is distinct from 'numerique' and (v_cat is null or b.categorie = v_cat)
      order by b.created_at desc, b.id limit v_lim offset v_off) x;
  else
    v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    select count(*) into v_total from (
      select 1 from public.books b
      where b.type is distinct from 'numerique' and (v_cat is null or b.categorie = v_cat)
        and (b.titre ilike v_pat or b.auteur ilike v_pat)
      limit 1000) c;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_items from (
      select b.id, b.titre, b.auteur, b.categorie, b.condition, b.statut, b.image_url,
             b.prix_location, b.montant_caution, g.nom as groupe_nom, b.created_at
      from public.books b left join public.groups g on g.id = b.groupe_id
      where b.type is distinct from 'numerique' and (v_cat is null or b.categorie = v_cat)
        and (b.titre ilike v_pat or b.auteur ilike v_pat)
      order by b.created_at desc, b.id limit v_lim offset v_off) x;
  end if;
  return jsonb_build_object('total', v_total, 'items', v_items);
end;
$$;
revoke all on function public.public_catalog(text, text, int, int) from public;
grant execute on function public.public_catalog(text, text, int, int) to anon, authenticated;
