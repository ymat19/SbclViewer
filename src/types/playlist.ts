import type { Song } from './anime';
import type { TrackSearchResult } from '@/services/music/types';

/**
 * プレイリストドラフトの楽曲情報
 */
export interface DraftTrack {
  // 元のアニメ・楽曲情報
  animeId: string;
  animeName: string;
  song: Song;

  // マッチング結果
  matchStatus: 'auto' | 'manual' | 'pending' | 'skipped';
  selectedTrack?: TrackSearchResult;
  candidates?: TrackSearchResult[];
}

/**
 * プレイリストドラフト（クォーター単位）
 */
export interface PlaylistDraft {
  quarter: string;
  createdAt: string;
  updatedAt: string;
  tracks: DraftTrack[];
}

/**
 * プレイリスト作成モード
 */
export type PlaylistCreationMode = 'separate' | 'merged';

/**
 * プレイリスト作成リクエスト
 */
export interface PlaylistCreationRequest {
  quarters: string[];
  mode: PlaylistCreationMode;
}

/**
 * プレイリスト作成結果（個別）
 */
export interface CreatedPlaylist {
  quarter: string;
  playlistId: string;
  url: string;
  name: string;
}

/**
 * プレイリスト作成結果（まとめ）
 */
export interface MergedPlaylistResult {
  playlistId: string;
  url: string;
  name: string;
  quarters: string[];
}
