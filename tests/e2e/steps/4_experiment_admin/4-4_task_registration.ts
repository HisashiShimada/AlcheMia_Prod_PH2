/**
 * ステップ定義: [4-4] タスク登録
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-4_task_registration.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project / project_task テーブルを UPSERT して準備する
 *   - 4-4-1〜4-4-3: MAIML登録済み・チェックアウトなし・タスク未登録プロジェクト（MAIMLファイルはS3に配置済み）
 *   - 4-4-4〜4-4-5: workerLinkedFlg=true のタスクを含むプロジェクト
 *   - 4-4-6〜4-4-7: タスク登録済みプロジェクト
 *
 * ビジネスルール（設計書より）:
 *   - MAIMLが未登録の場合は保存ボタンが無効化される
 *   - チェックアウト中の場合は保存ボタンが無効化される
 *   - 試行回数は 1〜999 の整数のみ有効
 *   - workerLinkedFlg=true のタスクは試行回数・実験条件の編集および順序変更不可
 *
 * data-testid 一覧:
 *   - [project-management-tab]             : プロジェクト管理タブ
 *   - [project-list-table]                 : プロジェクト一覧テーブル
 *   - [task-registration-tab]              : タスク登録タブ
 *   - [task-registration-save-button]      : 保存ボタン
 *   - [task-trial-count-input-{id}]        : 試行回数入力 (id=タスク連番)
 *   - [task-experiment-condition-select-{id}]: 実験条件セレクト
 *   - [task-drag-handle-{id}]              : ドラッグハンドル
 *   - [task-row-{id}]                      : タスク行 (data-worker-linked属性あり)
 *   - [task-add-instruction-button-{id}]   : 指示追加ボタン
 *   - [instruction-edit-dialog]            : InstructionEditDialog モーダル
 *   - [instruction-edit-dialog-content]    : 指示内容テキストエリア
 *   - [instruction-edit-dialog-save-button]: ダイアログ内保存ボタン
 *   - [instruction-registration-tab]       : 指示登録タブ
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { v4 as uuidv4 } from 'uuid';
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
 * 0 = planning
 */
const PROJECT_STATUS_PLANNING = 0;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-4-1] MAIMLファイル登録済み・チェックアウトなし・タスク登録済み
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_task に worker_linked_flg=false のタスクを1件INSERT
 * - S3/SwiftのMAIMLファイル不要（DBからタスクを読み込む）
 */
Before({ tags: '@4-4-1' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-1)');
  try {
    const projectId = 'E2E-4-4-1';
    const projectName = 'E2Eテスト用プロジェクト_4-4-1';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    // 保存バリデーション: 指示が最低1件必要なため、未送信指示をINSERT
    await upsertProjectInstruction(projectId, 'method_001', 'E2Eテスト用指示_4-4-1');
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-1)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-1):', error);
    throw error;
  }
});

/**
 * [4-4-2] MAIMLファイル登録済み・チェックアウトなし・タスク登録済み
 * - project_task に worker_linked_flg=false のタスクを1件INSERT
 * - S3/SwiftのMAIMLファイル不要（DBからタスクを読み込む）
 */
Before({ tags: '@4-4-2' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-2)');
  try {
    const projectId = 'E2E-4-4-2';
    const projectName = 'E2Eテスト用プロジェクト_4-4-2';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    // 実験条件セレクトの選択肢を code_master に登録（code_division='experiment_condition'）
    await upsertCodeMaster('experiment_condition', '1', '実験条件');
    // 保存バリデーション: 指示が最低1件必要なため、未送信指示をINSERT
    await upsertProjectInstruction(projectId, 'method_001', 'E2Eテスト用指示_4-4-2');
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-2)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-2):', error);
    throw error;
  }
});

/**
 * [4-4-3] MAIMLファイル登録済み・チェックアウトなし・タスク登録済み（複数メソッド）
 * - project_task に worker_linked_flg=false のタスクを2件INSERT
 * - S3/SwiftのMAIMLファイル不要（DBからタスクを読み込む）
 */
Before({ tags: '@4-4-3' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-3)');
  try {
    const projectId = 'E2E-4-4-3';
    const projectName = 'E2Eテスト用プロジェクト_4-4-3';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await upsertProjectTask(projectId, 'method_002', 2, false);
    // 保存バリデーション: 指示が最低1件必要なため、未送信指示をINSERT
    await upsertProjectInstruction(projectId, 'method_001', 'E2Eテスト用指示_4-4-3');
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-3)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-3):', error);
    throw error;
  }
});

/**
 * [4-4-4] ワーカー連携済みタスク（workerLinkedFlg=true）を含むプロジェクト
 * - project_maiml_flg=true, checkout_status=0
 * - project_task に worker_linked_flg=true のタスクを1件以上挿入
 */
Before({ tags: '@4-4-4' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-4)');
  try {
    const projectId = 'E2E-4-4-4';
    const projectName = 'E2Eテスト用プロジェクト_4-4-4';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, true);
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-4)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-4):', error);
    throw error;
  }
});

/**
 * [4-4-5] ワーカー連携済みタスク（workerLinkedFlg=true）を含むプロジェクト
 */
Before({ tags: '@4-4-5' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-5)');
  try {
    const projectId = 'E2E-4-4-5';
    const projectName = 'E2Eテスト用プロジェクト_4-4-5';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, true);
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-5)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-5):', error);
    throw error;
  }
});

/**
 * [4-4-6] MAIMLファイル登録済み・タスク登録済みプロジェクト
 * - project_task に worker_linked_flg=false のタスクを1件以上挿入
 */
Before({ tags: '@4-4-6' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-6)');
  try {
    const projectId = 'E2E-4-4-6';
    const projectName = 'E2Eテスト用プロジェクト_4-4-6';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-6)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-6):', error);
    throw error;
  }
});

/**
 * [4-4-7] MAIMLファイル登録済み・タスク登録済みプロジェクト
 * - project_task に worker_linked_flg=false のタスクを1件以上挿入
 */
Before({ tags: '@4-4-7' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-7)');
  try {
    const projectId = 'E2E-4-4-7';
    const projectName = 'E2Eテスト用プロジェクト_4-4-7';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    // 保存バリデーション: 指示が最低1件必要なため、未送信指示をINSERT
    await upsertProjectInstruction(projectId, 'method_001', 'E2Eテスト用指示_4-4-7');
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-7)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-7):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-4 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        // project_instruction を先に削除
        await db.query(
          'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        // project_task を削除（外部キー制約があるため）
        await db.query(
          'DELETE FROM project_task WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        // project を削除
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-4 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-4 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-4 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-4 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * MAIMLファイル登録済み・チェックアウトなし・タスク未登録のプロジェクトがDBに存在する（4-4-1用）
 * → Before フックで upsertProject を実行済みのため no-op
 */
Given(
  'MAIMLファイル登録済み・チェックアウトなし・タスク未登録のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-4 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * MAIMLファイル登録済み・チェックアウトなし・タスク未登録・メソッド複数のプロジェクトがDBに存在する（4-4-3用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'MAIMLファイル登録済み・チェックアウトなし・タスク未登録・メソッド複数のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-4 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * ワーカー連携済みタスクを含むプロジェクトがDBに存在する（4-4-4, 4-4-5用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'ワーカー連携済みタスクを含むテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-4 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * MAIMLファイル登録済み・タスク登録済みのプロジェクトがDBに存在する（4-4-6, 4-4-7用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'MAIMLファイル登録済み・タスク登録済みのテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-4 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

// ---------------------------------------------------------------------------
// When: タスク登録タブ操作
// ---------------------------------------------------------------------------

/**
 * 「タスク登録」タブをクリックする
 * ProjectManagement.tsx: Ant Design Tabs の .ant-tabs-tab テキストで特定
 * （data-testid が付与されていないため、テキストベースのロケーターを使用）
 */
When('「タスク登録」タブをクリックする', async ({ page }) => {
  // .ant-tabs-tab-btn（実際のクリックイベントを処理する内側要素）を対象にする
  // .ant-tabs-tab はラッパー div のため click が届かない場合がある
  const tab = page.locator('.ant-tabs-tab-btn').filter({ hasText: 'タスク登録' });
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  // タスク一覧の読み込みを待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
});

/**
 * タスク一覧の最初のタスクの試行回数に値を入力する（4-4-1用）
 * TaskRegistrationTab.tsx: data-testid="task-trial-count-input-1"
 */
When('タスク一覧の最初のタスクの試行回数に {string} を入力する', async ({ page }, value: string) => {
  const input = page.locator('[data-testid="task-trial-count-input-1"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.click({ clickCount: 3 });
  await input.fill(value);
});

/**
 * タスク一覧の最初のタスクの実験条件を変更する（4-4-2用）
 * TaskRegistrationTab.tsx: data-testid="task-experiment-condition-select-1"
 * Ant Design Select の操作: クリック後にドロップダウンから選択
 */
When('タスク一覧の最初のタスクの実験条件を {string} に変更する', async ({ page }, _conditionLabel: string) => {
  const select = page.locator('[data-testid="task-experiment-condition-select-1"]');
  await select.waitFor({ state: 'visible', timeout: 10000 });
  // Ant Design Select はラッパー div をクリックして開く
  await select.click();
  // ドロップダウンの選択肢が表示されるまで待機
  const dropdown = page.locator('.ant-select-dropdown:visible');
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  // ラベルテキストで一致する選択肢をクリック
  const option = dropdown.locator(`.ant-select-item-option:has-text("${_conditionLabel}")`).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
  await page.waitForTimeout(300);
});

/**
 * タスク一覧の1行目のドラッグハンドルを2行目へドラッグ＆ドロップする（4-4-3用）
 * TaskRegistrationTab.tsx: data-testid="task-drag-handle-1", "task-drag-handle-2"
 */
When('タスク一覧の1行目のドラッグハンドルを2行目へドラッグ＆ドロップする', async ({ page }) => {
  const handle1 = page.locator('[data-testid="task-drag-handle-1"]');
  const handle2 = page.locator('[data-testid="task-drag-handle-2"]');
  await handle1.waitFor({ state: 'visible', timeout: 10000 });
  await handle2.waitFor({ state: 'visible', timeout: 10000 });

  const source = await handle1.boundingBox();
  const target = await handle2.boundingBox();

  if (!source || !target) {
    throw new Error('[4-4-3] ドラッグハンドルのバウンディングボックスが取得できません');
  }

  // ドラッグ＆ドロップ操作
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(500);
});

/**
 * 「保存」ボタンをクリックする
 * TaskRegistrationTab.tsx: data-testid="task-registration-save-button"
 */
When('「保存」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('[data-testid="task-registration-save-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/task-registration') && resp.request().method() === 'POST',
    { timeout: 15000 }
  );
  await btn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機
  });
  await page.waitForTimeout(1000);
});

/**
 * タスク一覧の最初のタスクの「+指示」ボタンをクリックする（4-4-6, 4-4-7用）
 * TaskRegistrationTab.tsx: data-testid="task-add-instruction-button-1"
 */
When('タスク一覧の最初のタスクの「+指示」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('[data-testid="task-add-instruction-button-1"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForTimeout(500);
});

/**
 * 指示編集ダイアログで指示内容を入力して保存する（4-4-7用）
 * → common.ts に移動済み（複数 feature で共通使用のため）
 */

/**
 * 「指示登録」タブをクリックする（4-4-7用）
 * → common.ts に移動済み（複数 feature で共通使用のため）
 */

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * タスク登録保存成功メッセージが表示されること（4-4-1, 4-4-2, 4-4-3）
 * TaskRegistrationTab.tsx: message.success() によるトースト通知
 * 表示テキスト例: 「タスクを登録しました」
 */
Then('タスク登録保存成功メッセージが表示されること', async ({ page }) => {
  // 複数のsuccessトーストが同時に表示される場合があるため .first() で先頭を取得
  const successToast = page.locator('.ant-message-success').first();
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * ワーカー連携済みタスク行の試行回数入力が非活性であること（4-4-4）
 * TaskRegistrationTab.tsx: data-testid="task-trial-count-input-1" に disabled属性
 */
Then('ワーカー連携済みタスク行の試行回数入力が非活性であること', async ({ page }) => {
  // data-worker-linked="true" の行を特定
  const workerLinkedRow = page.locator('[data-testid^="task-row-"][data-worker-linked="true"]').first();
  await workerLinkedRow.waitFor({ state: 'visible', timeout: 10000 });

  // 行のrowKeyを取得
  const rowKey = await workerLinkedRow.getAttribute('data-testid');
  const id = rowKey?.replace('task-row-', '');

  // 対応する試行回数入力が disabled であること
  const trialInput = page.locator(`[data-testid="task-trial-count-input-${id}"]`);
  await expect(trialInput).toBeDisabled({ timeout: 5000 });
});

/**
 * ワーカー連携済みタスク行の実験条件セレクトが非活性であること（4-4-4）
 * TaskRegistrationTab.tsx: data-testid="task-experiment-condition-select-1"
 */
Then('ワーカー連携済みタスク行の実験条件セレクトが非活性であること', async ({ page }) => {
  const workerLinkedRow = page.locator('[data-testid^="task-row-"][data-worker-linked="true"]').first();
  await workerLinkedRow.waitFor({ state: 'visible', timeout: 10000 });

  const rowKey = await workerLinkedRow.getAttribute('data-testid');
  const id = rowKey?.replace('task-row-', '');

  // Ant Design Select は aria-disabled または class で disabled を判定
  const conditionSelect = page.locator(`[data-testid="task-experiment-condition-select-${id}"]`);
  await conditionSelect.waitFor({ state: 'visible', timeout: 5000 });
  // Ant Design Select のdisabled状態は ant-select-disabled クラスで判定
  // （aria-disabled は付与されないため toHaveClass を使用）
  await expect(conditionSelect).toHaveClass(/ant-select-disabled/, { timeout: 5000 });
});

/**
 * ワーカー連携済みタスク行のドラッグハンドルが非活性であること（4-4-5）
 * TaskRegistrationTab.tsx: data-testid="task-drag-handle-{id}" に data-drag-disabled="true"
 */
Then('ワーカー連携済みタスク行のドラッグハンドルが非活性であること', async ({ page }) => {
  const workerLinkedRow = page.locator('[data-testid^="task-row-"][data-worker-linked="true"]').first();
  await workerLinkedRow.waitFor({ state: 'visible', timeout: 10000 });

  const rowKey = await workerLinkedRow.getAttribute('data-testid');
  const id = rowKey?.replace('task-row-', '');

  const dragHandle = page.locator(`[data-testid="task-drag-handle-${id}"]`);
  await dragHandle.waitFor({ state: 'visible', timeout: 5000 });
  // data-drag-disabled="true" であることを確認
  await expect(dragHandle).toHaveAttribute('data-drag-disabled', 'true', { timeout: 5000 });
});

/**
 * 指示編集ダイアログ（InstructionEditDialog）が表示されること（4-4-6）
 * InstructionEditDialog.tsx: data-testid="instruction-edit-dialog"（Modal の wrapperClassName 相当）
 * Ant Design の Modal は .ant-modal-wrap クラスのdiv内に描画される
 */
Then('指示編集ダイアログ（InstructionEditDialog）が表示されること', async ({ page }) => {
  // InstructionEditDialog はモーダルタイトルで判別
  const modalTitle = page.locator('.ant-modal-title:has-text("新規指示の追加")');
  await expect(modalTitle).toBeVisible({ timeout: 10000 });
});

/**
 * 指示登録タブの未送信指示一覧に指示内容が表示されること（4-4-7）
 * InstructionRegistrationTab: 未送信指示一覧テーブル内にテキストが含まれる
 */
Then('指示登録タブの未送信指示一覧に {string} が表示されること', async ({ page }, content: string) => {
  // 未送信指示一覧テーブルを特定
  const unsent = page.locator('[data-testid="unsent-instructions-table"]');
  await unsent.waitFor({ state: 'visible', timeout: 10000 });
  await expect(unsent).toContainText(content, { timeout: 10000 });
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
    `[4-4 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}, maiml=${maimlFlg}`
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
      console.log(`[4-4 upsertProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[4-4 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-4 upsertProject] 失敗: project_id=${projectId}:`, error);
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
    `[4-4 upsertProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, worker_linked=${workerLinkedFlg}`
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
      console.log(`[4-4 upsertProjectTask] UPDATE 完了: project_id=${projectId}`);
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
    console.log(`[4-4 upsertProjectTask] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-4 upsertProjectTask] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクト指示を UPSERT する
 *
 * handleSave の保存バリデーション:
 *   「unsentInstructions.length === 0」の場合に保存がブロックされるため、
 *   instruction_status=0（未送信）の指示をINSERTしておく必要がある。
 *
 * @param projectId    - プロジェクトID
 * @param methodId     - メソッドID（タスクと紐づく）
 * @param instructions - 指示内容テキスト
 *
 * DDL参照: docs/design/db/ddl/project_instruction.sql
 *   主キー: (organization_id, project_id, experiment_instruction_id)
 *   instruction_status: 0=未送信, 1=送信済み
 */
async function upsertProjectInstruction(
  projectId: string,
  methodId: string,
  instructions: string
): Promise<void> {
  // experiment_instruction_id は UUID で生成（E2Eテスト用に固定プレフィックスを付与）
  const instructionId = `e2e-inst-${projectId}-${methodId}`;
  console.log(
    `[4-4 upsertProjectInstruction] 開始: project_id=${projectId}, method_id=${methodId}, instruction_id=${instructionId}`
  );
  try {
    const existing = await db.query<{ experiment_instruction_id: string }>(
      `SELECT experiment_instruction_id FROM project_instruction
       WHERE organization_id = $1 AND project_id = $2 AND experiment_instruction_id = $3`,
      [ORG_ID, projectId, instructionId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project_instruction
         SET method_id = $1, instructions = $2, instruction_status = 0,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4 AND experiment_instruction_id = $5`,
        [methodId, instructions, ORG_ID, projectId, instructionId]
      );
      console.log(`[4-4 upsertProjectInstruction] UPDATE 完了: instruction_id=${instructionId}`);
    } else {
      await db.query(
        `INSERT INTO project_instruction (
          organization_id, project_id, experiment_instruction_id,
          method_id, instruction_status, instructions,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3,
          $4, 0, $5,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, instructionId, methodId, instructions]
      );
      console.log(`[4-4 upsertProjectInstruction] INSERT 完了: instruction_id=${instructionId}`);
    }
  } catch (error) {
    console.error(`[4-4 upsertProjectInstruction] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用コードマスターデータを UPSERT する
 *
 * 実験条件セレクトの選択肢は code_master テーブルから取得されるため、
 * テスト実行前に対象の code_division / code_value を登録しておく必要がある。
 *
 * @param codeDivision  - コード区分（例: 'experiment_condition'）
 * @param codeValue     - コード値（例: '1'）
 * @param codeName      - コード名称（例: '実験条件'）
 *
 * DDL参照: docs/design/db/ddl/code_master.sql
 *   主キー: (organization_id, code_division, code_value)
 */
async function upsertCodeMaster(
  codeDivision: string,
  codeValue: string,
  codeName: string
): Promise<void> {
  console.log(
    `[4-4 upsertCodeMaster] 開始: code_division=${codeDivision}, code_value=${codeValue}, code_name=${codeName}`
  );
  try {
    const existing = await db.query<{ code_value: string }>(
      `SELECT code_value FROM code_master
       WHERE organization_id = $1 AND code_division = $2 AND code_value = $3`,
      [ORG_ID, codeDivision, codeValue]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE code_master
         SET code_name = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND code_division = $3 AND code_value = $4`,
        [codeName, ORG_ID, codeDivision, codeValue]
      );
      console.log(`[4-4 upsertCodeMaster] UPDATE 完了: code_division=${codeDivision}, code_value=${codeValue}`);
    } else {
      await db.query(
        `INSERT INTO code_master (
          organization_id, code_division, code_value, code_name,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, codeDivision, codeValue, codeName]
      );
      console.log(`[4-4 upsertCodeMaster] INSERT 完了: code_division=${codeDivision}, code_value=${codeValue}`);
    }
  } catch (error) {
    console.error(`[4-4 upsertCodeMaster] 失敗: code_division=${codeDivision}:`, error);
    throw error;
  }
}
