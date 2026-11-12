-- ============================================================
-- Migration 005 — Rattrapage de la base en ligne + durcissement SECURITY DEFINER
-- À appliquer APRÈS 002, 003 et 004. Idempotente.
--
-- Constat sur la base réelle (2026-10-23) : aucune RPC métier, pas de verrou sur
-- profiles.role/solde, profiles et groups lisibles par tout le monde (code d'accès
-- inclus), 7 fonctions SECURITY DEFINER appelables par anon, vues en SECURITY DEFINER.
-- ============================================================

-- 1) Fonctions manquantes (copiées de schema.sql, avec search_path fixé) ----------
create or replace function respond_to_reservation(
  p_reservation_id uuid, p_accept boolean, p_raison_refus text default null
)
returns reservations language plpgsql security definer set search_path = public as $$
declare r reservations; b record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into r from reservations where id = p_reservation_id;
  if r is null then raise exception 'Réservation introuvable'; end if;
  select * into b from books where id = r.book_id;
  if b.proprietaire_id <> auth.uid() then raise exception 'Non autorisé'; end if;
  if r.statut <> 'Réservé' then raise exception 'Déjà traitée'; end if;

  if p_accept then
    update reservations set statut = 'Actif', date_debut = now(),
      date_fin_prevue = now() + (coalesce(r.duree_pret_jours,14) || ' days')::interval
    where id = p_reservation_id returning * into r;
    insert into notifications (user_id, type, titre, message, lien_id)
    values (r.emprunteur_id, 'reservation_acceptee', 'Réservation acceptée',
            'Votre réservation pour "' || b.titre || '" a été acceptée !', r.id::text);
  else
    update reservations set statut = 'Annulé', notes = coalesce(p_raison_refus, notes)
    where id = p_reservation_id returning * into r;
    update books set statut = 'Disponible' where id = r.book_id;
    insert into notifications (user_id, type, titre, message, lien_id)
    values (r.emprunteur_id, 'reservation_refusee', 'Réservation refusée',
            'Votre réservation pour "' || b.titre || '" a été refusée.', r.id::text);
  end if;
  return r;
end;
$$;

create or replace function mark_book_returned(
  p_reservation_id uuid, p_etat text,
  p_photo_url text default null, p_notes text default null
)
returns reservations language plpgsql security definer set search_path = public as $$
declare r reservations; b record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into r from reservations where id = p_reservation_id;
  if r is null then raise exception 'Réservation introuvable'; end if;
  select * into b from books where id = r.book_id;
  if b.proprietaire_id <> auth.uid() then raise exception 'Non autorisé'; end if;

  update reservations set statut = 'Retourné', date_retour_reel = now(),
    etat_retour = p_etat, photo_retour_url = p_photo_url,
    notes = coalesce(p_notes, notes),
    confirme_par_emprunteur = null, date_confirmation_emprunteur = null
  where id = p_reservation_id returning * into r;
  update books set statut = 'Disponible' where id = r.book_id;

  insert into notifications (user_id, type, titre, message, lien_id)
  values (r.emprunteur_id, 'retour_a_confirmer', 'Confirmez le retour du livre',
          'Le propriétaire de "' || b.titre || '" a déclaré la réception (état : ' || p_etat || '). Merci de confirmer.',
          r.id::text);
  return r;
end;
$$;

create or replace function confirm_book_return(
  p_reservation_id uuid, p_confirme boolean, p_commentaire text default null
)
returns reservations language plpgsql security definer set search_path = public as $$
declare r reservations; b record; g record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into r from reservations where id = p_reservation_id;
  if r is null then raise exception 'Réservation introuvable'; end if;
  if r.emprunteur_id <> auth.uid() then raise exception 'Non autorisé'; end if;
  if r.statut <> 'Retourné' then raise exception 'Pas encore marqué comme retourné'; end if;

  update reservations set confirme_par_emprunteur = p_confirme,
    date_confirmation_emprunteur = now(),
    notes = case when p_commentaire is not null
      then coalesce(notes,'') || E'\n[Emprunteur] ' || p_commentaire else notes end
  where id = p_reservation_id returning * into r;

  select * into b from books where id = r.book_id;
  select * into g from groups where id = b.groupe_id;

  if p_confirme then
    insert into notifications (user_id, type, titre, message, lien_id)
    values (b.proprietaire_id, 'retour_confirme', 'Retour confirmé',
            'L''emprunteur a confirmé l''état de retour de "' || b.titre || '".', r.id::text);
  else
    insert into notifications (user_id, type, titre, message, lien_id)
    select uid, 'litige_retour', 'Litige sur un retour',
           'L''emprunteur conteste l''état déclaré pour "' || b.titre || '".', r.id::text
    from unnest(array[b.proprietaire_id, g.admin_id]) as uid;
  end if;
  return r;
end;
$$;

create or replace function reject_join_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare req record; g record;
begin
  select * into req from group_join_requests where id = request_id;
  if req is null then raise exception 'Demande introuvable'; end if;
  select * into g from groups where id = req.group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if req.statut <> 'en_attente' then raise exception 'Déjà traitée'; end if;
  update group_join_requests set statut='refuse', decided_at=now(), decided_by=auth.uid() where id=request_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (req.user_id, 'demande_groupe_refusee', 'Demande refusée',
          'Votre demande pour rejoindre "' || g.nom || '" a été refusée.', g.id::text);
end;
$$;

create or replace function admin_adjust_balance(
  target_user_id uuid, delta integer, reason text default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare new_solde integer;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'administrateur') then
    raise exception 'Non autorisé';
  end if;
  if delta = 0 then raise exception 'Montant ne peut pas être nul'; end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set solde = greatest(0, coalesce(solde,0) + delta)
  where id = target_user_id returning solde into new_solde;
  if new_solde is null then raise exception 'Utilisateur introuvable'; end if;
  insert into balance_transactions (user_id, amount, reason, created_by)
  values (target_user_id, delta, reason, auth.uid());
  return new_solde;
end;
$$;

create or replace function admin_set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'administrateur') then
    raise exception 'Non autorisé';
  end if;
  if new_role not in ('administrateur','proprietaire','membre') then
    raise exception 'Rôle invalide';
  end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set role = new_role where id = target_user_id;
end;
$$;

create or replace function resolve_dispute(
  p_reservation_id uuid, p_notes text, p_rembourser_caution boolean default false
)
returns reservations language plpgsql security definer set search_path = public as $$
declare r reservations; b record; g record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into r from reservations where id = p_reservation_id;
  if r is null then raise exception 'Réservation introuvable'; end if;
  if r.confirme_par_emprunteur is distinct from false then raise exception 'Pas de litige'; end if;
  select * into b from books where id = r.book_id;
  select * into g from groups where id = b.groupe_id;
  if auth.uid() <> b.proprietaire_id and auth.uid() <> g.admin_id then raise exception 'Non autorisé'; end if;
  update reservations set litige_resolu = true, litige_resolution_notes = p_notes,
    caution_remboursee = p_rembourser_caution where id = p_reservation_id returning * into r;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (r.emprunteur_id, 'litige_resolu', 'Litige résolu',
          'Le litige concernant "' || b.titre || '" a été résolu.' ||
          case when p_rembourser_caution then ' Votre caution vous sera remboursée.' else '' end,
          r.id::text);
  return r;
end;
$$;

create or replace function get_reservation_contact_phone(p_reservation_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r record; b record; result text;
begin
  select * into r from reservations where id = p_reservation_id;
  if r is null then raise exception 'Réservation introuvable'; end if;
  if r.statut not in ('Réservé','Actif') then raise exception 'Réservation non active'; end if;
  select * into b from books where id = r.book_id;
  if auth.uid() = r.emprunteur_id then
    select phone into result from profiles where id = b.proprietaire_id;
  elsif auth.uid() = b.proprietaire_id then
    select phone into result from profiles where id = r.emprunteur_id;
  else raise exception 'Non autorisé'; end if;
  return result;
end;
$$;

create or replace function notify_payment_initiated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_payer_nom  text;
  v_type_label text;
begin
  if new.status = 'initiated' and (old.status is null or old.status = 'pending') then
    select nom_complet into v_payer_nom from profiles where id = new.payer_id;
    v_type_label := case new.type when 'caution' then 'caution' else 'frais de location' end;
    insert into notifications (user_id, type, titre, message, lien_id)
    values (new.receiver_id, 'paiement_initie', 'Paiement en attente',
            v_payer_nom || ' a initié le paiement de ' || new.amount ||
            ' FCFA (' || v_type_label || '). Confirmez la réception.',
            new.reservation_id::text);
  end if;
  return new;
end;
$$;

create or replace function enforce_profile_immutable_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.bypass_role_lock', true) is distinct from 'true' then
    new.role      := old.role;
    new.groupe_id := old.groupe_id;
    new.solde     := old.solde;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 2) Triggers manquants ------------------------------------------------------------
drop trigger if exists trg_notify_payment on payments;
create trigger trg_notify_payment
  after insert or update of status on payments
  for each row execute function notify_payment_initiated();

drop trigger if exists trg_profiles_lock_fields on profiles;
create trigger trg_profiles_lock_fields
  before update on profiles
  for each row execute function enforce_profile_immutable_fields();

-- 3) Politiques RLS : alignement sur schema.sql + fermeture des fuites -------------
-- profiles : plus de lecture publique (téléphone, solde). L'app lit profiles_public.
drop policy if exists "profiles_select_public" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- groups : seul l'admin lit la table (code_acces). Les autres passent par groups_public.
drop policy if exists "groups_select_all" on groups;
drop policy if exists "groups_select_own_admin" on groups;
create policy "groups_select_own_admin" on groups for select using (auth.uid() = admin_id);
drop policy if exists "groups_insert_auth" on groups;
create policy "groups_insert_auth" on groups for insert
  with check (auth.uid() is not null and auth.uid() = admin_id);

-- reservations : création uniquement via create_reservation()
drop policy if exists "res_insert_own" on reservations;

-- book_access : retirer les anciennes politiques trop permissives (002/004 posent les bonnes)
drop policy if exists "access_insert" on book_access;
drop policy if exists "access_select" on book_access;
drop policy if exists "access_update" on book_access;

-- 4) Vues : celles qui s'appuient sur la RLS deviennent security_invoker ------------
-- groups_public et profiles_public restent DEFINER volontairement : elles exposent un
-- sous-ensemble de colonnes sûr (sans code_acces, téléphone, solde) que la RLS de la
-- table sous-jacente ne permettrait pas de lire.
alter view reservations_stats set (security_invoker = true);
create or replace view digital_books with (security_invoker = true) as
  select b.id, b.titre, b.auteur, b.resume, b.image_url, b.proprietaire_id, b.groupe_id, b.categorie,
         b.condition, b.statut, b.prix_location, b.nombre_pages, b.edition, b.isbn, b.montant_caution,
         b.duree_pret_jours, b.type, b.fichier_url, b.prix_lecture, b.source, b.created_at, b.updated_at,
         p.nom_complet as proprietaire_nom
  from books b join profiles p on p.id = b.proprietaire_id
  where b.type = 'numerique';
-- (profiles n'est lisible que par son propriétaire : proprietaire_nom n'apparaît donc que pour soi-même ;
--  la page bibliothèque numérique doit lire le nom via profiles_public si elle en a besoin.)

-- 4bis) Statistiques de la page d'accueil pour un visiteur non connecté ----------------
-- SECURITY DEFINER volontaire : ne renvoie que des COMPTEURS et le nom/description des
-- 3 derniers groupes (déjà publics via groups_public). Aucune donnée personnelle.
create or replace function public_home_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'books',              (select count(*) from books),
    'groups',             (select count(*) from groups),
    'reservations_month', (select count(*) from reservations where date_debut >= date_trunc('month', now())),
    'top_groups', coalesce((
      select jsonb_agg(x) from (
        select g.id, g.nom, g.description,
               (select count(*) from group_members gm where gm.group_id = g.id) as membres,
               (select count(*) from books b where b.groupe_id = g.id)           as livres
        from groups g order by g.created_at desc limit 3
      ) x), '[]'::jsonb)
  )
$$;

-- 5) Fonctions : search_path partout, EXECUTE réservé à ce qui doit être appelé ------
do $$
declare f record;
begin
  for f in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proconfig is null
  loop
    execute format('alter function public.%I(%s) set search_path = public', f.proname, f.args);
  end loop;

  for f in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke all on function public.%I(%s) from public, anon', f.proname, f.args);
    if f.proname = any (array[
      'create_reservation','switch_active_group','join_group_by_code','leave_group',
      'approve_join_request','reject_join_request','transfer_group_admin','delete_group',
      'admin_adjust_balance','admin_set_user_role','admin_remove_member','resolve_dispute',
      'get_reservation_contact_phone','deactivate_own_account','respond_to_reservation',
      'mark_book_returned','confirm_book_return','my_group_ids','is_group_member'
    ]) then
      execute format('grant execute on function public.%I(%s) to authenticated', f.proname, f.args);
    else
      -- fonctions de trigger / cron : ni anon ni authenticated
      execute format('revoke all on function public.%I(%s) from authenticated', f.proname, f.args);
    end if;
  end loop;
end $$;

-- 6) Un visiteur non connecté ne lit aucune table (sauf la vue publique des groupes) --
grant execute on function public_home_stats() to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on groups_public to anon;

-- 7) Prêt gratuit : les livres déjà saisis passent à 0 ------------------------------
update books set prix_location = 0 where prix_location <> 0;
