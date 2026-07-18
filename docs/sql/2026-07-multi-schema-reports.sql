-- Migracja: raporty wieloschematowe (kaskada priorytetów / wagi procentowe)
-- Uruchomić ręcznie w Supabase SQL Editor (projekt cukohoqgvcsvmopvivjt).
-- Bezpieczna dla istniejących danych: nowe kolumny nullable, stare raporty
-- pozostają bez zmian (schema_id/schema_name = null → UI nie pokazuje etykiet).

-- 1. Pochodzenie każdego wpisu raportu (schemat, z którego wygenerowano wiersz)
alter table timesheet.report_entries
  add column if not exists schema_id uuid
    references timesheet.schemas(id) on delete set null;

alter table timesheet.report_entries
  add column if not exists schema_name text;

comment on column timesheet.report_entries.schema_id is
  'Schemat, z którego pochodzi wpis (null: raport sprzed wersji multi lub pozycja spoza schematu)';
comment on column timesheet.report_entries.schema_name is
  'Nazwa schematu w momencie generowania (snapshot — odporna na zmianę nazwy/usunięcie schematu)';

-- 2. Konfiguracja generatora na raporcie (tryb, lista schematów, priorytety, wagi)
alter table timesheet.reports
  add column if not exists generation_config jsonb;

comment on column timesheet.reports.generation_config is
  'Ustawienia kreatora: {mode: cascade|weights, max_hours_per_day, schemas: [{schema_id, schema_name, priority, weight}]}';

-- 3. Odśwież cache PostgREST (bez tego API nie zobaczy nowych kolumn!)
notify pgrst, 'reload schema';
