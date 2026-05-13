-- Prism: initial schema
-- Multi-tenant: Organization > Department > Team > Project > Task
-- All tables get RLS enabled in the next migration.

set search_path = public;

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type org_role           as enum ('owner', 'admin', 'member');
create type team_role          as enum ('lead', 'member');
create type project_visibility as enum ('private', 'department', 'org');
create type task_status        as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type task_priority      as enum ('low', 'medium', 'high', 'urgent');

-- ============================================================
-- profiles  (1:1 with auth.users)
-- ============================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  avatar_url      text,
  default_org_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- organizations
-- ============================================================
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table organization_members (
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             org_role not null default 'member',
  joined_at        timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on organization_members(user_id);

-- profiles.default_org_id FK can now be added safely.
alter table profiles
  add constraint profiles_default_org_fk
  foreign key (default_org_id) references organizations(id) on delete set null;

-- ============================================================
-- departments
-- ============================================================
create table departments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create index departments_org_idx on departments(organization_id);

-- ============================================================
-- teams
-- ============================================================
create table teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  department_id   uuid references departments(id) on delete set null,
  name            text not null,
  slug            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create index teams_org_idx        on teams(organization_id);
create index teams_department_idx on teams(department_id);

create table team_members (
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       team_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on team_members(user_id);

-- ============================================================
-- projects
-- ============================================================
create table projects (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  visibility  project_visibility not null default 'private',
  archived_at timestamptz,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (team_id, slug)
);

create index projects_team_idx       on projects(team_id);
create index projects_visibility_idx on projects(visibility) where archived_at is null;

create table project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        team_role not null default 'member',
  added_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on project_members(user_id);

-- ============================================================
-- task sections (Kanban columns / list groupings)
-- ============================================================
create table task_sections (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  position   text not null, -- fractional index
  created_at timestamptz not null default now()
);

create index task_sections_project_idx on task_sections(project_id, position);

-- ============================================================
-- tasks
-- ============================================================
create table tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  section_id     uuid references task_sections(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title          text not null,
  description    text,
  assignee_id    uuid references auth.users(id) on delete set null,
  status         task_status   not null default 'todo',
  priority       task_priority not null default 'medium',
  position       text not null, -- fractional index within section
  due_at         timestamptz,
  completed_at   timestamptz,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tasks_project_idx        on tasks(project_id);
create index tasks_section_pos_idx    on tasks(section_id, position);
create index tasks_assignee_idx       on tasks(assignee_id) where assignee_id is not null;
create index tasks_parent_idx         on tasks(parent_task_id) where parent_task_id is not null;
create index tasks_due_open_idx       on tasks(due_at) where completed_at is null and due_at is not null;

-- ============================================================
-- tags & task_tags
-- ============================================================
create table tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  color           text not null default '#94a3b8',
  unique (organization_id, name)
);

create index tags_org_idx on tags(organization_id);

create table task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id  uuid not null references tags(id)  on delete cascade,
  primary key (task_id, tag_id)
);

create index task_tags_tag_idx on task_tags(tag_id);

-- ============================================================
-- comments  (threaded)
-- ============================================================
create table comments (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references tasks(id) on delete cascade,
  author_id         uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index comments_task_idx   on comments(task_id, created_at);
create index comments_author_idx on comments(author_id);

-- ============================================================
-- notifications  (Unified Inbox)
-- ============================================================
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references projects(id) on delete cascade,
  task_id       uuid references tasks(id) on delete cascade,
  actor_id      uuid references auth.users(id) on delete set null,
  kind          text not null,
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index notifications_inbox_idx
  on notifications(recipient_id, read_at, created_at desc);
create index notifications_project_idx
  on notifications(recipient_id, project_id, created_at desc)
  where project_id is not null;

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated     before update on profiles    for each row execute function set_updated_at();
create trigger trg_projects_updated     before update on projects    for each row execute function set_updated_at();
create trigger trg_tasks_updated        before update on tasks       for each row execute function set_updated_at();
create trigger trg_comments_updated     before update on comments    for each row execute function set_updated_at();

-- ============================================================
-- Auto-add organization creator as owner
-- ============================================================
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_organization_owner
  after insert on organizations
  for each row execute function handle_new_organization();
