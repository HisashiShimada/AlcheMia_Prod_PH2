# 本番環境AWSシステム構成 検討レポート

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（検証環境 → 本番環境 移行検討）
- **調査元**: `docs/deploy-guide/saas/` 配下の全デプロイガイド・作業メモ

---

## 概要

検証環境（`alchemia-staging`）の構築ドキュメントおよび実際の作業メモを分析し、
本番環境として運用する際に対応が必要な問題点をまとめた。

---

## 現在の検証環境 構成サマリー

| コンポーネント | 検証環境の設定 |
|--------------|--------------|
| Aurora PostgreSQL | `db.t3.medium` / シングルノード / MultiAZ無効 / バックアップ1日 |
| ElastiCache Redis | `cache.t3.small` / シングルノード / AutoFailover無効 |
| ECS Backend | `desiredCount=1` / Circuit Breaker無効 |
| ECS Nginx+Frontend | `desiredCount=1` / Circuit Breaker無効 |
| NLB | TCPパススルー（443/80）/ SG 0.0.0.0/0 開放 |
| S3 | バージョニング無効 / ライフサイクル無設定 |
| SSL証明書 | 自己署名CA（`CN=MMDPF CA`）/ 有効期限1年 |
| シークレット管理 | ECSタスク定義JSONに平文記述 |
| 監視・アラート | 未設定 |

---

## 問題点一覧

---

## 🔴 重大（本番稼働前に必ず対応）

### 1. パスワード・シークレットの平文管理

**問題箇所**: `memo_deploy_staging_sasa.md`、`ecs-task-definition-alchemia-backend.json`

**現状**:
- DBパスワードが `maiml_user` のまま（推測容易）
- `JWT_SECRET`, `SESSION_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD` がECSタスク定義JSONに**平文で記述**されている
- `deploy-guide-aws.md` でも「Secrets Manager への移行を推奨」と記載があるが**未実施**

**証拠（作業メモより）**:
```bash
--master-user-password "maiml_user"
```
```bash
--auth-token "773e900e08b512076008c4e7c229779f"  # RedisパスワードがCLIコマンドに記録
```

**対応策**:
- Aurora / Redis のパスワードを `openssl rand -base64 32` などで生成した強力なものに変更
- `JWT_SECRET` / `SESSION_SECRET` を 64文字以上のランダム文字列に変更
- 全シークレットを **AWS Secrets Manager** に移行し、タスク定義の `secrets` セクションから参照する構成に変更

---

### 2. Aurora PostgreSQL の可用性・耐久性不足

**問題箇所**: `aurora-setup-guide.md` STEP4、`memo_deploy_staging_sasa.md` 実行結果

**現状（実行結果から確認）**:
```json
"DBInstanceClass": "db.t3.medium"
"MultiAZ": false
"DeletionProtection": false
"BackupRetentionPeriod": 1
"PerformanceInsightsEnabled": false
"MonitoringInterval": 0
```

**問題点**:
- `db.t3.medium` は検証用スペック。本番DBとして性能が不十分
- シングルノード構成のため、インスタンス障害時にダウンタイムが発生
- `DeletionProtection=false` により、誤操作でDBクラスターを削除可能
- バックアップ保持1日では障害時のリカバリが困難
- Performance Insights / Enhanced Monitoring が無効でパフォーマンス問題の調査ができない

**対応策**:
```bash
# インスタンスクラスの変更（例: r6g.large以上）
aws rds modify-db-instance \
  --db-instance-identifier alchemia-staging-aurora-instance-1 \
  --db-instance-class db.r6g.large \
  --apply-immediately

# 削除保護の有効化
aws rds modify-db-cluster \
  --db-cluster-identifier alchemia-staging-aurora \
  --deletion-protection \
  --backup-retention-period 7 \
  --apply-immediately

# リードレプリカを追加してMultiAZ化
aws rds create-db-instance \
  --db-instance-identifier alchemia-aurora-instance-2 \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --db-instance-class db.r6g.large \
  --availability-zone ap-northeast-1c
```

---

### 3. ElastiCache Redis の可用性不足

**問題箇所**: `elasticache-setup-guide.md` STEP3、`memo_deploy_staging_sasa.md` 実行結果

**現状（実行結果から確認）**:
```json
"AutomaticFailover": "disabled"
"MultiAZ": "disabled"
"SnapshotRetentionLimit": 0
"CacheNodeType": "cache.t3.small"
"MemberClusters": ["alchemia-staging-redis-001"]  ← 1ノードのみ
```

**問題点**:
- シングルノードのため、ノード障害時にセッション情報が全損しユーザーが強制ログアウト
- `cache.t3.small` は本番トラフィックに対して性能不足の可能性
- スナップショット保存が0日のため、障害時のデータリカバリ不可

**対応策**:
```bash
# Multi-AZ有効化・ノード追加
aws elasticache modify-replication-group \
  --replication-group-id alchemia-staging-redis \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --snapshot-retention-limit 3 \
  --apply-immediately

# ノード追加
aws elasticache increase-replica-count \
  --replication-group-id alchemia-staging-redis \
  --new-replica-count 1 \
  --apply-immediately
```

---

### 4. SSL証明書の問題

**問題箇所**: `ssl-ssm-setup-memo.md`、`server-cert-regenerate-guide.md`、`chrome-access-guide.md`

**現状**:
```
# ssl-ssm-setup-memo.md の実行結果より
server.crt: CN=localhost  notAfter=Feb 19 06:13:59 2027 GMT  ← 当初はCN=localhost
ca.crt    : CN=MMDPF CA   notAfter=Feb 16 07:51:54 2036 GMT  ← 自己署名CA
```
- 当初の証明書が `CN=localhost` でNLBのDNS名と不一致 → Chrome 警告が発生（後から再生成で対応）
- CA が自己署名のため、エンドユーザー全員が手動でCA証明書のインポートが必要
- クライアント証明書（.p12）のパスワードが **全組織共通で `mmdpf123`** の固定値
- 証明書有効期限が1年のため、年次での手動更新作業が必要

**対応策**:
- 独自ドメインを取得し、**AWS Certificate Manager (ACM)** または Let's Encrypt でパブリック証明書を発行
- クライアント証明書の管理には **AWS Certificate Manager Private CA** の導入を検討
- クライアント証明書パスワードを環境変数（`CERT_P12_PASSWORD`）で組織ごとに管理する仕組みに変更
- 証明書有効期限の監視・自動更新の仕組みを導入

---

## 🟠 重要（本番稼働時に対応推奨）

### 5. ECSサービスの冗長性・自動スケール未設定

**問題箇所**: `memo_deploy_staging_sasa.md` ECSサービス作成箇所

**現状**:
```json
"desiredCount": 1  // 両サービスとも1タスク（SPOF）
"deploymentCircuitBreaker": {
  "enable": false,
  "rollback": false  // 障害デプロイの自動ロールバックなし
}
```

**問題点**:
- 各サービスが1タスクのみ起動しており、タスク障害時にサービス停止
- デプロイ中の新タスク起動失敗時に自動ロールバックされない
- トラフィック増加時の自動スケールアウト機能がない

**対応策**:
```bash
# desiredCount を2以上に変更
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --desired-count 2

# Auto Scaling の設定
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/alchemia-staging/alchemia-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Circuit Breaker + 自動ロールバックを有効化（タスク定義更新時に設定）
```

---

### 6. セキュリティグループの過剰開放

**問題箇所**: `nlb-migration-guide.md` Step4、`nlb-migration-memo.md` 実行結果

**現状**:
```bash
# NLBヘルスチェック対応のため、全IPに開放
--port 443 --cidr 0.0.0.0/0
--port 80  --cidr 0.0.0.0/0
```

**問題点**:
- ECSタスクのSGが `0.0.0.0/0` からのTCP:443 / TCP:80 を許可しているため、**NLBをバイパスして直接アクセスが可能**
- nginx が直接インターネットに露出しており、クライアント証明書認証をNLB前段で迂回できる可能性がある

**対応策**:
- NLBのElastic IPを固定し、そのCIDRのみをSGで許可する
  ```bash
  # NLBのElastic IPを確認・固定
  aws ec2 allocate-address --domain vpc
  # → NLBにEIPを割り当て、SGではそのEIPのみ許可
  ```
- またはAWS Managed Prefix Lists（`com.amazonaws.ap-northeast-1.network-load-balancer`相当）を使用
- nginxサービスを**プライベートサブネット**に配置し、パブリックIPを持たせない構成に変更

---

### 7. IAMポリシーの管理

**問題箇所**: `bedrock-iam-setup.md`、`memo_deploy_staging_sasa.md` S3セクション

**現状**:
- S3アクセスポリシー、Bedrockポリシー、SSMポリシーがすべて **インラインポリシー** で `ecsTaskRole` に付与
- IAMコンソールでの変更履歴管理が困難（CloudTrailには残るが、ポリシー変更の追跡がしにくい）

**対応策**:
- インラインポリシーを **カスタムマネージドポリシー** に変換
  ```bash
  aws iam create-policy \
    --policy-name AlchemiaS3AccessPolicy \
    --policy-document file:///tmp/s3-policy.json
  
  aws iam attach-role-policy \
    --role-name ecsTaskRole \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/AlchemiaS3AccessPolicy
  ```

---

### 8. 監視・アラートの未設定

ドキュメント全体を通じて **CloudWatch アラームの設定が記載されていない**。

**対応が必要なアラーム**:

| 対象 | メトリクス | 閾値（目安） |
|------|---------|------------|
| ECS Backend | CPUUtilization | > 80% |
| ECS Backend | MemoryUtilization | > 80% |
| ECS Backend | RunningTaskCount | < 1 |
| Aurora | CPUUtilization | > 80% |
| Aurora | DatabaseConnections | > 80% の上限 |
| Aurora | FreeStorageSpace | < 20GB |
| ElastiCache | EngineCPUUtilization | > 80% |
| ElastiCache | DatabaseMemoryUsagePercentage | > 80% |
| NLB | HealthyHostCount | < 1 |
| CloudWatch Logs | ERROR パターン | 5分間で10件以上 |

```bash
# 例: ECS RunningTaskCount アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "alchemia-backend-task-count-low" \
  --metric-name RunningTaskCount \
  --namespace AWS/ECS \
  --dimensions Name=ServiceName,Value=alchemia-backend-service Name=ClusterName,Value=alchemia-staging \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-1:ACCOUNT_ID:alchemia-alerts
```

---

## 🟡 中程度（運用開始後に段階的に対応）

### 9. カスタムドメイン・DNS 未設定

**現状**: アクセスURLが NLBのDNS名（`alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com`）のまま

**問題点**:
- NLBを作り直すとDNS名が変わり、ユーザーへの周知が必要
- 独自ドメインがないと信頼性の低いURLになる
- `CORS_ORIGIN` / `FRONTEND_URL` など複数箇所に NLB DNS名をハードコードしており、変更時の影響範囲が広い

**対応策**:
- 独自ドメインを取得し、Route 53 で CNAME/Aliasレコードを設定
- NLBのDNS名の代わりにカスタムドメインを `CORS_ORIGIN` / `FRONTEND_URL` に設定

---

### 10. S3バケットのバージョニング・ライフサイクル未設定

**問題箇所**: `memo_deploy_staging_sasa.md` S3バケット作成箇所

**現状**: 暗号化（AES256）とパブリックアクセスブロックは設定済みだが以下が未設定

**未設定項目**:
- **バージョニング**: 誤削除・誤上書き時のリカバリ不可
- **ライフサイクルルール**: 古いバージョンや不要ファイルの自動削除・Glacier移行
- **オブジェクトロック**: 重要データの改ざん防止
- **アクセスログ**: S3への不正アクセスの監査ログ

```bash
# バージョニングの有効化
aws s3api put-bucket-versioning \
  --bucket mmdpf-files-production \
  --versioning-configuration Status=Enabled

# ライフサイクルルールの設定
aws s3api put-bucket-lifecycle-configuration \
  --bucket mmdpf-files-production \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-old-versions",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 90}
    }]
  }'
```

---

### 11. DBマイグレーション管理の脆弱性

**問題箇所**: `deploy-guide-aws.md` Section6

**問題点**:
- `--migrate` オプションが全SQLファイルを毎回適用するため、冪等性（`IF NOT EXISTS`）が担保されていないSQLがあると本番DBを破壊する可能性
- ロールバックSQLが **手動での実行のみ**で、自動ロールバック機能がない
- マイグレーション適用済み状態の管理（`flyway` や `liquibase` のような管理テーブルがない）

**対応策**:
- マイグレーション管理ツール（`flyway` / `node-pg-migrate` 等）の導入検討
- 本番環境へのマイグレーション適用前に、ステージング環境でのテスト実施を必須化

---

### 12. 踏み台EC2の管理

**問題箇所**: `backfill-client-certificate.md`、各種ガイドの踏み台経由手順

**問題点**:
- 機密情報（.p12ファイル）をローカル→踏み台サーバ間で **SCPで転送**し `/tmp/` に一時保存
- 踏み台EC2がパブリックIPを持ちSSHで直接アクセス可能な構成
- CA秘密鍵（`ca.key`）がローカル開発機に存在している必要がある

**対応策**:
- 踏み台EC2への接続を **AWS Systems Manager Session Manager** に移行（SSHポート不要）
- CA秘密鍵を AWS Secrets Manager に移行し、ローカル保持を廃止
- 一時ファイルの作成を避け、パイプ経由でのS3アップロードを検討

---

## 📋 対応優先度サマリー

| 優先度 | # | 問題点 | 対応内容 |
|--------|---|--------|---------|
| 🔴 必須 | 1 | パスワード・シークレットの平文管理 | AWS Secrets Manager への移行 |
| 🔴 必須 | 2 | DBパスワードが `maiml_user` | 強力なパスワードへの変更 |
| 🔴 必須 | 3 | Aurora シングルノード構成 | MultiAZ + リードレプリカ追加 |
| 🔴 必須 | 4 | Redis シングルノード構成 | MultiAZ + AutoFailover 有効化 |
| 🔴 必須 | 5 | 自己署名SSL証明書 + 共通パスワード | ACM または公的CA 証明書への移行 |
| 🟠 重要 | 6 | ECS desiredCount=1 / Circuit Breaker無効 | desiredCount 2以上 + Auto Scaling |
| 🟠 重要 | 7 | SG が 0.0.0.0/0 に過剰開放 | NLB IPのみに制限 |
| 🟠 重要 | 8 | IAMインラインポリシー | マネージドポリシーへの変換 |
| 🟠 重要 | 9 | CloudWatch アラート未設定 | 主要メトリクスのアラーム設定 |
| 🟡 中程度 | 10 | カスタムドメイン未設定 | Route 53 + 独自ドメイン |
| 🟡 中程度 | 11 | S3バージョニング未設定 | バージョニング + ライフサイクル設定 |
| 🟡 中程度 | 12 | マイグレーション管理 | 管理ツール導入 + テスト必須化 |
| 🟡 中程度 | 13 | 踏み台EC2の管理 | SSM Session Manager への移行 |

---

## 付記: 検証環境で確認された設定値

### Aurora DBクラスター（実行結果より）

```
クラスター識別子: alchemia-staging-aurora
エンドポイント: alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com
エンジンバージョン: 15.8
インスタンスクラス: db.t3.medium
MultiAZ: false
DeletionProtection: false
BackupRetentionPeriod: 1日
```

### ElastiCache Redisクラスター（実行結果より）

```
レプリケーショングループID: alchemia-staging-redis
ノードタイプ: cache.t3.small
ノード数: 1 (alchemia-staging-redis-001)
AutomaticFailover: disabled
TransitEncryptionEnabled: true
AtRestEncryptionEnabled: true
```

### ECSサービス（作業メモより）

```
alchemia-backend-service: desiredCount=1, launchType=FARGATE, assignPublicIp=DISABLED
alchemia-nginx-service:   desiredCount=1, launchType=FARGATE, assignPublicIp=ENABLED
```

---

*本レポートは `docs/deploy-guide/saas/` 配下の全ドキュメント（aurora-setup-guide.md, elasticache-setup-guide.md, deploy-guide-aws.md, nlb-migration-guide.md, nlb-migration-memo.md, ssl-ssm-setup-guide.md, ssl-ssm-setup-memo.md, server-cert-regenerate-guide.md, backfill-client-certificate.md, chrome-access-guide.md, bedrock-iam-setup.md, memo_deploy_staging_sasa.md）を分析して作成した。*
