import { cleanTrackName } from '@/lib/music/trackName';
import type { TrackSearchResult } from '@/services/music/types';
import type { Anime } from '@/types/anime';
import type { DraftTrack } from '@/types/playlist';

interface ExportSongCandidate {
  spotifyId: string;
  name: string;
  artist: string;
  album?: string;
}

interface ExportSong {
  type: string;
  trackName: string;
  artist?: string;
  candidates: ExportSongCandidate[];
}

interface ExportAnime {
  id: string;
  name: string;
  songs: ExportSong[];
}

export interface ExportData {
  quarter: string;
  animeList: ExportAnime[];
}

interface AIResponseSong {
  type: string;
  trackName: string;
  artist?: string;
  spotifyId?: string;
}

interface AIResponseAnime {
  id: string;
  name: string;
  songs: AIResponseSong[];
}

interface AIResponseData {
  quarter: string;
  animeList: AIResponseAnime[];
}

/**
 * エクスポート用JSON生成
 */
export function generateExportJson(
  quarter: string,
  animeList: Anime[],
  searchResults: Map<string, TrackSearchResult[]>,
): ExportData {
  return {
    quarter,
    animeList: animeList.map((anime) => ({
      id: anime.id,
      name: anime.name,
      songs: anime.songs.map((song, songIndex) => {
        const key = `${anime.id}-${songIndex}`;
        const candidates = searchResults.get(key) ?? [];

        return {
          type: song.type,
          trackName: cleanTrackName(song.trackName),
          artist: song.artist,
          candidates: candidates.map((c) => ({
            spotifyId: c.id,
            name: c.name,
            artist: c.artist,
            album: c.album,
          })),
        };
      }),
    })),
  };
}

/**
 * プロンプトテンプレート文字列を生成
 */
export function generatePromptText(): string {
  return `以下はアニメの楽曲リストとSpotify検索候補です。
各楽曲について、Web検索等を活用してそのアニメの正しい楽曲であるか検証し、
正しいSpotifyトラックIDを選んでください。

入力と同じJSON構造で、各songにspotifyIdフィールドを追加して返してください。
candidatesは不要です。正しい候補がない楽曲はsongごと省略してください。

楽曲データ：`;
}

/**
 * AIの応答テキストからJSONを抽出・パース
 */
export function parseAIResponse(text: string): AIResponseData {
  // コードブロック（```json ... ```）からJSONを抽出
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('JSONのパースに失敗しました。正しいJSON形式で貼り付けてください。');
  }

  // 構造バリデーション
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('不正なデータ形式です。');
  }

  const data = parsed as Record<string, unknown>;
  if (!data.quarter || !Array.isArray(data.animeList)) {
    throw new Error('quarter または animeList が見つかりません。');
  }

  for (const anime of data.animeList as Record<string, unknown>[]) {
    if (!anime.id || !anime.name || !Array.isArray(anime.songs)) {
      throw new Error('animeList の各要素には id, name, songs が必要です。');
    }
  }

  return parsed as AIResponseData;
}

/**
 * パース結果をDraftTrack[]に変換
 */
export function convertToDraftTracks(
  parsed: AIResponseData,
  animeList: Anime[],
  searchResults: Map<string, TrackSearchResult[]>,
): DraftTrack[] {
  const tracks: DraftTrack[] = [];

  for (const anime of animeList) {
    const responseAnime = parsed.animeList.find((a) => a.id === anime.id);

    anime.songs.forEach((song, songIndex) => {
      const key = `${anime.id}-${songIndex}`;
      const candidates = searchResults.get(key) ?? [];

      if (!responseAnime) {
        tracks.push({
          animeId: anime.id,
          animeName: anime.name,
          song,
          matchStatus: 'skipped',
          candidates,
        });
        return;
      }

      // songの照合: type + trackName で一致を探す
      const responseSong = responseAnime.songs.find(
        (s) => s.type === song.type && s.trackName === cleanTrackName(song.trackName),
      );

      if (!responseSong || !responseSong.spotifyId) {
        tracks.push({
          animeId: anime.id,
          animeName: anime.name,
          song,
          matchStatus: 'skipped',
          candidates,
        });
        return;
      }

      // spotifyIdで検索候補内のTrackSearchResultを照合
      const selectedTrack = candidates.find((c) => c.id === responseSong.spotifyId);

      if (selectedTrack) {
        tracks.push({
          animeId: anime.id,
          animeName: anime.name,
          song,
          matchStatus: 'ai',
          selectedTrack,
          candidates,
        });
      } else {
        tracks.push({
          animeId: anime.id,
          animeName: anime.name,
          song,
          matchStatus: 'skipped',
          candidates,
        });
      }
    });
  }

  return tracks;
}
