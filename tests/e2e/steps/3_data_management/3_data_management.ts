/**
 * ステップ定義: [3] データ管理（Creator / Vendor / Instrument マスタ管理）
 *
 * 対応 feature: tests/e2e/features/3_data_management/3_data_management.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : system.admin@example.com
 *   パスワード: admin123
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ===========================================================================
// UI経由マスタデータ登録ヘルパー（Before フック用）
// ===========================================================================

/**
 * Before フック用: ログインしてマスタ管理画面を開く
 */
async function openMasterPage(
  browser: import('@playwright/test').Browser,
  masterType: string
): Promise<import('@playwright/test').Page> {
  const page = await browser.newPage();

  // ログイン
  await page.goto(`${BASE_URL}/?orgId=${ORG_ID}`);
  const userIdInput = page.locator('input[placeholder="ユーザーIDを入力"]');
  await userIdInput.waitFor({ state: 'visible', timeout: 15000 });
  await userIdInput.fill('system.admin@example.com');
  const pwInput = page.locator('input[placeholder="パスワードを入力"]');
  await pwInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwInput.fill(DATA_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // マスタ種別を選択
  await switchMasterType(page, masterType);
  return page;
}

/**
 * Before フック用: マスタ選択プルダウンを切り替える
 */
async function switchMasterType(
  page: import('@playwright/test').Page,
  masterType: string
): Promise<void> {
  const masterSelect = page.locator('.ant-select').first();
  await masterSelect.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await masterSelect.click();
  await page.waitForFunction(
    () => {
      const dropdowns = document.querySelectorAll('.ant-select-dropdown');
      return Array.from(dropdowns).some((d) => {
        const el = d as HTMLElement;
        return (
          !el.classList.contains('ant-select-dropdown-hidden') &&
          window.getComputedStyle(el).display !== 'none'
        );
      });
    },
    { timeout: DIALOG_TIMEOUT }
  );
  const visibleDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${masterType}"]`).click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

/**
 * Before フック用: 一覧テーブルに指定IDが存在するか確認
 */
async function existsInTable(
  page: import('@playwright/test').Page,
  idValue: string
): Promise<boolean> {
  return page.locator(`table td:has-text("${idValue}")`).isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Before フック用: マスタ追加ダイアログからレコードを登録する
 * @param page 対象ページ（マスタ管理画面を開いた状態）
 * @param fields { フィールド: string; 値: string }[]
 */
async function registerViaAddDialog(
  page: import('@playwright/test').Page,
  fields: { フィールド: string; 値: string }[],
  masterType: string
): Promise<void> {
  // 追加ボタンをクリックしてダイアログを開く
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });

  // 疑似 DataTable を作成して fillMasterAddDialog を再利用
  const fakeDataTable = { hashes: () => fields };
  await fillMasterAddDialog(page, fakeDataTable, masterType);

  // 保存ボタンをクリック
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page.waitForResponse((r) => r.url().includes('/api/') && r.request().method() === 'POST', { timeout: API_TIMEOUT }).catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT }).catch(() => {}),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  // ダイアログが閉じるまで待機
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT }).catch(() => {});
}

// ===========================================================================
// 定数
// ===========================================================================
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
const BASE_URL = `http://localhost:3000`;
const DATA_ADMIN_PASSWORD = 'admin123';

/** ダイアログが完全に表示されるまで待機するタイムアウト (ms) */
const DIALOG_TIMEOUT = 10000;
/** 一覧テーブルが更新されるまで待機するタイムアウト (ms) */
const TABLE_TIMEOUT = 10000;
/** API レスポンス待機タイムアウト (ms) */
const API_TIMEOUT = 15000;

// Permanent データ（削除対象外）
const PERMANENT_CREATOR_IDS = ['e2e_crt_perm_001'];
const PERMANENT_VENDOR_IDS = ['e2e_vnd_perm_001'];
const PERMANENT_INSTRUMENT_IDS = ['e2e_ins_perm_001'];

// ===========================================================================
// クリーンアップ追跡変数
// ===========================================================================

/** CSVダウンロードファイルのパスを格納（シナリオ内で共有） */
let downloadedCsvTmpPath: string | null = null;

/** CSVアップロード時のファイルチューザーを格納（ステップ間で共有） */
let pendingFileChooser: import('@playwright/test').FileChooser | null = null;

// ===========================================================================
// React 制御コンポーネントへの入力ヘルパー
// nativeInputValueSetter で React の onChange を強制トリガー
// ===========================================================================
async function setReactInputValue(
  page: import('@playwright/test').Page,
  selector: string,
  value: string
): Promise<void> {
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

// ===========================================================================
// Ant Design Select 操作ヘルパー
// ===========================================================================
async function selectAntOption(
  page: import('@playwright/test').Page,
  nthSelect: number,
  optionText: string
): Promise<void> {
  const selects = page.locator('.ant-modal .ant-select');
  const selectEl = selects.nth(nthSelect);
  await selectEl.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await selectEl.click();

  // ドロップダウンが visible になるまで待機
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
    { timeout: DIALOG_TIMEOUT }
  );

  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown
    .locator(`.ant-select-item-option[title="${optionText}"]`)
    .click();
}

// ===========================================================================
// Before / After フック
// ===========================================================================

// ---------------------------------------------------------------------------
// Creator Before フック（UI登録方式）
// ---------------------------------------------------------------------------

/** 3-3-1: Creator 編集前データを追加ダイアログ経由で登録 */
Before({ tags: '@3-3-1' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Creator');
  try {
    if (!await existsInTable(page, 'e2e_crt_edit_before')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Creator ID',     値: 'e2e_crt_edit_before' },
        { フィールド: 'Creator名',      値: 'E2E編集前クリエイター' },
        { フィールド: '説明',           値: 'E2E編集前クリエイター説明' },
        { フィールド: '注釈',           値: 'E2E編集前クリエイター注釈' },
        { フィールド: 'Vendor名称',     値: '島津製作所' },
        { フィールド: 'Instrument名称', 値: 'Atomic Force Microscope AFM-3000' },
        { フィールド: '状態',           値: 'アクティブ' },
      ], 'Creator');
    } else {
      // 既存レコードの名前をリセット
      await db.query(
        `UPDATE creator SET creator_name = $1 WHERE creator_id = $2 AND organization_id = $3`,
        ['E2E編集前クリエイター', 'e2e_crt_edit_before', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-3-2 / 3-3-3 / 3-3-4: Creator 編集テストデータを追加ダイアログ経由で登録 */
Before({ tags: '@3-3-2 or @3-3-3 or @3-3-4' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Creator');
  try {
    if (!await existsInTable(page, 'e2e_crt_edit_test')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Creator ID',     値: 'e2e_crt_edit_test' },
        { フィールド: 'Creator名',      値: 'E2E編集テストクリエイター' },
        { フィールド: '説明',           値: 'E2E編集テストクリエイター説明' },
        { フィールド: '注釈',           値: 'E2E編集テストクリエイター注釈' },
        { フィールド: 'Vendor名称',     値: '島津製作所' },
        { フィールド: 'Instrument名称', 値: 'Atomic Force Microscope AFM-3000' },
        { フィールド: '状態',           値: 'アクティブ' },
      ], 'Creator');
    } else {
      await db.query(
        `UPDATE creator SET creator_name = $1 WHERE creator_id = $2 AND organization_id = $3`,
        ['E2E編集テストクリエイター', 'e2e_crt_edit_test', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-4-1 / 3-4-3: アクティブ Creator を追加ダイアログ経由で登録 */
Before({ tags: '@3-4-1 or @3-4-3' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Creator');
  try {
    if (!await existsInTable(page, 'e2e_crt_toggle_active')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Creator ID',     値: 'e2e_crt_toggle_active' },
        { フィールド: 'Creator名',      値: 'E2Eトグルクリエイターアクティブ' },
        { フィールド: '説明',           値: 'E2Eトグルアクティブクリエイター説明' },
        { フィールド: '注釈',           値: 'E2Eトグルアクティブクリエイター注釈' },
        { フィールド: 'Vendor名称',     値: '島津製作所' },
        { フィールド: 'Instrument名称', 値: 'Atomic Force Microscope AFM-3000' },
        { フィールド: '状態',           値: 'アクティブ' },
      ], 'Creator');
    } else {
      // is_active を true にリセット
      await db.query(
        `UPDATE creator SET is_active = true WHERE creator_id = $1 AND organization_id = $2`,
        ['e2e_crt_toggle_active', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-4-2: 非アクティブ Creator を追加ダイアログ経由で登録（is_active は DB で直接 false に設定） */
Before({ tags: '@3-4-2' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Creator');
  try {
    if (!await existsInTable(page, 'e2e_crt_toggle_inactive')) {
      // 追加ダイアログで非アクティブ状態で登録
      await registerViaAddDialog(page, [
        { フィールド: 'Creator ID',     値: 'e2e_crt_toggle_inactive' },
        { フィールド: 'Creator名',      値: 'E2Eトグルクリエイター非アクティブ' },
        { フィールド: '説明',           値: 'E2Eトグル非アクティブクリエイター説明' },
        { フィールド: '注釈',           値: 'E2Eトグル非アクティブクリエイター注釈' },
        { フィールド: 'Vendor名称',     値: '島津製作所' },
        { フィールド: 'Instrument名称', 値: 'Atomic Force Microscope AFM-3000' },
        { フィールド: '状態',           値: '非アクティブ' },
      ], 'Creator');
    } else {
      // is_active を false にリセット
      await db.query(
        `UPDATE creator SET is_active = false WHERE creator_id = $1 AND organization_id = $2`,
        ['e2e_crt_toggle_inactive', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-5-2 / 3-5-3: Creator CSV アップロードテスト用の事前クリーンアップ（DBのみ） */
Before({ tags: '@3-5-2 or @3-5-3' }, async () => {
  await db.query(
    `DELETE FROM creator WHERE creator_id = $1 AND organization_id = $2`,
    ['e2e_csv_crt_001', ORG_ID]
  );
});

// ---------------------------------------------------------------------------
// Vendor Before フック（UI登録方式）
// ---------------------------------------------------------------------------

/** 3-8-1: Vendor 編集前データを追加ダイアログ経由で登録 */
Before({ tags: '@3-8-1' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Vendor');
  try {
    if (!await existsInTable(page, 'e2e_vnd_edit_before')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Vendor ID', 値: 'e2e_vnd_edit_before' },
        { フィールド: 'Vendor名',  値: 'E2E編集前ベンダー' },
        { フィールド: '説明',      値: 'E2E編集前ベンダー説明' },
        { フィールド: '注釈',      値: 'E2E編集前ベンダー注釈' },
        { フィールド: '状態',      値: 'アクティブ' },
      ], 'Vendor');
    } else {
      await db.query(
        `UPDATE vendor SET vendor_name = $1 WHERE vendor_id = $2 AND organization_id = $3`,
        ['E2E編集前ベンダー', 'e2e_vnd_edit_before', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-8-2 / 3-8-3 / 3-8-4: Vendor 編集テストデータを追加ダイアログ経由で登録 */
Before({ tags: '@3-8-2 or @3-8-3 or @3-8-4' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Vendor');
  try {
    if (!await existsInTable(page, 'e2e_vnd_edit_test')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Vendor ID', 値: 'e2e_vnd_edit_test' },
        { フィールド: 'Vendor名',  値: 'E2E編集テストベンダー' },
        { フィールド: '説明',      値: 'E2E編集テストベンダー説明' },
        { フィールド: '注釈',      値: 'E2E編集テストベンダー注釈' },
        { フィールド: '状態',      値: 'アクティブ' },
      ], 'Vendor');
    } else {
      await db.query(
        `UPDATE vendor SET vendor_name = $1 WHERE vendor_id = $2 AND organization_id = $3`,
        ['E2E編集テストベンダー', 'e2e_vnd_edit_test', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-9-1 / 3-9-3: アクティブ Vendor を追加ダイアログ経由で登録 */
Before({ tags: '@3-9-1 or @3-9-3' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Vendor');
  try {
    if (!await existsInTable(page, 'e2e_vnd_toggle_active')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Vendor ID', 値: 'e2e_vnd_toggle_active' },
        { フィールド: 'Vendor名',  値: 'E2Eトグルベンダーアクティブ' },
        { フィールド: '説明',      値: 'E2Eトグルアクティブベンダー説明' },
        { フィールド: '注釈',      値: 'E2Eトグルアクティブベンダー注釈' },
        { フィールド: '状態',      値: 'アクティブ' },
      ], 'Vendor');
    } else {
      await db.query(
        `UPDATE vendor SET is_active = true WHERE vendor_id = $1 AND organization_id = $2`,
        ['e2e_vnd_toggle_active', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-9-2: 非アクティブ Vendor を追加ダイアログ経由で登録 */
Before({ tags: '@3-9-2' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Vendor');
  try {
    if (!await existsInTable(page, 'e2e_vnd_toggle_inactive')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Vendor ID', 値: 'e2e_vnd_toggle_inactive' },
        { フィールド: 'Vendor名',  値: 'E2Eトグルベンダー非アクティブ' },
        { フィールド: '説明',      値: 'E2Eトグル非アクティブベンダー説明' },
        { フィールド: '注釈',      値: 'E2Eトグル非アクティブベンダー注釈' },
        { フィールド: '状態',      値: '非アクティブ' },
      ], 'Vendor');
    } else {
      await db.query(
        `UPDATE vendor SET is_active = false WHERE vendor_id = $1 AND organization_id = $2`,
        ['e2e_vnd_toggle_inactive', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-10-2 / 3-10-3: Vendor CSV アップロードテスト用の事前クリーンアップ（DBのみ） */
Before({ tags: '@3-10-2 or @3-10-3' }, async () => {
  await db.query(
    `DELETE FROM vendor WHERE vendor_id = $1 AND organization_id = $2`,
    ['e2e_csv_vnd_001', ORG_ID]
  );
});

// ---------------------------------------------------------------------------
// Instrument Before フック（UI登録方式）
// ---------------------------------------------------------------------------

/** 3-13-1: Instrument 編集前データを追加ダイアログ経由で登録 */
Before({ tags: '@3-13-1' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Instrument');
  try {
    if (!await existsInTable(page, 'e2e_ins_edit_before')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Instrument ID', 値: 'e2e_ins_edit_before' },
        { フィールド: 'Instrument名',  値: 'E2E編集前装置' },
        { フィールド: '説明',          値: 'E2E編集前装置説明' },
        { フィールド: '注釈',          値: 'E2E編集前装置注釈' },
        { フィールド: '状態',          値: 'アクティブ' },
      ], 'Instrument');
    } else {
      await db.query(
        `UPDATE instrument SET instrument_name = $1 WHERE instrument_id = $2 AND organization_id = $3`,
        ['E2E編集前装置', 'e2e_ins_edit_before', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-13-2 / 3-13-3 / 3-13-4: Instrument 編集テストデータを追加ダイアログ経由で登録 */
Before({ tags: '@3-13-2 or @3-13-3 or @3-13-4' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Instrument');
  try {
    if (!await existsInTable(page, 'e2e_ins_edit_test')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Instrument ID', 値: 'e2e_ins_edit_test' },
        { フィールド: 'Instrument名',  値: 'E2E編集テスト装置' },
        { フィールド: '説明',          値: 'E2E編集テスト装置説明' },
        { フィールド: '注釈',          値: 'E2E編集テスト装置注釈' },
        { フィールド: '状態',          値: 'アクティブ' },
      ], 'Instrument');
    } else {
      await db.query(
        `UPDATE instrument SET instrument_name = $1 WHERE instrument_id = $2 AND organization_id = $3`,
        ['E2E編集テスト装置', 'e2e_ins_edit_test', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-14-1 / 3-14-3: アクティブ Instrument を追加ダイアログ経由で登録 */
Before({ tags: '@3-14-1 or @3-14-3' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Instrument');
  try {
    if (!await existsInTable(page, 'e2e_ins_toggle_active')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Instrument ID', 値: 'e2e_ins_toggle_active' },
        { フィールド: 'Instrument名',  値: 'E2Eトグル装置アクティブ' },
        { フィールド: '説明',          値: 'E2Eトグルアクティブ装置説明' },
        { フィールド: '注釈',          値: 'E2Eトグルアクティブ装置注釈' },
        { フィールド: '状態',          値: 'アクティブ' },
      ], 'Instrument');
    } else {
      await db.query(
        `UPDATE instrument SET is_active = true WHERE instrument_id = $1 AND organization_id = $2`,
        ['e2e_ins_toggle_active', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-14-2: 非アクティブ Instrument を追加ダイアログ経由で登録 */
Before({ tags: '@3-14-2' }, async ({ browser }) => {
  const page = await openMasterPage(browser, 'Instrument');
  try {
    if (!await existsInTable(page, 'e2e_ins_toggle_inactive')) {
      await registerViaAddDialog(page, [
        { フィールド: 'Instrument ID', 値: 'e2e_ins_toggle_inactive' },
        { フィールド: 'Instrument名',  値: 'E2Eトグル装置非アクティブ' },
        { フィールド: '説明',          値: 'E2Eトグル非アクティブ装置説明' },
        { フィールド: '注釈',          値: 'E2Eトグル非アクティブ装置注釈' },
        { フィールド: '状態',          値: '非アクティブ' },
      ], 'Instrument');
    } else {
      await db.query(
        `UPDATE instrument SET is_active = false WHERE instrument_id = $1 AND organization_id = $2`,
        ['e2e_ins_toggle_inactive', ORG_ID]
      );
    }
  } finally {
    await page.close();
  }
});

/** 3-15-2 / 3-15-3: Instrument CSV アップロードテスト用の事前クリーンアップ（DBのみ） */
Before({ tags: '@3-15-2 or @3-15-3' }, async () => {
  await db.query(
    `DELETE FROM instrument WHERE instrument_id = $1 AND organization_id = $2`,
    ['e2e_csv_ins_001', ORG_ID]
  );
});

/** 全シナリオ後のクリーンアップ（Permanent データは除外） */
After(async () => {
  const permCrtIds = PERMANENT_CREATOR_IDS.map((_, i) => `$${i + 2}`).join(', ');
  await db.query(
    `DELETE FROM creator
     WHERE organization_id = $1
       AND (creator_id LIKE 'e2e_%' OR creator_name LIKE 'E2E%')
       AND creator_id NOT IN (${permCrtIds})`,
    [ORG_ID, ...PERMANENT_CREATOR_IDS]
  ).catch(() => {});

  const permVndIds = PERMANENT_VENDOR_IDS.map((_, i) => `$${i + 2}`).join(', ');
  await db.query(
    `DELETE FROM vendor
     WHERE organization_id = $1
       AND (vendor_id LIKE 'e2e_%' OR vendor_name LIKE 'E2E%')
       AND vendor_id NOT IN (${permVndIds})`,
    [ORG_ID, ...PERMANENT_VENDOR_IDS]
  ).catch(() => {});

  const permInsIds = PERMANENT_INSTRUMENT_IDS.map((_, i) => `$${i + 2}`).join(', ');
  await db.query(
    `DELETE FROM instrument
     WHERE organization_id = $1
       AND (instrument_id LIKE 'e2e_%' OR instrument_name LIKE 'E2E%')
       AND instrument_id NOT IN (${permInsIds})`,
    [ORG_ID, ...PERMANENT_INSTRUMENT_IDS]
  ).catch(() => {});

  // 一時ファイルのクリーンアップ
  if (downloadedCsvTmpPath) {
    try { fs.unlinkSync(downloadedCsvTmpPath); } catch { /* ignore */ }
    downloadedCsvTmpPath = null;
  }
});

AfterAll(async () => {
  await closeDb();
});

// ===========================================================================
// Given ステップ
// ===========================================================================

Given('データ管理者ユーザーがDB（organization_userテーブル）に存在する', async () => {
  const result = await db.query(
    `SELECT ou.user_id
     FROM organization_user ou
     JOIN user_authentication ua ON ou.user_id = ua.user_id
     WHERE ou.organization_id = $1
       AND ua.user_id = $2`,
    [ORG_ID, 'system.admin@example.com']
  );
  expect(result.rows.length).toBeGreaterThan(0);
});

// ===========================================================================
// When ステップ
// ===========================================================================

When('データ管理者ユーザー {string} でログインする', async ({ page }, userId: string) => {
  await page.goto(`${BASE_URL}/?orgId=${ORG_ID}`);

  // ユーザーIDフィールドが操作可能になるまで待機（placeholder で確実に特定）
  const userIdInput = page.locator('input[placeholder="ユーザーIDを入力"]');
  await userIdInput.waitFor({ state: 'visible', timeout: 15000 });
  await userIdInput.click();
  await userIdInput.fill(userId);

  // パスワードフィールドが操作可能になるまで待機
  const pwInput = page.locator('input[placeholder="パスワードを入力"]');
  await pwInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwInput.click();
  await pwInput.fill(DATA_ADMIN_PASSWORD);

  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

When('マスタ管理画面を開く', async ({ page }) => {
  // ログイン後は自動的にマスタ管理画面が表示されるため、表示完了を待機するのみ
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('マスタ選択プルダウンで {string} を選択する', async ({ page }, masterType: string) => {
  // マスタ選択用の最初の Select を対象とする
  const masterSelect = page.locator('.ant-select').first();
  await masterSelect.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await masterSelect.click();

  // ドロップダウンが visible になるまで待機
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
    { timeout: DIALOG_TIMEOUT }
  );

  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown
    .locator(`.ant-select-item-option[title="${masterType}"]`)
    .click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

// ---- Creator 追加ダイアログ操作 ----

When('Creatorマスタの「追加」ボタンをクリックする', async ({ page }) => {
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Creator追加ダイアログで以下の情報を入力して保存する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Creator');

  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.url().includes('creator') || resp.url().includes('master')) &&
          resp.request().method() === 'POST',
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);

  // 保存ボタンクリック（既に上記ヘルパー内でクリックしていない場合）
  const saveBtn = page.locator('.ant-modal-footer .ant-btn-primary');
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click();
    await Promise.race([
      page
        .waitForResponse(
          (resp) =>
            resp.url().includes('/api/') &&
            resp.request().method() === 'POST',
          { timeout: API_TIMEOUT }
        )
        .catch(() => {}),
      page
        .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
        .catch(() => {}),
      page
        .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
        .catch(() => {}),
    ]);
  }
});

When('Creator追加ダイアログで以下の情報を入力する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Creator');
});

When('Creator追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Creator {string} の「編集」ボタンをクリックする', async ({ page }, creatorName: string) => {
  const row = page.locator('table tr').filter({ hasText: creatorName });
  await row.locator('button').filter({ hasText: '編集' }).click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Creator編集ダイアログで以下の情報を変更して保存する', async ({ page }, dataTable: any) => {
  await fillMasterEditDialog(page, dataTable);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Creator編集ダイアログでCreator名を {string} に変更する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
});

When('Creator編集ダイアログでCreator名を {string} に変更して保存する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Creator編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Creator {string} の個別切り替えボタンをクリックする', async ({ page }, creatorName: string) => {
  const row = page.locator('table tr').filter({ hasText: creatorName });
  // アクティブ切り替えボタン: テキストが「アクティブ」または「非アクティブ」のボタン
  const toggleBtn = row.locator('button').filter({ hasText: /^アクティブ$|^非アクティブ$/ }).first();
  await toggleBtn.waitFor({ state: 'visible', timeout: TABLE_TIMEOUT });
  await toggleBtn.click();
  await page.locator('.ant-modal-confirm, .ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

// ---- Vendor 追加ダイアログ操作 ----

When('Vendorマスタの「追加」ボタンをクリックする', async ({ page }) => {
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Vendor追加ダイアログで以下の情報を入力して保存する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Vendor');
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.url().includes('vendor') || resp.url().includes('master')) &&
          resp.request().method() === 'POST',
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Vendor追加ダイアログで以下の情報を入力する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Vendor');
});

When('Vendor追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Vendor {string} の「編集」ボタンをクリックする', async ({ page }, vendorName: string) => {
  const row = page.locator('table tr').filter({ hasText: vendorName });
  await row.locator('button').filter({ hasText: '編集' }).click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Vendor編集ダイアログで以下の情報を変更して保存する', async ({ page }, dataTable: any) => {
  await fillMasterEditDialog(page, dataTable);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Vendor編集ダイアログでVendor名を {string} に変更する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
});

When('Vendor編集ダイアログでVendor名を {string} に変更して保存する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Vendor編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Vendor {string} の個別切り替えボタンをクリックする', async ({ page }, vendorName: string) => {
  const row = page.locator('table tr').filter({ hasText: vendorName });
  // アクティブ切り替えボタン: テキストが「アクティブ」または「非アクティブ」のボタン
  const toggleBtn = row.locator('button').filter({ hasText: /^アクティブ$|^非アクティブ$/ }).first();
  await toggleBtn.waitFor({ state: 'visible', timeout: TABLE_TIMEOUT });
  await toggleBtn.click();
  await page.locator('.ant-modal-confirm, .ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

// ---- Instrument 追加ダイアログ操作 ----

When('Instrumentマスタの「追加」ボタンをクリックする', async ({ page }) => {
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Instrument追加ダイアログで以下の情報を入力して保存する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Instrument');
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.url().includes('instrument') || resp.url().includes('master')) &&
          resp.request().method() === 'POST',
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Instrument追加ダイアログで以下の情報を入力する', async ({ page }, dataTable: any) => {
  await fillMasterAddDialog(page, dataTable, 'Instrument');
});

When('Instrument追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Instrument {string} の「編集」ボタンをクリックする', async ({ page }, instrumentName: string) => {
  const row = page.locator('table tr').filter({ hasText: instrumentName });
  await row.locator('button').filter({ hasText: '編集' }).click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

When('Instrument編集ダイアログで以下の情報を変更して保存する', async ({ page }, dataTable: any) => {
  await fillMasterEditDialog(page, dataTable);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Instrument編集ダイアログでInstrument名を {string} に変更する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
});

When('Instrument編集ダイアログでInstrument名を {string} に変更して保存する', async ({ page }, newName: string) => {
  await updateNameField(page, newName);
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-form-item-explain-error', { timeout: API_TIMEOUT })
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
});

When('Instrument編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.locator('.ant-modal-footer .ant-btn-default').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

When('Instrument {string} の個別切り替えボタンをクリックする', async ({ page }, instrumentName: string) => {
  const row = page.locator('table tr').filter({ hasText: instrumentName });
  // アクティブ切り替えボタン: テキストが「アクティブ」または「非アクティブ」のボタン
  const toggleBtn = row.locator('button').filter({ hasText: /^アクティブ$|^非アクティブ$/ }).first();
  await toggleBtn.waitFor({ state: 'visible', timeout: TABLE_TIMEOUT });
  await toggleBtn.click();
  await page.locator('.ant-modal-confirm, .ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
});

// ---- CSV ダウンロード・アップロード操作 ----

When('Creatorマスタの「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first().click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `creator_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  downloadedCsvTmpPath = tmpPath;
});

When('Creatorマスタの「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  // filechooser イベントを待ち受けながらボタンをクリックする（2_system_management.ts と同じ方式）
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  pendingFileChooser = fileChooser;
});

When('Vendorマスタの「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first().click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `vendor_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  downloadedCsvTmpPath = tmpPath;
});

When('Vendorマスタの「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  // filechooser イベントを待ち受けながらボタンをクリックする（2_system_management.ts と同じ方式）
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  pendingFileChooser = fileChooser;
});

When('Instrumentマスタの「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first().click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `instrument_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  downloadedCsvTmpPath = tmpPath;
});

When('Instrumentマスタの「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  // filechooser イベントを待ち受けながらボタンをクリックする（2_system_management.ts と同じ方式）
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  pendingFileChooser = fileChooser;
});

When('CSVファイル {string} をアップロードする', async ({}, csvFileName: string) => {
  // pendingFileChooser に filechooser が格納されているので setFiles で指定する
  const csvFilePath = path.resolve(__dirname, '../../fixtures/csv/upload', csvFileName);
  if (pendingFileChooser) {
    await pendingFileChooser.setFiles(csvFilePath);
    pendingFileChooser = null;
  }
  // アップロード後の API レスポンスや成功メッセージを待機
  // ※ page 参照が不要になるため、グローバル変数で page を保持しないシンプルな方式
  // ここでは waitForLoadState 等を省略し、Then ステップで結果を検証する
});

// ---- 切り替え確認ダイアログ共通 ----

When('マスタ切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/') &&
          (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
        { timeout: API_TIMEOUT }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: API_TIMEOUT })
      .catch(() => {}),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('マスタ切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page.locator('.ant-modal-confirm-btns .ant-btn-default, .ant-modal-footer .ant-btn-default')
    .first()
    .click();
  await page.locator('.ant-modal-confirm, .ant-modal').waitFor({ state: 'hidden', timeout: DIALOG_TIMEOUT });
});

// ===========================================================================
// Then ステップ
// ===========================================================================

// ---- 一覧テーブル表示確認 ----

Then('Creator一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible({ timeout: TABLE_TIMEOUT });
});

Then('Vendor一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible({ timeout: TABLE_TIMEOUT });
});

Then('Instrument一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible({ timeout: TABLE_TIMEOUT });
});

// ---- DB件数と一覧件数の一致確認 ----

Then('データベースに登録されているCreator件数と一覧の件数が一致すること', async ({ page }) => {
  // 前ステップで既に Creator が選択・表示済みのためリロード不要
  // テーブルのデータが安定するまで待機
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // ログインユーザーの組織に紐づく corporation_id を取得し、その会社のレコード数を取得
  const result = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM creator
     WHERE corporation_id = (
       SELECT corporation_id FROM organization WHERE organization_id = $1
     )`,
    [ORG_ID]
  );
  const dbCount = Number(result.rows[0].cnt);
  const rows = page.locator('table tbody tr');
  const uiCount = await rows.count();
  expect(uiCount).toBe(dbCount);
});

Then('データベースに登録されているVendor件数と一覧の件数が一致すること', async ({ page }) => {
  // 前ステップで既に Vendor が選択・表示済みのためリロード不要
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // ログインユーザーの組織に紐づく corporation_id を取得し、その会社のレコード数を取得
  const result = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM vendor
     WHERE corporation_id = (
       SELECT corporation_id FROM organization WHERE organization_id = $1
     )`,
    [ORG_ID]
  );
  const dbCount = Number(result.rows[0].cnt);
  const rows = page.locator('table tbody tr');
  const uiCount = await rows.count();
  expect(uiCount).toBe(dbCount);
});

Then('データベースに登録されているInstrument件数と一覧の件数が一致すること', async ({ page }) => {
  // 前ステップで既に Instrument が選択・表示済みのためリロード不要
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // ログインユーザーの組織に紐づく corporation_id を取得し、その会社のレコード数を取得
  const result = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM instrument
     WHERE corporation_id = (
       SELECT corporation_id FROM organization WHERE organization_id = $1
     )`,
    [ORG_ID]
  );
  const dbCount = Number(result.rows[0].cnt);
  const rows = page.locator('table tbody tr');
  const uiCount = await rows.count();
  expect(uiCount).toBe(dbCount);
});

// ---- ダイアログ表示確認 ----

Then('Creator追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('マスタ切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-modal-confirm, .ant-modal')
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

// ---- 一覧表示確認 ----

Then('Creator一覧に {string} が表示されること', async ({ page }, name: string) => {
  await findInTableWithScroll(page, name);
});

Then('Vendor一覧に {string} が表示されること', async ({ page }, name: string) => {
  await findInTableWithScroll(page, name);
});

Then('Instrument一覧に {string} が表示されること', async ({ page }, name: string) => {
  await findInTableWithScroll(page, name);
});

// ---- DB レコード存在確認 ----

Then('データベースにCreator ID {string} のレコードが存在すること', async ({}, creatorId: string) => {
  const result = await db.query(
    `SELECT creator_id FROM creator WHERE creator_id = $1 AND organization_id = $2`,
    [creatorId, ORG_ID]
  );
  expect(result.rows.length).toBe(1);
});

Then('データベースにCreator ID {string} のレコードが存在しないこと', async ({}, creatorId: string) => {
  const result = await db.query(
    `SELECT creator_id FROM creator WHERE creator_id = $1 AND organization_id = $2`,
    [creatorId, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

Then('データベースにCreator名 {string} のレコードが存在すること', async ({}, creatorName: string) => {
  const result = await db.query(
    `SELECT creator_id FROM creator WHERE creator_name = $1 AND organization_id = $2`,
    [creatorName, ORG_ID]
  );
  expect(result.rows.length).toBeGreaterThan(0);
});

Then('データベースにCreator名 {string} のレコードが存在しないこと', async ({}, creatorName: string) => {
  const result = await db.query(
    `SELECT creator_id FROM creator WHERE creator_name = $1 AND organization_id = $2`,
    [creatorName, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

Then('データベースにVendor ID {string} のレコードが存在すること', async ({}, vendorId: string) => {
  const result = await db.query(
    `SELECT vendor_id FROM vendor WHERE vendor_id = $1 AND organization_id = $2`,
    [vendorId, ORG_ID]
  );
  expect(result.rows.length).toBe(1);
});

Then('データベースにVendor ID {string} のレコードが存在しないこと', async ({}, vendorId: string) => {
  const result = await db.query(
    `SELECT vendor_id FROM vendor WHERE vendor_id = $1 AND organization_id = $2`,
    [vendorId, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

Then('データベースにVendor名 {string} のレコードが存在すること', async ({}, vendorName: string) => {
  const result = await db.query(
    `SELECT vendor_id FROM vendor WHERE vendor_name = $1 AND organization_id = $2`,
    [vendorName, ORG_ID]
  );
  expect(result.rows.length).toBeGreaterThan(0);
});

Then('データベースにVendor名 {string} のレコードが存在しないこと', async ({}, vendorName: string) => {
  const result = await db.query(
    `SELECT vendor_id FROM vendor WHERE vendor_name = $1 AND organization_id = $2`,
    [vendorName, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

Then('データベースにInstrument ID {string} のレコードが存在すること', async ({}, instrumentId: string) => {
  const result = await db.query(
    `SELECT instrument_id FROM instrument WHERE instrument_id = $1 AND organization_id = $2`,
    [instrumentId, ORG_ID]
  );
  expect(result.rows.length).toBe(1);
});

Then('データベースにInstrument ID {string} のレコードが存在しないこと', async ({}, instrumentId: string) => {
  const result = await db.query(
    `SELECT instrument_id FROM instrument WHERE instrument_id = $1 AND organization_id = $2`,
    [instrumentId, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

Then('データベースにInstrument名 {string} のレコードが存在すること', async ({}, instrumentName: string) => {
  const result = await db.query(
    `SELECT instrument_id FROM instrument WHERE instrument_name = $1 AND organization_id = $2`,
    [instrumentName, ORG_ID]
  );
  expect(result.rows.length).toBeGreaterThan(0);
});

Then('データベースにInstrument名 {string} のレコードが存在しないこと', async ({}, instrumentName: string) => {
  const result = await db.query(
    `SELECT instrument_id FROM instrument WHERE instrument_name = $1 AND organization_id = $2`,
    [instrumentName, ORG_ID]
  );
  expect(result.rows.length).toBe(0);
});

// ---- DB is_active 確認 ----

Then('データベースのCreator ID {string} の is_active が true であること', async ({}, creatorId: string) => {
  await assertIsActive('creator', 'creator_id', creatorId, true);
});

Then('データベースのCreator ID {string} の is_active が false であること', async ({}, creatorId: string) => {
  await assertIsActive('creator', 'creator_id', creatorId, false);
});

Then('データベースのCreator名 {string} の is_active が true であること', async ({}, creatorName: string) => {
  await assertIsActiveByName('creator', 'creator_name', creatorName, true);
});

Then('データベースのCreator名 {string} の is_active が false であること', async ({}, creatorName: string) => {
  await assertIsActiveByName('creator', 'creator_name', creatorName, false);
});

Then('データベースのVendor ID {string} の is_active が true であること', async ({}, vendorId: string) => {
  await assertIsActive('vendor', 'vendor_id', vendorId, true);
});

Then('データベースのVendor ID {string} の is_active が false であること', async ({}, vendorId: string) => {
  await assertIsActive('vendor', 'vendor_id', vendorId, false);
});

Then('データベースのVendor名 {string} の is_active が true であること', async ({}, vendorName: string) => {
  await assertIsActiveByName('vendor', 'vendor_name', vendorName, true);
});

Then('データベースのVendor名 {string} の is_active が false であること', async ({}, vendorName: string) => {
  await assertIsActiveByName('vendor', 'vendor_name', vendorName, false);
});

Then('データベースのInstrument ID {string} の is_active が true であること', async ({}, instrumentId: string) => {
  await assertIsActive('instrument', 'instrument_id', instrumentId, true);
});

Then('データベースのInstrument ID {string} の is_active が false であること', async ({}, instrumentId: string) => {
  await assertIsActive('instrument', 'instrument_id', instrumentId, false);
});

Then('データベースのInstrument名 {string} の is_active が true であること', async ({}, instrumentName: string) => {
  await assertIsActiveByName('instrument', 'instrument_name', instrumentName, true);
});

Then('データベースのInstrument名 {string} の is_active が false であること', async ({}, instrumentName: string) => {
  await assertIsActiveByName('instrument', 'instrument_name', instrumentName, false);
});

// ---- バリデーション・エラーメッセージ確認 ----

Then('Creator追加バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator追加エラーメッセージ {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(
      `.ant-message-notice-wrapper:has-text("${errorMsg}"), .ant-form-item-explain-error:has-text("${errorMsg}")`
    )
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator編集バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor追加バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor追加エラーメッセージ {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(
      `.ant-message-notice-wrapper:has-text("${errorMsg}"), .ant-form-item-explain-error:has-text("${errorMsg}")`
    )
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument追加バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument追加エラーメッセージ {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(
      `.ant-message-notice-wrapper:has-text("${errorMsg}"), .ant-form-item-explain-error:has-text("${errorMsg}")`
    )
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集バリデーションエラー {string} が表示されること', async ({ page }, errorMsg: string) => {
  await expect(
    page.locator(`.ant-form-item-explain-error:has-text("${errorMsg}")`)
  ).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

// ---- 編集ダイアログ初期値確認 ----

Then('Creator編集ダイアログのCreator名フィールドに {string} が表示されていること', async ({ page }, expectedValue: string) => {
  const nameInput = page.locator('.ant-modal .ant-input:not([disabled])').first();
  await expect(nameInput).toHaveValue(expectedValue, { timeout: DIALOG_TIMEOUT });
});

Then('Creator編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Creator編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログのVendor名フィールドに {string} が表示されていること', async ({ page }, expectedValue: string) => {
  const nameInput = page.locator('.ant-modal .ant-input:not([disabled])').first();
  await expect(nameInput).toHaveValue(expectedValue, { timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Vendor編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログのInstrument名フィールドに {string} が表示されていること', async ({ page }, expectedValue: string) => {
  const nameInput = page.locator('.ant-modal .ant-input:not([disabled])').first();
  await expect(nameInput).toHaveValue(expectedValue, { timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

Then('Instrument編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: DIALOG_TIMEOUT });
});

// ---- CSV ダウンロード・アップロード確認 ----

Then('ダウンロードされたCSVファイルに以下のヘッダーが含まれること', async ({}, dataTable: any) => {
  expect(downloadedCsvTmpPath, 'CSVファイルがダウンロードされていません').not.toBeNull();
  const content = fs.readFileSync(downloadedCsvTmpPath!, 'utf-8').replace(/^\uFEFF/, '');
  const headerLine = content.split('\n')[0];
  const headers = headerLine.split(',').map((h: string) => h.trim().replace(/\r/g, ''));

  const expectedHeaders: string[] = dataTable.hashes().map((row: { ヘッダー: string }) => row['ヘッダー']);
  for (const expected of expectedHeaders) {
    expect(headers).toContain(expected);
  }
});

Then('CSVアップロード成功メッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator(
      '.ant-message-notice-wrapper, [class*="success"], :has-text("アップロードが完了"), :has-text("登録しました"), :has-text("成功")'
    ).first()
  ).toBeVisible({ timeout: TABLE_TIMEOUT });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * 名前フィールドを更新する（編集ダイアログ共通）
 * disabled でないフィールドを対象とする
 */
async function updateNameField(
  page: import('@playwright/test').Page,
  newName: string
): Promise<void> {
  // disabled でない最初の Input フィールドを対象とする
  const nameInput = page.locator('.ant-modal .ant-input:not([disabled])').first();
  await nameInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await nameInput.click();
  await page.keyboard.press('Control+A');
  if (newName !== '') {
    await setReactInputValue(page, '.ant-modal .ant-input:not([disabled])', newName);
  } else {
    // 空にする場合は全選択してBackspace
    await page.keyboard.press('Backspace');
    await setReactInputValue(page, '.ant-modal .ant-input:not([disabled])', '');
  }
}

/**
 * マスタ追加ダイアログのフォーム入力
 * DataTable の行を { フィールド, 値 } として解釈する
 *
 * 対応フィールド:
 *   Creator: Creator ID / Creator名 / 説明 / 注釈 / Vendor名称 / Instrument名称 / 状態
 *   Vendor : Vendor ID  / Vendor名  / 説明 / 注釈 / 状態
 *   Instrument: Instrument ID / Instrument名 / 説明 / 注釈 / 状態
 */
async function fillMasterAddDialog(
  page: import('@playwright/test').Page,
  dataTable: any,
  masterType: string
): Promise<void> {
  const rows: { フィールド: string; 値: string }[] = dataTable.hashes();

  for (const row of rows) {
    const field = row['フィールド'];
    const value = row['値'];

    if (field.endsWith(' ID') || field.endsWith('ID')) {
      // Creator ID / Vendor ID / Instrument ID
      // 最初の enabled な Input（ID フィールド）
      const idInput = page.locator('.ant-modal .ant-input:not([disabled])').first();
      await idInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
      await idInput.click();
      await setReactInputValue(page, '.ant-modal .ant-input:not([disabled])', value);

    } else if (field.includes('名') && !field.includes('称')) {
      // Creator名 / Vendor名 / Instrument名（2番目の enabled Input）
      const nameInputs = page.locator('.ant-modal .ant-input:not([disabled])');
      const count = await nameInputs.count();
      const targetIdx = count > 1 ? 1 : 0;
      const nameInput = nameInputs.nth(targetIdx);
      await nameInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
      await nameInput.click();
      // nth セレクターは CSS では直接使えないため evaluate を使用
      await page.evaluate(
        ({ idx, val }: { idx: number; val: string }) => {
          /* eslint-disable no-undef */
          const inputs = Array.from(
            (document as Document).querySelectorAll('.ant-modal .ant-input:not([disabled])')
          ) as HTMLInputElement[];
          const el = inputs[idx];
          if (!el) return;
          const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          setter?.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          /* eslint-enable no-undef */
        },
        { idx: targetIdx, val: value }
      );

    } else if (field.includes('説明')) {
      // 説明フィールド（Ant Design Input または TextArea）
      // フォーム内の入力要素を順番で取得: 0=ID, 1=名前, 2=説明, 3=注釈
      // nativeInputValueSetter 方式で確実に入力する
      const allInputs = page.locator('.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])');
      const descInput = allInputs.nth(2);
      await descInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT }).catch(() => {});
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.evaluate(
          ({ idx, val }: { idx: number; val: string }) => {
            /* eslint-disable no-undef */
            const inputs = Array.from(
              (document as Document).querySelectorAll(
                '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
              )
            ) as (HTMLInputElement | HTMLTextAreaElement)[];
            const el = inputs[idx];
            if (!el) return;
            const proto =
              el.tagName === 'TEXTAREA'
                ? (window as Window & typeof globalThis).HTMLTextAreaElement.prototype
                : (window as Window & typeof globalThis).HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            setter?.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            /* eslint-enable no-undef */
          },
          { idx: 2, val: value }
        );
      }

    } else if (field.includes('注釈')) {
      // 注釈フィールド（Ant Design Input または TextArea）
      // nativeInputValueSetter 方式で確実に入力する
      const allInputs = page.locator('.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])');
      const annoInput = allInputs.nth(3);
      await annoInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT }).catch(() => {});
      if (await annoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.evaluate(
          ({ idx, val }: { idx: number; val: string }) => {
            /* eslint-disable no-undef */
            const inputs = Array.from(
              (document as Document).querySelectorAll(
                '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
              )
            ) as (HTMLInputElement | HTMLTextAreaElement)[];
            const el = inputs[idx];
            if (!el) return;
            const proto =
              el.tagName === 'TEXTAREA'
                ? (window as Window & typeof globalThis).HTMLTextAreaElement.prototype
                : (window as Window & typeof globalThis).HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            setter?.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            /* eslint-enable no-undef */
          },
          { idx: 3, val: value }
        );
      }

    } else if (field.includes('Vendor名称') || field === 'Vendor名（紐付け）') {
      // Creator に紐付く Vendor 選択（1番目の Select）
      if (value) {
        await selectAntOption(page, 0, value);
      }

    } else if (field.includes('Instrument名称') || field === 'Instrument名（紐付け）') {
      // Creator に紐付く Instrument 選択（2番目の Select）
      if (value) {
        await selectAntOption(page, 1, value);
      }

    } else if (field === '状態') {
      // 状態はSelectコンポーネント（アクティブ/非アクティブ）
      // ダイアログ内の最後のSelectを対象とする（Creatorは3番目、Vendor/Instrumentは1番目）
      const selects = page.locator('.ant-modal .ant-select');
      const count = await selects.count();
      const statusSelect = selects.nth(count - 1); // 最後のSelect = 状態
      await statusSelect.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
      await statusSelect.click();

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
        { timeout: DIALOG_TIMEOUT }
      );

      const visibleDropdown = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
        .first();
      // 「アクティブ」または「非アクティブ」に一致する選択肢をクリック
      await visibleDropdown
        .locator('.ant-select-item-option')
        .filter({ hasText: value })
        .first()
        .click();
    }
  }
}

/**
 * マスタ編集ダイアログのフォーム入力
 * disabled でないフィールドのみを対象とする
 */
async function fillMasterEditDialog(
  page: import('@playwright/test').Page,
  dataTable: any
): Promise<void> {
  const rows: { フィールド: string; 値: string }[] = dataTable.hashes();
  for (const row of rows) {
    const field = row['フィールド'];
    const value = row['値'];

    if (field.includes('名')) {
      await updateNameField(page, value);
    }
  }
}

/**
 * DB の is_active をIDで検証する共通ヘルパー
 */
async function assertIsActive(
  table: string,
  idColumn: string,
  idValue: string,
  expected: boolean
): Promise<void> {
  const result = await db.query(
    `SELECT is_active FROM ${table} WHERE ${idColumn} = $1 AND organization_id = $2`,
    [idValue, ORG_ID]
  );
  expect(result.rows.length).toBe(1);
  expect(result.rows[0].is_active).toBe(expected);
}

/**
 * DB の is_active を名前で検証する共通ヘルパー
 */
async function assertIsActiveByName(
  table: string,
  nameColumn: string,
  nameValue: string,
  expected: boolean
): Promise<void> {
  const result = await db.query(
    `SELECT is_active FROM ${table} WHERE ${nameColumn} = $1 AND organization_id = $2`,
    [nameValue, ORG_ID]
  );
  expect(result.rows.length).toBeGreaterThan(0);
  expect(result.rows[0].is_active).toBe(expected);
}

/**
 * 一覧テーブルで指定の名前を持つセルを探す。
 * ページネーションがある場合は次ページへ進みながら全ページを検索する。
 * 見つからない場合は expect で失敗させる。
 */
async function findInTableWithScroll(
  page: import('@playwright/test').Page,
  name: string
): Promise<void> {
  const deadline = Date.now() + TABLE_TIMEOUT;

  while (Date.now() < deadline) {
    // 現在ページで名前を検索
    const cell = page.locator(`table td:has-text("${name}")`).first();
    if (await cell.isVisible({ timeout: 1000 }).catch(() => false)) {
      // 見つかった
      return;
    }

    // 次ページボタンを探す（Ant Design Pagination: li.ant-pagination-next）
    const nextBtn = page.locator('li.ant-pagination-next:not(.ant-pagination-disabled) button');
    if (await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    } else {
      // 次ページなし → 全ページ検索済みでも見つからなかった
      break;
    }
  }

  // 見つからなかった場合は toBeVisible でエラーを出す（エラーメッセージ統一）
  await expect(
    page.locator(`table td:has-text("${name}")`).first()
  ).toBeVisible({ timeout: 500 });
}
