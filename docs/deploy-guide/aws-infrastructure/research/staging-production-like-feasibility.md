# 本番想定テスト環境の構築可否調査レポート

- **作成日**: 2026-04-23
- **対象**: 検証用AWS環境（alchemia-staging）に本番想定テスト環境を追加構築する際の検討
- **関連ファイル**: ARCHITECTURE.md, REPORT.md

---

## 1. 結論

**技術的には可能です。** 現在の検証環境（`alchemia-staging`）と同じAWSアカウント内に、本番構成を模した新しいテスト環境を並行して構築できます。

---

## 2. 現状の検証環境と目標の本番想定テスト環境の対比

| コンポーネント | 検証環境（現在） | 本番想定テスト環境（目標） |
|---|---|---|
| ECS クラスター | `alchemia-staging` | `alchemia-production`（新規） |
| ロードバランサー | NLB（TCPパススルー） | **ALB（mTLS verify、HTTPS:443）** + WAF |
| nginx コンテナ | あり（frontend と同居） | **廃止**（ALBがSSL終端・mTLS担当） |
| ECS Frontend | nginx+frontend 同居タスク（desiredCount=1） | **独立サービス**（desiredCount≥2） |
| ECS Backend | desiredCount=1、Circuit Breaker無効 | desiredCount≥2、Circuit Breaker有効 |
| Aurora PostgreSQL | `db.t3.medium` / シングルノード / MultiAZ無効 | `db.r6g.large` / **MultiAZ** / DeletionProtection有効 / バックアップ7日 |
| ElastiCache Redis | `cache.t3.small` / シングルノード / AutoFailover無効 | **MultiAZ** / AutoFailover有効 / スナップショット3日 |
| シークレット管理 | タスク定義JSONに平文記述 | **AWS Secrets Manager** |
| WAF | なし | ALBにWebACLアタッチ |
| S3バージョニング | 無効 | **有効** |
| CloudWatchアラーム | 未設定 | **主要メトリクスのアラーム設定** |

---

## 3. 構築に必要な作業

### 新規作成が必要なリソース

| # | リソース | 内容 |
|---|---|---|
| ① | ECS クラスター | `alchemia-production`（新規作成） |
| ② | ALB + ACM Trust Store | mTLS verify 設定、ca.crt 登録 |
| ③ | Aurora PostgreSQL クラスター | 本番スペック（db.r6g.large、MultiAZ） |
| ④ | ElastiCache Redis | MultiAZ構成（AutoFailover有効） |
| ⑤ | ECS サービス（2つ） | `alchemia-backend-service` / `alchemia-frontend-service` |
| ⑥ | ECS タスク定義 | フロントエンドはnginxなし独立タスク |
| ⑦ | Secrets Manager シークレット | DB/Redis/JWT/Session の各シークレット |
| ⑧ | WAF WebACL | ALBにアタッチ |
| ⑨ | セキュリティグループ | ALB→ECS→Aurora/Redis の通信制限 |
| ⑩ | CloudWatch アラーム | ECS/Aurora/Redis/ALB の主要メトリクス |

### 既存リソースの流用・設定変更

| リソース | 対応内容 |
|---|---|
| ECR リポジトリ（mmdpf-backend/mmdpf-frontend） | **流用可能**（既存イメージをそのまま使用） |
| S3バケット（mmdpf-files-production） | **バージョニング有効化** |
| IAM ロール（ecsTaskRole/ecsTaskExecutionRole） | **Secrets Manager権限を追加** |
| Bedrock（ap-northeast-1） | IAMロール経由でそのまま利用可能 |

---

## 4. VPC と ECS クラスターの関係

### 概念の整理

| 概念 | 役割 |
|---|---|
| **VPC**（Virtual Private Cloud） | AWS上に作る「仮想の専用ネットワーク」。EC2・ECS・Aurora・Redis など全リソースを収容する **ネットワーク基盤** |
| **ECS クラスター** | ECS上でコンテナを動かすための**管理グループ（論理的なまとまり）**。コンテナが実際に動く場所（ネットワーク）は VPC のサブネット |

```
┌─────────────────────────────────────────────────────┐
│  VPC（ネットワーク基盤）                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ECS クラスター: alchemia-staging           │   │
│  │  （コンテナの管理グループ）                   │   │
│  │                                             │   │
│  │  ┌─────────────┐  ┌──────────────────────┐ │   │
│  │  │ backend     │  │ nginx+frontend       │ │   │
│  │  │ タスク      │  │ タスク               │ │   │
│  │  │ IP:10.0.1.5 │  │ IP:10.0.1.6          │ │   │
│  │  └─────────────┘  └──────────────────────┘ │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Aurora（IP:10.0.2.10）                             │
│  ElastiCache Redis（IP:10.0.2.11）                  │
└─────────────────────────────────────────────────────┘
```

- ECS タスク（コンテナ）は **VPC のサブネット内に配置**され、IPアドレスを持つ
- Aurora や Redis も同じ VPC 内にあるため、プライベートに通信できる
- **「新しいECSクラスターを作る」＝「コンテナの管理グループに新しい名前をつける」** だけで、VPCやサブネットは既存のものを流用できる

---

## 5. VPC の選択：2つのアプローチ

### オプションA：既存VPCを流用（推奨・手軽）

```
既存VPC（検証環境と共用）
  ├── 既存リソース（触らない）
  │     ├── ECS クラスター: alchemia-staging
  │     ├── Aurora（検証用: db.t3.medium）
  │     └── ElastiCache Redis（検証用: cache.t3.small）
  │
  └── 新規作成リソース
        ├── ECS クラスター: alchemia-production（新規）
        ├── ALB（新規）
        ├── Aurora（本番スペック: db.r6g.large、MultiAZ）
        └── ElastiCache Redis（本番スペック: MultiAZ）
```

**メリット:**
- 既存のVPC、サブネット、セキュリティグループ設計をそのまま活用できる
- 新規に必要なネットワーク設定が最小限
- 構築が速い

**デメリット:**
- 検証環境と本番テスト環境が同一ネットワーク上に存在する（セキュリティグループで通信制限は可能）
- 本番環境の「完全分離」を再現しているわけではない

---

### オプションB：別VPCを作成（より本番に近い構成）

```
既存VPC（検証環境専用）
  └── alchemia-staging クラスター、Aurora（検証用）、Redis（検証用）

新規VPC（本番テスト環境専用）
  └── alchemia-production クラスター、Aurora（本番スペック）、Redis（本番スペック）
```

**メリット:**
- 本番環境と同じ「完全分離されたネットワーク」を再現できる
- 検証環境と本番テスト環境の通信が物理的に分離される
- 本番への移行時に構成を丸ごと適用しやすい

**デメリット:**
- VPC・サブネット・ルートテーブル・インターネットゲートウェイ等のネットワーク設計を一から行う必要があり、**構築コスト（時間）が増える**
- NAT Gatewayが必要になる場合、追加コストが発生（月$30〜50程度）

---

### VPCオプションの選択基準

| 目的 | 推奨オプション |
|---|---|
| **「本番構成の機能テスト」が目的**（Aurora MultiAZ、Redis MultiAZ、Secrets Manager等の動作確認） | **オプションA（既存VPC流用）** で十分 |
| **「本番環境そのものの事前検証」が目的**（本番移行前の最終確認） | **オプションB（別VPC作成）** がより正確 |

**推奨アプローチ**: まずオプションAで構築して検証し、問題なければ本番時にオプションBの完全分離構成を適用する二段階アプローチが現実的。

---

## 6. 注意点

### ① ALBのmTLS設定に「ドメイン」が必要か問題

本番想定のALB mTLS構成では、**サーバー証明書（ACM）** が必要です。

| ケース | 対応 |
|---|---|
| カスタムドメインあり | ACMでパブリック証明書を自動発行・ALBに設定 |
| ドメインなし（テスト環境） | 自己署名証明書をACMにインポート（手動更新必要）、またはHTTP:80で代替 |

→ テスト目的であれば、**HTTPS化は後回しにしてHTTP:80でALBを構築し、mTLS以外の本番構成（Aurora MultiAZ、Redis MultiAZ、Secrets Manager等）を先に検証する** 段階的アプローチが現実的。

### ② コスト増加

検証環境に加えて本番スペックの環境を並行稼働させると月額コストが増加します。

| リソース | 概算（月額） |
|---|---|
| Aurora db.r6g.large × 2ノード | 約 $300〜400 |
| ElastiCache cache.r6g.large × 2ノード | 約 $200〜300 |
| ALB | 約 $20〜30 |
| WAF | 約 $10〜20 |
| ECS Fargate（backend+frontend 各2タスク） | 約 $50〜100 |
| **合計（概算）** | **約 $580〜850/月** |

→ コスト削減のため、**テスト期間中のみ稼働**させてテスト後に停止・削除する運用も考慮すべき。

### ③ 既存の検証環境は影響を受けない

同一アカウント内に別名のリソースを作るだけなので、既存の `alchemia-staging` 環境は**一切影響を受けない**。

---

## 7. 推奨構築手順（段階的アプローチ）

**Phase 1**: インフラ層の構築
- Aurora MultiAZ（db.r6g.large）の新規クラスター作成
- ElastiCache Redis MultiAZ（AutoFailover有効）の新規作成
- AWS Secrets Manager へのシークレット登録
- **目的**: 本番スペックのデータ層が正常動作するか検証

**Phase 2**: ECS + ALB の構築
- nginxなし・frontend独立サービスのECSタスク定義作成
- ALBの作成・ターゲットグループ設定
- alchemia-production クラスターへのサービスデプロイ
- **目的**: デプロイスクリプト・タスク定義の本番対応版を検証

**Phase 3**: mTLS + WAF の設定
- ACM Trust Store への ca.crt 登録
- ALBリスナーへの mTLS verify 設定
- WAF WebACL のALBへのアタッチ
- **目的**: セキュリティ要件の最終検証

---

## 8. 参照レポート

| ファイル | 内容 |
|---------|------|
| [REPORT.md](./REPORT.md) | 検証環境の問題点一覧・対応優先度サマリー |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 本番環境AWSシステム構成図 |
| [REPORT1.md](./REPORT1.md) | ALB mTLS で organization_id 抽出を代替できるか？ |
| [REPORT2.md](./REPORT2.md) | nginx/frontend の ECS タスク分離検討 |
| [REPORT5.md](./REPORT5.md) | ALB と NLB の特徴・メリット・デメリット比較 |
| [REPORT6.md](./REPORT6.md) | AWS Route 53 と AWS WAF について |
| [REPORT7.md](./REPORT7.md) | ECSスケーリング調査レポート |

---

*本レポートは検証用AWS環境に本番想定テスト環境を追加構築する際の技術的可否・アプローチの検討内容をまとめたものです。*
