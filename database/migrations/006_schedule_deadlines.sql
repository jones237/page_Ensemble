-- ============================================================
-- Migration 006 — Tâches planifiées (rappels, retards, annulation après 48 h)
-- Idempotente. Sans pg_cron, rien ne tourne : les réservations restent « Réservé » pour toujours
-- et aucun rappel n'est envoyé.
--  * check_reservation_deadlines : toutes les 30 minutes
--  * send_weekly_admin_report    : le lundi à 07:00 UTC
-- Si l'extension n'est pas activable par SQL, l'activer à la main dans
-- Supabase > Database > Extensions > pg_cron, puis relancer ce fichier.
-- ============================================================
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron non activable par SQL (%). Activez-le dans Database > Extensions puis relancez 006.', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('pageensemble-deadlines',   '*/30 * * * *', 'select public.check_reservation_deadlines()');
    perform cron.schedule('pageensemble-weekly-report', '0 7 * * 1',  'select public.send_weekly_admin_report()');
    raise notice 'Tâches planifiées créées ou mises à jour.';
  else
    raise notice 'pg_cron absent : aucune tâche planifiée.';
  end if;
end $$;
