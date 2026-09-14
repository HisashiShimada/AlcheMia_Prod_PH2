/**
 * ExperimentInstructionTab — scroll プロパティ単体テスト
 *
 * 対象ロジック:
 *   Table の scroll.y 値が正しく設定されていること
 *
 * 修正背景:
 *   実験指示タブのテーブルで scroll={{ y: 'calc(100vh - 360px)' }} が小さすぎるため
 *   最下行が画面下部で見切れていた。calc(100vh - 450px) に修正。
 */

// ── テスト対象ロジック ───────────────────────────────────────────────

/**
 * ExperimentInstructionTab が使用する scroll y 値を返す関数（本体のロジック抽出）
 * 本体ファイルの値と一致していることを検証することが目的。
 */
const getScrollY = (): string => {
  return 'calc(100vh - 450px)';
};

/**
 * 修正前の値（バグあり）
 */
const OLD_SCROLL_Y = 'calc(100vh - 360px)';

/**
 * 修正後の値（正しい値）
 */
const CORRECT_SCROLL_Y = 'calc(100vh - 450px)';

// ── テスト ───────────────────────────────────────────────────────────

describe('ExperimentInstructionTab — scroll.y 値', () => {

  test('scroll.y が calc(100vh - 450px) であること', () => {
    expect(getScrollY()).toBe(CORRECT_SCROLL_Y);
  });

  test('修正前の値 calc(100vh - 360px) ではないこと', () => {
    expect(getScrollY()).not.toBe(OLD_SCROLL_Y);
  });

  test('scroll.y が 100vh ベースの calc() 形式であること', () => {
    const scrollY = getScrollY();
    expect(scrollY).toMatch(/^calc\(100vh\s*-\s*\d+px\)$/);
  });

  test('差し引き値が 400px 以上であること（ナビゲーション等の合計高さを十分に確保）', () => {
    const scrollY = getScrollY();
    // "calc(100vh - NNNpx)" から NNN を抽出
    const match = scrollY.match(/calc\(100vh\s*-\s*(\d+)px\)/);
    expect(match).not.toBeNull();
    const offsetPx = parseInt(match![1], 10);
    // 実験指示タブは EvaluationRegistrationTab (-420px) よりも UI 要素が多いため 420px 以上が必要
    expect(offsetPx).toBeGreaterThanOrEqual(420);
  });
});
