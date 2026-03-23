/**
 * E2Eテスト実行ラッパースクリプト（UI モード）
 *
 * 使用方法:
 *   全featureファイルをテスト（UI モード）:
 *     node tests/e2e/scripts/run-e2e-ui.js
 *
 *   特定のfeatureファイルのみテスト（UI モード）:
 *     node tests/e2e/scripts/run-e2e-ui.js 5-1_project_selection.feature
 *
 * npm経由の場合:
 *   npm run test:ui
 *   npm run test:ui -- 5-1_project_selection.feature
 */

const { execSync } = require('child_process');

const featureFile = process.argv[2]; // コマンドライン引数（featureファイル名）

if (featureFile) {
  process.env.FEATURE_FILE = featureFile;
  console.log(`[run-e2e-ui] 対象featureファイル: ${featureFile}`);
} else {
  console.log('[run-e2e-ui] 全featureファイルをテスト対象にします');
}

const config = '--config tests/e2e/playwright.config.ts';

try {
  console.log('[run-e2e-ui] bddgen を実行中...');
  execSync(`npx bddgen ${config}`, { stdio: 'inherit' });

  console.log('[run-e2e-ui] playwright test (UI モード) を実行中...');
  execSync(`npx playwright test ${config} --ui`, { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
