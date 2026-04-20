#!/bin/bash
# =============================================================================
# Alchemia Staging - SSL証明書を AWS SSM Parameter Store に登録するスクリプト
# =============================================================================
#
# 用途:
#   backend/certs/ にある SSL 証明書を SSM Parameter Store に登録します。
#   ECS タスク定義の secrets セクションから参照するための事前準備です。
#
# 使用方法:
#   ./scripts/setup-ssm-ssl.sh [--dry-run]
#
# オプション:
#   --dry-run   実際には登録せず、登録内容を確認のみ表示する
#
# 前提条件:
#   - AWS CLI がインストール・設定済みであること
#   - 以下の証明書ファイルが存在すること:
#       backend/certs/server/server.crt
#       backend/certs/server/server.key
#       backend/certs/ca/ca.crt
#   - 実行ユーザーが SSM の PutParameter 権限を持つこと
#
# 登録パラメータ:
#   /alchemia/nginx/ssl-cert    - サーバー証明書 (String)
#   /alchemia/nginx/ssl-key     - サーバー秘密鍵 (SecureString)
#   /alchemia/nginx/ssl-ca-cert - CA証明書 (String)
#
# IAM権限 (ecsTaskExecutionRole に付与が必要):
#   ssm:GetParameters
#   ssm:GetParameter
#   対象: arn:aws:ssm:ap-northeast-1:137068252939:parameter/alchemia/nginx/*
# =============================================================================

set -e

REGION="ap-northeast-1"
ACCOUNT_ID="137068252939"
DRY_RUN=false

# 引数解析
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
    esac
done

# =============================================================================
# 証明書ファイルのパス
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SERVER_CRT="${PROJECT_ROOT}/backend/certs/server/server.crt"
SERVER_KEY="${PROJECT_ROOT}/backend/certs/server/server.key"
CA_CRT="${PROJECT_ROOT}/backend/certs/ca/ca.crt"

# =============================================================================
# 事前確認
# =============================================================================
echo "========================================"
echo " SSL証明書 SSM Parameter Store 登録"
echo "========================================"
echo ""
echo "リージョン  : ${REGION}"
echo "アカウントID: ${ACCOUNT_ID}"
echo ""
echo "証明書ファイル確認:"

error=0
for f in "$SERVER_CRT" "$SERVER_KEY" "$CA_CRT"; do
    if [ -f "$f" ]; then
        echo "  ✅ $f"
    else
        echo "  ❌ $f (見つかりません)"
        error=1
    fi
done

if [ $error -ne 0 ]; then
    echo ""
    echo "❌ 証明書ファイルが不足しています。"
    echo "   backend/certs/ 配下に以下のファイルが必要です:"
    echo "     server/server.crt"
    echo "     server/server.key"
    echo "     ca/ca.crt"
    echo ""
    echo "   証明書を生成するには:"
    echo "     bash scripts/generate-certificates.sh"
    exit 1
fi

echo ""
echo "証明書情報:"
echo "  server.crt: $(openssl x509 -noout -subject -dates -in "$SERVER_CRT" 2>/dev/null | tr '\n' ' ')"
echo "  ca.crt    : $(openssl x509 -noout -subject -dates -in "$CA_CRT" 2>/dev/null | tr '\n' ' ')"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "========================================"
    echo " [DRY-RUN] 以下のパラメータを登録します"
    echo "========================================"
    echo ""
    echo "  /alchemia/nginx/ssl-cert    (String)       ← server.crt"
    echo "  /alchemia/nginx/ssl-key     (SecureString) ← server.key"
    echo "  /alchemia/nginx/ssl-ca-cert (String)       ← ca.crt"
    echo ""
    echo "[DRY-RUN] --dry-run を外して実行すると実際に登録されます。"
    exit 0
fi

# =============================================================================
# SSM Parameter Store に登録
# =============================================================================
echo "SSM Parameter Store に証明書を登録します..."
echo ""

# サーバー証明書
echo "[1/3] /alchemia/nginx/ssl-cert を登録中..."
aws ssm put-parameter \
    --name "/alchemia/nginx/ssl-cert" \
    --value "$(cat "$SERVER_CRT")" \
    --type "String" \
    --description "Alchemia Staging - nginx サーバー証明書 (PEM)" \
    --overwrite \
    --region "$REGION" \
    --tier Standard
echo "  ✅ 登録完了"

# サーバー秘密鍵
echo "[2/3] /alchemia/nginx/ssl-key を登録中..."
aws ssm put-parameter \
    --name "/alchemia/nginx/ssl-key" \
    --value "$(cat "$SERVER_KEY")" \
    --type "SecureString" \
    --description "Alchemia Staging - nginx サーバー秘密鍵 (PEM)" \
    --overwrite \
    --region "$REGION" \
    --tier Standard
echo "  ✅ 登録完了"

# CA証明書
echo "[3/3] /alchemia/nginx/ssl-ca-cert を登録中..."
aws ssm put-parameter \
    --name "/alchemia/nginx/ssl-ca-cert" \
    --value "$(cat "$CA_CRT")" \
    --type "String" \
    --description "Alchemia Staging - クライアント証明書検証用 CA 証明書 (PEM)" \
    --overwrite \
    --region "$REGION" \
    --tier Standard
echo "  ✅ 登録完了"

echo ""
echo "========================================"
echo " ✅ SSM Parameter Store 登録完了"
echo "========================================"
echo ""

# =============================================================================
# 登録確認
# =============================================================================
echo "登録されたパラメータ:"
aws ssm describe-parameters \
    --filters "Key=Name,Values=/alchemia/nginx/" \
    --region "$REGION" \
    --query 'Parameters[*].{Name:Name,Type:Type,LastModified:LastModifiedDate}' \
    --output table

echo ""
echo "========================================"
echo " 次のステップ"
echo "========================================"
echo ""
echo "① ecsTaskExecutionRole に SSM 読み取り権限を付与（未設定の場合のみ）:"
echo ""
echo "   # インラインポリシーで追加する場合"
echo "   aws iam put-role-policy \\"
echo "     --role-name ecsTaskExecutionRole \\"
echo "     --policy-name AlchemiaNginxSSMPolicy \\"
echo "     --policy-document '{"
echo "       \"Version\": \"2012-10-17\","
echo "       \"Statement\": [{"
echo "         \"Effect\": \"Allow\","
echo "         \"Action\": [\"ssm:GetParameters\", \"ssm:GetParameter\"],"
echo "         \"Resource\": \"arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/alchemia/nginx/*\""
echo "       }]"
echo "     }'"
echo ""
echo "   # または AmazonSSMReadOnlyAccess を付与（全SSM読み取りが許可されます）"
echo "   aws iam attach-role-policy \\"
echo "     --role-name ecsTaskExecutionRole \\"
echo "     --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
echo ""
echo "② nginx を再デプロイ:"
echo "   ./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push"
echo ""
