/**
 * ステップ定義: [4-7] プロジェクトフィルタ・検索
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-7_project_filter_search.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブルを UPSERT して準備する
 *   - 4-7-1: project_status=0（計画中）のプロジェクト と project_status=2（実行中）のプロジェクト
 *   - 4-7-2: checkout_status=0（チェックイン済み）のプロジェクト と checkout_status=1（チェックアウト中）のプロジェクト
 *   - 4-7-3: キーワード "E2E検索用" にマッチするプロジェクト と マッチしないプロジェクト
 *
 * data-testid 一覧（ProjectManagement.tsx）:
 *   - [project-status-filter]   : プロジェクトステータスフィルタ Select
 *   - [checkout-status-filter]  : チェックアウト状態フィルタ Select
 *   - [project-search-input]    : 検索Input
 *
 * data-testid 一覧（ProjectFolderTree.tsx）:
 *   - [project-item-{projectId}] : プロジェクトアイテム（行）
 *
 * フィルタ選択肢（設計書より）:
 *   ステータス: 全て / 計画中(0) / 実行待ち(1) / 実行中(2) / レビュー待ち(3) / 完了(4) / エラー(5)
 *   チェックアウト状態: 全て / チェックイン済み(checked_in) / チェックアウト中(checked_out)
 *   検索対象: プロジェクト名、プロジェクトID、ステータス表示名、部門名、所有者名
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
 * 0 = planning（計画中）
 * 2 = in_progress（実行中）
 */
const PROJECT_STATUS_PLANNING = 0;
const PROJECT_STATUS_IN_PROGRESS = 2;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in（チェックイン済み）
 * 1 = checked_out（チェックアウト中）
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;
const CHECKOUT_STATUS_CHECKED_OUT = 1;

// ---------------------------------------------------------------------------
// テストデータ定義
// ---------------------------------------------------------------------------

/** 4-7 共通テストデータ */
const TEST_PROJECTS = [
  {
    projectId: 'E2E-4-7-planning',
    projectName: 'E2Eテスト用プロジェクト_4-7-planning',
    projectStatus: PROJECT_STATUS_PLANNING,
    checkoutStatus: CHECKOUT_STATUS_CHECKED_IN,
  },
  {
    projectId: 'E2E-4-7-in-progress',
    projectName: 'E2Eテスト用プロジェクト_4-7-in-progress',
    projectStatus: PROJECT_STATUS_IN_PROGRESS,
    checkoutStatus: CHECKOUT_STATUS_CHECKED_OUT,
  },
  {
    projectId: 'E2E-4-7-search',
    projectName: 'E2E検索用プロジェクト_4-7',
    projectStatus: PROJECT_STATUS_PLANNING,
    checkoutStatus: CHECKOUT_STATUS_CHECKED_IN,
  },
  {
    projectId: 'E2E-4-7-other',
    projectName: 'E2Eテスト用プロジェクト_4-7-other',
    projectStatus: PROJECT_STATUS_PLANNING,
    checkoutStatus: CHECKOUT_STATUS_CHECKED_IN,
  },
];

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-7-1 / 4-7-2 / 4-7-3] 共通テストデータ準備
 * - 4種類のプロジェクトをすべて UPSERT する
 */
Before({ tags: '@4-7-1 or @4-7-2 or @4-7-3' }, async () => {
  console.log('[4-7 Before] テストデータ準備 開始');
  try {
    for (const proj of TEST_PROJECTS) {
      await upsertProject(
        proj.projectId,
        proj.projectName,
        proj.projectStatus,
        proj.checkoutStatus
      );
      if (!createdProjectIds.includes(proj.projectId)) {
        createdProjectIds.push(proj.projectId);
      }
    }
    console.log('[4-7 Before] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-7 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-7 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-7 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-7 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-7 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-7 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * フィルタ・検索テスト用プロジェクトがDBに存在する
 * → Before フックで準備済みのため no-op
 */
Given(
  'フィルタ・検索テスト用プロジェクトがDBに存在する',
  async ({}) => {
    console.log('[4-7 Given] フィルタ・検索テスト用プロジェクトは Before フックで準備済み');
  }
);

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * 所有者フィルタで指定値を選択する
 * ProjectManagement.tsx: data-testid="owner-filter"
 * Ant Design Select コンポーネントの操作
 *
 * @param ownerLabel - 選択する所有者フィルタのラベル（例: "全てのプロジェクト"）
 */
When(
  '所有者フィルタで {string} を選択する',
  async ({ page }, ownerLabel: string) => {
    console.log(`[4-7 When] 所有者フィルタで "${ownerLabel}" を選択`);

    // Ant Design の Select コンポーネントをクリックして開く
    // data-testid が付いていないため、「所有者」ラベルを含む Space コンテナ内の Select を取得
    const ownerFilter = page
      .locator('.ant-space')
      .filter({ hasText: /^所有者/ })
      .locator('.ant-select')
      .first();
    await ownerFilter.waitFor({ state: 'visible', timeout: 10000 });
    await ownerFilter.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'visible',
      timeout: 5000,
    });

    // ラベルに一致するオプションを選択
    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${ownerLabel}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // ドロップダウンが閉じるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {
      // 閉じない場合は続行
    });

    await page.waitForTimeout(500);
  }
);

/**
 * ステータスフィルタで指定ステータスを選択する
 * ProjectManagement.tsx: data-testid="project-status-filter"
 * Ant Design Select コンポーネントの操作
 *
 * @param statusLabel - 選択するステータスのラベル（例: "実行中"）
 */
When(
  'ステータスフィルタで {string} を選択する',
  async ({ page }, statusLabel: string) => {
    console.log(`[4-7 When] ステータスフィルタで "${statusLabel}" を選択`);

    // Ant Design の Select コンポーネントをクリックして開く
    const statusFilter = page.locator('[data-testid="project-status-filter"]');
    await statusFilter.waitFor({ state: 'visible', timeout: 10000 });
    await statusFilter.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'visible',
      timeout: 5000,
    });

    // ラベルに一致するオプションを選択
    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${statusLabel}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // ドロップダウンが閉じるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {
      // 閉じない場合は続行
    });

    await page.waitForTimeout(500);
  }
);

/**
 * チェックアウト状態フィルタで指定状態を選択する
 * ProjectManagement.tsx: data-testid="checkout-status-filter"
 * Ant Design Select コンポーネントの操作
 *
 * @param statusLabel - 選択するステータスのラベル（例: "チェックアウト中"）
 */
When(
  'チェックアウト状態フィルタで {string} を選択する',
  async ({ page }, statusLabel: string) => {
    console.log(`[4-7 When] チェックアウト状態フィルタで "${statusLabel}" を選択`);

    // Ant Design の Select コンポーネントをクリックして開く
    const checkoutFilter = page.locator('[data-testid="checkout-status-filter"]');
    await checkoutFilter.waitFor({ state: 'visible', timeout: 10000 });
    await checkoutFilter.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'visible',
      timeout: 5000,
    });

    // ラベルに一致するオプションを選択
    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${statusLabel}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // ドロップダウンが閉じるまで待機
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {
      // 閉じない場合は続行
    });

    await page.waitForTimeout(500);
  }
);

/**
 * 検索ボックスにキーワードを入力する
 * ProjectManagement.tsx: data-testid="project-search-input"
 *
 * @param keyword - 検索キーワード
 */
When(
  '検索ボックスにキーワード {string} を入力する',
  async ({ page }, keyword: string) => {
    console.log(`[4-7 When] 検索ボックスにキーワード "${keyword}" を入力`);

    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(keyword);

    // 入力後に少し待機してフィルタリングが反映されるのを待つ
    await page.waitForTimeout(500);
  }
);

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * プロジェクト一覧にプロジェクトが表示されること
 * ProjectFolderTree.tsx: data-testid="project-item-{projectId}"
 * ※ projectId ではなくプロジェクト名で検索するため、テキストマッチを使用
 *
 * @param projectName - 表示されていることを確認するプロジェクト名
 */
Then(
  'プロジェクト一覧に {string} が表示されること',
  async ({ page }, projectName: string) => {
    console.log(`[4-7 Then] プロジェクト一覧に "${projectName}" が表示されること を確認`);

    // ProjectFolderTree のプロジェクトアイテム一覧の中にプロジェクト名が含まれること
    const projectList = page.locator('[data-testid^="project-item-"]');
    const matchingItem = projectList.filter({ hasText: projectName });
    await expect(matchingItem.first()).toBeVisible({ timeout: 10000 });
  }
);

/**
 * プロジェクト一覧にプロジェクトが表示されないこと
 * ProjectFolderTree.tsx: data-testid="project-item-{projectId}"
 * ※ projectId ではなくプロジェクト名で検索するため、テキストマッチを使用
 *
 * @param projectName - 表示されていないことを確認するプロジェクト名
 */
Then(
  'プロジェクト一覧に {string} が表示されないこと',
  async ({ page }, projectName: string) => {
    console.log(`[4-7 Then] プロジェクト一覧に "${projectName}" が表示されないこと を確認`);

    // ProjectFolderTree のプロジェクトアイテム一覧にプロジェクト名が含まれないこと
    const projectList = page.locator('[data-testid^="project-item-"]');
    const matchingItem = projectList.filter({ hasText: projectName });
    await expect(matchingItem).not.toBeVisible({ timeout: 5000 });
  }
);

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId      - プロジェクトID
 * @param projectName    - プロジェクト名
 * @param projectStatus  - プロジェクトステータス（数値）
 * @param checkoutStatus - チェックアウトステータス（数値）
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertProject(
  projectId: string,
  projectName: string,
  projectStatus: number,
  checkoutStatus: number
): Promise<void> {
  console.log(
    `[4-7 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
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
             update_user_id = 'e2e-test',
             update_at = NOW()
         WHERE organization_id = $4 AND project_id = $5`,
        [projectName, projectStatus, checkoutStatus, ORG_ID, projectId]
      );
      console.log(`[4-7 upsertProject] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project (
          organization_id, project_id, project_name, project_status,
          project_maiml_flg, checkout_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          false, $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, projectName, projectStatus, checkoutStatus]
      );
      console.log(`[4-7 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-7 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
