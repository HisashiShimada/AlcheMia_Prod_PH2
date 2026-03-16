#!/bin/bash
# =============================================================================
# mmdpf デプロイパッケージ作成スクリプト
# =============================================================================
#
# 使い方:
#   chmod +x scripts/package-for-deploy.sh   # 初回のみ
#   ./scripts/package-for-deploy.sh
#
# 前提条件:
#   - dist/mmdpf-backend.tar.gz      (build-and-export.sh で生成済み)
#   - dist/mmdpf-frontend.tar.gz     (build-and-export.sh で生成済み)
#   - dist/mmdpf-schema.sql          (STEP 2.5 で生成済み)
#   - dist/mmdpf-config-data.sql     (STEP 2.5 で生成済み)
#   - .env.deploy                    (環境変数設定済み)
#   - backend/certs/                 (SSL証明書生成済み)
#
# 出力:
#   dist/mmdpf-deploy.tar.gz
#
# =============================================================================

set -euo pipefail

# ─── カラー出力 ───────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── スクリプトのルートディレクトリ（プロジェクトルート）へ移動 ──────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# ─── 出力設定 ─────────────────────────────────────────────────────────────────
OUTPUT_DIR="dist"
PACKAGE_NAME="mmdpf-deploy.tar.gz"
OUTPUT_PATH="${OUTPUT_DIR}/${PACKAGE_NAME}"

# パッケージ内で展開されるルートディレクトリ名
PACKAGE_ROOT="mmdpf"

# 一時作業ディレクトリ
TMP_DIR="$(mktemp -d)"
TMP_PKG="${TMP_DIR}/${PACKAGE_ROOT}"

# スクリプト終了時に一時ディレクトリを削除
trap 'rm -rf "${TMP_DIR}"' EXIT

# =============================================================================
# 前提条件チェック
# =============================================================================

info "前提条件を確認中..."

MISSING=0

check_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "${path}" ]]; then
    warn "見つかりません: ${path}  (${label})"
    MISSING=$((MISSING + 1))
  else
    success "確認: ${path}"
  fi
}

check_dir() {
  local path="$1"
  local label="$2"
  if [[ ! -d "${path}" ]]; then
    warn "ディレクトリが見つかりません: ${path}  (${label})"
    MISSING=$((MISSING + 1))
  else
    success "確認: ${path}/"
  fi
}

check_file "${OUTPUT_DIR}/mmdpf-backend.tar.gz"    "Docker イメージ (backend)"
check_file "${OUTPUT_DIR}/mmdpf-frontend.tar.gz"   "Docker イメージ (frontend)"
check_file "${OUTPUT_DIR}/mmdpf-schema.sql"         "DB スキーマダンプ"
check_file "${OUTPUT_DIR}/mmdpf-config-data.sql"    "設定データダンプ"
check_file ".env.deploy"                            "環境変数ファイル"
check_file "docker-compose.prod.yml"               "Docker Compose ファイル"
check_dir  "config/nginx"                           "nginx 設定ディレクトリ"
check_dir  "backend/certs/ca"                       "CA 証明書ディレクトリ"
check_dir  "backend/certs/server"                   "サーバー証明書ディレクトリ"
check_dir  "backend/migrations"                     "マイグレーション SQL ディレクトリ"

if [[ ${MISSING} -gt 0 ]]; then
  error "${MISSING} 件のファイル/ディレクトリが見つかりません。上記を確認してから再実行してください。"
fi

echo ""
info "全ての前提条件を確認しました。パッケージを作成します..."
echo ""

# =============================================================================
# パッケージ内のディレクトリ構造を構築
# =============================================================================

info "ディレクトリ構造を構築中..."

mkdir -p "${TMP_PKG}"
mkdir -p "${TMP_PKG}/config/nginx"
mkdir -p "${TMP_PKG}/backend/certs/ca"
mkdir -p "${TMP_PKG}/backend/certs/server"
mkdir -p "${TMP_PKG}/backend/migrations"

# ① docker-compose.prod.yml
cp docker-compose.prod.yml "${TMP_PKG}/docker-compose.prod.yml"
success "コピー: docker-compose.prod.yml"

# ② .env.deploy → .env にリネーム
cp .env.deploy "${TMP_PKG}/.env"
success "コピー: .env.deploy → .env"

# ③ Docker イメージ (backend / frontend)
cp "${OUTPUT_DIR}/mmdpf-backend.tar.gz"  "${TMP_PKG}/mmdpf-backend.tar.gz"
cp "${OUTPUT_DIR}/mmdpf-frontend.tar.gz" "${TMP_PKG}/mmdpf-frontend.tar.gz"
success "コピー: mmdpf-backend.tar.gz, mmdpf-frontend.tar.gz"

# ④ DB ダンプファイル
cp "${OUTPUT_DIR}/mmdpf-schema.sql"      "${TMP_PKG}/mmdpf-schema.sql"
cp "${OUTPUT_DIR}/mmdpf-config-data.sql" "${TMP_PKG}/mmdpf-config-data.sql"
success "コピー: mmdpf-schema.sql, mmdpf-config-data.sql"

# ⑤ nginx 設定
cp -r config/nginx/. "${TMP_PKG}/config/nginx/"
success "コピー: config/nginx/"

# ⑥ SSL 証明書
cp -r backend/certs/ca/.     "${TMP_PKG}/backend/certs/ca/"
cp -r backend/certs/server/. "${TMP_PKG}/backend/certs/server/"
success "コピー: backend/certs/"

# ⑦ マイグレーション SQL（ロールバック用は除外）
cp backend/migrations/*.sql "${TMP_PKG}/backend/migrations/" 2>/dev/null || true
success "コピー: backend/migrations/*.sql"

# =============================================================================
# tar.gz に圧縮
# =============================================================================

echo ""
info "圧縮中: ${OUTPUT_PATH} ..."

mkdir -p "${OUTPUT_DIR}"
tar -czf "${OUTPUT_PATH}" -C "${TMP_DIR}" "${PACKAGE_ROOT}"

echo ""
success "パッケージを作成しました: ${OUTPUT_PATH}"
echo ""

# =============================================================================
# 内容確認
# =============================================================================

info "パッケージ内容:"
tar -tzf "${OUTPUT_PATH}" | sed 's/^/  /'

echo ""
info "ファイルサイズ:"
ls -lh "${OUTPUT_PATH}"

echo ""
echo "============================================================"
echo -e "${GREEN}✅ デプロイパッケージの作成が完了しました${NC}"
echo ""
echo "  転送コマンド例:"
echo "    scp ${OUTPUT_PATH} user@target-server-ip:~/"
echo ""
echo "  サーバでの展開コマンド:"
echo "    tar -xzf ${PACKAGE_NAME} -C ~/"
echo "    # ~/mmdpf/ に展開されます"
echo "============================================================"
