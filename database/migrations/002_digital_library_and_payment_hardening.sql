-- ============================================================
-- Migration 002 — Bibliothèque numérique + durcissement des paiements
-- À exécuter UNE fois dans Supabase > SQL Editor (après schema.sql).
-- Idempotente : peut être relancée sans risque.
-- ============================================================

-- 1) Colonnes manquantes sur books (utilisées par DigitalLibraryPage) -------
alter table books add column if not exists type         text    not null default 'physique';
alter table books add column if not exists source       text;
alter table books add column if not exists fichier_url  text;
alter table books add column if not exists prix_lecture integer not null default 0;

do $$ begin
  alter table books add constraint books_type_check
    check (type = any(array['physique','numerique']));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table books add constraint books_fichier_https_check
    check (fichier_url is null or fichier_url ~* '^https://');
exception when duplicate_object then null; end $$;

-- 2) Table book_access (suivi de lecture) -----------------------------------
create table if not exists book_access (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  pages_read integer not null default 0 check (pages_read >= 0),
  unique (book_id, user_id)
);
alter table book_access enable row level security;

drop policy if exists "book_access_select_own" on book_access;
create policy "book_access_select_own" on book_access for select
  using (auth.uid() = user_id);

-- Un membre ne peut s'accorder l'accès qu'à un livre numérique GRATUIT de son groupe
drop policy if exists "book_access_insert_own" on book_access;
create policy "book_access_insert_own" on book_access for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from books b
      where b.id = book_id
        and b.type = 'numerique'
        and b.prix_lecture = 0
        and b.groupe_id in (select groupe_id from profiles where id = auth.uid())
    )
  );

drop policy if exists "book_access_update_own" on book_access;
create policy "book_access_update_own" on book_access for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_book_access_user on book_access(user_id);

-- 3) Paiements : l'acheteur ne doit PAS pouvoir se confirmer lui-même -------
-- (avant : payments_update autorisait le payeur à passer status='confirmed',
--  et payments_insert n'imposait aucun statut)
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (auth.uid() = payer_id and status in ('pending','initiated'));

create or replace function enforce_payment_status_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Contexte de confiance (éditeur SQL, service_role, n8n) : auth.uid() est NULL -> on ne bloque pas.
  -- Les utilisateurs de l'app ont toujours un auth.uid() non nul.
  if auth.uid() is null then
    return new;
  end if;

  if new.status is distinct from old.status then
    -- confirmed / refunded / failed : réservés au destinataire du paiement
    if new.status in ('confirmed','refunded','failed') and auth.uid() is distinct from old.receiver_id then
      raise exception 'Seul le destinataire peut passer le paiement à %', new.status;
    end if;
    -- le payeur peut seulement déclarer "initiated"
    if auth.uid() = old.payer_id and auth.uid() is distinct from old.receiver_id
       and new.status not in ('initiated') then
      raise exception 'Statut non autorisé pour le payeur';
    end if;
  end if;
  -- champs figés
  new.payer_id       := old.payer_id;
  new.receiver_id    := old.receiver_id;
  new.amount         := old.amount;
  new.reservation_id := old.reservation_id;
  return new;
end; $$;

drop trigger if exists trg_payments_status_rules on payments;
create trigger trg_payments_status_rules
  before update on payments
  for each row execute function enforce_payment_status_rules();
