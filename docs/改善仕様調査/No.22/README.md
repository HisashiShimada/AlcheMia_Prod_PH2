# MAIMLファイルアップロード処理調査レポート

## 概要

`backend/reference` 配下のMAIMLファイルアップロード処理において、**`<data>` 部が格納されない**という課題があることを受け、アップロード時の全処理フローを調査・整理したレポートです。

- **調査日**: 2026-03-18
- **調査対象**: `backend/reference` 配下のアップロード関連ソースコード

---

## 調査対象ファイル一覧

| ファイルパス | 役割 |
|---|---|
| `backend/reference/routes/s3/index.js` | S3ルート統合・ミドルウェア設定 |
| `backend/reference/routes/s3/uploadRoutes.js` | アップロードエンドポイント実装 |
| `backend/reference/routes/dbOperations.js` | DBアクセス操作モジュール |
| `backend/reference/services/maimlMetadataExtractor.js` | MAIMLメタデータ抽出・DB保存 |
| `backend/reference/services/maimlParser.js` | XMLパース・Data要素抽出 |
| `backend/reference/services/maimlDatalake/singleFileIngest.service.js` | データレイク用インジェスト処理 |

---

## アップロードエンドポイント一覧

`POST /s3/upload-single` が主要な単一ファイルアップロード口。その他以下のエンドポイントが存在する。

| エンドポイント | 概要 |
|---|---|
| `POST /s3/save` | MaiMLファイル保存（編集後の保存用） |
| `POST /s3/upload-single` | 単一ファイルアップロード（メイン） |
| `POST /s3/bulk-upload` | 複数ファイル一括アップロード |
| `POST /s3/upload-folder-structure` | フォルダ構造を保持したアップロード |
| `POST /s3/upload-chunk` | チャンク分割アップロード（大容量用） |
| `POST /s3/finalize-chunked-upload` | チャンク結合・S3保存 |

---

## アップロード処理フロー（`POST /s3/upload-single` の場合）

```
[クライアント]
    │
    │ POST /s3/upload-single (multipart/form-data)
    ▼
[ミドルウェアチェーン (routes/s3/index.js)]
    │ 1. requireAuth          → JWT認証
    │ 2. setTenantContext      → テナントコンテキスト設定
    │ 3. validateS3Key         → S3キーのテナント検証
    │ 4. filterS3ResponseByOrganization → レスポンスフィルタ
    │ 5. enforceOrganizationPrefix → 組織プレフィックス強制付与
    ▼
[uploadRoutes.js - POST /upload-single]
    │
    │ Step 1: リクエスト検証
    │   - req.file 存在確認
    │   - userId 必須チェック
    │   - V1.18α拡張パラメータ抽出
    │     (isDraft, draftName, dataLayer, projectId, dataCategory)
    │
    │ Step 2: バッチレコード作成
    │   - dbOperations.createUploadBatch()
    │   - upload_batches テーブルへINSERT
    │
    │ Step 3: 組織ID取得
    │   - req.validatedOrgId / req.tenantContext / req.organizationId
    │
    │ Step 4: S3キー生成
    │   - dataLayer が 'uploads' → utils.generateS3KeyMultitenant()
    │   - dataLayer が 'raw'/'processed'/'archive' → データレイク用パス生成
    │   ※ 全パスに organizationId プレフィックスが付与される
    │
    │ Step 5: S3アップロード（リトライ付き）
    │   - s3Operations.uploadFileWithRetry()
    │   - 失敗時はロールバック（S3アップロード済みファイルを削除）
    │
    │ Step 6: DBメタデータ保存
    │   - dbOperations.saveFileMetadata()
    │   - file_metadata テーブルへ UPSERT
    │   ※ この時点では MAIML の中身（Data要素等）は未格納
    │
    │ Step 7: MAIMLメタデータ抽出（.maimlファイルのみ）
    │   ├─ maimlMetadataExtractor.extractSingleFile(s3Key, organizationId)
    │   │   └─ ※ Data要素を含むメタデータをDBに保存
    │   │
    │   └─ singleFileIngestService.processFileAsync(s3Key)
    │       └─ データレイク用トランジションセット生成・埋め込みベクトル保存（非同期）
    │
    │ Step 8: 処理ログ記録
    │   - dbOperations.createProcessingLog()
    │
    │ Step 9: バッチ完了更新
    │   - dbOperations.updateUploadBatch()
    │
    └─ レスポンス返却
```

---

## `<data>` 部の格納処理詳細

### 処理の位置

`<data>` 部の格納は **Step 7** の `maimlMetadataExtractor.extractSingleFile()` の中で実行される。

### 処理フロー

```
maimlMetadataExtractor.extractSingleFile(s3Key, organizationId)
    │
    │ 1. S3からMAIMLファイルを取得
    │    getMaiMLContent(s3Key)
    │
    │ 2. XMLメタデータ抽出
    │    extractMetadata(xmlContent)
    │    │
    │    │ 2-1. xml2jsでXMLパース
    │    │ 2-2. document要素からdocument_uuid/name/description抽出
    │    │ 2-3. 全XMLノードを再帰走査（_extractFromNode）
    │    │       → measurement_values, units, ids, refs, elements 等を収集
    │    │
    │    │ 2-4. 【Data要素の抽出】★ここが肝心★
    │    │       maimlParser.parseDataElements(xmlContent) を呼び出す
    │    │       成功した場合 → metadata.data_instances に格納
    │    │
    │    └─ metadata オブジェクトを返す
    │
    │ 3. DBへ保存（UPSERT）
    │    updateFileMetadata(fileKey, organizationId, metadata)
    │    │
    │    │ [既存レコードあり] → UPDATE
    │    │   maiml_data_instances = JSON.stringify(metadata.data_instances)
    │    │
    │    └─ [既存レコードなし] → INSERT
    │        maiml_data_instances = JSON.stringify(metadata.data_instances)
    │
    └─ 結果を返す { success, fileKey, metadata }
```

### `maimlParser.parseDataElements()` の処理内容

```
parseDataElements(maimlContent)
    │
    │ 1. fast-xml-parserでXMLをパース
    │
    │ 2. parsedXML.maiml.data の存在確認
    │    → 存在しなければ { success: true, hasData: false, instances: [] } を返す
    │
    │ 3. data.results 配列を走査
    │    │
    │    │ results.material[] → extractInstanceData(element, 'materials', resultsId)
    │    │ results.condition[] → extractInstanceData(element, 'conditions', resultsId)
    │    └─ results.result[]  → extractInstanceData(element, 'results', resultsId)
    │
    │ 4. extractInstanceData() で各インスタンスから以下を抽出:
    │    - instanceId (@_id)
    │    - templateRef (@_ref)
    │    - category (materials / conditions / results)
    │    - resultsId
    │    - uuid, name, description, annotation
    │    - properties (extractProperties() で再帰抽出)
    │    - insertion (result要素のみ)
    │
    └─ { success, hasData, instances[] } を返す
```

### DBに保存されるカラム

`file_metadata` テーブルの `maiml_data_instances` カラム（JSONB型）に以下の配列が格納される。

```json
[
  {
    "instanceId": "material-001",
    "templateRef": "template-material-A",
    "category": "materials",
    "resultsId": "results-001",
    "uuid": "...",
    "name": "サンプル名",
    "description": "説明",
    "annotation": null,
    "properties": [
      {
        "key": "SampleName",
        "type": "stringType",
        "value": "SiO2",
        "description": null,
        "units": null
      }
    ],
    "insertion": null
  }
]
```

---

## `<data>` 部が格納されない原因として考えられるケース

### ケース1: `<data>` 要素がMAIMLのルート構造にない

`parseDataElements()` は `parsedXML.maiml.data` を参照する。
MAIMLファイルの構造が `<maiml><data>...</data></maiml>` になっていない場合は `hasData: false` となりインスタンスが空になる。

**チェックポイント:**
```xml
<!-- ✅ 正しい構造 -->
<maiml version="1.0">
  <document>...</document>
  <protocol>...</protocol>
  <data>
    <results id="results-001">
      <material id="mat-001" ref="template-A">...</material>
    </results>
  </data>
</maiml>
```

### ケース2: `maimlMetadataExtractor.extractSingleFile()` が失敗している

`uploadRoutes.js` の実装では、`extractSingleFile()` の失敗時にエラーをキャッチして **アップロード自体は成功** として処理が続く（メタデータ抽出失敗はノンブロッキング）。

```javascript
// uploadRoutes.js 抜粋
try {
  const extractResult = await maimlMetadataExtractor.extractSingleFile(s3Key, organizationId);
  metadataExtracted = extractResult.success;
  if (!metadataExtracted) {
    console.warn('⚠️ MaiMLメタデータ抽出失敗:', extractResult.error);
  }
} catch (metadataError) {
  console.error('❌ MaiMLメタデータ抽出エラー:', metadataError.message);
  // メタデータ抽出失敗してもアップロードは成功とする ← ★ここが問題になり得る
}
```

**→ サーバーログに `⚠️ MaiMLメタデータ抽出失敗` または `❌ MaiMLメタデータ抽出エラー` が出ていないか確認が必要。**

### ケース3: `file_metadata` テーブルに `maiml_data_instances` カラムが存在しない

`updateFileMetadata()` の UPDATE/INSERT 文で `maiml_data_instances = $13` として保存しているが、DBスキーマに当該カラムが存在しない場合はSQLエラーになる。

**チェックポイント:** migration ファイルで `maiml_data_instances` カラムが追加されているか確認。

### ケース4: `<results>` の下に `<material>` / `<condition>` / `<result>` がない

`parseDataElements()` は `results.material`, `results.condition`, `results.result` のみを処理する。これら以外のタグ名の要素は無視される。

### ケース5: `extractInstanceData()` で `instanceId` または `templateRef` がない場合にスキップ

```javascript
if (!instanceId || !templateRef) {
  console.warn('⚠️ インスタンスにIDまたはtemplateRef属性がありません');
  return null; // ← スキップされる
}
```

`@_id` または `@_ref` 属性が欠如しているインスタンスはスキップされる。

---

## 処理フロー全体図（`/save` エンドポイントとの比較）

| 処理 | `/upload-single` | `/save` |
|---|---|---|
| S3へのファイル保存 | ✅ uploadFileWithRetry | ✅ uploadFileWithRetry |
| file_metadataへの基本情報保存 | ✅ saveFileMetadata (UPSERT) | ✅ updateFileMetadata (既存時のみ) |
| MAIMLメタデータ抽出 (Data含む) | ✅ extractSingleFile | ✅ extractSingleFile |
| データレイクインジェスト | ✅ processFileAsync (非同期) | ✅ processFileAsync (非同期) |
| バッチ管理 | ✅ あり | ❌ なし |

---

## まとめ・推奨アクション

1. **サーバーログの確認**: アップロード時に `⚠️ MaiMLメタデータ抽出失敗` や `❌ MaiMLメタデータ抽出エラー` が出力されていないか確認する。

2. **DBスキーマ確認**: `file_metadata` テーブルに `maiml_data_instances` カラムが存在するか確認する。
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'file_metadata' AND column_name = 'maiml_data_instances';
   ```

3. **MAIMLファイル構造の確認**: 対象MAIMLファイルに `<maiml><data><results>...</results></data></maiml>` の構造が存在するか確認する。

4. **`parseDataElements()` のデバッグ**: `maimlParser.parseDataElements()` を対象ファイルに対して単体実行して、`instances` 配列が返ってくるか確認する。

5. **`extractInstanceData()` の条件確認**: 各インスタンスに `@_id` と `@_ref` 属性が正しく付与されているか確認する。
