/**
 * ステップ定義: [1-1] 会社の作成
 *
 * 対応 feature: e2e/features/provider/1-1_corporation_create.feature
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
 *
 * カバーするシナリオ:
 *   [1-1-1] アクティブな会社を新規作成できること
 *   [1-1-2] 非アクティブな会社を新規作成できること
 *   [1-1-3] 会社追加ダイアログをキャンセルしても会社が作成されないこと
 *   [1-1-4] 会社追加ダイアログの初期状態が正しいこと
 *   [1-1-5] 会社名が未入力の場合にバリデーションエラーが表示されること
 *   [1-1-6] 会社名が51文字以上の場合にバリデーションエラーが表示されること
 *   [1-1-7] 既存の会社名を入力した場合に重複エラーが表示されること
 *
 * After フック:
 *   - テストで作成した会社レコードを corporation_name ベースで DELETE
 *   - DB 接続プールをクローズ
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト中に作成した会社名を追跡して After フックで削除する（@1-1-7 は除外） */
const createdCorporationNames: string[] = [];

/** DataTable の行を {フィールド: 値} に変換するヘルパー型 */
type DataTableRow = { フィールド: string; 値: string };

// ---------------------------------------------------------------------------
// When: ブラウザ操作
// ---------------------------------------------------------------------------

/**
 * プロバイダーユーザーでログインする
 * orgId をクエリパラメータに含めた URL へ遷移し、
 * ユーザーID・パスワードを入力してログインする
 */
When('プロバイダーユーザー {string} でログインする', async ({ page }, userId: string) => {
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');

  // ログインフォームが表示されるまで待機
  await page.waitForSelector('#userId', { timeout: 15000 });

  // ユーザーID・パスワードを入力してログイン
  await page.fill('#userId', userId);
  await page.fill('#password', 'auth0002');
  await page.click('button[type="submit"]');

  // ログイン完了を待機（メニュー or コンテンツが表示されるまで）
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * 会社管理画面を開く
 * プロバイダーメニューの「会社管理」タブをクリックする
 */
When('会社管理画面を開く', async ({ page }) => {
  await page.waitForSelector('text=会社管理', { timeout: 15000 });
  await page.click('text=会社管理');
  await page.waitForSelector('table', { timeout: 15000 });
});

/**
 * 「追加」ボタンをクリックする
 * クリック後にモーダルが DOM に描画されるまで待機する
 */
When('「追加」ボタンをクリックする', async ({ page }) => {
  await page.waitForSelector('button:has-text("追加")', { timeout: 10000 });
  await page.click('button:has-text("追加")');
  // Ant Design v6 は .ant-modal を使用
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

/**
 * 「キャンセル」ボタンをクリックする
 * Ant Design Modal の cancelText ボタンは .ant-modal-footer 内の default ボタン
 */
When('「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  // モーダルが閉じるまで待機
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

/**
 * 会社追加ダイアログで情報を入力して保存する（DataTable形式）
 *
 * DataTable のフィールド:
 *   - 会社名: テキスト入力
 *   - 状態  : Ant Design Select（アクティブ / 非アクティブ）
 */
When(
  '会社追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillCorporationForm(page, table.hashes());

    // 保存ボタンをクリック
    await page.locator('.ant-modal-footer .ant-btn-primary').click();

    // 以下のいずれか早い方が発生するまで待機:
    //   ケース A: POST API レスポンス（1-1-1, 1-1-2, 1-1-7）
    //   ケース B: フロントバリデーションエラー（1-1-5, 1-1-6）
    //   ケース C: トースト表示（1-1-7 の重複エラーなど）
    // ※ waitForLoadState('networkidle') はトーストが消えるより遅いため使用しない
    await Promise.race([
      page
        .waitForResponse(
          (resp) =>
            resp.url().includes('/provider/corporation') &&
            resp.request().method() === 'POST',
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
);

/**
 * 会社追加ダイアログで情報を入力する（保存しない）
 * キャンセルシナリオ [1-1-3] 用
 */
When(
  '会社追加ダイアログで以下の情報を入力する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillCorporationForm(page, table.hashes());
  }
);

// ---------------------------------------------------------------------------
// Then: 検証
// ---------------------------------------------------------------------------

/**
 * [1-1-1][1-1-4] 会社追加ダイアログが表示されること
 */
Then('会社追加ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社追加' })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [1-1-1][1-1-2] 会社一覧に指定の会社名が表示されること
 */
Then('会社一覧に {string} が表示されること', async ({ page }, corporationName: string) => {
  await expect(
    page.locator(`table td:has-text("${corporationName}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [1-1-3] 会社一覧に指定の会社名が表示されないこと
 */
Then('会社一覧に {string} が表示されないこと', async ({ page }, corporationName: string) => {
  await expect(
    page.locator(`table td:has-text("${corporationName}")`)
  ).not.toBeVisible({ timeout: 10000 });
});

/**
 * [1-1-1][1-1-2] 会社一覧の指定会社名の状態が期待値と一致すること
 *
 * CorporationManagement.tsx の rowClassName:
 *   アクティブ   : "inactive-row" クラスなし
 *   非アクティブ : "inactive-row" クラスあり
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
 * [1-1-1] データベースに指定会社名のレコードが存在すること
 */
Then(
  'データベースに会社名 {string} のレコードが存在すること',
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

/**
 * [1-1-3] データベースに指定会社名のレコードが存在しないこと
 */
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

/**
 * [1-1-1][1-1-2] データベースの指定会社名の is_active が true / false であること
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

/**
 * [1-1-7] データベースに指定会社名のレコードが1件のみ存在すること（重複チェック用）
 */
Then(
  'データベースに会社名 {string} のレコードが1件のみ存在すること',
  async ({}, corporationName: string) => {
    const result = await db.query(
      'SELECT corporation_id FROM corporation WHERE corporation_name = $1',
      [corporationName]
    );
    expect(
      result.rowCount,
      `corporation_name="${corporationName}" のレコードが1件のみであることを期待しましたが ${result.rowCount} 件でした`
    ).toBe(1);
  }
);

/**
 * [1-1-5][1-1-6] バリデーションエラーメッセージが表示されること（Form.Item エラー）
 */
Then('バリデーションエラー {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [1-1-7] エラーメッセージが表示されること（Toast / API エラー）
 */
Then('エラーメッセージ {string} が表示されること', async ({ page }, errorMessage: string) => {
  // Ant Design v6: メッセージトーストは .ant-message-notice-wrapper 内に表示される
  await expect(
    page.locator(
      `.ant-message-notice-wrapper:has-text("${errorMessage}"), .ant-form-item-explain-error:has-text("${errorMessage}")`
    )
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [1-1-3] 会社追加ダイアログが閉じること
 */
Then('会社追加ダイアログが閉じること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社追加' })
  ).not.toBeVisible({ timeout: 10000 });
});

/**
 * [1-1-5][1-1-6][1-1-7] 会社追加ダイアログが閉じないこと（バリデーションエラー時）
 */
Then('会社追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(
    page.locator('.ant-modal').filter({ hasText: '会社追加' })
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [1-1-4] 会社名フィールドが空であること
 */
Then('会社名フィールドが空であること', async ({ page }) => {
  const input = page.locator('.ant-modal input[placeholder="株式会社サンプル"]');
  await expect(input).toHaveValue('', { timeout: 5000 });
});

/**
 * [1-1-4] 状態の初期値が指定値であること
 */
Then('状態の初期値が {string} であること', async ({ page }, expectedLabel: string) => {
  // 「状態」ラベルを持つ Form.Item 全体を基点にテキストを確認する
  // （.ant-select-selector の DOM クラスに依存しない安定した方法）
  const statusFormItem = page.locator('.ant-modal .ant-form-item', { hasText: '状態' });
  await expect(statusFormItem).toBeVisible({ timeout: 5000 });
  await expect(statusFormItem).toContainText(expectedLabel, { timeout: 5000 });
});

/**
 * [1-1-4] 「保存」ボタンが表示されていること
 * Ant Design Modal の okText ボタンは .ant-modal-footer 内のプライマリボタン
 */
Then('「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-footer .ant-btn-primary')
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [1-1-4] 「キャンセル」ボタンが表示されていること
 * Ant Design Modal の cancelText ボタンは .ant-modal-footer 内の default ボタン
 */
Then('「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-footer .ant-btn-default')
  ).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// After フック: テストデータのクリーンアップ
// ---------------------------------------------------------------------------

/**
 * @1-1-7 以外のシナリオ: テストで作成した会社レコードを削除する
 */
After({ tags: 'not @1-1-7' }, async () => {
  for (const name of createdCorporationNames) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]);
  }
  createdCorporationNames.length = 0;
});

/**
 * @1-1-7 シナリオ: 常設テストデータ（MaimlソフトYYY）は削除しない
 * 配列のみクリアして DB 操作は行わない
 */
After({ tags: '@1-1-7' }, async () => {
  // 常設テストデータのため DB 削除は行わずリストだけリセット
  createdCorporationNames.length = 0;
});

/**
 * 全シナリオ完了後に DB 接続プールを1回だけクローズする
 */
AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/**
 * 会社追加モーダルのフォームに DataTable の値を入力する
 *
 * DataTable:
 * | フィールド | 値              |
 * | 会社名     | テスト会社      |
 * | 状態       | アクティブ      |
 *
 * @param page Playwright Page
 * @param rows DataTable の行配列
 */
async function fillCorporationForm(
  page: import('@playwright/test').Page,
  rows: DataTableRow[]
): Promise<void> {
  // モーダルが表示されるまで待機（Ant Design v6 は .ant-modal を使用）
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  for (const row of rows) {
    const field = row['フィールド'];
    const value = row['値'];

    if (field === '会社名') {
      const input = page.locator('.ant-modal .ant-input');
      await input.waitFor({ state: 'visible', timeout: 5000 });
      // React の nativeInputValueSetter を使って onChange を強制トリガー
      await page.evaluate(
        ({ selector, val }: { selector: string; val: string }) => {
          /* eslint-disable no-undef */
          const el = (document as Document).querySelector(selector) as HTMLInputElement | null;
          if (!el) return;
          const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          nativeInputValueSetter?.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          /* eslint-enable no-undef */
        },
        { selector: '.ant-modal .ant-input', val: value || '' }
      );
      if (value) {
        // After フックでのクリーンアップのために会社名を記録
        createdCorporationNames.push(value);
      }
    }

    if (field === '状態') {
      // Ant Design Select の .ant-select をクリックしてドロップダウンを開く
      const selectEl = page.locator('.ant-modal .ant-select');
      await selectEl.waitFor({ state: 'visible', timeout: 5000 });
      await selectEl.click();

      // ドロップダウンが visible になるまで待機
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

      // 表示中のドロップダウン内の title 属性でオプションを選択
      const visibleDropdown = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
        .first();
      await visibleDropdown
        .locator(`.ant-select-item-option[title="${value}"]`)
        .click();
    }
  }
}
