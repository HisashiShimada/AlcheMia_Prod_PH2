#!/bin/bash
# =============================================================================
# mmdpf デプロイスクリプト - AWS環境用（ECS + ECR）
# =============================================================================
#
# 使い方:
#   chmod +x scripts/deploy.aws.sh
#   ./scripts/deploy.aws.sh
#
# オプション:
#   --no-build    イメージのビルドをスキップ（既存イメージを使用）
#   --no-migrate  DBマイグレーションをスキップ
#   --backend     バックエンドのみデプロイ
#   --frontend    フロントエンドのみデプロイ
#   --tag <TAG>   イメージタグを指定（デフォルト: Gitコミットハッシュ）
#
# 前提条件:
#   - AWS CLI がインストール・設定済み（aws configure）
#   - Docker がインストール済み
#   - .env ファイルに AWS_ACCOUNT_ID, AWS_ECR_REGION, ECS_CLUSTER 等が設定済み
# =============================================================================

set -euo pipefail

# =============================================================================
# 設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
LOG_FILE="${PROJECT_DIR}/logs/deploy-aws-$(date +%Y%m%d_%H%M%S).log"

# デフォルトオプション
BUILD=true
MIGRATE=true
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
IMAGE_TAG=""

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

# エラー時のハンドリング
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
        --backend)    DEPLOY_FRONTEND=false; shift ;;
        --frontend)   DEPLOY_BACKEND=false; shift ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--no-build] [--no-migrate] [--backend] [--frontend] [--tag <TAG>]"
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
    info "mmdpf AWS環境デプロイ開始"
    info "============================================="
    info "プロジェクトディレクトリ: ${PROJECT_DIR}"
    info "ログファイル: ${LOG_FILE}"

    # -----------------------------------------------------------------
    # Step 1: 前提条件チェック
    # -----------------------------------------------------------------
    info "--- Step 1: 前提条件チェック ---"

    # .envファイルの確認
    if [[ ! -f "${ENV_FILE}" ]]; then
        error ".env ファイルが見つかりません: ${ENV_FILE}"
        error "以下を実行してください:"
        error "  cp .env.prod.aws.example .env"
        error "  vi .env  # 各値を環境に合わせて編集"
        exit 1
    fi

    # 環境変数の読み込み
    # shellcheck source=/dev/null
    set -a
    source "${ENV_FILE}"
    set +a
    success ".env ファイル: 読み込み完了"

    # 必須環境変数チェック
    local required_vars=(
        "AWS_ACCOUNT_ID"
        "AWS_ECR_REGION"
        "ECS_CLUSTER"
        "ECS_SERVICE_BACKEND"
        "ECS_SERVICE_FRONTEND"
        "ECR_REPOSITORY_BACKEND"
        "ECR_REPOSITORY_FRONTEND"
    )
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "必須環境変数が未設定です: ${var}"
            exit 1
        fi
    done
    success "必須環境変数: チェックOK"

    # Docker の確認
    if ! command -v docker &>/dev/null; then
        error "Docker がインストールされていません"
        exit 1
    fi
    success "Docker: $(docker --version)"

    # AWS CLI の確認
    if ! command -v aws &>/dev/null; then
        error "AWS CLI がインストールされていません"
        error "インストール方法: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    success "AWS CLI: $(aws --version)"

    # AWS 認証確認
    if ! aws sts get-caller-identity &>/dev/null; then
        error "AWS 認証に失敗しました。aws configure を実行してください"
        exit 1
    fi
    local aws_identity
    aws_identity=$(aws sts get-caller-identity --query 'Account' --output text)
    success "AWS 認証: アカウント ${aws_identity} で認証済み"

    # イメージタグの設定（未指定時はGitコミットハッシュ）
    if [[ -z "${IMAGE_TAG}" ]]; then
        if command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null; then
            IMAGE_TAG=$(git rev-parse --short HEAD)
            info "イメージタグ: ${IMAGE_TAG}（Gitコミットハッシュ）"
        else
            IMAGE_TAG=$(date +%Y%m%d%H%M%S)
            info "イメージタグ: ${IMAGE_TAG}（タイムスタンプ）"
        fi
    else
        info "イメージタグ: ${IMAGE_TAG}（指定値）"
    fi

    # ECR リポジトリURL
    local ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_ECR_REGION}.amazonaws.com"
    local ECR_BACKEND="${ECR_BASE}/${ECR_REPOSITORY_BACKEND}"
    local ECR_FRONTEND="${ECR_BASE}/${ECR_REPOSITORY_FRONTEND}"

    # -----------------------------------------------------------------
    # Step 2: ECR へのログイン
    # -----------------------------------------------------------------
    info "--- Step 2: ECR へのログイン ---"
    aws ecr get-login-password --region "${AWS_ECR_REGION}" \
        | docker login --username AWS --password-stdin "${ECR_BASE}" 2>&1 | tee -a "${LOG_FILE}"
    success "ECR ログイン: 完了"

    # -----------------------------------------------------------------
    # Step 3: イメージのビルド & プッシュ
    # -----------------------------------------------------------------
    if [[ "${BUILD}" == "true" ]]; then
        info "--- Step 3: Dockerイメージのビルド & ECRへのプッシュ ---"

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "backendイメージをビルド中..."
            docker build \
                -f "${PROJECT_DIR}/backend/Dockerfile.prod" \
                -t "${ECR_BACKEND}:${IMAGE_TAG}" \
                -t "${ECR_BACKEND}:latest" \
                "${PROJECT_DIR}/backend" 2>&1 | tee -a "${LOG_FILE}"
            success "backendイメージ: ビルド完了"

            info "backendイメージをECRにプッシュ中..."
            docker push "${ECR_BACKEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
            docker push "${ECR_BACKEND}:latest" 2>&1 | tee -a "${LOG_FILE}"
            success "backendイメージ: プッシュ完了（${ECR_BACKEND}:${IMAGE_TAG}）"
        fi

        if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
            info "frontendイメージをビルド中..."
            docker build \
                -f "${PROJECT_DIR}/frontend/Dockerfile.prod" \
                -t "${ECR_FRONTEND}:${IMAGE_TAG}" \
                -t "${ECR_FRONTEND}:latest" \
                "${PROJECT_DIR}/frontend" 2>&1 | tee -a "${LOG_FILE}"
            success "frontendイメージ: ビルド完了"

            info "frontendイメージをECRにプッシュ中..."
            docker push "${ECR_FRONTEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
            docker push "${ECR_FRONTEND}:latest" 2>&1 | tee -a "${LOG_FILE}"
            success "frontendイメージ: プッシュ完了（${ECR_FRONTEND}:${IMAGE_TAG}）"
        fi
    else
        warn "--- Step 3: イメージビルドをスキップ（--no-build）---"
        info "使用するイメージタグ: ${IMAGE_TAG}"
    fi

    # -----------------------------------------------------------------
    # Step 4: ECS タスク定義の更新 & サービスデプロイ
    # -----------------------------------------------------------------
    info "--- Step 4: ECS タスク定義の更新 & サービスデプロイ ---"

    if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
        info "バックエンドのECSタスク定義を更新中..."

        # タスク定義テンプレートのプレースホルダーを置換
        local TASK_DEF_BACKEND
        TASK_DEF_BACKEND=$(cat "${PROJECT_DIR}/aws/ecs-task-definition-backend.json" \
            | grep -v '"_comment' \
            | sed "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" \
            | sed "s|<AWS_REGION>|${AWS_ECR_REGION}|g" \
            | sed "s|<IMAGE_TAG>|${IMAGE_TAG}|g")

        # タスク定義を登録
        local BACKEND_TASK_ARN
        BACKEND_TASK_ARN=$(echo "${TASK_DEF_BACKEND}" \
            | aws ecs register-task-definition \
                --region "${AWS_ECR_REGION}" \
                --cli-input-json file:///dev/stdin \
                --query 'taskDefinition.taskDefinitionArn' \
                --output text 2>&1)
        success "バックエンドタスク定義: 登録完了（${BACKEND_TASK_ARN}）"

        # ECS サービスを更新（新しいタスク定義でローリングデプロイ）
        info "バックエンドECSサービスを更新中..."
        aws ecs update-service \
            --region "${AWS_ECR_REGION}" \
            --cluster "${ECS_CLUSTER}" \
            --service "${ECS_SERVICE_BACKEND}" \
            --task-definition "${BACKEND_TASK_ARN}" \
            --force-new-deployment \
            --output text 2>&1 | tee -a "${LOG_FILE}"
        success "バックエンドECSサービス: 更新リクエスト送信完了"
    fi

    if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
        info "フロントエンドのECSタスク定義を更新中..."

        # タスク定義テンプレートのプレースホルダーを置換
        local TASK_DEF_FRONTEND
        TASK_DEF_FRONTEND=$(cat "${PROJECT_DIR}/aws/ecs-task-definition-frontend.json" \
            | grep -v '"_comment' \
            | sed "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" \
            | sed "s|<AWS_REGION>|${AWS_ECR_REGION}|g" \
            | sed "s|<IMAGE_TAG>|${IMAGE_TAG}|g" \
            | sed "s|<ALB_DNS_NAME>|${CORS_ORIGIN:-localhost}|g")

        # タスク定義を登録
        local FRONTEND_TASK_ARN
        FRONTEND_TASK_ARN=$(echo "${TASK_DEF_FRONTEND}" \
            | aws ecs register-task-definition \
                --region "${AWS_ECR_REGION}" \
                --cli-input-json file:///dev/stdin \
                --query 'taskDefinition.taskDefinitionArn' \
                --output text 2>&1)
        success "フロントエンドタスク定義: 登録完了（${FRONTEND_TASK_ARN}）"

        # ECS サービスを更新
        info "フロントエンドECSサービスを更新中..."
        aws ecs update-service \
            --region "${AWS_ECR_REGION}" \
            --cluster "${ECS_CLUSTER}" \
            --service "${ECS_SERVICE_FRONTEND}" \
            --task-definition "${FRONTEND_TASK_ARN}" \
            --force-new-deployment \
            --output text 2>&1 | tee -a "${LOG_FILE}"
        success "フロントエンドECSサービス: 更新リクエスト送信完了"
    fi

    # -----------------------------------------------------------------
    # Step 5: デプロイ完了待ち（オプション）
    # -----------------------------------------------------------------
    info "--- Step 5: デプロイ安定化待ち ---"
    info "ECSサービスのローリングデプロイが開始されました。"
    info "完了確認コマンド:"

    if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
        info "  バックエンド: aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE_BACKEND} --region ${AWS_ECR_REGION}"
    fi
    if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
        info "  フロントエンド: aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE_FRONTEND} --region ${AWS_ECR_REGION}"
    fi

    # 待機するかどうか確認
    read -r -t 10 -p "デプロイ完了まで待機しますか？ [y/N] (10秒でスキップ): " WAIT_STABLE || true
    if [[ "${WAIT_STABLE:-N}" =~ ^[Yy]$ ]]; then
        info "デプロイ完了を待機中（最大10分）..."
        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_BACKEND}" \
                --region "${AWS_ECR_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            success "バックエンド: デプロイ完了"
        fi
        if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_FRONTEND}" \
                --region "${AWS_ECR_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            success "フロントエンド: デプロイ完了"
        fi
    else
        info "待機をスキップしました。AWSコンソールでデプロイ状況を確認してください。"
    fi

    # -----------------------------------------------------------------
    # 完了
    # -----------------------------------------------------------------
    info "============================================="
    success "デプロイリクエスト送信完了！"
    info "============================================="
    info ""
    info "デプロイ情報:"
    info "  イメージタグ: ${IMAGE_TAG}"
    info "  ECSクラスター: ${ECS_CLUSTER}"
    info "  リージョン: ${AWS_ECR_REGION}"
    info ""
    info "AWSコンソールでデプロイ状況を確認:"
    info "  https://console.aws.amazon.com/ecs/home?region=${AWS_ECR_REGION}#/clusters/${ECS_CLUSTER}/services"
    info ""
    info "CloudWatch Logs でログを確認:"
    info "  Backend:  https://console.aws.amazon.com/cloudwatch/home?region=${AWS_ECR_REGION}#logsV2:log-groups/log-group/\$252Fecs\$252Fmmdpf-backend"
    info "  Frontend: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_ECR_REGION}#logsV2:log-groups/log-group/\$252Fecs\$252Fmmdpf-frontend"
    info ""
    info "デプロイログ: ${LOG_FILE}"
}

main "$@"
