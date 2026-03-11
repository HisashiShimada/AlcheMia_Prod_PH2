/**
 * E2Eテスト実行ラッパースクリプト
 *
 * 使用方法:
 *   全featureファイルをテスト:
 *     node tests/e2e/scripts/run-e2e.js
 *
 *   特定のfeatureファイルのみテスト:
 *     node tests/e2e/scripts/run-e2e.js 5-1_project_selection.feature
 *
 * npm経由の場合:
 *   npm run test
 *   npm run test -- 5-1_project_selection.feature
 */

const { execSync } = require('child_process');

const featureFile = process.argv[2]; // コマンドライン引数（featureファイル名）

if (featureFile) {
  process.env.FEATURE_FILE = featureFile;
  console.log(`[run-e2e] 対象featureファイル: ${featureFile}`);
} else {
  console.log('[run-e2e] 全featureファイルをテスト対象にします');
}

const config = '--config tests/e2e/playwright.config.ts';

try {
  console.log('[run-e2e] bddgen を実行中...');
  execSync(`npx bddgen ${config}`, { stdio: 'inherit' });

  console.log('[run-e2e] playwright test を実行中...');
  execSync(`npx playwright test ${config} --headed`, { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
