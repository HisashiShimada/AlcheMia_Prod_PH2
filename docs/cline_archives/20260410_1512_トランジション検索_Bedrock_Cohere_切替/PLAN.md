# タスク計画書: トランジション検索 Embedding モデル切替（Bedrock/Cohere + Ollama/Gemma）

## メタデータ
- **作成日時**: 2026-04-10 15:13
- **タスクID**: transition-search-bedrock-cohere
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

トランジション検索（セマンティック検索）のEmbeddingモデルを、環境に応じて切り替える。

| 環境 | 現状 | 変更後 |
|---|---|---|
| **SaaS（AWS）** | Ollama + embeddinggemma（768次元）| AWS Bedrock + `cohere.embed-v4:0`（1024次元） |
| **オンプレ** | Ollama + embeddinggemma（768次元）| 変更なし（768次元維持） |

---

## 2. 目的と期待される成果

### 目的
- SaaS環境でAWS Bedrockの高精度Embeddingモデル（Cohere Embed v4）を使用する
- オンプレ環境はネットワーク分離を考慮し、Ollama + embeddinggemmaをそのまま維持
- 環境変数 `EMBEDDING_PROVIDER` の値（`bedrock` / `ollama`）で動作を切り替える

### 期待される成果
- [ ] `EMBEDDING_PROVIDER=bedrock` のとき Bedrock（Cohere Embed v4）でembedding生成
- [ ] `EMBEDDING_PROVIDER=ollama`（または未設定）のとき Ollama（embeddinggemma）でembedding生成
- [ ] SaaS側DBのベクトルカラムが `VECTOR(1024)` になる
- [ ] オンプレ側DBのベクトルカラムは `VECTOR(768)` のまま変更なし
- [ ] ヘルスチェックが環境に応じた正しいエンドポイントを確認する
- [ ] embedding_model_version が環境に応じた値で記録される

---

## 3. 実装ステップ

### Phase 1: バックエンドパッケージ追加
- [ ] `@aws-sdk/client-bedrock-runtime` を `backend/package.json` に追加

### Phase 2: Embeddingサービスのリファクタリング

`backend/src/services/transitionSetEmbeddingService.ts` を大幅改修する。

- [ ] `EMBEDDING_PROVIDER` 環境変数の読み取りロジックを追加
- [ ] Bedrock用のembedding生成関数 `generateEmbeddingBedrock()` を実装
  - `@aws-sdk/client-bedrock-runtime` の `BedrockRuntimeClient` と `InvokeModelCommand` を使用
  - `cohere.embed-v4:0` の APIリクエスト形式に合わせてリクエストボディを構築
  - `output_dimension: 1024` を固定で指定
  - レスポンスから `embeddings[0]` を取得
- [ ] Ollama用のembedding生成関数 `generateEmbeddingOllama()` を既存実装から分離・改名
- [ ] `generateEmbedding()` を `EMBEDDING_PROVIDER` に応じてどちらかを呼ぶファサードに変更
- [ ] `EXPECTED_DIMENSION` を `EMBEDDING_PROVIDER` に応じて 768 / 1024 に動的切り替え
- [ ] `healthCheck()` を provider に応じてヘルスチェック対象を切り替え
- [ ] `getServiceInfo()` に `provider` 情報を追加

### Phase 3: embedding_model_version の更新

`backend/src/services/transitionSetGeneratorService.ts` を修正する。

- [ ] `EMBEDDING_MODEL_VERSION` 定数を環境変数から動的に決定するよう変更
  - `EMBEDDING_PROVIDER=bedrock` → `'cohere-embed-v4-1024d-v1'`
  - `EMBEDDING_PROVIDER=ollama` → `'embeddinggemma-768d-v1'`（現状維持）

### Phase 4: ヘルスチェックAPIの修正

`backend/src/controllers/semanticSearchController.ts` を修正する。

- [ ] `health` エンドポイントの `ollama` キーを `embeddingService` に変更
- [ ] provider情報をレスポンスに含める

### Phase 5: 環境変数テンプレートの更新

- [ ] `.env.prod.aws.example` に `EMBEDDING_PROVIDER=bedrock` を追加
- [ ] `.env.prod.aws.example` の `BEDROCK_EMBEDDING_MODEL_ID` を `cohere.embed-v4:0` に変更
- [ ] `.env.prod.aws.example` に `BEDROCK_EMBEDDING_OUTPUT_DIMENSION=1024` を追加
- [ ] `.env.prod.onprem.example` に `EMBEDDING_PROVIDER=ollama` を追加（明示化）

### Phase 6: DBマイグレーション（SaaS用）

- [ ] SaaS用のマイグレーションSQLファイルを `backend/migrations/` に作成
  - ファイル名: `20260410_alter_transition_set_vector_1024.sql`
  - ベクトルカラム4本（emb_input, emb_transition, emb_output, emb_structure）を `VECTOR(768)` → `VECTOR(1024)` に変更
  - 既存データの削除（次元数変更はカラム再作成が必要）
  - HNSWインデックスの再作成

### Phase 7: DDLファイルの更新（SaaS環境用コメント追加）

- [ ] `docs/design/db/ddl/transition_set.sql` にSaaS/オンプレ環境での次元数の注記を追加
  - ※ DDLはオンプレ用（768次元）を基準とし、SaaS用は別途マイグレーションで対応する旨を記載

---

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/transitionSetEmbeddingService.ts` - Bedrock対応・provider切替の主要改修
2. `backend/src/services/transitionSetGeneratorService.ts` - `EMBEDDING_MODEL_VERSION` を動的化
3. `backend/src/controllers/semanticSearchController.ts` - ヘルスチェックレスポンスの修正
4. `.env.prod.aws.example` - Bedrock/Cohere設定の追加・変更
5. `.env.prod.onprem.example` - `EMBEDDING_PROVIDER=ollama` の明示追加

### 新規作成するファイル
1. `backend/migrations/20260410_alter_transition_set_vector_1024.sql` - SaaS用DBマイグレーション

### 変更しないファイル
- `backend/src/repositories/semanticSearchRepository.ts` - 変更不要（SQLは動的にベクトルを扱う）
- `backend/src/services/singleFileIngestService.ts` - 変更不要（embeddingServiceの呼び出しのみ）
- `backend/src/services/batchIngestService.ts` - 変更不要
- `docs/design/db/ddl/transition_set.sql` - オンプレ用DDLのため変更不要（注記追加のみ）

### 影響を受ける機能
- セマンティック検索（トランジション検索）全般
- MAIMLファイル保存時のembedding自動生成（`ingestSingleFileAsync`）
- バッチインデックス更新
- `/api/v1/semantic-search/health` エンドポイント

---

## 5. 技術的詳細

### 5.1 Cohere Embed v4 の Bedrock API 呼び出し仕様

```typescript
// リクエスト形式
const requestBody = {
  texts: [text],
  input_type: 'search_document',  // インデックス登録時
  // input_type: 'search_query',  // 検索クエリ時
  output_dimension: 1024,
  embedding_types: ['float'],
};

// BedrockRuntimeClient 設定
const client = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const command = new InvokeModelCommand({
  modelId: 'cohere.embed-v4:0',
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify(requestBody),
});
const response = await client.send(command);
const result = JSON.parse(Buffer.from(response.body).toString('utf-8'));
const embedding: number[] = result.embeddings[0];
```

### 5.2 EMBEDDING_PROVIDER による切り替えロジック

```typescript
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'ollama';
const EXPECTED_DIMENSION = EMBEDDING_PROVIDER === 'bedrock' ? 1024 : 768;
```

### 5.3 DBマイグレーション（SaaS用）の考慮事項

- pgvector では `ALTER COLUMN ... TYPE VECTOR(1024)` が可能（PostgreSQL 14以降）
- ただし **既存の768次元データは1024次元カラムに入れられないため、既存データを削除する**
- 削除後にインデックスを再作成する
- オンプレ環境には適用しないこと

### 5.4 input_type の使い分け（Cohere Embed v4）

Cohere Embed では検索精度向上のために `input_type` を使い分けることが推奨される：

| 用途 | input_type |
|---|---|
| インデックス登録（MAIMLからベクトル生成） | `search_document` |
| 検索クエリのベクトル生成 | `search_query` |

→ `generateEmbedding()` に `inputType` オプション引数を追加して対応する。

---

## 6. 新規環境変数一覧

### SaaS（.env.prod.aws.example）に追加・変更

| 変数名 | 値 | 説明 |
|---|---|---|
| `EMBEDDING_PROVIDER` | `bedrock` | Embeddingプロバイダー（`bedrock` / `ollama`） |
| `BEDROCK_EMBEDDING_MODEL_ID` | `cohere.embed-v4:0` | （既存、値変更） |
| `BEDROCK_EMBEDDING_OUTPUT_DIMENSION` | `1024` | Cohereの出力次元数 |

### オンプレ（.env.prod.onprem.example）に追加

| 変数名 | 値 | 説明 |
|---|---|---|
| `EMBEDDING_PROVIDER` | `ollama` | Embeddingプロバイダー（明示化） |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| SaaS DBのデータ削除（次元数変更時） | 高 | 高（必ず発生） | マイグレーション前にバックアップ取得・再インデックス時間を確保 |
| Bedrock IAMロール権限不足 | 高 | 中 | `bedrock-iam-setup.md` に `cohere.embed-v4:0` の権限追加を確認 |
| Cohere Embed v4 のAPI応答遅延 | 中 | 低 | タイムアウト60秒を維持、必要に応じて調整 |
| `input_type` 指定漏れによる検索精度低下 | 中 | 低 | `search_document` / `search_query` を明確に使い分け実装 |
| オンプレ側へ誤適用 | 高 | 低 | `EMBEDDING_PROVIDER` のデフォルトを `ollama` にする |

---

## 8. テスト計画

### ユニットテスト
- [ ] `EMBEDDING_PROVIDER=bedrock` のとき `generateEmbeddingBedrock` が呼ばれること
- [ ] `EMBEDDING_PROVIDER=ollama` のとき `generateEmbeddingOllama` が呼ばれること
- [ ] Bedrockレスポンスから1024次元ベクトルが正しく抽出されること
- [ ] `validateVector` が1024次元を正しく検証すること

### 統合テスト（手動）
- [ ] SaaS環境: `POST /api/v1/semantic-search/index` でembedding生成が成功すること
- [ ] SaaS環境: `POST /api/v1/semantic-search/search` で検索結果が返ること
- [ ] SaaS環境: `GET /api/v1/semantic-search/health` で `embeddingService: ok` が返ること
- [ ] オンプレ環境: 既存動作が変わらないこと

---

## 9. 承認記録
- **計画書提示日時**: 2026-04-10 15:13
- **承認日時**: 2026-04-10 16:08
- **承認者コメント**: 解釈Bで実施（SaaS=Bedrock/Cohere、オンプレ=Ollama/Gemma）

## 10. 実施記録

### 実施日時
開始: 2026-04-10 16:08
完了: 2026-04-10 16:13

### 変更ファイル一覧
- [x] `backend/src/services/transitionSetEmbeddingService.ts` - Bedrock/Ollama切替ロジック実装
- [x] `backend/src/services/transitionSetGeneratorService.ts` - EMBEDDING_MODEL_VERSION 動的化
- [x] `backend/src/controllers/semanticSearchController.ts` - ヘルスチェックレスポンス修正
- [x] `.env.prod.aws.example` - EMBEDDING_PROVIDER=bedrock, cohere.embed-v4:0, 次元数追加
- [x] `.env.prod.onprem.example` - EMBEDDING_PROVIDER=ollama 明示化
- [x] `backend/migrations/20260410_alter_transition_set_vector_1024.sql` - SaaS用DBマイグレーション（新規作成）
- [x] `docs/design/db/ddl/transition_set.sql` - 環境別次元数の注記追加

### 最終的な成果物
- [x] `EMBEDDING_PROVIDER=bedrock` のとき Bedrock（Cohere Embed v4）でembedding生成
- [x] `EMBEDDING_PROVIDER=ollama`（または未設定）のとき Ollama（embeddinggemma）でembedding生成
- [x] SaaS側DBのベクトルカラムを `VECTOR(1024)` に変更するマイグレーション準備
- [x] オンプレ側DBのベクトルカラムは `VECTOR(768)` のまま変更なし
- [x] ヘルスチェックが環境に応じた正しいエンドポイントを確認する
- [x] embedding_model_version が環境に応じた値で記録される
