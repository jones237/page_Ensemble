insert into auth.users(id,email) values
 ('aaaaaaaa-0000-0000-0000-000000000001','owner@t'),
 ('bbbbbbbb-0000-0000-0000-000000000002','borrower@t');
select set_config('app.bypass_role_lock','true',false);
update profiles set role='proprietaire' where id='aaaaaaaa-0000-0000-0000-000000000001';
insert into groups(id,nom,admin_id,code_acces) values ('cccccccc-0000-0000-0000-000000000003','Groupe Test','aaaaaaaa-0000-0000-0000-000000000001','CODE1234');
update profiles set groupe_id='cccccccc-0000-0000-0000-000000000003';
insert into books(id,titre,auteur,proprietaire_id,groupe_id) values ('dddddddd-0000-0000-0000-000000000004','Livre1','Auteur','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000003');
