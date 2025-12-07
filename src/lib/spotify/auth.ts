import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
} from '@/services/music/spotify/pkce';

/**
 * Spotify認証のstateパラメータの構造
 */
export interface SpotifyAuthState {
  csrf: string; // CSRF対策用ランダム文字列
  redirectAfterAuth: string; // 認証後の戻り先URL（完全URL）
  codeVerifier: string; // PKCE用
}

/**
 * Spotify認証URLを生成
 * @returns 認証URL
 */
export async function generateSpotifyAuthUrl(): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const csrf = generateRandomString(16);

  const state: SpotifyAuthState = {
    csrf,
    redirectAfterAuth: window.location.href, // 現在の完全URL
    codeVerifier,
  };

  const stateParam = btoa(JSON.stringify(state));

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!, // 常に本番URL
    scope: 'playlist-modify-public playlist-modify-private user-read-private',
    state: stateParam,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
