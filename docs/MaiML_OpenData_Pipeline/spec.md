# MaiML OpenData Pipeline 仕様書

> 作成日: 2026-03-11  
> 最終更新: 2026-03-18  
> ステータス: **確定事項のみ記載**（未確定事項は [pending.md](./pending.md) を参照）

---

## 1. システム概要

ユーザーが MaiML（XML フォーマットの材料科学データ）ファイルを「公開」「非公開」できる仕組みを提供する。

| 操作 | 概要 |
|------|------|
| **公開 (Publish)** | 指定した MaiML ファイルを解析・DB へ取り込み、検索・閲覧できる状態にする |
| **非公開 (Unpublish)** | 公開したデータを削除して非公開にする |

---

## 2. アーキテクチャ

### 2.1 処理の分割方針

ボタン押下から処理完了までを「同期部分」と「非同期部分」に分割する。

| フェーズ | 処理内容 | 実行方式 |
|---------|---------|---------|
| **同期部分** | ジョブ登録（`maiml_publish_job` INSERT）・bullmq 投入 | API レスポンス前に完了 |
| **非同期部分** | ファイル取得・DOM 解析・DB 一括挿入 | bullmq Worker が非同期で実行 |

### 2.2 コンポーネント構成

```
[フロントエンド]
    │  公開ボタン / 非公開ボタン押下（experiment_admin のみ）
    ▼
[バックエンド API（Express）]
    │  ① maiml_publish_job INSERT（status='pending', organization_id, project_name）
    │  ② bullmq キューにジョブを投入（job_id を渡す）
    │  ③ 202 Accepted を即返す（job_id を含む）
    ▼
[bullmq Worker（同一 Node.js プロセス内）]
    │  ④ maiml_publish_job.status を 'running' に更新
    │  ⑤ Swift/S3 から最新 MaiML ファイルを取得
    │  ⑥ DOM解析（MaimlParserTyped を流用）
    │  ⑦ 組織スキーマへ maiml_asset / maiml_instance / maiml_element 等を一括挿入
    │  ⑧ maiml_publish_job.asset_id を更新・status を 'done' に更新
    ▼
[PostgreSQL]
    ├── public.maiml_publish_job（ジョブ管理）
    └── <組織スキーマ>.maiml_asset / maiml_instance / ...（公開データ）

[フロントエンド（ポーリング）]
    GET /api/v1/projects/:name/publish-status
    → status が 'done' / 'error' になるまで定期確認
```

### 2.3 使用インフラ・パッケージ

| 項目 | 内容 |
|------|------|
| **ジョブキュー** | bullmq（Redis は docker-compose.yml に既存の `redis:7-alpine` を流用） |
| **XML 解析** | 既存の `MaimlParserTyped`（DOM ベース）を流用 |
| **実行言語** | TypeScript（Node.js / Express バックエンドに組み込む） |

---

## 3. 公開処理フロー

### 3.1 フロー詳細

```
① ユーザーが「公開」ボタンを押下
    ↓
② API（同期部分）
    - maiml_publish_job INSERT（status='pending', job_type='publish',
      organization_id, project_name, triggered_by）
    - bullmq キューにジョブ投入（job_id を payload に含める）
    - 202 Accepted を返す（job_id を返却）
    ↓
③ bullmq Worker（非同期部分）
    - maiml_publish_job.status を 'running'・started_at を更新
    - Swift/S3 から最新 MaiML ファイルをダウンロード
    - MaimlParserTyped で DOM 解析
    - 組織スキーマへデータを一括挿入（maiml_asset / maiml_instance / ...）
    - maiml_publish_job.asset_id を更新・status を 'done'・finished_at を更新
    ↓
④ フロントエンドがポーリングで 'done' を検知 → 完了表示
```

### 3.2 対象ファイル

- ボタン押下時点でのプロジェクトの**最新 MaiML ファイル**を自動的に対象とする
- ユーザーが個別にファイルを指定する UI は設けない

### 3.3 二重公開の禁止

- **公開中のプロジェクトへの再公開は禁止**（二重公開 NG）
- 公開 API（`POST /publish`）は、対象プロジェクトに有効な `maiml_asset` が既に存在する場合は `409 Conflict` を返す
- 再公開したい場合は「非公開（Unpublish）」を先に実行してから再度「公開（Publish）」を実行する
- 「公開中かどうか」の判定は、該当プロジェクトに紐づく `maiml_asset` レコードの有無で行う

### 3.4 ジョブの単体実行

開発・保守時のデバッグ用に、bullmq キューへジョブを登録するスクリプトを用意する。

```bash
# ジョブ登録スクリプト経由で単体起動
npm run batch:enqueue-publish -- --jobId=<uuid>
# → Redis が起動していれば Worker が処理する
```

---

## 4. 非公開処理フロー

### 4.1 即時非公開（UIボタン押下）

```
① ユーザーが「非公開」ボタンを押下
    ↓
② API（同期部分）
    - maiml_publish_job INSERT（status='pending', job_type='unpublish',
      organization_id, project_name, asset_id, triggered_by）
    - bullmq キューにジョブ投入（job_id を payload に含める）
    - 202 Accepted を返す（job_id を返却）
    ↓
③ bullmq Worker（非同期部分）
    - maiml_publish_job.status を 'running'・started_at を更新
    - 組織スキーマの maiml_asset を CASCADE 削除（全関連データ削除）
    - maiml_publish_job.status を 'done'・finished_at を更新
    ↓
④ フロントエンドがポーリングで 'done' を検知 → 完了表示
```

### 4.2 定期実行（スケジュール非公開）

**採用方式: E案（C案 + D案 ハイブリッド）**

| Worker | 役割 |
|--------|------|
| **公開 Worker** | 公開完了時に `retention_until` を算出し、bullmq に delayed Job を登録 |
| **Scanner Worker**（毎日0時） | 全組織スキャン → Job 消失を検出 → 削除 Job を投入（リカバリ） |
| **Unpublish Worker** | `asset_id` 指定で DELETE（即時非公開・delayed Job・リカバリ Job 共通） |

```
【公開時（通常）】
  公開 Worker 完了
      ↓
  bullmq.add('unpublish', { asset_id }, {
    jobId: `unpublish-${asset_id}`,  // 重複登録防止
    delay: retention_until - now()   // 期限まで遅延
  })
  → 期限になったら Unpublish Worker が自動実行

【毎日0時（リカバリ）】
  Scanner Worker（Repeat Job）起動
      ↓
  全組織スキャン: retention_until IS NOT NULL のアセットを取得
      ↓
  各アセットに対して:
    ├─ retention_until <= now() かつ Job なし → 即座に削除 Job 投入
    └─ retention_until > now() かつ Job なし → delayed Job を再登録
```

**期限の扱い（重要）:**
- `maiml_asset.retention_until` が **唯一の真実（Single Source of Truth）**
- Redis の delayed Job は「実行予約のキャッシュ」に過ぎない
- Job が消失しても `retention_until` は変更しない（引き直しなし）
- 最大遅延: スキャン間隔分（デフォルト 24 時間）

**既存バッチの廃止:**
- 既存の `backend/batch/unpublish/` バッチスクリプトは**廃止**

> **注意:** 既存マイグレーション `20260310_create_maiml_opendata_tables.sql` の KV 方式テーブル群（`maiml_publish_registry` / `maiml_condition_kv` / `maiml_material_kv` / `maiml_series_*`）は廃止。DB は db.md の新設計（maiml2Excel 方式）に統一する。

### 4.3 公開期限（retention_until）の決定ロジック

公開処理時に `maiml_asset.retention_until` を以下のルールで決定する。

`organization.default_retention_days` は**必ず正の整数**（`NULL` 不許可）。組織登録時に環境変数から初期値を設定する。

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `RETENTION_DAYS_DEFAULT` | 組織登録時の `default_retention_days` 初期値 | `365`（日） |

**バリデーションルール（`default_retention_days`）:**

| 値 | 扱い |
|----|------|
| 正の整数（1以上） | ✅ 許可 |
| `0`・負の値・`NULL` | ❌ 不許可（バリデーションエラー） |

**実装イメージ:**
```typescript
// 公開 Worker 内で retention_until を決定
async function resolveRetentionUntil(organizationId: string): Promise<Date> {
  const org = await orgRepository.findById(organizationId);
  // default_retention_days は必ず正の整数（NULL は組織登録バリデーションで弾く）
  const retentionDays = org.default_retention_days;
  const retentionUntil = new Date();
  retentionUntil.setDate(retentionUntil.getDate() + retentionDays);
  return retentionUntil;
}

// 組織登録時に default_retention_days を初期設定
async function createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
  const defaultRetentionDays = parseInt(process.env.RETENTION_DAYS_DEFAULT ?? '365', 10);
  return await orgRepository.insert({
    ...data,
    default_retention_days: defaultRetentionDays,
  });
}
```

> `retention_until` は公開APIのリクエストボディには含めない（APIから直接指定する機能は提供しない）。

### 4.4 ジョブステータス遷移（maiml_publish_job.status）

```
pending → running → done（完了）
                 ↘ error（エラー）
```

| 値 | 意味 |
|----|------|
| `pending` | ジョブ登録済み・Worker 未処理 |
| `running` | Worker が処理中 |
| `done` | 正常完了（公開または非公開が完了） |
| `error` | 異常終了（`error_message` にエラー内容を格納） |

---

## 5. XML 解析方式

### 5.1 採用方式

**DOM パース**（`MaimlParserTyped` を流用）

- MaiML ファイル全体をメモリに展開してから処理する方式
- 既存の `MaimlParserTyped`（DOM ベースの型付きパーサー）をそのまま利用する

### 5.2 注意事項

- 大容量ファイル（数百MB 超）は DOM 方式ではメモリ使用量が増加する
- bullmq Worker は非同期で処理するためリクエストのタイムアウトは発生しない
- ファイルサイズの上限については運用ルールで定める（仕様書の対象外）

---

## 6. DB 設計

詳細は **[db.md](./db.md)** を参照すること。

### 概要

- 公開データは**組織単位の PostgreSQL スキーマ**に格納する
- **スキーマ命名規則:** `organization_id` の `-` を `_` に変換した文字列（プレフィックスなし）
  - 例: `organization_id = 550e8400-e29b-41d4-a716-446655440000` → スキーマ名 `550e8400_e29b_41d4_a716_446655440000`
  - スキーマの COMMENT に `organization_cd` を設定する
- テーブル構成: `maiml_asset` → `maiml_instance` → `maiml_element` / `maiml_insertion` の階層構造
- テンプレート（protocol 層）: `maiml_template` → `maiml_template_element` / `maiml_template_insertion`
- eventLog 層: `maiml_event` → `maiml_event_element` / `maiml_event_element_value`（`results_ref` で `maiml_instance` と結合）
- スキーマは**組織作成時に自動作成**する。スキーマが存在しない場合は公開操作時にエラー
- 詳細な DDL は **[db.md](./db.md)** のセクション1参照

---

## 7. API 仕様

### 7.1 エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `POST` | `/api/v1/projects/:projectName/publish` | 公開ジョブを登録・投入 |
| `POST` | `/api/v1/projects/:projectName/unpublish` | 非公開ジョブを登録・投入 |
| `GET` | `/api/v1/projects/:projectName/publish-status` | 公開ステータスを取得 |

> 既存の `projectRoutes.ts` / `projectController.ts` に実装済み。継続利用する。

### 7.2 公開 API（POST /publish）

**リクエスト:**
```json
{}
```

> リクエストボディは現時点では空でよい。`retention_until` は公開 Worker が組織設定・環境変数から自動決定する（セクション4.3参照）。`template_only` / `store_raw_series` / `keep_raw_on_unpublish` は実装しない（pending.md セクション2・3参照）。

**レスポンス（202 Accepted）:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "message": "公開処理を開始しました。完了までしばらくお待ちください。"
  }
}
```

### 7.3 ステータス取得 API（GET /publish-status）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "job_type": "publish",
    "status": "done",
    "asset_id": 123,
    "project_name": "sample_project",
    "started_at": "2026-03-12T05:00:00Z",
    "finished_at": "2026-03-12T05:00:10Z"
  }
}
```

**ステータス値（`maiml_publish_job.status`）:**
| 値 | 意味 |
|----|------|
| `pending` | ジョブ登録済み・Worker 未処理 |
| `running` | Worker が処理中 |
| `done` | 正常完了 |
| `error` | 異常終了（`error_message` を参照） |

---

## 8. 権限・セキュリティ

### 8.1 実行可能ロール

| 操作 | 実行可能ロール |
|------|-------------|
| 公開（Publish） | `experiment_admin` のみ |
| 非公開（Unpublish） | `experiment_admin` のみ |
| ステータス確認 | `experiment_admin` 以上 |

### 8.2 ミドルウェアチェーン

全エンドポイントに以下を適用:

```
auth → tenantIsolation → permissionCheck（experiment_admin のみ許可）
```

### 8.3 マルチテナント分離

- すべての DB 操作で `organization_id` によるスキーマ分離を適用する
- 組織をまたいだデータアクセスは禁止（System Admin を除く）

---

## 9. 実装ファイル構成（予定）

```
backend/src/
├── config/
│   └── redis.ts                    （新規）bullmq 用 Redis 接続設定
├── queues/
│   └── maimlPublishQueue.ts        （実装済み）公開ジョブ Queue 定義
│   └── maimlUnpublishQueue.ts      （実装済み）非公開ジョブ Queue 定義
├── workers/
│   └── maimlPublishWorker.ts       （実装済み）公開 Worker
│   └── maimlUnpublishWorker.ts     （実装済み）非公開 Worker
├── services/
│   └── maimlPublishService.ts      （実装済み）enqueuePublish() / enqueueUnpublish()
│   └── maimlIngestParserService.ts （実装済み）parseForIngest()（XML解析）
├── controllers/
│   └── projectController.ts        （変更・既存）202 返却に変更
├── routes/
│   └── projectRoutes.ts            （変更なし・既存）
└── server.ts                       （変更）Worker 起動を追加
backend/scripts/
└── enqueue-publish.ts              （新規）単体起動用ジョブ登録スクリプト
```

---

## 10. ジョブ管理テーブル（maiml_publish_job）

`maiml_publish_job` は `public` スキーマに配置し、全組織共通で使用する。

```sql
CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT          NOT NULL CHECK (job_type IN ('publish', 'unpublish')),
  organization_id TEXT          NOT NULL,
  project_name    TEXT          NOT NULL,
  asset_id        BIGINT,       -- 公開完了後に更新（非公開ジョブでは登録時に設定）
                                -- ⚠️ FK なし: maiml_asset は組織スキーマに存在するため
                                --    PostgreSQL のクロススキーマ FK 制約は使用不可。
                                --    参照整合性はアプリケーション側（Worker）で管理する。
                                --    詳細は db.md セクション9 を参照。
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'running', 'done', 'error')),
  triggered_by    TEXT,         -- 実行者ユーザー ID（スケジュール実行時は NULL）
  trigger_type    TEXT          NOT NULL DEFAULT 'manual'
                                CHECK (trigger_type IN ('manual', 'schedule')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_publish_job_org_project ON maiml_publish_job(organization_id, project_name);
CREATE INDEX IF NOT EXISTS ix_publish_job_status      ON maiml_publish_job(status);
CREATE INDEX IF NOT EXISTS ix_publish_job_type_status ON maiml_publish_job(job_type, status);
```

| カラム | 説明 |
|--------|------|
| `job_id` | UUID PK（bullmq の payload にも含める） |
| `job_type` | `publish`（公開）/ `unpublish`（非公開） |
| `organization_id` | ジョブ対象の組織 ID |
| `project_name` | ジョブ対象のプロジェクト名 |
| `asset_id` | 公開完了後に `maiml_asset.asset_id` を記録。非公開ジョブは登録時に設定 |
| `status` | `pending` → `running` → `done` / `error` |
| `triggered_by` | 操作したユーザー ID（スケジュール実行時は NULL） |
| `trigger_type` | `manual`（手動）/ `schedule`（スケジュール） |
| `error_message` | `status='error'` 時のエラー詳細 |

---

## 11. 備考

未確定事項は **[pending.md](./pending.md)** を参照。

| 確定事項 | 概要 |
|---------|------|
| スキーマ命名規則 | `organization_id` の `-` を `_` に変換。プレフィックスなし。COMMENT に `organization_cd` を設定 |
| 公開設定 UI | 実装しない |
| 生データ保存（store_raw_series） | 実装しない |
| 二重公開 | 禁止。再公開したい場合は非公開後に再度公開する。公開中の場合は `409 Conflict` を返す |
| 公開期限（retention_until） | 組織設定 `default_retention_days` を優先、なければ環境変数 `RETENTION_DAYS_DEFAULT`（デフォルト365日） |

> ✅ **pending.md #9（eventLog テーブル設計）は解決済み（2026-03-18）**  
> `maiml_event` / `maiml_event_element` / `maiml_event_element_value` の3テーブルを組織スキーマに実装。  
> マイグレーション: `backend/migrations/20260318_add_event_tables_to_org_schema.sql`  
> DDL 詳細は [db.md §7.2](./db.md) を参照。
