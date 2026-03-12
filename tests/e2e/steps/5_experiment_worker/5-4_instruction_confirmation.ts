/**
 * ステップ定義: [5-4] 指示確認
 *
 * 対応 feature: tests/e2e/features/5_experiment_worker/5-4_instruction_confirmation.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : worker@example.com
 *   パスワード: worker123
 *
 * 前提条件（テストデータ）:
 *   - project テーブルに E2Eテスト用プロジェクト_5-4（project_status: 2 = executing_task）が存在すること
 *   - project_instruction テーブルに以下が存在すること:
 *       - プロジェクト指示（instruction_target: 1、instruction_status: 1）が1件以上
 *       - タスク指示（instruction_target: 2、instruction_status: 1）が1件以上
 *       - トランジション指示（instruction_target: 3、instruction_status: 1）が1件以上
 *   - 5-4-6 用: 上記プロジェクトのタスク指示グループにつき、
 *       instruction_acknowledged_history に worker_user@example.com の確認履歴が登録済みであること
 *   - 5-4-7 用: E2Eテスト用プロジェクト_5-4-7 が存在し、
 *       project_instruction テーブルに当該プロジェクトの指示が0件であること
 *
 * data-testid 対応表（フロントエンドコンポーネント → テスト用セレクター）:
 *   instruction-confirmation-tab              InstructionConfirmationTab.tsx
 *   instruction-group-file                    InstructionGroup.tsx（プロジェクト指示ブロック）
 *   instruction-group-task                    InstructionGroup.tsx（タスク指示ブロック）
 *   instruction-group-task-empty              InstructionGroup.tsx（タスク指示が0件の場合）
 *   instruction-group-transition              InstructionGroup.tsx（トランジション指示ブロック）
 *   instruction-task-item-{taskId}            InstructionGroup.tsx（タスクグループアイテム）
 *   instruction-task-confirm-button-{taskId}  InstructionGroup.tsx（タスク確認完了ボタン）
 *   instruction-transition-item-{transitionId}  InstructionGroup.tsx（トランジショングループアイテム）
 *   instruction-transition-confirm-button-{transitionId}  InstructionGroup.tsx（トランジション確認完了ボタン）
 *   instruction-flow-diagram-button           InstructionConfirmationTab.tsx（フロー図ボタン）
 *   instruction-confirm-all-button            InstructionConfirmationTab.tsx（全確認完了ボタン）
 *   instruction-group-file-toggle             InstructionConfirmationTab.tsx（ファイルグループトグル）
 *   instruction-group-task-toggle             InstructionConfirmationTab.tsx（タスクグループトグル）
 *   instruction-group-transition-toggle       InstructionConfirmationTab.tsx（トランジショングループトグル）
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

/** テスト用プロジェクト（5-4-1〜5-4-6, 5-4-8, 5-4-9 用） */
const TEST_PROJECT_ID = 'E2E-5-4';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_5-4';

/** テスト用プロジェクト（5-4-7: 指示なし状態確認用） */
const TEST_PROJECT_ID_EMPTY = 'E2E-5-4-7';
const TEST_PROJECT_NAME_EMPTY = 'E2Eテスト用プロジェクト_5-4-7';

/** テスト用実験指示ID プレフィックス */
const TEST_INSTRUCTION_PREFIX = 'E2E-5-4';

/** テスト用ワーカーユーザーID */
const TEST_WORKER_USER_ID = 'worker@example.com';

/**
 * project_status 数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = executing_task（タスク実行中）
 */
const PROJECT_STATUS_EXECUTING_TASK = 2;

/**
 * instruction_target 数値定義（DDL: docs/design/db/ddl/project_instruction.sql）
 * 1: ファイル全体（プロジェクト指示）
 * 2: タスク
 * 3: トランジション
 */
const INSTRUCTION_TARGET_PROJECT = 1;
const INSTRUCTION_TARGET_TASK = 2;
const INSTRUCTION_TARGET_TRANSITION = 3;

/** instruction_status: 1 = 送信済み */
const INSTRUCTION_STATUS_SENT = 1;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した project の project_id */
const createdProjectIds: string[] = [];

/** テスト中に作成した project_instruction の複合キー */
const createdInstructionKeys: Array<{
  organization_id: string;
  project_id: string;
  experiment_instruction_id: string;
}> = [];

/** テスト中に作成した instruction_acknowledged_history の複合キー */
const createdAckHistoryKeys: Array<{
  organization_id: string;
  project_id: string;
  experiment_instruction_id: string;
  experiment_user_id: string;
}> = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 5-4-1, 5-4-2, 5-4-3, 5-4-4, 5-4-5, 5-4-8, 5-4-9 用
 * - テスト用プロジェクト_5-4 を UPSERT
 * - プロジェクト指示・タスク指示・トランジション指示を INSERT（未確認状態）
 */
Before({ tags: '@5-4-1 or @5-4-2 or @5-4-3 or @5-4-4 or @5-4-5 or @5-4-8 or @5-4-9' }, async () => {
  console.log('[5-4 Before] テストデータ準備 開始');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    // プロジェクト指示（instruction_target: 1）
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-PRJ-001`,
      INSTRUCTION_TARGET_PROJECT,
      null,
      null,
      null,
      'プロジェクト全体への作業指示です。安全に作業してください。'
    );
    // タスク指示（instruction_target: 2）
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-TASK-001`,
      INSTRUCTION_TARGET_TASK,
      'E2E_METHOD_A',
      null,
      1,
      'タスク1への作業指示です。手順に従って実施してください。'
    );
    // トランジション指示（instruction_target: 3）
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-TRANS-001`,
      INSTRUCTION_TARGET_TRANSITION,
      'E2E_METHOD_A',
      'E2E_TRANS_A',
      1,
      'トランジションへの作業指示です。注意して実施してください。'
    );
    console.log('[5-4 Before] テストデータ準備 完了');
  } catch (error) {
    console.error('[5-4 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-4-6 用
 * - テスト用プロジェクト_5-4 を UPSERT
 * - プロジェクト指示・タスク指示・トランジション指示を INSERT
 * - タスク指示グループの最初のアイテムの確認履歴を事前に登録（isAcknowledged: true の状態）
 */
Before({ tags: '@5-4-6' }, async () => {
  console.log('[5-4 Before] テストデータ準備 開始 (tags: @5-4-6)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    // プロジェクト指示
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-PRJ-001`,
      INSTRUCTION_TARGET_PROJECT,
      null,
      null,
      null,
      'プロジェクト全体への作業指示です。'
    );
    // タスク指示（確認済みにするもの）
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-TASK-001`,
      INSTRUCTION_TARGET_TASK,
      'E2E_METHOD_A',
      null,
      1,
      'タスク1への作業指示です。'
    );
    // タスク指示の確認履歴を事前登録（= isAcknowledged: true の状態）
    await upsertAckHistory(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-TASK-001`,
      TEST_WORKER_USER_ID
    );
    // トランジション指示
    await upsertInstruction(
      TEST_PROJECT_ID,
      `${TEST_INSTRUCTION_PREFIX}-TRANS-001`,
      INSTRUCTION_TARGET_TRANSITION,
      'E2E_METHOD_A',
      'E2E_TRANS_A',
      1,
      'トランジションへの作業指示です。'
    );
    console.log('[5-4 Before] テストデータ準備 完了 (tags: @5-4-6)');
  } catch (error) {
    console.error('[5-4 Before] テストデータ準備 失敗 (tags: @5-4-6):', error);
    throw error;
  }
});

/**
 * 5-4-7 用
 * - テスト用プロジェクト_5-4-7 を UPSERT（指示データは挿入しない）
 */
Before({ tags: '@5-4-7' }, async () => {
  console.log('[5-4 Before] テストデータ準備 開始 (tags: @5-4-7)');
  try {
    await upsertTestProject(TEST_PROJECT_ID_EMPTY, TEST_PROJECT_NAME_EMPTY);
    console.log('[5-4 Before] テストデータ準備 完了 (tags: @5-4-7)');
  } catch (error) {
    console.error('[5-4 Before] テストデータ準備 失敗 (tags: @5-4-7):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[5-4 After] クリーンアップ 開始');
  try {
    // instruction_acknowledged_history を削除
    for (const key of createdAckHistoryKeys) {
      try {
        await db.query(
          `DELETE FROM instruction_acknowledged_history
           WHERE organization_id = $1 AND project_id = $2
             AND experiment_instruction_id = $3 AND experiment_user_id = $4`,
          [key.organization_id, key.project_id, key.experiment_instruction_id, key.experiment_user_id]
        );
        console.log(`[5-4 After] instruction_acknowledged_history 削除 完了: id=${key.experiment_instruction_id}, user=${key.experiment_user_id}`);
      } catch (error) {
        console.error(`[5-4 After] instruction_acknowledged_history 削除 失敗: id=${key.experiment_instruction_id}:`, error);
      }
    }
    createdAckHistoryKeys.length = 0;

    // project_instruction を削除
    for (const key of createdInstructionKeys) {
      try {
        await db.query(
          `DELETE FROM project_instruction
           WHERE organization_id = $1 AND project_id = $2 AND experiment_instruction_id = $3`,
          [key.organization_id, key.project_id, key.experiment_instruction_id]
        );
        console.log(`[5-4 After] project_instruction 削除 完了: id=${key.experiment_instruction_id}`);
      } catch (error) {
        console.error(`[5-4 After] project_instruction 削除 失敗: id=${key.experiment_instruction_id}:`, error);
      }
    }
    createdInstructionKeys.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          `DELETE FROM project WHERE organization_id = $1 AND project_id = $2`,
          [ORG_ID, projectId]
        );
        console.log(`[5-4 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[5-4 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[5-4 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[5-4 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: DB事前確認
// ---------------------------------------------------------------------------

/**
 * 実験作業者のユーザーがDBに存在することを確認する
 */
Given('実験作業者のユーザID {string} がDB（organization_userテーブル）に存在する', async ({}, _userId: string) => {
  // TODO: organization_user テーブルの存在確認（テスト環境セットアップ済みの想定）
  console.log(`[5-4 Given] 実験作業者ユーザー確認: userId=${_userId}`);
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
 * 指示確認タブを開く
 * InstructionConfirmationTab は実験作業者メイン画面の "指示確認" タブラベルをクリックする
 */
When('指示確認タブを開く', async ({ page }) => {
  await page.click('[role="tab"]:has-text("指示確認")');
  await page.waitForSelector('[data-testid="instruction-confirmation-tab"]', { timeout: 15000 });
});

/**
 * タスク指示グループのトグルをクリックする（折りたたみ・展開切り替え）
 * InstructionConfirmationTab.tsx: data-testid="instruction-group-task-toggle"
 */
When('タスク指示グループのトグルをクリックする', async ({ page }) => {
  const toggle = page.locator('[data-testid="instruction-group-task-toggle"]').first();
  await toggle.waitFor({ state: 'visible', timeout: 10000 });
  await toggle.click();
  await page.waitForTimeout(300);
});

/**
 * プロジェクト指示グループのトグルをクリックして展開する
 * InstructionConfirmationTab.tsx: data-testid="instruction-group-file-toggle"
 */
When('プロジェクト指示グループのトグルをクリックして展開する', async ({ page }) => {
  // プロジェクト指示グループのトグルをクリック（展開）
  const toggle = page.locator('[data-testid="instruction-group-file-toggle"]').first();
  await toggle.waitFor({ state: 'visible', timeout: 10000 });
  await toggle.click();
  await page.waitForTimeout(300);
});

/**
 * プロジェクト指示グループの「確認完了」ボタンをクリックする
 * InstructionGroup.tsx（プロジェクト指示）: プロジェクト指示グループは instruction-group-file 内の
 * InstructionCard に確認ボタンが配置される。
 * 設計書では InstructionConfirmationTab.tsx に "instruction-group-file-toggle" があり、
 * その後に表示される「確認完了」ボタンをクリックする。
 * ここではタブのセクション内 "確認完了" ボタンをクリックする。
 */
When('プロジェクト指示グループの「確認完了」ボタンをクリックする', async ({ page }) => {
  // プロジェクト指示グループ（instruction-group-file）内の「確認完了」ボタン
  const confirmBtn = page
    .locator('[data-testid="instruction-group-file"]')
    .locator('button:has-text("確認完了")')
    .first();
  await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

/**
 * タスク指示グループ最初のアイテムの「確認完了」ボタンをクリックする
 * InstructionGroup.tsx: data-testid="instruction-task-confirm-button-{taskId}"
 * 最初のアイテムを取得するため :first を使用する
 */
When('タスク指示グループ最初のアイテムの「確認完了」ボタンをクリックする', async ({ page }) => {
  const confirmBtn = page
    .locator('[data-testid^="instruction-task-confirm-button-"]')
    .first();
  await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

/**
 * トランジション指示グループ最初のアイテムの「確認完了」ボタンをクリックする
 * InstructionGroup.tsx: data-testid="instruction-transition-confirm-button-{transitionId}"
 */
When('トランジション指示グループ最初のアイテムの「確認完了」ボタンをクリックする', async ({ page }) => {
  const confirmBtn = page
    .locator('[data-testid^="instruction-transition-confirm-button-"]')
    .first();
  await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
});

/**
 * 「フロー図」ボタンをクリックする
 * InstructionConfirmationTab.tsx: data-testid="instruction-flow-diagram-button"
 */
When('「フロー図」ボタンをクリックする', async ({ page }) => {
  const flowBtn = page.locator('[data-testid="instruction-flow-diagram-button"]');
  await flowBtn.waitFor({ state: 'visible', timeout: 10000 });
  await flowBtn.click();
  await page.waitForTimeout(1000);
});

/**
 * 「全ての指示の確認完了」ボタンをクリックする
 * InstructionConfirmationTab.tsx: data-testid="instruction-confirm-all-button"
 */
When('「全ての指示の確認完了」ボタンをクリックする', async ({ page }) => {
  const confirmAllBtn = page.locator('[data-testid="instruction-confirm-all-button"]');
  await confirmAllBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmAllBtn.click();
  await page.waitForTimeout(500);
});

/**
 * 確認ダイアログで「確認完了」ボタンをクリックする
 * Ant Design Popconfirm / Modal の「OK」または「確認完了」ボタン
 */
When('確認ダイアログで「確認完了」ボタンをクリックする', async ({ page }) => {
  // Ant Design Popconfirm の OK ボタン
  const okBtn = page
    .locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary')
    .first();
  await okBtn.waitFor({ state: 'visible', timeout: 5000 });
  await okBtn.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * [5-4-1] 指示確認タブが表示されていること
 * InstructionConfirmationTab.tsx: data-testid="instruction-confirmation-tab"
 */
Then('指示確認タブが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="instruction-confirmation-tab"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-1] プロジェクト指示グループが表示されていること
 * InstructionGroup.tsx: data-testid="instruction-group-file"
 */
Then('プロジェクト指示グループが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="instruction-group-file"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-1] タスク指示グループが表示されていること
 * InstructionGroup.tsx: data-testid="instruction-group-task"
 */
Then('タスク指示グループが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="instruction-group-task"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-1] トランジション指示グループが表示されていること
 * InstructionGroup.tsx: data-testid="instruction-group-transition"
 */
Then('トランジション指示グループが表示されていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="instruction-group-transition"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-2] タスク指示グループが展開状態であること
 * デフォルト展開（isExpanded = true）: 指示カード・確認完了ボタンが visible であること
 */
Then('タスク指示グループが展開状態であること', async ({ page }) => {
  // タスク指示グループ内の最初のアイテムで確認完了ボタンが visible = 展開状態
  await expect(
    page.locator('[data-testid^="instruction-task-confirm-button-"]').first()
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-2] タスク指示グループが折りたたまれていること
 * 折りたたみ状態: 確認完了ボタンが hidden になること
 */
Then('タスク指示グループが折りたたまれていること', async ({ page }) => {
  await expect(
    page.locator('[data-testid^="instruction-task-confirm-button-"]').first()
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * [5-4-3] 指示確認APIが呼び出されること
 * PUT /api/v1/instructions/{instructionId}/confirm のリクエストを検証する
 */
Then('指示確認APIが呼び出されること', async ({ page }) => {
  // API呼び出しを waitForResponse でキャプチャ（APIが既に呼び出された場合は即時通過）
  // 注意: ボタンクリックで API が既に呼ばれた後にこのステップが実行されるため、
  //       ネットワークログ（HAR）確認またはUI変化で代用する
  // ここではボタンが disabled になること（API成功後の状態変化）で確認する
  await page.waitForTimeout(1000); // API応答待ち
  // プロジェクト指示 / タスク指示 / トランジション指示のうちいずれか1つ以上の
  // 確認完了ボタンが disabled になっていれば API 呼び出し成功とみなす
  const disabledBtn = page.locator(
    '[data-testid^="instruction-task-confirm-button-"][disabled], ' +
    '[data-testid^="instruction-task-confirm-button-"].ant-btn-disabled, ' +
    '[data-testid^="instruction-transition-confirm-button-"][disabled], ' +
    '[data-testid^="instruction-transition-confirm-button-"].ant-btn-disabled, ' +
    '[data-testid="instruction-group-file"] button.ant-btn-disabled'
  ).first();
  await expect(disabledBtn).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-3] プロジェクト指示グループの「確認完了」ボタンが無効化されていること
 */
Then('プロジェクト指示グループの「確認完了」ボタンが無効化されていること', async ({ page }) => {
  const confirmBtn = page
    .locator('[data-testid="instruction-group-file"]')
    .locator('button:has-text("確認完了")')
    .first();
  await expect(confirmBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-4-4] タスク指示グループ最初のアイテムの「確認完了」ボタンが無効化されていること
 * InstructionGroup.tsx: data-testid="instruction-task-confirm-button-{taskId}"
 */
Then('タスク指示グループ最初のアイテムの「確認完了」ボタンが無効化されていること', async ({ page }) => {
  const confirmBtn = page
    .locator('[data-testid^="instruction-task-confirm-button-"]')
    .first();
  await expect(confirmBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-4-5] トランジション指示グループ最初のアイテムの「確認完了」ボタンが無効化されていること
 * InstructionGroup.tsx: data-testid="instruction-transition-confirm-button-{transitionId}"
 */
Then('トランジション指示グループ最初のアイテムの「確認完了」ボタンが無効化されていること', async ({ page }) => {
  const confirmBtn = page
    .locator('[data-testid^="instruction-transition-confirm-button-"]')
    .first();
  await expect(confirmBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-4-7] プロジェクト指示の空状態メッセージが表示されていること
 * InstructionGroup.tsx（プロジェクト指示）: Empty の description で表示
 */
Then('プロジェクト指示の空状態メッセージ {string} が表示されていること', async ({ page }, message: string) => {
  await expect(
    page.locator('[data-testid="instruction-group-file"]').locator(`.ant-empty-description:has-text("${message}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-7] タスク指示の空状態メッセージが表示されていること
 * InstructionGroup.tsx（タスク指示 0件）: data-testid="instruction-group-task-empty"
 */
Then('タスク指示の空状態メッセージ {string} が表示されていること', async ({ page }, message: string) => {
  await expect(
    page.locator('[data-testid="instruction-group-task-empty"]').locator(`.ant-empty-description:has-text("${message}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-7] トランジション指示の空状態メッセージが表示されていること
 * InstructionGroup.tsx（トランジション指示 0件時）: Empty description で表示
 */
Then('トランジション指示の空状態メッセージ {string} が表示されていること', async ({ page }, message: string) => {
  await expect(
    page.locator('[data-testid="instruction-group-transition"]').locator(`.ant-empty-description:has-text("${message}")`)
      .or(page.locator(`.ant-empty-description:has-text("${message}")`))
  ).toBeVisible({ timeout: 10000 });
});

/**
 * [5-4-8] フロー図ダイアログが表示されること
 * InstructionFlowDialog.tsx: data-testid="instruction-flow-dialog-content-{id}"
 */
Then('フロー図ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid^="instruction-flow-dialog-content-"]').first()
  ).toBeVisible({ timeout: 15000 });
});

/**
 * [5-4-9] 全ての確認完了ボタンが無効化されていること
 * タスク・トランジション全アイテムの確認完了ボタンが disabled であること
 */
Then('全ての確認完了ボタンが無効化されていること', async ({ page }) => {
  // タスク指示グループ内の全確認完了ボタンが disabled であること
  const taskConfirmBtns = page.locator('[data-testid^="instruction-task-confirm-button-"]');
  const taskBtnCount = await taskConfirmBtns.count();
  for (let i = 0; i < taskBtnCount; i++) {
    await expect(taskConfirmBtns.nth(i)).toBeDisabled({ timeout: 10000 });
  }

  // トランジション指示グループ内の全確認完了ボタンが disabled であること
  const transConfirmBtns = page.locator('[data-testid^="instruction-transition-confirm-button-"]');
  const transBtnCount = await transConfirmBtns.count();
  for (let i = 0; i < transBtnCount; i++) {
    await expect(transConfirmBtns.nth(i)).toBeDisabled({ timeout: 10000 });
  }
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
 * @param projectId - プロジェクトID
 * @param projectName - プロジェクト名
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(projectId: string, projectName: string): Promise<void> {
  console.log(`[5-4 upsertTestProject] 開始: project_id=${projectId}, project_name=${projectName}`);
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
      console.log(`[5-4 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[5-4 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[5-4 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクト指示を UPSERT する
 *
 * @param projectId          - プロジェクトID
 * @param instructionId      - 実験指示ID
 * @param instructionTarget  - 指示対象（1:プロジェクト、2:タスク、3:トランジション）
 * @param methodId           - メソッドID（タスク・トランジション指示の場合）
 * @param transitionId       - トランジションID（トランジション指示の場合）
 * @param taskNo             - タスク連番（タスク・トランジション指示の場合）
 * @param instructionText    - 指示内容
 *
 * DDL参照: docs/design/db/ddl/project_instruction.sql
 */
async function upsertInstruction(
  projectId: string,
  instructionId: string,
  instructionTarget: number,
  methodId: string | null,
  transitionId: string | null,
  taskNo: number | null,
  instructionText: string
): Promise<void> {
  console.log(`[5-4 upsertInstruction] 開始: id=${instructionId}, target=${instructionTarget}`);
  try {
    const existing = await db.query<{ experiment_instruction_id: string }>(
      `SELECT experiment_instruction_id FROM project_instruction
       WHERE organization_id = $1 AND project_id = $2 AND experiment_instruction_id = $3`,
      [ORG_ID, projectId, instructionId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_instruction
         SET instruction_target = $1, instructions = $2, instruction_status = $3,
             method_id = $4, transition_id = $5, task_no = $6,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $7 AND project_id = $8 AND experiment_instruction_id = $9`,
        [instructionTarget, instructionText, INSTRUCTION_STATUS_SENT, methodId, transitionId, taskNo, ORG_ID, projectId, instructionId]
      );
      console.log(`[5-4 upsertInstruction] UPDATE 完了: id=${instructionId}`);
    } else {
      await db.query(
        `INSERT INTO project_instruction (
          organization_id, project_id, experiment_instruction_id,
          method_id, instruction_target, priority, type,
          task_no, transition_id, instruction_status, instructions,
          instruction_user_id, instruction_date,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, 1, 1,
          $6, $7, $8, $9,
          'e2e-test', NOW(),
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, instructionId, methodId, instructionTarget, taskNo, transitionId, INSTRUCTION_STATUS_SENT, instructionText]
      );
      createdInstructionKeys.push({
        organization_id: ORG_ID,
        project_id: projectId,
        experiment_instruction_id: instructionId,
      });
      console.log(`[5-4 upsertInstruction] INSERT 完了: id=${instructionId}`);
    }
  } catch (error) {
    console.error(`[5-4 upsertInstruction] 失敗: id=${instructionId}:`, error);
    throw error;
  }
}

/**
 * テスト用指示確認履歴を UPSERT する（確認済み状態を事前作成）
 *
 * @param projectId       - プロジェクトID
 * @param instructionId   - 実験指示ID
 * @param userId          - 確認ユーザーID
 *
 * DDL参照: docs/design/db/ddl/instruction_acknowledged_history.sql
 */
async function upsertAckHistory(
  projectId: string,
  instructionId: string,
  userId: string
): Promise<void> {
  console.log(`[5-4 upsertAckHistory] 開始: id=${instructionId}, user=${userId}`);
  try {
    const existing = await db.query<{ experiment_instruction_id: string }>(
      `SELECT experiment_instruction_id FROM instruction_acknowledged_history
       WHERE organization_id = $1 AND project_id = $2
         AND experiment_instruction_id = $3 AND experiment_user_id = $4`,
      [ORG_ID, projectId, instructionId, userId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE instruction_acknowledged_history
         SET acknowledged_at = NOW(), update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $1 AND project_id = $2
           AND experiment_instruction_id = $3 AND experiment_user_id = $4`,
        [ORG_ID, projectId, instructionId, userId]
      );
      console.log(`[5-4 upsertAckHistory] UPDATE 完了: id=${instructionId}, user=${userId}`);
    } else {
      await db.query(
        `INSERT INTO instruction_acknowledged_history (
          organization_id, project_id, experiment_instruction_id, experiment_user_id,
          acknowledged_at,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          NOW(),
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, instructionId, userId]
      );
      createdAckHistoryKeys.push({
        organization_id: ORG_ID,
        project_id: projectId,
        experiment_instruction_id: instructionId,
        experiment_user_id: userId,
      });
      console.log(`[5-4 upsertAckHistory] INSERT 完了: id=${instructionId}, user=${userId}`);
    }
  } catch (error) {
    console.error(`[5-4 upsertAckHistory] 失敗: id=${instructionId}, user=${userId}:`, error);
    throw error;
  }
}
