\set ON_ERROR_STOP off
\pset format aligned
\echo '=== 0. Après migration : backfill des appartenances'
select (select count(*) from group_members) as membres_G1_attendus_2;
\echo '=== 1. B crée un groupe G2 : devient membre + actif + code auto'
set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
insert into groups(id,nom,admin_id) values ('99999999-0000-0000-0000-000000000009','Club de lecture','bbbbbbbb-0000-0000-0000-000000000002');
select (select count(*) from group_members where user_id='bbbbbbbb-0000-0000-0000-000000000002') as B_nb_groupes_attendu_2,
       (select groupe_id from profiles where id='bbbbbbbb-0000-0000-0000-000000000002')='99999999-0000-0000-0000-000000000009' as B_actif_G2,
       (select length(code_acces) from groups where id='99999999-0000-0000-0000-000000000009') as longueur_code_8;
\echo '=== 2. B (actif G2) voit toujours les livres de G1 (membre des deux)'
select count(*) as livres_visibles_attendu_1 from books;
\echo '=== 3. B bascule vers G1, puis tente un groupe dont il nest pas membre (doit échouer)'
select switch_active_group('cccccccc-0000-0000-0000-000000000003');
select (select groupe_id from profiles where id='bbbbbbbb-0000-0000-0000-000000000002')='cccccccc-0000-0000-0000-000000000003' as B_actif_G1;
select switch_active_group(gen_random_uuid());
\echo '=== 4. B ne peut pas sinscrire lui-même dans un groupe (doit échouer)'
insert into group_members(group_id,user_id) values ('cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000002');
reset role;
\echo '=== 5. A rejoint G2 par code : membre des deux, actif = G2'
update groups set code_acces='CLUB2026' where id='99999999-0000-0000-0000-000000000009';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select nom from join_group_by_code('CLUB2026');
select (select count(*) from group_members where user_id='aaaaaaaa-0000-0000-0000-000000000001') as A_nb_groupes_attendu_2,
       (select groupe_id from profiles where id='aaaaaaaa-0000-0000-0000-000000000001')='99999999-0000-0000-0000-000000000009' as A_actif_G2;
\echo '=== 6. profiles_public vu par A : une ligne par (personne,groupe)'
select p.nom_complet, (select nom from groups g where g.id=p.groupe_id) as groupe from profiles_public p order by 1,2;
\echo '=== 7. B réserve un livre de G1 (G1 actif ou non, il en est membre) — doit marcher'
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
select statut from create_reservation('dddddddd-0000-0000-0000-000000000004'::uuid, null);
\echo '=== 8. A quitte G2 (actif) : autorisé, le groupe actif retombe sur G1'
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select leave_group();
select (select groupe_id from profiles where id='aaaaaaaa-0000-0000-0000-000000000001')='cccccccc-0000-0000-0000-000000000003' as A_retombe_sur_G1,
       (select count(*) from group_members where user_id='aaaaaaaa-0000-0000-0000-000000000001') as A_nb_groupes_attendu_1;
\echo '=== 9. A (admin de G1) ne peut pas quitter G1 (doit échouer)'
select leave_group();
\echo '=== 10. A re-rejoint G2 ; B (admin G2) le retire avec p_group_id ; puis B supprime G2'
select nom from join_group_by_code('CLUB2026');
select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
select admin_remove_member('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '99999999-0000-0000-0000-000000000009'::uuid);
select (select count(*) from group_members where group_id='99999999-0000-0000-0000-000000000009') as membres_G2_attendu_1;
select delete_group('99999999-0000-0000-0000-000000000009');
select (select count(*) from groups) as groupes_attendu_1,
       (select groupe_id from profiles where id='bbbbbbbb-0000-0000-0000-000000000002')='cccccccc-0000-0000-0000-000000000003' as B_actif_retombe_G1;
reset role;
\echo '=== 11. anon ne voit pas group_members ni profiles_public'
set role anon; select count(*) from group_members; select count(*) from profiles_public;
