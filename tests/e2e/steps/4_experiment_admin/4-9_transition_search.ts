/**
 * ステップ定義: [4-9] トランジション検索
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-9_transition_search.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project / project_task / transition_set テーブルを UPSERT して準備する
 *   - 各ステータス（完了/作業中/未着手）のトランジションが少なくとも1件ずつ存在すること
 *
 * data-testid 一覧（ProgressMonitoring.tsx）:
 *   - [transition-search-tab]              : トランジション検索タブ
 *     ※ 未実装のため、フロントエンド実装時に data-testid を付与すること
 *
 * data-testid 一覧（TransitionSearch コンポーネント）:
 *   ※ TransitionSearch コンポーネントは現在未実装。
 *   ※ フロントエンド実装時に以下の data-testid を付与すること。
 *   - [transition-search-project-input]    : プロジェクト名検索入力
 *   - [transition-search-transition-input] : トランジション名検索入力
 *   - [transition-search-status-filter]    : ステータスフィルタ Select
 *   - [transition-search-button]           : 検索ボタン
 *   - [transition-search-reset-button]     : リセットボタン
 *   - [transition-search-results]          : 検索結果テーブル
 *   - [transition-search-no-results]       : 0件メッセージ
 *   - [transition-search-semantic-input]   : セマンティック検索入力
 *   - [transition-search-semantic-button]  : セマンティック検索ボタン
 *   - [transition-search-result-row]       : 検索結果行（クリック可能）
 *
 * data-testid 一覧（WorkProgressDetailDialog.tsx）:
 *   - [progress-detail-dialog]             : 詳細ダイアログ（4-6 から流用）
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
 * 2 = in_progress（タスク実行中）
 */
const PROJECT_STATUS_IN_PROGRESS = 2;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 1 = checked_out（チェックアウト中）
 */
const CHECKOUT_STATUS_CHECKED_OUT = 1;

/**
 * テスト用プロジェクト/トランジションのID・名称定数
 */
const TEST_PROJECT_ID = 'E2E-4-9';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-9';
const TEST_METHOD_ID = 'method_001';

const TRANSITION_COMPLETED = 'E2Eテスト用トランジション_完了';
const TRANSITION_IN_PROGRESS = 'E2Eテスト用トランジション_作業中';
const TRANSITION_NOT_STARTED = 'E2Eテスト用トランジション_未着手';

/** transition_set の progress_status 定義（日本語） */
const PROGRESS_STATUS_COMPLETED = '完了';
const PROGRESS_STATUS_IN_PROGRESS = '作業中';
const PROGRESS_STATUS_NOT_STARTED = '未着手';

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-9-1〜4-9-9] 共通テストデータ準備
 * - project を1件 UPSERT（in_progress / checked_out）
 * - project_task を1件 UPSERT（method_001 / order=1 / in_progress）
 * - transition_set を3件 UPSERT（完了 / 作業中 / 未着手）
 */
Before({
  tags: '@4-9-1 or @4-9-2 or @4-9-3 or @4-9-4 or @4-9-5 or @4-9-6 or @4-9-7 or @4-9-8 or @4-9-9',
}, async () => {
  console.log('[4-9 Before] テストデータ準備 開始');
  try {
    // プロジェクトを UPSERT
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_IN_PROGRESS,
      CHECKOUT_STATUS_CHECKED_OUT,
      true
    );

    // プロジェクトタスクを UPSERT（experiment_order=1）
    await upsertProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, 1, 'in_progress');

    // 各ステータスのトランジションを UPSERT
    await upsertTransitionSet(
      TEST_PROJECT_ID,
      TEST_METHOD_ID,
      TRANSITION_COMPLETED,
      PROGRESS_STATUS_COMPLETED
    );
    await upsertTransitionSet(
      TEST_PROJECT_ID,
      TEST_METHOD_ID,
      TRANSITION_IN_PROGRESS,
      PROGRESS_STATUS_IN_PROGRESS
    );
    await upsertTransitionSet(
      TEST_PROJECT_ID,
      TEST_METHOD_ID,
      TRANSITION_NOT_STARTED,
      PROGRESS_STATUS_NOT_STARTED
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-9 Before] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-9 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-9 After] クリーンアップ 開始');
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
        console.log(`[4-9 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-9 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-9 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-9 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * 検索対象のトランジションデータがDBに存在する
 * → Before フックで準備済みのため no-op
 */
Given('検索対象のトランジションデータがDBに存在する', async ({}) => {
  console.log('[4-9 Given] トランジションデータは Before フックで準備済み');
});

/**
 * Ollamaエンベディングサービスが起動していること
 * → 手動テスト（4-9-10）の前提条件のため no-op
 * ※ 自動テスト対象外。手動テスト実施時は事前にサービスを起動すること。
 */
Given('Ollamaエンベディングサービスが起動していること', async ({}) => {
  console.log('[4-9 Given] Ollamaエンベディングサービスの起動確認は手動で実施');
});

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * トランジション検索タブをクリックする
 * ProgressMonitoring.tsx: data-testid="transition-search-tab"
 * ※ フロントエンド実装後に data-testid を確認すること
 */
When('トランジション検索タブをクリックする', async ({ page }) => {
  console.log('[4-9 When] トランジション検索タブをクリック');

  // data-testid="transition-search-tab" を優先し、
  // 見つからない場合はテキストで探す
  const tabByTestId = page.locator('[data-testid="transition-search-tab"]');
  const tabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'トランジション検索' });

  const tabLocator = (await tabByTestId.count()) > 0 ? tabByTestId : tabByText;
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 });

  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/transition-search') && resp.request().method() === 'GET',
    { timeout: 15000 }
  ).catch(() => {
    // タブ切り替え時に API が呼ばれない場合は続行
  });

  await tabLocator.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * プロジェクト名検索入力に値を入力する
 * TransitionSearch: data-testid="transition-search-project-input"
 */
When(
  'プロジェクト名検索入力に {string} を入力する',
  async ({ page }, keyword: string) => {
    console.log(`[4-9 When] プロジェクト名検索入力に "${keyword}" を入力`);

    const input = page.locator('[data-testid="transition-search-project-input"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(keyword);
    await page.waitForTimeout(300);
  }
);

/**
 * トランジション名検索入力に値を入力する
 * TransitionSearch: data-testid="transition-search-transition-input"
 */
When(
  'トランジション名検索入力に {string} を入力する',
  async ({ page }, keyword: string) => {
    console.log(`[4-9 When] トランジション名検索入力に "${keyword}" を入力`);

    const input = page.locator('[data-testid="transition-search-transition-input"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(keyword);
    await page.waitForTimeout(300);
  }
);

/**
 * トランジション名検索入力をクリアして新しい値を入力する
 * TransitionSearch: data-testid="transition-search-transition-input"
 */
When(
  'トランジション名検索入力をクリアして {string} を入力する',
  async ({ page }, keyword: string) => {
    console.log(`[4-9 When] トランジション名検索入力をクリアして "${keyword}" を入力`);

    const input = page.locator('[data-testid="transition-search-transition-input"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.clear();
    await input.fill(keyword);
    await page.waitForTimeout(300);
  }
);

/**
 * トランジション検索のステータスフィルタで指定ステータスを選択する
 * TransitionSearch: data-testid="transition-search-status-filter"
 * Ant Design Select コンポーネントの操作
 */
When(
  'トランジション検索のステータスフィルタで {string} を選択する',
  async ({ page }, statusLabel: string) => {
    console.log(`[4-9 When] ステータスフィルタで "${statusLabel}" を選択`);

    const statusFilter = page.locator('[data-testid="transition-search-status-filter"]');
    await statusFilter.waitFor({ state: 'visible', timeout: 10000 });
    await statusFilter.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
      { state: 'visible', timeout: 5000 }
    );

    // ラベルに一致するオプションを選択
    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${statusLabel}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // ドロップダウンが閉じるまで待機
    await page
      .waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {
        // 閉じない場合は続行
      });

    await page.waitForTimeout(300);
  }
);

/**
 * トランジション検索ボタンをクリックする
 * TransitionSearch: data-testid="transition-search-button"
 */
When('トランジション検索ボタンをクリックする', async ({ page }) => {
  console.log('[4-9 When] トランジション検索ボタンをクリック');

  const searchBtn = page.locator('[data-testid="transition-search-button"]');
  await searchBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/transition-search') && resp.request().method() === 'GET',
    { timeout: 15000 }
  ).catch(() => {
    // API レスポンスが来ない場合は続行
  });

  await searchBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * トランジション検索リセットボタンをクリックする
 * TransitionSearch: data-testid="transition-search-reset-button"
 */
When('トランジション検索リセットボタンをクリックする', async ({ page }) => {
  console.log('[4-9 When] トランジション検索リセットボタンをクリック');

  const resetBtn = page.locator('[data-testid="transition-search-reset-button"]');
  await resetBtn.waitFor({ state: 'visible', timeout: 10000 });

  // リセット後は全件検索 API が呼ばれることを期待
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/transition-search') && resp.request().method() === 'GET',
    { timeout: 15000 }
  ).catch(() => {
    // API レスポンスが来ない場合は続行
  });

  await resetBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * 検索結果一覧の最初の行をクリックする
 * TransitionSearch: data-testid="transition-search-result-row" の最初の要素
 */
When('検索結果一覧の最初の行をクリックする', async ({ page }) => {
  console.log('[4-9 When] 検索結果一覧の最初の行をクリック');

  // data-testid="transition-search-result-row" を優先し、
  // 見つからない場合は検索結果テーブルの最初の行をクリック
  const rowByTestId = page.locator('[data-testid="transition-search-result-row"]').first();
  const resultsTable = page.locator('[data-testid="transition-search-results"]');

  let rowLocator;
  if (await rowByTestId.count() > 0) {
    rowLocator = rowByTestId;
  } else {
    // テーブル内の最初のデータ行を選択（ヘッダー行を除く）
    rowLocator = resultsTable
      .locator('tr.ant-table-row, tbody tr')
      .first();
  }

  await rowLocator.waitFor({ state: 'visible', timeout: 10000 });

  // 詳細ダイアログ表示のための API レスポンスを待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/work-details') && resp.request().method() === 'GET',
    { timeout: 15000 }
  ).catch(() => {
    // API レスポンスが来ない場合はダイアログ表示を待機
  });

  await rowLocator.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * セマンティック検索入力に類似するテキストを入力する
 * TransitionSearch: data-testid="transition-search-semantic-input"
 * ※ 手動テスト（4-9-10）のステップ
 */
When('セマンティック検索入力に類似するテキストを入力する', async ({ page }) => {
  console.log('[4-9 When] セマンティック検索入力にテキストを入力（手動テスト）');

  const input = page.locator('[data-testid="transition-search-semantic-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  // 手動テスト時は実際のテキストを入力する
  await input.fill('化学反応に関する実験手順');
  await page.waitForTimeout(300);
});

/**
 * セマンティック検索ボタンをクリックする
 * TransitionSearch: data-testid="transition-search-semantic-button"
 * ※ 手動テスト（4-9-10）のステップ
 */
When('セマンティック検索ボタンをクリックする', async ({ page }) => {
  console.log('[4-9 When] セマンティック検索ボタンをクリック（手動テスト）');

  const semanticBtn = page.locator('[data-testid="transition-search-semantic-button"]');
  await semanticBtn.waitFor({ state: 'visible', timeout: 10000 });

  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/transition-search') &&
      resp.url().includes('semantic=true') &&
      resp.request().method() === 'GET',
    { timeout: 30000 } // セマンティック検索は時間がかかる可能性があるためタイムアウトを長めに設定
  ).catch(() => {
    // API レスポンスが来ない場合は続行
  });

  await semanticBtn.click();
  await responsePromise;
  await page.waitForTimeout(1000);
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * トランジション検索タブが表示されること（4-9-1）
 * ProgressMonitoring.tsx: data-testid="transition-search-tab"
 */
Then('トランジション検索タブが表示されること', async ({ page }) => {
  // data-testid="transition-search-tab" を優先し、
  // 見つからない場合はテキストで探す
  const tabByTestId = page.locator('[data-testid="transition-search-tab"]');
  const tabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'トランジション検索' });

  const isTestIdVisible = await tabByTestId.isVisible({ timeout: 5000 }).catch(() => false);

  if (isTestIdVisible) {
    await expect(tabByTestId).toBeVisible({ timeout: 10000 });
  } else {
    await expect(tabByText.first()).toBeVisible({ timeout: 10000 });
  }
});

/**
 * 検索結果一覧にプロジェクト名を含む行が表示されること（4-9-2）
 * TransitionSearch: data-testid="transition-search-results"
 */
Then(
  '検索結果一覧にプロジェクト名 {string} を含む行が表示されること',
  async ({ page }, projectName: string) => {
    console.log(`[4-9 Then] 検索結果一覧にプロジェクト名 "${projectName}" を確認`);

    const results = page.locator('[data-testid="transition-search-results"]');
    await results.waitFor({ state: 'visible', timeout: 10000 });
    await expect(results).toContainText(projectName, { timeout: 10000 });
  }
);

/**
 * 検索結果一覧にトランジション名を含む行が表示されること（4-9-3, 4-9-7, 4-9-8）
 * TransitionSearch: data-testid="transition-search-results"
 */
Then(
  '検索結果一覧にトランジション名 {string} を含む行が表示されること',
  async ({ page }, transitionName: string) => {
    console.log(`[4-9 Then] 検索結果一覧にトランジション名 "${transitionName}" を確認`);

    const results = page.locator('[data-testid="transition-search-results"]');
    await results.waitFor({ state: 'visible', timeout: 10000 });
    await expect(results).toContainText(transitionName, { timeout: 10000 });
  }
);

/**
 * 検索結果一覧にトランジション名を含む行が表示されないこと（4-9-7）
 * TransitionSearch: data-testid="transition-search-results"
 */
Then(
  '検索結果一覧にトランジション名 {string} を含む行が表示されないこと',
  async ({ page }, transitionName: string) => {
    console.log(`[4-9 Then] 検索結果一覧にトランジション名 "${transitionName}" が表示されないことを確認`);

    const results = page.locator('[data-testid="transition-search-results"]');
    await results.waitFor({ state: 'visible', timeout: 10000 });
    await expect(results).not.toContainText(transitionName, { timeout: 5000 });
  }
);

/**
 * 検索結果一覧にステータスの行が含まれること（4-9-4）
 * TransitionSearch: data-testid="transition-search-results"
 */
Then(
  '検索結果一覧にステータス {string} の行が含まれること',
  async ({ page }, status: string) => {
    console.log(`[4-9 Then] 検索結果一覧にステータス "${status}" の行が含まれることを確認`);

    const results = page.locator('[data-testid="transition-search-results"]');
    await results.waitFor({ state: 'visible', timeout: 10000 });
    await expect(results).toContainText(status, { timeout: 10000 });
  }
);

/**
 * 検索結果一覧にステータス以外の行が含まれないこと（4-9-4）
 * TransitionSearch: data-testid="transition-search-results"
 * ステータスフィルタが正しく機能していることを確認する
 *
 * ステータスのマッピング:
 *   完了   → PROGRESS_STATUS_COMPLETED ('完了')
 *   作業中 → PROGRESS_STATUS_IN_PROGRESS ('作業中')
 *   未着手 → PROGRESS_STATUS_NOT_STARTED ('未着手')
 */
Then(
  '検索結果一覧にステータス {string} 以外の行が含まれないこと',
  async ({ page }, status: string) => {
    console.log(`[4-9 Then] 検索結果一覧にステータス "${status}" 以外の行が含まれないことを確認`);

    const results = page.locator('[data-testid="transition-search-results"]');
    await results.waitFor({ state: 'visible', timeout: 10000 });

    // 対象ステータス以外のステータス一覧
    const allStatuses = [
      PROGRESS_STATUS_COMPLETED,
      PROGRESS_STATUS_IN_PROGRESS,
      PROGRESS_STATUS_NOT_STARTED,
    ];
    const otherStatuses = allStatuses.filter((s) => s !== status);

    for (const otherStatus of otherStatuses) {
      // 他のステータスが含まれていないことを確認
      // テストデータに基づいて各ステータスのトランジション名をチェックする
      const transitionNameMap: Record<string, string> = {
        [PROGRESS_STATUS_COMPLETED]: TRANSITION_COMPLETED,
        [PROGRESS_STATUS_IN_PROGRESS]: TRANSITION_IN_PROGRESS,
        [PROGRESS_STATUS_NOT_STARTED]: TRANSITION_NOT_STARTED,
      };
      const otherTransitionName = transitionNameMap[otherStatus];
      if (otherTransitionName) {
        await expect(results).not.toContainText(otherTransitionName, { timeout: 5000 });
      }
    }
  }
);

/**
 * 検索結果一覧が表示されること（4-9-5）
 * TransitionSearch: data-testid="transition-search-results"
 */
Then('検索結果一覧が表示されること', async ({ page }) => {
  const results = page.locator('[data-testid="transition-search-results"]');
  await expect(results).toBeVisible({ timeout: 10000 });
});

/**
 * 検索結果一覧にトランジション名列が存在すること（4-9-5）
 * テーブルのヘッダーに「トランジション名」が含まれること
 */
Then('検索結果一覧にトランジション名列が存在すること', async ({ page }) => {
  const results = page.locator('[data-testid="transition-search-results"]');
  const header = results.locator('thead, .ant-table-thead');
  await expect(header).toContainText('トランジション名', { timeout: 10000 });
});

/**
 * 検索結果一覧にプロジェクト名列が存在すること（4-9-5）
 * テーブルのヘッダーに「プロジェクト名」が含まれること
 */
Then('検索結果一覧にプロジェクト名列が存在すること', async ({ page }) => {
  const results = page.locator('[data-testid="transition-search-results"]');
  const header = results.locator('thead, .ant-table-thead');
  await expect(header).toContainText('プロジェクト名', { timeout: 10000 });
});

/**
 * 検索結果一覧にタスク名列が存在すること（4-9-5）
 * テーブルのヘッダーに「タスク名」が含まれること
 */
Then('検索結果一覧にタスク名列が存在すること', async ({ page }) => {
  const results = page.locator('[data-testid="transition-search-results"]');
  const header = results.locator('thead, .ant-table-thead');
  await expect(header).toContainText('タスク', { timeout: 10000 });
});

/**
 * 検索結果一覧にステータス列が存在すること（4-9-5）
 * テーブルのヘッダーに「ステータス」が含まれること
 */
Then('検索結果一覧にステータス列が存在すること', async ({ page }) => {
  const results = page.locator('[data-testid="transition-search-results"]');
  const header = results.locator('thead, .ant-table-thead');
  await expect(header).toContainText('ステータス', { timeout: 10000 });
});

/**
 * 検索結果が0件のメッセージが表示されること（4-9-6）
 * TransitionSearch: data-testid="transition-search-no-results"
 * または Ant Design Table の空テーブルメッセージ
 */
Then('検索結果が0件のメッセージが表示されること', async ({ page }) => {
  console.log('[4-9 Then] 検索結果が0件のメッセージを確認');

  // data-testid="transition-search-no-results" を優先し、
  // 見つからない場合は Ant Design Table の空メッセージを確認
  const noResultsByTestId = page.locator('[data-testid="transition-search-no-results"]');
  const noResultsByAntd = page.locator('.ant-empty, .ant-table-empty');
  const noResultsByText = page.locator('text=該当するトランジションが見つかりません');

  const isTestIdVisible = await noResultsByTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const isAntdVisible = await noResultsByAntd.isVisible({ timeout: 3000 }).catch(() => false);
  const isTextVisible = await noResultsByText.isVisible({ timeout: 3000 }).catch(() => false);

  if (isTestIdVisible) {
    await expect(noResultsByTestId).toBeVisible({ timeout: 10000 });
  } else if (isAntdVisible) {
    await expect(noResultsByAntd.first()).toBeVisible({ timeout: 10000 });
  } else if (isTextVisible) {
    await expect(noResultsByText.first()).toBeVisible({ timeout: 10000 });
  } else {
    // 検索結果テーブルが0件であることを確認（行が存在しないこと）
    const results = page.locator('[data-testid="transition-search-results"]');
    const rows = results.locator('tr.ant-table-row, tbody tr');
    await expect(rows).toHaveCount(0, { timeout: 10000 });
  }
});

/**
 * プロジェクト進捗詳細ダイアログが表示されること（4-9-9）
 * WorkProgressDetailDialog.tsx: data-testid="progress-detail-dialog"
 * ※ 4-6 の Then ステップと同じ data-testid を使用
 */
Then('プロジェクト進捗詳細ダイアログが表示されること', async ({ page }) => {
  console.log('[4-9 Then] プロジェクト進捗詳細ダイアログの表示を確認');

  const dialog = page.locator('[data-testid="progress-detail-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 10000 });
});

/**
 * 意味的に類似するトランジションが検索結果一覧に表示されること（4-9-10 手動）
 * TransitionSearch: data-testid="transition-search-results"
 * ※ セマンティック検索の精度は目視確認が必要
 */
Then('意味的に類似するトランジションが検索結果一覧に表示されること', async ({ page }) => {
  console.log('[4-9 Then] セマンティック検索結果を確認（手動テスト・目視確認推奨）');

  // 最低限、検索結果テーブルが表示されていることを確認する
  // 検索精度（類似度）の評価は目視で行うこと
  const results = page.locator('[data-testid="transition-search-results"]');
  await expect(results).toBeVisible({ timeout: 30000 });

  // 1件以上の結果が返されていることを確認
  const rows = results.locator('tr.ant-table-row, tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
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
    `[4-9 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
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
      console.log(`[4-9 upsertProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[4-9 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-9 upsertProject] 失敗: project_id=${projectId}:`, error);
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
    `[4-9 upsertProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, order=${experimentOrder}`
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
      console.log(`[4-9 upsertProjectTask] UPDATE 完了: project_id=${projectId}, order=${experimentOrder}`);
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
      console.log(`[4-9 upsertProjectTask] INSERT 完了: project_id=${projectId}, order=${experimentOrder}`);
    }
  } catch (error) {
    console.error(`[4-9 upsertProjectTask] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用トランジション進捗データを UPSERT する
 *
 * @param projectId        - プロジェクトID
 * @param methodId         - メソッドID
 * @param transitionName   - トランジション名
 * @param progressStatus   - 進捗ステータス（日本語: '完了'/'作業中'/'未着手'等）
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
    `[4-9 upsertTransitionSet] 開始: project_id=${projectId}, transition=${transitionName}, status=${progressStatus}`
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
    console.log(
      `[4-9 upsertTransitionSet] INSERT 完了: project_id=${projectId}, transition=${transitionName}`
    );
  } catch (error) {
    console.error(
      `[4-9 upsertTransitionSet] 失敗: project_id=${projectId}, transition=${transitionName}:`,
      error
    );
    throw error;
  }
}
