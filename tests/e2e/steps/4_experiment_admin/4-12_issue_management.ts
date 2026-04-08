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
    // テーブル名は issues、主キーカラムは id
    for (const issueId of createdIssueIds) {
      try {
        await db.query('DELETE FROM issues WHERE id = $1', [issueId]);
        console.log(`[4-12 After] issues 削除 完了: id=${issueId}`);
      } catch (error) {
        console.error(`[4-12 After] issues 削除 失敗: id=${issueId}:`, error);
      }
    }
    createdIssueIds.length = 0;

    // Before フックで作成した前提 issue を削除
    for (const issueId of setupIssueIds) {
      try {
        await db.query('DELETE FROM issues WHERE id = $1', [issueId]);
        console.log(`[4-12 After] setup issues 削除 完了: id=${issueId}`);
      } catch (error) {
        console.error(`[4-12 After] setup issues 削除 失敗: id=${issueId}:`, error);
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
// When: ログイン・画面遷移ステップ
// ---------------------------------------------------------------------------

/**
 * 実験管理者ユーザーでログインする
 * → common.ts に定義済み（複数 feature で共通使用のため）
 */

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
 *
 * 実際のUIはカード形式（generic [cursor=pointer]）で描画されるため、
 * common.ts と同様に data-testid^="project-item-" を優先し、
 * 未付与の場合はカード要素をテキストでフィルタリングして選択する。
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-12 When] プロジェクト "${projectName}" を選択`);

  // 優先: data-testid^="project-item-" (common.ts と同じロケーター)
  const byTestId = page
    .locator('[data-testid^="project-item-"]')
    .filter({ hasText: projectName })
    .first();

  // フォールバック: カード形式のクリック可能要素をテキストで探す
  const byCard = page
    .locator('[cursor=pointer], .ant-card[class*="project"], [class*="projectCard"], [class*="project-card"]')
    .filter({ hasText: projectName })
    .first();

  // さらにフォールバック: cursor=pointer を持つ generic 要素（実際のDOM構造に対応）
  const byGeneric = page
    .locator('div[style*="cursor: pointer"], div[style*="cursor:pointer"]')
    .filter({ hasText: projectName })
    .first();

  // data-testid を最初に試みる
  let targetFound = false;
  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasTestId) {
    await byTestId.scrollIntoViewIfNeeded();
    await byTestId.click();
    targetFound = true;
  }

  if (!targetFound) {
    // カード形式のフォールバック
    const hasCard = await byCard.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCard) {
      await byCard.scrollIntoViewIfNeeded();
      await byCard.click();
      targetFound = true;
    }
  }

  if (!targetFound) {
    // CSS cursor 属性による汎用フォールバック
    const hasGeneric = await byGeneric.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasGeneric) {
      await byGeneric.scrollIntoViewIfNeeded();
      await byGeneric.click();
      targetFound = true;
    }
  }

  if (!targetFound) {
    // 最終フォールバック: page.getByText でプロジェクト名を持つクリック可能要素を探す
    console.warn(`[4-12 When] data-testid / カード要素が見つからないため getByText でフォールバック`);
    const byText = page.getByText(projectName, { exact: true }).first();
    await byText.waitFor({ state: 'visible', timeout: 10000 });
    await byText.scrollIntoViewIfNeeded();
    await byText.click();
  }

  await page.waitForTimeout(500);
});

/**
 * ツールバーの「問題管理」ボタンをクリックして問題管理モーダルを開く
 * ProjectManagement: data-testid="issue-management-button"
 *
 * HTMLレポート確認時点では「問題確認」というテキストを持つボタンがプロジェクト詳細パネルに存在するため、
 * 複数のフォールバック戦略を実装する（優先順位順）：
 *   1. data-testid="issue-management-button"
 *   2. button[テキスト="問題確認"] （HTMLレポートで確認された実際のボタン名）
 *   3. exclamation-circle アイコンを持つボタン（HTMLレポートで確認）
 *   4. button[テキスト="問題管理"] （テキスト完全一致）
 *   5. button / a / [role=button] で「問題管理」または「問題確認」を含む要素
 *   6. Ant Design アイコンボタンのラベルテキスト
 * いずれも見つからない場合はフロントエンド未実装である旨を明示したエラーを投げる
 */
When('ツールバーの「問題管理」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] ツールバーの「問題管理」ボタンをクリック');

  // 1. data-testid による特定（最優先）
  const byTestId = page.locator('[data-testid="issue-management-button"]');

  // 2. button 要素「問題確認」テキスト完全一致（HTMLレポートで確認された実際のボタン名）
  const byIssueConfirmText = page.locator('button').filter({ hasText: '問題確認' }).first();

  // 3. exclamation-circle アイコンを持つボタン（HTMLレポートで確認: "exclamation-circle 問題確認"）
  const byIconButton = page
    .locator('button')
    .filter({ has: page.locator('img[alt="exclamation-circle"]') })
    .first();

  // 4. button 要素のテキスト完全一致（「問題管理」）
  const byButtonText = page.locator('button').filter({ hasText: '問題管理' }).first();

  // 5. クリック可能要素（button / a / [role=button]）で「問題管理」または「問題確認」を含む
  const byRoleText = page
    .locator('button, a, [role="button"]')
    .filter({ hasText: /問題管理|問題確認/ })
    .first();

  // 6. Ant Design ボタンのラベルテキスト（span 内のテキスト）
  const bySpanText = page
    .locator('.ant-btn')
    .filter({ has: page.locator('span').filter({ hasText: /問題管理|問題確認/ }) })
    .first();

  // 順番に存在確認
  let target = null;
  const candidates = [byTestId, byIssueConfirmText, byIconButton, byButtonText, byRoleText, bySpanText];
  const candidateNames = [
    'data-testid="issue-management-button"',
    'button[text="問題確認"]（HTMLレポートで確認済）',
    'button:has(img[alt="exclamation-circle"])（HTMLレポートで確認済）',
    'button[text="問題管理"]',
    '[role=button][text~="問題管理|問題確認"]',
    '.ant-btn:has(span[text~="問題管理|問題確認"])',
  ];

  for (let i = 0; i < candidates.length; i++) {
    const found = await candidates[i].isVisible({ timeout: 2000 }).catch(() => false);
    if (found) {
      console.log(`[4-12 When] 「問題管理/問題確認」ボタン発見: ${candidateNames[i]}`);
      target = candidates[i];
      break;
    }
  }

  if (!target) {
    // フロントエンドにボタンが見つからない場合の明示的エラー
    throw new Error(
      '[4-12] 「問題管理」または「問題確認」ボタンが見つかりません。\n' +
      'フロントエンド（ProjectManagement のプロジェクト詳細パネル）に以下のいずれかが実装されているか確認してください：\n' +
      '  - data-testid="issue-management-button" を持つボタン\n' +
      '  - テキスト「問題確認」を持つボタン（exclamation-circle アイコン付き）\n' +
      '  - テキスト「問題管理」を持つボタン\n' +
      '現在のツールバーには「新規プロジェクト」「アップロード」「リロード」「トランジション検索」のみ確認されています。\n' +
      'プロジェクト詳細パネルには「プロジェクトダウンロード」「編集」「チェックアウト」「問題確認」「公 開」が確認されています。'
    );
  }

  await target.scrollIntoViewIfNeeded();
  await target.click();

  // モーダルが表示されるまで待機
  // data-testid="issue-management-modal" が実装済みの場合は専用セレクタで待機
  // 未実装の場合は Ant Design モーダル汎用セレクタにフォールバック
  try {
    await page.waitForSelector('[data-testid="issue-management-modal"]', { timeout: 5000 });
  } catch {
    console.warn('[4-12 When] data-testid="issue-management-modal" が見つからないため、Ant Design モーダル汎用セレクタで待機');
    await page.waitForSelector('.ant-modal:visible, [role="dialog"]:visible', { timeout: 10000 });
  }
});

// ---------------------------------------------------------------------------
// When: 問題管理モーダル操作ステップ
// ---------------------------------------------------------------------------

/**
 * 「新規問題登録」ボタンをクリックして新規登録フォームを表示する
 * IssueManagementModal: data-testid="issue-management-new-issue-button"
 *
 * フォールバック: スナップショット確認では「新規問題報告」というテキストが確認されているため、
 * data-testid が未付与の場合はテキストで特定する。
 */
When('「新規問題登録」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「新規問題登録」ボタンをクリック');

  const byTestId = page.locator('[data-testid="issue-management-new-issue-button"]');
  const byText   = page.locator('button').filter({ hasText: /新規問題登録|新規問題報告/ }).first();

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byText;

  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();

  // フォームの待機（data-testid未付与の場合も考慮）
  await Promise.race([
    page.waitForSelector('[data-testid="issue-management-new-issue-form"]', { timeout: 5000 }).catch(() => {}),
    page.waitForTimeout(1000),
  ]);
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
 *
 * HTMLレポート確認（スナップショット 5ab29c82e）より、実際の option の title は
 * 英語 value ではなく日本語ラベル（「タスク」「トランジション」）となっている。
 * feature ファイルからは英語 value（"task" / "transition"）が渡されるため、
 * value → 日本語ラベルの対応表でマッピングする。
 *
 * スナップショットで確認した listbox の構造:
 *   option "タスク": task
 *   option "トランジション" [selected]: transition
 */
When('問題対象種別で {string} を選択する', async ({ page }, targetType: string) => {
  console.log(`[4-12 When] 問題対象種別選択: "${targetType}"`);

  // value → 日本語ラベルのマッピング（スナップショットで確認済み）
  const labelMap: Record<string, string> = {
    task: 'タスク',
    transition: 'トランジション',
    project: 'プロジェクト',
  };
  const labelJa = labelMap[targetType] ?? targetType;

  // data-testid="issue-management-target-type-select" を優先、
  // 未付与の場合はフォームの「対象」ラベル近傍のセレクトを探す
  const byTestId = page.locator('[data-testid="issue-management-target-type-select"]');
  const byLabel = page
    .locator('.ant-form-item')
    .filter({ hasText: '対象' })
    .locator('.ant-select')
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const select = hasTestId ? byTestId : byLabel;

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

  // title 属性は日本語ラベルのため、日本語ラベルで選択する
  // フォールバック: data-value 属性で英語 value でも選択可能にする
  const byJaTitle = dropdown.locator(`.ant-select-item-option[title="${labelJa}"]`).first();
  const byValue   = dropdown.locator(`.ant-select-item-option[data-value="${targetType}"]`).first();

  const hasJaTitle = await byJaTitle.isVisible({ timeout: 2000 }).catch(() => false);
  const option = hasJaTitle ? byJaTitle : byValue;

  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();

  // @4-12-3 修正点: オプション選択後にドロップダウンが閉じるまで待機する
  // スナップショット 01115f93 では combobox が [expanded] のまま次のステップに進んでいたため、
  // ドロップダウンが閉じるまで待機してから次処理に移る
  await page.waitForFunction(
    () => {
      /* eslint-disable no-undef */
      const dropdowns = (document as Document).querySelectorAll('.ant-select-dropdown');
      return !Array.from(dropdowns).some((d) => {
        const el = d as HTMLElement;
        return (
          !el.classList.contains('ant-select-dropdown-hidden') &&
          (window as Window & typeof globalThis).getComputedStyle(el).display !== 'none'
        );
      });
      /* eslint-enable no-undef */
    },
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(300);
});

/**
 * 問題登録フォームの「保存」ボタンをクリックする
 * IssueManagementModal: data-testid="issue-management-form-save-button"
 *
 * HTMLレポートスナップショット（5ab29c82e）から確認した実際の DOM:
 *   button "保 存"  ← スペースあり、data-testid 未付与
 *
 * また、フォームには「* 問題タイプ」必須フィールドが存在するが、
 * feature ファイル（4-12-2/3）にはそのステップが定義されていない。
 * そのため保存前に問題タイプが未選択であれば最初の選択肢を自動で選ぶ。
 *
 * スナップショットで確認した問題タイプセレクト:
 *   generic "問題タイプ": "* 問題タイプ"
 *   combobox "* 問題タイプ"  ← 値なし（placeholder: 問題タイプを選択）
 */
When('問題登録フォームの「保存」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 問題登録フォームの「保存」ボタンをクリック（問題タイプ自動選択含む）');

  // -----------------------------------------------------------------------
  // 問題タイプ（必須）が未選択の場合は先に自動選択する
  // スナップショット確認: combobox "* 問題タイプ" が空のまま保存すると失敗する
  // -----------------------------------------------------------------------
  const issueTypeSelect = page
    .locator('.ant-form-item')
    .filter({ hasText: '問題タイプ' })
    .locator('.ant-select')
    .first();

  const isIssueTypeVisible = await issueTypeSelect.isVisible({ timeout: 2000 }).catch(() => false);
  if (isIssueTypeVisible) {
    // 未選択判定:
    //   - .ant-select-selection-item が存在しない（値が選択されていない）
    //   - かつ .ant-select-selection-placeholder が表示されている
    // ※ Ant Design の Select では inputValue() は常に空文字を返すため使用しない
    const hasSelectionItem = await issueTypeSelect
      .locator('.ant-select-selection-item')
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const hasPlaceholder = await issueTypeSelect
      .locator('.ant-select-selection-placeholder')
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    if (!hasSelectionItem || hasPlaceholder) {
      console.log('[4-12 When] 問題タイプが未選択のため最初のオプションを自動選択します');
      await issueTypeSelect.click();
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
        { timeout: 5000 }
      );
      const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
      const firstOption = dropdown.locator('.ant-select-item-option').first();
      await firstOption.waitFor({ state: 'visible', timeout: 5000 });
      await firstOption.click();
      await page.waitForTimeout(200);
      console.log('[4-12 When] 問題タイプ 自動選択 完了');
    }
  }

  // -----------------------------------------------------------------------
  // 保存ボタンを特定してクリック
  // 優先: data-testid="issue-management-form-save-button"
  // フォールバック1: button "保 存"（スナップショット確認済み、スペースあり）
  // フォールバック2: dialog 内の button で "保存" または "保 存" を含む
  // -----------------------------------------------------------------------
  const byTestId = page.locator('[data-testid="issue-management-form-save-button"]');
  // スナップショットで確認: button "保 存"（全角スペース区切り）
  const byExactText = page.locator('button').filter({ hasText: '保 存' }).first();
  // フォールバック: dialog 内の保存ボタン
  const byDialogBtn = page
    .locator('dialog, [role="dialog"]')
    .filter({ hasText: /問題報告/ })
    .first()
    .locator('button')
    .filter({ hasText: /保.?存/ })
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  let btn;
  if (hasTestId) {
    btn = byTestId;
  } else {
    const hasExact = await byExactText.isVisible({ timeout: 2000 }).catch(() => false);
    btn = hasExact ? byExactText : byDialogBtn;
  }

  await btn.waitFor({ state: 'visible', timeout: 10000 });

  // クリックと API レスポンス待機を並列実行
  // クリック前に waitForResponse を設定することでレスポンスを確実に捕捉する
  // @4-12-2 修正点:
  //   - API レスポンスから作成された issue の ID を取得し createdIssueIds に追加
  //   - After フックで確実にクリーンアップされるようにする（重複データ蓄積を防ぐ）
  await Promise.all([
    Promise.race([
      page
        .waitForResponse(
          async (resp) => {
            if (!resp.url().includes('/api/v1/issues') || resp.request().method() !== 'POST') {
              return false;
            }
            try {
              const body = await resp.json().catch(() => null);
              // レスポンスボディから作成された issue の ID を抽出して追跡
              const issueId = body?.data?.id ?? body?.id ?? null;
              if (issueId && !createdIssueIds.includes(issueId)) {
                createdIssueIds.push(issueId);
                console.log(`[4-12 When] 作成した issue ID を追跡登録: id=${issueId}`);
              }
            } catch {
              // ID 取得に失敗してもテストは続行
            }
            return true;
          },
          { timeout: 10000 }
        )
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
    ]),
    btn.click(),
  ]);
});

/**
 * 問題一覧の指定タイトルの問題行をクリックして選択する
 * IssueManagementModal: テーブル行をクリック
 *
 * @4-12-5/6 修正点:
 *   - スナップショット 95907415 で「問題を選択してください」が表示されたまま次ステップに進んでいた
 *   - 行クリック後に詳細パネルの表示（「問題を選択してください」以外になること）を待機する
 *   - テーブルが2つ存在する（ヘッダー専用テーブル + データテーブル）ため nth(1) で本体を対象にする
 */
When('問題一覧の {string} をクリックして選択する', async ({ page }, issueTitle: string) => {
  console.log(`[4-12 When] 問題選択: "${issueTitle}"`);
  const modal = getModalLocator(page);
  await modal.waitFor({ state: 'visible', timeout: 10000 });

  // スナップショット確認: テーブルが2つ存在（table[ref=e599]=ヘッダー, table[ref=e608]=本体）
  // nth(1) でデータ本体テーブルを対象にする
  const dataTable = modal.locator('table').nth(1);
  const rowByDataTable = dataTable.locator(`tr:has-text("${issueTitle}")`).first();
  const rowByModal = modal.locator(`table tr:has-text("${issueTitle}")`).first();

  // データ本体テーブルの行を優先、見つからなければモーダル全体から探す
  const hasDataTableRow = await rowByDataTable.isVisible({ timeout: 3000 }).catch(() => false);
  const row = hasDataTableRow ? rowByDataTable : rowByModal;

  await row.waitFor({ state: 'visible', timeout: 10000 });

  // @4-12-5/6/7/8 修正点:
  //   スナップショット確認: テーブル行のクリックハンドラーは tr ではなく cell (td) に設定されている
  //   tr に対して click() を呼ぶと React のクリックイベントが発火しない場合があるため、
  //   行内の最初の cell (td / [role="cell"]) をクリックする
  const cell = row.locator('td, [role="cell"]').first();
  const hasCell = await cell.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasCell) {
    await cell.click();
  } else {
    await row.click();
  }

  // 詳細パネルが「問題を選択してください」以外の状態になるまで待機
  // スナップショット 95907415 確認: クリック後も詳細パネルに「問題を選択してください」が表示されていた
  await page.waitForFunction(
    () => {
      /* eslint-disable no-undef */
      // data-testid="issue-management-modal" がある場合はその中を確認
      const modal =
        (document as Document).querySelector('[data-testid="issue-management-modal"]') ??
        (document as Document).querySelector('dialog') ??
        (document as Document).querySelector('[role="dialog"]');
      if (!modal) return true; // モーダルがなければ待機不要
      const detailText = modal.textContent ?? '';
      return !detailText.includes('問題を選択してください');
      /* eslint-enable no-undef */
    },
    { timeout: 10000 }
  ).catch(() => {
    console.warn('[4-12 When] 詳細パネルの更新待機がタイムアウト（処理を続行）');
  });

  await page.waitForTimeout(300);
});

/**
 * コメント入力欄にコメントを入力する
 * IssueManagementModal: data-testid="issue-management-comment-textarea"
 *
 * @4-12-5 修正点:
 *   - data-testid が未付与の場合に placeholder でフォールバック
 *   - 問題行クリック後に詳細パネルが表示されてからコメント欄を待機する
 */
When('コメント入力欄に {string} と入力する', async ({ page }, comment: string) => {
  console.log(`[4-12 When] コメント入力: "${comment}"`);

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-comment-textarea"]');
  // フォールバック: placeholder でコメントテキストエリアを特定
  const byPlaceholder = getModalLocator(page).getByPlaceholder(/コメント/);

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const textarea = hasTestId ? byTestId : byPlaceholder;

  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.click();
  await textarea.fill(comment);
});

/**
 * 「コメント送信」ボタンをクリックする
 * IssueManagementModal: data-testid="issue-management-comment-submit-button"
 *
 * @4-12-5 修正点:
 *   - data-testid が未付与の場合にテキストでフォールバック
 *
 * waitForResponse はボタンクリックと並列で待機する必要があるため Promise.all を使用する。
 * （先に waitForResponse を設定してからクリックすると、レスポンスを捕捉できない場合がある）
 */
When('「コメント送信」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「コメント送信」ボタンをクリック');

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-comment-submit-button"]');
  // フォールバック: モーダル内の「送信」または「コメント送信」ボタン
  const byText = getModalLocator(page)
    .locator('button')
    .filter({ hasText: /^送信$|コメント送信/ })
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byText;

  await btn.waitFor({ state: 'visible', timeout: 10000 });
  // クリックと API レスポンス待機を並列実行（Promise.all）
  await Promise.all([
    Promise.race([
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
    ]),
    btn.click(),
  ]);
});

/**
 * 「解決」ボタンをクリックしてステータスを解決済に変更する
 * IssueManagementModal: data-testid="issue-management-set-resolved-button"
 *
 * @4-12-7 修正点:
 *   - data-testid が未付与の場合にテキストでフォールバック
 *   - スナップショット df7eea09 確認: 「解決済」ボタンが見つからず誤って「公 開」ボタンを
 *     押下した形跡があったため、モーダル内部に限定したロケーターを使用する
 *
 * waitForResponse はボタンクリックと並列で待機する必要があるため Promise.all を使用する。
 */
When('「解決」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「解決」ボタンをクリック');

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-set-resolved-button"]');
  // フォールバック: モーダル内部の「解決」ボタン（モーダル外の「公 開」ボタンと混同しないよう内部に限定）
  const byModalText = getModalLocator(page)
    .locator('button')
    .filter({ hasText: /^解決$/ })
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byModalText;

  await btn.waitFor({ state: 'visible', timeout: 10000 });
  // クリックと API レスポンス待機を並列実行（Promise.all）
  await Promise.all([
    Promise.race([
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
    ]),
    btn.click(),
  ]);
});

/**
 * 「未解決」ボタンをクリックしてステータスを未解決に変更する
 * IssueManagementModal: data-testid="issue-management-set-unresolved-button"
 *
 * @4-12-8 修正点:
 *   - data-testid が未付与の場合にテキストでフォールバック
 *   - モーダル内部に限定したロケーターを使用する
 *
 * waitForResponse はボタンクリックと並列で待機する必要があるため Promise.all を使用する。
 */
When('「未解決」ボタンをクリックする', async ({ page }) => {
  console.log('[4-12 When] 「未解決」ボタンをクリック');

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-set-unresolved-button"]');
  // フォールバック: モーダル内部の「未解決」ボタン
  const byModalText = getModalLocator(page)
    .locator('button')
    .filter({ hasText: /^未解決$/ })
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byModalText;

  await btn.waitFor({ state: 'visible', timeout: 10000 });
  // クリックと API レスポンス待機を並列実行（Promise.all）
  await Promise.all([
    Promise.race([
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
    ]),
    btn.click(),
  ]);
});

/**
 * タイトル・内容検索欄にキーワードを入力する（4-12-1 用）
 *
 * HTMLレポートスナップショット（03ab65c47）から、実際の DOM は：
 *   textbox "タイトル、内容で検索..."  (data-testid 未付与)
 * そのため placeholder で特定する。
 */
When('タイトル・内容検索欄に {string} と入力する', async ({ page }, keyword: string) => {
  console.log(`[4-12 When] 検索欄入力: "${keyword}"`);

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-search-input"]');
  // フォールバック: dialog 内の placeholder "タイトル、内容で検索..."（スナップショット確認済み）
  const byPlaceholder = page
    .locator('dialog, [role="dialog"]')
    .filter({ hasText: /問題報告/ })
    .first()
    .getByPlaceholder('タイトル、内容で検索...');

  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const input = hasTestId ? byTestId : byPlaceholder;

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

  const byTestId = page.locator('[data-testid="issue-management-search-input"]');
  const byPlaceholder = page
    .locator('dialog, [role="dialog"]')
    .filter({ hasText: /問題報告/ })
    .first()
    .getByPlaceholder('タイトル、内容で検索...');

  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const input = hasTestId ? byTestId : byPlaceholder;

  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.clear();
  await page.waitForTimeout(500);
});

/**
 * ステータスフィルターで指定ステータスを選択する（4-12-1 用）
 *
 * HTMLレポートスナップショット確認済み DOM:
 *   - textbox "タイトル、内容で検索..." の右隣に generic[cursor=pointer] > combobox "すべて" がある
 *   - data-testid は未付与
 *
 * ステータスラベルと value のマッピング（スナップショット確認済み）:
 *   "すべて"  → all
 *   "未解決"  → unresolved
 *   "解決済"  → resolved
 *
 * @4-12-1 修正点:
 *   - ステータスフィルターのロケーターを CSS セレクタ `:has(combobox)` に変更し安定化
 *   - オプション選択後のフィルター反映待ちを waitForTimeout → waitForFunction に強化
 */
When('ステータスフィルターで {string} を選択する', async ({ page }, statusLabel: string) => {
  console.log(`[4-12 When] ステータスフィルター選択: "${statusLabel}"`);

  // 優先: data-testid
  const byTestId = page.locator('[data-testid="issue-management-status-filter"]');

  // フォールバック: dialog 内の検索テキストボックスの隣にある Ant Design Select
  // スナップショット確認: generic[ref=e579][cursor=pointer] 内に
  //   generic "すべて" [ref=e581] + combobox [ref=e582] が存在する
  // CSS :has(combobox) は無効（combobox は ARIA ロールであり CSS セレクタではない）
  // → Playwright の .filter({ has: locator('[role="combobox"]') }) を使用する
  const dialog = page
    .locator('dialog, [role="dialog"]')
    .filter({ hasText: /問題報告/ })
    .first();
  // スナップショット構造: .ant-select を textbox の隣にある select で特定
  // → "すべて" / "未解決" / "解決済" の表示値を持つ select のみに絞り込む
  const byDialogSelect = dialog
    .locator('.ant-select')
    .filter({ has: page.locator('[role="combobox"]') })
    .first();

  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const statusFilter = hasTestId ? byTestId : byDialogSelect;

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

  // title 属性でまず特定、フォールバックでテキスト一致（"解決済" / "解決済み" 両対応）
  const byTitle = dropdown.locator(`.ant-select-item-option[title="${statusLabel}"]`).first();
  const byText  = dropdown.locator('.ant-select-item-option').filter({ hasText: statusLabel }).first();

  const hasByTitle = await byTitle.isVisible({ timeout: 2000 }).catch(() => false);
  const option = hasByTitle ? byTitle : byText;

  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();

  // フィルター反映を待機（waitForTimeout だと不安定なため、ドロップダウンが閉じるまで待つ）
  await page.waitForFunction(
    () => {
      /* eslint-disable no-undef */
      const dropdowns = (document as Document).querySelectorAll('.ant-select-dropdown');
      return !Array.from(dropdowns).some((d) => {
        const el = d as HTMLElement;
        return (
          !el.classList.contains('ant-select-dropdown-hidden') &&
          (window as Window & typeof globalThis).getComputedStyle(el).display !== 'none'
        );
      });
      /* eslint-enable no-undef */
    },
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
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
 *
 * フォールバック: スナップショット確認では data-testid が未付与のため、
 * dialog / [role="dialog"] で「問題報告」テキストを含む要素を特定する。
 */
Then('問題管理モーダルが表示されること', async ({ page }) => {
  const byTestId = page.locator('[data-testid="issue-management-modal"]');
  const hasTestId = await byTestId.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasTestId) {
    await expect(byTestId).toBeVisible({ timeout: 10000 });
    return;
  }
  console.warn('[4-12 Then] data-testid="issue-management-modal" が未付与のため dialog フォールバックで確認');
  await expect(
    page.locator('dialog, [role="dialog"]').filter({ hasText: '問題報告' }).first()
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧カードが表示されていること
 */
Then('問題一覧カードが表示されていること', async ({ page }) => {
  const modal = getModalLocator(page);
  await expect(
    modal.locator(':has-text("問題一覧")').first()
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧に指定タイトルの問題が表示されていること
 */
Then('問題一覧に {string} が表示されていること', async ({ page }, issueTitle: string) => {
  const modal = getModalLocator(page);
  await expect(
    modal.locator(`table td:has-text("${issueTitle}")`)
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題一覧に指定タイトルの問題が表示されていないこと（フィルタ確認）
 */
Then('問題一覧に {string} が表示されていないこと', async ({ page }, issueTitle: string) => {
  const modal = getModalLocator(page);
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
 *
 * @4-12-7/8 修正点:
 *   data-testid="issue-management-modal" が未付与の場合にタイムアウトしていたため
 *   getModalLocator() を使用してフォールバック付きロケーターに変更する
 */
Then('問題の現在のステータスが {string} であること', async ({ page }, statusLabel: string) => {
  const modal = getModalLocator(page);
  await expect(modal).toBeVisible({ timeout: 10000 });
  // ステータスタグ: data-testid 付与済みの場合は専用セレクタ、未付与の場合は .ant-tag テキストで確認
  await expect(
    modal.locator(
      `[data-testid="issue-detail-status"] .ant-tag:has-text("${statusLabel}"), ` +
      `.ant-tag:has-text("${statusLabel}")`
    )
  ).toBeVisible({ timeout: 10000 });
});

/**
 * 問題のステータスが指定のステータスに変更されていること（4-12-7, 4-12-8）
 *
 * @4-12-7/8 修正点:
 *   data-testid="issue-management-modal" が未付与の場合にタイムアウトしていたため
 *   getModalLocator() を使用してフォールバック付きロケーターに変更する
 */
Then('問題のステータスが {string} に変更されていること', async ({ page }, statusLabel: string) => {
  const modal = getModalLocator(page);
  await expect(modal).toBeVisible({ timeout: 10000 });
  await expect(
    modal.locator(
      `[data-testid="issue-detail-status"] .ant-tag:has-text("${statusLabel}"), ` +
      `.ant-tag:has-text("${statusLabel}")`
    )
  ).toBeVisible({ timeout: 15000 });
});

/**
 * コメント入力欄が空の状態で「コメント送信」ボタンが非活性であること（4-12-6）
 *
 * @4-12-6 修正点:
 *   data-testid="issue-management-modal" が未付与の場合にタイムアウトしていたため
 *   getModalLocator() を使用してフォールバック付きロケーターに変更する
 *   フォールバック: テキスト「送信」または「コメント送信」を持つボタン
 */
Then('コメント入力欄が空の状態で「コメント送信」ボタンが非活性であること', async ({ page }) => {
  const modal = getModalLocator(page);
  await expect(modal).toBeVisible({ timeout: 10000 });
  // data-testid 付与済みを優先、未付与の場合はテキストで特定
  const byTestId = modal.locator('[data-testid="issue-management-comment-submit-button"]');
  const byText   = modal.locator('button').filter({ hasText: /^送信$|コメント送信/ }).first();
  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byText;
  await expect(btn).toBeDisabled({ timeout: 10000 });
});

/**
 * コメント入力欄が空の状態で「解決」ボタンが非活性であること（4-12-6）
 *
 * @4-12-6 修正点:
 *   data-testid="issue-management-modal" が未付与の場合にタイムアウトしていたため
 *   getModalLocator() を使用してフォールバック付きロケーターに変更する
 *   フォールバック: モーダル内の「解決」ボタン
 */
Then('コメント入力欄が空の状態で「解決」ボタンが非活性であること', async ({ page }) => {
  const modal = getModalLocator(page);
  await expect(modal).toBeVisible({ timeout: 10000 });
  const byTestId = modal.locator('[data-testid="issue-management-set-resolved-button"]');
  const byText   = modal.locator('button').filter({ hasText: /^解決$/ }).first();
  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byText;
  await expect(btn).toBeDisabled({ timeout: 10000 });
});

/**
 * コメント入力欄が空の状態で「未解決」ボタンが非活性であること（4-12-6）
 *
 * @4-12-6 修正点:
 *   data-testid="issue-management-modal" が未付与の場合にタイムアウトしていたため
 *   getModalLocator() を使用してフォールバック付きロケーターに変更する
 *   フォールバック: モーダル内の「未解決」ボタン
 */
Then('コメント入力欄が空の状態で「未解決」ボタンが非活性であること', async ({ page }) => {
  const modal = getModalLocator(page);
  await expect(modal).toBeVisible({ timeout: 10000 });
  const byTestId = modal.locator('[data-testid="issue-management-set-unresolved-button"]');
  const byText   = modal.locator('button').filter({ hasText: /^未解決$/ }).first();
  const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
  const btn = hasTestId ? byTestId : byText;
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
 * モーダルロケーターを返すヘルパー関数
 *
 * data-testid="issue-management-modal" が付与されている場合はそれを使用し、
 * 未付与の場合は dialog / [role="dialog"] で「問題報告」テキストを含む要素を返す。
 * 複数ステップから共通利用するためヘルパー関数として切り出す。
 *
 * @param page - Playwright の Page オブジェクト
 */
function getModalLocator(page: import('@playwright/test').Page) {
  // 先に data-testid で試み、存在しない場合は dialog フォールバック
  // ※ isVisible は非同期のため、ここでは locator を返すのみとし
  //   呼び出し元で await expect(...).toBeVisible() を行う際に自動解決される
  return page.locator(
    '[data-testid="issue-management-modal"], dialog, [role="dialog"]'
  ).filter({ hasText: /問題/ }).first();
}

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
 *       の外部キー定義 `REFERENCES issues(organization_id, id)` より、
 *       テーブル名は `issues`、主キーカラムは `id` であることに注意。
 *
 * @returns 作成された id（失敗時は null）
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
      'DELETE FROM issues WHERE organization_id = $1 AND project_id = $2 AND title = $3',
      [ORG_ID, projectId, title]
    );

    const result = await db.query<{ id: string }>(
      `INSERT INTO issues (
        id, organization_id, project_id,
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
      RETURNING id`,
      [ORG_ID, projectId, title, content, status]
    );

    const issueId = result.rows[0]?.id ?? null;
    if (issueId) {
      console.log(`[4-12 insertTestIssue] INSERT 完了: id=${issueId}, title=${title}`);
    }
    return issueId;
  } catch (error) {
    console.error(`[4-12 insertTestIssue] 失敗: title=${title}:`, error);
    return null;
  }
}
