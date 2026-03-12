# maiml2Excel 出力 ↔ DB カラム マッピング表

> 基準資料: `maiml2Excel/処理解析レポート.md`  
> 方針: maiml2Excel の出力項目のみをベースに DB 構成を設計する  
> 作成日: 2026-03-11

---

## 1. Excel 出力の構造

maiml2Excel は以下の構造で出力する：

```
【1 ファイル = 1 MaiML】
    │
    ├── シート 1: {行番号}-{result_id}   ← 1 result インスタンス = 1 シート
    ├── シート 2: {行番号}-{material_id} ← 1 material インスタンス = 1 シート
    ├── シート 3: {行番号}-{condition_id}← 1 condition インスタンス = 1 シート
    └── ...
         各シート内:
           行 1: ヘッダ行
           行 2〜: データ行（1行 = 1要素）
```

---

## 2. Excel 列定義（全 15 列）

| 列 | ヘッダ名 | 格納内容 | 元 XML |
|----|---------|---------|--------|
| A | MaiML file lineNo | XML の行番号 | `element.sourceline` |
| B | hierarchy | 階層番号（例: `1`, `1-2`, `1-2-3`） | 処理で付与 |
| C | element | 要素種別名 | タグ名（`insertion`, `uri`, `hash`, `property`, `content`, `uncertainty` 等） |
| D | description | 説明文 | `<description>` 子要素テキスト |
| E | element data | 要素データ値（insertion 系・暗号化データ） | `<uri>`, `<hash>`, `<uuid>`, `<format>`, `childUri` 等のテキスト |
| F | @xsi:type | データ型 | `@xsi:type` 属性 |
| G | @key | キー名（NS プレフィックス付き） | `@key` 属性 |
| H | @formatString | フォーマット文字列 | `@formatString` 属性 |
| I | @units | 単位 | `@units` 属性 |
| J | @scaleFactor | スケール係数 | `@scaleFactor` 属性 |
| K | @axis | 軸情報 | `@axis` 属性 |
| L | @size | サイズ | `@size` 属性 |
| M | @id | 要素自身の ID | `@id` 属性 |
| N | @ref | 参照先 ID | `@ref` 属性 |
| O | value | データ値（property/content/uncertainty の `<value>` テキスト） | `<value>` 子要素テキスト |

---

## 3. シート名（インスタンス識別情報）

シート名 = `{MaiML行番号}-{instance_id}` (最大20文字)

シート名から以下を導出：
- `instance_id` = インスタンスの `@id` 属性
- `instance_type` = `result` / `material` / `condition`（XML パスで判断）
- `template_ref` = インスタンスの `@ref` 属性（参照先テンプレート ID）

---

## 4. 行種別と格納カラムの対応

### 4.1 行種別一覧

maiml2Excel が出力する行は以下の種別がある：

| 行種別 | C 列（element）の値 | 主要格納列 |
|--------|-------------------|-----------|
| insertion（外部ファイル参照本体） | `insertion` | — |
| insertion-uri | `uri` | E 列 |
| insertion-hash | `hash` | E 列（hash_method は元 XML の `@method` 属性） |
| insertion-uuid | `uuid` | E 列 |
| insertion-format | `format` | E 列 |
| property | `property` | F〜N 列（属性）、O 列（値） |
| content | `content` | F〜N 列（属性）、O 列（値） |
| uncertainty | `uncertainty` | F〜N 列（属性）、O 列（値） |
| 暗号化データ | `childUri` / `childHash` / `childUuid` / `EncryptedData` | E 列 |

### 4.2 列別マッピング詳細

#### A 列: MaiML file lineNo → `maiml_line_no`

| DB カラム | 型 | 説明 |
|----------|---|------|
| `maiml_line_no` | INTEGER | XML ファイル内の元行番号。トレーサビリティ確保用。 |

#### B 列: hierarchy → `hierarchy`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `hierarchy` | TEXT | 階層番号文字列 | `1`, `1-2`, `1-2-3` |

同一インスタンス内での相対的な位置を表す。直下要素は `1`, `2`, `3`...、入れ子になった場合は `1-1`, `1-2` のように `-` で連結。

#### C 列: element → `element_type`

| DB カラム | 型 | 値 | 説明 |
|----------|---|---|------|
| `element_type` | TEXT | `insertion` / `uri` / `hash` / `uuid` / `format` / `property` / `content` / `uncertainty` / `childUri` / `childHash` / `childUuid` / `EncryptedData` | タグ種別 |

#### D 列: description → `description`

| DB カラム | 型 | 説明 |
|----------|---|------|
| `description` | TEXT | `<description>` 子要素のテキスト内容。NULL 可。 |

#### E 列: element data → `element_data`

| DB カラム | 型 | 説明 | 格納されるケース |
|----------|---|------|----------------|
| `element_data` | TEXT | 要素データ値 | insertion 系（uri/hash/uuid/format のテキスト）、暗号化データ（childUri 等） |

#### F 列: @xsi:type → `xsi_type`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `xsi_type` | TEXT | `xsi:type` 属性の値 | `intType`, `stringType`, `doubleType`, `dateType`, `uriType`, `uuidType`, `stringListType` |

property / content / uncertainty 行のみ設定される。

#### G 列: @key → `key`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `key` | TEXT | `@key` 属性。名前空間プレフィックス込み。 | `tiff:ImageWidth`, `semVendor:Note` |

#### H 列: @formatString → `format_string`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `format_string` | TEXT | `@formatString` 属性 | `YYYY-MM-DDThh:mm:ss.sssTZD` |

#### I 列: @units → `units`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `units` | TEXT | `@units` 属性（単位） | `mm`, `seconds`, `nm` |

#### J 列: @scaleFactor → `scale_factor`

| DB カラム | 型 | 説明 |
|----------|---|------|
| `scale_factor` | DOUBLE PRECISION | `@scaleFactor` 属性（数値スケール係数） |

#### K 列: @axis → `axis`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `axis` | TEXT | `@axis` 属性（軸情報） | `x`, `y`, `z` |

#### L 列: @size → `size_value`

| DB カラム | 型 | 説明 |
|----------|---|------|
| `size_value` | INTEGER | `@size` 属性 |

#### M 列: @id → `element_id`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `element_id` | TEXT | 要素自身の `@id` 属性 | `prop_001` |

**注意**: インスタンス（result/material/condition）の `@id` とは別物。行レベルの要素の id。

#### N 列: @ref → `element_ref`

| DB カラム | 型 | 説明 | 例 |
|----------|---|------|---|
| `element_ref` | TEXT | `@ref` 属性（参照先 ID） | `template_001` |

#### O 列: value → `value`

| DB カラム | 型 | 説明 | 備考 |
|----------|---|------|------|
| `value` | TEXT | `<value>` 子要素のテキスト内容 | 複数 value がある場合は複数行に展開（同じ hierarchy で idx 増加） |

**複数 value の扱い:**  
同一要素に複数の `<value>` がある場合（例: `tiff:StripByteCounts` の 256 個の値）、
maiml2Excel は **各 value を別行**として出力する。  
DB では同一 hierarchy の行が複数存在することになり、`value_idx`（0-origin の連番）で区別する。

---

## 5. インスタンスレベル情報（シート単位）

Excel のシートメタ情報として存在するが、行データには含まれない情報：

| 情報 | 取得元 | DB カラム候補 |
|------|--------|-------------|
| インスタンス種別 | XML パス（result/material/condition） | `instance_type` |
| インスタンス ID | `@id` 属性 | `instance_key` |
| 参照先テンプレート ID | `@ref` 属性 | `template_ref` |
| インスタンス UUID | `<uuid>` 子要素 | `instance_uuid` |
| インスタンス名 | `<name>` 子要素 | `instance_name` |
| XML 行番号 | `element.sourceline` | `instance_line_no` |

---

## 6. insertion の hash_method（E 列に含まれない情報）

maiml2Excel の `addinsertioncontent()` では hash の `@method` 属性（`SHA-256` 等）も
E 列に格納されるが、分離して専用カラムに持つべき情報：

| 情報 | 取得元 | DB カラム候補 |
|------|--------|-------------|
| ハッシュ値 | `<hash>` テキスト | `hash_value` |
| ハッシュアルゴリズム | `<hash method="...">` | `hash_method` |

---

## 7. 全マッピング一覧表（Excel 列 → DB カラム）

| Excel 列 | ヘッダ | DB カラム | 型 | NULL 可 | 備考 |
|---------|--------|----------|---|---------|------|
| — | シート名 | `instance_type` | TEXT | NO | `result`/`material`/`condition` |
| — | シート名 | `instance_key` | TEXT | NO | インスタンスの `@id` |
| — | インスタンス属性 | `template_ref` | TEXT | YES | インスタンスの `@ref` |
| — | インスタンス子要素 | `instance_uuid` | TEXT | YES | `<uuid>` テキスト |
| — | インスタンス子要素 | `instance_name` | TEXT | YES | `<name>` テキスト |
| — | インスタンス行番号 | `instance_line_no` | INTEGER | YES | XML 行番号 |
| A | MaiML file lineNo | `maiml_line_no` | INTEGER | YES | 行レベルの XML 行番号 |
| B | hierarchy | `hierarchy` | TEXT | NO | `1`, `1-2`, `1-2-3` |
| C | element | `element_type` | TEXT | NO | タグ種別 |
| D | description | `description` | TEXT | YES | `<description>` テキスト |
| E | element data | `element_data` | TEXT | YES | insertion 系・暗号化データ値 |
| E | (hash method) | `hash_method` | TEXT | YES | `<hash method="...">` の属性値 |
| F | @xsi:type | `xsi_type` | TEXT | YES | `intType` 等 |
| G | @key | `key` | TEXT | YES | `tiff:ImageWidth` 等 |
| H | @formatString | `format_string` | TEXT | YES | フォーマット文字列 |
| I | @units | `units` | TEXT | YES | 単位 |
| J | @scaleFactor | `scale_factor` | DOUBLE | YES | 数値スケール |
| K | @axis | `axis` | TEXT | YES | 軸情報 |
| L | @size | `size_value` | INTEGER | YES | サイズ |
| M | @id | `element_id` | TEXT | YES | 行レベル要素の @id |
| N | @ref | `element_ref` | TEXT | YES | 行レベル要素の @ref |
| O | value | `value` | TEXT | YES | `<value>` テキスト |
| — | 複数 value 連番 | `value_idx` | INTEGER | NO | 複数 value の 0-origin 連番（単一は 0） |

---

## 8. test.maiml を使った具体的なマッピング例

### インスタンス情報（シートメタ）

| instance_type | instance_key | template_ref | instance_uuid | instance_name |
|---------------|-------------|-------------|--------------|--------------|
| material | juyosample_MT_ver1-2_instance | juyosample_MT_ver1-2 | 3ffa7ec0-... | Grid |
| condition | juyosample_CT_ver1-2_instance | juyosample_CT_ver1-2 | 6fb79bdc-... | SEMConditionTemplate |
| result | juyosample_RT_ver1-1_instance | juyosample_RT_ver1-1 | b2aa1099-... | SEMResults |
| result | 2juyosample_RT_ver1-1_instance | juyosample_RT_ver1-1 | b2aa1099-...(2) | — |

### result インスタンス（juyosample_RT_ver1-1_instance）の行データ

| hierarchy | element_type | element_data | xsi_type | key | value | value_idx |
|-----------|-------------|-------------|---------|-----|-------|-----------|
| 1 | insertion | — | — | — | — | 0 |
| 1-1 | uri | Axoneme-56.008.tif | — | — | — | 0 |
| 1-2 | hash | 419b91246fc1... | — | — | — | 0 |
| 1-3 | format | image/tiff | — | — | — | 0 |
| 2 | property | — | shortType | tiff:BitsPerSample | 16 | 0 |
| 3 | content | — | intType | tiff:StripByteCounts | 8192 | 0 |
| 3 | content | — | intType | tiff:StripByteCounts | 8192 | 1 |
| 3 | content | — | intType | tiff:StripByteCounts | 8192 | 2 |
| ... | ... | ... | ... | ... | ... | ... |（256 行） |
| 4 | property | — | intType | tiff:ImageWidth | 1024 | 0 |
| 4-1 | property | — | shortType | tiff:PlanarConfiguration | 1 | 0 |
| 4-2 | property | — | intType | tiff:ImageLength | 1024 | 0 |
| 5 | property | — | shortType | tiff:Compression | 1 | 0 |
