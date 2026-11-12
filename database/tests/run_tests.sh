#!/bin/bash
# Rejoue schema.sql + migrations 002..009 sur une base PostgreSQL 15+ JETABLE puis les tests SQL.
# Chaque test repart d'une base neuve (ils modifient les données).
# Usage :  PGHOST=localhost PGPORT=5432 PGUSER=postgres ./run_tests.sh
# ATTENTION : supprime et recrée la base « pe_test ». Ne JAMAIS la pointer vers Supabase.
set -u
cd "$(dirname "$0")"
DB=pe_test
P="psql -q -v ON_ERROR_STOP=0"
build() {
  $P -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
  $P -d $DB -f pg_stub.sql 2>&1 | grep -i error
  $P -d $DB -f ../schema.sql 2>&1 | grep -i error
  $P -d $DB -f seed.sql 2>&1 | grep -i error
  for m in ../migrations/00[2-9]_*.sql; do $P -d $DB -f "$m" 2>&1 | grep -i "error" | sed "s|^|$m : |"; done
  $P -d $DB -c "grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated; grant all on all functions in schema public to authenticated; grant select on auth.users to authenticated;" >/dev/null 2>&1
}
for t in test003 test004 test007 smoke; do
  build
  echo "== $t.sql — chaque erreur ci-dessous doit être précédée d'un titre « doit échouer / refuser »"
  $P -d $DB -f $t.sql 2>&1 | grep -i -B1 error | grep -v "^--$"
done
