# Prism

A high-performance, keyboard-first alternative to Asana.

**Core philosophy:** Keyboard-First · Sub-100ms Latency · Radically Simple.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS, Shadcn/UI, Lucide Icons
- **Data:** TanStack Query (server state) + Zustand (UI state)
- **Backend:** Supabase (Postgres + Auth + RLS)
- **DnD:** @hello-pangea/dnd

## Getting started

```bash
pnpm install   # or npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
pnpm dev
```

## Database setup

Migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste the SQL into the Supabase Studio SQL editor in order.

## Architecture

```
Organization
└── Department
    └── Team  ──── team_members (users)
        └── Project (visibility: private | department | org)
            └── project_members (explicit invitees)
            └── task_sections (Kanban columns)
                └── tasks (fractional position)
                    ├── subtasks (parent_task_id)
                    ├── tags (m2m)
                    └── comments
```

Row Level Security is enforced via `SECURITY DEFINER` helper functions
(`is_org_member`, `is_team_member`, `can_access_project`) to keep policy
checks fast and non-recursive.
