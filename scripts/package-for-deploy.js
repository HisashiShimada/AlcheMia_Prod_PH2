#!/usr/bin/env node
// =============================================================================
// mmdpf デプロイパッケージ作成スクリプト (Node.js版)
// =============================================================================
//
// 使い方:
//   npm run package
//
// 前提条件:
//   - dist/mmdpf-backend.tar.gz      (npm run export で生成済み)
//   - dist/mmdpf-frontend.tar.gz     (npm run export で生成済み)
//   - dist/mmdpf-schema.sql          (STEP 2.5 で生成済み)
//   - dist/mmdpf-config-data.sql     (STEP 2.5 で生成済み)
//   - .env.deploy                    (環境変数設定済み)
//   - backend/certs/                 (SSL証明書生成済み)
//
// 出力:
//   dist/mmdpf-deploy.tar.gz
//
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── カラー出力 ───────────────────────────────────────────────────────────────
const BLUE   = '\x1b[34m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const RESET  = '\x1b[0m';

const info    = (...args) => console.log(`${BLUE}[INFO]${RESET}`, ...args);
const success = (...args) => console.log(`${GREEN}[OK]${RESET}`, ...args);
const warn    = (...args) => console.log(`${YELLOW}[WARN]${RESET}`, ...args);
const error   = (...args) => { console.error(`${RED}[ERROR]${RESET}`, ...args); process.exit(1); };

// ─── プロジェクトルートへ移動 ─────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '..');
process.chdir(PROJECT_ROOT);

// ─── 出力設定 ─────────────────────────────────────────────────────────────────
const OUTPUT_DIR   = 'dist';
const PACKAGE_NAME = 'mmdpf-deploy.tar.gz';
const OUTPUT_PATH  = path.join(OUTPUT_DIR, PACKAGE_NAME);

// パッケージ内で展開されるルートディレクトリ名
const PACKAGE_ROOT_DIR = 'mmdpf';

// 一時作業ディレクトリ
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdpf-pkg-'));
const TMP_PKG = path.join(TMP_DIR, PACKAGE_ROOT_DIR);

// プロセス終了時に一時ディレクトリを削除
const cleanup = () => {
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (_) { /* ignore */ }
};
process.on('exit', cleanup);
process.on('SIGINT',  () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * ディレクトリを再帰的に作成する
 */
function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * ファイルをコピーする（親ディレクトリを自動作成）
 */
function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * ディレクトリを再帰的にコピーする
 */
function copyDir(src, dest) {
  mkdirp(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * ディレクトリ内のファイル一覧を取得する（1階層のみ）
 */
function listFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .map(name => path.join(dirPath, name))
    .filter(p => fs.statSync(p).isFile());
}

// =============================================================================
// 前提条件チェック
// =============================================================================

info('前提条件を確認中...');

let missing = 0;

const checkFile = (filePath, label) => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    warn(`見つかりません: ${filePath}  (${label})`);
    missing++;
  } else {
    success(`確認: ${filePath}`);
  }
};

const checkDir = (dirPath, label) => {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    warn(`ディレクトリが見つかりません: ${dirPath}  (${label})`);
    missing++;
  } else {
    success(`確認: ${dirPath}/`);
  }
};

checkFile(`${OUTPUT_DIR}/mmdpf-backend.tar.gz`,   'Docker イメージ (backend)');
checkFile(`${OUTPUT_DIR}/mmdpf-frontend.tar.gz`,  'Docker イメージ (frontend)');
checkFile(`${OUTPUT_DIR}/mmdpf-schema.sql`,        'DB スキーマダンプ');
checkFile(`${OUTPUT_DIR}/mmdpf-config-data.sql`,   '設定データダンプ');
checkFile('.env.deploy',                           '環境変数ファイル');
checkFile('docker-compose.prod.yml',              'Docker Compose ファイル');
checkDir ('config/nginx',                          'nginx 設定ディレクトリ');
checkDir ('backend/certs/ca',                      'CA 証明書ディレクトリ');
checkDir ('backend/certs/server',                  'サーバー証明書ディレクトリ');
checkDir ('backend/migrations',                    'マイグレーション SQL ディレクトリ');

if (missing > 0) {
  error(`${missing} 件のファイル/ディレクトリが見つかりません。上記を確認してから再実行してください。`);
}

console.log('');
info('全ての前提条件を確認しました。パッケージを作成します...');
console.log('');

// =============================================================================
// パッケージ内のディレクトリ構造を構築
// =============================================================================

info('ディレクトリ構造を構築中...');

mkdirp(path.join(TMP_PKG, 'scripts'));
mkdirp(path.join(TMP_PKG, 'config', 'nginx'));
mkdirp(path.join(TMP_PKG, 'backend', 'certs', 'ca'));
mkdirp(path.join(TMP_PKG, 'backend', 'certs', 'server'));
mkdirp(path.join(TMP_PKG, 'backend', 'migrations'));

// ① docker-compose.prod.yml
copyFile('docker-compose.prod.yml', path.join(TMP_PKG, 'docker-compose.prod.yml'));
success('コピー: docker-compose.prod.yml');

// ② .env.deploy → .env にリネーム
copyFile('.env.deploy', path.join(TMP_PKG, '.env'));
success('コピー: .env.deploy → .env');

// ③ Docker イメージ (backend / frontend)
copyFile(`${OUTPUT_DIR}/mmdpf-backend.tar.gz`,  path.join(TMP_PKG, 'mmdpf-backend.tar.gz'));
copyFile(`${OUTPUT_DIR}/mmdpf-frontend.tar.gz`, path.join(TMP_PKG, 'mmdpf-frontend.tar.gz'));
success('コピー: mmdpf-backend.tar.gz, mmdpf-frontend.tar.gz');

// ④ DB ダンプファイル
copyFile(`${OUTPUT_DIR}/mmdpf-schema.sql`,      path.join(TMP_PKG, 'mmdpf-schema.sql'));
copyFile(`${OUTPUT_DIR}/mmdpf-config-data.sql`, path.join(TMP_PKG, 'mmdpf-config-data.sql'));
success('コピー: mmdpf-schema.sql, mmdpf-config-data.sql');

// ⑤ nginx 設定
copyDir('config/nginx', path.join(TMP_PKG, 'config', 'nginx'));
success('コピー: config/nginx/');

// ⑥ SSL 証明書
copyDir('backend/certs/ca',     path.join(TMP_PKG, 'backend', 'certs', 'ca'));
copyDir('backend/certs/server', path.join(TMP_PKG, 'backend', 'certs', 'server'));
success('コピー: backend/certs/');

// ⑦ マイグレーション SQL（ロールバック用は除外）
const migrationFiles = listFiles('backend/migrations')
  .filter(f => f.endsWith('.sql') && !path.basename(f).includes('rollback'));
for (const srcFile of migrationFiles) {
  copyFile(srcFile, path.join(TMP_PKG, 'backend', 'migrations', path.basename(srcFile)));
}
success('コピー: backend/migrations/*.sql');

// ⑧ 起動スクリプト
copyFile('scripts/start-onprem.sh', path.join(TMP_PKG, 'scripts', 'start-onprem.sh'));
success('コピー: scripts/start-onprem.sh');

// =============================================================================
// tar.gz に圧縮
// =============================================================================

console.log('');
info(`圧縮中: ${OUTPUT_PATH} ...`);

mkdirp(OUTPUT_DIR);
execSync(`tar -czf "${path.resolve(OUTPUT_PATH)}" -C "${TMP_DIR}" "${PACKAGE_ROOT_DIR}"`, {
  stdio: 'inherit',
});

console.log('');
success(`パッケージを作成しました: ${OUTPUT_PATH}`);
console.log('');

// =============================================================================
// 内容確認
// =============================================================================

info('パッケージ内容:');
const contents = execSync(`tar -tzf "${OUTPUT_PATH}"`).toString().trim().split('\n');
contents.forEach(line => console.log('  ' + line));

console.log('');
info('ファイルサイズ:');
const stat = fs.statSync(OUTPUT_PATH);
const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
console.log(`  ${OUTPUT_PATH}  ${sizeMB} MB`);

console.log('');
console.log('============================================================');
console.log(`${GREEN}✅ デプロイパッケージの作成が完了しました${RESET}`);
console.log('');
console.log('  転送コマンド例:');
console.log(`    scp ${OUTPUT_PATH} user@target-server-ip:~/`);
console.log('');
console.log('  サーバでの展開コマンド:');
console.log(`    tar -xzf ${PACKAGE_NAME} -C ~/`);
console.log('    # ~/mmdpf/ に展開されます');
console.log('============================================================');
