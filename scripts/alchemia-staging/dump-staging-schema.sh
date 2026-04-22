#!/usr/bin/env bash
# =============================================================================
# dump-staging-schema.sh
# 検証環境（AWS Aurora）のスキーマを SSH 踏み台経由でダンプするスクリプト
#
# 使い方:
#   bash scripts/dump-staging-schema.sh [--key <秘密鍵ファイルパス>]
#
# オプション:
#   --key <path>   SSH 秘密鍵ファイルのパス
#                  省略時は /path/to/alchemia_staging_stepping.pem を使用
#
# 前提条件:
#   - pg_dump がインストールされていること
#   - ssh コマンドが利用可能なこと
#   - 指定した秘密鍵ファイルが存在し、パーミッションが 600 であること
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# デフォルト設定
# ---------------------------------------------------------------------------
DEFAULT_SSH_KEY="/path/to/alchemia_staging_stepping.pem"

# SSH 踏み台サーバー
BASTION_HOST="ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com"
BASTION_PORT="22"
BASTION_USER="ec2-user"

# Aurora (検証環境)
AURORA_HOST="alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com"
AURORA_PORT="5432"
DB_NAME="maiml_db"
DB_USER="maiml_user"
DB_PASSWORD="maiml_user"

# ローカルのポートフォワード用一時ポート（既存のポートと衝突しないよう設定）
LOCAL_PORT="15432"

# ---------------------------------------------------------------------------
# パス設定
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/docs/deliverables"

# ---------------------------------------------------------------------------
# 引数解析
# ---------------------------------------------------------------------------
SSH_KEY="${DEFAULT_SSH_KEY}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)
      SSH_KEY="$2"
      shift 2
      ;;
    *)
      echo "❌ 不明なオプション: $1"
      echo "使い方: bash scripts/dump-staging-schema.sh [--key <秘密鍵ファイルパス>]"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# 秘密鍵ファイルの存在確認
# ---------------------------------------------------------------------------
if [[ ! -f "${SSH_KEY}" ]]; then
  echo "❌ エラー: 秘密鍵ファイルが見つかりません: ${SSH_KEY}"
  echo "   --key オプションで正しいパスを指定してください"
  echo "   例: bash scripts/dump-staging-schema.sh --key ~/.ssh/your_key.pem"
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
# ローカルポートの使用状況確認
# ---------------------------------------------------------------------------
if ss -tln 2>/dev/null | grep -q ":${LOCAL_PORT} " || \
   netstat -tln 2>/dev/null | grep -q ":${LOCAL_PORT} "; then
  echo "❌ エラー: ローカルポート ${LOCAL_PORT} が既に使用中です"
  echo "   他のプロセスを停止してから再実行してください"
  exit 1
fi

# ---------------------------------------------------------------------------
# 出力ファイルの準備
# ---------------------------------------------------------------------------
mkdir -p "${OUTPUT_DIR}"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
OUTPUT_FILE="${OUTPUT_DIR}/schema_dump_staging_${TIMESTAMP}.sql"

# ---------------------------------------------------------------------------
# SSH ポートフォワードの開始
# ---------------------------------------------------------------------------
SSH_CTRL_SOCK="/tmp/ssh_dump_staging_$$.sock"
SSH_PID=""

cleanup() {
  if [[ -n "${SSH_PID}" ]]; then
    echo ""
    echo "🔌 SSH ポートフォワードを終了しています..."
    ssh -S "${SSH_CTRL_SOCK}" -O exit "${BASTION_USER}@${BASTION_HOST}" 2>/dev/null || true
    # ソケットファイルを削除
    rm -f "${SSH_CTRL_SOCK}"
    echo "   SSH ポートフォワード終了"
  fi
}

# スクリプト終了時（正常・異常問わず）にクリーンアップ
trap cleanup EXIT

echo "=============================================="
echo " 検証環境 スキーマダンプ開始"
echo "=============================================="
echo "  踏み台     : ${BASTION_USER}@${BASTION_HOST}:${BASTION_PORT}"
echo "  Aurora     : ${AURORA_HOST}:${AURORA_PORT}"
echo "  データベース: ${DB_NAME}"
echo "  ユーザー   : ${DB_USER}"
echo "  ローカルポート: ${LOCAL_PORT} → Aurora:${AURORA_PORT}"
echo "  出力先     : ${OUTPUT_FILE}"
echo "  秘密鍵     : ${SSH_KEY}"
echo "----------------------------------------------"

echo ""
echo "🔗 SSH ポートフォワードを開始しています..."

ssh \
  -i "${SSH_KEY}" \
  -M -S "${SSH_CTRL_SOCK}" \
  -fNT \
  -L "${LOCAL_PORT}:${AURORA_HOST}:${AURORA_PORT}" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=15 \
  -o ServerAliveInterval=30 \
  -p "${BASTION_PORT}" \
  "${BASTION_USER}@${BASTION_HOST}"

# SSH プロセスの PID を記録（終了処理用）
SSH_PID="active"

# ポートフォワードが確立するまで少し待機
sleep 2

echo "   SSH ポートフォワード確立: localhost:${LOCAL_PORT} → ${AURORA_HOST}:${AURORA_PORT}"

# ---------------------------------------------------------------------------
# スキーマダンプ実行
# ---------------------------------------------------------------------------
echo ""
echo "📦 スキーマダンプを実行しています..."

PGPASSWORD="${DB_PASSWORD}" PGSSLMODE="require" "${PG_DUMP_CMD}" \
  --host="127.0.0.1" \
  --port="${LOCAL_PORT}" \
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
