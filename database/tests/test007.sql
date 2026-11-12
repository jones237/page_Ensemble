\set ON_ERROR_STOP off
\echo '=== 007. Un nouvel utilisateur E essaie 10 mauvais codes, puis le bon (doit être bloqué)'
insert into auth.users(id,email) values ('eeeeeeee-0000-0000-0000-000000000005','eric@t'),('ffffffff-0000-0000-0000-000000000006','fanny@t');
set role authenticated; select set_config('request.jwt.claim.sub','eeeeeeee-0000-0000-0000-000000000005',false) \gset
select count(*) as mauvais_code_renvoie_0_ligne from join_group_by_code('ZZZZZZZZ');
select count(*) filter (where true) as essais_2_a_10 from (select join_group_by_code('AAAA000'||g) from generate_series(1,9) g) s;
\echo '--- 11e essai avec le BON code : doit échouer (Trop de tentatives)'
select * from join_group_by_code('CODE1234');
reset role;
\echo '=== 007b. Un autre utilisateur F avec le bon code (minuscules + espaces) : doit réussir'
set role authenticated; select set_config('request.jwt.claim.sub','ffffffff-0000-0000-0000-000000000006',false) \gset
select nom as groupe_rejoint_attendu_Groupe_Test from join_group_by_code('  code1234 ');
reset role;
select count(*) as membres_attendu_3_ou_plus from group_members where group_id='cccccccc-0000-0000-0000-000000000003';
