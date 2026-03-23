/**
 * ステップ定義: [1] プロバイダー機能（1-1〜1-9 統合）
 *
 * 対応 feature: tests/e2e/features/provider/1_provider.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6
 *   ユーザID  : seiya.takizawa@soft-service.co.jp
 *   パスワード: auth0002
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { v4 as uuidv4 } from 'uuid';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FIXTURE_DIR = path.join(__dirname, '../../fixtures/csv/upload');

/** DataTable の行型 */
type DataTableRow = { フィールド: string; 値: string };
type CompanyRow = { 会社名: string };
type OrgRow = { 組織表示名: string };

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** 作成した会社名（After で DELETE） */
const createdCorporationNames: string[] = [];
/** 作成した組織表示名（After で DELETE） */
const createdOrganizationNames: string[] = [];
/** 作成した組織CD（After で DELETE） */
const createdOrganizationCds: string[] = [];
/**
 * グループ共有会社名（グループ最終シナリオの After でのみ DELETE）
 * 通常の After で消えないよう createdCorporationNames とは分離する
 */
const groupSharedCorporationNames: string[] = [];
/**
 * グループ共有組織CD（グループ最終シナリオの After でのみ DELETE）
 * 通常の After で消えないよう createdOrganizationCds とは分離する
 */
const groupSharedOrganizationCds: string[] = [];
/** グループ共有組織表示名（After で表示名ベースの DELETE 用） */
const groupSharedOrganizationNames: string[] = [];
/** 会社名リネーム復元リスト */
const renamedCorps: Array<{ from: string; to: string }> = [];
/** 会社 is_active 復元リスト */
const corpStatusRestore: Array<{ name: string; isActive: boolean }> = [];
/** 組織 is_active・表示名 復元リスト（organization_cd ベースで復元） */
const orgStatusRestore: Array<{
  organizationCd: string;
  originalDisplayName: string;
  isActive: boolean;
}> = [];
/** 組織追加フォームで最後に入力された組織CD（POST 成功時のみ createdOrganizationCds に追加） */
let lastEnteredOrgCd: string | null = null;
/** ダウンロード CSV 内容 */
let downloadedCsvContent: string | null = null;
let downloadedOrgCsvContent: string | null = null;
let downloadedBillingCsvContent: string | null = null;
let downloadedInfoCsvContent: string | null = null;

// ---------------------------------------------------------------------------
// テストデータ JSON ファイルパス
// ---------------------------------------------------------------------------

const CORP_DATA_PATH = path.join(__dirname, '../../fixtures/testdata/corporation_test_data.json');
const ORG_DATA_PATH = path.join(__dirname, '../../fixtures/testdata/organization_test_data.json');

// ---------------------------------------------------------------------------
// Before フック: 1-2 (会社編集)
// 1-2-1: UI 経由でグループ全体の会社を一括登録後、1-2-1 の is_active を適用
// 1-2-2〜1-2-6: DB UPDATE で is_active のみ調整
// ---------------------------------------------------------------------------

Before({ tags: '@1-2-1' }, async ({ page }) => {
  await loginForSetup(page);
  await registerCorporationsViaUI(page, 'group-1-2-setup');
  await applyCorporationIsActiveOverrides('1-2-1');
});

Before({ tags: '@1-2-2' }, async () => {
  await applyCorporationIsActiveOverrides('1-2-2');
});

Before({ tags: '@1-2-3' }, async () => {
  await applyCorporationIsActiveOverrides('1-2-3');
});

Before({ tags: '@1-2-4' }, async () => {
  await applyCorporationIsActiveOverrides('1-2-4');
});

Before({ tags: '@1-2-5' }, async () => {
  await applyCorporationIsActiveOverrides('1-2-5');
});

Before({ tags: '@1-2-6' }, async () => {
  await applyCorporationIsActiveOverrides('1-2-6');
});

// ---------------------------------------------------------------------------
// Before フック: 1-3 (会社トグル)
// 1-3-1: UI 経由でグループ全体の会社を一括登録後、1-3-1 の is_active を適用
// 1-3-2〜1-3-5: DB UPDATE で is_active のみ調整
// ---------------------------------------------------------------------------

Before({ tags: '@1-3-1' }, async ({ page }) => {
  await loginForSetup(page);
  await registerCorporationsViaUI(page, 'group-1-3-setup');
  await applyCorporationIsActiveOverrides('1-3-1');
});

Before({ tags: '@1-3-2' }, async () => {
  await applyCorporationIsActiveOverrides('1-3-2');
});

Before({ tags: '@1-3-3' }, async () => {
  await applyCorporationIsActiveOverrides('1-3-3');
});

Before({ tags: '@1-3-4' }, async () => {
  await applyCorporationIsActiveOverrides('1-3-4');
});

Before({ tags: '@1-3-5' }, async () => {
  await applyCorporationIsActiveOverrides('1-3-5');
});

// ---------------------------------------------------------------------------
// Before フック: 1-5-7 (組織CD重複テスト)
// e2e-permanent-org-aaa が DB に存在することを保証する
// ---------------------------------------------------------------------------

Before({ tags: '@1-5-7' }, async () => {
  await setupOrganizationTestData('1-5-7');
});

// ---------------------------------------------------------------------------
// Before フック: 1-6 (組織編集)
// 1-6-1: UI 経由でグループ全体の組織を一括登録後、1-6-1 の is_active を適用
// 1-6-2〜1-6-8: DB UPDATE で is_active のみ調整
// ---------------------------------------------------------------------------

Before({ tags: '@1-6-1' }, async ({ page }) => {
  await loginForSetup(page);
  await registerOrganizationsViaUI(page, 'group-1-6-setup');
  await applyOrganizationIsActiveOverrides('1-6-1');
});

Before({ tags: '@1-6-2' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-2');
});

Before({ tags: '@1-6-3' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-3');
});

Before({ tags: '@1-6-4' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-4');
});

Before({ tags: '@1-6-5' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-5');
});

Before({ tags: '@1-6-6' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-6');
});

Before({ tags: '@1-6-7' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-7');
});

Before({ tags: '@1-6-8' }, async () => {
  await applyOrganizationIsActiveOverrides('1-6-8');
});

// ---------------------------------------------------------------------------
// Before フック: 1-7 (組織トグル)
// 1-7-1: UI 経由でグループ全体の組織を一括登録後、1-7-1 の is_active を適用
// 1-7-2〜1-7-5: DB UPDATE で is_active のみ調整
// ---------------------------------------------------------------------------

Before({ tags: '@1-7-1' }, async ({ page }) => {
  await loginForSetup(page);
  await registerOrganizationsViaUI(page, 'group-1-7-setup');
  await applyOrganizationIsActiveOverrides('1-7-1');
});

Before({ tags: '@1-7-2' }, async () => {
  await applyOrganizationIsActiveOverrides('1-7-2');
});

Before({ tags: '@1-7-3' }, async () => {
  await applyOrganizationIsActiveOverrides('1-7-3');
});

Before({ tags: '@1-7-4' }, async () => {
  await setupOrganizationTestData('1-7-4');
  await applyOrganizationIsActiveOverrides('1-7-4');
});

Before({ tags: '@1-7-5' }, async () => {
  await setupOrganizationTestData('1-7-5');
  await applyOrganizationIsActiveOverrides('1-7-5');
});

// ---------------------------------------------------------------------------
// Given: 前提ステップ
// ---------------------------------------------------------------------------

Given(
  'テスト用組織CD {string} がDBに存在しないこと',
  async ({}, orgCd: string) => {
    // 関連テーブル（role_permission, role, user_authentication, organization_user）も含めてカスケード削除
    await deleteOrganizationCascade(orgCd).catch(() => {});
  }
);

Given(
  'テスト用組織 {string} がDBに存在しないこと',
  async ({}, orgName: string) => {
    await db.query(
      `DELETE FROM organization WHERE organization_display_name = $1`,
      [orgName]
    );
  }
);

Given(
  'テスト用組織 {string} がDBに存在すること',
  async ({}, orgName: string) => {
    await upsertOrganization(orgName, true);
  }
);

Given(
  'テスト用組織 {string} がis_active=trueでDBに存在すること',
  async ({}, orgName: string) => {
    await upsertOrganization(orgName, true);
  }
);

Given(
  'テスト用組織 {string} がis_active=falseでDBに存在すること',
  async ({}, orgName: string) => {
    await upsertOrganization(orgName, false);
  }
);

// ---------------------------------------------------------------------------
// When: 共通ログイン
// ---------------------------------------------------------------------------

When('プロバイダーユーザー {string} でログインする', async ({ page }, userId: string) => {
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', userId);
  await page.fill('#password', 'auth0002');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

// ===========================================================================
// [1-1][1-2][1-3][1-4] 会社管理
// ===========================================================================

When('会社管理画面を開く', async ({ page }) => {
  await page.waitForSelector('text=会社管理', { timeout: 15000 });
  await page.click('text=会社管理');
  await page.waitForSelector('table', { timeout: 15000 });
});

When('「追加」ボタンをクリックする', async ({ page }) => {
  await page.waitForSelector('button:has-text("追加")', { timeout: 10000 });
  await page.click('button:has-text("追加")');
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When('「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

When(
  '会社追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillCorporationForm(page, table.hashes());
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes('/provider/corporation') && r.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 10000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
    ]);
  }
);

When(
  '会社追加ダイアログで以下の情報を入力する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillCorporationForm(page, table.hashes());
  }
);

When('会社 {string} の「編集」ボタンをクリックする', async ({ page }, name: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.locator('button:has-text("編集")').click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  '会社編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillEditForm(page, table.hashes());
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page, '/provider/corporation', 'PUT');
  }
);

When('会社編集ダイアログで会社名を {string} に変更する', async ({ page }, newName: string) => {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
  await setInputValue(page, '.ant-modal .ant-input', newName);
});

When(
  '会社編集ダイアログで会社名を {string} に変更して保存する',
  async ({ page }, newName: string) => {
    await page.waitForSelector('.ant-modal', { timeout: 10000 });
    await setInputValue(page, '.ant-modal .ant-input', newName);
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page, '/provider/corporation', 'PUT');
  }
);

When('編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

When('会社 {string} の個別切り替えボタンをクリックする', async ({ page }, name: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.locator('button').filter({ hasText: /^(非アクティブ|アクティブ)$/ }).click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page, '/provider/corporation');
});

When('切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-default').click();
  await page.waitForSelector('.ant-modal-confirm', { state: 'hidden', timeout: 10000 });
});

When(
  '以下の会社のチェックボックスを選択する',
  async ({ page }, table: { hashes(): CompanyRow[] }) => {
    for (const row of table.hashes()) {
      const tableRow = page.locator('table tr', {
        has: page.locator(`td:has-text("${row['会社名']}")`),
      });
      await tableRow.waitFor({ state: 'visible', timeout: 15000 });
      await tableRow.locator('input[type="checkbox"]').check();
    }
  }
);

When('画面上部「追加」ボタンの右隣の「アクティブ」ボタンをクリックする', async ({ page }) => {
  const addBtn = page.locator('button:has-text("追加")');
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.locator('xpath=following-sibling::button[contains(., "アクティブ")]').first().click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('画面上部「リロード」ボタンの左隣の「非アクティブ」ボタンをクリックする', async ({ page }) => {
  const reloadBtn = page.locator('button:has-text("リロード")');
  await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  await reloadBtn.locator('xpath=preceding-sibling::button[contains(., "非アクティブ")]').first().click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('一括操作確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page, '/provider/corporation');
});

When('「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  // ja.json で会社管理は "CSV\nダウンロード"（改行あり）、情報ダウンロード等は "CSVダウンロード"（改行なし）。
  // :has-text() は \n をスペースに正規化するため "CSV ダウンロード" になりサブストリング一致しない。
  // [\s\S]* は改行を含むあらゆる文字にマッチするため、改行あり・なし両方のボタンにマッチする。
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `download_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  const raw = fs.readFileSync(tmpPath, 'utf-8');
  const content = raw.replace(/^\uFEFF/, '');
  // 会社管理・情報ダウンロード画面どちらからでも使えるよう両変数に保存
  downloadedCsvContent = content;
  downloadedInfoCsvContent = content;
  fs.unlinkSync(tmpPath);
});

When('「CSVアップロード」ボタンをクリックする', async ({}) => {
  // no-op
});

When('アップロードファイル {string} を選択する', async ({ page }, fileName: string) => {
  const csvPath = path.join(FIXTURE_DIR, fileName);
  if (fileName === 'corporations_valid.csv') {
    createdCorporationNames.push('E2E_CSV追加会社');
  }
  await page.setInputFiles('#csv-upload', csvPath);
  await Promise.race([
    page.waitForResponse(
      (r) => r.url().includes('/provider/corporation/upload-csv') && r.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 15000 }).catch(() => {}),
  ]);
});

// ---------------------------------------------------------------------------
// Then: 会社管理
// ---------------------------------------------------------------------------

Then('会社追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社追加' })).toBeVisible({ timeout: 10000 });
});

Then('会社追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社追加' })).not.toBeVisible({ timeout: 10000 });
});

Then('会社追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社追加' })).toBeVisible({ timeout: 5000 });
});

Then('会社編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社編集' })).toBeVisible({ timeout: 10000 });
});

Then('会社編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社編集' })).not.toBeVisible({ timeout: 10000 });
});

Then('会社編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '会社編集' })).toBeVisible({ timeout: 5000 });
});

Then('会社一覧に {string} が表示されること', async ({ page }, name: string) => {
  await expect(page.locator(`table td:has-text("${name}")`)).toBeVisible({ timeout: 10000 });
});

Then('会社一覧に {string} が表示されないこと', async ({ page }, name: string) => {
  await expect(page.locator(`table td:has-text("${name}")`)).not.toBeVisible({ timeout: 10000 });
});

Then('会社一覧の {string} の状態が {string} であること', async ({ page }, name: string, status: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await expect(row).toBeVisible({ timeout: 10000 });
  if (status === 'アクティブ') {
    await expect(row).not.toHaveClass(/inactive-row/);
  } else {
    await expect(row).toHaveClass(/inactive-row/, { timeout: 10000 });
  }
});

Then('データベースに会社名 {string} のレコードが存在すること', async ({}, name: string) => {
  const result = await db.query('SELECT corporation_id FROM corporation WHERE corporation_name = $1', [name]);
  expect(result.rowCount, `corporation_name="${name}" のレコードが存在しません`).toBeGreaterThan(0);
});

Then('データベースに会社名 {string} のレコードが存在しないこと', async ({}, name: string) => {
  const result = await db.query('SELECT corporation_id FROM corporation WHERE corporation_name = $1', [name]);
  expect(result.rowCount, `corporation_name="${name}" が存在しますが、存在しないはずです`).toBe(0);
});

Then('データベースの会社名 {string} のレコードが存在すること', async ({}, name: string) => {
  const result = await db.query('SELECT corporation_id FROM corporation WHERE corporation_name = $1', [name]);
  expect(result.rowCount, `corporation_name="${name}" のレコードが存在しません`).toBeGreaterThan(0);
});

Then('データベースの会社名 {string} の is_active が {word} であること', async ({}, name: string, val: string) => {
  const result = await db.query<{ is_active: boolean }>('SELECT is_active FROM corporation WHERE corporation_name = $1', [name]);
  expect(result.rowCount, `corporation_name="${name}" のレコードが存在しません`).toBeGreaterThan(0);
  expect(result.rows[0].is_active).toBe(val === 'true');
});

Then('データベースに会社名 {string} のレコードが1件のみ存在すること', async ({}, name: string) => {
  const result = await db.query('SELECT corporation_id FROM corporation WHERE corporation_name = $1', [name]);
  expect(result.rowCount, `corporation_name="${name}" が1件のみであることを期待しましたが ${result.rowCount} 件でした`).toBe(1);
});

Then('会社名フィールドが空であること', async ({ page }) => {
  await expect(page.locator('.ant-modal input[placeholder="株式会社サンプル"]')).toHaveValue('', { timeout: 5000 });
});

Then('会社名フィールドに {string} が表示されていること', async ({ page }, val: string) => {
  await expect(page.locator('.ant-modal .ant-input')).toHaveValue(val, { timeout: 5000 });
});

Then('状態の初期値が {string} であること', async ({ page }, label: string) => {
  const item = page.locator('.ant-modal .ant-form-item', { hasText: '状態' });
  await expect(item).toBeVisible({ timeout: 5000 });
  await expect(item).toContainText(label, { timeout: 5000 });
});

Then('「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('バリデーションエラー {string} が表示されること', async ({ page }, msg: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${msg}")`)).toBeVisible({ timeout: 5000 });
});

Then('エラーメッセージ {string} が表示されること', async ({ page }, msg: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${msg}"), .ant-form-item-explain-error:has-text("${msg}")`)
  ).toBeVisible({ timeout: 5000 });
});

Then('切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm')).toBeVisible({ timeout: 10000 });
});

Then('一括操作確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm')).toBeVisible({ timeout: 10000 });
});

Then('CSVファイルがダウンロードされること', async ({}) => {
  expect(downloadedCsvContent, 'CSVファイルがダウンロードされていません').not.toBeNull();
  expect(downloadedCsvContent!.length).toBeGreaterThan(0);
});

Then('ダウンロードしたCSVに {string} ヘッダーが含まれること', async ({}, header: string) => {
  expect(downloadedCsvContent, 'ダウンロードした CSV が存在しません').not.toBeNull();
  const firstLine = downloadedCsvContent!.split('\n')[0];
  expect(firstLine, `ヘッダー "${header}" が見つかりません`).toContain(header);
});

Then('エラーメッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper')).toBeVisible({ timeout: 10000 });
});

// ===========================================================================
// [1-5][1-6][1-7][1-8] 組織管理
// ===========================================================================

When('組織管理画面を開く', async ({ page }) => {
  await page.waitForSelector('text=組織管理', { timeout: 15000 });
  await page.click('text=組織管理');
  await page.waitForSelector('table', { timeout: 15000 });
});

When('組織管理の「追加」ボタンをクリックする', async ({ page }) => {
  await page.waitForSelector('button:has-text("追加")', { timeout: 10000 });
  await page.click('button:has-text("追加")');
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  '組織追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillOrganizationForm(page, table.hashes());
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes('/provider/organization') && r.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 10000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
    ]);
  }
);

When(
  '組織追加ダイアログで以下の情報を入力する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillOrganizationForm(page, table.hashes());
  }
);

When('組織追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

When('組織 {string} の「編集」ボタンをクリックする', async ({ page }, name: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.locator('button:has-text("編集")').click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  '組織編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, table: { hashes(): DataTableRow[] }) => {
    await fillOrganizationForm(page, table.hashes());
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page, '/provider/organization', 'PUT');
  }
);

When('組織編集ダイアログで組織表示名を {string} に変更する', async ({ page }, newName: string) => {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
  await fillModalInputByLabel(page, '組織表示名', newName);
});

When(
  '組織編集ダイアログで組織表示名を {string} に変更して保存する',
  async ({ page }, newName: string) => {
    await page.waitForSelector('.ant-modal', { timeout: 10000 });
    await fillModalInputByLabel(page, '組織表示名', newName);
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await waitForSaveResponse(page, '/provider/organization', 'PUT');
  }
);

When('組織編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 10000 });
});

When('組織 {string} の個別切り替えボタンをクリックする', async ({ page }, name: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.locator('button').filter({ hasText: /^(非アクティブ|アクティブ)$/ }).click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('組織切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page, '/provider/organization');
});

When('組織切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-default').click();
  await page.waitForSelector('.ant-modal-confirm', { state: 'hidden', timeout: 10000 });
});

When(
  '以下の組織のチェックボックスを選択する',
  async ({ page }, table: { hashes(): OrgRow[] }) => {
    for (const row of table.hashes()) {
      const tableRow = page.locator('table tr', {
        has: page.locator(`td:has-text("${row['組織表示名']}")`),
      });
      await tableRow.waitFor({ state: 'visible', timeout: 15000 });
      await tableRow.locator('input[type="checkbox"]').check();
    }
  }
);

When('組織管理画面の「アクティブ」ボタンをクリックする', async ({ page }) => {
  // 「追加」ボタンの following-sibling から「アクティブ」ボタンを特定
  // has-text は部分一致のため「非アクティブ」にもマッチしてしまう問題を避けるため
  // 会社管理（1-3-4）と同じ xpath following-sibling 方式を使用する
  const addBtn = page.locator('button:has-text("追加")');
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.locator('xpath=following-sibling::button[contains(., "アクティブ")]').first().click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('組織管理画面の「非アクティブ」ボタンをクリックする', async ({ page }) => {
  // 「リロード」ボタンの preceding-sibling から「非アクティブ」ボタンを特定
  // 会社管理（1-3-5）と同じ xpath preceding-sibling 方式を使用する
  const reloadBtn = page.locator('button:has-text("リロード")');
  await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  await reloadBtn.locator('xpath=preceding-sibling::button[contains(., "非アクティブ")]').first().click();
  await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
});

When('組織一括操作確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm .ant-btn-primary').click();
  await waitForPatchResponse(page, '/provider/organization');
});

When('組織管理の「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button:has-text("CSVダウンロード")').click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `organizations_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  const raw = fs.readFileSync(tmpPath, 'utf-8');
  downloadedOrgCsvContent = raw.replace(/^\uFEFF/, '');
  fs.unlinkSync(tmpPath);
});

When('組織管理の「CSVアップロード」ボタンをクリックする', async ({}) => {
  // no-op
});

When('組織アップロードファイル {string} を選択する', async ({ page }, fileName: string) => {
  const csvPath = path.join(FIXTURE_DIR, fileName);
  if (fileName === 'organizations_valid.csv') {
    createdOrganizationNames.push('E2E_CSV追加組織');
    createdOrganizationCds.push('e2e-csv-added-org');
  }
  await page.setInputFiles('#csv-upload', csvPath);
  await Promise.race([
    page.waitForResponse(
      (r) => r.url().includes('/provider/organization/upload-csv') && r.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 15000 }).catch(() => {}),
  ]);
});

// ===========================================================================
// [1-9] 情報ダウンロード
// ===========================================================================

When('情報ダウンロード画面を開く', async ({ page }) => {
  await page.waitForSelector('text=情報ダウンロード', { timeout: 15000 });
  await page.click('text=情報ダウンロード');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('「課金情報CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button:has-text("課金情報CSVダウンロード")').click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `billing_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  const raw = fs.readFileSync(tmpPath, 'utf-8');
  downloadedBillingCsvContent = raw.replace(/^\uFEFF/, '');
  fs.unlinkSync(tmpPath);
});

// ---------------------------------------------------------------------------
// Then: 組織管理
// ---------------------------------------------------------------------------

Then('組織追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織追加' })).toBeVisible({ timeout: 10000 });
});

Then('組織追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織追加' })).not.toBeVisible({ timeout: 10000 });
});

Then('組織追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織追加' })).toBeVisible({ timeout: 5000 });
});

Then('組織編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織編集' })).toBeVisible({ timeout: 10000 });
});

Then('組織編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織編集' })).not.toBeVisible({ timeout: 10000 });
});

Then('組織編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: '組織編集' })).toBeVisible({ timeout: 5000 });
});

Then('組織一覧に {string} が表示されること', async ({ page }, name: string) => {
  await expect(page.locator(`table td:has-text("${name}")`)).toBeVisible({ timeout: 10000 });
});

Then('組織一覧に {string} が表示されないこと', async ({ page }, name: string) => {
  await expect(page.locator(`table td:has-text("${name}")`)).not.toBeVisible({ timeout: 10000 });
});

Then('組織一覧の {string} の状態が {string} であること', async ({ page }, name: string, status: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${name}")`) });
  await expect(row).toBeVisible({ timeout: 10000 });
  if (status === 'アクティブ') {
    await expect(row).not.toHaveClass(/inactive-row/);
  } else {
    await expect(row).toHaveClass(/inactive-row/, { timeout: 10000 });
  }
});

Then('データベースに組織表示名 {string} のレコードが存在すること', async ({}, name: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_display_name = $1', [name]);
  expect(result.rowCount, `organization_display_name="${name}" のレコードが存在しません`).toBeGreaterThan(0);
});

Then('データベースに組織表示名 {string} のレコードが存在しないこと', async ({}, name: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_display_name = $1', [name]);
  expect(result.rowCount, `organization_display_name="${name}" が存在しますが、存在しないはずです`).toBe(0);
});

Then('データベースの組織表示名 {string} の is_active が {word} であること', async ({}, name: string, val: string) => {
  const result = await db.query<{ is_active: boolean }>('SELECT is_active FROM organization WHERE organization_display_name = $1', [name]);
  expect(result.rowCount, `organization_display_name="${name}" のレコードが存在しません`).toBeGreaterThan(0);
  expect(result.rows[0].is_active).toBe(val === 'true');
});

Then('データベースに組織表示名 {string} のレコードが1件のみ存在すること', async ({}, name: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_display_name = $1', [name]);
  expect(result.rowCount).toBe(1);
});

// 組織CD ベースの Then

Then('データベースに組織CD {string} のレコードが存在すること', async ({}, cd: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_cd = $1', [cd]);
  expect(result.rowCount, `organization_cd="${cd}" のレコードが存在しません`).toBeGreaterThan(0);
});

Then('データベースの組織CD {string} の is_active が {word} であること', async ({}, cd: string, val: string) => {
  const result = await db.query<{ is_active: boolean }>('SELECT is_active FROM organization WHERE organization_cd = $1', [cd]);
  expect(result.rowCount, `organization_cd="${cd}" のレコードが存在しません`).toBeGreaterThan(0);
  expect(result.rows[0].is_active).toBe(val === 'true');
});

Then('データベースに組織CD {string} のレコードが存在しないこと', async ({}, cd: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_cd = $1', [cd]);
  expect(result.rowCount, `organization_cd="${cd}" が存在しますが、存在しないはずです`).toBe(0);
});

Then('データベースに組織CD {string} のレコードが1件のみ存在すること', async ({}, cd: string) => {
  const result = await db.query('SELECT organization_id FROM organization WHERE organization_cd = $1', [cd]);
  expect(result.rowCount, `organization_cd="${cd}" が1件のみであることを期待しましたが ${result.rowCount} 件でした`).toBe(1);
});

Then('組織表示名フィールドに {string} が表示されていること', async ({ page }, val: string) => {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '組織表示名' });
  await expect(formItem.locator('input').first()).toHaveValue(val, { timeout: 5000 });
});

Then('組織状態の初期値が {string} であること', async ({ page }, label: string) => {
  const item = page.locator('.ant-modal .ant-form-item', { hasText: '状態' });
  await expect(item).toBeVisible({ timeout: 5000 });
  await expect(item).toContainText(label, { timeout: 5000 });
});

Then('組織追加ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('組織追加ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('組織編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('組織編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('組織追加バリデーションエラー {string} が表示されること', async ({ page }, msg: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${msg}")`)).toBeVisible({ timeout: 8000 });
});

Then('組織編集バリデーションエラー {string} が表示されること', async ({ page }, msg: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${msg}")`)).toBeVisible({ timeout: 8000 });
});

Then('組織追加エラーメッセージ {string} が表示されること', async ({ page }, msg: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${msg}"), .ant-form-item-explain-error:has-text("${msg}")`)
  ).toBeVisible({ timeout: 8000 });
});

Then('組織編集エラーメッセージ {string} が表示されること', async ({ page }, msg: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${msg}"), .ant-form-item-explain-error:has-text("${msg}")`)
  ).toBeVisible({ timeout: 8000 });
});

Then('組織切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm')).toBeVisible({ timeout: 10000 });
});

Then('組織一括操作確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm')).toBeVisible({ timeout: 10000 });
});

Then('組織CSVファイルがダウンロードされること', async ({}) => {
  expect(downloadedOrgCsvContent, '組織CSVファイルがダウンロードされていません').not.toBeNull();
  expect(downloadedOrgCsvContent!.length).toBeGreaterThan(0);
});

Then('ダウンロードした組織CSVに {string} ヘッダーが含まれること', async ({}, header: string) => {
  expect(downloadedOrgCsvContent, 'ダウンロードした組織 CSV が存在しません').not.toBeNull();
  const firstLine = downloadedOrgCsvContent!.split('\n')[0];
  expect(firstLine, `ヘッダー "${header}" が見つかりません`).toContain(header);
});

Then('組織CSVエラーメッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper')).toBeVisible({ timeout: 10000 });
});

// 組織追加ダイアログ 初期値確認 Then

Then('組織CDフィールドが空であること', async ({ page }) => {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '組織CD' });
  await expect(formItem.locator('input').first()).toHaveValue('', { timeout: 5000 });
});

Then('組織表示名フィールドが空であること', async ({ page }) => {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '組織表示名' });
  await expect(formItem.locator('input').first()).toHaveValue('', { timeout: 5000 });
});

Then('二段階認証判定の初期値が {string} であること', async ({ page }, label: string) => {
  const item = page.locator('.ant-modal .ant-form-item', { hasText: '二段階認証判定' });
  await expect(item).toBeVisible({ timeout: 5000 });
  await expect(item).toContainText(label, { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Then: 情報ダウンロードCSV
// ---------------------------------------------------------------------------

Then('情報CSVファイルがダウンロードされること', async ({}) => {
  expect(downloadedInfoCsvContent, '情報CSVファイルがダウンロードされていません').not.toBeNull();
  expect(downloadedInfoCsvContent!.length).toBeGreaterThan(0);
});

Then('ダウンロードした情報CSVに {string} ヘッダーが含まれること', async ({}, header: string) => {
  expect(downloadedInfoCsvContent, 'ダウンロードした情報 CSV が存在しません').not.toBeNull();
  const firstLine = downloadedInfoCsvContent!.split('\n')[0];
  expect(firstLine, `ヘッダー "${header}" が見つかりません`).toContain(header);
});

// ---------------------------------------------------------------------------
// Then: 課金情報CSV
// ---------------------------------------------------------------------------

Then('課金情報CSVファイルがダウンロードされること', async ({}) => {
  expect(downloadedBillingCsvContent, '課金情報CSVファイルがダウンロードされていません').not.toBeNull();
  expect(downloadedBillingCsvContent!.length).toBeGreaterThan(0);
});

Then('ダウンロードした課金情報CSVに {string} ヘッダーが含まれること', async ({}, header: string) => {
  expect(downloadedBillingCsvContent, 'ダウンロードした課金情報 CSV が存在しません').not.toBeNull();
  const firstLine = downloadedBillingCsvContent!.split('\n')[0];
  expect(firstLine, `ヘッダー "${header}" が見つかりません`).toContain(header);
});

// ===========================================================================
// After フック: クリーンアップ
// ===========================================================================

After(async () => {
  // 作成した会社レコードを削除
  for (const name of createdCorporationNames) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }
  createdCorporationNames.length = 0;

  // 作成した組織レコードを削除（organization_cd ベース）
  for (const cd of createdOrganizationCds) {
    await deleteOrganizationCascade(cd).catch(() => {});
  }
  createdOrganizationCds.length = 0;

  // 作成した組織レコードを削除（organization_display_name ベース）
  for (const name of createdOrganizationNames) {
    await db.query('DELETE FROM organization WHERE organization_display_name = $1', [name]).catch(() => {});
  }
  createdOrganizationNames.length = 0;

  // 会社名リネームを復元
  for (const { from, to } of renamedCorps) {
    await db.query(
      `UPDATE corporation SET corporation_name = $1, update_at = NOW() WHERE corporation_name = $2`,
      [to, from]
    ).catch(() => {});
  }
  renamedCorps.length = 0;

  // 会社 is_active を復元
  for (const { name, isActive } of corpStatusRestore) {
    await db.query(
      `UPDATE corporation SET is_active = $1, update_at = NOW() WHERE corporation_name = $2`,
      [isActive, name]
    ).catch(() => {});
  }
  corpStatusRestore.length = 0;

  // 組織 is_active・表示名を復元（organization_cd ベース）
  for (const { organizationCd, originalDisplayName, isActive } of orgStatusRestore) {
    await db.query(
      `UPDATE organization
       SET organization_display_name = $1, is_active = $2, update_at = NOW()
       WHERE organization_cd = $3`,
      [originalDisplayName, isActive, organizationCd]
    ).catch(() => {});
  }
  orgStatusRestore.length = 0;

  // CSV 内容をリセット
  downloadedCsvContent = null;
  downloadedOrgCsvContent = null;
  downloadedBillingCsvContent = null;
  downloadedInfoCsvContent = null;
});

// ---------------------------------------------------------------------------
// グループ最終シナリオの After フック: グループ共有データを削除
// 各グループの最後のシナリオが終わったときのみ削除する
// ---------------------------------------------------------------------------

/** 1-2 グループの最終シナリオ (@1-2-6) After: MaimlソフトAAA/BBB を削除 */
After({ tags: '@1-2-6' }, async () => {
  for (const name of groupSharedCorporationNames) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }
  groupSharedCorporationNames.length = 0;
});

/** 1-3 グループの最終シナリオ (@1-3-5) After: MaimlソフトAAA/BBB/CCC/DDD/YYY を削除 */
After({ tags: '@1-3-5' }, async () => {
  for (const name of groupSharedCorporationNames) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }
  groupSharedCorporationNames.length = 0;
});

/** 1-6 グループの最終シナリオ (@1-6-8) After: E2E組織編集前/トグルBBB/常設AAA を削除 */
After({ tags: '@1-6-8' }, async () => {
  for (const cd of groupSharedOrganizationCds) {
    await deleteOrganizationCascade(cd).catch(() => {});
  }
  groupSharedOrganizationCds.length = 0;
  groupSharedOrganizationNames.length = 0;
});

/** 1-7 グループの最終シナリオ (@1-7-4) After: E2E組織トグルBBB/CCC/DDD/常設AAA を削除 */
After({ tags: '@1-7-4' }, async () => {
  for (const cd of groupSharedOrganizationCds) {
    await deleteOrganizationCascade(cd).catch(() => {});
  }
  groupSharedOrganizationCds.length = 0;
  groupSharedOrganizationNames.length = 0;
});

AfterAll(async () => {
  await closeDb();
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/** input 要素に React の onChange を発火させながら値をセットする */
async function setInputValue(
  page: import('@playwright/test').Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector);
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate(
    ({ sel, val }: { sel: string; val: string }) => {
      /* eslint-disable no-undef */
      const el = (document as Document).querySelector(sel) as HTMLInputElement | null;
      if (!el) return;
      const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeInputValueSetter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    { sel: selector, val: value }
  );
}

/** Ant Design Select でオプションを選択する */
async function selectOption(
  page: import('@playwright/test').Page,
  selectSelector: string,
  optionTitle: string
): Promise<void> {
  const selectEl = page.locator(selectSelector);
  await selectEl.waitFor({ state: 'visible', timeout: 5000 });
  await selectEl.click();
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
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${optionTitle}"]`).click();
}

/** 会社追加フォームに DataTable の値を入力する */
async function fillCorporationForm(
  page: import('@playwright/test').Page,
  rows: DataTableRow[]
): Promise<void> {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
  for (const row of rows) {
    if (row['フィールド'] === '会社名') {
      await page.evaluate(
        ({ val }: { val: string }) => {
          /* eslint-disable no-undef */
          const el = (document as Document).querySelector('.ant-modal .ant-input') as HTMLInputElement | null;
          if (!el) return;
          const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          setter?.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          /* eslint-enable no-undef */
        },
        { val: row['値'] || '' }
      );
      if (row['値']) createdCorporationNames.push(row['値']);
    }
    if (row['フィールド'] === '状態') {
      await selectOption(page, '.ant-modal .ant-select', row['値']);
    }
  }
}

/** 会社編集フォームに DataTable の値を入力する */
async function fillEditForm(
  page: import('@playwright/test').Page,
  rows: DataTableRow[]
): Promise<void> {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
  for (const row of rows) {
    if (row['フィールド'] === '会社名') {
      await setInputValue(page, '.ant-modal .ant-input', row['値']);
    }
    if (row['フィールド'] === '状態') {
      await selectOption(page, '.ant-modal .ant-select', row['値']);
    }
  }
}

/** label テキストに対応する input 要素に値をセットする（モーダル内） */
async function fillModalInputByLabel(
  page: import('@playwright/test').Page,
  labelText: string,
  value: string
): Promise<void> {
  // ant-form-item の中から labelText を持つものを探し、その中の visible input に直接値を入れる
  // ※ forceRender により追加/編集フォームが同時にDOMに存在するため、
  //    インデックスベースのアプローチは使わず、formItem スコープで直接操作する
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: labelText }).first();
  await formItem.waitFor({ state: 'visible', timeout: 5000 });
  // type="hidden" の input（Ant Design Select の hidden input 等）を除外して取得
  const input = formItem.locator('input:not([type="hidden"])').first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  // React の合成イベントを正しく発火させるため evaluate 内で native setter を使用
  await input.evaluate(
    (el: HTMLInputElement, val: string) => {
      /* eslint-disable no-undef */
      const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    value
  );
}

/** label テキストに対応する Ant Design Select でオプションを選択する（モーダル内） */
async function selectOptionByLabel(
  page: import('@playwright/test').Page,
  labelText: string,
  optionTitle: string
): Promise<void> {
  // ※ forceRender により追加/編集フォームが同時にDOMに存在するため、
  //    :visible フィルターで表示中のフォームの要素のみを対象にする
  const formItem = page.locator('.ant-modal .ant-form-item')
    .filter({ hasText: labelText })
    .and(page.locator(':visible'))
    .first();
  await formItem.waitFor({ state: 'visible', timeout: 5000 });
  const selectEl = formItem.locator('.ant-select').first();
  await selectEl.waitFor({ state: 'visible', timeout: 5000 });
  await selectEl.click();
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
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  // title 属性またはテキスト内容で一致するオプションを選択（Ant Design v6 対応）
  const option = visibleDropdown.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${optionTitle}$`) });
  await option.first().click();
}

/** 組織追加/編集フォームに DataTable の値を入力する */
async function fillOrganizationForm(
  page: import('@playwright/test').Page,
  rows: DataTableRow[]
): Promise<void> {
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  // フィールド → ラベルテキストのマッピング
  const inputLabelMap: Record<string, string> = {
    '組織CD': '組織CD',
    '組織表示名': '組織表示名',        // feature 側の別名を吸収
    '組織e-mail': '組織e-mail',
    '契約容量': '契約容量',
    '契約ユーザー数': '契約ユーザー数',
    '契約プロジェクト数': '契約プロジェクト数',
    '代表システム管理者': '代表システム管理者',
    '代表者メールアドレス': '代表者メールアドレス',
  };
  const selectLabelMap: Record<string, string> = {
    '会社名': '会社名',
    '二段階認証判定': '二段階認証判定',
    'みなし進捗使用フラグ': 'みなし進捗使用フラグ',
    '状態': '状態',
  };

  for (const row of rows) {
    const field = row['フィールド'];
    const value = row['値'] ?? '';

    if (field in inputLabelMap) {
      await fillModalInputByLabel(page, inputLabelMap[field], value);
      // 組織CD は POST 成功時のみ追跡するため、ここでは lastEnteredOrgCd に記録するだけ
      if (field === '組織CD' && value) {
        lastEnteredOrgCd = value;
      }
      // 組織表示名も同様に POST 成功時のみ追跡（When ステップ側で追加）
    } else if (field in selectLabelMap) {
      // デフォルト値（「なし」「無効」）の場合は操作不要のためスキップ
      const defaultValues = ['なし', '無効'];
      if (value && !defaultValues.includes(value)) {
        await selectOptionByLabel(page, selectLabelMap[field], value);
      }
    }
  }
}

/** PUT/POST レスポンス or エラートースト待機 */
async function waitForSaveResponse(
  page: import('@playwright/test').Page,
  urlPart: string,
  method: string
): Promise<void> {
  await Promise.race([
    page.waitForResponse(
      (r) => r.url().includes(urlPart) && r.request().method() === method,
      { timeout: 10000 }
    ).catch(() => {}),
    page.waitForSelector('.ant-form-item-explain-error', { timeout: 10000 }).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);
}

/** PATCH レスポンス or トースト待機 */
async function waitForPatchResponse(
  page: import('@playwright/test').Page,
  urlPart: string
): Promise<void> {
  await Promise.race([
    page.waitForResponse(
      (r) => r.url().includes(urlPart) && r.request().method() === 'PATCH',
      { timeout: 10000 }
    ).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);
}

// ---------------------------------------------------------------------------
// UI 経由テストデータ登録ヘルパー
// ---------------------------------------------------------------------------

/**
 * Before フック用ログイン
 * playwright-bdd の Before に渡される page を使ってプロバイダーとしてログインする
 */
async function loginForSetup(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', 'seiya.takizawa@soft-service.co.jp');
  await page.fill('#password', 'auth0002');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

/** corporation_test_data.json の group キーから会社を会社追加ダイアログ経由で一括登録する */
async function registerCorporationsViaUI(
  page: import('@playwright/test').Page,
  groupKey: string
): Promise<void> {
  interface GroupEntry {
    records: Array<{ corporation_name: string; is_active: boolean }>;
    cleanup_names: string[];
  }

  const json = JSON.parse(fs.readFileSync(CORP_DATA_PATH, 'utf-8')) as Record<string, GroupEntry>;
  const entry = json[groupKey];
  if (!entry) {
    throw new Error(`corporation_test_data.json に "${groupKey}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除
  for (const name of entry.cleanup_names) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }

  // 会社管理画面へ遷移
  await page.waitForSelector('text=会社管理', { timeout: 15000 });
  await page.click('text=会社管理');
  await page.waitForSelector('table', { timeout: 15000 });

  for (const rec of entry.records) {
    // 既に存在する場合はスキップ
    const existing = await db.query<{ corporation_id: string }>(
      'SELECT corporation_id FROM corporation WHERE corporation_name = $1',
      [rec.corporation_name]
    );
    if ((existing.rowCount ?? 0) > 0) {
      // 存在する場合は is_active のみ合わせる（初期値を true に揃えるだけなので基本スキップでよい）
      continue;
    }

    // 「追加」ボタンをクリックしてダイアログを開く
    await page.waitForSelector('button:has-text("追加")', { timeout: 10000 });
    await page.click('button:has-text("追加")');
    await page.waitForSelector('.ant-modal', { timeout: 10000 });

    // 会社名を入力
    await page.evaluate(
      ({ val }: { val: string }) => {
        /* eslint-disable no-undef */
        const el = (document as Document).querySelector('.ant-modal .ant-input') as HTMLInputElement | null;
        if (!el) return;
        const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        /* eslint-enable no-undef */
      },
      { val: rec.corporation_name }
    );

    // 状態が false（非アクティブ）の場合のみ Select を変更（デフォルトはアクティブ想定）
    if (!rec.is_active) {
      await selectOption(page, '.ant-modal .ant-select', '非アクティブ');
    }

    // 保存
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await page.waitForResponse(
      (r) => r.url().includes('/provider/corporation') && r.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => {});

    // グループ共有データとして追跡（グループ最終シナリオの After でのみ削除）
    groupSharedCorporationNames.push(rec.corporation_name);
  }
}

/**
 * corporation_test_data.json の is_active_overrides を DB UPDATE で適用する。
 * グループ登録後に各シナリオ固有の is_active 状態を設定する。
 */
async function applyCorporationIsActiveOverrides(scenarioId: string): Promise<void> {
  interface ScenarioEntry {
    is_active_overrides?: Array<{ corporation_name: string; is_active: boolean }>;
    cleanup_names: string[];
  }

  const json = JSON.parse(fs.readFileSync(CORP_DATA_PATH, 'utf-8')) as Record<string, ScenarioEntry>;
  const entry = json[scenarioId];
  if (!entry) {
    throw new Error(`corporation_test_data.json に "${scenarioId}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除
  for (const name of entry.cleanup_names) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }

  // is_active_overrides を DB UPDATE で適用
  for (const override of entry.is_active_overrides ?? []) {
    const existing = await db.query<{ is_active: boolean }>(
      'SELECT is_active FROM corporation WHERE corporation_name = $1',
      [override.corporation_name]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const originalIsActive = existing.rows[0].is_active;
      await db.query(
        'UPDATE corporation SET is_active = $1, update_at = NOW() WHERE corporation_name = $2',
        [override.is_active, override.corporation_name]
      );
      corpStatusRestore.push({ name: override.corporation_name, isActive: originalIsActive });
    }
  }
}

/** organization_test_data.json の group キーから組織を組織追加ダイアログ経由で一括登録する */
async function registerOrganizationsViaUI(
  page: import('@playwright/test').Page,
  groupKey: string
): Promise<void> {
  interface GroupEntry {
    records: Array<{
      organization_cd: string;
      organization_display_name: string;
      organization_email?: string;
      contract_capacity?: number;
      contract_users?: number;
      contract_projects?: number;
      is_entry?: string;
      use_deemed_progress?: string;
      is_active: boolean;
      chief_user_name?: string;
      chief_user_email?: string;
    }>;
    cleanup_names: string[];
  }

  const json = JSON.parse(fs.readFileSync(ORG_DATA_PATH, 'utf-8')) as Record<string, GroupEntry>;
  const entry = json[groupKey];
  if (!entry) {
    throw new Error(`organization_test_data.json に "${groupKey}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除
  for (const name of entry.cleanup_names) {
    await db.query(
      'DELETE FROM organization WHERE organization_display_name = $1',
      [name]
    ).catch(() => {});
  }

  // 組織管理画面へ遷移
  await page.waitForSelector('text=組織管理', { timeout: 15000 });
  await page.click('text=組織管理');
  await page.waitForSelector('table', { timeout: 15000 });

  for (const rec of entry.records) {
    // 既に organization_cd が存在する場合はスキップ
    const existing = await db.query<{ organization_id: string }>(
      'SELECT organization_id FROM organization WHERE organization_cd = $1',
      [rec.organization_cd]
    );
    if ((existing.rowCount ?? 0) > 0) {
      continue;
    }

    // 「追加」ボタンをクリックしてダイアログを開く
    await page.waitForSelector('button:has-text("追加")', { timeout: 10000 });
    await page.click('button:has-text("追加")');
    await page.waitForSelector('.ant-modal', { timeout: 10000 });

    // 組織CD を入力
    await fillModalInputByLabel(page, '組織CD', rec.organization_cd);
    // 組織表示名を入力
    await fillModalInputByLabel(page, '組織表示名', rec.organization_display_name);
    // 組織e-mail を入力
    if (rec.organization_email) {
      await fillModalInputByLabel(page, '組織e-mail', rec.organization_email);
    }
    // 契約容量を入力
    if (rec.contract_capacity !== undefined) {
      await fillModalInputByLabel(page, '契約容量', String(rec.contract_capacity));
    }
    // 契約ユーザー数を入力
    if (rec.contract_users !== undefined) {
      await fillModalInputByLabel(page, '契約ユーザー数', String(rec.contract_users));
    }
    // 契約プロジェクト数を入力
    if (rec.contract_projects !== undefined) {
      await fillModalInputByLabel(page, '契約プロジェクト数', String(rec.contract_projects));
    }
    // 二段階認証判定を選択（デフォルト「無効」以外の場合のみ変更）
    if (rec.is_entry && rec.is_entry !== '無効') {
      await selectOptionByLabel(page, '二段階認証判定', rec.is_entry);
    }
    // みなし進捗使用フラグを選択（デフォルト「なし」以外の場合のみ変更）
    if (rec.use_deemed_progress && rec.use_deemed_progress !== 'なし') {
      await selectOptionByLabel(page, 'みなし進捗使用フラグ', rec.use_deemed_progress);
    }
    // 状態が false（非アクティブ）の場合のみ変更
    if (!rec.is_active) {
      await selectOptionByLabel(page, '状態', '非アクティブ');
    }
    // 代表システム管理者を入力
    if (rec.chief_user_name) {
      await fillModalInputByLabel(page, '代表システム管理者', rec.chief_user_name);
    }
    // 代表者メールアドレスを入力
    if (rec.chief_user_email) {
      await fillModalInputByLabel(page, '代表者メールアドレス', rec.chief_user_email);
    }

    // 保存
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    await page.waitForResponse(
      (r) => r.url().includes('/provider/organization') && r.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => {});

    // グループ共有データとして追跡（グループ最終シナリオの After でのみ削除）
    groupSharedOrganizationCds.push(rec.organization_cd);
    groupSharedOrganizationNames.push(rec.organization_display_name);
  }
}

/**
 * organization_test_data.json の is_active_overrides を DB UPDATE で適用する。
 * グループ登録後に各シナリオ固有の is_active 状態を設定する。
 */
async function applyOrganizationIsActiveOverrides(scenarioId: string): Promise<void> {
  interface ScenarioEntry {
    is_active_overrides?: Array<{ organization_cd: string; is_active: boolean }>;
    cleanup_names: string[];
  }

  const json = JSON.parse(fs.readFileSync(ORG_DATA_PATH, 'utf-8')) as Record<string, ScenarioEntry>;
  const entry = json[scenarioId];
  if (!entry) {
    throw new Error(`organization_test_data.json に "${scenarioId}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除
  for (const name of entry.cleanup_names) {
    await db.query(
      'DELETE FROM organization WHERE organization_display_name = $1',
      [name]
    ).catch(() => {});
  }

  // is_active_overrides を DB UPDATE で適用
  for (const override of entry.is_active_overrides ?? []) {
    const existing = await db.query<{ is_active: boolean; organization_display_name: string }>(
      'SELECT is_active, organization_display_name FROM organization WHERE organization_cd = $1',
      [override.organization_cd]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const originalIsActive = existing.rows[0].is_active;
      const displayName = existing.rows[0].organization_display_name;
      await db.query(
        'UPDATE organization SET is_active = $1, update_at = NOW() WHERE organization_cd = $2',
        [override.is_active, override.organization_cd]
      );
      orgStatusRestore.push({
        organizationCd: override.organization_cd,
        originalDisplayName: displayName,
        isActive: originalIsActive,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// テストデータ型定義
// ---------------------------------------------------------------------------

interface CorporationRecord {
  corporation_name: string;
  is_active: boolean;
}

interface CorporationTestEntry {
  description: string;
  records: CorporationRecord[];
  cleanup_names: string[];
}

interface OrganizationRecord {
  organization_cd: string;
  organization_display_name: string;
  is_active: boolean;
}

interface OrganizationTestEntry {
  description: string;
  records: OrganizationRecord[];
  cleanup_names: string[];
}

/**
 * corporation_test_data.json からテストデータをセットアップする。
 * 1. cleanup_names に含まれる会社名が DB に存在すれば削除
 * 2. records の各会社が DB に存在すれば is_active を UPDATE、なければ INSERT
 * 3. テスト後の復元用に corpStatusRestore へ積む
 */
async function setupCorporationTestData(scenarioId: string): Promise<void> {
  const json = JSON.parse(fs.readFileSync(CORP_DATA_PATH, 'utf-8')) as Record<string, CorporationTestEntry>;
  const entry = json[scenarioId];
  if (!entry) {
    throw new Error(`corporation_test_data.json に "${scenarioId}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除
  for (const name of entry.cleanup_names) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }

  // records を UPSERT
  for (const rec of entry.records) {
    const existing = await db.query<{ is_active: boolean }>(
      'SELECT is_active FROM corporation WHERE corporation_name = $1',
      [rec.corporation_name]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // 存在する → is_active を設定値に更新し、テスト後復元用に元の状態を記録
      const originalIsActive = existing.rows[0].is_active;
      await db.query(
        'UPDATE corporation SET is_active = $1, update_at = NOW() WHERE corporation_name = $2',
        [rec.is_active, rec.corporation_name]
      );
      corpStatusRestore.push({ name: rec.corporation_name, isActive: originalIsActive });
    } else {
      // 存在しない → INSERT し、テスト後に削除
      await db.query(
        `INSERT INTO corporation (corporation_id, corporation_name, is_active, create_user_id, update_user_id, create_at, update_at)
         VALUES (gen_random_uuid(), $1, $2, 'e2e-test', 'e2e-test', NOW(), NOW())`,
        [rec.corporation_name, rec.is_active]
      );
      createdCorporationNames.push(rec.corporation_name);
    }
  }
}

/**
 * organization_test_data.json からテストデータをセットアップする。
 * 1. cleanup_names に含まれる組織表示名が DB に存在すれば削除
 * 2. records の各組織を organization_cd で UPSERT
 * 3. テスト後の復元用に orgStatusRestore へ積む
 */
async function setupOrganizationTestData(scenarioId: string): Promise<void> {
  const json = JSON.parse(fs.readFileSync(ORG_DATA_PATH, 'utf-8')) as Record<string, OrganizationTestEntry>;
  const entry = json[scenarioId];
  if (!entry) {
    throw new Error(`organization_test_data.json に "${scenarioId}" のエントリが見つかりません`);
  }

  // cleanup_names を事前削除（organization_display_name ベース）
  for (const name of entry.cleanup_names) {
    await db.query(
      'DELETE FROM organization WHERE organization_display_name = $1',
      [name]
    ).catch(() => {});
  }

  // records を UPSERT（organization_cd が UNIQUE インデックスなので ON CONFLICT 使用）
  for (const rec of entry.records) {
    const existing = await db.query<{ is_active: boolean; organization_display_name: string }>(
      'SELECT is_active, organization_display_name FROM organization WHERE organization_cd = $1',
      [rec.organization_cd]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // 存在する → is_active と表示名を更新し、テスト後復元用に元の状態を記録
      const originalIsActive = existing.rows[0].is_active;
      const originalDisplayName = existing.rows[0].organization_display_name;
      await db.query(
        `UPDATE organization
         SET organization_display_name = $1, is_active = $2, update_at = NOW()
         WHERE organization_cd = $3`,
        [rec.organization_display_name, rec.is_active, rec.organization_cd]
      );
      orgStatusRestore.push({
        organizationCd: rec.organization_cd,
        originalDisplayName,
        isActive: originalIsActive,
      });
    } else {
      // 存在しない → INSERT し、テスト後に organization_cd で削除
      await db.query(
        `INSERT INTO organization (
          organization_id, organization_cd, organization_display_name,
          organization_email, is_entry, use_deemed_progress,
          contract_capacity, contract_users, contract_projects,
          is_active, create_user_id, update_user_id, create_at, update_at
        ) VALUES (
          gen_random_uuid(), $1, $2,
          'e2e-test@example.com', 0, false,
          0, 0, 0,
          $3, 'e2e-test', 'e2e-test', NOW(), NOW()
        )`,
        [rec.organization_cd, rec.organization_display_name, rec.is_active]
      );
      createdOrganizationCds.push(rec.organization_cd);
    }
  }
}

/**
 * 組織を関連テーブルごと削除する（organization_cd ベース）
 * 削除順序: role_permission → role → user_authentication → organization_user → organization
 */
async function deleteOrganizationCascade(organizationCd: string): Promise<void> {
  const result = await db.query<{ organization_id: string }>(
    'SELECT organization_id FROM organization WHERE organization_cd = $1',
    [organizationCd]
  );
  if ((result.rowCount ?? 0) === 0) return;
  const orgId = result.rows[0].organization_id;

  // role_permission を削除（role_id 経由）
  const roles = await db.query<{ role_id: string }>(
    'SELECT role_id FROM role WHERE organization_id = $1',
    [orgId]
  );
  for (const role of roles.rows) {
    await db.query('DELETE FROM role_permission WHERE role_id = $1', [role.role_id]).catch(() => {});
  }

  await db.query('DELETE FROM role WHERE organization_id = $1', [orgId]).catch(() => {});
  await db.query('DELETE FROM user_authentication WHERE organization_id = $1', [orgId]).catch(() => {});
  await db.query('DELETE FROM organization_user WHERE organization_id = $1', [orgId]).catch(() => {});
  await db.query('DELETE FROM organization WHERE organization_id = $1', [orgId]).catch(() => {});
}

/** 組織を UPSERT する（テストデータ用） */
async function upsertOrganization(displayName: string, isActive: boolean): Promise<void> {
  // organization_display_name が既に存在する場合は is_active を更新、なければ INSERT
  const existing = await db.query<{ organization_id: string }>(
    'SELECT organization_id FROM organization WHERE organization_display_name = $1',
    [displayName]
  );
  if ((existing.rowCount ?? 0) > 0) {
    await db.query(
      'UPDATE organization SET is_active = $1, update_at = NOW() WHERE organization_display_name = $2',
      [isActive, displayName]
    );
  } else {
    const cd = `e2e-upsert-${Date.now()}`;
    await db.query(
      `INSERT INTO organization (
         organization_id, organization_cd, organization_display_name,
         organization_email, is_entry, use_deemed_progress,
         contract_capacity, contract_users, contract_projects,
         is_active, create_user_id, update_user_id, create_at, update_at
       ) VALUES (
         gen_random_uuid(), $1, $2,
         'e2e-test@example.com', 0, false,
         0, 0, 0,
         $3, 'e2e-test', 'e2e-test', NOW(), NOW()
       )`,
      [cd, displayName, isActive]
    );
    createdOrganizationNames.push(displayName);
  }
}
