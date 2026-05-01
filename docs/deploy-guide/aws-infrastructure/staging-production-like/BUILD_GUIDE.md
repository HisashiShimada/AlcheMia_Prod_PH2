# 本番検証環境構築手順書（ALB追加 / nginx無し構成検証）

- **作成日**: 2026-04-27
- **対象環境**: alchemia-staging（VPC: vpc-037a0cb50e47092a0）
- **AWSアカウントID**: `137068252939`
- **リージョン**: `ap-northeast-1`

> ⚠️ **重要**: 本手順書は既存環境（NLB / 既存ALB / nginx-service）を **一切変更せず**、新規リソースを追加する手順です。  
> ただし **backend ECS サービスのみ例外**として、`prod-backend-tg` を追加紐付けするための再作成（削除→再作成）を行います。  
> ECS Fargate の仕様上、サービス作成後にロードバランサーの紐付けを追加することはできないためです。  
> 詳細: [設計検討ドキュメント](../design/backend-alb-integration-design.md)

---

## 目次

1. [新規追加リソース一覧](#1-新規追加リソース一覧)
2. [前提条件](#2-前提条件)
3. [STEP 1: ACM 証明書の発行](#step-1-acm-証明書の発行)
4. [STEP 2: アプリ層プライベートサブネットの作成](#step-2-アプリ層プライベートサブネットの作成)
5. [STEP 3: セキュリティグループの作成・変更](#step-3-セキュリティグループの作成変更)
6. [STEP 4: VPC Endpoints の作成](#step-4-vpc-endpoints-の作成)
7. [STEP 5: ルートテーブルの設定](#step-5-ルートテーブルの設定)
8. [STEP 6: ALB ターゲットグループの作成](#step-6-alb-ターゲットグループの作成)
9. [STEP 7: 新規 ALB の作成](#step-7-新規-alb-の作成)
10. [STEP 8: ALB リスナーの設定](#step-8-alb-リスナーの設定)
11. [STEP 9: ECS タスク定義の登録](#step-9-ecs-タスク定義の登録)
12. [STEP 10: ECS サービスの作成](#step-10-ecs-サービスの作成)
13. [STEP 11: 動作確認](#step-11-動作確認)
14. [ロールバック手順](#ロールバック手順)
15. [構築チェックリスト](#構築チェックリスト)

---

## 1. 新規追加リソース一覧

| カテゴリ | リソース名 | 概要 |
|---------|-----------|------|
| ACM | （任意名） | 新規ALB用 SSL/TLS 証明書 |
| ACM Trust Store | mmdpf-ca-trust-store | ALB mTLS 用 CA 証明書ストア |
| サブネット | prod-app-private-1a | 10.1.21.0/24 / AZ: ap-northeast-1a |
| サブネット | prod-app-private-1c | 10.1.22.0/24 / AZ: ap-northeast-1c |
| SG | prod-alb-sg | TCP/80,443 ← 0.0.0.0/0 |
| SG | prod-frontend-sg | TCP/3000 ← prod-alb-sg のみ |
| SG | prod-vpce-sg | VPC Endpoints 用 SG |
| SG変更 | backend-sg (既存) | TCP/3001 ← prod-alb-sg を追加 |
| VPC Endpoint | S3 Gateway | S3 への Privateアクセス（ECR レイヤー取得用） |
| VPC Endpoint | ecr.api | ECR API へのPrivateアクセス |
| VPC Endpoint | ecr.dkr | ECR Docker レイヤーへのPrivateアクセス |
| VPC Endpoint | logs | CloudWatch Logs へのPrivateアクセス |
| ルートテーブル | prod-app-private-rt | アプリ層プライベートサブネット用 |
| ALB | prod-verification-alb | HTTPS/443 + HTTP→HTTPSリダイレクト |
| ターゲットグループ | prod-frontend-tg | frontend ECS (TCP:3000) |
| ターゲットグループ | prod-backend-tg | backend ECS (TCP:3001) |
| ECS タスク定義 | prod-frontend | mmdpf-frontend コンテナ単独 |
| ECS サービス | prod-frontend-service | アプリ層プライベートサブネット配置 |

---

## 2. 前提条件

### 既存リソース（変更しない）

| リソース | ID / 値 |
|---------|---------|
| VPC | `vpc-037a0cb50e47092a0` |
| ECS クラスター | `alchemia-staging` |
| パブリックサブネット 1a | `subnet-0c386da2db38952dc` (10.1.1.0/24) |
| パブリックサブネット 1c | `subnet-0388f1051ba7b98ce` (10.1.2.0/24) |
| backend-sg | `sg-0920f1a670e75b444` |
| ECR backend | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:staging` |
| ECR frontend | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend:staging` |

### 作業環境の要件

```bash
# AWS CLI バージョン確認
aws --version
# → aws-cli/2.x 以上であること

# 認証確認
aws sts get-caller-identity
# → Account: 137068252939 であること
```

---

## STEP 1: ACM 証明書の準備（自己署名証明書）

> ⚠️ **注意**: 正式なドメインが未決定のため、本手順では **openssl で生成した自己署名証明書** を ACM にインポートして使用します。  
> 正規ドメイン決定後の手順は [付録: 正規ドメインで ACM 証明書を発行する場合](#付録-正規ドメインで-acm-証明書を発行する場合) を参照してください。

> ⏱️ **所要時間**: 数分（DNS 検証待ち不要）

### 1-1. 自己署名証明書の生成

```bash
# 作業ディレクトリの作成
mkdir -p /tmp/acm-cert

# 秘密鍵と自己署名証明書を生成（有効期限 365 日）
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/acm-cert/cert.key \
  -out    /tmp/acm-cert/cert.pem \
  -days   365 \
  -subj   "/CN=prod-verification-alb.internal"
```

> ✅ `/tmp/acm-cert/cert.key`（秘密鍵）と `/tmp/acm-cert/cert.pem`（証明書）が生成されること。

### 1-2. ACM へのインポート

> 自己署名証明書は CA チェーンが存在しないため、`--certificate-chain` には証明書ファイル自身を指定します。

```bash
aws acm import-certificate \
  --certificate       fileb:///tmp/acm-cert/cert.pem \
  --private-key       fileb:///tmp/acm-cert/cert.key \
  --certificate-chain fileb:///tmp/acm-cert/cert.pem \
  --region ap-northeast-1
```

> **出力例:**
> ```json
> {
>   "CertificateArn": "arn:aws:acm:ap-northeast-1:137068252939:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
> }
> ```
> → **CertificateArn をメモしておく**（STEP 8 で使用）

### 1-3. インポート確認

```bash
aws acm describe-certificate \
  --certificate-arn <CertificateArn> \
  --region ap-northeast-1 \
  --query 'Certificate.{Status:Status,Type:Type,Domain:DomainName}'
```

> ✅ `"Status": "ISSUED"`, `"Type": "IMPORTED"` が返れば完了。
> ✅ DomainName が FQDN 形式（ドット含む）であることを確認。

> ⚠️ **自己署名証明書の制限事項:**  
> - ブラウザでアクセスすると「この接続ではプライバシーが保護されません」等の証明書エラーが表示されます（検証環境のため許容）。  
> - curl での確認には `-k`（SSL 検証スキップ）フラグを使用します（STEP 11 のコマンドは対応済み）。  
> - 正規ドメイン決定後は付録の手順で ACM 証明書を差し替えてください。

### チェックリスト
- [ ] openssl で自己署名証明書を生成した
- [ ] ACM に証明書をインポートした
- [ ] Status が `ISSUED`、Type が `IMPORTED` であることを確認した
- [ ] CertificateArn をメモした

---

## STEP 1.5: ACM Trust Store の作成（mTLS 用 CA 証明書登録）

> 📌 ALB で mTLS（クライアント証明書認証）を有効にするため、CA 証明書を ACM Trust Store に登録します。  
> **既存の `backend/certs/ca/ca.crt` をそのまま使用します。CA は再生成しません。**

> ⚠️ CA を再生成すると既存のクライアント証明書（各組織の `.p12`）がすべて無効になります。本手順では CA は変更しません。

### 1.5-1. CA 証明書を S3 にアップロード

ACM Trust Store に CA 証明書をインポートするには、S3 経由で渡す必要があります。

```bash
# 既存 CA 証明書を S3 にアップロード（バケット名は環境に合わせて変更）
aws s3 cp backend/certs/ca/ca.crt \
  s3://137068252939-acm-truststore/mmdpf-ca.crt \
  --region ap-northeast-1
```

> ✅ アップロード先の S3 URI をメモしておく（例: `s3://137068252939-acm-truststore/mmdpf-ca.crt`）  
> バケットが存在しない場合は先に作成してください:  
> `aws s3 mb s3://137068252939-acm-truststore --region ap-northeast-1`

### 1.5-2. Trust Store の作成

```bash
aws elbv2 create-trust-store \
  --name mmdpf-ca-trust-store \
  --ca-certificates-bundle-s3-bucket 137068252939-acm-truststore \
  --ca-certificates-bundle-s3-key    mmdpf-ca.crt \
  --region ap-northeast-1
```

> **出力例:**
> ```json
> {
>   "TrustStoreArn": "arn:aws:acm:ap-northeast-1:137068252939:truststore/mmdpf-ca-trust-store/xxxxxxxxxxxxxxxx",
>   "Name": "mmdpf-ca-trust-store"
> }
> ```
> → **TRUST_STORE_ARN をメモしておく**（STEP 8-2 で使用）

### 1.5-3. Trust Store の状態確認

```bash
aws elbv2 describe-trust-stores \
  --trust-store-arns <TRUST_STORE_ARN> \
  --region ap-northeast-1 \
  --query 'TrustStores[0].{Name:Name,Status:Status,NumberOfCaCertificates:NumberOfCaCertificates}'
```

> ✅ `Status: ACTIVE`、`NumberOfCACertificates: 1` であることを確認する。

### チェックリスト
- [ ] CA 証明書 (`backend/certs/ca/ca.crt`) を S3 にアップロードした
- [ ] Trust Store を作成した
- [ ] Status が `ACTIVE`、CA 証明書数が `1` であることを確認した
- [ ] TRUST_STORE_ARN をメモした

---

## STEP 2: アプリ層プライベートサブネットの作成

### 2-1. サブネット作成（1a）

```bash
aws ec2 create-subnet \
  --vpc-id vpc-037a0cb50e47092a0 \
  --cidr-block 10.1.21.0/24 \
  --availability-zone ap-northeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=prod-app-private-1a},{Key=Project,Value=alchemia-staging},{Key=Environment,Value=staging}]' \
  --region ap-northeast-1
```

> **出力の `SubnetId` をメモ**（例: `subnet-xxxxxxxxxxxxxxxxx`）→ **SUBNET_1A_ID**

### 2-2. サブネット作成（1c）

```bash
aws ec2 create-subnet \
  --vpc-id vpc-037a0cb50e47092a0 \
  --cidr-block 10.1.22.0/24 \
  --availability-zone ap-northeast-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=prod-app-private-1c},{Key=Project,Value=alchemia-staging},{Key=Environment,Value=staging}]' \
  --region ap-northeast-1
```

> **出力の `SubnetId` をメモ** → **SUBNET_1C_ID**

### 2-3. MapPublicIpOnLaunch が無効であることを確認

```bash
aws ec2 describe-subnets \
  --subnet-ids <SUBNET_1A_ID> <SUBNET_1C_ID> \
  --region ap-northeast-1 \
  --query 'Subnets[*].{Id:SubnetId,MapPublic:MapPublicIpOnLaunch,CIDR:CidrBlock}'
```

> ✅ `MapPublicIpOnLaunch: false` であることを確認する。

### チェックリスト
- [ ] prod-app-private-1a (10.1.21.0/24) を作成し SubnetId をメモした
- [ ] prod-app-private-1c (10.1.22.0/24) を作成し SubnetId をメモした
- [ ] 両サブネットの MapPublicIpOnLaunch が false であることを確認した

---

## STEP 3: セキュリティグループの作成・変更

### 3-1. prod-alb-sg の作成（新規ALB用）

```bash
# 作成
aws ec2 create-security-group \
  --group-name prod-alb-sg \
  --description "SG for prod-verification-alb" \
  --vpc-id vpc-037a0cb50e47092a0 \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=prod-alb-sg}]' \
  --region ap-northeast-1
```

> **出力の `GroupId` をメモ** → **PROD_ALB_SG_ID**

```bash
# HTTP/80 インバウンド許可
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_ALB_SG_ID> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1

# HTTPS/443 インバウンド許可
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_ALB_SG_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1
```

### 3-2. prod-frontend-sg の作成（frontend ECS 用）

```bash
# 作成
aws ec2 create-security-group \
  --group-name prod-frontend-sg \
  --description "SG for prod-frontend-service ECS tasks" \
  --vpc-id vpc-037a0cb50e47092a0 \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=prod-frontend-sg}]' \
  --region ap-northeast-1
```

> **出力の `GroupId` をメモ** → **PROD_FRONTEND_SG_ID**

```bash
# TCP/3000: prod-alb-sg からのみ許可
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_FRONTEND_SG_ID> \
  --protocol tcp \
  --port 3000 \
  --source-group <PROD_ALB_SG_ID> \
  --region ap-northeast-1
```

### 3-3. prod-vpce-sg の作成（VPC Endpoints 用）

```bash
# 作成
aws ec2 create-security-group \
  --group-name prod-vpce-sg \
  --description "SG for VPC Endpoints (ECR/Logs)" \
  --vpc-id vpc-037a0cb50e47092a0 \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=prod-vpce-sg}]' \
  --region ap-northeast-1
```

> **出力の `GroupId` をメモ** → **PROD_VPCE_SG_ID**

```bash
# HTTPS/443: prod-frontend-sg からのみ許可（ECR/Logs アクセス用）
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_VPCE_SG_ID> \
  --protocol tcp \
  --port 443 \
  --source-group <PROD_FRONTEND_SG_ID> \
  --region ap-northeast-1
```

> ⚠️ **作業用 EC2 からのログ確認について（重要）**:  
> STEP 4 で作成する VPC Endpoint に `--private-dns-enabled` を指定するため、VPC 内のすべてのホストで  
> `ecr.api`, `ecr.dkr`, `logs` 等の AWS サービス DNS が VPC Endpoint に向きます。  
> 作業用 EC2 から `aws logs tail` 等を実行する場合も VPC Endpoint 経由となるため、  
> **作業用 EC2 のセキュリティグループ（`<EC2_SG_ID>`）も `prod-vpce-sg` の許可対象に追加**する必要があります。  
> 追加しない場合は `Connect timeout` エラーが発生します。

```bash
# HTTPS/443: 作業用 EC2 の SG からも許可（aws logs tail / aws ecr 等の確認作業用）
# <EC2_SG_ID> は作業用 EC2 インスタンスのセキュリティグループ ID に置き換える
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_VPCE_SG_ID> \
  --protocol tcp \
  --port 443 \
  --source-group <EC2_SG_ID> \
  --region ap-northeast-1
```

> ⚠️ **backend ECS タスクの ECR アクセスについて（重要）**:  
> ECR Interface Endpoint に `--private-dns-enabled` を指定しているため、**既存の backend ECS タスクが ECR からイメージをプルする際も VPC Endpoint 経由**になります。  
> **backend-sg（既存 backend ECS タスクの SG: `sg-0920f1a670e75b444`）も `prod-vpce-sg` の許可対象に追加しないと、backend タスクが `pending` のまま起動しません。**

```bash
# HTTPS/443: backend ECS タスクの SG からも許可（ECR イメージプル用）
aws ec2 authorize-security-group-ingress \
  --group-id <PROD_VPCE_SG_ID> \
  --protocol tcp \
  --port 443 \
  --source-group sg-0920f1a670e75b444 \
  --region ap-northeast-1
```

### 3-4. backend-sg への追加（既存SG変更）

> ⚠️ **既存リソースの変更**: インバウンドルールの**追加のみ**を行う（削除しない）

```bash
# TCP/3001: prod-alb-sg からのアクセスを追加許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-0920f1a670e75b444 \
  --protocol tcp \
  --port 3001 \
  --source-group <PROD_ALB_SG_ID> \
  --region ap-northeast-1
```

### チェックリスト
- [ ] prod-alb-sg を作成し、TCP/80,443 ← 0.0.0.0/0 を設定した
- [ ] prod-frontend-sg を作成し、TCP/3000 ← prod-alb-sg を設定した
- [ ] prod-vpce-sg を作成し、TCP/443 ← prod-frontend-sg を設定した
- [ ] backend-sg に TCP/3001 ← prod-alb-sg を追加した
- [ ] 各 GroupId をメモした

---

## STEP 4: VPC Endpoints の作成

> ⚠️ アプリ層プライベートサブネットからインターネットへの経路が不要になるよう、以下の4つの Endpoint を作成する。

### 4-1. S3 Gateway Endpoint の作成

```bash
# メインルートテーブルのIDを確認（後で Endpoint に紐付けるため）
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-037a0cb50e47092a0" \
  --region ap-northeast-1 \
  --query 'RouteTables[*].{Id:RouteTableId,Name:Tags[?Key==`Name`].Value|[0],Main:Associations[?Main==`true`].Main|[0]}'
```

```bash
# S3 Gateway Endpoint 作成（RouteTableId は STEP 5 で作成するルートテーブルのIDを後で追加する）
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-037a0cb50e47092a0 \
  --service-name com.amazonaws.ap-northeast-1.s3 \
  --vpc-endpoint-type Gateway \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=prod-s3-endpoint}]' \
  --region ap-northeast-1
```

> **出力の `VpcEndpointId` をメモ** → **S3_ENDPOINT_ID**

### 4-2. ECR API Interface Endpoint の作成

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-037a0cb50e47092a0 \
  --service-name com.amazonaws.ap-northeast-1.ecr.api \
  --vpc-endpoint-type Interface \
  --subnet-ids <SUBNET_1A_ID> <SUBNET_1C_ID> \
  --security-group-ids <PROD_VPCE_SG_ID> \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=prod-ecr-api-endpoint}]' \
  --region ap-northeast-1
```

> **出力の `VpcEndpointId` をメモ** → **ECR_API_ENDPOINT_ID**

### 4-3. ECR DKR Interface Endpoint の作成

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-037a0cb50e47092a0 \
  --service-name com.amazonaws.ap-northeast-1.ecr.dkr \
  --vpc-endpoint-type Interface \
  --subnet-ids <SUBNET_1A_ID> <SUBNET_1C_ID> \
  --security-group-ids <PROD_VPCE_SG_ID> \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=prod-ecr-dkr-endpoint}]' \
  --region ap-northeast-1
```

> **出力の `VpcEndpointId` をメモ** → **ECR_DKR_ENDPOINT_ID**

### 4-4. CloudWatch Logs Interface Endpoint の作成

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-037a0cb50e47092a0 \
  --service-name com.amazonaws.ap-northeast-1.logs \
  --vpc-endpoint-type Interface \
  --subnet-ids <SUBNET_1A_ID> <SUBNET_1C_ID> \
  --security-group-ids <PROD_VPCE_SG_ID> \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=prod-logs-endpoint}]' \
  --region ap-northeast-1
```

> **出力の `VpcEndpointId` をメモ** → **LOGS_ENDPOINT_ID**

### 4-5. Endpoint の状態確認

```bash
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids <S3_ENDPOINT_ID> <ECR_API_ENDPOINT_ID> <ECR_DKR_ENDPOINT_ID> <LOGS_ENDPOINT_ID> \
  --region ap-northeast-1 \
  --query 'VpcEndpoints[*].{Id:VpcEndpointId,Service:ServiceName,State:State}'
```

> ✅ `State: available` であることを確認する。

### チェックリスト
- [ ] S3 Gateway Endpoint を作成した（VpcEndpointId をメモ）
- [ ] ECR API Interface Endpoint を作成した
- [ ] ECR DKR Interface Endpoint を作成した
- [ ] CloudWatch Logs Interface Endpoint を作成した
- [ ] 全 Endpoint の State が `available` であることを確認した

---

## STEP 5: ルートテーブルの設定

### 5-1. アプリ層プライベートサブネット用ルートテーブルの作成

```bash
aws ec2 create-route-table \
  --vpc-id vpc-037a0cb50e47092a0 \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=prod-app-private-rt}]' \
  --region ap-northeast-1
```

> **出力の `RouteTableId` をメモ** → **PROD_RT_ID**

### 5-2. S3 Gateway Endpoint をルートテーブルに関連付け

```bash
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id <S3_ENDPOINT_ID> \
  --add-route-table-ids <PROD_RT_ID> \
  --region ap-northeast-1
```

### 5-3. サブネットをルートテーブルに関連付け

```bash
# prod-app-private-1a
aws ec2 associate-route-table \
  --route-table-id <PROD_RT_ID> \
  --subnet-id <SUBNET_1A_ID> \
  --region ap-northeast-1

# prod-app-private-1c
aws ec2 associate-route-table \
  --route-table-id <PROD_RT_ID> \
  --subnet-id <SUBNET_1C_ID> \
  --region ap-northeast-1
```

### 5-4. ルートテーブルの確認

```bash
aws ec2 describe-route-tables \
  --route-table-ids <PROD_RT_ID> \
  --region ap-northeast-1 \
  --query 'RouteTables[0].{Routes:Routes,Associations:Associations[*].SubnetId}'
```

> ✅ S3 の prefix list へのルートが存在し、サブネットが両方関連付けられていることを確認する。

### チェックリスト
- [ ] prod-app-private-rt ルートテーブルを作成した
- [ ] S3 Gateway Endpoint をルートテーブルに関連付けた
- [ ] prod-app-private-1a をルートテーブルに関連付けた
- [ ] prod-app-private-1c をルートテーブルに関連付けた

---

## STEP 6: ALB ターゲットグループの作成

### 6-1. prod-frontend-tg の作成

```bash
aws elbv2 create-target-group \
  --name prod-frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-037a0cb50e47092a0 \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --region ap-northeast-1
```

> **出力の `TargetGroupArn` をメモ** → **FRONTEND_TG_ARN**

### 6-2. prod-backend-tg の作成

```bash
aws elbv2 create-target-group \
  --name prod-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-037a0cb50e47092a0 \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path "/api/health" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --region ap-northeast-1
```

> **出力の `TargetGroupArn` をメモ** → **BACKEND_TG_ARN**

### チェックリスト
- [ ] prod-frontend-tg を作成し TargetGroupArn をメモした
- [ ] prod-backend-tg を作成し TargetGroupArn をメモした

---

## STEP 7: 新規 ALB の作成

```bash
aws elbv2 create-load-balancer \
  --name prod-verification-alb \
  --type application \
  --scheme internet-facing \
  --ip-address-type ipv4 \
  --subnets subnet-0c386da2db38952dc subnet-0388f1051ba7b98ce \
  --security-groups <PROD_ALB_SG_ID> \
  --tags Key=Name,Value=prod-verification-alb Key=Project,Value=alchemia-staging Key=Environment,Value=staging \
  --region ap-northeast-1
```

> **出力の `LoadBalancerArn` と `DNSName` をメモ**
> - **ALB_ARN**: リスナー設定で使用
> - **ALB_DNS**: `prod-verification-alb.ap-northeast-1.elb.amazonaws.com` 形式

### 確認

```bash
aws elbv2 describe-load-balancers \
  --names prod-verification-alb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].{ARN:LoadBalancerArn,DNS:DNSName,State:State.Code}'
```

> ✅ `State: active` であることを確認する。

### チェックリスト
- [ ] prod-verification-alb を作成した
- [ ] LoadBalancerArn をメモした
- [ ] DNSName をメモした
- [ ] State が `active` になったことを確認した

---

## STEP 8: ALB リスナーの設定

### 8-1. HTTP/80 リスナーの作成（→ HTTPS リダイレクト）

```bash
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
  --region ap-northeast-1
```

### 8-2. HTTPS/443 リスナーの作成（デフォルト: frontend へ転送）

> 📌 **ACM 証明書のアタッチについて**:  
> `--certificates CertificateArn=<CertificateArn>` パラメータにより、STEP 1 で発行した ACM 証明書をこの HTTPS リスナーにアタッチしています。  
> アーキテクチャ図の「ACM → ALB（ALBにアタッチ）」の操作はこのコマンドに含まれています。

```bash
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=<CertificateArn> \
  --mutual-authentication "Mode=verify,TrustStoreArn=<TRUST_STORE_ARN>,IgnoreClientCertificateExpiry=false" \
  --default-actions '[{"Type":"forward","TargetGroupArn":"<FRONTEND_TG_ARN>"}]' \
  --region ap-northeast-1
```

> 📌 **`--mutual-authentication` について**:  
> `Mode=verify` を指定すると、ALB はクライアント証明書を必須とします（mTLS 有効）。  
> 既存の各組織の `.p12` クライアント証明書（STEP 1.5 で登録した CA が署名したもの）が引き続き使用できます。

> **出力の `ListenerArn` をメモ** → **HTTPS_LISTENER_ARN**（パスルール追加で使用）

### 8-3. パスベースルール: `/api/*` → backend-tg の追加

```bash
aws elbv2 create-rule \
  --listener-arn <HTTPS_LISTENER_ARN> \
  --priority 10 \
  --conditions '[{"Field":"path-pattern","Values":["/api/*"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"<BACKEND_TG_ARN>"}]' \
  --region ap-northeast-1
```

### 8-4. リスナールールの確認

```bash
aws elbv2 describe-rules \
  --listener-arn <HTTPS_LISTENER_ARN> \
  --region ap-northeast-1 \
  --query 'Rules[*].{Priority:Priority,Conditions:Conditions,Actions:Actions[0].Type}'
```

> ✅ 以下のルールが存在することを確認する:
> - Priority 10: `/api/*` → `prod-backend-tg` に forward
> - default: `/*` → `prod-frontend-tg` に forward

### チェックリスト
- [ ] HTTP/80 リスナー（→ HTTPS リダイレクト）を作成した
- [ ] HTTPS/443 リスナー（デフォルト: frontend-tg）を作成した
- [ ] HTTPS_LISTENER_ARN をメモした
- [ ] `/api/*` → backend-tg のパスルール（Priority 10）を追加した
- [ ] リスナールールが正しく設定されていることを確認した

---

## STEP 9: ECS タスク定義の登録

### 9-1. タスク定義 JSON ファイルの作成

`aws/ecs-task-definition-prod-frontend.json` を以下の内容で作成する。  
`<ALB_DNS>` を STEP 7 でメモした ALB の DNS 名に置き換えること。

```json
{
  "family": "prod-frontend",
  "taskRoleArn": "arn:aws:iam::137068252939:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::137068252939:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "mmdpf-frontend",
      "image": "137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend:staging",
      "essential": true,
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV",                "value": "production" },
        { "name": "PORT",                    "value": "3000" },
        { "name": "NEXT_TELEMETRY_DISABLED", "value": "1" },
        { "name": "NEXT_PUBLIC_API_URL",     "value": "https://<ALB_DNS>" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group":         "/ecs/prod-frontend",
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
    { "key": "Service",     "value": "prod-frontend" }
  ]
}
```

> ⚠️ **`NEXT_PUBLIC_API_URL` の値**:  
> `https://<ALB_DNS>` の `<ALB_DNS>` を、STEP 7 でメモした ALB の DNS 名（例: `prod-verification-alb-xxxxxxxxx.ap-northeast-1.elb.amazonaws.com`）に置き換えること。

### 9-2. タスク定義の登録

```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition-prod-frontend.json \
  --region ap-northeast-1
```

> **出力の `taskDefinitionArn` をメモ** → **TASK_DEF_ARN**

### 9-3. 登録確認

```bash
aws ecs describe-task-definition \
  --task-definition prod-frontend \
  --region ap-northeast-1 \
  --query 'taskDefinition.{Family:family,Revision:revision,Status:status}'
```

> ✅ `Status: ACTIVE` であることを確認する。

### チェックリスト
- [ ] `aws/ecs-task-definition-prod-frontend.json` を作成した
- [ ] `NEXT_PUBLIC_API_URL` に ALB の DNS 名を設定した
- [ ] タスク定義を登録した
- [ ] Status が `ACTIVE` であることを確認した

---

## STEP 10: ECS サービスの作成

### 10-1. prod-frontend-service の作成

```bash
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name prod-frontend-service \
  --task-definition prod-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1A_ID>,<SUBNET_1C_ID>],securityGroups=[<PROD_FRONTEND_SG_ID>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<FRONTEND_TG_ARN>,containerName=mmdpf-frontend,containerPort=3000" \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --deployment-controller type=ECS \
  --tags key=Project,value=alchemia-staging key=Environment,value=staging key=Service,value=prod-frontend \
  --region ap-northeast-1
```

### 10-2. サービスの起動確認

```bash
# サービスの状態確認（Running になるまで待機）
aws ecs describe-services \
  --cluster alchemia-staging \
  --services prod-frontend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount,status:status}'
```

> ✅ `running: 1`, `pending: 0`, `desired: 1` になるまで待機する（数分かかる場合がある）。

### 10-3. タスクの詳細確認

```bash
# タスクARNを取得
TASK_ARN=$(aws ecs list-tasks \
  --cluster alchemia-staging \
  --service-name prod-frontend-service \
  --region ap-northeast-1 \
  --query 'taskArns[0]' \
  --output text)

# タスクの詳細（コンテナの状態確認）
aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks $TASK_ARN \
  --region ap-northeast-1 \
  --query 'tasks[0].containers[*].{name:name,status:lastStatus,health:healthStatus}'
```

> ✅ コンテナの `status: RUNNING`、`health: HEALTHY` であることを確認する。

### 10-4. CloudWatch ログの確認

> ⚠️ **前提確認**: STEP 4-4 で `--private-dns-enabled` 付きの CloudWatch Logs VPC Endpoint を作成しているため、  
> VPC 内からの `logs.ap-northeast-1.amazonaws.com` への通信はすべて VPC Endpoint 経由になります。  
> **作業用 EC2 のセキュリティグループが `prod-vpce-sg`（`sg-054a6952c1d475d25`）に TCP/443 で許可されていること**を確認してください。  
> 許可されていない場合は `Connect timeout` エラーが発生します（STEP 3-3 の追加許可コマンドを実行してください）。

```bash
aws logs tail /ecs/prod-frontend \
  --region ap-northeast-1 \
  --since 10m
```

> ✅ エラーが出ていないこと、Next.js の起動ログが確認できること。

### チェックリスト（frontend-service）
- [ ] prod-frontend-service を作成した
- [ ] runningCount が desiredCount (1) と一致することを確認した
- [ ] コンテナが RUNNING / HEALTHY であることを確認した
- [ ] CloudWatch ログにエラーがないことを確認した

---

### 10-5. 既存 backend サービスの現在設定確認

> ⚠️ **重要**: ECS Fargate はサービス作成後にロードバランサーの紐付けを変更できません。  
> `prod-backend-tg` を追加するには、既存 backend サービスを**削除→再作成**する必要があります。  
> 再作成中（旧サービス削除〜新サービス RUNNING まで）は数分間のダウンタイムが発生します。

まず既存サービスの設定を確認し、再作成コマンドに必要な値をメモする。

```bash
# クラスター内のサービス一覧を確認（backend サービス名を特定）
aws ecs list-services \
  --cluster alchemia-staging \
  --region ap-northeast-1
```

> **出力例:** `alchemia-staging/alchemia-backend-service` など  
> → **BACKEND_SERVICE_NAME** をメモする（例: `alchemia-backend-service`）

```bash
# 既存サービスの loadBalancers / networkConfiguration / taskDefinition を確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'services[0].{loadBalancers:loadBalancers,networkConfig:networkConfiguration,taskDef:taskDefinition,desired:desiredCount}'
```

> **確認すべき値:**
> - `loadBalancers` → 現在紐付いているターゲットグループARN一覧（再作成時にすべて引き継ぐ）
> - `networkConfiguration.awsvpcConfiguration.subnets` → **BACKEND_SUBNETS**
> - `networkConfiguration.awsvpcConfiguration.securityGroups` → **BACKEND_SGS**
> - `networkConfiguration.awsvpcConfiguration.assignPublicIp` → **BACKEND_ASSIGN_PUBLIC_IP**
> - `taskDef` → **BACKEND_TASK_DEF**（例: `alchemia-backend:5`）
> - `desired` → **BACKEND_DESIRED_COUNT**
> - `serviceRegistries` → Cloud Map サービス ARN（再作成時に必ず引き継ぐ）: 下記コマンドで確認

```bash
# ECS Service Discovery の設定を確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'services[0].serviceRegistries'
```

> ⚠️ **Service Discovery が設定されている場合は必ず引き継ぐこと（重要）**:  
> nginx が `BACKEND_HOST=alchemia-backend.alchemia.local` で backend に接続しているため、  
> `--service-registries` を省略すると新しい backend タスクが Cloud Map に IP を登録せず、  
> nginx → backend の DNS 解決が失敗して **502 エラー**が発生する。  
> 詳細: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

> **メモ** → **BACKEND_SERVICE_REGISTRY_ARN**

### 10-6. backend サービスの再作成（prod-backend-tg を追加）

> ⏱️ **所要時間**: 旧サービス削除〜新サービス RUNNING まで 5〜10分程度

#### 10-6-1. 既存サービスのタスク数を 0 にして停止

```bash
aws ecs update-service \
  --cluster alchemia-staging \
  --service <BACKEND_SERVICE_NAME> \
  --desired-count 0 \
  --region ap-northeast-1
```

```bash
# タスクが 0 になるまで待機
aws ecs describe-services \
  --cluster alchemia-staging \
  --services <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount}'
```

> ✅ `running: 0`, `pending: 0` になったことを確認する。

#### 10-6-2. 既存サービスの削除

```bash
aws ecs delete-service \
  --cluster alchemia-staging \
  --service <BACKEND_SERVICE_NAME> \
  --force \
  --region ap-northeast-1
```

#### 10-6-3. 既存サービスの削除完了確認

```bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'services[0].status'
```

> ✅ `"INACTIVE"` が返れば削除完了。

#### 10-6-4. prod-backend-tg を追加して再作成

> 📌 `--load-balancers` には **既存のTG（10-5 で確認した値）をすべて列挙**したうえで、新規 `<BACKEND_TG_ARN>` を追加する。  
> 既存TGが存在しない場合（初回作成時）は `<BACKEND_TG_ARN>` のみ指定する。

```bash
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name <BACKEND_SERVICE_NAME> \
  --task-definition <BACKEND_TASK_DEF> \
  --desired-count <BACKEND_DESIRED_COUNT> \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[<BACKEND_SUBNETS>],securityGroups=[<BACKEND_SGS>],assignPublicIp=<BACKEND_ASSIGN_PUBLIC_IP>}" \
  --load-balancers \
    "targetGroupArn=<既存TG_ARN_1>,containerName=mmdpf-backend,containerPort=3001" \
    "targetGroupArn=<BACKEND_TG_ARN>,containerName=mmdpf-backend,containerPort=3001" \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --deployment-controller type=ECS \
  --region ap-northeast-1
```

> ⚠️ `<既存TG_ARN_1>` は 10-5 で確認した `loadBalancers` の値に置き換える。  
> 既存TGが複数ある場合は `--load-balancers` の行を増やしてすべて列挙すること。  
> 既存TGがない場合はその行を削除し、`<BACKEND_TG_ARN>` のみ指定する。

#### 10-6-5. 再作成後の起動確認

```bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount,status:status}'
```

> ✅ `running` が `desired` と一致し、`status: ACTIVE` になるまで待機する。

```bash
# タスクの状態確認
BACKEND_TASK_ARN=$(aws ecs list-tasks \
  --cluster alchemia-staging \
  --service-name <BACKEND_SERVICE_NAME> \
  --region ap-northeast-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks $BACKEND_TASK_ARN \
  --region ap-northeast-1 \
  --query 'tasks[0].containers[*].{name:name,status:lastStatus,health:healthStatus}'
```

> ✅ コンテナの `status: RUNNING`、`health: HEALTHY` であることを確認する。

#### 10-6-6. ECS Service Discovery による nginx 疎通確認

nginx は `BACKEND_HOST=alchemia-backend.alchemia.local` で backend に接続しています。  
backend サービス再作成後、ECS Service Discovery が DNS を自動更新するため、nginx からの通信は自動的に復旧します。

```bash
# backend-tg のターゲット状態確認（healthy になるまで待機）
aws elbv2 describe-target-health \
  --target-group-arn <BACKEND_TG_ARN> \
  --region ap-northeast-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State}'
```

> ✅ `Health: healthy` になれば、既存の ALB/NLB → nginx → backend の通信も正常に復旧している。

### チェックリスト（backend-service 再作成）
- [ ] 既存 backend サービスの loadBalancers / networkConfiguration / taskDefinition を確認した
- [ ] 既存サービスのタスク数を 0 にして停止した
- [ ] 既存サービスを削除し INACTIVE を確認した
- [ ] prod-backend-tg を追加して backend サービスを再作成した
- [ ] runningCount が desiredCount と一致することを確認した
- [ ] backend-tg のターゲットが `healthy` になったことを確認した

---

## STEP 11: 動作確認

### 11-1. ターゲットグループのヘルスチェック確認

```bash
# frontend-tg のターゲット状態確認
aws elbv2 describe-target-health \
  --target-group-arn <FRONTEND_TG_ARN> \
  --region ap-northeast-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State}'

# backend-tg のターゲット状態確認
aws elbv2 describe-target-health \
  --target-group-arn <BACKEND_TG_ARN> \
  --region ap-northeast-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State}'
```

> ✅ 両ターゲットグループで `Health: healthy` であることを確認する。

### 11-2. HTTP → HTTPS リダイレクトの確認

```bash
curl -v -L "http://<ALB_DNS>/" 2>&1 | grep -E "Location|HTTP/"
```

> ✅ `HTTP/1.1 301 Moved Permanently` と `Location: https://...` が返ることを確認する。

### 11-3. フロントエンドアクセスの確認

```bash
curl -v -k "https://<ALB_DNS>/" -o /dev/null -w "%{http_code}"
```

> ✅ `200` が返ることを確認する。

### 11-4. API ヘルスチェックの確認

```bash
curl -k "https://<ALB_DNS>/api/health"
```

> ✅ `{"status":"ok"}` が返ることを確認する。

### 11-5. ブラウザでの確認

| 確認項目 | URL / 操作 | 期待結果 |
|---------|-----------|---------|
| HTTP → HTTPS リダイレクト | `http://<ALB_DNS>/` | HTTPS にリダイレクトされる |
| フロントエンド表示 | `https://<ALB_DNS>/` | ログイン画面が表示される |
| ログイン | 管理者アカウントでログイン | ダッシュボードに遷移する |
| API 疎通 | ログイン後の画面遷移 | APIエラーが出ないこと |

### チェックリスト
- [ ] frontend-tg のターゲットが `healthy` であることを確認した
- [ ] backend-tg のターゲットが `healthy` であることを確認した
- [ ] HTTP → HTTPS リダイレクトが機能することを確認した
- [ ] `https://<ALB_DNS>/` でフロントエンドが表示されることを確認した
- [ ] `https://<ALB_DNS>/api/health` が `{"status":"ok"}` を返すことを確認した
- [ ] ブラウザからログインできることを確認した

---

## ロールバック手順

構築作業を元に戻す場合は、以下の手順で追加したリソースを削除する。  
**既存環境（NLB / 既存ALB / nginx-service）には影響しない。**

### 削除手順（逆順）

```bash
# 1. prod-frontend-service の削除（まずタスク数を 0 にする）
aws ecs update-service \
  --cluster alchemia-staging \
  --service prod-frontend-service \
  --desired-count 0 \
  --region ap-northeast-1

aws ecs delete-service \
  --cluster alchemia-staging \
  --service prod-frontend-service \
  --force \
  --region ap-northeast-1

# 2. backend サービスのロールバック（prod-backend-tg なしで再作成）
# ※ まずタスク数を 0 にして削除
aws ecs update-service \
  --cluster alchemia-staging \
  --service <BACKEND_SERVICE_NAME> \
  --desired-count 0 \
  --region ap-northeast-1

aws ecs delete-service \
  --cluster alchemia-staging \
  --service <BACKEND_SERVICE_NAME> \
  --force \
  --region ap-northeast-1

# ※ prod-backend-tg を含めず、元のTG構成で再作成する
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name <BACKEND_SERVICE_NAME> \
  --task-definition <BACKEND_TASK_DEF> \
  --desired-count <BACKEND_DESIRED_COUNT> \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[<BACKEND_SUBNETS>],securityGroups=[<BACKEND_SGS>],assignPublicIp=<BACKEND_ASSIGN_PUBLIC_IP>}" \
  --load-balancers \
    "targetGroupArn=<既存TG_ARN_1>,containerName=mmdpf-backend,containerPort=3001" \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --deployment-controller type=ECS \
  --region ap-northeast-1

# 3. ECS タスク定義の登録解除

aws ecs deregister-task-definition \
  --task-definition prod-frontend:1 \
  --region ap-northeast-1

# 3. ALB リスナールールの削除
aws elbv2 delete-rule --rule-arn <RULE_ARN> --region ap-northeast-1

# 4. ALB リスナーの削除
aws elbv2 delete-listener --listener-arn <HTTPS_LISTENER_ARN> --region ap-northeast-1
aws elbv2 delete-listener --listener-arn <HTTP_LISTENER_ARN> --region ap-northeast-1

# 5. ALB の削除
aws elbv2 delete-load-balancer --load-balancer-arn <ALB_ARN> --region ap-northeast-1

# 6. ターゲットグループの削除
aws elbv2 delete-target-group --target-group-arn <FRONTEND_TG_ARN> --region ap-northeast-1
aws elbv2 delete-target-group --target-group-arn <BACKEND_TG_ARN> --region ap-northeast-1

# 7. VPC Endpoints の削除
aws ec2 delete-vpc-endpoints \
  --vpc-endpoint-ids <S3_ENDPOINT_ID> <ECR_API_ENDPOINT_ID> <ECR_DKR_ENDPOINT_ID> <LOGS_ENDPOINT_ID> \
  --region ap-northeast-1

# 8. ルートテーブルのサブネット関連付け解除 → 削除
aws ec2 disassociate-route-table --association-id <ASSOC_ID_1A> --region ap-northeast-1
aws ec2 disassociate-route-table --association-id <ASSOC_ID_1C> --region ap-northeast-1
aws ec2 delete-route-table --route-table-id <PROD_RT_ID> --region ap-northeast-1

# 9. セキュリティグループの削除（prod-vpce-sg → prod-frontend-sg → prod-alb-sg の順）
aws ec2 delete-security-group --group-id <PROD_VPCE_SG_ID> --region ap-northeast-1
aws ec2 delete-security-group --group-id <PROD_FRONTEND_SG_ID> --region ap-northeast-1
aws ec2 delete-security-group --group-id <PROD_ALB_SG_ID> --region ap-northeast-1

# 10. backend-sg のインバウンドルール削除
aws ec2 revoke-security-group-ingress \
  --group-id sg-0920f1a670e75b444 \
  --protocol tcp \
  --port 3001 \
  --source-group <PROD_ALB_SG_ID> \
  --region ap-northeast-1

# 11. サブネットの削除
aws ec2 delete-subnet --subnet-id <SUBNET_1A_ID> --region ap-northeast-1
aws ec2 delete-subnet --subnet-id <SUBNET_1C_ID> --region ap-northeast-1

# 12. ACM Trust Store の削除
aws elbv2 delete-trust-store --trust-store-arn <TRUST_STORE_ARN> --region ap-northeast-1

# 13. ACM 証明書の削除
aws acm delete-certificate --certificate-arn <CertificateArn> --region ap-northeast-1
```

---

## 構築チェックリスト

```
STEP 1: ACM 証明書の準備（自己署名証明書）
  - [ ] openssl で自己署名証明書を生成した
  - [ ] ACM に証明書をインポートした
  - [ ] Status が ISSUED、Type が IMPORTED であることを確認した
  - [ ] CertificateArn をメモした

STEP 1.5: ACM Trust Store の作成
  - [ ] CA 証明書 (backend/certs/ca/ca.crt) を S3 にアップロードした
  - [ ] Trust Store (mmdpf-ca-trust-store) を作成した
  - [ ] Status が ACTIVE、CA 証明書数が 1 であることを確認した
  - [ ] TRUST_STORE_ARN をメモした

STEP 2: アプリ層プライベートサブネットの作成
  - [ ] prod-app-private-1a (10.1.21.0/24) を作成した
  - [ ] prod-app-private-1c (10.1.22.0/24) を作成した
  - [ ] 両サブネットの SubnetId をメモした

STEP 3: セキュリティグループの作成・変更
  - [ ] prod-alb-sg を作成した（TCP/80,443 ← 0.0.0.0/0）
  - [ ] prod-frontend-sg を作成した（TCP/3000 ← prod-alb-sg）
  - [ ] prod-vpce-sg を作成した（TCP/443 ← prod-frontend-sg）
  - [ ] backend-sg に TCP/3001 ← prod-alb-sg を追加した

STEP 4: VPC Endpoints の作成
  - [ ] S3 Gateway Endpoint を作成した
  - [ ] ECR API Interface Endpoint を作成した
  - [ ] ECR DKR Interface Endpoint を作成した
  - [ ] CloudWatch Logs Interface Endpoint を作成した
  - [ ] 全 Endpoint の State が available であることを確認した

STEP 5: ルートテーブルの設定
  - [ ] prod-app-private-rt を作成した
  - [ ] S3 Gateway Endpoint をルートテーブルに関連付けた
  - [ ] 両サブネットをルートテーブルに関連付けた

STEP 6: ALB ターゲットグループの作成
  - [ ] prod-frontend-tg を作成した（ヘルスチェック: GET / → 200）
  - [ ] prod-backend-tg を作成した（ヘルスチェック: GET /api/health → 200）

STEP 7: 新規 ALB の作成
  - [ ] prod-verification-alb を作成した
  - [ ] State が active になったことを確認した
  - [ ] DNSName をメモした

STEP 8: ALB リスナーの設定
  - [ ] HTTP/80 → HTTPS/443 リダイレクトリスナーを作成した
  - [ ] HTTPS/443 リスナー（デフォルト: frontend-tg）を作成した
  - [ ] /api/* → backend-tg のパスルール（Priority 10）を追加した

STEP 9: ECS タスク定義の登録
  - [ ] aws/ecs-task-definition-prod-frontend.json を作成した
  - [ ] NEXT_PUBLIC_API_URL に ALB の DNS 名を設定した
  - [ ] タスク定義を登録し Status が ACTIVE であることを確認した

STEP 10: ECS サービスの作成
  - [ ] prod-frontend-service を作成した
  - [ ] frontend runningCount が 1 になったことを確認した
  - [ ] frontend CloudWatch ログにエラーがないことを確認した
  - [ ] 既存 backend サービスの loadBalancers / networkConfiguration / taskDefinition を確認した
  - [ ] 既存 backend サービスを削除し INACTIVE を確認した
  - [ ] prod-backend-tg を追加して backend サービスを再作成した
  - [ ] backend runningCount が desiredCount と一致することを確認した
  - [ ] backend-tg のターゲットが healthy になったことを確認した

STEP 11: 動作確認
  - [ ] frontend-tg のターゲットが healthy であることを確認した
  - [ ] backend-tg のターゲットが healthy であることを確認した
  - [ ] HTTP → HTTPS リダイレクトが機能することを確認した
  - [ ] https://<ALB_DNS>/ でフロントエンドが表示されることを確認した
  - [ ] https://<ALB_DNS>/api/health が {"status":"ok"} を返すことを確認した
  - [ ] ブラウザからログインできることを確認した
```

---

## リソースID メモ欄

構築作業中に確認したIDをここにメモする。

| 項目 | 値 |
|-----|---|
| CertificateArn | |
| SUBNET_1A_ID | |
| SUBNET_1C_ID | |
| PROD_ALB_SG_ID | |
| PROD_FRONTEND_SG_ID | |
| PROD_VPCE_SG_ID | |
| S3_ENDPOINT_ID | |
| ECR_API_ENDPOINT_ID | |
| ECR_DKR_ENDPOINT_ID | |
| LOGS_ENDPOINT_ID | |
| PROD_RT_ID | |
| FRONTEND_TG_ARN | |
| BACKEND_TG_ARN | |
| ALB_ARN | |
| ALB_DNS | |
| HTTPS_LISTENER_ARN | |
| TRUST_STORE_ARN | |

---

---

## 付録: 正規ドメインで ACM 証明書を発行する場合

> 📌 **この手順は、正式なドメインが決定した後に実施します。**  
> 自己署名証明書（STEP 1 で発行した IMPORTED 証明書）を正規 ACM 証明書に差し替えることで、ブラウザの証明書エラーを解消できます。

### 前提条件

- 対象ドメイン（例: `prod-verification.your-company.com`）の DNS を管理できること
- Route 53 または外部 DNS サービスで CNAME レコードを追加できること

> ⏱️ **所要時間**: DNS 検証の場合 数分〜30分程度

---

### A-1. 証明書のリクエスト

```bash
# <YOUR_DOMAIN> を実際のドメイン名に置き換える
# 例: prod-verification.your-company.com
aws acm request-certificate \
  --domain-name "<YOUR_DOMAIN>" \
  --validation-method DNS \
  --region ap-northeast-1
```

> **出力例:**
> ```json
> {
>   "CertificateArn": "arn:aws:acm:ap-northeast-1:137068252939:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
> }
> ```
> → **新しい CertificateArn をメモしておく**

---

### A-2. DNS 検証レコードの確認

```bash
aws acm describe-certificate \
  --certificate-arn <新しい CertificateArn> \
  --region ap-northeast-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

> 出力された `Name` と `Value` を対象ドメインの DNS に **CNAME レコード** として登録する。  
> Route 53 を使用している場合は、AWS コンソールの ACM 画面から「Route 53 でレコードを作成」ボタンで自動登録も可能。

---

### A-3. 証明書の検証完了確認

```bash
# Status が "ISSUED" になるまで待機
aws acm describe-certificate \
  --certificate-arn <新しい CertificateArn> \
  --region ap-northeast-1 \
  --query 'Certificate.{Status:Status,Type:Type}'
```

> ✅ `"Status": "ISSUED"`, `"Type": "AMAZON_ISSUED"` が返れば完了。

---

### A-4. ALB の HTTPS リスナー証明書を差し替え

```bash
# 既存の自己署名証明書を新しい ACM 証明書に差し替え
aws elbv2 modify-listener \
  --listener-arn <HTTPS_LISTENER_ARN> \
  --certificates CertificateArn=<新しい CertificateArn> \
  --region ap-northeast-1
```

---

### A-5. 旧証明書（自己署名）の削除

```bash
# STEP 1 で発行した自己署名証明書 (IMPORTED) を削除
aws acm delete-certificate \
  --certificate-arn <旧 CertificateArn（IMPORTED）> \
  --region ap-northeast-1
```

---

### A-6. ドメインから ALB への DNS レコード追加

正規ドメインでアクセスできるよう、DNS に ALB の DNS 名を向けるレコードを追加する。

| レコード種別 | 名前 | 値 |
|------------|------|---|
| CNAME または Alias | `<YOUR_DOMAIN>` | `<ALB_DNS>`（例: `prod-verification-alb-xxx.ap-northeast-1.elb.amazonaws.com`） |

> Route 53 を使用している場合は **Alias レコード（A レコード）** で ALB を直接指定することを推奨。

---

### チェックリスト（付録）
- [ ] 正規ドメインで ACM 証明書をリクエストした
- [ ] DNS 検証レコードを登録した
- [ ] Status が `ISSUED`（`AMAZON_ISSUED`）になったことを確認した
- [ ] ALB の HTTPS リスナー証明書を差し替えた
- [ ] 旧自己署名証明書（IMPORTED）を削除した
- [ ] ドメインから ALB への DNS レコードを追加した
- [ ] ブラウザで証明書エラーが表示されなくなったことを確認した

---

*本手順書は mmdpf プロジェクトの本番検証環境（ALB追加 / nginx無し構成検証）の構築手順です。*
