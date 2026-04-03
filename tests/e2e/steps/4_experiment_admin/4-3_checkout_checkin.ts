/**
 * ステップ定義: [4-3] チェックアウト / チェックイン
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-3_checkout_checkin.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブルを UPSERT して準備する
 *   - 4-3-7 用: project_task テーブルに worker_linked_flg=true のタスクを挿入して
 *              チェックイン不可状態を再現する
 *
 * ビジネスルール（設計書より）:
 *   - チェックアウトできるのは checked_in（checkout_status=0）状態のみ
 *   - チェックアウトには MAIML ファイルの登録が必要（project_maiml_flg=true）
 *   - チェックアウトにはタスクが 1 件以上登録済みであることが必要
 *   - チェックインできるのはチェックアウトしたユーザーのみ
 *   - 実行中のタスクがある場合はチェックイン不可
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
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

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = planning, 1 = pending, 2 = in_progress, 3 = review_waiting, 4 = completed, 5 = error
 */
const PROJECT_STATUS_PLANNING = 0;
const PROJECT_STATUS_IN_PROGRESS = 2;
const PROJECT_STATUS_COMPLETED = 4;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in, 1 = checked_out
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;
const CHECKOUT_STATUS_CHECKED_OUT = 1;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-3-1] チェックイン済み・MAIML登録済み・タスク登録済み
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_task に 1 件以上挿入
 */
Before({ tags: '@4-3-1' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-1)');
  try {
    const projectId = 'E2E-4-3-1';
    const projectName = 'E2Eテスト用プロジェクト_4-3-1';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-1)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-1):', error);
    throw error;
  }
});

/**
 * [4-3-2] チェックアウト済み（チェックインのテスト用）
 * - project_status=0, checkout_status=1, project_maiml_flg=true
 * - タスクは挿入しない（チェックイン自体のテストのため）
 */
Before({ tags: '@4-3-2' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-2)');
  try {
    const projectId = 'E2E-4-3-2';
    const projectName = 'E2Eテスト用プロジェクト_4-3-2';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_OUT, true);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-2)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-2):', error);
    throw error;
  }
});

/**
 * [4-3-3] チェックアウト済み（チェックアウト中タグ表示確認用）
 * - project_status=0, checkout_status=1, project_maiml_flg=true
 */
Before({ tags: '@4-3-3' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-3)');
  try {
    const projectId = 'E2E-4-3-3';
    const projectName = 'E2Eテスト用プロジェクト_4-3-3';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_OUT, true);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-3)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-3):', error);
    throw error;
  }
});

/**
 * [4-3-4] in_progress ステータス（チェックアウト不可）
 * - project_status=2, checkout_status=0, project_maiml_flg=true
 */
Before({ tags: '@4-3-4' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-4)');
  try {
    const projectId = 'E2E-4-3-4';
    const projectName = 'E2Eテスト用プロジェクト_4-3-4';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-4)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-4):', error);
    throw error;
  }
});

/**
 * [4-3-5] checked_out 状態（チェックアウト不可）
 * - project_status=0, checkout_status=1, project_maiml_flg=true
 */
Before({ tags: '@4-3-5' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-5)');
  try {
    const projectId = 'E2E-4-3-5';
    const projectName = 'E2Eテスト用プロジェクト_4-3-5';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-5)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-5):', error);
    throw error;
  }
});

/**
 * [4-3-6] completed ステータス（チェックアウト不可）
 * - project_status=4, checkout_status=0, project_maiml_flg=true
 */
Before({ tags: '@4-3-6' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-6)');
  try {
    const projectId = 'E2E-4-3-6';
    const projectName = 'E2Eテスト用プロジェクト_4-3-6';
    await upsertProject(projectId, projectName, PROJECT_STATUS_COMPLETED, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-6)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-6):', error);
    throw error;
  }
});

/**
 * [4-3-7] チェックアウト済み・実行中タスクあり（チェックイン不可）
 * - project_status=0, checkout_status=1, project_maiml_flg=true
 * - project_task に worker_linked_flg=true のタスクを挿入
 * - project_task_detail に task_status=1（実行中）のレコードを挿入
 *   → checkin() の hasIncompleteTasks() が参照するのは project_task_detail のため必須
 */
Before({ tags: '@4-3-7' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-7)');
  try {
    const projectId = 'E2E-4-3-7';
    const projectName = 'E2Eテスト用プロジェクト_4-3-7';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_OUT, true);
    // project_task に worker_linked_flg=true のタスクを挿入
    await upsertProjectTask(projectId, 'method_001', 1, true);
    // project_task_detail に task_status=1（実行中）のレコードを挿入
    // → hasIncompleteTasks() は project_task_detail.task_status NOT IN (3,4) を参照するため
    await upsertProjectTaskDetail(projectId, 'method_001', 1, 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-7)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-7):', error);
    throw error;
  }
});

/**
 * [4-3-9] MAIMLファイル未登録（チェックアウト不可）
 * - project_status=0, checkout_status=0, project_maiml_flg=false
 * - タスクは 1 件登録（MAIML 未登録のみが失敗原因）
 */
Before({ tags: '@4-3-9' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-9)');
  try {
    const projectId = 'E2E-4-3-9';
    const projectName = 'E2Eテスト用プロジェクト_4-3-9';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, false);
    await upsertProjectTask(projectId, 'method_001', 1);
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-9)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-9):', error);
    throw error;
  }
});

/**
 * [4-3-10] タスク未登録（チェックアウト不可）
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_task にレコードなし
 */
Before({ tags: '@4-3-10' }, async () => {
  console.log('[4-3 Before] テストデータ準備 開始 (tags: @4-3-10)');
  try {
    const projectId = 'E2E-4-3-10';
    const projectName = 'E2Eテスト用プロジェクト_4-3-10';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    // タスクは挿入しない（タスク未登録が失敗原因）
    console.log('[4-3 Before] テストデータ準備 完了 (tags: @4-3-10)');
  } catch (error) {
    console.error('[4-3 Before] テストデータ準備 失敗 (tags: @4-3-10):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-3 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        // project_task_detail を先に削除（依存テーブルのため）
        await db.query(
          'DELETE FROM project_task_detail WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        // project_task を削除
        await db.query(
          'DELETE FROM project_task WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        // project を削除
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-3 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-3 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-3 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-3 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * チェックイン済み・MAIMLファイル登録済み・タスク登録済みプロジェクトがDBに存在する（4-3-1用）
 * → Before フックで upsertProject / upsertProjectTask を実行済みのため no-op
 */
Given(
  'チェックイン済み・MAIMLファイル登録済み・タスク登録済みのテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済みプロジェクトがDBに存在する（4-3-2, 4-3-3用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済みのテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * in_progress ステータスのプロジェクトがDBに存在する（4-3-4用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'project_status が in_progress のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * checked_out 状態のプロジェクトがDBに存在する（4-3-5用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'checkout_status が checked_out のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * completed ステータスのプロジェクトがDBに存在する（4-3-6用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'project_status が completed のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済みかつ実行中タスクを持つプロジェクトがDBに存在する（4-3-7用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済みかつ実行中タスクを持つテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * MAIMLファイル未登録のチェックイン済みプロジェクトがDBに存在する（4-3-9用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'MAIMLファイル未登録のチェックイン済みテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * タスク未登録のチェックイン済みプロジェクトがDBに存在する（4-3-10用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'タスク未登録のチェックイン済みテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-3 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

// ---------------------------------------------------------------------------
// When: チェックアウト / チェックイン操作
// ---------------------------------------------------------------------------

/**
 * 「チェックアウト」ボタンをクリックする（checkout_status=0 の場合に表示されるボタン）
 * ProjectManagement.tsx: data-testid="checkout-checkin-button"
 */
When('「チェックアウト」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('[data-testid="checkout-checkin-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  // チェックアウトボタンのラベルが「チェックアウト」であることを確認してクリック
  await expect(btn).toContainText('チェックアウト', { timeout: 5000 });
  // API レスポンスを待機するための Promise を事前に設定
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/checkout'),
    { timeout: 15000 }
  );
  await btn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機（エラー系は即座に表示されるため）
  });
  // UI 更新を待機
  await page.waitForTimeout(1000);
});

/**
 * 「チェックイン」ボタンをクリックする（checkout_status=1 の場合に表示されるボタン）
 * ProjectManagement.tsx: data-testid="checkout-checkin-button"
 */
When('「チェックイン」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('[data-testid="checkout-checkin-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  // チェックインボタンのラベルが「チェックイン」であることを確認してクリック
  await expect(btn).toContainText('チェックイン', { timeout: 5000 });
  // API レスポンスを待機するための Promise を事前に設定
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/checkin'),
    { timeout: 15000 }
  );
  await btn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機
  });
  // UI 更新を待機
  await page.waitForTimeout(1000);
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * チェックアウト成功メッセージが表示されること（4-3-1）
 * ProjectManagement.tsx: message.success() によるトースト通知
 * 表示テキスト例: 「プロジェクト「XXX」をチェックアウトしました」
 */
Then('チェックアウト成功メッセージが表示されること', async ({ page }) => {
  // ログイン成功トーストと競合しないよう「チェックアウトしました」テキストで絞り込む
  const successToast = page.locator('.ant-message-success').filter({ hasText: 'チェックアウトしました' });
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * チェックイン成功メッセージが表示されること（4-3-2）
 * ProjectManagement.tsx: message.success() によるトースト通知
 * 表示テキスト例: 「プロジェクト「XXX」をチェックインしました」
 */
Then('チェックイン成功メッセージが表示されること', async ({ page }) => {
  // ログイン成功トーストと競合しないよう「チェックインしました」テキストで絞り込む
  const successToast = page.locator('.ant-message-success').filter({ hasText: 'チェックインしました' });
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * プロジェクトのチェックアウトボタンのラベルが「チェックイン」に変わること（4-3-1）
 * チェックアウト後は isCheckedOut=true になるためボタンラベルが変わる
 */
Then('プロジェクトのチェックアウトボタンのラベルが「チェックイン」に変わること', async ({ page }) => {
  const btn = page.locator('[data-testid="checkout-checkin-button"]');
  await expect(btn).toBeVisible({ timeout: 10000 });
  await expect(btn).toContainText('チェックイン', { timeout: 10000 });
});

/**
 * プロジェクトのチェックアウトボタンのラベルが「チェックアウト」に変わること（4-3-2）
 * チェックイン後は isCheckedOut=false になるためボタンラベルが変わる
 */
Then('プロジェクトのチェックアウトボタンのラベルが「チェックアウト」に変わること', async ({ page }) => {
  const btn = page.locator('[data-testid="checkout-checkin-button"]');
  await expect(btn).toBeVisible({ timeout: 10000 });
  await expect(btn).toContainText('チェックアウト', { timeout: 10000 });
});

/**
 * プロジェクト情報ヘッダーに「チェックアウト中」タグが表示されること（4-3-3）
 * ProjectManagement.tsx: data-testid="checkout-status-tag"
 */
Then('プロジェクト情報ヘッダーに「チェックアウト中」タグが表示されること', async ({ page }) => {
  const tag = page.locator('[data-testid="checkout-status-tag"]');
  await expect(tag).toBeVisible({ timeout: 10000 });
});

/**
 * チェックアウトボタンが非活性であること（4-3-6）
 * completed ステータスのプロジェクトはボタンが disabled になる
 * ProjectManagement.tsx: data-testid="checkout-checkin-button" disabled
 */
Then('チェックアウトボタンが非活性であること', async ({ page }) => {
  const btn = page.locator('[data-testid="checkout-checkin-button"]');
  await expect(btn).toBeVisible({ timeout: 10000 });
  await expect(btn).toBeDisabled({ timeout: 5000 });
});

/**
 * DBの checkout_status が checked_out（1）のままであることを確認（4-3-5）
 * チェックイン失敗時にDBが更新されていないことを保証する
 *
 * @param projectName - プロジェクト名（project テーブルの project_name）
 */
Then(
  'プロジェクト {string} のDBの checkout_status が checked_out のままであること',
  async ({}, projectName: string) => {
    console.log(`[4-3 Then] DB checkout_status 確認: project_name="${projectName}"`);
    const result = await db.query<{ checkout_status: number }>(
      `SELECT checkout_status FROM project
       WHERE organization_id = $1 AND project_name = $2`,
      [ORG_ID, projectName]
    );
    if (result.rows.length === 0) {
      throw new Error(`[4-3 Then] project が見つかりません: project_name="${projectName}"`);
    }
    const actualStatus = result.rows[0].checkout_status;
    console.log(`[4-3 Then] checkout_status=${actualStatus}（期待値: ${CHECKOUT_STATUS_CHECKED_OUT}）`);
    if (actualStatus !== CHECKOUT_STATUS_CHECKED_OUT) {
      throw new Error(
        `[4-3 Then] checkout_status が変更されています: actual=${actualStatus}, expected=${CHECKOUT_STATUS_CHECKED_OUT}`
      );
    }
  }
);

/**
 * チェックアウト失敗エラーメッセージが表示されること（4-3-4, 4-3-5）
 * ProjectManagement.tsx: エラーコード別の message.error() / message.warning()
 * - CHECKOUT_INVALID_STATUS: 「プロジェクトステータスがタスク実行待ちではありません」
 * - PROJECT_ALREADY_CHECKED_OUT: 「このプロジェクトは既に…チェックアウトされています」
 */
Then('チェックアウト失敗エラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error, .ant-message-warning');
  await expect(errorToast.first()).toBeVisible({ timeout: 10000 });
});

/**
 * チェックイン失敗エラーメッセージが表示されること（4-3-7）
 * バックエンドは TASK_NOT_COMPLETED を返し、フロントエンドは default ケースで
 * message.error(errorMessage) を呼び出す。
 * エラートーストが表示されること（テキストは問わない）を確認する。
 */
Then('チェックイン失敗エラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error');
  await expect(errorToast.first()).toBeVisible({ timeout: 10000 });
});

/**
 * MAIMLファイル未登録エラーメッセージが表示されること（4-3-9）
 * ProjectManagement.tsx: エラーコード CHECKOUT_NO_MAIML_FILE
 * 表示テキスト: 「MAIMLファイルが存在しません」
 */
Then('MAIMLファイル未登録エラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error');
  await expect(errorToast).toBeVisible({ timeout: 10000 });
  await expect(errorToast).toContainText('MAIMLファイルが存在しません', { timeout: 5000 });
});

/**
 * タスク未登録エラーメッセージが表示されること（4-3-10）
 * ProjectManagement.tsx: エラーコード CHECKOUT_NO_TASKS
 * 表示テキスト: 「タスクが登録されていません」
 */
Then('タスク未登録エラーメッセージが表示されること', async ({ page }) => {
  const errorToast = page.locator('.ant-message-error');
  await expect(errorToast).toBeVisible({ timeout: 10000 });
  await expect(errorToast).toContainText('タスクが登録されていません', { timeout: 5000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId      - プロジェクトID（project テーブルの project_id）
 * @param projectName    - プロジェクト名（project テーブルの project_name）
 * @param projectStatus  - プロジェクトステータス（0=planning, 2=in_progress, 4=completed）
 * @param checkoutStatus - チェックアウトステータス（0=checked_in, 1=checked_out）
 * @param maimlFlg       - MAIMLファイル登録フラグ（true=登録済み, false=未登録）
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
    `[4-3 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}, maiml=${maimlFlg}`
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
      console.log(`[4-3 upsertProject] UPDATE 完了: project_id=${projectId}`);
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
      createdProjectIds.push(projectId);
      console.log(`[4-3 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-3 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスク詳細を UPSERT する（4-3-7 用）
 *
 * checkin() の hasIncompleteTasks() は project_task_detail.task_status を参照するため、
 * チェックイン不可状態を再現するにはこのテーブルにレコードが必要。
 *
 * @param projectId  - プロジェクトID
 * @param methodId   - メソッドID
 * @param taskNo     - タスク連番
 * @param taskStatus - タスクステータス（1=実行中 → hasIncompleteTasks=true になる）
 *
 * DDL参照: docs/design/db/ddl/project_task_detail.sql
 */
async function upsertProjectTaskDetail(
  projectId: string,
  methodId: string,
  taskNo: number,
  taskStatus: number
): Promise<void> {
  console.log(
    `[4-3 upsertProjectTaskDetail] 開始: project_id=${projectId}, method_id=${methodId}, task_no=${taskNo}, task_status=${taskStatus}`
  );
  try {
    const existing = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task_detail
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
      [ORG_ID, projectId, methodId, taskNo]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_task_detail
         SET task_status = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND task_no = $5`,
        [taskStatus, ORG_ID, projectId, methodId, taskNo]
      );
      console.log(`[4-3 upsertProjectTaskDetail] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project_task_detail (
          organization_id, project_id, method_id, task_no,
          task_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, taskNo, taskStatus]
      );
      console.log(`[4-3 upsertProjectTaskDetail] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-3 upsertProjectTaskDetail] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param experimentOrder  - 実験順序
 * @param workerLinkedFlg  - ワーカー連携済みフラグ（デフォルト: false）
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number,
  workerLinkedFlg: boolean = false
): Promise<void> {
  console.log(
    `[4-3 upsertProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, worker_linked=${workerLinkedFlg}`
  );
  try {
    const existing = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_task
         SET worker_linked_flg = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND experiment_order = $5`,
        [workerLinkedFlg, ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[4-3 upsertProjectTask] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project_task (
          organization_id, project_id, method_id, experiment_order,
          attempts_count, worker_linked_flg,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          1, $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder, workerLinkedFlg]
      );
      console.log(`[4-3 upsertProjectTask] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-3 upsertProjectTask] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
