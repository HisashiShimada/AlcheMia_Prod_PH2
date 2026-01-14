#!/bin/bash
# 証明書生成スクリプト - Nginxクライアント証明書認証用
# 実行方法: cd certs && bash generate-certificates.sh

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}MMDPF クライアント証明書生成${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# OpenSSL確認
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSLがインストールされていません${NC}"
    echo "インストール方法:"
    echo "  Windows: https://slproweb.com/products/Win32OpenSSL.html"
    echo "  macOS:   brew install openssl"
    echo "  Linux:   sudo apt-get install openssl"
    exit 1
fi

echo -e "${GREEN}✓ OpenSSL確認完了: $(openssl version)${NC}"
echo ""

# ===========================================
# 1. CA証明書の生成
# ===========================================
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}1. CA（認証局）証明書の生成${NC}"
echo -e "${GREEN}=========================================${NC}"

if [ -f "ca/ca.key" ]; then
    echo -e "${YELLOW}⚠ CA秘密鍵が既に存在します。スキップします。${NC}"
else
    # CA秘密鍵の生成（4096bit RSA）
    openssl genrsa -out "ca/ca.key" 4096
    echo -e "${GREEN}✓ CA秘密鍵を生成: ca/ca.key${NC}"
    
    # ファイルアクセス権限を厳格化（Unix系のみ）
    if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
        chmod 600 "ca/ca.key"
        echo -e "${GREEN}✓ CA秘密鍵のアクセス権限を600に設定${NC}"
    fi
fi

if [ -f "ca/ca.crt" ]; then
    echo -e "${YELLOW}⚠ CA証明書が既に存在します。スキップします。${NC}"
else
    # CA証明書の生成（10年有効）
    openssl req -new -x509 -days 3650 \
        -key "ca/ca.key" \
        -out "ca/ca.crt" \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Certificate Authority/CN=MMDPF Root CA"
    
    echo -e "${GREEN}✓ CA証明書を生成: ca/ca.crt${NC}"
fi

echo ""

# ===========================================
# 2. クライアント証明書の生成
# ===========================================
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}2. クライアント証明書の生成${NC}"
echo -e "${GREEN}=========================================${NC}"

# 組織IDリスト（UUID形式）
ORGANIZATIONS=(
    "c9621ed6-5def-4970-8e7f-fbe97c98e3ed"
    "a0718dc5-21f3-44e6-87e9-cc2ae83f3385"
)

ORGANIZATION_NAMES=(
    "Organization 1"
    "Organization 2"
)

for i in "${!ORGANIZATIONS[@]}"; do
    ORG_ID="${ORGANIZATIONS[$i]}"
    ORG_NAME="${ORGANIZATION_NAMES[$i]}"
    
    # ファイル名用（ハイフンなしUUID）
    FILE_ID=$(echo "$ORG_ID" | tr -d '-')
    
    echo ""
    echo -e "${GREEN}>>> クライアント証明書生成: $ORG_NAME${NC}"
    echo -e "${GREEN}    UUID: {$ORG_ID}${NC}"
    
    if [ -f "clients/${FILE_ID}.p12" ]; then
        echo -e "${YELLOW}⚠ クライアント証明書が既に存在します。スキップします。${NC}"
        continue
    fi
    
    # クライアント秘密鍵の生成（2048bit RSA）
    openssl genrsa -out "clients/${FILE_ID}.key" 2048
    echo -e "${GREEN}✓ 秘密鍵生成: ${FILE_ID}.key${NC}"
    
    # CSR（証明書署名要求）の生成
    # CNに{uuid}形式で組織IDを設定（重要！）
    openssl req -new \
        -key "clients/${FILE_ID}.key" \
        -out "clients/${FILE_ID}.csr" \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=${ORG_NAME}/CN={${ORG_ID}}"
    
    echo -e "${GREEN}✓ CSR生成 (CN={$ORG_ID})${NC}"
    
    # クライアント証明書の生成（CA署名、3年有効）
    openssl x509 -req -days 1095 \
        -in "clients/${FILE_ID}.csr" \
        -CA "ca/ca.crt" \
        -CAkey "ca/ca.key" \
        -CAcreateserial \
        -out "clients/${FILE_ID}.crt"
    
    echo -e "${GREEN}✓ 証明書生成: ${FILE_ID}.crt${NC}"
    
    # PKCS#12形式に変換（ブラウザインポート用）
    # パスワード: mmdpf123
    openssl pkcs12 -export \
        -in "clients/${FILE_ID}.crt" \
        -inkey "clients/${FILE_ID}.key" \
        -out "clients/${FILE_ID}.p12" \
        -name "$ORG_NAME" \
        -passout pass:mmdpf123
    
    echo -e "${GREEN}✓ PKCS#12形式生成: ${FILE_ID}.p12 (パスワード: mmdpf123)${NC}"
    
    # CSRファイルを削除（不要）
    rm "clients/${FILE_ID}.csr"
    
    echo -e "${GREEN}✓ $ORG_NAME の証明書生成完了${NC}"
done

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}証明書生成完了${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}生成されたファイル:${NC}"
echo -e "  ${YELLOW}CA証明書:${NC}"
echo -e "    - ca/ca.crt (Nginx設定で使用)"
echo -e "    - ca/ca.key (厳重に管理)"
echo ""
echo -e "  ${YELLOW}クライアント証明書:${NC}"
for i in "${!ORGANIZATIONS[@]}"; do
    ORG_ID="${ORGANIZATIONS[$i]}"
    ORG_NAME="${ORGANIZATION_NAMES[$i]}"
    FILE_ID=$(echo "$ORG_ID" | tr -d '-')
    echo -e "    - $ORG_NAME (UUID: {$ORG_ID}):"
    echo -e "      * clients/${FILE_ID}.crt"
    echo -e "      * clients/${FILE_ID}.key"
    echo -e "      * clients/${FILE_ID}.p12 (ブラウザ用、パスワード: mmdpf123)"
done
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo -e "  1. Nginxに ca/ca.crt を配置"
echo -e "  2. クライアントに .p12 ファイルを配布"
echo -e "  3. ブラウザに証明書をインポート（パスワード: mmdpf123）"
echo ""
echo -e "${RED}⚠ セキュリティ警告:${NC}"
echo -e "  - ca/ca.key は厳重に管理してください"
echo -e "  - クライアント秘密鍵(.key)は外部に公開しないでください"
echo ""
