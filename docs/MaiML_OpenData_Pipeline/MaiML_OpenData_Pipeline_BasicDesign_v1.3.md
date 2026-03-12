
# MaiML 取り込みパイプライン **基本設計書** v1.5
最終更新: 2026-03-10

---

## 1. 目的・スコープ
- ユーザーが**公開したい MaiML（XML）**のみを指定して公開し、不要時は**非公開（物理削除）**できる。
- DB は **PostgreSQL 互換（Aurora を含む）**。AWS ネイティブサービスに依存しない（オンプレ可）。
- **巨大配列は原本参照**を基本とし、DB は **要約／KV 属性／行明細**を保持（既定）。ただし v1.3 では**選択制で生データ配列の永続化**が可能。
- **DB 設計（公開機能が登録するテーブル構成）は現在再検討中**。maiml2Excel の出力項目をベースに最終的なテーブル定義を決定する予定であり、本書の DB 設計（セクション3〜5）は**参考案**である。

---

## 2. 基本構成（コンポーネント）

> **実装言語**：バックエンド（Worker を含む全コンポーネント）は **Node.js / TypeScript** で実装する。

- **Ingest Controller（API）**：公開対象の登録（whitelist）、公開/非公開バッチの発火、期限設定、状態参照。
- **Publish Batch Worker**：公開処理を担う非同期バッチ（TypeScript 実装）。SAX によるストリーミング解析で MaiML を取り込み、DB に反映する。UI からのボタン押下を契機に非同期実行される。
- **Unpublish Batch Worker**：非公開処理を担う非同期バッチ（TypeScript 実装）。UI からのボタン押下による即時実行と、定期実行（cron 等）による期限到来アセットの自動非公開の両方に対応する。
- **Job Progress Manager**：バッチ（公開/非公開）の実行進捗を管理し、フロントエンドからポーリングまたは WebSocket 等でリアルタイムにステータスを取得できるようにする。
- **Storage 抽象**：`file://` / `nfs://` / `smb://` / `s3://`（S3 互換可）。

---

## 3. 公開レジストリ／アセット（テンプレート公開・生データ方針を含む）

### 3.1 Publish Registry（抜粋）
```sql
ALTER TABLE maiml_publish_registry
  ADD COLUMN IF NOT EXISTS template_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_raw_series   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_raw_raster   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS raw_chunk_size     INT     NOT NULL DEFAULT 65536,
  ADD COLUMN IF NOT EXISTS raw_compression    TEXT    NOT NULL DEFAULT 'zstd',
  ADD COLUMN IF NOT EXISTS keep_raw_on_unpublish BOOLEAN NOT NULL DEFAULT FALSE;
```

### 3.2 アセット（抜粋）
```sql
ALTER TABLE maiml_asset
  ADD COLUMN IF NOT EXISTS template_only BOOLEAN NOT NULL DEFAULT FALSE;
```

> 運用：`template_only=true` は**テンプレートのみ公開**を明示。`store_raw_*` が true の場合に限り、生データ永続化を実行。

---

## 4. Condition/Material の **KV 汎用テーブル**（V1.1→V1.2 拡張込み）

### 4.1 condition（KV）
```sql
CREATE TABLE IF NOT EXISTS maiml_condition_kv (
  asset_id        BIGINT NOT NULL REFERENCES maiml_asset(asset_id) ON DELETE CASCADE,
  template_id     TEXT,
  instruction_id  TEXT,                   -- どの STEP の条件か（V1.2 追加）
  source_section  TEXT    NOT NULL,       -- 'conditionTemplate' / 'condition' 等
  path            TEXT    NOT NULL,       -- spectrumA/ExternalFile など
  key             TEXT    NOT NULL,
  idx             INT     NOT NULL DEFAULT 0,
  value_text      TEXT,
  value_num       DOUBLE PRECISION,
  unit            TEXT,
  value_type      TEXT,
  format_string   TEXT,
  scale_factor    DOUBLE PRECISION,
  PRIMARY KEY (asset_id, source_section, path, idx, COALESCE(instruction_id, ''))
);
CREATE INDEX IF NOT EXISTS ix_condition_kv_key         ON maiml_condition_kv(key);
CREATE INDEX IF NOT EXISTS ix_condition_kv_path        ON maiml_condition_kv(path);
CREATE INDEX IF NOT EXISTS ix_condition_kv_instruction ON maiml_condition_kv(instruction_id);
```

### 4.2 material（KV）
```sql
CREATE TABLE IF NOT EXISTS maiml_material_kv (
  asset_id        BIGINT NOT NULL REFERENCES maiml_asset(asset_id) ON DELETE CASCADE,
  template_id     TEXT,
  instruction_id  TEXT,                   -- どの STEP の材料か（V1.2 追加）
  source_section  TEXT    NOT NULL,       -- 'materialTemplate' / 'material' 等
  path            TEXT    NOT NULL,
  key             TEXT    NOT NULL,
  idx             INT     NOT NULL DEFAULT 0,
  value_text      TEXT,
  value_num       DOUBLE PRECISION,
  unit            TEXT,
  value_type      TEXT,
  format_string   TEXT,
  scale_factor    DOUBLE PRECISION,
  PRIMARY KEY (asset_id, source_section, path, idx, COALESCE(instruction_id, ''))
);
CREATE INDEX IF NOT EXISTS ix_material_kv_key          ON maiml_material_kv(key);
CREATE INDEX IF NOT EXISTS ix_material_kv_path         ON maiml_material_kv(path);
CREATE INDEX IF NOT EXISTS ix_material_kv_instruction  ON maiml_material_kv(instruction_id);
```

> **パス表現**：直下は `path=key`。ネストは `親/子`。同名複数は `idx=0..`。

---

## 5. **生データ配列の永続化**（V1.3 追加・参考案）

> ⚠️ **本セクションの DB 設計は参考案です。** 公開機能が登録するテーブル構成は maiml2Excel の出力項目をベースに再検討中のため、実装前に最新の設計を確認してください。

### 5.1 ヘッダ
```sql
CREATE TABLE IF NOT EXISTS maiml_series_raw_header (
  raw_id          BIGSERIAL PRIMARY KEY,
  asset_id        BIGINT NOT NULL REFERENCES maiml_asset(asset_id) ON DELETE CASCADE,
  instruction_id  TEXT,
  template_id     TEXT,
  result_id       TEXT,
  result_name     TEXT,
  content_id      TEXT NOT NULL,
  content_size    INT,
  x_label         TEXT,
  y_label         TEXT,
  x_unit          TEXT,
  y_unit          TEXT,
  points_total    BIGINT NOT NULL,
  chunk_count     INT    NOT NULL,
  storage_format  TEXT   NOT NULL CHECK (storage_format IN ('array','binary')),
  compression     TEXT   NOT NULL DEFAULT 'none',
  checksum_sha256 TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2 チャンク（Array 方式：既定）
```sql
CREATE TABLE IF NOT EXISTS maiml_series_raw_chunk (
  raw_id        BIGINT NOT NULL REFERENCES maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT    NOT NULL,
  point_offset  BIGINT NOT NULL,
  point_count   INT    NOT NULL,
  x_chunk       DOUBLE PRECISION[] NOT NULL,
  y_chunk       DOUBLE PRECISION[] NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);
```

### 5.3 チャンク（Binary 方式：任意）
```sql
CREATE TABLE IF NOT EXISTS maiml_series_raw_chunk_bin (
  raw_id        BIGINT NOT NULL REFERENCES maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT    NOT NULL,
  point_offset  BIGINT NOT NULL,
  point_count   INT    NOT NULL,
  codec         TEXT   NOT NULL,
  payload       BYTEA  NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);
```

### 5.4 取り込みフロー（要約）
1. レジストリで `store_raw_series=true` のアセットのみ対象。
2. `<data>` と `resultTemplate` を突合して `instruction_id / template_id / result_id / result_name / content_id / content_size` を特定。
3. ヘッダ INSERT -> チャンク分割（例：32,768 点）-> チャンク挿入（COPY 推奨）-> ハッシュ更新。

> 非公開（Unpublish）時は、ヘッダ/チャンクも **`asset_id` 参照で CASCADE 削除**。代表メタ保持でも RAW は削除が既定（レジストリで上書き可）。

---

## 6. **非同期バッチ実行と UI 進捗管理**（V1.4 追加）

### 6.1 基本方針

- **公開**および**非公開**の処理は、それぞれ独立した**非同期バッチ（Batch Worker）**として実装する。
- UI の「公開」「非公開」ボタンはバッチの**発火（エンキュー）のみ**を行い、即座にレスポンスを返す。
- バッチの実行進捗は **Job Progress Manager** が管理し、フロントエンドは進捗をキャッチアップできる。

### 6.2 操作フロー

```
[ユーザー]
   │
   │ ①「公開」ボタン押下 / ②「非公開」ボタン押下
   ▼
[フロントエンド]
   │ HTTP POST /api/publish  または  POST /api/unpublish
   │ → job_id を受け取り（即時レスポンス）
   ▼
[バックエンド API（Ingest Controller）]
   │ ジョブをキュー（DB or メモリキュー）に登録
   │ job_id / status=pending を Job Progress Manager に記録
   ▼
[Publish Batch Worker / Unpublish Batch Worker]（非同期）
   │ ジョブを取得し実行
   │ 進捗（pending → running → done / error）を Job Progress Manager に更新
   ▼
[フロントエンド]（ポーリング or WebSocket）
   │ GET /api/jobs/:job_id/status でステータスを定期取得
   │ done / error になったら画面に反映（完了通知・エラー表示）
```

### 6.3 ジョブステータス管理テーブル

```sql
CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT          NOT NULL CHECK (job_type IN ('publish', 'unpublish')),
  asset_id        BIGINT        REFERENCES maiml_asset(asset_id) ON DELETE SET NULL,
  registry_id     BIGINT,                         -- maiml_publish_registry の参照（任意）
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','running','done','error')),
  triggered_by    TEXT,                           -- 実行者（ユーザーID等）
  trigger_type    TEXT          NOT NULL DEFAULT 'manual'
                                CHECK (trigger_type IN ('manual','schedule')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_publish_job_status    ON maiml_publish_job(status);
CREATE INDEX IF NOT EXISTS ix_publish_job_asset     ON maiml_publish_job(asset_id);
CREATE INDEX IF NOT EXISTS ix_publish_job_type      ON maiml_publish_job(job_type, status);
```

### 6.4 ステータス遷移

```
pending → running → done
                 └→ error
```

- `pending`：ジョブ登録済み・未実行。
- `running`：バッチ Worker が処理中。
- `done`：正常完了。
- `error`：異常終了（`error_message` にエラー内容を格納）。

### 6.5 フロントエンドのキャッチアップ方式

| 方式 | 説明 | 採用可否 |
|------|------|---------|
| ポーリング | `GET /api/jobs/:job_id/status` を一定間隔（例：3秒）で呼び出す | ✅ 推奨（シンプル） |
| WebSocket | サーバーからプッシュ通知 | ✅ 任意（リアルタイム性が高い） |
| SSE（Server-Sent Events） | サーバーから一方向ストリーム | 任意 |

> 推奨はポーリング方式。完了（`done` / `error`）を検知したタイミングで画面の状態を更新する。

---

## 7. Unpublish（非公開）とスケジュール

- **即時非公開**：UI の「非公開」ボタン押下 → Unpublish Batch Worker がジョブを非同期実行。
- **定期実行（スケジュール非公開）**：cron 等による定期実行で `maiml_unpublish_due_assets()` を呼び出し、期限到来アセットを一括非公開。この場合も `maiml_publish_job`（`trigger_type='schedule'`）にジョブを記録する。
- `maiml_unpublish_asset(asset_id, keep_meta)`：代表メタ保持（既定 true）／完全削除。RAW/KV/行明細は `asset_id` 参照で削除対象。
- `maiml_unpublish_due_assets()`：期限到来の一括非公開（スケジュール実行）。

---

## 8. 検索クエリ例（抜粋）
```sql
-- Laser=532nm かつ STEP を限定
SELECT DISTINCT a.asset_id, a.doc_name
FROM   maiml_asset a
JOIN   maiml_condition_kv c ON c.asset_id = a.asset_id
WHERE  c.key='Laser' AND (c.value_num=532 OR c.value_text='532')
  AND  c.instruction_id='RamanSpectroscopy';
```
```sql
-- 生データのプロファイル列挙
SELECT h.raw_id, h.asset_id, h.instruction_id, h.result_id, h.content_id, h.points_total
FROM   maiml_series_raw_header h
WHERE  h.asset_id=:asset_id
ORDER BY h.content_id;
```

---

## 9. パフォーマンス／容量／運用ガイド
- チャンク点数の既定は 32K。I/O・メモリ・可視化応答の妥協点で調整。
- インデックスは `(asset_id, content_id)` と `(raw_id, chunk_index)` を優先。
- Binary 方式は圧縮率と CPU のトレードオフを評価。Array 方式は SQL 可視化が容易。
- 連続投入が多い場合はテーブル再作成やパーティション分割も検討。

---

## 10. テスト計画（要点）
- KV のネスト/型/複数同名キー・`instruction_id` 付与規則の正当性。
- RAW 取り込みの冪等（途中失敗->再実行で一致）。
- Unpublish 時の削除範囲（ヘッダ/チャンク/KV/行明細）。
- **非同期バッチ**のジョブ登録・実行・ステータス更新の正常系・異常系。
- **ポーリング API**（`GET /api/jobs/:job_id/status`）の応答正確性。
- **スケジュール非公開**（`trigger_type='schedule'`）のジョブ記録と削除範囲。

---

## 11. セキュリティ／権限
- ロール：`viewer`（SELECT）、`publisher`（INSERT/DELETE/関数）、`admin`（DDL）。
- 秘密情報は環境変数や Vault 等で管理。

---

## 12. 決定事項（v1.5 完全版）
- V1.1 の **KV 汎用テーブル・DDL** を踏襲。
- V1.2 の **instruction 連携**を維持。
- V1.3 で **RAW 永続化（ヘッダ/チャンク）**を追加し、選択制で運用可能とした。
- V1.4 で **非同期バッチ実行方式**を採用。公開・非公開はそれぞれ独立した Batch Worker で実装し、UI ボタンはバッチの発火のみ行う。バッチ進捗は `maiml_publish_job` テーブルで管理し、フロントエンドはポーリングでキャッチアップする。スケジュール非公開は引き続き定期実行（cron 等）で対応し、`trigger_type='schedule'` としてジョブ記録する。
- V1.5 で以下の変更を加えた：
  - **実装言語を TypeScript（Node.js）に統一**。Worker を含む全コンポーネントを TypeScript で実装する。
  - **プレビュー機能を廃止**。series_preview テーブルおよび関連ロジックは削除。
  - **DB 設計を再検討中**。公開機能が登録するテーブル構成は maiml2Excel の出力項目をベースに確定予定。本書の DB 設計（セクション3〜5）は参考案として扱う。
