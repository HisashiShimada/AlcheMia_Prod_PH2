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
#   --check         デプロイせず現在のECSサービス状態のみ確認
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
readonly DB_HOST="${DB_HOST:-DB_HOST:-alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com}"
readonly DB_PORT="${DB_PORT:-5432}"
readonly DB_PASSWORD="${DB_PASSWORD:-maiml_user}"

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
CHECK_ONLY=false
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
# ECSサービスデプロイ状態確認関数
# 引数: $1=ラベル（表示名）, $2=ECSサービス名
# =============================================================================
check_deploy_status() {
    local label="$1"
    local service_name="$2"

    info "  [${label}] サービス状態を取得中..."

    # サービス基本情報（タスク数・ステータス）
    local svc_json
    svc_json=$(aws ecs describe-services \
        --cluster "${ECS_CLUSTER}" \
        --services "${service_name}" \
        --region "${AWS_REGION}" \
        --output json 2>/dev/null) || { warn "  [${label}] サービス情報の取得に失敗しました"; return; }

    local desired running pending status task_def_arn
    desired=$(echo "${svc_json}" | grep '"desiredCount"'  | head -1 | sed 's/[^0-9]//g')
    running=$(echo "${svc_json}" | grep '"runningCount"'  | head -1 | sed 's/[^0-9]//g')
    pending=$(echo "${svc_json}" | grep '"pendingCount"'  | head -1 | sed 's/[^0-9]//g')
    status=$(echo "${svc_json}"  | grep '"status"'        | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    task_def_arn=$(echo "${svc_json}" | grep '"taskDefinition"' | head -1 | sed 's/.*: "\(.*\)".*/\1/')

    # タスク定義リビジョン番号を末尾から抽出
    local task_def_rev
    task_def_rev=$(echo "${task_def_arn}" | sed 's/.*://')

    # タスク定義ファミリー名を抽出して最新Revを取得
    local task_def_family latest_rev
    task_def_family=$(echo "${task_def_arn}" | sed 's|.*/task-definition/||' | sed 's/:[0-9]*$//')
    local latest_info latest_rev latest_registered_at
    latest_info=$(aws ecs describe-task-definition \
        --task-definition "${task_def_family}" \
        --region "${AWS_REGION}" \
        --query '[taskDefinition.revision, taskDefinition.registeredAt]' \
        --output text 2>/dev/null || echo "取得失敗")
    latest_rev=$(echo "${latest_info}" | awk '{print $1}')
    latest_registered_at=$(echo "${latest_info}" | awk '{print $2}')
    [[ "${latest_rev}" == "取得失敗" ]] && latest_rev="取得失敗" && latest_registered_at=""

    # running == desired かつ pending == 0 なら正常
    local health_icon
    if [[ "${running}" == "${desired}" && "${pending}" == "0" && "${desired}" != "0" ]]; then
        health_icon="✅"
    elif [[ "${pending}" != "0" ]]; then
        health_icon="🔄"
    else
        health_icon="⚠️ "
    fi

    info "  ┌─────────────────────────────────────────────"
    info "  │ ${health_icon} [${label}] ${service_name}"
    info "  │   ステータス    : ${status}"
    info "  │   desired       : ${desired}"
    info "  │   running       : ${running}"
    info "  │   pending       : ${pending}"
    # タスク定義Revと最新Revを比較して表示（登録日時付き）
    if [[ "${latest_rev}" == "取得失敗" ]]; then
        info "  │   タスク定義Rev : ${task_def_rev} / 最新: (取得失敗)"
    elif [[ "${latest_rev}" == "${task_def_rev}" ]]; then
        info "  │   タスク定義Rev : ${task_def_rev} / 最新: ${latest_rev} ✅ 最新  (登録日時: ${latest_registered_at})"
    else
        warn "  │   タスク定義Rev : ${task_def_rev} / 最新: ${latest_rev} ⚠️  最新ではありません  (最新登録日時: ${latest_registered_at})"
    fi

    # 稼働中タスクのイメージタグを確認
    local task_arns
    task_arns=$(aws ecs list-tasks \
        --cluster "${ECS_CLUSTER}" \
        --service-name "${service_name}" \
        --desired-status RUNNING \
        --region "${AWS_REGION}" \
        --query 'taskArns' \
        --output text 2>/dev/null || echo "")

    if [[ -n "${task_arns}" && "${task_arns}" != "None" ]]; then
        # タスク詳細からコンテナイメージを取得（最初のタスクのみ）
        local first_task
        first_task=$(echo "${task_arns}" | awk '{print $1}')
        local images
        images=$(aws ecs describe-tasks \
            --cluster "${ECS_CLUSTER}" \
            --tasks "${first_task}" \
            --region "${AWS_REGION}" \
            --query 'tasks[0].containers[*].image' \
            --output text 2>/dev/null | tr '\t' '\n' || echo "取得失敗")
        info "  │   稼働中イメージ:"
        while IFS= read -r img; do
            [[ -z "${img}" ]] && continue
            # イメージ名のリポジトリ部分を短縮して表示
            local short_img
            short_img=$(echo "${img}" | sed "s|${ECR_BASE}/||")
            info "  │     - ${short_img}"
        done <<< "${images}"
    else
        info "  │   稼働中イメージ: (稼働タスクなし)"
    fi

    # 直近3件のサービスイベント（デプロイ進行状況）
    info "  │   直近イベント:"
    aws ecs describe-services \
        --cluster "${ECS_CLUSTER}" \
        --services "${service_name}" \
        --region "${AWS_REGION}" \
        --query 'services[0].events[0:3].{時刻:createdAt,メッセージ:message}' \
        --output table 2>/dev/null | while IFS= read -r line; do
        info "  │     ${line}"
    done | tee -a "${LOG_FILE}" || true

    info "  └─────────────────────────────────────────────"

    # 判定結果をログに明示
    if [[ "${running}" == "${desired}" && "${pending}" == "0" && "${desired}" != "0" ]]; then
        success "[${label}] デプロイ正常完了 (running=${running}/${desired}, pending=0)"
    elif [[ "${pending}" != "0" ]]; then
        warn "[${label}] デプロイ進行中 (running=${running}/${desired}, pending=${pending})"
    else
        warn "[${label}] 要確認 (running=${running}/${desired}, pending=${pending})"
    fi
}

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
        --check)      CHECK_ONLY=true;    shift ;;
        --tag)        IMAGE_TAG="$2";     shift 2 ;;
        -h|--help)
            sed -n '3,35p' "$0"
            exit 0
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--no-build] [--no-push] [--no-deploy] [--migrate] [--backend] [--nginx] [--wait] [--check] [--tag <TAG>]"
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
    # --check モード: デプロイせず現在のECSサービス状態のみ表示
    # ------------------------------------------------------------------
    if [[ "${CHECK_ONLY}" == "true" ]]; then
        info "--- [--check] 現在のECSサービス状態確認 ---"

        if ! command -v aws &>/dev/null; then
            error "AWS CLI がインストールされていません"
            exit 1
        fi
        local caller_identity
        if ! caller_identity=$(aws sts get-caller-identity --output json 2>&1); then
            error "AWS 認証に失敗しました"
            exit 1
        fi
        local auth_account
        auth_account=$(echo "${caller_identity}" | grep '"Account"' | sed 's/.*: "\([^"]*\)".*/\1/')
        success "AWS 認証: アカウント ${auth_account}"

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi
        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            check_deploy_status "Nginx+Frontend" "${ECS_SERVICE_NGINX}"
        fi

        info ""
        info "  AWSコンソール:"
        info "    https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
        info ""
        info "  ログ: ${LOG_FILE}"
        exit 0
    fi

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

            local tmp_task_def_backend
            tmp_task_def_backend=$(mktemp /tmp/task-def-backend-XXXXXX.json)
            echo "${task_def_json}" > "${tmp_task_def_backend}"

            BACKEND_TASK_ARN=$(aws ecs register-task-definition \
                --region "${AWS_REGION}" \
                --cli-input-json "file://${tmp_task_def_backend}" \
                --query 'taskDefinition.taskDefinitionArn' \
                --output text 2>&1)
            rm -f "${tmp_task_def_backend}"

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

            local tmp_task_def_nginx
            tmp_task_def_nginx=$(mktemp /tmp/task-def-nginx-XXXXXX.json)
            echo "${task_def_json}" > "${tmp_task_def_nginx}"

            NGINX_TASK_ARN=$(aws ecs register-task-definition \
                --region "${AWS_REGION}" \
                --cli-input-json "file://${tmp_task_def_nginx}" \
                --query 'taskDefinition.taskDefinitionArn' \
                --output text 2>&1)
            rm -f "${tmp_task_def_nginx}"

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

        # デプロイリクエスト送信直後の即時ステータス確認
        # （ECSがローリングアップデートを開始した時点の状態を表示）
        info "--- Step 6.5: デプロイ開始直後のECSサービス状態確認 ---"
        info "  ※ ローリングアップデート開始直後のため pending > 0 は正常です"
        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi
        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            check_deploy_status "Nginx+Frontend" "${ECS_SERVICE_NGINX}"
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
            success "[Backend] 安定化シグナル受信 — 詳細確認中..."
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi

        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            info "[Nginx] 安定化を待機中..."
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX}" \
                --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] 安定化シグナル受信 — 詳細確認中..."
            check_deploy_status "Nginx+Frontend" "${ECS_SERVICE_NGINX}"
        fi

        # NLBヘルスチェック（アプリ疎通確認）
        info "--- NLBヘルスチェック ---"
        local nlb_url="https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com"
        if curl -sf --max-time 15 "${nlb_url}/api/health" >/dev/null 2>&1; then
            success "NLBヘルスチェック: OK (${nlb_url}/api/health)"
        else
            warn "NLBヘルスチェック: 応答なし (${nlb_url}/api/health)"
            warn "  → サービス起動直後の場合は数秒後に再確認してください"
            warn "  → 継続する場合は CloudWatch Logs を確認してください"
        fi
    else
        info "--- Step 7: 安定化待ちをスキップ（--wait を付けると待機・詳細確認）---"
    fi

    # ------------------------------------------------------------------
    # 完了サマリー（現在のECSサービス状態を実際に取得して表示）
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

    if [[ "${DEPLOY}" == "true" ]]; then
        info "  ▼ 現在のECSサービス状態（デプロイ後）"
        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi
        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            check_deploy_status "Nginx+Frontend" "${ECS_SERVICE_NGINX}"
        fi
        info ""
        if [[ "${WAIT_STABLE}" == "false" ]]; then
            info "  ℹ️  --wait オプションなしのため、デプロイは非同期で進行中です"
            info "     以下のコマンドで状態を再確認できます:"
            info "       ./scripts/deploy.ecr.sh --check"
            info ""
        fi
    fi

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
