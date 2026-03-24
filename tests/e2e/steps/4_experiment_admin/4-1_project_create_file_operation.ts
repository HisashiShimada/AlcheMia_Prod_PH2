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
 *   - 4-1-7〜4-1-13 用: project テーブルに E2Eテスト用プロジェクト_4-1-base が存在すること
 *   - 4-1-10〜4-1-13 用: S3 に上記プロジェクトのファイルが存在すること
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import { expect, Download } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// モジュールレベル変数（ステップ間でデータを共有）
// ---------------------------------------------------------------------------

/**
 * ダウンロードイベントを事前登録して When→Then 間で共有する
 * 4-1-9: プロジェクトダウンロード
 * 4-1-10: ファイルダウンロード
 */
let pendingDownloadPromise: Promise<Download> | null = null;

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

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = planning（計画中）
 */
const PROJECT_STATUS_PLANNING = 0;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

/**
 * UIでの操作によって作成されるプロジェクト名一覧
 * After フックでプロジェクト名からDB削除する（2回目以降の実行で409にならないよう対応）
 */
const UI_CREATED_PROJECT_NAMES: string[] = [
  'E2Eテスト用プロジェクト_4-1-1',
  'E2Eテスト用プロジェクト_4-1-5',
];

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
Before({ tags: '@4-1-8 or @4-1-9 or @4-1-10 or @4-1-11 or @4-1-12 or @4-1-13' }, async () => {
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
    // Before フックで INSERT したプロジェクトを project_id で削除
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

    // UIで作成したプロジェクトをプロジェクト名で削除（2回目以降の実行で409にならないよう対応）
    for (const projectName of UI_CREATED_PROJECT_NAMES) {
      try {
        const result = await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_name = $2',
          [ORG_ID, projectName]
        );
        if ((result.rowCount ?? 0) > 0) {
          console.log(`[4-1 After] UI作成project 削除 完了: project_name=${projectName}`);
        }
      } catch (error) {
        console.error(`[4-1 After] UI作成project 削除 失敗: project_name=${projectName}:`, error);
      }
    }

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
// When: ファイル操作
// ---------------------------------------------------------------------------

/**
 * 「プロジェクトダウンロード」ボタンをクリックする
 * ProjectManagement.tsx: data-testid="project-download-button"
 * クリック前に download イベントを事前登録して Then ステップでの競合を防ぐ
 */
When('「プロジェクトダウンロード」ボタンをクリックする', async ({ page }) => {
  const downloadBtn = page.locator('[data-testid="project-download-button"]');
  await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  // クリック前にイベントリスナーを登録（Then ステップで await する）
  pendingDownloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await downloadBtn.click();
});

/**
 * ファイル一覧の最初のファイルの「ダウンロード」ボタンをクリックする
 * FileListTable.tsx: data-testid="file-download-button"（最初の1件）
 * クリック前に download イベントを事前登録して Then ステップでの競合を防ぐ
 */
When('ファイル一覧の最初のファイルの「ダウンロード」ボタンをクリックする', async ({ page }) => {
  const downloadBtn = page.locator('[data-testid="file-download-button"]').first();
  await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  // クリック前にイベントリスナーを登録（Then ステップで await する）
  pendingDownloadPromise = page.waitForEvent('download', { timeout: 20000 });
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
 * When ステップでクリック前に pendingDownloadPromise を登録済みのため、それを await する
 */
Then('ZIPファイルのダウンロードが開始されること', async ({}) => {
  if (!pendingDownloadPromise) {
    throw new Error('[4-1-9] pendingDownloadPromise が未登録です。When ステップでボタンをクリックしてください。');
  }
  try {
    const download = await pendingDownloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  } finally {
    pendingDownloadPromise = null;
  }
});

/**
 * ファイルのダウンロードが開始されること（4-1-10）
 * When ステップでクリック前に pendingDownloadPromise を登録済みのため、それを await する
 */
Then('ファイルのダウンロードが開始されること', async ({}) => {
  if (!pendingDownloadPromise) {
    throw new Error('[4-1-10] pendingDownloadPromise が未登録です。When ステップでボタンをクリックしてください。');
  }
  try {
    const download = await pendingDownloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  } finally {
    pendingDownloadPromise = null;
  }
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
