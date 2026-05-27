#!/bin/bash
# =============================================================================
# Alchemia Staging - 本番検証環境デプロイスクリプト（統合版）
# =============================================================================
#
# 【対応構成】
#
#   [prod-verification] ALB追加 / nginx無し構成検証 (デフォルト)
#     ・フロントエンドのみ独立した ECS サービスとして配置
#     ・nginx なし、ALB (prod-verification-alb) が直接フロントエンドに転送
#     ・バックエンドは既存 alchemia-backend-service を共用
#     ・前提: prod-verification-alb-build-guide.md の STEP 1〜10 が完了していること
#
#   [phase1] ALB（HTTP:80）＋ NLB（HTTPS:443）共存構成
#     ・nginx を更新する際は以下の2サービスを両方更新:
#         alchemia-nginx-service       (ALB → HTTP:80)
#         alchemia-nginx-service-https (NLB → TCP:443)
#     ・フェーズ2（NLBのみ）に移行後は通常の deploy.ecr.sh を使用
#
#   [all] 上記2構成を順番にデプロイ
#
# 使い方:
#   chmod +x scripts/alchemia-staging/deploy.prod-verification.sh
#   ./scripts/alchemia-staging/deploy.prod-verification.sh [OPTIONS]
#
# オプション:
#   --mode <MODE>     デプロイ構成を選択（デフォルト: prod-verification）
#                       prod-verification : ALB追加/nginx無し構成のみ
#                       phase1            : ALB+NLB共存構成のみ
#                       all               : 両方を順にデプロイ
#   --no-build        イメージのビルドをスキップ（既存イメージを再デプロイ）
#   --no-push         ECRへのプッシュをスキップ
#   --no-deploy       ECSデプロイをスキップ（ビルド＆プッシュのみ）
#   --alb-dns <DNS>   [prod-verification/all] ALB の DNS 名を直接指定
#                     （省略時は AWS CLI で自動取得）
#                     例: prod-verification-alb-xxxxxxxxx.ap-northeast-1.elb.amazonaws.com
#   --migrate         [phase1/all] DBマイグレーションを実行
#   --backend         [phase1/all] バックエンドのみ対象
#   --nginx           [phase1/all] nginx（frontend含む）のみ対象
#   --wait            ECSサービス安定化まで待機（デフォルト: スキップ）
#   --check           デプロイせず現在のECSサービス状態のみ確認
#   --health          [prod-verification/all] デプロイ後にヘルスチェック（curl）を実行
#   --tag <TAG>       イメージタグを指定（デフォルト: staging）
#   --help            このヘルプを表示
#
# 実行例:
#   # --- prod-verification モード ---
#   # フルデプロイ（ビルド→プッシュ→ECSデプロイ）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh
#
#   # ALB DNS を手動指定してフルデプロイ
#   ./scripts/alchemia-staging/deploy.prod-verification.sh \
#     --alb-dns prod-verification-alb-123456789.ap-northeast-1.elb.amazonaws.com
#
#   # ビルドせず再デプロイ（既存イメージを使用）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --no-build --no-push
#
#   # 安定化まで待機＋ヘルスチェック
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --wait --health
#
#   # --- phase1 モード ---
#   # フルデプロイ（ALB+NLB共存）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1
#
#   # DBマイグレーション付きフルデプロイ
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --migrate
#
#   # バックエンドのみ、安定化まで待機
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --backend --wait
#
#   # nginx（frontend含む）のみデプロイ（両サービス更新）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --nginx
#
#   # --- all モード ---
#   # 両構成を順番にフルデプロイ
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode all
#
#   # --- 共通 ---
#   # 現在のサービス状態を確認（全構成）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --mode all --check
#
#   # ビルド＆プッシュのみ（ECSデプロイなし）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --no-deploy
# =============================================================================

set -euo pipefail

# =============================================================================
# 共通固定設定
# =============================================================================
readonly AWS_ACCOUNT_ID="137068252939"
readonly AWS_REGION="ap-northeast-1"
readonly ECS_CLUSTER="alchemia-staging"
readonly ECR_REPO_FRONTEND="mmdpf-frontend"
readonly ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
readonly ECR_FRONTEND="${ECR_BASE}/${ECR_REPO_FRONTEND}"

# =============================================================================
# prod-verification 構成の固定設定
# =============================================================================
readonly ECS_SERVICE_FRONTEND="prod-frontend-service"
readonly ALB_NAME="prod-verification-alb"
readonly TASK_DEF_FRONTEND_FILE="aws/ecs-task-definition-prod-frontend.json"

# =============================================================================
# phase1（ALB+NLB共存）構成の固定設定
# =============================================================================
readonly ECS_SERVICE_BACKEND="alchemia-backend-service"
readonly ECS_SERVICE_NGINX="alchemia-nginx-service"
readonly ECS_SERVICE_NGINX_HTTPS="alchemia-nginx-service-https"
readonly ECR_REPO_BACKEND="mmdpf-backend"
readonly ECR_REPO_NGINX="mmdpf-nginx"
readonly ECR_BACKEND="${ECR_BASE}/${ECR_REPO_BACKEND}"
readonly ECR_NGINX="${ECR_BASE}/${ECR_REPO_NGINX}"
readonly TASK_DEF_BACKEND_FILE="aws/ecs-task-definition-alchemia-backend.json"
readonly TASK_DEF_NGINX_FILE="aws/ecs-task-definition-alchemia-nginx.json"

# DB接続情報（--migrate 使用時。環境変数または .env から取得）
readonly DB_USER="${DB_USER:-maiml_user}"
readonly DB_NAME="${DB_NAME:-maiml_db}"
readonly DB_HOST="${DB_HOST:-alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com}"
readonly DB_PORT="${DB_PORT:-5432}"
readonly DB_PASSWORD="${DB_PASSWORD:-maiml_user}"

# =============================================================================
# パス設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-prod-verification-$(date +%Y%m%d_%H%M%S).log"
MIGRATIONS_DIR="${PROJECT_DIR}/backend/migrations"

# =============================================================================
# デフォルトオプション
# =============================================================================
DEPLOY_MODE="prod-verification"  # prod-verification / phase1 / all
BUILD=true
PUSH=true
DEPLOY=true
MIGRATE=false
DEPLOY_BACKEND=true
DEPLOY_NGINX=true
WAIT_STABLE=false
CHECK_ONLY=false
HEALTH_CHECK=false
IMAGE_TAG="staging"
ALB_DNS_OVERRIDE=""

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
# ALB DNS 名取得関数（prod-verification 用）
# --alb-dns オプション指定時はそちらを優先、なければ AWS CLI で取得
# =============================================================================
get_alb_dns() {
    if [[ -n "${ALB_DNS_OVERRIDE}" ]]; then
        echo "${ALB_DNS_OVERRIDE}"
        return
    fi

    local dns
    dns=$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].DNSName' \
        --output text 2>/dev/null || echo "")

    if [[ -z "${dns}" || "${dns}" == "None" ]]; then
        error "ALB '${ALB_NAME}' の DNS 名を取得できませんでした"
        error "ALB が作成済みであるか確認するか、--alb-dns オプションで直接指定してください"
        exit 1
    fi

    echo "${dns}"
}

# =============================================================================
# ECSサービスデプロイ状態確認関数
# 引数: $1=ラベル（表示名）, $2=ECSサービス名
# =============================================================================
check_deploy_status() {
    local label="$1"
    local service_name="$2"

    info "  [${label}] サービス状態を取得中..."

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

    local task_def_rev
    task_def_rev=$(echo "${task_def_arn}" | sed 's/.*://')

    local task_def_family latest_rev latest_registered_at latest_info
    task_def_family=$(echo "${task_def_arn}" | sed 's|.*/task-definition/||' | sed 's/:[0-9]*$//')
    latest_info=$(aws ecs describe-task-definition \
        --task-definition "${task_def_family}" \
        --region "${AWS_REGION}" \
        --query '[taskDefinition.revision, taskDefinition.registeredAt]' \
        --output text 2>/dev/null || echo "取得失敗")
    latest_rev=$(echo "${latest_info}" | awk '{print $1}')
    latest_registered_at=$(echo "${latest_info}" | awk '{print $2}')
    [[ "${latest_rev}" == "取得失敗" ]] && latest_rev="取得失敗" && latest_registered_at=""

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
    if [[ "${latest_rev}" == "取得失敗" ]]; then
        info "  │   タスク定義Rev : ${task_def_rev} / 最新: (取得失敗)"
    elif [[ "${latest_rev}" == "${task_def_rev}" ]]; then
        info "  │   タスク定義Rev : ${task_def_rev} / 最新: ${latest_rev} ✅ 最新  (登録日時: ${latest_registered_at})"
    else
        warn "  │   タスク定義Rev : ${task_def_rev} / 最新: ${latest_rev} ⚠️  最新ではありません  (最新登録日時: ${latest_registered_at})"
    fi

    local task_arns
    task_arns=$(aws ecs list-tasks \
        --cluster "${ECS_CLUSTER}" \
        --service-name "${service_name}" \
        --desired-status RUNNING \
        --region "${AWS_REGION}" \
        --query 'taskArns' \
        --output text 2>/dev/null || echo "")

    if [[ -n "${task_arns}" && "${task_arns}" != "None" ]]; then
        local first_task images
        first_task=$(echo "${task_arns}" | awk '{print $1}')
        images=$(aws ecs describe-tasks \
            --cluster "${ECS_CLUSTER}" \
            --tasks "${first_task}" \
            --region "${AWS_REGION}" \
            --query 'tasks[0].containers[*].image' \
            --output text 2>/dev/null | tr '\t' '\n' || echo "取得失敗")
        info "  │   稼働中イメージ:"
        while IFS= read -r img; do
            [[ -z "${img}" ]] && continue
            local short_img
            short_img=$(echo "${img}" | sed "s|${ECR_BASE}/||")
            info "  │     - ${short_img}"
        done <<< "${images}"
    else
        info "  │   稼働中イメージ: (稼働タスクなし)"
    fi

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

    if [[ "${running}" == "${desired}" && "${pending}" == "0" && "${desired}" != "0" ]]; then
        success "[${label}] デプロイ正常完了 (running=${running}/${desired}, pending=0)"
    elif [[ "${pending}" != "0" ]]; then
        warn "[${label}] デプロイ進行中 (running=${running}/${desired}, pending=${pending})"
    else
        warn "[${label}] 要確認 (running=${running}/${desired}, pending=${pending})"
    fi
}

# =============================================================================
# ターゲットグループのヘルス確認関数
# 引数: $1=ラベル, $2=ターゲットグループ名
# =============================================================================
check_target_group_health() {
    local label="$1"
    local tg_name="$2"

    local tg_arn
    tg_arn=$(aws elbv2 describe-target-groups \
        --names "${tg_name}" \
        --region "${AWS_REGION}" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")

    if [[ -z "${tg_arn}" || "${tg_arn}" == "None" ]]; then
        warn "  [${label}] ターゲットグループ '${tg_name}' が見つかりません（作成前の可能性）"
        return
    fi

    local health_json
    health_json=$(aws elbv2 describe-target-health \
        --target-group-arn "${tg_arn}" \
        --region "${AWS_REGION}" \
        --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State}' \
        --output table 2>/dev/null || echo "取得失敗")

    info "  [${label}] ターゲットヘルス (${tg_name}):"
    echo "${health_json}" | while IFS= read -r line; do
        info "    ${line}"
    done | tee -a "${LOG_FILE}" || true
}

# =============================================================================
# 引数解析
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOY_MODE="$2"
            if [[ "${DEPLOY_MODE}" != "prod-verification" && "${DEPLOY_MODE}" != "phase1" && "${DEPLOY_MODE}" != "all" ]]; then
                error "--mode には prod-verification / phase1 / all を指定してください"
                exit 1
            fi
            shift 2
            ;;
        --no-build)   BUILD=false;              shift ;;
        --no-push)    PUSH=false;               shift ;;
        --no-deploy)  DEPLOY=false;             shift ;;
        --migrate)    MIGRATE=true;             shift ;;
        --backend)    DEPLOY_NGINX=false;       shift ;;
        --nginx)      DEPLOY_BACKEND=false;     shift ;;
        --wait)       WAIT_STABLE=true;         shift ;;
        --check)      CHECK_ONLY=true;          shift ;;
        --health)     HEALTH_CHECK=true;        shift ;;
        --alb-dns)    ALB_DNS_OVERRIDE="$2";    shift 2 ;;
        --tag)        IMAGE_TAG="$2";           shift 2 ;;
        -h|--help)
            sed -n '3,78p' "$0"
            exit 0
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--mode <prod-verification|phase1|all>] [--no-build] [--no-push] [--no-deploy] [--alb-dns <DNS>] [--migrate] [--backend] [--nginx] [--wait] [--check] [--health] [--tag <TAG>]"
            exit 1
            ;;
    esac
done

# =============================================================================
# AWS 認証・ECSクラスター 前提条件チェック関数（共通）
# =============================================================================
check_prerequisites() {
    info "--- Step 1: 前提条件チェック ---"

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
}

# =============================================================================
# ECR ログイン関数（共通）
# =============================================================================
ecr_login() {
    info "--- ECR ログイン ---"
    aws ecr get-login-password --region "${AWS_REGION}" \
        | docker login --username AWS --password-stdin "${ECR_BASE}" 2>&1 | tee -a "${LOG_FILE}"
    success "ECR ログイン完了: ${ECR_BASE}"
}

# =============================================================================
# prod-verification 構成のデプロイ関数
# =============================================================================
deploy_prod_verification() {
    info "============================================================"
    info "  [prod-verification] ALB追加/nginx無し構成検証 デプロイ開始"
    info "  対象サービス: ${ECS_SERVICE_FRONTEND}"
    info "============================================================"

    # タスク定義ファイルの存在確認
    if [[ "${DEPLOY}" == "true" ]]; then
        if [[ ! -f "${PROJECT_DIR}/${TASK_DEF_FRONTEND_FILE}" ]]; then
            error "タスク定義ファイルが見つかりません: ${TASK_DEF_FRONTEND_FILE}"
            exit 1
        fi
        success "タスク定義ファイル: ${TASK_DEF_FRONTEND_FILE} ✅"
    fi

    if [[ "${BUILD}" == "true" ]]; then
        if ! command -v docker &>/dev/null; then
            error "Docker がインストールされていません"
            exit 1
        fi
        success "Docker: $(docker --version | head -1)"
    fi

    # ALB DNS 名の取得
    local ALB_DNS=""
    if [[ "${DEPLOY}" == "true" || "${HEALTH_CHECK}" == "true" ]]; then
        info "--- [prod-verification] ALB DNS 名の確認 ---"
        ALB_DNS=$(get_alb_dns)
        success "ALB DNS 名: ${ALB_DNS}"
    fi

    # Docker イメージ ビルド（frontend のみ）
    if [[ "${BUILD}" == "true" ]]; then
        info "--- [prod-verification] Docker イメージ ビルド ---"
        info "[Frontend] ビルド中... (${ECR_FRONTEND}:${IMAGE_TAG})"
        docker build \
            --no-cache \
            -f "${PROJECT_DIR}/frontend/Dockerfile.prod" \
            -t "${ECR_FRONTEND}:${IMAGE_TAG}" \
            "${PROJECT_DIR}/frontend" 2>&1 | tee -a "${LOG_FILE}"
        success "[Frontend] ビルド完了"
    else
        warn "--- [prod-verification] ビルドをスキップ（--no-build）---"
    fi

    # ECR プッシュ
    if [[ "${PUSH}" == "true" ]]; then
        info "--- [prod-verification] ECR プッシュ ---"
        info "[Frontend] プッシュ中... ${ECR_FRONTEND}:${IMAGE_TAG}"
        docker push "${ECR_FRONTEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
        success "[Frontend] プッシュ完了: ${ECR_FRONTEND}:${IMAGE_TAG}"
    else
        warn "--- [prod-verification] ECRプッシュをスキップ（--no-push）---"
    fi

    # ECSタスク定義の登録 & サービス更新
    if [[ "${DEPLOY}" == "true" ]]; then
        info "--- [prod-verification] ECSタスク定義の登録 & サービス更新 ---"
        info "  NEXT_PUBLIC_API_URL = https://${ALB_DNS}"

        local task_def_json
        task_def_json=$(sed \
            -e "s|<ALB_DNS>|${ALB_DNS}|g" \
            -e "s|:staging\"|:${IMAGE_TAG}\"|g" \
            "${PROJECT_DIR}/${TASK_DEF_FRONTEND_FILE}" \
            | grep -v '"_comment' \
        )

        if echo "${task_def_json}" | grep -q '<ALB_DNS>'; then
            error "タスク定義内の <ALB_DNS> が置換できていません"
            exit 1
        fi
        success "  <ALB_DNS> の置換完了: https://${ALB_DNS}"

        local tmp_task_def
        tmp_task_def=$(mktemp /tmp/task-def-prod-frontend-XXXXXX.json)
        echo "${task_def_json}" > "${tmp_task_def}"

        info "[prod-frontend] タスク定義を登録中..."
        local FRONTEND_TASK_ARN
        FRONTEND_TASK_ARN=$(aws ecs register-task-definition \
            --region "${AWS_REGION}" \
            --cli-input-json "file://${tmp_task_def}" \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text 2>&1)
        rm -f "${tmp_task_def}"

        if [[ -z "${FRONTEND_TASK_ARN}" || "${FRONTEND_TASK_ARN}" == "None" ]]; then
            error "[prod-frontend] タスク定義の登録に失敗しました"
            exit 1
        fi
        success "[prod-frontend] タスク定義登録完了: ${FRONTEND_TASK_ARN}"

        local svc_status
        svc_status=$(aws ecs describe-services \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE_FRONTEND}" \
            --region "${AWS_REGION}" \
            --query 'services[0].status' \
            --output text 2>/dev/null || echo "MISSING")

        if [[ "${svc_status}" != "ACTIVE" ]]; then
            error "ECSサービス '${ECS_SERVICE_FRONTEND}' が見つからないか ACTIVE ではありません（status: ${svc_status}）"
            error "prod-verification-alb-build-guide.md の STEP 10 を実行して ${ECS_SERVICE_FRONTEND} を作成してください"
            exit 1
        fi

        info "[prod-frontend] ECSサービスを更新中..."
        aws ecs update-service \
            --region "${AWS_REGION}" \
            --cluster "${ECS_CLUSTER}" \
            --service "${ECS_SERVICE_FRONTEND}" \
            --task-definition "${FRONTEND_TASK_ARN}" \
            --force-new-deployment \
            --query 'service.{service:serviceName,running:runningCount,pending:pendingCount,desired:desiredCount}' \
            --output table 2>&1 | tee -a "${LOG_FILE}"
        success "[prod-frontend] サービス更新リクエスト送信完了"

        info "--- [prod-verification] デプロイ開始直後のECSサービス状態確認 ---"
        info "  ※ ローリングアップデート開始直後のため pending > 0 は正常です"
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"
    else
        warn "--- [prod-verification] ECSデプロイをスキップ（--no-deploy）---"
    fi

    # ECSサービス安定化待ち
    if [[ "${WAIT_STABLE}" == "true" && "${DEPLOY}" == "true" ]]; then
        info "--- [prod-verification] ECSサービス安定化待ち（最大10分）---"
        info "[prod-frontend] 安定化を待機中..."
        aws ecs wait services-stable \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE_FRONTEND}" \
            --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
        success "[prod-frontend] 安定化シグナル受信 — 詳細確認中..."
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"

        info "--- [prod-verification] ターゲットグループのヘルス確認 ---"
        check_target_group_health "frontend-tg" "prod-frontend-tg"
        check_target_group_health "backend-tg"  "prod-backend-tg"
    else
        info "--- [prod-verification] 安定化待ちをスキップ（--wait を付けると待機・詳細確認）---"
    fi

    # ヘルスチェック
    if [[ "${HEALTH_CHECK}" == "true" || "${WAIT_STABLE}" == "true" ]]; then
        if [[ -n "${ALB_DNS:-}" ]]; then
            info "--- [prod-verification] ALB ヘルスチェック (curl) ---"
            info "  対象: https://${ALB_DNS}"

            info "  [Frontend] GET https://${ALB_DNS}/"
            local frontend_status
            frontend_status=$(curl -sk --max-time 20 \
                -o /dev/null -w "%{http_code}" \
                "https://${ALB_DNS}/" 2>/dev/null || echo "000")
            if [[ "${frontend_status}" == "200" ]]; then
                success "  [Frontend] HTTP ${frontend_status} ✅"
            else
                warn "  [Frontend] HTTP ${frontend_status} ⚠️  (期待: 200)"
            fi

            info "  [Backend API] GET https://${ALB_DNS}/api/health"
            local api_response api_status
            api_status=$(curl -sk --max-time 20 \
                -o /tmp/health_response.txt -w "%{http_code}" \
                "https://${ALB_DNS}/api/health" 2>/dev/null || echo "000")
            api_response=$(cat /tmp/health_response.txt 2>/dev/null || echo "")
            rm -f /tmp/health_response.txt
            if [[ "${api_status}" == "200" ]]; then
                success "  [Backend API] HTTP ${api_status} / レスポンス: ${api_response} ✅"
            else
                warn "  [Backend API] HTTP ${api_status} / レスポンス: ${api_response} ⚠️  (期待: 200)"
            fi

            info "  [Redirect] HTTP → HTTPS リダイレクト確認"
            local redirect_status
            redirect_status=$(curl -s --max-time 10 \
                -o /dev/null -w "%{http_code}" \
                "http://${ALB_DNS}/" 2>/dev/null || echo "000")
            if [[ "${redirect_status}" == "301" || "${redirect_status}" == "302" ]]; then
                success "  [Redirect] HTTP ${redirect_status} → HTTPS リダイレクト ✅"
            else
                warn "  [Redirect] HTTP ${redirect_status} ⚠️  (期待: 301 or 302)"
            fi
        else
            warn "--- [prod-verification] ALB DNS が不明のためヘルスチェックをスキップします ---"
        fi
    fi

    # サマリー表示
    info ""
    info "============================================================"
    success "  [prod-verification] デプロイ完了！"
    info "============================================================"
    if [[ -n "${ALB_DNS:-}" ]]; then
        info "    ALB DNS      : ${ALB_DNS}"
        info "    アクセス URL : https://${ALB_DNS}/"
        info "    API URL      : https://${ALB_DNS}/api/health"
    fi
    if [[ "${DEPLOY}" == "true" ]]; then
        info "  ▼ 現在のECSサービス状態（デプロイ後）"
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"
        if [[ "${WAIT_STABLE}" == "false" ]]; then
            info "  ℹ️  --wait オプションなしのため、デプロイは非同期で進行中です"
            info "     以下のコマンドで状態を再確認できます:"
            info "       ./scripts/alchemia-staging/deploy.prod-verification.sh --mode prod-verification --check"
        fi
    fi
    info "  CloudWatch Logs:"
    info "    Frontend: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Fprod-frontend"
    info "  ALB コンソール: https://console.aws.amazon.com/ec2/v2/home?region=${AWS_REGION}#LoadBalancers:search=${ALB_NAME}"
    info "============================================================"
}

# =============================================================================
# phase1（ALB+NLB共存）構成のデプロイ関数
# =============================================================================
deploy_phase1() {
    info "============================================================"
    info "  [phase1] ALB（HTTP:80）＋NLB（HTTPS:443）共存構成 デプロイ開始"
    if [[ "${DEPLOY_BACKEND}" == "true" && "${DEPLOY_NGINX}" == "true" ]]; then
        info "  対象: backend + nginx(frontend含む)"
    elif [[ "${DEPLOY_BACKEND}" == "true" ]]; then
        info "  対象: backend のみ"
    else
        info "  対象: nginx(frontend含む) のみ"
    fi
    if [[ "${DEPLOY_NGINX}" == "true" ]]; then
        info "  ⚠️  [phase1] nginx更新対象サービス:"
        info "       - ${ECS_SERVICE_NGINX}       (ALB → HTTP:80)"
        info "       - ${ECS_SERVICE_NGINX_HTTPS}  (NLB → TCP:443)"
    fi
    info "============================================================"

    # タスク定義ファイルの存在確認
    if [[ "${DEPLOY}" == "true" ]]; then
        if [[ "${DEPLOY_BACKEND}" == "true" && ! -f "${PROJECT_DIR}/${TASK_DEF_BACKEND_FILE}" ]]; then
            error "バックエンドタスク定義ファイルが見つかりません: ${TASK_DEF_BACKEND_FILE}"
            exit 1
        fi
        if [[ "${DEPLOY_NGINX}" == "true" && ! -f "${PROJECT_DIR}/${TASK_DEF_NGINX_FILE}" ]]; then
            error "nginx タスク定義ファイルが見つかりません: ${TASK_DEF_NGINX_FILE}"
            exit 1
        fi
    fi

    if [[ "${BUILD}" == "true" ]]; then
        if ! command -v docker &>/dev/null; then
            error "Docker がインストールされていません"
            exit 1
        fi
        success "Docker: $(docker --version | head -1)"
    fi

    # フェーズ1: nginx-service-https の存在確認
    if [[ "${DEPLOY_NGINX}" == "true" && "${DEPLOY}" == "true" ]]; then
        local https_svc_status
        https_svc_status=$(aws ecs describe-services \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE_NGINX_HTTPS}" \
            --region "${AWS_REGION}" \
            --query 'services[0].status' \
            --output text 2>/dev/null || echo "MISSING")
        if [[ "${https_svc_status}" != "ACTIVE" ]]; then
            warn "[phase1] ${ECS_SERVICE_NGINX_HTTPS} が見つからないか ACTIVE ではありません（status: ${https_svc_status}）"
            warn "  → フェーズ1のNLB用サービスがまだ作成されていない可能性があります"
            warn "  → nlb-migration-guide.md の Step 5 を参照してサービスを作成してください"
            warn "  → ${ECS_SERVICE_NGINX} のみ更新して続行します"
        else
            success "[phase1] ${ECS_SERVICE_NGINX_HTTPS}: ACTIVE（NLBサービス確認OK）"
        fi
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

    # Docker イメージ ビルド
    if [[ "${BUILD}" == "true" ]]; then
        info "--- [phase1] Docker イメージ ビルド ---"

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
        warn "--- [phase1] ビルドをスキップ（--no-build）---"
    fi

    # ECR プッシュ
    if [[ "${PUSH}" == "true" ]]; then
        info "--- [phase1] ECR プッシュ ---"

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
        warn "--- [phase1] ECRプッシュをスキップ（--no-push）---"
    fi

    # DBマイグレーション
    if [[ "${MIGRATE}" == "true" ]]; then
        info "--- [phase1] DBマイグレーション実行（Aurora 直接接続）---"
        info "  Aurora エンドポイント: ${DB_HOST}:${DB_PORT}"
        info "  DB: ${DB_NAME} / ユーザー: ${DB_USER}"

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
        info "--- [phase1] DBマイグレーションをスキップ（--migrate で実行）---"
    fi

    # ECSタスク定義の登録 & サービス更新
    if [[ "${DEPLOY}" == "true" ]]; then
        info "--- [phase1] ECSタスク定義の登録 & サービス更新 ---"

        local BACKEND_TASK_ARN=""
        local NGINX_TASK_ARN=""

        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            info "[Backend] タスク定義を登録中..."
            local task_def_json_backend
            task_def_json_backend=$(sed "s|:staging\"|:${IMAGE_TAG}\"|g" \
                "${PROJECT_DIR}/${TASK_DEF_BACKEND_FILE}")

            local tmp_task_def_backend
            tmp_task_def_backend=$(mktemp /tmp/task-def-backend-XXXXXX.json)
            echo "${task_def_json_backend}" > "${tmp_task_def_backend}"

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
            local task_def_json_nginx
            task_def_json_nginx=$(sed "s|:staging\"|:${IMAGE_TAG}\"|g" \
                "${PROJECT_DIR}/${TASK_DEF_NGINX_FILE}")

            local tmp_task_def_nginx
            tmp_task_def_nginx=$(mktemp /tmp/task-def-nginx-XXXXXX.json)
            echo "${task_def_json_nginx}" > "${tmp_task_def_nginx}"

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

            # ALB サービスを更新
            info "[Nginx] ECSサービスを更新中... (ALB: ${ECS_SERVICE_NGINX})"
            aws ecs update-service \
                --region "${AWS_REGION}" \
                --cluster "${ECS_CLUSTER}" \
                --service "${ECS_SERVICE_NGINX}" \
                --task-definition "${NGINX_TASK_ARN}" \
                --force-new-deployment \
                --query 'service.{service:serviceName,running:runningCount,pending:pendingCount,desired:desiredCount}' \
                --output table 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] サービス更新リクエスト送信完了 (ALB: ${ECS_SERVICE_NGINX})"

            # NLB サービスを更新（ACTIVE の場合のみ）
            info "[Nginx] ECSサービスを更新中... (NLB: ${ECS_SERVICE_NGINX_HTTPS})"
            local https_svc_current_status
            https_svc_current_status=$(aws ecs describe-services \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX_HTTPS}" \
                --region "${AWS_REGION}" \
                --query 'services[0].status' \
                --output text 2>/dev/null || echo "MISSING")

            if [[ "${https_svc_current_status}" == "ACTIVE" ]]; then
                aws ecs update-service \
                    --region "${AWS_REGION}" \
                    --cluster "${ECS_CLUSTER}" \
                    --service "${ECS_SERVICE_NGINX_HTTPS}" \
                    --task-definition "${NGINX_TASK_ARN}" \
                    --force-new-deployment \
                    --query 'service.{service:serviceName,running:runningCount,pending:pendingCount,desired:desiredCount}' \
                    --output table 2>&1 | tee -a "${LOG_FILE}"
                success "[Nginx] サービス更新リクエスト送信完了 (NLB: ${ECS_SERVICE_NGINX_HTTPS})"
            else
                warn "[Nginx] ${ECS_SERVICE_NGINX_HTTPS} が ACTIVE ではないためスキップしました（status: ${https_svc_current_status}）"
                warn "  → nlb-migration-guide.md の Step 5 を参照してサービスを作成してください"
            fi
        fi

        info "--- [phase1] デプロイ開始直後のECSサービス状態確認 ---"
        info "  ※ ローリングアップデート開始直後のため pending > 0 は正常です"
        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi
        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            check_deploy_status "Nginx+Frontend (ALB)" "${ECS_SERVICE_NGINX}"
            check_deploy_status "Nginx+Frontend (NLB)" "${ECS_SERVICE_NGINX_HTTPS}"
        fi
    else
        warn "--- [phase1] ECSデプロイをスキップ（--no-deploy）---"
    fi

    # ECSサービス安定化待ち
    if [[ "${WAIT_STABLE}" == "true" && "${DEPLOY}" == "true" ]]; then
        info "--- [phase1] ECSサービス安定化待ち（最大10分）---"

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
            info "[Nginx] 安定化を待機中... (ALB: ${ECS_SERVICE_NGINX})"
            aws ecs wait services-stable \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX}" \
                --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
            success "[Nginx] 安定化シグナル受信 — 詳細確認中... (ALB)"
            check_deploy_status "Nginx+Frontend (ALB)" "${ECS_SERVICE_NGINX}"

            local https_svc_wait_status
            https_svc_wait_status=$(aws ecs describe-services \
                --cluster "${ECS_CLUSTER}" \
                --services "${ECS_SERVICE_NGINX_HTTPS}" \
                --region "${AWS_REGION}" \
                --query 'services[0].status' \
                --output text 2>/dev/null || echo "MISSING")
            if [[ "${https_svc_wait_status}" == "ACTIVE" ]]; then
                info "[Nginx] 安定化を待機中... (NLB: ${ECS_SERVICE_NGINX_HTTPS})"
                aws ecs wait services-stable \
                    --cluster "${ECS_CLUSTER}" \
                    --services "${ECS_SERVICE_NGINX_HTTPS}" \
                    --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
                success "[Nginx] 安定化シグナル受信 — 詳細確認中... (NLB)"
                check_deploy_status "Nginx+Frontend (NLB)" "${ECS_SERVICE_NGINX_HTTPS}"
            else
                warn "[Nginx] ${ECS_SERVICE_NGINX_HTTPS} が ACTIVE ではないため安定化待ちをスキップしました"
            fi
        fi

        info "--- [phase1] NLBヘルスチェック ---"
        local nlb_url="https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com"
        if curl -sf -k --max-time 15 "${nlb_url}/api/health" >/dev/null 2>&1; then
            success "[phase1] NLBヘルスチェック: OK (${nlb_url}/api/health)"
        else
            warn "[phase1] NLBヘルスチェック: 応答なし (${nlb_url}/api/health)"
            warn "  → サービス起動直後の場合は数秒後に再確認してください"
        fi
    else
        info "--- [phase1] 安定化待ちをスキップ（--wait を付けると待機・詳細確認）---"
    fi

    # サマリー表示
    info ""
    info "============================================================"
    success "  [phase1] ALB+NLB共存構成 デプロイ完了！"
    info "============================================================"
    if [[ "${DEPLOY}" == "true" ]]; then
        info "  ▼ 現在のECSサービス状態（デプロイ後）"
        if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
        fi
        if [[ "${DEPLOY_NGINX}" == "true" ]]; then
            check_deploy_status "Nginx+Frontend (ALB)" "${ECS_SERVICE_NGINX}"
            check_deploy_status "Nginx+Frontend (NLB)" "${ECS_SERVICE_NGINX_HTTPS}"
        fi
        if [[ "${WAIT_STABLE}" == "false" ]]; then
            info "  ℹ️  --wait オプションなしのため、デプロイは非同期で進行中です"
            info "     以下のコマンドで状態を再確認できます:"
            info "       ./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --check"
        fi
    fi
    info "  CloudWatch Logs:"
    info "    Backend: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Falchemia-backend"
    info "    Nginx  : https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Falchemia-nginx"
    info "============================================================"
}

# =============================================================================
# メイン処理
# =============================================================================
main() {
    mkdir -p "${LOG_DIR}"

    info "============================================================"
    info "  Alchemia Staging デプロイ開始"
    info "  モード       : ${DEPLOY_MODE}"
    info "============================================================"
    info "  クラスター  : ${ECS_CLUSTER}"
    info "  リージョン  : ${AWS_REGION}"
    info "  イメージタグ: ${IMAGE_TAG}"
    info "  ビルド      : ${BUILD}"
    info "  プッシュ    : ${PUSH}"
    info "  デプロイ    : ${DEPLOY}"
    if [[ "${DEPLOY_MODE}" != "prod-verification" ]]; then
        info "  マイグレ    : ${MIGRATE}"
    fi
    if [[ "${DEPLOY_MODE}" == "prod-verification" || "${DEPLOY_MODE}" == "all" ]]; then
        info "  ALB DNS手動指定: ${ALB_DNS_OVERRIDE:-（自動取得）}"
    fi
    info "  ログ        : ${LOG_FILE}"
    info "============================================================"

    # ------------------------------------------------------------------
    # 前提条件チェック（共通）
    # ------------------------------------------------------------------
    check_prerequisites

    # ------------------------------------------------------------------
    # --check モード
    # ------------------------------------------------------------------
    if [[ "${CHECK_ONLY}" == "true" ]]; then
        info "--- [--check] 現在のECSサービス状態確認 (mode: ${DEPLOY_MODE}) ---"

        if [[ "${DEPLOY_MODE}" == "prod-verification" || "${DEPLOY_MODE}" == "all" ]]; then
            info ""
            info "  [prod-verification 構成]"
            check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"

            info ""
            info "  ターゲットグループのヘルス確認:"
            check_target_group_health "frontend-tg" "prod-frontend-tg"
            check_target_group_health "backend-tg"  "prod-backend-tg"

            local alb_state
            alb_state=$(aws elbv2 describe-load-balancers \
                --names "${ALB_NAME}" \
                --region "${AWS_REGION}" \
                --query 'LoadBalancers[0].{State:State.Code,DNS:DNSName}' \
                --output text 2>/dev/null || echo "取得失敗")
            info "  ALB (${ALB_NAME}) 状態: ${alb_state}"
        fi

        if [[ "${DEPLOY_MODE}" == "phase1" || "${DEPLOY_MODE}" == "all" ]]; then
            info ""
            info "  [phase1 構成]"
            check_deploy_status "Backend" "${ECS_SERVICE_BACKEND}"
            check_deploy_status "Nginx+Frontend (ALB)" "${ECS_SERVICE_NGINX}"
            check_deploy_status "Nginx+Frontend (NLB)" "${ECS_SERVICE_NGINX_HTTPS}"
        fi

        info ""
        info "  AWSコンソール:"
        info "    https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
        info "  ログ: ${LOG_FILE}"
        exit 0
    fi

    # ------------------------------------------------------------------
    # ECR ログイン（ビルド or プッシュがある場合）
    # ------------------------------------------------------------------
    if [[ "${BUILD}" == "true" || "${PUSH}" == "true" ]]; then
        ecr_login
    else
        info "ECR ログインをスキップ（ビルド・プッシュなし）"
    fi

    # ------------------------------------------------------------------
    # 構成別デプロイ実行
    # ------------------------------------------------------------------
    case "${DEPLOY_MODE}" in
        prod-verification)
            deploy_prod_verification
            ;;
        phase1)
            deploy_phase1
            ;;
        all)
            info "============================================================"
            info "  [all モード] phase1 → prod-verification の順にデプロイします"
            info "============================================================"
            deploy_phase1
            info ""
            info "  ▶ 次に prod-verification 構成のデプロイを開始します..."
            info ""
            deploy_prod_verification
            ;;
    esac

    # ------------------------------------------------------------------
    # 最終サマリー
    # ------------------------------------------------------------------
    info ""
    info "============================================================"
    success "  Alchemia Staging デプロイ完了！(mode: ${DEPLOY_MODE})"
    info "============================================================"
    info "  イメージタグ : ${IMAGE_TAG}"
    info "  クラスター   : ${ECS_CLUSTER}"
    info "  リージョン   : ${AWS_REGION}"
    info ""
    info "  AWSコンソール:"
    info "    ECS サービス: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
    info "  デプロイログ: ${LOG_FILE}"
    info "============================================================"
}

main "$@"
