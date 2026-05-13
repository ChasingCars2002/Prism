"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SidebarOrg } from "@/lib/sidebar-data";

export function OrgSwitcher({
  orgs,
  activeOrgId,
  onSelect,
}: {
  orgs: SidebarOrg[];
  activeOrgId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  return (
    <div className="relative border-b border-border p-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          {(active?.name ?? "P").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {active?.name ?? "Prism"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {active ? `${active.role}` : "No workspace"}
          </p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className="absolute left-2 right-2 top-[calc(100%-4px)] z-20 rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                onSelect(org.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                {org.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === active?.id ? (
                <Check className="h-3.5 w-3.5 text-foreground" />
              ) : null}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <Link
            href="/onboarding"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => setOpen(false)}
          >
            <Plus className="h-3.5 w-3.5" />
            New workspace
          </Link>
        </div>
      ) : null}
    </div>
  );
}
