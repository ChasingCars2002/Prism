-- Prism: notification fan-out triggers
-- Comments and task assignments produce inbox rows for relevant recipients.
-- These run SECURITY DEFINER, bypassing RLS so the system can insert
-- notifications addressed to other users.

set search_path = public;

-- ============================================================
-- on_comment_created: notify everyone who has commented on the task
-- plus the task assignee (minus the comment author).
-- ============================================================
create or replace function private.on_comment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_assignee   uuid;
begin
  select project_id, assignee_id
    into v_project_id, v_assignee
  from tasks
  where id = new.task_id;

  insert into notifications
    (recipient_id, project_id, task_id, actor_id, kind, payload)
  select distinct
    recipient,
    v_project_id,
    new.task_id,
    new.author_id,
    'comment',
    jsonb_build_object('comment_id', new.id, 'preview', left(new.body, 200))
  from (
    select v_assignee as recipient
    union
    select c.author_id from comments c
    where c.task_id = new.task_id
  ) as recipients
  where recipient is not null
    and recipient <> new.author_id;

  return new;
end;
$$;

drop trigger if exists trg_on_comment_created on comments;
create trigger trg_on_comment_created
  after insert on comments
  for each row execute function private.on_comment_created();

-- ============================================================
-- on_task_assigned: notify the assignee when assignee_id changes
-- to a non-null user other than the actor.
-- ============================================================
create or replace function private.on_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then
    return new;
  end if;

  if new.assignee_id = auth.uid() then
    return new;
  end if;

  insert into notifications
    (recipient_id, project_id, task_id, actor_id, kind, payload)
  values
    (
      new.assignee_id,
      new.project_id,
      new.id,
      auth.uid(),
      'assignment',
      jsonb_build_object('title', new.title)
    );

  return new;
end;
$$;

drop trigger if exists trg_on_task_assigned_ins on tasks;
create trigger trg_on_task_assigned_ins
  after insert on tasks
  for each row execute function private.on_task_assigned();

drop trigger if exists trg_on_task_assigned_upd on tasks;
create trigger trg_on_task_assigned_upd
  after update of assignee_id on tasks
  for each row execute function private.on_task_assigned();

revoke all on function private.on_comment_created() from public;
revoke all on function private.on_task_assigned()   from public;
