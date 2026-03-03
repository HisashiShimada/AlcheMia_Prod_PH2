# タスク計画書: セマンティック検索機能取込

## メタデータ
- **作成日時**: 2026-02-26 09:43
- **タスクID**: semantic-search-import
- **優先度**: 高
- **参照元**: `semantic_search/specification/required_additions_for_mmdpf.md`

## タスク概要

Reference版（`semantic_search/`フォルダ）のセマンティック検索機能（トランジション検索）を  
現プロジェクト（mmdpf）に取り込む。

**スコープ（今回の取込範囲）:**
- ✅ DBマイグレーション（transition_set テーブル・HNSWインデックス）
- ✅ バックエンドソース（サービス・リポジトリ・コントローラー・ルート）
- ✅ フロントエンドソース（サービス・フック・UIコンポーネント）
- ❌ Ollamaのdocker設定（今回は対象外）
- ❌ gpt-oss-20b の docker設定（今回は対象外）

---

## 目的と期待される成果

### 目的
MAIMLファイルの実験手順・入出力をベクトル化し、自然言語クエリで類似実験を検索できる  
セマンティック検索機能を現プロジェクトに追加する。

### 期待される成果
- [ ] `transition_set` テーブルがDBに作成される
- [ ] バックエンドに検索API（`/api/v1/transition-set/`）が追加される
- [ ] フロントエンドの ProjectManagement 画面に検索ボタンが追加される
- [ ] バッチ処理タブからEmbedding生成・DB保存が実行できる
- [ ] ファイルアップロード・MAIML保存時に自動でEmbedding生成がトリガーされる

---

## 実装ステップ

### Phase 1: DBマイグレーション

- [ ] **pgvector拡張の有効化**
  - `CREATE EXTENSION IF NOT EXISTS vector;` をDBに実行
  - 参照: `semantic_search/database/migrations/` の先頭コメント

- [ ] **transition_set テーブル作成**
  - `backend/migrations/20260226_create_transition_set_table.sql` を作成
  - 流用元: `semantic_search/database/migrations/053_create_maiml_transition_set_table.sql`
  - **現プロジェクト固有の追加カラム**: `organization_id`（NOT NULL）、`project_name`（NULL許容）

- [ ] **HNSWインデックス作成**
  - `backend/migrations/20260226_create_transition_set_hnsw_indexes.sql` を作成
  - 流用元: `semantic_search/database/migrations/054_create_maiml_transition_set_hnsw_indexes.sql`

- [ ] **techniqueカラム追加**
  - `backend/migrations/20260226_add_technique_to_transition_set.sql` を作成
  - 流用元: `semantic_search/database/migrations/055_add_technique_to_transition_set.sql`

### Phase 2: 型定義を先行して全作成

> **方針**: JS→TS変換で取りこぼしが起きないよう、バックエンド・フロントエンドの全型定義を先行して作成し、  
> 以降のPhaseではここで定義した型を import して実装する。

- [ ] **バックエンド型定義ファイル作成**
  - `backend/src/types/transitionSet.ts` を新規作成
  - 対象型（Reference版の各jsファイルで使われているデータ構造を網羅）:
    - `TransitionSet` — DBテーブル型
    - `TransitionSetInsertData` — UPSERT用
    - `TransitionSetSearchParams` — 検索パラメータ（weights・topK・limit・minScore等）
    - `SearchWeights` — 4軸重みオブジェクト
    - `TransitionSetSearchResult` — 検索結果1件（スコア付き）
    - `DecomposedQuery` — 4軸分解クエリ（q_in/q_tr/q_out/q_struct/confidence）
    - `EmbeddingVector` — 768次元ベクトル型
    - `BatchJobStatus` — バッチジョブ状態
    - `BatchJobRecord` — バッチジョブDB型
    - `BatchProcessingOptions` — バッチ処理オプション（forceReprocess・maxFiles）
    - `BatchProcessingStats` — バッチ統計情報
    - `IngestResult` — 単一ファイル投入結果
    - `TransitionSetGeneratorResult` — 4軸テキスト生成結果

- [ ] **フロントエンド型定義ファイル作成**
  - `frontend/src/types/transitionSet.ts` を新規作成
  - 対象型:
    - `TransitionSetSearchParams` — 検索パラメータ
    - `SearchWeights` — 4軸重み
    - `WeightPreset` — 重みプリセット（名称・weights）
    - `TransitionSetSearchResult` — 検索結果1件（スコア・4軸スコア内訳・ファイル情報・プロジェクト情報）
    - `GroupedSearchResult` — ファイル単位にグループ化した結果
    - `BatchJob` — バッチジョブ情報
    - `BatchStats` — バッチ統計
    - `SearchHistoryItem` — 検索履歴1件
    - `ServiceHealth` — ヘルスチェック結果
    - `ServiceInfo` — サービス情報

### Phase 3: バックエンド リポジトリ・SQLクエリ

- [ ] **SQL クエリファイル作成**
  - `backend/src/sql/queries/transition_set/` ディレクトリを新規作成
  - `upsert.sql`・`vectorSearchInput.sql`・`vectorSearchTransition.sql`・`vectorSearchOutput.sql`・`vectorSearchStructure.sql`・`findByIds.sql`・`findByFileId.sql` を作成

- [ ] **リポジトリ作成**
  - `backend/src/repositories/transitionSetRepository.ts` を新規作成
  - Phase 2 の型定義を import して UPSERT・ベクトル検索・一覧取得メソッドを実装

### Phase 4: バックエンドサービス（流用・TS変換）

> **方針**: Phase 2 で作成済みの型定義を import してから実装する。

- [ ] **Embeddingサービス**
  - `backend/src/services/transitionSetEmbeddingService.ts` を作成
  - 流用元: `semantic_search/backend/services/maimlDatalake/transitionSetEmbedding.service.js`
  - 変更点: TypeScript変換（Phase 2の型使用）・`OLLAMA_HOST` 環境変数を使用

- [ ] **クエリ分解サービス**
  - `backend/src/services/transitionSetQueryDecomposerService.ts` を作成
  - 流用元: `semantic_search/backend/services/maimlDatalake/transitionSetQueryDecomposer.service.js`
  - 変更点: TypeScript変換（Phase 2の型使用）・`GPT_OSS_HOST` 環境変数を使用（未接続の場合はフォールバック動作）

- [ ] **トランジションセット生成サービス（新規作成）**
  - `backend/src/services/transitionSetGeneratorService.ts` を新規作成
  - MAIMLファイルのXMLを解析し、4軸テキスト（input/transition/output/structure）を生成するロジック
  - 参考: `semantic_search/backend/services/maimlDatalake/transitionSetGenerator.service.js`（流用不可・参考のみ）
  - 戻り値: `TransitionSetGeneratorResult[]`（Phase 2で定義）

- [ ] **単一ファイル投入サービス**
  - `backend/src/services/singleFileIngestService.ts` を作成
  - 処理フロー: Swiftからダウンロード → XML解析 → 4軸テキスト生成 → Embedding生成 → DB保存
  - 変更点: S3ダウンロード部分を既存の `storageService.ts` を使ったSwift対応に変更

- [ ] **デコーダーサービス**
  - `backend/src/services/transitionSetDecoderService.ts` を作成
  - 流用元: `semantic_search/backend/services/maimlDatalake/transitionSetDecoder.service.js`
  - 変更点: TypeScript変換（Phase 2の型使用）

- [ ] **ベクトル検索サービス**
  - `backend/src/services/transitionSetVectorSearchService.ts` を作成
  - 流用元: `semantic_search/backend/services/maimlDatalake/transitionSetVectorSearch.service.js`
  - 変更点: TypeScript変換（Phase 2の型使用）・`organization_id` でのフィルタリング追加

- [ ] **バッチ処理サービス**
  - `backend/src/services/transitionSetBatchProcessingService.ts` を作成
  - 流用元: `semantic_search/backend/services/maimlDatalake/transitionSetBatchProcessing.service.js`
  - 変更点: TypeScript変換（Phase 2の型使用）・S3スキャン部分をSwift（`storageService.ts`）対応に変更

### Phase 5: バックエンドAPI

- [ ] **コントローラー作成**
  - `backend/src/controllers/transitionSetSearchController.ts` を作成
  - 流用元: `semantic_search/backend/controllers/maimlDatalake/transitionSetSearchController.js`
  - 変更点: TypeScript変換・既存の `authMiddleware` を適用

- [ ] **ルート作成**
  - `backend/src/routes/transitionSetSearchRoutes.ts` を作成
  - 流用元: `semantic_search/backend/routes/transitionSetSearch.js`
  - 変更点: TypeScript変換・`authMiddleware` を import して適用

- [ ] **server.ts へのルート登録追加**
  - `backend/src/server.ts` に `transitionSetSearchRoutes` を追加

### Phase 6: 既存コントローラーへのトリガー追加

- [ ] **ファイルアップロード後のトリガー追加**
  - `backend/src/controllers/fileAccessController.ts` の `uploadFiles()` に追加
  - 処理: Swift保存完了後に `singleFileIngestService.processFileAsync()` を fire-and-forget で呼び出す

- [ ] **MAIML保存後のトリガー追加**
  - `backend/src/controllers/maimlController.ts` の save系メソッドに追加
  - 処理: ファイル保存完了後に `singleFileIngestService.processFileAsync()` を fire-and-forget で呼び出す

### Phase 7: フロントエンド実装

> **方針**: Phase 2 で作成済みのフロントエンド型定義を import してから実装する。

- [ ] **APIクライアントサービス作成**
  - `frontend/src/services/transitionSetSearchService.ts` を作成
  - 流用元: `semantic_search/frontend/src/services/transitionSetSearchService.js`
  - 変更点: TypeScript変換（Phase 2の型使用）・認証方式をCookieベースに変更（Bearer→Cookie）

- [ ] **カスタムフック作成**
  - `frontend/src/hooks/useTransitionSetSearch.ts` を作成
  - 流用元: `semantic_search/frontend/src/hooks/useTransitionSetSearch.js`
  - 変更点: TypeScript変換（Phase 2の型使用）

- [ ] **UIコンポーネント作成**
  - `frontend/src/components/TransitionSetSearch/WeightSliders.tsx` を作成
  - `frontend/src/components/TransitionSetSearch/SearchResults.tsx` を作成（`project_name` 表示・「プロジェクトを開く」ボタンを追加）
  - `frontend/src/components/TransitionSetSearch/TransitionSetBatchProcessingPanel.tsx` を作成
  - `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx` を作成（上記3コンポーネントを組み込む）
  - 変更点: 全コンポーネントをTypeScript変換（Phase 2の型使用）・Ant Design v6対応に書き直し

- [ ] **ProjectManagement 画面への検索ボタン追加**
  - ProjectManagement 画面に `TransitionSetSearchModal` を呼び出すボタンを追加

---

## 変更ファイル

### 新規作成
1. `backend/migrations/20260226_create_transition_set_table.sql`
2. `backend/migrations/20260226_create_transition_set_hnsw_indexes.sql`
3. `backend/migrations/20260226_add_technique_to_transition_set.sql`
4. `backend/src/types/transitionSet.ts`
5. `backend/src/repositories/transitionSetRepository.ts`
6. `backend/src/sql/queries/transition_set/upsert.sql`
7. `backend/src/sql/queries/transition_set/vectorSearchInput.sql`
8. `backend/src/sql/queries/transition_set/vectorSearchTransition.sql`
9. `backend/src/sql/queries/transition_set/vectorSearchOutput.sql`
10. `backend/src/sql/queries/transition_set/vectorSearchStructure.sql`
11. `backend/src/sql/queries/transition_set/findByIds.sql`
12. `backend/src/sql/queries/transition_set/findByFileId.sql`
13. `backend/src/services/transitionSetEmbeddingService.ts`
14. `backend/src/services/transitionSetQueryDecomposerService.ts`
15. `backend/src/services/transitionSetGeneratorService.ts`（新規・流用不可）
16. `backend/src/services/singleFileIngestService.ts`
17. `backend/src/services/transitionSetDecoderService.ts`
18. `backend/src/services/transitionSetVectorSearchService.ts`
19. `backend/src/services/transitionSetBatchProcessingService.ts`
20. `backend/src/controllers/transitionSetSearchController.ts`
21. `backend/src/routes/transitionSetSearchRoutes.ts`
22. `frontend/src/types/transitionSet.ts`
23. `frontend/src/services/transitionSetSearchService.ts`
24. `frontend/src/hooks/useTransitionSetSearch.ts`
25. `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx`
26. `frontend/src/components/TransitionSetSearch/SearchResults.tsx`
27. `frontend/src/components/TransitionSetSearch/WeightSliders.tsx`
28. `frontend/src/components/TransitionSetSearch/TransitionSetBatchProcessingPanel.tsx`

### 修正
1. `backend/src/server.ts` — ルート登録追加
2. `backend/src/controllers/fileAccessController.ts` — アップロード後トリガー追加
3. `backend/src/controllers/maimlController.ts` — MAIML保存後トリガー追加
4. ProjectManagement 画面コンポーネント — 検索ボタン追加

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Ollamaが未起動の場合にEmbedding生成が失敗する | 高 | バックグラウンド処理で失敗してもファイル保存は成功させる（fire-and-forget） |
| pgvector拡張が既存DBに入っていない | 高 | マイグレーション実行前に拡張の有効化SQLを先に実行する |
| Reference版JSのロジックがTypeScript型に合わない | 中 | 変換時にany型で仮置きし、後から型を締める |
| `transitionSetGeneratorService.ts` のMAIML解析ロジック | 高 | Reference版の `transitionSetGenerator.service.js` を参考に現プロジェクトのMAIML構造に合わせて実装する |
| Swift/S3パスから `project_name` が取れないケース | 低 | **対象箇所**: `singleFileIngestService.ts` および `transitionSetBatchProcessingService.ts` でEmbedding保存時に `project_name` を `transition_set` テーブルに格納する処理。ファイルパス（`{org_id}/projects/{project_name}/...`）を正規表現で分解して `project_name` を抽出する。このパス形式に合わないファイル（formatsフォルダ等）はNULLとして保存する |

---

## 承認記録
- **計画書提示日時**: 2026-02-26 09:43
- **承認日時**: 2026-02-26 09:59
- **承認者コメント**: 承認。実装は新しいセッションで開始する。
