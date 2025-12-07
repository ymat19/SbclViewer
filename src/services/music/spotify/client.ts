import type {
  AuthResult,
  CreatePlaylistOptions,
  MusicService,
  Playlist,
  TrackSearchQuery,
  TrackSearchResult,
} from '../types';

import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';

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
  private readonly CODE_VERIFIER_KEY = 'spotify_code_verifier';
  private readonly AUTH_STATE_KEY = 'spotify_auth_state';

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
      // Code VerifierとChallengeを生成
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();

      // localStorageに保存
      localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier);
      localStorage.setItem(this.AUTH_STATE_KEY, state);

      // 認証URLを構築
      const params = new URLSearchParams({
        client_id: this.clientId,
        response_type: 'code',
        redirect_uri: this.redirectUri,
        scope: this.scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state,
      });

      const authUrl = `${this.authBase}/authorize?${params.toString()}`;

      // 認証ページにリダイレクト
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
   * 認証コールバックを処理（redirectUri先で呼び出される）
   */
  async handleAuthCallback(code: string, state: string): Promise<AuthResult> {
    try {
      // Stateを検証
      const savedState = localStorage.getItem(this.AUTH_STATE_KEY);
      if (!savedState || savedState !== state) {
        throw new Error('Invalid state parameter');
      }

      // Code Verifierを取得
      const codeVerifier = localStorage.getItem(this.CODE_VERIFIER_KEY);
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // アクセストークンを取得
      const tokens = await this.exchangeCodeForToken(code, codeVerifier);

      // トークンを保存
      this.saveTokens(tokens);

      // 一時データをクリア
      localStorage.removeItem(this.CODE_VERIFIER_KEY);
      localStorage.removeItem(this.AUTH_STATE_KEY);

      return { success: true };
    } catch (error) {
      console.error('Auth callback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<SpotifyTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
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
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
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
   * 楽曲を検索
   */
  async searchTrack(query: TrackSearchQuery): Promise<TrackSearchResult[]> {
    try {
      const accessToken = await this.getValidAccessToken();

      // 検索クエリを構築
      const q = query.artist
        ? `track:${query.trackName} artist:${query.artist}`
        : `track:${query.trackName}`;

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
