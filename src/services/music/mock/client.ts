import type {
  MusicService,
  TrackSearchQuery,
  TrackSearchResult,
  CreatePlaylistOptions,
  Playlist,
  AuthResult,
} from '../types';

/**
 * モック音楽サービス
 * Spotify APIに依存せずに開発・テストを行うためのモック実装
 */
export class MockMusicService implements MusicService {
  /**
   * 楽曲を検索（モック）
   * ランダムで完全一致と部分一致の候補を返す
   */
  async searchTrack(query: TrackSearchQuery): Promise<TrackSearchResult[]> {
    // 少し遅延を入れて実際のAPI呼び出しを模擬
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

    const results: TrackSearchResult[] = [];

    // 30%の確率で完全一致を含む
    if (Math.random() > 0.7) {
      results.push({
        id: `mock-exact-${Math.random().toString(36).substring(7)}`,
        name: query.trackName,
        artist: query.artist || 'Unknown Artist',
        album: 'Mock Album',
        uri: `spotify:track:mock-exact-${Math.random().toString(36).substring(7)}`,
        confidence: 'exact',
      });
    }

    // 部分一致の候補を1-3個追加
    const numPartialMatches = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numPartialMatches; i++) {
      const variants = [
        `${query.trackName} (Instrumental)`,
        `${query.trackName} - TV Size`,
        `${query.trackName} (Cover)`,
        `${query.trackName} - Remix`,
      ];

      results.push({
        id: `mock-partial-${i}-${Math.random().toString(36).substring(7)}`,
        name: variants[i % variants.length],
        artist: query.artist || 'Unknown Artist',
        album: `Mock Album ${i + 1}`,
        uri: `spotify:track:mock-partial-${i}-${Math.random().toString(36).substring(7)}`,
        confidence: 'partial',
      });
    }

    return results;
  }

  /**
   * プレイリストを作成（モック）
   */
  async createPlaylist(options: CreatePlaylistOptions): Promise<Playlist> {
    // 少し遅延を入れて実際のAPI呼び出しを模擬
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    const playlistId = `mock-playlist-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      id: playlistId,
      name: options.name,
      url: `https://open.spotify.com/playlist/${playlistId}`,
    };
  }

  /**
   * 認証（モック）
   * モックでは常に成功
   */
  async authenticate(): Promise<AuthResult> {
    return { success: true };
  }

  /**
   * 認証状態を確認（モック）
   * モックでは常に認証済み
   */
  async isAuthenticated(): Promise<boolean> {
    return true;
  }
}
