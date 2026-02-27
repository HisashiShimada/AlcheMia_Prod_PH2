#!/bin/bash
# =============================================================================
# mmdpf デプロイスクリプト - オンプレ環境用
# =============================================================================
#
# 使い方:
#   chmod +x scripts/deploy.onprem.sh
#   ./scripts/deploy.onprem.sh
#
# オプション:
#   --no-build    イメージのビルドをスキップ（既存イメージを使用）
#   --no-migrate  DBマイグレーションをスキップ
#   --pull        最新のベースイメージをpullしてからビルド
# =============================================================================

set -euo pipefail

# =============================================================================
# 設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env"
LOG_FILE="${PROJECT_DIR}/logs/deploy-$(date +%Y%m%d_%H%M%S).log"

# デフォルトオプション
BUILD=true
MIGRATE=true
PULL=false

# =============================================================================
# ユーティリティ関数
# =============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info()    { log "INFO " "$@"; }
success() { log "OK   " "✅ $*"; }
warn()    { log "WARN " "⚠️  $*"; }
error()   { log "ERROR" "❌ $*"; }

# エラー時のクリーンアップ
on_error() {
    error "デプロイ中にエラーが発生しました（行: $1）"
    error "ログファイル: ${LOG_FILE}"
    exit 1
}
trap 'on_error $LINENO' ERR

# =============================================================================
# 引数解析
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)   BUILD=false; shift ;;
        --no-migrate) MIGRATE=false; shift ;;
        --pull)       PULL=true; shift ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--no-build] [--no-migrate] [--pull]"
            exit 1
            ;;
    esac
done

# =============================================================================
# メイン処理
# =============================================================================
main() {
    # ログディレクトリ作成
    mkdir -p "${PROJECT_DIR}/logs"

    info "============================================="
    info "mmdpf オンプレ環境デプロイ開始"
    info "============================================="
    info "プロジェクトディレクトリ: ${PROJECT_DIR}"
    info "Compose ファイル: ${COMPOSE_FILE}"
    info "ログファイル: ${LOG_FILE}"

    # -----------------------------------------------------------------
    # Step 1: 前提条件チェック
    # -----------------------------------------------------------------
    info "--- Step 1: 前提条件チェック ---"

    # Dockerの確認
    if ! command -v docker &>/dev/null; then
        error "Docker がインストールされていません"
        exit 1
    fi
    success "Docker: $(docker --version)"

    # docker composeの確認
    if ! docker compose version &>/dev/null; then
        error "Docker Compose がインストールされていません"
        exit 1
    fi
    success "Docker Compose: $(docker compose version --short)"

    # .envファイルの確認
    if [[ ! -f "${ENV_FILE}" ]]; then
        error ".env ファイルが見つかりません: ${ENV_FILE}"
        error "以下を実行してください:"
        error "  cp .env.prod.onprem.example .env"
        error "  vi .env  # 各値を環境に合わせて編集"
        exit 1
    fi
    success ".env ファイル: 存在確認OK"

    # Compose ファイルの確認
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        error "Compose ファイルが見つかりません: ${COMPOSE_FILE}"
        exit 1
    fi
    success "Compose ファイル: 存在確認OK"

    # SSL証明書の確認
    # shellcheck source=/dev/null
    source "${ENV_FILE}"
    SSL_CERT_DIR="${SSL_CERT_DIR:-${PROJECT_DIR}/backend/certs/server}"
    CA_CERT_DIR="${CA_CERT_DIR:-${PROJECT_DIR}/backend/certs/ca}"

    if [[ ! -f "${SSL_CERT_DIR}/server.crt" ]]; then
        warn "SSL証明書が見つかりません: ${SSL_CERT_DIR}/server.crt"
        warn "nginx起動前に証明書を配置してください"
    else
        success "SSL証明書: 存在確認OK"
    fi

    if [[ ! -f "${CA_CERT_DIR}/ca.crt" ]]; then
        warn "CA証明書が見つかりません: ${CA_CERT_DIR}/ca.crt"
        warn "nginx起動前に証明書を配置してください"
    else
        success "CA証明書: 存在確認OK"
    fi

    # -----------------------------------------------------------------
    # Step 2: イメージのビルド
    # -----------------------------------------------------------------
    if [[ "${BUILD}" == "true" ]]; then
        info "--- Step 2: Dockerイメージのビルド ---"

        if [[ "${PULL}" == "true" ]]; then
            info "ベースイメージをpull中..."
            docker compose -f "${COMPOSE_FILE}" --profile onprem pull postgres redis swift nginx 2>&1 | tee -a "${LOG_FILE}"
        fi

        info "backendイメージをビルド中..."
        docker compose -f "${COMPOSE_FILE}" build backend 2>&1 | tee -a "${LOG_FILE}"
        success "backendイメージ: ビルド完了"

        info "frontendイメージをビルド中..."
        docker compose -f "${COMPOSE_FILE}" build frontend 2>&1 | tee -a "${LOG_FILE}"
        success "frontendイメージ: ビルド完了"
    else
        warn "--- Step 2: イメージビルドをスキップ（--no-build）---"
    fi

    # -----------------------------------------------------------------
    # Step 3: 既存コンテナの停止（ダウンタイム最小化）
    # -----------------------------------------------------------------
    info "--- Step 3: 既存コンテナの停止 ---"

    if docker compose -f "${COMPOSE_FILE}" --profile onprem ps --quiet 2>/dev/null | grep -q .; then
        info "既存コンテナを停止中..."
        docker compose -f "${COMPOSE_FILE}" --profile onprem down --remove-orphans 2>&1 | tee -a "${LOG_FILE}"
        success "既存コンテナ: 停止完了"
    else
        info "起動中のコンテナなし（初回デプロイ）"
    fi

    # -----------------------------------------------------------------
    # Step 4: インフラサービス起動（postgres, redis, swift）
    # -----------------------------------------------------------------
    info "--- Step 4: インフラサービス起動 ---"

    info "PostgreSQL / Redis / Swift を起動中..."
    docker compose -f "${COMPOSE_FILE}" --profile onprem up -d postgres redis swift 2>&1 | tee -a "${LOG_FILE}"

    info "PostgreSQL / Redis の起動待ち..."
    local retry=0
    local max_retry=30
    until docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${DB_USER:-mmdpf_user}" &>/dev/null; do
        retry=$((retry + 1))
        if [[ ${retry} -ge ${max_retry} ]]; then
            error "PostgreSQL の起動タイムアウト（${max_retry}秒）"
            exit 1
        fi
        echo -n "."
        sleep 1
    done
    success "PostgreSQL: 起動確認OK"

    # -----------------------------------------------------------------
    # Step 5: DBマイグレーション
    # -----------------------------------------------------------------
    if [[ "${MIGRATE}" == "true" ]]; then
        info "--- Step 5: DBマイグレーション ---"
        info "マイグレーションを実行中..."
        docker compose -f "${COMPOSE_FILE}" run --rm backend npm run migrate 2>&1 | tee -a "${LOG_FILE}"
        success "DBマイグレーション: 完了"
    else
        warn "--- Step 5: DBマイグレーションをスキップ（--no-migrate）---"
    fi

    # -----------------------------------------------------------------
    # Step 6: アプリケーションサービス起動
    # -----------------------------------------------------------------
    info "--- Step 6: アプリケーションサービス起動 ---"

    info "backend / frontend / nginx を起動中..."
    docker compose -f "${COMPOSE_FILE}" --profile onprem up -d 2>&1 | tee -a "${LOG_FILE}"
    success "全サービス: 起動完了"

    # -----------------------------------------------------------------
    # Step 7: ヘルスチェック
    # -----------------------------------------------------------------
    info "--- Step 7: ヘルスチェック ---"

    info "サービスの起動を待ち中..."
    sleep 10

    # コンテナの状態確認
    info "コンテナ状態:"
    docker compose -f "${COMPOSE_FILE}" --profile onprem ps 2>&1 | tee -a "${LOG_FILE}"

    # backendのヘルスチェック
    local backend_healthy=false
    for i in {1..12}; do
        if docker compose -f "${COMPOSE_FILE}" exec -T backend wget -qO- http://localhost:3001/api/v1/health &>/dev/null; then
            backend_healthy=true
            break
        fi
        info "backend 起動待ち... (${i}/12)"
        sleep 5
    done

    if [[ "${backend_healthy}" == "true" ]]; then
        success "backend: ヘルスチェックOK"
    else
        warn "backend: ヘルスチェック失敗（ログを確認してください）"
        docker compose -f "${COMPOSE_FILE}" logs --tail=50 backend 2>&1 | tee -a "${LOG_FILE}"
    fi

    # -----------------------------------------------------------------
    # 完了
    # -----------------------------------------------------------------
    info "============================================="
    success "デプロイ完了！"
    info "============================================="
    info ""
    info "サービスURL:"
    info "  HTTPS: https://localhost/"
    info "  Backend API: http://localhost:3001/api/v1/"
    info ""
    info "ログの確認:"
    info "  docker compose -f docker-compose.prod.yml --profile onprem logs -f"
    info ""
    info "停止:"
    info "  docker compose -f docker-compose.prod.yml --profile onprem down"
    info ""
    info "デプロイログ: ${LOG_FILE}"
}

main "$@"
