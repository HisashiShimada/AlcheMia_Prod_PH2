import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * playwright-bdd の設定
 * features/ 配下の .feature ファイルと steps/ 配下のステップ定義を紐付ける
 */
const testDir = defineBddConfig({
  features: 'features/provider/*.feature',
  steps: 'steps/provider/*.ts',
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
