# NLB移行手順書

- **作成日**: 2026-04-15
- **対象**: SaaS版 AWS環境（ECS Fargate）
- **目的**: ALB（HTTP:80）からNLB（HTTPS:443 mTLS）への移行

---

## 概要

本手順書では以下の2フェーズを説明します。

| フェーズ | 構成 | 用途 |
|---------|------|------|
| **フェーズ1** | ALB（HTTP:80）＋ NLB（HTTPS:443）共存 | 検証環境でのmTLS動作確認 |
| **フェーズ2** | NLB（HTTPS:443）のみ | 本番環境への移行 |

---

## 目次

1. [システム構成](#1-システム構成)
2. [事前確認](#2-事前確認)
3. [フェーズ1: ALBとNLBの共存構成](#3-フェーズ1-albとnlbの共存構成)
4. [フェーズ2: NLBのみの本番構成への移行](#4-フェーズ2-nlbのみの本番構成への移行)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. システム構成

### 移行前（ALBのみ）

移行前の構成です。ALBはL7（アプリケーション層）でHTTP:80のみ受け付けており、TLSを終端しないためクライアント証明書（mTLS）認証が実現できません。

```
ブラウザ
  │ HTTP:80
  ▼
ALB (Application Load Balancer)  ※L7、HTTPのみ
  └── HTTP:80 → alchemia-nginx-service (ECS Fargate)

alchemia-nginx-service タスク:
  ├── mmdpf-nginx コンテナ    (ポート 80)
  │     /api/ → alchemia-backend-service（VPC内 Service Discovery）
  │     /     → localhost:3000
  └── mmdpf-frontend コンテナ (ポート 3000)

alchemia-backend-service タスク:
  └── mmdpf-backend コンテナ  (ポート 3001)
        ├── Aurora PostgreSQL
        ├── ElastiCache Redis
        ├── S3
        └── AWS Bedrock
```

---

### フェーズ1（ALB + NLB 共存）

mTLS の動作を検証しながら、既存のHTTPアクセスを維持する構成です。  
ECSサービスが2つ起動するため、Fargateの料金が約2倍になります。

```
HTTP アクセス用（既存）:
  ブラウザ
    │ HTTP:80
    ▼
  ALB (Application Load Balancer)  ※L7
    └── HTTP:80 → alchemia-nginx-service (ECS Fargate)

          alchemia-nginx-service タスク:
            ├── mmdpf-nginx コンテナ    (ポート 80)
            │     /api/ → alchemia-backend-service
            │     /     → localhost:3000
            └── mmdpf-frontend コンテナ (ポート 3000)


HTTPS/mTLS 検証用（新規追加）:
  ブラウザ
    │ TCP:443（TLSパススルー）
    ▼
  NLB (Network Load Balancer)  ※L4、TCPリスナー（TLSを終端しない）
    └── TCP:443 → alchemia-nginx-service-https (ECS Fargate) ※新規

          alchemia-nginx-service-https タスク:
            ├── mmdpf-nginx コンテナ    (ポート 80/443)
            │     SSL終端 + クライアント証明書認証 (mTLS)
            │     クライアント証明書のCN（UUID）→ organization_id 抽出
            │     /api/ → alchemia-backend-service
            │     /     → localhost:3000
            └── mmdpf-frontend コンテナ (ポート 3000)


共通バックエンド:
  alchemia-backend-service タスク:
    └── mmdpf-backend コンテナ  (ポート 3001)
          ├── Aurora PostgreSQL
          ├── ElastiCache Redis
          ├── S3
          └── AWS Bedrock
```

| サービス名 | LB | プロトコル:ポート | 用途 |
|-----------|-----|-----------------|------|
| `alchemia-nginx-service` | ALB | HTTP:80 | HTTPアクセス（既存継続） |
| `alchemia-nginx-service-https` | NLB | TCP:443 | HTTPS/mTLS検証（新規） |

---

### フェーズ2（NLBのみ 本番構成）

mTLS検証が完了し、NLBに完全移行した最終構成です。  
ALBを廃止し、NLBのみで運用します。ECSサービスは1つに戻ります。

```
ブラウザ
  │ TCP:443（TLSパススルー）
  ▼
NLB (Network Load Balancer)  ※L4、TCPリスナー（TLSを終端しない）
  └── TCP:443 → alchemia-nginx-service (ECS Fargate)

        alchemia-nginx-service タスク:
          ├── mmdpf-nginx コンテナ    (ポート 80/443)
          │     ① SSL終端（サーバー証明書）
          │     ② クライアント証明書検証 (mTLS)
          │         ssl_verify_client optional;  ← 証明書なしでもアクセス可
          │         ssl_verify_client on;        ← 証明書必須（本番運用推奨）
          │     ③ 証明書のCN（UUID）→ organization_id 抽出
          │     ④ X-Organization-Id ヘッダーをバックエンドに付与
          │     /api/ → alchemia-backend-service（VPC内 Service Discovery）
          │     /     → localhost:3000
          └── mmdpf-frontend コンテナ (ポート 3000)

        alchemia-backend-service タスク:
          └── mmdpf-backend コンテナ  (ポート 3001)  ※nginx 経由でのみアクセス
                ├── Aurora PostgreSQL  ← マネージドDB
                ├── ElastiCache Redis  ← マネージドキャッシュ
                ├── S3                 ← オブジェクトストレージ
                └── AWS Bedrock        ← AI モデル
```

> **NLB（TCPパススルー）を使う理由**
>
> このシステムはnginxでクライアント証明書認証（mTLS）を行い、証明書のCN（UUID）から
> `organization_id` を抽出してマルチテナント分離を実現しています。
>
> - **ALBの場合**: TLSをALB自身で終端するため、クライアント証明書の情報がnginxに届かない → **mTLS不可**
> - **NLBの場合**: TCPリスナー（`protocol: TCP`）でTLSをパススルーするため、TLSハンドシェイクがそのままnginxに届く → **mTLS可能**

| サービス名 | LB | プロトコル:ポート | 用途 |
|-----------|-----|-----------------|------|
| `alchemia-nginx-service` | NLB | TCP:443 | HTTPS/mTLS（本番） |

---

### ECSタスク内のコンテナ構成

`alchemia-nginx-service`（および `alchemia-nginx-service-https`）のタスクは、2つのコンテナで構成されています。

| コンテナ名 | イメージ | ポート | 役割 |
|-----------|---------|--------|------|
| `mmdpf-nginx` | `ECR/mmdpf-nginx:staging` | 80, 443 | リバースプロキシ + SSL終端 + mTLS認証 |
| `mmdpf-frontend` | `ECR/mmdpf-frontend:staging` | 3000 | Next.js フロントエンド |

nginx は ECS の DNS リゾルバー（`169.254.169.253`）を利用して、  
バックエンドのService Discoveryホスト名（`alchemia-backend.alchemia.local:3001`）を動的解決します。

---

## 2. 事前確認

### 1.1 既存環境の情報収集

以下のコマンドで既存サービスのネットワーク設定を確認し、値を控えておきます。

```bash
# 既存 nginx サービスのネットワーク設定・タスク定義を確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[0].{taskDef:taskDefinition,desired:desiredCount,network:networkConfiguration,lb:loadBalancers}'
```

**控えておく値:**
- `subnets` (例: `subnet-xxxxxxxx`, `subnet-yyyyyyyy`)
- `securityGroups` (例: `sg-xxxxxxxxxx`)
- `taskDefinition` (例: `arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:5`)

### 1.2 VPC IDの確認

```bash
# サブネットIDからVPC IDを確認
aws ec2 describe-subnets \
  --subnet-ids <SUBNET_ID1> \
  --region ap-northeast-1 \
  --query 'Subnets[0].VpcId' \
  --output text
```

**控えておく値:**
- `VpcId` (例: `vpc-xxxxxxxxxx`)

### 1.3 現在のロードバランサーの種類確認

実際にALBかNLBかを確認します。

```bash
# ECSサービスに紐付いているターゲットグループARNを取得
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[0].loadBalancers'

# ターゲットグループからロードバランサーARNを確認
aws elbv2 describe-target-groups \
  --target-group-arns <TARGET_GROUP_ARN> \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].LoadBalancerArns'

# ロードバランサーのタイプを確認（application=ALB / network=NLB）
aws elbv2 describe-load-balancers \
  --load-balancer-arns <LB_ARN> \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].{Type:Type,DNS:DNSName}'
```

---

## 2. フェーズ1: ALBとNLBの共存構成

### 完成後の構成

```
HTTP アクセス用（既存）:
  ALB:80 → alchemia-nginx-service（既存） → nginx:80

HTTPS/mTLS 検証用（新規追加）:
  NLB:443 → alchemia-nginx-service-https（新規） → nginx:443
```

> **ポイント:** どちらも同じ `alchemia-nginx` タスク定義を使用します。ECSタスクが2つ起動するため、Fargate の料金が約2倍になります。

---

### Step 1: NLBの作成

```bash
# サブネットIDは事前確認で取得したものを使用
aws elbv2 create-load-balancer \
  --name alchemia-staging-nlb \
  --type network \
  --scheme internet-facing \
  --subnets <SUBNET_ID1> <SUBNET_ID2> \
  --region ap-northeast-1

# NLBのARNとDNS名を確認
aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].{ARN:LoadBalancerArn,DNS:DNSName}'
```

> **NLBのDNS名の形式:**  
> `xxxxx.elb.ap-northeast-1.amazonaws.com`（ALBとはリージョン表記の位置が異なる）

---

### Step 2: TCP:443 用ターゲットグループの作成

```bash
# VPC IDは事前確認で取得したものを使用
aws elbv2 create-target-group \
  --name alchemia-nginx-tg-tcp443 \
  --protocol TCP \
  --port 443 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3 \
  --region ap-northeast-1

# ターゲットグループARNを確認（次のステップで使用）
aws elbv2 describe-target-groups \
  --names alchemia-nginx-tg-tcp443 \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text
```

---

### Step 3: NLBにリスナー（TCP:443）を追加

```bash
# NLBのARNを変数に代入
NLB_ARN=$(aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# ターゲットグループARNを変数に代入
TG_ARN_443=$(aws elbv2 describe-target-groups \
  --names alchemia-nginx-tg-tcp443 \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# TCP:443 リスナー作成
aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN_443 \
  --region ap-northeast-1
```

---

### Step 4: ECSタスクのSGにTCP:443とTCP:80のインバウンドを追加

```bash
# セキュリティグループIDを変数に代入（事前確認で取得した値）
ECS_SG_ID=<SECURITY_GROUP_ID>

# TCP:443 のインバウンドを許可（NLB経由のHTTPSアクセス用）
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1

# TCP:80 のインバウンドを 0.0.0.0/0 から許可（NLBヘルスチェック用）
# ⚠️ 重要: NLBのヘルスチェックはNLBノードのVPC内プライベートIPから送られる。
# 既存のSGルールがALBのSG（sg-xxxxxxxxxx）からのみTCP:80を許可している場合、
# NLBノードのIPはそのSGに含まれないためヘルスチェックがブロックされ、
# ECSタスクがunhealthy判定 → 停止 → 再起動のループに陥る。
# 0.0.0.0/0 を明示的に追加することで解消する。
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1

# 許可されているか確認
aws ec2 describe-security-groups \
  --group-ids $ECS_SG_ID \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`443` || FromPort==`80`]'
```

---

### Step 5: HTTPS用 ECSサービスを新規作成

```bash
# 変数の準備（事前確認で取得した値を設定）
SUBNET1=<SUBNET_ID1>
SUBNET2=<SUBNET_ID2>
SG_ID=<SECURITY_GROUP_ID>
TG_ARN_443=<Step2で取得したターゲットグループARN>

# 現在の最新タスク定義を確認
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition alchemia-nginx \
  --region ap-northeast-1 \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "使用するタスク定義: $TASK_DEF"

# HTTPS用 ECSサービスを新規作成
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-nginx-service-https \
  --task-definition alchemia-nginx \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN_443,containerName=mmdpf-nginx,containerPort=443" \
  --health-check-grace-period-seconds 120 \
  --region ap-northeast-1
```

---

### Step 6: デプロイスクリプトの切り替え

`alchemia-nginx-service-https` が ACTIVE になった時点で、以降の nginx/frontend/backend デプロイには **`deploy.ecr.phase1.sh`** を使用してください。  
このスクリプトは `alchemia-nginx-service`（ALB）と `alchemia-nginx-service-https`（NLB）の**両方を同時に更新**します。

```bash
# フェーズ1 中のデプロイはすべてこちらを使用
./scripts/deploy.ecr.phase1.sh           # フルデプロイ（ビルド→プッシュ→ECSデプロイ）
./scripts/deploy.ecr.phase1.sh --nginx   # nginx/frontend のみ（両サービス更新）
./scripts/deploy.ecr.phase1.sh --backend # backend のみ
./scripts/deploy.ecr.phase1.sh --check   # デプロイせず現在のECSサービス状態を確認
```

> ⚠️ フェーズ1 中に通常の `deploy.ecr.sh` で nginx を更新すると、`alchemia-nginx-service-https`（NLB）が古いタスク定義のまま残ります。必ず `deploy.ecr.phase1.sh` を使用してください。

---

### Step 7: 動作確認

```bash
# 新サービスの起動状態を確認（runningCount が desiredCount と一致するまで待つ）
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service-https \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'

# NLBのDNS名を確認
NLB_DNS=$(aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "NLB DNS名: $NLB_DNS"

# HTTPS疎通確認（-k は自己署名証明書のため。クライアント証明書なしで接続テスト）
curl -k -v https://$NLB_DNS/api/health 2>&1 | grep -E "< HTTP|status|ok"
```

期待レスポンス: `{"status":"ok"}`

---

### フェーズ1完了後の状態

| サービス名 | LB | プロトコル:ポート | 用途 |
|-----------|-----|-----------------|------|
| `alchemia-nginx-service` | ALB | HTTP:80 | HTTPアクセス（既存） |
| `alchemia-nginx-service-https` | NLB | TCP:443 | mTLS検証（新規） |

---

### フェーズ1の注意事項

#### backend の CORS_ORIGIN 設定変更
NLBドメインでHTTPSアクセスする場合、backendの環境変数を更新する必要があります。

```bash
# タスク定義JSONを更新
# aws/ecs-task-definition-alchemia-backend.json の CORS_ORIGIN に NLB DNS名を追加
# { "name": "CORS_ORIGIN", "value": "https://<NLB_DNS_NAME>" }

# タスク定義を再登録してサービスを更新
./scripts/deploy.ecr.sh --backend --no-build --no-push
```

#### タスク定義更新時の注意
フェーズ1では `alchemia-nginx-service` と `alchemia-nginx-service-https` の2つのサービスが稼働しています。
**nginx/frontend を更新する際は `deploy.ecr.phase1.sh` を使用してください。** 両サービスを同時に更新します。

```bash
# nginx/frontend の更新（両サービスを同時に更新）
./scripts/deploy.ecr.phase1.sh --nginx

# ビルド済みイメージを再デプロイするだけの場合
./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push
```

> ⚠️ 誤って `deploy.ecr.sh --nginx` を実行した場合、`alchemia-nginx-service-https`（NLB）は古いタスク定義のままになります。  
> その場合は以下で手動修正できます:
>
> ```bash
> TASK_DEF=$(aws ecs describe-task-definition \
>   --task-definition alchemia-nginx \
>   --region ap-northeast-1 \
>   --query 'taskDefinition.taskDefinitionArn' \
>   --output text)
>
> aws ecs update-service \
>   --cluster alchemia-staging \
>   --service alchemia-nginx-service-https \
>   --task-definition $TASK_DEF \
>   --force-new-deployment \
>   --region ap-northeast-1
> ```

---

## 3. フェーズ2: NLBのみの本番構成への移行

mTLS検証が完了し、NLBのみで運用する際の手順です。

### 完成後の構成

```
ブラウザ
  │ TCP/443（TLSパススルー）
  ▼
NLB (Network Load Balancer)  ※TCPリスナー（TLSを終端しない）
  └── TCP:443 → alchemia-nginx-service（1つのサービス）→ nginx:443
        nginx がSSL終端 + クライアント証明書認証 + organization_id 抽出
```

---

### Step 1: フェーズ1のNLBにHTTP(80) → HTTPS(443) リダイレクト用リスナーを追加（任意）

HTTP:80 でアクセスしてきたユーザーをHTTPS:443 にリダイレクトする場合は追加します。
不要であればSkipしてください。

```bash
# TCP:80 用ターゲットグループを作成（nginxにHTTPで渡す）
aws elbv2 create-target-group \
  --name alchemia-nginx-tg-tcp80 \
  --protocol TCP \
  --port 80 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --region ap-northeast-1

TG_ARN_80=$(aws elbv2 describe-target-groups \
  --names alchemia-nginx-tg-tcp80 \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

NLB_ARN=$(aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# TCP:80 リスナー追加
aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TCP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN_80 \
  --region ap-northeast-1
```

---

### Step 2: 既存の alchemia-nginx-service を NLB に切り替え

ECSサービスのロードバランサーはサービス作成後に変更できないため、
**既存サービスを削除して再作成**します。

> **注意**: サービス削除中はHTTP:80 へのアクセスが一時的に停止します。
> メンテナンス時間を設けるか、手順を素早く実行してください。

```bash
# 変数の準備
SUBNET1=<SUBNET_ID1>
SUBNET2=<SUBNET_ID2>
SG_ID=<SECURITY_GROUP_ID>
TG_ARN_443=<alchemia-nginx-tg-tcp443 のARN>

# ① 既存サービスを削除（タスクが0になるのを待つ）
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service \
  --desired-count 0 \
  --region ap-northeast-1

# タスクが0になるまで待機（30秒程度）
sleep 30

aws ecs delete-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service \
  --region ap-northeast-1

# ② NLBに紐付けた新サービスを同名で作成
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-nginx-service \
  --task-definition alchemia-nginx \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN_443,containerName=mmdpf-nginx,containerPort=443" \
  --health-check-grace-period-seconds 120 \
  --region ap-northeast-1
```

---

### Step 3: alchemia-nginx-service-https を削除

`alchemia-nginx-service` がNLBに切り替わったため、フェーズ1で作成した検証用サービスを削除します。

```bash
# タスクを0にして削除
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service-https \
  --desired-count 0 \
  --region ap-northeast-1

sleep 30

aws ecs delete-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service-https \
  --region ap-northeast-1

echo "✅ alchemia-nginx-service-https を削除しました"
```

> **デプロイスクリプトを `deploy.ecr.sh` に戻す**  
> `alchemia-nginx-service-https` を削除した時点で、フェーズ1専用の `deploy.ecr.phase1.sh` は不要になります。  
> 以降のデプロイは通常の **`deploy.ecr.sh`** を使用してください。
>
> ```bash
> # フェーズ2以降のデプロイはこちらを使用
> ./scripts/deploy.ecr.sh           # フルデプロイ
> ./scripts/deploy.ecr.sh --nginx   # nginx/frontend のみ
> ./scripts/deploy.ecr.sh --backend # backend のみ
> ```

---

### Step 4: ALBの削除

```bash
# ALBのARNを確認
aws elbv2 describe-load-balancers \
  --region ap-northeast-1 \
  --query 'LoadBalancers[?Type==`application`].{Name:LoadBalancerName,ARN:LoadBalancerArn,DNS:DNSName}'

# ALBを削除
aws elbv2 delete-load-balancer \
  --load-balancer-arn <ALB_ARN> \
  --region ap-northeast-1

echo "✅ ALBを削除しました"
```

---

### Step 5: 不要になった ALB 用ターゲットグループの削除（任意）

```bash
# ALBに紐付いていたターゲットグループの確認と削除
aws elbv2 describe-target-groups \
  --region ap-northeast-1 \
  --query 'TargetGroups[?TargetType==`ip`].{Name:TargetGroupName,ARN:TargetGroupArn}'

# 不要なターゲットグループを削除
aws elbv2 delete-target-group \
  --target-group-arn <OLD_ALB_TG_ARN> \
  --region ap-northeast-1
```

---

### Step 6: 動作確認

```bash
# サービス状態確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'

# NLBのDNS名でアクセス確認
NLB_DNS=$(aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "NLB DNS名: $NLB_DNS"

# HTTPS ヘルスチェック
curl -k https://$NLB_DNS/api/health
# 期待レスポンス: {"status":"ok"}

# mTLS 接続テスト（クライアント証明書あり）
curl -k \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  https://$NLB_DNS/api/health
```

---

### フェーズ2完了後の状態

| サービス名 | LB | プロトコル:ポート | 用途 |
|-----------|-----|-----------------|------|
| `alchemia-nginx-service` | NLB | TCP:443 | HTTPS/mTLS（本番） |

ALBは削除され、NLBのみの構成になります。

---

### backend の環境変数更新

NLBのDNS名が本番URLになるため、タスク定義JSONを更新して再デプロイします。

```bash
# aws/ecs-task-definition-alchemia-backend.json を編集
# CORS_ORIGIN と FRONTEND_URL を NLB DNS 名に更新
# { "name": "CORS_ORIGIN",    "value": "https://<NLB_DNS>" }
# { "name": "FRONTEND_URL",   "value": "https://<NLB_DNS>" }

# カスタムドメインがある場合はそちらに変更
# { "name": "CORS_ORIGIN",    "value": "https://your-domain.example.com" }
# { "name": "FRONTEND_URL",   "value": "https://your-domain.example.com" }

# バックエンドを再デプロイ
./scripts/deploy.ecr.sh --backend --no-build --no-push
```

---

## 4. トラブルシューティング

### NLBのターゲットが "unhealthy" になる / ECSタスクが停止ループする

```bash
# ターゲットグループのヘルス状態を確認
aws elbv2 describe-target-health \
  --target-group-arn <TG_ARN_443> \
  --region ap-northeast-1

# ECSタスクの停止理由を確認
aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks <TASK_ARN> \
  --region ap-northeast-1 \
  --query 'tasks[0].{lastStatus:lastStatus,stoppedReason:stoppedReason}'
```

**考えられる原因と対処法:**

**原因1: SGでTCP:80（NLBヘルスチェックポート）が `0.0.0.0/0` から許可されていない（最頻出）**

> `stoppedReason: "Task failed ELB health checks"` が出て、タスクが起動→停止を繰り返す場合はこれが原因。
>
> NLBのヘルスチェックはNLBノードのVPC内プライベートIPから送られる（L4 TCP接続）。
> 既存SGでTCP:80がALBのSG（`sg-xxxxxxxxxx`）からのみ許可されている場合、
> NLBノードのIPはそのSGに含まれないためヘルスチェックがブロックされてタスク停止ループに陥る。

```bash
# TCP:80 のSGルールを確認（IpRanges が空の場合は 0.0.0.0/0 からの許可がない）
ECS_SG_ID=<SECURITY_GROUP_ID>
aws ec2 describe-security-groups \
  --group-ids $ECS_SG_ID \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80`]'

# 0.0.0.0/0 からの許可を追加
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1
```

**原因2: SGでTCP:443のインバウンドが許可されていない → Step4 を再確認**

**原因3: nginxがTCP:443でLISTENしていない → nginx設定を確認**

### ECSサービスの作成に失敗する（ロードバランサーエラー）

```bash
# エラーの詳細を確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service-https \
  --region ap-northeast-1 \
  --query 'services[0].events[:5]'

# 考えられる原因：
# 1. containerName が間違っている → タスク定義のコンテナ名を確認
#    aws ecs describe-task-definition --task-definition alchemia-nginx \
#      --query 'taskDefinition.containerDefinitions[*].name'
# 2. containerPort が間違っている → nginx のポートマッピングを確認
# 3. ターゲットグループのVPCがECSサービスのVPCと異なる
```

### NLB経由でのHTTPS接続がタイムアウトする

```bash
# セキュリティグループの確認
aws ec2 describe-security-groups \
  --group-ids $ECS_SG_ID \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions'

# NLBのソースIPをSGで許可しているか確認
# NLBはクライアントのIPを直接渡す（NLBのIPではなくクライアントIP）
# 0.0.0.0/0 で許可されているか確認

# nginx の SSL 設定確認（クライアント証明書なしでも接続できるか）
# nginx.conf で ssl_verify_client optional; になっているか確認
```

### CloudWatch でエラーログを確認

```bash
# nginx/frontend のログ確認
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 30m

# backend のログ確認
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 30m
```

---

## 移行チェックリスト

### フェーズ1（ALB+NLB共存）

- [ ] 既存サービスのサブネットID・SGIDを確認済み
- [ ] VPC IDを確認済み
- [ ] NLB `alchemia-staging-nlb` を作成済み
- [ ] ターゲットグループ `alchemia-nginx-tg-tcp443` を作成済み
- [ ] NLBにTCP:443リスナーを追加済み
- [ ] SGにTCP:443インバウンドを追加済み
- [ ] SGにTCP:80インバウンドを `0.0.0.0/0` から追加済み（NLBヘルスチェック用 ⚠️ ALBのSGからのみ許可している場合は必須）
- [ ] `alchemia-nginx-service-https` を作成済み
- [ ] NLBのDNSでHTTPS疎通確認済み (`curl -k https://<NLB_DNS>/api/health`)
- [ ] backend の `CORS_ORIGIN` にNLBドメインを追加済み（必要な場合）

### フェーズ2（NLBのみ本番構成）

- [ ] mTLS（クライアント証明書認証）の動作確認済み
- [ ] `alchemia-nginx-service` を NLB 向けに再作成済み
- [ ] `alchemia-nginx-service-https` を削除済み
- [ ] ALBを削除済み
- [ ] 不要なターゲットグループを削除済み
- [ ] NLBのDNSでHTTPS + mTLS 疎通確認済み
- [ ] backend の `CORS_ORIGIN` / `FRONTEND_URL` をNLBドメインに更新済み
- [ ] CloudWatch Logs にエラーがないことを確認済み

---

*本手順書はmmdpfプロジェクトのSaaS版 NLB移行手順書です。AWS環境の基本デプロイ手順は `deploy-guide-aws.md` を参照してください。*

---

## メモ: NLB / ALB の違いと必要な理由

### ALB vs NLB の違い

| 項目 | ALB（Application Load Balancer） | NLB（Network Load Balancer） |
|------|----------------------------------|------------------------------|
| OSI層 | L7（アプリケーション層） | L4（トランスポート層） |
| 対応プロトコル | HTTP / HTTPS | TCP / UDP / TLS |
| TLS終端 | ALBが終端する（証明書はALBで処理） | TCPパススルー可能（バックエンドのnginx等が終端） |
| クライアント証明書（mTLS） | **不可**（ALBで終端するためクライアント証明書がnginxに届かない） | **可能**（TCPパススルーによりnginxまでそのまま届く） |
| ルーティング条件 | パス・ホスト・ヘッダー等のL7条件で振り分け可能 | IPアドレス・ポートのL4条件のみ |
| 固定IPアドレス | 不可（DNS名のみ） | 可能（Elastic IPを割り当て可） |
| パフォーマンス | 低レイテンシ | 超低レイテンシ・高スループット |
| 料金 | 比較的高め | 比較的安め |

### NLB / ALB が必要な理由

#### ロードバランサーが必要な理由
- ECS Fargate のタスクはプライベートIPしか持たず、インターネットから直接アクセスできない
- ロードバランサーがパブリックエンドポイントとなり、外部からのリクエストをECSタスクに転送する

#### ALBではなくNLBを採用する理由
- **mTLS（クライアント証明書認証）の実現**: クライアント証明書を nginx で検証するには、TLS を nginx まで終端しないで届ける必要がある
- ALBはTLSをALB自身で終端してしまうため、クライアント証明書の情報がnginxに届かず、mTLS認証が不可能
- NLBはTCPパススルー（`protocol: TCP` のリスナー）により、TLSハンドシェイクをそのままnginxに転送できる
- nginxがSSL終端 + クライアント証明書の検証 + `organization_id` の抽出を一貫して担える

---

### 検討段階で候補に挙がった構成: NLBのみで HTTP/HTTPS を共存させる

#### 構成概要

```
HTTP アクセス:
  NLB:80 (TCP) → alchemia-nginx-service → nginx:80（HTTPリダイレクト処理）

HTTPS/mTLS アクセス:
  NLB:443 (TCP) → alchemia-nginx-service → nginx:443（SSL終端 + mTLS）
```

NLB に TCP:80 と TCP:443 の2つのリスナーを追加し、1台のNLBで HTTP/HTTPS の両方を処理する構成。
ALBを廃止して NLB に一本化できるため、シンプルに見える。

#### 採用しなかった理由（デメリット）

- **HTTP→HTTPSリダイレクトをnginxで実装する必要がある**  
  ALBはHTTP:80→HTTPS:443の301リダイレクトをネイティブにサポートするが、NLBはL4（TCPレベル）のためHTTPレベルのリダイレクト応答を自身で返せない。  
  nginxの `return 301 https://$host$request_uri;` で実装は可能だが、ALBと比べてリダイレクトの責務がnginxに集中し、設定・管理が煩雑になる。

- **AWS WAFと統合できない**  
  ALBはAWS WAFと統合してL7レベルのIPフィルタリングやレートリミットを設定できるが、NLBはWAFを使用できない。  
  HTTP:80 への不審なアクセスを遮断するには nginx または アプリケーション側での対応が必要になる。

- **HTTPアクセスログの詳細が取れない**  
  ALBはHTTPリクエスト単位のアクセスログ（パス・ステータスコード・レスポンスタイム等）をS3に出力できるが、NLBのフローログはTCPレベルの情報のみ。  
  HTTP:80 への不審なアクセスのトレースや、リダイレクト前のリクエスト分析が困難になる。

- **既存ALBベースの運用からの移行コストが高い**  
  フェーズ1（ALB+NLB共存）→フェーズ2（NLBのみ）の段階移行中に、NLBへTCP:80リスナーを追加してALBを廃止するタイミングでDNS切り替えが必要になり、手順が複雑化する。  
  ALBをHTTP用に残す現行構成の方が、段階的な移行・ロールバックがしやすい。

#### まとめ

NLBのみの共存構成は技術的には実現可能だが、HTTPリダイレクト・WAF・ログ等の運用面でALBのL7機能が失われる点、および移行コストを考慮し、**フェーズ1では ALB（HTTP:80）＋ NLB（HTTPS:443）の共存構成**を採用した。
