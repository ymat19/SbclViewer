/**
 * trackNameから不要なプレフィックスを除去
 */
export function cleanTrackName(trackName: string): string {
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
