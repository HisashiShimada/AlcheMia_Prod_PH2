#!/bin/bash
# =============================================================================
# Alchemia Staging - 本番検証環境デプロイスクリプト
# （ALB追加 / nginx無し構成検証: prod-frontend-service）
# =============================================================================
#
# 【対象環境】
#   prod-verification（新規追加構成）
#   ・フロントエンドのみ独立した ECS サービスとして配置
#   ・nginx なし、ALB (prod-verification-alb) が直接フロントエンドに転送
#   ・バックエンドは既存 alchemia-backend-service を共用
#
# 【前提条件】
#   BUILD_GUIDE.md の STEP 1〜10 が完了していること:
#     - prod-verification-alb が作成済みであること
#     - prod-frontend-service が作成済みであること
#     - aws/ecs-task-definition-prod-frontend.json が存在すること
#
# 使い方:
#   chmod +x scripts/alchemia-staging/deploy.prod-verification.sh
#   ./scripts/alchemia-staging/deploy.prod-verification.sh [OPTIONS]
#
# オプション:
#   --no-build        イメージのビルドをスキップ（既存イメージを再デプロイ）
#   --no-push         ECRへのプッシュをスキップ
#   --no-deploy       ECSデプロイをスキップ（ビルド＆プッシュのみ）
#   --alb-dns <DNS>   ALB の DNS 名を直接指定（省略時は AWS CLI で自動取得）
#                     例: prod-verification-alb-xxxxxxxxx.ap-northeast-1.elb.amazonaws.com
#   --wait            ECSサービス安定化まで待機（デフォルト: スキップ）
#   --check           デプロイせず現在のECSサービス状態のみ確認
#   --tag <TAG>       イメージタグを指定（デフォルト: staging）
#   --health          デプロイ後にヘルスチェック（curl）を実行
#   --help            このヘルプを表示
#
# 実行例:
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
#   # 現在のサービス状態を確認
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --check
#
#   # ビルド＆プッシュのみ（ECSデプロイなし）
#   ./scripts/alchemia-staging/deploy.prod-verification.sh --no-deploy
# =============================================================================

set -euo pipefail

# =============================================================================
# 固定設定
# =============================================================================
readonly AWS_ACCOUNT_ID="137068252939"
readonly AWS_REGION="ap-northeast-1"
readonly ECS_CLUSTER="alchemia-staging"
readonly ECS_SERVICE_FRONTEND="prod-frontend-service"
readonly ECR_REPO_FRONTEND="mmdpf-frontend"
readonly ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
readonly ECR_FRONTEND="${ECR_BASE}/${ECR_REPO_FRONTEND}"
readonly ALB_NAME="prod-verification-alb"
readonly TASK_DEF_FRONTEND_FILE="aws/ecs-task-definition-prod-frontend.json"

# =============================================================================
# パス設定
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-prod-verification-$(date +%Y%m%d_%H%M%S).log"

# =============================================================================
# デフォルトオプション
# =============================================================================
BUILD=true
PUSH=true
DEPLOY=true
WAIT_STABLE=false
CHECK_ONLY=false
HEALTH_CHECK=false
IMAGE_TAG="staging"
ALB_DNS_OVERRIDE=""   # --alb-dns で上書き可能

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
# ALB DNS 名取得関数
# --alb-dns オプション指定時はそちらを優先、なければ AWS CLI で取得
# =============================================================================
get_alb_dns() {
    if [[ -n "${ALB_DNS_OVERRIDE}" ]]; then
        echo "${ALB_DNS_OVERRIDE}"
        return
    fi

    info "  [ALB] prod-verification-alb の DNS 名を取得中..."
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

    # 稼働中タスクのイメージタグ確認
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

    # 直近3件のサービスイベント
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
        --no-build)   BUILD=false;              shift ;;
        --no-push)    PUSH=false;               shift ;;
        --no-deploy)  DEPLOY=false;             shift ;;
        --wait)       WAIT_STABLE=true;         shift ;;
        --check)      CHECK_ONLY=true;          shift ;;
        --health)     HEALTH_CHECK=true;        shift ;;
        --alb-dns)    ALB_DNS_OVERRIDE="$2";    shift 2 ;;
        --tag)        IMAGE_TAG="$2";           shift 2 ;;
        -h|--help)
            sed -n '3,65p' "$0"
            exit 0
            ;;
        *)
            error "不明なオプション: $1"
            echo "使い方: $0 [--no-build] [--no-push] [--no-deploy] [--alb-dns <DNS>] [--wait] [--check] [--health] [--tag <TAG>]"
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
    info "  本番検証環境 (prod-verification) デプロイ開始"
    info "  対象サービス: prod-frontend-service (nginx無し構成検証)"
    info "============================================================"
    info "  クラスター  : ${ECS_CLUSTER}"
    info "  リージョン  : ${AWS_REGION}"
    info "  イメージタグ: ${IMAGE_TAG}"
    info "  ビルド      : ${BUILD}"
    info "  プッシュ    : ${PUSH}"
    info "  デプロイ    : ${DEPLOY}"
    info "  ALB DNS手動指定: ${ALB_DNS_OVERRIDE:-（自動取得）}"
    info "  ログ        : ${LOG_FILE}"
    info "============================================================"

    # ------------------------------------------------------------------
    # 前提条件チェック
    # ------------------------------------------------------------------
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

    # --check モード
    if [[ "${CHECK_ONLY}" == "true" ]]; then
        info "--- [--check] 現在のECSサービス状態確認 ---"
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"

        info ""
        info "--- ターゲットグループのヘルス確認 ---"
        check_target_group_health "frontend-tg" "prod-frontend-tg"
        check_target_group_health "backend-tg"  "prod-backend-tg"

        local alb_state
        alb_state=$(aws elbv2 describe-load-balancers \
            --names "${ALB_NAME}" \
            --region "${AWS_REGION}" \
            --query 'LoadBalancers[0].{State:State.Code,DNS:DNSName}' \
            --output text 2>/dev/null || echo "取得失敗")
        info ""
        info "  ALB (${ALB_NAME}) 状態: ${alb_state}"

        info ""
        info "  AWSコンソール:"
        info "    https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
        info "  ログ: ${LOG_FILE}"
        exit 0
    fi

    # タスク定義ファイルの存在確認
    if [[ ! -f "${PROJECT_DIR}/${TASK_DEF_FRONTEND_FILE}" ]]; then
        error "タスク定義ファイルが見つかりません: ${TASK_DEF_FRONTEND_FILE}"
        exit 1
    fi
    success "タスク定義ファイル: ${TASK_DEF_FRONTEND_FILE} ✅"

    if [[ "${BUILD}" == "true" ]]; then
        if ! command -v docker &>/dev/null; then
            error "Docker がインストールされていません"
            exit 1
        fi
        success "Docker: $(docker --version | head -1)"
    fi

    success "前提条件: すべてOK"

    # ------------------------------------------------------------------
    # ALB DNS 名の取得
    # ------------------------------------------------------------------
    local ALB_DNS
    if [[ "${DEPLOY}" == "true" || "${HEALTH_CHECK}" == "true" ]]; then
        info "--- Step 1.5: ALB DNS 名の確認 ---"
        ALB_DNS=$(get_alb_dns)
        success "ALB DNS 名: ${ALB_DNS}"
    fi

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
    # Step 3: Docker イメージ ビルド（frontend のみ）
    # ------------------------------------------------------------------
    if [[ "${BUILD}" == "true" ]]; then
        info "--- Step 3: Docker イメージ ビルド ---"
        info "[Frontend] ビルド中... (${ECR_FRONTEND}:${IMAGE_TAG})"
        docker build \
            --no-cache \
            -f "${PROJECT_DIR}/frontend/Dockerfile.prod" \
            -t "${ECR_FRONTEND}:${IMAGE_TAG}" \
            "${PROJECT_DIR}/frontend" 2>&1 | tee -a "${LOG_FILE}"
        success "[Frontend] ビルド完了"
    else
        warn "--- Step 3: ビルドをスキップ（--no-build）---"
    fi

    # ------------------------------------------------------------------
    # Step 4: ECR プッシュ
    # ------------------------------------------------------------------
    if [[ "${PUSH}" == "true" ]]; then
        info "--- Step 4: ECR プッシュ ---"
        info "[Frontend] プッシュ中... ${ECR_FRONTEND}:${IMAGE_TAG}"
        docker push "${ECR_FRONTEND}:${IMAGE_TAG}" 2>&1 | tee -a "${LOG_FILE}"
        success "[Frontend] プッシュ完了: ${ECR_FRONTEND}:${IMAGE_TAG}"
    else
        warn "--- Step 4: ECRプッシュをスキップ（--no-push）---"
    fi

    # ------------------------------------------------------------------
    # Step 5: ECSタスク定義の登録 & サービス更新
    # ------------------------------------------------------------------
    if [[ "${DEPLOY}" == "true" ]]; then
        info "--- Step 5: ECSタスク定義の登録 & サービス更新 ---"
        info "  NEXT_PUBLIC_API_URL = https://${ALB_DNS}"

        # タスク定義 JSON 内の <ALB_DNS> プレースホルダーを実際の DNS 名に置換
        # また _comment* キーを除去（AWS CLI が受け付けないため）
        local task_def_json
        task_def_json=$(sed \
            -e "s|<ALB_DNS>|${ALB_DNS}|g" \
            -e "s|:staging\"|:${IMAGE_TAG}\"|g" \
            "${PROJECT_DIR}/${TASK_DEF_FRONTEND_FILE}" \
            | grep -v '"_comment' \
        )

        # ALB_DNS が正しく置換されたか確認
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

        # prod-frontend-service の存在確認
        local svc_status
        svc_status=$(aws ecs describe-services \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE_FRONTEND}" \
            --region "${AWS_REGION}" \
            --query 'services[0].status' \
            --output text 2>/dev/null || echo "MISSING")

        if [[ "${svc_status}" != "ACTIVE" ]]; then
            error "ECSサービス '${ECS_SERVICE_FRONTEND}' が見つからないか ACTIVE ではありません（status: ${svc_status}）"
            error "BUILD_GUIDE.md の STEP 10 を実行して prod-frontend-service を作成してください"
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

        # デプロイ直後の状態確認
        info "--- Step 5.5: デプロイ開始直後のECSサービス状態確認 ---"
        info "  ※ ローリングアップデート開始直後のため pending > 0 は正常です"
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"
    else
        warn "--- Step 5: ECSデプロイをスキップ（--no-deploy）---"
    fi

    # ------------------------------------------------------------------
    # Step 6: ECSサービス安定化待ち（--wait オプション時）
    # ------------------------------------------------------------------
    if [[ "${WAIT_STABLE}" == "true" && "${DEPLOY}" == "true" ]]; then
        info "--- Step 6: ECSサービス安定化待ち（最大10分）---"
        info "[prod-frontend] 安定化を待機中..."
        aws ecs wait services-stable \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE_FRONTEND}" \
            --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"
        success "[prod-frontend] 安定化シグナル受信 — 詳細確認中..."
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"

        # ターゲットグループのヘルス確認
        info "--- ターゲットグループのヘルス確認 ---"
        check_target_group_health "frontend-tg" "prod-frontend-tg"
        check_target_group_health "backend-tg"  "prod-backend-tg"
    else
        info "--- Step 6: 安定化待ちをスキップ（--wait を付けると待機・詳細確認）---"
    fi

    # ------------------------------------------------------------------
    # Step 7: ヘルスチェック（--health または --wait オプション時）
    # ------------------------------------------------------------------
    if [[ "${HEALTH_CHECK}" == "true" || "${WAIT_STABLE}" == "true" ]]; then
        if [[ -n "${ALB_DNS:-}" ]]; then
            info "--- Step 7: ALB ヘルスチェック (curl) ---"
            info "  対象: https://${ALB_DNS}"

            # フロントエンドのヘルスチェック（自己署名証明書のため -k）
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

            # バックエンド API ヘルスチェック
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

            # HTTP → HTTPS リダイレクト確認
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
            warn "--- Step 7: ALB DNS が不明のためヘルスチェックをスキップします ---"
        fi
    fi

    # ------------------------------------------------------------------
    # 完了サマリー
    # ------------------------------------------------------------------
    info ""
    info "============================================================"
    success "  本番検証環境 (prod-verification) デプロイ完了！"
    info "============================================================"
    info ""
    info "  デプロイ情報:"
    info "    イメージタグ : ${IMAGE_TAG}"
    info "    クラスター   : ${ECS_CLUSTER}"
    info "    リージョン   : ${AWS_REGION}"
    if [[ -n "${ALB_DNS:-}" ]]; then
        info "    ALB DNS      : ${ALB_DNS}"
        info "    アクセス URL : https://${ALB_DNS}/"
        info "    API URL      : https://${ALB_DNS}/api/health"
    fi
    info ""

    if [[ "${DEPLOY}" == "true" ]]; then
        info "  ▼ 現在のECSサービス状態（デプロイ後）"
        check_deploy_status "prod-frontend" "${ECS_SERVICE_FRONTEND}"
        info ""
        if [[ "${WAIT_STABLE}" == "false" ]]; then
            info "  ℹ️  --wait オプションなしのため、デプロイは非同期で進行中です"
            info "     以下のコマンドで状態を再確認できます:"
            info "       ./scripts/alchemia-staging/deploy.prod-verification.sh --check"
            info ""
        fi
    fi

    info "  AWSコンソール:"
    info "    ECS サービス: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
    info "    ALB (prod-verification-alb): https://console.aws.amazon.com/ec2/v2/home?region=${AWS_REGION}#LoadBalancers:search=${ALB_NAME}"
    info ""
    info "  CloudWatch Logs:"
    info "    Frontend: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/%2Fecs%2Fprod-frontend"
    info ""
    info "  デプロイログ: ${LOG_FILE}"
    info "============================================================"
}

main "$@"
