-- ============================================================
-- Rattacher un ANCIEN profil (sans compte de connexion) à un NOUVEAU compte
-- Cas : les 93 livres et le groupe appartiennent au profil de Jonathan Eden
--       (f78719e6-0b9c-4204-9bb0-aba96b296d22), mais auth.users est vide.
--       Jonathan s'inscrit avec son e-mail -> un nouveau profil est créé par
--       le trigger on_auth_user_created -> ce script y déplace tout.
--
-- MODE D'EMPLOI
--  1. Jonathan s'inscrit dans l'application (nouvel e-mail ou ancien, peu importe).
--  2. Remplacer EMAIL_DE_JONATHAN ci-dessous par l'e-mail utilisé à l'inscription.
--  3. Exécuter dans Supabase > SQL Editor.
--  4. Le script déplace livres, groupe, réservations, notifications, etc., recopie nom,
--     téléphone, rôle, solde, puis SUPPRIME l'ancien profil. Il s'arrête avec une erreur
--     (rien n'est modifié) si le nouveau profil n'existe pas.
-- À lancer avec le rôle postgres (SQL Editor) : les protections des utilisateurs ne s'appliquent pas.
-- ============================================================
do $$
declare
  v_old uuid := 'f78719e6-0b9c-4204-9bb0-aba96b296d22';
  v_email text := 'EMAIL_DE_JONATHAN';   -- l'e-mail avec lequel il s'est inscrit
  v_new uuid;
  o profiles; f record; n int; rapport text := '';
begin
  select id into v_new from auth.users where lower(email) = lower(v_email);
  if v_new is null then raise exception 'Aucun compte avec l''e-mail %', v_email; end if;
  if v_new = v_old then raise exception 'Ancien et nouvel identifiant identiques'; end if;
  select * into o from profiles where id = v_old;
  if o.id is null then raise exception 'Ancien profil introuvable'; end if;
  if not exists (select 1 from profiles where id = v_new) then
    raise exception 'Le nouveau profil % n''existe pas : le compte doit d''abord s''inscrire', v_new;
  end if;
  if exists (select 1 from auth.users where id = v_old) then
    raise exception 'L''ancien profil a déjà un compte de connexion : rien à rattacher';
  end if;

  perform set_config('app.bypass_role_lock', 'true', true);

  -- 1) le nouveau profil reprend les informations de l'ancien
  update profiles set nom_complet = o.nom_complet, phone = o.phone, role = o.role, solde = o.solde,
         avatar_url = o.avatar_url, bio = o.bio, notifications_actives = o.notifications_actives,
         compte_actif = o.compte_actif, groupe_id = o.groupe_id
   where id = v_new;

  -- 2) toutes les références à l'ancien profil (liste lue dans le catalogue, donc complète)
  for f in
    select c.conrelid::regclass::text as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass and array_length(c.conkey,1) = 1
      and c.conrelid <> 'public.profiles'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', f.tbl, f.col, f.col) using v_new, v_old;
    get diagnostics n = row_count;
    if n > 0 then rapport := rapport || f.tbl || '.' || f.col || '=' || n || '  '; end if;
  end loop;

  -- 3) l'ancien profil n'a plus rien : on le supprime
  delete from profiles where id = v_old;
  raise notice 'Rattachement terminé : %', rapport;
end $$;
