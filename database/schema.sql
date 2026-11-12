-- ============================================================
-- PageEnsemble — Schéma SQL complet
-- Compatible PostgreSQL 15+ (Supabase, Neon, Railway, PlanetScale PG)
--
-- INSTRUCTIONS DE MIGRATION VERS NEON :
-- 1. Créer un projet sur neon.tech
-- 2. Aller dans SQL Editor
-- 3. Coller et exécuter ce fichier entier
-- 4. NOTE IMPORTANTE : auth.uid() est une fonction Supabase Auth.
--    Sur Neon avec autre auth, remplacer par :
--    current_setting('app.current_user_id', true)::uuid
--    et définir ce setting dans chaque requête depuis votre backend.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- FONCTION UTILITAIRE : updated_at automatique
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLE : profiles
-- ============================================================
create table if not exists profiles (
  id                    uuid primary key,  -- = auth.users.id
  nom_complet           text not null,
  phone                 text,
  role                  text not null default 'membre',
  groupe_id             uuid,
  avatar_url            text,
  bio                   text,
  solde                 integer not null default 0,
  notifications_actives boolean not null default true,
  compte_actif          boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint profiles_role_check
    check (role = any(array['administrateur','proprietaire','membre'])),
  constraint profiles_nom_check
    check (char_length(nom_complet) between 2 and 80),
  constraint profiles_phone_check
    check (phone is null or char_length(phone) between 7 and 20)
);

alter table profiles enable row level security;

-- ============================================================
-- TABLE : groups
-- ============================================================
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  admin_id    uuid not null references profiles(id) on delete restrict,
  photo_url   text,
  code_acces  text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint groups_nom_check
    check (char_length(nom) between 3 and 80),
  constraint groups_desc_check
    check (description is null or char_length(description) <= 500)
);

alter table groups enable row level security;

-- FK profiles → groups (après création des deux tables)
alter table profiles
  add constraint profiles_groupe_fkey
  foreign key (groupe_id) references groups(id) on delete set null;

-- ============================================================
-- TABLE : group_settings
-- ============================================================
create table if not exists group_settings (
  id                     uuid primary key default gen_random_uuid(),
  groupe_id              uuid not null unique references groups(id) on delete cascade,
  prix_location_defaut   integer not null default 500,
  montant_caution_defaut integer not null default 2000,
  duree_emprunt_jours    integer not null default 14,
  updated_by             uuid references profiles(id),
  updated_at             timestamptz not null default now()
);

alter table group_settings enable row level security;

-- ============================================================
-- TABLE : group_join_requests
-- ============================================================
create table if not exists group_join_requests (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  statut      text not null default 'en_attente',
  message     text,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references profiles(id),

  constraint group_join_requests_statut_check
    check (statut = any(array['en_attente','approuve','refuse'])),
  unique(group_id, user_id)
);

alter table group_join_requests enable row level security;

-- ============================================================
-- TABLE : books
-- ============================================================
create table if not exists books (
  id               uuid primary key default gen_random_uuid(),
  titre            text not null,
  auteur           text not null,
  resume           text,
  image_url        text,
  proprietaire_id  uuid not null references profiles(id) on delete restrict,
  groupe_id        uuid not null references groups(id) on delete cascade,
  categorie        text not null default 'Autre',
  condition        text not null default 'Bon',
  statut           text not null default 'Disponible',
  prix_location    integer not null default 500,
  nombre_pages     integer,
  edition          text,
  isbn             text,
  montant_caution  integer,
  duree_pret_jours integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint books_titre_check
    check (char_length(titre) between 1 and 200),
  constraint books_auteur_check
    check (char_length(auteur) between 1 and 100),
  constraint books_resume_check
    check (resume is null or char_length(resume) <= 2000),
  constraint books_pages_check
    check (nombre_pages is null or (nombre_pages >= 1 and nombre_pages <= 10000)),
  constraint books_prix_check
    check (prix_location >= 0 and prix_location <= 100000),
  constraint books_statut_check
    check (statut = any(array['Disponible','Reservé','Emprunté'])),
  constraint books_condition_check
    check (condition = any(array['Excellent','Bon','Acceptable'])),
  constraint books_categorie_check
    check (categorie = any(array[
      'Fiction','Non-fiction','Scolaire','Jeunesse','Biographie',
      'Histoire','Science','Développement personnel','Santé & Bien-être',
      'Poésie & Littérature','Bible & Études bibliques','Théologie & Doctrine',
      'Devotionnel & Prières','Évangélisation & Mission','Famille chrétienne',
      'Témoignages chrétiens','Leadership chrétien','Prophétie & Eschatologie',
      'Vie spirituelle','Chants & Louanges','Autre'
    ]))
);

alter table books enable row level security;

create trigger trg_books_updated_at
  before update on books
  for each row execute function set_updated_at();

-- ============================================================
-- TABLE : reservations
-- ============================================================
create table if not exists reservations (
  id                           uuid primary key default gen_random_uuid(),
  book_id                      uuid not null references books(id) on delete restrict,
  emprunteur_id                uuid not null references profiles(id) on delete restrict,
  date_debut                   timestamptz not null default now(),
  date_fin_prevue              timestamptz not null,
  date_retour_reel             timestamptz,
  statut                       text not null default 'Réservé',
  caution_payee                boolean not null default false,
  caution_remboursee           boolean not null default false,
  montant_caution              integer not null default 2000,
  montant_location             integer,
  duree_pret_jours             integer,
  notes                        text,
  photo_retour_url             text,
  etat_retour                  text,
  confirme_par_emprunteur      boolean,
  date_confirmation_emprunteur timestamptz,
  litige_resolu                boolean,
  litige_resolution_notes      text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  constraint reservations_statut_check
    check (statut = any(array['Réservé','Actif','Retourné','Annulé','En retard'])),
  constraint reservations_etat_retour_check
    check (etat_retour is null or etat_retour = any(array[
      'Bon état','Légèrement endommagé','Endommagé','Perdu'
    ])),
  constraint res_dates_check
    check (date_fin_prevue > date_debut),
  constraint res_caution_check
    check (montant_caution >= 0 and montant_caution <= 500000),
  constraint res_location_check
    check (montant_location is null or (montant_location >= 0 and montant_location <= 100000))
);

alter table reservations enable row level security;

create trigger trg_reservations_updated_at
  before update on reservations
  for each row execute function set_updated_at();

-- ============================================================
-- TABLE : reservation_history
-- ============================================================
create table if not exists reservation_history (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  action         text not null,
  date           timestamptz not null default now(),
  notes          text,
  created_by     uuid references profiles(id)
);

alter table reservation_history enable row level security;

-- ============================================================
-- TABLE : payments
-- ============================================================
create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  payer_id       uuid not null references profiles(id) on delete cascade,
  receiver_id    uuid not null references profiles(id) on delete cascade,
  type           text not null,
  method         text not null,
  amount         integer not null,
  status         text not null default 'pending',
  phone_number   text,
  reference      text,
  confirmed_by   uuid references profiles(id),
  confirmed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint payments_type_check
    check (type = any(array['caution','location'])),
  constraint payments_method_check
    check (method = any(array['mtn','orange','cash'])),
  constraint payments_status_check
    check (status = any(array['pending','initiated','confirmed','failed','refunded'])),
  constraint payments_amount_check
    check (amount > 0)
);

alter table payments enable row level security;

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ============================================================
-- TABLE : notifications
-- ============================================================
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  titre      text,
  message    text not null,
  lien_id    text,
  lu         boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- ============================================================
-- TABLE : messages
-- ============================================================
create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  sender_id      uuid not null references profiles(id) on delete cascade,
  recipient_id   uuid not null references profiles(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  contenu        text not null,
  lu             boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table messages enable row level security;

-- ============================================================
-- TABLE : reviews
-- ============================================================
create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  reviewer_id    uuid not null references profiles(id) on delete cascade,
  rating         integer not null,
  contenu        text,
  created_at     timestamptz not null default now(),

  constraint reviews_rating_check  check (rating >= 1 and rating <= 5),
  constraint reviews_contenu_check check (contenu is null or char_length(contenu) <= 1000),
  unique(book_id, reviewer_id, reservation_id)
);

alter table reviews enable row level security;

-- ============================================================
-- TABLE : balance_transactions
-- ============================================================
create table if not exists balance_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  amount     integer not null,
  reason     text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table balance_transactions enable row level security;

-- ============================================================
-- INDEX
-- ============================================================
create index if not exists idx_books_groupe       on books(groupe_id);
create index if not exists idx_books_proprietaire  on books(proprietaire_id);
create index if not exists idx_books_statut        on books(statut);
create index if not exists idx_res_emprunteur      on reservations(emprunteur_id);
create index if not exists idx_res_book            on reservations(book_id);
create index if not exists idx_res_statut          on reservations(statut);
create index if not exists idx_notifs_user         on notifications(user_id, lu);
create index if not exists idx_messages_recipient  on messages(recipient_id);
create index if not exists idx_payments_res        on payments(reservation_id);
create index if not exists idx_payments_payer      on payments(payer_id);
create index if not exists idx_payments_status     on payments(status);
create index if not exists idx_history_res         on reservation_history(reservation_id);
create index if not exists idx_gjr_group           on group_join_requests(group_id, statut);

-- ============================================================
-- VUE : reservations_stats
-- ============================================================
create or replace view reservations_stats as
select
  emprunteur_id,
  count(*) filter (where statut in ('Réservé','Actif'))  as active_count,
  count(*) filter (where statut = 'Retourné')            as returned_count,
  count(*) filter (where statut = 'Annulé')              as cancelled_count,
  2 - count(*) filter (where statut in ('Réservé','Actif')) as slots_remaining
from reservations
group by emprunteur_id;

-- ============================================================
-- FONCTIONS MÉTIER
-- ============================================================

-- [Supabase uniquement] Créer un profil à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nom_complet, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom_complet', split_part(new.email,'@',1)),
    'membre'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- [Supabase uniquement] Trigger sur auth.users
-- Sur Neon : créer le profil depuis votre backend après inscription
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Synchroniser statut livre ↔ réservation
create or replace function sync_book_status()
returns trigger language plpgsql security definer as $$
begin
  case new.statut
    when 'Actif'    then update books set statut = 'Emprunté'   where id = new.book_id;
    when 'Réservé'  then update books set statut = 'Reservé'    where id = new.book_id;
    when 'Retourné' then update books set statut = 'Disponible' where id = new.book_id;
    when 'Annulé'   then update books set statut = 'Disponible' where id = new.book_id;
    else null;
  end case;
  return new;
end;
$$;

create trigger trg_sync_book_status
  after insert or update of statut on reservations
  for each row execute function sync_book_status();

-- Limite : max 2 réservations actives par emprunteur
create or replace function check_max_active_reservations()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_active integer; v_owner uuid;
begin
  select proprietaire_id into v_owner from books where id = new.book_id;
  if v_owner = new.emprunteur_id then
    raise exception 'SELF_RESERVE: Vous ne pouvez pas réserver votre propre livre.' using errcode = 'P0001';
  end if;
  select count(*) into v_active from reservations
  where emprunteur_id = new.emprunteur_id and statut in ('Réservé','Actif')
    and id != coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid);
  if v_active >= 2 then
    raise exception 'LIMIT_REACHED: Vous avez déjà % livre(s) en cours.', v_active using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_check_max_reservations
  before insert on reservations
  for each row execute function check_max_active_reservations();

-- Notifier le propriétaire lors d'une nouvelle réservation
create or replace function notify_owner_on_reservation()
returns trigger language plpgsql security definer as $$
declare
  v_proprietaire_id uuid;
  v_emprunteur_nom  text;
  v_livre_titre     text;
begin
  select b.proprietaire_id, b.titre into v_proprietaire_id, v_livre_titre
  from books b where b.id = new.book_id;
  select nom_complet into v_emprunteur_nom from profiles where id = new.emprunteur_id;

  insert into notifications (user_id, type, titre, message, lien_id)
  values (v_proprietaire_id, 'nouvelle_reservation', 'Nouvelle réservation',
          v_emprunteur_nom || ' souhaite emprunter "' || v_livre_titre || '"',
          new.id::text);
  return new;
end;
$$;

create trigger trg_notify_owner
  after insert on reservations
  for each row execute function notify_owner_on_reservation();

-- Notifier lors d'un paiement initié
create or replace function notify_payment_initiated()
returns trigger language plpgsql security definer as $$
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

create trigger trg_notify_payment
  after insert or update of status on payments
  for each row execute function notify_payment_initiated();

-- Champs immuables du profil (role, groupe_id, solde)
create or replace function enforce_profile_immutable_fields()
returns trigger language plpgsql security definer as $$
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

create trigger trg_profiles_lock_fields
  before update on profiles
  for each row execute function enforce_profile_immutable_fields();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Rappels et retards (à appeler via pg_cron ou cron externe)
create or replace function check_reservation_deadlines()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Rappels J-2
  insert into notifications (user_id, type, titre, message, lien_id)
  select r.emprunteur_id, 'rappel_echeance', 'Retour bientôt dû',
    'Le livre "' || b.titre || '" est à rendre le ' || to_char(r.date_fin_prevue,'DD/MM/YYYY') || '.',
    r.id::text
  from reservations r join books b on b.id = r.book_id
  where r.statut = 'Actif'
    and r.date_fin_prevue between now() and now() + interval '2 days'
    and not exists (
      select 1 from notifications n
      where n.lien_id = r.id::text and n.type = 'rappel_echeance'
        and n.created_at > now() - interval '24 hours'
    );

  -- Passage en retard + notification
  with en_retard as (
    update reservations set statut = 'En retard'
    where statut = 'Actif' and date_fin_prevue < now()
    returning id, book_id, emprunteur_id
  )
  insert into notifications (user_id, type, titre, message, lien_id)
  select er.emprunteur_id, 'retard', 'Retour en retard',
    'Le livre "' || b.titre || '" devait être rendu le ' || to_char(r.date_fin_prevue,'DD/MM/YYYY') || '.', er.id::text
  from en_retard er join reservations r on r.id = er.id join books b on b.id = er.book_id
  union all
  select b.proprietaire_id, 'retard_proprietaire', 'Un de vos livres est en retard',
    'Votre livre "' || b.titre || '" n''a pas été rendu à temps.', er.id::text
  from en_retard er join books b on b.id = er.book_id;

  -- Escalade J+3
  insert into notifications (user_id, type, titre, message, lien_id)
  select r.emprunteur_id, 'retard', '⚠️ Rappel urgent — retard',
    'Votre retour de "' || b.titre || '" est en retard de 3 jours.', r.id::text
  from reservations r join books b on b.id = r.book_id
  where r.statut = 'En retard'
    and r.date_fin_prevue < now() - interval '3 days'
    and r.date_fin_prevue >= now() - interval '4 days'
    and not exists (select 1 from notifications n where n.lien_id = r.id::text
      and n.titre like '⚠️%' and n.created_at > now() - interval '23 hours');

  -- Escalade J+7 admin
  insert into notifications (user_id, type, titre, message, lien_id)
  select g.admin_id, 'retard_admin', '🚨 Intervention requise — 7 jours',
    'Le membre ' || p.nom_complet || ' n''a pas rendu "' || b.titre || '" depuis 7 jours.', r.id::text
  from reservations r join books b on b.id = r.book_id
  join groups g on g.id = b.groupe_id join profiles p on p.id = r.emprunteur_id
  where r.statut = 'En retard'
    and r.date_fin_prevue < now() - interval '7 days'
    and r.date_fin_prevue >= now() - interval '8 days'
    and not exists (select 1 from notifications n where n.lien_id = r.id::text
      and n.type = 'retard_admin' and n.created_at > now() - interval '23 hours');

  -- Annulation auto après 48h sans réponse
  with annulees as (
    update reservations set statut = 'Annulé'
    where statut = 'Réservé' and created_at < now() - interval '48 hours'
    returning id, book_id, emprunteur_id
  )
  insert into notifications (user_id, type, titre, message, lien_id)
  select a.emprunteur_id, 'reservation_annulee', 'Réservation annulée automatiquement',
    'Votre réservation pour "' || b.titre || '" a été annulée (48h sans réponse).', a.id::text
  from annulees a join books b on b.id = a.book_id
  union all
  select b.proprietaire_id, 'reservation_annulee', 'Réservation expirée',
    'La réservation de "' || b.titre || '" a expiré après 48h.', a.id::text
  from annulees a join books b on b.id = a.book_id;

  -- Rappel remboursement caution
  insert into notifications (user_id, type, titre, message, lien_id)
  select r.emprunteur_id, 'remboursement_caution', '💰 Votre caution va être remboursée',
    'Le retour de "' || b.titre || '" est confirmé. ' || p2.nom_complet || ' va rembourser ' || r.montant_caution || ' FCFA.', r.id::text
  from reservations r join books b on b.id = r.book_id join profiles p2 on p2.id = b.proprietaire_id
  where r.statut = 'Retourné' and r.confirme_par_emprunteur = true
    and r.caution_payee = true and r.caution_remboursee = false
    and not exists (select 1 from notifications n where n.lien_id = r.id::text and n.type = 'remboursement_caution');

  -- Rappel notation 48h après retour
  insert into notifications (user_id, type, titre, message, lien_id)
  select r.emprunteur_id, 'rappel_notation', '⭐ Donnez votre avis',
    'Vous avez rendu "' || b.titre || '". Laissez un avis pour la communauté !', r.id::text
  from reservations r join books b on b.id = r.book_id
  where r.statut = 'Retourné'
    and r.date_retour_reel < now() - interval '48 hours'
    and r.date_retour_reel > now() - interval '49 hours'
    and not exists (select 1 from reviews rv where rv.book_id = r.book_id and rv.reviewer_id = r.emprunteur_id)
    and not exists (select 1 from notifications n where n.lien_id = r.id::text and n.type = 'rappel_notation');
end;
$$;

-- Répondre à une réservation
create or replace function respond_to_reservation(
  p_reservation_id uuid, p_accept boolean, p_raison_refus text default null
)
returns reservations language plpgsql security definer as $$
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

-- Marquer un livre comme retourné (propriétaire)
create or replace function mark_book_returned(
  p_reservation_id uuid, p_etat text,
  p_photo_url text default null, p_notes text default null
)
returns reservations language plpgsql security definer as $$
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

-- Confirmer retour côté emprunteur
create or replace function confirm_book_return(
  p_reservation_id uuid, p_confirme boolean, p_commentaire text default null
)
returns reservations language plpgsql security definer as $$
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

-- Rejoindre un groupe par code
create or replace function join_group_by_code(p_code text)
returns table(id uuid, nom text, description text, photo_url text, admin_id uuid, created_at timestamptz)
language plpgsql security definer as $$
declare g record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into g from groups where code_acces = p_code;
  if g is null then raise exception 'Code invalide'; end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = g.id where id = auth.uid();
  return query select g.id, g.nom, g.description, g.photo_url, g.admin_id, g.created_at;
end;
$$;

-- Quitter un groupe
create or replace function leave_group()
returns void language plpgsql security definer as $$
declare my_group uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select groupe_id into my_group from profiles where id = auth.uid();
  if my_group is null then raise exception 'Vous n''appartenez à aucun groupe'; end if;
  if exists (select 1 from groups where id = my_group and admin_id = auth.uid()) then
    raise exception 'Transférez l''administration avant de quitter';
  end if;
  if exists (select 1 from reservations where emprunteur_id = auth.uid() and statut in ('Réservé','Actif','En retard')) then
    raise exception 'Emprunt en cours — rendez le livre avant de quitter';
  end if;
  if exists (
    select 1 from books b join reservations r on r.book_id = b.id
    where b.proprietaire_id = auth.uid() and r.statut in ('Réservé','Actif','En retard')
  ) then raise exception 'Un de vos livres est prêté — attendez le retour'; end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = null where id = auth.uid();
end;
$$;

-- Approuver une demande d'adhésion
create or replace function approve_join_request(request_id uuid)
returns void language plpgsql security definer as $$
declare req record; g record;
begin
  select * into req from group_join_requests where id = request_id;
  if req is null then raise exception 'Demande introuvable'; end if;
  select * into g from groups where id = req.group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if req.statut <> 'en_attente' then raise exception 'Déjà traitée'; end if;
  update group_join_requests set statut='approuve', decided_at=now(), decided_by=auth.uid() where id=request_id;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = req.group_id where id = req.user_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (req.user_id, 'demande_groupe_approuvee', 'Demande acceptée',
          'Votre demande pour rejoindre "' || g.nom || '" a été acceptée !', g.id::text);
end;
$$;

-- Refuser une demande d'adhésion
create or replace function reject_join_request(request_id uuid)
returns void language plpgsql security definer as $$
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

-- Transférer l'administration d'un groupe
create or replace function transfer_group_admin(p_group_id uuid, p_new_admin_id uuid)
returns void language plpgsql security definer as $$
declare g record; new_admin record;
begin
  select * into g from groups where id = p_group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  select * into new_admin from profiles where id = p_new_admin_id and groupe_id = p_group_id;
  if new_admin is null then raise exception 'Le nouvel admin doit être membre du groupe'; end if;
  if p_new_admin_id = auth.uid() then raise exception 'Vous êtes déjà administrateur'; end if;
  update groups set admin_id = p_new_admin_id where id = p_group_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values
    (p_new_admin_id, 'nouveau_admin', 'Vous êtes maintenant administrateur',
     'Vous êtes désormais administrateur du groupe "' || g.nom || '".', g.id::text),
    (auth.uid(), 'admin_transfere', 'Administration transférée',
     'Vous avez transféré l''administration de "' || g.nom || '" à ' || new_admin.nom_complet || '.', g.id::text);
end;
$$;

-- Supprimer un groupe
create or replace function delete_group(p_group_id uuid)
returns void language plpgsql security definer as $$
declare g record; member_ids uuid[];
begin
  select * into g from groups where id = p_group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if exists (
    select 1 from reservations r join books b on b.id = r.book_id
    where b.groupe_id = p_group_id and r.statut in ('Réservé','Actif','En retard')
  ) then raise exception 'Des emprunts sont en cours — terminez-les avant de supprimer'; end if;
  select array_agg(id) into member_ids from profiles where groupe_id = p_group_id and id <> auth.uid();
  delete from groups where id = p_group_id;
  if member_ids is not null then
    insert into notifications (user_id, type, titre, message, lien_id)
    select uid, 'groupe_supprime', 'Groupe supprimé',
           'Le groupe "' || g.nom || '" a été supprimé par son administrateur.', null
    from unnest(member_ids) as uid;
  end if;
end;
$$;

-- Ajuster le solde d'un membre (admin)
create or replace function admin_adjust_balance(
  target_user_id uuid, delta integer, reason text default null
)
returns integer language plpgsql security definer as $$
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

-- Changer le rôle d'un utilisateur (admin)
create or replace function admin_set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer as $$
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

-- Retirer un membre d'un groupe (admin)
create or replace function admin_remove_member(p_target_user_id uuid)
returns void language plpgsql security definer as $$
declare g record; target record;
begin
  select * into target from profiles where id = p_target_user_id;
  if target is null then raise exception 'Utilisateur introuvable'; end if;
  select * into g from groups where id = target.groupe_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if p_target_user_id = auth.uid() then raise exception 'Utilisez "Quitter le groupe"'; end if;
  if exists (select 1 from reservations where emprunteur_id = p_target_user_id and statut in ('Réservé','Actif','En retard')) then
    raise exception 'Ce membre a un emprunt en cours'; end if;
  if exists (
    select 1 from books b join reservations r on r.book_id = b.id
    where b.proprietaire_id = p_target_user_id and r.statut in ('Réservé','Actif','En retard')
  ) then raise exception 'Un livre de ce membre est actuellement prêté'; end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = null where id = p_target_user_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (p_target_user_id, 'retire_du_groupe', 'Retiré du groupe',
          'Vous avez été retiré du groupe "' || g.nom || '" par l''administrateur.', g.id::text);
end;
$$;

-- Résoudre un litige
create or replace function resolve_dispute(
  p_reservation_id uuid, p_notes text, p_rembourser_caution boolean default false
)
returns reservations language plpgsql security definer as $$
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

-- Numéro de contact pour une réservation
create or replace function get_reservation_contact_phone(p_reservation_id uuid)
returns text language plpgsql security definer as $$
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

-- Désactiver son compte
create or replace function deactivate_own_account()
returns void language plpgsql security definer as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from reservations where emprunteur_id = auth.uid() and statut in ('Réservé','Actif')) then
    raise exception 'Réservations en cours — impossible de désactiver';
  end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set compte_actif = false, groupe_id = null where id = auth.uid();
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- profiles
create policy "profiles_select_own"          on profiles for select using (auth.uid() = id);
create policy "profiles_update_own"          on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_service_only" on profiles for insert with check (false);
create policy "profiles_delete_none"         on profiles for delete using (false);

-- groups
create policy "groups_select_own_admin" on groups for select using (auth.uid() = admin_id);
create policy "groups_insert_auth"      on groups for insert with check (auth.uid() is not null);
create policy "groups_update_admin"     on groups for update using (auth.uid() = admin_id);

-- group_settings
create policy "settings_select_members" on group_settings for select
  using (groupe_id in (select groupe_id from profiles where id = auth.uid()));
create policy "settings_upsert_admin" on group_settings for all
  using (
    auth.uid() = (select admin_id from groups where id = groupe_id)
    or (select role from profiles where id = auth.uid()) = 'administrateur'
  )
  with check (
    auth.uid() = (select admin_id from groups where id = groupe_id)
    or (select role from profiles where id = auth.uid()) = 'administrateur'
  );

-- group_join_requests
create policy "gjr_select_own"         on group_join_requests for select using (auth.uid() = user_id);
create policy "gjr_select_admin"       on group_join_requests for select
  using (exists (select 1 from groups g where g.id = group_id and g.admin_id = auth.uid()));
create policy "gjr_insert_own"         on group_join_requests for insert with check (auth.uid() = user_id);
create policy "gjr_delete_own_pending" on group_join_requests for delete
  using (auth.uid() = user_id and statut = 'en_attente');

-- books
create policy "books_select_group" on books for select
  using (groupe_id in (select groupe_id from profiles where id = auth.uid()));
create policy "books_insert_owner" on books for insert with check (
  (auth.uid() = proprietaire_id
    and (select role from profiles where id = auth.uid()) = any(array['proprietaire','administrateur']))
  or exists (select 1 from groups g where g.id = groupe_id and g.admin_id = auth.uid())
);
create policy "books_update_owner" on books for update
  using (auth.uid() = proprietaire_id or exists (select 1 from groups g where g.id = groupe_id and g.admin_id = auth.uid()))
  with check (auth.uid() = proprietaire_id or exists (select 1 from groups g where g.id = groupe_id and g.admin_id = auth.uid()));
create policy "books_delete_owner" on books for delete
  using (auth.uid() = proprietaire_id or exists (select 1 from groups g where g.id = groupe_id and g.admin_id = auth.uid()));

-- reservations
create policy "res_select_parties" on reservations for select
  using (
    auth.uid() = emprunteur_id
    or exists (select 1 from books b where b.id = book_id and b.proprietaire_id = auth.uid())
    or exists (select 1 from books b join groups g on g.id = b.groupe_id where b.id = book_id and g.admin_id = auth.uid())
  );
create policy "res_insert_own" on reservations for insert with check (auth.uid() = emprunteur_id);
create policy "res_update_parties" on reservations for update
  using (
    auth.uid() = emprunteur_id
    or exists (select 1 from books b where b.id = book_id and b.proprietaire_id = auth.uid())
  )
  with check (
    auth.uid() = emprunteur_id
    or exists (select 1 from books b where b.id = book_id and b.proprietaire_id = auth.uid())
  );

-- reservation_history
create policy "history_select" on reservation_history for select
  using (reservation_id in (
    select id from reservations where emprunteur_id = auth.uid()
    union
    select id from reservations where book_id in (select id from books where proprietaire_id = auth.uid())
  ));
create policy "history_insert_parties" on reservation_history for insert
  with check (exists (
    select 1 from reservations r where r.id = reservation_id
      and (r.emprunteur_id = auth.uid()
        or exists (select 1 from books b where b.id = r.book_id and b.proprietaire_id = auth.uid()))
  ));

-- payments
create policy "payments_select"  on payments for select using (auth.uid() = payer_id or auth.uid() = receiver_id);
create policy "payments_insert"  on payments for insert with check (auth.uid() = payer_id);
create policy "payments_update"  on payments for update using (auth.uid() = receiver_id or auth.uid() = payer_id);

-- notifications
create policy "notifs_select_own" on notifications for select using (auth.uid() = user_id);
create policy "notifs_update_own" on notifications for update using (auth.uid() = user_id);
create policy "notifs_insert_own" on notifications for insert with check (auth.uid() = user_id);
create policy "notifs_delete_own" on notifications for delete using (auth.uid() = user_id);

-- messages
create policy "messages_select_own" on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_insert_own" on messages for insert with check (auth.uid() = sender_id);

-- reviews
create policy "reviews_select_all" on reviews for select using (true);
create policy "reviews_insert_own" on reviews for insert
  with check (auth.uid() = reviewer_id and exists (
    select 1 from reservations r where r.id = reservation_id
      and r.book_id = reviews.book_id and r.emprunteur_id = auth.uid() and r.statut = 'Retourné'
  ));
create policy "reviews_update_own" on reviews for update using (auth.uid() = reviewer_id);

-- balance_transactions
create policy "balance_tx_select_own" on balance_transactions for select using (auth.uid() = user_id);

-- ============================================================
-- CRON (Supabase pg_cron — optionnel)
-- Activer dans Supabase : Database → Extensions → pg_cron
-- ============================================================
-- select cron.schedule('check-deadlines', '0 8 * * *', 'select check_reservation_deadlines()');

-- ============================================================
-- AJOUTS v2 — Règles métier et automatisations
-- ============================================================

-- Auto-promotion membre → propriétaire à l'ajout du premier livre
create or replace function auto_promote_to_proprietaire()
returns trigger language plpgsql security definer as $$
begin
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set role = 'proprietaire'
  where id = new.proprietaire_id and role = 'membre';
  return new;
end;
$$;
create trigger trg_auto_promote
  after insert on books
  for each row execute function auto_promote_to_proprietaire();

-- Index anti-doublon de réservation active par livre
create unique index if not exists idx_unique_active_reservation
  on reservations (book_id, emprunteur_id)
  where statut in ('Réservé','Actif');

-- Bilan hebdomadaire admin
create or replace function send_weekly_admin_report()
returns void language plpgsql security definer as $$
declare g record; admin_notif text;
begin
  for g in select id, nom, admin_id from groups loop
    select
      'Bilan semaine du groupe "' || g.nom || '" :' || chr(10) ||
      '• ' || count(*) filter (where r.statut = 'Actif') || ' livre(s) en cours' || chr(10) ||
      '• ' || count(*) filter (where r.statut = 'Réservé') || ' en attente de réponse' || chr(10) ||
      '• ' || count(*) filter (where r.statut = 'En retard') || ' en retard' || chr(10) ||
      '• ' || count(*) filter (where r.created_at > now() - interval '7 days') || ' nouvelle(s) réservation(s)'
    into admin_notif
    from reservations r join books b on b.id = r.book_id
    where b.groupe_id = g.id;
    insert into notifications (user_id, type, titre, message, lien_id)
    values (g.admin_id, 'bilan_hebdo', '📊 Bilan hebdomadaire du groupe', admin_notif, g.id::text);
  end loop;
end;
$$;

-- Cron recommandé (Supabase → Database → Extensions → pg_cron)
-- select cron.schedule('check-deadlines',   '0 8 * * *',   'select check_reservation_deadlines()');
-- select cron.schedule('weekly-report',     '0 9 * * MON', 'select send_weekly_admin_report()');
