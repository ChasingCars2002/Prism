"use client";

import { useState } from "react";
import { LogOut, Search } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { signOutAction } from "@/app/auth/actions";
import type { AppShellUser } from "@/components/app-shell/app-shell";
import { initials } from "@/lib/utils";

export function TopBar({ user }: { user: AppShellUser }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <button
        className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        // Cmd+K palette will be wired up in Phase 2.
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">
          Search or jump to&hellip;
        </span>
        <kbd className="rounded border border-border bg-background px-1.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Avatar className="h-8 w-8">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.fullName ?? user.email} />
            ) : null}
            <AvatarFallback>
              {initials(user.fullName ?? user.email)}
            </AvatarFallback>
          </Avatar>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-20 w-56 rounded-md border border-border bg-popover p-1 shadow-md"
          >
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium">
                {user.fullName ?? "Unnamed"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
