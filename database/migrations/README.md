> **⚠ Lire d'abord `../LIVE_STATE.md` : la base en ligne est déjà au-delà de ces fichiers. Ne lancez PAS 002 à 007 sur le projet Supabase.**

# Migrations — ordre d'exécution (Supabase > SQL Editor)

1. `../schema.sql` — schéma de base (une seule fois, base neuve)
2. `002_digital_library_and_payment_hardening.sql` — bibliothèque numérique + paiements durcis
3. `003_missing_pieces_and_guards.sql` — `create_reservation`, vues `profiles_public`/`groups_public`, garde-fou sur les réservations, prêt gratuit par défaut
4. `004_multi_group.sql` — plusieurs groupes par utilisateur, ajout de livre ouvert à tout membre, correctif `join_group_by_code`
5. `005_sync_live_and_harden.sql` — rattrapage de la base en ligne : RPC manquantes, verrou `role`/`solde`, fermeture des fuites (profiles, groups, anon), `SECURITY DEFINER` durcis, livres à 0 FCFA
6. `006_schedule_deadlines.sql` — tâches planifiées `pg_cron` (rappels, retards, annulation des réservations sans réponse après 48 h)
7. `007_join_code_throttle.sql` — 10 mauvais codes de groupe par heure et par utilisateur, puis blocage (**à appliquer en même temps que le front v12** : un mauvais code ne lève plus d'exception)
8. `008_public_home_stats.sql` — fonction des statistiques de la page d'accueil (**déjà appliquée en ligne**)

Tests automatiques : `database/tests/run_tests.sh` (base PostgreSQL JETABLE uniquement).

Chaque fichier est rejouable. Lancez-les UN PAR UN, dans cet ordre, et vérifiez `Success` avant le suivant.
Testés sur PostgreSQL 16 avec un faux `auth.uid()` ; non testés sur un vrai projet Supabase.
