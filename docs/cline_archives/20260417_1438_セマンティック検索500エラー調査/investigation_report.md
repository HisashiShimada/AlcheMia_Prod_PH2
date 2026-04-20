# 不具合調査レポート：トランジション検索 HTTP 500 エラー

## メタデータ
- **調査日時**: 2026-04-17 14:38
- **調査者**: Cline
- **対象環境**: 検証環境（AWS ECS Fargate / alchemia-staging）

---

## 1. 発生事象

### 発生手順
1. 実験管理者でログイン
2. プロジェクト管理タブでトランジション検索ボタンを押下
3. トランジション検索ダイアログで検索クエリを入力
4. トランジション検索ダイアログで検索実行ボタンを押下

### 現象
- "Request failed with status code 500" が表示される

### エラー詳細
- **API**: `POST http://alchemia-staging-alb-987042084.ap-northeast-1.elb.amazonaws.com/api/v1/semantic-search/search`
- **ステータスコード**: 500 Internal Server Error
- **レスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "getaddrinfo ENOTFOUND ollama"
  },
  "meta": {
    "timestamp": "2026-04-17T05:22:43.453Z"
  }
}
```

---

## 2. 調査結果

### 根本原因

**ECSタスク定義（`aws/ecs-task-definition-alchemia-backend.json`）に `EMBEDDING_PROVIDER` 環境変数が設定されておらず、バックエンドがデフォルトの `ollama` プロバイダーで動作している。ECS Fargate 環境には Ollama コンテナが存在しないため、`http://ollama:11434` へのDNS解決に失敗しHTTP 500が発生している。**

### 詳細分析

#### エラーの流れ
```
ユーザーが検索実行ボタンを押下
  → POST /api/v1/semantic-search/search
  → semanticSearchController → transitionSetEmbeddingService.generateEmbedding()
  → EMBEDDING_PROVIDER = 'ollama'（環境変数未設定のためデフォルト値が適用）
  → axios.post('http://ollama:11434/api/embeddings', ...)
  → DNS解決失敗: getaddrinfo ENOTFOUND ollama
  → HTTP 500 Internal Server Error
```

#### 問題のコード（`backend/src/services/transitionSetEmbeddingService.ts`）

```typescript
// デフォルトが 'ollama' → 環境変数未設定時は Ollama に接続しようとする
const EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER || 'ollama').toLowerCase();

// Ollamaのデフォルト接続先 → ECS環境では解決不可能なホスト名
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
```

#### ECSタスク定義の問題点（`aws/ecs-task-definition-alchemia-backend.json`）

現在の設定では Bedrock 関連の環境変数が一部設定されているが、**肝心の `EMBEDDING_PROVIDER=bedrock` が未設定**：

```json
// 現在の状態（抜粋）
{ "name": "BEDROCK_REGION",             "value": "ap-northeast-1" },
{ "name": "BEDROCK_EMBEDDING_MODEL_ID", "value": "amazon.titan-embed-text-v2:0" }
// ↑ EMBEDDING_PROVIDER が無いため ollama がデフォルトで使われてしまう
// ↑ BEDROCK_EMBEDDING_MODEL_ID も誤ったモデルID（cohere.embed-v4:0 が正しい）
```

### `.env.prod.aws.example` との関係

`.env.prod.aws.example` には `EMBEDDING_PROVIDER=bedrock` が正しく定義されているが、このファイルは **docker-compose 経由の起動時にのみ参照される**。ECS Fargate ではコンテナの環境変数はタスク定義の `environment` セクションから直接注入されるため、`.env` ファイルは一切参照されない。

```
【docker-compose（ローカル/オンプレ）】
  .env ファイル → docker-compose が読み込み → コンテナの環境変数に注入

【AWS ECS Fargate】
  ecs-task-definition-alchemia-backend.json の environment セクション
  → ECS が読み込み → コンテナの環境変数に注入
  ※ .env ファイルは一切参照されない
```

### ローカル環境で発覚しなかった理由

ローカル開発環境（`docker-compose.yml`）では `ollama` という名前でOllamaコンテナが起動しており、サービス名によるDNS解決が可能。ECS 環境への移行時に `EMBEDDING_PROVIDER=bedrock` をタスク定義に追加することを失念した。

---

## 3. 影響範囲

| 機能 | 影響 |
|------|------|
| トランジション検索（セマンティック検索） | **完全停止**（HTTP 500） |
| トランジションセットのインデックス登録 | Embedding生成が必要なため同様に停止 |
| バッチインデックス処理 | 同上 |
| その他の機能 | 影響なし |

---

## 4. 必要な修正

`aws/ecs-task-definition-alchemia-backend.json` の `environment` セクションに以下を追加・変更する：

| # | 項目 | 現在の値 | 修正後の値 | 種別 |
|---|------|---------|-----------|------|
| 1 | `EMBEDDING_PROVIDER` | 未設定 | `bedrock` | 追加 |
| 2 | `BEDROCK_EMBEDDING_MODEL_ID` | `amazon.titan-embed-text-v2:0` | `cohere.embed-v4:0` | 変更 |
| 3 | `BEDROCK_EMBEDDING_OUTPUT_DIMENSION` | 未設定 | `1024` | 追加 |

---

## 5. 関連ファイル

| ファイル | 内容 |
|---------|------|
| `backend/src/services/transitionSetEmbeddingService.ts` | Embeddingサービス（EMBEDDING_PROVIDER の切り替えロジック） |
| `aws/ecs-task-definition-alchemia-backend.json` | ECSタスク定義（修正対象） |
| `.env.prod.aws.example` | AWS環境用環境変数テンプレート（参考） |
| `backend/src/controllers/semanticSearchController.ts` | セマンティック検索コントローラー |
