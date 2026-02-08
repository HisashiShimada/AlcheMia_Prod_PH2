#!/bin/bash

# SSL証明書生成スクリプト for mmdpf
# このスクリプトは以下を生成します：
# 1. CA証明書（認証局）
# 2. サーバー証明書（Nginx用）
# 3. クライアント証明書（テナント識別用）

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}mmdpf SSL証明書生成スクリプト${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 証明書ディレクトリの作成
CERT_DIR="nginx/certs"
mkdir -p "$CERT_DIR/ca"
mkdir -p "$CERT_DIR/server"
mkdir -p "$CERT_DIR/client"

echo -e "${YELLOW}証明書ディレクトリを作成しました: $CERT_DIR${NC}"
echo ""

# ===========================================
# 1. CA証明書（認証局）の生成
# ===========================================
echo -e "${GREEN}[1/3] CA証明書（認証局）を生成中...${NC}"

openssl genrsa -out "$CERT_DIR/ca/ca.key" 4096

openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca/ca.key" -out "$CERT_DIR/ca/ca.crt" \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Development/CN=MMDPF CA"

echo -e "${GREEN}✓ CA証明書を生成しました${NC}"
echo "  - CA秘密鍵: $CERT_DIR/ca/ca.key"
echo "  - CA証明書: $CERT_DIR/ca/ca.crt"
echo ""

# ===========================================
# 2. サーバー証明書（Nginx用）の生成
# ===========================================
echo -e "${GREEN}[2/3] サーバー証明書（Nginx用）を生成中...${NC}"

# サーバー秘密鍵の生成
openssl genrsa -out "$CERT_DIR/server/server.key" 2048

# サーバー証明書署名要求（CSR）の生成
openssl req -new -key "$CERT_DIR/server/server.key" -out "$CERT_DIR/server/server.csr" \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Development/CN=web.local.mmdpf.com"

# SAN（Subject Alternative Name）設定ファイルの作成
cat > "$CERT_DIR/server/san.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = JP
ST = Tokyo
L = Tokyo
O = MMDPF
OU = Development
CN = web.local.mmdpf.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = web.local.mmdpf.com
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# サーバー証明書の署名
openssl x509 -req -in "$CERT_DIR/server/server.csr" -CA "$CERT_DIR/ca/ca.crt" -CAkey "$CERT_DIR/ca/ca.key" \
  -CAcreateserial -out "$CERT_DIR/server/server.crt" -days 365 \
  -extensions v3_req -extfile "$CERT_DIR/server/san.cnf"

echo -e "${GREEN}✓ サーバー証明書を生成しました${NC}"
echo "  - サーバー秘密鍵: $CERT_DIR/server/server.key"
echo "  - サーバー証明書: $CERT_DIR/server/server.crt"
echo ""

# ===========================================
# 3. クライアント証明書（テナント識別用）の生成
# ===========================================
echo -e "${GREEN}[3/3] クライアント証明書（テナント識別用）を生成中...${NC}"

# テナントリスト
TENANTS=("tenant1" "tenant2" "admin")

for tenant in "${TENANTS[@]}"; do
  echo -e "${YELLOW}  - $tenant のクライアント証明書を生成中...${NC}"
  
  # クライアント秘密鍵の生成
  openssl genrsa -out "$CERT_DIR/client/${tenant}.key" 2048
  
  # クライアント証明書署名要求（CSR）の生成
  openssl req -new -key "$CERT_DIR/client/${tenant}.key" -out "$CERT_DIR/client/${tenant}.csr" \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Tenant/CN=${tenant}"
  
  # クライアント証明書の署名
  openssl x509 -req -in "$CERT_DIR/client/${tenant}.csr" -CA "$CERT_DIR/ca/ca.crt" -CAkey "$CERT_DIR/ca/ca.key" \
    -CAcreateserial -out "$CERT_DIR/client/${tenant}.crt" -days 365
  
  # PKCS#12形式に変換（ブラウザインポート用）
  openssl pkcs12 -export -out "$CERT_DIR/client/${tenant}.p12" \
    -inkey "$CERT_DIR/client/${tenant}.key" \
    -in "$CERT_DIR/client/${tenant}.crt" \
    -certfile "$CERT_DIR/ca/ca.crt" \
    -passout pass:mmdpf123
  
  echo -e "${GREEN}    ✓ ${tenant}.p12 を生成しました（パスワード: mmdpf123）${NC}"
done

echo ""
echo -e "${GREEN}✓ 全てのクライアント証明書を生成しました${NC}"
echo "  - 証明書ディレクトリ: $CERT_DIR/client/"
echo "  - ブラウザインポート用: *.p12 ファイル（パスワード: mmdpf123）"
echo ""

# ===========================================
# 4. 証明書情報の表示
# ===========================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}証明書生成が完了しました！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "1. hostsファイルに以下を追加してください:"
echo "   ${GREEN}127.0.0.1   web.local.mmdpf.com${NC}"
echo ""
echo "2. ブラウザにクライアント証明書をインポートしてください:"
echo "   - Windows/Chrome: 設定 > セキュリティとプライバシー > 証明書の管理"
echo "   - ファイル: ${GREEN}$CERT_DIR/client/tenant1.p12${NC}"
echo "   - パスワード: ${GREEN}mmdpf123${NC}"
echo ""
echo "3. CA証明書を信頼されたルート証明機関にインポートしてください（オプション）:"
echo "   - ファイル: ${GREEN}$CERT_DIR/ca/ca.crt${NC}"
echo ""
echo "4. Dockerコンテナを起動してください:"
echo "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "5. ブラウザで以下にアクセスしてください:"
echo "   ${GREEN}https://web.local.mmdpf.com${NC}"
echo ""
echo -e "${YELLOW}注意: 証明書ファイルはGit管理外です（.gitignoreに追加済み）${NC}"
echo ""
