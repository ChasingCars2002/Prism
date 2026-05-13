-- Prism: Row Level Security
-- Strategy: helper functions in `private` schema run as SECURITY DEFINER
-- so RLS policies can call them without triggering recursive RLS evaluation
-- on the membership tables themselves.

set search_path = public;

create schema if not exists private;

-- ============================================================
-- Helper functions (SECURITY DEFINER, STABLE)
-- ============================================================

-- Org membership
create or replace function private.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_org
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Team membership
create or replace function private.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team
      and user_id = auth.uid()
  );
$$;

-- Department membership = membership of any team in the dept
create or replace function private.is_department_member(p_dept uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members tm
    join teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.department_id = p_dept
  );
$$;

-- Project access: team member OR explicit project member
-- OR project is department-public and user is in the dept
-- OR project is org-public and user is in the org
-- OR org admin/owner.
create or replace function private.can_access_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join teams t on t.id = p.team_id
    where p.id = p_project
      and (
        -- explicit project invitation
        exists (
          select 1 from project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
        -- team membership
        or exists (
          select 1 from team_members tm
          where tm.team_id = t.id
            and tm.user_id = auth.uid()
        )
        -- org admin/owner
        or exists (
          select 1 from organization_members om
          where om.organization_id = t.organization_id
            and om.user_id = auth.uid()
            and om.role in ('owner', 'admin')
        )
        -- department-public visibility
        or (
          p.visibility = 'department'
          and t.department_id is not null
          and exists (
            select 1
            from team_members tm
            join teams t2 on t2.id = tm.team_id
            where tm.user_id = auth.uid()
              and t2.department_id = t.department_id
          )
        )
        -- org-public visibility
        or (
          p.visibility = 'org'
          and exists (
            select 1 from organization_members om
            where om.organization_id = t.organization_id
              and om.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- For tasks, comments, etc — resolve project from the row.
create or replace function private.can_edit_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join teams t on t.id = p.team_id
    where p.id = p_project
      and (
        exists (
          select 1 from project_members pm
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from team_members tm
          where tm.team_id = t.id and tm.user_id = auth.uid()
        )
        or exists (
          select 1 from organization_members om
          where om.organization_id = t.organization_id
            and om.user_id = auth.uid()
            and om.role in ('owner', 'admin')
        )
      )
  );
$$;

-- Lock down helper function execution to authenticated users.
revoke all on function private.is_org_member(uuid)        from public;
revoke all on function private.is_org_admin(uuid)         from public;
revoke all on function private.is_team_member(uuid)       from public;
revoke all on function private.is_department_member(uuid) from public;
revoke all on function private.can_access_project(uuid)   from public;
revoke all on function private.can_edit_project(uuid)     from public;

grant execute on function private.is_org_member(uuid)        to authenticated;
grant execute on function private.is_org_admin(uuid)         to authenticated;
grant execute on function private.is_team_member(uuid)       to authenticated;
grant execute on function private.is_department_member(uuid) to authenticated;
grant execute on function private.can_access_project(uuid)   to authenticated;
grant execute on function private.can_edit_project(uuid)     to authenticated;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table profiles             enable row level security;
alter table organizations        enable row level security;
alter table organization_members enable row level security;
alter table departments          enable row level security;
alter table teams                enable row level security;
alter table team_members         enable row level security;
alter table projects             enable row level security;
alter table project_members      enable row level security;
alter table task_sections        enable row level security;
alter table tasks                enable row level security;
alter table tags                 enable row level security;
alter table task_tags            enable row level security;
alter table comments             enable row level security;
alter table notifications        enable row level security;

-- ============================================================
-- profiles
-- ============================================================
-- Anyone signed in can read profiles (needed to render assignees / mentions).
-- A stricter version would scope this to "same org" but it requires a join
-- on every query — accept org-wide readability for now and tighten later.
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Inserts happen via the on_auth_user_created trigger (SECURITY DEFINER),
-- so we deliberately do not expose an INSERT policy to clients.

-- ============================================================
-- organizations
-- ============================================================
create policy "orgs_select_members"
  on organizations for select
  to authenticated
  using (private.is_org_member(id));

create policy "orgs_insert_any_authenticated"
  on organizations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "orgs_update_admins"
  on organizations for update
  to authenticated
  using (private.is_org_admin(id))
  with check (private.is_org_admin(id));

create policy "orgs_delete_owners"
  on organizations for delete
  to authenticated
  using (
    exists (
      select 1 from organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ============================================================
-- organization_members
-- ============================================================
create policy "org_members_select_self_and_peers"
  on organization_members for select
  to authenticated
  using (private.is_org_member(organization_id));

create policy "org_members_insert_admins"
  on organization_members for insert
  to authenticated
  with check (private.is_org_admin(organization_id));

create policy "org_members_update_admins"
  on organization_members for update
  to authenticated
  using (private.is_org_admin(organization_id))
  with check (private.is_org_admin(organization_id));

create policy "org_members_delete_admins_or_self"
  on organization_members for delete
  to authenticated
  using (
    private.is_org_admin(organization_id)
    or user_id = auth.uid()
  );

-- ============================================================
-- departments
-- ============================================================
create policy "departments_select_org_members"
  on departments for select
  to authenticated
  using (private.is_org_member(organization_id));

create policy "departments_write_admins"
  on departments for all
  to authenticated
  using (private.is_org_admin(organization_id))
  with check (private.is_org_admin(organization_id));

-- ============================================================
-- teams
-- ============================================================
-- Teams are visible to anyone in the org (they need to know teams exist
-- to request access). Membership is gated separately.
create policy "teams_select_org_members"
  on teams for select
  to authenticated
  using (private.is_org_member(organization_id));

create policy "teams_write_admins"
  on teams for all
  to authenticated
  using (private.is_org_admin(organization_id))
  with check (private.is_org_admin(organization_id));

-- ============================================================
-- team_members
-- ============================================================
create policy "team_members_select_org_members"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and private.is_org_member(t.organization_id)
    )
  );

create policy "team_members_write_admins_or_leads"
  on team_members for all
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and (
          private.is_org_admin(t.organization_id)
          or exists (
            select 1 from team_members tm
            where tm.team_id = t.id
              and tm.user_id = auth.uid()
              and tm.role = 'lead'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and (
          private.is_org_admin(t.organization_id)
          or exists (
            select 1 from team_members tm
            where tm.team_id = t.id
              and tm.user_id = auth.uid()
              and tm.role = 'lead'
          )
        )
    )
  );

-- ============================================================
-- projects
-- ============================================================
create policy "projects_select_accessible"
  on projects for select
  to authenticated
  using (private.can_access_project(id));

create policy "projects_insert_team_members"
  on projects for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and private.is_team_member(team_id)
  );

create policy "projects_update_editors"
  on projects for update
  to authenticated
  using (private.can_edit_project(id))
  with check (private.can_edit_project(id));

create policy "projects_delete_editors"
  on projects for delete
  to authenticated
  using (private.can_edit_project(id));

-- ============================================================
-- project_members
-- ============================================================
create policy "project_members_select_accessible"
  on project_members for select
  to authenticated
  using (private.can_access_project(project_id));

create policy "project_members_write_editors"
  on project_members for all
  to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

-- ============================================================
-- task_sections
-- ============================================================
create policy "task_sections_select"
  on task_sections for select
  to authenticated
  using (private.can_access_project(project_id));

create policy "task_sections_write"
  on task_sections for all
  to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

-- ============================================================
-- tasks
-- ============================================================
create policy "tasks_select"
  on tasks for select
  to authenticated
  using (private.can_access_project(project_id));

create policy "tasks_write"
  on tasks for all
  to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

-- ============================================================
-- tags
-- ============================================================
create policy "tags_select_org"
  on tags for select
  to authenticated
  using (private.is_org_member(organization_id));

create policy "tags_write_org"
  on tags for all
  to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

-- ============================================================
-- task_tags
-- ============================================================
create policy "task_tags_select"
  on task_tags for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      where t.id = task_tags.task_id
        and private.can_access_project(t.project_id)
    )
  );

create policy "task_tags_write"
  on task_tags for all
  to authenticated
  using (
    exists (
      select 1 from tasks t
      where t.id = task_tags.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1 from tasks t
      where t.id = task_tags.task_id
        and private.can_edit_project(t.project_id)
    )
  );

-- ============================================================
-- comments
-- ============================================================
create policy "comments_select"
  on comments for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      where t.id = comments.task_id
        and private.can_access_project(t.project_id)
    )
  );

create policy "comments_insert_self"
  on comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from tasks t
      where t.id = comments.task_id
        and private.can_access_project(t.project_id)
    )
  );

create policy "comments_update_own"
  on comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "comments_delete_own_or_editor"
  on comments for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from tasks t
      where t.id = comments.task_id
        and private.can_edit_project(t.project_id)
    )
  );

-- ============================================================
-- notifications
-- ============================================================
create policy "notifications_select_own"
  on notifications for select
  to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications_delete_own"
  on notifications for delete
  to authenticated
  using (recipient_id = auth.uid());

-- Inserts happen server-side via SECURITY DEFINER fan-out functions
-- (e.g. when a comment is added). No client INSERT policy exposed.
