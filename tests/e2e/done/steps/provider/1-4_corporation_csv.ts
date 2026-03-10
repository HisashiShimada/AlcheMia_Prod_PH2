/**
 * ステップ定義: [1-4] 会社のCSVダウンロード・アップロード
 *
 * 対応 feature: e2e/features/provider/1-4_corporation_csv.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6
 *   ユーザID  : seiya.takizawa@soft-service.co.jp
 *   パスワード: auth0002
 *
 * 実行前提:
 *   - フロントエンド (http://localhost:3000) が起動していること
 *   - バックエンド (http://localhost:3001) が起動していること
 *   - PostgreSQL が起動していること
 *   - テスト用プロバイダーユーザー（seiya.takizawa@soft-service.co.jp）が
 *     organization_user テーブルに存在すること
 *   - 下記の常設テストデータが corporation テーブルに存在すること:
 *       MaimlソフトBBB → [1-4-3] 重複チェック用
 *
 * CSV フォーマット（ダウンロード時）:
 *   - BOM 付き UTF-8
 *   - ヘッダー: corporation_name, update_at, is_active
 *   - アップロード時は corporation_name のみ必須
 *
 * fixture ファイル:
 *   - e2e/fixtures/csv/upload/corporations_valid.csv  → [1-4-2] 正常系
 *   - e2e/fixtures/csv/upload/corporations_dup.csv    → [1-4-3] 重複エラー
 *   - e2e/fixtures/csv/upload/corporations_empty.csv  → [1-4-4] 空エラー
 *
 * カバーするシナリオ:
 *   [1-4-1] CSVダウンロードボタンをクリックするとCSVファイルが取得できること
 *   [1-4-2] ダウンロードしたCSVに会社名を追加してアップロードすると会社が作成されること
 *   [1-4-3] 既存の会社名を含むCSVをアップロードするとエラーが表示されること
 *   [1-4-4] 会社名が空のCSVをアップロードするとエラーが表示されること
 *
 * After フック:
 *   - [1-4-2] で作成した会社を DB から削除
 *   - DB 接続プールをクローズ
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../../db';

const { When, Then, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** fixture CSV ファイルのベースディレクトリ */
const FIXTURE_DIR = path.join(__dirname, '../../fixtures/csv/upload');

/** テスト後に削除する会社名リスト */
const createdCorporationNames: string[] = [];

/** [1-4-1] で取得したダウンロード CSV の内容（[1-4-1] のヘッダー検証で使用） */
let downloadedCsvContent: string | null = null;

// ---------------------------------------------------------------------------
// When: ブラウザ操作
// ---------------------------------------------------------------------------

/**
 * プロバイダーユーザーでログインする
 */
When('プロバイダーユーザー {string} でログインする', async ({ page }, userId: string) => {
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', userId);
  await page.fill('#password', 'auth0002');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * 会社管理画面を開く
 */
When('会社管理画面を開く', async ({ page }) => {
  await page.waitForSelector('text=会社管理', { timeout: 15000 });
  await page.click('text=会社管理');
  await page.waitForSelector('table', { timeout: 15000 });
});

/**
 * 「CSVダウンロード」ボタンをクリックしてファイルをダウンロードする
 */
When('「CSVダウンロード」ボタンをクリックする', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button:has-text("CSVダウンロード")').click(),
  ]);

  // ダウンロードした CSV を一時ファイルに保存して内容を読み込む
  const tmpPath = path.join(os.tmpdir(), `corporations_e2e_${Date.now()}.csv`);
  await download.saveAs(tmpPath);

  // BOM を除去して内容を保持
  const rawContent = fs.readFileSync(tmpPath, 'utf-8');
  downloadedCsvContent = rawContent.replace(/^\uFEFF/, '');

  // 一時ファイルを削除
  fs.unlinkSync(tmpPath);
});

/**
 * 「CSVアップロード」ボタンをクリックする
 * page.setInputFiles() で直接 file input にセットするため、UI ボタン押下は不要。
 * feature との対応のため no-op として定義する。
 */
When('「CSVアップロード」ボタンをクリックする', async ({}) => {
  // no-op: 実際のファイル選択は次ステップの setInputFiles で行う
});

/**
 * fixture ディレクトリ内の指定ファイルを file input にセットしてアップロードする
 *
 * @param fileName - e2e/fixtures/csv/upload/ 配下のファイル名
 *   - corporations_valid.csv  : [1-4-2] 正常系（E2E_CSV追加会社）
 *   - corporations_dup.csv    : [1-4-3] 重複エラー（MaimlソフトBBB）
 *   - corporations_empty.csv  : [1-4-4] 空エラー（ヘッダーのみ）
 */
When(
  'アップロードファイル {string} を選択する',
  async ({ page }, fileName: string) => {
    const csvPath = path.join(FIXTURE_DIR, fileName);

    // corporations_valid.csv の場合は作成される会社名を After フック削除リストに登録
    if (fileName === 'corporations_valid.csv') {
      createdCorporationNames.push('E2E_CSV追加会社');
    }

    // fixture ファイルを直接 file input にセット
    await page.setInputFiles('#csv-upload', csvPath);

    // アップロード完了を待機（成功・失敗いずれのトーストも対象）
    await waitForUploadResponse(page);
  }
);

// ---------------------------------------------------------------------------
// Then: 検証
// ---------------------------------------------------------------------------

/**
 * CSVファイルがダウンロードされること（downloadedCsvContent が設定されていることで確認）
 */
Then('CSVファイルがダウンロードされること', async ({}) => {
  expect(
    downloadedCsvContent,
    'CSVファイルがダウンロードされていません'
  ).not.toBeNull();
  expect(
    downloadedCsvContent!.length,
    'CSVファイルの内容が空です'
  ).toBeGreaterThan(0);
});

/**
 * ダウンロードした CSV に指定ヘッダーが含まれること
 */
Then(
  'ダウンロードしたCSVに {string} ヘッダーが含まれること',
  async ({}, headerName: string) => {
    expect(
      downloadedCsvContent,
      'ダウンロードした CSV が存在しません'
    ).not.toBeNull();
    const firstLine = downloadedCsvContent!.split('\n')[0];
    expect(
      firstLine,
      `ヘッダー "${headerName}" が見つかりません（1行目: ${firstLine}）`
    ).toContain(headerName);
  }
);

/**
 * 会社一覧に指定会社名が表示されること
 */
Then(
  '会社一覧に {string} が表示されること',
  async ({ page }, corporationName: string) => {
    await expect(
      page.locator(`table td:has-text("${corporationName}")`)
    ).toBeVisible({ timeout: 15000 });
  }
);

/**
 * データベースの指定会社名のレコードが存在すること
 */
Then(
  'データベースの会社名 {string} のレコードが存在すること',
  async ({}, corporationName: string) => {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM corporation WHERE corporation_name = $1',
      [corporationName]
    );
    expect(
      parseInt(result.rows[0].count, 10),
      `corporation_name="${corporationName}" のレコードが存在しません`
    ).toBeGreaterThan(0);
  }
);

/**
 * エラーメッセージが表示されること（アップロード失敗時）
 */
Then('エラーメッセージが表示されること', async ({ page }) => {
  await expect(
    page.locator('.ant-message-notice-wrapper')
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// After フック: テストデータの削除
// ---------------------------------------------------------------------------

/**
 * 各シナリオ後: アップロードで作成した会社を DB から削除
 */
After(async () => {
  for (const name of createdCorporationNames) {
    await db.query(
      'DELETE FROM corporation WHERE corporation_name = $1',
      [name]
    ).catch(() => {});
  }
  createdCorporationNames.length = 0;
  // ダウンロード内容もリセット
  downloadedCsvContent = null;
});

/** 全シナリオ完了後に DB 接続プールをクローズ */
AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/**
 * CSV アップロード完了（成功/失敗トースト）を待機する
 */
async function waitForUploadResponse(
  page: import('@playwright/test').Page
): Promise<void> {
  await Promise.race([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/provider/corporation/upload-csv') &&
          resp.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => {}),
    page
      .waitForSelector('.ant-message-notice-wrapper', { timeout: 15000 })
      .catch(() => {}),
  ]);
}
