/**
 * PKCE (Proof Key for Code Exchange) ヘルパー関数
 * Spotify Authorization Code Flow with PKCE用
 */

/**
 * ランダムな文字列を生成（Code Verifier用）
 */
export function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));

  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * SHA-256ハッシュを計算
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  return crypto.subtle.digest('SHA-256', data);
}

/**
 * Base64URL エンコード
 */
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Code Verifierを生成
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Code ChallengeをCode Verifierから生成
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);

  return base64URLEncode(hashed);
}

/**
 * Stateパラメータを生成（CSRF対策）
 */
export function generateState(): string {
  return generateRandomString(16);
}
