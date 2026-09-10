export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ItemType = 'youtube' | 'article' | 'custom_task';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type ItemStatus = 'inbox' | 'completed' | 'dismissed' | 'archived';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          google_refresh_token: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          google_refresh_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          google_refresh_token?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      backlog_items: {
        Row: {
          id: string;
          user_id: string;
          type: ItemType;
          title: string;
          url: string | null;
          raw_content: string | null;
          source_metadata: Json;
          estimated_minutes: number;
          energy_level: EnergyLevel;
          ai_summary: string | null;
          tags: string[];
          status: ItemStatus;
          last_suggested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: ItemType;
          title: string;
          url?: string | null;
          raw_content?: string | null;
          source_metadata?: Json;
          estimated_minutes?: number;
          energy_level?: EnergyLevel;
          ai_summary?: string | null;
          tags?: string[];
          status?: ItemStatus;
          last_suggested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: ItemType;
          title?: string;
          url?: string | null;
          raw_content?: string | null;
          source_metadata?: Json;
          estimated_minutes?: number;
          energy_level?: EnergyLevel;
          ai_summary?: string | null;
          tags?: string[];
          status?: ItemStatus;
          last_suggested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backlog_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      item_type: ItemType;
      energy_level: EnergyLevel;
      item_status: ItemStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type BacklogItem = Database['public']['Tables']['backlog_items']['Row'];
export type BacklogItemInsert = Database['public']['Tables']['backlog_items']['Insert'];
export type BacklogItemUpdate = Database['public']['Tables']['backlog_items']['Update'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
