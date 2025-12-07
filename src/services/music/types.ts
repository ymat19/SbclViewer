/**
 * 音楽サービスの共通インターフェース
 * モック、Spotify、その他のサービスはこのインターフェースを実装する
 */

export interface TrackSearchQuery {
  trackName: string;
  artist?: string;
}

export interface TrackSearchResult {
  id: string;
  name: string;
  artist: string;
  album?: string;
  uri: string;
  confidence: 'exact' | 'partial' | 'low';
  durationMs?: number;
  releaseDate?: string;
  previewUrl?: string;
}

export interface CreatePlaylistOptions {
  name: string;
  description?: string;
  trackUris: string[];
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface MusicService {
  searchTrack(query: TrackSearchQuery): Promise<TrackSearchResult[]>;
  createPlaylist(options: CreatePlaylistOptions): Promise<Playlist>;
  authenticate(): Promise<AuthResult>;
  isAuthenticated(): Promise<boolean>;
}

export type MusicServiceProvider = 'mock' | 'spotify';
