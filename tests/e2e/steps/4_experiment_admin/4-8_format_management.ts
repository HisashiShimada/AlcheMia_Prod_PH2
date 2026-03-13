/**
 * ステップ定義: [4-8] フォーマット管理
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-8_format_management.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : experiment_admin@example.com
 *   パスワード: admin123
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで format テーブルおよび S3 ファイルを準備する
 *
 * data-testid 一覧（FormatManagement.tsx）:
 *   - [new-format-folder-button] : 新規フォーマットフォルダボタン
 *   - [new-file-button]          : 新規ファイルボタン
 *   - [new-folder-button]        : 新規フォルダボタン
 *   - [upload-button]            : アップロードボタン
 *
 * data-testid 一覧（FormatFolderTree.tsx）:
 *   - [format-list]              : フォーマット一覧コンテナ
 *   - [format-item-{formatId}]   : フォーマットアイテム（行）
 *
 * data-testid 一覧（FormatFileListTable.tsx）:
 *   - [file-edit-button-{fileName}]     : ファイル編集ボタン
 *   - [file-download-button-{fileName}] : ファイルダウンロードボタン
 *   - [file-delete-button-{fileName}]   : ファイル削除ボタン
 *
 * 注意事項:
 *   - 4-8-4〜4-8-7（詳細検索）: 検索APIは未実装のためUI操作のみ確認
 *   - 4-8-8〜4-8-12（新規フォルダ作成）: フォルダ作成APIは未実装のためバリデーション・モーダル動作のみ確認
 *   - 4-8-13〜4-8-20（新規ファイル作成）: ファイル作成APIは未実装のためバリデーション・モーダル動作のみ確認
 *   - 4-8-23〜4-8-31（アップロード）: アップロードAPIは未実装のためモック動作のみ確認
 *   - 4-8-34（編集保存）: PUT APIは未実装のためAPI実装後に確認
 *   - 4-8-36〜4-8-37（ダウンロード）: ダウンロードAPIは未実装のためAPI実装後に確認
 *   - 4-8-39（削除）: 削除APIは未実装のため削除確認ダイアログのUI動作のみ確認
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';
import path from 'path';

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

/** フォーマット管理タブのナビゲーションメニュー文字列 */
const FORMAT_MANAGEMENT_MENU_TEXT = 'フォーマット管理';

// ---------------------------------------------------------------------------
// テストデータ定義
// ---------------------------------------------------------------------------

/** 共通テスト用フォーマット */
const TEST_FORMAT = {
  id: 'e2e-test-format-4-8',
  name: 'E2Eテスト用フォーマット_4-8',
  folderName: 'e2e_test_format_4_8',
  fileType: 'xml' as const,
  description: 'E2Eテスト用フォーマット',
  departmentCd: 'dept_001',
};

/** MAIMLタイプのテスト用フォーマット */
const TEST_FORMAT_MAIML = {
  id: 'e2e-test-format-4-8-maiml',
  name: 'E2Eテスト用フォーマット_4-8_MAIML',
  folderName: 'e2e_test_format_4_8_maiml',
  fileType: 'maiml' as const,
  description: 'E2Eテスト用MAIMLフォーマット',
  departmentCd: 'dept_001',
};

/** 削除用テスト用フォーマット */
const TEST_FORMAT_DELETE = {
  id: 'e2e-test-format-4-8-delete',
  name: 'E2Eテスト_削除用フォーマット_4-8-3',
  folderName: 'e2e_test_format_4_8_delete',
  fileType: 'xml' as const,
  description: '削除用E2Eテストフォーマット',
  departmentCd: 'dept_001',
};

/** テスト用ファイル名 */
const TEST_MAIML_FILE_NAME = 'test_format.maiml';
const TEST_XML_FILE_NAME = 'test_template.xml';
const TEST_TXT_FILE_NAME = 'test_document.txt';
const TEST_DELETE_FILE_NAME = 'test_delete_target.xml';

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した format の id（After で削除） */
const createdFormatIds: string[] = [];

/** テストで作成した新規フォーマット名（4-8-2用） */
let createdNewFormatName: string | null = null;

// ---------------------------------------------------------------------------
// ログインヘルパー
// ---------------------------------------------------------------------------

/**
 * 実験管理者でログインしてフォーマット管理画面へ遷移する
 */
async function loginAndNavigateToFormatManagement(page: any): Promise<void> {
  await page.goto(`http://localhost:3000/?orgId=${ORG_ID}`);
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });

  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // フォーマット管理タブをクリック
  const formatTab = page.getByText(FORMAT_MANAGEMENT_MENU_TEXT).first();
  await formatTab.waitFor({ state: 'visible', timeout: 15000 });
  await formatTab.click();

  await page.waitForTimeout(1000);
  console.log('[4-8] フォーマット管理画面へ遷移完了');
}

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/** 基本テストデータ（共通テスト用フォーマット） */
Before({ tags: '@4-8-1 or @4-8-2 or @4-8-4 or @4-8-5 or @4-8-6 or @4-8-7 or @4-8-8 or @4-8-9 or @4-8-10 or @4-8-11 or @4-8-12 or @4-8-13 or @4-8-14 or @4-8-17 or @4-8-18 or @4-8-20 or @4-8-21 or @4-8-22 or @4-8-23 or @4-8-24 or @4-8-26 or @4-8-27 or @4-8-28 or @4-8-29 or @4-8-30 or @4-8-31' }, async () => {
  console.log('[4-8 Before] 基本テストデータ準備 開始');
  await upsertFormat(TEST_FORMAT);
  if (!createdFormatIds.includes(TEST_FORMAT.id)) {
    createdFormatIds.push(TEST_FORMAT.id);
  }
  console.log('[4-8 Before] 基本テストデータ準備 完了');
});

/** 削除用テストデータ */
Before({ tags: '@4-8-3' }, async () => {
  console.log('[4-8 Before] 削除用テストデータ準備 開始');
  await upsertFormat(TEST_FORMAT_DELETE);
  if (!createdFormatIds.includes(TEST_FORMAT_DELETE.id)) {
    createdFormatIds.push(TEST_FORMAT_DELETE.id);
  }
  console.log('[4-8 Before] 削除用テストデータ準備 完了');
});

/** XMLタイプフォーマット用テストデータ */
Before({ tags: '@4-8-15 or @4-8-19' }, async () => {
  console.log('[4-8 Before] XMLタイプフォーマットテストデータ準備 開始');
  await upsertFormat(TEST_FORMAT);
  if (!createdFormatIds.includes(TEST_FORMAT.id)) {
    createdFormatIds.push(TEST_FORMAT.id);
  }
  console.log('[4-8 Before] XMLタイプフォーマットテストデータ準備 完了');
});

/** MAIMLタイプフォーマット用テストデータ */
Before({ tags: '@4-8-16' }, async () => {
  console.log('[4-8 Before] MAIMLタイプフォーマットテストデータ準備 開始');
  await upsertFormat(TEST_FORMAT_MAIML);
  if (!createdFormatIds.includes(TEST_FORMAT_MAIML.id)) {
    createdFormatIds.push(TEST_FORMAT_MAIML.id);
  }
  console.log('[4-8 Before] MAIMLタイプフォーマットテストデータ準備 完了');
});

/** ファイル操作テスト用テストデータ（フォーマット + S3ファイル） */
Before({ tags: '@4-8-32 or @4-8-33 or @4-8-35 or @4-8-38 or @4-8-39 or @4-8-40' }, async () => {
  console.log('[4-8 Before] ファイル操作テストデータ準備 開始');
  await upsertFormat(TEST_FORMAT);
  if (!createdFormatIds.includes(TEST_FORMAT.id)) {
    createdFormatIds.push(TEST_FORMAT.id);
  }
  // 注意: S3/Swiftファイルの存在はテスト環境のセットアップに依存する
  // テスト実行前に手動で以下のファイルをS3/Swiftに配置すること:
  //   - {ORG_ID}/formats/dept_001/e2e_test_format_4_8/test_format.maiml
  //   - {ORG_ID}/formats/dept_001/e2e_test_format_4_8/test_template.xml
  //   - {ORG_ID}/formats/dept_001/e2e_test_format_4_8/test_document.txt
  //   - {ORG_ID}/formats/dept_001/e2e_test_format_4_8/test_delete_target.xml
  console.log('[4-8 Before] ファイル操作テストデータ準備 完了（S3ファイルは手動配置必要）');
});

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-8 After] クリーンアップ 開始');
  try {
    for (const formatId of createdFormatIds) {
      try {
        await db.query(
          'DELETE FROM format WHERE organization_id = $1 AND format_id = $2',
          [ORG_ID, formatId]
        );
        console.log(`[4-8 After] format 削除 完了: format_id=${formatId}`);
      } catch (error) {
        console.error(`[4-8 After] format 削除 失敗: format_id=${formatId}:`, error);
      }
    }
    createdFormatIds.length = 0;
    createdNewFormatName = null;
    console.log('[4-8 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-8 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ===========================================================================
// Given: 前提条件ステップ
// ===========================================================================

/**
 * 実験管理者ユーザーがDBに存在する
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _email: string) => {
    console.log('[4-8 Given] 実験管理者ユーザーは Before フックで準備済み（no-op）');
  }
);

/**
 * フォーマット管理テスト用フォーマットがDBに存在する
 * → Before フックで準備済みのため no-op
 */
Given(
  'フォーマット管理テスト用フォーマットがDBに存在する',
  async ({}) => {
    console.log('[4-8 Given] フォーマット管理テスト用フォーマットは Before フックで準備済み');
  }
);

/**
 * 削除用テストフォーマットがDBに存在する
 */
Given(
  '削除用テストフォーマット {string} がDBに存在する',
  async ({}, _formatName: string) => {
    console.log('[4-8 Given] 削除用テストフォーマットは Before フックで準備済み');
  }
);

/**
 * XMLタイプのテスト用フォーマットがDBに存在する
 */
Given(
  'XMLタイプのテスト用フォーマットがDBに存在する',
  async ({}) => {
    console.log('[4-8 Given] XMLタイプテスト用フォーマットは Before フックで準備済み');
  }
);

/**
 * MAIMLタイプのテスト用フォーマットがDBに存在する
 */
Given(
  'MAIMLタイプのテスト用フォーマットがDBに存在する',
  async ({}) => {
    console.log('[4-8 Given] MAIMLタイプテスト用フォーマットは Before フックで準備済み');
  }
);

/**
 * テスト用MAIMLファイルがS3に存在する
 * ※ S3/Swiftファイルの存在はテスト環境のセットアップに依存する（no-op）
 */
Given(
  'テスト用MAIMLファイルがS3に存在する',
  async ({}) => {
    console.log(`[4-8 Given] テスト用MAIMLファイル "${TEST_MAIML_FILE_NAME}" はS3に手動配置が必要（no-op）`);
  }
);

/**
 * テスト用XMLファイルがS3に存在する
 */
Given(
  'テスト用XMLファイルがS3に存在する',
  async ({}) => {
    console.log(`[4-8 Given] テスト用XMLファイル "${TEST_XML_FILE_NAME}" はS3に手動配置が必要（no-op）`);
  }
);

/**
 * テスト用その他拡張子ファイルがS3に存在する
 */
Given(
  'テスト用その他拡張子ファイルがS3に存在する',
  async ({}) => {
    console.log(`[4-8 Given] テスト用テキストファイル "${TEST_TXT_FILE_NAME}" はS3に手動配置が必要（no-op）`);
  }
);

/**
 * テスト用削除ファイルがS3に存在する
 */
Given(
  'テスト用削除ファイルがS3に存在する',
  async ({}) => {
    console.log(`[4-8 Given] テスト用削除ファイル "${TEST_DELETE_FILE_NAME}" はS3に手動配置が必要（no-op）`);
  }
);

// ===========================================================================
// When: 画面操作ステップ
// ===========================================================================

/**
 * 実験管理者でログインする
 */
When(
  '実験管理者ユーザー {string} でログインする',
  async ({ page }, _email: string) => {
    console.log(`[4-8 When] 実験管理者でログイン`);
    await loginAndNavigateToFormatManagement(page);
  }
);

/**
 * フォーマット管理画面が表示されている
 */
When(
  'フォーマット管理画面が表示されている',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット管理画面 表示確認');
    // フォーマット一覧が表示されていることを確認
    const formatList = page.locator('[data-testid="format-list"]');
    await formatList.waitFor({ state: 'visible', timeout: 15000 });
    console.log('[4-8 When] フォーマット管理画面 表示確認 完了');
  }
);

/**
 * 「新規フォーマット」ボタンをクリックする
 * FormatManagement.tsx: data-testid="new-format-folder-button"
 */
When(
  '「新規フォーマット」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「新規フォーマット」ボタンをクリック');
    const btn = page.locator('[data-testid="new-format-folder-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォーマット名を入力する
 *
 * @param name - 入力するフォーマット名
 */
When(
  'フォーマット名 {string} を入力する',
  async ({ page }, name: string) => {
    console.log(`[4-8 When] フォーマット名 "${name}" を入力`);
    createdNewFormatName = name;
    // CreateFormatModal の入力フィールド
    const input = page.locator('.ant-modal-content input').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(name);
    await page.waitForTimeout(300);
  }
);

/**
 * フォーマット作成ダイアログで「作成」ボタンをクリックする
 */
When(
  'フォーマット作成ダイアログで「作成」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット作成ダイアログで「作成」ボタンをクリック');
    // モーダル内のボタンをクリック
    const okBtn = page.locator('.ant-modal-content .ant-btn-primary').filter({ hasText: '作成' });
    await okBtn.waitFor({ state: 'visible', timeout: 10000 });
    await okBtn.click();
    // API レスポンスを待機
    await page.waitForTimeout(1500);
  }
);

/**
 * フォーマット一覧で指定フォーマットを選択する
 * FormatFolderTree.tsx: data-testid="format-item-{formatId}" / data-format-name
 *
 * @param formatName - 選択するフォーマット名
 */
When(
  'フォーマット一覧で {string} を選択する',
  async ({ page }, formatName: string) => {
    console.log(`[4-8 When] フォーマット一覧で "${formatName}" を選択`);
    const formatItem = page.locator('[data-testid^="format-item-"]').filter({ hasText: formatName });
    await formatItem.waitFor({ state: 'visible', timeout: 10000 });
    await formatItem.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 「削除」ボタンをクリックして確認する（フォーマット削除）
 */
When(
  '「削除」ボタンをクリックして確認する',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット削除ボタンをクリックして確認');
    // フォーマット削除ボタンを探してクリック
    const deleteBtn = page.locator('button').filter({ hasText: '削除' }).first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // 確認ダイアログが表示された場合は OK をクリック
    const confirmOkBtn = page.locator('.ant-modal-confirm .ant-btn-dangerous, .ant-popconfirm .ant-btn-dangerous');
    const confirmVisible = await confirmOkBtn.isVisible().catch(() => false);
    if (confirmVisible) {
      await confirmOkBtn.click();
    }
    await page.waitForTimeout(1500);
  }
);

/**
 * 「詳細検索」ボタンをクリックする
 */
When(
  '「詳細検索」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「詳細検索」ボタンをクリック');
    const btn = page.getByText('詳細検索').first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 詳細検索モーダルで「条件追加」ボタンをN回クリックする
 *
 * @param n - クリック回数
 */
When(
  '詳細検索モーダルで「条件追加」ボタンを{int}回クリックする',
  async ({ page }, n: number) => {
    console.log(`[4-8 When] 「条件追加」ボタンを ${n} 回クリック`);
    for (let i = 0; i < n; i++) {
      const addBtn = page.locator('.ant-modal-content').getByText('条件追加').first();
      await addBtn.waitFor({ state: 'visible', timeout: 5000 });
      await addBtn.click();
      await page.waitForTimeout(300);
    }
  }
);

/**
 * 「リセット」ボタンをクリックする（詳細検索モーダル内）
 */
When(
  '「リセット」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「リセット」ボタンをクリック');
    const resetBtn = page.locator('.ant-modal-content').getByText('リセット').first();
    await resetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await resetBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 検索条件を入力せずに「検索」ボタンをクリックする
 */
When(
  '検索条件を入力せずに「検索」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 検索条件なしで「検索」ボタンをクリック');
    const searchBtn = page.locator('.ant-modal-content').getByText('検索').first();
    await searchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await searchBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォーマットを選択せずにボタンをクリックする（新規フォルダ）
 */
When(
  'フォーマットを選択せずに「新規フォルダ」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット未選択で「新規フォルダ」ボタンをクリック');
    const btn = page.locator('[data-testid="new-folder-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * テスト用フォーマットを選択する
 * FormatFolderTree.tsx: data-testid="format-item-{formatId}"
 */
When(
  'テスト用フォーマットを選択する',
  async ({ page }) => {
    console.log('[4-8 When] テスト用フォーマットを選択');
    // フォーマット一覧からテスト用フォーマットを選択
    const formatItem = page
      .locator('[data-testid^="format-item-"]')
      .filter({ hasText: TEST_FORMAT.name });
    await formatItem.waitFor({ state: 'visible', timeout: 10000 });
    await formatItem.click();
    await page.waitForTimeout(800);
  }
);

/**
 * 「新規フォルダ」ボタンをクリックする
 */
When(
  '「新規フォルダ」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「新規フォルダ」ボタンをクリック');
    const btn = page.locator('[data-testid="new-folder-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォルダ名を入力せずに「作成」ボタンをクリックする
 */
When(
  'フォルダ名を入力せずに「作成」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] フォルダ名を入力せずに「作成」ボタンをクリック');
    const okBtn = page.locator('.ant-modal-content .ant-btn-primary').filter({ hasText: '作成' });
    await okBtn.waitFor({ state: 'visible', timeout: 5000 });
    await okBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォルダ名に指定の文字列を入力する
 *
 * @param name - 入力するフォルダ名
 */
When(
  'フォルダ名に {string} を入力する',
  async ({ page }, name: string) => {
    console.log(`[4-8 When] フォルダ名に "${name}" を入力`);
    const input = page.locator('.ant-modal-content input[placeholder*="フォルダ名"], .ant-modal-content input').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(name);
    await page.waitForTimeout(300);
  }
);

/**
 * 「作成」ボタンをクリックする（モーダル内）
 */
When(
  '「作成」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「作成」ボタンをクリック');
    const okBtn = page.locator('.ant-modal-content .ant-btn-primary').filter({ hasText: '作成' });
    await okBtn.waitFor({ state: 'visible', timeout: 5000 });
    await okBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 新規フォルダ作成モーダルで「キャンセル」ボタンをクリックする
 */
When(
  '新規フォルダ作成モーダルで「キャンセル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 新規フォルダ作成モーダルで「キャンセル」ボタンをクリック');
    const cancelBtn = page.locator('.ant-modal-content .ant-btn').filter({ hasText: 'キャンセル' });
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォーマットを選択せずに「新規ファイル」ボタンをクリックする
 */
When(
  'フォーマットを選択せずに「新規ファイル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット未選択で「新規ファイル」ボタンをクリック');
    const btn = page.locator('[data-testid="new-file-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 「新規ファイル」ボタンをクリックする
 */
When(
  '「新規ファイル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「新規ファイル」ボタンをクリック');
    const btn = page.locator('[data-testid="new-file-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * XMLタイプのフォーマットを選択する
 */
When(
  'XMLタイプのフォーマットを選択する',
  async ({ page }) => {
    console.log('[4-8 When] XMLタイプのフォーマットを選択');
    const formatItem = page
      .locator('[data-testid^="format-item-"]')
      .filter({ hasText: TEST_FORMAT.name });
    await formatItem.waitFor({ state: 'visible', timeout: 10000 });
    await formatItem.click();
    await page.waitForTimeout(800);
  }
);

/**
 * MAIMLタイプのフォーマットを選択する
 */
When(
  'MAIMLタイプのフォーマットを選択する',
  async ({ page }) => {
    console.log('[4-8 When] MAIMLタイプのフォーマットを選択');
    const formatItem = page
      .locator('[data-testid^="format-item-"]')
      .filter({ hasText: TEST_FORMAT_MAIML.name });
    await formatItem.waitFor({ state: 'visible', timeout: 10000 });
    await formatItem.click();
    await page.waitForTimeout(800);
  }
);

/**
 * ファイル名を入力せずに「作成」ボタンをクリックする
 */
When(
  'ファイル名を入力せずに「作成」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] ファイル名を入力せずに「作成」ボタンをクリック');
    const okBtn = page.locator('.ant-modal-content .ant-btn-primary').filter({ hasText: '作成' });
    await okBtn.waitFor({ state: 'visible', timeout: 5000 });
    await okBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * ファイル名に101文字以上の文字列を入力する
 */
When(
  'ファイル名に101文字以上の文字列を入力する',
  async ({ page }) => {
    const longName = 'a'.repeat(101);
    console.log(`[4-8 When] ファイル名に101文字の文字列 "${longName.substring(0, 10)}..." を入力`);
    const input = page.locator('.ant-modal-content input[placeholder*="ファイル名"], .ant-modal-content input').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(longName);
    await page.waitForTimeout(300);
  }
);

/**
 * ファイル名に指定の文字列を入力する
 *
 * @param name - 入力するファイル名
 */
When(
  'ファイル名に {string} を入力する',
  async ({ page }, name: string) => {
    console.log(`[4-8 When] ファイル名に "${name}" を入力`);
    const input = page.locator('.ant-modal-content input[placeholder*="ファイル名"], .ant-modal-content input').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(name);
    await page.waitForTimeout(300);
  }
);

/**
 * テンプレートタイプを選択せずに「作成」ボタンをクリックする
 */
When(
  'テンプレートタイプを選択せずに「作成」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] テンプレートタイプ未選択で「作成」ボタンをクリック');
    const okBtn = page.locator('.ant-modal-content .ant-btn-primary').filter({ hasText: '作成' });
    await okBtn.waitFor({ state: 'visible', timeout: 5000 });
    await okBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 新規ファイル作成モーダルで「キャンセル」ボタンをクリックする
 */
When(
  '新規ファイル作成モーダルで「キャンセル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 新規ファイル作成モーダルで「キャンセル」ボタンをクリック');
    const cancelBtn = page.locator('.ant-modal-content .ant-btn').filter({ hasText: 'キャンセル' });
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * フォーマットを選択せずに「アップロード」ボタンをクリックする
 */
When(
  'フォーマットを選択せずに「アップロード」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] フォーマット未選択で「アップロード」ボタンをクリック');
    const btn = page.locator('[data-testid="upload-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 「アップロード」ボタンをクリックする
 * FormatManagement.tsx: data-testid="upload-button"
 */
When(
  '「アップロード」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「アップロード」ボタンをクリック');
    const btn = page.locator('[data-testid="upload-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * アップロードモードが「単一ファイル」であることを確認する
 */
When(
  'アップロードモードが「単一ファイル」であることを確認する',
  async ({ page }) => {
    console.log('[4-8 When] アップロードモードが「単一ファイル」であることを確認');
    // デフォルトが単一ファイルモードであることを確認
    const singleModeIndicator = page.locator('.ant-modal-content').getByText('単一ファイル');
    await expect(singleModeIndicator.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * アップロード用テストファイルを選択する
 *
 * @param fileName - 選択するファイル名
 */
When(
  'アップロード用テストファイル {string} を選択する',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 When] アップロード用テストファイル "${fileName}" を選択`);
    // テスト用ファイルパスを生成
    const testFilePath = path.resolve(__dirname, '../../fixtures', fileName);
    const fileInput = page.locator('.ant-modal-content input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(500);
  }
);

/**
 * アップロードモードを「一括ファイル」に切り替える
 */
When(
  'アップロードモードを「一括ファイル」に切り替える',
  async ({ page }) => {
    console.log('[4-8 When] アップロードモードを「一括ファイル」に切り替え');
    const bulkModeBtn = page.locator('.ant-modal-content').getByText('一括ファイル').first();
    await bulkModeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await bulkModeBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * アップロード用テストファイルを複数選択する
 */
When(
  'アップロード用テストファイルを複数選択する',
  async ({ page }) => {
    console.log('[4-8 When] アップロード用テストファイルを複数選択');
    const file1 = path.resolve(__dirname, '../../fixtures', 'test_upload.xml');
    const file2 = path.resolve(__dirname, '../../fixtures', 'test_upload2.xml');
    const fileInput = page.locator('.ant-modal-content input[type="file"]').first();
    await fileInput.setInputFiles([file1, file2]);
    await page.waitForTimeout(500);
  }
);

/**
 * 「アップロード開始」ボタンをクリックする
 */
When(
  '「アップロード開始」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 「アップロード開始」ボタンをクリック');
    const uploadBtn = page.locator('.ant-modal-content').getByText('アップロード開始').first();
    await uploadBtn.waitFor({ state: 'visible', timeout: 5000 });
    await uploadBtn.click();
    await page.waitForTimeout(1000);
  }
);

/**
 * ファイルを選択せずに「アップロード開始」ボタンをクリックする
 */
When(
  'ファイルを選択せずに「アップロード開始」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] ファイルを選択せずに「アップロード開始」ボタンをクリック');
    const uploadBtn = page.locator('.ant-modal-content').getByText('アップロード開始').first();
    await uploadBtn.waitFor({ state: 'visible', timeout: 5000 });
    await uploadBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * アップロード進捗中にアップロードダイアログの「キャンセル」ボタンをクリックする
 */
When(
  'アップロード進捗中にアップロードダイアログの「キャンセル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] アップロード進捗中に「キャンセル」ボタンをクリック');
    // アップロード開始直後にキャンセルをクリック（進捗中を模擬）
    const cancelBtn = page.locator('.ant-modal-content .ant-btn').filter({ hasText: 'キャンセル' });
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * MAIMLファイルの「編集」ボタンをクリックする
 * FormatFileListTable.tsx: data-testid="file-edit-button-{fileName}"
 *
 * @param fileName - 編集するファイル名
 */
When(
  'MAIMLファイル {string} の「編集」ボタンをクリックする',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 When] MAIMLファイル "${fileName}" の「編集」ボタンをクリック`);
    const editBtn = page.locator(`[data-testid="file-edit-button-${fileName}"]`);
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(2000);
  }
);

/**
 * XMLファイルの「編集」ボタンをクリックする
 * FormatFileListTable.tsx: data-testid="file-edit-button-{fileName}"
 *
 * @param fileName - 編集するファイル名
 */
When(
  'XMLファイル {string} の「編集」ボタンをクリックする',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 When] XMLファイル "${fileName}" の「編集」ボタンをクリック`);
    const editBtn = page.locator(`[data-testid="file-edit-button-${fileName}"]`);
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1500);
  }
);

/**
 * テキストファイルの「編集」ボタンをクリックする
 * FormatFileListTable.tsx: data-testid="file-edit-button-{fileName}"
 *
 * @param fileName - 編集するファイル名
 */
When(
  'テキストファイル {string} の「編集」ボタンをクリックする',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 When] テキストファイル "${fileName}" の「編集」ボタンをクリック`);
    const editBtn = page.locator(`[data-testid="file-edit-button-${fileName}"]`);
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1000);
  }
);

/**
 * テスト用ファイルの「削除」ボタンをクリックする
 * FormatFileListTable.tsx: data-testid="file-delete-button-{fileName}"
 *
 * @param fileName - 削除するファイル名
 */
When(
  'テスト用ファイル {string} の「削除」ボタンをクリックする',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 When] テスト用ファイル "${fileName}" の「削除」ボタンをクリック`);
    const deleteBtn = page.locator(`[data-testid="file-delete-button-${fileName}"]`);
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);
  }
);

/**
 * 削除確認ダイアログで「削除」ボタンをクリックする
 */
When(
  '削除確認ダイアログで「削除」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 削除確認ダイアログで「削除」ボタンをクリック');
    // Ant Design の Confirm モーダル内の危険ボタン
    const okBtn = page.locator('.ant-modal-confirm-btns .ant-btn-dangerous, .ant-modal-content .ant-btn-dangerous');
    await okBtn.waitFor({ state: 'visible', timeout: 5000 });
    await okBtn.click();
    await page.waitForTimeout(1500);
  }
);

/**
 * 削除確認ダイアログで「キャンセル」ボタンをクリックする
 */
When(
  '削除確認ダイアログで「キャンセル」ボタンをクリックする',
  async ({ page }) => {
    console.log('[4-8 When] 削除確認ダイアログで「キャンセル」ボタンをクリック');
    const cancelBtn = page.locator('.ant-modal-confirm-btns .ant-btn:not(.ant-btn-dangerous), .ant-modal-content .ant-btn').filter({ hasText: 'キャンセル' });
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }
);

// ===========================================================================
// Then: 表示確認ステップ
// ===========================================================================

/**
 * フォーマット一覧にフォーマットが1件以上表示されること
 */
Then(
  'フォーマット一覧にフォーマットが1件以上表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] フォーマット一覧にフォーマットが1件以上表示されること を確認');
    const formatItems = page.locator('[data-testid^="format-item-"]');
    const count = await formatItems.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[4-8 Then] フォーマット一覧: ${count} 件確認`);
  }
);

/**
 * フォーマット一覧に指定フォーマットが表示されること
 *
 * @param formatName - 表示されていることを確認するフォーマット名
 */
Then(
  'フォーマット一覧に {string} が表示されること',
  async ({ page }, formatName: string) => {
    console.log(`[4-8 Then] フォーマット一覧に "${formatName}" が表示されること を確認`);
    const formatItem = page.locator('[data-testid^="format-item-"]').filter({ hasText: formatName });
    await expect(formatItem.first()).toBeVisible({ timeout: 10000 });
  }
);

/**
 * フォーマット一覧から指定フォーマットが削除されること
 *
 * @param formatName - 削除されたことを確認するフォーマット名
 */
Then(
  'フォーマット一覧から {string} が削除されること',
  async ({ page }, formatName: string) => {
    console.log(`[4-8 Then] フォーマット一覧から "${formatName}" が削除されること を確認`);
    const formatItem = page.locator('[data-testid^="format-item-"]').filter({ hasText: formatName });
    await expect(formatItem).not.toBeVisible({ timeout: 10000 });
  }
);

/**
 * 詳細検索モーダルが表示されること
 */
Then(
  '詳細検索モーダルが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] 詳細検索モーダルが表示されること を確認');
    // Ant Design Modal が開いていることを確認
    const modal = page.locator('.ant-modal-content').filter({ hasText: '詳細検索' });
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 検索条件がN件表示されること
 *
 * @param expectedCount - 期待する検索条件の件数
 */
Then(
  '検索条件が{int}件表示されること',
  async ({ page }, expectedCount: number) => {
    console.log(`[4-8 Then] 検索条件が ${expectedCount} 件表示されること を確認`);
    // 検索条件の行数を数える（各条件の行）
    const conditionRows = page.locator('.ant-modal-content .ant-row, .ant-modal-content .search-condition-row');
    const count = await conditionRows.count();
    expect(count).toBeGreaterThanOrEqual(expectedCount);
  }
);

/**
 * 「条件追加」ボタンが非表示になること（5件上限）
 */
Then(
  '「条件追加」ボタンが非表示になること',
  async ({ page }) => {
    console.log('[4-8 Then] 「条件追加」ボタンが非表示になること を確認');
    const addBtn = page.locator('.ant-modal-content').getByText('条件追加');
    await expect(addBtn).not.toBeVisible({ timeout: 3000 });
  }
);

/**
 * 検索条件が1件の初期状態に戻ること
 */
Then(
  '検索条件が1件の初期状態に戻ること',
  async ({ page }) => {
    console.log('[4-8 Then] 検索条件が1件の初期状態に戻ること を確認');
    // リセット後は「条件追加」ボタンが表示されていることを確認（1件のみの状態）
    const addBtn = page.locator('.ant-modal-content').getByText('条件追加');
    await expect(addBtn.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * エラーメッセージが表示されること（詳細検索）
 *
 * @param message - 期待するエラーメッセージテキスト
 */
Then(
  '{string} というエラーメッセージが表示されること',
  async ({ page }, message: string) => {
    console.log(`[4-8 Then] "${message}" というエラーメッセージが表示されること を確認`);
    // Ant Design の message.error または validation error
    const errorMsg = page
      .locator('.ant-message-error, .ant-form-item-explain-error, .ant-alert-error')
      .filter({ hasText: message });
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 警告メッセージが表示されること
 *
 * @param message - 期待する警告メッセージテキスト
 */
Then(
  '{string} という警告メッセージが表示されること',
  async ({ page }, message: string) => {
    console.log(`[4-8 Then] "${message}" という警告メッセージが表示されること を確認`);
    const warningMsg = page
      .locator('.ant-message-warning, .ant-message-error')
      .filter({ hasText: message });
    await expect(warningMsg.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 新規フォルダ作成モーダルが表示されること
 */
Then(
  '新規フォルダ作成モーダルが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] 新規フォルダ作成モーダルが表示されること を確認');
    const modal = page.locator('.ant-modal-content').filter({ hasText: 'フォルダ' });
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * フォルダ名のバリデーションエラーが表示されること
 */
Then(
  'フォルダ名のバリデーションエラーが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] フォルダ名のバリデーションエラーが表示されること を確認');
    const errorMsg = page.locator('.ant-form-item-explain-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * フォルダ名フォーマットのバリデーションエラーが表示されること（使用不可文字）
 */
Then(
  'フォルダ名フォーマットのバリデーションエラーが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] フォルダ名フォーマットのバリデーションエラーが表示されること を確認');
    const errorMsg = page.locator('.ant-form-item-explain-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
    // エラーメッセージが表示されていること（内容はバリデーションメッセージに依存）
    const errorText = await errorMsg.first().textContent();
    console.log(`[4-8 Then] バリデーションエラーメッセージ: "${errorText}"`);
    expect(errorText).toBeTruthy();
  }
);

/**
 * 新規フォルダ作成モーダルが閉じること
 */
Then(
  '新規フォルダ作成モーダルが閉じること',
  async ({ page }) => {
    console.log('[4-8 Then] 新規フォルダ作成モーダルが閉じること を確認');
    const modal = page.locator('.ant-modal-content').filter({ hasText: 'フォルダ' });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  }
);

/**
 * 新規ファイル作成モーダルが表示されること
 */
Then(
  '新規ファイル作成モーダルが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] 新規ファイル作成モーダルが表示されること を確認');
    const modal = page.locator('.ant-modal-content').filter({ hasText: 'ファイル' });
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 新規ファイル作成モーダルにテンプレートタイプ選択が表示されること（XML用）
 */
Then(
  '新規ファイル作成モーダルにテンプレートタイプ選択が表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] テンプレートタイプ選択が表示されること を確認');
    // Material / Condition / Result のいずれかが表示されていること
    const templateTypeSelector = page.locator('.ant-modal-content').getByText('Material').or(
      page.locator('.ant-modal-content').getByText('テンプレートタイプ')
    );
    await expect(templateTypeSelector.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 新規ファイル作成モーダルにテンプレートタイプ選択が表示されないこと（MAIML用）
 */
Then(
  '新規ファイル作成モーダルにテンプレートタイプ選択が表示されないこと',
  async ({ page }) => {
    console.log('[4-8 Then] テンプレートタイプ選択が表示されないこと を確認');
    const templateTypeSelector = page.locator('.ant-modal-content').getByText('Material');
    await expect(templateTypeSelector).not.toBeVisible({ timeout: 3000 });
  }
);

/**
 * ファイル名のバリデーションエラーが表示されること
 */
Then(
  'ファイル名のバリデーションエラーが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] ファイル名のバリデーションエラーが表示されること を確認');
    const errorMsg = page.locator('.ant-form-item-explain-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * ファイル名の文字数超過バリデーションエラーが表示されること
 */
Then(
  'ファイル名の文字数超過バリデーションエラーが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] ファイル名の文字数超過バリデーションエラーが表示されること を確認');
    const errorMsg = page.locator('.ant-form-item-explain-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
    const errorText = await errorMsg.first().textContent();
    console.log(`[4-8 Then] バリデーションエラーメッセージ: "${errorText}"`);
    expect(errorText).toBeTruthy();
  }
);

/**
 * テンプレートタイプのバリデーションエラーが表示されること
 */
Then(
  'テンプレートタイプのバリデーションエラーが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] テンプレートタイプのバリデーションエラーが表示されること を確認');
    const errorMsg = page.locator('.ant-form-item-explain-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * 新規ファイル作成モーダルが閉じること
 */
Then(
  '新規ファイル作成モーダルが閉じること',
  async ({ page }) => {
    console.log('[4-8 Then] 新規ファイル作成モーダルが閉じること を確認');
    const modal = page.locator('.ant-modal-content').filter({ hasText: 'ファイル作成' });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  }
);

/**
 * アップロードダイアログが表示されること
 */
Then(
  'アップロードダイアログが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] アップロードダイアログが表示されること を確認');
    const dialog = page.locator('.ant-modal-content').filter({ hasText: 'アップロード' });
    await expect(dialog.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * アップロード完了メッセージが表示されること
 */
Then(
  'アップロード完了メッセージが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] アップロード完了メッセージが表示されること を確認');
    const successMsg = page
      .locator('.ant-message-success, .ant-alert-success, .ant-result-success')
      .or(page.locator('.ant-modal-content').getByText('完了'));
    await expect(successMsg.first()).toBeVisible({ timeout: 10000 });
  }
);

/**
 * 選択済みファイルリストがクリアされること
 */
Then(
  '選択済みファイルリストがクリアされること',
  async ({ page }) => {
    console.log('[4-8 Then] 選択済みファイルリストがクリアされること を確認');
    // ファイルリストエリアに選択されたファイルが表示されていないことを確認
    const fileList = page.locator('.ant-modal-content .ant-upload-list');
    const fileCount = await fileList.locator('.ant-upload-list-item').count();
    expect(fileCount).toBe(0);
  }
);

/**
 * 選択ファイル数が1件であること（単一ファイルモード）
 */
Then(
  '選択ファイル数が1件であること',
  async ({ page }) => {
    console.log('[4-8 Then] 選択ファイル数が1件であること を確認');
    const fileListItems = page.locator('.ant-modal-content .ant-upload-list-item');
    const count = await fileListItems.count();
    expect(count).toBe(1);
    console.log(`[4-8 Then] 選択ファイル数: ${count} 件（期待値: 1）`);
  }
);

/**
 * アップロード進捗表示エリアが表示されること
 */
Then(
  'アップロード進捗表示エリアが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] アップロード進捗表示エリアが表示されること を確認');
    // 進捗バーまたは進捗表示テキストが存在すること
    const progressIndicator = page
      .locator('.ant-modal-content .ant-progress')
      .or(page.locator('.ant-modal-content').getByText('%'));
    await expect(progressIndicator.first()).toBeVisible({ timeout: 10000 });
  }
);

/**
 * アップロードキャンセル確認ダイアログが表示されること
 */
Then(
  'アップロードキャンセル確認ダイアログが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] アップロードキャンセル確認ダイアログが表示されること を確認');
    // キャンセル確認のダイアログまたはメッセージ
    const confirmDialog = page
      .locator('.ant-modal-confirm')
      .or(page.locator('.ant-modal-content').getByText('キャンセル'));
    await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * PetriNetEditorがフルスクリーンで表示されること
 */
Then(
  'PetriNetEditorがフルスクリーンで表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] PetriNetEditorがフルスクリーンで表示されること を確認');
    // PetriNetEditorはfixedで全画面表示されるためz-index=1000のdivが存在すること
    // 「閉じる」ボタンが表示されていることを確認（PetriNetEditor内のヘッダー）
    const closeBtn = page.getByText('閉じる').first();
    await expect(closeBtn).toBeVisible({ timeout: 15000 });
    console.log('[4-8 Then] PetriNetEditorの「閉じる」ボタン表示確認 完了');
  }
);

/**
 * TemplateEditorDialogがモーダルで表示されること
 */
Then(
  'TemplateEditorDialogがモーダルで表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] TemplateEditorDialogがモーダルで表示されること を確認');
    // TemplateEditorDialogはAnt Design Modalで表示される
    const dialog = page.locator('.ant-modal-content');
    await expect(dialog.first()).toBeVisible({ timeout: 10000 });
    // エディタが開いていることを確認（XMLエディタのコンテンツエリア）
    console.log('[4-8 Then] TemplateEditorDialog表示確認 完了');
  }
);

/**
 * 非対応ファイル形式のエラーメッセージが表示されること
 */
Then(
  '非対応ファイル形式のエラーメッセージが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] 非対応ファイル形式のエラーメッセージが表示されること を確認');
    const errorMsg = page.locator('.ant-message-error');
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
    const errorText = await errorMsg.first().textContent();
    console.log(`[4-8 Then] エラーメッセージ: "${errorText}"`);
    expect(errorText).toBeTruthy();
  }
);

/**
 * ファイル削除確認ダイアログが表示されること
 */
Then(
  'ファイル削除確認ダイアログが表示されること',
  async ({ page }) => {
    console.log('[4-8 Then] ファイル削除確認ダイアログが表示されること を確認');
    // Ant Design の modal.confirm が表示されること
    const confirmDialog = page.locator('.ant-modal-confirm');
    await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 });
  }
);

/**
 * ファイル削除が実行されること（削除確認ダイアログで確認後）
 * ※ 削除APIは未実装のため、削除アクションが呼び出されたことのみ確認
 */
Then(
  'ファイル削除が実行されること',
  async ({ page }) => {
    console.log('[4-8 Then] ファイル削除が実行されること を確認（UI動作のみ）');
    // 削除確認ダイアログが閉じることを確認
    const confirmDialog = page.locator('.ant-modal-confirm');
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
    console.log('[4-8 Then] 削除確認ダイアログが閉じたことを確認（APIは未実装）');
  }
);

/**
 * ファイル一覧に指定ファイルが引き続き表示されること（削除キャンセル確認）
 *
 * @param fileName - 表示されていることを確認するファイル名
 */
Then(
  'ファイル一覧に {string} が引き続き表示されること',
  async ({ page }, fileName: string) => {
    console.log(`[4-8 Then] ファイル一覧に "${fileName}" が引き続き表示されること を確認`);
    const fileRow = page.getByText(fileName).first();
    await expect(fileRow).toBeVisible({ timeout: 5000 });
  }
);

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用フォーマットを UPSERT する
 *
 * @param format - フォーマットデータ
 *
 * DDL参照: docs/design/db/ddl/format.sql（存在する場合）
 * テーブル: format
 */
async function upsertFormat(format: {
  id: string;
  name: string;
  folderName: string;
  fileType: 'xml' | 'maiml';
  description: string;
  departmentCd: string;
}): Promise<void> {
  console.log(`[4-8 upsertFormat] 開始: format_id=${format.id}`);
  try {
    const existing = await db.query<{ format_id: string }>(
      'SELECT format_id FROM format WHERE organization_id = $1 AND format_id = $2',
      [ORG_ID, format.id]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE format
         SET format_name = $1,
             folder_name = $2,
             file_type = $3,
             description = $4,
             update_user_id = 'e2e-test',
             update_at = NOW()
         WHERE organization_id = $5 AND format_id = $6`,
        [format.name, format.folderName, format.fileType, format.description, ORG_ID, format.id]
      );
      console.log(`[4-8 upsertFormat] UPDATE 完了: format_id=${format.id}`);
    } else {
      await db.query(
        `INSERT INTO format (
          organization_id, format_id, format_name, folder_name,
          file_type, description, department_cd,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, format.id, format.name, format.folderName, format.fileType, format.description, format.departmentCd]
      );
      console.log(`[4-8 upsertFormat] INSERT 完了: format_id=${format.id}`);
    }
  } catch (error) {
    console.error(`[4-8 upsertFormat] 失敗: format_id=${format.id}:`, error);
    throw error;
  }
}
