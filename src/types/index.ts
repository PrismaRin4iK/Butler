import { Database, ItemType, EnergyLevel, ItemStatus } from './database';

export type { ItemType, EnergyLevel, ItemStatus };

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type BacklogItem = Database['public']['Tables']['backlog_items']['Row'];
export type BacklogItemInsert = Database['public']['Tables']['backlog_items']['Insert'];
export type BacklogItemUpdate = Database['public']['Tables']['backlog_items']['Update'];

export interface YouTubeMetadata {
  video_id: string;
  channel?: string;
  thumbnail?: string;
  duration_iso?: string;
}

export interface ArticleMetadata {
  domain: string;
  favicon?: string;
  author?: string;
  description?: string;
}

export interface TaskMetadata {
  notes?: string;
}

export type SourceMetadata = YouTubeMetadata | ArticleMetadata | TaskMetadata | Record<string, unknown>;

export interface CreateItemPayload {
  input: string; // URL or task title
  type?: ItemType;
  customMinutes?: number;
  rawContent?: string;
}

export interface RecommendRequest {
  availableMinutes: number; // e.g. 10, 20, 45, 60
  energyState: EnergyLevel; // 'low' | 'medium' | 'high'
  preferredType?: 'all' | ItemType;
}

export interface RecommendResponse {
  item: BacklogItem | null;
  status: 'SUCCESS' | 'EMPTY_POOL';
  score?: number;
}

export interface StatusUpdatePayload {
  status: ItemStatus;
}
