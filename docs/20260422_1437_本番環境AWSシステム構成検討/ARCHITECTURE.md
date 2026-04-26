# 本番環境 AWSシステム構成図

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（本番環境）
- **方針**: ALB (mTLS) を採用し、NLB・nginx コンテナを廃止

---

## 1. アーキテクチャ全体図

```
                         ┌─────────────────────────────────────────┐
                         │  AWS Route 53（DNS）                     │
                         │  app.your-domain.com → ALB の IP を返す  │
                         └─────────────────────────────────────────┘
                              ↑ ① DNS 名前解決（接続前の一度だけ）
                              │   "app.your-domain.com は？"
                              │   "ALB のアドレスはこれです" と返答
                              │
┌─────────────────────────────┴────────────────────────────────────────────────┐
│  インターネット                                                                │
│                                                                              │
│  ユーザーブラウザ（クライアント証明書 .p12 を保持）                               │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ ② HTTPS:443（直接 ALB へ接続）
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  ALB (Application Load Balancer)                    ┌──────────────────────┐ │
│                                                     │  AWS WAF（統合済み）  │ │
│  ┌─────────────────────────────────────────────┐   │  ALB に届いたリクエス │ │
│  │  リスナー: HTTPS:443                         │   │  トを内部でフィルタリ │ │
│  │  ├── ACM サーバー証明書（app.your-domain.com）│   │  ング                 │ │
│  │  └── mTLS: verify モード                     │   │  ・IPフィルタリング    │ │
│  │        └── ACM Trust Store（ca.crt を登録）  │   │  ・レートリミット      │ │
│  │              ① クライアント証明書を検証        │   │  ・マネージドルール    │ │
│  │              ② Subject ヘッダーを付与         │   │    (SQLi/XSS 等)     │ │
│  │                CN=<org-uuid>,O=... 付与       │   └──────────────────────┘ │
│  │                                               │                            │
│  │  ルーティングルール:                            │                            │
│  │  ├── /api/* → alchemia-backend-tg  (3001)    │                            │
│  │  └── /*     → alchemia-frontend-tg (3000)    │                            │
│  └─────────────────────────────────────────────┘                            │
└───────┬───────────────────────────────────────────┬──────────────────────────┘
        │ /api/*                                    │ /*
        ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│  alchemia-backend-tg  │               │  alchemia-frontend-tg │
│  (ターゲットグループ)   │               │  (ターゲットグループ)   │
└───────────┬───────────┘               └───────────┬───────────┘
            │                                       │
            ▼                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  VPC (ap-northeast-1) / プライベートサブネット                                  │
│                                                                               │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │  alchemia-backend-service           │  │  alchemia-frontend-service     │ │
│  │  (ECS Fargate)                      │  │  (ECS Fargate)                 │ │
│  │                                     │  │                                │ │
│  │  タスク① mmdpf-backend (port 3001)  │  │  タスク① mmdpf-frontend (3000) │ │
│  │  タスク② mmdpf-backend (port 3001)  │  │  タスク② mmdpf-frontend (3000) │ │
│  │  ※ desiredCount ≥ 2               │  │  ※ desiredCount ≥ 2           │ │
│  │  ※ Circuit Breaker + 自動ロールバック│  │  ※ Circuit Breaker 有効       │ │
│  │                                     │  │                                │ │
│  │  organization_id 取得:              │  │                                │ │
│  │  X-Amzn-Mtls-Clientcert-Subject     │  │                                │ │
│  │  から CN（UUID）を解析              │  │                                │ │
│  └────────────────┬────────────────────┘  └────────────────────────────────┘ │
│                   │                                                           │
│         ┌─────────┼──────────────────────────────────────────┐               │
│         │         │                                          │               │
│         ▼         ▼                                          ▼               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐│
│  │  Aurora PostgreSQL   │  │  ElastiCache Redis   │  │  AWS Bedrock         ││
│  │  (Multi-AZ)          │  │  (Multi-AZ)           │  │  (AI モデル)         ││
│  │  db.r6g.large 以上   │  │  AutoFailover 有効    │  │  IAM ロールで認証    ││
│  │  DeletionProtection  │  │  SnapshotRetention≥3  │  │  ap-northeast-1     ││
│  │  BackupRetention ≥7  │  │                      │  │                      ││
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘│
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────┐
│  Amazon S3        │
│  （オブジェクト    │
│   ストレージ）     │
│  バージョニング有効│
└───────────────────┘
```

---

## 2. mTLS 認証フロー詳細

```
┌────────────────────────────────────────────────────────────────────────────┐
│  mTLS 認証フロー（ALB verify モード）                                        │
│                                                                            │
│  ① ブラウザが HTTPS:443 に接続要求                                           │
│     └── クライアント証明書（.p12）を提示                                      │
│                                                                            │
│  ② ALB がサーバー証明書を提示（ACM: app.your-domain.com）                    │
│     └── ブラウザが CA 証明書でサーバー証明書を検証                             │
│                                                                            │
│  ③ ALB が ACM Trust Store（ca.crt）でクライアント証明書を検証                 │
│     ├── 検証成功 → ④ へ進む                                                 │
│     └── 検証失敗 → 400 エラーを返す（アクセス拒否）                            │
│                                                                            │
│  ④ ALB が以下のヘッダーを付与してバックエンドへ転送                             │
│     X-Amzn-Mtls-Clientcert-Subject:                                        │
│       CN=b6ae9356-48e2-4b8c-bae6-945fa2db66ee,O=MMDPF,...                 │
│                                                                            │
│  ⑤ バックエンド（authController.ts）が Subject ヘッダーから CN を解析         │
│     └── CN（UUID）= organization_id としてマルチテナント分離に使用             │
│                                                                            │
│  ※ バックエンドの SG は ALB のセキュリティグループからの通信のみ許可             │
│     → SG外からの直接アクセス・ヘッダー偽装を防止                               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ECS サービス・タスク構成

### 検証環境（変更前）との対比

```
【検証環境（変更前）】                    【本番環境（変更後）】

NLB (TCPパススルー)                      ALB (mTLS verify モード)
  │ TCP:443 パススルー                      │ HTTPS:443
  ▼                                        │
alchemia-nginx-service タスク              ├──/api/*──▶ alchemia-backend-service
  ├── mmdpf-nginx コンテナ (443)  ─廃止─   │           タスク (mmdpf-backend:3001)
  │     ・SSL終端                          │
  │     ・クライアント証明書検証            └──/*─────▶ alchemia-frontend-service
  │     ・org_id 抽出                                  タスク (mmdpf-frontend:3000)
  │     ・X-Organization-Id 付与
  └── mmdpf-frontend コンテナ (3000)─分離─
```

### 本番環境 ECS サービス一覧

| サービス名 | コンテナ | ポート | desiredCount | 変更点 |
|---|---|---|---|---|
| `alchemia-backend-service` | `mmdpf-backend` | 3001 | ≥ 2 | desiredCount増加、Circuit Breaker有効化 |
| `alchemia-frontend-service` | `mmdpf-frontend` | 3000 | ≥ 2 | **新規作成**（nginx タスクから分離） |
| ~~`alchemia-nginx-service`~~ | ~~`mmdpf-nginx`~~ | ~~443/80~~ | ~~廃止~~ | **廃止**（nginx コンテナ不要） |

---

## 4. AWS リソース一覧（本番環境）

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

## 5. セキュリティグループ設計

```
┌────────────────────────────────────────────────────────────────────────────┐
│  セキュリティグループ構成                                                     │
│                                                                            │
│  alchemia-alb-sg（ALB 用）                                                  │
│    インバウンド:                                                             │
│      TCP:443  0.0.0.0/0  （インターネットから HTTPS）                         │
│                                                                            │
│  alchemia-backend-sg（backend ECS タスク用）                                 │
│    インバウンド:                                                             │
│      TCP:3001  alchemia-alb-sg のみ  ← ALB 以外からの直接アクセスを遮断       │
│                                                                            │
│  alchemia-frontend-sg（frontend ECS タスク用）                               │
│    インバウンド:                                                             │
│      TCP:3000  alchemia-alb-sg のみ  ← ALB 以外からの直接アクセスを遮断       │
│                                                                            │
│  alchemia-aurora-sg（Aurora 用）                                             │
│    インバウンド:                                                             │
│      TCP:5432  alchemia-backend-sg のみ                                    │
│                                                                            │
│  alchemia-redis-sg（ElastiCache 用）                                         │
│    インバウンド:                                                             │
│      TCP:6379  alchemia-backend-sg のみ                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 証明書管理フロー

```
┌────────────────────────────────────────────────────────────────────────────┐
│  証明書管理（本番環境）                                                       │
│                                                                            │
│  サーバー証明書（ALB 用）                                                    │
│    ACM で app.your-domain.com のパブリック証明書を発行                        │
│    → 60日前から自動更新（手動作業不要）                                        │
│    → ALB の HTTPS:443 リスナーに紐付け                                       │
│                                                                            │
│  CA証明書（ACM Trust Store 用）                                              │
│    backend/certs/ca/ca.crt を S3 経由で ACM Trust Store に登録              │
│    → Trust Store ARN を ALB リスナーの mTLS 設定に指定                       │
│    → CA 証明書の有効期限（2036年）まで更新不要                                 │
│                                                                            │
│  クライアント証明書（.p12）                                                  │
│    アプリの組織管理画面からダウンロード（従来通り）                              │
│    発行元: ca.crt（自己署名CA）← ACM Trust Store に登録済み                  │
│    → ALB が検証し、Subject ヘッダーをバックエンドへ渡す                        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. シークレット管理（AWS Secrets Manager）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  AWS Secrets Manager（検証環境の平文管理からの移行）                           │
│                                                                            │
│  alchemia/production/db-password        ← Aurora パスワード                 │
│  alchemia/production/redis-password     ← ElastiCache パスワード             │
│  alchemia/production/jwt-secret         ← JWT_SECRET（64文字以上）           │
│  alchemia/production/session-secret     ← SESSION_SECRET（64文字以上）       │
│                                                                            │
│  ECS タスク定義の `secrets` セクションから参照:                               │
│  {                                                                         │
│    "name": "DB_PASSWORD",                                                  │
│    "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT:secret:..." │
│  }                                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. 検証環境との差分サマリー

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

---

## 9. 参照レポート

| ファイル | 内容 |
|---------|------|
| [REPORT.md](./REPORT.md) | 検証環境の問題点一覧・対応優先度サマリー |
| [REPORT1.md](./REPORT1.md) | ALB mTLS で organization_id 抽出を代替できるか？ |
| [REPORT2.md](./REPORT2.md) | nginx/frontend の ECS タスク分離検討 |
| [REPORT3.md](./REPORT3.md) | バックエンドコード変更の具体的内容（ALB mTLS 対応） |
| [REPORT4.md](./REPORT4.md) | ACM Trust Store とは何か？設定方法まとめ |
| [REPORT5.md](./REPORT5.md) | ALB と NLB の特徴・メリット・デメリット比較 |

---

## 10. 参考資料: 検証環境システム構成図

> **出典**: `docs/deploy-guide/alchemia-staging/deploy-guide-aws.md` Section 1 および `staging-deploy-checklist.md` より

### 図1: アーキテクチャ全体図（検証環境）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  エンドユーザー（Chrome）                                                    │
│                                                                             │
│  [HTTPS アクセス]                          [HTTP アクセス]                   │
│  ・CA証明書（MMDPF CA）インポート済み        ・URL に orgId クエリパラメータ付与│
│  ・クライアント証明書（.p12）インポート済み    例: ?orgId=a0718dc5-...         │
│    ※パスワード: mmdpf123                                                    │
└──────────────┬──────────────────────────────────────┬───────────────────────┘
               │ TCP/443（TLS パススルー）              │ HTTP/80
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VPC: vpc-037a0cb50e47092a0 (alchemia-staging-vpc) / CIDR: 10.1.0.0/16     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  パブリックサブネット（internet-facing LB ノード配置）                  │   │
│  │  alchemia-public-1a (10.1.1.0/24) / alchemia-public-1c (10.1.2.0/24) │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │  NLB（Network Load Balancer）│  │  ALB（Application Load Bal.）│   │   │
│  │  │  alchemia-staging-nlb-      │  │  alchemia-staging-alb-      │   │   │
│  │  │  0fd64d466d1b557b           │  │  987042084                  │   │   │
│  │  │  .elb.ap-northeast-1        │  │  .ap-northeast-1.elb.       │   │   │
│  │  │  .amazonaws.com             │  │  amazonaws.com              │   │   │
│  │  │  ・TCPリスナー（終端なし）   │  │  ・HTTP:80 リスナー          │   │   │
│  │  │  ・TCP/443 → 0.0.0.0/0 ⚠️  │  │  ・?orgId= で org_id 取得   │   │   │
│  │  │  ※ internet-facing だが    │  │  ・ターゲット: nginx-svc(80) │   │   │
│  │  │    VPC内サブネットに配置     │  │  ※ VPC内サブネットに配置     │   │   │
│  │  └──────────────┬──────────────┘  └──────────────┬──────────────┘   │   │
│  └─────────────────│────────────────────────────────│──────────────────┘   │
│                    │ TCP/443                         │ HTTP/80              │
│                    ▼                                 ▼                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ECS Fargate: alchemia-nginx-service（desiredCount=1 ⚠️,             │   │
│  │  assignPublicIp=ENABLED）                                            │   │
│                                                                             │
│  ┌──────────────────────────────────┐  ┌───────────────────────────────┐   │
│  │  mmdpf-nginx コンテナ（443/80）  │  │  mmdpf-frontend コンテナ(3000)│   │
│  │  ・SSL 終端（TCP/443）           │  │  Next.js フロントエンド        │   │
│  │  ・クライアント証明書認証（mTLS） │  │                               │   │
│  │    CN（UUID）→ organization_id  │  │                               │   │
│  │  ・X-Organization-Id ヘッダー付与│  │                               │   │
│  │  ・HTTP/80: ALB 経由でアクセス   │  │                               │   │
│  │    ?orgId= から organization_id │  │                               │   │
│  │  ・/api/ → backend (Service     │  │                               │   │
│  │    Discovery, VPC内)            │  │                               │   │
│  │  ・/    → localhost:3000 ──────►│  │                               │   │
│  └──────────────────────────────────┘  └───────────────────────────────┘   │
│  サーバー証明書: CN=alchemia-staging-nlb-...  notAfter=Feb 2027             │
│  CA証明書:       CN=MMDPF CA               notAfter=Feb 2036               │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ TCP/3001（VPC 内 Service Discovery）
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ECS Fargate: alchemia-backend-service（desiredCount=1 ⚠️, assignPublicIp=DISABLED, ただし実際はパブリックIP付与⚠️）│
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  mmdpf-backend コンテナ（3001）                                       │  │
│  │  Node.js / Express API サーバー                                       │  │
│  │  環境変数はタスク定義 JSON に平文記述 ⚠️                                │  │
│  └───────┬──────────────────┬──────────────────┬────────────────────────┘  │
└──────────│──────────────────│──────────────────│────────────────────────────┘
           │ TCP/5432 (SSL)   │ TCP/6379 (TLS)   │
           ▼                  ▼                  │
┌──────────────────┐  ┌────────────────────┐    │ IAM ロール
│  Aurora          │  │  ElastiCache Redis  │    │ (ecsTaskRole)
│  PostgreSQL      │  │                    │    ├──────────────►┌──────────┐
│  alchemia-staging│  │  alchemia-staging  │    │               │  AWS S3  │
│  -aurora         │  │  -redis            │    │               │  mmdpf-  │
│  ──────────────  │  │  ────────────────  │    │               │  files-  │
│  db.t3.medium ⚠️  │  │  cache.t3.small ⚠️ │    │               │production│
│  シングルノード ⚠️ │  │  シングルノード ⚠️  │    │               └──────────┘
│  MultiAZ: false ⚠️│  │  AutoFailover:     │    │
│  BackupRP: 1日 ⚠️ │  │  disabled ⚠️       │    ├──────────────►┌──────────┐
│  DelProt: false⚠️ │  │  Snapshot: 0日 ⚠️  │    │               │  AWS     │
│  EngVer: 15.8   │  │  ────────────────  │    │               │ Bedrock  │
│  Endpoint:      │  │  1ノードのみ        │    │               │(Ollama   │
│  *.cluster-c7u0 │  │  alchemia-staging  │    │               │ 代替)    │
│  cw0em9f8.*     │  │  -redis-001        │    │               └──────────┘
└──────────────────┘  └────────────────────┘    │
                                                 ├──────────────►┌──────────┐
                                                 │               │  AWS SSM │
                                                 │               │Parameter │
                                                 │               │  Store   │
                                                 │               │(証明書   │
                                                 │               │ 格納)    │
                                                 │               └──────────┘
                                                 └──────────────►┌──────────┐
                                                                 │  Amazon  │
                                                                 │   ECR    │
                                                                 │  (3repo) │
                                                                 │ backend  │
                                                                 │ frontend │
                                                                 │  nginx   │
                                                                 └──────────┘
```

---

### 図2: 検証環境リソース設定値一覧

```
┌────────────────────────────────────────────────────────────────────────────┐
│  AWS リージョン: ap-northeast-1 / アカウントID: 137068252939               │
│  ECS クラスター: alchemia-staging                                           │
├──────────────────┬─────────────────────────────────────────────────────────┤
│  コンポーネント   │  検証環境の設定値                                        │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  NLB             │  alchemia-staging-nlb-0fd64d466d1b557b                  │
│                  │  .elb.ap-northeast-1.amazonaws.com                      │
│                  │  リスナー: TCP/443（パススルー）, TCP/80                  │
│                  │  SG: 0.0.0.0/0 全開放 ⚠️                                 │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  ECS             │  alchemia-nginx-service                                 │
│  nginx/frontend  │  ・desiredCount=1 ⚠️                                     │
│  サービス         │  ・launchType=FARGATE                                   │
│                  │  ・assignPublicIp=ENABLED                               │
│                  │  ・Circuit Breaker: 無効 ⚠️                              │
│                  │  コンテナ: mmdpf-nginx(443/80) + mmdpf-frontend(3000)   │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  ECS             │  alchemia-backend-service                               │
│  backend         │  ・desiredCount=1 ⚠️                                     │
│  サービス         │  ・launchType=FARGATE                                   │
│                  │  ・assignPublicIp=DISABLED                              │
│                  │  ・Circuit Breaker: 無効 ⚠️                              │
│                  │  ・配置サブネット: alchemia-public-1c ⚠️                  │
│                  │    ※ MapPublicIpOnLaunch=true のため ENI に               │
│                  │      パブリックIP（13.115.91.45）が自動付与される ⚠️       │
│                  │    ※ 実態はパブリックサブネット配置（設計意図と乖離）⚠️     │
│                  │  ・アウトバウンド: IGW 経由（パブリックIP経由）⚠️           │
│                  │  コンテナ: mmdpf-backend(3001)                          │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  Aurora          │  クラスターID: alchemia-staging-aurora                  │
│  PostgreSQL      │  エンドポイント: *.cluster-c7u0cw0em9f8                 │
│                  │             .ap-northeast-1.rds.amazonaws.com           │
│                  │  エンジン: PostgreSQL 15.8                               │
│                  │  インスタンス: db.t3.medium ⚠️                           │
│                  │  MultiAZ: false ⚠️                                       │
│                  │  DeletionProtection: false ⚠️                            │
│                  │  BackupRetentionPeriod: 1日 ⚠️                           │
│                  │  PerformanceInsights: 無効 ⚠️                            │
│                  │  EnhancedMonitoring: 無効 ⚠️                             │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  ElastiCache     │  レプリケーショングループ: alchemia-staging-redis         │
│  Redis           │  ノード: cache.t3.small × 1台 ⚠️                        │
│                  │  (alchemia-staging-redis-001 のみ)                      │
│                  │  AutomaticFailover: disabled ⚠️                          │
│                  │  MultiAZ: disabled ⚠️                                    │
│                  │  TransitEncryption: 有効 ✅                              │
│                  │  AtRestEncryption: 有効 ✅                               │
│                  │  SnapshotRetentionLimit: 0日 ⚠️                          │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  S3              │  バケット: mmdpf-files-production                        │
│                  │  暗号化(AES256): 有効 ✅                                 │
│                  │  パブリックアクセスブロック: 有効 ✅                       │
│                  │  バージョニング: 無効 ⚠️                                  │
│                  │  ライフサイクル: 未設定 ⚠️                               │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  ECR             │  137068252939.dkr.ecr.ap-northeast-1.amazonaws.com      │
│                  │  ・mmdpf-backend  (タグ: staging)                       │
│                  │  ・mmdpf-frontend (タグ: staging)                       │
│                  │  ・mmdpf-nginx    (タグ: staging)                       │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  SSL証明書       │  サーバー証明書: CN=alchemia-staging-nlb-...            │
│                  │               notAfter=Feb 19 2027                      │
│                  │  CA証明書:     CN=MMDPF CA（自己署名）⚠️                  │
│                  │               notAfter=Feb 16 2036                      │
│                  │  クライアント証明書P12パスワード: mmdpf123（共通）⚠️      │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  IAM             │  ECS Task Role: ecsTaskRole                             │
│                  │  ・S3 アクセス（インラインポリシー）⚠️                    │
│                  │  ・Bedrock アクセス（インラインポリシー）⚠️               │
│                  │  ・SSM アクセス（インラインポリシー）⚠️                   │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  Bedrock         │  リージョン: ap-northeast-1                             │
│                  │  Ollama の代替として使用                                 │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  シークレット管理 │  ECS タスク定義 JSON に平文記述 ⚠️                       │
│                  │  （DB_PASSWORD, JWT_SECRET, SESSION_SECRET,             │
│                  │    REDIS_PASSWORD 等）                                  │
│                  │  Secrets Manager への移行: 未実施 ⚠️                     │
├──────────────────┼─────────────────────────────────────────────────────────┤
│  監視・アラート   │  CloudWatch アラーム: 未設定 ⚠️                          │
└──────────────────┴─────────────────────────────────────────────────────────┘

⚠️ = 本番稼働前に対応が必要な項目  ✅ = 適切に設定済みの項目
```

---

### 図3: VPC・サブネット構成（検証環境）

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  VPC: vpc-037a0cb50e47092a0 (alchemia-staging-vpc)                               │
│  CIDR: 10.1.0.0/16                                                               │
│                                                                                  │
│  ┌───────────────────────────────────┐  ┌────────────────────────────────────┐   │
│  │  AZ: ap-northeast-1a              │  │  AZ: ap-northeast-1c               │   │
│  │                                   │  │                                    │   │
│  │  ┌─────────────────────────────┐  │  │  ┌──────────────────────────────┐  │   │
│  │  │ パブリックサブネット          │  │  │  │ パブリックサブネット           │  │   │
│  │  │ alchemia-public-1a          │  │  │  │ alchemia-public-1c           │  │   │
│  │  │ subnet-0c386da2db38952dc    │  │  │  │ subnet-0388f1051ba7b98ce    │  │   │
│  │  │ 10.1.1.0/24                 │  │  │  │ 10.1.2.0/24                 │  │   │
│  │  │ MapPublicIp: True           │  │  │  │ MapPublicIp: True            │  │   │
│  │  │                             │  │  │  │                              │  │   │
│  │  │ 配置リソース:               │  │  │  │ 配置リソース:                │  │   │
│  │  │  ・NLB ノード               │  │  │  │  ・NLB ノード                │  │   │
│  │  │  ・ECS Fargate タスク       │  │  │  │  ・ECS Fargate タスク        │  │   │
│  │  │    (assignPublicIp=ENABLED) │  │  │  │    (assignPublicIp=ENABLED)  │  │   │
│  │  └─────────────────────────────┘  │  │  └──────────────────────────────┘  │   │
│  │                                   │  │                                    │   │
│  │  ┌─────────────────────────────┐  │  │  ┌──────────────────────────────┐  │   │
│  │  │ プライベートサブネット        │  │  │  │ プライベートサブネット         │  │   │
│  │  │ alchemia-private-1a         │  │  │  │ alchemia-private-1c          │  │   │
│  │  │ subnet-0b0981a2507f1042c    │  │  │  │ subnet-07f168ac7f7902dfe    │  │   │
│  │  │ 10.1.11.0/24                │  │  │  │ 10.1.12.0/24                │  │   │
│  │  │ MapPublicIp: False          │  │  │  │ MapPublicIp: False           │  │   │
│  │  │                             │  │  │  │                              │  │   │
│  │  │ 配置リソース:               │  │  │  │ 配置リソース:                │  │   │
│  │  │  ・Aurora インスタンス       │  │  │  │  ・Aurora インスタンス        │  │   │
│  │  │  ・ElastiCache ノード        │  │  │  │  ・ElastiCache ノード         │  │   │
│  │  │  ・踏み台EC2 (10.1.11.44)   │  │  │  │                              │  │   │
│  │  └─────────────────────────────┘  │  │  └──────────────────────────────┘  │   │
│  └───────────────────────────────────┘  └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

> **⚠️ 図3 補足**: `alchemia-public-1c`（パブリックサブネット）の「配置リソース」には、図中に記載のない **`alchemia-backend-service`（ECS Fargate タスク）も実際には配置されています**。  
> `assignPublicIp=DISABLED` と設定されていても、`MapPublicIpOnLaunch=true` のパブリックサブネットに配置されているため、ENI にパブリックIP（13.115.91.45）が自動付与されます。これは設計意図（プライベートサブネット配置）と乖離した状態です。⚠️

### 図4: セキュリティグループ詳細（検証環境）

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  セキュリティグループ一覧（検証環境）                                               │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-0b315366936dbbf03  (旧ALB用: alchemia-staging-alb)                             │
│    ※ alchemia-staging-alb (ALB, internet-facing) で使用中 ← HTTP/80 アクセス用     │
│    インバウンド:                                                                   │
│      TCP:80    0.0.0.0/0  （HTTP インターネットから）                               │
│      TCP:443   0.0.0.0/0  （HTTPS インターネットから）                              │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-08569630d4e399b60  (alchemia-nginx-sg / nginx+frontend ECS タスク用)            │
│    ※ alchemia-nginx-service で使用。NLB からトラフィックを受け取る                  │
│    インバウンド:                                                                   │
│      TCP:80    0.0.0.0/0                    （NLB ヘルスチェック・HTTP）            │
│      TCP:80    sg-0b315366936dbbf03         （旧ALB からの HTTP:80）                │
│      TCP:443   0.0.0.0/0                    （NLB TCPパススルー）⚠️全開放           │
│      TCP:443   sg-0b315366936dbbf03         （旧ALB からの HTTPS:443）              │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-09de1ef2b9ce88b67  (alchemia-ecs-backend-sg / backend ECS タスク用・旧)         │
│    ※ ElastiCache Redis SG のインバウンドに登録済み（Redis アクセス権あり）           │
│    インバウンド:                                                                   │
│      TCP:3001  sg-0b315366936dbbf03         （旧ALB からのみ） ⚠️NLB未許可          │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-0920f1a670e75b444  (現在稼働中の alchemia-backend-service で使用)               │
│    ※ 現在の alchemia-backend-service に設定されているSG                             │
│    ※ ElastiCache Redis SG のインバウンドに登録済み（Redis アクセス権あり）           │
│    インバウンド: 要確認                                                            │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-02d0638a1a2185f47  (alchemia-rds-sg / Aurora PostgreSQL 用)                    │
│    インバウンド:                                                                   │
│      TCP:5432  sg-078007f4ff79cba5a         （ECS backend タスク用 旧SG からのみ）  │
│      TCP:5432  10.1.11.44/32                （踏み台EC2 からの管理アクセス）         │
├────────────────────────────────────────────────────────────────────────────────────┤
│  sg-0e21f75613471063b  (alchemia-redis-sg / ElastiCache Redis 用)                  │
│    インバウンド:                                                                   │
│      TCP:6379  sg-09de1ef2b9ce88b67         （ECS backend タスク用 旧SG）           │
│      TCP:6379  sg-0920f1a670e75b444         （ECS backend タスク用 現行SG）         │
│      TCP:6379  sg-0e22cd8f637e8d514         （踏み台EC2 からの管理アクセス）         │
└────────────────────────────────────────────────────────────────────────────────────┘

  ※ SG間の通信フロー（検証環境）
  インターネット
    │ TCP/443 TCPパススルー
    ▼
  NLB (alchemia-staging-nlb)
    │ TCP/443
    ▼
  sg-08569630d4e399b60 (alchemia-nginx-sg)
  ECS: alchemia-nginx-service
    │ TCP/3001 (VPC内 Service Discovery: alchemia.local)
    ▼
  sg-0920f1a670e75b444
  ECS: alchemia-backend-service
    ├─ TCP/5432 ─▶ sg-02d0638a1a2185f47 (alchemia-rds-sg)   Aurora
    └─ TCP/6379 ─▶ sg-0e21f75613471063b (alchemia-redis-sg)  ElastiCache
```

---

### 図5: 検証環境ネットワークリソース補足一覧

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  ネットワーク補足情報                                                               │
├──────────────────────┬─────────────────────────────────────────────────────────────┤
│  コンポーネント        │  補足情報                                                  │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  VPC                 │  ID: vpc-037a0cb50e47092a0                                  │
│                      │  名前: alchemia-staging-vpc                                 │
│                      │  CIDR: 10.1.0.0/16                                         │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  パブリックサブネット  │  alchemia-public-1a: subnet-0c386da2db38952dc (10.1.1.0/24) │
│                      │  alchemia-public-1c: subnet-0388f1051ba7b98ce (10.1.2.0/24) │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  プライベートサブネット│  alchemia-private-1a: subnet-0b0981a2507f1042c (10.1.11.0/24)│
│                      │  alchemia-private-1c: subnet-07f168ac7f7902dfe (10.1.12.0/24)│
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  NLB (現用)          │  名前: alchemia-staging-nlb                                 │
│                      │  ARN: .../net/alchemia-staging-nlb/0fd64d466d1b557b         │
│                      │  サブネット: subnet-0c386da2db38952dc (1a)                  │
│                      │            subnet-0388f1051ba7b98ce (1c)                   │
│                      │  ターゲットグループ(443): alchemia-nginx-tg-tcp443           │
│                      │    ARN末尾: .../alchemia-nginx-tg-tcp443/8e711b39e6bc198f  │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  ALB (残存・HTTP用)  │  名前: alchemia-staging-alb                                 │
│                      │  DNS: alchemia-staging-alb-987042084                        │
│                      │       .ap-northeast-1.elb.amazonaws.com                    │
│                      │  HTTP:80 → alchemia-nginx-service(80) ?orgId= 経由         │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  Service Discovery   │  名前空間: alchemia.local                                   │
│                      │  ID: ns-qpfu4ddhzvys7xqb                                   │
│                      │  backend DNS: alchemia-backend.alchemia.local               │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  Aurora エンドポイント│  alchemia-staging-aurora.cluster-c7u0cw0em9f8               │
│                      │    .ap-northeast-1.rds.amazonaws.com:5432                  │
│                      │  サブネットグループ: alchemia-staging-db-subnet-group        │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  ElastiCache エンドポ│  master.alchemia-staging-redis.rekssa                       │
│  イント               │    .apne1.cache.amazonaws.com:6379                         │
│                      │  サブネットグループ: alchemia-cache-subnet-group              │
├──────────────────────┼─────────────────────────────────────────────────────────────┤
│  踏み台EC2           │  IP: 10.1.11.44 (alchemia-private-1a 内)                   │
│                      │  SG: sg-0e22cd8f637e8d514                                  │
│                      │  用途: Aurora / ElastiCache への管理アクセス                │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```
