import type { MusicService, MusicServiceProvider } from './types';
import { MockMusicService } from './mock/client';

/**
 * 音楽サービスファクトリー
 * 環境変数 MUSIC_SERVICE_PROVIDER に基づいて適切なサービスインスタンスを返す
 */
export function getMusicService(): MusicService {
  const provider =
    (process.env.NEXT_PUBLIC_MUSIC_SERVICE_PROVIDER as MusicServiceProvider) || 'mock';

  switch (provider) {
    case 'mock':
      return new MockMusicService();
    case 'spotify':
      // Spotify実装は Phase 6 で追加予定
      throw new Error(
        'Spotify service is not yet implemented. Use NEXT_PUBLIC_MUSIC_SERVICE_PROVIDER=mock for now.',
      );
    default:
      console.warn(`Unknown music service provider: ${provider}. Falling back to mock.`);
      return new MockMusicService();
  }
}

// シングルトンインスタンス
let musicServiceInstance: MusicService | null = null;

/**
 * 音楽サービスのシングルトンインスタンスを取得
 */
export function getMusicServiceInstance(): MusicService {
  if (!musicServiceInstance) {
    musicServiceInstance = getMusicService();
  }
  return musicServiceInstance;
}
