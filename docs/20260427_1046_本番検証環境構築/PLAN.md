# タスク計画書: 本番検証環境構築（ALB追加 / nginx無し構成検証）

## メタデータ
- **作成日時**: 2026-04-27 10:51
- **タスクID**: 本番検証環境構築
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

検証環境（alchemia-staging）に対し、`production-verification-architecture.drawio` に定義された本番検証用の構成を追加構築する。  
具体的には「nginx無し・ALBによるSSL終端・frontend独立サービス」構成を、既存環境を一切変更せず **新規リソースとして並行稼働させる**。

## 目的と期待される成果

### 目的
- 本番環境への移行前に、ALB + 独立frontend ECS 構成の動作を検証環境で確認する
- mTLS なしの通常HTTPS（ACM証明書）でのアクセスを検証する
- frontend と backend のパスベースルーティングが正しく機能することを確認する

### 期待される成果
- [ ] 新規ALB（HTTPS/443）経由でフロントエンドにアクセスできる
- [ ] `/api/*` が backend ECS に正しくルーティングされる
- [ ] `/*` が新規 frontend ECS に正しくルーティングされる
- [ ] HTTP/80 → HTTPS/443 リダイレクトが機能する
- [ ] VPC Endpoints 経由で ECR・CloudWatch Logs にアクセスできる

## 実装ステップ

- [ ] STEP 1: ACM 証明書の発行
- [ ] STEP 2: アプリ層プライベートサブネットの作成（1a / 1c）
- [ ] STEP 3: セキュリティグループの作成・変更
- [ ] STEP 4: VPC Endpoints の作成（S3 Gateway / ECR API / ECR DKR / Logs）
- [ ] STEP 5: ルートテーブルの設定
- [ ] STEP 6: 新規 ALB の作成
- [ ] STEP 7: ALB ターゲットグループの作成（frontend-tg / backend-tg）
- [ ] STEP 8: ALB リスナーの設定
- [ ] STEP 9: ECS タスク定義の登録（prod-frontend）
- [ ] STEP 10: ECS サービスの作成（prod-frontend-service）
- [ ] STEP 11: 動作確認

## 変更ファイル

### 新規作成
1. `docs/20260427_1046_本番検証環境構築/PLAN.md` - 本ファイル
2. `docs/20260427_1046_本番検証環境構築/BUILD_GUIDE.md` - 構築手順書
3. `aws/ecs-task-definition-prod-frontend.json` - 新規 frontend ECS タスク定義

### 既存リソースの変更
1. `sg-0920f1a670e75b444 (backend-sg)` - TCP/3001 ← prod-alb-sg のインバウンドルール追加

## 影響を受ける既存環境

| リソース | 変更有無 | 備考 |
|---------|---------|------|
| NLB | **変更なし** | 既存のまま |
| 既存ALB (HTTP/80) | **変更なし** | 既存のまま |
| alchemia-nginx-service | **変更なし** | 既存のまま |
| alchemia-backend-service | **SG変更のみ** | prod-alb-sg からの TCP/3001 を追加許可 |
| Aurora / Redis | **変更なし** | 既存のまま |

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| backend-sg 変更による既存通信への影響 | 低 | 低 | インバウンドルールの追加のみ（削除なし） |
| VPC Endpoint 設定漏れによる ECR 取得失敗 | 高 | 中 | STEP 4 のチェックリストで全 Endpoint を確認 |
| ACM 証明書の DNS 検証遅延 | 中 | 中 | 先行して発行し、検証完了を待ってから ALB 作成 |
| frontend-tg / backend-tg ヘルスチェック失敗 | 高 | 中 | ヘルスチェックパスを正しく設定（/ と /api/health） |

## 承認記録
- **計画書提示日時**: 2026-04-27 10:51
- **承認日時**: 2026-04-27 10:51
- **承認者コメント**: VPC Endpoints 使用、NAT Gateway 不要に変更
