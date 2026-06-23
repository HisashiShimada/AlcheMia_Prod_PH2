# サンプルテンプレート集: Excel取り込み機能

Excelフォーマットのパターンを想定ケース別にまとめた資料です。  
各パターンは「ダウンロード時の出力例」と「ユーザー記入後のアップロード例」の2段構成で示します。

---

## 凡例

```
行1: ヘッダー行        … ユーザーが見る列名
行2: メタデータ行      … システムが読む識別子（非表示・グレー背景）
行3以降: データ行       … ユーザーが実験値を記入
```

---

## パターン1: シンプル（単一テンプレート・少プロパティ）

### 想定シナリオ
Material テンプレートが1つ、プロパティ数が2〜3個の最もシンプルなケース。

### テンプレート定義（MAIML）

```xml
<materialTemplate id="MAT001">
  <name>サンプル材料</name>
  <property key="temperature" xsi:type="decimal" units="°C"/>
  <property key="material"    xsi:type="string"/>
</materialTemplate>
```

### ダウンロード時の出力（タスク件数: 3）

```
┌───────────┬───────────┬─────────┐
│ タスク番号 │  温度(°C)  │  材料名  │
├───────────┼───────────┼─────────┤
│  _meta_   │MAT001#temp│MAT001#ma│  ← 非表示
│           │erature#de │terial#s │
│           │cimal#°C   │tring#   │
├───────────┼───────────┼─────────┤
│     1     │           │         │  ← 記入待ち
├───────────┼───────────┼─────────┤
│     2     │           │         │  ← 記入待ち
├───────────┼───────────┼─────────┤
│     3     │           │         │  ← 記入待ち
└───────────┴───────────┴─────────┘
```

**メタデータ行の実際の値（全文）:**

| セル | 値 |
|------|-----|
| A2 | `_meta_` |
| B2 | `MAT001#temperature#decimal#°C` |
| C2 | `MAT001#material#string#` |

### ユーザー記入後（アップロード用）

```
┌───────────┬───────────┬─────────────┐
│ タスク番号 │  温度(°C)  │    材料名    │
├───────────┼───────────┼─────────────┤
│  _meta_   │ (非表示)  │  (非表示)   │
├───────────┼───────────┼─────────────┤
│     1     │   25.5    │    炭素鋼   │
├───────────┼───────────┼─────────────┤
│     2     │   30.0    │  ステンレス  │
├───────────┼───────────┼─────────────┤
│     3     │   28.2    │    アルミ   │
└───────────┴───────────┴─────────────┘
```

### アップロード後のデータ（イメージ）

```json
[
  { "taskNo": 1, "templateId": "MAT001", "properties": [{ "key": "temperature", "value": 25.5, "units": "°C" }, { "key": "material", "value": "炭素鋼" }] },
  { "taskNo": 2, "templateId": "MAT001", "properties": [{ "key": "temperature", "value": 30.0, "units": "°C" }, { "key": "material", "value": "ステンレス" }] },
  { "taskNo": 3, "templateId": "MAT001", "properties": [{ "key": "temperature", "value": 28.2, "units": "°C" }, { "key": "material", "value": "アルミ" }] }
]
```

---

## パターン2: 複数プロパティ（単一テンプレート・多プロパティ）

### 想定シナリオ
Material テンプレート1つに5〜6個のプロパティが定義されているケース。

### テンプレート定義（MAIML）

```xml
<materialTemplate id="MAT001">
  <name>高機能材料</name>
  <property key="temperature" xsi:type="decimal" units="°C"/>
  <property key="material"    xsi:type="string"/>
  <property key="pressure"    xsi:type="decimal" units="Pa"/>
  <property key="humidity"    xsi:type="decimal" units="%"/>
  <property key="coating"     xsi:type="boolean"/>
  <property key="batch_no"    xsi:type="integer"/>
</materialTemplate>
```

### ダウンロード時の出力（タスク件数: 5）

**ヘッダー行（1行目）:**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| タスク番号 | 温度(°C) | 材料名 | 圧力(Pa) | 湿度(%) | coating | batch_no |

**メタデータ行（2行目・非表示）:**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `_meta_` | `MAT001#temperature#decimal#°C` | `MAT001#material#string#` | `MAT001#pressure#decimal#Pa` | `MAT001#humidity#decimal#%` | `MAT001#coating#boolean#` | `MAT001#batch_no#integer#` |

**データ行（3行目以降・記入前）:**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

### ユーザー記入後（アップロード用）

| タスク番号 | 温度(°C) | 材料名 | 圧力(Pa) | 湿度(%) | coating | batch_no |
|-----------|---------|--------|---------|---------|---------|---------|
| 1 | 25.5 | 炭素鋼 | 500 | 60 | true | 1001 |
| 2 | 30.0 | ステンレス | 600 | 55 | false | 1002 |
| 3 | 28.2 | アルミ | 550 | 62 | true | 1003 |
| 4 | 22.1 | 銅 | 480 | 58 | false | 1004 |
| 5 | 35.0 | チタン | 700 | 50 | true | 1005 |

### バリデーション挙動の例

| 入力値 | xsiType | 結果 |
|-------|---------|------|
| `25.5` | `decimal` | ✅ → `25.5` |
| `abc` | `decimal` | ❌ → エラー「数値を入力してください」 |
| `1001` | `integer` | ✅ → `1001` |
| `true` | `boolean` | ✅ → `true` |
| `はい` | `boolean` | ✅ → `true` |
| `yes` | `boolean` | ✅ → `true` |
| `炭素鋼` | `string` | ✅ → `"炭素鋼"` |
| （空欄） | `decimal` | ✅ → `null`（空欄許容） |

---

## パターン3: 階層プロパティ（propertyListType）

### 想定シナリオ
プロパティがネスト構造（子プロパティを持つ）になっているケース。  
**※ Phase1では出力対象外。Phase4で対応予定。**

### テンプレート定義（MAIML）

```xml
<materialTemplate id="MAT002">
  <name>複合材料</name>
  <property key="temperature" xsi:type="decimal" units="°C"/>
  <property key="composition" xsi:type="propertyListType">
    <!-- 子プロパティ -->
    <property key="element" xsi:type="string"/>
    <property key="ratio"   xsi:type="decimal" units="%"/>
    <property key="purity"  xsi:type="decimal" units="%"/>
  </property>
</materialTemplate>
```

### Phase1での扱い（現状）

`propertyListType` のプロパティ（`composition`）はスキップされ、以下の列のみ出力される：

| A | B |
|---|---|
| タスク番号 | 温度(°C) |

### Phase4での対応案（将来）

**案A: 子プロパティをフラット展開**

| タスク番号 | 温度(°C) | 組成/元素 | 組成/比率(%) | 組成/純度(%) |
|-----------|---------|----------|------------|------------|
| 1 | 25.5 | 炭素 | 80 | 99.9 |
| 2 | 30.0 | 鉄 | 70 | 98.5 |

**メタデータ行:**

| `_meta_` | `MAT002#temperature#decimal#°C` | `MAT002#composition.element#string#` | `MAT002#composition.ratio#decimal#%` | `MAT002#composition.purity#decimal#%` |

**案B: 縦長フォーマットに切り替え**（複数グループがある場合）

| タスク番号 | グループ番号 | 元素 | 比率(%) | 純度(%) |
|-----------|------------|------|--------|--------|
| 1 | 1 | 炭素 | 80 | 99.9 |
| 1 | 2 | 鉄 | 20 | 98.5 |
| 2 | 1 | 銅 | 60 | 97.0 |

---

## パターン4: 複数テンプレート（Material + Condition）

### 想定シナリオ
Material テンプレートと Condition テンプレートが同時に必要なケース。  
同じタスク番号に対して両方のプロパティを一度に入力したい場合。

### テンプレート定義（MAIML）

```xml
<materialTemplate id="MAT001">
  <property key="temperature" xsi:type="decimal" units="°C"/>
  <property key="material"    xsi:type="string"/>
</materialTemplate>

<conditionTemplate id="COND001">
  <property key="pH"       xsi:type="decimal"/>
  <property key="humidity" xsi:type="decimal" units="%"/>
</conditionTemplate>
```

### ダウンロード時の出力（タスク件数: 3）

**ヘッダー行（1行目）:**

| A | B | C | D | E |
|---|---|---|---|---|
| タスク番号 | 温度(°C) | 材料名 | pH | 湿度(%) |

**メタデータ行（2行目・非表示）:**

| A | B | C | D | E |
|---|---|---|---|---|
| `_meta_` | `MAT001#temperature#decimal#°C` | `MAT001#material#string#` | `COND001#pH#decimal#` | `COND001#humidity#decimal#%` |

**ポイント**: 列B・C は `MAT001`、列D・E は `COND001` のプロパティ。  
`templateId` が違う列は、アップロード時に別々の `TemplateDataRecord` として生成される。

### ユーザー記入後（アップロード用）

| タスク番号 | 温度(°C) | 材料名 | pH | 湿度(%) |
|-----------|---------|--------|-----|--------|
| 1 | 25.5 | 炭素鋼 | 7.2 | 60 |
| 2 | 30.0 | ステンレス | 7.5 | 55 |
| 3 | 28.2 | アルミ | 6.8 | 62 |

### アップロード後のデータ生成イメージ

```
タスク1:
  TemplateDataRecord #1: templateId=MAT001, properties=[temperature=25.5, material=炭素鋼]
  TemplateDataRecord #2: templateId=COND001, properties=[pH=7.2, humidity=60]

タスク2:
  TemplateDataRecord #3: templateId=MAT001, properties=[temperature=30.0, material=ステンレス]
  TemplateDataRecord #4: templateId=COND001, properties=[pH=7.5, humidity=55]

タスク3:
  TemplateDataRecord #5: templateId=MAT001, properties=[temperature=28.2, material=アルミ]
  TemplateDataRecord #6: templateId=COND001, properties=[pH=6.8, humidity=62]
```

---

## パターン5: エラーケースのサンプル

アップロード時に発生するエラーのパターンと、システムが返すエラーメッセージの例です。

### 5.1 メタデータ行が削除されている

**症状**: ユーザーが2行目を削除してしまった

```
┌───────────┬───────────┬─────────┐
│ タスク番号 │  温度(°C)  │  材料名  │  ← 1行目（ヘッダー）
├───────────┼───────────┼─────────┤
│     1     │   25.5    │  炭素鋼  │  ← 2行目（本来はメタデータ行だが削除済み）
└───────────┴───────────┴─────────┘
```

**エラーレスポンス:**

```json
{
  "success": false,
  "data": {
    "errors": [
      {
        "row": 2,
        "message": "メタデータ行の識別子が不正です。Excelは必ずシステムからダウンロードしたファイルを使用してください。"
      }
    ]
  }
}
```

---

### 5.2 数値列に文字が入力されている

| タスク番号 | 温度(°C) | 材料名 |
|-----------|---------|--------|
| 1 | **25℃** | 炭素鋼 | ← 単位込みで入力してしまった（NG）
| 2 | 30.0 | ステンレス |

**エラーレスポンス:**

```json
{
  "success": false,
  "data": {
    "totalRows": 2,
    "successCount": 1,
    "errorCount": 1,
    "errors": [
      {
        "row": 3,
        "taskNo": 1,
        "field": "temperature",
        "message": "行3: \"temperature\" は数値を入力してください（入力値: \"25℃\"）"
      }
    ]
  }
}
```

---

### 5.3 タスク番号が重複している

| タスク番号 | 温度(°C) |
|-----------|---------|
| 1 | 25.5 |
| 1 | 30.0 | ← タスク番号が重複（NG）
| 2 | 28.2 |

**エラーレスポンス:**

```json
{
  "errors": [
    {
      "row": 4,
      "taskNo": 1,
      "field": "タスク番号",
      "message": "タスク番号 1 が重複しています"
    }
  ]
}
```

---

### 5.4 boolean列への不正な値

| タスク番号 | coating |
|-----------|---------|
| 1 | 有り | ← "あり/なし"ではなくtrue/falseが必要

**対応案（システム側）:**
- `はい` / `いいえ` も許容するか、エラーにするか要検討
- 現時点ではエラーとして返却（将来的には許容値を拡張可能）

---

## パターン6: 大容量データ（100件以上）

### 想定シナリオ
100件、500件などの大量タスクを一括インポートするケース。

### 注意事項

| 件数 | 想定処理時間 | 対応方針 |
|------|------------|---------|
| 〜50件 | < 1秒 | 同期処理でOK |
| 51〜500件 | 1〜5秒 | 同期処理（タイムアウト注意） |
| 501件〜 | 5秒超 | 非同期バッチ処理を推奨（Phase4） |

### 大容量時のExcel構造

ファイルサイズ上限: **10MB**（multer設定）

1000件 × 10列 = 約100KB程度のため、通常の実験データでは問題なし。

---

## フォーマット選定ガイド

| 状況 | 推奨フォーマット |
|------|--------------|
| テンプレート1種、プロパティ5個以下 | パターン1（シンプル） |
| テンプレート1種、プロパティ10個以上 | パターン2（複数プロパティ） |
| 階層プロパティがある | パターン3（Phase4対応待ち） |
| テンプレート2〜3種 | パターン4（複数テンプレート横長） |
| テンプレート4種以上 | シート分割フォーマット（案C）を検討 |

---

## 実際のExcelファイルの作成方法（参考）

設計書で定義したフォーマットを確認したい場合は、以下のコードでサンプルExcelを生成できます（実装後）：

```bash
# バックエンドの開発サーバー起動後
curl -X GET \
  "http://localhost:3000/api/v1/experiment/PROJ001/method/METHOD001/template-data/download-excel?taskCount=5" \
  -H "Cookie: session=..." \
  --output sample_output.xlsx
```

または、フロントエンドのダウンロードボタンから取得してください。
