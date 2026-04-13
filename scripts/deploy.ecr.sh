#!/bin/bash
# =============================================================================
# Alchemia Staging - ECR デプロイ自動化スクリプト
# =============================================================================
#
# 使い方:
#   chmod +x scripts/deploy.ecr.sh
#   ./scripts/deploy.ecr.sh [OPTIONS]
#
# オプション:
#   --no-build      イメージのビルドをスキップ（既存イメージを再デプロイ）
#   --no-push       ECRへのプッシュをスキップ
#   --no-deploy     ECSデプロイをスキップ（ビルド＆プッシュのみ）
#   --migrate       DBマイグレーションを実行（Aurora への psql 直接接続）
#   --backend       バックエンドのみ対象
#   --nginx         nginx（frontend含む）のみ対象
#   --wait          ECSサービス安定化まで待機（デフォルト: スキップ）
#   --tag <TAG>     イメージタグを指定（デフォルト: staging）
#   --help          このヘルプを表示
#
# 前提条件:
#   - AWS CLI がインストール・設定済み（aws configure or IAMロール）
#   - Docker がインストール済み
#   - IAMポリシー: ECR push, ECS update-service, ecs:register-task-definition
#   - --migrate 使用時: Aurora への接続情報が環境変数 or .env に設定済み
#
# 実行例:
#   # フルデプロイ（ビルド→プッシュ→ECSデプロイ）
#   ./scripts/deploy.ecr.sh
#
#   # DBマイグレーション付きフルデプロイ
#   ./scripts/deploy.ecr.sh --migrate
#
#   # バックエンドのみ、安定化まで待機
#   ./scripts/deploy.ecr.sh --backend --wait
#
#   # nginx（frontend含む）のみデプロイ
#   ./scripts/deploy.ecr.sh --nginx
#
#   # ビルドせず再デプロイ（既存イメージを使用）
#   ./scripts/deploy.ecr.sh --no-build --no-push
#
#   # マイグレーションのみ実行（デプロイなし）
#   ./scripts/deploy.ecr.sh --no-build --no-push --no-deploy --migrate
# =============================================================================

set -euo pipefail

# =============================================================================
# Alchemia Staging 固定設定
# =============================================================================
readonly AWS_ACCOUNT_ID="137068252939"
readonly AWS_REGION="ap-northeast-1"
readonly ECS_CLUSTER="alchemia-staging"
readonly ECS_SERVICE_BACKEND="alchemia-backend-service"
readonly ECS_SERVICE_NGINX="alchemia-nginx-service"
readonly ECR_REPO_BACKEND="mmdpf-backend"
readonly ECR_REPO_FRONTEND="mmdpf-frontend"
readonly ECR_REPO_NGINX="mmdpf-nginx"
readonly ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
readonly ECR_BACKEND="${ECR_BASE}/${ECR_REPO_BACKEND}"
readonly ECR_FRONTEND="${ECR_BASE}/${ECR_REPO_FRONTEND}"
readonly ECR_NGINX="${ECR_BASE}/${ECR_REPO_NGINX}"
readonly TASK_DEF_BACKEND_FILE="aws/ecs-task-definition-alchemia-backend.json"
readonly TASK_DEF_NGINX_FILE="aws/ecs-task-definition-alchemia-nginx.json"

# DB接続情報（--migrate 使用時。環境変数または .env から取得）
# Aurora の場合は psql コマンドで直接接続
readonly DB_USER="${DB_USER:-maiml_user}"
readonly DB_NAME="${DB_NAME:-maiml_db}"
readonly DB_HOST="${DB_HOST:-}"
readonly DB_PORT="${DB_PORT:-5432}"
readonly DB_PASSWORD="${DB_PASSWORD:-}"

# =============================================================================
# パス設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-ecr-$(date +%Y%m%d_%H%M%S).log"
MIGRATIONS_DIR="${PROJECT_DIR}/backend/migrations"

# =============================================================================
# デフォルトオプション
# =============================================================================
BUILD=true
PUSH=true
DEPLOY=true
MIGRATE=false
DEPLOY_BACKEND=true
DEPLOY_NGINX=true
WAIT_STABLE=false
IMAGE_TAG="staging"

# =============================================================================
# ユーティリティ関数
# =============================================================================
log() {
    local level="$1"; shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local line="[${timestamp}] [${level}] ${message}"
    echo "${line}" | tee -a "${LOG_FILE}"
}
info()    { log "INFO " "$@"; }
success() { log "OK   " "✅ $*"; }
warn()    { log "WARN " "⚠️  $*"; }
error()   { log "ERROR" "❌ $*"; }

on_error() {
    error "スクリプトがエラーで終了しました（行: $1）"
    error "ログファイル: ${LOG_FILE}"
    exit 1
}
trap 'on_error $LINENO' ERR

# =============================================================================
# 引数解析
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)   BUILD=false;        shift ;;
        --no-push)    PUSH=false;         shift ;;
        --no-deploy)  DEPLOY=false;       shift ;;
        --migrate)    MIGRATE=true;       shift ;;
        --backend)    DEPLOY_NGINX=false; shift ;;
        --nginx)      DEPLOY_BACKEND=false; shift ;;
        --wait)       WAIT_STABLE=true;   shift ;;
        --tag)        IMAGE_TAG="$2";     shift 2 ;;
        -h|--help)
            sed -n '3,35p' "$0"
            exit 0
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--no-build] [--no-push] [--no-deploy] [--migrate] [--backend] [--nginx] [--wait] [--tag <TAG>]"
            exit 1
            ;;
    esac
done

# =============================================================================
# メイン処理
# =============================================================================
main() {
    mkdir -p "${LOG_DIR}"

    info "============================================================"
    info "  Alchemia Staging ECR デプロイ開始"
    info "============================================================"
    info "  クラスター  : ${ECS_CLUSTER}"
    info "  リージョン  : ${AWS_REGION}"
    info "  イメージタグ: ${IMAGE_TAG}"
    info "  ビルド      : ${BUILD}"
    info "  プッシュ    : ${PUSH}"
    info "  デプロイ    : ${DEPLOY}"
    info "  マイグレ    : ${MIGRATE}"
    if [[ "${DEPLOY_BACKEND}" == "true" && "${DEPLOY_NGINX}" == "true" ]]; then
        info "  対象        : backend + nginx(frontend含む)"
    elif [[ "${DEPLOY_BACKEND}" == "true" ]]; then
        info "  対象        : backend のみ"
    else
        info "  対象        : nginx(frontend含む) のみ"
    fi
    info "  ログ        : ${LOG_FILE}"
    info "============================================================"

    # ------------------------------------------------------------------
    # Step 1: 前提条件チェック
    # ------------------------------------------------------------------
    info "--- Step 1: 前提条件チェック ---"

    if ! command -v docker &>/dev/null; then
        error "Docker がインストールされていません"
        exit 1
    fi
    success "Docker: $(docker --version | head -1)"

    if ! command -v aws &>/dev/null; then
        error "AWS CLI がインストールされていません"
        exit 1
    fi
    success "AWS CLI: $(aws --version 2>&1 | head -1)"

    local caller_identity
    if ! caller_identity=$(aws sts get-caller-identity --output json 2>&1); then
        error "AWS 認証に失敗しました。aws configure を実行するか、IAMロールを確認してください"
        exit 1
    fi
    local auth_account
    auth_account=$(echo "${caller_identity}" | grep '"Account"' | sed 's/.*: "\([^"]*\)".*/\1/')
    success "AWS 認証: アカウント ${auth_account}"

    if [[ "${auth_account}" != "${AWS_ACCOUNT_ID}" ]]; then
        error "AWSアカウントID不一致 (期待: ${AWS_ACCOUNT_ID} / 実際: ${auth_account})"
        exit 1
    fi

    local cluster_status
    cluster_status=$(aws ecs describe-clusters \
        --clusters "${ECS_CLUSTER}" \
        --region "${AWS_REGION}" \
        --query 'clusters[0].status' \
        --output text 2>&1 || echo "MISSING")
    if [[ "${cluster_status}" != "ACTIVE" ]]; then
        error "ECSクラスター '${ECS_CLUSTER}' がACTIVEではありません（status: ${cluster_status}）"
        exit 1
    fi
    success "ECSクラスター: ${ECS_CLUSTER} (${cluster_status})"

    if [[ "${DEPLOY_BACKEND}" == "true" && ! -f "${PROJECT_DIR}/${TASK_DEF_BACKEND_FILE}" ]]; then
        error "バックエンドタスク定義ファイルが見つかりません: ${TASK_DEF_BACKEND_FILE}"
        exit 1
    fi
    if [[ "${DEPLOY_NGINX}" == "true" && ! -f "${PROJECT_DIR}/${TASK_DEF_NGINX_FILE}" ]]; then
        error "nginx タスク定義ファイルが見つかりません: ${TASK_DEF_NGINX_FILE}"
        exit 1
    fi

    # --migrate 使用時の DB 接続情報チェック
    if [[ "${MIGRATE}" == "true" ]]; then
        if [[ -z "${DB_HOST}" ]]; then
            error "--migrate が指定されましたが DB_HOST が設定されていません"
            error "環境変数 DB_HOST に Aurora エンドポイントを設定してください"
            exit 1
        fi
        if ! command -v psql &>/dev/null; then
            error "--migrate が指定されましたが psql コマンドが見つかりません"
            error "psql をインストールするか、docker run で実行してください"
            exit 1
        fi
    fi
    success "前提条件: すべてOK"

    # ------------------------------------------------------------------
    # Step 2: ECR ログイン
    # ------------------------------------------------------------------
    if [[ "${BUILD}" == "true" || "${PUSH}" == "true" ]]; then
        info "--- Step 2: ECR ログイン ---"
        aws ecr get-login-password --region "${AWS_REGION}" \
            | docker login --username AWS --password-stdin "${ECR_BASE}" 2>&1 | tee -a "${LOG_FILE}"
        success "ECR ログイン完了: ${ECR_BASE}"
    else
        info "--- Step 2: ECR ログインをスキップ（ビルド・プッシュなし）---"
    fi

    # ------------------------------------------------------------------
    # Step 3: Docker イメージ ビルド
    # ------------------------------------------------------------------
    if [[ "${BUILD}" == "true" ]]; then
        info "--- Step 3: Docker イメージ ビルド ---"

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "[Backend] ビルド中... (${ECR_BACKEND}:${IMAGE_TAG})"
            docker build \
                --no-cache \
                -f "${PROJECT_DIR}/backend/Dockerfile.prod" \
                -t "${ECR_BACKEND}:${IMAGE_TAG}" \
                "${PROJECT_DIR}/backend" 2>&1 | tee -a "${LOG_FILE}"
            success "[Backend] ビルド完了"
        fi

        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            info "[Frontend] ビルド中... (${ECR_FRONTEND}:${IMAGE_TAG})"
            docker build \
                --no-cache \
                -f "${PROJECT_DIR}/frontend/Dockerfile.prod" \
                -t "${ECR_FRONTEND}:${IMAGE_TAG}" \
                "${PROJECT_DIR}/frontend" 2>&1 | tee -a "${LOG_FILE}"
            success "[Frontend] ビルド完了"

            info "[Nginx] ビルド中... (${ECR_NGINX}:${IMAGE_TAG})"
            docker build \
                --no-cache \
                -f "${PROJECT_DIR}/config/nginx/Dockerfile" \
                -t "${ECR_NGINX}:${IMAGE_TAG}" \
                "${PROJECT_DIR}/config/nginx" 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] ビルド完了"
        fi
    else
        warn "--- Step 3: ビルドをスキップ（--no-build）---"
    fi

    # ------------------------------------------------------------------
    # Step 4: ECR プッシュ
    # ------------------------------------------------------------------
    if [[ "${PUSH}" == "true" ]]; then
        info "--- Step 4: ECR プッシュ ---"

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "[Backend] プッシュ中... ${ECR_BACKEND}:${IMAGE_TAG}"
            docker push "${ECR_BACKEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
            success "[Backend] プッシュ完了: ${ECR_BACKEND}:${IMAGE_TAG}"
        fi

        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            info "[Frontend] プッシュ中... ${ECR_FRONTEND}:${IMAGE_TAG}"
            docker push "${ECR_FRONTEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
            success "[Frontend] プッシュ完了: ${ECR_FRONTEND}:${IMAGE_TAG}"

            info "[Nginx] プッシュ中... ${ECR_NGINX}:${IMAGE_TAG}"
            docker push "${ECR_NGINX}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] プッシュ完了: ${ECR_NGINX}:${IMAGE_TAG}"
        fi
    else
        warn "--- Step 4: ECRプッシュをスキップ（--no-push）---"
    fi

    # ------------------------------------------------------------------
    # Step 5: DBマイグレーション（--migrate オプション時）
    # Aurora への psql 直接接続で実行
    # ------------------------------------------------------------------
    if [[ "${MIGRATE}" == "true" ]]; then
        info "--- Step 5: DBマイグレーション実行（Aurora 直接接続）---"
        info "  Aurora エンドポイント: ${DB_HOST}:${DB_PORT}"
        info "  DB: ${DB_NAME} / ユーザー: ${DB_USER}"

        # migrations/ 配下の .sql ファイルを日付順（rollback 除く）に適用
        local migration_files
        migration_files=$(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | grep -v rollback | sort || true)

        if [[ -z "${migration_files}" ]]; then
            warn "適用するマイグレーションファイルが見つかりません: ${MIGRATIONS_DIR}"
        else
            info "適用するマイグレーションファイル一覧:"
            echo "${migration_files}" | while read -r f; do
                info "  - $(basename "${f}")"
            done

            echo "${migration_files}" | while read -r sql_file; do
                local filename
                filename=$(basename "${sql_file}")
                info "[Migration] 実行中: ${filename}"

                PGPASSWORD="${DB_PASSWORD}" psql \
                    -h "${DB_HOST}" \
                    -p "${DB_PORT}" \
                    -U "${DB_USER}" \
                    -d "${DB_NAME}" \
                    --set=sslmode=require \
                    -f "${sql_file}" 2>&1 | tee -a "${LOG_FILE}" || {
                    warn "[Migration] ${filename} の実行中にエラーが発生しました（既適用の場合は無視）"
                }
                success "[Migration] 完了: ${filename}"
            done
        fi
    else
        info "--- Step 5: DBマイグレーションをスキップ（--migrate で実行）---"
    fi

    # ------------------------------------------------------------------
    # Step 6: ECSタスク定義の登録 & サービス更新
    # ------------------------------------------------------------------
    if [[ "${DEPLOY}" == "true" ]]; then
        info "--- Step 6: ECSタスク定義の登録 & サービス更新 ---"

        local BACKEND_TASK_ARN=""
        local NGINX_TASK_ARN=""

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "[Backend] タスク定義を登録中..."
            local task_def_json
            task_def_json=$(sed "s|:staging\"|:${IMAGE_TAG}\"|g" \
                "${PROJECT_DIR}/${TASK_DEF_BACKEND_FILE}")

            BACKEND_TASK_ARN=$(echo "${task_def_json}" \
                | aws ecs register-task-definition \
                    --region "${AWS_REGION}" \
                    --cli-input-json file:///dev/stdin \
                    --query 'taskDefinition.taskDefinitionArn' \
                    --output text 2>&1)

            if [[ -z "${BACKEND_TASK_ARN}" || "${BACKEND_TASK_ARN}" == "None" ]]; then
                error "[Backend] タスク定義の登録に失敗しました"
                exit 1
            fi
            success "[Backend] タスク定義登録完了: ${BACKEND_TASK_ARN}"

            info "[Backend] ECSサービスを更新中..."
            aws ecs update-service \
                --region "${AWS_REGION}" \
                --cluster "${ECS_CLUSTER}" \
                --service "${ECS_SERVICE_BACKEND}" \
                --task-definition "${BACKEND_TASK_ARN}" \
                --force-new-deployment \
                --query 'service.{service:serviceName,running:runningCount,pending:pendingCount,desired:desiredCount}' \
                --output table 2>&1 | tee -a "${LOG_FILE}"
            success "[Backend] サービス更新リクエスト送信完了"
        fi

        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            info "[Nginx] タスク定義を登録中..."
            local task_def_json
            task_def_json=$(sed "s|:staging\"|:${IMAGE_TAG}\"|g" \
                "${PROJECT_DIR}/${TASK_DEF_NGINX_FILE}")

            NGINX_TASK_ARN=$(echo "${task_def_json}" \
                | aws ecs register-task-definition \
                    --region "${AWS_REGION}" \
                    --cli-input-json file:///dev/stdin \
                    --query 'taskDefinition.taskDefinitionArn' \
                    --output text 2>&1)

            if [[ -z "${NGINX_TASK_ARN}" || "${NGINX_TASK_ARN}" == "None" ]]; then
                error "[Nginx] タスク定義の登録に失敗しました"
                exit 1
            fi
            success "[Nginx] タスク定義登録完了: ${NGINX_TASK_ARN}"

            info "[Nginx] ECSサービスを更新中..."
            aws ecs update-service \
                --region "${AWS_REGION}" \
                --cluster "${ECS_CLUSTER}" \
                --service "${ECS_SERVICE_NGINX}" \
                --task-definition "${NGINX_TASK_ARN}" \
                --force-new-deployment \
                --query 'service.{service:serviceName,running:runningCount,pending:pendingCount,desired:desiredCount}' \
                --output table 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] サービス更新リクエスト送信完了"
        fi
    else
        warn "--- Step 6: ECSデプロイをスキップ（--no-deploy）---"
    fi

    # ------------------------------------------------------------------
    # Step 7: ECSサービス安定化待ち（--wait オプション時）
    # ------------------------------------------------------------------
    if [[ "${WAIT_STABLE}" == "true" && "${DEPLOY}" == "true" ]]; then
        info "--- Step 7: ECSサービス安定化待ち（最大10分）---"

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "[Backend] 安定化を待機中..."
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_BACKEND}" \
                --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            local running_count
            running_count=$(aws ecs describe-services \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_BACKEND}" \
                --region "${AWS_REGION}" \
                --query 'services[0].runningCount' \
                --output text 2>/dev/null || echo "?")
            success "[Backend] 安定化完了（稼働タスク数: ${running_count}）"
        fi

        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            info "[Nginx] 安定化を待機中..."
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX}" \
                --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            local running_count
            running_count=$(aws ecs describe-services \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX}" \
                --region "${AWS_REGION}" \
                --query 'services[0].runningCount' \
                --output text 2>/dev/null || echo "?")
            success "[Nginx] 安定化完了（稼働タスク数: ${running_count}）"
        fi

        # ヘルスチェック
        info "NLBヘルスチェック確認..."
        local nlb_url="https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com"
        if curl -sf --max-time 10 "${nlb_url}/api/health" >/dev/null 2>&1; then
            success "NLBヘルスチェック: OK (${nlb_url}/api/health)"
        else
            warn "NLBヘルスチェック: 応答なし（サービス起動中の可能性があります）"
        fi
    else
        info "--- Step 7: 安定化待ちをスキップ（--wait を付けると待機）---"
    fi

    # ------------------------------------------------------------------
    # 完了サマリー
    # ------------------------------------------------------------------
    info ""
    info "============================================================"
    success "  Alchemia Staging ECR デプロイ完了！"
    info "============================================================"
    info ""
    info "  デプロイ情報:"
    info "    イメージタグ : ${IMAGE_TAG}"
    info "    クラスター   : ${ECS_CLUSTER}"
    info "    リージョン   : ${AWS_REGION}"
    info ""
    info "  デプロイ状況の確認:"
    if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
        info "    [Backend]"
        info "    aws ecs describe-services \\"
        info "      --cluster ${ECS_CLUSTER} \\"
        info "      --services ${ECS_SERVICE_BACKEND} \\"
        info "      --region ${AWS_REGION} \\"
        info "      --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'"
    fi
    if [[ "${DEPLOY_NGINX}" == "true" ]]; then
        info "    [Nginx + Frontend]"
        info "    aws ecs describe-services \\"
        info "      --cluster ${ECS_CLUSTER} \\"
        info "      --services ${ECS_SERVICE_NGINX} \\"
        info "      --region ${AWS_REGION} \\"
        info "      --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'"
    fi
    info ""
    info "  稼働確認:"
    info "    NLB URL: https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/"
    info ""
    info "  AWSコンソール:"
    info "    https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
    info ""
    info "  CloudWatch Logs:"
    info "    Backend : https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Falchemia-backend"
    info "    Nginx   : https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Falchemia-nginx"
    info ""
    info "  デプロイログ: ${LOG_FILE}"
    info "============================================================"
}

main "$@"
