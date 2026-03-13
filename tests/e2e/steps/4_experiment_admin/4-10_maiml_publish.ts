/**
 * ステップ定義: [4-10] プロジェクト公開
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
 *
 * ⚠️ 注意: フロントエンド未実装のため @pending タグを付与しています。
 *          フロントエンド実装完了後に feature ファイルの @pending タグを削除してテストを有効化すること。
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブルを UPSERT して準備する
 *   - 4-10-1, 4-10-2 用: テスト用 MAIMLファイルが S3 に存在すること
 *     （DB レコードのみ準備。S3 ファイルは手動で配置すること）
 *   - 4-10-3, 4-10-4 用: maiml_asset / maiml_publish_registry を Before フックで準備する
 *
 * data-testid 一覧（フロントエンド実装時に付与すること）:
 *   FileListTable コンポーネント:
 *   - [maiml-publish-button]              : 「公開」ボタン（未公開状態）
 *   - [maiml-published-button]            : 「公開済み」ボタン（公開中状態・緑・disabled）
 *   - [maiml-unpublish-menu-item]         : 「非公開にする」ドロップダウン項目
 *
 *   MaimlPublishDialog コンポーネント:
 *   - [maiml-publish-dialog]              : MaimlPublishDialog モーダル本体
 *   - [maiml-publish-preview-mode-select] : プレビューモード Select（uniform/maxhold/mmr）
 *   - [maiml-publish-store-raw-checkbox]  : 「生データを保存する」チェックボックス
 *   - [maiml-publish-keep-raw-checkbox]   : 「非公開時も生データを保持」チェックボックス
 *   - [maiml-publish-submit-button]       : 「公開する」実行ボタン
 *   - [maiml-publish-cancel-button]       : 「キャンセル」ボタン
 *   - [maiml-publish-result]              : 公開完了結果表示エリア
 *   - [maiml-publish-close-button]        : 完了後「閉じる」ボタン
 *
 *   MaimlUnpublishConfirmDialog コンポーネント:
 *   - [maiml-unpublish-confirm-dialog]    : MaimlUnpublishConfirmDialog モーダル本体
 *   - [maiml-unpublish-submit-button]     : 「非公開にする」実行ボタン（赤）
 *   - [maiml-unpublish-cancel-button]     : 「キャンセル」ボタン
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 * TODO: TEST_MAIML_FILE_URI は実際の S3 上のパスに要更新。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID（playwright.config.ts の baseURL と合わせる） */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/**
 * テスト用ユーザー（実験管理者）
 * TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
 */
const ADMIN_EMAIL = 'experiment_admin@example.com';
const ADMIN_PASSWORD = 'admin123';

/** テスト用プロジェクト情報 */
const TEST_PROJECT_ID = 'E2E-4-10';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-10';

/**
 * テスト用 MAIMLファイルの S3 上の相対パス（organization_id なし）
 * TODO: 実際の S3 ファイルパスに更新すること
 */
const TEST_MAIML_FILE_URI = `projects/${TEST_PROJECT_NAME}/${TEST_PROJECT_NAME}.maiml`;

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = planning（計画中）
 */
const PROJECT_STATUS_PLANNING = 0;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in（チェックイン済み）
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

/** テストで作成した maiml_asset の asset_id（After で削除） */
const createdAssetIds: number[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-10-1, 4-10-2] テストデータ準備
 * - project を1件 UPSERT（planning / checked_in）
 * - MAIMLファイルは S3 に手動配置が必要
 */
Before({
  tags: '@4-10-1 or @4-10-2',
}, async () => {
  console.log('[4-10 Before @4-10-1/@4-10-2] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_PLANNING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-10 Before @4-10-1/@4-10-2] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-10 Before @4-10-1/@4-10-2] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-3, 4-10-4] テストデータ準備
 * - project を1件 UPSERT
 * - maiml_asset を1件 INSERT（公開済み状態）
 * - maiml_publish_registry を1件 INSERT（status='published'）
 */
Before({
  tags: '@4-10-3 or @4-10-4',
}, async () => {
  console.log('[4-10 Before @4-10-3/@4-10-4] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_PLANNING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // maiml_asset を INSERT して asset_id を取得
    const assetId = await insertMaimlAsset(TEST_MAIML_FILE_URI);
    createdAssetIds.push(assetId);

    // maiml_publish_registry を INSERT（status='published'）
    await insertMaimlPublishRegistry(assetId);

    console.log(`[4-10 Before @4-10-3/@4-10-4] テストデータ準備 完了: asset_id=${assetId}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-3/@4-10-4] テストデータ準備 失敗:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-10 After] クリーンアップ 開始');
  try {
    // maiml 関連テーブルを外部キー制約の順に削除
    for (const assetId of createdAssetIds) {
      try {
        await db.query(
          'DELETE FROM maiml_series_preview WHERE asset_id = $1',
          [assetId]
        );
        await db.query(
          'DELETE FROM maiml_condition_kv WHERE asset_id = $1',
          [assetId]
        );
        await db.query(
          'DELETE FROM maiml_material_kv WHERE asset_id = $1',
          [assetId]
        );
        await db.query(
          'DELETE FROM maiml_publish_registry WHERE asset_id = $1',
          [assetId]
        );
        await db.query(
          'DELETE FROM maiml_asset WHERE asset_id = $1',
          [assetId]
        );
        console.log(`[4-10 After] maiml_asset 削除 完了: asset_id=${assetId}`);
      } catch (error) {
        console.error(`[4-10 After] maiml_asset 削除 失敗: asset_id=${assetId}:`, error);
      }
    }
    createdAssetIds.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-10 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-10 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[4-10 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-10 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * テスト用MAIMLファイルがS3に存在し、プロジェクトがDBに登録されている
 * → Before フックで DB 準備済み。S3 ファイルは手動配置が前提。
 */
Given('テスト用MAIMLファイルがS3に存在し、プロジェクトがDBに登録されている', async ({}) => {
  console.log('[4-10 Given] MAIMLファイル前提: Before フックで DB 準備済み。S3 ファイルは手動配置が前提。');
});

/**
 * テスト用MAIMLファイルが公開済み状態でDBに登録されている
 * → Before フックで maiml_asset / maiml_publish_registry 準備済み
 */
Given('テスト用MAIMLファイルが公開済み状態でDBに登録されている', async ({}) => {
  console.log('[4-10 Given] 公開済み状態: Before フックで maiml_asset / maiml_publish_registry 準備済み');
});

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * プロジェクト管理タブが表示されている
 * ※ common.ts の「ログイン後」ステップと組み合わせて使用
 */
When('プロジェクト管理タブが表示されている', async ({ page }) => {
  console.log('[4-10 When] プロジェクト管理タブの表示を確認');
  const projectTab = page.locator('[data-testid="project-management-tab"]').first();
  const projectTabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'プロジェクト管理' }).first();

  const isTestIdVisible = await projectTab.isVisible({ timeout: 5000 }).catch(() => false);
  const tabLocator = isTestIdVisible ? projectTab : projectTabByText;
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * テスト用プロジェクトを選択する
 * プロジェクト管理画面のプロジェクト一覧から指定名のプロジェクトを選択する
 *
 * @param projectName - 選択するプロジェクト名
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-10 When] プロジェクト "${projectName}" を選択`);

  // プロジェクト一覧から対象プロジェクトの行を探してクリック
  const projectRow = page
    .locator('[data-testid="project-list-table"]')
    .locator('tr')
    .filter({ hasText: projectName })
    .first();

  // data-testid がない場合はテキストで検索
  const projectRowByText = page
    .locator('.ant-table-row, tbody tr')
    .filter({ hasText: projectName })
    .first();

  const hasTestId = await projectRow.count() > 0;
  const targetRow = hasTestId ? projectRow : projectRowByText;

  await targetRow.waitFor({ state: 'visible', timeout: 10000 });
  await targetRow.click();
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧のMAIMLファイル行の「公開」ボタンをクリックする
 * FileListTable: data-testid="maiml-publish-button"
 */
When('ファイル一覧のMAIMLファイル行の「公開」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル一覧の「公開」ボタンをクリック');

  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  await publishBtn.waitFor({ state: 'visible', timeout: 10000 });

  // ダイアログ表示を待機
  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-publish-dialog"]',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {
    // フォールバック: モーダルの汎用クラスで検出
  });

  await publishBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * MaimlPublishDialogのプレビューモードで指定値を選択する
 * MaimlPublishDialog: data-testid="maiml-publish-preview-mode-select"
 *
 * @param mode - 選択するモード（uniform / maxhold / mmr）
 */
When(
  'MaimlPublishDialogのプレビューモードで {string} を選択する',
  async ({ page }, mode: string) => {
    console.log(`[4-10 When] プレビューモードで "${mode}" を選択`);

    const modeSelect = page.locator('[data-testid="maiml-publish-preview-mode-select"]');
    await modeSelect.waitFor({ state: 'visible', timeout: 10000 });
    await modeSelect.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
      { state: 'visible', timeout: 5000 }
    );

    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${mode}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    await page
      .waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await page.waitForTimeout(300);
  }
);

/**
 * MaimlPublishDialogの「公開する」ボタンをクリックする
 * MaimlPublishDialog: data-testid="maiml-publish-submit-button"
 */
When('MaimlPublishDialogの「公開する」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] 「公開する」ボタンをクリック');

  const submitBtn = page.locator('[data-testid="maiml-publish-submit-button"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/maiml-opendata/publish') &&
      resp.request().method() === 'POST',
    { timeout: 30000 }
  ).catch(() => {
    // API レスポンスが来ない場合は続行
  });

  await submitBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧のMAIMLファイル行の「公開済み」ボタンをクリックする
 * FileListTable: data-testid="maiml-published-button"
 */
When('ファイル一覧のMAIMLファイル行の「公開済み」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル一覧の「公開済み」ボタンをクリック');

  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  await publishedBtn.waitFor({ state: 'visible', timeout: 10000 });
  await publishedBtn.click();
  await page.waitForTimeout(500);
});

/**
 * ドロップダウンから「非公開にする」を選択する
 * FileListTable: data-testid="maiml-unpublish-menu-item"
 */
When('ドロップダウンから「非公開にする」を選択する', async ({ page }) => {
  console.log('[4-10 When] ドロップダウンから「非公開にする」を選択');

  const menuItem = page.locator('[data-testid="maiml-unpublish-menu-item"]');
  const menuItemByText = page
    .locator('.ant-dropdown-menu-item, .ant-menu-item')
    .filter({ hasText: '非公開にする' })
    .first();

  const hasTestId = await menuItem.isVisible({ timeout: 3000 }).catch(() => false);
  const targetItem = hasTestId ? menuItem : menuItemByText;

  await targetItem.waitFor({ state: 'visible', timeout: 10000 });

  // 非公開確認ダイアログ表示を待機
  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-unpublish-confirm-dialog"]',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {});

  await targetItem.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * MaimlUnpublishConfirmDialogの「非公開にする」ボタンをクリックする
 * MaimlUnpublishConfirmDialog: data-testid="maiml-unpublish-submit-button"
 */
When('MaimlUnpublishConfirmDialogの「非公開にする」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] MaimlUnpublishConfirmDialogの「非公開にする」ボタンをクリック');

  const submitBtn = page.locator('[data-testid="maiml-unpublish-submit-button"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/maiml-opendata/unpublish/') &&
      resp.request().method() === 'DELETE',
    { timeout: 15000 }
  ).catch(() => {});

  await submitBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * MaimlPublishDialogが表示されること（4-10-1）
 * MaimlPublishDialog: data-testid="maiml-publish-dialog"
 */
Then('MaimlPublishDialogが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog の表示を確認');

  const dialog = page.locator('[data-testid="maiml-publish-dialog"]');
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: 'MaiML を公開する' }).first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const targetDialog = hasTestId ? dialog : dialogByTitle;

  await expect(targetDialog).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogにプレビューモード選択が表示されること（4-10-1）
 */
Then('MaimlPublishDialogにプレビューモード選択が表示されること', async ({ page }) => {
  console.log('[4-10 Then] プレビューモード選択の表示を確認');

  const modeSelect = page.locator('[data-testid="maiml-publish-preview-mode-select"]');
  await expect(modeSelect).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること（4-10-1）
 */
Then('MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「生データを保存する」チェックボックスの表示を確認');

  const checkbox = page.locator('[data-testid="maiml-publish-store-raw-checkbox"]');
  const checkboxByText = page.locator('.ant-checkbox-wrapper').filter({ hasText: '生データを保存する' }).first();

  const hasTestId = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? checkbox : checkboxByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「公開する」ボタンが表示されること（4-10-1）
 */
Then('MaimlPublishDialogに「公開する」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「公開する」ボタンの表示を確認');

  const submitBtn = page.locator('[data-testid="maiml-publish-submit-button"]');
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「キャンセル」ボタンが表示されること（4-10-1）
 */
Then('MaimlPublishDialogに「キャンセル」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog の「キャンセル」ボタンの表示を確認');

  const cancelBtn = page.locator('[data-testid="maiml-publish-cancel-button"]');
  const cancelBtnByText = page
    .locator('[data-testid="maiml-publish-dialog"] .ant-btn')
    .filter({ hasText: 'キャンセル' })
    .first();

  const hasTestId = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? cancelBtn : cancelBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 公開完了結果が表示されること（4-10-2）
 * MaimlPublishDialog: data-testid="maiml-publish-result"
 */
Then('公開完了結果が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 公開完了結果の表示を確認');

  const result = page.locator('[data-testid="maiml-publish-result"]');
  const resultByText = page.locator('.ant-modal').filter({ hasText: '公開が完了しました' }).first();

  const hasTestId = await result.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? result : resultByText;

  await expect(target).toBeVisible({ timeout: 15000 });
});

/**
 * 公開完了結果に条件KV件数が表示されること（4-10-2）
 */
Then('公開完了結果に条件KV件数が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 条件KV件数の表示を確認');

  const result = page.locator('[data-testid="maiml-publish-result"]');
  const resultFallback = page.locator('.ant-modal-body');

  const hasTestId = await result.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? result : resultFallback;

  // 「条件KV」または「条件KV:」を含むテキストが表示されること
  await expect(target).toContainText(/条件KV/, { timeout: 10000 });
});

/**
 * 公開完了結果に材料KV件数が表示されること（4-10-2）
 */
Then('公開完了結果に材料KV件数が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 材料KV件数の表示を確認');

  const result = page.locator('[data-testid="maiml-publish-result"]');
  const resultFallback = page.locator('.ant-modal-body');

  const hasTestId = await result.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? result : resultFallback;

  await expect(target).toContainText(/材料KV/, { timeout: 10000 });
});

/**
 * 公開完了結果に「閉じる」ボタンが表示されること（4-10-2）
 */
Then('公開完了結果に「閉じる」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「閉じる」ボタンの表示を確認');

  const closeBtn = page.locator('[data-testid="maiml-publish-close-button"]');
  const closeBtnByText = page
    .locator('[data-testid="maiml-publish-dialog"] .ant-btn, .ant-modal-footer .ant-btn')
    .filter({ hasText: '閉じる' })
    .first();

  const hasTestId = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? closeBtn : closeBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * ファイル一覧のMAIMLファイル行に「公開済み」ボタンが表示されること（4-10-3）
 * FileListTable: data-testid="maiml-published-button"
 */
Then('ファイル一覧のMAIMLファイル行に「公開済み」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「公開済み」ボタンの表示を確認');

  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  await expect(publishedBtn).toBeVisible({ timeout: 10000 });
});

/**
 * 「公開済み」ボタンが非活性（disabled）であること（4-10-3）
 * FileListTable: data-testid="maiml-published-button"
 */
Then('「公開済み」ボタンが非活性（disabled）であること', async ({ page }) => {
  console.log('[4-10 Then] 「公開済み」ボタンが disabled であることを確認');

  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  await expect(publishedBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * MaimlUnpublishConfirmDialogが表示されること（4-10-4）
 * MaimlUnpublishConfirmDialog: data-testid="maiml-unpublish-confirm-dialog"
 */
Then('MaimlUnpublishConfirmDialogが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlUnpublishConfirmDialog の表示を確認');

  const dialog = page.locator('[data-testid="maiml-unpublish-confirm-dialog"]');
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: '公開を取り消しますか？' }).first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? dialog : dialogByTitle;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlUnpublishConfirmDialogに「非公開にする」ボタン（赤）が表示されること（4-10-4）
 */
Then('MaimlUnpublishConfirmDialogに「非公開にする」ボタン（赤）が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「非公開にする」ボタン（赤）の表示を確認');

  const submitBtn = page.locator('[data-testid="maiml-unpublish-submit-button"]');
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlUnpublishConfirmDialogに「キャンセル」ボタンが表示されること（4-10-4）
 */
Then('MaimlUnpublishConfirmDialogに「キャンセル」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlUnpublishConfirmDialog の「キャンセル」ボタンの表示を確認');

  const cancelBtn = page.locator('[data-testid="maiml-unpublish-cancel-button"]');
  const cancelBtnByText = page
    .locator('[data-testid="maiml-unpublish-confirm-dialog"] .ant-btn, .ant-modal-footer .ant-btn')
    .filter({ hasText: 'キャンセル' })
    .first();

  const hasTestId = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? cancelBtn : cancelBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 非公開処理が完了すること（4-10-4）
 * ダイアログが閉じることで確認する
 */
Then('非公開処理が完了すること', async ({ page }) => {
  console.log('[4-10 Then] 非公開処理の完了を確認');

  // MaimlUnpublishConfirmDialog が閉じることを確認
  const dialog = page.locator('[data-testid="maiml-unpublish-confirm-dialog"]');
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: '公開を取り消しますか？' });

  const hasTestId = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

  if (hasTestId) {
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  } else {
    await expect(dialogByTitle).not.toBeVisible({ timeout: 10000 });
  }
});

/**
 * ファイル一覧のMAIMLファイル行のボタンが「公開」（青・活性）に戻ること（4-10-4）
 * FileListTable: data-testid="maiml-publish-button"
 */
Then('ファイル一覧のMAIMLファイル行のボタンが「公開」（青・活性）に戻ること', async ({ page }) => {
  console.log('[4-10 Then] 「公開」ボタン（青・活性）への復元を確認');

  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await expect(publishBtn).toBeEnabled({ timeout: 10000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId      - プロジェクトID
 * @param projectName    - プロジェクト名
 * @param projectStatus  - プロジェクトステータス数値
 * @param checkoutStatus - チェックアウトステータス数値
 * @param maimlFlg       - MAIMLファイル登録フラグ
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertProject(
  projectId: string,
  projectName: string,
  projectStatus: number,
  checkoutStatus: number,
  maimlFlg: boolean
): Promise<void> {
  console.log(
    `[4-10 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
  );
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project
         SET project_name = $1,
             project_status = $2,
             checkout_status = $3,
             project_maiml_flg = $4,
             update_user_id = 'e2e-test',
             update_at = NOW()
         WHERE organization_id = $5 AND project_id = $6`,
        [projectName, projectStatus, checkoutStatus, maimlFlg, ORG_ID, projectId]
      );
      console.log(`[4-10 upsertProject] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project (
          organization_id, project_id, project_name, project_status,
          project_maiml_flg, checkout_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, projectName, projectStatus, maimlFlg, checkoutStatus]
      );
      console.log(`[4-10 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-10 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用 maiml_asset を INSERT する（公開済み状態の準備用）
 *
 * @param fileUri - ストレージ上の相対パス（organization_id なし）
 * @returns 作成された asset_id
 *
 * DDL参照: backend/migrations/20260310_create_maiml_opendata_tables.sql
 */
async function insertMaimlAsset(fileUri: string): Promise<number> {
  console.log(`[4-10 insertMaimlAsset] 開始: file_uri=${fileUri}`);
  try {
    const result = await db.query<{ asset_id: number }>(
      `INSERT INTO maiml_asset (
        organization_id, file_uri, doc_name,
        create_user_id, create_at, update_user_id, update_at
      ) VALUES (
        $1, $2, 'E2Eテスト用ドキュメント',
        'e2e-test', NOW(), 'e2e-test', NOW()
      )
      RETURNING asset_id`,
      [ORG_ID, fileUri]
    );
    const assetId = result.rows[0].asset_id;
    console.log(`[4-10 insertMaimlAsset] INSERT 完了: asset_id=${assetId}`);
    return assetId;
  } catch (error) {
    console.error(`[4-10 insertMaimlAsset] 失敗: file_uri=${fileUri}:`, error);
    throw error;
  }
}

/**
 * テスト用 maiml_publish_registry を INSERT する（公開済み状態の準備用）
 *
 * @param assetId - 対象の asset_id
 *
 * DDL参照: backend/migrations/20260310_create_maiml_opendata_tables.sql
 */
async function insertMaimlPublishRegistry(assetId: number): Promise<void> {
  console.log(`[4-10 insertMaimlPublishRegistry] 開始: asset_id=${assetId}`);
  try {
    await db.query(
      `INSERT INTO maiml_publish_registry (
        asset_id, status, preview_mode,
        store_raw_series, keep_raw_on_unpublish,
        create_user_id, create_at, update_user_id, update_at
      ) VALUES (
        $1, 'published', 'uniform',
        false, false,
        'e2e-test', NOW(), 'e2e-test', NOW()
      )`,
      [assetId]
    );
    console.log(`[4-10 insertMaimlPublishRegistry] INSERT 完了: asset_id=${assetId}`);
  } catch (error) {
    console.error(`[4-10 insertMaimlPublishRegistry] 失敗: asset_id=${assetId}:`, error);
    throw error;
  }
}
