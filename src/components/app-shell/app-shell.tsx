import { Sidebar } from "@/components/app-shell/sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import type { SidebarData } from "@/lib/sidebar-data";

export interface AppShellUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export function AppShell({
  user,
  sidebar,
  children,
}: {
  user: AppShellUser;
  sidebar: SidebarData;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar data={sidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
