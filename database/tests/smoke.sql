\set ON_ERROR_STOP off
update profiles set phone='690000001' where id='aaaaaaaa-0000-0000-0000-000000000001';
update profiles set phone='690000002' where id='bbbbbbbb-0000-0000-0000-000000000002';
set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
\echo '--- B réserve'
select statut from create_reservation('dddddddd-0000-0000-0000-000000000004'::uuid, null) \gset
select id as rid from reservations limit 1 \gset
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
\echo '--- A: téléphone emprunteur, accepte'
select get_reservation_contact_phone(:'rid'::uuid);
select statut from respond_to_reservation(:'rid'::uuid, true, null);
\echo '--- A marque retourné'
select statut, etat_retour from mark_book_returned(:'rid'::uuid, 'Endommagé', null, 'page déchirée');
select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
\echo '--- B conteste (litige)'
select confirme_par_emprunteur from confirm_book_return(:'rid'::uuid, false, 'pas daccord');
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
\echo '--- A résout le litige'
select litige_resolu from resolve_dispute(:'rid'::uuid, 'ok', true);
\echo '--- demande dadhésion : B -> (autre groupe) refus'
reset role;
insert into groups(id,nom,admin_id,code_acces) values ('88888888-0000-0000-0000-000000000008','Groupe Deux','aaaaaaaa-0000-0000-0000-000000000001','X2');
insert into group_join_requests(id,group_id,user_id) values ('77777777-0000-0000-0000-000000000007','88888888-0000-0000-0000-000000000008','bbbbbbbb-0000-0000-0000-000000000002');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select reject_join_request('77777777-0000-0000-0000-000000000007'::uuid);
\echo '--- approbation (2e demande)'
reset role; update group_join_requests set statut='en_attente' where id='77777777-0000-0000-0000-000000000007';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select approve_join_request('77777777-0000-0000-0000-000000000007'::uuid);
select count(*) as B_membre_G_deux from group_members where user_id='bbbbbbbb-0000-0000-0000-000000000002' and group_id='88888888-0000-0000-0000-000000000008';
\echo '--- admin: solde / rôle (A nest pas administrateur -> doit refuser)'
select admin_adjust_balance('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 500, 'test');
reset role; update profiles set role='administrateur' where id='aaaaaaaa-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select admin_adjust_balance('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 500, 'test');
select admin_set_user_role('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'membre');
reset role;
\echo '--- tâches planifiées'
select check_reservation_deadlines();
select send_weekly_admin_report();
select count(*) as notifications_total from notifications;
