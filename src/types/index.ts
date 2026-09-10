import { Database, ItemType, EnergyLevel, ItemStatus, BacklogItem, BacklogItemInsert, BacklogItemUpdate, Profile, ProfileInsert, ProfileUpdate } from './database';

export type { Database, ItemType, EnergyLevel, ItemStatus, BacklogItem, BacklogItemInsert, BacklogItemUpdate, Profile, ProfileInsert, ProfileUpdate };

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
