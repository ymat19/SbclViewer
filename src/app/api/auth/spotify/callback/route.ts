import { NextRequest, NextResponse } from 'next/server';

import type { SpotifyAuthState } from '@/lib/spotify/auth';

// リダイレクト先のホワイトリスト
const ALLOWED_REDIRECT_ORIGINS: Array<string | RegExp> = [
  process.env.NEXT_PUBLIC_APP_URL, // 本番
  'http://localhost:3000', // ローカル
  /^https:\/\/.*\.vercel\.app$/, // Vercelプレビュー
].filter((origin): origin is string | RegExp => origin !== undefined);

/**
 * リダイレクト先URLがホワイトリストに含まれているか検証
 */
function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return ALLOWED_REDIRECT_ORIGINS.some((allowed) =>
      typeof allowed === 'string' ? parsed.origin === allowed : allowed.test(parsed.origin),
    );
  } catch {
    return false;
  }
}

/**
 * Spotify OAuth コールバック
 * codeとstateを元のURLに転送するだけのシンプルなリダイレクター
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  // エラー時は本番URLにリダイレクト
  if (error) {
    return NextResponse.redirect(
      new URL(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=${error}`, request.url),
    );
  }

  // codeまたはstateが欠けている場合
  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=missing_params`, request.url),
    );
  }

  try {
    // stateをデコードして元のURLを取得
    const state: SpotifyAuthState = JSON.parse(atob(stateParam));

    // リダイレクト先のセキュリティ検証
    if (!isAllowedRedirectUrl(state.redirectAfterAuth)) {
      return NextResponse.redirect(
        new URL(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=invalid_redirect`, request.url),
      );
    }

    // codeとstateを付けて元のURLにリダイレクト
    const redirectUrl = new URL(state.redirectAfterAuth);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', stateParam);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=invalid_state`, request.url),
    );
  }
}
