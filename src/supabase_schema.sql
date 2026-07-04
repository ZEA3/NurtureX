-- =============================================================
-- NurtureX — Database Schema (v3.1)
-- AI-Based Smart Maternal & Infant Healthcare System
-- =============================================================
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- It is idempotent: safe to run repeatedly.
--
-- v3.1 adds: appointments, medical_notes, clinic_* fields on profiles.
--
-- Adds all healthcare-domain tables on top of v2:
--   profiles, patients, infants, vaccinations, growth_records,
--   feeding_logs, alerts, appointments, medical_notes.
--   All with RLS for the 2-role system
--   (admin sees all; doctor sees only their assigned data).
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. Self-repair  (handles partial state from a failed earlier run)
-- ─────────────────────────────────────────────────────────────
-- If a previous run of this file failed mid-way, you might have one
-- of the healthcare tables existing without all its columns. That
-- causes errors like "column infant_id does not exist" or
-- "column patient_id does not exist" on the create-index statements.
--
-- We check every healthcare table against its required columns. If
-- any required column is missing, we drop and rebuild the whole set.
-- Safe because these tables are new and should have no production
-- data yet.
do $$
declare
  v_repair  boolean := false;
  v_missing record;
begin
  for v_missing in
    with required(t, c) as (values
      ('patients',       'id'), ('patients',       'doctor_id'),  ('patients',       'full_name'),
      ('infants',        'id'), ('infants',        'mother_id'),  ('infants',        'doctor_id'),  ('infants',        'name'),
      ('vaccinations',   'id'), ('vaccinations',   'infant_id'),  ('vaccinations',   'vaccine_name'),
      ('growth_records', 'id'), ('growth_records', 'infant_id'),  ('growth_records', 'measured_at'),
      ('feeding_logs',   'id'), ('feeding_logs',   'infant_id'),  ('feeding_logs',   'fed_at'),
      ('alerts',         'id'), ('alerts',         'doctor_id'),  ('alerts',         'infant_id'),  ('alerts',         'patient_id'),  ('alerts',         'subject'),
      ('appointments',   'id'), ('appointments',   'doctor_id'),  ('appointments',   'patient_id'), ('appointments',   'infant_id'),   ('appointments',   'scheduled_at'),
      ('medical_notes',  'id'), ('medical_notes',  'doctor_id'),  ('medical_notes',  'patient_id'), ('medical_notes',  'infant_id'),   ('medical_notes',  'title'),       ('medical_notes', 'content'),
      ('messages',       'id'), ('messages',       'doctor_id'),  ('messages',       'patient_id'), ('messages',       'sender'),      ('messages',       'content')
    )
    select r.t as table_name, r.c as column_name
    from required r
    where exists (
      select 1 from information_schema.tables ti
      where ti.table_schema = 'public' and ti.table_name = r.t
    )
    and not exists (
      select 1 from information_schema.columns ci
      where ci.table_schema = 'public' and ci.table_name = r.t and ci.column_name = r.c
    )
    limit 1
  loop
    v_repair := true;
    raise notice 'self-repair: % is missing column %', v_missing.table_name, v_missing.column_name;
  end loop;

  if v_repair then
    raise notice 'self-repair: dropping all healthcare tables for rebuild';
    drop table if exists public.messages        cascade;
    drop table if exists public.medical_notes   cascade;
    drop table if exists public.appointments    cascade;
    drop table if exists public.alerts          cascade;
    drop table if exists public.feeding_logs    cascade;
    drop table if exists public.growth_records  cascade;
    drop table if exists public.vaccinations    cascade;
    drop table if exists public.infants         cascade;
    drop table if exists public.patients        cascade;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────
-- 1. profiles  (admin + doctor accounts)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        text not null default 'doctor'
              check (role in ('admin', 'doctor', 'doctor_archived')),
  status      text not null default 'active'
              check (status in ('active', 'inactive', 'suspended')),
  phone       text,
  specialty   text,
  bio         text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- v2 -> v3: ensure all columns exist on pre-existing installs
alter table public.profiles add column if not exists avatar_url     text;
alter table public.profiles add column if not exists phone          text;
alter table public.profiles add column if not exists specialty      text;
alter table public.profiles add column if not exists status         text default 'active';
alter table public.profiles add column if not exists bio            text;
alter table public.profiles add column if not exists email          text;
alter table public.profiles add column if not exists updated_at     timestamptz default now();
-- v3.1: clinic info on doctor profiles
alter table public.profiles add column if not exists clinic_name    text;
alter table public.profiles add column if not exists clinic_address text;
alter table public.profiles add column if not exists clinic_phone   text;

create index if not exists profiles_role_idx       on public.profiles(role);
create index if not exists profiles_status_idx     on public.profiles(status);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 2. patients  (mothers)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles(id) on delete set null,
  full_name   text not null,
  email       text,
  phone       text,
  age         integer check (age between 0 and 120),
  due_date    date,
  blood_type  text,
  notes       text,
  status      text not null default 'active'
              check (status in ('active', 'discharged', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists patients_doctor_idx     on public.patients(doctor_id);
create index if not exists patients_status_idx     on public.patients(status);
create index if not exists patients_created_at_idx on public.patients(created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 3. infants
-- ─────────────────────────────────────────────────────────────
create table if not exists public.infants (
  id              uuid primary key default gen_random_uuid(),
  mother_id       uuid references public.patients(id) on delete cascade,
  doctor_id       uuid references public.profiles(id) on delete set null,
  name            text not null,
  date_of_birth   date,
  gender          text check (gender in ('male', 'female', 'other')),
  birth_weight_kg numeric(5,3),
  birth_height_cm numeric(5,2),
  blood_type      text,
  notes           text,
  status          text not null default 'monitoring'
                  check (status in ('monitoring', 'healthy', 'at_risk', 'critical')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists infants_doctor_idx on public.infants(doctor_id);
create index if not exists infants_mother_idx on public.infants(mother_id);
create index if not exists infants_status_idx on public.infants(status);


-- ─────────────────────────────────────────────────────────────
-- 4. vaccinations
-- ─────────────────────────────────────────────────────────────
create table if not exists public.vaccinations (
  id                uuid primary key default gen_random_uuid(),
  infant_id         uuid not null references public.infants(id) on delete cascade,
  vaccine_name      text not null,
  scheduled_date    date,
  administered_date date,
  status            text not null default 'scheduled'
                    check (status in ('scheduled', 'administered', 'overdue', 'skipped')),
  notes             text,
  created_at        timestamptz not null default now()
);
create index if not exists vaccinations_infant_idx    on public.vaccinations(infant_id);
create index if not exists vaccinations_status_idx    on public.vaccinations(status);
create index if not exists vaccinations_scheduled_idx on public.vaccinations(scheduled_date);


-- ─────────────────────────────────────────────────────────────
-- 5. growth_records  (periodic measurements)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.growth_records (
  id                  uuid primary key default gen_random_uuid(),
  infant_id           uuid not null references public.infants(id) on delete cascade,
  measured_at         date not null default current_date,
  weight_kg           numeric(5,3),
  height_cm           numeric(5,2),
  head_circumference  numeric(5,2),
  notes               text,
  created_at          timestamptz not null default now()
);
create index if not exists growth_infant_idx       on public.growth_records(infant_id);
create index if not exists growth_measured_at_idx  on public.growth_records(measured_at desc);


-- ─────────────────────────────────────────────────────────────
-- 6. feeding_logs
-- ─────────────────────────────────────────────────────────────
create table if not exists public.feeding_logs (
  id          uuid primary key default gen_random_uuid(),
  infant_id   uuid not null references public.infants(id) on delete cascade,
  fed_at      timestamptz not null default now(),
  feed_type   text check (feed_type in ('breast', 'formula', 'solid', 'mixed')),
  amount_ml   integer,
  duration_min integer,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists feeding_infant_idx on public.feeding_logs(infant_id);
create index if not exists feeding_fed_at_idx on public.feeding_logs(fed_at desc);


-- ─────────────────────────────────────────────────────────────
-- 7. alerts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles(id) on delete set null,
  infant_id   uuid references public.infants(id) on delete cascade,
  patient_id  uuid references public.patients(id) on delete cascade,
  subject     text not null,
  message     text,
  severity    text not null default 'info'
              check (severity in ('info', 'warning', 'critical')),
  source      text default 'system'
              check (source in ('system', 'manual', 'ai')),
  status      text not null default 'open'
              check (status in ('open', 'acknowledged', 'resolved')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists alerts_doctor_idx     on public.alerts(doctor_id);
create index if not exists alerts_infant_idx     on public.alerts(infant_id);
create index if not exists alerts_status_idx     on public.alerts(status);
create index if not exists alerts_severity_idx   on public.alerts(severity);
create index if not exists alerts_created_at_idx on public.alerts(created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 7b. appointments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references public.profiles(id) on delete set null,
  patient_id    uuid references public.patients(id) on delete cascade,
  infant_id     uuid references public.infants(id)  on delete cascade,
  scheduled_at  timestamptz not null,
  duration_min  integer default 30,
  appt_type     text not null default 'checkup'
                check (appt_type in ('checkup','vaccination','consultation','follow_up','other')),
  status        text not null default 'scheduled'
                check (status in ('scheduled','completed','canceled','no_show')),
  location      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists appointments_doctor_idx       on public.appointments(doctor_id);
create index if not exists appointments_patient_idx      on public.appointments(patient_id);
create index if not exists appointments_infant_idx       on public.appointments(infant_id);
create index if not exists appointments_scheduled_idx    on public.appointments(scheduled_at);
create index if not exists appointments_status_idx       on public.appointments(status);


-- ─────────────────────────────────────────────────────────────
-- 7c. medical_notes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.medical_notes (
  id              uuid primary key default gen_random_uuid(),
  doctor_id       uuid references public.profiles(id) on delete set null,
  patient_id      uuid references public.patients(id) on delete cascade,
  infant_id       uuid references public.infants(id)  on delete cascade,
  title           text not null,
  content         text not null,
  recommendations text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists medical_notes_doctor_idx   on public.medical_notes(doctor_id);
create index if not exists medical_notes_patient_idx  on public.medical_notes(patient_id);
create index if not exists medical_notes_infant_idx   on public.medical_notes(infant_id);
create index if not exists medical_notes_created_idx  on public.medical_notes(created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 7d. messages   (doctor ↔ patient thread)
-- ─────────────────────────────────────────────────────────────
-- Patients (mothers) don't have logins yet — this table stores the
-- doctor's outgoing messages and any incoming responses (logged
-- manually or via a future SMS/email integration).
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles(id) on delete set null,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  sender      text not null check (sender in ('doctor','patient','system')),
  content     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists messages_doctor_idx     on public.messages(doctor_id);
create index if not exists messages_patient_idx    on public.messages(patient_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 8. updated_at triggers
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists patients_touch_updated_at on public.patients;
create trigger patients_touch_updated_at
  before update on public.patients
  for each row execute function public.touch_updated_at();

drop trigger if exists infants_touch_updated_at on public.infants;
create trigger infants_touch_updated_at
  before update on public.infants
  for each row execute function public.touch_updated_at();

drop trigger if exists appointments_touch_updated_at on public.appointments;
create trigger appointments_touch_updated_at
  before update on public.appointments
  for each row execute function public.touch_updated_at();

drop trigger if exists medical_notes_touch_updated_at on public.medical_notes;
create trigger medical_notes_touch_updated_at
  before update on public.medical_notes
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 9. Auto-create profile row on auth.users insert
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'doctor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 10. Helper: is the current user an admin?
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- 11. Row Level Security
--     Strategy:
--       admin     → full access on every healthcare table
--       doctor    → can read/write rows where doctor_id = auth.uid()
--                   and child rows whose parent belongs to them
-- ─────────────────────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "users read own profile"   on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "admins manage all profiles" on public.profiles;
create policy "admins manage all profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- patients
alter table public.patients enable row level security;

drop policy if exists "doctors rw own patients" on public.patients;
create policy "doctors rw own patients" on public.patients
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all patients" on public.patients;
create policy "admins manage all patients" on public.patients
  for all using (public.is_admin()) with check (public.is_admin());

-- infants
alter table public.infants enable row level security;

drop policy if exists "doctors rw own infants" on public.infants;
create policy "doctors rw own infants" on public.infants
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all infants" on public.infants;
create policy "admins manage all infants" on public.infants
  for all using (public.is_admin()) with check (public.is_admin());

-- vaccinations  (gated through the parent infant's doctor_id)
alter table public.vaccinations enable row level security;

drop policy if exists "doctors rw own infants vaccinations" on public.vaccinations;
create policy "doctors rw own infants vaccinations" on public.vaccinations
  for all
  using (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ));

drop policy if exists "admins manage all vaccinations" on public.vaccinations;
create policy "admins manage all vaccinations" on public.vaccinations
  for all using (public.is_admin()) with check (public.is_admin());

-- growth_records
alter table public.growth_records enable row level security;

drop policy if exists "doctors rw own infants growth" on public.growth_records;
create policy "doctors rw own infants growth" on public.growth_records
  for all
  using (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ));

drop policy if exists "admins manage all growth" on public.growth_records;
create policy "admins manage all growth" on public.growth_records
  for all using (public.is_admin()) with check (public.is_admin());

-- feeding_logs
alter table public.feeding_logs enable row level security;

drop policy if exists "doctors rw own infants feedings" on public.feeding_logs;
create policy "doctors rw own infants feedings" on public.feeding_logs
  for all
  using (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.infants i
    where i.id = infant_id and i.doctor_id = auth.uid()
  ));

drop policy if exists "admins manage all feedings" on public.feeding_logs;
create policy "admins manage all feedings" on public.feeding_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- alerts
alter table public.alerts enable row level security;

drop policy if exists "doctors rw own alerts" on public.alerts;
create policy "doctors rw own alerts" on public.alerts
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all alerts" on public.alerts;
create policy "admins manage all alerts" on public.alerts
  for all using (public.is_admin()) with check (public.is_admin());

-- appointments
alter table public.appointments enable row level security;

drop policy if exists "doctors rw own appointments" on public.appointments;
create policy "doctors rw own appointments" on public.appointments
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all appointments" on public.appointments;
create policy "admins manage all appointments" on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

-- medical_notes
alter table public.medical_notes enable row level security;

drop policy if exists "doctors rw own medical_notes" on public.medical_notes;
create policy "doctors rw own medical_notes" on public.medical_notes
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all medical_notes" on public.medical_notes;
create policy "admins manage all medical_notes" on public.medical_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- messages
alter table public.messages enable row level security;

drop policy if exists "doctors rw own messages" on public.messages;
create policy "doctors rw own messages" on public.messages
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

drop policy if exists "admins manage all messages" on public.messages;
create policy "admins manage all messages" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- 12. avatars storage bucket
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner upload" on storage.objects;
create policy "avatars owner upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars admin all" on storage.objects;
create policy "avatars admin all" on storage.objects
  for all
  using (bucket_id = 'avatars' and public.is_admin())
  with check (bucket_id = 'avatars' and public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- 13. Bootstrap your first admin
-- ─────────────────────────────────────────────────────────────
-- After running this whole file you have NO admins yet.
-- Quickest path:
--   1. Authentication → Users → "Add user" → enter email + password
--   2. SQL Editor:
--        update public.profiles
--          set role = 'admin', status = 'active'
--          where email = 'you@example.com';
