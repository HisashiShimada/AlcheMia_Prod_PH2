#!/bin/bash
# =============================================================================
# mmdpf オンプレミス 起動スクリプト
#
# 使い方:
#   bash scripts/deploy-onprem/start-onprem.sh
#
# 処理内容:
#   1. Dockerイメージのロード（mmdpf-backend.tar.gz / mmdpf-frontend.tar.gz）
#   2. ログディレクトリの作成（./logs/）
#   3. インフラサービスの起動（postgres / redis / swift）
#
# 実行場所:
#   ~/mmdpf/ ディレクトリ（docker-compose.prod.yml と同じ階層）
# =============================================================================

set -euo pipefail

# スクリプトのディレクトリから ~/mmdpf ディレクトリを解決
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MMDPF_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== mmdpf オンプレ起動スクリプト ==="
echo "作業ディレクトリ: $MMDPF_DIR"
echo ""

cd "$MMDPF_DIR"

# -----------------------------------------------------------------------------
# 前提ファイルの確認
# -----------------------------------------------------------------------------
echo "🔍 前提ファイルを確認中..."

MISSING=0
for f in mmdpf-backend.tar.gz mmdpf-frontend.tar.gz docker-compose.prod.yml .env; do
  if [ ! -f "$MMDPF_DIR/$f" ]; then
    echo "  ❌ 見つかりません: $MMDPF_DIR/$f"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "エラー: 必要なファイルが $MISSING 個見つかりません。"
  echo "STEP 4 の手順に従ってファイルを展開してから再実行してください。"
  exit 1
fi

echo "  ✅ 必要なファイルがすべて揃っています"
echo ""

# -----------------------------------------------------------------------------
# 1. Dockerイメージのロード
# -----------------------------------------------------------------------------
echo "📦 [1/3] Dockerイメージをロード中..."

echo "  → mmdpf-backend.tar.gz をロード中..."
docker load < mmdpf-backend.tar.gz
# 出力例: Loaded image: mmdpf-backend:latest

echo "  → mmdpf-frontend.tar.gz をロード中..."
docker load < mmdpf-frontend.tar.gz
# 出力例: Loaded image: mmdpf-frontend:latest

echo ""
echo "  ロード済みイメージ:"
docker images | grep mmdpf || true
echo ""

# -----------------------------------------------------------------------------
# 2. ログディレクトリの作成
# -----------------------------------------------------------------------------
echo "📁 [2/3] ログディレクトリを作成中..."
mkdir -p "$MMDPF_DIR/logs"
echo "  ✅ ログディレクトリ: $MMDPF_DIR/logs"
echo ""

# -----------------------------------------------------------------------------
# 3. インフラサービスの起動
# -----------------------------------------------------------------------------
echo "🚀 [3/3] インフラサービス（postgres / redis / swift）を起動中..."
docker compose -f docker-compose.prod.yml --profile onprem up -d postgres redis swift

echo ""
echo "  起動状態:"
docker compose -f docker-compose.prod.yml --profile onprem ps

echo ""
echo "============================================================"
echo "✅ STEP 5 完了"
echo ""
echo "【次のステップ】"
echo "  postgres が healthy になったら STEP 6（DBセットアップ）に進んでください。"
echo ""
echo "  状態確認コマンド:"
echo "    watch docker compose -f docker-compose.prod.yml --profile onprem ps"
echo "  → postgres の STATUS が \"healthy\" になったら Ctrl+C で抜けてください"
echo "============================================================"
