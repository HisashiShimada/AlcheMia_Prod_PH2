# タスク計画書: ECSタスク定義 Embedding環境変数修正

## メタデータ
- **作成日時**: 2026-04-17 14:40
- **タスクID**: fix-ecs-embedding-provider
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

検証環境（AWS ECS Fargate）でトランジション検索を実行すると HTTP 500 エラーが発生する。原因はECSタスク定義に `EMBEDDING_PROVIDER` 環境変数が未設定のため、バックエンドがデフォルトの `ollama` プロバイダーで動作し、存在しない `ollama` ホストへの接続を試みていること。ECSタスク定義を修正して AWS Bedrock を使用するよう設定する。

## 目的と期待される成果

### 目的
ECSタスク定義の環境変数を正しく設定し、検証環境のトランジション検索機能を正常に動作させる。

### 期待される成果
- [ ] トランジション検索ダイアログで検索実行しても HTTP 500 エラーが発生しなくなる
- [ ] Embedding生成が AWS Bedrock（cohere.embed-v4:0）経由で正常に行われる

## 実装ステップ

### Phase 1: ECSタスク定義の修正
- [ ] `aws/ecs-task-definition-alchemia-backend.json` の `environment` セクションを修正
  - `EMBEDDING_PROVIDER` を `bedrock` で追加
  - `BEDROCK_EMBEDDING_MODEL_ID` を `cohere.embed-v4:0` に変更
  - `BEDROCK_EMBEDDING_OUTPUT_DIMENSION` を `1024` で追加

### Phase 2: ECSへのデプロイ
- [ ] `./scripts/deploy.ecr.sh --no-build --no-push` を実行してタスク定義を再登録・サービス更新

## 変更ファイル

1. `aws/ecs-task-definition-alchemia-backend.json` - 環境変数3件を追加・変更

## 修正内容詳細

| # | 項目 | 現在の値 | 修正後の値 | 種別 |
|---|------|---------|-----------|------|
| 1 | `EMBEDDING_PROVIDER` | 未設定（デフォルト `ollama`） | `bedrock` | 追加 |
| 2 | `BEDROCK_EMBEDDING_MODEL_ID` | `amazon.titan-embed-text-v2:0` | `cohere.embed-v4:0` | 変更 |
| 3 | `BEDROCK_EMBEDDING_OUTPUT_DIMENSION` | 未設定（デフォルト `1024`） | `1024` | 追加 |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ECS Task Role に Bedrock の権限が付与されていない | 高 | 低 | デプロイ後に動作確認し、権限エラーが出た場合は IAM ロール `ecsTaskRole` に `bedrock:InvokeModel` 権限を追加する |
| cohere.embed-v4:0 が ap-northeast-1 で未有効化 | 高 | 低 | デプロイ後に動作確認し、エラーが出た場合は AWS コンソールで Bedrock モデルアクセスを有効化する |

## テスト計画

### 手動テスト
- [ ] デプロイ後、実験管理者でログインし、トランジション検索ダイアログで検索を実行
- [ ] HTTP 500 が発生しないことを確認
- [ ] 検索結果が正常に返却されることを確認

## 承認記録
- **計画書提示日時**: 2026-04-17 14:40
- **承認日時**: 2026-04-17 14:41
- **承認者コメント**: 承認します。修正を実施してください。

## 実施記録

### 実施日時
開始: 2026-04-17 14:41
完了: 2026-04-17 14:41

### 変更内容
`aws/ecs-task-definition-alchemia-backend.json` の `environment` セクションを以下のとおり修正：
- `EMBEDDING_PROVIDER=bedrock` を追加
- `BEDROCK_EMBEDDING_MODEL_ID` を `amazon.titan-embed-text-v2:0` → `cohere.embed-v4:0` に変更
- `BEDROCK_EMBEDDING_OUTPUT_DIMENSION=1024` を追加

### 最終的な成果物
- [x] `aws/ecs-task-definition-alchemia-backend.json` の修正完了

### 次のアクション
以下のコマンドでタスク定義を再登録してECSサービスを更新してください：
```bash
./scripts/deploy.ecr.sh --no-build --no-push
```
