# 構築手順書: 検証環境に本番想定 ALB + alchemia-frontend-service を並列追加

- **作成日**: 2026-04-23
- **対象**: `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT10.md` に記載の構成
- **方針**: 既存の検証環境（NLB + alchemia-nginx-service）を一切変更せず、本番想定の ALB（mTLS verify）と alchemia-frontend-service を並列追加する

---

## 目次

1. [前提条件・事前確認](#1-前提条件事前確認)
2. [バックエンドコードの変更](#2-バックエンドコードの変更)
3. [フロントエンドDockerイメージのビルド＆ECRプッシュ](#3-フロントエンドdockerイメージのビルドecrプッシュ)
4. [セキュリティグループの作成・変更](#4-セキュリティグループの作成変更)
5. [ACM Trust Store の作成](#5-acm-trust-store-の作成)
6. [ACM サーバー証明書の登録](#6-acm-サーバー証明書の登録)
7. [ALB ターゲットグループの作成](#7-alb-ターゲットグループの作成)
8. [新規 ALB の作成](#8-新規-alb-の作成)
9. [ECS タスク定義の作成・更新](#9-ecs-タスク定義の作成更新)
10. [ECS サービスの作成・更新](#10-ecs-サービスの作成更新)
11. [動作確認](#11-動作確認)
12. [ロールバック手順](#12-ロールバック手順)
13. [IAM権限が不足している場合の対処法](#13-iam権限が不足している場合の対処法)

---

## 前提・環境情報

| 項目 | 値 |
|------|-----|
| AWS リージョン | `ap-northeast-1` |
| AWS アカウントID | `137068252939` |
| ECS クラスター | `alchemia-staging` |
| ECR ベース URL | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com` |
| 既存 ALB | `alchemia-staging-alb-987042084.ap-northeast-1.elb.amazonaws.com` |
| 既存 NLB | `alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com` |
| CA証明書パス | `backend/certs/ca/ca.crt` |
| サーバー証明書パス | `backend/certs/server/server.crt` / `backend/certs/server/server.key` |

---

## 1. 前提条件・事前確認

### 1-1. 必要なIAM権限

作業を行うIAMユーザー/ロールに以下の権限があることを確認する。

```
elasticloadbalancing:*
acm:*
ec2:AuthorizeSecurityGroupIngress
ec2:CreateSecurityGroup
ec2:DescribeSecurityGroups
ecs:RegisterTaskDefinition
ecs:CreateService
ecs:UpdateService
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:PutImage
s3:PutObject
```

#### 確認手順

**Step 1: 現在の認証情報（実行者）を確認する**

```bash
aws sts get-caller-identity
```

出力例:
```json
{
    "UserId": "AIDA...",
    "Account": "137068252939",
    "Arn": "arn:aws:iam::137068252939:user/your-username"
}
```

`Arn` の値が、作業対象のIAMユーザーまたはロールであることを確認する。

**Step 2: 必要な権限を一括でシミュレーション確認する**

```bash
# 現在の認証情報のARNを取得
CALLER_ARN=$(aws sts get-caller-identity --query 'Arn' --output text)

# 必要な権限をまとめて確認
aws iam simulate-principal-policy \
  --policy-source-arn ${CALLER_ARN} \
  --action-names \
    "elasticloadbalancing:CreateLoadBalancer" \
    "elasticloadbalancing:CreateListener" \
    "elasticloadbalancing:CreateTargetGroup" \
    "elasticloadbalancing:CreateRule" \
    "elasticloadbalancing:DeleteLoadBalancer" \
    "elasticloadbalancing:DeleteListener" \
    "elasticloadbalancing:DeleteTargetGroup" \
    "acm:ImportCertificate" \
    "acm:CreateTrustStore" \
    "acm:DescribeTrustStores" \
    "ec2:AuthorizeSecurityGroupIngress" \
    "ec2:CreateSecurityGroup" \
    "ec2:DescribeSecurityGroups" \
    "ec2:RevokeSecurityGroupIngress" \
    "ec2:DeleteSecurityGroup" \
    "ecs:RegisterTaskDefinition" \
    "ecs:CreateService" \
    "ecs:UpdateService" \
    "ecs:DeleteService" \
    "ecr:GetAuthorizationToken" \
    "ecr:BatchCheckLayerAvailability" \
    "ecr:PutImage" \
    "s3:PutObject" \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table
```

**結果の見方:**

| EvalDecision | 意味 |
|---|---|
| `allowed` | ✅ 権限あり（作業可能） |
| `implicitDeny` | ❌ ポリシーで許可されていない |
| `explicitDeny` | ❌ ポリシーで明示的に拒否されている |

全行が `allowed` であることを確認してから次の手順に進むこと。  
`implicitDeny` または `explicitDeny` が含まれている場合は「[13. IAM権限が不足している場合の対処法](#13-iam権限が不足している場合の対処法)」を参照すること。

### 1-2. 既存リソースの確認

以下のコマンドで既存リソースが正常稼働していることを確認する。

```bash
# ECS サービスの状態確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service alchemia-backend-service \
  --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount}' \
  --output table

# 既存 ALB の状態確認
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?contains(LoadBalancerName,`alchemia-staging`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}' \
  --output table

# 既存セキュリティグループの一覧確認
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=alchemia-*" \
  --query 'SecurityGroups[*].{Name:GroupName,ID:GroupId}' \
  --output table
```

> **注意**: 既存の `alchemia-nginx-service` と `alchemia-backend-service` の `runningCount` が `desiredCount` と一致していることを確認してから次の手順に進むこと。

### 1-3. VPC・サブネット情報の取得

後続の手順で使用するVPC IDとサブネットIDを取得しておく。

```bash
# VPC ID 取得（alchemia-staging のリソースが属するVPC）
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=*alchemia*" \
  --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==`Name`].Value|[0]}' \
  --output table

# パブリックサブネット（ALB用）の取得
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query 'Subnets[*].{SubnetId:SubnetId,AZ:AvailabilityZone,Public:MapPublicIpOnLaunch,Name:Tags[?Key==`Name`].Value|[0]}' \
  --output table
```

> `<VPC_ID>` は上記コマンドで取得した値に置き換えること。以降の手順でも同様。

---

## 2. バックエンドコードの変更

> **参照**: `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT3.md`

既存の nginx モードと新規の ALB mTLS モードを環境変数 `ORG_ID_SOURCE` で切り替えられるように変更する。

### 2-1. `backend/src/controllers/authController.ts` の変更

ファイル冒頭付近（`import` の直後）に以下のヘルパー関数を追加する。

```typescript
/**
 * リクエストから organization_id を取得する
 * ORG_ID_SOURCE 環境変数で取得元を切り替え
 *   - "alb"  : ALB mTLS ヘッダー X-Amzn-Mtls-Clientcert-Subject の CN を解析
 *   - "nginx": nginx が付与した X-Organization-Id をそのまま使用（デフォルト）
 */
function getOrganizationId(req: Request): string | undefined {
  const source = process.env.ORG_ID_SOURCE || 'nginx';

  if (source === 'alb') {
    const subject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
    const match = subject?.match(/CN=([^,]+)/);
    return match?.[1] || (req.query.orgId as string);
  } else {
    // nginx モード（デフォルト・既存検証環境）
    return (req.headers['x-organization-id'] || req.query.orgId) as string;
  }
}
```

次に以下の7箇所を `getOrganizationId(req)` に置き換える。

| 行（目安） | 関数 | 変更内容 |
|----------|------|---------|
| L27 | `login()` | `(req.headers['x-organization-id'] \|\| req.query.orgId) as string` → `getOrganizationId(req)` |
| L70 | `login()` catch | `req.headers['x-organization-id'] as string` → `getOrganizationId(req)` |
| L104 | `resetPasswordRequest()` | 同上（取得ロジック） |
| L135 | `resetPasswordRequest()` catch | 同上（ログ出力） |
| L233 | `resendPin()` | 同上（取得ロジック） |
| L272 | `resendPin()` catch | 同上（ログ出力） |
| L409 | `verifyPin()` catch | 同上（ログ出力） |

### 2-2. `backend/src/routes/authRoutes.ts` の変更

#### CORS の allowedHeaders（L22付近）

```typescript
// 変更前
allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],

// 変更後（ALB 付与ヘッダーは CORS 対象外のため X-Organization-Id を削除）
allowedHeaders: ['Content-Type', 'Authorization'],
```

#### `validateOrgId()` 関数（L27〜36付近）

```typescript
const validateOrgId = () => {
  const source = process.env.ORG_ID_SOURCE || 'nginx';

  if (source === 'alb') {
    return oneOf([
      query('orgId').notEmpty()
        .withMessage('Organization ID is required in query parameter'),
      header('x-amzn-mtls-clientcert-subject').notEmpty()
        .withMessage('Client certificate subject header is required'),
    ], { message: 'Organization ID is required' });
  } else {
    return oneOf([
      query('orgId').notEmpty()
        .withMessage('Organization ID is required in query parameter'),
      header('x-organization-id').notEmpty()
        .withMessage('Organization ID is required in header'),
    ], { message: 'Organization ID is required in either query parameter (orgId) or header (X-Organization-Id)' });
  }
};
```

### 2-3. バックエンドのビルド＆ECRプッシュ

```bash
# ECR にログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com

# バックエンドイメージをビルド（production タグ）
docker build -t mmdpf-backend:production -f backend/Dockerfile.prod ./backend

# ECR にタグ付けしてプッシュ
docker tag mmdpf-backend:production \
  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:production

docker push \
  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:production
```

> **注意**: `staging` タグのイメージは上書きしないこと。既存の `alchemia-nginx-service` / `alchemia-backend-service` は `staging` タグを参照しているため、変更してはいけない。

---

## 3. フロントエンドDockerイメージのビルド＆ECRプッシュ

新規 ALB の DNS 名が確定した後に実施する（手順 8 完了後）。  
`NEXT_PUBLIC_*` はビルド時に静的埋め込みされるため、新規 ALB 専用の `production` タグで別途ビルドする。

### 3-1. 新規 ALB の DNS 名を確認

手順 8 完了後、以下で DNS 名を取得する。

```bash
aws elbv2 describe-load-balancers \
  --names alchemia-production-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

取得した DNS 名（例: `alchemia-production-alb-XXXXXXXXX.ap-northeast-1.elb.amazonaws.com`）を以下の手順で使用する。

### 3-2. フロントエンドイメージのビルド

```bash
# 新規 ALB の DNS 名を変数に設定
NEW_ALB_DNS="<手順8で取得した新規ALBのDNS名>"

# フロントエンドイメージをビルド（production タグ）
# NEXT_PUBLIC_API_BASE_URL を新規 ALB の DNS 名に設定する
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL="https://${NEW_ALB_DNS}/api" \
  -t mmdpf-frontend:production \
  -f frontend/Dockerfile.prod \
  ./frontend

# ECR にタグ付けしてプッシュ
docker tag mmdpf-frontend:production \
  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend:production

docker push \
  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend:production
```

> **注意**:
> - `staging` タグのイメージは上書きしないこと
> - `Dockerfile.prod` が `NEXT_PUBLIC_API_BASE_URL` を `ARG` で受け取れるか事前に確認すること
> - `ARG` が定義されていない場合は `ARG NEXT_PUBLIC_API_BASE_URL` を `Dockerfile.prod` の冒頭に追加する

---

## 4. セキュリティグループの作成・変更

### 4-1. 新規 ALB 用セキュリティグループの作成（`alchemia-alb-sg`）

```bash
# VPC IDを変数に設定
VPC_ID="<1-3で取得したVPC ID>"

# セキュリティグループ作成
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name "alchemia-alb-sg" \
  --description "Security group for alchemia production ALB (mTLS)" \
  --vpc-id ${VPC_ID} \
  --query 'GroupId' \
  --output text)

echo "ALB SG ID: ${ALB_SG_ID}"

# インバウンドルール: HTTPS:443 をインターネット全体に開放
aws ec2 authorize-security-group-ingress \
  --group-id ${ALB_SG_ID} \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# タグ付け
aws ec2 create-tags \
  --resources ${ALB_SG_ID} \
  --tags Key=Name,Value=alchemia-alb-sg \
         Key=Project,Value=alchemia-staging \
         Key=Environment,Value=staging
```

### 4-2. フロントエンド ECS タスク用セキュリティグループの作成（`alchemia-frontend-sg`）

```bash
# セキュリティグループ作成
FRONTEND_SG_ID=$(aws ec2 create-security-group \
  --group-name "alchemia-frontend-sg" \
  --description "Security group for alchemia-frontend-service ECS tasks" \
  --vpc-id ${VPC_ID} \
  --query 'GroupId' \
  --output text)

echo "Frontend SG ID: ${FRONTEND_SG_ID}"

# インバウンドルール: TCP:3000 を alchemia-alb-sg からのみ許可
aws ec2 authorize-security-group-ingress \
  --group-id ${FRONTEND_SG_ID} \
  --protocol tcp \
  --port 3000 \
  --source-group ${ALB_SG_ID}

# タグ付け
aws ec2 create-tags \
  --resources ${FRONTEND_SG_ID} \
  --tags Key=Name,Value=alchemia-frontend-sg \
         Key=Project,Value=alchemia-staging \
         Key=Environment,Value=staging
```

### 4-3. 既存バックエンド用セキュリティグループへのルール追加（`alchemia-backend-sg`）

```bash
# 既存 alchemia-backend-sg の ID を取得
BACKEND_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=alchemia-backend-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "Backend SG ID: ${BACKEND_SG_ID}"

# インバウンドルール追加: TCP:3001 を alchemia-alb-sg からも許可（既存 nginx-sg ルールは変更なし）
aws ec2 authorize-security-group-ingress \
  --group-id ${BACKEND_SG_ID} \
  --protocol tcp \
  --port 3001 \
  --source-group ${ALB_SG_ID}

# 確認: 追加後のインバウンドルール一覧
aws ec2 describe-security-groups \
  --group-ids ${BACKEND_SG_ID} \
  --query 'SecurityGroups[0].IpPermissions' \
  --output json
```

> **確認ポイント**: 既存の `alchemia-nginx-sg` からの TCP:3001 許可ルールが **削除されていないこと**を必ず確認すること。

---

## 5. ACM Trust Store の作成

`backend/certs/ca/ca.crt` を使用して ACM Trust Store を作成する。

### 5-1. CA 証明書を S3 にアップロード

```bash
# 一時的なアップロード先 S3 バケットを指定（既存の mmdpf-files-production を使用可）
S3_BUCKET="mmdpf-files-production"

aws s3 cp backend/certs/ca/ca.crt \
  s3://${S3_BUCKET}/acm-trust-store/ca.crt

# アップロード確認
aws s3 ls s3://${S3_BUCKET}/acm-trust-store/
```

### 5-2. ACM Trust Store を作成

```bash
TRUST_STORE_ARN=$(aws acm create-trust-store \
  --name "alchemia-mmdpf-ca-trust-store" \
  --ca-certificate-bundle-s3-bucket "${S3_BUCKET}" \
  --ca-certificate-bundle-s3-key "acm-trust-store/ca.crt" \
  --query 'TrustStoreArn' \
  --output text)

echo "Trust Store ARN: ${TRUST_STORE_ARN}"
```

> `TRUST_STORE_ARN` は手順 8 の ALB リスナー作成時に使用するため、メモしておくこと。

### 5-3. Trust Store の確認

```bash
aws acm describe-trust-stores \
  --trust-store-arn ${TRUST_STORE_ARN} \
  --query 'TrustStores[0].{Name:Name,Status:Status,NumberOfCACertificates:NumberOfCACertificates}'
```

`Status: ACTIVE`、`NumberOfCACertificates: 1` であることを確認する。

---

## 6. ACM サーバー証明書の登録

ALB の HTTPS:443 リスナーに紐付けるサーバー証明書を ACM にインポートする。  
（カスタムドメインがない検証環境のため、既存の自己署名証明書 `backend/certs/server/` を使用）

### 6-1. 証明書のインポート

```bash
SERVER_CERT_ARN=$(aws acm import-certificate \
  --certificate fileb://backend/certs/server/server.crt \
  --private-key fileb://backend/certs/server/server.key \
  --certificate-chain fileb://backend/certs/ca/ca.crt \
  --query 'CertificateArn' \
  --output text)

echo "Server Certificate ARN: ${SERVER_CERT_ARN}"
```

> `SERVER_CERT_ARN` は手順 8 の ALB リスナー作成時に使用するため、メモしておくこと。

### 6-2. 証明書の確認

```bash
aws acm describe-certificate \
  --certificate-arn ${SERVER_CERT_ARN} \
  --query 'Certificate.{Domain:DomainName,Status:Status,NotAfter:NotAfter}'
```

`Status: ISSUED` であることを確認する。

---

## 7. ALB ターゲットグループの作成

新規 ALB から ECS タスクへのルーティング先となるターゲットグループを2つ作成する。

### 7-1. backend ターゲットグループの作成（`alchemia-backend-tg`）

```bash
BACKEND_TG_ARN=$(aws elbv2 create-target-group \
  --name "alchemia-backend-tg" \
  --protocol HTTP \
  --port 3001 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path "/api/health" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Backend TG ARN: ${BACKEND_TG_ARN}"
```

### 7-2. frontend ターゲットグループの作成（`alchemia-frontend-tg`）

```bash
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
  --name "alchemia-frontend-tg" \
  --protocol HTTP \
  --port 3000 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Frontend TG ARN: ${FRONTEND_TG_ARN}"
```

### 7-3. ターゲットグループの確認

```bash
aws elbv2 describe-target-groups \
  --names alchemia-backend-tg alchemia-frontend-tg \
  --query 'TargetGroups[*].{Name:TargetGroupName,Port:Port,Protocol:Protocol,TargetType:TargetType}' \
  --output table
```

---

## 8. 新規 ALB の作成

### 8-1. ALB の作成

ALB はパブリックサブネットに配置する（2AZ以上のサブネットが必要）。

```bash
# パブリックサブネットIDを変数に設定（複数AZのサブネットを指定）
PUBLIC_SUBNET_1="<パブリックサブネット1のID (ap-northeast-1a)>"
PUBLIC_SUBNET_2="<パブリックサブネット2のID (ap-northeast-1c)>"

NEW_ALB_ARN=$(aws elbv2 create-load-balancer \
  --name "alchemia-production-alb" \
  --subnets ${PUBLIC_SUBNET_1} ${PUBLIC_SUBNET_2} \
  --security-groups ${ALB_SG_ID} \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "New ALB ARN: ${NEW_ALB_ARN}"

# ALB の DNS 名を取得（手順 3 で使用）
NEW_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${NEW_ALB_ARN} \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "New ALB DNS: ${NEW_ALB_DNS}"
```

### 8-2. HTTPS:443 リスナーの作成（mTLS verify モード）

```bash
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn ${NEW_ALB_ARN} \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=${SERVER_CERT_ARN} \
  --default-actions Type=forward,TargetGroupArn=${FRONTEND_TG_ARN} \
  --mutual-authentication Mode=verify,TrustStoreArn=${TRUST_STORE_ARN} \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "Listener ARN: ${LISTENER_ARN}"
```

### 8-3. リスナールールの追加（/api/* → backend-tg）

```bash
# /api/* を backend-tg にルーティングするルールを追加（priority=1）
aws elbv2 create-rule \
  --listener-arn ${LISTENER_ARN} \
  --priority 1 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=${BACKEND_TG_ARN}
```

> デフォルトルール（`/*` → `alchemia-frontend-tg`）はリスナー作成時に既に設定済み。

### 8-4. ALB の状態確認

```bash
aws elbv2 describe-load-balancers \
  --load-balancer-arns ${NEW_ALB_ARN} \
  --query 'LoadBalancers[0].{Name:LoadBalancerName,State:State.Code,DNS:DNSName}'

# リスナー設定確認
aws elbv2 describe-listeners \
  --load-balancer-arn ${NEW_ALB_ARN} \
  --query 'Listeners[*].{Port:Port,Protocol:Protocol,DefaultAction:DefaultActions[0].Type}'

# ルール確認
aws elbv2 describe-rules \
  --listener-arn ${LISTENER_ARN} \
  --query 'Rules[*].{Priority:Priority,Conditions:Conditions[0].Values,TargetGroup:Actions[0].TargetGroupArn}' \
  --output table
```

---

## 9. ECS タスク定義の作成・更新

### 9-1. alchemia-frontend タスク定義の作成（新規）

以下の内容を `aws/ecs-task-definition-alchemia-frontend.json` として保存する。

```json
{
  "family": "alchemia-frontend",
  "taskRoleArn": "arn:aws:iam::137068252939:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::137068252939:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "mmdpf-frontend",
      "image": "137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend:production",
      "essential": true,
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV",                "value": "production" },
        { "name": "PORT",                    "value": "3000" },
        { "name": "NEXT_TELEMETRY_DISABLED", "value": "1" },
        { "name": "NEXT_PUBLIC_API_URL",     "value": "/api/v1" }
      ],
      "mountPoints": [],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group":         "/ecs/alchemia-frontend",
          "awslogs-region":        "ap-northeast-1",
          "awslogs-stream-prefix": "frontend",
          "awslogs-create-group":  "true"
        }
      },
      "healthCheck": {
        "command":     ["CMD-SHELL", "wget -qO- http://localhost:3000/ || exit 1"],
        "interval":    30,
        "timeout":     10,
        "retries":     3,
        "startPeriod": 60
      },
      "ulimits": [
        { "name": "nofile", "softLimit": 65536, "hardLimit": 65536 }
      ]
    }
  ],
  "tags": [
    { "key": "Project",     "value": "alchemia-staging" },
    { "key": "Environment", "value": "staging" },
    { "key": "Service",     "value": "frontend" }
  ]
}
```

タスク定義を登録する。

```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition-alchemia-frontend.json

# 登録確認
aws ecs describe-task-definition \
  --task-definition alchemia-frontend \
  --query 'taskDefinition.{Family:family,Revision:revision,Status:status}'
```

### 9-2. alchemia-backend タスク定義の更新（`ORG_ID_SOURCE=alb` 追加）

既存のタスク定義をベースに `ORG_ID_SOURCE` 環境変数を追加した新リビジョンを登録する。

```bash
# 既存タスク定義の取得（environment 部分を確認）
aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --query 'taskDefinition.containerDefinitions[0].environment' \
  --output json
```

`aws/ecs-task-definition-alchemia-backend.json` の `environment` 配列末尾に以下を追加する。

```json
{ "name": "ORG_ID_SOURCE", "value": "alb" }
```

また、`image` タグを `production` に変更する。

```json
"image": "137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:production"
```

更新後のタスク定義を登録する。

```bash
# ファイルを編集後、新リビジョンとして登録
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition-alchemia-backend.json

# 登録確認
aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --query 'taskDefinition.{Family:family,Revision:revision,Status:status}'
```

---

## 10. ECS サービスの作成・更新

### 10-1. alchemia-frontend-service の作成（新規）

```bash
# プライベートサブネットIDを変数に設定（assignPublicIp=DISABLED のためプライベート推奨）
PRIVATE_SUBNET_1="<プライベートサブネット1のID>"
PRIVATE_SUBNET_2="<プライベートサブネット2のID>"

aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-frontend-service \
  --task-definition alchemia-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1},${PRIVATE_SUBNET_2}],securityGroups=[${FRONTEND_SG_ID}],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=${FRONTEND_TG_ARN},containerName=mmdpf-frontend,containerPort=3000" \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=50" \
  --tags key=Project,value=alchemia-staging key=Environment,value=staging key=Service,value=frontend
```

### 10-2. alchemia-backend-service の更新（新タスク定義リビジョンに切り替え）

```bash
# 最新リビジョン番号を取得
BACKEND_TASK_REVISION=$(aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --query 'taskDefinition.revision' \
  --output text)

# サービスを最新タスク定義リビジョンに更新
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --task-definition alchemia-backend:${BACKEND_TASK_REVISION} \
  --load-balancers "targetGroupArn=${BACKEND_TG_ARN},containerName=mmdpf-backend,containerPort=3001" \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=50"
```

> **注意**: `alchemia-backend-service` はもともと NLB 経由の既存パス②でも使用されている。  
> Service Discovery（`alchemia-backend.alchemia.local`）での疎通が引き続き機能していることを確認すること。

### 10-3. サービスの起動確認

```bash
# alchemia-frontend-service の起動確認（runningCount が desiredCount と一致するまで待機）
watch -n 10 "aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-frontend-service alchemia-backend-service \
  --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount,pending:pendingCount}' \
  --output table"
```

`runningCount == desiredCount == 1` になるまで待機する（通常 2〜5 分程度）。

---

## 11. 動作確認

### 11-1. ターゲットグループのヘルスチェック確認

```bash
# backend-tg のヘルスチェック状態
aws elbv2 describe-target-health \
  --target-group-arn ${BACKEND_TG_ARN} \
  --query 'TargetHealthDescriptions[*].{TargetId:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table

# frontend-tg のヘルスチェック状態
aws elbv2 describe-target-health \
  --target-group-arn ${FRONTEND_TG_ARN} \
  --query 'TargetHealthDescriptions[*].{TargetId:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table
```

両ターゲットの `State: healthy` を確認する。

### 11-2. パス③（新規 ALB mTLS）の疎通確認

クライアント証明書（.p12）をブラウザにインポート済みの環境から確認する。

**ブラウザでの確認**:
1. Chrome に クライアント証明書（.p12）がインポート済みであることを確認
2. `https://${NEW_ALB_DNS}/` にアクセス
3. フロントエンド（ログイン画面）が表示されることを確認
4. ログインが正常に完了することを確認
5. 各種API（プロジェクト一覧等）が正常に返ることを確認

**curl による疎通確認**（証明書ファイルがある場合）:

```bash
# ヘルスチェックエンドポイントの確認（証明書なし → 400 が期待値）
curl -k -o /dev/null -w "%{http_code}" https://${NEW_ALB_DNS}/api/health
# → 400（mTLS 検証失敗）が返れば ALB は正常動作

# クライアント証明書を指定してアクセス（成功するはず）
# ※ .p12 を .pem / .key に変換しておく必要あり
# openssl pkcs12 -in client.p12 -clcerts -nokeys -out client.crt -passin pass:mmdpf123
# openssl pkcs12 -in client.p12 -nocerts -nodes -out client.key -passin pass:mmdpf123
curl -k \
  --cert client.crt \
  --key client.key \
  https://${NEW_ALB_DNS}/api/health
# → {"status":"ok"} が返れば成功
```

### 11-3. 既存パス①②が壊れていないことの確認

```bash
# パス①: 既存 ALB (HTTP:80) の確認
curl -o /dev/null -w "%{http_code}" \
  "http://alchemia-staging-alb-987042084.ap-northeast-1.elb.amazonaws.com/?orgId=<任意のUUID>"
# → 200 または 302 が期待値

# パス②: 既存 NLB (TCP:443 パススルー) はブラウザで確認
# https://alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com/
# → フロントエンドが表示されることを確認
```

### 11-4. CloudWatch Logs の確認

```bash
# alchemia-frontend-service のログ確認
aws logs tail /ecs/alchemia-frontend --follow --format short

# alchemia-backend-service のログ確認（ORG_ID_SOURCE=alb で動作しているか確認）
aws logs tail /ecs/alchemia-backend --follow --format short
```

---

## 12. ロールバック手順

問題が発生した場合の切り戻し手順を記載する。

### 12-1. alchemia-backend-service を旧タスク定義に戻す

```bash
# 旧リビジョン番号を確認（ORG_ID_SOURCE が含まれていない最後のリビジョン）
aws ecs list-task-definitions \
  --family-prefix alchemia-backend \
  --sort DESC \
  --query 'taskDefinitionArns' \
  --output table

# 旧リビジョンに戻す（例: alchemia-backend:5 が旧バージョンの場合）
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --task-definition alchemia-backend:<旧リビジョン番号>
```

### 12-2. alchemia-frontend-service の削除

```bash
# desiredCount を 0 に変更してタスクを停止
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-frontend-service \
  --desired-count 0

# サービスを削除
aws ecs delete-service \
  --cluster alchemia-staging \
  --service alchemia-frontend-service \
  --force
```

### 12-3. 新規 ALB の削除

```bash
# リスナーを削除
aws elbv2 delete-listener --listener-arn ${LISTENER_ARN}

# ALB を削除
aws elbv2 delete-load-balancer --load-balancer-arn ${NEW_ALB_ARN}
```

### 12-4. ターゲットグループの削除

```bash
aws elbv2 delete-target-group --target-group-arn ${BACKEND_TG_ARN}
aws elbv2 delete-target-group --target-group-arn ${FRONTEND_TG_ARN}
```

### 12-5. セキュリティグループのルール・リソース削除

```bash
# backend-sg から追加したルールを削除
aws ec2 revoke-security-group-ingress \
  --group-id ${BACKEND_SG_ID} \
  --protocol tcp \
  --port 3001 \
  --source-group ${ALB_SG_ID}

# 新規 SG を削除
aws ec2 delete-security-group --group-id ${FRONTEND_SG_ID}
aws ec2 delete-security-group --group-id ${ALB_SG_ID}
```

---

## 作業チェックリスト

### 事前確認
- [ ] 必要な IAM 権限が付与されていることを確認
- [ ] 既存 ECS サービス（nginx/backend）が正常稼働していることを確認
- [ ] VPC ID・サブネット ID を取得済み

### コード変更・ビルド
- [ ] `authController.ts` に `getOrganizationId()` ヘルパー関数を追加
- [ ] `authController.ts` の7箇所を `getOrganizationId(req)` に統一
- [ ] `authRoutes.ts` の `validateOrgId()` を `ORG_ID_SOURCE` 切り替えに変更
- [ ] `authRoutes.ts` の CORS `allowedHeaders` から `X-Organization-Id` を削除
- [ ] バックエンドを `production` タグでビルド＆ECRプッシュ（`staging` タグは変更しない）

### AWSリソース作成
- [ ] `alchemia-alb-sg` を作成（TCP:443 from 0.0.0.0/0）
- [ ] `alchemia-frontend-sg` を作成（TCP:3000 from alchemia-alb-sg）
- [ ] `alchemia-backend-sg` に新規ルール追加（TCP:3001 from alchemia-alb-sg）
- [ ] ACM Trust Store を作成（`ca.crt` を S3 経由でアップロード）
- [ ] ACM サーバー証明書をインポート
- [ ] `alchemia-backend-tg` を作成（HTTP:3001、ヘルスチェック: /api/health）
- [ ] `alchemia-frontend-tg` を作成（HTTP:3000、ヘルスチェック: /）
- [ ] 新規 ALB を作成（HTTPS:443、mTLS verify モード）
- [ ] ALB リスナールールを設定（/api/* → backend-tg、/* → frontend-tg）

### フロントエンドビルド（ALB DNS 確定後）
- [ ] 新規 ALB の DNS 名を取得
- [ ] フロントエンドを `NEXT_PUBLIC_API_BASE_URL` 設定済みの `production` タグでビルド＆ECRプッシュ

### ECS設定
- [ ] `alchemia-frontend` タスク定義を新規登録
- [ ] `alchemia-backend` タスク定義に `ORG_ID_SOURCE=alb` を追加して新リビジョン登録
- [ ] `alchemia-frontend-service` を新規作成（desiredCount=1）
- [ ] `alchemia-backend-service` を新タスク定義リビジョンに更新

### 動作確認
- [ ] 両ターゲットグループのヘルスチェックが `healthy`
- [ ] パス③（新規 ALB mTLS）でフロントエンドが表示される
- [ ] パス③でログイン・API が正常動作する
- [ ] パス①（既存 ALB HTTP:80）が引き続き正常動作する
- [ ] パス②（既存 NLB TCP:443）が引き続き正常動作する

---

*本手順書は `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT10.md` の構成設計に基づいて作成。*

---

## 13. IAM権限が不足している場合の対処法

`1-1` の確認コマンドで `implicitDeny` または `explicitDeny` が表示された場合の対処法を記載する。

### 13-1. 不足権限の特定

```bash
# implicitDeny / explicitDeny の行だけを抽出して表示
CALLER_ARN=$(aws sts get-caller-identity --query 'Arn' --output text)

aws iam simulate-principal-policy \
  --policy-source-arn ${CALLER_ARN} \
  --action-names \
    "elasticloadbalancing:CreateLoadBalancer" \
    "elasticloadbalancing:CreateListener" \
    "elasticloadbalancing:CreateTargetGroup" \
    "elasticloadbalancing:CreateRule" \
    "elasticloadbalancing:DeleteLoadBalancer" \
    "elasticloadbalancing:DeleteListener" \
    "elasticloadbalancing:DeleteTargetGroup" \
    "acm:ImportCertificate" \
    "acm:CreateTrustStore" \
    "acm:DescribeTrustStores" \
    "ec2:AuthorizeSecurityGroupIngress" \
    "ec2:CreateSecurityGroup" \
    "ec2:DescribeSecurityGroups" \
    "ec2:RevokeSecurityGroupIngress" \
    "ec2:DeleteSecurityGroup" \
    "ecs:RegisterTaskDefinition" \
    "ecs:CreateService" \
    "ecs:UpdateService" \
    "ecs:DeleteService" \
    "ecr:GetAuthorizationToken" \
    "ecr:BatchCheckLayerAvailability" \
    "ecr:PutImage" \
    "s3:PutObject" \
  --query 'EvaluationResults[?EvalDecision!=`allowed`].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table
```

表示されたアクションが「不足している権限」の一覧となる。

### 13-2. アタッチ済みポリシーの確認

```bash
# IAMユーザーの場合: アタッチされているポリシーを確認
USER_NAME=$(aws sts get-caller-identity --query 'Arn' --output text | cut -d'/' -f2)

aws iam list-attached-user-policies \
  --user-name ${USER_NAME} \
  --query 'AttachedPolicies[*].{PolicyName:PolicyName,Arn:PolicyArn}' \
  --output table

# 所属グループのポリシーも確認
aws iam list-groups-for-user \
  --user-name ${USER_NAME} \
  --query 'Groups[*].GroupName' \
  --output table
```

```bash
# IAMロールの場合: アタッチされているポリシーを確認
ROLE_NAME="<ロール名>"

aws iam list-attached-role-policies \
  --role-name ${ROLE_NAME} \
  --query 'AttachedPolicies[*].{PolicyName:PolicyName,Arn:PolicyArn}' \
  --output table
```

### 13-3. 対処法

#### 対処法A: AWS管理者にポリシーの追加を依頼する

管理者に以下のインラインポリシー（JSON）の付与を依頼する。  
`<不足権限のアクション名>` を 13-1 で特定した権限に置き換えること。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AlchemiaDeployPolicy",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:*",
        "acm:ImportCertificate",
        "acm:CreateTrustStore",
        "acm:DescribeTrustStores",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateSecurityGroup",
        "ec2:DescribeSecurityGroups",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:DeleteSecurityGroup",
        "ec2:CreateTags",
        "ecs:RegisterTaskDefinition",
        "ecs:CreateService",
        "ecs:UpdateService",
        "ecs:DeleteService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:ListTaskDefinitions",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:DescribeRepositories",
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "sts:GetCallerIdentity",
        "iam:SimulatePrincipalPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

管理者への依頼手順:
1. 上記 JSON を `alchemia-deploy-policy.json` として保存
2. IAM コンソール → 「ポリシー」→「ポリシーの作成」→「JSON」タブに貼り付けてポリシーを作成
3. 対象のIAMユーザー/ロールにポリシーをアタッチ

#### 対処法B: 権限を持つロールに一時的に切り替える（AssumeRole）

デプロイ専用ロールが既に存在する場合、`AssumeRole` で一時的に切り替えることができる。

```bash
# デプロイ専用ロールに切り替え
DEPLOY_ROLE_ARN="arn:aws:iam::137068252939:role/<デプロイ専用ロール名>"

CREDS=$(aws sts assume-role \
  --role-arn ${DEPLOY_ROLE_ARN} \
  --role-session-name "alchemia-deploy-session" \
  --query 'Credentials.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey,SessionToken:SessionToken}' \
  --output json)

# 一時的な認証情報を環境変数に設定
export AWS_ACCESS_KEY_ID=$(echo ${CREDS} | python -c "import sys,json; print(json.load(sys.stdin)['AccessKeyId'])")
export AWS_SECRET_ACCESS_KEY=$(echo ${CREDS} | python -c "import sys,json; print(json.load(sys.stdin)['SecretAccessKey'])")
export AWS_SESSION_TOKEN=$(echo ${CREDS} | python -c "import sys,json; print(json.load(sys.stdin)['SessionToken'])")

# 切り替え後の認証情報を確認
aws sts get-caller-identity

# 作業完了後は環境変数をクリア
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
```

> **注意**: セッションの有効期限はデフォルト1時間。長時間の作業では `--duration-seconds 14400`（最大4時間）を指定すること。

### 13-4. 権限付与後の再確認

権限が付与されたら、再度 Step 2 のシミュレーションコマンドを実行して全行 `allowed` になることを確認する。

```bash
CALLER_ARN=$(aws sts get-caller-identity --query 'Arn' --output text)

aws iam simulate-principal-policy \
  --policy-source-arn ${CALLER_ARN} \
  --action-names \
    "elasticloadbalancing:CreateLoadBalancer" \
    "elasticloadbalancing:CreateListener" \
    "elasticloadbalancing:CreateTargetGroup" \
    "acm:ImportCertificate" \
    "acm:CreateTrustStore" \
    "ec2:CreateSecurityGroup" \
    "ec2:AuthorizeSecurityGroupIngress" \
    "ecs:RegisterTaskDefinition" \
    "ecs:CreateService" \
    "ecs:UpdateService" \
    "ecr:GetAuthorizationToken" \
    "ecr:PutImage" \
    "s3:PutObject" \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table
```

全行 `allowed` を確認後、[手順1-2](#1-2-既存リソースの確認) に戻って作業を再開すること。
