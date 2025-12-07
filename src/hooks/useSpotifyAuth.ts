import { useEffect } from 'react';

import { getMusicServiceInstance } from '@/services/music';
import { SpotifyMusicService } from '@/services/music/spotify/client';

/**
 * Spotify認証コールバックを処理するフック
 * URLパラメータからcodeとstateを取得し、トークン交換を実行
 */
export function useSpotifyAuth() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      // URLパラメータを確認
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const authError = params.get('auth_error');

      // エラーがあれば表示
      if (authError) {
        console.error('Spotify auth error:', authError);
        // URLパラメータをクリア
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // codeとstateがあれば認証コールバック処理
      if (code && state) {
        const musicService = getMusicServiceInstance();

        // SpotifyMusicServiceでない場合は何もしない
        if (!(musicService instanceof SpotifyMusicService)) {
          return;
        }

        try {
          const result = await musicService.handleAuthCallback(code, state);

          if (!result.success) {
            console.error('Authentication failed:', result.error);
          }
        } catch (error) {
          console.error('Auth callback error:', error);
        } finally {
          // URLパラメータをクリア
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    handleAuthCallback();
  }, []);
}
