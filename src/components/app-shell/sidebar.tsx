"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  Folder,
  Globe,
  Inbox,
  Lock,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { InboxBadge } from "@/components/app-shell/inbox-badge";
import { useUIStore } from "@/lib/stores/ui-store";
import { useNewProjectDialogStore } from "@/components/projects/new-project-dialog";
import type {
  SidebarData,
  SidebarDepartment,
  SidebarOrg,
  SidebarProject,
  SidebarTeam,
} from "@/lib/sidebar-data";

export function Sidebar({ data }: { data: SidebarData }) {
  const [activeOrgId, setActiveOrgId] = useState(data.activeOrgId);
  const activeOrg = useMemo(
    () => data.orgs.find((o) => o.id === activeOrgId) ?? data.orgs[0] ?? null,
    [data.orgs, activeOrgId]
  );
  const openPalette = useUIStore((s) => s.setPaletteOpen);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <OrgSwitcher
        orgs={data.orgs}
        activeOrgId={activeOrg?.id ?? null}
        onSelect={setActiveOrgId}
      />

      <nav className="px-2 py-3">
        <SidebarLink href="/app" icon={Sparkles} label="Home" />
        <SidebarLink href="/app/inbox" icon={Inbox} label="Inbox" badge={<InboxBadge />} />
        <SidebarLink href="/app/my-tasks" icon={Folder} label="My tasks" />
        <button
          onClick={() => openPalette(true)}
          className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </nav>

      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>

      <ScrollArea className="flex-1 px-2 pb-4">
        {activeOrg ? (
          <OrgTree org={activeOrg} />
        ) : (
          <EmptyOrgs />
        )}
      </ScrollArea>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  shortcut,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      <span className="flex-1">{label}</span>
      {badge}
      {shortcut ? (
        <kbd className="rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      ) : null}
    </Link>
  );
}

function EmptyOrgs() {
  return (
    <div className="mx-2 mt-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      No workspaces yet. Create one to get started.
    </div>
  );
}

function OrgTree({ org }: { org: SidebarOrg }) {
  return (
    <div className="space-y-1">
      {org.departments.map((d) => (
        <DepartmentNode key={d.id} dept={d} />
      ))}
      {org.unassignedTeams.length > 0 ? (
        <div className="pt-1">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Cross-functional
          </div>
          {org.unassignedTeams.map((t) => (
            <TeamNode key={t.id} team={t} depth={0} />
          ))}
        </div>
      ) : null}

      <NewProjectTrigger />
    </div>
  );
}

function NewProjectTrigger() {
  const openNewProject = useNewProjectDialogStore((s) => s.open);
  return (
    <button
      onClick={openNewProject}
      className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      New project
    </button>
  );
}

function DepartmentNode({ dept }: { dept: SidebarDepartment }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground/90 hover:bg-accent"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="flex-1 truncate text-left">{dept.name}</span>
      </button>
      {open ? (
        <div className="ml-2 border-l border-border pl-1">
          {dept.teams.length > 0 ? (
            dept.teams.map((t) => <TeamNode key={t.id} team={t} depth={1} />)
          ) : (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No teams yet
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TeamNode({ team, depth }: { team: SidebarTeam; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm text-foreground/85 hover:bg-accent"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate text-left">{team.name}</span>
      </button>
      {open ? (
        <div className="ml-3 border-l border-border pl-1">
          {team.projects.length > 0 ? (
            team.projects.map((p) => <ProjectNode key={p.id} project={p} />)
          ) : (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No projects
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProjectNode({ project }: { project: SidebarProject }) {
  const VisibilityIcon =
    project.visibility === "private"
      ? Lock
      : project.visibility === "department"
      ? Users
      : Globe;
  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
    >
      <VisibilityIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{project.name}</span>
    </Link>
  );
}

