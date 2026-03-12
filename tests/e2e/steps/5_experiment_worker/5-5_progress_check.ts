/**
 * ステップ定義: [5-5] 進捗確認・承認依頼
 *
 * 対応 feature: tests/e2e/features/5_experiment_worker/5-5_progress_check.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : worker@example.com
 *   パスワード: worker123
 *
 * 前提条件（テストデータ）:
 *   - project テーブルに E2Eテスト用プロジェクト_5-5（project_status: 2 = executing_task）が存在すること
 *   - project_task テーブルに以下が存在すること（5-5-1, 5-5-3〜5-5-9):
 *       - not_started タスクが1件以上
 *       - in_progress タスクが1件以上（5-5-11 用）
 *       - completed タスクが1件、forced_terminated タスクが1件（5-5-12 用）
 *   - E2Eテスト用プロジェクト_5-5_承認待ち（project_status: 3 = waiting_approval）:
 *       - not_started タスクが1件以上（5-5-10, 5-5-15 用）
 *   - E2Eテスト用プロジェクト_5-5_承認依頼用（project_status: 2 = executing_task）:
 *       - タスクが1件以上（5-5-13, 5-5-14 用）
 *
 * data-testid 対応表（フロントエンドコンポーネント → テスト用セレクター）:
 *   progress-check-tab-content          ProgressCheckTab.tsx（タスクあり時のカード）
 *   progress-check-tab-no-project       ProgressCheckTab.tsx（プロジェクト未選択時）
 *   progress-check-method-tabs          ProgressCheckTab.tsx（メソッドタブ）
 *   task-list-table                     TaskListTable.tsx（タスク一覧テーブル）
 *   task-list-search-input              TaskListTable.tsx（検索入力）
 *   task-list-status-filter             TaskListTable.tsx（ステータスフィルタ）
 *   project-select                      ExperimentWorkerMenu.tsx（プロジェクト選択コンボボックス）
 *   project-select-button               ExperimentWorkerMenu.tsx（選択ボタン）
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/** テスト用プロジェクト（基本シナリオ用: executing_task） */
const TEST_PROJECT_ID = 'E2E-5-5';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_5-5';

/** テスト用プロジェクト（承認待ち: waiting_approval） */
const TEST_PROJECT_ID_APPROVAL_WAITING = 'E2E-5-5-AW';
const TEST_PROJECT_NAME_APPROVAL_WAITING = 'E2Eテスト用プロジェクト_5-5_承認待ち';

/** テスト用プロジェクト（承認依頼送信用: executing_task） */
const TEST_PROJECT_ID_APPROVAL_REQ = 'E2E-5-5-AR';
const TEST_PROJECT_NAME_APPROVAL_REQ = 'E2Eテスト用プロジェクト_5-5_承認依頼用';

/** テスト用メソッドID */
const TEST_METHOD_ID = 'E2E_METHOD_A';

/**
 * project_status 数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = executing_task（タスク実行中）
 * 3 = waiting_approval（承認待ち）
 */
const PROJECT_STATUS_EXECUTING_TASK = 2;
const PROJECT_STATUS_WAITING_APPROVAL = 3;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した project の project_id */
const createdProjectIds: string[] = [];

/** テスト中に作成した project_task の複合キー */
const createdProjectTaskKeys: Array<{
  organization_id: string;
  project_id: string;
  method_id: string;
  experiment_order: number;
}> = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 5-5-1, 5-5-3, 5-5-4, 5-5-5, 5-5-6, 5-5-7, 5-5-9 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: not_started × 1
 */
Before({ tags: '@5-5-1 or @5-5-3 or @5-5-4 or @5-5-5 or @5-5-6 or @5-5-7 or @5-5-9' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (基本シナリオ)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (基本シナリオ)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (基本シナリオ):', error);
    throw error;
  }
});

/**
 * 5-5-2 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: not_started × 1（開始ボタンが有効）
 */
Before({ tags: '@5-5-2' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-2)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-2)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-2):', error);
    throw error;
  }
});

/**
 * 5-5-8 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: in_progress × 1（強制終了ボタンが有効）
 */
Before({ tags: '@5-5-8' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-8)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'in_progress');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-8)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-8):', error);
    throw error;
  }
});

/**
 * 5-5-10, 5-5-15 用
 * - E2Eテスト用プロジェクト_5-5_承認待ち（waiting_approval）
 * - project_task: not_started × 1
 */
Before({ tags: '@5-5-10 or @5-5-15' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-10 or @5-5-15)');
  try {
    await upsertTestProject(TEST_PROJECT_ID_APPROVAL_WAITING, TEST_PROJECT_NAME_APPROVAL_WAITING, PROJECT_STATUS_WAITING_APPROVAL);
    await upsertTestProjectTask(TEST_PROJECT_ID_APPROVAL_WAITING, TEST_METHOD_ID, 1, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-10 or @5-5-15)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-10 or @5-5-15):', error);
    throw error;
  }
});

/**
 * 5-5-11 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: in_progress × 1（開始ボタンが無効）
 */
Before({ tags: '@5-5-11' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-11)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'in_progress');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-11)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-11):', error);
    throw error;
  }
});

/**
 * 5-5-12 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: completed × 1、forced_terminated × 1（強制終了ボタンが無効）
 */
Before({ tags: '@5-5-12' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-12)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'completed');
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 2, 'forced_terminated');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-12)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-12):', error);
    throw error;
  }
});

/**
 * 5-5-13, 5-5-14 用
 * - E2Eテスト用プロジェクト_5-5_承認依頼用（executing_task）
 * - project_task: not_started × 1
 * ※ テスト実行のたびに project_status を executing_task にリセット
 */
Before({ tags: '@5-5-13 or @5-5-14' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-13 or @5-5-14)');
  try {
    // 承認依頼用プロジェクトのステータスを executing_task にリセット
    await upsertTestProject(TEST_PROJECT_ID_APPROVAL_REQ, TEST_PROJECT_NAME_APPROVAL_REQ, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID_APPROVAL_REQ, TEST_METHOD_ID, 1, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-13 or @5-5-14)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-13 or @5-5-14):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[5-5 After] クリーンアップ 開始');
  try {
    // project_task を削除
    for (const key of createdProjectTaskKeys) {
      try {
        await db.query(
          `DELETE FROM project_task
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        );
        console.log(`[5-5 After] project_task 削除 完了: project_id=${key.project_id}, method_id=${key.method_id}, experiment_order=${key.experiment_order}`);
      } catch (error) {
        console.error(`[5-5 After] project_task 削除 失敗:`, error);
      }
    }
    createdProjectTaskKeys.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          `DELETE FROM project WHERE organization_id = $1 AND project_id = $2`,
          [ORG_ID, projectId]
        );
        console.log(`[5-5 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[5-5 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[5-5 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[5-5 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// When: ログイン・画面遷移
// ---------------------------------------------------------------------------

/**
 * 実験作業者ユーザーでログインする
 */
When('実験作業者ユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  // TODO: 実際の実験作業者ユーザーIDとパスワードに更新すること
  await page.fill('#userId', 'worker@example.com');
  await page.fill('#password', 'worker123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * 実験作業者メイン画面が表示されていることを確認する
 */
When('実験作業者メイン画面が表示されている', async ({ page }) => {
  await page.waitForSelector('[data-testid="project-select"]', {
    timeout: 15000,
  });
});

/**
 * プロジェクト選択コンボボックスで指定プロジェクトを選択する
 */
When('プロジェクト選択コンボボックスでプロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.waitFor({ state: 'visible', timeout: 10000 });
  await projectSelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title^="${projectName} "]`).click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

/**
 * 進捗確認タブを開く
 * ExperimentWorkerMenu.tsx: tabItems key='4'、t('menu.experiment_worker.tabs.progressCheck')
 */
When('進捗確認タブを開く', async ({ page }) => {
  // 進捗確認タブのラベルをクリック（デフォルトタブのため既に表示されているケースもある）
  const progressTab = page.locator('[role="tab"]').filter({ hasText: /進捗確認/ });
  await progressTab.waitFor({ state: 'visible', timeout: 10000 });
  await progressTab.click();
  // タブコンテンツが表示されるまで待機
  await page.waitForTimeout(1000);
});

/**
 * 実験記録タブを開く（5-5-3 でのタブ切り替え確認用）
 * ExperimentWorkerMenu.tsx: tabItems key='3'
 */
When('実験記録タブを開く', async ({ page }) => {
  const recordTab = page.locator('[role="tab"]').filter({ hasText: /実験記録/ });
  await recordTab.waitFor({ state: 'visible', timeout: 10000 });
  await recordTab.click();
  await page.waitForTimeout(500);
});

/**
 * 最初の有効な「開始」ボタンをクリックする（5-5-2）
 * TaskListTable.tsx の各行に配置された「開始」ボタン（disabled でないもの）
 */
When('最初の有効な「開始」ボタンをクリックする', async ({ page }) => {
  // テーブル内の有効な開始ボタンを取得
  const startBtn = page.locator('[data-testid="task-list-table"] button:has-text("開始"):not([disabled])').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();
  // API応答を待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * 最初の有効な「終了」ボタンをクリックする（5-5-8: 強制終了）
 * TaskListTable.tsx の各行に配置された「終了」ボタン（disabled でないもの）
 */
When('最初の有効な「終了」ボタンをクリックする', async ({ page }) => {
  const terminateBtn = page.locator('[data-testid="task-list-table"] button:has-text("終了"):not([disabled])').first();
  await terminateBtn.waitFor({ state: 'visible', timeout: 10000 });
  await terminateBtn.click();
  // API応答を待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * タスク一覧の最初の「指示」ボタンをクリックする（5-5-5: 指示確認タブへ遷移）
 * TaskListTable.tsx: 指示確認ボタン（aria-label="作業指示を確認"）
 */
When('タスク一覧の最初の「指示」ボタンをクリックする', async ({ page }) => {
  const instructionBtn = page.locator('[data-testid="task-list-table"] button:has-text("指示")').first();
  await instructionBtn.waitFor({ state: 'visible', timeout: 10000 });
  await instructionBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の「記録」ボタンをクリックする（5-5-6: 実験記録タブへ遷移）
 * TaskListTable.tsx: 実験記録ボタン（aria-label="実験記録を入力"）
 */
When('タスク一覧の最初の「記録」ボタンをクリックする', async ({ page }) => {
  const recordBtn = page.locator('[data-testid="task-list-table"] button:has-text("記録")').first();
  await recordBtn.waitFor({ state: 'visible', timeout: 10000 });
  await recordBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の問題確認ボタンをクリックする（5-5-7: 問題確認モーダル表示）
 * TaskListTable.tsx: issueCheck ボタン（t('experimentWork.progressCheck.checkButton')）
 */
When('タスク一覧の最初の問題確認ボタンをクリックする', async ({ page }) => {
  // 問題確認ボタン（「確認」または「問題」テキストのボタン）
  const issueBtn = page
    .locator('[data-testid="task-list-table"] button')
    .filter({ hasText: /確認|問題/ })
    .first();
  await issueBtn.waitFor({ state: 'visible', timeout: 10000 });
  await issueBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の進捗率テキストをクリックする（5-5-9: フロー図ダイアログ表示）
 * TaskListTable.tsx: progressRate カラム（aria-label="進捗率 N% - クリックしてフロー図を表示"）
 */
When('タスク一覧の最初の進捗率テキストをクリックする', async ({ page }) => {
  // 進捗率テキスト: 青色・下線付き・クリック可（cursor: pointer）
  const progressRateText = page
    .locator('[data-testid="task-list-table"] [aria-label^="進捗率"]')
    .first();
  await progressRateText.waitFor({ state: 'visible', timeout: 10000 });
  await progressRateText.click();
  await page.waitForTimeout(1000);
});

/**
 * 「承認依頼」ボタンをクリックする（5-5-13, 5-5-14, 5-5-15）
 * ExperimentWorkerMenu.tsx: currentTab === '4' のときのみ表示される承認依頼ボタン
 */
When('「承認依頼」ボタンをクリックする', async ({ page }) => {
  const approvalBtn = page.locator('button:has-text("承認依頼"):not([disabled])').first();
  await approvalBtn.waitFor({ state: 'visible', timeout: 10000 });
  await approvalBtn.click();
  // API応答を待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * [5-5-1] 進捗確認タブのコンテンツが表示されていること
 * ProgressCheckTab.tsx: data-testid="progress-check-tab-content"
 */
Then('進捗確認タブのコンテンツが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="progress-check-tab-content"]')
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-5-1] メソッドタブが表示されていること
 * ProgressCheckTab.tsx: data-testid="progress-check-method-tabs"
 */
Then('メソッドタブが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="progress-check-method-tabs"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-1] タスク一覧テーブルが表示されていること
 * TaskListTable.tsx: data-testid="task-list-table"
 */
Then('タスク一覧テーブルが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="task-list-table"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-2] タスクステータスが「作業中」に更新されること
 * 開始ボタンクリック後、当該行のステータスタグが「作業中」（orange）になること
 */
Then('タスクステータスが「作業中」に更新されること', async ({ page }) => {
  // Ant Design Tag: color="orange"、テキスト「作業中」
  await expect(
    page.locator('[data-testid="task-list-table"] .ant-tag-orange:has-text("作業中")')
      .first()
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-5-3] 「承認依頼」ボタンが表示されていること
 * ExperimentWorkerMenu.tsx: currentTab === '4' のときのみ表示
 */
Then('「承認依頼」ボタンが表示されていること', async ({ page }) => {
  await expect(
    page.locator('button:has-text("承認依頼")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-3] 「承認依頼」ボタンが表示されていないこと
 */
Then('「承認依頼」ボタンが表示されていないこと', async ({ page }) => {
  await expect(
    page.locator('button:has-text("承認依頼")')
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * [5-5-4] 「承認依頼」ボタンが無効化されていること
 * プロジェクト未選択時（selectedProject が空）は disabled
 */
Then('「承認依頼」ボタンが無効化されていること', async ({ page }) => {
  await expect(
    page.locator('button:has-text("承認依頼")')
  ).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-4, 5-5-13, 5-5-14, 5-5-15] 「承認依頼」ボタンが有効化されていること
 * プロジェクト選択後（selectedProject が空でない）は enabled
 */
Then('「承認依頼」ボタンが有効化されていること', async ({ page }) => {
  await expect(
    page.locator('button:has-text("承認依頼")')
  ).toBeEnabled({ timeout: 10000 });
});

/**
 * [5-5-5] 指示確認タブがアクティブになっていること
 * ExperimentWorkerMenu.tsx: tabItems key='2'（指示確認タブ）
 * aria-selected="true" の tab が「指示確認」テキストを含むこと
 */
Then('指示確認タブがアクティブになっていること', async ({ page }) => {
  await expect(
    page.locator('[role="tab"][aria-selected="true"]').filter({ hasText: /指示確認/ })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-6] 実験記録タブがアクティブになっていること
 * ExperimentWorkerMenu.tsx: tabItems key='3'（実験記録タブ）
 */
Then('実験記録タブがアクティブになっていること', async ({ page }) => {
  await expect(
    page.locator('[role="tab"][aria-selected="true"]').filter({ hasText: /実験記録/ })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-7] 問題確認モーダルが参照専用モードで表示されること
 * IssueManagementModal.tsx: viewMode=true のとき「新規問題報告」ボタンが非表示になる
 * data-testid="issue-management-new-issue-button" が存在しないことで確認
 */
Then('問題確認モーダルが参照専用モードで表示されること', async ({ page }) => {
  // モーダルが表示されていること
  await expect(
    page.locator('.ant-modal:visible').first()
  ).toBeVisible({ timeout: 10000 });
  // viewMode=true のため「新規問題報告」ボタンが表示されていないこと
  await expect(
    page.locator('[data-testid="issue-management-new-issue-button"]')
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * [5-5-8] タスクステータスが「強制終了」に更新されること
 * 強制終了ボタンクリック後、当該行のステータスタグが「強制終了」（red）になること
 */
Then('タスクステータスが「強制終了」に更新されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="task-list-table"] .ant-tag-red:has-text("強制終了")')
      .first()
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-5-9] フロー図ダイアログが表示されること
 * ProgressCheckTab.tsx → TaskListTable → onProgressRateClick でダイアログが開く
 * 実装を確認してdata-testidまたはモーダルタイトルで検証
 */
Then('フロー図ダイアログが表示されること', async ({ page }) => {
  // フロー図ダイアログ（モーダルまたはドラッグ可能ダイアログ）が表示されること
  await expect(
    page.locator('.ant-modal:visible, [data-testid^="instruction-flow-dialog-content-"]')
      .first()
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-5-10] タスク一覧の全「開始」ボタンが無効化されていること
 * waiting_approval（project_status=3）の場合、isEditableStatus=false → 全開始ボタンが disabled
 */
Then('タスク一覧の全「開始」ボタンが無効化されていること', async ({ page }) => {
  const startBtns = page.locator('[data-testid="task-list-table"] button:has-text("開始")');
  const count = await startBtns.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(startBtns.nth(i)).toBeDisabled({ timeout: 10000 });
  }
});

/**
 * [5-5-11] 「作業中」ステータスの行の「開始」ボタンが無効化されていること
 * TaskListTable.tsx: status !== 'not_started' のとき開始ボタンが disabled
 * 「作業中」タグを含む行の開始ボタンが disabled であることを確認
 */
Then('「作業中」ステータスの行の「開始」ボタンが無効化されていること', async ({ page }) => {
  // 「作業中」タグを含む行（tr）を取得
  const inProgressRow = page.locator('[data-testid="task-list-table"] tr').filter({
    has: page.locator('.ant-tag-orange:has-text("作業中")')
  }).first();
  await inProgressRow.waitFor({ state: 'visible', timeout: 10000 });
  // その行の「開始」ボタンが disabled であること
  await expect(inProgressRow.locator('button:has-text("開始")')).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-12] 「完了」ステータスの行の「終了」ボタンが無効化されていること
 */
Then('「完了」ステータスの行の「終了」ボタンが無効化されていること', async ({ page }) => {
  const completedRow = page.locator('[data-testid="task-list-table"] tr').filter({
    has: page.locator('.ant-tag-green:has-text("完了")')
  }).first();
  await completedRow.waitFor({ state: 'visible', timeout: 10000 });
  await expect(completedRow.locator('button:has-text("終了")')).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-12] 「強制終了」ステータスの行の「終了」ボタンが無効化されていること
 */
Then('「強制終了」ステータスの行の「終了」ボタンが無効化されていること', async ({ page }) => {
  const forcedRow = page.locator('[data-testid="task-list-table"] tr').filter({
    has: page.locator('.ant-tag-red:has-text("強制終了")')
  }).first();
  await forcedRow.waitFor({ state: 'visible', timeout: 10000 });
  await expect(forcedRow.locator('button:has-text("終了")')).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-13] 成功メッセージが表示されること
 * ExperimentWorkerMenu.tsx: message.success('承認依頼を送信しました')
 * Ant Design message コンポーネント（.ant-message-notice-content）で確認
 */
Then('成功メッセージ {string} が表示されること', async ({ page }, messageText: string) => {
  await expect(
    page.locator(`.ant-message-notice-content:has-text("${messageText}")`)
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-5-14] プロジェクト選択コンボボックスのプロジェクト表示に「承認待ち」が含まれること
 * 承認依頼後にプロジェクト一覧が再取得され、ステータスラベルが「承認待ち」になること
 * ExperimentWorkerMenu.tsx: プロジェクト一覧再取得後、Select の表示値が更新される
 */
Then('プロジェクト選択コンボボックスのプロジェクト表示に {string} が含まれること', async ({ page }, statusLabel: string) => {
  // プロジェクト選択コンボボックスに表示中の選択値が「承認待ち」を含むこと
  const projectSelectValue = page.locator('[data-testid="project-select"] .ant-select-selection-item');
  await expect(projectSelectValue).toContainText(statusLabel, { timeout: 15000 });
});

/**
 * [5-5-15] エラーメッセージが表示されること
 * ExperimentWorkerMenu.tsx: 409エラー時 message.error('既に承認依頼が送信されています')
 */
Then('エラーメッセージ {string} が表示されること', async ({ page }, messageText: string) => {
  await expect(
    page.locator(`.ant-message-notice-content:has-text("${messageText}")`)
  ).toBeVisible({ timeout: 15000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * Ant Design Select のドロップダウンが表示されるまで待機する
 */
async function waitForSelectDropdown(page: import('@playwright/test').Page): Promise<void> {
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
    { timeout: 10000 }
  );
}

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId     - プロジェクトID
 * @param projectName   - プロジェクト名
 * @param projectStatus - プロジェクトステータス（数値）
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(
  projectId: string,
  projectName: string,
  projectStatus: number
): Promise<void> {
  console.log(`[5-5 upsertTestProject] 開始: project_id=${projectId}, project_name=${projectName}, project_status=${projectStatus}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project
         SET project_name = $1, project_status = $2, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4`,
        [projectName, projectStatus, ORG_ID, projectId]
      );
      console.log(`[5-5 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
    } else {
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
        [ORG_ID, projectId, projectName, projectStatus]
      );
      createdProjectIds.push(projectId);
      console.log(`[5-5 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[5-5 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param experimentOrder  - 実験順序（タスクNo）
 * @param taskStatus       - タスクステータス（'not_started' | 'in_progress' | 'completed' | 'forced_terminated'）
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number,
  taskStatus: string
): Promise<void> {
  console.log(`[5-5 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}, task_status=${taskStatus}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // 既存レコードがある場合はタスクステータスを更新
      await db.query(
        `UPDATE project_task
         SET task_status = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND experiment_order = $5`,
        [taskStatus, ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[5-5 upsertTestProjectTask] UPDATE 完了: project_id=${projectId}, experiment_order=${experimentOrder}`);
    } else {
      await db.query(
        `INSERT INTO project_task (
          organization_id, project_id, method_id, experiment_order,
          task_status, experiment_condition, attempts_count, worker_linked_flg,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, 1, 1, false,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder, taskStatus]
      );
      createdProjectTaskKeys.push({
        organization_id: ORG_ID,
        project_id: projectId,
        method_id: methodId,
        experiment_order: experimentOrder,
      });
      console.log(`[5-5 upsertTestProjectTask] INSERT 完了: project_id=${projectId}, experiment_order=${experimentOrder}`);
    }
  } catch (error) {
    console.error(`[5-5 upsertTestProjectTask] 失敗: project_id=${projectId}, experiment_order=${experimentOrder}:`, error);
    throw error;
  }
}
