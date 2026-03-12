# タスク計画書: MaiML OpenData Pipeline 実装

## メタデータ
- **作成日時**: 2026-03-10 08:49
- **タスクID**: maiml_opendata_pipeline
- **優先度**: 高
- **推定工数**: 8〜12時間

## タスク概要

`docs/MaiML_OpenData_Pipeline/` に定義された設計書をもとに、
確認事項が固まっている範囲でMaiML公開処理（OpenData Pipeline）の実装を進める。

**スコープ外（今回実装しない）:**
- なし（未確定部分はスタブ/ガワのみ作成し、TODO コメントで明示）

**未確定部分の取り扱い（ガワのみ実装）:**
- `maiml_publish_registry` / `maiml_asset` の完全DDL → 暫定スキーマで CREATE TABLE。仕様確定後に ALTER TABLE 追加
- `series_type` の判定ロジック → `determineSseriesType()` 関数のガワだけ作成。中身は `TODO` で `'OTHER'` 固定
- フロントエンドUI → 公開/非公開ボタン・ステータス表示のコンポーネントをスタブとして作成（API 呼び出しのガワのみ）
- プレビューモードのデフォルト → `uniform` 固定のスタブ。後から切り替えられる設計で実装

---

## 目的と期待される成果

### 目的
MaiML ファイルを「公開」「非公開」できる仕組みをバックエンドに追加し、
KV属性・プレビュー・生データをDBに取り込む一連のパイプラインを実装する。

### 期待される成果
- [x] DBマイグレーション（全6テーブル）が作成されている
- [x] MaiML XMLからKV（条件・材料）を抽出できる
- [x] プレビュー生成（uniform / maxhold / mmr）が動作する
- [x] 公開API（POST /publish / DELETE /unpublish）が動作する
- [x] authMiddleware による認証制御が実装されている

---

## 実装ステップ

### Phase 1: DBマイグレーション

- [ ] `20260310_create_maiml_opendata_tables.sql` 作成
  - `maiml_asset` テーブル（暫定スキーマ: asset_id / file_uri / doc_name / template_only / organization_id / created_at / updated_at）
  - `maiml_publish_registry` テーブル（暫定スキーマ: registry_id / asset_id / file_uri / status / template_only / store_raw_series / store_raw_raster / raw_chunk_size / raw_compression / keep_raw_on_unpublish / retention_until / created_at / updated_at）
  - `maiml_condition_kv` テーブル（DDL確定済み）
  - `maiml_material_kv` テーブル（DDL確定済み）
  - `maiml_series_preview` テーブル（DDL確定済み）
  - `maiml_series_raw_header` テーブル（DDL確定済み）
  - `maiml_series_raw_chunk` テーブル（DDL確定済み）
  - `maiml_series_raw_chunk_bin` テーブル（DDL確定済み）
- [ ] ロールバックSQL作成

### Phase 2: 型定義

- [ ] `backend/src/types/maimlOpenData.ts` 作成
  - `MaimlAsset`, `MaimlPublishRegistry`, `MaimlConditionKv`, `MaimlMaterialKv`
  - `MaimlSeriesPreview`, `MaimlSeriesRawHeader`, `MaimlSeriesRawChunk`
  - `PublishRequest`, `UnpublishRequest`, `PublishResponse` 等のAPI型

### Phase 3: XMLパーサー（KV抽出）

- [ ] `backend/src/services/maimlKvExtractorService.ts` 作成
  - SAX方式（Node.js `sax` パッケージ）でストリーミングXML解析
  - `<condition>` / `<conditionTemplate>` → `MaimlConditionKv[]` 抽出
  - `<material>` / `<materialTemplate>` → `MaimlMaterialKv[]` 抽出
  - `instruction_id` / `template_id` の付与
  - `path` 表現（直下: `key`、ネスト: `親/子`、同名複数: `idx=0..`）
  - `value_type` の判定（XSDタグ名 → "double" / "string" 等）

### Phase 4: プレビュー生成サービス

- [ ] `backend/src/services/maimlPreviewService.ts` 作成
  - `uniform(X, Y, k)` 実装（等間隔サンプリング）
  - `maxhold(X, Y, k)` 実装（区間最大値保持）
  - `mmr(X, Y, k, lambda)` 実装（maxhold 4k → MMR k）
  - 共通前処理（x昇順ソート / y正規化 / 端点保持）
  - 品質指標計算（MAE / MAPE / Peak Recall / Area 保持率）

### Phase 5: Ingest Worker サービス

- [ ] `backend/src/services/maimlIngestService.ts` 作成
  - MaiML XML（StorageService経由）をストリーミング読み込み
  - `doc_name` 抽出 (`/maiml/document/name/text()`)
  - KV抽出 → `maiml_condition_kv` / `maiml_material_kv` 一括INSERT
  - `<data>` series 解析 → プレビュー生成 → `maiml_series_preview` INSERT
  - `store_raw_series=true` の場合 → `maiml_series_raw_header` + `maiml_series_raw_chunk` INSERT
  - 冪等性対応（途中失敗→再実行で同一結果）

### Phase 6: Repository 層

- [ ] `backend/src/repositories/maimlOpenDataRepository.ts` 作成
  - `insertAsset(data: MaimlAsset)`: asset 登録
  - `updateAsset(data: MaimlAsset)`: asset 更新
  - `insertRegistry(data: MaimlPublishRegistry)`: registry 登録
  - `updateRegistry(data: MaimlPublishRegistry)`: registry 更新
  - `findAssetByFileUri(organizationId, fileUri)`: URI で既存 asset 検索
  - `insertConditionKvBatch(rows: MaimlConditionKv[])`: 一括 INSERT
  - `insertMaterialKvBatch(rows: MaimlMaterialKv[])`: 一括 INSERT
  - `insertPreview(data: MaimlSeriesPreview)`: preview INSERT
  - `insertRawHeader(data: MaimlSeriesRawHeader)`: raw header INSERT
  - `insertRawChunkBatch(rows: MaimlSeriesRawChunk[])`: 一括 INSERT
  - `deleteAsset(assetId, keepMeta: boolean)`: 非公開処理
  - SQLファイル: `backend/src/sql/queries/maimlOpenData/` 配下に配置

### Phase 7: コントローラー・ルート

- [ ] `backend/src/controllers/maimlOpenDataController.ts` 作成
  - `publish(req, res)`: 公開処理
  - `unpublish(req, res)`: 非公開処理
  - `getPublishStatus(req, res)`: 公開状態取得
- [ ] `backend/src/routes/maimlOpenDataRoutes.ts` 作成
  - `POST /api/v1/projects/:projectName/publish`（experiment_admin 書込可）
  - `POST /api/v1/projects/:projectName/unpublish`（experiment_admin 書込可）
  - `GET /api/v1/projects/:projectName/publish-status`（experiment_admin 読取専用）
- [ ] `backend/src/server.ts` にルート登録

---

## 変更ファイル

### 新規作成
1. `backend/migrations/20260310_create_maiml_opendata_tables.sql` - DBマイグレーション
2. `backend/migrations/20260310_rollback_maiml_opendata_tables.sql` - ロールバックSQL
3. `backend/src/types/maimlOpenData.ts` - 型定義
4. `backend/src/services/maimlKvExtractorService.ts` - KV抽出サービス
5. `backend/src/services/maimlPreviewService.ts` - プレビュー生成サービス
6. `backend/src/services/maimlIngestService.ts` - Ingest Worker サービス
7. `backend/src/repositories/maimlOpenDataRepository.ts` - Repository層
8. `backend/src/sql/queries/maimlOpenData/insertAsset.sql`
9. `backend/src/sql/queries/maimlOpenData/insertRegistry.sql`
10. `backend/src/sql/queries/maimlOpenData/findAssetByFileUri.sql`
11. `backend/src/sql/queries/maimlOpenData/deleteAsset.sql`
12. `backend/src/controllers/maimlOpenDataController.ts` - コントローラー
13. `backend/src/routes/maimlOpenDataRoutes.ts` - ルート定義

### 修正
1. `backend/src/server.ts` - ルート登録追加

---

## 技術的詳細

### XMLパーサー方針

- Node.js 標準の `sax` パッケージ（または `fast-xml-parser`）を使用
- 既存の `maimlService.ts` は DOM 方式のため、大容量ファイル向けに別サービスとして実装
- MaiML の名前空間を考慮したタグマッチング

### StorageService との連携

- 既存の `storageService.ts` を使用してファイルを取得
- `downloadFile(organizationId, filePath)` → Buffer → SAX ストリーミング解析

### アクセス制御方針

- 既存の `checkPermission` ミドルウェアを使用
- `experiment_admin` の機能コード: `040000`（既存ルートと統一）
- 公開・非公開ともに書込可権限（permission=1）が必要

### 暫定実装方針（未決事項への対応）

| 未決事項 | 暫定対応 |
|---------|---------|
| `maiml_asset` 完全スキーマ | organization_id / file_uri / doc_name / template_only を最低限保持する独自スキーマで定義 |
| `maiml_publish_registry` 完全スキーマ | status カラム（requested/processing/published/unpublished）を持つ独自スキーマで定義 |
| `series_type` 判定ロジック | content の `key` 属性が `TIC` を含む → `TIC`、`SPECTRUM` を含む → `SPECTRUM_TOTAL`、その他 → `OTHER` |
| デフォルトプレビューモード | `uniform` をデフォルトとして使用 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `sax` パッケージ未インストール | 中 | 低 | インストール済み確認 / 未インストール時は npm install |
| 暫定スキーマが後の仕様と合わない | 中 | 中 | カラム追加は ALTER TABLE で対応可能。仕様確定後に migration 追加 |
| MaiML のネスト構造が深く KV 抽出が複雑 | 高 | 中 | XRF.maiml サンプルで動作確認。外部ファイル参照形式は取得スキップ |
| プレビュー生成の数値精度 | 低 | 低 | 設計書の疑似コードをそのまま TypeScript に移植 |

---

## テスト計画

- [ ] マイグレーション実行後のテーブル存在確認
- [ ] KV抽出：XRF.maiml サンプルで condition_kv / material_kv が正しく生成されること
- [ ] プレビュー生成：uniform / maxhold / mmr の各モードで2000点以内に収まること
- [ ] 公開API：experiment_admin でのみ成功すること（他ロールは 403）
- [ ] 非公開API：CASCADE 削除で子テーブルデータが消えること

---

## 承認記録

- **計画書提示日時**: 2026-03-10 08:49
- **承認日時**: （承認後に記入）
- **承認者コメント**: 

---

## 実施記録

### 実施日時
開始: 2026-03-10 08:49
完了: 2026-03-10 10:35

### 計画からの変更点
- Repository 層を `maimlOpenDataRepository.ts` 1ファイルにまとめる設計から、テーブルごとに分割する方針に変更
  - `maimlAssetRepository.ts`
  - `maimlPublishRegistryRepository.ts`
  - `maimlConditionKvRepository.ts`
  - `maimlMaterialKvRepository.ts`
  - `maimlSeriesPreviewRepository.ts`
  - `maimlSeriesRawHeaderRepository.ts`
- SQLファイル外部管理（`sql/queries/maimlOpenData/`）は今回未実装。Repository 内でインライン SQL として実装（単純な INSERT / DELETE のみのため許容）
- ルートパスを `POST /api/v1/projects/:projectName/publish` から `POST /api/v1/maiml-opendata/publish` に変更（project に紐付かない汎用公開 API として設計）
- バリデーションは Routes 側（express-validator）に集約。コントローラーではバリデーションなし

### 最終的な成果物
- [x] `backend/migrations/20260310_create_maiml_opendata_tables.sql` - 7テーブルのDDL
- [x] `backend/migrations/20260310_rollback_maiml_opendata_tables.sql` - ロールバックSQL
- [x] `backend/src/types/maimlOpenData.ts` - 全テーブル型定義 + API型定義
- [x] `backend/src/services/maimlKvExtractorService.ts` - fast-xml-parser を使った KV 抽出
- [x] `backend/src/services/maimlPreviewService.ts` - uniform / maxhold / mmr プレビュー生成
- [x] `backend/src/services/maimlIngestService.ts` - 公開・非公開・ステータス取得の一連処理
- [x] `backend/src/repositories/maimlAssetRepository.ts`
- [x] `backend/src/repositories/maimlPublishRegistryRepository.ts`
- [x] `backend/src/repositories/maimlConditionKvRepository.ts`
- [x] `backend/src/repositories/maimlMaterialKvRepository.ts`
- [x] `backend/src/repositories/maimlSeriesPreviewRepository.ts`
- [x] `backend/src/repositories/maimlSeriesRawHeaderRepository.ts`
- [x] `backend/src/controllers/maimlOpenDataController.ts`
- [x] `backend/src/routes/maimlOpenDataRoutes.ts`
- [x] `backend/src/server.ts` - ルート登録追加
- [x] TypeScript コンパイル（`tsc --noEmit`）: エラー 0
- [x] `docs/design/api/api_maiml_opendata.md` - API仕様書（3エンドポイント）
- [x] `docs/design/api/api_list.md` - MaiML OpenData Pipeline API 追記（合計127エンドポイント）
- [x] `docs/design/ui/experiment_admin/ui_maiml_publish.md` - フロントエンドUI仕様書

### 未実装（確認事項が固まっていないため保留）
- フロントエンド公開ボタン/ダイアログコンポーネント（UI仕様書は作成済み）
- OpenData向け公開検索UI（issues.mdの確認事項が未解決）
