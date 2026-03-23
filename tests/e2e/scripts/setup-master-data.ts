/**
 * Global Setup: マスタ管理テストデータ事前登録
 *
 * テスト実行前に master_test_data.json を読み込み、
 * DB に存在しないデータを UI（マスタ追加ダイアログ）経由で登録する。
 *
 * 登録順: Vendor → Instrument → Creator（Creatorは紐付けが必要なため最後）
 */

import * as path from 'path';
import { chromium, Browser, Page } from '@playwright/test';

const TEST_DATA = require(path.resolve(__dirname, '../fixtures/testdata/master_test_data.json'));

const ORG_ID: string = TEST_DATA.organizationId;
const BASE_URL = `http://localhost:3000`;
const LOGIN_USER: string = TEST_DATA.loginUser.userId;
const LOGIN_PASSWORD: string = TEST_DATA.loginUser.password;

const TIMEOUT = 15000;
const DIALOG_TIMEOUT = 10000;

// ===========================================================================
// エントリポイント（globalSetup として呼び出される）
// ===========================================================================
export default async function globalSetup(): Promise<void> {
  console.log('\n[Setup] マスタテストデータ事前登録を開始します...');

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  try {
    // ログイン
    await login(page);

    // Vendor 登録
    await setupVendors(page);

    // Instrument 登録
    await setupInstruments(page);

    // Creator 登録（Vendor・Instrument紐付けのため最後）
    await setupCreators(page);

    console.log('[Setup] マスタテストデータ事前登録が完了しました。\n');
  } catch (err) {
    console.error('[Setup] マスタテストデータ登録中にエラーが発生しました:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

// ===========================================================================
// ログイン
// ===========================================================================
async function login(page: Page): Promise<void> {
  console.log(`[Setup] ログイン中... (${LOGIN_USER})`);
  await page.goto(`${BASE_URL}/?orgId=${ORG_ID}`);

  const userIdInput = page.locator('input[placeholder="ユーザーIDを入力"]');
  await userIdInput.waitFor({ state: 'visible', timeout: TIMEOUT });
  await userIdInput.fill(LOGIN_USER);

  const pwInput = page.locator('input[placeholder="パスワードを入力"]');
  await pwInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwInput.fill(LOGIN_PASSWORD);

  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  console.log('[Setup] ログイン完了');
}

// ===========================================================================
// マスタ選択プルダウン切り替え
// ===========================================================================
async function selectMasterType(page: Page, masterType: string): Promise<void> {
  const masterSelect = page.locator('.ant-select').first();
  await masterSelect.waitFor({ state: 'visible', timeout: TIMEOUT });
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

  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${masterType}"]`).click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT });
}

// ===========================================================================
// DBにレコードが存在するか確認（API 経由でUI上の一覧をチェック）
// ===========================================================================
async function existsInList(page: Page, idValue: string): Promise<boolean> {
  // 一覧テーブルに ID が表示されているかを確認
  const cell = page.locator(`table td:has-text("${idValue}")`);
  return await cell.isVisible({ timeout: 3000 }).catch(() => false);
}

// ===========================================================================
// Ant Design Select ヘルパー（ダイアログ内）
// ===========================================================================
async function selectAntOptionInDialog(
  page: Page,
  nthSelect: number,
  optionText: string
): Promise<void> {
  const selects = page.locator('.ant-modal .ant-select');
  const selectEl = selects.nth(nthSelect);
  await selectEl.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await selectEl.click();

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

  const visibleDropdown = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .first();
  await visibleDropdown.locator(`.ant-select-item-option[title="${optionText}"]`).click();
}

// ===========================================================================
// Vendor 登録
// ===========================================================================
interface VendorData {
  vendorId?: string;
  vendorName?: string;
  vendorDescription?: string;
  vendorAnnotation?: string;
  isActive?: boolean;
  _comment?: string;
  [key: string]: unknown;
}

async function setupVendors(page: Page): Promise<void> {
  console.log('[Setup] Vendor データを確認・登録中...');
  await selectMasterType(page, 'Vendor');

  const vendor = TEST_DATA.vendor as Record<string, VendorData>;
  const targets: VendorData[] = [
    vendor.permanent,
    vendor.editBefore,
    vendor.editTest,
    vendor.toggleActive,
    vendor.toggleInactive,
  ].filter((v): v is VendorData => Boolean(v && v.vendorId));

  for (const data of targets) {
    if (!data.vendorId) continue;

    const alreadyExists = await existsInList(page, data.vendorId);
    if (alreadyExists) {
      console.log(`  [Skip] Vendor "${data.vendorId}" は既に存在します`);
      continue;
    }

    console.log(`  [Add]  Vendor "${data.vendorId}" を登録中...`);
    await registerVendor(page, data);
    console.log(`  [Done] Vendor "${data.vendorId}" 登録完了`);
  }
}

async function registerVendor(page: Page, data: VendorData): Promise<void> {
  // 追加ボタンクリック
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });

  // Vendor ID
  const inputs = page.locator('.ant-modal .ant-input:not([disabled])');
  const idInput = inputs.first();
  await idInput.waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });
  await idInput.fill(data.vendorId ?? '');

  // Vendor名
  const nameInput = inputs.nth(1);
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(data.vendorName ?? '');
  }

  // 説明（3番目：input または textarea）
  if (data.vendorDescription) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const descInput = allInputs.nth(2);
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill(data.vendorDescription);
    }
  }

  // 注釈（4番目：input または textarea）
  if (data.vendorAnnotation) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const annoInput = allInputs.nth(3);
    if (await annoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annoInput.fill(data.vendorAnnotation);
    }
  }

  // 状態スイッチ
  await setActiveSwitch(page, data.isActive ?? true);

  // 保存ボタンクリック
  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT });

  // ダイアログが閉じるまで待機
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: TIMEOUT }).catch(() => {});
}

// ===========================================================================
// Instrument 登録
// ===========================================================================
interface InstrumentData {
  instrumentId?: string;
  instrumentName?: string;
  instrumentDescription?: string;
  instrumentAnnotation?: string;
  isActive?: boolean;
  _comment?: string;
  [key: string]: unknown;
}

async function setupInstruments(page: Page): Promise<void> {
  console.log('[Setup] Instrument データを確認・登録中...');
  await selectMasterType(page, 'Instrument');

  const instrument = TEST_DATA.instrument as Record<string, InstrumentData>;
  const targets: InstrumentData[] = [
    instrument.permanent,
    instrument.editBefore,
    instrument.editTest,
    instrument.toggleActive,
    instrument.toggleInactive,
  ].filter((v): v is InstrumentData => Boolean(v && v.instrumentId));

  for (const data of targets) {
    if (!data.instrumentId) continue;

    const alreadyExists = await existsInList(page, data.instrumentId);
    if (alreadyExists) {
      console.log(`  [Skip] Instrument "${data.instrumentId}" は既に存在します`);
      continue;
    }

    console.log(`  [Add]  Instrument "${data.instrumentId}" を登録中...`);
    await registerInstrument(page, data);
    console.log(`  [Done] Instrument "${data.instrumentId}" 登録完了`);
  }
}

async function registerInstrument(page: Page, data: InstrumentData): Promise<void> {
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });

  const inputs = page.locator('.ant-modal .ant-input:not([disabled])');

  // Instrument ID
  await inputs.first().fill(data.instrumentId ?? '');

  // Instrument名
  const nameInput = inputs.nth(1);
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(data.instrumentName ?? '');
  }

  // 説明
  if (data.instrumentDescription) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const descInput = allInputs.nth(2);
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill(data.instrumentDescription);
    }
  }

  // 注釈
  if (data.instrumentAnnotation) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const annoInput = allInputs.nth(3);
    if (await annoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annoInput.fill(data.instrumentAnnotation);
    }
  }

  // 状態スイッチ
  await setActiveSwitch(page, data.isActive ?? true);

  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT });
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: TIMEOUT }).catch(() => {});
}

// ===========================================================================
// Creator 登録
// ===========================================================================
interface CreatorData {
  creatorId?: string;
  creatorName?: string;
  creatorDescription?: string;
  creatorAnnotation?: string;
  vendorName?: string;
  instrumentName?: string;
  isActive?: boolean;
  _comment?: string;
  [key: string]: unknown;
}

async function setupCreators(page: Page): Promise<void> {
  console.log('[Setup] Creator データを確認・登録中...');
  await selectMasterType(page, 'Creator');

  const creator = TEST_DATA.creator as Record<string, CreatorData>;
  const targets: CreatorData[] = [
    creator.permanent,
    creator.editBefore,
    creator.editTest,
    creator.toggleActive,
    creator.toggleInactive,
  ].filter((v): v is CreatorData => Boolean(v && v.creatorId));

  for (const data of targets) {
    if (!data.creatorId) continue;

    const alreadyExists = await existsInList(page, data.creatorId);
    if (alreadyExists) {
      console.log(`  [Skip] Creator "${data.creatorId}" は既に存在します`);
      continue;
    }

    console.log(`  [Add]  Creator "${data.creatorId}" を登録中...`);
    await registerCreator(page, data);
    console.log(`  [Done] Creator "${data.creatorId}" 登録完了`);
  }
}

async function registerCreator(page: Page, data: CreatorData): Promise<void> {
  await page.locator('button').filter({ hasText: '追加' }).first().click();
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: DIALOG_TIMEOUT });

  const inputs = page.locator('.ant-modal .ant-input:not([disabled])');

  // Creator ID
  await inputs.first().fill(data.creatorId ?? '');

  // Creator名
  const nameInput = inputs.nth(1);
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(data.creatorName ?? '');
  }

  // 説明
  if (data.creatorDescription) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const descInput = allInputs.nth(2);
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill(data.creatorDescription);
    }
  }

  // 注釈
  if (data.creatorAnnotation) {
    const allInputs = page.locator(
      '.ant-modal .ant-input:not([disabled]), .ant-modal textarea:not([disabled])'
    );
    const annoInput = allInputs.nth(3);
    if (await annoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annoInput.fill(data.creatorAnnotation);
    }
  }

  // Vendor名称（1番目のSelect）
  if (data.vendorName) {
    await selectAntOptionInDialog(page, 0, data.vendorName).catch((err) => {
      console.warn(`  [Warn] Vendor選択失敗: ${err}`);
    });
  }

  // Instrument名称（2番目のSelect）
  if (data.instrumentName) {
    await selectAntOptionInDialog(page, 1, data.instrumentName).catch((err) => {
      console.warn(`  [Warn] Instrument選択失敗: ${err}`);
    });
  }

  // 状態スイッチ
  await setActiveSwitch(page, data.isActive ?? true);

  await page.locator('.ant-modal-footer .ant-btn-primary').click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT });
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: TIMEOUT }).catch(() => {});
}

// ===========================================================================
// アクティブ/非アクティブ スイッチ操作ヘルパー
// ===========================================================================
async function setActiveSwitch(page: Page, isActive: boolean): Promise<void> {
  const switchEl = page.locator('.ant-modal .ant-switch').first();
  if (!(await switchEl.isVisible({ timeout: 3000 }).catch(() => false))) return;

  const isChecked = await switchEl
    .getAttribute('class')
    .then((cls) => cls?.includes('ant-switch-checked') ?? false);

  if (isActive && !isChecked) {
    await switchEl.click();
  } else if (!isActive && isChecked) {
    await switchEl.click();
  }
}
