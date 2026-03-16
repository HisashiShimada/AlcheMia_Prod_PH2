# Worker仕様書: MaiML 非公開 Worker (maimlUnpublishWorker)

**作成日**: 2026-03-13  
**最終更新**: 2026-03-13  
**バージョン**: 1.0.0  
**実装状況**: 実装済み

---

## 1. 概要

### 1.1 目的

BullMQ キュー `maiml-unpublish` からジョブを取得し、  
組織スキーマの `{org_schema}.maiml_asset` レコードを CASCADE DELETE して  
公開済みアセットをすべて削除する非同期 Worker。

### 1.2 起動・停止

| 関数 | 説明 |
|------|------|
| `startMaimlUnpublishWorker()` | Worker インスタンスを生成してキュー監視を開始する |
| `stopMaimlUnpublishWorker()` | Worker を停止し、処理中ジョブが完了するまで待機する |

バックエンドサーバー起動時に `startMaimlUnpublishWorker()` が呼ばれる。  
サーバー停止時に `stopMaimlUnpublishWorker()` が呼ばれる。

### 1.3 同時実行数

```typescript
concurrency: 1   // 非公開は 1 ジョブずつ直列処理
```

### 1.4 トリガー種別

| `trigger_type` | 発生元 |
|---------------|-------|
| `manual` | ユーザーが「非公開にする」ボタンを押して `POST /unpublish` を呼び出した場合 |
| `schedule` | 公開 Worker が `retention_until` 時刻に登録した delayed Job が実行される場合 |

---

## 2. 処理フロー

```
BullMQ: maiml-unpublish キュー
        ↓
[Step 1] maiml_publish_job を status = running に更新
        ↓
[Step 2] maiml_asset を CASCADE DELETE（asset_id 指定）
         ※ ON DELETE CASCADE により関連テーブルも自動削除
        ↓
[Step 3] maiml_publish_job を status = done に更新
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

### Step 2: maiml_asset を CASCADE DELETE

```typescript
await assetRepo.deleteAsset(organizationId, assetId);
```

- `{org_schema}.maiml_asset` を `asset_id` で削除
- `ON DELETE CASCADE` により以下の関連テーブルが自動削除される:
  - `maiml_instance`
  - `maiml_element`（`maiml_instance` 経由）
  - `maiml_element_value`（`maiml_element` 経由）
  - `maiml_insertion`（`maiml_instance` 経由）
  - `maiml_template`
  - `maiml_template_element`（`maiml_template` 経由）
  - `maiml_template_element_value`（`maiml_template_element` 経由）
  - `maiml_template_insertion`（`maiml_template` 経由）

### Step 3: ジョブを done に更新

```typescript
await publishJobRepo.updateStatus(jobId, 'done', {
  finished_at: new Date(),
});
```

- `status` を `running` → `done` に変更
- `finished_at` に現在時刻を設定
- 公開 Worker と異なり `asset_id` の設定はなし（削除済みのため）

---

## 4. ジョブペイロード（UnpublishJobData）

```typescript
export interface UnpublishJobData {
  jobId:          string;          // maiml_publish_job.job_id（UUID）
  organizationId: string;          // 組織 ID
  projectName:    string;          // プロジェクト名
  assetId:        bigint;          // 削除対象アセット ID
  triggerType:    'manual' | 'schedule';  // トリガー種別
  userId?:        string | null;   // 操作ユーザー ID（schedule 時は null）
}
```

### 手動実行時（manual）の jobId 形式

```
{UUID}   例: "550e8400-e29b-41d4-a716-446655440000"
```

`maimlPublishService.enqueueUnpublish()` で DB に INSERT した `job_id` と同一。

### 自動実行時（schedule）の jobId 形式

```
auto-unpublish-{assetId}   例: "auto-unpublish-42"
```

BullMQ の `jobId` は `unpublish-{assetId}` として登録（重複防止）。

---

## 5. エラーハンドリング

| エラー内容 | 処理 |
|-----------|------|
| アセット削除失敗（DB エラー） | `error_message` を記録して `error` へ更新し throw |
| ジョブ更新失敗 | `error_message` を記録して `error` へ更新し throw |

- エラー後に `throw err` することで **BullMQ のリトライ機能** が発動する
- リトライ設定はキュー設定（`maimlUnpublishQueue`）の `defaultJobOptions` に依存

---

## 6. イベントハンドラー

| イベント | ログレベル | 説明 |
|---------|-----------|------|
| `completed` | `info` | ジョブ正常完了 |
| `failed` | `error` | ジョブ失敗（リトライ上限超過後） |
| `error` | `error` | Worker 自体のエラー（接続エラーなど） |

---

## 7. 削除対象 DB テーブル（組織スキーマ）

`maiml_asset` の CASCADE DELETE により以下がすべて削除される。

| テーブル名 | 削除方式 |
|-----------|---------|
| `{org_schema}.maiml_asset` | 直接 DELETE |
| `{org_schema}.maiml_instance` | CASCADE（`asset_id` FK） |
| `{org_schema}.maiml_element` | CASCADE（`instance_id` FK） |
| `{org_schema}.maiml_element_value` | CASCADE（`element_id` FK） |
| `{org_schema}.maiml_insertion` | CASCADE（`instance_id` FK） |
| `{org_schema}.maiml_template` | CASCADE（`asset_id` FK） |
| `{org_schema}.maiml_template_element` | CASCADE（`template_id` FK） |
| `{org_schema}.maiml_template_element_value` | CASCADE（`element_id` FK） |
| `{org_schema}.maiml_template_insertion` | CASCADE（`template_id` FK） |

> `public.maiml_publish_job` レコードは削除されない（ジョブ履歴として保持）

---

## 8. スケジュール実行（自動非公開）

公開 Worker（`maimlPublishWorker`）が公開処理完了後に  
`retention_until` 時刻を delay として BullMQ に delayed Job を登録する。

```typescript
// maimlPublishWorker.ts の Step 6d より
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
    jobId:  `unpublish-${assetId}`,   // 重複防止
    delay:  Math.max(delayMs, 0),     // retention_until - 現在時刻（ms）
  }
);
```

- `delayMs` が負数（`retention_until` が過去）の場合は即時実行（`delay: 0`）
- `jobId: unpublish-{assetId}` により同一アセットの重複登録を防止

---

## 9. 手動実行と自動実行の違い

| 項目 | 手動（manual） | 自動（schedule） |
|-----|--------------|----------------|
| 発火元 | ユーザー操作 | 公開 Worker の delayed Job |
| `trigger_type` | `manual` | `schedule` |
| `triggered_by` | ユーザー ID | `null` |
| `maiml_publish_job` 作成 | `enqueueUnpublish()` が INSERT | 公開 Worker の Step 6d が直接 enqueue |
| `jobId` 形式 | UUID | `auto-unpublish-{assetId}` |

> **注意**: 自動実行時は `maiml_publish_job` の DB レコードが作成されない場合がある。  
> Worker は `jobId` を使って `updateStatus` を呼ぶため、  
> レコードが存在しない場合は `updateStatus` が空の UPDATE になる（エラーにはならない）。

---

## 10. 実装ファイル

| 種別 | ファイルパス |
|------|------------|
| Worker 本体 | `backend/src/workers/maimlUnpublishWorker.ts` |
| キュー定義 | `backend/src/queues/maimlUnpublishQueue.ts` |
| サービス | `backend/src/services/maimlPublishService.ts`（`enqueueUnpublish`） |
| アセットリポジトリ | `backend/src/repositories/maimlAssetRepository.ts` |
| ジョブリポジトリ | `backend/src/repositories/maimlPublishJobRepository.ts` |
| 型定義 | `backend/src/types/maimlOpenData.ts` |

---

## 11. 関連ドキュメント

- [API仕様: 公開・非公開 API](../api/api_maiml_opendata.md)
- [Worker仕様: 公開 Worker](./worker_maiml_publish.md)
- [OpenData パイプライン設計書](../../MaiML_OpenData_Pipeline/spec.md) §9.3

---

## 12. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-03-13 | 初版作成（実装済みソースコードから仕様を起こす） | Cline |
