/**
 * ステップ定義: [5-1] プロジェクト・メソッド・タスク選択
 *
 * 対応 feature: tests/e2e/features/5_experiment_worker/5-1_project_selection.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : worker@example.com
 *   パスワード: worker123
 *
 * 前提条件（テストデータ）:
 *   - project テーブルに E2Eテスト用プロジェクト_5-1（project_status: 2 = executing_task）が存在すること
 *   - project テーブルに E2Eテスト用プロジェクト_5-1B（project_status: 2 = executing_task）が存在すること（5-1-3用）
 *   - project_task テーブルに上記プロジェクトのメソッドA・メソッドB・タスクが存在すること
 *
 * TODO: API GET /api/v1/projects/worker-accessible が実装完了後、
 *       APIレスポンス内容の確認も追加すること（現在はUIレベルの確認のみ）
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

/** テスト用プロジェクト（基本シナリオ用） */
const TEST_PROJECT_ID = 'E2E-5-1-A';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_5-1';

/** テスト用プロジェクトB（5-1-3: プロジェクト変更リセット確認用） */
const TEST_PROJECT_ID_B = 'E2E-5-1-B';
const TEST_PROJECT_NAME_B = 'E2Eテスト用プロジェクト_5-1B';

/** テスト用メソッドA（最初のタブ） */
const TEST_METHOD_ID_A = 'E2E_METHOD_A';

/** テスト用メソッドB（2番目のタブ・5-1-4用） */
const TEST_METHOD_ID_B = 'E2E_METHOD_B';

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = executing_task（タスク実行中）
 * テストシナリオ §3.3 および §5-5 ビジネスルール表より確認済み
 */
const PROJECT_STATUS_EXECUTING_TASK = 2;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した project_task の主キー（After で削除） */
const createdProjectTaskKeys: Array<{
  organization_id: string;
  project_id: string;
  method_id: string;
  experiment_order: number;
}> = [];

/** テスト中に作成した project の主キー（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 5-1-1, 5-1-2, 5-1-4, 5-1-5 用
 * - テスト用プロジェクト_5-1 を INSERT
 * - テスト用メソッドA・B と各タスクを project_task に INSERT
 */
Before({ tags: '@5-1-1 or @5-1-2 or @5-1-4 or @5-1-5 or @5-1-8 or @5-1-9' }, async () => {
  console.log('[5-1 Before] テストデータ準備 開始 (tags: @5-1-1 or @5-1-2 or @5-1-4 or @5-1-5)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID_A, 1);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID_A, 2);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID_B, 1);
    console.log('[5-1 Before] テストデータ準備 完了 (tags: @5-1-1 or @5-1-2 or @5-1-4 or @5-1-5)');
  } catch (error) {
    console.error('[5-1 Before] テストデータ準備 失敗 (tags: @5-1-1 or @5-1-2 or @5-1-4 or @5-1-5):', error);
    throw error;
  }
});

/**
 * 5-1-3 用
 * - テスト用プロジェクト_5-1 と _5-1B を INSERT
 * - 各プロジェクトにメソッドA タスクを INSERT
 */
Before({ tags: '@5-1-3' }, async () => {
  console.log('[5-1 Before] テストデータ準備 開始 (tags: @5-1-3)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProject(TEST_PROJECT_ID_B, TEST_PROJECT_NAME_B);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID_A, 1);
    await upsertTestProjectTask(TEST_PROJECT_ID_B, TEST_METHOD_ID_A, 1);
    console.log('[5-1 Before] テストデータ準備 完了 (tags: @5-1-3)');
  } catch (error) {
    console.error('[5-1 Before] テストデータ準備 失敗 (tags: @5-1-3):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[5-1 After] クリーンアップ 開始');
  try {
    // project_task を削除
    for (const key of createdProjectTaskKeys) {
      try {
        await db.query(
          `DELETE FROM project_task
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        );
        console.log(`[5-1 After] project_task 削除 完了: project_id=${key.project_id}, method_id=${key.method_id}, experiment_order=${key.experiment_order}`);
      } catch (error) {
        console.error(`[5-1 After] project_task 削除 失敗: project_id=${key.project_id}, method_id=${key.method_id}, experiment_order=${key.experiment_order}:`, error);
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
        console.log(`[5-1 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[5-1 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[5-1 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[5-1 After] クリーンアップ 失敗:', error);
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
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
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
 * （ログイン後、実験作業者メニューに遷移している前提）
 */
When('実験作業者メイン画面が表示されている', async ({ page }) => {
  // プロジェクト選択コンボボックスが表示されるまで待機（ExperimentWorkerMenu の project-select）
  await page.waitForSelector('[data-testid="project-select"]', {
    timeout: 15000,
  });
});

/**
 * 実験記録タブをクリックして開く
 */
When('実験記録タブを開く', async ({ page }) => {
  await page.click('text=実験記録');
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

// ---------------------------------------------------------------------------
// When: プロジェクト選択操作
// ---------------------------------------------------------------------------

/**
 * プロジェクト選択コンボボックスを開く（ドロップダウンを展開する）
 */
When('プロジェクト選択コンボボックスを開く', async ({ page }) => {
  // プロジェクト選択エリア内の Ant Design Select をクリック（ExperimentWorkerMenu.tsx: data-testid="project-select"）
  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.waitFor({ state: 'visible', timeout: 10000 });
  await projectSelect.click();
  // ドロップダウンが表示されるまで待機
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
});

/**
 * プロジェクト選択エリアの「選択」ボタンをクリックしてプロジェクト選択モーダルを開く
 */
When('プロジェクト選択エリアの「選択」ボタンをクリックする', async ({ page }) => {
  // プロジェクト選択エリア内の「選択」ボタン（ExperimentWorkerMenu.tsx: data-testid="project-select-button"）
  const selectBtn = page.locator('[data-testid="project-select-button"]');
  await selectBtn.waitFor({ state: 'visible', timeout: 10000 });
  await selectBtn.click();
  // モーダルが表示されるまで待機
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

/**
 * プロジェクト選択コンボボックスで指定プロジェクトを選択する
 */
When('プロジェクト選択コンボボックスでプロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  // プロジェクト選択エリアの Select をクリックして展開（ExperimentWorkerMenu.tsx: data-testid="project-select"）
  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.waitFor({ state: 'visible', timeout: 10000 });
  await projectSelect.click();
  // ドロップダウンが表示されるまで待機
  await waitForSelectDropdown(page);
  // 指定プロジェクト名のオプションをクリック（title属性の前方一致で完全プロジェクト名を特定）
  // getByRole() は aria-label で解決されるが仮想スクロール外で不可視になる問題があるため
  // title 属性の CSS 前方一致セレクターを使用する
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title^="${projectName} "]`).click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

// ---------------------------------------------------------------------------
// When: メソッド・タスク選択モーダル操作
// ---------------------------------------------------------------------------

/**
 * メソッド・タスク選択エリアの「選択」ボタンをクリックしてモーダルを開く
 */
When('メソッド・タスク選択エリアの「選択」ボタンをクリックする', async ({ page }) => {
  // メソッド・タスク選択エリア内の「選択」ボタン（MethodTaskSelector.tsx: data-testid="method-task-select-button"）
  const selectBtn = page.locator('[data-testid="method-task-select-button"]');
  await selectBtn.waitFor({ state: 'visible', timeout: 10000 });
  await selectBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

/**
 * メソッド・タスク選択モーダルでデフォルトのタスクを選択して「決定」ボタンを押す
 * （5-1-3 でメソッド・タスクが選択済み状態を作るために使用）
 */
When('メソッド・タスク選択モーダルでタスクを選択して決定する', async ({ page }) => {
  // モーダルが表示されるまで待機
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // 最初のタスクのラジオボタンを選択
  await modal.locator('input[type="radio"]').first().click();
  // 「決定」ボタンをクリック
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

/**
 * 指定メソッドのタブをクリックする（5-1-4）
 */
When('メソッドタブ {string} をクリックする', async ({ page }, methodName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  await modal.locator(`.ant-tabs-tab:has-text("${methodName}")`).click();
  // タブ切り替え後のコンテンツ表示を待機
  await page.waitForTimeout(500);
});

/**
 * 指定タスクのラジオボタンをクリックする（5-1-4）
 */
When('タスク {string} のラジオボタンをクリックする', async ({ page }, taskName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // タスク名テキストを含む行のラジオボタンをクリック
  const taskRow = modal.locator(`tr:has-text("${taskName}"), li:has-text("${taskName}")`).first();
  await taskRow.waitFor({ state: 'visible', timeout: 10000 });
  await taskRow.locator('input[type="radio"]').click();
});

/**
 * 「決定」ボタンをクリックしてモーダルを確定する（5-1-4）
 */
When('「決定」ボタンをクリックする', async ({ page }) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

/**
 * タスク名フィルターに文字列を入力する（5-1-5, 5-1-9）
 * MethodTaskSelectionModal.tsx の全カラム検索 Input（placeholder="検索..."）を使用する
 * data-testid="method-task-selection-search-input"
 */
When('タスク名フィルターに {string} と入力する', async ({ page }, filterText: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // MethodTaskSelectionModal.tsx: data-testid="method-task-selection-search-input"
  const filterInput = page.locator('[data-testid="method-task-selection-search-input"]');
  await filterInput.waitFor({ state: 'visible', timeout: 10000 });
  await filterInput.fill(filterText);
  // フィルタリング結果の反映を待機
  await page.waitForTimeout(500);
});

/**
 * [5-1-6] プロジェクト選択モーダルの検索ボックスに文字列を入力する
 * ProjectSelectionModal.tsx: data-testid="project-selection-search-input"
 * あいまい検索対象: プロジェクト名（projectName）・プロジェクトコード（projectCd）
 * 参照: ui_project_selection_modal.md §6.1
 */
When('プロジェクト選択モーダルの検索ボックスに {string} と入力する', async ({ page }, searchText: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクト選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const searchInput = page.locator('[data-testid="project-selection-search-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(searchText);
  // フィルタリング結果の反映を待機
  await page.waitForTimeout(500);
});

/**
 * [5-1-6] プロジェクト選択モーダルの検索ボックスをクリアする
 * allowClear ボタン（.ant-input-clear-icon）をクリックする
 */
When('プロジェクト選択モーダルの検索ボックスをクリアする', async ({ page }) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクト選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const searchInput = page.locator('[data-testid="project-selection-search-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.clear();
  await page.waitForTimeout(500);
});

/**
 * [5-1-7] プロジェクト選択モーダルのプロジェクト名フィルターで指定プロジェクト名を選択する
 * ProjectSelectionModal.tsx: data-testid="project-selection-name-filter"
 * 参照: ui_project_selection_modal.md §6.2（完全一致フィルター）
 */
When('プロジェクト選択モーダルのプロジェクト名フィルターで {string} を選択する', async ({ page }, projectName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクト選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // ProjectSelectionModal.tsx: data-testid="project-selection-name-filter"
  const nameFilter = page.locator('[data-testid="project-selection-name-filter"]');
  await nameFilter.waitFor({ state: 'visible', timeout: 10000 });
  await nameFilter.click();
  await waitForSelectDropdown(page);
  // プロジェクト名選択肢をクリック
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option:has-text("${projectName}")`).click();
  await page.waitForTimeout(500);
});

/**
 * [5-1-8] ステータスフィルターで指定ステータスを選択する
 * MethodTaskSelectionModal.tsx: data-testid="method-task-selection-status-filter"
 * 参照: ui_method_task_selection_modal.md §7.2
 */
When('ステータスフィルターで {string} を選択する', async ({ page }, statusLabel: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // MethodTaskSelectionModal.tsx: data-testid="method-task-selection-status-filter"
  const statusFilter = page.locator('[data-testid="method-task-selection-status-filter"]');
  await statusFilter.waitFor({ state: 'visible', timeout: 10000 });
  await statusFilter.click();
  await waitForSelectDropdown(page);
  // ステータスラベルで選択肢をクリック
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option:has-text("${statusLabel}")`).click();
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * [5-1-1] プロジェクト選択コンボボックスが表示されていること
 * ExperimentWorkerMenu.tsx: data-testid="project-select"
 */
Then('プロジェクト選択コンボボックスが表示されていること', async ({ page }) => {
  const projectSelect = page.locator('[data-testid="project-select"]');
  await expect(projectSelect).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-1] 指定プロジェクトがコンボボックスの選択肢に表示されていること
 */
Then('プロジェクト {string} が選択肢に表示されていること', async ({ page }, projectName: string) => {
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await expect(
    visibleDropdown.locator(`.ant-select-item-option:has-text("${projectName}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-2] プロジェクト選択モーダルが表示されること
 * ProjectSelectionModal.tsx のタイトル文言: "プロジェクト選択"（ui_project_selection_modal.md 確認済み）
 */
Then('プロジェクト選択モーダルが表示されること', async ({ page }) => {
  // ProjectSelectionModal.tsx: モーダルタイトル "プロジェクト選択"
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクトを選択' });
  await expect(modal).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-3] メソッド選択コンボボックスがリセットされていること（未選択状態）
 * MethodTaskSelector.tsx: data-testid="method-select"、placeholder="メソッドを選択してください"
 */
Then('メソッド選択コンボボックスがリセットされていること', async ({ page }) => {
  // MethodTaskSelector.tsx: data-testid="method-select"
  const methodSelect = page.locator('[data-testid="method-select"]');
  await expect(methodSelect.locator('.ant-select-selection-placeholder')).toBeVisible({ timeout: 5000 });
});

/**
 * [5-1-3] タスク選択コンボボックスがリセットされていること（未選択状態）
 * MethodTaskSelector.tsx: data-testid="task-select"、placeholder="タスクを選択してください"
 */
Then('タスク選択コンボボックスがリセットされていること', async ({ page }) => {
  // MethodTaskSelector.tsx: data-testid="task-select"
  const taskSelect = page.locator('[data-testid="task-select"]');
  await expect(taskSelect.locator('.ant-select-selection-placeholder')).toBeVisible({ timeout: 5000 });
});

/**
 * [5-1-4] メソッド・タスク選択モーダルが表示されること
 */
Then('メソッド・タスク選択モーダルが表示されること', async ({ page }) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await expect(modal).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-4] メソッドタブが表示されていること
 */
Then('メソッドタブが表示されていること', async ({ page }) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await expect(modal.locator('.ant-tabs-tab')).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-4] 指定メソッドのタスク一覧が表示されること
 */
Then('{string} のタスク一覧が表示されること', async ({ page }, methodName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  // アクティブなタブが指定メソッド名であること
  await expect(
    modal.locator('.ant-tabs-tab-active:has-text("' + methodName + '")')
  ).toBeVisible({ timeout: 10000 });
  // タスク一覧のコンテンツが表示されていること（テーブルまたはリスト）
  await expect(
    modal.locator('table tbody tr, .task-list-item').first()
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-4] メソッド・タスク選択モーダルが閉じること
 */
Then('メソッド・タスク選択モーダルが閉じること', async ({ page }) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await expect(modal).not.toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-4] メソッド選択コンボボックスに指定メソッド名が表示されていること
 * MethodTaskSelector.tsx: data-testid="method-select"
 */
Then('メソッド選択コンボボックスに {string} が表示されていること', async ({ page }, methodName: string) => {
  const methodSelect = page.locator('[data-testid="method-select"]');
  await expect(methodSelect.locator('.ant-select-selection-item')).toHaveText(methodName, { timeout: 10000 });
});

/**
 * [5-1-4] タスク選択コンボボックスに指定タスク名が表示されていること
 * MethodTaskSelector.tsx: data-testid="task-select"
 */
Then('タスク選択コンボボックスに {string} が表示されていること', async ({ page }, taskName: string) => {
  const taskSelect = page.locator('[data-testid="task-select"]');
  await expect(taskSelect.locator('.ant-select-selection-item')).toHaveText(taskName, { timeout: 10000 });
});

/**
 * [5-1-5] タスク一覧に指定タスク名が表示されていること
 */
Then('タスク一覧に {string} が表示されていること', async ({ page }, taskName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await expect(
    modal.locator(`tr:has-text("${taskName}"), li:has-text("${taskName}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-5] タスク一覧に指定タスク名が表示されていないこと（フィルタで非表示）
 */
Then('タスク一覧に {string} が表示されていないこと', async ({ page }, taskName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await expect(
    modal.locator(`tr:has-text("${taskName}"), li:has-text("${taskName}")`)
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * [5-1-6, 5-1-7] プロジェクト一覧に指定プロジェクト名が表示されていること
 * ProjectSelectionModal.tsx のテーブル行（プロジェクト名列）に対して確認する
 * 参照: ui_project_selection_modal.md §5.3
 */
Then('プロジェクト一覧に {string} が表示されていること', async ({ page }, projectName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクト選択' });
  await expect(
    modal.locator(`table tbody tr:has-text("${projectName}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-1-6, 5-1-7] プロジェクト一覧に指定プロジェクト名が表示されていないこと（フィルタで非表示）
 * ProjectSelectionModal.tsx のテーブル行（プロジェクト名列）に対して確認する
 * 参照: ui_project_selection_modal.md §6.3（AND条件フィルタリング）
 */
Then('プロジェクト一覧に {string} が表示されていないこと', async ({ page }, projectName: string) => {
  const modal = page.locator('.ant-modal').filter({ hasText: 'プロジェクト選択' });
  await expect(
    modal.locator(`table tbody tr:has-text("${projectName}")`)
  ).not.toBeVisible({ timeout: 5000 });
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
 * @param projectId - プロジェクトID（project テーブルの project_id）
 * @param projectName - プロジェクト名（project テーブルの project_name）
 *
 * DDL参照: docs/design/db/ddl/project.sql
 * project_status の数値: 2 = executing_task（テストシナリオ §3.3 より確認済み）
 */
async function upsertTestProject(projectId: string, projectName: string): Promise<void> {
  console.log(`[5-1 upsertTestProject] 開始: project_id=${projectId}, project_name=${projectName}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // 既存の場合は project_name と project_status を更新
      await db.query(
        `UPDATE project
         SET project_name = $1, project_status = $2, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4`,
        [projectName, PROJECT_STATUS_EXECUTING_TASK, ORG_ID, projectId]
      );
      console.log(`[5-1 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
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
        [ORG_ID, projectId, projectName, PROJECT_STATUS_EXECUTING_TASK]
      );
      createdProjectIds.push(projectId);
      console.log(`[5-1 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[5-1 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 *
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @param experimentOrder - 実験順序（タスクNO）
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<void> {
  console.log(`[5-1 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existing.rowCount ?? 0) === 0) {
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
      console.log(`[5-1 upsertTestProjectTask] INSERT 完了: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}`);
    } else {
      console.log(`[5-1 upsertTestProjectTask] スキップ（既存レコードあり）: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}`);
    }
  } catch (error) {
    console.error(`[5-1 upsertTestProjectTask] 失敗: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}:`, error);
    throw error;
  }
}
