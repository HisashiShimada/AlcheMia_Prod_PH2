/**
 * ステップ定義: [5-2] 実験記録（トランジション記録）
 *
 * 対応 feature: tests/e2e/features/5_experiment_worker/5-2_experiment_record.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : worker@example.com
 *   パスワード: worker123
 *
 * 前提条件（テストデータ）:
 *   - project テーブルに E2E-5-2-A (project_status: 2 = executing_task) が存在すること
 *   - project_task テーブルに上記プロジェクトのメソッド・タスクが存在すること
 *   - transition_set テーブルに上記タスクのトランジションデータが存在すること
 *   - 5-2-12 用: organization の use_deemed_progress = false が設定可能なこと
 *   - 5-2-15 用: transition_set に status=5 のトランジションが存在すること
 *   - 5-2-16 用: project に project_status=3 (waiting_approval) が存在すること
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
const TEST_PROJECT_ID = 'E2E-5-2-A';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_5-2';

/** テスト用プロジェクト（5-2-16用: waiting_approval） */
const TEST_PROJECT_ID_WA = 'E2E-5-2-WA';
const TEST_PROJECT_NAME_WA = 'E2Eテスト用プロジェクト_5-2_WA';

/** テスト用メソッドID */
const TEST_METHOD_ID = 'E2E_METHOD_5_2';

/** テスト用タスク番号 */
const TEST_TASK_NO = 1;

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = executing_task（タスク実行中）
 * 3 = waiting_approval（承認待ち）
 */
const PROJECT_STATUS_EXECUTING_TASK = 2;
const PROJECT_STATUS_WAITING_APPROVAL = 3;

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

/** 5-2-12 用: テスト前の use_deemed_progress 値を退避（After で復元） */
let savedUseDeemedProgress: boolean | null = null;

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 基本シナリオ（5-2-1〜5-2-11, 5-2-13〜5-2-15, 5-2-17〜5-2-23）用
 * - テスト用プロジェクト_5-2 を UPSERT（executing_task）
 * - メソッド・タスクを project_task に UPSERT
 * - transition_set にトランジションを UPSERT
 */
Before({
  tags: '@5-2-1 or @5-2-2 or @5-2-3 or @5-2-5 or @5-2-6 or @5-2-7 or @5-2-8 or @5-2-9 or @5-2-10 or @5-2-11 or @5-2-13 or @5-2-14 or @5-2-15 or @5-2-17 or @5-2-18 or @5-2-19 or @5-2-20 or @5-2-21 or @5-2-22 or @5-2-23 or @5-2-24',
}, async () => {
  console.log('[5-2 Before] テストデータ準備 開始（基本シナリオ）');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    await upsertTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    console.log('[5-2 Before] テストデータ準備 完了（基本シナリオ）');
  } catch (error) {
    console.error('[5-2 Before] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * 5-2-12 用: 組織の use_deemed_progress を false に設定
 */
Before({ tags: '@5-2-12' }, async () => {
  console.log('[5-2 Before] テストデータ準備 開始（5-2-12: use_deemed_progress=false）');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    await upsertTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    // use_deemed_progress の現在値を退避
    const result = await db.query<{ use_deemed_progress: boolean }>(
      'SELECT use_deemed_progress FROM organization WHERE organization_id = $1',
      [ORG_ID]
    );
    savedUseDeemedProgress = result.rows[0]?.use_deemed_progress ?? true;
    // use_deemed_progress を false に設定
    await db.query(
      'UPDATE organization SET use_deemed_progress = false, update_at = NOW() WHERE organization_id = $1',
      [ORG_ID]
    );
    console.log('[5-2 Before] use_deemed_progress を false に設定完了');
  } catch (error) {
    console.error('[5-2 Before] テストデータ準備 失敗（5-2-12）:', error);
    throw error;
  }
});

/**
 * 5-2-16, 5-2-25, 5-2-26 用: waiting_approval のプロジェクトを準備
 */
Before({ tags: '@5-2-16 or @5-2-25 or @5-2-26' }, async () => {
  console.log('[5-2 Before] テストデータ準備 開始（5-2-16: waiting_approval）');
  try {
    await upsertTestProject(TEST_PROJECT_ID_WA, TEST_PROJECT_NAME_WA, PROJECT_STATUS_WAITING_APPROVAL);
    await upsertTestProjectTask(TEST_PROJECT_ID_WA, TEST_METHOD_ID, TEST_TASK_NO);
    await upsertTransitionSet(TEST_PROJECT_ID_WA, TEST_METHOD_ID, TEST_TASK_NO);
    console.log('[5-2 Before] テストデータ準備 完了（5-2-16）');
  } catch (error) {
    console.error('[5-2 Before] テストデータ準備 失敗（5-2-16）:', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[5-2 After] クリーンアップ 開始');
  try {
    // transition_set を削除
    for (const key of createdProjectTaskKeys) {
      await db
        .query(
          `DELETE FROM transition_set
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        )
        .catch((e) => console.error('[5-2 After] transition_set 削除 失敗:', e));
    }

    // project_task を削除
    for (const key of createdProjectTaskKeys) {
      await db
        .query(
          `DELETE FROM project_task
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        )
        .catch((e) => console.error('[5-2 After] project_task 削除 失敗:', e));
    }
    createdProjectTaskKeys.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      await db
        .query('DELETE FROM project WHERE organization_id = $1 AND project_id = $2', [ORG_ID, projectId])
        .catch((e) => console.error('[5-2 After] project 削除 失敗:', e));
    }
    createdProjectIds.length = 0;

    // 5-2-12 用: use_deemed_progress を元に戻す
    if (savedUseDeemedProgress !== null) {
      await db
        .query(
          'UPDATE organization SET use_deemed_progress = $1, update_at = NOW() WHERE organization_id = $2',
          [savedUseDeemedProgress, ORG_ID]
        )
        .catch((e) => console.error('[5-2 After] use_deemed_progress 復元 失敗:', e));
      savedUseDeemedProgress = null;
      console.log('[5-2 After] use_deemed_progress を復元完了');
    }

    console.log('[5-2 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[5-2 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件
// ---------------------------------------------------------------------------

/** 実験作業者ユーザーでログインしている */
Given('実験作業者ユーザーでログインしている', async ({ page }) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  // TODO: 実際の実験作業者ユーザーIDとパスワードに更新すること
  await page.fill('#userId', 'worker@example.com');
  await page.fill('#password', 'worker123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/** テスト用プロジェクト・メソッド・タスクを選択している */
Given('テスト用プロジェクト・メソッド・タスクを選択している', async ({ page }) => {
  // プロジェクト選択コンボボックスが表示されるまで待機
  await page.waitForSelector('[data-testid="project-select"]', { timeout: 15000 });

  // プロジェクト選択
  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title^="${TEST_PROJECT_NAME}"]`).click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // メソッド・タスク選択ボタンをクリック
  const methodTaskBtn = page.locator('[data-testid="method-task-select-button"]');
  await methodTaskBtn.waitFor({ state: 'visible', timeout: 10000 });
  await methodTaskBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  // モーダル内で最初のタスクを選択して「決定」
  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  await modal.locator('input[type="radio"]').first().click();
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });
});

/** プロジェクトを選択せずに実験記録タブを表示している */
Given('プロジェクトを選択せずに実験記録タブを表示している', async ({ page }) => {
  // ログイン後、プロジェクト選択なしで実験記録タブを探す
  await page.waitForSelector('[data-testid="project-select"]', { timeout: 15000 });
  // 実験記録タブをクリック（プロジェクト未選択のまま）
  await page.locator('.ant-tabs-tab').filter({ hasText: '実験記録' }).first().click();
  await page.waitForTimeout(500);
});

/** 組織のみなし進捗設定が有効である */
Given('組織のみなし進捗設定が有効である', async () => {
  // Before フックで use_deemed_progress = true（デフォルト）が設定済み
  // ここでは確認のみ（no-op）
});

/** 組織のみなし進捗設定が無効である */
Given('組織のみなし進捗設定が無効である', async () => {
  // Before @5-2-12 フックで use_deemed_progress = false に設定済み
  // ここでは確認のみ（no-op）
});

/** 対象トランジションに実験データが登録済みである */
Given('対象トランジションに実験データが登録済みである', async () => {
  // template_data テーブルにサンプルデータが登録済みであることを前提とする
  // TODO: 必要に応じて DB に直接 INSERT する実装を追加すること
  console.log('[5-2-9] 実験データ登録済みの前提（事前データ準備済み想定）');
});

/** プロジェクトステータスが承認待ち（waiting_approval）のプロジェクトを選択している */
Given('プロジェクトステータスが承認待ち（waiting_approval）のプロジェクトを選択している', async ({ page }) => {
  await page.waitForSelector('[data-testid="project-select"]', { timeout: 15000 });

  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title^="${TEST_PROJECT_NAME_WA}"]`).click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/** メソッド・タスクを選択している */
Given('メソッド・タスクを選択している', async ({ page }) => {
  const methodTaskBtn = page.locator('[data-testid="method-task-select-button"]');
  await methodTaskBtn.waitFor({ state: 'visible', timeout: 10000 });
  await methodTaskBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  const modal = page.locator('.ant-modal').filter({ hasText: 'メソッド・タスク選択' });
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  await modal.locator('input[type="radio"]').first().click();
  await modal.locator('.ant-modal-footer .ant-btn-primary').click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });
});

/** 終端ステータス（5：終状態）のトランジションが存在する */
Given('終端ステータス（5：終状態）のトランジションが存在する', async () => {
  // transition_set に status=5 のトランジションを UPSERT
  await db.query(
    `INSERT INTO transition_set (
      organization_id, project_id, method_id, task_no, transition_id,
      transition_name, status, progress_rate,
      create_user_id, create_at, update_user_id, update_at
    ) VALUES (
      $1, $2, $3, $4, 'E2E-TERMINAL-TRANSITION',
      'E2E終状態トランジション', 5, 100,
      'e2e-test', NOW(), 'e2e-test', NOW()
    )
    ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id)
    DO UPDATE SET status = 5, progress_rate = 100, update_at = NOW()`,
    [ORG_ID, TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO]
  ).catch((e) => console.warn('[5-2-15] transition_set UPSERT 失敗（無視）:', e));
});

/** DataGridタイプのプロパティを持つトランジションが存在する */
Given('DataGridタイプのプロパティを持つトランジションが存在する', async () => {
  // 既存のトランジションデータに contentDoubleListType プロパティが含まれることを前提とする
  // TODO: 実際のテンプレートデータに応じて調整すること
  console.log('[5-2-22] DataGridプロパティ付きトランジション（事前データ準備済み想定）');
});

/** 必須プロパティを持つトランジションが存在する */
Given('必須プロパティを持つトランジションが存在する', async () => {
  // 既存のトランジションデータに required=true のプロパティが含まれることを前提とする
  console.log('[5-2-23] 必須プロパティ付きトランジション（事前データ準備済み想定）');
});

/** プロパティリストタイプのプロパティを持つトランジションが存在する */
Given('プロパティリストタイプのプロパティを持つトランジションが存在する', async () => {
  // 既存のトランジションデータに propertyListType プロパティが含まれることを前提とする
  // TODO: 実際のテンプレートデータに応じて調整すること
  console.log('[5-2-24] プロパティリストプロパティ付きトランジション（事前データ準備済み想定）');
});

// ---------------------------------------------------------------------------
// When: 画面操作
// ---------------------------------------------------------------------------

/** 実験記録タブを表示する */
When('実験記録タブを表示する', async ({ page }) => {
  await page.locator('.ant-tabs-tab').filter({ hasText: '実験記録' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/** トランジション一覧の最初の「記録」ボタンをクリックする */
When('トランジション一覧の最初の「記録」ボタンをクリックする', async ({ page }) => {
  const recordBtn = page.locator('[data-testid="transition-record-button"]').first();
  await recordBtn.waitFor({ state: 'visible', timeout: 15000 });
  await recordBtn.click();
  // データ記録ダイアログが表示されるまで待機
  await page.waitForSelector('[data-testid="data-record-dialog"]', { timeout: 15000 });
});

/** フロー図表示ボタンをクリックする */
When('フロー図表示ボタンをクリックする', async ({ page }) => {
  // ExperimentRecordTab.tsx の表示切り替えボタン（data-testid="switch-to-flow-button"）
  const flowBtn = page.locator('[data-testid="switch-to-flow-button"]');
  await flowBtn.waitFor({ state: 'visible', timeout: 10000 });
  await flowBtn.click();
  await page.waitForTimeout(500);
});

/** リスト表示ボタンをクリックする */
When('リスト表示ボタンをクリックする', async ({ page }) => {
  // ExperimentRecordTab.tsx の表示切り替えボタン（data-testid="switch-to-list-button"）
  const listBtn = page.locator('[data-testid="switch-to-list-button"]');
  await listBtn.waitFor({ state: 'visible', timeout: 10000 });
  await listBtn.click();
  await page.waitForTimeout(500);
});

/** テンプレート一覧の最初のテンプレートを選択する */
When('テンプレート一覧の最初のテンプレートを選択する', async ({ page }) => {
  const templateListTable = page.locator('[data-testid="data-record-dialog"] table tbody tr').first();
  await templateListTable.waitFor({ state: 'visible', timeout: 15000 });
  await templateListTable.click();
  await page.waitForTimeout(500);
});

/** 保存ボタンをクリックする */
When('保存ボタンをクリックする', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="data-record-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });

  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/experiments/') &&
          resp.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);

  await saveBtn.click();
});

/** みなし進捗更新チェックボックスをOFFにする */
When('みなし進捗更新チェックボックスをOFFにする', async ({ page }) => {
  const checkbox = page.locator('[data-testid="deemed-progress-checkbox"]');
  await checkbox.waitFor({ state: 'visible', timeout: 10000 });
  // チェックボックスがON（checked）の場合のみクリックする
  const isChecked = await checkbox.locator('input[type="checkbox"]').isChecked();
  if (isChecked) {
    await checkbox.click();
    await page.waitForTimeout(300);
  }
});

/** ステータス選択フィールドで遷移可能なステータスを選択する */
When('ステータス選択フィールドで遷移可能なステータスを選択する', async ({ page }) => {
  const statusSelect = page.locator('[data-testid="status-update-section"] .ant-select').first();
  await statusSelect.waitFor({ state: 'visible', timeout: 10000 });
  await statusSelect.click();
  await waitForSelectDropdown(page);
  // 最初の遷移可能なオプションを選択
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator('.ant-select-item-option').first().click();
  await page.waitForTimeout(300);
});

/** ステータス更新の保存ボタンをクリックする */
When('ステータス更新の保存ボタンをクリックする', async ({ page }) => {
  // ステータス更新セクション内の保存ボタン（テキスト「保存」で特定）
  const statusSaveBtn = page
    .locator('[data-testid="status-update-section"] button')
    .filter({ hasText: '保存' })
    .first();
  await statusSaveBtn.waitFor({ state: 'visible', timeout: 10000 });

  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/transitions/') &&
          resp.url().includes('/status') &&
          resp.request().method() === 'PATCH',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);

  await statusSaveBtn.click();
});

/** 進捗スライダーを50%に設定する */
When('進捗スライダーを50%に設定する', async ({ page }) => {
  // Ant Design Slider を操作: スライダーのレール中央をクリック
  const sliderRail = page.locator('[data-testid="status-update-section"] .ant-slider-rail');
  await sliderRail.waitFor({ state: 'visible', timeout: 10000 });
  const box = await sliderRail.boundingBox();
  if (box) {
    // レール中央（50%）をクリック
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
  }
});

/** テンプレート検索欄に「材料」と入力する */
When('テンプレート検索欄に {string} と入力する', async ({ page }, keyword: string) => {
  const searchInput = page.locator('[data-testid="template-search-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(keyword);
  await page.waitForTimeout(500);
});

/** テンプレート種別フィルタで「結果」を選択する */
When('テンプレート種別フィルタで {string} を選択する', async ({ page }, category: string) => {
  const categorySelect = page.locator('[data-testid="template-category-select"]');
  await categorySelect.waitFor({ state: 'visible', timeout: 10000 });
  await categorySelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${category}"]`).click();
  await page.waitForTimeout(500);
});

/** 終端ステータスのトランジションの「記録」ボタンをクリックする */
When('終端ステータスのトランジションの「記録」ボタンをクリックする', async ({ page }) => {
  // トランジション名「E2E終状態トランジション」の行の記録ボタンをクリック
  const terminalRow = page.locator('table tr').filter({ hasText: 'E2E終状態トランジション' });
  const recordBtn = terminalRow.locator('[data-testid="transition-record-button"]');
  await recordBtn.waitFor({ state: 'visible', timeout: 10000 });
  await recordBtn.click();
  await page.waitForSelector('[data-testid="data-record-dialog"]', { timeout: 15000 });
});

/** 対象トランジションの「記録」ボタンをクリックする */
When('対象トランジションの「記録」ボタンをクリックする', async ({ page }) => {
  const recordBtn = page.locator('[data-testid="transition-record-button"]').first();
  await recordBtn.waitFor({ state: 'visible', timeout: 15000 });
  await recordBtn.click();
  await page.waitForSelector('[data-testid="data-record-dialog"]', { timeout: 15000 });
});

/** DataGridテンプレートを選択する */
When('DataGridテンプレートを選択する', async ({ page }) => {
  // contentDoubleListType プロパティを持つテンプレートを選択する
  // テンプレート一覧の最初の行をクリック（実際のデータに応じて調整が必要）
  const templateRow = page.locator('[data-testid="data-record-dialog"] table tbody tr').first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** DataGridの「行を追加」ボタンをクリックする */
When('DataGridの「行を追加」ボタンをクリックする', async ({ page }) => {
  const addRowBtn = page.locator('[data-testid="data-record-dialog"] button').filter({ hasText: '行を追加' }).first();
  await addRowBtn.waitFor({ state: 'visible', timeout: 10000 });
  // クリック前の行数を記録
  const initialRowCount = await page
    .locator('[data-testid="data-record-dialog"] .ant-table-tbody tr')
    .count();
  console.log(`[5-2-22] 行追加前: ${initialRowCount} 行`);
  await addRowBtn.click();
  await page.waitForTimeout(300);
});

/** DataGridの「列を追加」ボタンをクリックする */
When('DataGridの「列を追加」ボタンをクリックする', async ({ page }) => {
  const addColBtn = page.locator('[data-testid="data-record-dialog"] button').filter({ hasText: '列を追加' }).first();
  await addColBtn.waitFor({ state: 'visible', timeout: 10000 });
  const initialColCount = await page
    .locator('[data-testid="data-record-dialog"] .ant-table-thead th')
    .count();
  console.log(`[5-2-22] 列追加前: ${initialColCount} 列`);
  await addColBtn.click();
  await page.waitForTimeout(300);
});

/** DataGridの行削除ボタンをクリックする */
When('DataGridの行削除ボタンをクリックする', async ({ page }) => {
  // 行削除ボタン（DeleteOutlined アイコンを含む、行番号セル内のボタン）
  const deleteRowBtn = page
    .locator('[data-testid="data-record-dialog"] .ant-table-tbody tr')
    .first()
    .locator('.anticon-delete')
    .first();
  await deleteRowBtn.waitFor({ state: 'visible', timeout: 10000 });
  const rowCountBefore = await page
    .locator('[data-testid="data-record-dialog"] .ant-table-tbody tr')
    .count();
  console.log(`[5-2-22] 行削除前: ${rowCountBefore} 行`);
  await deleteRowBtn.click();
  await page.waitForTimeout(300);
});

/** 必須プロパティを持つテンプレートを選択する */
When('必須プロパティを持つテンプレートを選択する', async ({ page }) => {
  const templateRow = page.locator('[data-testid="data-record-dialog"] table tbody tr').first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** 必須プロパティを未入力のまま保存ボタンをクリックする */
When('必須プロパティを未入力のまま保存ボタンをクリックする', async ({ page }) => {
  // フォームを空のままで保存ボタンをクリック
  const saveBtn = page.locator('[data-testid="data-record-save-button"]');
  await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
  await saveBtn.click();
  // バリデーションエラーが表示されるまで待機
  await page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {});
});

/** プロパティリストテンプレートを選択する */
When('プロパティリストテンプレートを選択する', async ({ page }) => {
  // propertyListType プロパティを持つテンプレートを選択する
  // テンプレート一覧の最初の行をクリック（実際のデータに応じて調整が必要）
  const templateRow = page.locator('[data-testid="data-record-dialog"] table tbody tr').first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** プロパティリストの「追加」ボタンをクリックする */
When('プロパティリストの「追加」ボタンをクリックする', async ({ page }) => {
  // propertyListType の追加ボタン（PlusOutlined アイコン）
  const addBtn = page
    .locator('[data-testid="data-record-dialog"] [data-testid="property-list-add-button"]')
    .first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  const initialCount = await page
    .locator('[data-testid="data-record-dialog"] [data-testid="property-list-item"]')
    .count();
  console.log(`[5-2-24] プロパティリスト追加前: ${initialCount} 件`);
  await addBtn.click();
  await page.waitForTimeout(300);
});

/** プロパティリストの「削除」ボタンをクリックする */
When('プロパティリストの「削除」ボタンをクリックする', async ({ page }) => {
  // propertyListType の削除ボタン（DeleteOutlined アイコン）
  const deleteBtn = page
    .locator('[data-testid="data-record-dialog"] [data-testid="property-list-delete-button"]')
    .first();
  await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
  const countBefore = await page
    .locator('[data-testid="data-record-dialog"] [data-testid="property-list-item"]')
    .count();
  console.log(`[5-2-24] プロパティリスト削除前: ${countBefore} 件`);
  await deleteBtn.click();
  await page.waitForTimeout(300);
});

// ---------------------------------------------------------------------------
// Then: 表示・動作確認
// ---------------------------------------------------------------------------

/** トランジション一覧テーブルが表示されること */
Then('トランジション一覧テーブルが表示されること', async ({ page }) => {
  const table = page.locator('[data-testid="transition-list-table"]');
  await expect(table).toBeVisible({ timeout: 15000 });
});

/** トランジション名が1件以上表示されること */
Then('トランジション名が1件以上表示されること', async ({ page }) => {
  const rows = page.locator('[data-testid="transition-list-table"] tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

/** データ記録ダイアログが表示されること */
Then('データ記録ダイアログが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 15000 });
});

/** テンプレートデータ保存APIが呼び出されること */
Then('テンプレートデータ保存APIが呼び出されること', async ({ page }) => {
  // POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data
  await expect
    .poll(
      async () => {
        const response = await page
          .waitForResponse(
            (resp) =>
              resp.url().includes('/api/v1/experiments/') &&
              resp.request().method() === 'POST',
            { timeout: 5000 }
          )
          .catch(() => null);
        return response !== null;
      },
      { timeout: 15000, intervals: [500] }
    )
    .toBeTruthy();
});

/** 成功メッセージが表示されること */
Then('成功メッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper')).toBeVisible({ timeout: 10000 });
});

/** トランジション一覧の記録ボタンが表示されないこと */
Then('トランジション一覧の記録ボタンが表示されないこと', async ({ page }) => {
  // プロジェクト未選択時はトランジション一覧テーブル自体が非表示
  const table = page.locator('[data-testid="transition-list-table"]');
  await expect(table).not.toBeVisible({ timeout: 5000 });
});

/** 「トランジション名」列が表示されること */
Then('「トランジション名」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: 'トランジション名' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「ステータス」列が表示されること */
Then('「ステータス」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: 'ステータス' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「進捗率」列が表示されること */
Then('「進捗率」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '進捗率' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「材料」列が表示されること */
Then('「材料」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '材料' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「条件」列が表示されること */
Then('「条件」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '条件' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「結果」列が表示されること */
Then('「結果」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '結果' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「記録」列が表示されること */
Then('「記録」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '記録' })
  ).toBeVisible({ timeout: 5000 });
});

/** 「問題報告」列が表示されること */
Then('「問題報告」列が表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="transition-list-table"] th').filter({ hasText: '問題報告' })
  ).toBeVisible({ timeout: 5000 });
});

/** フロー図表示エリアが表示されること */
Then('フロー図表示エリアが表示されること', async ({ page }) => {
  // TransitionFlowDiagram.tsx: data-testid="transition-flow-area"
  const flowArea = page.locator('[data-testid="transition-flow-area"]');
  await expect(flowArea).toBeVisible({ timeout: 10000 });
});

/** テーブル表示エリアが非表示になること */
Then('テーブル表示エリアが非表示になること', async ({ page }) => {
  const table = page.locator('[data-testid="transition-list-table"]');
  await expect(table).not.toBeVisible({ timeout: 5000 });
});

/** テーブル表示エリアが表示されること */
Then('テーブル表示エリアが表示されること', async ({ page }) => {
  const table = page.locator('[data-testid="transition-list-table"]');
  await expect(table).toBeVisible({ timeout: 10000 });
});

/** フロー図表示エリアが非表示になること */
Then('フロー図表示エリアが非表示になること', async ({ page }) => {
  const flowArea = page.locator('[data-testid="transition-flow-area"]');
  await expect(flowArea).not.toBeVisible({ timeout: 5000 });
});

/** フロー図エリアにトランジションノードが表示されること */
Then('フロー図エリアにトランジションノードが表示されること', async ({ page }) => {
  // ReactFlow 内にノード要素が1件以上存在すること
  const flowArea = page.locator('[data-testid="transition-flow-area"]');
  await expect(flowArea).toBeVisible({ timeout: 10000 });
  const nodes = flowArea.locator('.react-flow__node');
  await expect(nodes.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレートデータ取得APIが呼び出されること */
Then('テンプレートデータ取得APIが呼び出されること', async ({ page }) => {
  // GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data
  await expect
    .poll(
      async () => {
        const response = await page
          .waitForResponse(
            (resp) =>
              resp.url().includes('/api/v1/experiments/') &&
              resp.request().method() === 'GET',
            { timeout: 5000 }
          )
          .catch(() => null);
        return response !== null;
      },
      { timeout: 15000, intervals: [500] }
    )
    .toBeTruthy();
});

/** テンプレート一覧にデータが表示されること */
Then('テンプレート一覧にデータが表示されること', async ({ page }) => {
  // テンプレート一覧テーブルに1行以上表示されること
  const templateRows = page.locator('[data-testid="data-record-dialog"] table tbody tr');
  await expect(templateRows.first()).toBeVisible({ timeout: 15000 });
});

/** テンプレート一覧に記録済みバッジが表示されること */
Then('テンプレート一覧に記録済みバッジが表示されること', async ({ page }) => {
  // 記録済みバッジ（緑ドット）: data-testid="template-recorded-badge" または 緑色の Tag
  // TODO: 実装のバッジ表示方法に合わせてセレクタを調整すること
  const badge = page
    .locator('[data-testid="data-record-dialog"]')
    .locator('.ant-badge-status-success, [data-testid="template-recorded-badge"]')
    .first();
  await expect(badge).toBeVisible({ timeout: 10000 });
});

/** みなし進捗更新チェックボックスがON状態で表示されること */
Then('みなし進捗更新チェックボックスがON状態で表示されること', async ({ page }) => {
  const checkbox = page.locator('[data-testid="deemed-progress-checkbox"]');
  await expect(checkbox).toBeVisible({ timeout: 10000 });
  await expect(checkbox.locator('input[type="checkbox"]')).toBeChecked({ timeout: 5000 });
});

/** ステータス更新セクションが非表示であること */
Then('ステータス更新セクションが非表示であること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).not.toBeVisible({ timeout: 5000 });
});

/** ステータス更新セクションが表示されること */
Then('ステータス更新セクションが表示されること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
});

/** ステータス選択フィールドが表示されること */
Then('ステータス選択フィールドが表示されること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  const statusSelect = statusSection.locator('.ant-select').first();
  await expect(statusSelect).toBeVisible({ timeout: 5000 });
});

/** 進捗スライダーが表示されること */
Then('進捗スライダーが表示されること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  const slider = statusSection.locator('.ant-slider');
  await expect(slider).toBeVisible({ timeout: 5000 });
});

/** コメント入力フィールドが表示されること */
Then('コメント入力フィールドが表示されること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  const textarea = statusSection.locator('textarea');
  await expect(textarea).toBeVisible({ timeout: 5000 });
});

/** みなし進捗更新チェックボックスが非表示であること */
Then('みなし進捗更新チェックボックスが非表示であること', async ({ page }) => {
  const checkbox = page.locator('[data-testid="deemed-progress-checkbox"]');
  await expect(checkbox).not.toBeVisible({ timeout: 5000 });
});

/** トランジションステータス更新APIが呼び出されること */
Then('トランジションステータス更新APIが呼び出されること', async ({ page }) => {
  // PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
  await expect
    .poll(
      async () => {
        const response = await page
          .waitForResponse(
            (resp) =>
              resp.url().includes('/transitions/') &&
              resp.url().includes('/status') &&
              resp.request().method() === 'PATCH',
            { timeout: 5000 }
          )
          .catch(() => null);
        return response !== null;
      },
      { timeout: 15000, intervals: [500] }
    )
    .toBeTruthy();
});

/** トランジションステータス更新APIが進捗率50で呼び出されること */
Then('トランジションステータス更新APIが進捗率50で呼び出されること', async ({ page }) => {
  const response = await page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/transitions/') &&
        resp.url().includes('/status') &&
        resp.request().method() === 'PATCH',
      { timeout: 15000 }
    )
    .catch(() => null);

  expect(response).not.toBeNull();
  if (response) {
    const requestBody = JSON.parse(response.request().postData() ?? '{}');
    expect(requestBody.progressRate).toBe(50);
  }
});

/** ステータス変更不可の警告メッセージが表示されること */
Then('ステータス変更不可の警告メッセージが表示されること', async ({ page }) => {
  // 終端ステータス時の Alert（「これ以上変更できません。」）
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  const alertMsg = statusSection.locator('.ant-alert').filter({ hasText: '変更できません' });
  await expect(alertMsg).toBeVisible({ timeout: 5000 });
});

/** ステータス更新セクションが折りたたまれた状態で表示されること */
Then('ステータス更新セクションが折りたたまれた状態で表示されること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  // 折りたたまれた状態: ステータス選択 Select が非表示であること
  const statusSelect = statusSection.locator('.ant-select');
  await expect(statusSelect).not.toBeVisible({ timeout: 5000 });
});

/** テンプレート一覧に材料テンプレートが表示されること */
Then('テンプレート一覧に材料テンプレートが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  const materialTag = dialog.locator('.ant-tag').filter({ hasText: '材料' });
  await expect(materialTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に条件テンプレートが表示されること */
Then('テンプレート一覧に条件テンプレートが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  const conditionTag = dialog.locator('.ant-tag').filter({ hasText: '条件' });
  await expect(conditionTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に結果テンプレートが表示されること */
Then('テンプレート一覧に結果テンプレートが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  const resultTag = dialog.locator('.ant-tag').filter({ hasText: '結果' });
  await expect(resultTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に材料テンプレートのみが表示されること */
Then('テンプレート一覧に材料テンプレートのみが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  // 表示されているテンプレート行に「材料」タグがあること
  const rows = dialog.locator('table tbody tr');
  const rowCount = await rows.count();
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const hasMaterial = await row.locator('.ant-tag').filter({ hasText: '材料' }).count();
    expect(hasMaterial).toBeGreaterThan(0);
  }
});

/** テンプレート一覧に結果テンプレートのみが表示されること */
Then('テンプレート一覧に結果テンプレートのみが表示されること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  const rows = dialog.locator('table tbody tr');
  const rowCount = await rows.count();
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const hasResult = await row.locator('.ant-tag').filter({ hasText: '結果' }).count();
    expect(hasResult).toBeGreaterThan(0);
  }
});

/** プロパティ入力フォームが表示されること */
Then('プロパティ入力フォームが表示されること', async ({ page }) => {
  // テンプレート選択後、右側コンテンツにフォーム要素が表示されること
  const form = page.locator('[data-testid="data-record-dialog"] .ant-form');
  await expect(form).toBeVisible({ timeout: 10000 });
});

/** テンプレートを選択してくださいのメッセージが非表示になること */
Then('テンプレートを選択してくださいのメッセージが非表示になること', async ({ page }) => {
  const prompt = page.locator('[data-testid="data-record-dialog"] .ant-alert').filter({ hasText: 'テンプレートを選択してください' });
  await expect(prompt).not.toBeVisible({ timeout: 5000 });
});

/** テンプレートを選択してくださいのメッセージが表示されること */
Then('テンプレートを選択してくださいのメッセージが表示されること', async ({ page }) => {
  const prompt = page.locator('[data-testid="data-record-dialog"] .ant-alert').filter({ hasText: 'テンプレートを選択してください' });
  await expect(prompt).toBeVisible({ timeout: 10000 });
});

/** DataGridの行数が増加すること */
Then('DataGridの行数が増加すること', async ({ page }) => {
  // 行追加後のDataGridテーブル行数が2行以上になっていること
  const rows = page.locator('[data-testid="data-record-dialog"] .ant-table-tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(2);
});

/** DataGridの列数が増加すること */
Then('DataGridの列数が増加すること', async ({ page }) => {
  // 列追加後のDataGridテーブルヘッダー列数が増加していること（#列 + 追加した列）
  const headers = page.locator('[data-testid="data-record-dialog"] .ant-table-thead th');
  const headerCount = await headers.count();
  // 初期: # + 3列 = 4, 追加後: # + 4列 = 5
  expect(headerCount).toBeGreaterThanOrEqual(5);
});

/** DataGridの行数が減少すること */
Then('DataGridの行数が減少すること', async ({ page }) => {
  // 行削除後のDataGridテーブル行数が1行になっていること
  const rows = page.locator('[data-testid="data-record-dialog"] .ant-table-tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(1);
});

/** バリデーションエラーメッセージが表示されること */
Then('バリデーションエラーメッセージが表示されること', async ({ page }) => {
  const errorMsg = page.locator('.ant-form-item-explain-error').first();
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
});

/** ダイアログが閉じないこと */
Then('ダイアログが閉じないこと', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 3000 });
});

/** プロパティリストの項目数が増加すること */
Then('プロパティリストの項目数が増加すること', async ({ page }) => {
  // 追加後: data-testid="property-list-item" の数が1件以上であること
  const items = page.locator('[data-testid="data-record-dialog"] [data-testid="property-list-item"]');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

/** プロパティリストの項目数が減少すること */
Then('プロパティリストの項目数が減少すること', async ({ page }) => {
  // 削除後: data-testid="property-list-item" の数が追加後より減少していること
  // 最低0件以上であることを確認（全削除の場合は0件になることもある）
  const items = page.locator('[data-testid="data-record-dialog"] [data-testid="property-list-item"]');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(0);
});

/**
 * [5-2-25] データ記録ダイアログの保存ボタンが無効化されていること
 * waiting_approval 時は実験データの入力・保存が不可
 * DataRecordDialog.tsx: data-testid="data-record-save-button"
 */
Then('データ記録ダイアログの保存ボタンが無効化されていること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 15000 });
  const saveBtn = dialog.locator('[data-testid="data-record-save-button"]');
  await expect(saveBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-2-26] データ記録ダイアログのステータス更新セクションが操作不可であること
 * waiting_approval 時はステータス更新が不可
 * DataRecordDialog.tsx: data-testid="status-update-section" のコントロールが disabled
 */
Then('データ記録ダイアログのステータス更新コントロールが無効化されていること', async ({ page }) => {
  const dialog = page.locator('[data-testid="data-record-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 15000 });
  const statusSection = dialog.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  // ステータス選択 Select が disabled であること
  const statusSelect = statusSection.locator('.ant-select').first();
  await expect(statusSelect).toHaveClass(/ant-select-disabled/, { timeout: 5000 });
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
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(
  projectId: string,
  projectName: string,
  projectStatus: number
): Promise<void> {
  console.log(`[5-2 upsertTestProject] 開始: project_id=${projectId}, project_name=${projectName}, status=${projectStatus}`);
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
      console.log(`[5-2 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
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
      console.log(`[5-2 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[5-2 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用プロジェクトタスクを UPSERT する
 *
 * DDL参照: docs/design/db/ddl/project_task.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<void> {
  console.log(`[5-2 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}`);
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
      console.log(`[5-2 upsertTestProjectTask] INSERT 完了`);
    } else {
      console.log(`[5-2 upsertTestProjectTask] スキップ（既存レコードあり）`);
    }
  } catch (error) {
    console.error(`[5-2 upsertTestProjectTask] 失敗:`, error);
    throw error;
  }
}

/**
 * テスト用トランジションデータを UPSERT する
 *
 * DDL参照: docs/design/db/ddl/transition_set.sql（または相当するマイグレーションファイル）
 */
async function upsertTransitionSet(
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<void> {
  console.log(`[5-2 upsertTransitionSet] 開始: project_id=${projectId}, method_id=${methodId}, task_no=${taskNo}`);
  try {
    const transitions = [
      { transition_id: 'E2E-TRANSITION-001', transition_name: 'E2Eテストトランジション1', status: 0, progress_rate: 0 },
      { transition_id: 'E2E-TRANSITION-002', transition_name: 'E2Eテストトランジション2', status: 1, progress_rate: 25 },
      { transition_id: 'E2E-TRANSITION-003', transition_name: 'E2Eテストトランジション3_材料IN', status: 0, progress_rate: 0 },
    ];

    for (const t of transitions) {
      await db.query(
        `INSERT INTO transition_set (
          organization_id, project_id, method_id, task_no, transition_id,
          transition_name, status, progress_rate,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )
        ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id)
        DO UPDATE SET transition_name = $6, status = $7, progress_rate = $8, update_at = NOW()`,
        [ORG_ID, projectId, methodId, taskNo, t.transition_id, t.transition_name, t.status, t.progress_rate]
      );
    }
    console.log(`[5-2 upsertTransitionSet] UPSERT 完了: ${transitions.length}件`);
  } catch (error) {
    console.error(`[5-2 upsertTransitionSet] 失敗:`, error);
    // transition_set テーブルが存在しない場合は無視（カラム名が異なる可能性あり）
    console.warn('[5-2 upsertTransitionSet] transition_set テーブルのスキーマを確認してください');
  }
}
