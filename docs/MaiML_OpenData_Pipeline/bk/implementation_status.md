# MaiML OpenData Pipeline 実装状況まとめ

> 作成日: 2026-03-10  
> 対象タスク: `docs/20260310_0849_MaiML_OpenData_Pipeline実装/PLAN.md`  
>             `docs/20260310_1144_unpublishバッチ実装/PLAN.md`

---

## 1. 全体サマリー

| カテゴリ | 実装状況 |
|---------|---------|
| DBマイグレーション | ✅ 完了 |
| 型定義 | ✅ 完了 |
| KV抽出サービス | ⚠️ 一部実装（series抽出は未実装） |
| プレビュー生成サービス | ⚠️ 一部実装（MMRアルゴリズムは未実装） |
| Ingest サービス | ⚠️ 一部実装（生データ保存は未実装） |
| Repository 層 | ✅ 完了（生データ系 rawHeaderRepo 作成済） |
| コントローラー | ✅ 完了（projectController に統合） |
| ルート定義 | ✅ 完了（projectRoutes に統合） |
| server.ts へのルート登録 | ✅ 完了（既存の `/api/v1/projects` に追加） |
| 非公開バッチ | ✅ 完了 |
| フロントエンド（公開ボタン） | ⚠️ 一部実装（ボタンあり、設定ダイアログなし） |
| フロントエンド（非公開ボタン） | ❌ 未実装 |
| フロントエンド（公開ステータス表示） | ❌ 未実装 |
| 公開データ検索UI | ❌ 未実装 |

---

## 2. 実装済みの機能

### 2.1 DBマイグレーション ✅

**ファイル:** `backend/migrations/20260310_create_maiml_opendata_tables.sql`  
**ロールバック:** `backend/migrations/20260310_rollback_maiml_opendata_tables.sql`

全7テーブルが `maiml_publish` スキーマに作成済み。

| テーブル名 | 状態 | 備考 |
|-----------|------|------|
| `maiml_asset` | ✅ 作成済み | 暫定スキーマ（仕様確定後に ALTER TABLE が必要） |
| `maiml_publish_registry` | ✅ 作成済み | 暫定スキーマ（status の enum 値・遷移ルールは TODO コメントあり） |
| `maiml_condition_kv` | ✅ 作成済み | DDL 確定済み |
| `maiml_material_kv` | ✅ 作成済み | DDL 確定済み |
| `maiml_series_preview` | ✅ 作成済み | DDL 確定済み |
| `maiml_series_raw_header` | ✅ 作成済み | DDL 確定済み |
| `maiml_series_raw_chunk` | ✅ 作成済み | DDL 確定済み |
| `maiml_series_raw_chunk_bin` | ✅ 作成済み | DDL 確定済み |

---

### 2.2 型定義 ✅

**ファイル:** `backend/src/types/maimlOpenData.ts`

以下の型が定義済み：
- `MaimlAsset`, `MaimlPublishRegistry`
- `MaimlConditionKv`, `MaimlMaterialKv`
- `MaimlSeriesPreview`, `MaimlSeriesRawHeader`, `MaimlSeriesRawChunk`
- `PublishRequest`, `UnpublishRequest`, `IngestResult`, `PreviewMode`, `SeriesType`

---

### 2.3 KV抽出サービス ✅（一部）

**ファイル:** `backend/src/services/maimlKvExtractorService.ts`

| 機能 | 状態 |
|------|------|
| conditionTemplate の KV 抽出 | ✅ 実装済み（MaimlParserTyped 使用） |
| materialTemplate の KV 抽出 | ✅ 実装済み |
| condition / material インスタンスの KV 抽出 | ✅ 実装済み |
| doc_name 抽出（`/maiml/document/name`） | ✅ 実装済み |
| path 表現（ネスト・同名要素の idx） | ✅ 実装済み |
| value_type の正規化 | ✅ 実装済み |
| **inline series データの抽出** | ❌ **未実装**（常に空配列を返す） |
| **series_type の判定ロジック** | ❌ **未実装**（常に `'OTHER'` を返す） |

```
// extractSeriesFromMaiml() の現状
// TODO: inline series（Content の数値配列）を含む MaiML サンプル入手後に実装する
//       XRF.maiml は <insertion> で外部バイナリ参照のため inline series なし
return [];  // ← 常に空配列
```

---

### 2.4 プレビュー生成サービス ✅（一部）

**ファイル:** `backend/src/services/maimlPreviewService.ts`

| 機能 | 状態 |
|------|------|
| `uniform` モード（等間隔サンプリング） | ✅ 完全実装 |
| `maxhold` モード（バケット最大値保持） | ✅ 実装済み |
| **`mmr` モード**（ピーク保存間引き） | ❌ **未実装**（uniform にフォールバック） |
| 品質指標計算（area_ratio） | ✅ 実装済み |
| 共通前処理（端点保持など） | △ 端点保持は未実装（TODO なし、設計書 §5.4 の仕様） |

```
// mmr モードの現状
case 'mmr':
  // TODO: MMR アルゴリズム実装（BasicDesign v1.3 § 5.2 参照）
  //       現時点は uniform にフォールバック
  return downsampleUniform(x, y, maxPoints);
```

---

### 2.5 Ingest サービス ✅（一部）

**ファイル:** `backend/src/services/maimlIngestService.ts`

| 機能 | 状態 |
|------|------|
| `maiml_asset` 登録 | ✅ 実装済み |
| `maiml_publish_registry` 登録・status 更新 | ✅ 実装済み |
| ストレージからの MaiML ダウンロード | ✅ 実装済み（storageService 使用） |
| KV 抽出 → condition_kv / material_kv 保存 | ✅ 実装済み |
| template_only モード（テンプレート KV のみ保存） | ✅ 実装済み |
| プレビュー生成 → series_preview 保存 | ✅ 実装済み（ただし series は常に空なので保存なし） |
| テナント分離チェック（unpublish 時） | ✅ 実装済み |
| **生データ保存（`store_raw_series=true`）** | ❌ **未実装** |
| **非同期処理（bullmq キュー）** | ❌ **未実装**（同期処理のみ） |

> **重要：** `publishMaiml()` の処理は設計書で「bullmq Worker で非同期処理」とされているが、
> 現在は **同期的にトランザクション内で全処理を実行**している。
> 公開ボタン押下時に即時完了する（202 Accepted でなく 201 Created を返す）。

生データ保存部分のコード（未実装）：
```typescript
// IngestService 内で以下は実行されない
raw_header_count: 0,   // ← 常に 0
raw_chunk_count:  0,   // ← 常に 0
```

---

### 2.6 Repository 層 ✅

以下の Repository ファイルが作成済み：

| ファイル | 状態 |
|---------|------|
| `maimlAssetRepository.ts` | ✅ 作成済み |
| `maimlPublishRegistryRepository.ts` | ✅ 作成済み |
| `maimlConditionKvRepository.ts` | ✅ 作成済み |
| `maimlMaterialKvRepository.ts` | ✅ 作成済み |
| `maimlSeriesPreviewRepository.ts` | ✅ 作成済み |
| `maimlSeriesRawHeaderRepository.ts` | ✅ 作成済み |

---

### 2.7 コントローラー・ルート ✅

公開/非公開/ステータス取得の処理は `maimlOpenDataController.ts` に実装されているが、  
**実際の API ルートは `projectRoutes.ts` に追加** されており、`maimlOpenDataController.ts` ではなく  
`projectController.ts` の `publish` / `unpublish` / `getPublishStatus` ハンドラーが呼ばれている。

| エンドポイント | ルートファイル | コントローラー | 状態 |
|--------------|-------------|-------------|------|
| `POST /api/v1/projects/:projectName/publish` | `projectRoutes.ts` | `projectController.publish` | ✅ 実装済み |
| `POST /api/v1/projects/:projectName/unpublish` | `projectRoutes.ts` | `projectController.unpublish` | ✅ 実装済み |
| `GET /api/v1/projects/:projectName/publish-status` | `projectRoutes.ts` | `projectController.getPublishStatus` | ✅ 実装済み |

> `maimlOpenDataController.ts` は別途存在するが、`projectRoutes.ts` / `projectController.ts` 側に統合された形で動作している。

---

### 2.8 非公開バッチ ✅

**ディレクトリ:** `backend/batch/unpublish/`

| ファイル | 状態 |
|---------|------|
| `db.ts`（DB 接続） | ✅ 作成済み |
| `repository.ts`（DB アクセス層） | ✅ 作成済み |
| `unpublish.ts`（非公開ロジック） | ✅ 作成済み |
| `index.ts`（エントリポイント） | ✅ 作成済み |

実装済み機能：
- `retention_until <= now()` かつ `status='published'` のアセットを一括非公開
- `keep_meta` モード（KV / プレビュー / 生データ削除、メタ保持）
- `full_delete` モード（asset ごと CASCADE 削除）
- `UNPUBLISH_MODE` 環境変数でモード切り替え
- トランザクション処理
- `backend/package.json` に `batch:unpublish` スクリプト追加

---

### 2.9 フロントエンド（公開ボタン）⚠️（一部）

**ファイル:**  
- `frontend/src/components/project/ProjectManagement.tsx`（公開ボタン）  
- `frontend/src/services/projectApiService.ts`（API 呼び出し）

実装済み：
- プロジェクト管理画面に「公開」ボタンが存在する
- `publishProject()` API 呼び出し関数が実装済み
- `unpublishProject()` API 呼び出し関数が実装済み

---

## 3. 未実装の機能

### 3.1 ❌ フロントエンドに非公開ボタンがない

`ProjectManagement.tsx` に「公開」ボタンのみ存在し、「非公開」ボタンがない。

---

### 3.2 ❌ フロントエンドに公開ステータス表示がない

公開済みかどうかを示すバッジ・アイコン・テキスト等の表示がない。

---

### 3.3 ❌ フロントエンドに公開設定ダイアログがない

現在の「公開」ボタンは以下の値をハードコードして送信している：

```typescript
const request: MaimlPublishRequest = {
  template_only: false,      // ハードコード
  store_raw_series: true,    // ハードコード
  retention: null,           // ハードコード
  keep_raw_on_unpublish: false, // ハードコード
};
```

仕様書で設計されている設定入力フォーム（`template_only` / `store_raw_series` / `retention` / `keep_raw_on_unpublish` を選択できる UI）が存在しない。

---

### 3.4 ❌ 非同期処理（bullmq キュー）が未実装

設計書（`spec.md` §2.0）では bullmq キューによる非同期処理が必要とされているが、現在は同期処理のみ。

```
【設計書の想定フロー】
公開ボタン押下 → 202 Accepted を即返却 → Worker が非同期で処理

【現在の実装】
公開ボタン押下 → maimlIngestService で同期処理 → 201 Created を返却
```

大容量ファイルの処理でタイムアウトが発生する可能性がある。

---

### 3.5 ❌ 生データ保存（store_raw_series）が未実装

`publishMaiml()` 内で `store_raw_series=true` のケースの処理がなく、`raw_header_count / raw_chunk_count` は常に `0` を返す。

---

### 3.6 ❌ inline series データ抽出が未実装

`maimlKvExtractorService.ts` の `extractSeriesFromMaiml()` が常に空配列を返すため、プレビュー生成・生データ保存は **いかなる MaiML ファイルでも動作しない**。

> **原因:** XRF.maiml は外部バイナリ参照形式（`<insertion>`）のため、inline series のサンプルが未入手。

---

### 3.7 ❌ MMR アルゴリズムが未実装

`maimlPreviewService.ts` で `mode='mmr'` を指定した場合、`uniform` にフォールバックする。

---

### 3.8 ❌ 公開データ検索 UI が未実装

`docs/20260310_0849_MaiML_OpenData_Pipeline実装/PLAN.md` の「未実装」項目に記載：  
> OpenData 向け公開検索 UI（issues.md の確認事項が未解決）

---

## 4. 機能ごとの実装状況一覧

### 4.1 公開機能（Publish）

| 機能項目 | 実装状況 | 備考 |
|---------|---------|------|
| DBテーブル作成 | ✅ 完了 | 暫定スキーマ |
| API エンドポイント定義（コントローラー） | ✅ 完了 | projectController に統合 |
| ルートファイル作成 | ✅ 完了 | projectRoutes.ts に統合 |
| server.ts へのルート登録 | ✅ 完了 | 既存 `/api/v1/projects` に追加 |
| KV 抽出（condition / material） | ✅ 実装済み | |
| doc_name 抽出 | ✅ 実装済み | |
| inline series 抽出 | ❌ 未実装 | 常に空配列 |
| プレビュー生成（uniform） | ✅ 実装済み | |
| プレビュー生成（maxhold） | ✅ 実装済み | |
| プレビュー生成（mmr） | ❌ 未実装 | uniform にフォールバック |
| 生データ保存（store_raw_series） | ❌ 未実装 | raw_header_count / raw_chunk_count は常に 0 |
| 非同期処理（bullmq） | ❌ 未実装 | 同期処理のみ |
| フロントエンド 公開ボタン | ✅ 実装済み | |
| フロントエンド 公開設定ダイアログ | ❌ 未実装 | 設定値はハードコード |

### 4.2 非公開機能（Unpublish）

| 機能項目 | 実装状況 | 備考 |
|---------|---------|------|
| API エンドポイント定義（コントローラー） | ✅ 完了 | projectController に統合 |
| ルートファイル作成 | ✅ 完了 | projectRoutes.ts に統合 |
| server.ts へのルート登録 | ✅ 完了 | 既存 `/api/v1/projects` に追加 |
| keep_meta モード（KV/プレビュー/生データ削除） | ✅ 実装済み（サービス層） | |
| full_delete モード（CASCADE 削除） | ✅ 実装済み（サービス層） | |
| keep_raw_on_unpublish 対応 | ✅ 実装済み（サービス層） | |
| テナント分離チェック | ✅ 実装済み | |
| **フロントエンド 非公開ボタン** | ❌ 未実装 | |
| **フロントエンド 公開ステータス表示** | ❌ 未実装 | |
| 期限切れ自動非公開バッチ | ✅ 完了 | `batch:unpublish` スクリプト |

### 4.3 公開データ活用

| 機能項目 | 実装状況 | 備考 |
|---------|---------|------|
| KV 検索 API | ❌ 未実装 | |
| プレビューデータ取得 API | ❌ 未実装 | |
| 生データ取得 API | ❌ 未実装 | |
| 公開データ検索 UI | ❌ 未実装 | |

---

## 5. 今後の対応が必要な項目

### 優先度 高（主要機能を動かすための対応）

1. **フロントエンドに非公開ボタンを追加**  
   公開済みプロジェクトを非公開にするボタンを `ProjectManagement.tsx` に追加する。

2. **フロントエンドに公開ステータス表示を追加**  
   公開済み・未公開を示すバッジ・アイコン等の表示を追加する。  
   `GET /api/v1/projects/:projectName/publish-status` エンドポイントは実装済みのため、UI 側の対応のみ。

3. **inline series 抽出の実装**  
   inline series データを含む MaiML サンプル（クロマトグラフィー系）入手後に  
   `extractSeriesFromMaiml()` を実装する。  
   ※ 現状はプレビュー生成・生データ保存がいかなるファイルでも動作しない。

4. **フロントエンドに公開設定ダイアログを追加**  
   `template_only` / `store_raw_series` / `retention` / `keep_raw_on_unpublish` を選択できる UI を実装する。

### 優先度 低（品質向上のための対応）

5. **MMR アルゴリズムの実装**（仕様書 §5.5 参照）

6. **bullmq 非同期処理の導入**（大容量ファイル対応のため）

7. **store_raw_series（生データ保存）の実装**  
   inline series 抽出が完成してから対応する。

8. **公開データ検索 UI の実装**  
   KV 検索 API / プレビューデータ取得 API / 生データ取得 API の実装も必要。

---

## 6. 既知の課題（issues.md より）

| 課題 | 内容 | 対応状況 |
|------|------|---------|
| `maiml_asset` の既存スキーマ不明 | v1.3 以前の設計書未確認 | 暫定スキーマで実装済み（要確認） |
| `maiml_publish_registry` の既存スキーマ不明 | 同上 | 暫定スキーマで実装済み（要確認） |
| `series_type` 判定ロジック未定義 | inline series サンプル未入手 | 常に `'OTHER'` を返す（TODO） |
| file_uri の形式未決 | Swift/S3 の URI スキームが未定 | フロントエンドが `projectName` で渡しており不整合 |
| プレビューデフォルトモード未決 | 仕様書未定義 | `maxhold` をデフォルトとして実装 |
| フロントエンド UI 未設計 | 公開/非公開ボタン・ステータス表示 | 公開ボタンのみ暫定実装 |
