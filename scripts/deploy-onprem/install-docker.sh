#!/bin/bash
# =============================================================================
# Docker インストールスクリプト - Ubuntu 用
# =============================================================================
#
# 使い方:
#   chmod +x scripts/deploy-onprem/install-docker.sh
#   sudo bash scripts/deploy-onprem/install-docker.sh
#
# 対応OS:
#   Ubuntu 20.04 / 22.04 / 24.04 LTS
#
# インストールされるもの:
#   - Docker CE（最新版）
#   - Docker Compose Plugin (v2.x)
#
# 注意:
#   - スクリプト実行後、docker グループの反映には再ログインまたは
#     `newgrp docker` の実行が必要です。
# =============================================================================

set -euo pipefail

# =============================================================================
# ユーティリティ関数
# =============================================================================
info()    { echo "[INFO ] $*"; }
success() { echo "[OK   ] ✅ $*"; }
warn()    { echo "[WARN ] ⚠️  $*"; }
error()   { echo "[ERROR] ❌ $*" >&2; }

# =============================================================================
# sudo チェック
# =============================================================================
if [[ "${EUID}" -ne 0 ]]; then
    error "このスクリプトは root 権限（sudo）で実行してください"
    error "  例: sudo bash $0"
    exit 1
fi

# 実行ユーザーの記録（sudo 実行前のユーザー名）
INVOKE_USER="${SUDO_USER:-${USER}}"

# =============================================================================
# OS チェック
# =============================================================================
if [[ ! -f /etc/os-release ]]; then
    error "Ubuntu 以外の OS には対応していません"
    exit 1
fi
# shellcheck source=/dev/null
source /etc/os-release

if [[ "${ID}" != "ubuntu" ]]; then
    error "Ubuntu 以外の OS には対応していません（検出OS: ${ID}）"
    exit 1
fi

info "============================================="
info "Docker インストール開始"
info "============================================="
info "OS: ${PRETTY_NAME}"
info "実行ユーザー: ${INVOKE_USER}"

# =============================================================================
# Step 1: Docker インストール済みチェック
# =============================================================================
info "--- Step 1: Docker インストール済みチェック ---"

if command -v docker &>/dev/null; then
    CURRENT_DOCKER_VERSION=$(docker --version)
    warn "Docker はすでにインストールされています: ${CURRENT_DOCKER_VERSION}"
    warn "再インストールを続行しますか？ [y/N]"
    read -r answer
    if [[ "${answer}" != "y" && "${answer}" != "Y" ]]; then
        info "インストールをスキップしました"
        exit 0
    fi
fi

# =============================================================================
# Step 2: パッケージリストの更新と必要パッケージのインストール
# =============================================================================
info "--- Step 2: パッケージリストの更新 ---"

apt-get update -y
success "パッケージリスト更新: 完了"

info "--- Step 3: 必要パッケージのインストール ---"

apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
success "必要パッケージ: インストール完了"

# =============================================================================
# Step 3: Docker 公式 GPG キーの追加
# =============================================================================
info "--- Step 4: Docker 公式 GPG キーの追加 ---"

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg

chmod a+r /etc/apt/keyrings/docker.gpg
success "GPG キー: 追加完了"

# =============================================================================
# Step 4: Docker リポジトリの追加
# =============================================================================
info "--- Step 5: Docker リポジトリの追加 ---"

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
success "Docker リポジトリ: 追加完了"

# =============================================================================
# Step 5: Docker のインストール
# =============================================================================
info "--- Step 6: Docker のインストール ---"

apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-compose-plugin
success "Docker: インストール完了"

# =============================================================================
# Step 6: Docker サービスの起動・自動起動設定
# =============================================================================
info "--- Step 7: Docker サービスの起動・自動起動設定 ---"

systemctl enable docker
systemctl start docker
success "Docker サービス: 起動・自動起動設定完了"

# =============================================================================
# Step 7: ユーザーを docker グループに追加
# =============================================================================
info "--- Step 8: ユーザーを docker グループに追加 ---"

if [[ "${INVOKE_USER}" != "root" ]]; then
    usermod -aG docker "${INVOKE_USER}"
    success "ユーザー '${INVOKE_USER}' を docker グループに追加しました"
else
    warn "root ユーザーのため docker グループへの追加をスキップしました"
fi

# =============================================================================
# バージョン確認・完了メッセージ
# =============================================================================
info "============================================="
success "Docker インストール完了！"
info "============================================="
info ""
info "インストール済みバージョン:"
info "  Docker:          $(docker --version)"
info "  Docker Compose:  $(docker compose version)"
info ""

if [[ "${INVOKE_USER}" != "root" ]]; then
    warn "【重要】docker グループを反映するには、以下のいずれかを実行してください："
    warn "  1. 現在のセッションに反映: newgrp docker"
    warn "  2. 再ログイン: いったんログアウトして再度ログイン"
    warn ""
    warn "  反映後に sudo なしで docker コマンドが使えるようになります"
fi
