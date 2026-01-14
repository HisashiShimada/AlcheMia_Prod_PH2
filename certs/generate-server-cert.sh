#!/bin/bash
# Nginxサーバー証明書生成スクリプト（自己署名）
# 実行方法: cd certs && bash generate-server-cert.sh

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Nginxサーバー証明書生成（自己署名）${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# OpenSSL確認
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSLがインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ OpenSSL確認完了: $(openssl version)${NC}"
echo ""

# サーバー証明書ディレクトリ作成
mkdir -p server

# サーバー秘密鍵の生成
if [ -f "server/server.key" ]; then
    echo -e "${YELLOW}⚠ サーバー秘密鍵が既に存在します。スキップします。${NC}"
else
    openssl genrsa -out "server/server.key" 2048
    echo -e "${GREEN}✓ サーバー秘密鍵を生成: server/server.key${NC}"
    
    # ファイルアクセス権限を厳格化（Unix系のみ）
    if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
        chmod 600 "server/server.key"
        echo -e "${GREEN}✓ サーバー秘密鍵のアクセス権限を600に設定${NC}"
    fi
fi

# サーバー証明書の生成（自己署名、1年有効）
if [ -f "server/server.crt" ]; then
    echo -e "${YELLOW}⚠ サーバー証明書が既に存在します。スキップします。${NC}"
else
    openssl req -new -x509 -days 365 \
        -key "server/server.key" \
        -out "server/server.crt" \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Development/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
    
    echo -e "${GREEN}✓ サーバー証明書を生成: server/server.crt${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}サーバー証明書生成完了${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}生成されたファイル:${NC}"
echo -e "  - server/server.crt (Nginx用証明書)"
echo -e "  - server/server.key (Nginx用秘密鍵)"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo -e "  1. docker-compose.ymlでNginxコンテナに証明書をマウント"
echo -e "  2. Nginxを起動: docker-compose up -d nginx"
echo -e "  3. https://localhost でアクセス確認"
echo ""
echo -e "${YELLOW}⚠ 注意:${NC}"
echo -e "  - これは自己署名証明書です"
echo -e "  - ブラウザで「信頼されない証明書」警告が表示されます"
echo -e "  - 本番環境では Let's Encrypt などの正式な証明書を使用してください"
echo ""
