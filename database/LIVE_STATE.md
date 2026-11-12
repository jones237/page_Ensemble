# État de la base EN LIGNE (projet Supabase `kbdrxgnxejnjefoswgju`)

**La vraie source de vérité est la table `supabase_migrations.schema_migrations` du projet**, pas ce dépôt.
Au 2026-10-30, 15 migrations y sont appliquées :

| Version | Nom |
|---|---|
| 20261013030920 | 01_schema_initial |
| 20261013030942 | 02_rls_policies |
| 20261016220544 | 03_business_functions |
| 20261018010759 | 04_storage_buckets |
| 20261018010831 | 05_check_deadlines_function |
| 20261023050210 | security_hardening_pageensemble |
| 20261023185334 | server_side_guards_reservations_payments_groups |
| 20261023185356 | fix_reservations_guard_null_amounts |
| 20261023190122 | hardening_round2_policies_indexes_integrity |
| 20261023190130 | hardening_round2_storage_policies |
| 20261023191538 | align_01_multigroup_core |
| 20261023191629 | align_02_business_functions |
| 20261024030805 | align_03_policies_views_guards |
| 20261024032513 | redteam_hardening_urls_limits_throttles_codes |
| 20261030003644 | public_home_stats_for_home_page |

## Conséquences pour ce dépôt
- `migrations/002` à `007` ont été écrites avant ces migrations : **leurs objectifs sont déjà atteints en ligne. NE PAS LES LANCER sur le projet Supabase** (elles écraseraient des fonctions durcies). Elles restent utiles pour reconstruire une base de TEST (`tests/run_tests.sh`).
- `migrations/008` est déjà appliquée en ligne.
- Pour récupérer le SQL exact des migrations en ligne : `supabase db pull` (CLI Supabase, projet lié), ou dans l'éditeur SQL :
  `select version, name, array_to_string(statements, E'\n;\n') from supabase_migrations.schema_migrations order by version;`
- Toute nouvelle modification de la base : `apply_migration` (ou `supabase migration new`), puis noter la ligne dans `JOURNAL_TRAVAUX.md`.

## Ajout 2026-11-12 — `public_catalog_for_visitors` (fichier `migrations/009_public_catalog.sql`, DÉJÀ APPLIQUÉE en ligne)
Fonction `public.public_catalog(p_search, p_categorie, p_limit, p_offset)` SECURITY DEFINER, EXECUTE pour `anon` et `authenticated`. Renvoie `{total, items[]}` avec seulement : id, titre, auteur, catégorie, condition, statut, image, prix, caution, nom du groupe. Jamais de propriétaire, téléphone, email, fichier, ISBN ni id de groupe. Livres numériques exclus, 48 résultats max par appel, recherche avec jokers échappés. La table `books` reste fermée aux visiteurs (test : `permission denied` pour anon). Alerte « SECURITY DEFINER exécutable par anon » du conseiller : voulue, comme `public_home_stats`.

## Ajout 2026-11-12 — catalogue public borné (IA: Claude)
Migrations appliquées en ligne : `public_catalog_limits`, `public_catalog_limits_not_materialized`, `public_catalog_index_friendly`
(fichier du dépôt : `migrations/010_public_catalog_limits.sql`). Extension `pg_trgm` (schéma `extensions`), index `idx_books_titre_trgm`,
`idx_books_auteur_trgm`, `idx_books_created_id`. `public_catalog` est maintenant en plpgsql ; recherche >= 3 caractères.
