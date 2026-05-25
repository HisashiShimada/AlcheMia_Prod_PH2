# AWS インフラ構築ドキュメント

## 概要

このディレクトリは、mmdpf の AWS 環境（検証環境・本番想定検証環境・本番環境）に関するインフラ構築手順書、構成検討資料、調査資料をまとめたものです。

---

## ディレクトリ構成

```
aws-infrastructure/
├── README.md                                          # このファイル
├── design/                                            # 構成・設計の検討資料
│   ├── alb-mtls-backend-code-changes.md              # バックエンドコード変更の具体的内容（ALB mTLS 対応）
│   ├── backend-alb-integration-design.md             # backend ECS サービスと prod-backend-tg の接続方式 設計検討
│   ├── dual-alb-architecture-investigation.md        # 二段階ALB構成の検討結果
│   ├── production-architecture-review.md             # 本番環境AWSシステム構成 検討レポート
│   └── subnet-az-redundancy-design.md                # サブネット分離・AZ冗長構成の検討
├── research/                                          # 調査資料
│   ├── acm-trust-store.md                            # ACM Trust Store とは何か？設定方法まとめ
│   ├── alb-organization-id-extraction.md             # ALB で organization_id 抽出を代替できるか？
│   ├── alb-target-group.md                           # ターゲットグループ（Target Group）とは
│   ├── alb-vs-nlb-comparison.md                      # ALB と NLB の特徴・メリット・デメリット比較
│   ├── availability-zone.md                          # AZ（アベイラビリティゾーン）とは何か
│   ├── aws-service-placement-review.md               # AWS サービス配置に関する調査・修正レポート
│   ├── ecs-ecr-bedrock-access-method.md              # ECSからECR/Bedrockへのアクセス方式比較
│   ├── ecs-nginx-frontend-separation.md              # nginx/frontend の ECS タスク分離検討
│   ├── ecs-scaling.md                                # ECSスケーリング調査レポート
│   ├── internet-gateway.md                           # Internet Gateway 調査レポート
│   ├── network_concepts_qa.md                        # ネットワーク概念 Q&A
│   ├── openssl_command_explanation.md                # openssl req コマンド解説
│   ├── route53-waf.md                                # AWS Route 53 と AWS WAF について
│   ├── s3_endpoint_explanation.md                    # S3 Gateway Endpoint が必要な理由
│   ├── security_group_overview.md                    # AWSセキュリティグループの紐づけについて
│   ├── ERROR_INVESTIGATION.md                        # エラー調査レポート: UnsupportedCertificate
│   ├── SERVER_CERT_REINSTALL_GUIDE.md                # サーバー証明書再発行・OS登録手順書
│   ├── staging-production-like-alb-frontend-design.md  # 検証環境に本番想定 ALB + Frontend を並列追加する構成検討
│   ├── staging-production-like-feasibility.md        # 本番想定テスト環境の構築可否調査レポート
│   ├── STEP8_LISTENER_RULE_VERIFICATION.md           # STEP 8-4 リスナールール確認結果
│   ├── subnet-public-private-security.md             # パブリック/プライベートサブネットの違いとセキュリティ問題点
│   └── TROUBLESHOOTING.md                            # トラブルシューティング: ログイン後502エラー
├── staging/                                           # 検証環境の手順書
│   ├── aurora-setup-guide.md                         # Aurora PostgreSQL + pgvector 構築手順（AWS CLI版）
│   ├── backfill-client-certificate.md                # 後追いクライアント証明書発行手順
│   ├── bedrock-iam-setup.md                          # IAM ロールへの Bedrock 権限付与手順
│   ├── elasticache-setup-guide.md                    # ElastiCache for Redis 構築手順（AWS CLI版）
│   ├── memo_deploy_staging_sasa.md                   # 検証環境デプロイ作業メモ
│   ├── nlb-migration-guide.md                        # NLB移行手順書
│   ├── nlb-migration-memo.md                         # NLB移行作業メモ
│   ├── server-cert-regenerate-guide.md               # サーバー証明書再生成手順書
│   ├── ssl-ssm-setup-guide.md                        # HTTPS「保護されていない通信」解消手順書
│   └── ssl-ssm-setup-memo.md                         # SSL/SSM セットアップ作業メモ
├── staging-production-like/                           # 検証環境ベースの本番想定構成（ALB・nginx なし）の手順書
│   ├── ALB_MTLS_SETUP_GUIDE.md                      # ALB mTLS 追加設定手順書（組織ID抽出）
│   ├── PLAN_ACM_SELF_SIGNED.md                      # タスク計画書: ACM証明書手順の修正（自己署名証明書対応）
│   └── prod-verification-alb-build-guide.md           # 本番検証環境構築手順書（ALB追加 / nginx無し構成検証）
└── production/                                        # 本番環境の手順書
```

---

## 各ディレクトリの用途

| ディレクトリ | 用途 |
|---|---|
| [`design/`](./design/) | VPC・サブネット設計、セキュリティグループ設計、構成図などの検討資料 |
| [`research/`](./research/) | AWSサービス調査、コスト試算、構成比較などの調査資料 |
| [`staging/`](./staging/) | 通常の検証環境のインフラ構築手順書（サブネット作成、ECS設定など） |
| [`staging-production-like/`](./staging-production-like/) | 検証環境ベースで本番構成（ALB・nginx なし）を追加した環境の手順書 |
| [`production/`](./production/) | 本番環境のインフラ構築手順書 |

---

## design/ — 構成・設計の検討資料

| ファイル | 内容 |
|---|---|
| [`alb-mtls-backend-code-changes.md`](./research/alb-mtls-backend-code-changes.md) | バックエンドコード変更の具体的内容（ALB mTLS 対応） |
| [`backend-alb-integration-design.md`](./design/backend-alb-integration-design.md) | backend ECS サービスと prod-backend-tg の接続方式 設計検討 |
| [`dual-alb-architecture-investigation.md`](./design/dual-alb-architecture-investigation.md) | 二段階ALB構成の検討結果 |
| [`production-architecture-review.md`](./design/production-architecture-review.md) | 本番環境AWSシステム構成 検討レポート（SaaS版 AWS環境の検証→本番移行検討） |
| [`subnet-az-redundancy-design.md`](./design/subnet-az-redundancy-design.md) | サブネット分離・AZ冗長構成の検討（REPORT15） |

---

## research/ — 調査資料

| ファイル | 内容 |
|---|---|
| [`acm-trust-store.md`](./research/acm-trust-store.md) | ACM Trust Store とは何か？設定方法まとめ |
| [`alb-organization-id-extraction.md`](./research/alb-organization-id-extraction.md) | ALB で organization_id 抽出を代替できるか？ |
| [`alb-target-group.md`](./research/alb-target-group.md) | ターゲットグループ（Target Group）とは |
| [`alb-vs-nlb-comparison.md`](./research/alb-vs-nlb-comparison.md) | ALB と NLB の特徴・メリット・デメリット比較 |
| [`availability-zone.md`](./research/availability-zone.md) | AZ（アベイラビリティゾーン）とは何か（REPORT12） |
| [`aws-service-placement-review.md`](./research/aws-service-placement-review.md) | AWS サービス配置に関する調査・修正レポート（REPORT14） |
| [`ecs-ecr-bedrock-access-method.md`](./research/ecs-ecr-bedrock-access-method.md) | ECSからECR/Bedrockへのアクセス方式比較（REPORT13） |
| [`ecs-nginx-frontend-separation.md`](./research/ecs-nginx-frontend-separation.md) | nginx/frontend の ECS タスク分離検討 |
| [`ecs-scaling.md`](./research/ecs-scaling.md) | ECSスケーリング調査レポート |
| [`internet-gateway.md`](./research/internet-gateway.md) | Internet Gateway 調査レポート（REPORT16） |
| [`network_concepts_qa.md`](./research/network_concepts_qa.md) | ネットワーク概念 Q&A |
| [`openssl_command_explanation.md`](./research/openssl_command_explanation.md) | openssl req コマンド解説 |
| [`route53-waf.md`](./research/route53-waf.md) | AWS Route 53 と AWS WAF について |
| [`s3_endpoint_explanation.md`](./research/s3_endpoint_explanation.md) | S3 Gateway Endpoint が必要な理由 |
| [`security_group_overview.md`](./research/security_group_overview.md) | AWSセキュリティグループの紐づけについて |
| [`staging-production-like-alb-frontend-design.md`](./research/staging-production-like-alb-frontend-design.md) | 検証環境に本番想定 ALB + Frontend を並列追加する構成検討 |
| [`ERROR_INVESTIGATION.md`](./research/ERROR_INVESTIGATION.md) | エラー調査レポート: UnsupportedCertificate |
| [`SERVER_CERT_REINSTALL_GUIDE.md`](./research/SERVER_CERT_REINSTALL_GUIDE.md) | サーバー証明書再発行・OS登録手順書 |
| [`staging-production-like-feasibility.md`](./research/staging-production-like-feasibility.md) | 本番想定テスト環境の構築可否調査レポート |
| [`STEP8_LISTENER_RULE_VERIFICATION.md`](./research/STEP8_LISTENER_RULE_VERIFICATION.md) | STEP 8-4 リスナールール確認結果 |
| [`subnet-public-private-security.md`](./research/subnet-public-private-security.md) | パブリック/プライベートサブネットの違いとセキュリティ問題点（REPORT11） |
| [`TROUBLESHOOTING.md`](./research/TROUBLESHOOTING.md) | トラブルシューティング: ログイン後502エラー |

---

## guides/staging/ — 検証環境の手順書

| ファイル | 内容 |
|---|---|
| [`aurora-setup-guide.md`](./guides/staging/aurora-setup-guide.md) | Aurora PostgreSQL + pgvector 構築手順（AWS CLI版） |
| [`backfill-client-certificate.md`](./guides/staging/backfill-client-certificate.md) | 後追いクライアント証明書発行手順 |
| [`bedrock-iam-setup.md`](./guides/staging/bedrock-iam-setup.md) | IAM ロールへの Bedrock 権限付与手順 |
| [`elasticache-setup-guide.md`](./guides/staging/elasticache-setup-guide.md) | ElastiCache for Redis 構築手順（AWS CLI版） |
| [`memo_deploy_staging_sasa.md`](./guides/staging/memo_deploy_staging_sasa.md) | 検証環境デプロイ作業メモ |
| [`nlb-migration-guide.md`](./guides/staging/nlb-migration-guide.md) | NLB移行手順書 |
| [`nlb-migration-memo.md`](./guides/staging/nlb-migration-memo.md) | NLB移行作業メモ |
| [`server-cert-regenerate-guide.md`](./guides/staging/server-cert-regenerate-guide.md) | サーバー証明書再生成手順書 |
| [`ssl-ssm-setup-guide.md`](./guides/staging/ssl-ssm-setup-guide.md) | HTTPS「保護されていない通信」解消手順書 |
| [`ssl-ssm-setup-memo.md`](./guides/staging/ssl-ssm-setup-memo.md) | SSL/SSM セットアップ作業メモ |

---

## guides/staging-production-like/ — 本番想定検証環境の手順書

| ファイル | 内容 |
|---|---|
| [`ALB_MTLS_SETUP_GUIDE.md`](./guides/staging-production-like/ALB_MTLS_SETUP_GUIDE.md) | ALB mTLS 追加設定手順書（組織ID抽出） |
| [`PLAN_ACM_SELF_SIGNED.md`](./guides/staging-production-like/PLAN_ACM_SELF_SIGNED.md) | タスク計画書: ACM証明書手順の修正（自己署名証明書対応） |
| [`prod-verification-alb-build-guide.md`](./guides/staging-production-like/prod-verification-alb-build-guide.md) | 本番検証環境構築手順書（ALB追加 / nginx無し構成検証） |

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-04-28 | 初版作成 | Cline |
| 2026-04-28 | 全ファイル一覧・説明を追加 | Cline |
| 2026-05-25 | 新規追加ファイルをREADMEに反映（design/2件・research/4件・staging-production-like/1件） | Cline |
