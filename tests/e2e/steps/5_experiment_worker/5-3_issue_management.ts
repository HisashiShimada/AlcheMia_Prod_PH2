/**
 * ステップ定義: [5-3] 問題報告・ステータス変更
 *
 * 対応 feature: tests/e2e/features/5_experiment_worker/5-3_issue_management.feature
 *
 * テスト実行情報:
 *   URL       : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   worker    : worker@example.com / worker123
 *   manager   : manager@example.com / manager123
 *
 * 前提条件（テストデータ）:
 *   - project テーブルに E2Eテスト用プロジェクト_5-3（project_status: 2 = executing_task）が存在すること
 *   - project_task テーブルに上記プロジェクトのメソッド・タスクが存在すること
 *   - transition_set テーブルに上記タスクのトランジションが存在すること
 *   - issue テーブルに各シナリオ用の前提問題データが存在すること
 *
 * DDL参照:
 *   - docs/design/db/ddl/project.sql
 *   - docs/design/db/ddl/project_task.sql
 *   - issue テーブルは backend/migrations 参照
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

/** テスト用プロジェクト */
const TEST_PROJECT_ID = 'E2E-5-3';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_5-3';

/** テスト用メソッドID */
const TEST_METHOD_ID = 'E2E_METHOD_5-3';

/** テスト用タスク実験順序 */
const TEST_EXPERIMENT_ORDER = 1;

/**
 * project_status の数値定義
 * 2 = executing_task（タスク実行中）
 */
const PROJECT_STATUS_EXECUTING_TASK = 2;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した issue_id のリスト（After で削除） */
const createdIssueIds: string[] = [];

/** テスト中に作成した project_id のリスト（After で削除） */
const createdProjectIds: string[] = [];

/** テスト中に作成した project_task の主キーリスト（After で削除） */
const createdProjectTaskKeys: Array<{
  organization_id: string;
  project_id: string;
  method_id: string;
  experiment_order: number;
}> = [];

/** 前提問題データの issue_id リスト（After で削除対象） */
const setupIssueIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 5-3-1, 5-3-2, 5-3-4 用
 * - テスト用プロジェクト・タスク・トランジションを準備
 * - 前提問題データは不要（新規報告のみ確認）
 */
Before({ tags: '@5-3-1 or @5-3-2 or @5-3-4' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-1 or @5-3-2 or @5-3-4)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-1 or @5-3-2 or @5-3-4)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-3 用
 * - テスト用プロジェクト・タスク・トランジションを準備
 * - コメント投稿テスト用の既存問題データを準備
 */
Before({ tags: '@5-3-3' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-3)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // 既存問題データを作成（コメント投稿テスト用）
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト既存問題_5-3-3',
      '5-3-3 コメント投稿テスト用の問題内容です',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-3)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-5 用
 * - 未解決問題と解決済問題の両方を準備（ステータスフィルタ確認用）
 */
Before({ tags: '@5-3-5' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-5)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // 未解決問題
    const unresolvedId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト未解決問題_5-3-5',
      '5-3-5 未解決フィルタ確認用の問題内容です',
      'unresolved'
    );
    if (unresolvedId) setupIssueIds.push(unresolvedId);
    // 解決済問題
    const resolvedId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト解決済問題_5-3-5',
      '5-3-5 解決済フィルタ確認用の問題内容です',
      'resolved'
    );
    if (resolvedId) setupIssueIds.push(resolvedId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-5)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-6 用
 * - ステータス変更テスト用の未解決問題を準備（Manager でステータス変更）
 */
Before({ tags: '@5-3-6' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-6)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // 未解決問題（解決済に変更するテスト用）
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト未解決問題_5-3-6',
      '5-3-6 解決済に変更するテスト用の問題内容です',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-6)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-8, 5-3-9, 5-3-10, 5-3-11, 5-3-12 用
 * - バリデーションチェックのみのテスト（前提問題データ不要）
 * - プロジェクト・タスク・トランジションのみ準備
 */
Before({ tags: '@5-3-8 or @5-3-9 or @5-3-10 or @5-3-11 or @5-3-12' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-8〜@5-3-12)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-8〜@5-3-12)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-13 用
 * - 問題詳細表示確認テスト用の問題データを準備
 */
Before({ tags: '@5-3-13' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-13)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // 問題詳細表示確認用の問題データを作成
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト問題_5-3-13',
      '5-3-13 問題詳細表示確認用の問題内容です。詳細な内容を確認するためのテストデータです。',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-13)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-14 用
 * - コメント一覧表示確認テスト用の問題データ（コメントつき）を準備
 */
Before({ tags: '@5-3-14' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-14)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // コメントつきの問題データを作成
    const issueId = await insertTestIssueWithComment(
      TEST_PROJECT_ID,
      'E2Eテスト問題_5-3-14',
      '5-3-14 コメント一覧表示確認用の問題内容です。詳細な内容を確認するためのテストデータです。',
      'unresolved',
      'E2Eテスト用コメント_5-3-14'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-14)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-3-7 用
 * - ステータス変更テスト用の解決済問題を準備（Manager でステータス変更）
 */
Before({ tags: '@5-3-7' }, async () => {
  console.log('[5-3 Before] テストデータ準備 開始 (tags: @5-3-7)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    await upsertTestTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER);
    // 解決済問題（未解決に戻すテスト用）
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト解決済問題_5-3-7',
      '5-3-7 未解決に戻すテスト用の問題内容です',
      'resolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[5-3 Before] テストデータ準備 完了 (tags: @5-3-7)');
  } catch (error) {
    console.error('[5-3 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[5-3 After] クリーンアップ 開始');
  try {
    // テスト中に作成した issue を削除（コメントも cascade 削除）
    for (const issueId of createdIssueIds) {
      try {
        await db.query(
          `DELETE FROM issue WHERE issue_id = $1`,
          [issueId]
        );
        console.log(`[5-3 After] issue 削除 完了: issue_id=${issueId}`);
      } catch (error) {
        console.error(`[5-3 After] issue 削除 失敗: issue_id=${issueId}:`, error);
      }
    }
    createdIssueIds.length = 0;

    // Before で作成した前提 issue を削除
    for (const issueId of setupIssueIds) {
      try {
        await db.query(
          `DELETE FROM issue WHERE issue_id = $1`,
          [issueId]
        );
        console.log(`[5-3 After] setup issue 削除 完了: issue_id=${issueId}`);
      } catch (error) {
        console.error(`[5-3 After] setup issue 削除 失敗: issue_id=${issueId}:`, error);
      }
    }
    setupIssueIds.length = 0;

    // transition_set を削除
    try {
      await db.query(
        `DELETE FROM transition_set
         WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
        [ORG_ID, TEST_PROJECT_ID, TEST_METHOD_ID, TEST_EXPERIMENT_ORDER]
      );
      console.log('[5-3 After] transition_set 削除 完了');
    } catch (error) {
      console.error('[5-3 After] transition_set 削除 失敗:', error);
    }

    // project_task を削除
    for (const key of createdProjectTaskKeys) {
      try {
        await db.query(
          `DELETE FROM project_task
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        );
        console.log(`[5-3 After] project_task 削除 完了: project_id=${key.project_id}`);
      } catch (error) {
        console.error(`[5-3 After] project_task 削除 失敗:`, error);
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
        console.log(`[5-3 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[5-3 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[5-3 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[5-3 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// When: ログイン
// ---------------------------------------------------------------------------

/**
 * Manager（experiment_admin）ユーザーでログインする（5-3-6, 5-3-7 用）
 * TODO: ユーザーID・パスワードは仮値。実際の Manager ユーザーに要更新。
 */
When('Managerユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  // TODO: 実際の Manager（experiment_admin）ユーザーIDとパスワードに更新すること
  await page.fill('#userId', 'manager@example.com');
  await page.fill('#password', 'manager123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

// ---------------------------------------------------------------------------
// When: トランジション一覧操作
// ---------------------------------------------------------------------------

/**
 * トランジション一覧の最初の「報告」ボタンをクリックして問題管理モーダルを開く
 * TransitionList.tsx: data-testid="transition-issue-report-button"
 */
When('トランジション一覧の最初の「報告」ボタンをクリックする', async ({ page }) => {
  // トランジション一覧が表示されるまで待機
  await page.waitForSelector('[data-testid="transition-list-table"]', { timeout: 15000 });
  // 最初の「報告」ボタンをクリック
  const issueBtn = page.locator('[data-testid="transition-issue-report-button"]').first();
  await issueBtn.waitFor({ state: 'visible', timeout: 10000 });
  await issueBtn.click();
  // モーダルが表示されるまで待機
  await page.waitForSelector('[data-testid="issue-management-modal"]', { timeout: 10000 });
});

// ---------------------------------------------------------------------------
// When: 問題管理モーダル操作
// ---------------------------------------------------------------------------

/**
 * 「新規問題報告」ボタンをクリックして新規報告フォームを表示する
 * IssueManagementModal.tsx: data-testid="issue-management-new-issue-button"
 */
When('「新規問題報告」ボタンをクリックする', async ({ page }) => {
  const newIssueBtn = page.locator('[data-testid="issue-management-new-issue-button"]');
  await newIssueBtn.waitFor({ state: 'visible', timeout: 10000 });
  await newIssueBtn.click();
  // 新規報告フォームが表示されるまで待機
  await page.waitForSelector('[data-testid="issue-management-new-issue-form"]', { timeout: 10000 });
});

/**
 * 問題タイトルを入力する
 * IssueManagementModal.tsx: data-testid="issue-management-title-input"
 */
When('問題タイトルに {string} と入力する', async ({ page }, title: string) => {
  const titleInput = page.locator('[data-testid="issue-management-title-input"]');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  // React 制御コンポーネントへの入力
  await page.evaluate(
    ({ selector, val }: { selector: string; val: string }) => {
      /* eslint-disable no-undef */
      const el = (document as Document).querySelector(selector) as HTMLInputElement | null;
      if (!el) return;
      const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeInputValueSetter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    { selector: '[data-testid="issue-management-title-input"]', val: title }
  );
});

/**
 * 問題タイプを選択する（コードマスターから取得される最初の選択肢を選ぶ）
 * IssueManagementModal.tsx: data-testid="issue-management-issue-type-select"
 */
When('問題タイプを選択する', async ({ page }) => {
  const issueTypeSelect = page.locator('[data-testid="issue-management-issue-type-select"]');
  await issueTypeSelect.waitFor({ state: 'visible', timeout: 10000 });
  await issueTypeSelect.click();
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
  // 最初のオプションを選択
  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown.locator('.ant-select-item-option').first().click();
});

/**
 * 問題内容を入力する
 * IssueManagementModal.tsx: data-testid="issue-management-content-textarea"
 */
When('問題内容に {string} と入力する', async ({ page }, content: string) => {
  const contentTextarea = page.locator('[data-testid="issue-management-content-textarea"]');
  await contentTextarea.waitFor({ state: 'visible', timeout: 10000 });
  await contentTextarea.click();
  await contentTextarea.fill(content);
});

/**
 * 問題報告フォームの「保存」ボタンをクリックする
 * IssueManagementModal.tsx: data-testid="issue-management-form-save-button"
 */
When('問題報告フォームの「保存」ボタンをクリックする', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="issue-management-form-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/issues') &&
          resp.request().method() === 'POST',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: 10000 })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
  await saveBtn.click();
});

/**
 * タイトルを入力せずに問題報告フォームの「保存」ボタンをクリックする
 */
When('タイトルを入力せずに問題報告フォームの「保存」ボタンをクリックする', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="issue-management-form-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await saveBtn.click();
  // フロントバリデーションエラーが表示されるまで待機
  await page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 });
});

/**
 * 問題一覧の指定タイトルの問題行をクリックして選択する
 * TransitionList → IssueManagementModal のテーブル行クリック
 */
When('問題一覧の {string} をクリックして選択する', async ({ page }, issueTitle: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // 問題一覧テーブル内で指定タイトルの行をクリック
  const issueRow = modal.locator(`table tr:has-text("${issueTitle}")`).first();
  await issueRow.waitFor({ state: 'visible', timeout: 10000 });
  await issueRow.click();
  // 問題詳細が右側に表示されるまで待機（タイトルヘッダーが表示される）
  await page.waitForTimeout(500);
});

/**
 * コメント入力欄にコメントを入力する
 * IssueManagementModal.tsx: data-testid="issue-management-comment-textarea"
 */
When('コメント入力欄に {string} と入力する', async ({ page }, comment: string) => {
  const commentTextarea = page.locator('[data-testid="issue-management-comment-textarea"]');
  await commentTextarea.waitFor({ state: 'visible', timeout: 10000 });
  await commentTextarea.click();
  await commentTextarea.fill(comment);
});

/**
 * 「コメント送信」ボタンをクリックする
 * IssueManagementModal.tsx: data-testid="issue-management-comment-submit-button"
 */
When('「コメント送信」ボタンをクリックする', async ({ page }) => {
  const commentBtn = page.locator('[data-testid="issue-management-comment-submit-button"]');
  await commentBtn.waitFor({ state: 'visible', timeout: 10000 });
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/issues') &&
          resp.url().includes('/comments') &&
          resp.request().method() === 'POST',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
  await commentBtn.click();
});

/**
 * ステータスフィルターで指定ステータスを選択する
 * IssueManagementModal.tsx: data-testid="issue-management-status-filter"
 */
When('ステータスフィルターで {string} を選択する', async ({ page }, statusLabel: string) => {
  const statusFilter = page.locator('[data-testid="issue-management-status-filter"]');
  await statusFilter.waitFor({ state: 'visible', timeout: 10000 });
  await statusFilter.click();
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
  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${statusLabel}"]`).click();
  // フィルタリング結果が反映されるまで待機
  await page.waitForTimeout(300);
});

/**
 * 「解決」ボタンをクリックしてステータスを解決済に変更する
 * IssueManagementModal.tsx: data-testid="issue-management-set-resolved-button"
 */
When('「解決」ボタンをクリックする', async ({ page }) => {
  const resolveBtn = page.locator('[data-testid="issue-management-set-resolved-button"]');
  await resolveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/issues') &&
          resp.url().includes('/status') &&
          resp.request().method() === 'PATCH',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
  await resolveBtn.click();
});

/**
 * [5-3-8] 内容を入力せずに問題報告フォームの「保存」ボタンをクリックする
 */
When('内容を入力せずに問題報告フォームの「保存」ボタンをクリックする', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="issue-management-form-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await saveBtn.click();
  // フロントバリデーションエラーが表示されるまで待機
  await page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 });
});

/**
 * [5-3-9] 問題タイプを選択せずに問題報告フォームの「保存」ボタンをクリックする
 */
When('問題タイプを選択せずに問題報告フォームの「保存」ボタンをクリックする', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="issue-management-form-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await saveBtn.click();
  // フロントバリデーションエラーが表示されるまで待機
  await page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 });
});

/**
 * [5-3-11] 問題タイトルに101文字のタイトルを入力する（最大100文字超）
 */
When('問題タイトルに101文字のタイトルを入力する', async ({ page }) => {
  // 101文字の文字列を生成（100文字を超えた場合のバリデーション確認用）
  const longTitle = 'あ'.repeat(101);
  const titleInput = page.locator('[data-testid="issue-management-title-input"]');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(
    ({ selector, val }: { selector: string; val: string }) => {
      /* eslint-disable no-undef */
      const el = (document as Document).querySelector(selector) as HTMLInputElement | null;
      if (!el) return;
      const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeInputValueSetter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    { selector: '[data-testid="issue-management-title-input"]', val: longTitle }
  );
});

/**
 * [5-3-12] 問題内容に1001文字の内容を入力する（最大1000文字超）
 */
When('問題内容に1001文字の内容を入力する', async ({ page }) => {
  // 1001文字の文字列を生成
  const longContent = 'あ'.repeat(1001);
  const contentTextarea = page.locator('[data-testid="issue-management-content-textarea"]');
  await contentTextarea.waitFor({ state: 'visible', timeout: 10000 });
  await contentTextarea.click();
  await contentTextarea.fill(longContent);
});

/**
 * 「未解決」ボタンをクリックしてステータスを未解決に変更する
 * IssueManagementModal.tsx: data-testid="issue-management-set-unresolved-button"
 */
When('「未解決」ボタンをクリックする', async ({ page }) => {
  const unresolvedBtn = page.locator('[data-testid="issue-management-set-unresolved-button"]');
  await unresolvedBtn.waitFor({ state: 'visible', timeout: 10000 });
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/issues') &&
          resp.url().includes('/status') &&
          resp.request().method() === 'PATCH',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
      .catch(() => {}),
  ]);
  await unresolvedBtn.click();
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * [5-3-1] トランジション一覧が表示されていること
 * TransitionList.tsx: data-testid="transition-list-table"
 */
Then('トランジション一覧が表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-1] 問題管理モーダルが表示されること
 * IssueManagementModal.tsx: data-testid="issue-management-modal"
 */
Then('問題管理モーダルが表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-management-modal"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-1] 問題一覧カードが表示されていること
 * IssueManagementModal.tsx 内の「問題一覧」カードタイトル
 */
Then('問題一覧カードが表示されていること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('.ant-card-head-title:has-text("問題一覧")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-2] 問題報告成功メッセージが表示されること
 */
Then('問題報告成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper:has-text("問題を報告しました")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-2] 問題一覧に指定タイトルが表示されていること
 */
Then('問題一覧に {string} が表示されていること', async ({ page }, issueTitle: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`table td:has-text("${issueTitle}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-3] コメント送信成功メッセージが表示されること
 */
Then('コメント送信成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper:has-text("コメントを送信しました")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-4] タイトルのバリデーションエラーメッセージが表示されること
 */
Then('タイトルのバリデーションエラー {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [5-3-5] 問題一覧に指定タイトルが表示されていないこと（フィルタで非表示）
 */
Then('問題一覧に {string} が表示されていないこと', async ({ page }, issueTitle: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`table td:has-text("${issueTitle}")`)
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * [5-3-6, 5-3-7] 問題の現在のステータスが指定のステータスであることを確認する
 * 問題選択後に右側の詳細カードに表示されるステータスタグを確認
 */
Then('問題の現在のステータスが {string} であること', async ({ page }, statusLabel: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  // 右側の問題詳細カード内のステータスタグを確認
  await expect(
    modal.locator(`.ant-tag:has-text("${statusLabel}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-6] ステータス変更成功メッセージが表示されること
 */
Then('ステータス変更成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper').filter({
      hasText: /ステータスを「.+」に変更しました/,
    })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-6] 問題のステータスが「解決済」に変更されていること
 * ステータス変更後のテーブル行タグで確認
 */
Then('問題のステータスが {string} に変更されていること', async ({ page }, statusLabel: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  // 右側詳細カードのステータスタグを確認（fetchIssues 後に更新される）
  await expect(
    modal.locator(`.ant-tag:has-text("${statusLabel}")`)
  ).toBeVisible({ timeout: 15000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(projectId: string, projectName: string): Promise<void> {
  console.log(`[5-3 upsertTestProject] 開始: project_id=${projectId}`);
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
        [projectName, PROJECT_STATUS_EXECUTING_TASK, ORG_ID, projectId]
      );
      console.log(`[5-3 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
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
        [ORG_ID, projectId, projectName, PROJECT_STATUS_EXECUTING_TASK]
      );
      createdProjectIds.push(projectId);
      console.log(`[5-3 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[5-3 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<void> {
  console.log(`[5-3 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}`);
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
      console.log(`[5-3 upsertTestProjectTask] INSERT 完了`);
    } else {
      console.log(`[5-3 upsertTestProjectTask] スキップ（既存レコードあり）`);
    }
  } catch (error) {
    console.error(`[5-3 upsertTestProjectTask] 失敗:`, error);
    throw error;
  }
}

/**
 * テスト用トランジションセットを UPSERT する
 * transition_set テーブル（backend/migrations/20260226_create_transition_set_table.sql 参照）
 * NOTE: transition_set テーブルのカラム構成は migration ファイルを参照すること
 */
async function upsertTestTransitionSet(
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<void> {
  console.log(`[5-3 upsertTestTransitionSet] 開始: project_id=${projectId}`);
  try {
    // transition_set テーブルの存在確認
    const existing = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM transition_set
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if (parseInt(existing.rows[0]?.count ?? '0', 10) === 0) {
      // transition_set に最低1件のトランジションを挿入する
      // NOTE: transition_id は UUID 形式が必要（実際のスキーマに従う）
      await db.query(
        `INSERT INTO transition_set (
          organization_id, project_id, method_id, task_no,
          transition_id, transition_name, status, progress_rate,
          create_at, update_at
        ) VALUES (
          $1, $2, $3, $4,
          gen_random_uuid(), 'E2Eテスト用トランジション_5-3', 0, 0,
          NOW(), NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[5-3 upsertTestTransitionSet] INSERT 完了`);
    } else {
      console.log(`[5-3 upsertTestTransitionSet] スキップ（既存レコードあり）`);
    }
  } catch (error) {
    // transition_set への直接 INSERT が失敗した場合はログを残して続行
    // （MAIML から自動生成されるケースのため、手動 INSERT が不可能な構成の場合あり）
    console.warn(`[5-3 upsertTestTransitionSet] 警告: transition_set への INSERT に失敗しました。
      テストデータが既に存在する場合はそのまま続行します。エラー: ${error}`);
  }
}

/**
 * テスト用問題データを INSERT する
 * @returns 作成された issue_id（失敗時は null）
 *
 * NOTE: issue テーブルのカラム構成は backend/migrations/20260204_create_issue_comments_table.sql
 *       および関連マイグレーションファイルを参照すること
 */
async function insertTestIssue(
  projectId: string,
  title: string,
  content: string,
  status: 'unresolved' | 'resolved'
): Promise<string | null> {
  console.log(`[5-3 insertTestIssue] 開始: title=${title}, status=${status}`);
  try {
    // 同名の問題が既に存在する場合は先に削除してから INSERT
    await db.query(
      `DELETE FROM issue WHERE organization_id = $1 AND project_id = $2 AND title = $3`,
      [ORG_ID, projectId, title]
    );

    const result = await db.query<{ issue_id: string }>(
      `INSERT INTO issue (
        issue_id, organization_id, project_id,
        title, content, status,
        target_type, issue_type,
        reported_by, reported_at,
        create_at, update_at
      ) VALUES (
        gen_random_uuid(), $1, $2,
        $3, $4, $5,
        'transition', 'other',
        'e2e-test', NOW(),
        NOW(), NOW()
      )
      RETURNING issue_id`,
      [ORG_ID, projectId, title, content, status]
    );

    const issueId = result.rows[0]?.issue_id ?? null;
    if (issueId) {
      console.log(`[5-3 insertTestIssue] INSERT 完了: issue_id=${issueId}, title=${title}`);
    }
    return issueId;
  } catch (error) {
    console.error(`[5-3 insertTestIssue] 失敗: title=${title}:`, error);
    return null;
  }
}

/**
 * テスト用問題データ（コメントつき）を INSERT する（5-3-14 用）
 * @returns 作成された issue_id（失敗時は null）
 */
async function insertTestIssueWithComment(
  projectId: string,
  title: string,
  content: string,
  status: 'unresolved' | 'resolved',
  commentContent: string
): Promise<string | null> {
  console.log(`[5-3 insertTestIssueWithComment] 開始: title=${title}`);
  try {
    // 同名の問題が既に存在する場合は先に削除してから INSERT
    await db.query(
      `DELETE FROM issue WHERE organization_id = $1 AND project_id = $2 AND title = $3`,
      [ORG_ID, projectId, title]
    );

    const issueResult = await db.query<{ issue_id: string }>(
      `INSERT INTO issue (
        issue_id, organization_id, project_id,
        title, content, status,
        target_type, issue_type,
        reported_by, reported_at,
        create_at, update_at
      ) VALUES (
        gen_random_uuid(), $1, $2,
        $3, $4, $5,
        'transition', 'other',
        'e2e-test', NOW(),
        NOW(), NOW()
      )
      RETURNING issue_id`,
      [ORG_ID, projectId, title, content, status]
    );

    const issueId = issueResult.rows[0]?.issue_id ?? null;
    if (!issueId) {
      console.error(`[5-3 insertTestIssueWithComment] issue INSERT 失敗: title=${title}`);
      return null;
    }

    // コメントを INSERT する
    await db.query(
      `INSERT INTO issue_comment (
        comment_id, issue_id, organization_id,
        content, commented_by, commented_at,
        create_at, update_at
      ) VALUES (
        gen_random_uuid(), $1, $2,
        $3, 'e2e-test', NOW(),
        NOW(), NOW()
      )`,
      [issueId, ORG_ID, commentContent]
    );

    console.log(`[5-3 insertTestIssueWithComment] INSERT 完了: issue_id=${issueId}, title=${title}`);
    return issueId;
  } catch (error) {
    console.error(`[5-3 insertTestIssueWithComment] 失敗: title=${title}:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Then: バリデーションエラー確認（5-3-8〜5-3-12）
// ---------------------------------------------------------------------------

/**
 * [5-3-8] 内容のバリデーションエラーメッセージが表示されること
 */
Then('内容のバリデーションエラー {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [5-3-9] 問題タイプのバリデーションエラーメッセージが表示されること
 */
Then('問題タイプのバリデーションエラー {string} が表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

/**
 * [5-3-12] 内容のバリデーションエラーが表示されること（メッセージ内容は問わない）
 */
Then('内容のバリデーションエラーが表示されること', async ({ page }) => {
  // 内容フィールドに紐づく ant-form-item-explain-error が1件以上表示されることを確認
  await expect(
    page.locator('.ant-form-item-explain-error').first()
  ).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Then: 問題詳細表示確認（5-3-13）
// ---------------------------------------------------------------------------

/**
 * [5-3-13] 問題詳細エリアに指定タイトルが表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-title"
 */
Then('問題詳細エリアにタイトル {string} が表示されること', async ({ page }, title: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`[data-testid="issue-detail-title"]:has-text("${title}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-13] 問題詳細エリアにステータスタグが表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-status"
 */
Then('問題詳細エリアにステータスタグが表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-status"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-13] 問題詳細エリアに対象が表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-target"
 */
Then('問題詳細エリアに対象が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-target"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-13] 問題詳細エリアに報告者が表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-reporter"
 */
Then('問題詳細エリアに報告者が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-reporter"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-13] 問題詳細エリアに報告時刻が表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-reported-at"
 */
Then('問題詳細エリアに報告時刻が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-reported-at"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-13] 問題詳細エリアに内容が表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-content"
 */
Then('問題詳細エリアに内容が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-content"]')
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Then: コメント一覧表示確認（5-3-14）
// ---------------------------------------------------------------------------

/**
 * [5-3-14] 問題詳細エリアにコメント一覧が表示されること
 * IssueManagementModal.tsx: data-testid="issue-detail-comment-list"
 */
Then('問題詳細エリアにコメント一覧が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-detail-comment-list"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-14] コメント一覧に指定コメント内容が表示されること
 */
Then('コメント一覧にコメント内容 {string} が表示されること', async ({ page }, commentContent: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`[data-testid="issue-detail-comment-list"] :has-text("${commentContent}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-14] コメント一覧に投稿者名が表示されること
 * IssueManagementModal.tsx: data-testid="issue-comment-author"
 */
Then('コメント一覧に投稿者名が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-comment-author"]').first()
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-3-14] コメント一覧に投稿時刻が表示されること
 * IssueManagementModal.tsx: data-testid="issue-comment-date"
 */
Then('コメント一覧に投稿時刻が表示されること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('[data-testid="issue-comment-date"]').first()
  ).toBeVisible({ timeout: 10000 });
});
