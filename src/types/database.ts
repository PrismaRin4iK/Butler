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
          energy_level: EnergyLevel;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      item_type: ItemType;
      energy_level: EnergyLevel;
      item_status: ItemStatus;
    };
  };
}
