#!/usr/bin/env node
/**
 * mmdpf ビルドスクリプト
 *
 * npm run build で実行される。
 * 以下を順番に実行し、オンプレデプロイに必要な全ファイルを dist/ に生成する。
 *
 * 1. dist/ をクリーン
 * 2. docker compose build でイメージをビルド
 * 3. docker save で BE/FE の tar ファイルを生成
 * 4. デプロイに必要な設定ファイルをコピー
 * 5. サーバー上で実行する deploy.sh を生成
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// 設定
// =============================================================================
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const COMPOSE_FILE = 'docker-compose.prod.yml';

// イメージ名（docker-compose.prod.yml の image: に対応）
const BACKEND_IMAGE = 'mmdpf-backend:latest';
const FRONTEND_IMAGE = 'mmdpf-frontend:latest';

// =============================================================================
// Docker Context を強制的にローカル（default）に設定
// リモートContextが設定されている場合でもローカルビルドを行う
// =============================================================================
process.env.DOCKER_CONTEXT = 'default';

// =============================================================================
// ユーティリティ
// =============================================================================
const log = (msg) => console.log(`[BUILD] ${msg}`);
const ok  = (msg) => console.log(`[BUILD] ✅ ${msg}`);
const warn = (msg) => console.log(`[BUILD] ⚠️  ${msg}`);
const err  = (msg) => console.error(`[BUILD] ❌ ${msg}`);

/** コマンドを実行（失敗したら例外を投げる） */
function run(cmd, options = {}) {
  log(`実行: ${cmd}`);
  execSync(cmd, {
    shell: true,
    stdio: [process.stdin, process.stdout, process.stderr],
    cwd: ROOT_DIR,
    ...options,
  });
}

/** ファイルをコピー（ディレクトリが存在しない場合は作成する） */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

/** ディレクトリを再帰的にコピー */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** ファイルサイズを人間が読みやすい形式に変換 */
function formatSize(filePath) {
  try {
    const bytes = fs.statSync(filePath).size;
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  } catch {
    return '?';
  }
}

// =============================================================================
// メイン処理
// =============================================================================
async function main() {
  console.log('');
  console.log('=============================================================');
  console.log(' mmdpf ビルド開始');
  console.log('=============================================================');
  console.log('');

  // ---------------------------------------------------------------------------
  // Step 1: dist/ をクリーン
  // ---------------------------------------------------------------------------
  log('--- Step 1: dist/ をクリーン ---');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    log('既存の dist/ を削除しました');
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  ok('dist/ ディレクトリを作成しました');

  // ---------------------------------------------------------------------------
  // Step 2: Docker イメージをビルド
  // ---------------------------------------------------------------------------
  log('--- Step 2: Docker イメージをビルド ---');
  run(`docker compose -f ${COMPOSE_FILE} build`);
  ok('Docker イメージのビルドが完了しました');

  // ---------------------------------------------------------------------------
  // Step 3: tar ファイルを生成
  // ---------------------------------------------------------------------------
  log('--- Step 3: tar ファイルを生成 ---');

  const backendTar  = path.join(DIST_DIR, 'mmdpf-backend.tar');
  const frontendTar = path.join(DIST_DIR, 'mmdpf-frontend.tar');

  log('backend イメージを書き出し中...');
  run(`docker save ${BACKEND_IMAGE} -o "${backendTar}"`);
  ok(`mmdpf-backend.tar (${formatSize(backendTar)})`);

  log('frontend イメージを書き出し中...');
  run(`docker save ${FRONTEND_IMAGE} -o "${frontendTar}"`);
  ok(`mmdpf-frontend.tar (${formatSize(frontendTar)})`);

  // ---------------------------------------------------------------------------
  // Step 4: 設定ファイルをコピー
  // ---------------------------------------------------------------------------
  log('--- Step 4: 設定ファイルをコピー ---');

  // docker-compose.prod.yml
  copyFile(
    path.join(ROOT_DIR, 'docker-compose.prod.yml'),
    path.join(DIST_DIR, 'docker-compose.prod.yml')
  );
  ok('docker-compose.prod.yml');

  // .env テンプレート（オンプレ用）
  copyFile(
    path.join(ROOT_DIR, '.env.prod.onprem.example'),
    path.join(DIST_DIR, '.env.prod.onprem.example')
  );
  ok('.env.prod.onprem.example');

  // nginx 設定
  copyFile(
    path.join(ROOT_DIR, 'config', 'nginx', 'nginx.prod.conf'),
    path.join(DIST_DIR, 'config', 'nginx', 'nginx.prod.conf')
  );
  ok('config/nginx/nginx.prod.conf');

  // 証明書ディレクトリ（実際の証明書はデプロイ先で配置するため空ディレクトリのみ作成）
  const certsDir = path.join(DIST_DIR, 'backend', 'certs');
  fs.mkdirSync(path.join(certsDir, 'ca'),     { recursive: true });
  fs.mkdirSync(path.join(certsDir, 'server'), { recursive: true });

  // .gitkeep を置いてディレクトリが消えないようにする
  fs.writeFileSync(path.join(certsDir, 'ca',     '.gitkeep'), '');
  fs.writeFileSync(path.join(certsDir, 'server', '.gitkeep'), '');
  ok('backend/certs/ca/ および backend/certs/server/ (空ディレクトリ)');

  // migrations ディレクトリ
  const migrationsDir = path.join(ROOT_DIR, 'backend', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    copyDir(migrationsDir, path.join(DIST_DIR, 'backend', 'migrations'));
    ok('backend/migrations/');
  }

  // ---------------------------------------------------------------------------
  // Step 5: deploy.sh を生成
  // ---------------------------------------------------------------------------
  log('--- Step 5: deploy.sh を生成 ---');

  const deployScript = `#!/bin/bash
# =============================================================================
# mmdpf オンプレ環境 デプロイスクリプト（配布用）
# =============================================================================
#
# 使い方:
#   1. このディレクトリ（dist/）の内容をサーバーに転送してください
#   2. .env.prod.onprem.example を .env にコピーして編集してください
#   3. backend/certs/ca/   に ca.crt を配置してください
#      backend/certs/server/ に server.crt と server.key を配置してください
#   4. このスクリプトを実行してください
#
#   chmod +x deploy.sh
#   ./deploy.sh
#
# オプション:
#   --no-migrate  DBマイグレーションをスキップ
# =============================================================================

set -euo pipefail

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="\${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="\${SCRIPT_DIR}/.env"
MIGRATE=true

# 引数解析
while [[ \$# -gt 0 ]]; do
  case \$1 in
    --no-migrate) MIGRATE=false; shift ;;
    *) echo "不明なオプション: \$1"; exit 1 ;;
  esac
done

echo ""
echo "============================================================="
echo " mmdpf オンプレ環境 デプロイ開始"
echo "============================================================="

# 前提条件チェック
if ! command -v docker &>/dev/null; then
  echo "❌ Docker がインストールされていません"
  exit 1
fi

if [[ ! -f "\${ENV_FILE}" ]]; then
  echo "❌ .env ファイルが見つかりません"
  echo "   cp .env.prod.onprem.example .env"
  echo "   vi .env  # 各値を環境に合わせて編集してください"
  exit 1
fi

# Docker イメージのロード
echo "[1/5] Docker イメージをロード中..."
docker load -i "\${SCRIPT_DIR}/mmdpf-backend.tar"
docker load -i "\${SCRIPT_DIR}/mmdpf-frontend.tar"
echo "✅ Docker イメージのロード完了"

# 既存コンテナの停止
echo "[2/5] 既存コンテナを停止中..."
if docker compose -f "\${COMPOSE_FILE}" --profile onprem ps --quiet 2>/dev/null | grep -q .; then
  docker compose -f "\${COMPOSE_FILE}" --profile onprem down --remove-orphans
fi
echo "✅ 既存コンテナの停止完了"

# インフラサービス起動
echo "[3/5] インフラサービス (PostgreSQL / Redis / Swift) を起動中..."
docker compose -f "\${COMPOSE_FILE}" --profile onprem up -d postgres redis swift

# PostgreSQL 起動待ち
source "\${ENV_FILE}"
echo -n "PostgreSQL 起動待ち"
for i in \$(seq 1 30); do
  if docker compose -f "\${COMPOSE_FILE}" exec -T postgres pg_isready -U "\${DB_USER:-mmdpf_user}" &>/dev/null; then
    break
  fi
  echo -n "."
  sleep 1
done
echo ""
echo "✅ インフラサービス起動完了"

# DBマイグレーション
if [[ "\${MIGRATE}" == "true" ]]; then
  echo "[4/5] DBマイグレーションを実行中..."
  docker compose -f "\${COMPOSE_FILE}" run --rm backend npm run migrate
  echo "✅ DBマイグレーション完了"
else
  echo "[4/5] DBマイグレーションをスキップ"
fi

# アプリケーション起動
echo "[5/5] アプリケーションを起動中..."
docker compose -f "\${COMPOSE_FILE}" --profile onprem up -d
echo "✅ アプリケーション起動完了"

echo ""
echo "============================================================="
echo " デプロイ完了！"
echo "============================================================="
echo ""
echo "  アクセスURL: https://localhost/"
echo ""
echo "  コンテナ確認:"
echo "    docker compose -f docker-compose.prod.yml --profile onprem ps"
echo ""
echo "  ログ確認:"
echo "    docker compose -f docker-compose.prod.yml --profile onprem logs -f"
echo ""
`;

  const deployScriptPath = path.join(DIST_DIR, 'deploy.sh');
  fs.writeFileSync(deployScriptPath, deployScript, { mode: 0o755 });
  ok('deploy.sh');

  // ---------------------------------------------------------------------------
  // 完了
  // ---------------------------------------------------------------------------
  console.log('');
  console.log('=============================================================');
  console.log(' ✅ ビルド完了！');
  console.log('=============================================================');
  console.log('');
  console.log('dist/ の内容:');

  function listDir(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        console.log(`${prefix}📁 ${entry.name}/`);
        listDir(filePath, prefix + '   ');
      } else {
        const size = formatSize(filePath);
        console.log(`${prefix}📄 ${entry.name}  (${size})`);
      }
    }
  }
  listDir(DIST_DIR, '  ');

  console.log('');
  console.log('オンプレへのデプロイ手順:');
  console.log('  1. dist/ の内容をサーバーに転送:');
  console.log('     rsync -avz dist/ user@your-server:/opt/mmdpf/');
  console.log('');
  console.log('  2. サーバー上で .env を作成:');
  console.log('     cp .env.prod.onprem.example .env && vi .env');
  console.log('');
  console.log('  3. SSL証明書を配置:');
  console.log('     backend/certs/ca/server.crt');
  console.log('     backend/certs/server/server.crt');
  console.log('     backend/certs/server/server.key');
  console.log('');
  console.log('  4. デプロイスクリプトを実行:');
  console.log('     chmod +x deploy.sh && ./deploy.sh');
  console.log('');
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
