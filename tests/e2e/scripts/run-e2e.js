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
 *   タグで絞り込み:
 *     node tests/e2e/scripts/run-e2e.js @3-1-1
 *
 *   featureファイル + タグで絞り込み:
 *     node tests/e2e/scripts/run-e2e.js 3_data_management.feature @3-1-1
 *
 * npm経由の場合:
 *   npm run test
 *   npm run test -- 5-1_project_selection.feature
 *   npm run test -- @3-1-1
 *   npm run test -- 3_data_management.feature @3-1-1
 */

const { execSync } = require('child_process');

let featureFile = undefined;
let grepPattern = undefined;

// 引数を解析: @で始まる場合はタグ（grep）、それ以外はfeatureファイル名
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('@')) {
    grepPattern = arg;
  } else {
    featureFile = arg;
  }
});

if (featureFile) {
  process.env.FEATURE_FILE = featureFile;
  console.log(`[run-e2e] 対象featureファイル: ${featureFile}`);
} else {
  console.log('[run-e2e] 全featureファイルをテスト対象にします');
}

if (grepPattern) {
  console.log(`[run-e2e] タグフィルター: ${grepPattern}`);
}

const config = '--config tests/e2e/playwright.config.ts';
const grepOption = grepPattern ? `--grep "${grepPattern}"` : '';

try {
  console.log('[run-e2e] bddgen を実行中...');
  execSync(`npx bddgen ${config}`, { stdio: 'inherit' });

  console.log('[run-e2e] playwright test を実行中...');
  execSync(`npx playwright test ${config} --headed --pass-with-no-tests ${grepOption}`, { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
