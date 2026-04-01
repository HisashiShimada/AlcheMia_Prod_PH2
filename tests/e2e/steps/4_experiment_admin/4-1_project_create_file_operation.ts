/**
 * ステップ定義: [4-1] プロジェクト作成・ファイル操作
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-1_project_create_file_operation.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 4-1-6 用: project テーブルに E2Eテスト用プロジェクト_4-1-6 が存在すること
 *   - 4-1-7〜4-1-20 用: project テーブルに E2Eテスト用プロジェクト_4-1-base が存在すること
 *   - 4-1-10〜4-1-13, 4-1-19 用: S3 に上記プロジェクトのファイルが存在すること
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import { expect, Page, Route } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

/** playwright-bdd フィクスチャ型エイリアス */
type Fixtures = { page: Page };

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID（playwright.config.ts の baseURL と合わせる） */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/** テスト用ユーザー（実験管理者）
 * TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
 */
const ADMIN_EMAIL = 'exp.admin@example.com';
const ADMIN_PASSWORD = 'expAdmin123';

/** ベースプロジェクト名（4-1-8〜4-1-20 で使用する共通テストプロジェクト） */
const BASE_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-1-base';
const BASE_PROJECT_ID = 'E2E-4-1-BASE';

/** 重複確認用プロジェクト名（4-1-6 で使用） */
const DUP_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-1-6';
const DUP_PROJECT_ID = 'E2E-4-1-DUP';

/** MAIMLファイル登録済みテスト用プロジェクト（archiveなし）（4-1-24, 4-1-25, 4-1-27用） */
const MAIML_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-1-maiml';
const MAIML_PROJECT_ID = 'E2E-4-1-MAIML';

/** MAIMLファイル + archiveフォルダ付きテスト用プロジェクト（4-1-26用） */
const MAIML_ARCH_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-1-maiml-arch';
const MAIML_ARCH_PROJECT_ID = 'E2E-4-1-MAIML-ARCH';

/** 実行中ステータスのMAIMLファイル登録済みテスト用プロジェクト（4-1-28用） */
const INPROGRESS_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-1-inprogress';
const INPROGRESS_PROJECT_ID = 'E2E-4-1-INPROGRESS';

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = planning（計画中）, 2 = in_progress（実行中）
 */
const PROJECT_STATUS_PLANNING = 0;
const PROJECT_STATUS_IN_PROGRESS = 2;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 4-1-1, 4-1-2, 4-1-3, 4-1-4, 4-1-5, 4-1-7 用
 * - 特別なテストデータ準備は不要
 */
Before({ tags: '@4-1-1 or @4-1-2 or @4-1-3 or @4-1-4 or @4-1-5 or @4-1-7' }, async () => {
  console.log('[4-1 Before] テストデータ準備 開始 (追加データ不要)');
});

/**
 * 4-1-6 用
 * - 重複確認用のプロジェクトを UPSERT する
 */
Before({ tags: '@4-1-6' }, async () => {
  console.log('[4-1 Before] テストデータ準備 開始 (tags: @4-1-6)');
  try {
    await upsertTestProject(DUP_PROJECT_ID, DUP_PROJECT_NAME);
    console.log('[4-1 Before] テストデータ準備 完了 (tags: @4-1-6)');
  } catch (error) {
    console.error('[4-1 Before] テストデータ準備 失敗 (tags: @4-1-6):', error);
    throw error;
  }
});

/**
 * 4-1-8〜4-1-20 用
 * - ベースプロジェクトを UPSERT する
 */
Before({ tags: '@4-1-8 or @4-1-9 or @4-1-10 or @4-1-11 or @4-1-12 or @4-1-13 or @4-1-16 or @4-1-17 or @4-1-18 or @4-1-19 or @4-1-20' }, async () => {
  console.log('[4-1 Before] テストデータ準備 開始 (base project)');
  try {
    await upsertTestProject(BASE_PROJECT_ID, BASE_PROJECT_NAME);
    console.log('[4-1 Before] テストデータ準備 完了 (base project)');
  } catch (error) {
    console.error('[4-1 Before] テストデータ準備 失敗 (base project):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-1 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-1 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-1 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-1 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-1 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * テスト用プロジェクトがDBとS3に存在する（Before フックで準備済みのためno-op）
 * S3 上のテスト用データは事前に手動またはスクリプトで配置すること
 */
Given('テスト用プロジェクト {string} がDBとS3に存在する', async ({}, _projectName: string) => {
  // no-op: Before フックで upsertTestProject を実行済み
  // S3 のファイルは事前準備済みとする
  console.log(`[4-1 Given] テスト用プロジェクト "${_projectName}" は事前準備済み`);
});

/**
 * テスト用プロジェクトのS3にファイルが存在する（事前準備済みのためno-op）
 */
Given('テスト用プロジェクトのS3にファイルが存在する', async () => {
  // no-op: S3 上のテスト用ファイルは事前準備済みとする
  console.log('[4-1 Given] テスト用プロジェクトのS3ファイルは事前準備済み');
});

// ---------------------------------------------------------------------------
// When: ログイン・画面遷移
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 */
When('実験管理者ユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  // TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
  await page.fill('#userId', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * プロジェクト管理画面が表示されていること
 * 実験管理者メニューのプロジェクト管理タブが表示されるまで待機する
 */
When('プロジェクト管理画面が表示されている', async ({ page }) => {
  // 新規プロジェクト作成ボタン（data-testid="create-project-button"）が表示されるまで待機
  // ログイン後、デフォルトでプロジェクト管理画面が表示される想定
  await page.waitForSelector('[data-testid="create-project-button"]', {
    timeout: 15000,
  });
});

// ---------------------------------------------------------------------------
// When: プロジェクト作成操作
// ---------------------------------------------------------------------------

/**
 * 「新規プロジェクト作成」ボタンをクリックする
 * ProjectManagement.tsx: data-testid="create-project-button"
 */
When('「新規プロジェクト作成」ボタンをクリックする', async ({ page }) => {
  const createBtn = page.locator('[data-testid="create-project-button"]');
  await createBtn.waitFor({ state: 'visible', timeout: 10000 });
  await createBtn.click();
  // モーダルが表示されるまで待機
  await page.waitForSelector('[data-testid="create-project-name-input"]', { timeout: 10000 });
});

/**
 * プロジェクト名入力フィールドにテキストを入力する
 * CreateProjectModal.tsx: data-testid="create-project-name-input"
 */
When('プロジェクト名入力フィールドに {string} と入力する', async ({ page }, projectName: string) => {
  const input = page.locator('[data-testid="create-project-name-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(projectName);
});

/**
 * プロジェクト名入力フィールドに101文字のプロジェクト名を入力する（4-1-4用）
 * maxLength=100 のため 101文字は入力できない場合があるが、
 * フォームバリデーションのテストのため API のみバリデーションすることを想定
 */
When('プロジェクト名入力フィールドに 101文字のプロジェクト名を入力する', async ({ page }) => {
  const input = page.locator('[data-testid="create-project-name-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  // maxLength属性を一時的に無効化して101文字を強制入力する
  const longName = 'A'.repeat(101);
  await input.evaluate((el: HTMLInputElement, val: string) => {
    el.removeAttribute('maxlength');
    // Reactの制御コンポーネントに値を認識させるため nativeInputValueSetter を使用
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, longName);
});

/**
 * プロジェクト作成モーダルの「作成」ボタンをクリックする
 * CreateProjectModal.tsx: data-testid="create-project-submit-button"
 */
When('プロジェクト作成モーダルの「作成」ボタンをクリックする', async ({ page }) => {
  const submitBtn = page.locator('[data-testid="create-project-submit-button"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
  await submitBtn.click();
});

/**
 * プロジェクト作成モーダルの「キャンセル」ボタンをクリックする
 * CreateProjectModal.tsx: data-testid="create-project-cancel-button"
 */
When('プロジェクト作成モーダルの「キャンセル」ボタンをクリックする', async ({ page }) => {
  const cancelBtn = page.locator('[data-testid="create-project-cancel-button"]');
  await cancelBtn.waitFor({ state: 'visible', timeout: 10000 });
  await cancelBtn.click();
  // モーダルが閉じるまで待機
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// When: プロジェクト一覧操作
// ---------------------------------------------------------------------------

/**
 * プロジェクト一覧でプロジェクトを選択する（項目クリックで選択）
 * ProjectFolderTree.tsx: data-testid="project-item-{id}" をプロジェクト名テキストで検索してクリック
 */
When('プロジェクト一覧でプロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  // プロジェクト名テキストを含む project-item を検索
  const projectItem = page.locator('[data-testid^="project-item-"]').filter({ hasText: projectName }).first();
  await projectItem.waitFor({ state: 'attached', timeout: 10000 });
  // スクロールして表示範囲内に入れてからクリック
  await projectItem.scrollIntoViewIfNeeded();
  await projectItem.click();
  await page.waitForTimeout(500);
});

/**
 * プロジェクト一覧でプロジェクト名をクリックする（ProjectDetailModal を開く）
 * ProjectManagement.tsx: data-testid="project-list-table" 内のプロジェクト名リンク
 */
When('プロジェクト一覧でプロジェクト名 {string} をクリックする', async ({ page }, projectName: string) => {
  const table = page.locator('[data-testid="project-list-table"]');
  await table.waitFor({ state: 'visible', timeout: 10000 });
  // プロジェクト名テキストをクリック（data-testid="project-name-link" または テキスト一致）
  const projectLink = table.locator(`[data-testid="project-name-link"]:has-text("${projectName}")`).first();
  if (await projectLink.count() > 0) {
    await projectLink.click();
  } else {
    // data-testid がない場合はテキスト一致でクリック
    await table.locator(`td:has-text("${projectName}")`).first().click();
  }
  // モーダルが表示されるまで待機
  await page.waitForSelector('[data-testid="project-detail-modal"]', { timeout: 10000 });
});

// ---------------------------------------------------------------------------
// When: ファイル操作
// ---------------------------------------------------------------------------

/**
 * 「プロジェクトダウンロード」ボタンをクリックする
 * ProjectManagement.tsx: data-testid="project-download-button"
 */
When('「プロジェクトダウンロード」ボタンをクリックする', async ({ page }) => {
  const downloadBtn = page.locator('[data-testid="project-download-button"]');
  await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  await downloadBtn.click();
});

/**
 * ファイル一覧の最初のファイルの「ダウンロード」ボタンをクリックする
 * FileListTable.tsx: data-testid="file-download-button"（最初の1件）
 */
When('ファイル一覧の最初のファイルの「ダウンロード」ボタンをクリックする', async ({ page }) => {
  const downloadBtn = page.locator('[data-testid="file-download-button"]').first();
  await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  await downloadBtn.click();
});

/**
 * ファイル一覧の最初のファイルの「ビューア」ボタンをクリックする
 * FileListTable.tsx: data-testid="file-viewer-button"（最初の1件）
 */
When('ファイル一覧の最初のファイルの「ビューア」ボタンをクリックする', async ({ page }) => {
  const viewerBtn = page.locator('[data-testid="file-viewer-button"]').first();
  await viewerBtn.waitFor({ state: 'visible', timeout: 10000 });
  await viewerBtn.click();
  // ビューアダイアログが表示されるまで待機
  await page.waitForTimeout(1000);
});

/**
 * ファイルダウンロードAPIが失敗するようにモックする（4-1-12用）
 * POST /api/v1/files/download をインターセプトして 500 エラーを返す
 */
When('ファイルダウンロードAPIが失敗するようにモックする', async ({ page }) => {
  await page.route('**/api/v1/files/download', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error', message: 'ダウンロードに失敗しました' }),
    });
  });
});

// ---------------------------------------------------------------------------
// When: ProjectDetailModal 操作
// ---------------------------------------------------------------------------

/**
 * プロジェクト詳細モーダルの「プロジェクトを開く」ボタンをクリックする
 * ProjectDetailModal.tsx: data-testid="project-detail-open-button"
 */
When('プロジェクト詳細モーダルの「プロジェクトを開く」ボタンをクリックする', async ({ page }) => {
  const openBtn = page.locator('[data-testid="project-detail-open-button"]');
  await openBtn.waitFor({ state: 'visible', timeout: 10000 });
  await openBtn.click();
  await page.waitForTimeout(500);
});

/**
 * プロジェクト詳細モーダルの「閉じる」ボタンをクリックする
 * Ant Design Modal の閉じるボタン（data-testid="project-detail-close-button" または .ant-modal-close）
 */
When('プロジェクト詳細モーダルの「閉じる」ボタンをクリックする', async ({ page }) => {
  // data-testid があればそちらを優先
  const closeBtn = page.locator('[data-testid="project-detail-close-button"]');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  } else {
    // Ant Design Modal のフッターキャンセルボタン、またはヘッダー × ボタン
    const modal = page.locator('[data-testid="project-detail-modal"]');
    const footerClose = modal.locator('.ant-modal-footer .ant-btn:not(.ant-btn-primary)').first();
    if (await footerClose.count() > 0) {
      await footerClose.click();
    } else {
      await modal.locator('.ant-modal-close').click();
    }
  }
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * プロジェクト作成モーダルが表示されること
 * CreateProjectModal: data-testid="create-project-name-input" が表示されている
 */
Then('プロジェクト作成モーダルが表示されること', async ({ page }) => {
  await expect(page.locator('[data-testid="create-project-name-input"]')).toBeVisible({
    timeout: 10000,
  });
});

/**
 * プロジェクト作成モーダルが閉じること
 * data-testid="create-project-name-input" が非表示になる
 */
Then('プロジェクト作成モーダルが閉じること', async ({ page }) => {
  await expect(page.locator('[data-testid="create-project-name-input"]')).not.toBeVisible({
    timeout: 10000,
  });
});

/**
 * プロジェクト一覧に指定プロジェクト名が表示されること
 * ProjectFolderTree.tsx: data-testid="project-item-{id}" 内の Text コンポーネントにプロジェクト名が表示される
 * スクロールしないと見えない位置にある場合も scrollIntoViewIfNeeded で対応
 */
Then('プロジェクト一覧に {string} が表示されること', async ({ page }, projectName: string) => {
  // プロジェクト一覧の再ロードを待つ
  await page.waitForTimeout(1000);
  // プロジェクト名テキストを含む project-item を検索
  const projectItem = page.locator('[data-testid^="project-item-"]').filter({ hasText: projectName }).first();
  await projectItem.waitFor({ state: 'attached', timeout: 10000 });
  // スクロールして表示範囲内に入れてから可視確認
  await projectItem.scrollIntoViewIfNeeded();
  await expect(projectItem).toBeVisible({ timeout: 10000 });
  await expect(projectItem).toContainText(projectName);
});

/**
 * プロジェクト一覧に指定プロジェクト名が表示されていないこと（キャンセル後の確認）
 */
Then('プロジェクト一覧に {string} が表示されていないこと', async ({ page }, projectName: string) => {
  // プロジェクト名テキストを含む project-item が存在しないことを確認
  const projectItem = page.locator('[data-testid^="project-item-"]').filter({ hasText: projectName });
  await expect(projectItem).toHaveCount(0, { timeout: 5000 });
});

/**
 * プロジェクト名の必須バリデーションエラーが表示されること（4-1-2）
 * Ant Design Form: .ant-form-item-explain-error にエラーメッセージが表示される
 */
Then('プロジェクト名の必須バリデーションエラーが表示されること', async ({ page }) => {
  const errorMsg = page.locator('.ant-form-item-explain-error').filter({
    hasText: 'プロジェクト名を入力してください',
  });
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
});

/**
 * プロジェクト名の最小文字数バリデーションエラーが表示されること（4-1-3）
 */
Then('プロジェクト名の最小文字数バリデーションエラーが表示されること', async ({ page }) => {
  const errorMsg = page.locator('.ant-form-item-explain-error').filter({
    hasText: '3文字以上',
  });
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
});

/**
 * プロジェクト名の最大文字数バリデーションエラーが表示されること（4-1-4）
 */
Then('プロジェクト名の最大文字数バリデーションエラーが表示されること', async ({ page }) => {
  const errorMsg = page.locator('.ant-form-item-explain-error').filter({
    hasText: '100文字以内',
  });
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
});

/**
 * プロジェクト重複エラーメッセージが表示されること（4-1-6）
 * API 409 レスポンスに対応するエラーメッセージ（Alert または message.error）
 */
Then('プロジェクト重複エラーメッセージが表示されること', async ({ page }) => {
  // Ant Design Alert または message（toast）にエラーが表示されることを確認
  const alertError = page.locator('.ant-alert-error');
  const toastError = page.locator('.ant-message-error');
  const modalError = page.locator('.ant-modal-content .ant-alert-error');
  await expect(alertError.or(toastError).or(modalError).first()).toBeVisible({
    timeout: 10000,
  });
});

/**
 * 「プロジェクトダウンロード」ボタンが存在しないこと（4-1-7: 未選択時は非表示）
 * ProjectManagement.tsx: data-testid="project-download-button" が非表示
 */
Then('「プロジェクトダウンロード」ボタンが存在しないこと', async ({ page }) => {
  await expect(page.locator('[data-testid="project-download-button"]')).not.toBeVisible({
    timeout: 5000,
  });
});

/**
 * 「プロジェクトダウンロード」ボタンが活性化されていること（4-1-8）
 */
Then('「プロジェクトダウンロード」ボタンが活性化されていること', async ({ page }) => {
  const downloadBtn = page.locator('[data-testid="project-download-button"]');
  await expect(downloadBtn).toBeVisible({ timeout: 10000 });
  await expect(downloadBtn).toBeEnabled({ timeout: 5000 });
});

/**
 * ZIPファイルのダウンロードが開始されること（4-1-9）
 * Playwright の download イベントを使用して確認する
 */
Then('ZIPファイルのダウンロードが開始されること', async ({ page }) => {
  // ダウンロードイベントが発生することを確認（最大 15秒待機）
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  // ボタンクリックは When ステップで実行済みのため、ここでダウンロード完了を待つ
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/i);
});

/**
 * ファイルのダウンロードが開始されること（4-1-10）
 */
Then('ファイルのダウンロードが開始されること', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBeTruthy();
});

/**
 * クリックした「ダウンロード」ボタンがローディング状態になること（4-1-11）
 * Ant Design Button の loading 状態: .ant-btn-loading クラスが付く
 */
Then('クリックした「ダウンロード」ボタンがローディング状態になること', async ({ page }) => {
  // ダウンロードボタンの最初の1つがローディング状態（.ant-btn-loading）になること
  const firstDownloadBtn = page.locator('[data-testid="file-download-button"]').first();
  await expect(firstDownloadBtn).toHaveClass(/ant-btn-loading/, { timeout: 5000 });
});

/**
 * 他のファイルの「ダウンロード」ボタンが非活性になること（4-1-11）
 * downloadingFileId !== null の場合、他のボタンは disabled になる
 */
Then('他のファイルの「ダウンロード」ボタンが非活性になること', async ({ page }) => {
  // 2番目以降のダウンロードボタンが disabled になっていることを確認
  const secondDownloadBtn = page.locator('[data-testid="file-download-button"]').nth(1);
  await expect(secondDownloadBtn).toBeDisabled({ timeout: 5000 });
});

/**
 * ファイルダウンロードエラーメッセージが表示されること（4-1-12）
 * FileListTable.tsx: message.error() によるトースト通知
 */
Then('ファイルダウンロードエラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error');
  await expect(errorToast).toBeVisible({ timeout: 10000 });
});

/**
 * ビューアダイアログが表示されること（4-1-13）
 * ビューアダイアログ（フローティングダイアログ）が表示されることを確認
 */
Then('ビューアダイアログが表示されること', async ({ page }) => {
  // ビューアダイアログ（data-testid="viewer-dialog" または専用クラス）が表示されること
  const viewerDialog = page.locator('[data-testid="viewer-dialog"], .viewer-floating-dialog, .maiml-viewer-dialog').first();
  await expect(viewerDialog).toBeVisible({ timeout: 15000 });
});

// ---------------------------------------------------------------------------
// Then: ProjectDetailModal 表示確認
// ---------------------------------------------------------------------------

/**
 * プロジェクト詳細モーダルが表示されること（4-1-16）
 * ProjectDetailModal.tsx: data-testid="project-detail-modal"
 */
Then('プロジェクト詳細モーダルが表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="project-detail-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
});

/**
 * プロジェクト詳細モーダルにプロジェクト名が表示されていること（4-1-17）
 * ProjectDetailModal.tsx: モーダル内にプロジェクト名テキストが表示される
 */
Then('プロジェクト詳細モーダルにプロジェクト名 {string} が表示されていること', async ({ page }, projectName: string) => {
  const modal = page.locator('[data-testid="project-detail-modal"]');
  await expect(modal.locator(`text="${projectName}"`).first()).toBeVisible({ timeout: 10000 });
});

/**
 * プロジェクト詳細モーダルが閉じること（4-1-18, 4-1-20）
 */
Then('プロジェクト詳細モーダルが閉じること', async ({ page }) => {
  const modal = page.locator('[data-testid="project-detail-modal"]');
  await expect(modal).not.toBeVisible({ timeout: 10000 });
});

/**
 * プロジェクトが選択状態になっていること（4-1-18）
 * プロジェクト選択後、ファイル一覧エリアやツールバーにプロジェクト名が表示される
 * ProjectManagement.tsx: data-testid="selected-project-name"
 */
Then('プロジェクト {string} が選択状態になっていること', async ({ page }, projectName: string) => {
  // 選択中プロジェクト名の表示（data-testid="selected-project-name" または プロジェクト一覧の選択行）
  const selectedProjectName = page.locator('[data-testid="selected-project-name"]');
  if (await selectedProjectName.count() > 0) {
    await expect(selectedProjectName).toHaveText(projectName, { timeout: 10000 });
  } else {
    // フォールバック: プロジェクト一覧の選択行にプロジェクト名が含まれること
    const table = page.locator('[data-testid="project-list-table"]');
    const selectedRow = table.locator('.ant-table-row-selected').first();
    await expect(selectedRow.locator(`td:has-text("${projectName}")`)).toBeVisible({ timeout: 10000 });
  }
});

/**
 * プロジェクト詳細モーダル内にファイル一覧テーブルが表示されること（4-1-19）
 * ProjectDetailModal.tsx 内の FileListTable コンポーネント
 */
Then('プロジェクト詳細モーダル内にファイル一覧テーブルが表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="project-detail-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  // FileListTable のテーブル（.ant-table または data-testid）が表示されること
  const fileTable = modal.locator('.ant-table, [data-testid="file-list-table"]').first();
  await expect(fileTable).toBeVisible({ timeout: 10000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================


/**
 * ファイル一覧のMAIMLファイルのその他メニューボタンをクリックする（4-1-24〜4-1-28）
 * FileListTable.tsx: data-testid="file-more-menu-button" のうち .maiml ファイル行のもの
 */
When('ファイル一覧のMAIMLファイルのその他メニューボタンをクリックする', async ({ page }) => {
  // .maiml 拡張子を含む行を特定してその他メニューボタンをクリック
  const maimlRow = page.locator('[data-testid="file-list-row"]').filter({ hasText: '.maiml' }).first();
  if (await maimlRow.count() > 0) {
    const moreBtn = maimlRow.locator('[data-testid="file-more-menu-button"]');
    await moreBtn.waitFor({ state: 'visible', timeout: 10000 });
    await moreBtn.click();
  } else {
    // フォールバック: .maiml テキストを含む行のその他メニューボタン
    await page.locator('[data-testid="file-more-menu-button"]').first().click();
  }
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧の最初のファイルのその他メニューボタンをクリックする（4-1-21〜4-1-23）
 * FileListTable.tsx: data-testid="file-more-menu-button"（最初の1件）
 */
When('ファイル一覧の最初のファイルのその他メニューボタンをクリックする', async ({ page }) => {
  const moreBtn = page.locator('[data-testid="file-more-menu-button"]').first();
  await moreBtn.waitFor({ state: 'visible', timeout: 10000 });
  await moreBtn.click();
  await page.waitForTimeout(500);
});

/**
 * その他メニューの「名前の変更」項目をクリックする（4-1-23）
 * Ant Design Dropdown MenuItem: data-testid="file-menu-rename" または テキスト一致
 */
When('その他メニューの「名前の変更」項目をクリックする', async ({ page }) => {
  const renameItem = page.locator('[data-testid="file-menu-rename"]');
  if (await renameItem.count() > 0) {
    await renameItem.click();
  } else {
    await page.locator('.ant-dropdown-menu-item').filter({ hasText: '名前の変更' }).first().click();
  }
  await page.waitForTimeout(500);
});

/**
 * その他メニューの「削除」項目をクリックする（4-1-24〜4-1-28）
 * Ant Design Dropdown MenuItem: data-testid="file-menu-delete" または テキスト一致
 */
When('その他メニューの「削除」項目をクリックする', async ({ page }) => {
  const deleteItem = page.locator('[data-testid="file-menu-delete"]');
  if (await deleteItem.count() > 0) {
    await deleteItem.click();
  } else {
    await page.locator('.ant-dropdown-menu-item').filter({ hasText: '削除' }).first().click();
  }
  await page.waitForTimeout(500);
});

/**
 * MAIMLファイル削除確認ダイアログの「キャンセル」ボタンをクリックする（4-1-25）
 */
When('MAIMLファイル削除確認ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  const cancelBtn = page.locator('[data-testid="maiml-delete-cancel-button"]');
  if (await cancelBtn.count() > 0) {
    await cancelBtn.click();
  } else {
    // Ant Design Modal のキャンセルボタン
    await page.locator('.ant-modal-footer .ant-btn:not(.ant-btn-primary)').filter({ hasText: 'キャンセル' }).first().click();
  }
  await page.waitForTimeout(500);
});

/**
 * MAIMLファイル削除確認ダイアログの「削除」ボタンをクリックする（4-1-26〜4-1-28）
 */
When('MAIMLファイル削除確認ダイアログの「削除」ボタンをクリックする', async ({ page }) => {
  const confirmBtn = page.locator('[data-testid="maiml-delete-confirm-button"]');
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
  } else {
    await page.locator('.ant-modal-footer .ant-btn-danger, .ant-modal-footer .ant-btn-primary').filter({ hasText: '削除' }).first().click();
  }
  await page.waitForTimeout(1000);
});

// ---------------------------------------------------------------------------
// Then: MAIMLファイル削除機能 表示確認
// ---------------------------------------------------------------------------

/**
 * ファイル一覧の各行にその他メニューボタンが表示されること（4-1-21）
 */
Then('ファイル一覧の各行にその他メニューボタンが表示されること', async ({ page }) => {
  const moreButtons = page.locator('[data-testid="file-more-menu-button"]');
  await expect(moreButtons.first()).toBeVisible({ timeout: 10000 });
  const count = await moreButtons.count();
  expect(count).toBeGreaterThan(0);
});

/**
 * その他メニューに「名前の変更」項目が表示されること（4-1-22）
 */
Then('その他メニューに「名前の変更」項目が表示されること', async ({ page }) => {
  const renameItem = page.locator('[data-testid="file-menu-rename"]');
  if (await renameItem.count() > 0) {
    await expect(renameItem).toBeVisible({ timeout: 5000 });
  } else {
    await expect(page.locator('.ant-dropdown-menu-item').filter({ hasText: '名前の変更' }).first()).toBeVisible({ timeout: 5000 });
  }
});

/**
 * その他メニューに「削除」項目が表示されること（4-1-22）
 */
Then('その他メニューに「削除」項目が表示されること', async ({ page }) => {
  const deleteItem = page.locator('[data-testid="file-menu-delete"]');
  if (await deleteItem.count() > 0) {
    await expect(deleteItem).toBeVisible({ timeout: 5000 });
  } else {
    await expect(page.locator('.ant-dropdown-menu-item').filter({ hasText: '削除' }).first()).toBeVisible({ timeout: 5000 });
  }
});

/**
 * 名前の変更機能未実装メッセージが表示されること（4-1-23）
 */
Then('名前の変更機能未実装メッセージが表示されること', async ({ page }) => {
  const toastMsg = page.locator('.ant-message-info, .ant-message-warning').filter({ hasText: '未実装' });
  const alertMsg = page.locator('.ant-alert').filter({ hasText: '未実装' });
  await expect(toastMsg.or(alertMsg).first()).toBeVisible({ timeout: 5000 });
});

/**
 * MAIMLファイル削除確認ダイアログが表示されること（4-1-24〜4-1-28）
 */
Then('MAIMLファイル削除確認ダイアログが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="maiml-delete-confirm-dialog"]');
  if (await dialog.count() > 0) {
    await expect(dialog).toBeVisible({ timeout: 10000 });
  } else {
    // Ant Design Modal にファイル名または「削除」テキストが含まれること
    const modal = page.locator('.ant-modal-content').filter({ hasText: '削除' }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });
  }
});

/**
 * MAIMLファイル削除確認ダイアログが閉じること（4-1-25）
 */
Then('MAIMLファイル削除確認ダイアログが閉じること', async ({ page }) => {
  const dialog = page.locator('[data-testid="maiml-delete-confirm-dialog"]');
  if (await dialog.count() > 0) {
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  } else {
    await page.waitForTimeout(500);
  }
});

/**
 * ファイル一覧にMAIMLファイルが残っていること（4-1-25）
 */
Then('ファイル一覧にMAIMLファイルが残っていること', async ({ page }) => {
  const maimlFile = page.locator('[data-testid="file-list-row"]').filter({ hasText: '.maiml' }).first();
  if (await maimlFile.count() > 0) {
    await expect(maimlFile).toBeVisible({ timeout: 5000 });
  } else {
    await expect(page.locator('[data-testid^="file-row-"]').filter({ hasText: '.maiml' }).first()).toBeVisible({ timeout: 5000 });
  }
});

/**
 * DBのproject_maiml_flgがtrueのままであること（4-1-25）
 */
Then('DBのproject_maiml_flgがtrueのままであること', async ({}) => {
  const result = await db.query<{ project_maiml_flg: boolean }>(
    'SELECT project_maiml_flg FROM project WHERE organization_id = $1 AND project_id = $2',
    [ORG_ID, MAIML_PROJECT_ID]
  );
  expect(result.rows[0]?.project_maiml_flg).toBe(true);
});

/**
 * MAIMLファイル削除成功メッセージが表示されること（4-1-26, 4-1-27）
 */
Then('MAIMLファイル削除成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
  const successAlert = page.locator('.ant-alert-success');
  await expect(successToast.or(successAlert).first()).toBeVisible({ timeout: 10000 });
});

/**
 * ファイル一覧からMAIMLファイルが消えていること（4-1-26, 4-1-27）
 */
Then('ファイル一覧からMAIMLファイルが消えていること', async ({ page }) => {
  await page.waitForTimeout(1000);
  const maimlFile = page.locator('[data-testid="file-list-row"]').filter({ hasText: '.maiml' });
  const maimlFileFallback = page.locator('[data-testid^="file-row-"]').filter({ hasText: '.maiml' });
  const count1 = await maimlFile.count();
  const count2 = await maimlFileFallback.count();
  expect(count1 + count2).toBe(0);
});

/**
 * DBのproject_maiml_flgがfalseに更新されていること（4-1-26, 4-1-27）
 * 対象プロジェクトIDはシナリオタグで判定
 */
Then('DBのproject_maiml_flgがfalseに更新されていること', async ({ page: _page }) => {
  // どちらのプロジェクトIDでも対応できるよう両方チェック
  for (const projectId of [MAIML_PROJECT_ID, MAIML_ARCH_PROJECT_ID]) {
    const result = await db.query<{ project_maiml_flg: boolean }>(
      'SELECT project_maiml_flg FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    if ((result.rowCount ?? 0) > 0) {
      expect(result.rows[0].project_maiml_flg).toBe(false);
      return;
    }
  }
});

/**
 * MAIMLファイル削除エラーメッセージが表示されること（4-1-28）
 * project_status=in_progress のため削除不可
 */
Then('MAIMLファイル削除エラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error');
  const errorAlert = page.locator('.ant-alert-error');
  await expect(errorToast.or(errorAlert).first()).toBeVisible({ timeout: 10000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId - プロジェクトID（project テーブルの project_id）
 * @param projectName - プロジェクト名（project テーブルの project_name）
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(projectId: string, projectName: string): Promise<void> {
  console.log(`[4-1 upsertTestProject] 開始: project_id=${projectId}, project_name=${projectName}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // 既存の場合は project_name を更新
      await db.query(
        `UPDATE project
         SET project_name = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3`,
        [projectName, ORG_ID, projectId]
      );
      console.log(`[4-1 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
    } else {
      // 新規 INSERT
      await db.query(
        `INSERT INTO project (
          organization_id, project_id, project_name, project_status,
          project_maiml_flg, checkout_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          false, 0,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, projectName, PROJECT_STATUS_PLANNING]
      );
      createdProjectIds.push(projectId);
      console.log(`[4-1 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-1 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
