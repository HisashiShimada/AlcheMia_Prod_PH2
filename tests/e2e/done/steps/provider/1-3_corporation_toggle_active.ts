/**
 * ステップ定義: [1-3] 会社のアクティブ/非アクティブ化
 *
 * 対応 feature: e2e/features/provider/1-3_corporation_toggle_active.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6
 *   ユーザID  : seiya.takizawa@soft-service.co.jp
 *   パスワード: auth0002
 *
 * 実行前提:
 *   - フロントエンド (http://localhost:3000) が起動していること
 *   - バックエンド (http://localhost:3001) が起動していること
 *   - PostgreSQL が起動していること
 *   - テスト用プロバイダーユーザー（seiya.takizawa@soft-service.co.jp）が
 *     organization_user テーブルに存在すること
 *   - 下記の常設テストデータが corporation テーブルに存在すること:
 *       MaimlソフトCCC (is_active: true)  → [1-3-1] アクティブ→非アクティブ（個別）
 *       MaimlソフトDDD (is_active: false) → [1-3-2] 非アクティブ→アクティブ（個別）
 *       MaimlソフトBBB (is_active: true)  → [1-3-3] キャンセル確認（常設・変更なし）
 *       MaimlソフトYYY (is_active: false) → [1-3-4] 一括アクティブ化対象
 *       MaimlソフトAAA (is_active: true)  → [1-3-5] 一括非アクティブ化対象
 *
 * カバーするシナリオ:
 *   [1-3-1] 個別ボタンでアクティブな会社を非アクティブに切り替えられること
 *   [1-3-2] 個別ボタンで非アクティブな会社をアクティブに切り替えられること
 *   [1-3-3] 個別切り替えダイアログをキャンセルしても状態が変わらないこと
 *   [1-3-4] 複数選択して一括アクティブ化できること
 *   [1-3-5] 複数選択して一括非アクティブ化できること
 *
 * Before フック:
 *   - [1-3-1] CCC を is_active: true にセット
 *   - [1-3-2] DDD を is_active: false にセット
 *   - [1-3-3] BBB は常設(true)のためセット不要（After 復元登録のみ）
 *   - [1-3-4] YYY を is_active: false にセット
 *   - [1-3-5] AAA を is_active: true にセット
 *
 * After フック:
 *   - CCC / DDD / BBB / YYY / AAA の is_active を元の状態に復元
 *   - DB 接続プールをクローズ
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/**
 * 常設テストデータの会社名。
 * DB に事前投入済みのため Before フックではステータスのセットのみ行う。
 */
const PRESET = {
  CCC: 'MaimlソフトCCC', // [1-3-1] アクティブ→非アクティブ（個別）
  DDD: 'MaimlソフトDDD', // [1-3-2] 非アクティブ→アクティブ（個別）
  BBB: 'MaimlソフトBBB', // [1-3-3] キャンセル確認（常設 true・変更なし）
  YYY: 'MaimlソフトYYY', // [1-3-4] 一括アクティブ化対象
  AAA: 'MaimlソフトAAA', // [1-3-5] 一括非アクティブ化対象
} as const;

/** After フックで is_active を元に戻すべき会社 */
const statusRestoreList: Array<{ corporationName: string; isActive: boolean }> = [];

/** DataTable の行型 */
type CompanyRow = { 会社名: string };

// ---------------------------------------------------------------------------
// Before フック: テスト前に常設データのステータスを確定させる
// ---------------------------------------------------------------------------

/** [1-3-1] CCC を is_active: true にセット */
Before({ tags: '@1-3-1' }, async () => {
  await db.query(
    `UPDATE corporation SET is_active = true, update_at = NOW()
     WHERE corporation_name = $1`,
    [PRESET.CCC]
  );
  statusRestoreList.push({ corporationName: PRESET.CCC, isActive: true });
});

/** [1-3-2] DDD を is_active: false にセット */
Before({ tags: '@1-3-2' }, async () => {
  await db.query(
    `UPDATE corporation SET is_active = false, update_at = NOW()
     WHERE corporation_name = $1`,
    [PRESET.DDD]
  );
  statusRestoreList.push({ corporationName: PRESET.DDD, isActive: false });
});

/** [1-3-3] BBB は常設(true)なのでセット不要。After 復元登録のみ行う。 */
Before({ tags: '@1-3-3' }, async () => {
  statusRestoreList.push({ corporationName: PRESET.BBB, isActive: true });
});

/** [1-3-4] YYY を is_active: false にセット（一括アクティブ化のため） */
Before({ tags: '@1-3-4' }, async () => {
  await db.query(
    `UPDATE corporation SET is_active = false, update_at = NOW()
     WHERE corporation_name = $1`,
    [PRESET.YYY]
  );
  statusRestoreList.push({ corporationName: PRESET.YYY, isActive: false });
});

/** [1-3-5] AAA を is_active: true にセット（一括非アクティブ化のため） */
Before({ tags: '@1-3-5' }, async () => {
  await db.query(
    `UPDATE corporation SET is_active = true, update_at = NOW()
     WHERE corporation_name = $1`,
    [PRESET.AAA]
  );
  statusRestoreList.push({ corporationName: PRESET.AAA, isActive: true });
});

// ---------------------------------------------------------------------------
// When: ブラウザ操作
// ---------------------------------------------------------------------------

/**
 * プロバイダーユーザーでログインする
 */
When('プロバイダーユーザー {string} でログインする', async ({ page }, userId: string) => {
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', userId);
  await page.fill('#password', 'auth0002');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * 会社管理画面を開く
 */
When('会社管理画面を開く', async ({ page }) => {
  await page.waitForSelector('text=会社管理', { timeout: 15000 });
  await page.click('text=会社管理');
  await page.waitForSelector('table', { timeout: 15000 });
});

/**
 * 指定した会社の個別切り替えボタンをクリックする。
 * アクティブ時は「非アクティブ」ボタン、非アクティブ時は「アクティブ」ボタンが表示される。
 */
When(
  '会社 {string} の個別切り替えボタンをクリックする',
  async ({ page }, corporationName: string) => {
    const row = page.locator('table tr', {
      has: page.locator(`td:has-text("${corporationName}")`),
    });
    await row.waitFor({ state: 'visible', timeout: 15000 });
    // 個別切り替えボタンは「非アクティブ」または「アクティブ」のテキストを持つ
    const toggleBtn = row.locator('button').filter({
      hasText: /^(非アクティブ|アクティブ)$/,
    });
    await toggleBtn.click();
    // 確認ダイアログが表示されるまで待機
    await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
  }
);

/**
 * 切り替え確認ダイアログで「OK」をクリックする
 */
When('切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page);
});

/**
 * 切り替え確認ダイアログで「キャンセル」をクリックする
 */
When('切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-default').click();
  await page.waitForSelector('.ant-modal-confirm', { state: 'hidden', timeout: 10000 });
});

/**
 * DataTable で指定した会社のチェックボックスを選択する
 */
When(
  '以下の会社のチェックボックスを選択する',
  async ({ page }, table: { hashes(): CompanyRow[] }) => {
    for (const row of table.hashes()) {
      const corporationName = row['会社名'];
      const tableRow = page.locator('table tr', {
        has: page.locator(`td:has-text("${corporationName}")`),
      });
      await tableRow.waitFor({ state: 'visible', timeout: 15000 });
      const checkbox = tableRow.locator('input[type="checkbox"]');
      await checkbox.check();
    }
  }
);

/**
 * 画面上部「追加」ボタンの右隣の「アクティブ」ボタンをクリックする
 * [1-3-4] 一括アクティブ化用
 */
When('画面上部「追加」ボタンの右隣の「アクティブ」ボタンをクリックする', async ({ page }) => {
  // 「追加」ボタンの右隣にある「アクティブ」ボタンを特定してクリック
  const addBtn = page.locator('button:has-text("追加")');
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  // 兄弟要素の次のボタンを取得（追加ボタンの直後）
  await addBtn.locator('xpath=following-sibling::button[contains(., "アクティブ")]').first().click();
});

/**
 * 画面上部「リロード」ボタンの左隣の「非アクティブ」ボタンをクリックする
 * [1-3-5] 一括非アクティブ化用
 */
When('画面上部「リロード」ボタンの左隣の「非アクティブ」ボタンをクリックする', async ({ page }) => {
  // 「リロード」ボタンの左隣にある「非アクティブ」ボタンを特定してクリック
  const reloadBtn = page.locator('button:has-text("リロード")');
  await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  // 兄弟要素の直前のボタンを取得
  await reloadBtn.locator('xpath=preceding-sibling::button[contains(., "非アクティブ")]').first().click();
});

/**
 * 一括操作確認ダイアログで「OK」をクリックする
 */
When('一括操作確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page);
});

// ---------------------------------------------------------------------------
// Then: 検証
// ---------------------------------------------------------------------------

/**
 * 切り替え確認ダイアログが表示されること
 */
Then('切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-confirm')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 一括操作確認ダイアログが表示されること
 */
Then('一括操作確認ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-confirm')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 会社一覧の指定会社名の状態が期待値と一致すること
 */
Then(
  '会社一覧の {string} の状態が {string} であること',
  async ({ page }, corporationName: string, expectedStatus: string) => {
    const row = page.locator('table tr', {
      has: page.locator(`td:has-text("${corporationName}")`),
    });
    await expect(row).toBeVisible({ timeout: 10000 });
    if (expectedStatus === 'アクティブ') {
      await expect(row).not.toHaveClass(/inactive-row/);
    } else {
      await expect(row).toHaveClass(/inactive-row/, { timeout: 10000 });
    }
  }
);

/**
 * データベースの指定会社名の is_active が true / false であること
 */
Then(
  'データベースの会社名 {string} の is_active が {word} であること',
  async ({}, corporationName: string, expectedValue: string) => {
    const result = await db.query<{ is_active: boolean }>(
      'SELECT is_active FROM corporation WHERE corporation_name = $1',
      [corporationName]
    );
    expect(
      result.rowCount,
      `corporation_name="${corporationName}" のレコードが存在しません`
    ).toBeGreaterThan(0);
    const isActive = result.rows[0].is_active;
    const expected = expectedValue === 'true';
    expect(
      isActive,
      `is_active が ${expected} であることを期待しましたが ${isActive} でした`
    ).toBe(expected);
  }
);

// ---------------------------------------------------------------------------
// After フック: テストデータの復元
// ---------------------------------------------------------------------------

/**
 * 全シナリオ後: is_active を元の状態に復元
 */
After(async () => {
  for (const { corporationName, isActive } of statusRestoreList) {
    await db.query(
      `UPDATE corporation SET is_active = $1, update_at = NOW()
       WHERE corporation_name = $2`,
      [isActive, corporationName]
    ).catch(() => {});
  }
  statusRestoreList.length = 0;
});

/** 全シナリオ完了後に DB 接続プールをクローズ */
AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/**
 * PATCH API レスポンスまたはトーストの表示を待機する
 */
async function waitForPatchResponse(
  page: import('@playwright/test').Page
): Promise<void> {
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/provider/corporation') &&
          resp.url().includes('/status') &&
          resp.request().method() === 'PATCH',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
}
