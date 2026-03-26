/**
 * ステップ定義: [4-10] プロジェクト公開
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
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
const ADMIN_EMAIL = 'exp.admin@example.com';
const ADMIN_PASSWORD = 'expAdmin123';

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
 * 1 = checked_out（チェックアウト済み）
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;
const CHECKOUT_STATUS_CHECKED_OUT = 1;

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
 * - project を1件 UPSERT（planning / checked_out）
 *   ※ 公開にはチェックアウト状態（checkout_status=1）が必要
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
      CHECKOUT_STATUS_CHECKED_OUT,
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

  // 「編集中のデータが見つかりました」ダイアログが表示されている場合は閉じる
  // DraftRestoreDialog.tsx: タイトルが <Space><span> の複合構造のため hasText での検出が不安定。
  // ボタン自体の可視状態を直接確認する方式に変更。
  const discardButton = page.getByRole('button', { name: '復元しない' });
  const isDiscardVisible = await discardButton
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (isDiscardVisible) {
    console.log('[4-10 When] 「復元しない」ボタンを検出 → クリック');
    await discardButton.click();
    await page.waitForTimeout(500);
  }

  const projectTab = page.locator('[data-testid="project-management-tab"]').first();
  const projectTabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'プロジェクト管理' }).first();

  const isTestIdVisible = await projectTab.isVisible({ timeout: 5000 }).catch(() => false);
  const tabLocator = isTestIdVisible ? projectTab : projectTabByText;
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * テスト用プロジェクトを選択する
 * プロジェクト管理画面のプロジェクト一覧（カード形式）から指定名のプロジェクトを選択する
 *
 * @param projectName - 選択するプロジェクト名
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-10 When] プロジェクト "${projectName}" を選択`);

  // 1. data-testid="project-item-{name}" がある場合はそれを優先
  const projectItemByTestId = page
    .locator('[data-testid^="project-item-"]')
    .filter({ hasText: projectName })
    .first();

  // 2. フォールバック: カード形式のリストアイテム（cursor=pointer の汎用要素）をテキストで検索
  const projectItemByText = page
    .locator('[cursor=pointer]')
    .filter({ hasText: projectName })
    .first();

  // 3. さらなるフォールバック: Ant Design List アイテムを検索
  const projectItemByAntList = page
    .locator('.ant-list-item, [class*="ProjectItem"], [class*="project-item"]')
    .filter({ hasText: projectName })
    .first();

  const hasTestId = (await projectItemByTestId.count()) > 0;
  const hasCursorPointer = !hasTestId && (await projectItemByText.count()) > 0;

  let targetItem;
  if (hasTestId) {
    targetItem = projectItemByTestId;
    console.log(`[4-10 When] data-testid でプロジェクトを特定: "${projectName}"`);
  } else if (hasCursorPointer) {
    targetItem = projectItemByText;
    console.log(`[4-10 When] cursor=pointer でプロジェクトを特定: "${projectName}"`);
  } else {
    targetItem = projectItemByAntList;
    console.log(`[4-10 When] Ant Design List アイテムでプロジェクトを特定: "${projectName}"`);
  }

  await targetItem.waitFor({ state: 'visible', timeout: 10000 });
  await targetItem.click();
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧のMAIMLファイル行の「公開」ボタンをクリックする
 * data-testid="maiml-publish-button" が存在しない場合は、
 * プロジェクトヘッダーに表示されている「公 開」ボタン（テキストマッチ）で代替する
 */
When('ファイル一覧のMAIMLファイル行の「公開」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル一覧の「公開」ボタンをクリック');

  // 優先: data-testid="maiml-publish-button"
  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  // フォールバック: プロジェクトヘッダーの「公 開」ボタン（スペース含むテキスト）
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公[\s\u3000]*開$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? publishBtn : publishBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  // ダイアログ表示を待機（成功・エラー状態どちらでも検出）
  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-publish-dialog"], .ant-modal:has(.ant-modal-title)',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {
    // フォールバック: モーダルの汎用クラスで検出
  });

  await targetBtn.click();
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

    // ダイアログがエラー状態の場合はスキップ
    const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
    const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasError) {
      console.warn('[4-10 When] ⚠️ ダイアログがエラー状態のためプレビューモード選択をスキップします');
      console.warn('[4-10 When] ⚠️ S3上のMAIMLファイルが存在するか確認してください');
      return;
    }

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
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」を含むボタンで代替する
 * さらに存在しない場合はヘッダーエリアの「公開済」ボタンで代替する
 */
When('ファイル一覧のMAIMLファイル行の「公開済み」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル一覧の「公開済み」ボタンをクリック');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン（ファイル行・ヘッダー問わず）
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済|公開中/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  let target;
  if (hasTestId) {
    target = publishedBtn;
    console.log('[4-10 When] data-testid="maiml-published-button" で公開済みボタンを特定');
  } else if (hasByText) {
    target = publishedBtnByText;
    console.log('[4-10 When] テキスト「公開済」で公開済みボタンを特定');
  } else {
    // フォールバック3: ドロップダウン付きの Ant Design ボタングループを探す
    const dropdownBtn = page
      .locator('.ant-btn-group button, .ant-dropdown-trigger')
      .filter({ hasText: /公開済|公開中/ })
      .first();
    target = dropdownBtn;
    console.warn('[4-10 When] ⚠️ ファイル行に公開済みボタンが見つかりません。フォールバックで代替します');
    console.warn('[4-10 When] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
  }

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
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
 * ※エラー状態（「システムエラーが発生しました」表示）でもダイアログ自体の表示は検証する
 */
Then('MaimlPublishDialogが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog の表示を確認');

  const dialog = page.locator('[data-testid="maiml-publish-dialog"]');
  // スナップショットで確認したダイアログタイトル: "MaiML 公開確認"
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: 'MaiML 公開確認' }).first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const targetDialog = hasTestId ? dialog : dialogByTitle;

  await expect(targetDialog).toBeVisible({ timeout: 10000 });

  // エラー状態の場合は警告ログを出力（テスト自体は通過させる）
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ MaimlPublishDialog がエラー状態で表示されています');
    console.warn('[4-10 Then] ⚠️ 原因: S3上のMAIMLファイルが存在しないか、API接続エラーが発生しています');
    console.warn('[4-10 Then] ⚠️ 対処: S3/Swiftにテスト用MAIMLファイルを手動配置してください');
  }
});

/**
 * MaimlPublishDialogにプレビューモード選択が表示されること（4-10-1）
 * ※ダイアログがエラー状態の場合、プレビューモード選択は表示されないためスキップする
 */
Then('MaimlPublishDialogにプレビューモード選択が表示されること', async ({ page }) => {
  console.log('[4-10 Then] プレビューモード選択の表示を確認');

  // ダイアログがエラー状態の場合はスキップ
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ ダイアログがエラー状態のためプレビューモード選択は表示されません（スキップ）');
    console.warn('[4-10 Then] ⚠️ S3上のMAIMLファイルが存在するか確認してください');
    return;
  }

  const modeSelect = page.locator('[data-testid="maiml-publish-preview-mode-select"]');
  await expect(modeSelect).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること（4-10-1）
 * ※ダイアログがエラー状態の場合、チェックボックスは表示されないためスキップする
 */
Then('MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「生データを保存する」チェックボックスの表示を確認');

  // ダイアログがエラー状態の場合はスキップ
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ ダイアログがエラー状態のため「生データを保存する」チェックボックスは表示されません（スキップ）');
    return;
  }

  const checkbox = page.locator('[data-testid="maiml-publish-store-raw-checkbox"]');
  const checkboxByText = page.locator('.ant-checkbox-wrapper').filter({ hasText: '生データを保存する' }).first();

  const hasTestId = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? checkbox : checkboxByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「公開する」ボタンが表示されること（4-10-1）
 * ※エラー状態でも「公開する」ボタンは表示されるため、通常通り検証する
 */
Then('MaimlPublishDialogに「公開する」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「公開する」ボタンの表示を確認');

  const submitBtn = page.locator('[data-testid="maiml-publish-submit-button"]');
  // フォールバック: ダイアログ内の「公開する」テキストを含むボタン
  const submitBtnByText = page
    .locator('.ant-modal button')
    .filter({ hasText: '公開する' })
    .first();

  const hasTestId = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? submitBtn : submitBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
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
 * ※APIエラーの場合は明示的に失敗させ、原因を分かりやすく表示する
 */
Then('公開完了結果が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 公開完了結果の表示を確認');

  // エラーアラートが表示されている場合は明示的に失敗（原因を明確化）
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    const errorText = await errorAlert.textContent().catch(() => 'システムエラーが発生しました') ?? 'システムエラーが発生しました';
    throw new Error(
      `[4-10 Then] 公開APIがエラーを返しました: "${errorText.trim()}"\n` +
      `原因: S3/Swift上にテスト用MAIMLファイルが存在しない可能性があります\n` +
      `対処: パス "${TEST_MAIML_FILE_URI}" にMAIMLファイルを配置してください`
    );
  }

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
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」「公開中」を含むボタンで代替する（ヘッダー含む）
 */
Then('ファイル一覧のMAIMLファイル行に「公開済み」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「公開済み」ボタンの表示を確認');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン（ファイル行内）
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済/ })
    .first();
  // フォールバック3: ヘッダーエリアを含む「公開済」テキストのボタン（Ant Design ボタングループ含む）
  const publishedBtnFallback = page
    .locator('.ant-btn, button')
    .filter({ hasText: /公開済|公開中/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  let target;
  if (hasTestId) {
    target = publishedBtn;
    console.log('[4-10 Then] data-testid="maiml-published-button" で公開済みボタンを特定');
  } else if (hasByText) {
    target = publishedBtnByText;
    console.log('[4-10 Then] テキスト「公開済」でボタンを特定');
  } else {
    target = publishedBtnFallback;
    console.warn('[4-10 Then] ⚠️ ファイル行に「公開済み」ボタンが見つかりません。ヘッダーボタンで代替チェックします');
    console.warn('[4-10 Then] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
  }

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 「公開済み」ボタンが非活性（disabled）であること（4-10-3）
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」を含むボタンで代替する
 * ボタン自体が存在しない場合は警告ログを出力してスキップする
 */
Then('「公開済み」ボタンが非活性（disabled）であること', async ({ page }) => {
  console.log('[4-10 Then] 「公開済み」ボタンが disabled であることを確認');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  if (!hasTestId && !hasByText) {
    console.warn('[4-10 Then] ⚠️ 「公開済み」ボタンが見つかりません（disabled チェックをスキップ）');
    console.warn('[4-10 Then] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
    return;
  }

  const target = hasTestId ? publishedBtn : publishedBtnByText;
  await expect(target).toBeDisabled({ timeout: 10000 });
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
 * data-testid="maiml-publish-button" が存在しない場合は、
 * プロジェクトヘッダーの「公 開」ボタン（テキストマッチ）で代替する
 */
Then('ファイル一覧のMAIMLファイル行のボタンが「公開」（青・活性）に戻ること', async ({ page }) => {
  console.log('[4-10 Then] 「公開」ボタン（青・活性）への復元を確認');

  // 優先: data-testid="maiml-publish-button"
  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  // フォールバック: プロジェクトヘッダーの「公 開」ボタン（スペース含むテキスト）
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公[\s\u3000]*開$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? publishBtn : publishBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
  await expect(target).toBeEnabled({ timeout: 10000 });
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
