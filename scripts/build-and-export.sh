#!/bin/bash
# =============================================================================
# mmdpf Docker イメージ ビルド & エクスポートスクリプト
# =============================================================================
#
# 使い方:
#   chmod +x scripts/build-and-export.sh
#   ./scripts/build-and-export.sh
#
# オプション:
#   --backend   backend のみビルド & エクスポート
#   --frontend  frontend のみビルド & エクスポート
#   --pull      ベースイメージを pull してからビルド
#   --output    出力先ディレクトリを指定（デフォルト: ./dist）
#
# 例:
#   ./scripts/build-and-export.sh
#   ./scripts/build-and-export.sh --backend
#   ./scripts/build-and-export.sh --pull --output /tmp/mmdpf-export
#
# 出力ファイル:
#   dist/mmdpf-backend.tar.gz
#   dist/mmdpf-frontend.tar.gz
# =============================================================================

set -euo pipefail

# =============================================================================
# 設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

# デフォルト設定
BUILD_BACKEND=true
BUILD_FRONTEND=true
PULL=false
OUTPUT_DIR="${PROJECT_DIR}/dist"

# =============================================================================
# ユーティリティ関数
# =============================================================================
info()    { echo "[INFO ] $*"; }
success() { echo "[OK   ] ✅ $*"; }
warn()    { echo "[WARN ] ⚠️  $*"; }
error()   { echo "[ERROR] ❌ $*" >&2; }

# エラー時のハンドラ
on_error() {
    error "エラーが発生しました（行: $1）"
    exit 1
}
trap 'on_error $LINENO' ERR

# =============================================================================
# 引数解析
# =============================================================================
TARGET_SPECIFIED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend)
            TARGET_SPECIFIED=true
            BUILD_BACKEND=true
            BUILD_FRONTEND=false
            shift
            ;;
        --frontend)
            TARGET_SPECIFIED=true
            BUILD_BACKEND=false
            BUILD_FRONTEND=true
            shift
            ;;
        --pull)
            PULL=true
            shift
            ;;
        --output)
            if [[ -z "${2:-}" ]]; then
                error "--output オプションには出力先ディレクトリを指定してください"
                exit 1
            fi
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help|-h)
            echo "使い方: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --backend         backend のみビルド & エクスポート"
            echo "  --frontend        frontend のみビルド & エクスポート"
            echo "  --pull            ベースイメージを pull してからビルド"
            echo "  --output <dir>    出力先ディレクトリを指定（デフォルト: ./dist）"
            echo "  --help, -h        このヘルプを表示"
            exit 0
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--backend] [--frontend] [--pull] [--output <dir>]"
            exit 1
            ;;
    esac
done

# =============================================================================
# 前提条件チェック
# =============================================================================
check_requirements() {
    info "--- 前提条件チェック ---"

    # Docker の確認
    if ! command -v docker &>/dev/null; then
        error "Docker がインストールされていません"
        exit 1
    fi
    success "Docker: $(docker --version)"

    # Docker デーモンへのアクセス権限チェック
    if ! docker info &>/dev/null; then
        error "Docker デーモンへの接続に失敗しました（permission denied）"
        echo ""
        echo "  【解決方法】現在のユーザーを docker グループに追加してください："
        echo ""
        echo "    sudo usermod -aG docker \$USER"
        echo "    newgrp docker   # 現在のシェルに即時反映（ログアウト不要）"
        echo ""
        echo "  ※ newgrp docker を実行した後、このスクリプトを再実行してください。"
        echo "  ※ 完全に反映させるには、ログアウト → 再ログイン が確実です。"
        echo ""
        exit 1
    fi
    success "Docker デーモン: 接続OK"

    # Docker Compose の確認
    if ! docker compose version &>/dev/null; then
        error "Docker Compose がインストールされていません"
        exit 1
    fi
    success "Docker Compose: $(docker compose version --short)"

    # Compose ファイルの確認
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        error "Compose ファイルが見つかりません: ${COMPOSE_FILE}"
        exit 1
    fi
    success "Compose ファイル: ${COMPOSE_FILE}"
}

# =============================================================================
# イメージのビルド
# =============================================================================
build_images() {
    info "--- Docker イメージのビルド ---"

    if [[ "${PULL}" == "true" ]]; then
        info "ベースイメージを pull 中..."
        docker compose -f "${COMPOSE_FILE}" pull --ignore-pull-failures 2>/dev/null || true
    fi

    if [[ "${BUILD_BACKEND}" == "true" ]]; then
        info "backend イメージをビルド中..."
        docker compose -f "${COMPOSE_FILE}" build backend
        success "backend イメージ: ビルド完了"
    fi

    if [[ "${BUILD_FRONTEND}" == "true" ]]; then
        info "frontend イメージをビルド中..."
        docker compose -f "${COMPOSE_FILE}" build frontend
        success "frontend イメージ: ビルド完了"
    fi

    info "ビルド済みイメージ一覧:"
    docker images | grep mmdpf || true
}

# =============================================================================
# イメージのエクスポート
# =============================================================================
export_images() {
    info "--- Docker イメージのエクスポート ---"
    info "出力先ディレクトリ: ${OUTPUT_DIR}"

    # 出力ディレクトリの作成
    mkdir -p "${OUTPUT_DIR}"
    success "出力ディレクトリ: 作成/確認完了"

    if [[ "${BUILD_BACKEND}" == "true" ]]; then
        local backend_file="${OUTPUT_DIR}/mmdpf-backend.tar.gz"
        info "backend イメージをエクスポート中... → ${backend_file}"
        docker save mmdpf-backend:latest | gzip > "${backend_file}"
        success "backend イメージ: エクスポート完了 ($(du -h "${backend_file}" | cut -f1))"
    fi

    if [[ "${BUILD_FRONTEND}" == "true" ]]; then
        local frontend_file="${OUTPUT_DIR}/mmdpf-frontend.tar.gz"
        info "frontend イメージをエクスポート中... → ${frontend_file}"
        docker save mmdpf-frontend:latest | gzip > "${frontend_file}"
        success "frontend イメージ: エクスポート完了 ($(du -h "${frontend_file}" | cut -f1))"
    fi
}

# =============================================================================
# 完了サマリー
# =============================================================================
print_summary() {
    info "============================================="
    success "ビルド & エクスポート完了！"
    info "============================================="
    info ""
    info "出力ファイル:"
    ls -lh "${OUTPUT_DIR}"/mmdpf-*.tar.gz 2>/dev/null | awk '{print "  " $5 "  " $9}' || true
    info ""
    info "次のステップ（サーバへの転送）:"
    info "  DEPLOY_USER=user"
    info "  DEPLOY_HOST=target-server-ip"
    info "  DEPLOY_DIR=/home/user/mmdpf"
    info "  scp ${OUTPUT_DIR}/mmdpf-*.tar.gz \${DEPLOY_USER}@\${DEPLOY_HOST}:\${DEPLOY_DIR}/"
}

# =============================================================================
# メイン処理
# =============================================================================
main() {
    info "============================================="
    info "mmdpf Docker イメージ ビルド & エクスポート"
    info "============================================="
    info "プロジェクトディレクトリ: ${PROJECT_DIR}"
    info "出力先ディレクトリ:       ${OUTPUT_DIR}"
    info "ビルド対象:"
    [[ "${BUILD_BACKEND}"  == "true" ]] && info "  - backend"
    [[ "${BUILD_FRONTEND}" == "true" ]] && info "  - frontend"
    info ""

    check_requirements
    build_images
    export_images
    print_summary
}

main "$@"
