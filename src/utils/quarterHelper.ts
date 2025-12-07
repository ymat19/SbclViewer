/**
 * クォーター文字列を日本語の季節名に変換
 * @param quarter - "2024q1" 形式のクォーター文字列
 * @returns 日本語の季節名（例: "2024年冬アニメ楽曲"）
 */
export function quarterToJapaneseName(quarter: string): string {
  const [year, q] = quarter.split('q');
  const seasons: Record<string, string> = {
    '1': '冬',
    '2': '春',
    '3': '夏',
    '4': '秋',
  };

  const season = seasons[q] || '不明';

  return `${year}年${season}アニメ楽曲`;
}

/**
 * 複数のクォーターから統合プレイリスト名を生成
 * @param quarters - クォーター文字列の配列（ソート済み想定）
 * @returns 統合プレイリスト名
 */
export function generateMergedPlaylistName(quarters: string[]): string {
  if (quarters.length === 0) {
    return 'アニメ楽曲コレクション';
  }

  if (quarters.length === 1) {
    return quarterToJapaneseName(quarters[0]);
  }

  // ソートして最初と最後のクォーターを使用
  const sorted = [...quarters].sort();
  const start = sorted[0].toUpperCase();
  const end = sorted[sorted.length - 1].toUpperCase();

  return `アニメ楽曲コレクション ${start}-${end}`;
}

/**
 * クォーター文字列をパース
 * @param quarter - "2024q1" 形式のクォーター文字列
 * @returns { year, q }
 */
export function parseQuarter(quarter: string): { year: number; q: number } {
  const [yearStr, qStr] = quarter.split('q');

  return {
    year: parseInt(yearStr, 10),
    q: parseInt(qStr, 10),
  };
}

/**
 * クォーターを比較（ソート用）
 * @param a - クォーター文字列A
 * @param b - クォーター文字列B
 * @returns 比較結果（-1, 0, 1）
 */
export function compareQuarters(a: string, b: string): number {
  const parsedA = parseQuarter(a);
  const parsedB = parseQuarter(b);

  if (parsedA.year !== parsedB.year) {
    return parsedA.year - parsedB.year;
  }

  return parsedA.q - parsedB.q;
}
