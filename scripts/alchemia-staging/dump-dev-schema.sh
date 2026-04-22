#!/usr/bin/env bash
# =============================================================================
# dump-dev-schema.sh
# 開発環境（ローカル）の PostgreSQL スキーマをダンプするスクリプト
#
# 使い方:
#   bash scripts/dump-dev-schema.sh
#
# 前提条件:
#   - pg_dump がインストールされていること
#   - backend/.env に DB 接続情報が設定されていること
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# パス設定
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/backend/.env"
OUTPUT_DIR="${PROJECT_ROOT}/docs/deliverables"

# ---------------------------------------------------------------------------
# .env ファイルの存在確認
# ---------------------------------------------------------------------------
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ エラー: .env ファイルが見つかりません: ${ENV_FILE}"
  exit 1
fi

# ---------------------------------------------------------------------------
# .env から DB 接続情報を読み込む
# ---------------------------------------------------------------------------
# CRLF・コメント行・空行を安全にスキップしながら KEY=VALUE を export
while IFS= read -r line; do
  # CR (Windows 改行) を除去
  line="${line%$'\r'}"
  # 空行・コメント行をスキップ
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # KEY=VALUE 形式の行のみ export
  if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
    export "$line"
  fi
done < "${ENV_FILE}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

# ---------------------------------------------------------------------------
# 必須項目チェック
# ---------------------------------------------------------------------------
if [[ -z "${DB_NAME}" ]]; then
  echo "❌ エラー: DB_NAME が .env に設定されていません"
  exit 1
fi
if [[ -z "${DB_USER}" ]]; then
  echo "❌ エラー: DB_USER が .env に設定されていません"
  exit 1
fi
if [[ -z "${DB_PASSWORD}" ]]; then
  echo "❌ エラー: DB_PASSWORD が .env に設定されていません"
  exit 1
fi

# ---------------------------------------------------------------------------
# pg_dump の存在確認（v18 優先、なければ PATH 上の pg_dump を使用）
# ---------------------------------------------------------------------------
PG_DUMP_CMD="/usr/lib/postgresql/18/bin/pg_dump"
if [[ ! -x "${PG_DUMP_CMD}" ]]; then
  PG_DUMP_CMD="$(command -v pg_dump 2>/dev/null || true)"
fi
if [[ -z "${PG_DUMP_CMD}" ]]; then
  echo "❌ エラー: pg_dump が見つかりません"
  echo "   sudo apt-get install -y postgresql-client-18 を実行してください"
  exit 1
fi
echo "   pg_dump: ${PG_DUMP_CMD} ($(${PG_DUMP_CMD} --version))"

# ---------------------------------------------------------------------------
# 出力ファイルの準備
# ---------------------------------------------------------------------------
mkdir -p "${OUTPUT_DIR}"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
OUTPUT_FILE="${OUTPUT_DIR}/schema_dump_dev_${TIMESTAMP}.sql"

# ---------------------------------------------------------------------------
# スキーマダンプ実行
# ---------------------------------------------------------------------------
echo "=============================================="
echo " 開発環境 スキーマダンプ開始"
echo "=============================================="
echo "  ホスト     : ${DB_HOST}:${DB_PORT}"
echo "  データベース: ${DB_NAME}"
echo "  ユーザー   : ${DB_USER}"
echo "  出力先     : ${OUTPUT_FILE}"
echo "----------------------------------------------"

PGPASSWORD="${DB_PASSWORD}" "${PG_DUMP_CMD}" \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-acl \
  --file="${OUTPUT_FILE}"

echo ""
echo "✅ スキーマダンプ完了: ${OUTPUT_FILE}"
echo "   ファイルサイズ: $(du -h "${OUTPUT_FILE}" | cut -f1)"
