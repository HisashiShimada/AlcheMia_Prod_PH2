/**
 * ステップ定義: [4-5] 指示登録・送信
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-5_instruction_registration.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project / project_task / project_instruction テーブルを UPSERT して準備する
 *   - 4-5-1: チェックアウト済み・タスク登録済み・未送信指示0件プロジェクト
 *   - 4-5-2: チェックアウト済み・未送信指示1件プロジェクト
 *   - 4-5-3: チェックアウト済み・未送信指示1件プロジェクト
 *   - 4-5-4: チェックアウト済み・送信済み指示1件プロジェクト
 *   - 4-5-5: チェックアウト済み・指示0件プロジェクト
 *   - 4-5-6: チェックアウト済み・未送信指示1件・送信済み指示1件プロジェクト
 *
 * ビジネスルール（設計書より）:
 *   - 送信済みの指示は編集・削除不可（読み取り専用になる）
 *   - 指示が0件の場合は一括送信ボタンが無効化される
 *   - 送信と同時に project_instruction レコードが生成される
 *
 * data-testid 一覧（InstructionRegistrationTab.tsx）:
 *   - [instruction-bulk-send-button]         : 一括送信ボタン
 *   - [instruction-status-summary]           : 指示登録状況サマリー（件数テキスト）
 *   - [instruction-edit-button-{id}]         : 各指示の編集ボタン（未送信のみ）
 *   - [instruction-delete-button-{id}]       : 各指示の削除ボタン（未送信のみ）
 *   - [instruction-detail-button-{id}]       : 各指示の詳細ボタン（送信済みのみ）
 *
 * data-testid 一覧（InstructionEditDialog.tsx / 4-4より流用）:
 *   - [instruction-edit-dialog-content]      : 指示内容テキストエリア
 *   - [instruction-edit-dialog-save-button]  : ダイアログ内保存ボタン
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
 * [4-5-1] チェックアウト済み・タスク登録済み・未送信指示0件
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_task に worker_linked_flg=false のタスクを1件挿入
 * - project_instruction は0件
 */
Before({ tags: '@4-5-1' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-1)');
  try {
    const projectId = 'E2E-4-5-1';
    const projectName = 'E2Eテスト用プロジェクト_4-5-1';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    // 既存の指示を全削除してクリーンな状態にする
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-1)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-1):', error);
    throw error;
  }
});

/**
 * [4-5-2] チェックアウト済み・未送信指示1件
 * - project_status=0, checkout_status=0, project_maiml_flg=true
 * - project_instruction に is_sent=false の指示を1件挿入
 */
Before({ tags: '@4-5-2' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-2)');
  try {
    const projectId = 'E2E-4-5-2';
    const projectName = 'E2Eテスト用プロジェクト_4-5-2';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    await insertInstruction(projectId, 'method_001', 'E2Eテスト用指示内容（編集前）', false);
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-2)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-2):', error);
    throw error;
  }
});

/**
 * [4-5-3] チェックアウト済み・未送信指示1件
 * - project_instruction に is_sent=false の指示を1件挿入
 */
Before({ tags: '@4-5-3' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-3)');
  try {
    const projectId = 'E2E-4-5-3';
    const projectName = 'E2Eテスト用プロジェクト_4-5-3';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    await insertInstruction(projectId, 'method_001', 'E2Eテスト用削除対象指示', false);
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-3)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-3):', error);
    throw error;
  }
});

/**
 * [4-5-4] チェックアウト済み・送信済み指示1件
 * - project_instruction に is_sent=true の指示を1件挿入
 */
Before({ tags: '@4-5-4' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-4)');
  try {
    const projectId = 'E2E-4-5-4';
    const projectName = 'E2Eテスト用プロジェクト_4-5-4';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    await insertInstruction(projectId, 'method_001', 'E2Eテスト用送信済み指示', true);
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-4)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-4):', error);
    throw error;
  }
});

/**
 * [4-5-5] チェックアウト済み・指示0件
 * - project_instruction は0件
 */
Before({ tags: '@4-5-5' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-5)');
  try {
    const projectId = 'E2E-4-5-5';
    const projectName = 'E2Eテスト用プロジェクト_4-5-5';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-5)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-5):', error);
    throw error;
  }
});

/**
 * [4-5-6] チェックアウト済み・未送信指示1件・送信済み指示1件
 * - project_instruction に is_sent=false 1件 + is_sent=true 1件 挿入
 */
Before({ tags: '@4-5-6' }, async () => {
  console.log('[4-5 Before] テストデータ準備 開始 (tags: @4-5-6)');
  try {
    const projectId = 'E2E-4-5-6';
    const projectName = 'E2Eテスト用プロジェクト_4-5-6';
    await upsertProject(projectId, projectName, PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_IN, true);
    await upsertProjectTask(projectId, 'method_001', 1, false);
    await db.query(
      'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );
    await insertInstruction(projectId, 'method_001', 'E2Eテスト用未送信指示', false);
    await insertInstruction(projectId, 'method_001', 'E2Eテスト用送信済み指示', true);
    console.log('[4-5 Before] テストデータ準備 完了 (tags: @4-5-6)');
  } catch (error) {
    console.error('[4-5 Before] テストデータ準備 失敗 (tags: @4-5-6):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-5 After] クリーンアップ 開始');
  try {
    for (const projectId of createdProjectIds) {
      try {
        // project_instruction を先に削除（外部キー制約）
        await db.query(
          'DELETE FROM project_instruction WHERE organization_id = $1 AND project_id = $2',
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
        console.log(`[4-5 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-5 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;
    console.log('[4-5 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-5 After] クリーンアップ 失敗:', error);
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
 * ※ 4-4_task_registration.ts でも同一ステップが定義されているため、
 *    cucumber-playwright が重複登録を避けるため本ファイルでは定義しない。
 *    背景の前提ステップは 4-4 側の定義が自動適用される。
 */

/**
 * チェックアウト済み・タスク登録済み・未送信指示0件のプロジェクトがDBに存在する（4-5-1用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済み・タスク登録済み・未送信指示0件のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-5 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済み・未送信指示1件のプロジェクトがDBに存在する（4-5-2, 4-5-3用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済み・未送信指示1件のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-5 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済み・送信済み指示1件のプロジェクトがDBに存在する（4-5-4用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済み・送信済み指示1件のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-5 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済み・指示0件のプロジェクトがDBに存在する（4-5-5用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済み・指示0件のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-5 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

/**
 * チェックアウト済み・未送信指示1件・送信済み指示1件のプロジェクトがDBに存在する（4-5-6用）
 * → Before フックで準備済みのため no-op
 */
Given(
  'チェックアウト済み・未送信指示1件・送信済み指示1件のテスト用プロジェクト {string} がDBに存在する',
  async ({}, _projectName: string) => {
    console.log(`[4-5 Given] テスト用プロジェクト "${_projectName}" は Before フックで準備済み`);
  }
);

// ---------------------------------------------------------------------------
// When: 指示登録タブ操作
// ---------------------------------------------------------------------------

/**
 * 「+指示追加」ボタンをクリックする（4-5-1用）
 * InstructionRegistrationTab.tsx には現在 +指示追加ボタンがないため、
 * タスク登録タブの「+指示」ボタン経由で追加する代替フローを想定。
 * 実装後に data-testid="instruction-add-button" を追加することを推奨。
 *
 * NOTE: 現状の InstructionRegistrationTab には直接の「+指示追加」ボタンがない。
 *       フロントエンドに追加される場合は data-testid="instruction-add-button" で操作する。
 *       現時点では TaskRegistrationTab の「+指示」ボタン経由での指示追加フローを使用する。
 */
When('「+指示追加」ボタンをクリックする', async ({ page }) => {
  // 指示登録タブに直接の追加ボタンがない場合は
  // タスク登録タブを経由して指示を追加する代替フロー
  // → タスク登録タブに切り替え → +指示ボタンをクリック
  const taskTab = page.locator('[data-testid="task-registration-tab"]');
  await taskTab.waitFor({ state: 'visible', timeout: 10000 });
  await taskTab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);

  const addInstructionBtn = page.locator('[data-testid="task-add-instruction-button-1"]');
  await addInstructionBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addInstructionBtn.click();
  await page.waitForTimeout(500);
});

/**
 * 指示編集ダイアログで指示内容を入力して保存する（4-5-1, 4-5-2用）
 * InstructionEditDialog.tsx: data-testid="instruction-edit-dialog-content"
 *                            data-testid="instruction-edit-dialog-save-button"
 * ※ 4-4_task_registration.ts で同一ステップ定義済み。
 *    playwright-bdd はステップ名が一致する場合は先に登録された定義を優先するため、
 *    本ファイルでの再定義を省略する。
 */

/**
 * 「一括送信」ボタンをクリックする（4-5-1用）
 * InstructionRegistrationTab.tsx: data-testid="instruction-bulk-send-button"
 */
When('「一括送信」ボタンをクリックする', async ({ page }) => {
  // 指示登録タブに戻る
  const instrTab = page.locator('[data-testid="instruction-registration-tab"]');
  await instrTab.waitFor({ state: 'visible', timeout: 10000 });
  await instrTab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);

  const sendBtn = page.locator('[data-testid="instruction-bulk-send-button"]');
  await sendBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/instructions/send') && resp.request().method() === 'POST',
    { timeout: 15000 }
  );
  await sendBtn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機
  });
  await page.waitForTimeout(1000);
});

/**
 * 最初の未送信指示の「編集」ボタンをクリックする（4-5-2用）
 * InstructionRegistrationTab.tsx: data-testid="instruction-edit-button-{id}"
 */
When('最初の未送信指示の「編集」ボタンをクリックする', async ({ page }) => {
  // 未送信の編集ボタン（data-testid が instruction-edit-button-* の最初の要素）
  const editBtn = page.locator('[data-testid^="instruction-edit-button-"]').first();
  await editBtn.waitFor({ state: 'visible', timeout: 10000 });
  await editBtn.click();
  await page.waitForTimeout(500);
});

/**
 * 最初の未送信指示の「削除」ボタンをクリックする（4-5-3用）
 * InstructionRegistrationTab.tsx: data-testid="instruction-delete-button-{id}"
 */
When('最初の未送信指示の「削除」ボタンをクリックする', async ({ page }) => {
  const deleteBtn = page.locator('[data-testid^="instruction-delete-button-"]').first();
  await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンスを並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/instructions/') &&
      resp.request().method() === 'DELETE',
    { timeout: 15000 }
  );
  await deleteBtn.click();
  await responsePromise.catch(() => {
    // API レスポンスが来ない場合はトースト表示を待機
  });
  await page.waitForTimeout(1000);
});

// ---------------------------------------------------------------------------
// Then: 表示確認
// ---------------------------------------------------------------------------

/**
 * 指示一括送信成功メッセージが表示されること（4-5-1）
 * InstructionRegistrationTab.tsx: message.success() によるトースト通知
 */
Then('指示一括送信成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * 指示一覧の指示が送信済み状態で表示されること（4-5-1）
 * 送信済みになると、編集・削除ボタンが非表示になり、詳細ボタンが表示される。
 * InstructionRegistrationTab.tsx: data-testid="instruction-detail-button-{id}"
 */
Then('指示一覧の指示が送信済み状態で表示されること', async ({ page }) => {
  // 詳細ボタン（送信済みのみ表示）が1件以上表示されていること
  const detailBtn = page.locator('[data-testid^="instruction-detail-button-"]').first();
  await expect(detailBtn).toBeVisible({ timeout: 10000 });

  // 編集・削除ボタンが存在しないこと
  const editBtn = page.locator('[data-testid^="instruction-edit-button-"]').first();
  await expect(editBtn).not.toBeVisible({ timeout: 5000 });
});

/**
 * 指示更新成功メッセージが表示されること（4-5-2）
 */
Then('指示更新成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * 指示一覧に指定テキストが表示されること（4-5-2）
 * InstructionRegistrationTab.tsx: Table 内のコンテンツテキスト
 */
Then('指示一覧に {string} が表示されること', async ({ page }, content: string) => {
  const table = page.locator('.ant-table-tbody');
  await table.waitFor({ state: 'visible', timeout: 10000 });
  await expect(table).toContainText(content, { timeout: 10000 });
});

/**
 * 指示削除成功メッセージが表示されること（4-5-3）
 */
Then('指示削除成功メッセージが表示されること', async ({ page }) => {
  const successToast = page.locator('.ant-message-success');
  await expect(successToast).toBeVisible({ timeout: 10000 });
});

/**
 * 指示一覧が空であること（4-5-3）
 * InstructionRegistrationTab.tsx: Empty コンポーネントが表示される
 */
Then('指示一覧が空であること', async ({ page }) => {
  const emptyState = page.locator('.ant-empty');
  await expect(emptyState).toBeVisible({ timeout: 10000 });
});

/**
 * 送信済み指示行に削除ボタンが表示されないこと（4-5-4）
 * InstructionRegistrationTab.tsx: isSent=true の行には instruction-delete-button-* が存在しない
 */
Then('送信済み指示行に削除ボタンが表示されないこと', async ({ page }) => {
  const deleteBtn = page.locator('[data-testid^="instruction-delete-button-"]');
  // 削除ボタンが1件もDOMに存在しないこと（送信済みのみのため）
  await expect(deleteBtn).toHaveCount(0, { timeout: 10000 });
});

/**
 * 送信済み指示行に詳細ボタンが表示されること（4-5-4）
 * InstructionRegistrationTab.tsx: data-testid="instruction-detail-button-{id}"
 */
Then('送信済み指示行に詳細ボタンが表示されること', async ({ page }) => {
  const detailBtn = page.locator('[data-testid^="instruction-detail-button-"]').first();
  await expect(detailBtn).toBeVisible({ timeout: 10000 });
});

/**
 * 「一括送信」ボタンが非活性であること（4-5-5）
 * InstructionRegistrationTab.tsx: data-testid="instruction-bulk-send-button" が disabled
 */
Then('「一括送信」ボタンが非活性であること', async ({ page }) => {
  const sendBtn = page.locator('[data-testid="instruction-bulk-send-button"]');
  await sendBtn.waitFor({ state: 'visible', timeout: 10000 });
  await expect(sendBtn).toBeDisabled({ timeout: 5000 });
});

/**
 * 指示登録状況に合計件数が表示されること（4-5-6）
 * InstructionRegistrationTab.tsx: data-testid="instruction-status-summary"
 * 表示テキスト例: 「指示: 2件」
 */
Then('指示登録状況に合計件数 {string} が表示されること', async ({ page }, count: string) => {
  const summary = page.locator('[data-testid="instruction-status-summary"]');
  await summary.waitFor({ state: 'visible', timeout: 10000 });
  await expect(summary).toContainText(count, { timeout: 10000 });
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
    `[4-5 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}, maiml=${maimlFlg}`
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
      console.log(`[4-5 upsertProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[4-5 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-5 upsertProject] 失敗: project_id=${projectId}:`, error);
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
    `[4-5 upsertProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, worker_linked=${workerLinkedFlg}`
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
      console.log(`[4-5 upsertProjectTask] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[4-5 upsertProjectTask] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-5 upsertProjectTask] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用指示を INSERT する
 *
 * @param projectId  - プロジェクトID
 * @param methodId   - メソッドID
 * @param content    - 指示内容
 * @param isSent     - 送信済みフラグ（true=送信済み, false=未送信）
 *
 * DDL参照: docs/design/db/ddl/project_instruction.sql（またはmigration SQL）
 * 参照migration: backend/migrations/20260224_add_instruction_status.sql
 */
async function insertInstruction(
  projectId: string,
  methodId: string,
  content: string,
  isSent: boolean
): Promise<void> {
  console.log(
    `[4-5 insertInstruction] 開始: project_id=${projectId}, is_sent=${isSent}, content="${content}"`
  );
  try {
    await db.query(
      `INSERT INTO project_instruction (
        organization_id, project_id, method_id,
        priority, type, content, is_sent,
        create_user_id, create_at, update_user_id, update_at
      ) VALUES (
        $1, $2, $3,
        1, 0, $4, $5,
        'e2e-test', NOW(), 'e2e-test', NOW()
      )`,
      [ORG_ID, projectId, methodId, content, isSent]
    );
    console.log(`[4-5 insertInstruction] INSERT 完了: project_id=${projectId}, is_sent=${isSent}`);
  } catch (error) {
    console.error(`[4-5 insertInstruction] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
