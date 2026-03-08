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

export interface MultiExportData {
  quarters: ExportData[];
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

interface MultiAIResponseData {
  quarters: AIResponseData[];
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
データにquartersフィールドがある場合は、同じquarters構造で返してください。

楽曲データ：`;
}

/**
 * 複数シーズン用エクスポートJSON生成
 */
export function generateMultiExportJson(
  entries: {
    quarter: string;
    animeList: Anime[];
    searchResults: Map<string, TrackSearchResult[]>;
  }[],
): MultiExportData {
  return {
    quarters: entries.map((entry) =>
      generateExportJson(entry.quarter, entry.animeList, entry.searchResults),
    ),
  };
}

/**
 * JSONテキストを抽出（コードブロック対応）
 */
function extractJson(text: string): unknown {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('JSONのパースに失敗しました。正しいJSON形式で貼り付けてください。');
  }
}

/**
 * 単一クォーターのバリデーション
 */
function validateSingleResponse(data: Record<string, unknown>): AIResponseData {
  if (!data.quarter || !Array.isArray(data.animeList)) {
    throw new Error('quarter または animeList が見つかりません。');
  }

  for (const anime of data.animeList as Record<string, unknown>[]) {
    if (!anime.id || !anime.name || !Array.isArray(anime.songs)) {
      throw new Error('animeList の各要素には id, name, songs が必要です。');
    }
  }

  return data as unknown as AIResponseData;
}

/**
 * AIの応答テキストからJSONを抽出・パース（単一クォーター）
 */
export function parseAIResponse(text: string): AIResponseData {
  const parsed = extractJson(text);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('不正なデータ形式です。');
  }

  return validateSingleResponse(parsed as Record<string, unknown>);
}

/**
 * AIの応答テキストからJSONを抽出・パース（複数クォーター）
 */
export function parseMultiAIResponse(text: string): MultiAIResponseData {
  const parsed = extractJson(text);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('不正なデータ形式です。');
  }

  const data = parsed as Record<string, unknown>;

  // quarters配列がある場合はマルチフォーマット
  if (Array.isArray(data.quarters)) {
    const quarters = (data.quarters as Record<string, unknown>[]).map(validateSingleResponse);

    return { quarters };
  }

  // 単一フォーマットの場合もマルチに変換
  if (data.quarter && Array.isArray(data.animeList)) {
    return { quarters: [validateSingleResponse(data)] };
  }

  throw new Error('quarters 配列または quarter/animeList が見つかりません。');
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
      let selectedTrack = candidates.find((c) => c.id === responseSong.spotifyId);

      // 候補にない場合（検索スキップ時など）、レスポンスからTrackSearchResultを生成
      if (!selectedTrack && responseSong.spotifyId) {
        // base62 IDのバリデーション（22文字の英数字）
        const isValidId = /^[a-zA-Z0-9]{22}$/.test(responseSong.spotifyId);
        if (isValidId) {
          selectedTrack = {
            id: responseSong.spotifyId,
            name: responseSong.trackName,
            artist: responseSong.artist ?? song.artist ?? '',
            uri: `spotify:track:${responseSong.spotifyId}`,
            confidence: 'exact',
          };
        } else {
          console.warn(
            `Invalid Spotify ID "${responseSong.spotifyId}" for "${responseSong.trackName}", skipping`,
          );
        }
      }

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

/**
 * 複数クォーターのパース結果をMap<quarter, DraftTrack[]>に変換
 */
export function convertMultiDraftTracks(
  parsed: MultiAIResponseData,
  entriesMap: Map<string, { animeList: Anime[]; searchResults: Map<string, TrackSearchResult[]> }>,
): Map<string, DraftTrack[]> {
  const result = new Map<string, DraftTrack[]>();

  for (const [quarter, entry] of entriesMap) {
    const quarterResponse = parsed.quarters.find((q) => q.quarter === quarter);

    if (quarterResponse) {
      result.set(
        quarter,
        convertToDraftTracks(quarterResponse, entry.animeList, entry.searchResults),
      );
    } else {
      // AIレスポンスにこのクォーターがない場合、全曲をスキップ扱い
      const tracks: DraftTrack[] = [];
      for (const anime of entry.animeList) {
        anime.songs.forEach((song, songIndex) => {
          const key = `${anime.id}-${songIndex}`;
          tracks.push({
            animeId: anime.id,
            animeName: anime.name,
            song,
            matchStatus: 'skipped',
            candidates: entry.searchResults.get(key) ?? [],
          });
        });
      }
      result.set(quarter, tracks);
    }
  }

  return result;
}
