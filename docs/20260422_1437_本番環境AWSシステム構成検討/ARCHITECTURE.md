# 本番環境 AWSシステム構成図

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（本番環境）
- **方針**: ALB (mTLS) を採用し、NLB・nginx コンテナを廃止

---

## 1. システム構成図（draw.io ファイル）

以下の draw.io ファイルを参照してください。

| ファイル | 内容 |
|---------|------|
| [production-architecture.drawio](./production-architecture.drawio) | 本番環境アーキテクチャ詳細図（ALB mTLS・VPC Endpoint・マルチAZ構成） |
| [production-architecture-simple.drawio](./production-architecture-simple.drawio) | 本番環境シンプル構成図（全体フロー概観） |
| [staging-architecture.drawio](./staging-architecture.drawio) | 検証環境アーキテクチャ図（変更前の構成・問題点付き） |

---

## 2. ECS サービス・タスク構成

### 検証環境（変更前）との対比

| 項目 | 検証環境（変更前） | 本番環境（変更後） |
|------|-------------------|-------------------|
| SSL 終端 | nginx コンテナ（443） | ALB（mTLS verify、ACM 自動更新） |
| org_id 抽出 | nginx が CN → X-Organization-Id | ALB Subject → backend 解析 |
| frontend | nginx と同居 | 独立サービス（alchemia-frontend-service） |

### 本番環境 ECS サービス一覧

| サービス名 | コンテナ | ポート | desiredCount | 変更点 |
|---|---|---|---|---|
| `alchemia-backend-service` | `mmdpf-backend` | 3001 | ≥ 2 | desiredCount増加、Circuit Breaker有効化 |
| `alchemia-frontend-service` | `mmdpf-frontend` | 3000 | ≥ 2 | **新規作成**（nginx タスクから分離） |
| ~~`alchemia-nginx-service`~~ | ~~`mmdpf-nginx`~~ | ~~443/80~~ | ~~廃止~~ | **廃止**（nginx コンテナ不要） |

---

## 3. AWS リソース一覧（本番環境）

| カテゴリ | リソース名 | 設定値 |
|---------|-----------|-------|
| **ロードバランサー** | ALB | HTTPS:443（mTLS verify） |
| **WAF** | AWS WAF WebACL | ALB にアタッチ |
| **DNS** | Route 53 | `app.your-domain.com` → ALB（Alias） |
| **SSL証明書** | ACM パブリック証明書 | `app.your-domain.com`（自動更新） |
| **mTLS信頼ストア** | ACM Trust Store | `ca.crt`（自己署名CA）を登録 |
| **ECS クラスター** | `alchemia-production` | — |
| **ECS サービス (backend)** | `alchemia-backend-service` | desiredCount ≥ 2、Circuit Breaker 有効 |
| **ECS サービス (frontend)** | `alchemia-frontend-service` | desiredCount ≥ 2、Circuit Breaker 有効（**新規**） |
| **ECR** | `mmdpf-backend` / `mmdpf-frontend` | nginx リポジトリは廃止 |
| **Aurora PostgreSQL** | `alchemia-production-aurora` | db.r6g.large、MultiAZ、DeletionProtection有効、バックアップ7日 |
| **ElastiCache Redis** | `alchemia-production-redis` | cache.r6g.large、MultiAZ、AutoFailover有効、スナップショット3日 |
| **S3** | `mmdpf-files-production` | バージョニング有効、ライフサイクル設定 |
| **Bedrock** | — | ap-northeast-1、IAMロールで認証 |
| **Secrets Manager** | `alchemia/production/*` | DBパスワード・JWT_SECRET 等を管理 |
| **CloudWatch** | アラーム各種 | ECS/Aurora/Redis/ALB の主要メトリクス |

---

## 4. 証明書管理フロー

**サーバー証明書（ALB 用）**
- ACM で `app.your-domain.com` のパブリック証明書を発行
- 60日前から自動更新（手動作業不要）
- ALB の HTTPS:443 リスナーに紐付け

**CA証明書（ACM Trust Store 用）**
- `backend/certs/ca/ca.crt` を S3 経由で ACM Trust Store に登録
- Trust Store ARN を ALB リスナーの mTLS 設定に指定
- CA 証明書の有効期限（2036年）まで更新不要

**クライアント証明書（.p12）**
- アプリの組織管理画面からダウンロード（従来通り）
- 発行元: `ca.crt`（自己署名CA）← ACM Trust Store に登録済み
- ALB が検証し、Subject ヘッダーをバックエンドへ渡す

---

## 5. シークレット管理（AWS Secrets Manager）

検証環境の ECS タスク定義 JSON 平文管理から移行。

| シークレット名 | 内容 |
|---|---|
| `alchemia/production/db-password` | Aurora パスワード |
| `alchemia/production/redis-password` | ElastiCache パスワード |
| `alchemia/production/jwt-secret` | JWT_SECRET（64文字以上） |
| `alchemia/production/session-secret` | SESSION_SECRET（64文字以上） |

ECS タスク定義の `secrets` セクションから参照:

```json
{
  "name": "DB_PASSWORD",
  "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT:secret:..."
}
```

---

## 6. 検証環境との差分サマリー

| 項目 | 検証環境 | 本番環境 | 対応内容 |
|------|---------|---------|---------|
| ロードバランサー | NLB (TCPパススルー) | **ALB (mTLS verify、HTTPS:443 のみ)** | NLB 廃止・ALB 新規作成 |
| nginx コンテナ | あり | **なし** | コンテナ・サービス・ECR リポジトリ廃止 |
| SSL終端 | nginx (SSM証明書) | **ALB (ACM 自動更新)** | ACM 証明書発行・Trust Store 作成 |
| org_id 抽出 | nginx が CN → X-Organization-Id | **ALB Subject → backend 解析** | authController.ts 修正（REPORT3参照）|
| frontend タスク | nginx と同居 | **独立サービス** | alchemia-frontend-service 新規作成 |
| desiredCount | 1 | **≥ 2** | 各サービスのタスク数増加 |
| Circuit Breaker | 無効 | **有効** | タスク定義更新 |
| シークレット管理 | ECS タスク定義 JSON に平文 | **Secrets Manager** | シークレット移行 |
| WAF | なし | **AWS WAF** | ALB に WebACL アタッチ |
| カスタムドメイン | NLB の DNS 名 | **Route 53 + 独自ドメイン** | ドメイン取得・Alias レコード設定 |
| Aurora 構成 | シングルノード / db.t3.medium | **MultiAZ / db.r6g.large** | インスタンス変更・レプリカ追加 |
| Redis 構成 | シングルノード / cache.t3.small | **MultiAZ / AutoFailover** | レプリケーション設定変更 |
| S3 バージョニング | 無効 | **有効** | バージョニング・ライフサイクル設定 |
| 監視・アラート | 未設定 | **CloudWatch アラーム** | 主要メトリクスのアラーム設定 |
| VPC Endpoint | なし | **採用済み（PrivateLink）** | ECR/Bedrock/Secrets Manager/Logs を PrivateLink 経由でアクセス |

---

## 7. 参照レポート

| ファイル | 内容 |
|---------|------|
| [REPORT.md](./REPORT.md) | 検証環境の問題点一覧・対応優先度サマリー |
| [REPORT1.md](./REPORT1.md) | ALB mTLS で organization_id 抽出を代替できるか？ |
| [REPORT2.md](./REPORT2.md) | nginx/frontend の ECS タスク分離検討 |
| [REPORT3.md](./REPORT3.md) | バックエンドコード変更の具体的内容（ALB mTLS 対応） |
| [REPORT4.md](./REPORT4.md) | ACM Trust Store とは何か？設定方法まとめ |
| [REPORT5.md](./REPORT5.md) | ALB と NLB の特徴・メリット・デメリット比較 |
