export type OrganizationRole = "owner" | "admin" | "member";
export type ProjectStatus =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";
export type DocumentVisibility = "internal" | "client";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          company: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          company?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string | null;
          company?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          name: string;
          status: ProjectStatus;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id?: string | null;
          name: string;
          status?: ProjectStatus;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string | null;
          name?: string;
          status?: ProjectStatus;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string | null;
          client_id: string | null;
          title: string;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          visibility: DocumentVisibility;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id?: string | null;
          client_id?: string | null;
          title: string;
          storage_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          visibility?: DocumentVisibility;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          client_id?: string | null;
          title?: string;
          storage_path?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          visibility?: DocumentVisibility;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          summary: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          summary: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          entity_type?: string;
          entity_id?: string | null;
          action?: string;
          summary?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      portal_tokens: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          token_hash: string;
          label: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_by: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          token_hash: string;
          label?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          token_hash?: string;
          label?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      is_org_member: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: {
          target_org_id: string;
          allowed_roles: OrganizationRole[];
        };
        Returns: boolean;
      };
      log_activity: {
        Args: {
          target_org_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          summary: string;
          metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["activity_events"]["Row"];
      };
      resolve_portal_token: {
        Args: { token_hash: string };
        Returns: {
          portal_token_id: string;
          organization_id: string;
          client_id: string;
          client_name: string;
          organization_name: string;
        }[];
      };
      portal_list_projects: {
        Args: { token_hash: string };
        Returns: Database["public"]["Tables"]["projects"]["Row"][];
      };
      portal_list_documents: {
        Args: { token_hash: string };
        Returns: Database["public"]["Tables"]["documents"]["Row"][];
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      project_status: ProjectStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type ActivityEvent =
  Database["public"]["Tables"]["activity_events"]["Row"];
export type PortalToken = Database["public"]["Tables"]["portal_tokens"]["Row"];
