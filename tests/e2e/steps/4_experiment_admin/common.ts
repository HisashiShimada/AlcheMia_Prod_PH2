/**
 * 実験管理者機能の共通ステップ定義
 *
 * 複数の feature ファイルで共有するステップを一元管理する。
 * 各ステップファイルに重複定義すると playwright-bdd が
 * "Multiple definitions matched scenario step" エラーを発生させるため、
 * このファイルで一度だけ定義する。
 */

import { createBdd } from 'playwright-bdd';

const { Given, When } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/** テスト用ユーザー（実験管理者）
 * TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
 */
const ADMIN_EMAIL = 'exp.admin@example.com';
const ADMIN_PASSWORD = 'expAdmin123';

// ---------------------------------------------------------------------------
// 背景（no-op）
// ---------------------------------------------------------------------------

/**
 * 前提: 実験管理者のユーザIDがDB（organization_userテーブル）に存在する
 * → テスト用ユーザーは事前にDBに存在することを前提とするため何もしない
 *
 * TODO: 実際のユーザーIDに要更新（exp.admin@example.com は仮値）
 *
 * 参照 feature:
 *   - features/4_experiment_admin/4-1_project_create_file_operation.feature
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);

// ---------------------------------------------------------------------------
// 共通 When ステップ（複数 feature で使用）
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 * 複数の feature（4-1, 4-5, 4-6 等）で共通使用
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 */
When('実験管理者ユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // 「編集中のデータが見つかりました」ダイアログが表示された場合は「復元しない」をクリックする
  // ダイアログが表示されない場合もあるため、タイムアウト時はスキップする
  try {
    const restoreDialog = page.locator('.ant-modal').filter({ hasText: '編集中のデータが見つかりました' });
    await restoreDialog.waitFor({ state: 'visible', timeout: 3000 });
    await page.click('button:has-text("復元しない")');
    await page.waitForTimeout(500);
  } catch {
    // ダイアログが表示されない場合はスキップ（正常系）
  }
});

/**
 * プロジェクト管理画面が表示されていること
 * 複数の feature で共通使用
 */
When('プロジェクト管理画面が表示されている', async ({ page }) => {
  await page.waitForSelector('[data-testid="create-project-button"]', {
    timeout: 15000,
  });
});

/**
 * プロジェクト一覧でプロジェクトを選択する（項目クリックで選択）
 * 複数の feature で共通使用
 */
When('プロジェクト一覧でプロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  const projectItem = page.locator('[data-testid^="project-item-"]').filter({ hasText: projectName }).first();
  await projectItem.waitFor({ state: 'attached', timeout: 10000 });
  await projectItem.scrollIntoViewIfNeeded();
  await projectItem.click();
  await page.waitForTimeout(500);
});

/**
 * 「指示登録」タブをクリックする
 * 複数の feature（4-4, 4-5）で共通使用
 * ProjectManagement.tsx: Ant Design Tabs の .ant-tabs-tab テキストで特定
 * （data-testid が付与されていないため、テキストベースのロケーターを使用）
 */
When('「指示登録」タブをクリックする', async ({ page }) => {
  // .ant-tabs-tab-btn（実際のクリックイベントを処理する内側要素）を対象にする
  // .ant-tabs-tab はラッパー div のため click が届かない場合がある
  const tab = page.locator('.ant-tabs-tab-btn').filter({ hasText: '指示一覧' });
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
});

/**
 * 指示編集ダイアログで指示内容を入力して保存する
 * 複数の feature（4-4, 4-5）で共通使用
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
