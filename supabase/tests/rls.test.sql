-- Access-control tests. Run with: npx supabase test db
-- Everything happens inside a transaction that is rolled back, so no data is left behind.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- ---------------------------------------------------------------------------
-- Fixtures (created as the database owner, which bypasses RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'alice@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'bob@test.local');

insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000a');
insert into public.clients (id, email, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice@test.local', 'Alice'),
  ('00000000-0000-0000-0000-0000000000b1', 'bob@test.local', 'Bob');

insert into public.projects (id, client_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Alice brand'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Bob brand');

insert into public.updates (project_id, body) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Hi Alice'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Hi Bob');

insert into public.approvals (id, project_id, title) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice concepts'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice logo'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000001', 'Bob concepts');

insert into public.files (project_id, label, storage_path) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alice logo pack', 'aaaaaaaa-0000-0000-0000-000000000001/deliverables/logo.zip'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Bob logo pack', 'bbbbbbbb-0000-0000-0000-000000000001/deliverables/logo.zip');

insert into storage.objects (bucket_id, name) values
  ('project-files', 'aaaaaaaa-0000-0000-0000-000000000001/deliverables/logo.zip'),
  ('project-files', 'bbbbbbbb-0000-0000-0000-000000000001/deliverables/logo.zip');

-- ---------------------------------------------------------------------------
-- Template trigger
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.stages where project_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  8, 'new project gets 8 stages');
select results_eq(
  $$ select p.kind::text, s.position::int from public.payments p join public.stages s on s.id = p.stage_id
     where p.project_id = 'aaaaaaaa-0000-0000-0000-000000000001' order by p.kind $$,
  $$ values ('deposit', 2), ('final', 7) $$,
  'deposit is tied to stage 2 and final payment to stage 7');

-- ---------------------------------------------------------------------------
-- Integrity: rows can't point across projects
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.payments set stage_id = (select id from public.stages
       where project_id = 'bbbbbbbb-0000-0000-0000-000000000001' and position = 2)
     where project_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'deposit' $$,
  '23503', null, 'a payment cannot be tied to another project''s stage');
select throws_ok(
  $$ insert into public.files (project_id, label, storage_path) values
     ('aaaaaaaa-0000-0000-0000-000000000001', 'sneaky', 'bbbbbbbb-0000-0000-0000-000000000001/deliverables/x.zip') $$,
  '23514', null, 'a file row cannot point into another project''s folder');

-- ---------------------------------------------------------------------------
-- As Alice (client)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select results_eq($$ select name from public.projects $$, $$ values ('Alice brand') $$,
  'client sees only their own project');
select is((select count(*)::int from public.clients), 1, 'client sees only their own client row');
select is((select count(*)::int from public.stages), 8, 'client sees only their own 8 stages');
select is((select count(*)::int from public.payments), 2, 'client sees only their own payments');
select results_eq($$ select body from public.updates $$, $$ values ('Hi Alice') $$,
  'client sees only their own updates');
select is((select count(*)::int from public.approvals where project_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0,
  'client cannot see another client''s approvals');
select results_eq($$ select label from public.files $$, $$ values ('Alice logo pack') $$,
  'client sees only their own files');
select is((select count(*)::int from public.admins), 0, 'client cannot see the admin list');

with u as (update public.stages set status = 'done' returning 1)
select is(count(*)::int, 0, 'client cannot update stages') from u;
with u as (update public.payments set paid_at = now() returning 1)
select is(count(*)::int, 0, 'client cannot mark payments paid') from u;
with u as (update public.approvals set status = 'approved', responded_at = now() returning 1)
select is(count(*)::int, 0, 'client cannot edit approvals directly') from u;
with d as (delete from public.projects returning 1)
select is(count(*)::int, 0, 'client cannot delete projects') from d;
select throws_ok(
  $$ insert into public.updates (project_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', 'fake') $$,
  '42501', null, 'client cannot post updates');
select throws_ok(
  $$ insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'client cannot make themselves admin');
with u as (update public.projects set client_id = '00000000-0000-0000-0000-0000000000a1'
              where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'client cannot take over another project') from u;

-- Approvals RPC
select is(
  (select status::text from public.respond_to_approval('aaaaaaaa-0000-0000-0000-0000000000a1', 'approved', null)),
  'approved', 'client can approve their own approval');
select throws_ok(
  $$ select public.respond_to_approval('aaaaaaaa-0000-0000-0000-0000000000a1', 'changes_requested', 'again') $$,
  '55000', null, 'client cannot answer the same approval twice');
select throws_ok(
  $$ select public.respond_to_approval('bbbbbbbb-0000-0000-0000-0000000000b1', 'approved', null) $$,
  'P0002', null, 'client cannot answer another client''s approval');
select throws_ok(
  $$ select public.respond_to_approval('aaaaaaaa-0000-0000-0000-0000000000a2', 'changes_requested', '   ') $$,
  '22023', null, 'requesting changes needs a comment');

select throws_ok(
  $$ select public.create_client_project('00000000-0000-0000-0000-0000000000a1', 'alice@test.local', 'Alice', null,
       'Free project', null, 0, 0, 'USD', 99) $$,
  '42501', null, 'client cannot create projects through the admin function');

-- Storage
select is(
  (select count(*)::int from storage.objects where bucket_id = 'project-files'),
  1, 'client can only see stored files in their own project folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values
     ('project-files', 'aaaaaaaa-0000-0000-0000-000000000001/deliverables/evil.zip') $$,
  '42501', null, 'client cannot upload files');

-- ---------------------------------------------------------------------------
-- As a logged-out visitor
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok($$ select * from public.projects $$, '42501', null, 'logged-out visitor cannot read projects');
select throws_ok($$ select * from public.files $$, '42501', null, 'logged-out visitor cannot read files');
select throws_ok(
  $$ select public.respond_to_approval('aaaaaaaa-0000-0000-0000-0000000000a2', 'approved', null) $$,
  '42501', null, 'logged-out visitor cannot call the approval function');

-- ---------------------------------------------------------------------------
-- As the admin
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.projects
   where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001')),
  2, 'admin sees every client''s project');
with u as (update public.stages set status = 'done'
           where project_id = 'aaaaaaaa-0000-0000-0000-000000000001' and position = 1
           returning completed_at)
select isnt((select completed_at from u), null, 'admin can update a stage, and completing it stamps completed_at');
select lives_ok(
  $$ insert into public.updates (project_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', 'From admin') $$,
  'admin can post updates');
select throws_ok(
  $$ select public.respond_to_approval('bbbbbbbb-0000-0000-0000-0000000000b1', 'approved', null) $$,
  'P0002', null, 'admin cannot answer approvals on a client''s behalf');

select * from finish();
rollback;
