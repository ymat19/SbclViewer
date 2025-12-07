import { useEffect } from 'react';

import type { SpotifyAuthState } from '@/lib/spotify/auth';

/**
 * Spotifyトークン情報
 */
interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

/**
 * Spotify認証コールバックを処理するフック
 * URLパラメータからcodeとstateを取得し、クライアント側でトークン交換を実行
 */
export function useSpotifyAuth(onAuthComplete?: () => void) {
  useEffect(() => {
    const handleAuthCallback = async () => {
      // URLパラメータを確認
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const stateParam = params.get('state');
      const authError = params.get('auth_error');

      // エラーがあれば表示
      if (authError) {
        console.error('Spotify auth error:', authError);
        // URLパラメータをクリア
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // codeとstateがあれば認証コールバック処理
      if (code && stateParam) {
        try {
          // stateをデコード
          const state: SpotifyAuthState = JSON.parse(atob(stateParam));

          // トークン交換（クライアント側で実行）
          const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
              client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
              code_verifier: state.codeVerifier,
            }),
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
          }

          const tokens = await tokenResponse.json();

          // localStorageに保存
          const spotifyTokens: SpotifyTokens = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
          };
          localStorage.setItem('spotify_tokens', JSON.stringify(spotifyTokens));

          // URLをクリーンアップ
          window.history.replaceState({}, '', window.location.pathname);

          if (onAuthComplete) {
            onAuthComplete();
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          // URLパラメータをクリア
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    handleAuthCallback();
  }, [onAuthComplete]);
}
