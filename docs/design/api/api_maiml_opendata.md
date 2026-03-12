# MaiML OpenData Pipeline API 仕様書

**作成日**: 2026-03-10  
**最終更新**: 2026-03-10  
**バージョン**: 1.0.0  
**対象機能**: MaiML OpenData Pipeline  
**総API数**: 3個  
**実装状況**: 3個実装済み

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| 公開管理 | 3 | 0 | 3 |
| **合計** | **3** | **0** | **3** |

**完了率**: 100% (3/3)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 |
|---|------|---------|---------------|------|
| 1 | MaiML公開 | POST | `/api/v1/maiml-opendata/publish` | ✅ 実装済み |
| 2 | MaiML非公開 | DELETE | `/api/v1/maiml-opendata/unpublish/:assetId` | ✅ 実装済み |
| 3 | 公開ステータス取得 | GET | `/api/v1/maiml-opendata/status` | ✅ 実装済み |

---

## 📋 概要

MaiML OpenData Pipeline API は、ストレージ上の MaiML ファイルを解析し、
条件KV・材料KV・プレビューデータを DB に保存する公開処理を提供します。

### 主な特徴

1. **KV抽出**: MaiML XML から `<condition>` / `<conditionTemplate>` / `<material>` / `<materialTemplate>` の属性値を key-value 形式で DB に保存
2. **プレビュー生成**: `<result>` 内の数値系列データを間引いてプレビューデータとして保存（uniform / maxhold / mmr モード対応）
3. **トランザクション保証**: 公開・非公開は DB トランザクションで原子性を保証
4. **マルチテナント分離**: 組織IDをすべての DB 操作・ストレージ操作に強制付与

### 使用ロール

| ロール | 公開 | 非公開 | ステータス取得 |
|-------|------|--------|--------------|
| experiment_admin | ✅ | ✅ | ✅ |
| system_admin | ✅ | ✅ | ✅ |
| その他 | ❌ | ❌ | ❌ |

---

## 🔐 共通仕様

### 認証・認可

**認証方式**: JWT + Session Hybrid

**必須ヘッダー**:
```http
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

**organization_id の取得**:
- `authMiddleware` がセッション情報を検証し、`req.user.organizationId` に格納
- リクエストヘッダーで `X-Organization-Id` を指定する必要はなし

**ミドルウェアチェーン**:
```typescript
router.METHOD('/path',
  authMiddleware,       // 1. JWT認証（req.user に格納）
  [...validation],      // 2. express-validator バリデーション
  handleValidationErrors,
  controller.handler    // 3. コントローラー処理
);
```

### 統一レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

---

## 📋 API詳細仕様

### 1. MaiML公開

**エンドポイント**: `POST /api/v1/maiml-opendata/publish`

**説明**:  
ストレージ上の MaiML ファイルを解析し、条件KV・材料KV・プレビューデータを DB に保存する。  
`maiml_asset` / `maiml_publish_registry` も同時に作成し、公開ステータスを `published` に設定する。

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエスト

**ボディ（JSON）**:
```json
{
  "file_uri": "projects/sample_project/sample_project.maiml",
  "template_only": false,
  "store_raw_series": false,
  "store_raw_raster": false,
  "raw_chunk_size": 65536,
  "raw_compression": "zstd",
  "keep_raw_on_unpublish": false,
  "retention_until": "2027-03-10T00:00:00Z",
  "preview_mode": "uniform"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `file_uri` | string | ✅ | ストレージ上の相対パス（organization_id なし） |
| `template_only` | boolean | ❌ | デフォルト: `false` |
| `store_raw_series` | boolean | ❌ | 生データ（数値系列）保存フラグ。デフォルト: `false` |
| `store_raw_raster` | boolean | ❌ | 生データ（ラスター）保存フラグ。デフォルト: `false` |
| `raw_chunk_size` | integer | ❌ | チャンクサイズ（バイト）。最小1。デフォルト: `65536` |
| `raw_compression` | string | ❌ | `zstd` / `gzip` / `none`。デフォルト: `zstd` |
| `keep_raw_on_unpublish` | boolean | ❌ | 非公開時に生データを保持するか。デフォルト: `false` |
| `retention_until` | string | ❌ | ISO 8601 形式。データ保持期限 |
| `preview_mode` | string | ❌ | `uniform` / `maxhold` / `mmr`。デフォルト: `uniform` |

#### レスポンス

**成功時 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "asset_id": 1,
    "doc_name": "XRF Analysis - Iron alloy",
    "file_uri": "projects/sample_project/sample_project.maiml",
    "status": "published",
    "condition_kv_count": 42,
    "material_kv_count": 15,
    "preview_count": 3
  },
  "message": "MaiML ファイルを公開しました"
}
```

**レスポンスフィールド**:
| フィールド | 型 | 説明 |
|----------|---|------|
| `asset_id` | number | 作成された `maiml_asset` の ID |
| `doc_name` | string \| null | MaiML の `<document><name>` から抽出したドキュメント名 |
| `file_uri` | string | リクエストで指定した `file_uri` |
| `status` | string | 公開後のステータス（`published` 固定） |
| `condition_kv_count` | number | 保存した `maiml_condition_kv` の行数 |
| `material_kv_count` | number | 保存した `maiml_material_kv` の行数 |
| `preview_count` | number | 保存した `maiml_series_preview` の行数 |

**エラー時**:

| ステータス | code | 説明 |
|----------|------|------|
| 400 | `VALIDATION_ERROR` | バリデーションエラー |
| 401 | - | 認証エラー |
| 403 | - | 権限不足 |
| 500 | `PUBLISH_FAILED` | 公開処理失敗（ストレージアクセス失敗、XML解析失敗等） |

#### 処理フロー

```
POST /publish
  │
  ├─ 1. authMiddleware（JWT 認証 → req.user）
  ├─ 2. express-validator バリデーション
  ├─ 3. publishMaiml() [トランザクション開始]
  │     ├─ maiml_asset INSERT
  │     ├─ maiml_publish_registry INSERT (status='processing')
  │     ├─ storageService.downloadFile() でMaiML取得
  │     ├─ extractFromMaiml() でKV抽出
  │     ├─ generatePreviews() でプレビュー生成
  │     ├─ maiml_condition_kv 一括INSERT
  │     ├─ maiml_material_kv 一括INSERT
  │     ├─ maiml_series_preview 一括INSERT
  │     └─ maiml_publish_registry UPDATE (status='published')
  │        [コミット]
  └─ 4. 201 レスポンス返却
```

---

### 2. MaiML非公開

**エンドポイント**: `DELETE /api/v1/maiml-opendata/unpublish/:assetId`

**説明**:  
指定した `asset_id` のKV・プレビューデータを削除し、公開ステータスを `unpublished` に設定する。  
`mode=full_delete` を指定するとアセット自体も CASCADE DELETE する。

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `assetId` | integer | ✅ | 対象の asset_id（正の整数） |

**ボディ（JSON, 省略可）**:
```json
{
  "mode": "keep_meta"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `assetId` (path) | integer | ✅ | 正の整数 |
| `mode` (body) | string | ❌ | `keep_meta` / `full_delete`。デフォルト: `keep_meta` |

**mode の違い**:
| mode | 動作 |
|------|------|
| `keep_meta` | KV・プレビュー・生データを削除し、`maiml_asset` / `maiml_publish_registry` は残す。`registry.status` を `unpublished` に更新 |
| `full_delete` | `maiml_asset` を CASCADE DELETE（関連テーブルすべて削除） |

**注意**: `registry.keep_raw_on_unpublish = true` の場合、`keep_meta` モードでも生データ（`maiml_series_raw_header` / チャンク）は削除されない。

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "asset_id": 1,
    "mode": "keep_meta"
  },
  "message": "公開を取り消しました"
}
```

**エラー時**:

| ステータス | code | 説明 |
|----------|------|------|
| 400 | `VALIDATION_ERROR` | バリデーションエラー（assetId が不正等） |
| 401 | - | 認証エラー |
| 403 | `UNPUBLISH_FAILED` | 他の組織のアセットへのアクセス |
| 404 | `UNPUBLISH_FAILED` | 指定した asset_id が存在しない |
| 500 | `UNPUBLISH_FAILED` | 非公開処理失敗 |

---

### 3. 公開ステータス取得

**エンドポイント**: `GET /api/v1/maiml-opendata/status`

**説明**:  
ストレージパス（`file_uri`）を指定して、対象 MaiML ファイルの公開状態を確認する。  
未公開ファイルの場合は `is_published: false` を返す（404 ではなく 200）。

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエスト

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `file_uri` | string | ✅ | ストレージ上の相対パス（organization_id なし） |

**例**:
```
GET /api/v1/maiml-opendata/status?file_uri=projects/sample_project/sample_project.maiml
```

#### レスポンス

**成功時 (200 OK) - 公開済みの場合**:
```json
{
  "success": true,
  "data": {
    "is_published": true,
    "asset_id": 1,
    "registry_id": 1,
    "status": "published",
    "doc_name": "XRF Analysis - Iron alloy",
    "template_only": false,
    "store_raw_series": false,
    "retention_until": null,
    "published_at": "2026-03-10T10:00:00Z"
  }
}
```

**成功時 (200 OK) - 未公開の場合**:
```json
{
  "success": true,
  "data": {
    "is_published": false,
    "asset_id": null,
    "registry_id": null,
    "status": null,
    "doc_name": null,
    "template_only": null,
    "store_raw_series": null,
    "retention_until": null,
    "published_at": null
  }
}
```

**レスポンスフィールド**:
| フィールド | 型 | 説明 |
|----------|---|------|
| `is_published` | boolean | `true` = 公開中（`registry.status = 'published'`） |
| `asset_id` | number \| null | `maiml_asset.asset_id` |
| `registry_id` | number \| null | `maiml_publish_registry.registry_id` |
| `status` | string \| null | `requested` / `processing` / `published` / `unpublished` |
| `doc_name` | string \| null | MaiML ドキュメント名 |
| `template_only` | boolean \| null | テンプレートのみモード |
| `store_raw_series` | boolean \| null | 生データ保存フラグ |
| `retention_until` | string \| null | データ保持期限（ISO 8601） |
| `published_at` | string \| null | 最終公開日時（`status = 'published'` の場合のみ） |

**エラー時**:

| ステータス | code | 説明 |
|----------|------|------|
| 400 | `VALIDATION_ERROR` | `file_uri` が未指定 |
| 401 | - | 認証エラー |
| 403 | - | 権限不足 |
| 500 | `STATUS_FETCH_FAILED` | ステータス取得失敗 |

---

## 🗄️ 関連 DB テーブル

| テーブル | 役割 |
|---------|------|
| `maiml_asset` | 公開対象ファイルのメタデータ（organization_id / file_uri / doc_name） |
| `maiml_publish_registry` | 公開設定・ステータス管理（status / store_raw_series 等のオプション） |
| `maiml_condition_kv` | `<condition>` / `<conditionTemplate>` の key-value |
| `maiml_material_kv` | `<material>` / `<materialTemplate>` の key-value |
| `maiml_series_preview` | 数値系列データのプレビュー（間引きサンプル） |
| `maiml_series_raw_header` | 生データヘッダー（`store_raw_series=true` 時のみ保存） |
| `maiml_series_raw_chunk` | 生データチャンク（`store_raw_series=true` 時のみ保存） |

DDL: `backend/migrations/20260310_create_maiml_opendata_tables.sql`

---

## 🔒 セキュリティ考慮事項

### マルチテナント分離

- `maiml_asset` の `organization_id` は `req.user!.organizationId` から取得（クライアント指定不可）
- 非公開操作時は DB から `asset.organization_id === req.user.organizationId` を検証
- ストレージ操作は `storageService.downloadFile(organizationId, fileUri)` で organization_id プレフィックスを自動付与

### アクセス制御

```typescript
// ✅ 正しい組織IDの取得方法
const organizationId = req.user!.organizationId;

// ❌ クライアントからのorganizationId受け取りは禁止
const organizationId = req.body.organizationId; // NG
```

---

## 🛠️ 実装ファイル

| 種別 | ファイルパス |
|------|------------|
| ルート | `backend/src/routes/maimlOpenDataRoutes.ts` |
| コントローラー | `backend/src/controllers/maimlOpenDataController.ts` |
| Ingest Service | `backend/src/services/maimlIngestService.ts` |
| KV抽出 Service | `backend/src/services/maimlKvExtractorService.ts` |
| プレビュー Service | `backend/src/services/maimlPreviewService.ts` |
| Asset Repository | `backend/src/repositories/maimlAssetRepository.ts` |
| Registry Repository | `backend/src/repositories/maimlPublishRegistryRepository.ts` |
| ConditionKv Repository | `backend/src/repositories/maimlConditionKvRepository.ts` |
| MaterialKv Repository | `backend/src/repositories/maimlMaterialKvRepository.ts` |
| SeriesPreview Repository | `backend/src/repositories/maimlSeriesPreviewRepository.ts` |
| SeriesRawHeader Repository | `backend/src/repositories/maimlSeriesRawHeaderRepository.ts` |
| 型定義 | `backend/src/types/maimlOpenData.ts` |
| マイグレーション | `backend/migrations/20260310_create_maiml_opendata_tables.sql` |

---

## 📚 関連ドキュメント

- [設計書](../../MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md) - OpenData Pipeline 基本設計書
- [API一覧](./api_list.md) - 全API一覧
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-03-10 | 初版作成（3エンドポイント、実装済み100%） | Cline |
