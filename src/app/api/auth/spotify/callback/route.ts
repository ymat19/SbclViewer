import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify OAuth コールバックエンドポイント
 * 認証後にSpotifyからリダイレクトされる
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // エラーがあればトップページにリダイレクト
  if (error) {
    console.error('Spotify auth error:', error);
    return NextResponse.redirect(new URL(`/?auth_error=${error}`, request.url));
  }

  // codeとstateが必要
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?auth_error=missing_params', request.url));
  }

  // クライアントサイドでトークン交換を行うため、codeとstateをクエリパラメータとして渡す
  // localStorageにアクセスできるのはクライアントサイドのみ
  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl);
}
