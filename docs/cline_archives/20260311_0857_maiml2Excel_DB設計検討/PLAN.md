# タスク計画書: maiml2Excel ベース DB テーブル設計検討

## メタデータ
- **作成日時**: 2026-03-11 08:57
- **タスクID**: maiml2excel_db_design
- **優先度**: 高
- **推定工数**: 4〜6時間（設計検討・ドキュメント化）

## タスク概要

`maiml2Excel` の出力項目（Python スクリプト `maimlinstancetoxl.py` / `maimltoxlwithtemplate.py`）を基準として、公開処理（Publish Pipeline）の DB テーブル構成とマッピングを再検討・確定する。

BasicDesign v1.5（`docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md`）では「DB 設計は maiml2Excel の出力項目をベースに確定予定」と明記されており、本タスクはその設計を具体化することが目的。

---

## 目的と期待される成果

### 目的
- maiml2Excel が抽出する MaiML 要素・属性の全項目を DB カラムにマッピングする
- 現在の暫定テーブル設計（`20260310_create_maiml_opendata_tables.sql`）の過不足を明確にする
- 解析処理（`maimlKvExtractorService.ts`）が対応できていない項目を洗い出す

### 期待される成果
- [ ] maiml2Excel 出力項目 ↔ DB カラム のマッピング表（全項目）
- [ ] 現行テーブルの不足カラム・新規テーブルの候補リスト
- [ ] 解析処理（KV 抽出サービス）の拡張ポイント整理
- [ ] 次フェーズの実装計画案

---

## 調査済み情報のまとめ

### maiml2Excel の抽出対象

#### A. 抽出レイヤー（Excel のシート単位）

| 要素名 | XML パス | 役割 |
|--------|---------|------|
| `<result>` | `data/results/result` | 結果インスタンス |
| `<material>` | `data/results/material` | 材料インスタンス |
| `<condition>` | `data/results/condition` | 条件インスタンス |

各要素の主要属性：
- `@id` - インスタンス識別子
- `@ref` - 参照先テンプレート ID
- `<uuid>` 子要素 - UUID

#### B. insertion 要素（外部ファイル参照）

| 子要素/属性 | 型 | 必須 | 説明 |
|------------|---|------|------|
| `<uri>` | string | ◯ | ファイルパス／URI |
| `<hash>` テキスト | string | ◯ | ハッシュ値 |
| `<hash method="...">` | attribute | ◯ | ハッシュアルゴリズム（SHA-256 等） |
| `<uuid>` | string | × | ファイルの UUID |
| `<format>` | string | × | MIME タイプ（`image/tiff` 等） |

#### C. 汎用データコンテナ（最重要・3 種類）

対象要素：`<property>` / `<content>` / `<uncertainty>`

**属性リスト（共通）:**

| 属性名 | XML 表記 | 説明 | 例 |
|--------|---------|------|---|
| `@xsi:type` | `{http://www.w3.org/2001/XMLSchema-instance}type` | データ型 | `intType`, `stringType` |
| `@key` | `key` | データキー（NS プレフィックス付き） | `tiff:ImageWidth` |
| `@formatString` | `formatString` | フォーマット文字列 | `YYYY-MM-DD` |
| `@units` | `units` | 単位 | `mm`, `seconds` |
| `@scaleFactor` | `scaleFactor` | スケール係数 | `1.5` |
| `@axis` | `axis` | 軸情報 | `x`, `y`, `z` |
| `@size` | `size` | サイズ | `1024` |
| `@id` | `id` | 要素 ID | `prop_001` |
| `@ref` | `ref` | 参照 ID | `template_001` |

**子要素リスト:**

| 子要素 | 多重度 | 説明 |
|--------|-------|------|
| `<value>` | 0..* | データ値（複数可 → idx 管理） |
| `<description>` | 0..1 | 説明文 |

**入れ子構造（再帰）:**
- property の中に property / content / uncertainty が入れ子になれる
- 現行 KV テーブルでは `path` 列で `親/子` 形式で表現

#### D. 暗号化・秘匿化データ

| 要素名 | 説明 |
|--------|------|
| `childUri` | 子要素の URI |
| `childHash` | 子要素のハッシュ |
| `childUuid` | 子要素の UUID |
| `EncryptedData` | 暗号化されたデータ本体 |

#### E. データ型（xsi:type）

| xsi:type | 型区分 | 例 |
|---------|-------|---|
| `intType`, `shortType`, `longType` 等 | 数値 | `1024` |
| `doubleType`, `floatType` | 浮動小数 | `3.14` |
| `stringType` | 文字列 | `"SEM"` |
| `dateType` | 日付 | `2024-03-19T17:28:03+09:00` |
| `uriType` | URI | `file://path/to/file` |
| `uuidType` | UUID | `61e53a8f-...` |
| `stringListType` | 文字列リスト | スペース区切り文字列 |

---

## 現行 DB テーブルとの対比分析

### 現行テーブル一覧（`maiml_publish` スキーマ）

```
maiml_publish.maiml_asset              （公開アセット・MaiML ファイル代表メタ）
maiml_publish.maiml_publish_registry   （公開設定・フラグ管理）
maiml_publish.maiml_condition_kv       （実験条件 KV）
maiml_publish.maiml_material_kv        （材料情報 KV）
maiml_publish.maiml_series_preview     （プレビュー）
maiml_publish.maiml_series_raw_header  （生データヘッダ）
maiml_publish.maiml_series_raw_chunk   （生データ チャンク: Array 方式）
maiml_publish.maiml_series_raw_chunk_bin（生データ チャンク: Binary 方式）
```

### 現行設計の課題・不足点

#### 課題 1: result インスタンスの管理テーブルがない

maiml2Excel は **result / material / condition インスタンスごとに 1 シート**を作成する。
つまり「インスタンス（≒ 実験実行単位）」が重要なエンティティであるが、現行 DB には該当テーブルがない。

**KV テーブルの `source_section`** で `'condition'` / `'material'` を区別しているが、
`result` インスタンスのメタ情報（id, ref, uuid, name）は保存されていない。

**影響範囲:**
- `maiml_condition_kv.instruction_id` が `null` で登録されている（紐付けロジック未確定）
- `result` に紐づく `insertion`（外部ファイル参照）を保存するテーブルがない

#### 課題 2: insertion（外部ファイル参照）テーブルがない

maiml2Excel は `<insertion>` 要素（uri / hash / uuid / format）を抽出する。
現行テーブルには `insertion` を専用保存するテーブルがない。

#### 課題 3: content 要素の KV が material_kv / condition_kv に含まれていない

maiml2Excel は **property / content / uncertainty** の 3 種をまとめて処理するが、
現行 KV テーブル (`maiml_condition_kv` / `maiml_material_kv`) は property のみを想定している可能性がある。

`content` は **大量の数値配列**（`tiff:StripByteCounts` 等）を持つ場合があり、
series 系テーブル（`maiml_series_raw_header` / `maiml_series_raw_chunk`）との棲み分けを明確にする必要がある。

#### 課題 4: 暗号化データの保存先がない

`childUri` / `childHash` / `childUuid` / `EncryptedData` を保存するテーブルが存在しない。

#### 課題 5: 階層情報（hierarchy）の保存方法が未整備

maiml2Excel は `"1-2-3"` 形式の階層番号を保持するが、
現行 KV テーブルでは `path`（`親/子` 形式）のみで表現している。
同一 path に複数値がある場合は `idx` で区別しているが、
**複数の `<value>` 子要素**（例：`tiff:StripByteCounts` に 256 個の値）の扱いが未定義。

#### 課題 6: result インスタンス専用 KV テーブルがない

現行は condition / material の KV テーブルはあるが、
**result の property/content/uncertainty** を保存するテーブルがない。
maiml2Excel は result の全プロパティも抽出対象としている。

---

## 検討対象のテーブル設計（案）

### 新規テーブル候補

#### 案 1: `maiml_instance`（インスタンス管理テーブル）

MaiML の `<result>` / `<material>` / `<condition>` インスタンスを統一管理する。

```sql
CREATE TABLE maiml_publish.maiml_instance (
  instance_id     BIGSERIAL   PRIMARY KEY,
  asset_id        BIGINT      NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instance_type   TEXT        NOT NULL CHECK (instance_type IN ('result','material','condition')),
  instance_key    TEXT        NOT NULL,  -- @id 属性
  template_ref    TEXT,                  -- @ref 属性（参照先テンプレート ID）
  instance_uuid   TEXT,                  -- <uuid> 子要素
  instance_name   TEXT,                  -- <name> 子要素
  instruction_id  TEXT,                  -- 紐づく instruction の @id
  maiml_line_no   INT                    -- XML 元行番号（トレーサビリティ）
);
```

#### 案 2: `maiml_insertion`（外部ファイル参照テーブル）

```sql
CREATE TABLE maiml_publish.maiml_insertion (
  insertion_id    BIGSERIAL   PRIMARY KEY,
  asset_id        BIGINT      NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instance_id     BIGINT      REFERENCES maiml_publish.maiml_instance(instance_id) ON DELETE CASCADE,
  uri             TEXT        NOT NULL,
  hash_value      TEXT,
  hash_method     TEXT,       -- 'SHA-256' 等
  file_uuid       TEXT,
  mime_format     TEXT,       -- 'image/tiff' 等
  maiml_line_no   INT
);
```

#### 案 3: `maiml_result_kv`（result インスタンスの KV テーブル）

result の property / content / uncertainty を保存する。
condition_kv / material_kv と同構造。

```sql
CREATE TABLE maiml_publish.maiml_result_kv (
  asset_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instance_id     BIGINT  REFERENCES maiml_publish.maiml_instance(instance_id) ON DELETE CASCADE,
  template_id     TEXT,
  instruction_id  TEXT    NOT NULL DEFAULT '',
  source_section  TEXT    NOT NULL,  -- 'result' / 'resultTemplate'
  path            TEXT    NOT NULL,
  key             TEXT    NOT NULL,
  idx             INT     NOT NULL DEFAULT 0,
  element_type    TEXT,              -- 'property' / 'content' / 'uncertainty'
  value_text      TEXT,
  value_num       DOUBLE PRECISION,
  unit            TEXT,
  value_type      TEXT,              -- xsi:type の正規化値
  format_string   TEXT,
  scale_factor    DOUBLE PRECISION,
  axis            TEXT,              -- @axis 属性（maiml2Excel 対象）
  size_value      INT,               -- @size 属性（maiml2Excel 対象）
  element_id      TEXT,              -- @id 属性（maiml2Excel 対象）
  element_ref     TEXT,              -- @ref 属性（maiml2Excel 対象）
  maiml_line_no   INT,
  PRIMARY KEY (asset_id, source_section, path, key, idx, instruction_id)
);
```

#### 案 4: condition_kv / material_kv への追加カラム

maiml2Excel が抽出する属性で、現行 KV テーブルに不足しているカラム：

| カラム | 型 | 説明 |
|--------|---|------|
| `element_type` | TEXT | `property` / `content` / `uncertainty` の区別 |
| `axis` | TEXT | `@axis` 属性 |
| `size_value` | INT | `@size` 属性 |
| `element_id` | TEXT | `@id` 属性（プロパティ自身の ID） |
| `element_ref` | TEXT | `@ref` 属性 |
| `maiml_line_no` | INT | XML 元行番号 |

#### 案 5: `maiml_encrypted_data`（暗号化データテーブル）

```sql
CREATE TABLE maiml_publish.maiml_encrypted_data (
  encrypted_id    BIGSERIAL   PRIMARY KEY,
  asset_id        BIGINT      NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instance_id     BIGINT      REFERENCES maiml_publish.maiml_instance(instance_id) ON DELETE CASCADE,
  element_type    TEXT        NOT NULL,  -- 'childUri'/'childHash'/'childUuid'/'EncryptedData'
  encrypted_value TEXT,
  maiml_line_no   INT
);
```

---

## 解析処理（maimlKvExtractorService.ts）の拡張ポイント

### 現状の未実装・TODO

| 項目 | 現状 | 拡張内容 |
|------|------|---------|
| `instruction_id` の紐付け | `null` 固定（TODO） | eventLog / data の ref 解析で特定 |
| series 抽出（inline series） | 空配列固定（TODO） | `<content>` の数値配列を解析 |
| `series_type` 判定 | `'OTHER'` 固定（TODO） | key 属性パターンマッチで判定 |
| insertion 抽出 | 未実装 | 新規 `maiml_insertion` テーブルへの保存 |
| result KV 抽出 | 未実装 | result の property/content/uncertainty を抽出 |
| element_type 区別 | 未実装 | property / content / uncertainty を区別して保存 |
| axis / size / element_id / element_ref | 未実装 | maiml2Excel 対応カラムを追加 |
| 暗号化データ抽出 | 未実装 | childUri / childHash / EncryptedData を抽出 |

---

## 検討フェーズの作業ステップ

### Phase 1: マッピング表の作成（本タスク）

- [ ] maiml2Excel の全 Excel 列 ↔ DB カラムのマッピング表を `mapping_table.md` として作成
- [ ] 現行テーブルで対応済み／未対応の項目を色分け整理
- [ ] test.maiml を使った具体的なデータ例でマッピングを検証

### Phase 2: テーブル設計書の作成（本タスク）

- [ ] 新規テーブル（`maiml_instance` / `maiml_insertion` / `maiml_result_kv` / `maiml_encrypted_data`）の DDL 案を `db_design.md` として作成
- [ ] 既存テーブルへの追加カラム案を整理
- [ ] ER 図（Mermaid）で全体像を図示

### Phase 3: 解析処理の拡張設計（次タスク）

- [ ] `maimlKvExtractorService.ts` の拡張ポイントごとに実装方針を確定
- [ ] `instruction_id` 紐付けロジックの具体案を設計（MaiML 構造解析）
- [ ] inline series（`<content>` 数値配列）の解析方針を設計

### Phase 4: 実装（次次タスク）

- [ ] Migration SQL（新規テーブル・カラム追加）
- [ ] 型定義更新（`maimlOpenData.ts`）
- [ ] Repository 層追加
- [ ] `maimlKvExtractorService.ts` 拡張実装

---

## 成果物ファイル構成

```
docs/20260311_0857_maiml2Excel_DB設計検討/
├── PLAN.md              # 本ファイル（タスク計画書）
├── mapping_table.md     # maiml2Excel 出力 ↔ DB カラム マッピング表
└── db_design.md         # テーブル設計書（DDL 案・ER 図）
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| result KV テーブル追加で既存 condition/material KV と重複 | 中 | 中 | 共通化・統合の可否を設計段階で検討 |
| instruction_id 紐付けが複雑で MaiML 構造依存になる | 高 | 高 | eventLog の ref 連鎖を追跡するロジックを整理 |
| maiml2Excel の axis/size カラムが実際には空ばかり | 低 | 中 | サンプルデータで出現頻度確認後に判断 |
| 暗号化データ対応が本番要件外になる可能性 | 低 | 中 | オプションテーブルとして設計し段階的に実装 |

---

## 承認記録

- **計画書提示日時**: 2026-03-11 08:57
- **承認日時**: （承認後に記入）
- **承認者コメント**: 
