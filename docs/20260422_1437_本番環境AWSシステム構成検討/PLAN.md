# タスク計画書: production-architecture.drawio 更新

## メタデータ
- **作成日時**: 2026-04-27 08:44
- **タスクID**: update-production-architecture-drawio
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
`production-architecture-simple.drawio`（シンプル版）で完成した内容を、`production-architecture.drawio`（詳細版）に反映する。
詳細版は省略されていた構成情報（AZ、サブネット、IGW、ECSの両AZ冗長配置等）も記載する。

## 目的と期待される成果
- [ ] シンプル版で追加されたAZ・サブネット・IGW情報を詳細版に反映
- [ ] 詳細版の詳細情報（ALBリスナー、SG設定、ECS詳細、Aurora/Redis詳細、VPC Endpoint詳細、外部サービス、凡例）はすべて維持
- [ ] Node.jsスクリプトでファイル書き込み

## 実装ステップ
- [ ] タスク計画書作成（本ファイル）
- [ ] Node.jsスクリプト作成・実行（production-architecture.drawio更新）

## 変更ファイル
1. `docs/20260422_1437_本番環境AWSシステム構成検討/production-architecture.drawio` - シンプル版の内容を反映した詳細版に更新

## 新規作成するファイル
1. `docs/20260422_1437_本番環境AWSシステム構成検討/update-drawio.js` - 更新用Node.jsスクリプト（一時ファイル）

## 反映内容（シンプル版 → 詳細版）
| 追加項目 | 説明 |
|----------|------|
| Internet Gateway (IGW) | VPC外に追加、ユーザー→IGW→ALBのフロー |
| AZ: ap-northeast-1c | VPC内にAZコンテナを追加 |
| AZ: ap-northeast-1a | VPC内にAZコンテナを追加 |
| Public subnet (1c) | ALB用パブリックサブネット |
| Private subnet (1c) | ECS Frontend/Backend 用 |
| Public subnet (1a) | ALBノード用パブリックサブネット |
| Private subnet (1a) | ECS Frontend/Backend 用 |
| ECS Frontend (1c) | AZ-1cのprivate subnetにECS Frontendタスク |
| ECS Backend (1c) | AZ-1cのprivate subnetにECS Backendタスク |
| ECS Frontend (1a) | AZ-1aのprivate subnetにECS Frontendタスク |
| ECS Backend (1a) | AZ-1aのprivate subnetにECS Backendタスク |

## 維持する情報（詳細版固有）
- ALBのリスナー詳細（mTLS、ヘッダー付与）
- ターゲットグループ詳細
- ECSタスク詳細（SG、Circuit Breaker等）
- Aurora/Redisの詳細スペック
- VPC Endpoint詳細（ecr.api / ecr.dkr / s3 / bedrock-runtime / secretsmanager / logs）
- 外部サービス詳細（ECR / S3 / Bedrock / Secrets Manager / CloudWatch）
- 凡例（SG構成、変更点、mTLSフロー）

## 承認記録
- **計画書提示日時**: 2026-04-27 08:44
- **承認日時**: 2026-04-27 08:44
