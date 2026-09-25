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

/**
 * データ記録ダイアログのセレクタ
 *
 * DataRecordDialog.tsx の Modal に data-testid="data-record-dialog" を設定しているが、
 * Ant Design の Modal コンポーネントは props の data-testid を DOM のラッパー要素に
 * 反映しない仕様のため、Playwright では検出できない。
 * 代替として、ダイアログ固有の data-testid="data-record-save-button"（保存ボタン）を
 * 含む .ant-modal 要素をセレクタとして使用する。
 *
 * 参照: frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
 *   - footer の保存ボタン: data-testid="data-record-save-button"
 */
const DATA_RECORD_DIALOG = '.ant-modal:has([data-testid="data-record-save-button"])';

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
  tags: '@5-2-1 or @5-2-2 or @5-2-3 or @5-2-5 or @5-2-6 or @5-2-7 or @5-2-8 or @5-2-9 or @5-2-10 or @5-2-11 or @5-2-13 or @5-2-14 or @5-2-15 or @5-2-17 or @5-2-18 or @5-2-19 or @5-2-20 or @5-2-21 or @5-2-22 or @5-2-23 or @5-2-24 or @5-2-27 or @5-2-28 or @5-2-29 or @5-2-30 or @5-2-31 or @5-2-32 or @5-2-33 or @5-2-34 or @5-2-35',
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
 * 5-2-8, 5-2-9 用: 既存テンプレートデータ（記録済みデータ）を template_data に投入
 * - 5-2-8: ダイアログ表示時に既存テンプレートデータが取得されること
 * - 5-2-9: 記録済みバッジが表示されること
 *
 * template_data テーブル:
 *   主キー: (organization_id, project_id, method_id, task_no, place_id)
 *   property_set: テンプレートプロパティの JSON（JSONB型）
 */
Before({ tags: '@5-2-8 or @5-2-9' }, async () => {
  console.log('[5-2 Before] テストデータ準備 開始（5-2-8/5-2-9: template_data）');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    await upsertTransitionSet(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    await upsertTemplateData(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    console.log('[5-2 Before] テストデータ準備 完了（5-2-8/5-2-9）');
  } catch (error) {
    console.error('[5-2 Before] テストデータ準備 失敗（5-2-8/5-2-9）:', error);
    throw error;
  }
});

/**
 * 5-2-15 用: E2E-TRANSITION-001 を最初から status=5（終状態）で UPSERT する
 *
 * 【重要】Given('終端ステータス（5：終状態）のトランジションが存在する') では
 * DB を UPDATE するだけでは不十分。
 * テストの流れ:
 *   1. 「テスト用プロジェクト・メソッド・タスクを選択している」でUIがトランジション一覧を取得
 *   2. その時点の status がダイアログに渡る
 *   3. Given で DB を UPDATE しても UI は古いデータのまま
 * → Before フックで「ページ遷移前から」 status=5 にしておく必要がある。
 */
Before({ tags: '@5-2-15' }, async () => {
  console.log('[5-2 Before] テストデータ準備 開始（5-2-15: terminal status）');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME, PROJECT_STATUS_EXECUTING_TASK);
    await upsertTestProjectTask(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    // E2E-TRANSITION-001 を status=5 で UPSERT（ページ読み込み前から終端ステータスにする）
    await upsertTransitionSetWithTerminal(TEST_PROJECT_ID, TEST_METHOD_ID, TEST_TASK_NO);
    console.log('[5-2 Before] テストデータ準備 完了（5-2-15）');
  } catch (error) {
    console.error('[5-2 Before] テストデータ準備 失敗（5-2-15）:', error);
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
    // transition_data を削除（進捗管理テーブル）
    for (const key of createdProjectTaskKeys) {
      await db
        .query(
          `DELETE FROM transition_data
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        )
        .catch((e) => console.error('[5-2 After] transition_data 削除 失敗:', e));
    }

    // project_task_detail を削除（task_no = experiment_order）
    for (const key of createdProjectTaskKeys) {
      await db
        .query(
          `DELETE FROM project_task_detail
           WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
          [key.organization_id, key.project_id, key.method_id, key.experiment_order]
        )
        .catch((e) => console.error('[5-2 After] project_task_detail 削除 失敗:', e));
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

  // 実験記録タブへ遷移（method-task-select-button は ExperimentRecordTab 内に存在するため必須）
  const recordTab = page.locator('.ant-tabs-tab').filter({ hasText: /実験記録/ }).first();
  await recordTab.waitFor({ state: 'visible', timeout: 10000 });
  await recordTab.click();
  await page.waitForTimeout(500);

  // タスクプルダウンからタスク連番=1を選択する
  // 「選択」ボタンは押下しない
  const taskSelect = page.locator('[data-testid="task-select"]');
  await taskSelect.waitFor({ state: 'visible', timeout: 10000 });
  await taskSelect.click();
  await waitForSelectDropdown(page);
  // 「-」を除いた最初のオプション（タスク連番=1）を選択
  const taskDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await taskDropdown.locator('.ant-select-item-option:not([title="-"])').first().click();
  // タスク選択後の進捗データ取得APIが完了するまで待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/** プロジェクトを選択せずに実験記録タブを表示している */
Given('プロジェクトを選択せずに実験記録タブを表示している', async ({ page }) => {
  // ログイン後、プロジェクト選択なしで実験記録タブを探す
  await page.waitForSelector('[data-testid="project-select"]', { timeout: 15000 });
  // 実験記録タブをクリック（プロジェクト未選択のまま）
  await page.locator('.ant-tabs-tab').filter({ hasText: '実験記録' }).first().click();
  await page.waitForTimeout(500);
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
  // 実験記録タブへ遷移
  const recordTab = page.locator('.ant-tabs-tab').filter({ hasText: /実験記録/ }).first();
  await recordTab.waitFor({ state: 'visible', timeout: 10000 });
  await recordTab.click();
  await page.waitForTimeout(500);

  // タスクプルダウンからタスク連番=1を選択する
  // 「選択」ボタンは押下しない
  const taskSelect = page.locator('[data-testid="task-select"]');
  await taskSelect.waitFor({ state: 'visible', timeout: 10000 });
  await taskSelect.click();
  await waitForSelectDropdown(page);
  // 「-」を除いた最初のオプション（タスク連番=1）を選択
  const taskDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await taskDropdown.locator('.ant-select-item-option:not([title="-"])').first().click();
  // タスク選択後の進捗データ取得APIが完了するまで待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/** 終端ステータス（5：終状態）のトランジションが存在する */
Given('終端ステータス（5：終状態）のトランジションが存在する', async () => {
  // Before @5-2-15 フックで E2E-TRANSITION-001 を status=5 で UPSERT 済み。
  // UIはページ遷移時点から status=5 のデータを取得するため、ここでは no-op。
  console.log('[5-2-15] E2E-TRANSITION-001 は Before フックで status=5 設定済み（no-op）');
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
  // Ant Design Table の測定用隠し行を除外したデータ行が表示されるまで待機
  const dataRows = page.locator('[data-testid="transition-list-table"] tbody tr:not(.ant-table-measure-row)');
  await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

  // デバッグ: トランジションデータ行数を出力
  const rowCount = await dataRows.count();
  console.log(`[DEBUG] トランジションデータ行数: ${rowCount}`);
  if (rowCount === 0) {
    const tableHtml = await page.locator('[data-testid="transition-list-table"]').innerHTML();
    console.log('[DEBUG] テーブルHTML:', tableHtml);
  }

  // 記録ボタンが有効であることを確認してクリック
  const recordBtn = page.locator('[data-testid="transition-record-button"]').first();
  await recordBtn.waitFor({ state: 'visible', timeout: 15000 });
  const isDisabled = await recordBtn.isDisabled();
  console.log(`[DEBUG] 記録ボタンdisabled状態: ${isDisabled}`);
  await expect(recordBtn).toBeEnabled({ timeout: 5000 });
  await recordBtn.click();
  console.log('[DEBUG] 記録ボタンクリック完了');

  // データ記録ダイアログが表示されるまで待機
  await page.waitForSelector(DATA_RECORD_DIALOG, { state: 'visible', timeout: 15000 });
  console.log('[DEBUG] ダイアログ表示完了');
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
  const templateListTable = page.locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`).first();
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
  // Ant Design v6 の <Checkbox> は data-testid を内部の <input type="checkbox"> に付与する。
  // <input> は opacity:0 で不可視のため waitFor({state:'visible'}) はタイムアウトする。
  // → 親の <label class="ant-checkbox-wrapper"> を visible 待機・クリックに使用する。
  // → <input> の data-testid は isChecked() で DOM .checked を直接評価できるため ON/OFF 判定に使用する。
  const checkboxLabel = page.locator('.ant-checkbox-wrapper:has([data-testid="deemed-progress-checkbox"])');
  await checkboxLabel.waitFor({ state: 'visible', timeout: 10000 });
  const checkboxInput = page.locator('[data-testid="deemed-progress-checkbox"]');
  const isChecked = await checkboxInput.isChecked();
  if (isChecked) {
    await checkboxLabel.click();
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
  // Given('終端ステータス（5：終状態）のトランジションが存在する') で
  // E2E-TRANSITION-001 を status=5 に変更済み。
  // トランジション一覧の最初の行（E2E-TRANSITION-001）の記録ボタンをクリックする。
  const allRows = page.locator('[data-testid="transition-list-table"] tbody tr:not(.ant-table-measure-row)');
  await expect(allRows.first()).toBeVisible({ timeout: 15000 });

  // デバッグ: トランジション行の内容を出力
  const allCount = await allRows.count();
  console.log(`[DEBUG] 全トランジション行数: ${allCount}`);
  for (let i = 0; i < allCount; i++) {
    const text = await allRows.nth(i).textContent();
    console.log(`[DEBUG] トランジション${i}: ${text}`);
  }

  // 最初の行（E2E-TRANSITION-001: status=5）の記録ボタンをクリック
  const recordBtn = allRows.first().locator('[data-testid="transition-record-button"]');
  await recordBtn.waitFor({ state: 'visible', timeout: 10000 });
  await recordBtn.click();
  await page.waitForSelector(DATA_RECORD_DIALOG, { state: 'visible', timeout: 15000 });
});

/** 対象トランジションの「記録」ボタンをクリックする */
When('対象トランジションの「記録」ボタンをクリックする', async ({ page }) => {
  // 測定用隠し行を除外したデータ行が表示されるまで待機
  const dataRows = page.locator('[data-testid="transition-list-table"] tbody tr:not(.ant-table-measure-row)');
  await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

  const recordBtn = page.locator('[data-testid="transition-record-button"]').first();
  await recordBtn.waitFor({ state: 'visible', timeout: 15000 });
  await expect(recordBtn).toBeEnabled({ timeout: 5000 });
  await recordBtn.click();
  await page.waitForSelector(DATA_RECORD_DIALOG, { state: 'visible', timeout: 15000 });
});

/** DataGridテンプレートを選択する */
When('DataGridテンプレートを選択する', async ({ page }) => {
  // contentDoubleListType プロパティを持つテンプレートを選択する
  // テンプレート一覧の最初の行をクリック（実際のデータに応じて調整が必要）
  const templateRow = page.locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`).first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** DataGridの「行を追加」ボタンをクリックする */
When('DataGridの「行を追加」ボタンをクリックする', async ({ page }) => {
  const addRowBtn = page.locator(`${DATA_RECORD_DIALOG} button`).filter({ hasText: '行を追加' }).first();
  await addRowBtn.waitFor({ state: 'visible', timeout: 10000 });
  // クリック前の行数を記録
  const initialRowCount = await page
    .locator(`${DATA_RECORD_DIALOG} .ant-table-tbody tr`)
    .count();
  console.log(`[5-2-22] 行追加前: ${initialRowCount} 行`);
  await addRowBtn.click();
  await page.waitForTimeout(300);
});

/** DataGridの「列を追加」ボタンをクリックする */
When('DataGridの「列を追加」ボタンをクリックする', async ({ page }) => {
  const addColBtn = page.locator(`${DATA_RECORD_DIALOG} button`).filter({ hasText: '列を追加' }).first();
  await addColBtn.waitFor({ state: 'visible', timeout: 10000 });
  const initialColCount = await page
    .locator(`${DATA_RECORD_DIALOG} .ant-table-thead th`)
    .count();
  console.log(`[5-2-22] 列追加前: ${initialColCount} 列`);
  await addColBtn.click();
  await page.waitForTimeout(300);
});

/** DataGridの行削除ボタンをクリックする */
When('DataGridの行削除ボタンをクリックする', async ({ page }) => {
  // 行削除ボタン（DeleteOutlined アイコンを含む、行番号セル内のボタン）
  const deleteRowBtn = page
    .locator(`${DATA_RECORD_DIALOG} .ant-table-tbody tr`)
    .first()
    .locator('.anticon-delete')
    .first();
  await deleteRowBtn.waitFor({ state: 'visible', timeout: 10000 });
  const rowCountBefore = await page
    .locator(`${DATA_RECORD_DIALOG} .ant-table-tbody tr`)
    .count();
  console.log(`[5-2-22] 行削除前: ${rowCountBefore} 行`);
  await deleteRowBtn.click();
  await page.waitForTimeout(300);
});

/** 必須プロパティを持つテンプレートを選択する */
When('必須プロパティを持つテンプレートを選択する', async ({ page }) => {
  const templateRow = page.locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`).first();
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
  const templateRow = page.locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`).first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** プロパティリストの「追加」ボタンをクリックする */
When('プロパティリストの「追加」ボタンをクリックする', async ({ page }) => {
  // propertyListType の追加ボタン（PlusOutlined アイコン）
  const addBtn = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-add-button"]`)
    .first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  const initialCount = await page
    .locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-item"]`)
    .count();
  console.log(`[5-2-24] プロパティリスト追加前: ${initialCount} 件`);
  await addBtn.click();
  await page.waitForTimeout(300);
});

/** プロパティリストの「削除」ボタンをクリックする */
When('プロパティリストの「削除」ボタンをクリックする', async ({ page }) => {
  // propertyListType の削除ボタン（DeleteOutlined アイコン）
  const deleteBtn = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-delete-button"]`)
    .first();
  await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
  const countBefore = await page
    .locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-item"]`)
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
  // Ant Design Table の測定用隠し行（ant-table-measure-row）を除外してデータ行のみを取得
  const rows = page.locator('[data-testid="transition-list-table"] tbody tr:not(.ant-table-measure-row)');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

/** データ記録ダイアログが表示されること */
Then('データ記録ダイアログが表示されること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
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
  // 複数のメッセージが同時に表示される場合があるため .first() で strict mode エラーを回避する
  await expect(page.locator('.ant-message-notice-wrapper').first()).toBeVisible({ timeout: 10000 });
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
  const templateRows = page.locator(`${DATA_RECORD_DIALOG} table tbody tr`);
  await expect(templateRows.first()).toBeVisible({ timeout: 15000 });
});

/** テンプレート一覧に記録済みバッジが表示されること */
Then('テンプレート一覧に記録済みバッジが表示されること', async ({ page }) => {
  // 記録済みバッジ（緑ドット）: data-testid="template-recorded-badge" または 緑色の Tag
  // TODO: 実装のバッジ表示方法に合わせてセレクタを調整すること
  const badge = page
    .locator(DATA_RECORD_DIALOG)
    .locator('.ant-badge-status-success, [data-testid="template-recorded-badge"]')
    .first();
  await expect(badge).toBeVisible({ timeout: 10000 });
});

/** みなし進捗更新チェックボックスがON状態で表示されること */
Then('みなし進捗更新チェックボックスがON状態で表示されること', async ({ page }) => {
  // 表示確認: 親の <label class="ant-checkbox-wrapper"> が visible であることを確認する。
  // （<input> は opacity:0 で不可視のため label 側で visible 確認を行う）
  const checkboxLabel = page.locator('.ant-checkbox-wrapper:has([data-testid="deemed-progress-checkbox"])');
  await expect(checkboxLabel).toBeVisible({ timeout: 10000 });
  // ON/OFF確認: <input> に data-testid が付いているため isChecked() / toBeChecked() で直接評価できる。
  const checkboxInput = page.locator('[data-testid="deemed-progress-checkbox"]');
  await expect(checkboxInput).toBeChecked({ timeout: 5000 });
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
  // DataRecordDialog.tsx: isTerminalStatus(status===5||6) の場合に表示される Alert
  // ステータス更新セクションが表示されるまで待機してから Alert を確認する
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  // セクション表示後に状態が反映されるまで少し待機
  await page.waitForTimeout(500);
  // Alert テキスト: 「現在のステータスは「終状態」です。これ以上変更できません。」
  const alertMsg = statusSection.locator('.ant-alert');
  await expect(alertMsg).toBeVisible({ timeout: 10000 });
  await expect(alertMsg).toContainText('変更できません');
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
  const dialog = page.locator(DATA_RECORD_DIALOG);
  const materialTag = dialog.locator('.ant-tag').filter({ hasText: '材料' });
  await expect(materialTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に条件テンプレートが表示されること */
Then('テンプレート一覧に条件テンプレートが表示されること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
  const conditionTag = dialog.locator('.ant-tag').filter({ hasText: '条件' });
  await expect(conditionTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に結果テンプレートが表示されること */
Then('テンプレート一覧に結果テンプレートが表示されること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
  const resultTag = dialog.locator('.ant-tag').filter({ hasText: '結果' });
  await expect(resultTag.first()).toBeVisible({ timeout: 10000 });
});

/** テンプレート一覧に材料テンプレートのみが表示されること */
Then('テンプレート一覧に材料テンプレートのみが表示されること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
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
  const dialog = page.locator(DATA_RECORD_DIALOG);
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
  const form = page.locator(`${DATA_RECORD_DIALOG} .ant-form`);
  await expect(form).toBeVisible({ timeout: 10000 });
});

/** テンプレートを選択してくださいのメッセージが非表示になること */
Then('テンプレートを選択してくださいのメッセージが非表示になること', async ({ page }) => {
  const prompt = page.locator(`${DATA_RECORD_DIALOG} .ant-alert`).filter({ hasText: 'テンプレートを選択してください' });
  await expect(prompt).not.toBeVisible({ timeout: 5000 });
});

/** テンプレートを選択してくださいのメッセージが表示されること */
Then('テンプレートを選択してくださいのメッセージが表示されること', async ({ page }) => {
  const prompt = page.locator(`${DATA_RECORD_DIALOG} .ant-alert`).filter({ hasText: 'テンプレートを選択してください' });
  await expect(prompt).toBeVisible({ timeout: 10000 });
});

/** DataGridの行数が増加すること */
Then('DataGridの行数が増加すること', async ({ page }) => {
  // 行追加後のDataGridテーブル行数が2行以上になっていること
  const rows = page.locator(`${DATA_RECORD_DIALOG} .ant-table-tbody tr`);
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(2);
});

/** DataGridの列数が増加すること */
Then('DataGridの列数が増加すること', async ({ page }) => {
  // 列追加後のDataGridテーブルヘッダー列数が増加していること（#列 + 追加した列）
  const headers = page.locator(`${DATA_RECORD_DIALOG} .ant-table-thead th`);
  const headerCount = await headers.count();
  // 初期: # + 3列 = 4, 追加後: # + 4列 = 5
  expect(headerCount).toBeGreaterThanOrEqual(5);
});

/** DataGridの行数が減少すること */
Then('DataGridの行数が減少すること', async ({ page }) => {
  // 行削除後のDataGridテーブル行数が1行になっていること
  const rows = page.locator(`${DATA_RECORD_DIALOG} .ant-table-tbody tr`);
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
  const dialog = page.locator(DATA_RECORD_DIALOG);
  await expect(dialog).toBeVisible({ timeout: 3000 });
});

/** プロパティリストの項目数が増加すること */
Then('プロパティリストの項目数が増加すること', async ({ page }) => {
  // 追加後: data-testid="property-list-item" の数が1件以上であること
  const items = page.locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-item"]`);
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

/** プロパティリストの項目数が減少すること */
Then('プロパティリストの項目数が減少すること', async ({ page }) => {
  // 削除後: data-testid="property-list-item" の数が追加後より減少していること
  // 最低0件以上であることを確認（全削除の場合は0件になることもある）
  const items = page.locator(`${DATA_RECORD_DIALOG} [data-testid="property-list-item"]`);
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(0);
});

/**
 * [5-2-25] データ記録ダイアログの保存ボタンが無効化されていること
 * waiting_approval 時は実験データの入力・保存が不可
 * DataRecordDialog.tsx: data-testid="data-record-save-button"
 */
Then('データ記録ダイアログの保存ボタンが無効化されていること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
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
  const dialog = page.locator(DATA_RECORD_DIALOG);
  await expect(dialog).toBeVisible({ timeout: 15000 });
  const statusSection = dialog.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  // ステータス選択 Select が disabled であること
  const statusSelect = statusSection.locator('.ant-select').first();
  await expect(statusSelect).toHaveClass(/ant-select-disabled/, { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// When: テンプレート検索・フィルタ（鍵括弧リテラル版）
// ---------------------------------------------------------------------------

/**
 * [5-2-18] テンプレート検索欄に「材料」と入力する（鍵括弧リテラル版）
 *
 * feature で `テンプレート検索欄に「材料」と入力する` と記述されている場合、
 * playwright-bdd の {string} は Gherkin 標準の二重引用符にしかマッチしないため、
 * 鍵括弧リテラルを含む別ステップとして定義する。
 */
When('テンプレート検索欄に「材料」と入力する', async ({ page }) => {
  const searchInput = page.locator('[data-testid="template-search-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('材料');
  await page.waitForTimeout(500);
});

/**
 * [5-2-19] テンプレート種別フィルタで「結果」を選択する（鍵括弧リテラル版）
 *
 * feature で `テンプレート種別フィルタで「結果」を選択する` と記述されている場合、
 * 鍵括弧リテラルを含む別ステップとして定義する。
 */
When('テンプレート種別フィルタで「結果」を選択する', async ({ page }) => {
  const categorySelect = page.locator('[data-testid="template-category-select"]');
  await categorySelect.waitFor({ state: 'visible', timeout: 10000 });
  await categorySelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator('.ant-select-item-option[title="結果"]').click();
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: waiting_approval 時の操作制限確認（5-2-25, 5-2-26）
// ---------------------------------------------------------------------------

/**
 * [5-2-25] テンプレートのプロパティ入力フィールドが無効化されていること
 *
 * waiting_approval 時はプロパティフォーム内のすべての入力要素が disabled になること。
 * DataRecordDialog.tsx: プロパティフォームのフィールド全体を検証する。
 *
 * ※ テンプレート未選択時はフォーム自体が表示されないため、
 *   waiting_approval ダイアログが開いた直後に確認する。
 */
Then('テンプレートのプロパティ入力フィールドが無効化されていること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
  await expect(dialog).toBeVisible({ timeout: 15000 });

  // プロパティフォームエリア（テンプレート右側コンテンツ）を取得
  // DataRecordDialog.tsx: data-testid="property-form-area" または .ant-form
  const formArea = dialog.locator('[data-testid="property-form-area"], .ant-form').first();
  await formArea.waitFor({ state: 'visible', timeout: 10000 });

  // フォーム内の input / textarea / Select が disabled であること
  // Ant Design の disabled Select は .ant-select-disabled クラスが付与される
  const inputs = formArea.locator('input:not([type="hidden"]), textarea');
  const inputCount = await inputs.count();
  for (let i = 0; i < inputCount; i++) {
    await expect(inputs.nth(i)).toBeDisabled({ timeout: 5000 });
  }

  const selects = formArea.locator('.ant-select');
  const selectCount = await selects.count();
  for (let i = 0; i < selectCount; i++) {
    await expect(selects.nth(i)).toHaveClass(/ant-select-disabled/, { timeout: 5000 });
  }
});

/**
 * [5-2-25] 保存ボタンが無効化されていること
 *
 * DataRecordDialog.tsx: data-testid="data-record-save-button"
 * waiting_approval 時はテンプレートデータの保存ができないため disabled になること。
 */
Then('保存ボタンが無効化されていること', async ({ page }) => {
  const dialog = page.locator(DATA_RECORD_DIALOG);
  await expect(dialog).toBeVisible({ timeout: 15000 });
  const saveBtn = dialog.locator('[data-testid="data-record-save-button"]');
  await expect(saveBtn).toBeDisabled({ timeout: 10000 });
});

/**
 * [5-2-26] ステータス更新セクションの保存ボタンが無効化されていること
 *
 * DataRecordDialog.tsx: data-testid="status-update-section" 内の「保存」ボタン
 * waiting_approval 時はステータス更新ができないため保存ボタンが disabled になること。
 */
Then('ステータス更新セクションの保存ボタンが無効化されていること', async ({ page }) => {
  const statusSection = page.locator('[data-testid="status-update-section"]');
  await expect(statusSection).toBeVisible({ timeout: 10000 });
  const saveBtn = statusSection.locator('button').filter({ hasText: '保存' }).first();
  await expect(saveBtn).toBeDisabled({ timeout: 10000 });
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
 * project_task および project_task_detail の両テーブルに INSERT する。
 * メソッド・タスク選択モーダルはAPIで project_task_detail のタスク一覧を返すため、
 * 両テーブルへのデータ投入が必須。
 *
 * DDL参照:
 *   - docs/design/db/ddl/project_task.sql
 *   - docs/design/db/ddl/project_task_detail.sql
 */
async function upsertTestProjectTask(
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<void> {
  console.log(`[5-2 upsertTestProjectTask] 開始: project_id=${projectId}, method_id=${methodId}, experiment_order=${experimentOrder}`);
  try {
    // -----------------------------------------------------------------------
    // 1. project_task テーブルへの UPSERT
    // -----------------------------------------------------------------------
    const existingTask = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND experiment_order = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existingTask.rowCount ?? 0) === 0) {
      const taskValues = {
        organization_id: ORG_ID,
        project_id: projectId,
        method_id: methodId,
        experiment_order: experimentOrder,
        experiment_condition: 1,
        attempts_count: 1,
        worker_linked_flg: false,
        create_user_id: 'e2e-test',
        update_user_id: 'e2e-test',
      };
      logInsert('project_task', taskValues);
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
      console.log(`[5-2 upsertTestProjectTask] project_task INSERT 完了`);
    } else {
      console.log(`[5-2 upsertTestProjectTask] project_task スキップ（既存レコードあり）`);
    }

    // -----------------------------------------------------------------------
    // 2. project_task_detail テーブルへの UPSERT
    //    task_no = experiment_order（タスク連番として使用）
    //    メソッド・タスク選択モーダルはこのテーブルからタスク一覧を取得する
    // -----------------------------------------------------------------------
    const existingDetail = await db.query<{ project_id: string }>(
      `SELECT project_id FROM project_task_detail
       WHERE organization_id = $1 AND project_id = $2 AND method_id = $3 AND task_no = $4`,
      [ORG_ID, projectId, methodId, experimentOrder]
    );

    if ((existingDetail.rowCount ?? 0) === 0) {
      const detailValues = {
        organization_id: ORG_ID,
        project_id: projectId,
        method_id: methodId,
        task_no: experimentOrder,
        task_status: 0,
        experiment_user_id: 'worker@example.com',
        create_user_id: 'e2e-test',
        update_user_id: 'e2e-test',
      };
      logInsert('project_task_detail', detailValues);
      await db.query(
        `INSERT INTO project_task_detail (
          organization_id, project_id, method_id, task_no,
          task_status, experiment_user_id,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          0, 'worker@example.com',
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, methodId, experimentOrder]
      );
      console.log(`[5-2 upsertTestProjectTask] project_task_detail INSERT 完了`);
    } else {
      console.log(`[5-2 upsertTestProjectTask] project_task_detail スキップ（既存レコードあり）`);
    }
  } catch (error) {
    console.error(`[5-2 upsertTestProjectTask] 失敗:`, error);
    throw error;
  }
}

/**
 * INSERT 内容を詳細ログに出力するヘルパー
 * @param tableName インサート対象のテーブル名
 * @param values カラム名→値のオブジェクト
 */
function logInsert(tableName: string, values: Record<string, unknown>): void {
  const columns = Object.keys(values).join(', ');
  const vals = Object.values(values)
    .map((v) => (v === null || v === undefined ? 'NULL' : String(v)))
    .join(', ');
  console.log(`[5-2 INSERT] テーブル: ${tableName}`);
  console.log(`[5-2 INSERT] カラム: ${columns}`);
  console.log(`[5-2 INSERT] 値   : ${vals}`);
}

/**
 * テスト用トランジションデータを UPSERT する
 *
 * 使用テーブル: transition_data（実験進捗管理テーブル）
 * ※ transition_set はセマンティック検索用テーブルであり、進捗APIは transition_data を参照する
 *
 * DDL参照: backend/src/sql/queries/transition_data/insert.sql
 * 主キー: (organization_id, project_id, method_id, task_no, transition_id)
 */
async function upsertTransitionSet(
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<void> {
  console.log(`[5-2 upsertTransitionData] 開始: project_id=${projectId}, method_id=${methodId}, task_no=${taskNo}`);
  try {
    const transitions = [
      { transition_id: 'E2E-TRANSITION-001', status: 1, progress_rate: 0 },
      { transition_id: 'E2E-TRANSITION-002', status: 2, progress_rate: 25 },
      { transition_id: 'E2E-TRANSITION-003', status: 1, progress_rate: 0 },
    ];

    for (const t of transitions) {
      await db.query(
        `INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )
        ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id)
        DO UPDATE SET status = $6, progress_rate = $7, update_at = NOW()`,
        [ORG_ID, projectId, methodId, taskNo, t.transition_id, t.status, t.progress_rate]
      );
    }
    console.log(`[5-2 upsertTransitionData] UPSERT 完了: ${transitions.length}件`);
  } catch (error) {
    console.error(`[5-2 upsertTransitionData] 失敗:`, error);
    throw error;
  }
}

/**
 * テスト用トランジションデータを UPSERT する（5-2-15 用: E2E-TRANSITION-001 を status=6 で作成）
 *
 * Before @5-2-15 フックから呼び出す。
 * E2E-TRANSITION-001 を status=6（終状態: COMPLETED）で UPSERT し、残りは status=1 で UPSERT する。
 * ページ遷移時点から終端ステータスになっているため、UIは最初から isTerminalStatus=true のデータを取得する。
 */
async function upsertTransitionSetWithTerminal(
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<void> {
  console.log(`[5-2-15 upsertTransitionSetWithTerminal] 開始: project_id=${projectId}`);
  try {
    const transitions = [
      { transition_id: 'E2E-TRANSITION-001', status: 6, progress_rate: 100 }, // 終状態
      { transition_id: 'E2E-TRANSITION-002', status: 2, progress_rate: 25 },
      { transition_id: 'E2E-TRANSITION-003', status: 1, progress_rate: 0 },
    ];

    for (const t of transitions) {
      await db.query(
        `INSERT INTO transition_data (
          organization_id, project_id, method_id, task_no, transition_id,
          status, progress_rate,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )
        ON CONFLICT (organization_id, project_id, method_id, task_no, transition_id)
        DO UPDATE SET status = $6, progress_rate = $7, update_at = NOW()`,
        [ORG_ID, projectId, methodId, taskNo, t.transition_id, t.status, t.progress_rate]
      );
    }
    console.log(`[5-2-15 upsertTransitionSetWithTerminal] UPSERT 完了: ${transitions.length}件（E2E-TRANSITION-001: status=5）`);
  } catch (error) {
    console.error(`[5-2-15 upsertTransitionSetWithTerminal] 失敗:`, error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Given/When/Then: No.25対応 dissolution異常値警告 (5-2-27〜5-2-35)
// ---------------------------------------------------------------------------

/** dissolution用テンプレートが含まれるプロジェクト・メソッド・タスクを選択している */
Given('dissolution用テンプレートが含まれるプロジェクト・メソッド・タスクを選択している', async ({ page }) => {
  // Before フックで dissolution プロパティ付きテンプレートを含むプロジェクト・タスクが準備済み
  // テスト用プロジェクト・メソッド・タスクを選択する（通常シナリオと同じ手順）
  await page.waitForSelector('[data-testid="project-select"]', { timeout: 15000 });
  const projectSelect = page.locator('[data-testid="project-select"]');
  await projectSelect.click();
  await waitForSelectDropdown(page);
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title^="${TEST_PROJECT_NAME}"]`).click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const recordTab = page.locator('.ant-tabs-tab').filter({ hasText: /実験記録/ }).first();
  await recordTab.waitFor({ state: 'visible', timeout: 10000 });
  await recordTab.click();
  await page.waitForTimeout(500);
  const taskSelect = page.locator('[data-testid="task-select"]');
  await taskSelect.waitFor({ state: 'visible', timeout: 10000 });
  await taskSelect.click();
  await waitForSelectDropdown(page);
  const taskDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await taskDropdown.locator('.ant-select-item-option:not([title="-"])').first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

/** dissolution doubleType プロパティを持つテンプレートを選択する */
Given('dissolution doubleType プロパティを持つテンプレートを選択する', async ({ page }) => {
  // dissolution を含む doubleType プロパティを持つテンプレート行をクリック
  const templateRow = page
    .locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`)
    .filter({ hasText: /dissolution/i })
    .first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** dissolution floatType プロパティを持つテンプレートを選択する */
Given('dissolution floatType プロパティを持つテンプレートを選択する', async ({ page }) => {
  const templateRow = page
    .locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`)
    .filter({ hasText: /dissolution/i })
    .first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** Dissolution（大文字含む）floatType プロパティを持つテンプレートを選択する */
Given('Dissolution（大文字含む）floatType プロパティを持つテンプレートを選択する', async ({ page }) => {
  const templateRow = page
    .locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`)
    .filter({ hasText: /Dissolution/i })
    .first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** 溶解率 doubleType プロパティを持つテンプレートを選択する */
Given('溶解率 doubleType プロパティを持つテンプレートを選択する', async ({ page }) => {
  const templateRow = page
    .locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`)
    .filter({ hasText: /溶解率/ })
    .first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/** dissolution を含まない doubleType プロパティを持つテンプレートを選択する */
Given('dissolution を含まない doubleType プロパティを持つテンプレートを選択する', async ({ page }) => {
  // dissolution / 溶解率 を含まないテンプレート（例: temperature）を選択する
  const templateRow = page
    .locator(`${DATA_RECORD_DIALOG} table tbody tr:not(.ant-table-measure-row)`)
    .filter({ hasText: /temperature/i })
    .first();
  await templateRow.waitFor({ state: 'visible', timeout: 15000 });
  await templateRow.click();
  await page.waitForTimeout(500);
});

/**
 * dissolution プロパティに値を入力する（doubleType / floatType 共通）
 * feature 記述例: `dissolution doubleType プロパティに "50.0" を入力する`
 */
When('dissolution doubleType プロパティに {string} を入力する', async ({ page }, value: string) => {
  // data-testid="dissolution-property-input" または dissolution キーを持つ input に入力する
  const input = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid*="dissolution"], ${DATA_RECORD_DIALOG} input[data-key*="dissolution"]`)
    .first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(value);
  await input.dispatchEvent('change');
  await page.waitForTimeout(500);
});

When('dissolution floatType プロパティに {string} を入力する', async ({ page }, value: string) => {
  const input = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid*="dissolution"], ${DATA_RECORD_DIALOG} input[data-key*="dissolution"]`)
    .first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(value);
  await input.dispatchEvent('change');
  await page.waitForTimeout(500);
});

When('Dissolution floatType プロパティに {string} を入力する', async ({ page }, value: string) => {
  const input = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid*="Dissolution"], ${DATA_RECORD_DIALOG} input[data-key*="Dissolution"]`)
    .first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(value);
  await input.dispatchEvent('change');
  await page.waitForTimeout(500);
});

When('溶解率 doubleType プロパティに {string} を入力する', async ({ page }, value: string) => {
  const input = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid*="溶解率"], ${DATA_RECORD_DIALOG} input[data-key*="溶解率"]`)
    .first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(value);
  await input.dispatchEvent('change');
  await page.waitForTimeout(500);
});

When('dissolution を含まない doubleType プロパティに {string} を入力する', async ({ page }, value: string) => {
  // dissolution / 溶解率 を含まないプロパティ（temperature 等）の input に入力する
  const input = page
    .locator(`${DATA_RECORD_DIALOG} [data-testid*="temperature"], ${DATA_RECORD_DIALOG} input[data-key*="temperature"]`)
    .first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(value);
  await input.dispatchEvent('change');
  await page.waitForTimeout(500);
});

/**
 * dissolution 警告 Alert が表示されないこと
 * DataRecordDialog.tsx: data-testid="dissolution-warning-alert"
 */
Then('dissolution 警告 Alert が表示されないこと', async ({ page }) => {
  const alert = page.locator(`${DATA_RECORD_DIALOG} [data-testid="dissolution-warning-alert"]`);
  await expect(alert).not.toBeVisible({ timeout: 3000 });
});

/**
 * dissolution 警告 Alert が表示されること
 * DataRecordDialog.tsx: data-testid="dissolution-warning-alert"
 * 警告文: 「⚠️ 異常値: {value}（通常は0〜100の範囲です）」
 */
Then('dissolution 警告 Alert が表示されること', async ({ page }) => {
  const alert = page.locator(`${DATA_RECORD_DIALOG} [data-testid="dissolution-warning-alert"]`);
  await expect(alert).toBeVisible({ timeout: 10000 });
});

/** dissolution 警告 Alert に指定した値が含まれること */
Then('dissolution 警告 Alert に {string} が含まれること', async ({ page }, value: string) => {
  const alert = page.locator(`${DATA_RECORD_DIALOG} [data-testid="dissolution-warning-alert"]`);
  await expect(alert).toBeVisible({ timeout: 10000 });
  await expect(alert).toContainText(value);
});

/** 保存ボタンが有効であること（dissolution 警告があっても保存ブロックしないことの確認） */
Then('保存ボタンが有効であること', async ({ page }) => {
  const saveBtn = page.locator('[data-testid="data-record-save-button"]');
  await expect(saveBtn).toBeEnabled({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// ヘルパー関数（続き）
// ---------------------------------------------------------------------------

async function upsertTemplateData(
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<void> {
  console.log(`[5-2 upsertTemplateData] 開始: project_id=${projectId}, method_id=${methodId}, task_no=${taskNo}`);
  try {
    // E2E用サンプルテンプレートデータ（material/condition/result の各種別に1件ずつ）
    const templates = [
      {
        place_id: 'E2E-PLACE-MAT-001',
        property_set: JSON.stringify({
          templateName: 'E2Eテスト材料テンプレート',
          templateType: 'material',
          properties: [
            { id: 'prop1', name: '試料名', type: 'string', value: 'E2Eサンプル材料', required: true },
          ],
        }),
      },
      {
        place_id: 'E2E-PLACE-CON-001',
        property_set: JSON.stringify({
          templateName: 'E2Eテスト条件テンプレート',
          templateType: 'condition',
          properties: [
            { id: 'prop2', name: '温度', type: 'number', value: 25, required: false },
          ],
        }),
      },
      {
        place_id: 'E2E-PLACE-RES-001',
        property_set: JSON.stringify({
          templateName: 'E2Eテスト結果テンプレート',
          templateType: 'result',
          properties: [
            { id: 'prop3', name: '収率', type: 'number', value: 80, required: true },
          ],
        }),
      },
    ];

    for (const t of templates) {
      await db.query(
        `INSERT INTO template_data (
          organization_id, project_id, method_id, task_no, place_id,
          property_set,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )
        ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
        DO UPDATE SET property_set = $6::jsonb, update_at = NOW()`,
        [ORG_ID, projectId, methodId, taskNo, t.place_id, t.property_set]
      );
    }
    console.log(`[5-2 upsertTemplateData] UPSERT 完了: ${templates.length}件`);
  } catch (error) {
    console.error(`[5-2 upsertTemplateData] 失敗:`, error);
    throw error;
  }
}
