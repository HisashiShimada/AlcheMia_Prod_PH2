/**
 * ステップ定義: [4-6] 進捗確認・タスク結果
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-6_progress_monitoring.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project / project_task / transition_set テーブルを UPSERT して準備する
 *   - 4-6-1        : タスクデータを含むプロジェクト（単一メソッド・タスク1件）
 *   - 4-6-2-1〜2-7 : タスク・トランジション進捗データを含むプロジェクト（単一メソッド・タスク1件以上）
 *   - 4-6-2-3      : 複数メソッド（2件以上）のタスクを持つプロジェクト
 *   - 4-6-2-4      : 複数タスク（2件以上）を持つプロジェクト
 *   - 4-6-3        : 各ステータスのタスクを含むプロジェクト
 *   - 4-6-4        : review_waiting ステータスのタスクを含むプロジェクト
 *
 * data-testid 一覧（ProgressMonitoring.tsx）:
 *   - [progress-monitoring-project-list]         : 進捗確認タブのプロジェクト一覧テーブル
 *   - [progress-detail-button-{projectName}]     : 詳細ボタン（Eye アイコン付き）
 *
 * data-testid 一覧（WorkProgressDetailDialog.tsx）:
 *   - [progress-detail-dialog]                   : 詳細ダイアログ
 *   - [progress-detail-reload-button]            : 再読み込みボタン
 *   - [progress-detail-close-button]             : 閉じるボタン
 *   - [progress-detail-method-filter]            : メソッドフィルタ（複数メソッド時のみ表示）
 *   - [progress-detail-task-tabs]                : タスクタブ
 *
 * data-testid 一覧（ProjectManagement.tsx）:
 *   - [complete-review-button]                   : タスク確認完了ボタン
 *
 * data-testid 一覧（TaskResultsTable.tsx）:
 *   - [task-results-table]                       : タスク結果テーブル
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
const ADMIN_EMAIL = 'experiment_admin@example.com';
const ADMIN_PASSWORD = 'admin123';

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = in_progress（タスク実行中）
 */
const PROJECT_STATUS_IN_PROGRESS = 2;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 1 = checked_out（チェックアウト中）
 */
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
 * [4-6-1] タスクデータを含むプロジェクト
 * - project_status=2 (in_progress), checkout_status=1 (checked_out)
 * - project_task に 1件（method_001）を挿入
 */
Before({ tags: '@4-6-1' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-1)');
  try {
    const projectId = 'E2E-4-6-1';
    const projectName = 'E2Eテスト用プロジェクト_4-6-1';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'pending');
    createdProjectIds.push(projectId);
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-1)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-1):', error);
    throw error;
  }
});

/**
 * [4-6-2-1〜2-7] タスク・トランジション進捗データを含むプロジェクト（単一メソッド）
 * - project_task に 1件（method_001）を挿入
 * - transition_set に進捗データを1件挿入
 */
Before({ tags: '@4-6-2-1 or @4-6-2-2 or @4-6-2-3-single or @4-6-2-5 or @4-6-2-6 or @4-6-2-7' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-2-x)');
  try {
    const projectId = 'E2E-4-6-2';
    const projectName = 'E2Eテスト用プロジェクト_4-6-2';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'in_progress');
    await upsertTransitionSet(projectId, 'method_001', 'E2Eテスト用トランジション_1', '作業中');
    if (!createdProjectIds.includes(projectId)) {
      createdProjectIds.push(projectId);
    }
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-2-x)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-2-x):', error);
    throw error;
  }
});

/**
 * [4-6-2-3] 複数メソッドのプロジェクト
 * - project_task に 2件（method_001, method_002）を挿入
 */
Before({ tags: '@4-6-2-3' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-2-3)');
  try {
    const projectId = 'E2E-4-6-2-multi';
    const projectName = 'E2Eテスト用プロジェクト_4-6-2-multi';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'in_progress');
    await upsertProjectTask(projectId, 'method_002', 2, 'pending');
    await upsertTransitionSet(projectId, 'method_001', 'E2Eテスト用トランジション_multi_1', '作業中');
    if (!createdProjectIds.includes(projectId)) {
      createdProjectIds.push(projectId);
    }
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-2-3)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-2-3):', error);
    throw error;
  }
});

/**
 * [4-6-2-4] 複数タスクのプロジェクト
 * - project_task に 2件（method_001: task1, task2）を挿入
 */
Before({ tags: '@4-6-2-4' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-2-4)');
  try {
    const projectId = 'E2E-4-6-2-tasks';
    const projectName = 'E2Eテスト用プロジェクト_4-6-2-tasks';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'in_progress');
    await upsertProjectTask(projectId, 'method_001', 2, 'pending');
    await upsertTransitionSet(projectId, 'method_001', 'E2Eテスト用トランジション_tasks_1', '作業中');
    if (!createdProjectIds.includes(projectId)) {
      createdProjectIds.push(projectId);
    }
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-2-4)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-2-4):', error);
    throw error;
  }
});

/**
 * [4-6-3] 各ステータスのタスクを含むプロジェクト
 * - pending / in_progress / review_waiting / completed のタスクを各1件挿入
 */
Before({ tags: '@4-6-3' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-3)');
  try {
    const projectId = 'E2E-4-6-3';
    const projectName = 'E2Eテスト用プロジェクト_4-6-3';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'pending');
    await upsertProjectTask(projectId, 'method_001', 2, 'in_progress');
    await upsertProjectTask(projectId, 'method_001', 3, 'review_waiting');
    await upsertProjectTask(projectId, 'method_001', 4, 'completed');
    if (!createdProjectIds.includes(projectId)) {
      createdProjectIds.push(projectId);
    }
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-3)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-3):', error);
    throw error;
  }
});

/**
 * [4-6-4] review_waiting ステータスのタスクを含むプロジェクト
 */
Before({ tags: '@4-6-4' }, async () => {
  console.log('[4-6 Before] テストデータ準備 開始 (tags: @4-6-4)');
  try {
    const projectId = 'E2E-4-6-4';
    const projectName = 'E2Eテスト用プロジェクト_4-6-4';
    await upsertProject(projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_OUT, true);
    await upsertProjectTask(projectId, 'method_001', 1, 'review_waiting');
    if (!createdProjectIds.includes(projectId)) {
      createdProjectIds.push(projectId);
    }
    console.log('[4-6 Before] テストデータ準備 完了 (tags: @4-6-4)');
  } catch (error) {
    console.error('[4-6 Before] テストデータ準備 失敗 (tags: @4-6-4):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-6 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        // transition_set を先に削除（外部キー制約）
        await db.query(
          'DELETE FROM transition_set WHERE organization_id = $1 AND project_id = $2',
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
        console.log(`[4-6 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-6 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-6 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-6 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * タスクデータを含むプロジェクトがDBに存在する（4-6-1, 4-6-3用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'タスクデータを含むテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-6 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * タスク・トランジション進捗データを含むプロジェクトがDBに存在する（4-6-2-x用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'タスク・トランジション進捗データを含むテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-6 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * 複数メソッドを持つタスクデータを含むプロジェクトがDBに存在する（4-6-2-3用）
 * → Before フックで準備済みのため no-op
 */
Given(
  '複数メソッドを持つタスクデータを含むテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-6 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * 複数タスクを持つプロジェクトがDBに存在する（4-6-2-4用）
 * → Before フックで準備済みのため no-op
 */
Given(
  '複数タスクを持つテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-6 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * レビュー待ちタスクを含むプロジェクトがDBに存在する（4-6-4用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'レビュー待ちタスクを含むテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-6 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * 進捗確認画面が表示されている
 * トップメニューから「進捗確認」を選択する
 */
When('進捗確認画面が表示されている', async ({ page }) => {
  // ログイン済みの状態でサイドメニューから進捗確認を開く
  const progressMenu = page.locator('[data-testid="progress-monitoring-menu"]');
  if (await progressMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
    await progressMenu.click();
  } else {
    // メニューが data-testid で見つからない場合はテキストで探す
    const menuItem = page.locator('text=進捗確認').first();
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await menuItem.click();
  }
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
});

/**
 * プロジェクト「{projectName}」の詳細ボタンをクリックする
 * ProgressMonitoring.tsx: data-testid="progress-detail-button-{projectName}"
 */
When(
  'プロジェクト {string} の詳細ボタンをクリックする',
  async ({ page }, projectName: string) => {
    const detailBtn = page.locator(`[data-testid="progress-detail-button-${projectName}"]`);
    await detailBtn.waitFor({ state: 'visible', timeout: 10000 });

    // API レスポンスを並列待機
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/work-details') &&
        resp.request().method() === 'GET',
      { timeout: 15000 }
    );
    await detailBtn.click();
    await responsePromise.catch(() => {
      // API レスポンスが来ない場合はダイアログ表示を待機
    });
    await page.waitForTimeout(500);
  }
);

/**
 * 詳細ダイアログの「再読み込み」ボタンをクリックする
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-reload-button"
 */
When('詳細ダイアログの「再読み込み」ボタンをクリックする', async ({ page }) => {
  const reloadBtn = page.locator('[data-testid="progress-detail-reload-button"]');
  await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/work-details') &&
      resp.request().method() === 'GET',
    { timeout: 15000 }
  );
  await reloadBtn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はタイムアウト後に続行
  });
  await page.waitForTimeout(500);
});

/**
 * 詳細ダイアログの「閉じる」ボタンをクリックする
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-close-button"
 */
When('詳細ダイアログの「閉じる」ボタンをクリックする', async ({ page }) => {
  const closeBtn = page.locator('[data-testid="progress-detail-close-button"]');
  await closeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await closeBtn.click();
  await page.waitForTimeout(500);
});

/**
 * 詳細ダイアログの2番目のタスクタブをクリックする
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-task-tabs"
 * Ant Design の Tabs コンポーネント: .ant-tabs-tab の2番目
 */
When('詳細ダイアログの2番目のタスクタブをクリックする', async ({ page }) => {
  const tabs = page.locator('[data-testid="progress-detail-task-tabs"]');
  await tabs.waitFor({ state: 'visible', timeout: 10000 });

  // 2番目のタブをクリック（index=1）
  const secondTab = tabs.locator('.ant-tabs-tab').nth(1);
  await secondTab.waitFor({ state: 'visible', timeout: 10000 });
  await secondTab.click();
  await page.waitForTimeout(500);
});

/**
 * 「タスク結果」タブをクリックする
 * ProjectManagement.tsx: Tabs の key="task_results"
 */
When('「タスク結果」タブをクリックする', async ({ page }) => {
  const taskResultsTab = page.locator('.ant-tabs-tab').filter({ hasText: 'タスク結果' });
  await taskResultsTab.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/tasks') &&
      resp.request().method() === 'GET',
    { timeout: 15000 }
  );
  await taskResultsTab.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合は続行
  });
  await page.waitForTimeout(500);
});

/**
 * 「タスク確認完了」ボタンをクリックする
 * ProjectManagement.tsx: data-testid="complete-review-button"
 */
When('「タスク確認完了」ボタンをクリックする', async ({ page }) => {
  const completeBtn = page.locator('[data-testid="complete-review-button"]');
  await completeBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/tasks/complete-review') &&
      resp.request().method() === 'POST',
    { timeout: 15000 }
  );
  await completeBtn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機
  });
  await page.waitForTimeout(1000);
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * プロジェクト一覧にプロジェクトが表示されること（4-6-1）
 * ProgressMonitoring.tsx: data-testid="progress-monitoring-project-list"
 */
Then(
  'プロジェクト一覧にプロジェクト {string} が表示されること',
  async ({ page }, projectName: string) => {
    const projectList = page.locator('[data-testid="progress-monitoring-project-list"]');
    await projectList.waitFor({ state: 'visible', timeout: 10000 });
    await expect(projectList).toContainText(projectName, { timeout: 10000 });
  }
);

/**
 * プロジェクト進捗詳細ダイアログが表示されること（4-6-2-1）
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-dialog"
 */
Then('プロジェクト進捗詳細ダイアログが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 10000 });
});

/**
 * 詳細ダイアログにプロジェクト名が表示されること（4-6-2-2）
 * WorkProgressDetailDialog.tsx: プロジェクト基本情報カード内のプロジェクト名テキスト
 */
Then(
  '詳細ダイアログにプロジェクト名 {string} が表示されること',
  async ({ page }, projectName: string) => {
    const dialog = page.locator('[data-testid="progress-detail-dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    await expect(dialog).toContainText(projectName, { timeout: 10000 });
  }
);

/**
 * 詳細ダイアログにメソッドフィルタが表示されること（4-6-2-3: 複数メソッド）
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-method-filter"
 */
Then('詳細ダイアログにメソッドフィルタが表示されること', async ({ page }) => {
  const methodFilter = page.locator('[data-testid="progress-detail-method-filter"]');
  await expect(methodFilter).toBeVisible({ timeout: 10000 });
});

/**
 * 詳細ダイアログにメソッドフィルタが表示されないこと（4-6-2-3: 単一メソッド）
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-method-filter"
 * 単一メソッドのプロジェクトではメソッドフィルタが非表示になる
 */
Then('詳細ダイアログにメソッドフィルタが表示されないこと', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  const methodFilter = page.locator('[data-testid="progress-detail-method-filter"]');
  await expect(methodFilter).not.toBeVisible({ timeout: 5000 });
});

/**
 * 詳細ダイアログに2番目のタスクの情報が表示されること（4-6-2-4）
 * WorkProgressDetailDialog.tsx: タスク詳細カード内に「Task2」が含まれること
 */
Then('詳細ダイアログに2番目のタスクの情報が表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  // タスク番号「Task2」または「タスクNo 2」が表示されていること
  await expect(dialog).toContainText(/Task2|タスクNo.*2/i, { timeout: 10000 });
});

/**
 * 詳細ダイアログにトランジション詳細一覧が表示されること（4-6-2-5）
 * WorkProgressDetailDialog.tsx: トランジション詳細一覧のカード（transitionProgress）
 */
Then('詳細ダイアログにトランジション詳細一覧が表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  // トランジション詳細一覧のタイトルが表示されていること
  await expect(dialog).toContainText('トランジション詳細', { timeout: 10000 });
  // 少なくとも1件のトランジションカードが表示されていること
  const transitionCards = dialog.locator('.ant-card').filter({ hasText: 'E2Eテスト用トランジション' });
  await expect(transitionCards.first()).toBeVisible({ timeout: 10000 });
});

/**
 * 詳細ダイアログのデータが再取得されること（4-6-2-6）
 * 再読み込みボタンクリック後にダイアログが引き続き表示されていること
 * （ローディングが完了してデータが再表示されること）
 */
Then('詳細ダイアログのデータが再取得されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  // ダイアログが引き続き表示されていること（閉じていないこと）
  await expect(dialog).toBeVisible({ timeout: 10000 });
  // プロジェクト情報が再表示されていること
  await expect(dialog).toContainText('プロジェクト進捗詳細', { timeout: 10000 });
});

/**
 * プロジェクト進捗詳細ダイアログが閉じること（4-6-2-7）
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-dialog"
 */
Then('プロジェクト進捗詳細ダイアログが閉じること', async ({ page }) => {
  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await expect(dialog).not.toBeVisible({ timeout: 10000 });
});

/**
 * タスク統計に総タスク数が表示されること（4-6-3）
 * ProjectManagement.tsx: タスク結果タブ内の統計カード
 */
Then('タスク統計に総タスク数が表示されること', async ({ page }) => {
  // 「総タスク数」テキストが含まれる統計カードが表示されていること
  const statsCard = page.locator('.ant-card').filter({ hasText: '総タスク数' });
  await expect(statsCard.first()).toBeVisible({ timeout: 10000 });
});

/**
 * タスク結果テーブルが表示されること（4-6-3）
 * TaskResultsTable.tsx: data-testid="task-results-table"
 */
Then('タスク結果テーブルが表示されること', async ({ page }) => {
  const table = page.locator('[data-testid="task-results-table"]');
  await expect(table).toBeVisible({ timeout: 10000 });
});

/**
 * タスク確認完了成功メッセージが表示されること（4-6-4）
 * ProjectManagement.tsx: message.success() によるトースト通知
 */
Then('タスク確認完了成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * レビュー待ちタスク件数が「0」になること（4-6-4）
 * ProjectManagement.tsx: 統計カードの「レビュー待ち」件数が 0 になること
 */
Then('レビュー待ちタスク件数が {string} になること', async ({ page }, count: string) => {
  // 「レビュー待ち」統計カードの数値が指定値になること
  const reviewWaitingCard = page.locator('.ant-card').filter({ hasText: 'レビュー待ち' });
  await reviewWaitingCard.waitFor({ state: 'visible', timeout: 10000 });
  // Ant Design の Title コンポーネントが count を表示していること
  const countText = reviewWaitingCard.locator('h3, .ant-typography');
  await expect(countText.first()).toContainText(count, { timeout: 10000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId      - プロジェクトID
 * @param projectName    - プロジェクト名
 * @param projectStatus  - プロジェクトステータス
 * @param checkoutStatus - チェックアウトステータス
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
    `[4-6 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
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
      console.log(`[4-6 upsertProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[4-6 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-6 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param experimentOrder  - 実験順序
 * @param workStatus       - ワーク（タスク）ステータス文字列
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number,
  workStatus: string
): Promise<void> {
  console.log(
    `[4-6 upsertProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, order=${experimentOrder}, status=${workStatus}`
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
         SET work_status = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND experiment_order = $5`,
        [workStatus, ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[4-6 upsertProjectTask] UPDATE 完了: project_id=${projectId}, order=${experimentOrder}`);
    } else {
      await db.query(
        `INSERT INTO project_task (
          organization_id, project_id, method_id, experiment_order,
          attempts_count, worker_linked_flg, work_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          1, false, $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder, workStatus]
      );
      console.log(`[4-6 upsertProjectTask] INSERT 完了: project_id=${projectId}, order=${experimentOrder}`);
    }
  } catch (error) {
    console.error(`[4-6 upsertProjectTask] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用トランジション進捗データを UPSERT する
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param transitionName   - トランジション名
 * @param progressStatus   - 進捗ステータス（日本語: '完了'/'作業中'/'未開始'等）
 *
 * DDL参照: backend/migrations/20260226_create_transition_set_table.sql
 */
async function upsertTransitionSet(
  projectId: string,
  methodId: string,
  transitionName: string,
  progressStatus: string
): Promise<void> {
  console.log(
    `[4-6 upsertTransitionSet] 開始: project_id=${projectId}, transition=${transitionName}, status=${progressStatus}`
  );
  try {
    // 既存のトランジション進捗データを削除してから挿入（UPSERT の代替）
    await db.query(
      `DELETE FROM transition_set
       WHERE organization_id = $1 AND project_id = $2 AND transition_name = $3`,
      [ORG_ID, projectId, transitionName]
    );

    await db.query(
      `INSERT INTO transition_set (
        organization_id, project_id, method_id,
        transition_name, progress_status,
        create_user_id, create_at, update_user_id, update_at
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        'e2e-test', NOW(), 'e2e-test', NOW()
      )`,
      [ORG_ID, projectId, methodId, transitionName, progressStatus]
    );
    console.log(`[4-6 upsertTransitionSet] INSERT 完了: project_id=${projectId}, transition=${transitionName}`);
  } catch (error) {
    console.error(`[4-6 upsertTransitionSet] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
