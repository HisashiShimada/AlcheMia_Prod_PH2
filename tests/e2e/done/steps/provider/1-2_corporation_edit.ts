/**
 * ステップ定義: [1-2] 会社の編集
 *
 * 対応 feature: e2e/features/provider/1-2_corporation_edit.feature
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
 *       MaimlソフトAAA (is_active: true)  → [1-2-1] 編集対象
 *       MaimlソフトBBB (is_active: true)  → [1-2-2][1-2-3][1-2-4][1-2-6][1-2-7][1-2-8] 編集対象
 *       MaimlソフトYYY (is_active: true)  → [1-2-8] 重複チェック用（変更なし）
 *
 * カバーするシナリオ:
 *   [1-2-1] 会社名を変更して保存できること
 *   [1-2-2] 会社の状態をアクティブから非アクティブに変更して保存できること
 *   [1-2-3] 会社の状態を非アクティブからアクティブに変更して保存できること
 *   [1-2-4] 会社編集ダイアログをキャンセルしても変更が保存されないこと
 *   [1-2-5] 会社編集ダイアログに既存の値が表示されること
 *   [1-2-6] 会社名を空にして保存しようとするとバリデーションエラーが表示されること
 *   [1-2-7] 会社名を51文字以上に変更するとバリデーションエラーが表示されること
 *   [1-2-8] 既存の別会社名に変更しようとすると重複エラーが表示されること
 *
 * Before フック:
 *   - [1-2-1] "E2E編集後株式会社" をクリーンアップ対象に登録
 *   - [1-2-2] MaimlソフトBBB の is_active を元に戻す登録
 *   - [1-2-3] MaimlソフトBBB の is_active を元に戻す登録
 *
 * After フック:
 *   - 一時作成レコードを削除
 *   - 常設データの名前変更を元に戻す（リネーム復元）
 *   - 常設データの is_active を元に戻す
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
 * DB に事前投入済みのため Before フックで作成しない。
 * テスト後は元の状態に復元する。
 */
const PRESET = {
  AAA: 'MaimlソフトAAA', // [1-2-1] 編集対象（is_active: true）
  BBB: 'MaimlソフトBBB', // [1-2-2][1-2-3][1-2-4][1-2-5][1-2-6][1-2-7][1-2-8] 編集対象
  YYY: 'MaimlソフトYYY', // [1-2-8] 重複チェック用の既存会社名（変更なし）
} as const;

/** After フックで削除すべき一時作成レコードの会社名 */
const tempCreatedNames: string[] = [];

/** After フックで元の名前に戻すべき変更履歴 { from: 変更後の名前, to: 元の名前 } */
const renamedCorps: Array<{ from: string; to: string }> = [];

/** After フックで is_active を元に戻すべき会社 */
const statusRestoreList: Array<{ corporationName: string; isActive: boolean }> = [];

/** DataTable の行を {フィールド: 値} に変換するヘルパー型 */
type DataTableRow = { フィールド: string; 値: string };

// ---------------------------------------------------------------------------
// Before フック: シナリオごとに後処理の登録
// ---------------------------------------------------------------------------

/** [1-2-1] 編集後の会社名を一時作成リストに登録 */
Before({ tags: '@1-2-1' }, async () => {
  tempCreatedNames.push('E2E編集後株式会社');
  // MaimlソフトAAA のリネームを後で元に戻す
  renamedCorps.push({ from: 'E2E編集後株式会社', to: PRESET.AAA });
});

/** [1-2-2] BBB の is_active を true に戻す登録 */
Before({ tags: '@1-2-2' }, async () => {
  statusRestoreList.push({ corporationName: PRESET.BBB, isActive: true });
});

/** [1-2-3] BBB の is_active を false に戻す登録（非アクティブ→アクティブのシナリオなので元はfalse） */
Before({ tags: '@1-2-3' }, async () => {
  // シナリオ実行前に BBB を非アクティブにセット
  await db.query(
    `UPDATE corporation SET is_active = false, update_at = NOW()
     WHERE corporation_name = $1`,
    [PRESET.BBB]
  );
  statusRestoreList.push({ corporationName: PRESET.BBB, isActive: true });
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
 * 指定した会社の「編集」ボタンをクリックする
 */
When('会社 {string} の「編集」ボタンをクリックする', async ({ page }, corporationName: string) => {
  const row = page.locator('table tr', {
    has: page.locator(`td:has-text("${corporationName}")`),
  });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.locator('button:has-text("編集")').click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

/**
 * 会社編集ダイアログで情報を変更して保存する（DataTable形式）
 */
When(
  '会社編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillEditCorporationForm(page, table.hashes());
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page);
  }
);

/**
 * 会社編集ダイアログで会社名を指定値に変更する（保存なし）
 * キャンセルシナリオ [1-2-4] 用
 */
When(
  '会社編集ダイアログで会社名を {string} に変更する',
  async ({ page }, newName: string) => {
    await page.waitForSelector('.ant-modal', { timeout: 10000 });
    await setInputValue(page, '.ant-modal .ant-input', newName);
  }
);

/**
 * 会社編集ダイアログで会社名を指定値に変更して保存する
 * バリデーション・重複チェックシナリオ用
 */
When(
  '会社編集ダイアログで会社名を {string} に変更して保存する',
  async ({ page }, newName: string) => {
    await page.waitForSelector('.ant-modal', { timeout: 10000 });
    await setInputValue(page, '.ant-modal .ant-input', newName);
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page);
  }
);

/**
 * 編集ダイアログの「キャンセル」ボタンをクリックする
 */
When('編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Then: 検証
// ---------------------------------------------------------------------------

Then('会社編集ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社編集' })
  ).toBeVisible({ timeout: 10000 });
});

Then('会社一覧に {string} が表示されること', async ({ page }, corporationName: string) => {
  await expect(
    page.locator(`table td:has-text("${corporationName}")`)
  ).toBeVisible({ timeout: 10000 });
});

Then('会社一覧に {string} が表示されないこと', async ({ page }, corporationName: string) => {
  await expect(
    page.locator(`table td:has-text("${corporationName}")`)
  ).not.toBeVisible({ timeout: 10000 });
});

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

Then(
  'データベースの会社名 {string} のレコードが存在すること',
  async ({}, corporationName: string) => {
    const result = await db.query(
      'SELECT corporation_id FROM corporation WHERE corporation_name = $1',
      [corporationName]
    );
    expect(
      result.rowCount,
      `corporation_name="${corporationName}" のレコードが存在しません`
    ).toBeGreaterThan(0);
  }
);

Then(
  'データベースに会社名 {string} のレコードが存在しないこと',
  async ({}, corporationName: string) => {
    const result = await db.query(
      'SELECT corporation_id FROM corporation WHERE corporation_name = $1',
      [corporationName]
    );
    expect(
      result.rowCount,
      `corporation_name="${corporationName}" のレコードが存在しますが、存在しないはずです`
    ).toBe(0);
  }
);

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

Then('会社編集ダイアログが閉じること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社編集' })
  ).not.toBeVisible({ timeout: 10000 });
});

Then('会社編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社編集' })
  ).toBeVisible({ timeout: 5000 });
});

Then(
  '会社名フィールドに {string} が表示されていること',
  async ({ page }, expectedValue: string) => {
    const input = page.locator('.ant-modal .ant-input');
    await expect(input).toHaveValue(expectedValue, { timeout: 5000 });
  }
);

Then('「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-footer .ant-btn-primary')
  ).toBeVisible({ timeout: 5000 });
});

Then('「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-footer .ant-btn-default')
  ).toBeVisible({ timeout: 5000 });
});

Then('バリデーションエラー {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

Then('エラーメッセージ {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(
      `.ant-message-notice-wrapper:has-text("${errorMessage}"), .ant-form-item-explain-error:has-text("${errorMessage}")`
    )
  ).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// After フック: テストデータのクリーンアップ・復元
// ---------------------------------------------------------------------------

/**
 * 全シナリオ後:
 * 1. 一時作成レコードを削除
 * 2. 常設データの名前変更を元に戻す（リネーム復元）
 * 3. 常設データの is_active を元に戻す
 */
After(async () => {
  // 一時作成レコードの削除
  for (const name of tempCreatedNames) {
    await db.query(
      'DELETE FROM corporation WHERE corporation_name = $1',
      [name]
    ).catch(() => {});
  }
  tempCreatedNames.length = 0;

  // 名前変更の復元（"E2E編集後株式会社" → "MaimlソフトAAA" など）
  for (const { from, to } of renamedCorps) {
    await db.query(
      `UPDATE corporation SET corporation_name = $1, update_at = NOW()
       WHERE corporation_name = $2`,
      [to, from]
    ).catch(() => {});
  }
  renamedCorps.length = 0;

  // is_active の復元
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
 * 保存ボタン押下後の応答待機（PUT API / バリデーションエラー / トースト のいずれか）
 */
async function waitForSaveResponse(
  page: import('@playwright/test').Page
): Promise<void> {
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/provider/corporation') &&
          resp.request().method() === 'PUT',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: 10000 })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
}

/**
 * input 要素に React の onChange を発火させながら値をセットする。
 * Ant Design の制御コンポーネントは nativeInputValueSetter を使わないと
 * React の状態が更新されないため、evaluate で強制トリガーする。
 */
async function setInputValue(
  page: import('@playwright/test').Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector);
  await input.waitFor({ state: 'visible', timeout: 5000 });

  await page.evaluate(
    ({ sel, val }: { sel: string; val: string }) => {
      /* eslint-disable no-undef */
      const el = (document as Document).querySelector(sel) as HTMLInputElement | null;
      if (!el) return;
      const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeInputValueSetter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    { sel: selector, val: value }
  );
}

/**
 * Ant Design Select コンポーネントでオプションを選択する。
 */
async function selectOption(
  page: import('@playwright/test').Page,
  selectSelector: string,
  optionTitle: string
): Promise<void> {
  const selectEl = page.locator(selectSelector);
  await selectEl.waitFor({ state: 'visible', timeout: 5000 });
  await selectEl.click();

  await page.waitForFunction(
    () => {
      /* eslint-disable no-undef */
      const dropdowns = (document as Document).querySelectorAll('.ant-select-dropdown');
      return Array.from(dropdowns).some((d) => {
        const el = d as HTMLElement;
        return (
          !el.classList.contains('ant-select-dropdown-hidden') &&
          (window as Window & typeof globalThis).getComputedStyle(el).display !== 'none'
        );
      });
      /* eslint-enable no-undef */
    },
    { timeout: 5000 }
  );

  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown
    .locator(`.ant-select-item-option[title="${optionTitle}"]`)
    .click();
}

/**
 * 会社編集モーダルのフォームに DataTable の値を入力する。
 *
 * DataTable:
 * | フィールド | 値         |
 * | 会社名     | テスト会社  |
 * | 状態       | アクティブ  |
 */
async function fillEditCorporationForm(
  page: import('@playwright/test').Page,
  rows: DataTableRow[]
): Promise<void> {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  for (const row of rows) {
    const field = row['フィールド'];
    const value = row['値'];

    if (field === '会社名') {
      await setInputValue(page, '.ant-modal .ant-input', value);
    }
    if (field === '状態') {
      await selectOption(page, '.ant-modal .ant-select', value);
    }
  }
}
