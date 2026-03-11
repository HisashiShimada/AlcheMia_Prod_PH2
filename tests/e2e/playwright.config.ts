import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// playwright-bdd の設定
// features/ 配下の .feature ファイルと steps/ 配下のステップ定義を紐付ける
//
// 環境変数 FEATURE_FILE が指定されている場合は、そのファイルのみを対象とする。
// 例: FEATURE_FILE=xxx.feature の場合
//   features に xxx.feature、steps に xxx.ts と common.ts が使われる
const featureFile = process.env.FEATURE_FILE;

// featureファイル名からベース名（拡張子なし）を取得
// 例: "xxx.feature" → "xxx"
const baseName = featureFile ? featureFile.replace(/\.feature$/, '') : undefined;

const testDir = defineBddConfig({
  features: baseName
    ? `features/**/${baseName}.feature`  // 特定ファイルのみ
    : 'features/**/*.feature',            // 全ファイル
  steps: baseName
    ? [`steps/**/${baseName}.ts`, 'steps/**/common.ts']  // 同名ステップ + common
    : 'steps/**/*.ts',                    // 全ステップ
});

/**
 * Playwright E2E テスト設定
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir,
  /* テストを並列実行 */
  fullyParallel: false,
  /* CI環境でtest.onlyが残っていたらビルド失敗にする */
  forbidOnly: !!process.env.CI,
  /* CI環境ではリトライを2回 */
  retries: process.env.CI ? 2 : 0,
  /* CI環境では並列実行を無効化 */
  workers: process.env.CI ? 1 : 1,
  /* レポーター設定 */
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['list'],
  ],
  /* 全テスト共通設定 */
  use: {
    /* フロントエンド（Next.js）のベースURL */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    /* リトライ時にトレースを収集 */
    trace: 'on-first-retry',
    /* スクリーンショット: 失敗時のみ */
    screenshot: 'only-on-failure',
    /* ビデオ: リトライ時のみ */
    video: 'on-first-retry',
    /* タイムアウト設定 */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* テスト対象ブラウザ: E2E は Chromium のみで十分 */
  // projects: [
  //   {
  //     name: 'chromium',
  //     use: { ...devices['Desktop Chrome'] },
  //   },
  // ],

projects: [
  {
    name: 'Microsoft Edge',
    use: { 
      ...devices['Desktop Edge'],
      channel: 'msedge',  // ← これが必須
    },
  },
],

  /* ローカル開発時はサーバーを自動起動しない（手動で起動済みの想定） */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  // },
});
