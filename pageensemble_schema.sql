-- =====================================================
-- PageEnsemble: Système de Location de Livres
-- =====================================================

-- 1. PROFILS UTILISATEURS (lié à auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_complet text not null,
  phone text,
  role text check (role in ('administrateur', 'proprietaire', 'membre')) default 'membre',
  groupe_id uuid references groups(id) on delete set null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. GROUPES (Club de lecture, Église, etc.)
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text,
  admin_id uuid not null references profiles(id) on delete cascade,
  photo_url text,
  code_acces text unique, -- Code pour rejoindre le groupe
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. LIVRES (Catalogue principal)
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  auteur text not null,
  resume text,
  image_url text,
  proprietaire_id uuid not null references profiles(id) on delete cascade,
  groupe_id uuid not null references groups(id) on delete cascade,
  categorie text default 'Non-fiction', -- Fiction, Non-fiction, Scolaire, etc.
  condition text check (condition in ('Excellent', 'Bon', 'Acceptable')) default 'Bon',
  statut text check (statut in ('Disponible', 'Reservé', 'Emprunté')) default 'Disponible',
  prix_location integer default 500, -- en FCFA
  nombre_pages integer,
  edition text,
  isbn text unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. RÉSERVATIONS / LOCATIONS
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  emprunteur_id uuid not null references profiles(id) on delete cascade,
  date_debut timestamp with time zone default now(),
  date_fin_prevue timestamp with time zone, -- Auto-calculée: +14 jours ou custom
  date_retour_reel timestamp with time zone,
  statut text check (statut in ('Réservé', 'Actif', 'Retourné', 'Annulé', 'En retard')) default 'Réservé',
  caution_payee boolean default false,
  montant_caution integer default 2000, -- en FCFA
  montant_location integer, -- Copie du prix_location au moment de la réservation
  notes text, -- Commentaires du propriétaire/emprunteur
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. HISTORIQUE DES RÉSERVATIONS (Audit trail)
create table if not exists reservation_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  action text not null, -- 'créée', 'retournée', 'prolongée', 'remboursée', etc.
  date timestamp with time zone default now(),
  notes text,
  created_by uuid references profiles(id) on delete set null
);

-- 6. NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- 'rappel_retour', 'confirmation_reservation', 'livre_disponible', etc.
  titre text,
  message text not null,
  lien_id text, -- ID du livre ou réservation concernée
  lu boolean default false,
  created_at timestamp with time zone default now()
);

-- 7. MESSAGES ENTRE UTILISATEURS
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete cascade,
  contenu text not null,
  lu boolean default false,
  created_at timestamp with time zone default now()
);

-- 8. AVIS / NOTES SUR LES LIVRES
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5),
  contenu text,
  created_at timestamp with time zone default now()
);

-- =====================================================
-- INDEXES POUR LES PERFORMANCES
-- =====================================================

create index idx_books_groupe on books(groupe_id);
create index idx_books_proprietaire on books(proprietaire_id);
create index idx_books_statut on books(statut);
create index idx_reservations_book on reservations(book_id);
create index idx_reservations_emprunteur on reservations(emprunteur_id);
create index idx_reservations_statut on reservations(statut);
create index idx_notifications_user on notifications(user_id);
create index idx_messages_sender on messages(sender_id);
create index idx_messages_recipient on messages(recipient_id);
create index idx_profiles_groupe on profiles(groupe_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

alter table profiles enable row level security;
alter table groups enable row level security;
alter table books enable row level security;
alter table reservations enable row level security;
alter table notifications enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;

-- =====================================================
-- POLICIES - PROFILES
-- =====================================================

-- Chacun peut voir le profil des autres (infos publiques)
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

-- Chacun peut mettre à jour son propre profil
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Chacun peut créer son propre profil
create policy "Users can create own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- =====================================================
-- POLICIES - GROUPS
-- =====================================================

-- Tous peuvent voir les groupes publics
create policy "Groups are viewable by members"
  on groups for select
  using (true);

-- Seulement l'admin peut modifier son groupe
create policy "Only admin can update group"
  on groups for update
  using (auth.uid() = admin_id);

-- =====================================================
-- POLICIES - BOOKS
-- =====================================================

-- Tous peuvent voir les livres de leur groupe
create policy "Books are viewable by group members"
  on books for select
  using (
    groupe_id in (
      select groupe_id from profiles where id = auth.uid()
    )
  );

-- Propriétaire peut créer des livres
create policy "Proprietaires can insert books"
  on books for insert
  with check (
    auth.uid() = proprietaire_id and
    (select role from profiles where id = auth.uid()) in ('proprietaire', 'administrateur')
  );

-- Propriétaire peut modifier ses livres
create policy "Proprietaires can update own books"
  on books for update
  using (auth.uid() = proprietaire_id);

-- =====================================================
-- POLICIES - RESERVATIONS
-- =====================================================

-- Chacun peut voir les réservations auxquelles il est lié
create policy "Users can view own reservations"
  on reservations for select
  using (
    auth.uid() = emprunteur_id or
    auth.uid() = (select proprietaire_id from books where id = book_id)
  );

-- Membres peuvent créer des réservations
create policy "Members can create reservations"
  on reservations for insert
  with check (auth.uid() = emprunteur_id);

-- Seul le propriétaire peut modifier le statut
create policy "Proprietaire can update reservation status"
  on reservations for update
  using (
    auth.uid() = (select proprietaire_id from books where id = book_id)
  );

-- =====================================================
-- POLICIES - NOTIFICATIONS
-- =====================================================

-- Chacun ne voit que ses propres notifications
create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- =====================================================
-- POLICIES - MESSAGES
-- =====================================================

-- Chacun ne voit que ses propres messages
create policy "Users can view own messages"
  on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Chacun peut envoyer des messages
create policy "Users can send messages"
  on messages for insert
  with check (auth.uid() = sender_id);

-- =====================================================
-- FUNCTIONS UTILES
-- =====================================================

-- Fonction pour mettre à jour le statut du livre automatiquement
create or replace function update_book_status()
returns trigger as $$
begin
  if new.statut = 'Retourné' and old.statut != 'Retourné' then
    update books set statut = 'Disponible' where id = new.book_id;
  elsif new.statut = 'Actif' and old.statut != 'Actif' then
    update books set statut = 'Emprunté' where id = new.book_id;
  elsif new.statut = 'Réservé' and old.statut != 'Réservé' then
    update books set statut = 'Reservé' where id = new.book_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_book_status
after update on reservations
for each row
when (old.statut is distinct from new.statut)
execute function update_book_status();

-- Fonction pour envoyer une notification automatiquement
create or replace function notify_on_reservation()
returns trigger as $$
begin
  insert into notifications (user_id, type, titre, message, lien_id)
  values (
    (select proprietaire_id from books where id = new.book_id),
    'nouvelle_reservation',
    'Nouvelle réservation',
    concat((select nom_complet from profiles where id = new.emprunteur_id), ' a réservé un livre'),
    new.id::text
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_notify_on_reservation
after insert on reservations
for each row
execute function notify_on_reservation();

-- =====================================================
-- STORAGE BUCKET POUR LES IMAGES
-- =====================================================

insert into storage.buckets (id, name, public)
values ('books_images', 'books_images', true)
on conflict do nothing;

-- Policy pour que chacun puisse voir les images
create policy "Public Access"
  on storage.objects for select
  using (bucket_id = 'books_images');

-- Policy pour que les propriétaires puissent uploader
create policy "Upload own book images"
  on storage.objects for insert
  with check (bucket_id = 'books_images' and auth.uid()::text = (storage.foldername(name))[1]);
