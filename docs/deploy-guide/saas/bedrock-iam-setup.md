# IAM ロールへの Bedrock 権限付与手順

- **作成日**: 2026-04-10
- **対象**: SaaS版 AWS環境（ECS Fargate）
- **関連手順書**: `deploy-guide-aws.md` → 「AWS事前準備」

---

## 概要

ECS Fargate 上のバックエンドコンテナが AWS Bedrock を呼び出すために、  
ECS タスクロール（`ecsTaskRole`）に Bedrock の呼び出し権限を付与します。

### 対象リソース情報

| 項目 | 値 |
|---|---|
| **対象 IAM ロール** | `arn:aws:iam::137068252939:role/ecsTaskRole` |
| **使用する Bedrock モデル** | `cohere.embed-v4:0` |
| **Bedrock リージョン** | `ap-northeast-1` |
| **付与するポリシー名** | `BedrockPolicy`（インラインポリシー） |

---

## 付与するポリシー内容

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:ap-northeast-1::foundation-model/cohere.embed-v4:0"
      ]
    }
  ]
}
```

---

## 手順: AWS CLI から設定

```bash
# ① ポリシードキュメントを一時ファイルに作成
cat > /tmp/bedrock-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:ap-northeast-1::foundation-model/cohere.embed-v4:0"
      ]
    }
  ]
}
EOF

# ② ecsTaskRole にインラインポリシーとして付与
aws iam put-role-policy \
  --role-name ecsTaskRole \
  --policy-name BedrockPolicy \
  --policy-document file:///tmp/bedrock-policy.json

echo "✅ Bedrock権限付与完了"
```

---

## 設定後の確認

### ポリシー付与の確認

```bash
aws iam get-role-policy \
  --role-name ecsTaskRole \
  --policy-name BedrockPolicy
```

期待される出力（抜粋）：

```json
{
  "RoleName": "ecsTaskRole",
  "PolicyName": "BedrockPolicy",
  "PolicyDocument": {
    "Version": "2012-10-17",
    "Statement": [ ... ]
  }
}
```

### Bedrock モデルアクセスの確認

Bedrock は **IAM 権限とは別に、コンソールからモデルアクセスの有効化申請が必要**です。  
以下のコンソールで `cohere.embed-v4:0` が「アクセス許可済み」になっているか確認してください。

→ https://console.aws.amazon.com/bedrock/home?region=ap-northeast-1#/modelaccess

---

## 補足: アクセスキー不要の理由

ECS Fargate では、タスク起動時に `taskRoleArn` で指定した IAM ロールの  
**一時認証情報がコンテナ内に自動注入**されます（ECS Task Metadata エンドポイント経由）。

AWS SDK（Node.js）はこの認証情報を自動で使用するため、  
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` の環境変数設定は**不要**です。

> ✅ **タスク定義 JSON や環境変数に Bedrock 用のアクセスキーをハードコーディングしないでください。**

---

## 補足: 追加モデルを使用する場合

今後 Bedrock で別のモデルを追加する場合は、`Resource` の配列に ARN を追記します。

**例: Anthropic Claude を追加する場合**

```json
"Resource": [
  "arn:aws:bedrock:ap-northeast-1::foundation-model/cohere.embed-v4:0",
  "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
]
```

**例: 開発・検証環境でリージョン内の全モデルを許可する場合（本番環境では非推奨）**

```json
"Resource": "arn:aws:bedrock:ap-northeast-1::foundation-model/*"
```

---

## トラブルシューティング

### Bedrock の呼び出しが `AccessDeniedException` で失敗する

```bash
# ECS タスクロールに BedrockPolicy が付与されているか確認
aws iam get-role-policy \
  --role-name ecsTaskRole \
  --policy-name BedrockPolicy 2>/dev/null || \
aws iam list-attached-role-policies \
  --role-name ecsTaskRole

# Bedrock モデルアクセスの有効化状況を確認（コンソール推奨）
# https://console.aws.amazon.com/bedrock/home?region=ap-northeast-1#/modelaccess
```

**よくある原因:**

| 原因 | 対処 |
|---|---|
| `BedrockPolicy` が付与されていない | 本手順を再実施する |
| Bedrock のモデルアクセスが未申請 | コンソールの Model access から申請する |
| Resource ARN のモデル ID が一致しない | タスク定義の `BEDROCK_EMBEDDING_MODEL_ID` と Resource ARN を合わせる |
| IAM ロールが ECS タスクに紐付いていない | タスク定義の `taskRoleArn` が `ecsTaskRole` を指しているか確認 |

---

*本手順書は `deploy-guide-aws.md` の「AWS事前準備 — IAM ロールへの Bedrock 権限付与」を詳細化したものです。*
