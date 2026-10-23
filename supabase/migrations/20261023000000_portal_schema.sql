-- Nata Studio client portal: schema, stage template, Row Level Security, storage rules.
--
-- Security model in one paragraph:
--   * RLS is enabled on every table. With RLS on, anything not explicitly allowed is denied.
--   * Admins (rows in public.admins) can read and write everything.
--   * Clients can only READ rows belonging to projects whose client_id is their own user id.
--   * Clients have no insert/update/delete policies anywhere. Their single write — answering an
--     approval — goes through public.respond_to_approval(), which validates every condition.
--   * Logged-out visitors (the "anon" role) have no table privileges at all.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.stage_status as enum ('not_started', 'in_progress', 'waiting_on_client', 'done');
create type public.payment_kind as enum ('deposit', 'final');
create type public.approval_status as enum ('pending', 'approved', 'changes_requested');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.clients (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique check (email = lower(email) and length(email) <= 254),
  name       text not null check (length(btrim(name)) between 1 and 120),
  company    text check (length(company) <= 120),
  created_at timestamptz not null default now()
);

create table public.projects (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients (id) on delete restrict,
  name                    text not null check (length(btrim(name)) between 1 and 120),
  summary                 text check (length(summary) <= 500),
  revision_rounds_allowed int  not null default 2 check (revision_rounds_allowed between 0 and 20),
  currency                text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index projects_client_id_idx on public.projects (client_id);

create table public.stages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  position     smallint not null check (position between 1 and 8),
  name         text not null,
  status       public.stage_status not null default 'not_started',
  due_date     date,
  note         text check (length(note) <= 280),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (project_id, position),
  -- Lets other tables reference (stage, project) together, so a payment or approval
  -- can never point at a stage from a different project.
  unique (id, project_id)
);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  kind         public.payment_kind not null,
  amount_cents int  not null default 0 check (amount_cents >= 0),
  stage_id     uuid not null,
  due_date     date,
  paid_at      timestamptz,
  updated_at   timestamptz not null default now(),
  unique (project_id, kind),
  foreign key (stage_id, project_id) references public.stages (id, project_id) on delete cascade
);

create table public.updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  body       text not null check (length(btrim(body)) between 1 and 2000),
  image_path text check (image_path like project_id::text || '/updates/%'),
  created_at timestamptz not null default now()
);
create index updates_project_created_idx on public.updates (project_id, created_at desc);

create table public.approvals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  stage_id       uuid,
  title          text not null check (length(btrim(title)) between 1 and 120),
  description    text check (length(description) <= 2000),
  image_path     text check (image_path like project_id::text || '/approvals/%'),
  status         public.approval_status not null default 'pending',
  client_comment text check (length(client_comment) <= 2000),
  responded_at   timestamptz,
  responded_by   uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  foreign key (stage_id, project_id) references public.stages (id, project_id) on delete set null (stage_id),
  check (status <> 'changes_requested' or length(btrim(client_comment)) > 0),
  check ((status = 'pending') = (responded_at is null))
);
create index approvals_project_created_idx on public.approvals (project_id, created_at desc);

create table public.files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  label        text not null check (length(btrim(label)) between 1 and 200),
  storage_path text not null unique check (storage_path like project_id::text || '/deliverables/%'),
  size_bytes   bigint check (size_bytes >= 0),
  mime_type    text,
  created_at   timestamptz not null default now()
);
create index files_project_created_idx on public.files (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger stages_updated_at before update on public.stages
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Keep completed_at in step with status.
create function public.stage_completed_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger stages_completed_at before insert or update of status on public.stages
  for each row execute function public.stage_completed_at();

-- Every new project gets the fixed 8-stage template plus its two payments.
-- Runs with the inserting user's rights (an admin, or the service role in the seed script).
create function public.create_project_template() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.stages (project_id, position, name)
  select new.id, t.position, t.name
  from (values
    (1, 'Discovery'),
    (2, 'Proposal & Deposit'),
    (3, 'Strategy & Moodboard'),
    (4, 'Concepts'),
    (5, 'Refinement'),
    (6, 'Mockups'),
    (7, 'Handoff & Final Payment'),
    (8, 'Follow-up')
  ) as t (position, name);

  insert into public.payments (project_id, kind, stage_id)
  select new.id, 'deposit'::public.payment_kind, s.id
  from public.stages s where s.project_id = new.id and s.position = 2;

  insert into public.payments (project_id, kind, stage_id)
  select new.id, 'final'::public.payment_kind, s.id
  from public.stages s where s.project_id = new.id and s.position = 7;

  return new;
end $$;

create trigger projects_create_template after insert on public.projects
  for each row execute function public.create_project_template();

-- ---------------------------------------------------------------------------
-- Access-check helpers
--
-- They live in a "private" schema, which Supabase does not expose over its HTTP API, so they
-- can be used inside policies but not called directly by anyone.
-- "security definer" = runs with the function owner's rights, so the check can look at
-- public.admins / public.projects without the caller needing access to those rows.
-- search_path = '' stops anyone from hijacking the function with look-alike tables.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create function private.owns_project(p_project_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and client_id = (select auth.uid())
  );
$$;

-- Storage paths look like "<project_id>/<kind>/<file>"; the first folder decides ownership.
create function private.owns_project_folder(p_object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects
    where id::text = split_part(p_object_name, '/', 1) and client_id = (select auth.uid())
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- Supabase grants broad privileges to "anon" and "authenticated" by default. We narrow them:
-- logged-out visitors get nothing, logged-in users get only the four row operations
-- (no TRUNCATE, which RLS would not cover). RLS then decides which rows.
-- ---------------------------------------------------------------------------

revoke all on public.admins, public.clients, public.projects, public.stages, public.payments,
  public.updates, public.approvals, public.files from anon, authenticated;
grant select, insert, update, delete on public.admins, public.clients, public.projects,
  public.stages, public.payments, public.updates, public.approvals, public.files to authenticated;
-- Nobody manages admins over the API; it's done in SQL. Logged-in users may only check themselves.
revoke insert, update, delete on public.admins from authenticated;

revoke execute on function public.set_updated_at(), public.stage_completed_at(),
  public.create_project_template() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security policies
-- ---------------------------------------------------------------------------

alter table public.admins    enable row level security;
alter table public.clients   enable row level security;
alter table public.projects  enable row level security;
alter table public.stages    enable row level security;
alter table public.payments  enable row level security;
alter table public.updates   enable row level security;
alter table public.approvals enable row level security;
alter table public.files     enable row level security;

create policy "admins: read own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- clients
create policy "clients: read self or admin" on public.clients
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy "clients: admin insert" on public.clients
  for insert to authenticated with check ((select private.is_admin()));
create policy "clients: admin update" on public.clients
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "clients: admin delete" on public.clients
  for delete to authenticated using ((select private.is_admin()));

-- projects
create policy "projects: read own or admin" on public.projects
  for select to authenticated using (client_id = (select auth.uid()) or (select private.is_admin()));
create policy "projects: admin insert" on public.projects
  for insert to authenticated with check ((select private.is_admin()));
create policy "projects: admin update" on public.projects
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "projects: admin delete" on public.projects
  for delete to authenticated using ((select private.is_admin()));

-- Project-scoped tables share the same four rules.
do $$
declare t text;
begin
  foreach t in array array['stages', 'payments', 'updates', 'approvals', 'files'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select private.is_admin()) or private.owns_project(project_id))',
      t || ': read own project or admin', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select private.is_admin()))',
      t || ': admin insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select private.is_admin())) with check ((select private.is_admin()))',
      t || ': admin update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select private.is_admin()))',
      t || ': admin delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- The one thing a client can change: their answer to an approval request.
--
-- Called from the app as an RPC (a database function the app calls directly).
-- Same error for "doesn't exist" and "not yours", so it can't be used to probe for ids.
-- ---------------------------------------------------------------------------

create function public.respond_to_approval(
  p_approval_id uuid,
  p_decision    public.approval_status,
  p_comment     text default null
) returns public.approvals
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_row     public.approvals;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_decision is null or p_decision = 'pending' then
    raise exception 'Choose approve or request changes' using errcode = '22023';
  end if;
  if p_decision = 'changes_requested' and v_comment is null then
    raise exception 'Please describe the changes you would like' using errcode = '22023';
  end if;
  if length(v_comment) > 2000 then
    raise exception 'Comment is too long' using errcode = '22023';
  end if;

  -- Lock the row so two quick taps can't record two answers.
  select a.* into v_row
  from public.approvals a
  join public.projects p on p.id = a.project_id
  where a.id = p_approval_id and p.client_id = v_uid
  for update of a;

  if not found then
    raise exception 'Approval not found' using errcode = 'P0002';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'This has already been answered' using errcode = '55000';
  end if;

  update public.approvals
  set status = p_decision,
      client_comment = v_comment,
      responded_at = now(),
      responded_by = v_uid
  where id = p_approval_id
  returning * into v_row;

  return v_row;
end $$;

revoke execute on function public.respond_to_approval(uuid, public.approval_status, text) from public, anon;
grant execute on function public.respond_to_approval(uuid, public.approval_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket. Objects are only reachable through short-lived signed URLs,
-- and creating a signed URL is itself subject to the read policy below.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files', 'project-files', false, 52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/postscript'
  ]
)
on conflict (id) do nothing;

create policy "project-files: read own project or admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files'
         and ((select private.is_admin()) or private.owns_project_folder(name)));

create policy "project-files: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and (select private.is_admin()));

create policy "project-files: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-files' and (select private.is_admin()))
  with check (bucket_id = 'project-files' and (select private.is_admin()));

create policy "project-files: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-files' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Admin: create (or reuse) a client and give them a new project, in one transaction,
-- so a failure halfway can't leave a client without a project or a project without amounts.
-- "security invoker" = runs with the caller's own rights, so the admin-only RLS policies apply.
-- ---------------------------------------------------------------------------

create function public.create_client_project(
  p_client_id      uuid,
  p_email          text,
  p_client_name    text,
  p_company        text,
  p_project_name   text,
  p_summary        text,
  p_deposit_cents  int,
  p_final_cents    int,
  p_currency       text,
  p_revision_rounds int
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_project_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  insert into public.clients (id, email, name, company)
  values (p_client_id, lower(btrim(p_email)), btrim(p_client_name), nullif(btrim(p_company), ''))
  on conflict (id) do update
    set name = excluded.name, company = coalesce(excluded.company, public.clients.company);

  insert into public.projects (client_id, name, summary, currency, revision_rounds_allowed)
  values (p_client_id, btrim(p_project_name), nullif(btrim(p_summary), ''), p_currency, p_revision_rounds)
  returning id into v_project_id;

  update public.payments set amount_cents = p_deposit_cents
  where project_id = v_project_id and kind = 'deposit';
  update public.payments set amount_cents = p_final_cents
  where project_id = v_project_id and kind = 'final';

  return v_project_id;
end $$;

revoke execute on function public.create_client_project(uuid, text, text, text, text, text, int, int, text, int) from public, anon;
grant execute on function public.create_client_project(uuid, text, text, text, text, text, int, int, text, int) to authenticated;
