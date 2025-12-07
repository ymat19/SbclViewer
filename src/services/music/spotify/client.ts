import type {
  AuthResult,
  CreatePlaylistOptions,
  MusicService,
  Playlist,
  TrackSearchQuery,
  TrackSearchResult,
} from '../types';

import { generateSpotifyAuthUrl } from '@/lib/spotify/auth';

/**
 * Spotifyトークン情報
 */
interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

/**
 * Spotify検索APIのレスポンス型
 */
interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string };
      uri: string;
    }>;
  };
}

/**
 * Spotifyプレイリスト作成APIのレスポンス型
 */
interface SpotifyPlaylistResponse {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify Music Service実装
 */
export class SpotifyMusicService implements MusicService {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
  ];
  private readonly apiBase = 'https://api.spotify.com/v1';
  private readonly authBase = 'https://accounts.spotify.com';

  // localStorage keys
  private readonly TOKENS_KEY = 'spotify_tokens';

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
    this.redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || '';

    if (!this.clientId || !this.redirectUri) {
      throw new Error(
        'Spotify credentials are not configured. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID and NEXT_PUBLIC_SPOTIFY_REDIRECT_URI',
      );
    }
  }

  /**
   * 認証を開始
   */
  async authenticate(): Promise<AuthResult> {
    try {
      // 認証URLを生成して認証ページにリダイレクト
      const authUrl = await generateSpotifyAuthUrl();
      window.location.href = authUrl;

      return { success: true };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * トークンをリフレッシュ
   */
  private async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    });

    const response = await fetch(`${this.authBase}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // 新しいrefresh_tokenがない場合は既存のものを使用
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  /**
   * 有効なアクセストークンを取得（必要に応じてリフレッシュ）
   */
  private async getValidAccessToken(): Promise<string> {
    const tokens = this.loadTokens();
    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // トークンが期限切れまたは期限切れ間近（5分以内）の場合はリフレッシュ
    const isExpiringSoon = tokens.expiresAt - Date.now() < 5 * 60 * 1000;

    if (isExpiringSoon) {
      const newTokens = await this.refreshAccessToken(tokens.refreshToken);
      this.saveTokens(newTokens);
      return newTokens.accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * トークンを保存
   */
  private saveTokens(tokens: SpotifyTokens): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }

  /**
   * トークンを読み込み
   */
  private loadTokens(): SpotifyTokens | null {
    const stored = localStorage.getItem(this.TOKENS_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as SpotifyTokens;
    } catch {
      return null;
    }
  }

  /**
   * 認証状態を確認
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = this.loadTokens();

    return tokens !== null;
  }

  /**
   * trackNameから不要なプレフィックスを除去
   */
  private cleanTrackName(trackName: string): string {
    // 「オープニングテーマ」「エンディングテーマ」などのプレフィックスを除去
    let cleaned = trackName.replace(
      /^(オープニングテーマ|エンディングテーマ|挿入歌|主題歌|イメージソング|キャラクターソング|劇中歌)/,
      '',
    );

    // 括弧で囲まれた部分を抽出（「曲名」 → 曲名）
    const bracketMatch = cleaned.match(/[「『【](.+?)[」』】]/);
    if (bracketMatch) {
      cleaned = bracketMatch[1];
    }

    return cleaned.trim();
  }

  /**
   * 楽曲を検索
   */
  async searchTrack(query: TrackSearchQuery): Promise<TrackSearchResult[]> {
    try {
      const accessToken = await this.getValidAccessToken();

      // trackNameをクリーンアップ
      const cleanedTrackName = this.cleanTrackName(query.trackName);

      // まずアーティストを含めて検索（アーティストが指定されている場合）
      if (query.artist) {
        const qWithArtist = `track:${cleanedTrackName} artist:${query.artist}`;
        const paramsWithArtist = new URLSearchParams({
          q: qWithArtist,
          type: 'track',
          limit: '10',
        });

        const responseWithArtist = await fetch(
          `${this.apiBase}/search?${paramsWithArtist.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!responseWithArtist.ok) {
          throw new Error(`Search failed: ${responseWithArtist.statusText}`);
        }

        const dataWithArtist: SpotifySearchResponse = await responseWithArtist.json();

        // 結果が見つかった場合はそれを返す
        if (dataWithArtist.tracks.items.length > 0) {
          return dataWithArtist.tracks.items.map((track) => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
            album: track.album.name,
            uri: track.uri,
            confidence: 'partial' as const, // 完全一致判定はuseTrackSearchで行う
          }));
        }

        // 結果が0件だった場合、タイトルのみで再検索（フォールバック）
        console.log(
          `No results found for "${cleanedTrackName}" by "${query.artist}", falling back to title-only search`,
        );
      }

      // タイトルのみで検索
      const q = `track:${cleanedTrackName}`;
      const params = new URLSearchParams({
        q,
        type: 'track',
        limit: '10',
      });

      const response = await fetch(`${this.apiBase}/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SpotifySearchResponse = await response.json();

      // 結果を変換
      return data.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        uri: track.uri,
        confidence: 'partial' as const, // 完全一致判定はuseTrackSearchで行う
      }));
    } catch (error) {
      console.error('Track search failed:', error);
      throw error;
    }
  }

  /**
   * プレイリストを作成
   */
  async createPlaylist(options: CreatePlaylistOptions): Promise<Playlist> {
    try {
      const accessToken = await this.getValidAccessToken();

      // 現在のユーザーIDを取得
      const userId = await this.getCurrentUserId(accessToken);

      // プレイリストを作成
      const createResponse = await fetch(`${this.apiBase}/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: options.name,
          description: options.description || '',
          public: false, // デフォルトは非公開
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Playlist creation failed: ${createResponse.statusText}`);
      }

      const playlist: SpotifyPlaylistResponse = await createResponse.json();

      // トラックを追加
      if (options.trackUris.length > 0) {
        await this.addTracksToPlaylist(playlist.id, options.trackUris, accessToken);
      }

      return {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
      };
    } catch (error) {
      console.error('Playlist creation failed:', error);
      throw error;
    }
  }

  /**
   * 現在のユーザーIDを取得
   */
  private async getCurrentUserId(accessToken: string): Promise<string> {
    const response = await fetch(`${this.apiBase}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user ID: ${response.statusText}`);
    }

    const data = await response.json();

    return data.id;
  }

  /**
   * プレイリストにトラックを追加
   */
  private async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
    accessToken: string,
  ): Promise<void> {
    // 最大100トラックずつ追加
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const response = await fetch(`${this.apiBase}/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: chunk,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add tracks: ${response.statusText}`);
      }
    }
  }
}
