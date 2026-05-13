"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { create } from "zustand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/lib/actions/projects";
import type { ProjectVisibility } from "@/lib/supabase/types";
import type { SidebarData } from "@/lib/sidebar-data";

interface NewProjectDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useNewProjectDialogStore = create<NewProjectDialogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

interface TeamOption {
  id: string;
  label: string;
}

export function NewProjectDialog({ data }: { data: SidebarData }) {
  const router = useRouter();
  const isOpen = useNewProjectDialogStore((s) => s.isOpen);
  const close = useNewProjectDialogStore((s) => s.close);

  const teams = useMemo<TeamOption[]>(() => {
    const activeOrg =
      data.orgs.find((o) => o.id === data.activeOrgId) ?? data.orgs[0] ?? null;
    if (!activeOrg) return [];
    const out: TeamOption[] = [];
    for (const dept of activeOrg.departments) {
      for (const team of dept.teams) {
        out.push({ id: team.id, label: `${dept.name} · ${team.name}` });
      }
    }
    for (const team of activeOrg.unassignedTeams) {
      out.push({ id: team.id, label: team.name });
    }
    return out;
  }, [data]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset state each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setTeamId(teams[0]?.id ?? "");
      setVisibility("private");
      setError(null);
    }
  }, [isOpen, teams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setError("Pick a team.");
      return;
    }
    startTransition(async () => {
      const res = await createProjectAction({
        teamId,
        name,
        description,
        visibility,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      close();
      if (res.id) {
        router.push(`/app/projects/${res.id}`);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects belong to a team and seed three default sections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 Launch"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-team">Team</Label>
            <select
              id="project-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              {teams.length === 0 ? (
                <option value="">No teams yet — create one first</option>
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-visibility">Visibility</Label>
            <select
              id="project-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="private">Private — team and invitees only</option>
              <option value="department">Department — anyone in the department</option>
              <option value="org">Organization — anyone in the workspace</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (optional)</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of the project's goal."
              className="min-h-[80px]"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || teams.length === 0}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
