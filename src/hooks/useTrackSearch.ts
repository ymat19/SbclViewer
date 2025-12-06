import { useState } from 'react';

import { getMusicServiceInstance } from '@/services/music';
import type { TrackSearchQuery, TrackSearchResult } from '@/services/music/types';
import type { Song } from '@/types/anime';

/**
 * 文字列を正規化（大文字小文字、全角半角、記号を統一）
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFKC') // 全角→半角統一
    .replace(/[\s\-_]/g, '') // 空白・記号除去
    .replace(/[「」『』【】]/g, ''); // 括弧除去
}

/**
 * 完全一致かどうかを判定
 */
function isExactMatch(query: TrackSearchQuery, result: TrackSearchResult): boolean {
  const trackMatch = normalizeString(query.trackName) === normalizeString(result.name);

  if (!query.artist) return trackMatch;

  const artistMatch = normalizeString(query.artist) === normalizeString(result.artist);

  return trackMatch && artistMatch;
}

export function useTrackSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const musicService = getMusicServiceInstance();

  /**
   * 楽曲を検索
   */
  const searchTrack = async (song: Song): Promise<TrackSearchResult[]> => {
    setIsSearching(true);
    try {
      const query: TrackSearchQuery = {
        trackName: song.trackName,
        artist: song.artist,
      };

      const results = await musicService.searchTrack(query);

      // 完全一致のものがあれば confidence を 'exact' に設定
      return results.map((result) => ({
        ...result,
        confidence: isExactMatch(query, result) ? 'exact' : result.confidence,
      }));
    } catch (error) {
      console.error('Failed to search track:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * 自動マッチングが可能かチェック
   * （完全一致が1つだけある場合）
   */
  const canAutoMatch = (results: TrackSearchResult[]): boolean => {
    const exactMatches = results.filter((r) => r.confidence === 'exact');
    return exactMatches.length === 1;
  };

  /**
   * 自動マッチングの結果を取得
   */
  const getAutoMatchResult = (results: TrackSearchResult[]): TrackSearchResult | undefined => {
    if (!canAutoMatch(results)) return undefined;
    return results.find((r) => r.confidence === 'exact');
  };

  return {
    searchTrack,
    canAutoMatch,
    getAutoMatchResult,
    isSearching,
  };
}
