# タスク計画書: 公開機能API連携化と非同期処理枠組み構築

## メタデータ
- **作成日時**: 2026-03-11 13:37
- **タスクID**: 公開機能API連携化と非同期処理枠組み
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## タスク概要

`docs/MaiML_OpenData_Pipeline/` の仕様書に基づき、以下の 2 つを実施する。

1. **既存公開機能の廃止・整理**  
   現在 `projectController.ts` の `publish` / `unpublish` が `maimlIngestService` を直接（同期）呼び出して KV 抽出・DB 挿入まで完結している。  
   仕様書（`spec.md`）では「API は DB 登録とジョブ投入のみ行い 202 を返す」方針が確定しているため、**同期処理部分を廃止**し、API 連携部分（DB 登録 + レスポンス返却）のみを残す。

2. **非同期処理の枠組み作成（bullmq）**  
   仕様書 §2 / §9 に定義された bullmq ベースの非同期処理骨格（Queue 定義・Worker 定義・Redis 設定）を **スタブとして実装**する。  
   Worker 本体のロジック（XML 解析・DB 挿入）は DB テーブル構成確定後に実装するため、今回は枠組みのみ作成する。

---

## 目的と期待される成果

### 目的
- 同期実行による API タイムアウトリスクを排除する
- 仕様書通りのアーキテクチャ（202 Accepted + bullmq 非同期）に整合させる
- 今後の Worker 実装を差し込みやすい土台を作る

### 期待される成果
- [ ] `projectController.publish` / `unpublish` が 202 を返す骨格になっている
- [ ] `maimlOpenDataController.ts`（別エンドポイント）の同期処理部分が廃止されている
- [ ] `maimlIngestService.ts` に `requestPublish()` / `requestUnpublish()` スタブがある
- [ ] `backend/src/config/redis.ts`（bullmq 用 Redis 接続設定）が作成されている
- [ ] `backend/src/queues/maimlPublishQueue.ts` / `maimlUnpublishQueue.ts` が作成されている
- [ ] `backend/src/workers/maimlPublishWorker.ts` / `maimlUnpublishWorker.ts` スタブが作成されている
- [ ] `backend/src/server.ts` に Worker 起動処理が追加されている
- [ ] マイグレーション: `maiml_publish_job` テーブルが追加されている

---

## 現状分析

### 廃止・変更が必要な実装

#### 1. `backend/src/controllers/projectController.ts`

**`publish` 関数（現状）:**
```
projectController.publish()
  → projectService.getProjectMaiml() でファイルパス取得
  → maimlIngestService.publishMaiml() を同期呼び出し（KV抽出・DB挿入まで完結）
  → 201 Created を返す
```

**変更後:**
```
projectController.publish()
  → projectService.getProjectMaiml() でファイルパス取得
  → maimlIngestService.requestPublish() を呼ぶ（DB登録 + ジョブ投入のみ）
  → 202 Accepted を返す
```

**`unpublish` 関数（現状）:**
```
projectController.unpublish()
  → projectService.getProjectMaiml() でファイルパス取得
  → maimlIngestService.getPublishStatus() で asset_id 取得
  → maimlIngestService.unpublishMaiml() を同期呼び出し（DB削除まで完結）
  → 200 OK を返す
```

**変更後:**
```
projectController.unpublish()
  → projectService.getProjectMaiml() でファイルパス取得
  → maimlIngestService.requestUnpublish() を呼ぶ（ジョブ投入のみ）
  → 202 Accepted を返す
```

#### 2. `backend/src/controllers/maimlOpenDataController.ts`

現在 `/api/v1/maiml-opendata/` エンドポイントを定義しているが、`spec.md` のエンドポイント仕様は `/api/v1/projects/:projectName/publish` 系のみ（`projectRoutes.ts` 経由）。  
`maimlOpenDataController.ts` は**同期処理の呼び出しコードを削除**し、コントローラーとして不要になるため廃止候補だが、ルート登録状況を確認の上で判断する。  
→ `server.ts` に登録されているか確認し、登録されていれば**ルート削除 + ファイルは廃止コメント追記**で対応する。

#### 3. `backend/src/services/maimlIngestService.ts`

現在 `publishMaiml()` が同期で XML 解析・DB 挿入まで完結している。

**変更方針:**
- `publishMaiml()` → **関数は残すが内部処理を全削除**し TODO スタブ化（DB テーブル構成が変わるため旧実装は廃棄）
- `unpublishMaiml()` → **同上**（関数は残すが内部処理を全削除し TODO スタブ化）
- 新規追加: `requestPublish()` … TODO スタブ（bullmq キュー投入と DB 登録は後で実装）
- 新規追加: `requestUnpublish()` … TODO スタブ（同上）
- `getPublishStatus()` → **継続利用**（ポーリング用）

#### 4. `backend/migrations/20260310_create_maiml_opendata_tables.sql`

現在 `maiml_series_preview` テーブルが含まれているが、`MaiML_OpenData_Pipeline_BasicDesign_v1.5` §12 で「プレビュー機能を廃止」が決定事項になっている。  
また、DB テーブル構成は `db.md` が確定版として存在し、`maiml_asset` / `maiml_instance` / `maiml_element` 等の構造が異なる。  
→ **今回はマイグレーション改修は行わない**（DB テーブル確定後の別タスクとして扱う）。  
→ `maiml_publish_job` テーブルの追加マイグレーションのみ作成する（bullmq の補完的な進捗管理用）。

---

## 実装ステップ

### Phase 1: `maimlIngestService.ts` のリファクタリング
- [ ] `publishMaiml()` 関数を廃止（削除ではなく、関数本体をスタブ化 + `@deprecated` コメント追記）
- [ ] `unpublishMaiml()` 関数を廃止（同上）
- [ ] `requestPublish(organizationId, fileUri, options)` を新規追加（スタブ: DB 登録 + TODO コメント）
- [ ] `requestUnpublish(organizationId, assetId, mode)` を新規追加（スタブ: TODO コメント）
- [ ] `getPublishStatus()` は変更なし

### Phase 2: `projectController.ts` の変更
- [ ] `publish` 関数: `maimlIngestService.requestPublish()` を呼ぶよう変更し、202 Accepted を返すように修正
- [ ] `unpublish` 関数: `maimlIngestService.requestUnpublish()` を呼ぶよう変更し、202 Accepted を返すように修正
- [ ] `getPublishStatus` 関数: 変更なし（そのまま継続）

### Phase 3: `maimlOpenDataController.ts` の廃止処理
- [ ] `server.ts` に `maimlOpenDataController` のルート登録があるか確認
- [ ] 登録がある場合: `server.ts` からルート登録を削除
- [ ] `maimlOpenDataController.ts` のファイル先頭に廃止コメントを追記し、関数本体をスタブ化

### Phase 4: bullmq 用 Redis 設定作成
- [ ] `backend/src/config/redis.ts` を新規作成
  - `IORedis` クライアントを生成するファクトリ関数
  - 接続パラメータは環境変数（`REDIS_HOST` / `REDIS_PORT`）から取得
  - 既存 `redisConnectionService.ts` の実装パターンを参考にする

### Phase 5: Queue 定義ファイル作成
- [ ] `backend/src/queues/maimlPublishQueue.ts` を新規作成
  - bullmq の `Queue` インスタンスを export
  - キュー名: `maiml-publish`
- [ ] `backend/src/queues/maimlUnpublishQueue.ts` を新規作成
  - bullmq の `Queue` インスタンスを export
  - キュー名: `maiml-unpublish`

### Phase 6: Worker スタブ作成
- [ ] `backend/src/workers/maimlPublishWorker.ts` を新規作成
  - bullmq の `Worker` を使ったスタブ実装
  - ジョブデータ型の定義（`PublishJobData`）
  - `processor` 関数は TODO コメントのみ（本体は別タスク）
  - エラーハンドリングの枠組みのみ実装
- [ ] `backend/src/workers/maimlUnpublishWorker.ts` を新規作成（同上）

### Phase 7: `server.ts` に Worker 起動処理を追加
- [ ] `server.ts` を確認し、Worker 起動箇所（`startWorkers()` 等）を追加
- [ ] 開発環境では Redis 未起動時でもサーバーが起動できるよう接続エラーを try-catch

### Phase 8: `maiml_publish_job` テーブルの追加マイグレーション作成
- [ ] `backend/migrations/YYYYMMDD_create_maiml_publish_job.sql` を新規作成
  - `BasicDesign v1.5` §6.3 の DDL を使用
  - `maiml_publish_job` テーブル: `job_id(UUID PK)` / `job_type` / `asset_id` / `registry_id` / `status` / `triggered_by` / `trigger_type` / `error_message` / `started_at` / `finished_at` / `created_at`
  - インデックス: `status` / `asset_id` / `(job_type, status)`

---

## 変更ファイル

### 変更（修正）
1. `backend/src/controllers/projectController.ts`
   - `publish()`: 202 Accepted 返却・`requestPublish()` 呼び出しに変更
   - `unpublish()`: 202 Accepted 返却・`requestUnpublish()` 呼び出しに変更
2. `backend/src/services/maimlIngestService.ts`
   - `publishMaiml()` / `unpublishMaiml()` をスタブ化（`@deprecated`）
   - `requestPublish()` / `requestUnpublish()` を追加
3. `backend/src/server.ts`
   - Worker 起動処理の追加
   - `maimlOpenDataController` ルート登録削除（登録があった場合）

### 新規作成
4. `backend/src/config/redis.ts`（bullmq 用 Redis 接続設定）
5. `backend/src/queues/maimlPublishQueue.ts`
6. `backend/src/queues/maimlUnpublishQueue.ts`
7. `backend/src/workers/maimlPublishWorker.ts`（スタブ）
8. `backend/src/workers/maimlUnpublishWorker.ts`（スタブ）
9. `backend/migrations/20260311_create_maiml_publish_job.sql`

### 廃止処理（削除ではなく廃止コメント追記）
10. `backend/src/controllers/maimlOpenDataController.ts`
    - ファイル先頭に `@deprecated` コメントを追記
    - 関数本体をスタブ化（処理を削除し、503 or 410 を返すのみ）

---

## 技術的詳細

### bullmq 依存確認

現在の `package.json` に `bullmq` が含まれているかどうかを確認する。  
含まれていない場合はインストールが必要（`npm install bullmq`）。

### `requestPublish()` スタブ実装イメージ

```typescript
/**
 * 公開リクエスト（非同期処理の入口）
 * Worker が実装されるまでは DB 登録のみ行う
 */
export async function requestPublish(
  organizationId: string,
  fileUri: string,
  options: PublishRequest
): Promise<{ asset_id: number; registry_id: number; status: string }> {
  // TODO: maiml_asset INSERT
  // TODO: maiml_publish_registry INSERT (status='requested')
  // TODO: bullmq キューにジョブ投入
  throw new Error('requestPublish は未実装です（bullmq Worker 実装待ち）');
}
```

> **注意:** スタブ段階では `throw` するのではなく、「未実装」ステータスを返す実装にする。  
> 具体的には `maiml_asset` と `maiml_publish_registry` の INSERT まで実装し、キュー投入部分を TODO コメントにする。

### ジョブデータ型

```typescript
// backend/src/workers/maimlPublishWorker.ts
export interface PublishJobData {
  organizationId: string;
  fileUri:        string;
  assetId:        number;
  registryId:     number;
  options: {
    template_only:         boolean;
    store_raw_series:      boolean;
    keep_raw_on_unpublish: boolean;
    retention_until:       string | null;
  };
}
```

### Redis 設定パターン

```typescript
// backend/src/config/redis.ts
import IORedis from 'ioredis';

export function createRedisConnection(): IORedis {
  return new IORedis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    maxRetriesPerRequest: null, // bullmq 推奨設定
  });
}
```

### `maiml_publish_job` テーブル DDL（BasicDesign v1.5 §6.3）

```sql
CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT          NOT NULL CHECK (job_type IN ('publish', 'unpublish')),
  asset_id        BIGINT        REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE SET NULL,
  registry_id     BIGINT,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','running','done','error')),
  triggered_by    TEXT,
  trigger_type    TEXT          NOT NULL DEFAULT 'manual'
                                CHECK (trigger_type IN ('manual','schedule')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_publish_job_status    ON maiml_publish.maiml_publish_job(status);
CREATE INDEX IF NOT EXISTS ix_publish_job_asset     ON maiml_publish.maiml_publish_job(asset_id);
CREATE INDEX IF NOT EXISTS ix_publish_job_type      ON maiml_publish.maiml_publish_job(job_type, status);
```

---

## スコープ外（今回は対応しない）

| 項目 | 理由 |
|------|------|
| Worker 本体ロジック（XML 解析・DB 挿入） | DB テーブル構成（`db.md`）が `pending.md` のスキーマ命名規則確定待ちのため |
| `maiml_series_preview` テーブル廃止マイグレーション | DB 再設計タスクで一括対応 |
| フロントエンドのポーリング実装 | バックエンドの非同期処理完成後に別タスクで対応 |
| `batch/unpublish/` の bullmq 移行 | 既存バッチは動作中のため別タスクで対応 |
| `maimlOpenDataController.ts` の物理削除 | 参照箇所が残っている可能性があるため廃止コメントのみ |

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `bullmq` パッケージ未インストール | 中 | Phase 4 の前に `package.json` を確認し、必要なら `npm install bullmq` |
| `maimlIngestService.publishMaiml()` を参照している箇所が他にもある | 中 | `grep` で全参照箇所を確認してから廃止処理を実施 |
| `maiml_publish_job` のスキーマ（`maiml_publish` スキーマ内か public スキーマか） | 低 | 既存マイグレーションに合わせて `maiml_publish` スキーマ内に配置 |
| Worker スタブが未実装のまま本番デプロイされる | 中 | コメントで「Worker 未実装」を明記し、公開ボタン押下時にフロントエンドへ「処理中」ステータスを返す |

---

## テスト計画

### 手動テスト
- [ ] `POST /api/v1/projects/:projectName/publish` → 202 Accepted を返すことを確認
- [ ] `POST /api/v1/projects/:projectName/unpublish` → 202 Accepted を返すことを確認
- [ ] `GET /api/v1/projects/:projectName/publish-status` → 変わらず動作することを確認
- [ ] サーバー起動時に Redis 未起動でも起動できることを確認（エラーログは出てもサーバーはクラッシュしない）

---

## 承認記録

- **計画書提示日時**: 2026-03-11 13:37
- **承認日時**: ―
- **承認者コメント**: ―
