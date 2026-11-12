\set ON_ERROR_STOP off
\echo '=== B réserve (livre 1, sans caution)'
set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false);
select statut, montant_caution, montant_location, caution_payee, duree_pret_jours from create_reservation('dddddddd-0000-0000-0000-000000000004'::uuid, null);
select statut as statut_livre from books where id='dddddddd-0000-0000-0000-000000000004';
\echo '=== B tente de tricher (doit échouer à chaque fois)'
update reservations set montant_caution=0 where emprunteur_id='bbbbbbbb-0000-0000-0000-000000000002';
update reservations set statut='Retourné' where emprunteur_id='bbbbbbbb-0000-0000-0000-000000000002';
update reservations set caution_payee=true, caution_remboursee=true where emprunteur_id='bbbbbbbb-0000-0000-0000-000000000002';
\echo '=== B réserve son propre livre / un livre indisponible (doit échouer)'
select create_reservation('dddddddd-0000-0000-0000-000000000004'::uuid, null);
\echo '=== B voit les profils de son groupe, pas anon'
select count(*) as vus_par_B from profiles_public;
reset role; set role anon; select count(*) from profiles_public;
select count(*) as groupes_vus_anon from groups_public;
reset role;
\echo '=== A (propriétaire) accepte via RPC (doit marcher) puis tente de modifier un montant (doit échouer)'
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false);
select statut from respond_to_reservation((select id from reservations limit 1), true, null);
update reservations set montant_location=99999;
update reservations set notes='ok propriétaire';
reset role;
\echo '=== Livre avec caution 2000 : A confirme la caution (doit marcher), B ne peut pas'
insert into books(id,titre,auteur,proprietaire_id,groupe_id,montant_caution) values ('eeeeeeee-0000-0000-0000-000000000005','Livre2','Auteur','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000003',2000);
set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false);
select montant_caution, caution_payee from create_reservation('eeeeeeee-0000-0000-0000-000000000005'::uuid, null);
update reservations set caution_payee=true where book_id='eeeeeeee-0000-0000-0000-000000000005';
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false);
update reservations set caution_payee=true where book_id='eeeeeeee-0000-0000-0000-000000000005' returning caution_payee;
reset role;
