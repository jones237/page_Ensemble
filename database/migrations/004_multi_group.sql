-- ============================================================
-- Migration 004 — Plusieurs groupes par utilisateur
-- À exécuter APRÈS 002 et 003. Idempotente.
--
-- Principe : on garde profiles.groupe_id comme « GROUPE ACTIF » (celui que tout
-- l'écran utilise : catalogue, ajout de livre, réglages) et on ajoute la table
-- group_members qui liste TOUS les groupes de l'utilisateur. Un sélecteur dans
-- la barre de navigation change le groupe actif (switch_active_group).
-- ============================================================

-- 1) Table d'appartenance -------------------------------------------------------
create table if not exists group_members (
  group_id  uuid not null references groups(id)   on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user on group_members(user_id);
alter table group_members enable row level security;

drop policy if exists "gm_select_own" on group_members;
create policy "gm_select_own" on group_members for select using (auth.uid() = user_id);
-- Pas d'insert/update/delete direct : tout passe par les fonctions ci-dessous.

-- Reprise de l'existant : groupe actuel de chaque profil + administrateurs
insert into group_members (group_id, user_id)
  select groupe_id, id from profiles where groupe_id is not null
  on conflict do nothing;
insert into group_members (group_id, user_id)
  select id, admin_id from groups
  on conflict do nothing;

-- 2) Helpers d'appartenance (remplacent ceux de 003) -----------------------------
create or replace function my_group_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select group_id from group_members where user_id = auth.uid()
$$;

-- 3) Politiques de lecture : tous mes groupes, pas seulement le groupe actif -------
drop policy if exists "books_select_group" on books;
create policy "books_select_group" on books for select
  using (groupe_id in (select my_group_ids()));

drop policy if exists "settings_select_members" on group_settings;
create policy "settings_select_members" on group_settings for select
  using (groupe_id in (select my_group_ids()));

-- 4) Vue profiles_public : une ligne par (personne, groupe) -----------------------
drop view if exists profiles_public cascade;
create view profiles_public as
  select p.id, p.nom_complet, p.avatar_url, p.bio, p.role, p.created_at, gm.group_id as groupe_id
  from profiles p
  left join group_members gm on gm.user_id = p.id
  where p.id = auth.uid()
     or gm.group_id in (select my_group_ids())
     or exists (select 1 from groups g where g.admin_id = p.id)
     or exists (select 1 from group_join_requests r
                join groups g on g.id = r.group_id
                where r.user_id = p.id and g.admin_id = auth.uid());
revoke all on profiles_public from public, anon;
grant select on profiles_public to authenticated;

-- 5) Création de groupe : code d'accès auto + l'administrateur en devient membre ----
-- (avant : le créateur n'était membre de rien, donc sans catalogue ni droit d'ajouter un livre)
create or replace function groups_before_insert()
returns trigger language plpgsql as $$
begin
  if new.code_acces is null then
    new.code_acces := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  end if;
  return new;
end; $$;
drop trigger if exists trg_groups_before_insert on groups;
create trigger trg_groups_before_insert before insert on groups
  for each row execute function groups_before_insert();

create or replace function groups_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id) values (new.id, new.admin_id) on conflict do nothing;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = new.id where id = new.admin_id;   -- le nouveau groupe devient actif
  return new;
end; $$;
drop trigger if exists trg_groups_after_insert on groups;
create trigger trg_groups_after_insert after insert on groups
  for each row execute function groups_after_insert();

-- 6) Réparer le groupe actif quand une appartenance disparaît ----------------------
create or replace function repair_active_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_role_lock','true',true);
  update profiles p
     set groupe_id = (select gm.group_id from group_members gm
                      where gm.user_id = old.user_id order by gm.joined_at limit 1)
   where p.id = old.user_id
     and (p.groupe_id is null or p.groupe_id = old.group_id);
  return old;
end; $$;
drop trigger if exists trg_group_members_repair on group_members;
create trigger trg_group_members_repair after delete on group_members
  for each row execute function repair_active_group();

-- 7) Changer de groupe actif ------------------------------------------------------
create or replace function switch_active_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from group_members where group_id = p_group_id and user_id = auth.uid()) then
    raise exception 'Vous n''êtes pas membre de ce groupe';
  end if;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = p_group_id where id = auth.uid();
end; $$;
grant execute on function switch_active_group(uuid) to authenticated;

-- 8) Fonctions existantes adaptées au multi-groupes -----------------------------------
create or replace function join_group_by_code(p_code text)
returns table(id uuid, nom text, description text, photo_url text, admin_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into g from groups where code_acces = p_code;
  if g is null then raise exception 'Code invalide'; end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set groupe_id = g.id where profiles.id = auth.uid();   -- le groupe rejoint devient actif (profiles.id : « id » est aussi une colonne de sortie)
  return query select g.id, g.nom, g.description, g.photo_url, g.admin_id, g.created_at;
end; $$;

create or replace function approve_join_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare req record; g record;
begin
  select * into req from group_join_requests where group_join_requests.id = request_id;
  if req is null then raise exception 'Demande introuvable'; end if;
  select * into g from groups where groups.id = req.group_id and groups.admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if req.statut <> 'en_attente' then raise exception 'Déjà traitée'; end if;
  update group_join_requests set statut='approuve', decided_at=now(), decided_by=auth.uid() where group_join_requests.id=request_id;
  insert into group_members (group_id, user_id) values (req.group_id, req.user_id) on conflict do nothing;
  perform set_config('app.bypass_role_lock','true',true);
  -- on ne change le groupe actif que s'il n'en avait aucun (on ne le « déménage » pas sans prévenir)
  update profiles set groupe_id = req.group_id where profiles.id = req.user_id and groupe_id is null;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (req.user_id, 'demande_groupe_approuvee', 'Demande acceptée',
          'Votre demande pour rejoindre "' || g.nom || '" a été acceptée !', g.id::text);
end; $$;

-- Quitter le groupe ACTIF
create or replace function leave_group()
returns void language plpgsql security definer set search_path = public as $$
declare my_group uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select groupe_id into my_group from profiles where id = auth.uid();
  if my_group is null then raise exception 'Vous n''appartenez à aucun groupe'; end if;
  if exists (select 1 from groups where id = my_group and admin_id = auth.uid()) then
    raise exception 'Transférez l''administration avant de quitter';
  end if;
  if exists (select 1 from reservations r join books b on b.id = r.book_id
             where r.emprunteur_id = auth.uid() and b.groupe_id = my_group
               and r.statut in ('Réservé','Actif','En retard')) then
    raise exception 'Emprunt en cours — rendez le livre avant de quitter';
  end if;
  if exists (select 1 from books b join reservations r on r.book_id = b.id
             where b.proprietaire_id = auth.uid() and b.groupe_id = my_group
               and r.statut in ('Réservé','Actif','En retard')) then
    raise exception 'Un de vos livres est prêté — attendez le retour';
  end if;
  delete from group_members where group_id = my_group and user_id = auth.uid();  -- le trigger choisit un autre groupe actif
end; $$;

create or replace function transfer_group_admin(p_group_id uuid, p_new_admin_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g record; new_admin record;
begin
  select * into g from groups where id = p_group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  select p.* into new_admin from profiles p
    join group_members gm on gm.user_id = p.id and gm.group_id = p_group_id
    where p.id = p_new_admin_id;
  if new_admin is null then raise exception 'Le nouvel admin doit être membre du groupe'; end if;
  if p_new_admin_id = auth.uid() then raise exception 'Vous êtes déjà administrateur'; end if;
  update groups set admin_id = p_new_admin_id where id = p_group_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values
    (p_new_admin_id, 'nouveau_admin', 'Vous êtes maintenant administrateur',
     'Vous êtes désormais administrateur du groupe "' || g.nom || '".', g.id::text),
    (auth.uid(), 'admin_transfere', 'Administration transférée',
     'Vous avez transféré l''administration de "' || g.nom || '" à ' || new_admin.nom_complet || '.', g.id::text);
end; $$;

create or replace function delete_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g record; member_ids uuid[];
begin
  select * into g from groups where id = p_group_id and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if exists (
    select 1 from reservations r join books b on b.id = r.book_id
    where b.groupe_id = p_group_id and r.statut in ('Réservé','Actif','En retard')
  ) then raise exception 'Des emprunts sont en cours — terminez-les avant de supprimer'; end if;
  select array_agg(user_id) into member_ids from group_members where group_id = p_group_id and user_id <> auth.uid();
  delete from groups where id = p_group_id;
  if member_ids is not null then
    insert into notifications (user_id, type, titre, message, lien_id)
    select uid, 'groupe_supprime', 'Groupe supprimé',
           'Le groupe "' || g.nom || '" a été supprimé par son administrateur.', null
    from unnest(member_ids) as uid;
  end if;
end; $$;

-- Retirer un membre (admin) : p_group_id facultatif = groupe actif de la cible
drop function if exists admin_remove_member(uuid);
create or replace function admin_remove_member(p_target_user_id uuid, p_group_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare g record; target record; v_group uuid;
begin
  select * into target from profiles where id = p_target_user_id;
  if target is null then raise exception 'Utilisateur introuvable'; end if;
  v_group := coalesce(p_group_id, target.groupe_id);
  select * into g from groups where id = v_group and admin_id = auth.uid();
  if g is null then raise exception 'Non autorisé'; end if;
  if p_target_user_id = auth.uid() then raise exception 'Utilisez "Quitter le groupe"'; end if;
  if not exists (select 1 from group_members where group_id = v_group and user_id = p_target_user_id) then
    raise exception 'Ce membre ne fait pas partie du groupe'; end if;
  if exists (select 1 from reservations r join books b on b.id = r.book_id
             where r.emprunteur_id = p_target_user_id and b.groupe_id = v_group
               and r.statut in ('Réservé','Actif','En retard')) then
    raise exception 'Ce membre a un emprunt en cours'; end if;
  if exists (select 1 from books b join reservations r on r.book_id = b.id
             where b.proprietaire_id = p_target_user_id and b.groupe_id = v_group
               and r.statut in ('Réservé','Actif','En retard')) then
    raise exception 'Un livre de ce membre est actuellement prêté'; end if;
  delete from group_members where group_id = v_group and user_id = p_target_user_id;
  insert into notifications (user_id, type, titre, message, lien_id)
  values (p_target_user_id, 'retire_du_groupe', 'Retiré du groupe',
          'Vous avez été retiré du groupe "' || g.nom || '" par l''administrateur.', g.id::text);
end; $$;
grant execute on function admin_remove_member(uuid, uuid) to authenticated;

create or replace function deactivate_own_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from reservations where emprunteur_id = auth.uid() and statut in ('Réservé','Actif')) then
    raise exception 'Réservations en cours — impossible de désactiver';
  end if;
  delete from group_members where user_id = auth.uid();
  perform set_config('app.bypass_role_lock','true',true);
  update profiles set compte_actif = false, groupe_id = null where id = auth.uid();
end; $$;

-- 9) Ajout de livre : tout MEMBRE d'un groupe peut ajouter ses livres à CE groupe ---------
-- Avant : la politique exigeait déjà le rôle « proprietaire » ou « administrateur » -> un nouveau
-- membre ne pouvait jamais ajouter son premier livre (et donc l'auto-promotion
-- trg_auto_promote, qui s'exécute APRÈS l'insertion, ne se déclenchait jamais).
-- Et rien n'empêchait d'ajouter un livre dans un groupe dont on n'est pas membre.
drop policy if exists "books_insert_owner" on books;
create policy "books_insert_owner" on books for insert with check (
  (auth.uid() = proprietaire_id and groupe_id in (select my_group_ids()))
  or exists (select 1 from groups g where g.id = groupe_id and g.admin_id = auth.uid())
);

-- Lecture numérique : même règle multi-groupes que le reste
drop policy if exists "book_access_insert_own" on book_access;
create policy "book_access_insert_own" on book_access for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from books b
      where b.id = book_id
        and b.type = 'numerique'
        and b.prix_lecture = 0
        and b.groupe_id in (select my_group_ids())
    )
  );
