# PowerShell証明書生成スクリプト - Windows環境用
# 実行方法: cd certs; .\generate-certs.ps1

Write-Host "=========================================" -ForegroundColor Green
Write-Host "MMDPF 証明書生成スクリプト（Windows）" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# ディレクトリ作成
$dirs = @("ca", "server", "clients")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "✓ ディレクトリ作成: $dir" -ForegroundColor Green
    }
}

# OpenSSL確認
try {
    $opensslVersion = & openssl version 2>&1
    Write-Host "✓ OpenSSL確認完了: $opensslVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSSLがインストールされていません" -ForegroundColor Red
    Write-Host "インストール方法: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ===========================================
# 1. CA証明書の生成
# ===========================================
Write-Host "=========================================" -ForegroundColor Green
Write-Host "1. CA（認証局）証明書の生成" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

if (Test-Path "ca/ca.key") {
    Write-Host "⚠ CA秘密鍵が既に存在します。スキップします。" -ForegroundColor Yellow
} else {
    & openssl genrsa -out "ca/ca.key" 4096
    Write-Host "✓ CA秘密鍵を生成: ca/ca.key" -ForegroundColor Green
}

if (Test-Path "ca/ca.crt") {
    Write-Host "⚠ CA証明書が既に存在します。スキップします。" -ForegroundColor Yellow
} else {
    & openssl req -new -x509 -days 3650 `
        -key "ca/ca.key" `
        -out "ca/ca.crt" `
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Certificate Authority/CN=MMDPF Root CA"
    Write-Host "✓ CA証明書を生成: ca/ca.crt" -ForegroundColor Green
}

Write-Host ""

# ===========================================
# 2. サーバー証明書の生成
# ===========================================
Write-Host "=========================================" -ForegroundColor Green
Write-Host "2. サーバー証明書の生成" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

if (Test-Path "server/server.key") {
    Write-Host "⚠ サーバー秘密鍵が既に存在します。スキップします。" -ForegroundColor Yellow
} else {
    & openssl genrsa -out "server/server.key" 2048
    Write-Host "✓ サーバー秘密鍵を生成: server/server.key" -ForegroundColor Green
}

if (Test-Path "server/server.crt") {
    Write-Host "⚠ サーバー証明書が既に存在します。スキップします。" -ForegroundColor Yellow
} else {
    & openssl req -new -x509 -days 365 `
        -key "server/server.key" `
        -out "server/server.crt" `
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Development/CN=localhost" `
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
    Write-Host "✓ サーバー証明書を生成: server/server.crt" -ForegroundColor Green
}

Write-Host ""

# ===========================================
# 3. クライアント証明書の生成
# ===========================================
Write-Host "=========================================" -ForegroundColor Green
Write-Host "3. クライアント証明書の生成" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$organizations = @(
    @{id="c9621ed6-5def-4970-8e7f-fbe97c98e3ed"; name="Organization 1"},
    @{id="a0718dc5-21f3-44e6-87e9-cc2ae83f3385"; name="Organization 2"}
)

foreach ($org in $organizations) {
    $orgId = $org.id
    $orgName = $org.name
    $fileId = $orgId.Replace("-", "")
    
    Write-Host ""
    Write-Host ">>> クライアント証明書生成: $orgName" -ForegroundColor Green
    Write-Host "    UUID: {$orgId}" -ForegroundColor Green
    
    if (Test-Path "clients/$fileId.p12") {
        Write-Host "⚠ クライアント証明書が既に存在します。スキップします。" -ForegroundColor Yellow
        continue
    }
    
    # クライアント秘密鍵の生成
    & openssl genrsa -out "clients/$fileId.key" 2048
    Write-Host "✓ 秘密鍵生成: $fileId.key" -ForegroundColor Green
    
    # CSR（証明書署名要求）の生成
    & openssl req -new `
        -key "clients/$fileId.key" `
        -out "clients/$fileId.csr" `
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=$orgName/CN={$orgId}"
    Write-Host "✓ CSR生成 (CN={$orgId})" -ForegroundColor Green
    
    # クライアント証明書の生成（CA署名、3年有効）
    & openssl x509 -req -days 1095 `
        -in "clients/$fileId.csr" `
        -CA "ca/ca.crt" `
        -CAkey "ca/ca.key" `
        -CAcreateserial `
        -out "clients/$fileId.crt"
    Write-Host "✓ 証明書生成: $fileId.crt" -ForegroundColor Green
    
    # PKCS#12形式に変換（ブラウザインポート用）
    & openssl pkcs12 -export `
        -in "clients/$fileId.crt" `
        -inkey "clients/$fileId.key" `
        -out "clients/$fileId.p12" `
        -name "$orgName" `
        -passout pass:mmdpf123
    Write-Host "✓ PKCS#12形式生成: $fileId.p12 (パスワード: mmdpf123)" -ForegroundColor Green
    
    # CSRファイルを削除
    Remove-Item "clients/$fileId.csr" -ErrorAction SilentlyContinue
    
    Write-Host "✓ $orgName の証明書生成完了" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "証明書生成完了" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "生成されたファイル:" -ForegroundColor Green
Write-Host "  CA証明書:" -ForegroundColor Yellow
Write-Host "    - ca/ca.crt (Nginx設定で使用)"
Write-Host "    - ca/ca.key (厳重に管理)"
Write-Host ""
Write-Host "  サーバー証明書:" -ForegroundColor Yellow
Write-Host "    - server/server.crt"
Write-Host "    - server/server.key"
Write-Host ""
Write-Host "  クライアント証明書:" -ForegroundColor Yellow
foreach ($org in $organizations) {
    $orgId = $org.id
    $orgName = $org.name
    $fileId = $orgId.Replace("-", "")
    Write-Host "    - $orgName (UUID: {$orgId}):"
    Write-Host "      * clients/$fileId.p12 (ブラウザ用、パスワード: mmdpf123)"
}
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "  1. docker-compose up -d でコンテナを起動"
Write-Host "  2. ブラウザに clients/*.p12 ファイルをインポート（パスワード: mmdpf123）"
Write-Host "  3. https://localhost でアクセステスト"
Write-Host ""
Write-Host "⚠ セキュリティ警告:" -ForegroundColor Red
Write-Host "  - ca/ca.key は厳重に管理してください"
Write-Host "  - クライアント秘密鍵(.key)は外部に公開しないでください"
Write-Host ""
