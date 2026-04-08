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

/** テスト中に作成した project_task_detail の複合キー */
const createdProjectTaskDetailKeys: Array<{
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
}> = [];

/** テスト中に作成した issue の issue_id */
const createdIssueIds: string[] = [];

/** テスト中に作成した issue_comment の comment_id */
const createdIssueCommentIds: string[] = [];

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
 * 5-5-16 用
 * - E2Eテスト用プロジェクト_5-5-16（executing_task）
 * - project_task: 複数メソッドID × 複数 experiment_order（昇順確認用）
 *   - method_id=E2E_METHOD_C, experiment_order=3
 *   - method_id=E2E_METHOD_A, experiment_order=1
 *   - method_id=E2E_METHOD_B, experiment_order=2
 */
Before({ tags: '@5-5-16' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-16)');
  try {
    await upsertTestProject('E2E-5-5-16', 'E2Eテスト用プロジェクト_5-5-16', PROJECT_STATUS_EXECUTING_TASK);
    // experiment_order をあえてバラバラに挿入し、UIが昇順で表示することを検証
    await upsertTestProjectTask('E2E-5-5-16', 'E2E_METHOD_C', 3, 'not_started');
    await upsertTestProjectTask('E2E-5-5-16', 'E2E_METHOD_A', 1, 'not_started');
    await upsertTestProjectTask('E2E-5-5-16', 'E2E_METHOD_B', 2, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-16)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-16):', error);
    throw error;
  }
});

/**
 * 5-5-17, 5-5-18, 5-5-20 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: not_started × 1
 * ※ 5-5-17: 問題報告ボタン → IssueManagementModal（viewMode=false）の表示確認
 * ※ 5-5-18: 問題登録がDBに保存されること
 * ※ 5-5-20: 問題確認ボタン → IssueManagementModal（viewMode=true）の表示確認（デグレード防止）
 */
Before({ tags: '@5-5-17 or @5-5-18 or @5-5-20' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-17 or @5-5-18 or @5-5-20)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'not_started');
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-17 or @5-5-18 or @5-5-20)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-17 or @5-5-18 or @5-5-20):', error);
    throw error;
  }
});

/**
 * 5-5-19 用
 * - E2Eテスト用プロジェクト_5-5（executing_task）
 * - project_task: not_started × 1
 * - issue: 1件以上（コメント投稿先）
 * ※ issue は別途 API 経由で作成するか、Before で DB に直接挿入する
 *   ここでは DB に直接 INSERT し、後処理で削除する
 */
Before({ tags: '@5-5-19' }, async () => {
  console.log('[5-5 Before] テストデータ準備 開始 (@5-5-19)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'not_started');
    // コメント投稿先の issue を作成
    await upsertTestIssue(
      'E2E-5-5-19-ISSUE',
      TEST_PROJECT_ID,
      'E2Eテスト用問題_5-5-19',
      'E2Eテスト用問題の内容（5-5-19用）',
    );
    console.log('[5-5 Before] テストデータ準備 完了 (@5-5-19)');
  } catch (error) {
    console.error('[5-5 Before] テストデータ準備 失敗 (@5-5-19):', error);
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
    // issue_comment を削除（issue より先に削除）
    for (const commentId of createdIssueCommentIds) {
      try {
        await db.query(
          `DELETE FROM issue_comment WHERE organization_id = $1 AND comment_id = $2`,
          [ORG_ID, commentId]
        );
        console.log(`[5-5 After] issue_comment 削除 完了: comment_id=${commentId}`);
      } catch (error) {
        console.error(`[5-5 After] issue_comment 削除 失敗: comment_id=${commentId}:`, error);
      }
    }
    createdIssueCommentIds.length = 0;

    // issue を削除
    for (const issueId of createdIssueIds) {
      try {
        await db.query(
          `DELETE FROM issue WHERE organization_id = $1 AND issue_id = $2`,
          [ORG_ID, issueId]
        );
        console.log(`[5-5 After] issue 削除 完了: issue_id=${issueId}`);
      } catch (error) {
        console.error(`[5-5 After] issue 削除 失敗: issue_id=${issueId}:`, error);
      }
    }
    createdIssueIds.length = 0;

    // project_task_detail を削除（project_task より先に削除）
    for (const key of createdProjectTaskDetailKeys) {
      try {
        await db.query(
          `DELETE FROM project_task_detail
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
          [key.organization_id, key.project_id, key.method_id, key.task_no]
        );
        console.log(`[5-5 After] project_task_detail 削除 完了: project_id=${key.project_id}, method_id=${key.method_id}, task_no=${key.task_no}`);
      } catch (error) {
        console.error(`[5-5 After] project_task_detail 削除 失敗:`, error);
      }
    }
    createdProjectTaskDetailKeys.length = 0;

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
 * 進捗確認タブを開く
 * ExperimentWorkerMenu.tsx: tabItems key='4'、t('menu.experiment_worker.tabs.progressCheck')
 */
When('進捗確認タブを開く', async ({ page }) => {
  // 進捗確認タブのラベルをクリック（デフォルトタブのため既に表示されているケースもある）
  // Ant Design Tabs コンポーネントは .ant-tabs-tab セレクターを使用すること（[role="tab"] は禁止）
  const progressTab = page.locator('.ant-tabs-tab').filter({ hasText: /進捗確認/ }).first();
  await progressTab.waitFor({ state: 'visible', timeout: 10000 });
  await progressTab.click();
  // タブコンテンツのAPI取得完了まで待機（固定待機ではなくネットワーク応答待ち）
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * 最初の有効な「開始」ボタンをクリックする（5-5-2）
 * TaskListTable.tsx の各行に配置された「開始」ボタン（disabled でないもの）
 */
When('最初の有効な「開始」ボタンをクリックする', async ({ page }) => {
  // Step1: ProgressCheckTable が描画されるまで待機
  //   ProgressCheckTab は methodTasks.length > 0 のときのみ ProgressCheckTable を描画するため、
  //   networkidle の後に React の state 更新・再レンダリングが完了してからテーブルを探す必要がある
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  // Step2: テーブル行が描画されるまで待機
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // テーブル内の開始ボタンを取得（aria-label で指定: Ant Design が2文字漢字にスペースを自動挿入するためhasTextは使用不可）
  const startBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="タスクを開始"]')
    .first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.scrollIntoViewIfNeeded();
  await startBtn.click();
  // API応答を待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * 最初の有効な「終了」ボタンをクリックする（5-5-8: 強制終了）
 * TaskListTable.tsx の各行に配置された「終了」ボタン（disabled でないもの）
 */
When('最初の有効な「終了」ボタンをクリックする', async ({ page }) => {
  // Step1: ProgressCheckTable が描画されるまで待機
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  // Step2: テーブル行が描画されるまで待機
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // aria-label で指定（Ant Design が「終了」→「終 了」とスペースを挿入するためhasTextは使用不可）
  const terminateBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="タスクを強制終了"]')
    .first();
  await terminateBtn.waitFor({ state: 'visible', timeout: 10000 });
  await terminateBtn.scrollIntoViewIfNeeded();
  await terminateBtn.click();
  // API応答を待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * タスク一覧の最初の「指示」ボタンをクリックする（5-5-5: 指示確認タブへ遷移）
 * TaskListTable.tsx: 指示確認ボタン（aria-label="作業指示を確認"）
 */
When('タスク一覧の最初の「指示」ボタンをクリックする', async ({ page }) => {
  // Step1: ProgressCheckTable が描画されるまで待機
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  // Step2: テーブル行が描画されるまで待機
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // aria-label で指定（Ant Design が「指示」→「指 示」とスペースを挿入するためhasTextは使用不可）
  const instructionBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="作業指示を確認"]')
    .first();
  await instructionBtn.waitFor({ state: 'visible', timeout: 10000 });
  await instructionBtn.scrollIntoViewIfNeeded();
  await instructionBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の「記録」ボタンをクリックする（5-5-6: 実験記録タブへ遷移）
 * TaskListTable.tsx: 実験記録ボタン（aria-label="実験記録を入力"）
 */
When('タスク一覧の最初の「記録」ボタンをクリックする', async ({ page }) => {
  // Step1: ProgressCheckTable が描画されるまで待機
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  // Step2: テーブル行が描画されるまで待機
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // aria-label で指定（Ant Design が「記録」→「記 録」とスペースを挿入するためhasTextは使用不可）
  const recordBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="実験記録を入力"]')
    .first();
  await recordBtn.waitFor({ state: 'visible', timeout: 10000 });
  await recordBtn.scrollIntoViewIfNeeded();
  await recordBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の問題確認ボタンをクリックする（5-5-7: 問題確認モーダル表示）
 * TaskListTable.tsx: issueCheck ボタン（t('experimentWork.progressCheck.checkButton')）
 */
When('タスク一覧の最初の問題確認ボタンをクリックする', async ({ page }) => {
  // Step1: ProgressCheckTable が描画されるまで待機
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  // Step2: テーブル行が描画されるまで待機
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // aria-label で指定（Ant Design が「確認」→「確 認」とスペースを挿入するためhasTextは使用不可）
  const issueBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="問題確認"]')
    .first();
  await issueBtn.waitFor({ state: 'visible', timeout: 10000 });
  await issueBtn.scrollIntoViewIfNeeded();
  await issueBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初の進捗率テキストをクリックする（5-5-9: フロー図ダイアログ表示）
 * TaskListTable.tsx: progressRate カラム（aria-label="進捗率 N% - クリックしてフロー図を表示"）
 */
When('タスク一覧の最初の進捗率テキストをクリックする', async ({ page }) => {
  // 進捗率テキスト: 青色・下線付き・クリック可（cursor: pointer）
  // Note: テーブルが水平スクロールされている場合にクリックできないため scrollIntoViewIfNeeded() を追加
  const progressRateText = page
    .locator('[data-testid="task-list-table"] [aria-label^="進捗率"]')
    .first();
  await progressRateText.waitFor({ state: 'visible', timeout: 10000 });
  await progressRateText.scrollIntoViewIfNeeded();
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
  // aria-label で指定（Ant Design が「開始」→「開 始」とスペースを挿入するためhas-textは使用不可）
  const startBtns = page.locator('[data-testid="task-list-table"] button[aria-label="タスクを開始"]');
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
  // その行の「開始」ボタンが disabled であること（aria-label で指定）
  await expect(inProgressRow.locator('button[aria-label="タスクを開始"]')).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-12] 「完了」ステータスの行の「終了」ボタンが無効化されていること
 */
Then('「完了」ステータスの行の「終了」ボタンが無効化されていること', async ({ page }) => {
  const completedRow = page.locator('[data-testid="task-list-table"] tr').filter({
    has: page.locator('.ant-tag-green:has-text("完了")')
  }).first();
  await completedRow.waitFor({ state: 'visible', timeout: 10000 });
  // aria-label で指定（Ant Design が「終了」→「終 了」とスペースを挿入するためhas-textは使用不可）
  await expect(completedRow.locator('button[aria-label="タスクを強制終了"]')).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-5-12] 「強制終了」ステータスの行の「終了」ボタンが無効化されていること
 */
Then('「強制終了」ステータスの行の「終了」ボタンが無効化されていること', async ({ page }) => {
  const forcedRow = page.locator('[data-testid="task-list-table"] tr').filter({
    has: page.locator('.ant-tag-red:has-text("強制終了")')
  }).first();
  await forcedRow.waitFor({ state: 'visible', timeout: 10000 });
  // aria-label で指定（Ant Design が「終了」→「終 了」とスペースを挿入するためhas-textは使用不可）
  await expect(forcedRow.locator('button[aria-label="タスクを強制終了"]')).toBeDisabled({ timeout: 10000 });
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

/**
 * [5-5-16] メソッドタブがexperiment_orderの昇順で表示されていること
 *
 * ProgressCheckTab.tsx の data-testid="progress-check-method-tabs" 配下に
 * Ant Design Tabs が表示される。各タブの data-testid="progress-check-method-tab-{experiment_order}"
 * を取得し、左から順に experiment_order が昇順になっていることを確認する。
 *
 * テストデータ（@5-5-16 Beforeフック）:
 *   - experiment_order=1 (E2E_METHOD_A)
 *   - experiment_order=2 (E2E_METHOD_B)
 *   - experiment_order=3 (E2E_METHOD_C)
 * をバラバラな順序でINSERTしており、UIが昇順（1→2→3）で表示することを検証する。
 */
Then('メソッドタブがexperiment_orderの昇順で表示されていること', async ({ page }) => {
  const methodTabsContainer = page.locator('[data-testid="progress-check-method-tabs"]');
  await methodTabsContainer.waitFor({ state: 'visible', timeout: 10000 });

  // メソッドタブを左から順に取得し、experiment_order を data-testid から抽出する
  // 期待する data-testid パターン: "progress-check-method-tab-{experiment_order}"
  const tabLocators = methodTabsContainer.locator('[data-testid^="progress-check-method-tab-"]');
  const count = await tabLocators.count();
  expect(count).toBeGreaterThan(1); // 複数タブがあること

  // 各タブの experiment_order を左から順に収集する
  const orders: number[] = [];
  for (let i = 0; i < count; i++) {
    const testId = await tabLocators.nth(i).getAttribute('data-testid');
    // "progress-check-method-tab-1" → 1
    const orderStr = testId?.replace('progress-check-method-tab-', '') ?? '';
    const order = parseInt(orderStr, 10);
    expect(isNaN(order)).toBe(false);
    orders.push(order);
  }

  // 昇順であることを検証（orders[i] < orders[i+1]）
  for (let i = 0; i < orders.length - 1; i++) {
    expect(orders[i]).toBeLessThan(orders[i + 1]);
  }
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

// ===========================================================================
// When: 5-5-17〜5-5-20 ステップ定義
// ===========================================================================

/**
 * 進捗確認タブのタスク一覧で最初の「問題報告」ボタンをクリックする（5-5-17, 5-5-18, 5-5-19）
 * ProgressCheckTab.tsx: issue アクション（viewMode=false で IssueManagementModal を開く）
 * No.23対応: 旧 IssueReportModal から IssueManagementModal（viewMode=false）に変更済み
 */
When('進捗確認タブのタスク一覧で最初の「問題報告」ボタンをクリックする', async ({ page }) => {
  await page.waitForSelector('[data-testid="progress-check-table"]', { timeout: 15000 });
  await page.waitForSelector(
    '[data-testid="task-list-table"] .ant-table-tbody tr.ant-table-row',
    { timeout: 10000 }
  );
  // aria-label で指定（Ant Design が「報告」→「報 告」とスペースを挿入するためhasTextは使用不可）
  const reportBtn = page
    .locator('[data-testid="task-list-table"] button[aria-label="問題を報告"]')
    .first();
  await reportBtn.waitFor({ state: 'visible', timeout: 10000 });
  await reportBtn.scrollIntoViewIfNeeded();
  await reportBtn.click();
  // IssueManagementModal のオープン完了まで待機
  await page.waitForSelector('[data-testid="issue-management-modal"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * 問題管理モーダルで新規問題を入力して登録する（5-5-18）
 * IssueManagementModal.tsx: viewMode=false のとき「新規問題報告」フォームが表示される
 * POST /api/v1/issues が呼び出されることを確認
 */
When('問題管理モーダルで新規問題を入力して登録する', async ({ page }) => {
  // 「新規問題報告」フォームのタイトル入力
  const titleInput = page.locator('[data-testid="issue-new-title-input"]');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.fill('E2Eテスト用問題タイトル_5-5-18');

  // 問題タイプを選択（必須）
  const typeSelect = page.locator('[data-testid="issue-new-type-select"]');
  await typeSelect.click();
  await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', { timeout: 5000 });
  await page.locator('.ant-select-dropdown .ant-select-item').first().click();

  // 内容を入力（10文字以上必須）
  const contentTextarea = page.locator('[data-testid="issue-new-content-textarea"]');
  await contentTextarea.fill('E2Eテスト用問題の内容です。5-5-18 の検証用データです。');

  // 「登録」ボタンをクリック
  const submitBtn = page.locator('[data-testid="issue-new-submit-button"]');
  await submitBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/**
 * 問題管理モーダルで既存問題を選択してコメントを投稿する（5-5-19）
 * IssueManagementModal.tsx: 問題リストから問題を選択 → コメントフォームに入力 → 投稿
 * POST /api/v1/issues/comments が呼び出されることを確認
 */
When('問題管理モーダルで既存問題を選択してコメントを投稿する', async ({ page }) => {
  // 問題一覧から最初の問題を選択
  const firstIssueItem = page.locator('[data-testid="issue-list-item"]').first();
  await firstIssueItem.waitFor({ state: 'visible', timeout: 10000 });
  await firstIssueItem.click();

  // コメント入力フォームが表示されるのを待機
  const commentInput = page.locator('[data-testid="issue-comment-input"]');
  await commentInput.waitFor({ state: 'visible', timeout: 10000 });
  await commentInput.fill('E2Eテスト用コメント_5-5-19');

  // 「コメントを投稿」ボタンをクリック
  const commentSubmitBtn = page.locator('[data-testid="issue-comment-submit-button"]');
  await commentSubmitBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

// ===========================================================================
// Then: 5-5-17〜5-5-20 ステップ定義
// ===========================================================================

/**
 * [5-5-17] 問題管理モーダルが編集モードで表示されること（viewMode=false）
 * IssueManagementModal.tsx: data-testid="issue-management-modal" が表示されていること
 */
Then('問題管理モーダルが編集モードで表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-management-modal"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-17] 問題管理モーダルに新規問題入力フォームが表示されること（viewMode=false）
 * IssueManagementModal.tsx: viewMode=false のとき data-testid="issue-management-new-issue-button" または
 * 新規登録フォームエリア（data-testid="issue-new-form"）が表示される
 */
Then('問題管理モーダルに新規問題入力フォームが表示されること', async ({ page }) => {
  // viewMode=false の場合、新規問題入力フォームまたは新規問題ボタンが表示される
  const newIssueForm = page.locator('[data-testid="issue-new-form"], [data-testid="issue-management-new-issue-button"]');
  await expect(newIssueForm.first()).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-18] 問題管理モーダルの問題一覧に登録した問題が表示されること
 * IssueManagementModal.tsx: POST /api/v1/issues 成功後、問題一覧が更新される
 */
Then('問題管理モーダルの問題一覧に登録した問題が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-list-item"]:has-text("E2Eテスト用問題タイトル_5-5-18")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-18] DBのissueテーブルに問題が保存されていること
 * POST /api/v1/issues が呼び出され、DBに永続化されていることを確認
 */
Then('DBのissueテーブルに問題が保存されていること', async () => {
  const result = await db.query<{ issue_id: string }>(
    `SELECT issue_id FROM issue
     WHERE organization_id = $1 AND title = $2
     ORDER BY create_at DESC LIMIT 1`,
    [ORG_ID, 'E2Eテスト用問題タイトル_5-5-18']
  );
  expect(result.rowCount ?? 0).toBeGreaterThan(0);
  // After フックで削除するために issue_id を記録
  const issueId = result.rows[0].issue_id;
  createdIssueIds.push(issueId);
});

/**
 * [5-5-19] 問題管理モーダルのコメント一覧に投稿したコメントが表示されること
 * IssueManagementModal.tsx: POST /api/v1/issues/comments 成功後、コメント一覧が更新される
 */
Then('問題管理モーダルのコメント一覧に投稿したコメントが表示されること', async ({ page }) => {
  await expect(
    page.locator('.issue-comment-content:has-text("E2Eテスト用コメント_5-5-19"), [data-testid="issue-comment-item"]:has-text("E2Eテスト用コメント_5-5-19")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-19] DBのissue_commentテーブルにコメントが保存されていること
 * POST /api/v1/issues/comments が呼び出され、DBに永続化されていることを確認
 */
Then('DBのissue_commentテーブルにコメントが保存されていること', async () => {
  const result = await db.query<{ comment_id: string }>(
    `SELECT comment_id FROM issue_comment
     WHERE organization_id = $1 AND comment = $2
     ORDER BY create_at DESC LIMIT 1`,
    [ORG_ID, 'E2Eテスト用コメント_5-5-19']
  );
  expect(result.rowCount ?? 0).toBeGreaterThan(0);
  // After フックで削除するために comment_id を記録
  const commentId = result.rows[0].comment_id;
  createdIssueCommentIds.push(commentId);
});

/**
 * [5-5-20] 問題管理モーダルが参照専用モードで表示されること（viewMode=true）
 * IssueManagementModal.tsx: viewMode=true のとき data-testid="issue-management-modal" が表示され、
 * 新規問題入力フォームが非表示になる
 */
Then('問題管理モーダルが参照専用モードで表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-management-modal"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-5-20] 問題管理モーダルに新規問題入力フォームが表示されないこと（viewMode=true）
 * IssueManagementModal.tsx: viewMode=true のとき「新規問題報告」ボタン・フォームが非表示
 */
Then('問題管理モーダルに新規問題入力フォームが表示されないこと', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-new-form"], [data-testid="issue-management-new-issue-button"]')
  ).not.toBeVisible({ timeout: 5000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用 issue を UPSERT する（5-5-19 Before フック用）
 *
 * @param issueId   - issue_id（E2Eテスト識別用）
 * @param projectId - project_id
 * @param title     - タイトル
 * @param content   - 内容
 *
 * DDL参照: docs/design/db/ddl/issue.sql
 */
async function upsertTestIssue(
  issueId: string,
  projectId: string,
  title: string,
  content: string
): Promise<void> {
  console.log(`[5-5 upsertTestIssue] 開始: issue_id=${issueId}, project_id=${projectId}`);
  try {
    const existing = await db.query<{ issue_id: string }>(
      'SELECT issue_id FROM issue WHERE organization_id = $1 AND issue_id = $2',
      [ORG_ID, issueId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE issue
         SET title = $1, content = $2, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND issue_id = $4`,
        [title, content, ORG_ID, issueId]
      );
      console.log(`[5-5 upsertTestIssue] UPDATE 完了: issue_id=${issueId}`);
    } else {
      await db.query(
        `INSERT INTO issue (
          organization_id, issue_id, project_id, title, content,
          issue_status, target_type,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          0, 'transition',
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, issueId, projectId, title, content]
      );
      createdIssueIds.push(issueId);
      console.log(`[5-5 upsertTestIssue] INSERT 完了: issue_id=${issueId}`);
    }
  } catch (error) {
    console.error(`[5-5 upsertTestIssue] 失敗: issue_id=${issueId}:`, error);
    throw error;
  }
}

/**
 * テス
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
 * task_status は project_task テーブルには存在せず、project_task_detail テーブルにある。
 * そのため以下の2ステップで処理する:
 *   1. project_task に task_status なしで UPSERT
 *   2. project_task_detail に task_status ありで UPSERT（task_no = experiment_order）
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param experimentOrder  - 実験順序（= project_task_detail.task_no として使用）
 * @param taskStatus       - タスクステータス文字列（'not_started' | 'in_progress' | 'completed' | 'forced_terminated'）
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 * DDL参照: docs/design/db/ddl/project_task_detail.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number,
  taskStatus: string
): Promise<void> {
  console.log(`[5-5 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}, task_status=${taskStatus}`);

  /**
   * task_status 文字列 → 数値変換
   * DDL: project_task_detail.task_status numeric(2,0)
   * 0: not_started, 1: in_progress, 3: completed, 4: forced_terminated
   */
  const taskStatusMap: Record<string, number> = {
    'not_started': 0,
    'in_progress': 1,
    'completed': 3,
    'forced_terminated': 4,
  };
  const taskStatusNum = taskStatusMap[taskStatus] ?? 0;

  try {
    // --- Step 1: project_task テーブルへ UPSERT（task_status カラムは存在しない） ---
    const existingTask = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existingTask.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_task
         SET update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
        [ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[5-5 upsertTestProjectTask] project_task UPDATE 完了: project_id=${projectId}, experiment_order=${experimentOrder}`);
    } else {
      await db.query(
        `INSERT INTO project_task (
          organization_id, project_id, method_id, experiment_order,
          experiment_condition, attempts_count, worker_linked_flg,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          1, 1, false,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder]
      );
      createdProjectTaskKeys.push({
        organization_id: ORG_ID,
        project_id: projectId,
        method_id: methodId,
        experiment_order: experimentOrder,
      });
      console.log(`[5-5 upsertTestProjectTask] project_task INSERT 完了: project_id=${projectId}, experiment_order=${experimentOrder}`);
    }

    // --- Step 2: project_task_detail テーブルへ UPSERT（task_no = experiment_order） ---
    const existingDetail = await db.query<{ task_no: number }>(
      `SELECT task_no FROM project_task_detail
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existingDetail.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_task_detail
         SET task_status = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3 AND method_id = $4 AND task_no = $5`,
        [taskStatusNum, ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[5-5 upsertTestProjectTask] project_task_detail UPDATE 完了: task_no=${experimentOrder}, task_status=${taskStatusNum}`);
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
        [ORG_ID, projectId, methodId, experimentOrder, taskStatusNum]
      );
      createdProjectTaskDetailKeys.push({
        organization_id: ORG_ID,
        project_id: projectId,
        method_id: methodId,
        task_no: experimentOrder,
      });
      console.log(`[5-5 upsertTestProjectTask] project_task_detail INSERT 完了: task_no=${experimentOrder}, task_status=${taskStatusNum}`);
    }
  } catch (error) {
    console.error(`[5-5 upsertTestProjectTask] 失敗: project_id=${projectId}, experiment_order=${experimentOrder}:`, error);
    throw error;
  }
}
