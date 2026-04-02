# 実施結果: xsi:type に基づくプロパティ値入力バリデーション対応

- **実施日時**: 2026-04-01 13:44 〜 14:11
- **タスクID**: xsiType入力バリデーション

---

## 実施内容

### Phase 1: xsi:type バリデーション共通ユーティリティの作成 ✅

**新規作成: `frontend/src/utils/xsiTypeValidator.ts`**

`xsi:type` に応じた値バリデーションを行う共通関数を実装。

主な実装関数:
- `validateByXsiType(xsiType, value)` — xsi:type と値を受け取りバリデーション結果を返す
- `isIntegerXsiType(xsiType)` — 整数型かどうかを判定
- `isUnsignedIntXsiType(xsiType)` — 符号なし整数型かどうかを判定
- `isListXsiType(xsiType)` — リスト型かどうかを判定

対応した xsi:type と判定ルール:

| xsi:type | バリデーションルール |
|---|---|
| `intType` / `longType` / `shortType` / `byteType` | 整数値のみ（符号付き） |
| `unsignedIntType` / `unsignedLongType` / `unsignedShortType` / `unsignedByteType` | 0以上の整数値のみ |
| `shortType` | -32768 〜 32767 |
| `byteType` | -128 〜 127 |
| `unsignedShortType` | 0 〜 65535 |
| `unsignedByteType` | 0 〜 255 |
| `floatType` / `doubleType` / `decimalType` | 数値（小数・指数表記可） |
| `booleanType` | `"true"` / `"false"` / `"1"` / `"0"` |
| `dateTimeType` | ISO 8601 日時形式（dayjs で検証） |
| `uriType` | http:// / https:// または相対パス形式 |
| `uuidType` | UUID形式（RFC4122） |
| リスト型 (`*ListType`) | 緩やかに許容（空白・カンマ区切り） |
| `propertyListType` | バリデーションなし（子要素で管理） |
| `stringType` 等 | バリデーションなし（何でも可） |

**新規作成: `frontend/src/utils/__tests__/xsiTypeValidator.test.ts`**

147件のユニットテストを実装・全件PASS確認。

---

### Phase 2: NestedPropertyEditor の修正 ✅

**変更ファイル: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`**

#### 要素名入力欄をセレクト化

従来の自由テキスト `Input` を `Select` に変更。カスタム要素名は `__custom__` 選択時に追加入力欄を表示。

**property / parameter 用選択肢:**
- `value（プロパティ値）⚡ 型に応じた入力欄`
- `description（説明）`
- `🔧 その他（カスタム要素名を入力...）`

**content 用選択肢（`tagName === 'content'` の場合）:**
- `value（コンテンツ値）⚡ 型に応じた入力欄`
- `description（説明）`
- `🔧 その他（カスタム要素名を入力...）`

※ `unit` / `formatString` / `scaleFactor` は XSD 上、XML 属性のため要素選択肢から除外（属性追加モーダルで対応）

#### 要素値入力欄を xsi:type に応じて切り替え（ElementValueInput コンポーネント）

`value` 要素かつ `xsi:type` が設定されている場合のみ、型対応入力コンポーネントを使用：

| xsi:type | 変更後の入力コンポーネント |
|---|---|
| 整数型（`intType` 等） | `InputNumber`（precision=0） |
| 符号なし整数型（`unsignedIntType` 等） | `InputNumber`（min=0, precision=0） |
| `floatType` / `doubleType` / `decimalType` | `InputNumber` |
| `booleanType` | `Select`（true / false の2択） |
| `dateTimeType` | `DatePicker`（showTime） |
| リスト型（`*ListType`） | `TextArea`（スペース区切りのヘルプテキスト付き） |
| その他 | `TextArea` |

#### propertyListType への value 追加をブロック

`xsi:type === 'propertyListType'` のとき `value` 選択肢を `disabled` にし、追加ボタン押下時にもブロック＋警告表示。

#### 属性追加プルダウンを XSD 定義に基づきタグ別に整理

XSD（`maiml-property.xsd`）を確認し、`property` / `content` の属性を正確に整理。

**property / parameter 共通:**
- `xsi:type`（MaiML型定義）
- `key`（キー・必須）
- `formatString`（書式文字列）
- `units`（単位）
- `scaleFactor`（スケール係数）
- カスタム

**content 追加属性（`contentBaseType` 固有）:**
- `axis`（軸名: x / y / z / time）
- `size`（データサイズ・整数）
- `id`（XML ID）
- `ref`（XML IDREF）

`xsi:type` 選択時のデフォルト値も `content` の場合は `contentDoubleListType`、それ以外は `stringType` に切り替え。

---

### Phase 3: DataRecordDialog の Form.Item rules への型バリデーター追加 ✅

**変更ファイル: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`**

`renderPropertyInput` 内の各 `Form.Item` の `rules` に型バリデーターを追加。

- `intType`: `Number.isInteger` チェック（InputNumber の `precision={0}` と併用）
- `floatType`: `isNaN(Number(value))` チェック（InputNumber と併用）
- `booleanType` / `dateType` / `dateTimeType`: UIコンポーネント制約により不正値入力不可のため追加なし

---

## 変更ファイル一覧

| 種別 | ファイルパス |
|---|---|
| 新規作成 | `frontend/src/utils/xsiTypeValidator.ts` |
| 新規作成 | `frontend/src/utils/__tests__/xsiTypeValidator.test.ts` |
| 変更 | `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` |
| 変更 | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` |

---

## テスト結果

| テスト対象 | テスト数 | 結果 |
|---|---|---|
| `xsiTypeValidator.ts` ユニットテスト | 147件 | ✅ 全件 PASS |

---

## 今回スコープ外（将来対応）

- XMLビュー直接編集時のバリデーション
- バックエンド側での xsi:type バリデーション
- リスト型の詳細な値パースバリデーション
- `insertion`（ファイルアップロード）の拡張子・MIME タイプチェック
