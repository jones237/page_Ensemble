-- ============================================================
-- Migration 003 — Pièces manquantes du schéma + garde-fous + prêt gratuit par défaut
-- À exécuter dans Supabase > SQL Editor APRÈS schema.sql et 002.
-- Idempotente (peut être relancée).
--
-- POURQUOI : le code de l'app appelle create_reservation(), profiles_public et
-- groups_public, qui n'étaient définis NULLE PART dans le dépôt. Sur une base
-- neuve, réserver un livre ou afficher les groupes échouait.
-- ============================================================

-- 0) Helpers d'appartenance (004 les remplacera pour le multi-groupes) --------
create or replace function my_group_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select groupe_id from profiles where id = auth.uid() and groupe_id is not null
$$;

create or replace function is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from my_group_ids() g where g = p_group_id)
$$;

-- 1) Vues publiques (sans données sensibles : ni téléphone, ni solde, ni code d'accès)
drop view if exists groups_public cascade;
create view groups_public as
  select id, nom, description, photo_url, admin_id, created_at from groups;
revoke all on groups_public from public;
grant select on groups_public to anon, authenticated;

drop view if exists profiles_public cascade;
create view profiles_public as
  select p.id, p.nom_complet, p.avatar_url, p.bio, p.role, p.created_at, p.groupe_id
  from profiles p
  where p.id = auth.uid()
     or p.groupe_id in (select my_group_ids())                          -- membres de mes groupes
     or exists (select 1 from groups g where g.admin_id = p.id)         -- administrateurs (visibles pour demander à rejoindre)
     or exists (select 1 from group_join_requests r                     -- demandeurs d'un groupe que j'administre
                join groups g on g.id = r.group_id
                where r.user_id = p.id and g.admin_id = auth.uid());
revoke all on profiles_public from public, anon;
grant select on profiles_public to authenticated;

-- 2) Prêt gratuit par défaut (les réglages déjà enregistrés par les groupes ne changent pas)
alter table group_settings alter column prix_location_defaut   set default 0;
alter table group_settings alter column montant_caution_defaut set default 0;
alter table books          alter column prix_location          set default 0;
alter table reservations   alter column montant_caution        set default 0;

-- 3) create_reservation : la fonction appelée par l'app ------------------------
drop function if exists create_reservation(uuid, timestamptz);
create function create_reservation(p_book_id uuid, p_date_fin timestamptz default null)
returns reservations language plpgsql security definer set search_path = public as $$
declare
  b        books;
  s        group_settings;
  r        reservations;
  v_caution integer;
  v_duree   integer;
  v_fin     timestamptz;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;

  select * into b from books where id = p_book_id for update;
  if not found then raise exception 'Livre introuvable'; end if;
  if b.proprietaire_id = auth.uid() then raise exception 'Vous ne pouvez pas réserver votre propre livre'; end if;
  if coalesce(to_jsonb(b)->>'type','physique') = 'numerique' then
    raise exception 'Ce livre numérique se lit en ligne, il ne se réserve pas';
  end if;
  if b.statut <> 'Disponible' then raise exception 'Ce livre n''est pas disponible'; end if;
  if not is_group_member(b.groupe_id) then raise exception 'Vous n''appartenez pas au groupe de ce livre'; end if;

  select * into s from group_settings where groupe_id = b.groupe_id;
  v_caution := coalesce(b.montant_caution, s.montant_caution_defaut, 0);
  v_duree   := coalesce(b.duree_pret_jours, s.duree_emprunt_jours, 14);
  if p_date_fin is not null and (p_date_fin <= now() or p_date_fin > now() + make_interval(days => v_duree)) then
    raise exception 'Date de retour invalide (maximum % jours)', v_duree;
  end if;
  v_fin := coalesce(p_date_fin, now() + make_interval(days => v_duree));

  insert into reservations (book_id, emprunteur_id, date_debut, date_fin_prevue, statut,
                            montant_caution, montant_location, duree_pret_jours, caution_payee)
  values (b.id, auth.uid(), now(), v_fin, 'Réservé',
          v_caution, b.prix_location, v_duree, (v_caution = 0))   -- sans caution : rien à verser
  returning * into r;
  return r;
end;
$$;
grant execute on function create_reservation(uuid, timestamptz) to authenticated;

-- 4) Garde-fou : un utilisateur ne peut pas réécrire sa réservation à la main ----
-- Avant : la politique res_update_parties laissait l'emprunteur modifier TOUTES les
-- colonnes de sa réservation (caution_payee, montant_caution, statut...).
-- Les fonctions SECURITY DEFINER (respond_to_reservation, mark_book_returned, ...)
-- tournent avec le rôle propriétaire de la fonction et ne sont pas concernées.
create or replace function guard_reservation_direct_update()
returns trigger language plpgsql as $$
declare
  v_owner uuid;
  k text;
begin
  if current_user not in ('authenticated','anon') then return new; end if;  -- RPC / SQL editor
  select proprietaire_id into v_owner from books where id = old.book_id;

  for k in
    select n.key from jsonb_each(to_jsonb(new)) n
    where n.key <> 'updated_at' and n.value is distinct from (to_jsonb(old) -> n.key)
  loop
    if k = 'notes' then
      null;  -- les deux parties peuvent commenter
    elsif k = 'caution_payee' and auth.uid() = v_owner and old.caution_payee = false and new.caution_payee = true then
      null;  -- le propriétaire confirme avoir reçu la caution
    elsif k = 'statut' and auth.uid() = old.emprunteur_id and old.statut = 'Réservé' and new.statut = 'Annulé' then
      null;  -- l'emprunteur annule avant acceptation
    else
      raise exception 'Modification directe interdite sur "%" (utilisez les actions de l''application)', k;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_a_guard_reservation on reservations;
create trigger trg_a_guard_reservation
  before update on reservations
  for each row execute function guard_reservation_direct_update();
