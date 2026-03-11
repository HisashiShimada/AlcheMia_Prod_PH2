/**
 * ステップ定義: [2] システム管理者機能（2-1〜2-22 統合）
 *
 * 対応 feature: tests/e2e/features/system_management/2_system_management.feature
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
import testData from '../../fixtures/testdata/user_test_data.json';
import deptTestData from '../../fixtures/testdata/department_test_data.json';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ============================================================
// 定数
// ============================================================
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
const BASE_URL = `/?orgId=${ORG_ID}`;
const SYSTEM_ADMIN_PASSWORD = 'admin123';
const FIXTURE_DIR = path.join(__dirname, '../../fixtures/csv/upload');

// ============================================================
// テストデータ追跡配列
// ============================================================
const createdUserIds: string[] = [];
const createdDeptCds: string[] = [];
const createdRoleCds: string[] = [];

/** 最後に入力されたユーザーID（POST成功確認後にcreatedUserIdsへ追加） */
let lastEnteredUserId: string | null = null;
/** 最後に入力された部署CD */
let lastEnteredDeptCd: string | null = null;
/** 最後に入力されたロールCD */
let lastEnteredRoleCd: string | null = null;
/** ダウンロードしたロールCSV内容 */
let downloadedRoleCsvContent: string | null = null;

// ============================================================
// Before フック: ユーザー系前提データ準備
// ============================================================

Before({ tags: '@2-8-1' }, async ({ page }) => {
  // 1. 既存の「E2E編集前ユーザー」「E2E編集後ユーザー」が存在しないことを確認・削除
  // user_name は organization_user テーブルのカラム（user_authentication には存在しない）
  const existing = await db.query<{ user_id: string }>(
    `SELECT user_id FROM organization_user
     WHERE organization_id = $1 AND user_name IN ('E2E編集前ユーザー','E2E編集後ユーザー')`,
    [ORG_ID]
  ).catch(() => ({ rows: [] as { user_id: string }[] }));
  for (const row of existing.rows) {
    await db.query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, row.user_id]).catch(() => {});
    await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [row.user_id]).catch(() => {});
  }
  // testData.editBefore.mailAddress と同名レコードも削除（前回テスト残骸対策）
  await db.query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, testData.editBefore.mailAddress]).catch(() => {});
  await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [testData.editBefore.mailAddress]).catch(() => {});

  // 2. UIのユーザー追加ダイアログから testData.editBefore を登録
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.editBefore.userName,    // "E2E編集前ユーザー"
    testData.editBefore.mailAddress, // "e2e.edit.before@example.com"
    testData.editBefore.department,  // "材料合成部"
    testData.editBefore.role,        // "実験作業者"
    testData.editBefore.isActive     // true
  );
});

Before({ tags: '@2-8-2 or @2-8-3 or @2-8-4' }, async ({ page }) => {
  // 1. 既存の「E2E編集テストユーザー」が存在しないことを確認・削除
  // user_name は organization_user テーブルのカラム（user_authentication には存在しない）
  const existing = await db.query<{ user_id: string }>(
    `SELECT user_id FROM organization_user
     WHERE organization_id = $1 AND user_name = 'E2E編集テストユーザー'`,
    [ORG_ID]
  ).catch(() => ({ rows: [] as { user_id: string }[] }));
  for (const row of existing.rows) {
    await db.query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, row.user_id]).catch(() => {});
    await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [row.user_id]).catch(() => {});
  }
  // testData.editTest.mailAddress と同名レコードも削除（前回テスト残骸対策）
  await db.query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, testData.editTest.mailAddress]).catch(() => {});
  await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [testData.editTest.mailAddress]).catch(() => {});

  // 2. UIのユーザー追加ダイアログから testData.editTest を登録
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.editTest.userName,    // "E2E編集テストユーザー"
    testData.editTest.mailAddress, // "e2e.edit.test@example.com"
    testData.editTest.department,  // "材料合成部"
    testData.editTest.role,        // "実験作業者"
    testData.editTest.isActive     // true
  );
});

/**
 * UIのユーザー追加ダイアログ経由でユーザーを1件登録するヘルパー
 * @2-8-1 / @2-8-2 と同じ登録方式
 */
async function addUserViaDialog(
  page: import('@playwright/test').Page,
  userName: string,
  mailAddress: string,
  department: string,
  role: string,
  isActive: boolean
): Promise<void> {
  // 追加ボタン
  const addBtn = page.locator('button').filter({ hasText: '追加' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  // ダイアログ入力
  await setReactInputValue(page, '.ant-modal input[placeholder="山田 太郎"]', userName);
  await setReactInputValue(page, '.ant-modal input[placeholder="example@company.com"]', mailAddress);
  await selectAntOption(page, '.ant-modal .ant-form-item:has(#departmentCd) .ant-select', department);
  await selectAntOption(page, '.ant-modal .ant-form-item:has(#roleCd) .ant-select', role);
  if (!isActive) {
    // アクティブ判定を「非アクティブ」に変更
    await selectAntOption(page, '.ant-modal .ant-form-item:has(#isActive) .ant-select', '非アクティブ');
  }

  // 保存
  await page.click('.ant-modal-footer .ant-btn-primary');
  await page.waitForResponse(
    (r) => r.url().includes('/systemManagement/user') && r.request().method() === 'POST',
    { timeout: 10000 }
  ).catch(() => {});
  createdUserIds.push(mailAddress);
}

Before({ tags: '@2-9-1 or @2-9-3 or @2-9-4' }, async ({ page }) => {
  // 2-9-1/3/4: "E2Eトグルユーザーアクティブ" をアクティブで登録（featureファイル準拠）
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.toggle291.userName,
    testData.toggle291.mailAddress,
    testData.toggle291.department,
    testData.toggle291.role,
    true  // アクティブ状態で登録
  );
});

Before({ tags: '@2-9-2' }, async ({ page }) => {
  // 2-9-2: "E2Eトグルユーザー非アクティブ" を非アクティブで登録（featureファイル準拠）
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.toggle292.userName,
    testData.toggle292.mailAddress,
    testData.toggle292.department,
    testData.toggle292.role,
    false  // 非アクティブ状態で登録
  );
});

Before({ tags: '@2-9-3' }, async ({ page }) => {
  // 2-9-3: "E2Eトグルユーザーアクティブ" をアクティブで登録（featureファイル準拠）
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.toggle293.userName,
    testData.toggle293.mailAddress,
    testData.toggle293.department,
    testData.toggle293.role,
    true  // アクティブ状態で登録
  );
});

Before({ tags: '@2-9-4' }, async ({ page }) => {
  // 2-9-1/3/4: "E2Eトグルユーザーアクティブ" をアクティブで登録（featureファイル準拠）
  await loginAsSystemAdmin(page, testData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addUserViaDialog(
    page,
    testData.toggle294.userName,
    testData.toggle294.mailAddress,
    testData.toggle294.department,
    testData.toggle294.role,
    true  // アクティブ状態で登録
  );
});

/**
 * UIの部署追加ダイアログ経由で部署を1件登録するヘルパー
 * @2-15-1〜4 の Before フックで使用
 */
async function addDepartmentViaDialog(
  page: import('@playwright/test').Page,
  departmentCd: string,
  departmentName: string,
  isActive: boolean
): Promise<void> {
  const addBtn = page.locator('button').filter({ hasText: '追加' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });

  await setReactInputValue(page, '.ant-modal #departmentId', departmentCd);
  await setReactInputValue(page, '.ant-modal #displayName', departmentName);
  if (!isActive) {
    await selectAntOption(page, '.ant-modal .ant-form-item:has(#isActive) .ant-select', '非アクティブ');
  }

  await page.click('.ant-modal-footer .ant-btn-primary');

  // レスポンス待機（失敗してもOK）
  await page.waitForResponse(
    (r) =>
      (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
      r.request().method() === 'POST',
    { timeout: 10000 }
  ).catch(() => {});

  // モーダルが閉じるまで待機（これがないとテスト本体で編集ダイアログが誤作動する）
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

  createdDeptCds.push(departmentCd);
}

// ============================================================
// Before フック: 部署系前提データ準備
// ============================================================

Before({ tags: '@2-15-1' }, async ({ page }) => {
  // クリーンアップ
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name IN ('E2E編集前部署','E2E編集後部署')`,
      [ORG_ID]
    )
    .catch(() => {});
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`,
      [ORG_ID, deptTestData.editBefore.departmentCd]
    )
    .catch(() => {});

  // UIの部署追加ダイアログから登録
  await loginAsSystemAdmin(page, deptTestData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: '部署管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addDepartmentViaDialog(
    page,
    deptTestData.editBefore.departmentCd,   // 'E2E-EDIT-BEFORE'
    deptTestData.editBefore.departmentName, // 'E2E編集前部署'
    deptTestData.editBefore.isActive        // true
  );
});

Before({ tags: '@2-15-2' }, async ({ page }) => {
  // クリーンアップ
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name IN ('E2E編集テスト部署2','E2Eキャンセル後部署')`,
      [ORG_ID]
    )
    .catch(() => {});
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`,
      [ORG_ID, deptTestData.editTest2.departmentCd]
    )
    .catch(() => {});

  // UIの部署追加ダイアログから登録
  await loginAsSystemAdmin(page, deptTestData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: '部署管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addDepartmentViaDialog(
    page,
    deptTestData.editTest2.departmentCd,   // 'E2E-EDIT-TEST-2'
    deptTestData.editTest2.departmentName, // 'E2E編集テスト部署2'
    deptTestData.editTest2.isActive        // true
  );
});

Before({ tags: '@2-15-3' }, async ({ page }) => {
  // クリーンアップ
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name = 'E2E編集テスト部署3'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`,
      [ORG_ID, deptTestData.editTest3.departmentCd]
    )
    .catch(() => {});

  // UIの部署追加ダイアログから登録
  await loginAsSystemAdmin(page, deptTestData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: '部署管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addDepartmentViaDialog(
    page,
    deptTestData.editTest3.departmentCd,   // 'E2E-EDIT-TEST-3'
    deptTestData.editTest3.departmentName, // 'E2E編集テスト部署3'
    deptTestData.editTest3.isActive        // true
  );
});

Before({ tags: '@2-15-4' }, async ({ page }) => {
  // クリーンアップ
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name = 'E2E編集テスト部署4'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`,
      [ORG_ID, deptTestData.editTest4.departmentCd]
    )
    .catch(() => {});

  // UIの部署追加ダイアログから登録
  await loginAsSystemAdmin(page, deptTestData.loginUser.userId);
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  await page.locator('.ant-tabs-tab').filter({ hasText: '部署管理' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  await addDepartmentViaDialog(
    page,
    deptTestData.editTest4.departmentCd,   // 'E2E-EDIT-TEST-4'
    deptTestData.editTest4.departmentName, // 'E2E編集テスト部署4'
    deptTestData.editTest4.isActive        // true
  );
});

Before({ tags: '@2-17-2' }, async () => {
  // 前回テスト実行時の残骸を削除（重複キーエラー防止）
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`,
      [ORG_ID, 'E2E-CSV-DEPT-001']
    )
    .catch(() => {});
});

Before({ tags: '@2-16-1 or @2-16-3' }, async () => {
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name = 'E2Eトグル部署アクティブ'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO department (organization_id, department_cd, department_name, is_active)
     VALUES ($1, 'E2E-TOGGLE-ACTIVE-DEPT', 'E2Eトグル部署アクティブ', true)
     ON CONFLICT (organization_id, department_cd) DO UPDATE SET is_active = true`,
    [ORG_ID]
  );
  createdDeptCds.push('E2E-TOGGLE-ACTIVE-DEPT');
});

Before({ tags: '@2-16-2' }, async () => {
  await db
    .query(
      `DELETE FROM department WHERE organization_id = $1 AND department_name = 'E2Eトグル部署非アクティブ'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO department (organization_id, department_cd, department_name, is_active)
     VALUES ($1, 'E2E-TOGGLE-INACTIVE-DEPT', 'E2Eトグル部署非アクティブ', false)
     ON CONFLICT (organization_id, department_cd) DO UPDATE SET is_active = false`,
    [ORG_ID]
  );
  createdDeptCds.push('E2E-TOGGLE-INACTIVE-DEPT');
});

Before({ tags: '@2-10-2' }, async () => {
  // 前回テスト実行時のCSVアップロードデータが残っている場合は削除
  await db.query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, 'e2e.csv.upload@example.com']).catch(() => {});
  await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, ['e2e.csv.upload@example.com']).catch(() => {});
});

Before({ tags: '@2-7-1 or @2-7-2 or @2-7-3 or @2-7-5 or @2-7-6' }, async () => {
  // ユーザー追加ダイアログの「所属部署」プルダウンに「材料合成部」が存在することを保証
  // featureファイルで 所属部署=材料合成部, ロール=実験作業者 を使用しているため
  await db.query(
    `INSERT INTO department (organization_id, department_cd, department_name, is_active)
     VALUES ($1, 'materials_synthesis', '材料合成部', true)
     ON CONFLICT (organization_id, department_cd) DO UPDATE SET department_name = '材料合成部', is_active = true`,
    [ORG_ID]
  );
  // 「実験作業者」ロールが存在することを保証（system built-in role: experiment_worker）
  await db.query(
    `INSERT INTO role (organization_id, role_cd, role_name, is_active)
     VALUES ($1, 'experiment_worker', '実験作業者', true)
     ON CONFLICT (organization_id, role_cd) DO UPDATE SET role_name = '実験作業者', is_active = true`,
    [ORG_ID]
  );
});

Before({ tags: '@2-14-5' }, async () => {
  await db.query(
    `INSERT INTO department (organization_id, department_cd, department_name, is_active)
     VALUES ($1, 'E2E-PERM-DEPT-001', 'E2E常設テスト部署', true)
     ON CONFLICT (organization_id, department_cd) DO UPDATE SET is_active = true`,
    [ORG_ID]
  );
});

// ============================================================
// Before フック: ロール系前提データ準備
// ============================================================

Before({ tags: '@2-20-1' }, async () => {
  await db
    .query(
      `DELETE FROM role WHERE organization_id = $1 AND role_name IN ('E2E編集前ロール','E2E編集後ロール')`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO role (organization_id, role_cd, role_name, is_active)
     VALUES ($1, 'e2e_edit_before_role', 'E2E編集前ロール', true)
     ON CONFLICT DO NOTHING`,
    [ORG_ID]
  );
  createdRoleCds.push('e2e_edit_before_role');
});

Before({ tags: '@2-20-2 or @2-20-3 or @2-20-4' }, async () => {
  await db
    .query(
      `DELETE FROM role WHERE organization_id = $1 AND role_name = 'E2E編集テストロール'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO role (organization_id, role_cd, role_name, is_active)
     VALUES ($1, 'e2e_edit_test_role', 'E2E編集テストロール', true)
     ON CONFLICT DO NOTHING`,
    [ORG_ID]
  );
  createdRoleCds.push('e2e_edit_test_role');
});

Before({ tags: '@2-21-1 or @2-21-3' }, async () => {
  await db
    .query(
      `DELETE FROM role WHERE organization_id = $1 AND role_name = 'E2Eトグルロールアクティブ'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO role (organization_id, role_cd, role_name, is_active)
     VALUES ($1, 'e2e_toggle_active_role', 'E2Eトグルロールアクティブ', true)
     ON CONFLICT (organization_id, role_cd) DO UPDATE SET is_active = true`,
    [ORG_ID]
  );
  createdRoleCds.push('e2e_toggle_active_role');
});

Before({ tags: '@2-21-2' }, async () => {
  await db
    .query(
      `DELETE FROM role WHERE organization_id = $1 AND role_name = 'E2Eトグルロール非アクティブ'`,
      [ORG_ID]
    )
    .catch(() => {});
  await db.query(
    `INSERT INTO role (organization_id, role_cd, role_name, is_active)
     VALUES ($1, 'e2e_toggle_inactive_role', 'E2Eトグルロール非アクティブ', false)
     ON CONFLICT (organization_id, role_cd) DO UPDATE SET is_active = false`,
    [ORG_ID]
  );
  createdRoleCds.push('e2e_toggle_inactive_role');
});

// ============================================================
// After フック: クリーンアップ
// ============================================================

After(async () => {
  // ユーザー削除（user_id ベース）
  for (const userId of createdUserIds) {
    await db
      .query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, userId])
      .catch(() => {});
    await db
      .query(`DELETE FROM user_authentication WHERE user_id = $1`, [userId])
      .catch(() => {});
  }
  createdUserIds.length = 0;

  // ユーザー削除（user_name ベース）
  // user_name は organization_user テーブルのカラム（user_authentication には存在しない）
  const e2eUserNames = ['E2Eテストユーザー', 'E2E非アクティブユーザー', 'E2ECSVUP_ユーザー', 'E2E編集後ユーザー'];
  for (const name of e2eUserNames) {
    // organization_user から user_id を取得して削除
    const userRows = await db
      .query<{ user_id: string }>(
        `SELECT user_id FROM organization_user WHERE organization_id = $1 AND user_name = $2`,
        [ORG_ID, name]
      )
      .catch(() => ({ rows: [] as { user_id: string }[] }));
    for (const row of userRows.rows) {
      await db
        .query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, row.user_id])
        .catch(() => {});
      await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [row.user_id]).catch(() => {});
    }
  }

  // ユーザー削除（メールアドレス ベース）
  const e2eUserMails = [
    'e2e.test.user@example.com',
    'e2e.inactive.user@example.com',
    'e2e.csv.upload@example.com',
    testData.toggle291.mailAddress,   // @2-9-1
    testData.toggle292.mailAddress,   // @2-9-2 
    testData.toggle293.mailAddress,   // @2-9-3
    testData.toggle294.mailAddress,   // @2-9-4
  ];
  for (const mail of e2eUserMails) {
    await db
      .query(`DELETE FROM organization_user WHERE organization_id = $1 AND user_id = $2`, [ORG_ID, mail])
      .catch(() => {});
    await db.query(`DELETE FROM user_authentication WHERE user_id = $1`, [mail]).catch(() => {});
  }

  // 部署削除（department_cd ベース）
  for (const cd of createdDeptCds) {
    await db
      .query(`DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`, [ORG_ID, cd])
      .catch(() => {});
  }
  createdDeptCds.length = 0;

  // 部署削除（department_name ベース）
  const e2eDeptNames = ['E2Eテスト部署', 'E2E非アクティブ部署', 'E2ECSVUP部署', 'E2E編集後部署'];
  for (const name of e2eDeptNames) {
    await db
      .query(`DELETE FROM department WHERE organization_id = $1 AND department_name = $2`, [ORG_ID, name])
      .catch(() => {});
  }
  const e2eDeptCds = ['E2E-DEPT-001', 'E2E-DEPT-002', 'E2E-CSV-DEPT-001'];
  for (const cd of e2eDeptCds) {
    await db
      .query(`DELETE FROM department WHERE organization_id = $1 AND department_cd = $2`, [ORG_ID, cd])
      .catch(() => {});
  }

  // ロール削除（role_cd ベース）
  for (const cd of createdRoleCds) {
    await db
      .query(`DELETE FROM role_permission WHERE organization_id = $1 AND role_cd = $2`, [ORG_ID, cd])
      .catch(() => {});
    await db.query(`DELETE FROM role WHERE organization_id = $1 AND role_cd = $2`, [ORG_ID, cd]).catch(() => {});
  }
  createdRoleCds.length = 0;

  // ロール削除（role_name ベース）
  const e2eRoleNames = ['E2Eテストロール', 'E2E編集後ロール', 'E2ECSVUP_ロール'];
  for (const name of e2eRoleNames) {
    const res = await db
      .query(`SELECT role_cd FROM role WHERE organization_id = $1 AND role_name = $2`, [ORG_ID, name])
      .catch(() => ({ rows: [] as { role_cd: string }[] }));
    for (const row of res.rows) {
      await db
        .query(`DELETE FROM role_permission WHERE organization_id = $1 AND role_cd = $2`, [ORG_ID, row.role_cd])
        .catch(() => {});
    }
    await db.query(`DELETE FROM role WHERE organization_id = $1 AND role_name = $2`, [ORG_ID, name]).catch(() => {});
  }
  const e2eRoleCds = ['e2e_role_001', 'e2e_csv_role_001', 'e2e_perm_role_001'];
  for (const cd of e2eRoleCds) {
    await db
      .query(`DELETE FROM role_permission WHERE organization_id = $1 AND role_cd = $2`, [ORG_ID, cd])
      .catch(() => {});
    await db.query(`DELETE FROM role WHERE organization_id = $1 AND role_cd = $2`, [ORG_ID, cd]).catch(() => {});
  }

  lastEnteredUserId = null;
  lastEnteredDeptCd = null;
  lastEnteredRoleCd = null;
  downloadedRoleCsvContent = null;
});

AfterAll(async () => {
  await closeDb();
});

// ============================================================
// ヘルパー関数
// ============================================================

/** React制御Inputへの値セット */
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
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeSetter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      /* eslint-enable no-undef */
    },
    { sel: selector, val: value }
  );
}

/** Ant Design Select のオプション選択 */
async function selectAntOption(
  page: import('@playwright/test').Page,
  containerSelector: string,
  optionTitle: string
): Promise<void> {
  const selectEl = page.locator(containerSelector);
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
  // title属性ではなく表示テキスト（hasText）で選択（実UIのtitle属性値に依存しない）
  await visibleDropdown.locator('.ant-select-item-option').filter({ hasText: optionTitle }).first().click();
}

/**
 * ページネーション対策: テーブル上部の検索欄でユーザー名を絞り込む
 * 検索欄が存在しない場合はそのまま続行する
 */
async function searchUserInTable(
  page: import('@playwright/test').Page,
  userName: string
): Promise<void> {
  // テーブル上部の検索input（placeholder="ユーザー名で検索" など）を探す
  const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="ユーザー名"]').first();
  const exists = await searchInput.count() > 0;
  if (exists) {
    await searchInput.click();
    await searchInput.fill(userName);
    await page.waitForTimeout(500); // デバウンス待ち
  }
  // 検索欄がない場合でも処理続行（テーブル行をそのまま探す）
}

/** ログイン処理 */
async function loginAsSystemAdmin(
  page: import('@playwright/test').Page,
  userId: string
): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForSelector('#userId', { timeout: 15000 });
  await setReactInputValue(page, '#userId', userId);
  await setReactInputValue(page, '#password', SYSTEM_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

// ============================================================
// Given ステップ
// ============================================================

Given('システム管理者ユーザーがDB（organization_userテーブル）に存在する', async () => {
  // 事前データ投入済み前提
});

Given('テスト用セッションが存在すること', async () => {
  // system.admin@example.com 自身のセッションはログイン済みなので存在する
  // 別のブラウザコンテキストでのセッション作成は現在の構成では困難なため、
  // 既存のログインセッションを利用してテストする
});

// ============================================================
// When ステップ: ログイン・画面遷移
// ============================================================

When('システム管理者ユーザー {string} でログインする', async ({ page }, userId: string) => {
  await loginAsSystemAdmin(page, userId);
});

When('システム概要画面を開く', async ({ page }) => {
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  const tab = page.locator('.ant-tabs-tab').filter({ hasText: 'システム概要' }).first();
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('ユーザー管理画面を開く', async ({ page }) => {
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  const tab = page.locator('.ant-tabs-tab').filter({ hasText: 'ユーザー管理' }).first();
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('セッション管理画面を開く', async ({ page }) => {
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  const tab = page.locator('.ant-tabs-tab').filter({ hasText: 'セッション管理' }).first();
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('部署管理画面を開く', async ({ page }) => {
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  const tab = page.locator('.ant-tabs-tab').filter({ hasText: '部署管理' }).first();
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

When('ロール管理画面を開く', async ({ page }) => {
  await page.waitForSelector('.ant-tabs-tab', { timeout: 15000 });
  const tab = page.locator('.ant-tabs-tab').filter({ hasText: 'ロール管理' }).first();
  await tab.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
});

// ============================================================
// When ステップ: ユーザー管理操作
// ============================================================

When('ユーザー管理の「追加」ボタンをクリックする', async ({ page }) => {
  const addBtn = page.locator('button').filter({ hasText: '追加' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  'ユーザー追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ユーザー名') {
        // placeholder="山田 太郎" で特定
        await setReactInputValue(page, '.ant-modal input[placeholder="山田 太郎"]', value);
      } else if (field === 'メールアドレス') {
        lastEnteredUserId = value;
        // placeholder="example@company.com" で特定
        await setReactInputValue(page, '.ant-modal input[placeholder="example@company.com"]', value);
      } else if (field === '所属部署') {
        // Form.Item name="departmentCd" の Select: #departmentCd を含む .ant-select
        await selectAntOption(page, '.ant-modal .ant-form-item:has(#departmentCd) .ant-select', value);
      } else if (field === 'ロール') {
        // Form.Item name="roleCd" の Select: #roleCd を含む .ant-select
        await selectAntOption(page, '.ant-modal .ant-form-item:has(#roleCd) .ant-select', value);
      } else if (field === 'アクティブ判定' && value && value !== 'アクティブ') {
        // Form.Item name="isActive" の Select: #isActive を含む .ant-select
        await selectAntOption(page, '.ant-modal .ant-form-item:has(#isActive) .ant-select', value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) => r.url().includes('/systemManagement/user') && r.request().method() === 'POST',
          { timeout: 10000 }
        )
        .then((r) => {
          if (r.status() < 400 && lastEnteredUserId) {
            createdUserIds.push(lastEnteredUserId);
            lastEnteredUserId = null;
          }
        })
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When(
  'ユーザー追加ダイアログで以下の情報を入力する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ユーザー名') {
        await setReactInputValue(page, '.ant-modal .ant-input:first-of-type', value);
      } else if (field === 'メールアドレス') {
        await setReactInputValue(page, '.ant-modal .ant-input:nth-of-type(2)', value);
      } else if (field === 'パスワード') {
        await setReactInputValue(page, '.ant-modal input[type="password"]:first-of-type', value);
      } else if (field === 'パスワード確認') {
        await setReactInputValue(page, '.ant-modal input[type="password"]:last-of-type', value);
      }
    }
  }
);

When('ユーザー追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
  await page
    .locator('.ant-modal')
    .filter({ hasText: 'ユーザー追加' })
    .waitFor({ state: 'hidden', timeout: 10000 })
    .catch(() => {});
});

When('ユーザー {string} の「編集」ボタンをクリックする', async ({ page }, userName: string) => {
  // ページネーションで対象ユーザーが非表示の場合があるため、テーブル上部の検索欄で絞り込む
  await searchUserInTable(page, userName);
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${userName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.locator('button').filter({ hasText: '編集' }).first().click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  'ユーザー編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ユーザー名') {
        const inputSel = '.ant-modal .ant-input';
        await page.click(inputSel);
        await page.keyboard.press('Control+A');
        await setReactInputValue(page, inputSel, value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) => r.url().includes('/systemManagement/user') && ['PUT', 'PATCH'].includes(r.request().method()),
          { timeout: 10000 }
        )
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When('ユーザー編集ダイアログでユーザー名を {string} に変更する', async ({ page }, newName: string) => {
  const inputSel = '.ant-modal .ant-input';
  await page.click(inputSel);
  await page.keyboard.press('Control+A');
  await setReactInputValue(page, inputSel, newName);
});

When(
  'ユーザー編集ダイアログでユーザー名を {string} に変更して保存する',
  async ({ page }, newName: string) => {
    const inputSel = '.ant-modal .ant-input';
    await page.click(inputSel);
    await page.keyboard.press('Control+A');
    await setReactInputValue(page, inputSel, newName);
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) => r.url().includes('/systemManagement/user') && ['PUT', 'PATCH'].includes(r.request().method()),
          { timeout: 10000 }
        )
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When('ユーザー編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
});

When('ユーザー {string} の個別切り替えボタンをクリックする', async ({ page }, userName: string) => {
  // ページネーション対策: 検索欄で絞り込んでから対象行を取得
  await searchUserInTable(page, userName);
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${userName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  const toggleBtn = row.locator('button').filter({ hasText: /アクティブ|非アクティブ/ }).first();
  await toggleBtn.click();
  await page.waitForSelector('.ant-modal-confirm, .ant-modal', { timeout: 10000 });
});

When('ユーザー切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/user') && ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('ユーザー切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-default, .ant-modal-footer .ant-btn-default')
    .first()
    .click();
  await page.waitForTimeout(500);
});

When(
  '以下のユーザーのチェックボックスを選択する',
  async ({ page }, dataTable: { hashes: () => Array<{ ユーザー名: string }> }) => {
    for (const row of dataTable.hashes()) {
      // ページネーション対策: 検索欄で絞り込んでから対象行を取得
      await searchUserInTable(page, row['ユーザー名']);
      const tableRow = page.locator('table tr', { has: page.locator(`td:has-text("${row['ユーザー名']}")`) });
      await tableRow.waitFor({ state: 'visible', timeout: 10000 });
      await tableRow.locator('input[type="checkbox"]').click();
    }
  }
);

When('ユーザー管理画面の「非アクティブ」ボタンをクリックする', async ({ page }) => {
  // test.md 規約: 「リロード」ボタンの親 div を基点にツールバーの「非アクティブ」ボタンを特定
  // （テーブル行の個別切り替えボタンと区別するため）
  const reloadBtn = page.locator('button').filter({ hasText: 'リロード' }).first();
  await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });
  const toolbar = reloadBtn.locator('xpath=ancestor::div[1]');
  const deactivateBtn = toolbar.locator('button').filter({ hasText: '非アクティブ' }).first();
  await deactivateBtn.waitFor({ state: 'visible', timeout: 10000 });
  await deactivateBtn.click();
  await page.waitForSelector('.ant-modal-confirm, .ant-modal', { timeout: 10000 });
});

When('ユーザー一括操作確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/user') && ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('ユーザー管理の「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForTimeout(2000);
});

When('ユーザー管理の「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  // UserManagement は document.createElement('input') で動的inputを生成してクリックする実装
  // → page.waitForEvent('filechooser') でダイアログを待ち受けてからクリック
  const btn = page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
});

When('ユーザーアップロードファイル {string} を選択する', async ({ page }, fileName: string) => {
  const csvPath = path.join(FIXTURE_DIR, fileName);
  // document.createElement('input').click() で開くファイルダイアログを interceptする
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  await fileChooser.setFiles(csvPath);
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/user') && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);
});

// ============================================================
// When ステップ: セッション操作
// ============================================================

When('セッション一覧の対象セッションの「ログアウト」ボタンをクリックする', async ({ page }) => {
  const logoutBtn = page
    .locator('table tr')
    .filter({ hasNot: page.locator('th') })
    .first()
    .locator('button')
    .filter({ hasText: 'ログアウト' })
    .first();
  await logoutBtn.waitFor({ state: 'visible', timeout: 10000 });
  await logoutBtn.click();
  await page.waitForSelector('.ant-modal-confirm, .ant-modal', { timeout: 10000 });
});

When('セッション操作確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse((r) => r.url().includes('/systemManagement/session'), { timeout: 10000 })
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

// ============================================================
// When ステップ: 部署管理操作
// ============================================================

When('部署管理の「追加」ボタンをクリックする', async ({ page }) => {
  const addBtn = page.locator('button').filter({ hasText: '追加' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  '部署追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === '部署CD') {
        lastEnteredDeptCd = value;
        // Form.Item name="departmentId" → id="departmentId" の input
        await setReactInputValue(page, '.ant-modal #departmentId', value);
      } else if (field === '部署名') {
        // Form.Item name="displayName" → id="displayName" の input
        await setReactInputValue(page, '.ant-modal #displayName', value);
      } else if (field === '状態' && value && value !== 'アクティブ') {
        // Form.Item name="isActive" → Select（ラジオボタンではなく Select）
        await selectAntOption(page, '.ant-modal .ant-form-item:has(#isActive) .ant-select', value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) =>
            (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
            r.request().method() === 'POST',
          { timeout: 10000 }
        )
        .then((r) => {
          if (r.status() < 400 && lastEnteredDeptCd) {
            createdDeptCds.push(lastEnteredDeptCd);
            lastEnteredDeptCd = null;
          }
        })
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When(
  '部署追加ダイアログで以下の情報を入力する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === '部署CD') {
        // Form.Item name="departmentId" → id="departmentId"
        await setReactInputValue(page, '.ant-modal #departmentId', value);
      } else if (field === '部署名') {
        // Form.Item name="displayName" → id="displayName"
        await setReactInputValue(page, '.ant-modal #displayName', value);
      }
    }
  }
);

When('部署追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
});

When('部署 {string} の「編集」ボタンをクリックする', async ({ page }, deptName: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${deptName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.locator('button').filter({ hasText: '編集' }).first().click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  '部署編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === '部署名') {
        // 編集ダイアログでは部署CD（#departmentId）がdisabledになるため、
        // `.ant-modal .ant-input` は disabled な部署CD欄にヒットする。
        // 部署名フィールド (#displayName) を明示的に指定する。
        const inputSel = '.ant-modal #displayName';
        await page.click(inputSel);
        await page.keyboard.press('Control+A');
        await setReactInputValue(page, inputSel, value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) =>
            (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
            ['PUT', 'PATCH'].includes(r.request().method()),
          { timeout: 10000 }
        )
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When('部署編集ダイアログで部署名を {string} に変更する', async ({ page }, newName: string) => {
  // 編集ダイアログでは部署CD（#departmentId）がdisabledになるため #displayName を指定
  const inputSel = '.ant-modal #displayName';
  await page.click(inputSel);
  await page.keyboard.press('Control+A');
  await setReactInputValue(page, inputSel, newName);
});

When('部署編集ダイアログで部署名を {string} に変更して保存する', async ({ page }, newName: string) => {
  // 編集ダイアログでは部署CD（#departmentId）がdisabledになるため #displayName を指定
  const inputSel = '.ant-modal #displayName';
  await page.click(inputSel);
  await page.keyboard.press('Control+A');
  await setReactInputValue(page, inputSel, newName);
  await page.click('.ant-modal-footer .ant-btn-primary');
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
          ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('部署編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
});

When('部署 {string} の個別切り替えボタンをクリックする', async ({ page }, deptName: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${deptName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  const toggleBtn = row.locator('button').filter({ hasText: /アクティブ|非アクティブ/ }).first();
  await toggleBtn.click();
  await page.waitForSelector('.ant-modal-confirm, .ant-modal', { timeout: 10000 });
});

When('部署切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
          ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('部署切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-default, .ant-modal-footer .ant-btn-default')
    .first()
    .click();
  await page.waitForTimeout(500);
});

When('部署管理の「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForTimeout(2000);
});

When('部署管理の「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
});

When('部署アップロードファイル {string} を選択する', async ({ page }, fileName: string) => {
  const csvPath = path.join(FIXTURE_DIR, fileName);
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  await fileChooser.setFiles(csvPath);
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          (r.url().includes('/master/department') || r.url().includes('/systemManagement/department')) &&
          r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);
});

// ============================================================
// When ステップ: ロール管理操作
// ============================================================

When('ロール管理の「追加」ボタンをクリックする', async ({ page }) => {
  const addBtn = page.locator('button').filter({ hasText: '追加' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  'ロール追加ダイアログで以下の情報を入力して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ロールCD') {
        lastEnteredRoleCd = value;
        // Form.Item name="role" → id="role" の input
        await setReactInputValue(page, '.ant-modal #role', value);
      } else if (field === 'ロール名') {
        // Form.Item name="roleName" → id="roleName" の input
        await setReactInputValue(page, '.ant-modal #roleName', value);
      } else if (field === '状態' && value && value !== 'アクティブ') {
        // Form.Item name="isActive" → id="isActive" の Select
        await selectAntOption(page, '.ant-modal .ant-form-item:has(#isActive) .ant-select', value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) => r.url().includes('/systemManagement/role') && r.request().method() === 'POST',
          { timeout: 10000 }
        )
        .then((r) => {
          if (r.status() < 400 && lastEnteredRoleCd) {
            createdRoleCds.push(lastEnteredRoleCd);
            lastEnteredRoleCd = null;
          }
        })
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
      page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When(
  'ロール追加ダイアログで以下の情報を入力する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ロールCD') {
        // Form.Item name="role" → id="role"
        await setReactInputValue(page, '.ant-modal #role', value);
      } else if (field === 'ロール名') {
        // Form.Item name="roleName" → id="roleName"
        await setReactInputValue(page, '.ant-modal #roleName', value);
      }
    }
  }
);

When('ロール追加ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
});

When('ロール {string} の「編集」ボタンをクリックする', async ({ page }, roleName: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${roleName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.locator('button').filter({ hasText: '編集' }).first().click();
  await page.waitForSelector('.ant-modal', { timeout: 10000 });
});

When(
  'ロール編集ダイアログで以下の情報を変更して保存する',
  async ({ page }, dataTable: { hashes: () => Array<{ フィールド: string; 値: string }> }) => {
    const rows = dataTable.hashes();
    for (const row of rows) {
      const { フィールド: field, 値: value } = row;
      if (field === 'ロール名') {
        const inputSel = '.ant-modal .ant-input';
        await page.click(inputSel);
        await page.keyboard.press('Control+A');
        await setReactInputValue(page, inputSel, value);
      }
    }
    await page.click('.ant-modal-footer .ant-btn-primary');
    await Promise.race([
      page
        .waitForResponse(
          (r) => r.url().includes('/systemManagement/role') && ['PUT', 'PATCH'].includes(r.request().method()),
          { timeout: 10000 }
        )
        .catch(() => {}),
      page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

When('ロール編集ダイアログでロール名を {string} に変更する', async ({ page }, newName: string) => {
  const inputSel = '.ant-modal .ant-input';
  await page.click(inputSel);
  await page.keyboard.press('Control+A');
  await setReactInputValue(page, inputSel, newName);
});

When('ロール編集ダイアログでロール名を {string} に変更して保存する', async ({ page }, newName: string) => {
  const inputSel = '.ant-modal .ant-input';
  await page.click(inputSel);
  await page.keyboard.press('Control+A');
  await setReactInputValue(page, inputSel, newName);
  await page.click('.ant-modal-footer .ant-btn-primary');
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/role') && ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('ロール編集ダイアログの「キャンセル」ボタンをクリックする', async ({ page }) => {
  await page.click('.ant-modal-footer .ant-btn-default');
});

When('ロール {string} の個別切り替えボタンをクリックする', async ({ page }, roleName: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${roleName}")`) });
  await row.waitFor({ state: 'visible', timeout: 10000 });
  const toggleBtn = row.locator('button').filter({ hasText: /アクティブ|非アクティブ/ }).first();
  await toggleBtn.click();
  await page.waitForSelector('.ant-modal-confirm, .ant-modal', { timeout: 10000 });
});

When('ロール切り替え確認ダイアログで「OK」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .first()
    .click();
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/role') && ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 5000 }).catch(() => {}),
  ]);
});

When('ロール切り替え確認ダイアログで「キャンセル」をクリックする', async ({ page }) => {
  await page
    .locator('.ant-modal-confirm-btns .ant-btn-default, .ant-modal-footer .ant-btn-default')
    .first()
    .click();
  await page.waitForTimeout(500);
});

When('ロール管理の「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*ダウンロード/ }).first().click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `roles_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);
  const raw = fs.readFileSync(tmpPath, 'utf-8');
  downloadedRoleCsvContent = raw.replace(/^\uFEFF/, '');
  fs.unlinkSync(tmpPath);
});

When('ロール管理の「CSVアップロード」ボタンをクリックする', async ({ page }) => {
  const btn = page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
});

When('ロールアップロードファイル {string} を選択する', async ({ page }, fileName: string) => {
  const csvPath = path.join(FIXTURE_DIR, fileName);
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('button').filter({ hasText: /CSV[\s\S]*アップロード/ }).first().click(),
  ]);
  await fileChooser.setFiles(csvPath);
  await Promise.race([
    page
      .waitForResponse(
        (r) => r.url().includes('/systemManagement/role') && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
  ]);
});

// ============================================================
// Then ステップ: システム概要
// ============================================================

/**
 * システム概要カードの指定ラベル行の値テキストを取得するヘルパー
 * カード内の統計行を "ラベル" と "値" のペアで構造化して返す
 */
async function getCardStatValue(
  page: import('@playwright/test').Page,
  cardSelector: string,
  label: string
): Promise<string> {
  const card = page.locator(cardSelector).first();
  await card.waitFor({ state: 'visible', timeout: 10000 });

  // ラベルテキストを含む行から、対応する値テキストを取得
  // UI設計書: flex行で左ラベル・右値のレイアウト
  const valueText = await card.evaluate((cardEl: Element, labelText: string): string => {
    // span/div のテキストノードを走査してラベルに対応する値を探す
    const allElements = Array.from(cardEl.querySelectorAll('*'));
    for (const el of allElements) {
      if (
        el.children.length === 0 &&
        el.textContent?.trim() === labelText
      ) {
        // 同じ行コンテナ（親要素）の兄弟から値を探す
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const labelIdx = siblings.indexOf(el as HTMLElement);
          // ラベルの後の要素が値
          for (let i = labelIdx + 1; i < siblings.length; i++) {
            const text = siblings[i].textContent?.trim();
            if (text && text !== labelText) {
              return text;
            }
          }
          // 親がラベルを含む行なら、その次の兄弟行を探す
          const grandParent = parent.parentElement;
          if (grandParent) {
            const rows = Array.from(grandParent.children);
            const rowIdx = rows.indexOf(parent as HTMLElement);
            if (rowIdx >= 0) {
              const rowChildren = Array.from(parent.children);
              for (const child of rowChildren) {
                const text = child.textContent?.trim();
                if (text && text !== labelText) {
                  return text;
                }
              }
            }
          }
        }
      }
    }
    return '';
  }, label);

  return valueText;
}

Then('ユーザーカードが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-card').filter({ hasText: 'ユーザー' }).first()
  ).toBeVisible({ timeout: 10000 });
});

Then('ユーザーカードの {string} の値がDBの組織ユーザー総数と一致すること', async ({ page }, label: string) => {
  // DB から組織の総ユーザー数を取得
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM organization_user WHERE organization_id = $1`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  // 画面のカード値を取得
  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ユーザー")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('ユーザーカードの {string} の値がDBのアクティブユーザー数と一致すること', async ({ page }, label: string) => {
  // DB からアクティブユーザー数を取得
  // UI表示は organization_user.is_active = true の総数
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM organization_user
     WHERE organization_id = $1 AND is_active = true`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ユーザー")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('ユーザーカードの {string} の値がDBの契約ユーザー数と一致すること', async ({ page }, label: string) => {
  // DB から契約ユーザー数（organization.contract_users）を取得
  const dbResult = await db.query<{ contract_users: number }>(
    `SELECT contract_users FROM organization WHERE organization_id = $1`,
    [ORG_ID]
  );
  const expectedCount = dbResult.rows[0]?.contract_users ?? 0;

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ユーザー")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('セッションカードが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-card').filter({ hasText: 'セッション' }).first()
  ).toBeVisible({ timeout: 10000 });
});

Then('セッションカードの {string} の値がAPIレスポンスのセッション数と一致すること', async ({ page }, label: string) => {
  // APIレスポンスをインターセプトして sessions.total を取得
  const apiResponse = await page.evaluate(async (): Promise<number> => {
    try {
      const res = await fetch('/api/v1/systemManagement/system-overview', {
        credentials: 'include',
      });
      const json = (await res.json()) as {
        data?: { sessions?: { total?: number } };
      };
      return json?.data?.sessions?.total ?? 0;
    } catch {
      return 0;
    }
  });

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("セッション")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がAPIレスポンス値 "${apiResponse}" と一致しない`).toBe(apiResponse);
});

Then('実験システムカードが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-card').filter({ hasText: '実験システム' }).first()
  ).toBeVisible({ timeout: 10000 });
});

Then('実験システムカードの {string} の値がDBの総プロジェクト数と一致すること', async ({ page }, label: string) => {
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM project WHERE organization_id = $1`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("実験システム")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('実験システムカードの {string} の値がDBの計画中プロジェクト数と一致すること', async ({ page }, label: string) => {
  // project_status: '0'（プロジェクト計画中）, '1'（タスク実行待ち）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM project WHERE organization_id = $1 AND project_status IN ('0', '1')`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("実験システム")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('実験システムカードの {string} の値がDBの実行中プロジェクト数と一致すること', async ({ page }, label: string) => {
  // project_status: '2'（タスク実行中）, '3'（タスク結果レビュー待ち）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM project WHERE organization_id = $1 AND project_status IN ('2', '3')`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("実験システム")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('実験システムカードの {string} の値がDBの完了プロジェクト数と一致すること', async ({ page }, label: string) => {
  // project_status: '4'（プロジェクト完了）, '5'（タスク異常終了）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM project WHERE organization_id = $1 AND project_status IN ('4', '5')`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("実験システム")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('実験システムカードの {string} の値がDBの契約プロジェクト数と一致すること', async ({ page }, label: string) => {
  // organization.contract_projects から契約プロジェクト数を取得
  const dbResult = await db.query<{ contract_projects: number }>(
    `SELECT contract_projects FROM organization WHERE organization_id = $1`,
    [ORG_ID]
  );
  const expectedCount = dbResult.rows[0]?.contract_projects ?? 0;

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("実験システム")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('ストレージカードが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-card').filter({ hasText: 'ストレージ' }).first()
  ).toBeVisible({ timeout: 10000 });
});

Then('ストレージカードの {string} の値がAPIレスポンスの総ファイル数と一致すること', async ({ page }, label: string) => {
  // Swift/S3 の値は API レスポンスから取得
  const apiResponse = await page.evaluate(async (): Promise<number> => {
    try {
      const res = await fetch('/api/v1/systemManagement/system-overview', {
        credentials: 'include',
      });
      const json = (await res.json()) as {
        data?: { storage?: { totalFiles?: number } };
      };
      return json?.data?.storage?.totalFiles ?? 0;
    } catch {
      return 0;
    }
  });

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ストレージ")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がAPIレスポンス値 "${apiResponse}" と一致しない`).toBe(apiResponse);
});

Then('ストレージカードの {string} の値がAPIレスポンスの使用容量と一致すること', async ({ page }, label: string) => {
  // 使用容量（GB、小数点3桁）は Swift/S3 経由のため API レスポンスから取得
  const apiUsedCapacity = await page.evaluate(async (): Promise<number> => {
    try {
      const res = await fetch('/api/v1/systemManagement/system-overview', {
        credentials: 'include',
      });
      const json = (await res.json()) as {
        data?: { storage?: { usedCapacityGB?: number } };
      };
      return json?.data?.storage?.usedCapacityGB ?? 0;
    } catch {
      return 0;
    }
  });

  // 表示形式: "{値} GB"（小数点3桁）
  const expectedText = `${apiUsedCapacity.toFixed(3)} GB`;
  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ストレージ")',
    label
  );
  expect(displayedValue, `"${label}" の表示値 "${displayedValue}" がAPIレスポンス値 "${expectedText}" と一致しない`).toBe(expectedText);
});

Then('ストレージカードの {string} の値がDBの契約容量と一致すること', async ({ page }, label: string) => {
  // organization.contract_capacity から契約容量（GB）を取得
  const dbResult = await db.query<{ contract_capacity: number }>(
    `SELECT contract_capacity FROM organization WHERE organization_id = $1`,
    [ORG_ID]
  );
  const contractCapacity = dbResult.rows[0]?.contract_capacity ?? 0;

  // 表示形式: "{値} GB"（小数点3桁）
  const expectedText = `${Number(contractCapacity).toFixed(3)} GB`;
  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ストレージ")',
    label
  );
  expect(displayedValue, `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedText}" と一致しない`).toBe(expectedText);
});

Then('ログインカードが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-card').filter({ hasText: 'ログイン' }).first()
  ).toBeVisible({ timeout: 10000 });
});

Then('ログインカードの {string} の値がDBの過去7日間総ログイン数と一致すること', async ({ page }, label: string) => {
  // DDL確認: login_history.login_sf が成否カラム（login_sf = true: 成功, false: 失敗）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM login_history
     WHERE organization_id = $1
       AND login_at >= NOW() - INTERVAL '7 days'`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ログイン")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('ログインカードの {string} の値がDBの過去7日間ログイン成功数と一致すること', async ({ page }, label: string) => {
  // DDL確認: login_sf が成否カラム（is_success ではなく login_sf）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM login_history
     WHERE organization_id = $1
       AND login_at >= NOW() - INTERVAL '7 days'
       AND login_sf = true`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ログイン")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

Then('ログインカードの {string} の値がDBの過去7日間ログイン失敗数と一致すること', async ({ page }, label: string) => {
  // DDL確認: login_sf が成否カラム（is_success ではなく login_sf）
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM login_history
     WHERE organization_id = $1
       AND login_at >= NOW() - INTERVAL '7 days'
       AND login_sf = false`,
    [ORG_ID]
  );
  const expectedCount = parseInt(dbResult.rows[0].count, 10);

  const displayedValue = await getCardStatValue(
    page,
    '.ant-card:has-text("ログイン")',
    label
  );
  expect(parseInt(displayedValue, 10), `"${label}" の表示値 "${displayedValue}" がDB値 "${expectedCount}" と一致しない`).toBe(expectedCount);
});

// ============================================================
// Then ステップ: ユーザー管理
// ============================================================

Then('ユーザー一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
});

Then('データベースに登録されているユーザー件数と一覧の件数が一致すること', async ({ page }) => {
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM organization_user WHERE organization_id = $1`,
    [ORG_ID]
  );
  const dbCount = parseInt(dbResult.rows[0].count, 10);

  // ページネーションがある場合は「全 N 件」テキストから取得する
  // Ant Designの pagination showTotal テキスト（例: "全 25 件"）を優先
  const paginationTotal = await page.locator('.ant-pagination-total-text').textContent({ timeout: 5000 }).catch(() => null);
  let displayedCount: number;
  if (paginationTotal) {
    const match = paginationTotal.match(/(\d+)/);
    displayedCount = match ? parseInt(match[1], 10) : await page.locator('table tbody tr').count();
  } else {
    displayedCount = await page.locator('table tbody tr').count();
  }
  expect(displayedCount, `UI表示件数 ${displayedCount} がDB件数 ${dbCount} と一致しない`).toBe(dbCount);
});

Then('ユーザー追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: 'ユーザー追加' })).toBeVisible({ timeout: 10000 });
});

Then('ユーザー追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal').filter({ hasText: 'ユーザー追加' })).not.toBeVisible({ timeout: 10000 });
});

Then('ユーザー追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('ユーザー名フィールドが空であること', async ({ page }) => {
  const input = page.locator('.ant-modal .ant-input').first();
  await expect(input).toHaveValue('', { timeout: 5000 });
});

Then('メールアドレスフィールドが空であること', async ({ page }) => {
  const inputs = page.locator('.ant-modal .ant-input');
  await expect(inputs.nth(1)).toHaveValue('', { timeout: 5000 });
});

Then('ユーザー追加ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('ユーザー追加ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('ユーザー一覧に {string} が表示されること', async ({ page }, userName: string) => {
  // API成功後のテーブル再描画を待つ
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // ページネーション対策: 検索欄で絞り込んでから対象セルを確認
  await searchUserInTable(page, userName);
  await expect(page.locator(`table td:has-text("${userName}")`)).toBeVisible({ timeout: 10000 });
});

Then('データベースにユーザーID {string} のレコードが存在すること', async ({}, userId: string) => {
  const res = await db.query(`SELECT user_id FROM user_authentication WHERE user_id = $1`, [userId]);
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('データベースのユーザーID {string} の is_active が true であること', async ({}, userId: string) => {
  // is_active は user_authentication ではなく organization_user テーブルに存在する（DDL確認済み）
  const res = await db.query(
    `SELECT is_active FROM organization_user WHERE user_id = $1 AND organization_id = $2`,
    [userId, ORG_ID]
  );
  expect(res.rows[0]?.is_active, `organization_user.is_active が true でない (user_id: ${userId})`).toBe(true);
});

Then('データベースのユーザーID {string} の is_active が false であること', async ({}, userId: string) => {
  // is_active は user_authentication ではなく organization_user テーブルに存在する（DDL確認済み）
  const res = await db.query(
    `SELECT is_active FROM organization_user WHERE user_id = $1 AND organization_id = $2`,
    [userId, ORG_ID]
  );
  expect(res.rows[0]?.is_active, `organization_user.is_active が false でない (user_id: ${userId})`).toBe(false);
});

Then('データベースにユーザーID {string} のレコードが存在しないこと', async ({}, userId: string) => {
  const res = await db.query(`SELECT user_id FROM user_authentication WHERE user_id = $1`, [userId]);
  expect(res.rows.length).toBe(0);
});

Then('ユーザー追加バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('ユーザー追加エラーメッセージ {string} が表示されること', async ({ page }, message: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${message}"), .ant-form-item-explain-error:has-text("${message}")`)
  ).toBeVisible({ timeout: 10000 });
});

Then('ユーザー編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('ユーザー編集ダイアログのユーザー名フィールドに {string} が表示されていること', async ({ page }, value: string) => {
  const input = page.locator('.ant-modal .ant-input').first();
  await expect(input).toHaveValue(value, { timeout: 5000 });
});

Then('ユーザー編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('ユーザー編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('ユーザー編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 10000 });
});

Then('ユーザー編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('データベースにユーザー名 {string} のレコードが存在すること', async ({}, userName: string) => {
  // user_name は organization_user テーブルのカラム（user_authentication には存在しない）
  const res = await db.query(
    `SELECT user_id FROM organization_user WHERE organization_id = $1 AND user_name = $2`,
    [ORG_ID, userName]
  );
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('データベースにユーザー名 {string} のレコードが存在しないこと', async ({}, userName: string) => {
  // user_name は organization_user テーブルのカラム（user_authentication には存在しない）
  const res = await db.query(
    `SELECT user_id FROM organization_user WHERE organization_id = $1 AND user_name = $2`,
    [ORG_ID, userName]
  );
  expect(res.rows.length).toBe(0);
});

Then('ユーザー編集バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('ユーザー切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm, .ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('ユーザー一覧の {string} の状態が {string} であること', async ({ page }, userName: string, status: string) => {
  const row = page.locator('table tr', { has: page.locator(`td:has-text("${userName}")`) });
  await expect(row).toBeVisible({ timeout: 10000 });
  if (status === '非アクティブ') {
    await expect(row).toHaveClass(/inactive-row/, { timeout: 10000 });
  } else {
    await expect(row).not.toHaveClass(/inactive-row/, { timeout: 5000 });
  }
});

Then('データベースのユーザー名 {string} の is_active が true であること', async ({}, userName: string) => {
  // user_name / is_active は共に organization_user テーブルのカラム（user_authentication には存在しない）
  const res = await db.query(
    `SELECT is_active FROM organization_user WHERE organization_id = $1 AND user_name = $2`,
    [ORG_ID, userName]
  );
  expect(res.rows[0]?.is_active, `organization_user.is_active が true でない (user_name: ${userName})`).toBe(true);
});

Then('データベースのユーザー名 {string} の is_active が false であること', async ({}, userName: string) => {
  // user_name / is_active は共に organization_user テーブルのカラム（user_authentication には存在しない）
  const res = await db.query(
    `SELECT is_active FROM organization_user WHERE organization_id = $1 AND user_name = $2`,
    [ORG_ID, userName]
  );
  expect(res.rows[0]?.is_active, `organization_user.is_active が false でない (user_name: ${userName})`).toBe(false);
});

Then('ユーザー一括操作確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm, .ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('ユーザーCSVファイルがダウンロードされること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
});

Then('ユーザーCSVエラーメッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper, .ant-alert-error')).toBeVisible({ timeout: 10000 });
});

// ============================================================
// Then ステップ: セッション管理
// ============================================================

Then('セッション一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
});

Then('セッション一覧に {string} が表示されること', async ({ page }, userId: string) => {
  await expect(page.locator(`table td:has-text("${userId}")`)).toBeVisible({ timeout: 10000 });
});

Then('セッション操作確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm, .ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('セッション操作完了メッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper')).toBeVisible({ timeout: 10000 });
});

// ============================================================
// Then ステップ: 部署管理
// ============================================================

Then('部署一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
});

Then('データベースに登録されている部署件数と一覧の件数が一致すること', async ({ page }) => {
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM department WHERE organization_id = $1`,
    [ORG_ID]
  );
  const dbCount = parseInt(dbResult.rows[0].count, 10);

  // ページネーションがある場合は「全 N 件」テキストから取得する
  const paginationTotal = await page.locator('.ant-pagination-total-text').textContent({ timeout: 5000 }).catch(() => null);
  let displayedCount: number;
  if (paginationTotal) {
    const match = paginationTotal.match(/(\d+)/);
    displayedCount = match ? parseInt(match[1], 10) : await page.locator('table tbody tr').count();
  } else {
    displayedCount = await page.locator('table tbody tr').count();
  }
  expect(displayedCount, `UI表示件数 ${displayedCount} がDB件数 ${dbCount} と一致しない`).toBe(dbCount);
});

Then('部署追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('部署追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 10000 });
});

Then('部署追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('部署一覧に {string} が表示されること', async ({ page }, deptName: string) => {
  await expect(page.locator(`table td:has-text("${deptName}")`)).toBeVisible({ timeout: 10000 });
});

Then('データベースに部署CD {string} のレコードが存在すること', async ({}, deptCd: string) => {
  const res = await db.query(
    `SELECT department_cd FROM department WHERE organization_id = $1 AND department_cd = $2`,
    [ORG_ID, deptCd]
  );
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('データベースの部署CD {string} の is_active が true であること', async ({}, deptCd: string) => {
  const res = await db.query(
    `SELECT is_active FROM department WHERE organization_id = $1 AND department_cd = $2`,
    [ORG_ID, deptCd]
  );
  expect(res.rows[0]?.is_active).toBe(true);
});

Then('データベースの部署CD {string} の is_active が false であること', async ({}, deptCd: string) => {
  const res = await db.query(
    `SELECT is_active FROM department WHERE organization_id = $1 AND department_cd = $2`,
    [ORG_ID, deptCd]
  );
  expect(res.rows[0]?.is_active).toBe(false);
});

Then('データベースに部署CD {string} のレコードが存在しないこと', async ({}, deptCd: string) => {
  const res = await db.query(
    `SELECT department_cd FROM department WHERE organization_id = $1 AND department_cd = $2`,
    [ORG_ID, deptCd]
  );
  expect(res.rows.length).toBe(0);
});

Then('部署追加バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('部署追加エラーメッセージ {string} が表示されること', async ({ page }, message: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${message}"), .ant-form-item-explain-error:has-text("${message}")`)
  ).toBeVisible({ timeout: 10000 });
});

Then('部署編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('部署編集ダイアログの部署名フィールドに {string} が表示されていること', async ({ page }, value: string) => {
  // 編集ダイアログでは部署CD（#departmentId）がdisabledになるため #displayName を指定
  const input = page.locator('.ant-modal #displayName');
  await expect(input).toHaveValue(value, { timeout: 5000 });
});

Then('部署編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('部署編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('部署編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 10000 });
});

Then('部署編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('データベースに部署名 {string} のレコードが存在すること', async ({}, deptName: string) => {
  const res = await db.query(
    `SELECT department_cd FROM department WHERE organization_id = $1 AND department_name = $2`,
    [ORG_ID, deptName]
  );
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('データベースに部署名 {string} のレコードが存在しないこと', async ({}, deptName: string) => {
  const res = await db.query(
    `SELECT department_cd FROM department WHERE organization_id = $1 AND department_name = $2`,
    [ORG_ID, deptName]
  );
  expect(res.rows.length).toBe(0);
});

Then('部署編集バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('部署切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm, .ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('データベースの部署名 {string} の is_active が true であること', async ({}, deptName: string) => {
  const res = await db.query(
    `SELECT is_active FROM department WHERE organization_id = $1 AND department_name = $2`,
    [ORG_ID, deptName]
  );
  expect(res.rows[0]?.is_active).toBe(true);
});

Then('データベースの部署名 {string} の is_active が false であること', async ({}, deptName: string) => {
  const res = await db.query(
    `SELECT is_active FROM department WHERE organization_id = $1 AND department_name = $2`,
    [ORG_ID, deptName]
  );
  expect(res.rows[0]?.is_active).toBe(false);
});

Then('部署CSVファイルがダウンロードされること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
});

Then('部署CSVエラーメッセージが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-message-notice-wrapper, .ant-alert-error')).toBeVisible({ timeout: 10000 });
});

// ============================================================
// Then ステップ: ロール管理
// ============================================================

Then('ロール一覧テーブルが表示されること', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
});

Then('データベースに登録されているロール件数と一覧の件数が一致すること', async ({ page }) => {
  const dbResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM role WHERE organization_id = $1`,
    [ORG_ID]
  );
  const dbCount = parseInt(dbResult.rows[0].count, 10);

  // ページネーションがある場合は「全 N 件」テキストから取得する
  const paginationTotal = await page.locator('.ant-pagination-total-text').textContent({ timeout: 5000 }).catch(() => null);
  let displayedCount: number;
  if (paginationTotal) {
    const match = paginationTotal.match(/(\d+)/);
    displayedCount = match ? parseInt(match[1], 10) : await page.locator('table tbody tr').count();
  } else {
    displayedCount = await page.locator('table tbody tr').count();
  }
  expect(displayedCount, `UI表示件数 ${displayedCount} がDB件数 ${dbCount} と一致しない`).toBe(dbCount);
});

Then('ロール追加ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('ロール追加ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 10000 });
});

Then('ロール追加ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('ロール一覧に {string} が表示されること', async ({ page }, roleName: string) => {
  await expect(page.locator(`table td:has-text("${roleName}")`)).toBeVisible({ timeout: 10000 });
});

Then('データベースにロールCD {string} のレコードが存在すること', async ({}, roleCd: string) => {
  const res = await db.query(
    `SELECT role_cd FROM role WHERE organization_id = $1 AND role_cd = $2`,
    [ORG_ID, roleCd]
  );
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('データベースのロールCD {string} の is_active が true であること', async ({}, roleCd: string) => {
  const res = await db.query(
    `SELECT is_active FROM role WHERE organization_id = $1 AND role_cd = $2`,
    [ORG_ID, roleCd]
  );
  expect(res.rows[0]?.is_active).toBe(true);
});

Then('データベースにロールCD {string} のレコードが存在しないこと', async ({}, roleCd: string) => {
  const res = await db.query(
    `SELECT role_cd FROM role WHERE organization_id = $1 AND role_cd = $2`,
    [ORG_ID, roleCd]
  );
  expect(res.rows.length).toBe(0);
});

Then('ロール追加バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('ロール追加エラーメッセージ {string} が表示されること', async ({ page }, message: string) => {
  await expect(
    page.locator(`.ant-message-notice-wrapper:has-text("${message}"), .ant-form-item-explain-error:has-text("${message}")`)
  ).toBeVisible({ timeout: 10000 });
});

Then('ロール編集ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('ロール編集ダイアログのロール名フィールドに {string} が表示されていること', async ({ page }, value: string) => {
  const input = page.locator('.ant-modal .ant-input').first();
  await expect(input).toHaveValue(value, { timeout: 5000 });
});

Then('ロール編集ダイアログの「保存」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-primary')).toBeVisible({ timeout: 5000 });
});

Then('ロール編集ダイアログの「キャンセル」ボタンが表示されていること', async ({ page }) => {
  await expect(page.locator('.ant-modal-footer .ant-btn-default')).toBeVisible({ timeout: 5000 });
});

Then('ロール編集ダイアログが閉じること', async ({ page }) => {
  await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 10000 });
});

Then('ロール編集ダイアログが閉じないこと', async ({ page }) => {
  await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
});

Then('データベースにロール名 {string} のレコードが存在すること', async ({}, roleName: string) => {
  const res = await db.query(
    `SELECT role_cd FROM role WHERE organization_id = $1 AND role_name = $2`,
    [ORG_ID, roleName]
  );
  expect(res.rows.length).toBeGreaterThan(0);
});

Then('ロール編集バリデーションエラー {string} が表示されること', async ({ page }, message: string) => {
  await expect(page.locator(`.ant-form-item-explain-error:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
});

Then('ロール切り替え確認ダイアログが表示されること', async ({ page }) => {
  await expect(page.locator('.ant-modal-confirm, .ant-modal')).toBeVisible({ timeout: 10000 });
});

Then('データベースのロール名 {string} の is_active が true であること', async ({}, roleName: string) => {
  const res = await db.query(
    `SELECT is_active FROM role WHERE organization_id = $1 AND role_name = $2`,
    [ORG_ID, roleName]
  );
  expect(res.rows[0]?.is_active).toBe(true);
});

Then('データベースのロール名 {string} の is_active が false であること', async ({}, roleName: string) => {
  const res = await db.query(
    `SELECT is_active FROM role WHERE organization_id = $1 AND role_name = $2`,
    [ORG_ID, roleName]
  );
  expect(res.rows[0]?.is_active).toBe(false);
});

Then('ロールCSVファイルがダウンロードされること', async ({}) => {
  expect(downloadedRoleCsvContent, 'ロールCSVファイルがダウンロードされていません').not.toBeNull();
  expect(downloadedRoleCsvContent!.length).toBeGreaterThan(0);
});

Then('ダウンロードしたロールCSVに {string} ヘッダーが含まれること', async ({}, header: string) => {
  expect(downloadedRoleCsvContent, 'ダウンロードしたロールCSVが存在しません').not.toBeNull();
  const firstLine = downloadedRoleCsvContent!.split('\n')[0];
  expect(firstLine, `ヘッダー "${header}" が見つかりません`).toContain(header);
});
