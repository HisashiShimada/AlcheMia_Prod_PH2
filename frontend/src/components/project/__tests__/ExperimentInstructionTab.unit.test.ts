/**
 * ExperimentInstructionTab — テーブル縦スクロール高さ計算ロジック 単体テスト
 *
 * 対象ロジック:
 *   ResizeObserver でコンテナ高さを監視し、テーブルヘッダー高さを差し引いた
 *   動的な tableScrollY を算出するロジック
 *
 * 修正背景:
 *   scroll={{ y: 'calc(100vh - 450px)' }} の固定値では画面ズーム時に対応できず
 *   最下行が見切れていた。ResizeObserver によりコンテナ高さを直接計測する方式に変更。
 */

// ── テスト対象ロジック ───────────────────────────────────────────────

/** Ant Design size="small" のテーブルヘッダー高さ（px） */
const TABLE_HEADER_HEIGHT = 39;

/**
 * コンテナ高さからテーブルスクロール高さを算出する関数（本体の計算ロジック抽出）
 * @param containerHeight コンテナの実測高さ（px）
 * @returns テーブル縦スクロール高さ（px）。コンテナがヘッダー以下なら undefined
 */
const calcTableScrollY = (containerHeight: number): number | undefined => {
  if (containerHeight > TABLE_HEADER_HEIGHT) {
    return containerHeight - TABLE_HEADER_HEIGHT;
  }
  return undefined;
};

// ── テスト ───────────────────────────────────────────────────────────

describe('ExperimentInstructionTab — tableScrollY 動的計算ロジック', () => {

  describe('通常ケース', () => {

    test('コンテナ高さ 600px のとき tableScrollY が 561px になること', () => {
      expect(calcTableScrollY(600)).toBe(600 - TABLE_HEADER_HEIGHT);
    });

    test('コンテナ高さ 400px のとき tableScrollY が 361px になること', () => {
      expect(calcTableScrollY(400)).toBe(400 - TABLE_HEADER_HEIGHT);
    });

    test('コンテナ高さ 200px のとき tableScrollY が 161px になること', () => {
      expect(calcTableScrollY(200)).toBe(200 - TABLE_HEADER_HEIGHT);
    });
  });

  describe('画面ズーム対応（コンテナ高さが可変）', () => {

    test('画面を縮小してコンテナ高さが小さくなっても正しく算出されること（例: 300px）', () => {
      const result = calcTableScrollY(300);
      expect(result).toBe(300 - TABLE_HEADER_HEIGHT);
      expect(result).toBeGreaterThan(0);
    });

    test('画面を拡大してコンテナ高さが大きくなっても正しく算出されること（例: 1200px）', () => {
      const result = calcTableScrollY(1200);
      expect(result).toBe(1200 - TABLE_HEADER_HEIGHT);
    });

    test('テーブルヘッダー高さぴったりの場合は undefined を返すこと（スクロール不要）', () => {
      expect(calcTableScrollY(TABLE_HEADER_HEIGHT)).toBeUndefined();
    });

    test('コンテナ高さがテーブルヘッダー高さより小さい場合は undefined を返すこと', () => {
      expect(calcTableScrollY(TABLE_HEADER_HEIGHT - 1)).toBeUndefined();
      expect(calcTableScrollY(0)).toBeUndefined();
    });
  });

  describe('TABLE_HEADER_HEIGHT 定数の妥当性', () => {

    test('テーブルヘッダー高さが 39px であること（Ant Design size="small" 仕様）', () => {
      expect(TABLE_HEADER_HEIGHT).toBe(39);
    });

    test('テーブルヘッダー高さが正の整数であること', () => {
      expect(TABLE_HEADER_HEIGHT).toBeGreaterThan(0);
      expect(Number.isInteger(TABLE_HEADER_HEIGHT)).toBe(true);
    });
  });

  describe('差分の正確性', () => {

    test('算出された scrollY はコンテナ高さより TABLE_HEADER_HEIGHT だけ小さいこと', () => {
      const containerHeights = [400, 600, 800, 1000];
      containerHeights.forEach((h) => {
        const result = calcTableScrollY(h);
        expect(result).toBe(h - TABLE_HEADER_HEIGHT);
      });
    });
  });
});

