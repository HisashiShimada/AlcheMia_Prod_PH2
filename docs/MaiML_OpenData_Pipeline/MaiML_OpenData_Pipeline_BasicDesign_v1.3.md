
# MaiML 取り込みパイプライン **基本設計書** v1.3
最終更新: 2026-02-17

---

## 1. 目的・スコープ
- ユーザーが**公開したい MaiML（XML）**のみを指定して公開し、不要時は**非公開（物理削除）**できる。
- DB は **PostgreSQL 互換（Aurora を含む）**。AWS ネイティブサービスに依存しない（オンプレ可）。
- **巨大配列は原本参照**を基本とし、DB は **要約／KV 属性／行明細／プレビュー**を保持（既定）。ただし v1.3 では**選択制で生データ配列の永続化**が可能。
- プレビューは**最大 2,000 点**。方式は **等間隔（uniform）／最大値保持（maxhold）／MMR** から選択。テンプレートのみ公開（値なし）の場合は生成しない。

---

## 2. 基本構成（コンポーネント）
- **Ingest Controller（CLI/API）**：公開対象の登録（whitelist）、公開/非公開の実行、期限設定、状態参照。
- **Ingest Worker**：SAX/iterparse によるストリーミング解析で MaiML を取り込み、DB に反映（プレビュー生成・任意で生データ保存）。
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

## 5. **プレビュー実装ロジック**（V1.1網羅・V1.2拡張付き）

### 5.1 仕様
- 上限点数：`PREVIEW_POINTS_MAX = 2000`（固定）。
- モード：`uniform`／`maxhold`／`mmr`。
- テンプレートのみ公開（`template_only=true`）や `<data>` に値が無い場合は生成しない。

### 5.2 アルゴリズム
- **共通前処理**：`x` は昇順、`y` は 0–1 正規化（`(y - min)/(max - min + epsilon)`）、端点保持（先頭・末尾）。
- **uniform**：インデックス等間隔に `k` 点抽出。`i_j = round(j*(N-1)/(k-1))`。
- **maxhold**：全域を `k` 区間に分割し、各区間で `y` 最大の点を選択。空区間は隣接 2 位で補完。
- **mmr**：
  - スコア：`score(i) = (1-lambda)*sim_whole(i) - lambda*max_{j in S} sim_pair(i,j)`。
  - 代表性 `sim_whole` は振幅正規化値など、類似度 `sim_pair` は `1 - |y_i - y_j|/(|y_i|+|y_j|+epsilon)` 等。
  - 初期 `S` は最大強度＋端点、候補はランダム/ビン上位でサンプリングして `O(k·M)` に削減。
  - 長大系列は **maxhold で 4k に圧縮 -> MMR で k** が安定。

### 5.3 品質指標（任意保存）
- MAE/MAPE（原系列 vs プレビュー）/ Peak Recall（上位 P 個ピークの捕捉）/ Area 保持率（`sum(y)` 比）。

### 5.4 プレビュー格納テーブル（V1.2 で拡張）
```sql
CREATE TABLE IF NOT EXISTS maiml_series_preview (
  preview_id        BIGSERIAL PRIMARY KEY,
  asset_id          BIGINT NOT NULL REFERENCES maiml_asset(asset_id) ON DELETE CASCADE,
  -- プロファイル（V1.2 で追加）
  instruction_id    TEXT,
  template_id       TEXT,
  result_id         TEXT,
  result_name       TEXT,
  content_id        TEXT,
  content_size      INT,
  -- 系列メタ
  series_type       TEXT   NOT NULL CHECK (series_type IN ('TIC','SPECTRUM_TOTAL','OTHER')),
  x_label           TEXT   NOT NULL,
  y_label           TEXT   NOT NULL,
  mode              TEXT   NOT NULL CHECK (mode IN ('uniform','maxhold','mmr')),
  params            JSONB  NOT NULL DEFAULT '{}'::jsonb,
  original_points   INT    NOT NULL,
  preview_points    INT    NOT NULL,
  x                 DOUBLE PRECISION[] NOT NULL,
  y                 DOUBLE PRECISION[] NOT NULL,
  x_min             DOUBLE PRECISION,
  x_max             DOUBLE PRECISION,
  y_min             DOUBLE PRECISION,
  y_max             DOUBLE PRECISION,
  quality           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_preview_asset_type      ON maiml_series_preview(asset_id, series_type);
CREATE INDEX IF NOT EXISTS ix_preview_instruction     ON maiml_series_preview(instruction_id);
CREATE INDEX IF NOT EXISTS ix_preview_template        ON maiml_series_preview(template_id);
CREATE INDEX IF NOT EXISTS ix_preview_result_content  ON maiml_series_preview(result_id, content_id);
```

### 5.5 疑似コード（ワーカー）
```python
# uniform
k = min(N, 2000)
idx = [round(j*(N-1)/(k-1)) for j in range(k)]
Xp, Yp = X[idx], Y[idx]
```
```python
# maxhold（インデックス分割）
k = min(N, 2000)
bounds = [round(j*N/k) for j in range(k+1)]
sel = []
for j in range(k):
    lo, hi = bounds[j], bounds[j+1]
    if hi > lo:
        b = range(lo, hi)
        sel.append(max(b, key=lambda i: Y[i]))
sel = sorted(set(sel + [0, N-1]))
Xp, Yp = X[sel], Y[sel]
```
```python
# mmr（maxhold->MMR）
k = min(N, 2000)
sel4 = maxhold_indices(X, Y, 4*k)
C = list(sel4)
S = [max(C, key=lambda i: Y[i])]
lam = 0.2
import random
while len(S) < k:
    best, best_score = None, -1e9
    for i in random.sample(C, min(2000, len(C))):
        sim_whole = (Y[i]-minY)/(maxY-minY+1e-9)
        sim_pair  = max(1.0 - abs(Y[i]-Y[j])/(abs(Y[i])+abs(Y[j])+1e-9) for j in S)
        score = (1-lam)*sim_whole - lam*sim_pair
        if score > best_score:
            best, best_score = i, score
    S.append(best); C.remove(best)
S = sorted(set(S + [0, N-1]))
Xp, Yp = X[S], Y[S]
```

---

## 6. **生データ配列の永続化**（V1.3 追加）

### 6.1 ヘッダ
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

### 6.2 チャンク（Array 方式：既定）
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

### 6.3 チャンク（Binary 方式：任意）
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

### 6.4 取り込みフロー（要約）
1. レジストリで `store_raw_series=true` のアセットのみ対象。
2. `<data>` と `resultTemplate` を突合して `instruction_id / template_id / result_id / result_name / content_id / content_size` を特定（プレビューと同一キー）。
3. ヘッダ INSERT -> チャンク分割（例：32,768 点）-> チャンク挿入（COPY 推奨）-> ハッシュ更新。
4. 既存のプレビュー生成は従来どおり（併用可）。

> 非公開（Unpublish）時は、ヘッダ/チャンクも **`asset_id` 参照で CASCADE 削除**。代表メタ保持でも RAW は削除が既定（レジストリで上書き可）。

---

## 7. Unpublish（非公開）とスケジュール
- `maiml_unpublish_asset(asset_id, keep_meta)`：代表メタ保持（既定 true）／完全削除。RAW/プレビュー/KV/行明細は `asset_id` 参照で削除対象。
- `maiml_unpublish_due_assets()`：期限到来の一括非公開。

---

## 8. CLI 例（抜粋）
```bash
# 公開対象の登録（テンプレートのみ）
maimlctl register   --file-uri "file:///data/maiml/raman_001.xml"   --template-only true   --keep-meta-on-unpublish true   --retention "2026-03-31T00:00:00+09:00"

# 公開対象の登録（生データも保存）
maimlctl register   --file-uri "file:///data/maiml/gcms_001.xml"   --store-raw-series true --raw-chunk-size 32768 --raw-compression zstd

# 公開実行
maimlctl publish --all-requested

# 任意非公開（代表メタ保持）
maimlctl unpublish --asset-id 123 --mode keep_meta
```

---

## 9. 検索クエリ例（抜粋）
```sql
-- Laser=532nm かつ STEP を限定
SELECT DISTINCT a.asset_id, a.doc_name
FROM   maiml_asset a
JOIN   maiml_condition_kv c ON c.asset_id = a.asset_id
WHERE  c.key='Laser' AND (c.value_num=532 OR c.value_text='532')
  AND  c.instruction_id='RamanSpectroscopy';
```
```sql
-- STEP=CLSAnalysis で生成されたプレビュー
SELECT p.asset_id, p.instruction_id, p.result_id, p.content_id, p.preview_points
FROM   maiml_series_preview p
WHERE  p.instruction_id='CLSAnalysis'
ORDER BY p.created_at DESC;
```
```sql
-- 生データのプロファイル列挙
SELECT h.raw_id, h.asset_id, h.instruction_id, h.result_id, h.content_id, h.points_total
FROM   maiml_series_raw_header h
WHERE  h.asset_id=:asset_id
ORDER BY h.content_id;
```

---

## 10. パフォーマンス／容量／運用ガイド
- チャンク点数の既定は 32K。I/O・メモリ・可視化応答の妥協点で調整。
- インデックスは `(asset_id, content_id)` と `(raw_id, chunk_index)` を優先。
- Binary 方式は圧縮率と CPU のトレードオフを評価。Array 方式は SQL 可視化が容易。
- 連続投入が多い場合はテーブル再作成やパーティション分割も検討。

---

## 11. テスト計画（要点）
- プレビュー（3 方式）の再現性・品質（MAE/MAPE/Peak Recall/Area）。
- KV のネスト/型/複数同名キー・`instruction_id` 付与規則の正当性。
- RAW 取り込みの冪等（途中失敗->再実行で一致）。
- Unpublish 時の削除範囲（ヘッダ/チャンク/プレビュー/KV/行明細）。

---

## 12. セキュリティ／権限
- ロール：`viewer`（SELECT）、`publisher`（INSERT/DELETE/関数）、`admin`（DDL）。
- 秘密情報は環境変数や Vault 等で管理。

---

## 13. 決定事項（v1.3 完全版）
- V1.1 の**プレビュー実装ロジック（uniform/maxhold/MMR）・DDL・品質指標**を**全て踏襲**。
- V1.2 の **instruction 連携**／**プレビュー識別子拡張**を維持。
- V1.3 で **RAW 永続化（ヘッダ/チャンク）**を追加し、選択制で運用可能とした。
