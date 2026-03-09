# MaiML 公開処理 実装方針・不明点まとめ

> 元仕様書: `docs/design/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md` (v1.3, 2026-02-17)
> 作成日: 2026-03-05

---

## 1. 実装時の重要な考慮事項

### 1.1 冪等性（再実行安全性）

- 生データの取り込みは途中失敗→再実行しても同じ結果になるよう設計する
- `checksum_sha256` で整合性を確認する
- テスト計画にも「RAW 取り込みの冪等（途中失敗→再実行で一致）」が明記されている

### 1.2 CASCADE 削除の設計

- 非公開時は `asset_id` の親テーブル削除で子テーブルが自動削除される
- DELETE 操作は `maiml_asset` に対して行えばよい（子テーブルの個別削除不要）
- 削除対象: プレビュー / KV / 生データヘッダ / 生データチャンク
- `keep_raw_on_unpublish=true` の場合のみ生データを残すことが可能（レジストリで設定）

### 1.3 パフォーマンス指針

| 項目 | 推奨設定 |
|------|---------|
| チャンクサイズ | 32,768 点（I/O・メモリ・可視化応答の妥協点、調整可） |
| 挿入方法 | COPY コマンド推奨（大量データの場合） |
| 優先インデックス | `(asset_id, content_id)`, `(raw_id, chunk_index)` |
| 大量データ対応 | 連続投入が多い場合はテーブルパーティション分割も検討 |
| Binary 方式 | 圧縮率と CPU コストのトレードオフを評価して選択 |

### 1.4 ロール設計

| ロール | 権限 | 説明 |
|--------|------|------|
| `viewer` | SELECT のみ | 閲覧ユーザー |
| `publisher` | INSERT / DELETE / 関数実行 | 公開・非公開操作ユーザー |
| `admin` | DDL（テーブル定義変更） | システム管理者 |

---

## 2. 各テーブルのカラムマッピング判別可否（仕様書からの読み取り限界）

### 2.1 判別可否サマリー

| テーブル名 | DDL の完全性 | XML→カラムマッピングの判別 | 備考 |
|-----------|------------|--------------------------|------|
| `maiml_publish_registry` | ❌ **抜粋のみ** | △ 追加カラムのみ判別可 | ALTER TABLE（抜粋）のため全量不明 |
| `maiml_asset` | ❌ **抜粋のみ** | △ `template_only` 追加のみ確認可 | ALTER TABLE（抜粋）のため全量不明 |
| `maiml_condition_kv` | ✅ 全量あり | ✅ ほぼ判別可 | CREATE TABLE 全量記載あり |
| `maiml_material_kv` | ✅ 全量あり | ✅ ほぼ判別可 | CREATE TABLE 全量記載あり |
| `maiml_series_preview` | ✅ 全量あり | ✅ ほぼ判別可 | CREATE TABLE 全量記載あり |
| `maiml_series_raw_header` | ✅ 全量あり | ✅ ほぼ判別可 | CREATE TABLE 全量記載あり |
| `maiml_series_raw_chunk` | ✅ 全量あり | ✅ 判別可 | CREATE TABLE 全量記載あり |
| `maiml_series_raw_chunk_bin` | ✅ 全量あり | ✅ 判別可 | CREATE TABLE 全量記載あり |

---

### 2.2 テーブルごとの詳細分析

#### ❌ maiml_publish_registry（スキーマ不完全）

仕様書には `ALTER TABLE`（追加カラムのみ）が記載されており、**既存のカラム構成が不明**。

```
【仕様書で確認できるカラム（追加分のみ）】
- template_only          ← ユーザーが register 時に指定
- store_raw_series       ← ユーザーが register 時に指定
- store_raw_raster       ← ユーザーが register 時に指定
- raw_chunk_size         ← ユーザーが register 時に指定（デフォルト: 65536）
- raw_compression        ← ユーザーが register 時に指定（デフォルト: 'zstd'）
- keep_raw_on_unpublish  ← ユーザーが register 時に指定

【不明なカラム（既存スキーマ）】
- ファイル URI を保持するカラム名 → CLI の --file-uri から入ることは推測できるが不明
- ステータス（requested/published 等）カラムの有無・名前 → 不明
- PRIMARY KEY の構成 → 不明
```

#### ❌ maiml_asset（スキーマ不完全）

仕様書には `ALTER TABLE`（`template_only` 追加のみ）が記載されており、**既存のカラム構成が不明**。

```
【仕様書から存在が確認できるカラム】
- asset_id      ← 他テーブルの REFERENCES で参照されており存在確実
- doc_name      ← 検索クエリの SELECT 句で参照されており存在確実
                  取得元: maiml > document > name 要素（XRF.maiml 実データで確定）
                  xpath: /maiml/document/name/text()
- template_only ← ALTER TABLE で追加確認

【不明なカラム（既存スキーマ）】
- ファイルの URI / パスを保持するカラムがあるか → 不明
- 公開ステータス / 公開日時のカラム → 不明
- organization_id など mmdpf 固有のカラム → 不明
```

---

#### ✅ maiml_condition_kv / maiml_material_kv（カラムマッピング確定）

XSD の `maiml-property.xsd` に property の型定義があり、全カラムのマッピングが確認できた。

| カラム | XML 上の対応 | 参照元 XSD |
|--------|------------|-----------|
| `asset_id` | 親アセットの ID（システム生成） | — |
| `instruction_id` | `<instruction id="...">` の `id` 属性 | maiml-protocol.xsd |
| `template_id` | `<conditionTemplate id="...">` / `<materialTemplate id="...">` の `id` 属性 | maiml-protocol.xsd |
| `source_section` | タグ種別の固定値（`'conditionTemplate'` / `'condition'` 等） | maiml-protocol.xsd |
| `path` | property の XML 階層パス（例: `spectrumA/ExternalFile`） | maiml-property.xsd |
| `key` | `propertyBaseType` の `key` 属性（必須・QName） | maiml-property.xsd |
| `idx` | 同名 property の連番（0 始まり） | — |
| `value_text` | `<value>` 子要素（文字列型: `stringType`, `tokenType` 等） | maiml-property.xsd |
| `value_num` | `<value>` 子要素（数値型: `doubleType`, `intType` 等） | maiml-property.xsd |
| `unit` | `units` 属性（数値型のみ存在） | maiml-property.xsd |
| `value_type` | **タグ名自体**（`<doubleType>` → `"double"` 等） | maiml-property.xsd |
| `format_string` | `formatString` 属性（数値型・日付型のみ存在） | maiml-property.xsd |
| `scale_factor` | `scaleFactor` 属性（数値型のみ存在） | maiml-property.xsd |

**value_type の値一覧（property タグ名 → DB 保存値）：**

| XSD タグ名 | value_type | 値の種類 |
|-----------|-----------|---------|
| `stringType` / `tokenType` | `"string"` / `"token"` | テキスト |
| `doubleType` / `floatType` / `decimalType` | `"double"` / `"float"` / `"decimal"` | 数値（浮動小数） |
| `intType` / `longType` / `shortType` | `"int"` / `"long"` / `"short"` | 数値（整数） |
| `dateTimeType` | `"dateTime"` | 日付時刻 |
| `booleanType` | `"boolean"` | 真偽値 |
| `uriType` / `uuidType` | `"uri"` / `"uuid"` | URI / UUID |
| `doubleListType` 等 | `"doubleList"` 等 | リスト型 |

---

#### ✅ maiml_series_preview（カラムマッピング確定）

XSD の `maiml-property.xsd`（contentBaseType）と `maiml-protocol.xsd` から全カラムが確認できた。

| カラム | XML 上の対応 | 参照元 XSD |
|--------|------------|-----------|
| `asset_id` | 親アセットの ID（システム生成） | — |
| `instruction_id` | `<instruction id="...">` の `id` 属性 | maiml-protocol.xsd |
| `template_id` | `<resultTemplate id="...">` の `id` 属性 | maiml-protocol.xsd |
| `result_id` | `<result id="...">` の `id` 属性 | maiml-data.xsd |
| `result_name` | `<result>` 内 `<name>` 要素 | maiml-core.xsd |
| `content_id` | `contentBaseType` の `id` 属性（xs:ID） | maiml-property.xsd |
| `content_size` | `contentBaseType` の `size` 属性（xs:int） | maiml-property.xsd |
| `x_label` | `axis="x"` の content の `key` 属性（例: `"Wavelength"`） | maiml-property.xsd |
| `y_label` | `axis="y"` の content の `key` 属性（例: `"Intensity"`） | maiml-property.xsd |
| `x[]` / `y[]` | `<data>` の数値配列をサンプリングした結果 | — |
| `original_points` | `<data>` の元の総点数 | — |
| `preview_points` | サンプリング後の点数（最大 2,000） | — |
| `mode` | `uniform` / `maxhold` / `mmr`（設定値） | — |
| `quality` | MAE / MAPE / Peak Recall / Area（任意保存） | — |
| `series_type` | `key` 属性の文字列から判定（下記参照） | ⚠️ 判定ルール未決 |

---

#### ✅ maiml_series_raw_header（カラムマッピング確定）

| カラム | XML 上の対応 | 参照元 XSD |
|--------|------------|-----------|
| `instruction_id` / `template_id` / `result_id` / `result_name` / `content_id` / `content_size` | series_preview と同一（`<data>` と `resultTemplate` 突合） | maiml-protocol.xsd / maiml-property.xsd |
| `x_label` / `y_label` | `axis="x"` / `axis="y"` の content の `key` 属性 | maiml-property.xsd |
| `x_unit` / `y_unit` | content 型の `units` 属性（数値リスト型の場合） | maiml-property.xsd |
| `points_total` | `<data>` の総点数 | — |
| `chunk_count` | 総点数 ÷ chunk_size で算出 | — |
| `storage_format` | `'array'` / `'binary'`（設定値） | — |
| `compression` | `'none'` / `'zstd'` 等（設定値） | — |
| `checksum_sha256` | 取り込み後に計算 | — |

---

### 2.3 XSD 確認後も残る不明点

| 項目 | 内容 |
|------|------|
| `series_type` の判定ロジック | XSD に定義なし。content の `key` 属性文字列から `TIC` / `SPECTRUM_TOTAL` / `OTHER` を判定するとみられるが、**具体的なマッチングルールは実装時に決定が必要**。XRF.maiml は外部ファイル参照形式のため inline series なし。クロマトグラフィー系サンプルが別途必要。 |
| `maiml_asset` の既存スキーマ | `ALTER TABLE`（抜粋）のみ記載。`asset_id`, `doc_name`, `template_only` 以外のカラムは **v1.3 以前の設計書を確認する必要がある** |
| `maiml_publish_registry` の既存スキーマ | 同上。ファイル URI カラム名・ステータスカラム・PRIMARY KEY が不明 |

---

## 3. 実装方針（決定済み）

以下は議論の結果、決定した実装方針。

| 項目 | 決定内容 |
|------|---------|
| **操作のトリガー** | mmdpf のプロジェクト詳細画面の「公開」「非公開」ボタン押下 |
| **対象ファイル** | ボタン押下時点でのプロジェクトの**最新 MaiML ファイル**を自動解析・登録 |
| **既存テーブルとの紐付け** | `project` テーブルとの直接的な紐づけは不要 |
| **実装場所** | mmdpf の **backend（Node.js/Express）に組み込む** |
| **実行可能ロール** | **`experiment_admin`** のみが公開・非公開の両操作を実行可能 |

---

## 4. 未決事項・実装前に決定が必要な点

以下は仕様書および議論でも未決のまま、実装時に別途決定が必要。

### 4.1 DB スキーマ関連

- [ ] `maiml_publish_registry` の PRIMARY KEY / 既存スキーマとの統合方法
- [ ] `maiml_asset` の既存スキーマとの対応（v1.3 以前の設計書を確認）

### 4.2 Worker 実装関連

- [ ] プレビュー生成のデフォルトモード（uniform / maxhold / mmr のどれを使うか）
- [ ] 公開対象の「ファイル URI」がどこに置かれるか（mmdpf の Swift/S3 との連携方法）

### 4.3 フロントエンド関連

- [ ] フロントエンド操作 UI の詳細（公開/非公開ボタンのデザイン、ステータス表示方法、設定入力フォーム）

### 4.4 追加調査が必要なドキュメント

- [ ] v1.3 以前の設計書（`maiml_asset` / `maiml_publish_registry` の既存スキーマ確認）
- [ ] inline series データを含む MaiML サンプル（クロマトグラフィー系など）（`series_type` 判定ロジック確認用）
