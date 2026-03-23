# maiml_publish_job テーブル 運用まとめ

> 作成日: 2026-03-13  
> 対象コード: `backend/src/` 配下の公開・非公開関連ファイル  
> 参照設計書: `docs/MaiML_OpenData_Pipeline/spec.md` / `db.md`

---

## 1. テーブル概要

### どこに存在するか

```
PostgreSQL
└── public スキーマ（全組織共通）
    └── maiml_publish_job   ← このテーブルが対象
```

> ⚠️ **旧テーブルとの混同に注意**  
> `backend/migrations/20260310_create_maiml_opendata_tables.sql` には `maiml_publish スキーマ` 内に  
> 同名の `maiml_publish.maiml_publish_job` が定義されているが、これは**廃止された旧設計**。  
> 現在使用されているのは `public.maiml_publish_job`（`20260313_create_maiml_opendata_new_schema.sql` で作成）のみ。

---

## 2. テーブル定義

```sql
CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT        NOT NULL CHECK (job_type IN ('publish', 'unpublish')),
  organization_id TEXT        NOT NULL,
  project_name    TEXT        NOT NULL,
  asset_id        BIGINT,     -- ⚠️ FK なし（組織スキーマ間制約不可）
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'running', 'done', 'error')),
  triggered_by    TEXT,       -- NULL = スケジュール自動実行
  trigger_type    TEXT        NOT NULL DEFAULT 'manual'
                              CHECK (trigger_type IN ('manual', 'schedule')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### カラム一覧と補足

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `job_id` | UUID | ✅ | PK。bullmq の Job ID としても使用（両者を統一） |
| `job_type` | TEXT | ✅ | `publish`（公開）or `unpublish`（非公開） |
| `organization_id` | TEXT | ✅ | 対象組織 ID |
| `project_name` | TEXT | ✅ | 対象プロジェクト名 |
| `asset_id` | BIGINT | ❌ | **公開ジョブ**: 完了後に Worker が書き込む / **非公開ジョブ**: INSERT 時点で設定済み |
| `status` | TEXT | ✅ | ジョブステータス（後述） |
| `triggered_by` | TEXT | ❌ | 操作ユーザー ID。スケジュール実行時は NULL |
| `trigger_type` | TEXT | ✅ | `manual`（UI操作）or `schedule`（自動） |
| `error_message` | TEXT | ❌ | `status='error'` 時のみ設定 |
| `started_at` | TIMESTAMPTZ | ❌ | Worker が処理を開始した日時 |
| `finished_at` | TIMESTAMPTZ | ❌ | Worker が処理を完了（または失敗）した日時 |
| `created_at` | TIMESTAMPTZ | ✅ | ジョブ登録日時（auto） |

---

## 3. ステータス遷移

```
pending  →  running  →  done
                     ↘  error
```

| 値 | 意味 | 設定タイミング |
|----|------|--------------|
| `pending` | 登録済み・未処理 | API 呼び出し時（Service 層の INSERT） |
| `running` | Worker 処理中 | Worker 開始直後 |
| `done` | 正常完了 | Worker 完了時 |
| `error` | 異常終了 | Worker 例外キャッチ時。`error_message` も同時設定 |

---

## 4. asset_id の扱い（重要）

`asset_id` は `job_type` によって **設定タイミングが異なる**。

### 4.1 公開ジョブ（job_type = 'publish'）

```
INSERT 時: asset_id = NULL

    ↓ Worker が maiml_asset を挿入

完了時: asset_id = <新規作成されたasset_id>  ← updateStatus() で後から書き込み
```

### 4.2 非公開ジョブ（job_type = 'unpublish'）

```
INSERT 時: asset_id = <削除対象のasset_id>  ← 最初から設定済み

    ↓ Worker が maiml_asset を CASCADE DELETE

完了時: asset_id は変わらない（削除済みの asset_id が記録として残る）
```

> **なぜ FK がないか:**  
> `maiml_publish_job` は `public` スキーマに存在するが、`maiml_asset` は組織専用スキーマ（例: `550e8400_e29b_41d4_a716_446655440000`）に存在する。  
> PostgreSQL はクロススキーマ FK 制約をサポートしないため、FK なしの `BIGINT` としている。  
> 整合性は Worker がアプリケーション側で管理する。

---

## 5. 公開処理フロー（詳細）

```
① ユーザーが「公開」ボタン押下
    ↓
② API (POST /projects/:projectName/publish)
    ├── 重複チェック: 最新ジョブが pending/running なら → 409 ALREADY_IN_PROGRESS
    ├── ファイル存在確認: Swift/S3 に .maiml ファイルがなければ → 404 MAIML_NOT_FOUND
    ├── maiml_publish_job INSERT
    │     job_type='publish', status='pending', asset_id=NULL, triggered_by=userId
    ├── bullmq キューに投入 (job_id = DB の job_id で統一)
    └── 202 Accepted を返す (job_id を含む)
    ↓
③ bullmq Worker (maimlPublishWorker)
    ├── maiml_publish_job.status → 'running', started_at を更新
    ├── Swift/S3 から MaiML XML をダウンロード
    ├── DOM パース (maimlIngestParserService)
    ├── 組織スキーマ確認（存在しなければエラー）
    ├── 旧アセット削除（同プロジェクトの古いデータを先に削除）
    ├── maiml_asset INSERT → instance / element / element_value / insertion / template … INSERT
    ├── retention_until を算出し delayed Job（自動非公開）を bullmq に登録
    └── maiml_publish_job.status → 'done', asset_id = 新しい asset_id, finished_at を更新
    ↓
④ フロントエンドがポーリング (GET /publish-status) で 'done' を検知 → 完了表示
```

**エラー時:**
```
Worker が例外をキャッチ
    ├── maiml_publish_job.status → 'error', error_message を設定, finished_at を更新
    └── bullmq にリスロー → bullmq がリトライ（最大3回、exponential backoff 5秒〜）
```

---

## 6. 非公開処理フロー（詳細）

### 6.1 即時非公開（UIボタン押下）

```
① ユーザーが「非公開」ボタン押下
    ↓
② API (POST /projects/:projectName/unpublish)
    ├── 公開済みアセット確認: findPublishedAssetId() → null なら → 404 NOT_PUBLISHED
    ├── 重複チェック: 最新ジョブが pending/running なら → 409 ALREADY_IN_PROGRESS
    ├── maiml_publish_job INSERT
    │     job_type='unpublish', status='pending', asset_id=<対象assetId>, triggered_by=userId
    ├── bullmq キューに投入 (job_id = DB の job_id で統一)
    └── 202 Accepted を返す (job_id を含む)
    ↓
③ bullmq Worker (maimlUnpublishWorker)
    ├── maiml_publish_job.status → 'running', started_at を更新
    ├── 組織スキーマの maiml_asset を CASCADE DELETE
    │     → ON DELETE CASCADE により全関連テーブルも自動削除
    └── maiml_publish_job.status → 'done', finished_at を更新
    ↓
④ フロントエンドがポーリングで 'done' を検知 → 完了表示
```

### 6.2 スケジュール非公開（自動）

**パターン A: 公開 Worker が登録する delayed Job**
```
公開 Worker の処理完了時
    └── bullmq に delayed Job を追加
          jobId = `unpublish-{asset_id}`（重複防止）
          delay = retention_until - now()（期限まで待機）
          triggerType = 'schedule'
```
> ⚠️ スケジュール非公開では **maiml_publish_job の INSERT は行われない**。  
> Unpublish Worker が bullmq からジョブを受け取るとき、  
> `job.data.jobId` = `auto-unpublish-{asset_id}` の形式になっており、  
> Worker はこの `jobId` を使って `maiml_publish_job.updateStatus()` を呼ぶ。  
> → **ただし DB にレコードが存在しない**ため、UPDATE は 0行更新になる（無害）。

**パターン B: Scanner Worker によるリカバリ**
```
毎日 0 時（Repeat Job）
    ├── 全組織スキーマの maiml_asset（retention_until IS NOT NULL）を取得
    ├── 各アセットに対し bullmq で既存 Job を確認
    │     ├── Job あり → スキップ
    │     ├── retention_until <= now() かつ Job なし → 即時投入（delay=0）
    │     └── retention_until > now() かつ Job なし → delayed Job 再登録
    └── trigger_type = 'schedule' で投入
```

---

## 7. 「公開中かどうか」の判定ロジック

フロントエンドの公開/非公開ボタン切替、API の重複チェックなどで使用する。

### 判定方法: `findPublishedAssetId()` (maimlPublishJobRepository.ts)

```sql
-- 最新の done ジョブを取得
SELECT job_type, asset_id
FROM maiml_publish_job
WHERE organization_id = $1
  AND project_name    = $2
  AND status          = 'done'
ORDER BY created_at DESC
LIMIT 1
```

| 結果 | 公開状態の判断 |
|------|-------------|
| レコードなし | 未公開（null を返す） |
| 最新 done ジョブが `job_type='publish'` | **公開中** (asset_id を返す) |
| 最新 done ジョブが `job_type='unpublish'` | **非公開済み** (null を返す) |

> **ポイント:** `maiml_asset` テーブルを直接見に行くのではなく、`maiml_publish_job` の履歴（最新 done ジョブのタイプ）で公開状態を判断している。

### 即時非公開時の asset_id 取得フロー

`enqueueUnpublish()` が `maiml_publish_job` から asset_id を取得する流れ：

```
【公開 Worker が完了したとき】
  maiml_publish_job (job_type='publish', status='done')
      └─ asset_id = <新規作成された maiml_asset.asset_id>  ← Worker が書き込む

        ↑ この値を再利用

【即時非公開ボタン押下時】
  enqueueUnpublish()
      └─ findPublishedAssetId() で maiml_publish_job を検索
      └─ asset_id を取得
      └─ 新しい unpublish ジョブの INSERT 時に asset_id として設定
```

**`maiml_asset` テーブルは参照しない。** 公開 Worker が `done` 時に `maiml_publish_job.asset_id` へ書き戻した値のみを使う。

---

## 8. ステータス確認 API のレスポンス

`GET /api/v1/projects/:projectName/publish-status`

```typescript
// ジョブ履歴なし（未公開）の場合
{
  job_id: null,
  job_type: null,
  status: null,
  asset_id: null,
  project_name: "sample_project",
  started_at: null,
  finished_at: null,
  error_message: null
}

// 処理中 or 完了の場合
{
  job_id: "550e8400-...",
  job_type: "publish",   // or "unpublish"
  status: "done",        // pending / running / done / error
  asset_id: 123,         // 公開完了後に設定。pending/running 中は null の場合あり
  project_name: "sample_project",
  started_at: "2026-03-12T05:00:00Z",
  finished_at: "2026-03-12T05:00:10Z",
  error_message: null
}
```

---

## 9. インデックス

```sql
-- 組織 + プロジェクト名での検索（ポーリング・重複チェックで使用）
CREATE INDEX ix_publish_job_org_project ON maiml_publish_job(organization_id, project_name);

-- ステータスでの検索
CREATE INDEX ix_publish_job_status ON maiml_publish_job(status);

-- job_type + status の複合検索
CREATE INDEX ix_publish_job_type_status ON maiml_publish_job(job_type, status);
```

---

## 10. bullmq との関係

| 項目 | bullmq (Redis) | maiml_publish_job (DB) |
|------|---------------|----------------------|
| **役割** | 非同期実行キュー（実際の処理予約） | 状態の永続的記録（ポーリング・履歴） |
| **job_id** | bullmq のジョブ ID | DB の `job_id` (UUID) |
| **統一** | ✅ 両者で同じ UUID を使用 | ✅ DB の job_id = bullmq の jobId |
| **リトライ** | 最大 3 回 / exponential backoff（5秒〜） | `status='error'` が残る（リトライ後成功すれば `done` に更新） |
| **Job 消滅時** | Redis データが消えても DB は残る | Scanner Worker が毎日 0 時にリカバリ |

---

## 11. 注意事項・よくある誤解

### ① 旧テーブル（maiml_publish スキーマ）との混同

`20260310_create_maiml_opendata_tables.sql` に定義されている以下のテーブルは **廃止**:
- `maiml_publish.maiml_publish_job`
- `maiml_publish.maiml_asset`
- `maiml_publish.maiml_publish_registry`
- `maiml_publish.maiml_condition_kv` / `maiml_material_kv`
- `maiml_publish.maiml_series_preview` / `maiml_series_raw_*`

現在使用するのは `public.maiml_publish_job` と組織スキーマの `maiml_asset` 等のみ。

### ② スケジュール非公開の DB レコード

delayed Job / Scanner リカバリ Job による非公開では、**`maiml_publish_job` へのレコード INSERT は行われない**。  
Unpublish Worker の `updateStatus()` 呼び出しは 0行更新となる（エラーにはならない）。

### ③ asset_id の FK なし

`maiml_publish_job.asset_id` は FK 制約なし。  
非公開完了後も `asset_id` の値は残るが、それは**削除済みアセットの ID**（孤立値）であり正常動作。

### ⑤ 即時非公開時の delayed Job 削除について

現状の実装では、即時非公開を実行しても **bullmq の delayed Job（`unpublish-{asset_id}`）は削除されない**。

**実際の挙動:**
```
① 即時非公開 → Unpublish Worker が maiml_asset を CASCADE DELETE → done
   Redis の delayed Job (unpublish-{asset_id}) は残ったまま

② retention_until になったら delayed Job が自動実行される
   → deleteAsset() で DELETE WHERE asset_id = {asset_id} を実行
   → 対象行なし → pgp.none() なので 0行削除でもエラーにならない（no-op）
   → maiml_publish_job レコードも存在しないので updateStatus() も 0行更新（無害）
   → Worker は正常完了扱いになる
```

| 懸念 | 実際 |
|------|------|
| delayed Job が残ったまま再実行される | ✅ される |
| エラーが出るか | ❌ 出ない（no-op） |
| 実害はあるか | ❌ ない（無駄な処理が走るのみ） |

> **改善余地:** `enqueueUnpublish()` 内で `maimlUnpublishQueue.getJob('unpublish-{assetId}')` を呼び出して削除する処理を追加すると、より正確な設計になる。

---

### ④ 公開中の再公開は禁止

既に `maiml_asset` が存在する状態で公開 API を呼ぶと、Worker が旧アセットを自動削除した上で新規アセットを登録する（再公開相当）。  
ただし API 側でも `pending/running` ジョブが存在すれば `409 ALREADY_IN_PROGRESS` を返す。

---

## 12. 関連ファイル一覧

| ファイル | 役割 |
|---------|------|
| `backend/migrations/20260313_create_maiml_opendata_new_schema.sql` | `maiml_publish_job` テーブル DDL（現行） |
| `backend/migrations/20260313_create_org_schema_tables.sql` | 組織スキーマ内テーブル DDL |
| `backend/src/repositories/maimlPublishJobRepository.ts` | `maiml_publish_job` の CRUD |
| `backend/src/repositories/maimlAssetRepository.ts` | 組織スキーマの `maiml_asset` 等の CRUD |
| `backend/src/services/maimlPublishService.ts` | 公開・非公開のビジネスロジック（キュー投入・重複チェック） |
| `backend/src/workers/maimlPublishWorker.ts` | 公開 Worker（DOM パース・DB 挿入） |
| `backend/src/workers/maimlUnpublishWorker.ts` | 非公開 Worker（CASCADE DELETE） |
| `backend/src/workers/maimlScannerWorker.ts` | スキャン Worker（毎日0時・期限切れリカバリ） |
| `backend/src/queues/maimlPublishQueue.ts` | 公開キュー定義（bullmq） |
| `backend/src/queues/maimlUnpublishQueue.ts` | 非公開キュー定義（bullmq） |
| `backend/src/queues/maimlScannerQueue.ts` | スキャナーキュー定義（bullmq Repeat Job） |
| `backend/src/controllers/projectController.ts` | `publish` / `unpublish` / `getPublishStatus` ハンドラ |
| `docs/MaiML_OpenData_Pipeline/spec.md` | 仕様書 |
| `docs/MaiML_OpenData_Pipeline/db.md` | DB 設計書 |
