/**
 * ステップ定義: [4-4] タスク登録
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-4_task_registration.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
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
 * [4-4-1] MAIMLファイル登録済み・チェックアウトなし・タスク未登録
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_task にレコードなし
 */
Before({ tags: '@4-4-1' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-1)');
  try {
    const projectId = 'E2E-4-4-1';
    const projectName = 'E2Eテスト用プロジェクト_4-4-1';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-1)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-1):', error);
    throw error;
  }
});

/**
 * [4-4-2] MAIMLファイル登録済み・チェックアウトなし・タスク未登録
 */
Before({ tags: '@4-4-2' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-2)');
  try {
    const projectId = 'E2E-4-4-2';
    const projectName = 'E2Eテスト用プロジェクト_4-4-2';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    console.log('[4-4 Before] テストデータ準備 完了 (tags: @4-4-2)');
  } catch (error) {
    console.error('[4-4 Before] テストデータ準備 失敗 (tags: @4-4-2):', error);
    throw error;
  }
});

/**
 * [4-4-3] MAIMLファイル登録済み・チェックアウトなし・タスク未登録・メソッド複数
 * - 複数メソッドを含むMAIMLがS3に配置済みであること（前提）
 */
Before({ tags: '@4-4-3' }, async () => {
  console.log('[4-4 Before] テストデータ準備 開始 (tags: @4-4-3)');
  try {
    const projectId = 'E2E-4-4-3';
    const projectName = 'E2Eテスト用プロジェクト_4-4-3';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
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
 * 実験管理者ユーザーがDBに存在する（背景ステップ）
 * → Before フックで準備済みのため no-op
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    console.log(`[4-4 Given] 実験管理者ユーザー "${_userId}" は事前準備済み`);
  }
);

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
// When: ログイン・画面遷移
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 */
When('実験管理者ユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * プロジェクト管理画面が表示されていること
 */
When('プロジェクト管理画面が表示されている', async ({ page }) => {
  await page.waitForSelector('[data-testid="project-management-tab"]', {
    timeout: 15000,
  });
});

// ---------------------------------------------------------------------------
// When: プロジェクト一覧操作
// ---------------------------------------------------------------------------

/**
 * プロジェクト一覧でプロジェクトを選択する
 * ProjectManagement.tsx: data-testid="project-list-table" 内の行
 */
When('プロジェクト一覧でプロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  const table = page.locator('[data-testid="project-list-table"]');
  await table.waitFor({ state: 'visible', timeout: 10000 });
  const row = table.locator(`tr:has-text("${projectName}")`).first();
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.locator('input[type="radio"], .ant-radio-wrapper').first().click();
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// When: タスク登録タブ操作
// ---------------------------------------------------------------------------

/**
 * 「タスク登録」タブをクリックする
 * ProjectManagement.tsx: data-testid="task-registration-tab"
 */
When('「タスク登録」タブをクリックする', async ({ page }) => {
  const tab = page.locator('[data-testid="task-registration-tab"]');
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
 * InstructionEditDialog.tsx: data-testid="instruction-edit-dialog-content"
 *                            data-testid="instruction-edit-dialog-save-button"
 */
When('指示編集ダイアログで指示内容 {string} を入力して保存する', async ({ page }, content: string) => {
  // ダイアログが表示されるまで待機
  const dialog = page.locator('.ant-modal:has([data-testid="instruction-edit-dialog-content"])');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  // 指示内容を入力
  const textarea = page.locator('[data-testid="instruction-edit-dialog-content"]');
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill(content);

  // 保存ボタンをクリック
  const saveBtn = page.locator('[data-testid="instruction-edit-dialog-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await saveBtn.click();
  await page.waitForTimeout(500);
});

/**
 * 「指示登録」タブをクリックする（4-4-7用）
 * ProjectManagement.tsx: data-testid="instruction-registration-tab"
 */
When('「指示登録」タブをクリックする', async ({ page }) => {
  const tab = page.locator('[data-testid="instruction-registration-tab"]');
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * タスク登録保存成功メッセージが表示されること（4-4-1, 4-4-2, 4-4-3）
 * TaskRegistrationTab.tsx: message.success() によるトースト通知
 * 表示テキスト例: 「タスクを登録しました」
 */
Then('タスク登録保存成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
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
  // Ant Design Select のdisabled状態は親要素の .ant-select-disabled クラスで判定
  const selectWrapper = conditionSelect.locator('xpath=ancestor::div[contains(@class,"ant-select")]').first();
  await expect(selectWrapper).toHaveClass(/ant-select-disabled/, { timeout: 5000 });
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
