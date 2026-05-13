export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "member";
export type TeamRole = "lead" | "member";
export type ProjectVisibility = "private" | "department" | "org";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          default_org_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_org_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
          joined_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: OrgRole;
        };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          department_id?: string | null;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: TeamRole;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: TeamRole;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          slug: string;
          description: string | null;
          visibility: ProjectVisibility;
          archived_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          slug: string;
          description?: string | null;
          visibility?: ProjectVisibility;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: TeamRole;
          added_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: TeamRole;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Insert"]>;
      };
      task_sections: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          position: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          position: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_sections"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          section_id: string | null;
          parent_task_id: string | null;
          title: string;
          description: string | null;
          assignee_id: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          position: string;
          due_at: string | null;
          completed_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          section_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          position: string;
          due_at?: string | null;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      tags: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          color?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
      };
      task_tags: {
        Row: { task_id: string; tag_id: string };
        Insert: { task_id: string; tag_id: string };
        Update: Partial<{ task_id: string; tag_id: string }>;
      };
      comments: {
        Row: {
          id: string;
          task_id: string;
          author_id: string;
          parent_comment_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          project_id: string | null;
          task_id: string | null;
          actor_id: string | null;
          kind: string;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          project_id?: string | null;
          task_id?: string | null;
          actor_id?: string | null;
          kind: string;
          payload?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      org_role: OrgRole;
      team_role: TeamRole;
      project_visibility: ProjectVisibility;
      task_status: TaskStatus;
      task_priority: TaskPriority;
    };
  };
}
