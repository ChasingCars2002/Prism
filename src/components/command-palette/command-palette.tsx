"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  Globe,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  Lock,
  Plus,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore } from "@/lib/stores/ui-store";
import { signOutAction } from "@/app/auth/actions";
import { useNewProjectDialogStore } from "@/components/projects/new-project-dialog";
import type { SidebarData } from "@/lib/sidebar-data";

interface PaletteItem {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export function CommandPalette({ data }: { data: SidebarData }) {
  const router = useRouter();
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const openNewProject = useNewProjectDialogStore((s) => s.open);

  // Global Cmd+K / Ctrl+K binding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const close = () => setOpen(false);
  const go = (href: string) => () => {
    close();
    router.push(href);
  };

  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];

    result.push(
      { id: "nav:home", label: "Home", group: "Navigation", icon: Home, run: go("/app") },
      { id: "nav:inbox", label: "Inbox", group: "Navigation", icon: Inbox, run: go("/app/inbox") },
      { id: "nav:my-tasks", label: "My tasks", group: "Navigation", icon: ListChecks, run: go("/app/my-tasks") },
    );

    result.push({
      id: "action:new-project",
      label: "Create project…",
      group: "Actions",
      icon: Plus,
      run: () => {
        close();
        openNewProject();
      },
    });

    const activeOrg =
      data.orgs.find((o) => o.id === data.activeOrgId) ?? data.orgs[0] ?? null;
    if (activeOrg) {
      const allTeams = [
        ...activeOrg.departments.flatMap((d) => d.teams),
        ...activeOrg.unassignedTeams,
      ];
      for (const team of allTeams) {
        for (const project of team.projects) {
          const icon =
            project.visibility === "private"
              ? Lock
              : project.visibility === "department"
              ? Users
              : Globe;
          result.push({
            id: `project:${project.id}`,
            label: project.name,
            hint: team.name,
            group: "Projects",
            icon,
            run: go(`/app/projects/${project.id}`),
          });
        }
      }
      for (const team of allTeams) {
        result.push({
          id: `team:${team.id}`,
          label: team.name,
          group: "Teams",
          icon: Folder,
          run: go(`/app/teams/${team.id}`),
        });
      }
    }

    result.push({
      id: "action:signout",
      label: "Sign out",
      group: "Account",
      icon: LogOut,
      run: () => {
        close();
        void signOutAction();
      },
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, router]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or run a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map(([group, groupItems], i) => (
          <Group key={group} heading={group} items={groupItems} separator={i > 0} />
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function Group({
  heading,
  items,
  separator,
}: {
  heading: string;
  items: PaletteItem[];
  separator: boolean;
}) {
  return (
    <>
      {separator ? <CommandSeparator /> : null}
      <CommandGroup heading={heading}>
        {items.map((item) => (
          <CommandItem
            key={item.id}
            value={`${item.group} ${item.label} ${item.hint ?? ""}`}
            onSelect={() => item.run()}
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{item.label}</span>
            {item.hint ? (
              <span className="text-xs text-muted-foreground">{item.hint}</span>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
