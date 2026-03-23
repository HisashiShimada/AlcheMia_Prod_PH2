/**
 * ステップ定義: [4-12] 問題管理
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-12_issue_management.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブル・issue テーブルを準備する
 *
 * data-testid 一覧（フロントエンド実装時に IssueManagementModal.tsx 等へ付与すること）:
 *   IssueManagementModal コンポーネント:
 *   - [issue-management-modal]                 : モーダル本体
 *   - [issue-management-new-issue-button]       : 「新規問題登録」ボタン
 *   - [issue-management-new-issue-form]         : 新規問題登録フォーム
 *   - [issue-management-title-input]            : タイトル入力フィールド
 *   - [issue-management-content-textarea]       : 内容入力テキストエリア
 *   - [issue-management-target-type-select]     : 問題対象種別セレクト（project/transition）
 *   - [issue-management-form-save-button]       : フォームの「保存」ボタン
 *   - [issue-management-search-input]           : タイトル・内容検索欄
 *   - [issue-management-status-filter]          : ステータスフィルターセレクト
 *   - [issue-management-comment-textarea]       : コメント入力テキストエリア
 *   - [issue-management-comment-submit-button]  : 「コメント送信」ボタン
 *   - [issue-management-set-resolved-button]    : 「解決」ボタン
 *   - [issue-management-set-unresolved-button]  : 「未解決」ボタン
 *   - [issue-detail-status]                     : 問題詳細のステータスタグ
 *
 *   ProjectManagement ツールバー:
 *   - [issue-management-button]                 : 「問題管理」ボタン
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
const ADMIN_PASSWORD = 'expAdmin123';

/** テスト用プロジェクト情報 */
const TEST_PROJECT_ID = 'E2E-4-12';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-12';

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 2 = in_progress（実行中）
 */
const PROJECT_STATUS_IN_PROGRESS = 2;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in（チェックイン済み）
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テスト中に作成した issue_id のリスト（After で削除） */
const createdIssueIds: string[] = [];

/** テスト中に作成した project_id のリスト（After で削除） */
const createdProjectIds: string[] = [];

/** Before フックで作成した前提 issue_id のリスト（After で削除） */
const setupIssueIds: string[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * 4-12-1 用
 * - テスト用プロジェクトを準備
 * - 未解決問題・解決済問題を各1件準備（検索・フィルタ確認用）
 */
Before({ tags: '@4-12-1' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-1)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    const unresolvedId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト未解決問題_4-12-1',
      '4-12-1 未解決フィルタ確認用の問題内容です。テスト用の詳細内容。',
      'unresolved'
    );
    if (unresolvedId) setupIssueIds.push(unresolvedId);
    const resolvedId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト解決済問題_4-12-1',
      '4-12-1 解決済フィルタ確認用の問題内容です。テスト用の詳細内容。',
      'resolved'
    );
    if (resolvedId) setupIssueIds.push(resolvedId);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-1)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-1):', error);
    throw error;
  }
});

/**
 * 4-12-2, 4-12-3, 4-12-4 用
 * - テスト用プロジェクトのみ準備（問題は新規登録テスト）
 */
Before({ tags: '@4-12-2 or @4-12-3 or @4-12-4' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-2〜4)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-2〜4)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-2〜4):', error);
    throw error;
  }
});

/**
 * 4-12-5 用
 * - テスト用プロジェクトを準備
 * - コメント追加テスト用の既存問題を1件準備
 */
Before({ tags: '@4-12-5' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-5)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト既存問題_4-12-5',
      '4-12-5 コメント追加テスト用の問題内容です。テスト用の詳細内容。',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-5)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-5):', error);
    throw error;
  }
});

/**
 * 4-12-6 用
 * - テスト用プロジェクトを準備
 * - ボタン非活性確認用の既存問題を1件準備
 */
Before({ tags: '@4-12-6' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-6)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト既存問題_4-12-6',
      '4-12-6 ボタン非活性確認用の問題内容です。テスト用の詳細内容。',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-6)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-6):', error);
    throw error;
  }
});

/**
 * 4-12-7 用
 * - テスト用プロジェクトを準備
 * - 解決済に変更するテスト用の未解決問題を1件準備
 */
Before({ tags: '@4-12-7' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-7)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト未解決問題_4-12-7',
      '4-12-7 解決済に変更するテスト用の問題内容です。テスト用の詳細内容。',
      'unresolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-7)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-7):', error);
    throw error;
  }
});

/**
 * 4-12-8 用
 * - テスト用プロジェクトを準備
 * - 未解決に戻すテスト用の解決済問題を1件準備
 */
Before({ tags: '@4-12-8' }, async () => {
  console.log('[4-12 Before] テストデータ準備 開始 (tags: @4-12-8)');
  try {
    await upsertTestProject(TEST_PROJECT_ID, TEST_PROJECT_NAME);
    const issueId = await insertTestIssue(
      TEST_PROJECT_ID,
      'E2Eテスト解決済問題_4-12-8',
      '4-12-8 未解決に戻すテスト用の問題内容です。テスト用の詳細内容。',
      'resolved'
    );
    if (issueId) setupIssueIds.push(issueId);
    console.log('[4-12 Before] テストデータ準備 完了 (tags: @4-12-8)');
  } catch (error) {
    console.error('[4-12 Before] テストデータ準備 失敗 (tags: @4-12-8):', error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-12 After] クリーンアップ 開始');
  try {
    // テスト中に作成した issue を削除（コメントも CASCADE 削除）
    for (const issueId of createdIssueIds) {
      try {
        await db.query('DELETE FROM issue WHERE issue_id = $1', [issueId]);
        console.log(`[4-12 After] issue 削除 完了: issue_id=${issueId}`);
      } catch (error) {
        console.error(`[4-12 After] issue 削除 失敗: issue_id=${issueId}:`, error);
      }
    }
    createdIssueIds.length = 0;

    // Before フックで作成した前提 issue を削除
    for (const issueId of setupIssueIds) {
      try {
        await db.query('DELETE FROM issue WHERE issue_id = $1', [issueId]);
        console.log(`[4-12 After] setup issue 削除 完了: issue_id=${issueId}`);
      } catch (error) {
        console.error(`[4-12 After] setup issue 削除 失敗: issue_id=${issueId}:`, error);
      }
    }
    setupIssueIds.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-12 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-12 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[4-12 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-12 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * 実験管理者のユーザIDがDBに存在する（背景ステップ・no-op）
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    console.log(`[4-12 Given] 実験管理者ユーザー前提: no-op (userId=${_userId})`);
  }
);

// ---------------------------------------------------------------------------
// When: ログイン・画面遷移ステップ
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 *
 * @param email - ログインするユーザーのメールアドレス
 */
When('実験管理者ユーザー {string} でログインする', async ({ page }, _email: string) => {
  console.log(`[4-12 When] ログイン: email=${_email}`);
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForLoadState('networkidle');

  const emailInput = page
    .locator('input[type="email"], input[name="email"], #userId, input[placeholder*="ID"]')
    .first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  // TODO: 実際の実験管理者ユーザーIDに更新すること
  await emailInput.fill('exp.admin@example.com');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(ADMIN_PASSWORD);

  const loginBtn = page.locator('button[type="submit"], button:has-text("ログイン")').first();
  await loginBtn.click();

  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(500);
});

/**
 * プロジェクト管理タブが表示されている
 */
When('プロジェクト管理タブが表示されている', async ({ page }) => {
  console.log('[4-12 When] プロジェクト管理タブの表示を確認');
  const tab = page
    .locator('[data-testid="project-management-tab"], .ant-tabs-tab')
    .filter({ hasText: 'プロジェクト管理' })
    .first();
  await tab.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * テスト用プロジェクトを選択する
 *
 * @param projectName - 選択するプロジェクト名
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-12 When] プロジェクト "${projectName}" を選択`);
  const row = page
    .locator('[data-testid="project-list-table"] tr, .ant-table-row, tbody tr')
    .filter({ hasText: projectName })
    .first();
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.click();
  await page.waitForTimeout(500);
});

/**
 * ツールバーの「問題管理」ボタンをクリックして問題管理モーダルを開く
 * ProjectManagement: data-testid="issue-management-button"
 */
When('ツールバーの「問題管理」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] ツールバーの「問題管理」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-button"]');
  const btnFallback = page.locator('button').filter({ hasText: '問題管理' }).first();
  const hasTestId = await btn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? btn : btnFallback;
  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForSelector('[data-testid="issue-management-modal"]', { timeout: 10000 });
});

// ---------------------------------------------------------------------------
// When: 問題管理モーダル操作ステップ
// ---------------------------------------------------------------------------

/**
 * 「新規問題登録」ボタンをクリックして新規登録フォームを表示する
 * IssueManagementModal: data-testid="issue-management-new-issue-button"
 */
When('「新規問題登録」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「新規問題登録」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-new-issue-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForSelector('[data-testid="issue-management-new-issue-form"]', { timeout: 10000 });
});

/**
 * 問題タイトルを入力する（4-12-2, 4-12-3 用）
 * IssueManagementModal: data-testid="issue-management-title-input"
 */
When('問題タイトルに {string} と入力する', async ({ page }, title: string) => {
  console.log(`[4-12 When] 問題タイトル入力: "${title}"`);
  const input = page.locator('[data-testid="issue-management-title-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
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
 * 問題内容を入力する（4-12-2, 4-12-3 用）
 * IssueManagementModal: data-testid="issue-management-content-textarea"
 */
When('問題内容に {string} と入力する', async ({ page }, content: string) => {
  console.log(`[4-12 When] 問題内容入力: "${content}"`);
  const textarea = page.locator('[data-testid="issue-management-content-textarea"]');
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.click();
  await textarea.fill(content);
});

/**
 * 問題対象種別を選択する（4-12-3 用: project / transition）
 * IssueManagementModal: data-testid="issue-management-target-type-select"
 */
When('問題対象種別で {string} を選択する', async ({ page }, targetType: string) => {
  console.log(`[4-12 When] 問題対象種別選択: "${targetType}"`);
  const select = page.locator('[data-testid="issue-management-target-type-select"]');
  await select.waitFor({ state: 'visible', timeout: 10000 });
  await select.click();
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
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await dropdown.locator(`.ant-select-item-option[title="${targetType}"]`).first().click();
  await page.waitForTimeout(300);
});

/**
 * 問題登録フォームの「保存」ボタンをクリックする
 * IssueManagementModal: data-testid="issue-management-form-save-button"
 */
When('問題登録フォームの「保存」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 問題登録フォームの「保存」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-form-save-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  // API レスポンスまたはバリデーションエラーを待機
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/issues') && resp.request().method() === 'POST',
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

/**
 * 問題一覧の指定タイトルの問題行をクリックして選択する
 * IssueManagementModal: テーブル行をクリック
 */
When('問題一覧の {string} をクリックして選択する', async ({ page }, issueTitle: string) => {
  console.log(`[4-12 When] 問題選択: "${issueTitle}"`);
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const row = modal.locator(`table tr:has-text("${issueTitle}")`).first();
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.click();
  await page.waitForTimeout(500);
});

/**
 * コメント入力欄にコメントを入力する
 * IssueManagementModal: data-testid="issue-management-comment-textarea"
 */
When('コメント入力欄に {string} と入力する', async ({ page }, comment: string) => {
  console.log(`[4-12 When] コメント入力: "${comment}"`);
  const textarea = page.locator('[data-testid="issue-management-comment-textarea"]');
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.click();
  await textarea.fill(comment);
});

/**
 * 「コメント送信」ボタンをクリックする
 * IssueManagementModal: data-testid="issue-management-comment-submit-button"
 */
When('「コメント送信」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「コメント送信」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-comment-submit-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
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
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
  await btn.click();
});

/**
 * 「解決」ボタンをクリックしてステータスを解決済に変更する
 * IssueManagementModal: data-testid="issue-management-set-resolved-button"
 */
When('「解決」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「解決」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-set-resolved-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
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
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
  await btn.click();
});

/**
 * 「未解決」ボタンをクリックしてステータスを未解決に変更する
 * IssueManagementModal: data-testid="issue-management-set-unresolved-button"
 */
When('「未解決」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「未解決」ボタンをクリック');
  const btn = page.locator('[data-testid="issue-management-set-unresolved-button"]');
  await btn.waitFor({ state: 'visible', timeout: 10000 });
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
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
  await btn.click();
});

/**
 * タイトル・内容検索欄にキーワードを入力する（4-12-1 用）
 * IssueManagementModal: data-testid="issue-management-search-input"
 */
When('タイトル・内容検索欄に {string} と入力する', async ({ page }, keyword: string) => {
  console.log(`[4-12 When] 検索欄入力: "${keyword}"`);
  const input = page.locator('[data-testid="issue-management-search-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(keyword);
  // 検索結果の反映を待機（デバウンス考慮）
  await page.waitForTimeout(500);
});

/**
 * タイトル・内容検索欄をクリアする（4-12-1 用）
 */
When('タイトル・内容検索欄をクリアする', async ({ page }) => {
  console.log('[4-12 When] 検索欄クリア');
  const input = page.locator('[data-testid="issue-management-search-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.clear();
  await page.waitForTimeout(500);
});

/**
 * ステータスフィルターで指定ステータスを選択する（4-12-1 用）
 * IssueManagementModal: data-testid="issue-management-status-filter"
 */
When('ステータスフィルターで {string} を選択する', async ({ page }, statusLabel: string) => {
  console.log(`[4-12 When] ステータスフィルター選択: "${statusLabel}"`);
  const statusFilter = page.locator('[data-testid="issue-management-status-filter"]');
  await statusFilter.waitFor({ state: 'visible', timeout: 10000 });
  await statusFilter.click();
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
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await dropdown.locator(`.ant-select-item-option[title="${statusLabel}"]`).click();
  await page.waitForTimeout(300);
});

/**
 * [4-12-4 シナリオアウトライン用] タイトル欄に値を入力する（空文字対応）
 */
When('{string} をタイトル欄に入力する', async ({ page }, title: string) => {
  console.log(`[4-12 When] タイトル欄入力 (アウトライン): "${title}"`);
  if (!title || title.trim() === '') {
    // 空文字の場合はフォーカスのみ当てて何も入力しない
    const input = page.locator('[data-testid="issue-management-title-input"]');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.click();
    return;
  }
  const input = page.locator('[data-testid="issue-management-title-input"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
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
 * [4-12-4 シナリオアウトライン用] 内容欄に値を入力する（空文字対応）
 */
When('{string} を内容欄に入力する', async ({ page }, content: string) => {
  console.log(`[4-12 When] 内容欄入力 (アウトライン): "${content}"`);
  const textarea = page.locator('[data-testid="issue-management-content-textarea"]');
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  if (!content || content.trim() === '') {
    await textarea.click();
    return;
  }
  await textarea.click();
  await textarea.fill(content);
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * 問題管理モーダルが表示されること
 * IssueManagementModal: data-testid="issue-management-modal"
 */
Then('問題管理モーダルが表示されること', async ({ page }) => {
  await expect(
    page.locator('[data-testid="issue-management-modal"]')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧カードが表示されていること
 */
Then('問題一覧カードが表示されていること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator('.ant-card-head-title:has-text("問題一覧")')
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧に指定タイトルの問題が表示されていること
 */
Then('問題一覧に {string} が表示されていること', async ({ page }, issueTitle: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`table td:has-text("${issueTitle}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧に指定タイトルの問題が表示されていないこと（フィルタ確認）
 */
Then('問題一覧に {string} が表示されていないこと', async ({ page }, issueTitle: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`table td:has-text("${issueTitle}")`)
  ).not.toBeVisible({ timeout: 5000 });
});

/**
 * 問題登録成功メッセージが表示されること（4-12-2, 4-12-3）
 */
Then('問題登録成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper').filter({ hasText: /問題を登録しました|問題を報告しました/ })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * コメント送信成功メッセージが表示されること（4-12-5）
 */
Then('コメント送信成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper').filter({ hasText: /コメントを送信しました/ })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * ステータス変更成功メッセージが表示されること（4-12-7, 4-12-8）
 */
Then('ステータス変更成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper').filter({
      hasText: /ステータスを「.+」に変更しました/,
    })
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題の現在のステータスが指定のステータスであること（4-12-7, 4-12-8）
 */
Then('問題の現在のステータスが {string} であること', async ({ page }, statusLabel: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`[data-testid="issue-detail-status"] .ant-tag:has-text("${statusLabel}"), .ant-tag:has-text("${statusLabel}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題のステータスが指定のステータスに変更されていること（4-12-7, 4-12-8）
 */
Then('問題のステータスが {string} に変更されていること', async ({ page }, statusLabel: string) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(
    modal.locator(`[data-testid="issue-detail-status"] .ant-tag:has-text("${statusLabel}"), .ant-tag:has-text("${statusLabel}")`)
  ).toBeVisible({ timeout: 15000 });
});

/**
 * コメント入力欄が空の状態で「コメント送信」ボタンが非活性であること（4-12-6）
 */
Then('コメント入力欄が空の状態で「コメント送信」ボタンが非活性であること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  const btn = modal.locator('[data-testid="issue-management-comment-submit-button"]');
  await expect(btn).toBeDisabled({ timeout: 10000 });
});

/**
 * コメント入力欄が空の状態で「解決」ボタンが非活性であること（4-12-6）
 */
Then('コメント入力欄が空の状態で「解決」ボタンが非活性であること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  const btn = modal.locator('[data-testid="issue-management-set-resolved-button"]');
  await expect(btn).toBeDisabled({ timeout: 10000 });
});

/**
 * コメント入力欄が空の状態で「未解決」ボタンが非活性であること（4-12-6）
 */
Then('コメント入力欄が空の状態で「未解決」ボタンが非活性であること', async ({ page }) => {
  const modal = page.locator('[data-testid="issue-management-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  const btn = modal.locator('[data-testid="issue-management-set-unresolved-button"]');
  await expect(btn).toBeDisabled({ timeout: 10000 });
});

/**
 * バリデーションエラーメッセージが表示されること（4-12-4 シナリオアウトライン用）
 */
Then('{string} のバリデーションエラーが表示されること', async ({ page }, errorMessage: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
  ).toBeVisible({ timeout: 5000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertTestProject(projectId: string, projectName: string): Promise<void> {
  console.log(`[4-12 upsertTestProject] 開始: project_id=${projectId}`);
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project
         SET project_name = $1, project_status = $2, checkout_status = $3,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $4 AND project_id = $5`,
        [projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_IN, ORG_ID, projectId]
      );
      console.log(`[4-12 upsertTestProject] UPDATE 完了: project_id=${projectId}`);
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
        [ORG_ID, projectId, projectName, PROJECT_STATUS_IN_PROGRESS, CHECKOUT_STATUS_CHECKED_IN]
      );
      createdProjectIds.push(projectId);
      console.log(`[4-12 upsertTestProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-12 upsertTestProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用問題データを INSERT する
 *
 * NOTE: issue テーブルのカラム構成は backend/migrations/20260204_create_issue_comments_table.sql
 *       および関連マイグレーションファイルを参照すること
 *
 * @returns 作成された issue_id（失敗時は null）
 */
async function insertTestIssue(
  projectId: string,
  title: string,
  content: string,
  status: 'unresolved' | 'resolved'
): Promise<string | null> {
  console.log(`[4-12 insertTestIssue] 開始: title=${title}, status=${status}`);
  try {
    // 同名の問題が既に存在する場合は先に削除してから INSERT
    await db.query(
      'DELETE FROM issue WHERE organization_id = $1 AND project_id = $2 AND title = $3',
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
        'project', 'other',
        'e2e-test', NOW(),
        NOW(), NOW()
      )
      RETURNING issue_id`,
      [ORG_ID, projectId, title, content, status]
    );

    const issueId = result.rows[0]?.issue_id ?? null;
    if (issueId) {
      console.log(`[4-12 insertTestIssue] INSERT 完了: issue_id=${issueId}, title=${title}`);
    }
    return issueId;
  } catch (error) {
    console.error(`[4-12 insertTestIssue] 失敗: title=${title}:`, error);
    return null;
  }
}
