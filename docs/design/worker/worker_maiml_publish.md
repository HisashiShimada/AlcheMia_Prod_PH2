# Worker仕様書: MaiML 公開 Worker (maimlPublishWorker)

**作成日**: 2026-03-13  
**最終更新**: 2026-03-18  
**バージョン**: 1.1.0  
**実装状況**: 実装済み

---

## 1. 概要

### 1.1 目的

BullMQ キュー `maiml-publish` からジョブを取得し、MaiML XML ファイルをパース・正規化して  
組織スキーマ（`{org_schema}.maiml_asset` およびその配下テーブル）へ格納する非同期 Worker。

### 1.2 起動・停止

| 関数 | 説明 |
|------|------|
| `startMaimlPublishWorker()` | Worker インスタンスを生成してキュー監視を開始する |
| `stopMaimlPublishWorker()` | Worker を停止し、処理中ジョブが完了するまで待機する |

バックエンドサーバー起動時に `startMaimlPublishWorker()` が呼ばれる。  
サーバー停止時に `stopMaimlPublishWorker()` が呼ばれる。

### 1.3 同時実行数

```typescript
concurrency: 2   // 最大 2 ジョブを並列処理
```

---

## 2. 処理フロー

```
BullMQ: maiml-publish キュー
        ↓
[Step 1] maiml_publish_job を status = running に更新
        ↓
[Step 2] Swift/S3 から MaiML XML をダウンロード（fileUri 使用）
        ↓
[Step 3] maimlIngestParserService.parseForIngest() で XML をパース
        ↓
[Step 4] 組織スキーマ存在確認（存在しなければエラー）
        ↓
[Step 5] 旧アセットが存在すれば CASCADE DELETE
        ↓
[Step 6a] maiml_asset INSERT（retention_until を計算）
[Step 6b] maiml_instance / maiml_element / maiml_element_value / maiml_insertion を INSERT
[Step 6c] maiml_template / maiml_template_element / maiml_template_element_value / maiml_template_insertion を INSERT
[Step 6d] maiml_event / maiml_event_element / maiml_event_element_value を INSERT
[Step 6e] retention_until 時刻に自動非公開 delayed Job を maiml-unpublish キューへ登録
        ↓
[Step 7] maiml_publish_job を status = done に更新（asset_id 設定）
        ↓
      完了
```

エラー発生時:
```
[StepX が失敗]
        ↓
maiml_publish_job を status = error / error_message に更新
        ↓
bullmq へ throw（bullmq が自動リトライ）
```

---

## 3. 各ステップ詳細

### Step 1: ジョブ状態を running に更新

```typescript
await publishJobRepo.updateStatus(jobId, 'running', {
  started_at: new Date(),
});
```

- `maiml_publish_job.status` を `pending` → `running` に変更
- `started_at` に現在時刻を設定

### Step 2: MaiML XML をダウンロード

```typescript
const storage = getStorageService();
const xmlBuffer = await storage.downloadFile(organizationId, fileUri);
const xmlString = xmlBuffer.toString('utf-8');
```

- `fileUri`: `projects/{projectName}/{projectName}.maiml`
- ストレージサービス経由で Swift/S3 からダウンロード
- バッファを UTF-8 文字列に変換

### Step 3: パース

```typescript
const parsed = await maimlIngestParserService.parseForIngest(xmlString);
```

- `maimlIngestParserService.parseForIngest()` が `ParsedMaimlData` を返す
- instance / element / element_value / insertion / template / template_element / template_element_value / template_insertion の各リストを取得

### Step 4: 組織スキーマ存在確認

```typescript
const org = await orgRepo.findById(organizationId);
if (!org) throw new Error(`Organization not found: ${organizationId}`);

const schemaExists = await assetRepo.schemaExists(organizationId);
if (!schemaExists) throw new Error(`組織スキーマが存在しません...`);
```

- 組織スキーマが存在しない場合はエラー（組織作成時の初期化失敗を検知）

### Step 5: 旧アセット削除

```typescript
const oldAsset = await assetRepo.findByProject(organizationId, projectName);
if (oldAsset?.asset_id !== undefined) {
  await assetRepo.deleteAsset(organizationId, oldAsset.asset_id);
}
```

- 再公開時に旧データを CASCADE DELETE（`maiml_asset` の ON DELETE CASCADE で関連テーブルも削除）

### Step 6a: maiml_asset INSERT

```typescript
const retentionDays = org.default_retention_days;
const retentionUntil = new Date();
retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

const asset = await assetRepo.insertAsset(organizationId, {
  file_uri:        fileUri,
  doc_name:        parsed.docName ?? null,
  retention_until: retentionUntil,
});
```

- `retention_until`: 組織設定の `default_retention_days` 日後に設定
- `doc_name`: MaiML の `<Doc name>` 属性値

### Step 6b: instance / element / element_value / insertion INSERT

**instance**:  
`parsed.instances` をループして `maiml_instance` に INSERT。  
`instance_key` → `instance_id` のマップを構築（後続の element 挿入で使用）。  
`results_id` は `data/results/@id` 属性値を格納し、`maiml_event.results_ref` との結合キーとなる。

**element**:  
`parsed.elements` をループして `maiml_element` に INSERT。  
`_tempId` → 実 `element_id` のマップを構築（parent_element_id の解決に使用）。

**element_value**:  
`parsed.elementValues` をループして `maiml_element_value` に INSERT。

**insertion**:  
`parsed.insertions` をループして `maiml_insertion` に INSERT。

### Step 6c: template / template_element / template_element_value / template_insertion INSERT

Step 6b と同じパターンでテンプレート系テーブルに INSERT。

### Step 6d: event / event_element / event_element_value INSERT

**event**:  
`parsed.events` をループして `maiml_event` に INSERT。  
`event_key`（`event/@id`）→ `event_id` のマップを構築。  
`results_ref` は `data/results/@id` を参照し、`maiml_instance.results_id` との結合キーとなる。

**event_element**:  
`parsed.eventElements` をループして `maiml_event_element` に INSERT。

**event_element_value**:  
`parsed.eventElementValues` をループして `maiml_event_element_value` に INSERT。

### Step 6e: 自動非公開 delayed Job 登録

```typescript
const delayMs = retentionUntil.getTime() - Date.now();
await maimlUnpublishQueue.add(
  'auto-unpublish',
  {
    jobId:          `auto-unpublish-${assetId}`,
    organizationId,
    projectName,
    assetId,
    triggerType:    'schedule',
  },
  {
    jobId:  `unpublish-${assetId}`,  // 重複登録防止
    delay:  Math.max(delayMs, 0),
  }
);
```

- `retention_until` に達したら自動的に `maiml-unpublish` キューへジョブが投入される
- BullMQ の `jobId` 重複チェックにより二重登録を防止

### Step 7: ジョブを done に更新

```typescript
await publishJobRepo.updateStatus(jobId, 'done', {
  finished_at: new Date(),
  asset_id:    assetId,
});
```

- `status` を `running` → `done` に変更
- `finished_at` に現在時刻、`asset_id` にアセット ID を設定

---

## 4. ジョブペイロード（PublishJobData）

```typescript
export interface PublishJobData {
  jobId:          string;   // maiml_publish_job.job_id（UUID）
  organizationId: string;   // 組織 ID
  projectName:    string;   // プロジェクト名
  fileUri:        string;   // Swift/S3 ファイルパス（org_id プレフィックスなし）
  userId?:        string | null;  // 操作ユーザー ID
}
```

---

## 5. エラーハンドリング

| エラー内容 | 処理 |
|-----------|------|
| 組織が存在しない | `error_message` を記録して `error` へ更新し throw |
| 組織スキーマが存在しない | `error_message` を記録して `error` へ更新し throw |
| ストレージ DL 失敗 | `error_message` を記録して `error` へ更新し throw |
| XML パース失敗 | `error_message` を記録して `error` へ更新し throw |
| DB INSERT 失敗 | `error_message` を記録して `error` へ更新し throw |
| delayed Job 登録失敗 | `error_message` を記録して `error` へ更新し throw |

- エラー後に `throw err` することで **BullMQ のリトライ機能** が発動する
- リトライ設定はキュー設定（`maimlPublishQueue`）の `defaultJobOptions` に依存

---

## 6. イベントハンドラー

| イベント | ログレベル | 説明 |
|---------|-----------|------|
| `completed` | `info` | ジョブ正常完了 |
| `failed` | `error` | ジョブ失敗（リトライ上限超過後） |
| `error` | `error` | Worker 自体のエラー（接続エラーなど） |

---

## 7. 格納先 DB テーブル（組織スキーマ）

| テーブル名 | 説明 |
|-----------|------|
| `{org_schema}.maiml_asset` | アセット（1 MaiML ファイル = 1 レコード） |
| `{org_schema}.maiml_instance` | MaiML の result / material / condition インスタンス |
| `{org_schema}.maiml_element` | インスタンス配下の要素（再帰的な親子構造） |
| `{org_schema}.maiml_element_value` | 要素の値（複数値対応、`value_idx` で順序管理） |
| `{org_schema}.maiml_insertion` | インスタンスの insertion（添付ファイル参照） |
| `{org_schema}.maiml_template` | MaiML テンプレート定義 |
| `{org_schema}.maiml_template_element` | テンプレート配下の要素 |
| `{org_schema}.maiml_template_element_value` | テンプレート要素の値 |
| `{org_schema}.maiml_template_insertion` | テンプレートの insertion |
| `{org_schema}.maiml_event` | MaiML の event（`results_ref` で maiml_instance と結合） |
| `{org_schema}.maiml_event_element` | event 配下の property 行 |
| `{org_schema}.maiml_event_element_value` | event property の値展開 |

> `{org_schema}` は組織 `organization_cd` を元に生成されたスキーマ名

---

## 8. retention_until（公開期限）

- `organization.default_retention_days` を使用（組織設定の保持日数）
- 公開時刻 + `default_retention_days` 日後に `retention_until` を設定
- `retention_until` 到達時に自動非公開 delayed Job が実行される（`maiml-unpublish` キュー）

---

## 9. 実装ファイル

| 種別 | ファイルパス |
|------|------------|
| Worker 本体 | `backend/src/workers/maimlPublishWorker.ts` |
| キュー定義 | `backend/src/queues/maimlPublishQueue.ts` |
| サービス | `backend/src/services/maimlPublishService.ts`（`enqueuePublish`） |
| パーサーサービス | `backend/src/services/maimlIngestParserService.ts` |
| アセットリポジトリ | `backend/src/repositories/maimlAssetRepository.ts` |
| ジョブリポジトリ | `backend/src/repositories/maimlPublishJobRepository.ts` |
| ストレージサービス | `backend/src/services/storageService.ts` |
| 型定義 | `backend/src/types/maimlOpenData.ts` |

---

## 10. 関連ドキュメント

- [API仕様: 公開・非公開 API](../api/api_maiml_opendata.md)
- [Worker仕様: 非公開 Worker](./worker_maiml_unpublish.md)
- [OpenData パイプライン設計書](../../MaiML_OpenData_Pipeline/spec.md) §9.2

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-03-18 | eventLog層（Step 6d）追加、maiml_instance.results_id 注記追加、§7 eventテーブル3件追加 | Cline |
| 1.0.0 | 2026-03-13 | 初版作成（実装済みソースコードから仕様を起こす） | Cline |
