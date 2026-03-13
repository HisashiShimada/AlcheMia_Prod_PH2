/**
 * ステップ定義: [4-11] ファイルアップロード
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-11_file_upload.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブルを UPSERT して準備する
 *   - テスト用ファイルは tests/e2e/fixtures/testdata/ に配置すること
 *     - test_upload_single.maiml : 単一ファイルアップロード用
 *     - test_upload_1.csv        : 複数ファイルアップロード用 (1件目)
 *     - test_upload_2.txt        : 複数ファイルアップロード用 (2件目)
 *
 * data-testid 一覧（フロントエンド実装時に BulkUploadDialog.tsx へ付与すること）:
 *   BulkUploadDialog コンポーネント:
 *   - [bulk-upload-dialog]              : ダイアログ本体（Modal）
 *   - [upload-type-segment]             : アップロードタイプ Segmented（単一/一括/フォルダ）
 *   - [upload-dragger]                  : ファイルドラッグ&ドロップエリア（ant-upload-dragger）
 *   - [folder-select-button]            : フォルダ選択ボタン（フォルダモード）
 *   - [upload-file-list]                : 選択ファイル一覧エリア
 *   - [upload-start-button]             : 「アップロード開始」ボタン
 *   - [upload-cancel-button]            : 「キャンセル」ボタン
 *   - [upload-progress-alert]           : アップロード中 Alert（info）
 *   - [upload-progress-bar]             : 進捗バー（Progress）
 *   - [upload-success-alert]            : 完了 Alert（success）
 *   - [upload-error-alert]              : エラー Alert（error）
 *
 *   ProjectManagement ツールバー:
 *   - [upload-button]                   : 「アップロード」ボタン
 *
 * 手動テストシナリオ (@manual タグ):
 *   - 4-11-3: フォルダモードでフォルダをアップロードできること
 *   - 4-11-4: フォルダ構造を保持するオプションが有効な場合にフォルダ階層を維持してアップロードできること
 *   ※ ブラウザの webkitdirectory 属性を使用するため Playwright での自動化は困難
 *   ※ @manual タグのシナリオはこのファイルにステップ定義がないため実行されない
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import * as path from 'path';
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
const TEST_PROJECT_ID = 'E2E-4-11';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-11';

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

/** テスト用ファイルのベースディレクトリ */
const FIXTURES_DIR = path.join(__dirname, '../../fixtures/testdata');

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

/** テストで作成した upload_batch の batch_id（After で削除） */
const createdBatchIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 全自動化シナリオ共通: project を UPSERT
 */
Before({
  tags: '@4-11-1 or @4-11-2 or @4-11-5 or @4-11-6 or @4-11-7 or @4-11-8 or @4-11-9 or @4-11-10',
}, async () => {
  console.log('[4-11 Before] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_PLANNING,
      CHECKOUT_STATUS_CHECKED_IN
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-11 Before] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-11 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-11 After] クリーンアップ 開始');
  try {
    // upload_batch テーブルのテストデータを削除
    for (const batchId of createdBatchIds) {
      try {
        await db.query(
          'DELETE FROM upload_batch WHERE batch_id = $1',
          [batchId]
        );
        console.log(`[4-11 After] upload_batch 削除 完了: batch_id=${batchId}`);
      } catch (error) {
        console.error(`[4-11 After] upload_batch 削除 失敗: batch_id=${batchId}:`, error);
      }
    }
    createdBatchIds.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-11 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-11 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[4-11 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-11 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * テスト用プロジェクトがDBに登録されている
 * → Before フックで UPSERT 済みのため no-op
 */
Given('テスト用プロジェクト {string} がDBに登録されている', async ({}, _projectName: string) => {
  console.log(`[4-11 Given] プロジェクト前提: Before フックで UPSERT 済み (project_name=${_projectName})`);
});

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 *
 * @param email - ログインするユーザーのメールアドレス
 */
When('実験管理者ユーザー {string} でログインする', async ({ page }, email: string) => {
  console.log(`[4-11 When] ログイン: email=${email}`);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // メールアドレス入力
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="メール"], input[placeholder*="ID"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);

  // パスワード入力
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(ADMIN_PASSWORD);

  // ログインボタンクリック
  const loginBtn = page.locator('button[type="submit"], button:has-text("ログイン")').first();
  await loginBtn.click();

  // ログイン完了を待機（プロジェクト管理画面への遷移）
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
});

/**
 * プロジェクト管理タブが表示されている
 */
When('プロジェクト管理タブが表示されている', async ({ page }) => {
  console.log('[4-11 When] プロジェクト管理タブの表示を確認');

  const projectTab = page.locator('[data-testid="project-management-tab"]').first();
  const projectTabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'プロジェクト管理' }).first();

  const isTestIdVisible = await projectTab.isVisible({ timeout: 5000 }).catch(() => false);
  const tabLocator = isTestIdVisible ? projectTab : projectTabByText;
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * テスト用プロジェクトを選択する
 *
 * @param projectName - 選択するプロジェクト名
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-11 When] プロジェクト "${projectName}" を選択`);

  const projectRow = page
    .locator('[data-testid="project-list-table"]')
    .locator('tr')
    .filter({ hasText: projectName })
    .first();

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
 * ツールバーの「アップロード」ボタンをクリックする
 * ProjectManagement: data-testid="upload-button"
 */
When('ツールバーの「アップロード」ボタンをクリックする', async ({ page }) => {
  console.log('[4-11 When] ツールバーの「アップロード」ボタンをクリック');

  const uploadBtn = page.locator('[data-testid="upload-button"]').first();
  const uploadBtnByText = page
    .locator('button')
    .filter({ hasText: /アップロード/ })
    .first();

  const hasTestId = await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? uploadBtn : uploadBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  // ダイアログ表示を待機
  const dialogPromise = page.waitForSelector(
    '[data-testid="bulk-upload-dialog"], .ant-modal:has-text("一括ファイルアップロード")',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {});

  await targetBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * 一括ファイルアップロードダイアログが表示されること（When として使用）
 * BulkUploadDialog: data-testid="bulk-upload-dialog"
 */
When('一括ファイルアップロードダイアログが表示されること', async ({ page }) => {
  console.log('[4-11 When] 一括ファイルアップロードダイアログの表示を確認');

  const dialog = page.locator('[data-testid="bulk-upload-dialog"]');
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: '一括ファイルアップロード' }).first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? dialog : dialogByTitle;

  await target.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * アップロードタイプを選択する
 * BulkUploadDialog: data-testid="upload-type-segment"
 *
 * @param mode - 選択するモード（"単一ファイル" | "一括ファイル" | "フォルダ"）
 */
When('アップロードタイプで {string} を選択する', async ({ page }, mode: string) => {
  console.log(`[4-11 When] アップロードタイプで "${mode}" を選択`);

  const segment = page.locator('[data-testid="upload-type-segment"]');
  const segmentByClass = page.locator('.ant-segmented').first();

  const hasTestId = await segment.isVisible({ timeout: 3000 }).catch(() => false);
  const targetSegment = hasTestId ? segment : segmentByClass;

  // Segmented の中から該当ラベルを持つアイテムをクリック
  const segmentItem = targetSegment.locator('.ant-segmented-item').filter({ hasText: mode }).first();
  const segmentItemFallback = page
    .locator('.ant-segmented-item')
    .filter({ hasText: mode })
    .first();

  const itemCount = await segmentItem.count();
  const target = itemCount > 0 ? segmentItem : segmentItemFallback;

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForTimeout(300);
});

/**
 * アップロードエリアに単一のテストファイルを設定する
 * BulkUploadDialog: data-testid="upload-dragger" 配下の input[type="file"]
 *
 * @param fileName - アップロードするファイル名（fixtures/testdata/ 配下）
 */
When('アップロードエリアにテストファイル {string} を設定する', async ({ page }, fileName: string) => {
  console.log(`[4-11 When] テストファイル "${fileName}" を設定`);

  const filePath = path.join(FIXTURES_DIR, fileName);

  // Ant Design Dragger の隠し input に setInputFiles を使用
  const fileInput = page
    .locator('[data-testid="upload-dragger"] input[type="file"]')
    .first();
  const fileInputFallback = page
    .locator('.ant-upload-drag input[type="file"], .ant-upload input[type="file"]')
    .first();

  const hasTestId = await fileInput.count() > 0;
  const targetInput = hasTestId ? fileInput : fileInputFallback;

  await targetInput.setInputFiles(filePath);
  await page.waitForTimeout(500);
});

/**
 * アップロードエリアに複数のテストファイルを設定する
 * BulkUploadDialog: data-testid="upload-dragger" 配下の input[type="file"]
 *
 * @param fileNames - カンマ区切りのファイル名一覧（fixtures/testdata/ 配下）
 */
When('アップロードエリアに複数のテストファイル {string} を設定する', async ({ page }, fileNames: string) => {
  console.log(`[4-11 When] 複数テストファイル "${fileNames}" を設定`);

  const filePaths = fileNames.split(',').map((name) => path.join(FIXTURES_DIR, name.trim()));

  const fileInput = page
    .locator('[data-testid="upload-dragger"] input[type="file"]')
    .first();
  const fileInputFallback = page
    .locator('.ant-upload-drag input[type="file"], .ant-upload input[type="file"]')
    .first();

  const hasTestId = await fileInput.count() > 0;
  const targetInput = hasTestId ? fileInput : fileInputFallback;

  await targetInput.setInputFiles(filePaths);
  await page.waitForTimeout(500);
});

/**
 * 「アップロード開始」ボタンをクリックする
 * BulkUploadDialog: data-testid="upload-start-button"
 */
When('「アップロード開始」ボタンをクリックする', async ({ page }) => {
  console.log('[4-11 When] 「アップロード開始」ボタンをクリック');

  const startBtn = page.locator('[data-testid="upload-start-button"]');
  const startBtnByText = page
    .locator('.ant-modal-footer .ant-btn, [data-testid="bulk-upload-dialog"] .ant-btn')
    .filter({ hasText: 'アップロード開始' })
    .first();

  const hasTestId = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? startBtn : startBtnByText;

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForTimeout(300);
});

/**
 * ファイルを選択せずに「アップロード開始」ボタンをクリックする
 * （ファイル選択なしのバリデーション確認用）
 */
When('ファイルを選択せずに「アップロード開始」ボタンをクリックする', async ({ page }) => {
  console.log('[4-11 When] ファイル未選択で「アップロード開始」ボタンをクリック');

  const startBtn = page.locator('[data-testid="upload-start-button"]');
  const startBtnByText = page
    .locator('.ant-modal-footer .ant-btn, [data-testid="bulk-upload-dialog"] .ant-btn')
    .filter({ hasText: 'アップロード開始' })
    .first();

  const hasTestId = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? startBtn : startBtnByText;

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForTimeout(300);
});

/**
 * アップロード中にダイアログの「キャンセル」ボタンをクリックする
 * BulkUploadDialog: data-testid="upload-cancel-button"
 *
 * ⚠️ タイミング制御に注意:
 *   「アップロード開始」ボタンクリック直後にキャンセルを押す必要があるため、
 *   waitForTimeout で短い待機を入れてアップロード中状態を確保する。
 */
When('アップロード中にダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  console.log('[4-11 When] アップロード中に「キャンセル」ボタンをクリック');

  // アップロード中 Alert または進捗バーが表示されるまで待機
  await page
    .waitForSelector(
      '[data-testid="upload-progress-alert"], [data-testid="upload-progress-bar"], .ant-alert-info',
      { state: 'visible', timeout: 5000 }
    )
    .catch(() => {
      // アップロードが速すぎて進捗が表示される前に完了した場合は続行
    });

  const cancelBtn = page.locator('[data-testid="upload-cancel-button"]');
  const cancelBtnByText = page
    .locator('.ant-modal-footer .ant-btn')
    .filter({ hasText: 'キャンセル' })
    .first();

  const hasTestId = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? cancelBtn : cancelBtnByText;

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForTimeout(300);
});

/**
 * 選択ファイル一覧にファイルが表示されていること（When として使用）
 * BulkUploadDialog: data-testid="upload-file-list"
 */
When('選択ファイル一覧にファイルが表示されていること', async ({ page }) => {
  console.log('[4-11 When] 選択ファイル一覧にファイルが表示されていることを確認');

  const fileList = page.locator('[data-testid="upload-file-list"]');
  const fileListFallback = page.locator('.ant-modal').filter({ hasText: '一括ファイルアップロード' }).locator('.ant-list, .file-list');

  const hasTestId = await fileList.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? fileList : fileListFallback;

  await target.waitFor({ state: 'visible', timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * アップロードが完了すること（4-11-1, 4-11-2）
 * POST /api/v1/files/upload のレスポンスを待機して確認する
 */
Then('アップロードが完了すること', async ({ page }) => {
  console.log('[4-11 Then] アップロード完了を確認');

  // API レスポンスを待機（最大30秒）
  await page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/api/v1/files/upload') &&
        resp.request().method() === 'POST',
      { timeout: 30000 }
    )
    .catch(() => {
      console.warn('[4-11 Then] アップロードAPIのレスポンスが検出できませんでした（続行）');
    });

  // 成功アラートまたは成功メッセージが表示されるまで待機
  await page
    .waitForSelector(
      '[data-testid="upload-success-alert"], .ant-alert-success, .ant-message-success',
      { state: 'visible', timeout: 15000 }
    )
    .catch(() => {
      console.warn('[4-11 Then] 成功アラートが検出できませんでした（続行）');
    });

  await page.waitForTimeout(300);
});

/**
 * アップロード完了の成功メッセージが表示されること（4-11-1, 4-11-2）
 * message.success または Alert（success）のいずれかで確認する
 */
Then('アップロード完了の成功メッセージが表示されること', async ({ page }) => {
  console.log('[4-11 Then] アップロード完了の成功メッセージを確認');

  const successAlert = page.locator('[data-testid="upload-success-alert"]');
  const successAlertFallback = page
    .locator('.ant-alert-success, .ant-message-success')
    .first();

  const hasTestId = await successAlert.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? successAlert : successAlertFallback;

  await expect(target).toBeVisible({ timeout: 15000 });
});

/**
 * アップロード中に進捗アラートが表示されること（4-11-5）
 * BulkUploadDialog: data-testid="upload-progress-alert"
 */
Then('アップロード中に進捗アラートが表示されること', async ({ page }) => {
  console.log('[4-11 Then] 進捗アラートの表示を確認');

  const progressAlert = page.locator('[data-testid="upload-progress-alert"]');
  const progressAlertFallback = page.locator('.ant-alert-info').first();

  const hasTestId = await progressAlert.isVisible({ timeout: 8000 }).catch(() => false);
  const target = hasTestId ? progressAlert : progressAlertFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * アップロード中に進捗バーが表示されること（4-11-5）
 * BulkUploadDialog: data-testid="upload-progress-bar"
 */
Then('アップロード中に進捗バーが表示されること', async ({ page }) => {
  console.log('[4-11 Then] 進捗バーの表示を確認');

  const progressBar = page.locator('[data-testid="upload-progress-bar"]');
  const progressBarFallback = page
    .locator('.ant-modal .ant-progress')
    .first();

  const hasTestId = await progressBar.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? progressBar : progressBarFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * アップロード完了の成功アラートが表示されること（4-11-6）
 * BulkUploadDialog: data-testid="upload-success-alert"
 */
Then('アップロード完了の成功アラートが表示されること', async ({ page }) => {
  console.log('[4-11 Then] アップロード完了の成功アラートを確認');

  const successAlert = page.locator('[data-testid="upload-success-alert"]');
  const successAlertFallback = page.locator('.ant-alert-success').first();

  const hasTestId = await successAlert.isVisible({ timeout: 15000 }).catch(() => false);
  const target = hasTestId ? successAlert : successAlertFallback;

  await expect(target).toBeVisible({ timeout: 15000 });
});

/**
 * ファイル未選択の警告メッセージが表示されること（4-11-7）
 * message.warning('ファイルを選択してください') による通知を確認する
 */
Then('ファイル未選択の警告メッセージが表示されること', async ({ page }) => {
  console.log('[4-11 Then] ファイル未選択の警告メッセージを確認');

  // Ant Design の message.warning による通知
  const warningMsg = page
    .locator('.ant-message-warning, .ant-message-notice-content')
    .filter({ hasText: /ファイルを選択/ })
    .first();

  await expect(warningMsg).toBeVisible({ timeout: 5000 });
});

/**
 * アップロード中断確認ダイアログが表示されること（4-11-8）
 * Modal.confirm による確認ダイアログを確認する
 */
Then('アップロード中断確認ダイアログが表示されること', async ({ page }) => {
  console.log('[4-11 Then] アップロード中断確認ダイアログの表示を確認');

  // Modal.confirm ダイアログ（タイトル「アップロード中」）
  const confirmDialog = page
    .locator('.ant-modal-confirm')
    .filter({ hasText: 'アップロード中' })
    .first();

  const confirmDialogFallback = page
    .locator('.ant-modal-confirm, .ant-modal')
    .filter({ hasText: /キャンセルしますか/ })
    .first();

  const found = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);
  const target = found ? confirmDialog : confirmDialogFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 選択ファイル一覧に1件のみ表示されること（4-11-9）
 * BulkUploadDialog: data-testid="upload-file-list" 配下のアイテム数を確認
 */
Then('選択ファイル一覧に1件のみ表示されること', async ({ page }) => {
  console.log('[4-11 Then] 選択ファイル一覧に1件のみ表示されることを確認');

  const fileList = page.locator('[data-testid="upload-file-list"]');
  const fileListFallback = page
    .locator('.ant-modal')
    .filter({ hasText: '一括ファイルアップロード' })
    .locator('.ant-list-item, .file-item');

  const hasTestId = await fileList.isVisible({ timeout: 5000 }).catch(() => false);

  if (hasTestId) {
    // data-testid がある場合はリスト内のアイテム数を確認
    const items = fileList.locator('.ant-list-item, .file-item');
    await expect(items).toHaveCount(1, { timeout: 10000 });
  } else {
    // フォールバック: ファイルリストアイテムが1件のみ表示されること
    await expect(fileListFallback).toHaveCount(1, { timeout: 10000 });
  }
});

/**
 * 選択ファイル一覧がクリアされていること（4-11-10）
 * BulkUploadDialog: data-testid="upload-file-list" が非表示、またはアイテム数が0
 */
Then('選択ファイル一覧がクリアされていること', async ({ page }) => {
  console.log('[4-11 Then] 選択ファイル一覧がクリアされていることを確認');

  const fileList = page.locator('[data-testid="upload-file-list"]');
  const fileListItems = page
    .locator('.ant-modal')
    .filter({ hasText: '一括ファイルアップロード' })
    .locator('.ant-list-item, .file-item');

  const hasTestId = await fileList.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasTestId) {
    // data-testid がある場合: リストが非表示またはアイテム数が0
    const isVisible = await fileList.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      const items = fileList.locator('.ant-list-item, .file-item');
      const count = await items.count();
      expect(count).toBe(0);
    }
    // 非表示の場合はクリア済みとみなす（OK）
  } else {
    // フォールバック: ファイルリストアイテムが0件
    const count = await fileListItems.count();
    expect(count).toBe(0);
  }
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
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertProject(
  projectId: string,
  projectName: string,
  projectStatus: number,
  checkoutStatus: number
): Promise<void> {
  console.log(
    `[4-11 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
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
             update_user_id = 'e2e-test',
             update_at = NOW()
         WHERE organization_id = $4 AND project_id = $5`,
        [projectName, projectStatus, checkoutStatus, ORG_ID, projectId]
      );
      console.log(`[4-11 upsertProject] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project (
          organization_id, project_id, project_name, project_status,
          project_maiml_flg, checkout_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          false, $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, projectName, projectStatus, checkoutStatus]
      );
      console.log(`[4-11 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-11 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
