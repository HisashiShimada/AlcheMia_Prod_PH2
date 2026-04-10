#!/bin/sh
# =============================================================================
# Alchemia Staging - Nginx コンテナ entrypoint スクリプト
# =============================================================================
#
# 役割:
#   1. SSL証明書の配置（環境変数 or AWS Secrets Manager から取得）
#   2. nginx 設定の動的パラメータを環境変数で上書き
#   3. nginx を起動
#
# 環境変数:
#   SSL_CERT      - サーバー証明書（PEM形式、Base64エンコード or 直接PEM文字列）
#   SSL_KEY       - サーバー秘密鍵（PEM形式、Base64エンコード or 直接PEM文字列）
#   SSL_CA_CERT   - クライアント証明書検証用 CA 証明書（PEM形式）
#   BACKEND_HOST  - バックエンドホスト名（デフォルト: backend）
#   BACKEND_PORT  - バックエンドポート番号（デフォルト: 3001）
#   FRONTEND_HOST - フロントエンドホスト名（デフォルト: localhost）
#   FRONTEND_PORT - フロントエンドポート番号（デフォルト: 3000）
#
# 証明書が設定されていない場合は自己署名証明書を自動生成します（開発/検証用）。
# =============================================================================

set -e

SSL_DIR="/etc/nginx/ssl"

echo "[entrypoint] Alchemia Staging Nginx コンテナ起動中..."

# =============================================================================
# SSL証明書の配置
# =============================================================================

# 環境変数から証明書を配置（ECS では Secrets Manager / SSM Parameter Store から渡す想定）
if [ -n "${SSL_CERT}" ] && [ -n "${SSL_KEY}" ]; then
    echo "[entrypoint] 環境変数から SSL 証明書を配置..."
    echo "${SSL_CERT}" | base64 -d > "${SSL_DIR}/server.crt" 2>/dev/null || echo "${SSL_CERT}" > "${SSL_DIR}/server.crt"
    echo "${SSL_KEY}"  | base64 -d > "${SSL_DIR}/server.key" 2>/dev/null || echo "${SSL_KEY}"  > "${SSL_DIR}/server.key"
    chmod 600 "${SSL_DIR}/server.key"
    echo "[entrypoint] SSL 証明書を配置しました: ${SSL_DIR}/server.crt"
fi

if [ -n "${SSL_CA_CERT}" ]; then
    echo "[entrypoint] 環境変数から CA 証明書を配置..."
    echo "${SSL_CA_CERT}" | base64 -d > "${SSL_DIR}/ca.crt" 2>/dev/null || echo "${SSL_CA_CERT}" > "${SSL_DIR}/ca.crt"
    echo "[entrypoint] CA 証明書を配置しました: ${SSL_DIR}/ca.crt"
fi

# 証明書が存在しない場合は自己署名証明書を生成（開発/検証用フォールバック）
if [ ! -f "${SSL_DIR}/server.crt" ] || [ ! -f "${SSL_DIR}/server.key" ]; then
    echo "[entrypoint] WARNING: SSL 証明書が見つかりません。自己署名証明書を生成します（本番環境では証明書を設定してください）"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${SSL_DIR}/server.key" \
        -out    "${SSL_DIR}/server.crt" \
        -subj   "/C=JP/ST=Tokyo/L=Tokyo/O=Alchemia/CN=localhost" \
        2>/dev/null
    chmod 600 "${SSL_DIR}/server.key"
    echo "[entrypoint] 自己署名証明書を生成しました"
fi

# CA 証明書が存在しない場合はサーバー証明書を CA として使用（クライアント証明書なし環境用フォールバック）
if [ ! -f "${SSL_DIR}/ca.crt" ]; then
    echo "[entrypoint] WARNING: CA 証明書が見つかりません。サーバー証明書を CA として使用します（クライアント証明書認証は無効化されます）"
    cp "${SSL_DIR}/server.crt" "${SSL_DIR}/ca.crt"
fi

echo "[entrypoint] SSL 証明書の確認:"
echo "  server.crt: $(openssl x509 -noout -subject -in ${SSL_DIR}/server.crt 2>/dev/null || echo 'ERROR')"
echo "  ca.crt    : $(openssl x509 -noout -subject -in ${SSL_DIR}/ca.crt 2>/dev/null || echo 'ERROR')"

# =============================================================================
# nginx 設定の動的パラメータ置換
# =============================================================================

# ECS Service Discovery のバックエンドホスト名を設定
# デフォルト: alchemia-backend.alchemia.local（タスク定義の BACKEND_HOST 環境変数で上書き可）
BACKEND_HOST="${BACKEND_HOST:-backend}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "[entrypoint] バックエンド接続先: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "[entrypoint] フロントエンド接続先: ${FRONTEND_HOST}:${FRONTEND_PORT}"

# nginx.conf のプレースホルダーを環境変数で動的に置換
# proxy_pass 変数 + resolver による動的DNS解決のため、プレースホルダー方式を使用
sed -i \
    -e "s|BACKEND_HOST_PLACEHOLDER:BACKEND_PORT_PLACEHOLDER|${BACKEND_HOST}:${BACKEND_PORT}|g" \
    -e "s|FRONTEND_HOST_PLACEHOLDER:FRONTEND_PORT_PLACEHOLDER|${FRONTEND_HOST}:${FRONTEND_PORT}|g" \
    /etc/nginx/nginx.conf

# =============================================================================
# nginx 設定テスト
# =============================================================================
echo "[entrypoint] nginx 設定をテスト中..."
nginx -t
echo "[entrypoint] nginx 設定テスト: OK"

# =============================================================================
# nginx 起動
# =============================================================================
echo "[entrypoint] nginx を起動します..."
exec nginx -g "daemon off;"
