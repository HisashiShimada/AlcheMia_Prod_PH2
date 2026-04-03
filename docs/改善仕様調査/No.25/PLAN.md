# タスク計画書: xsi:type に基づくプロパティ値入力バリデーション対応

## メタデータ
- **作成日時**: 2026-04-01 13:18
- **タスクID**: xsiType入力バリデーション
- **優先度**: 中
- **推定工数**: 4〜6時間

---

## 1. タスク概要

MAIML編集のテンプレート編集ダイアログ（`TemplateEditorDialog`）と実験作業者の実験記録ダイアログ（`DataRecordDialog`）において、プロパティ値に要素を追加する際に、`xsi:type` に従った最低限の入力バリデーションが求められている。

本計画書では、現状のバリデーション実装状況を調査した結果と、未対応部分の取り込み方針を記載する。

---

## 2. 現状調査結果

### 2-1. 対象コンポーネントと役割

| コンポーネント | ファイルパス | 役割 |
|---|---|---|
| `TemplateEditorDialog` | `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | MAIMLテンプレート（Properties/Contents）の編集ダイアログ |
| `NestedPropertyEditor` | `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | テンプレート内プロパティの属性・要素・子要素を編集するネスト構造エディタ |
| `DataRecordDialog` | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 実験作業者がトランジションに実験データを記録するダイアログ |

---

### 2-2. TemplateEditorDialog / NestedPropertyEditor の現状

#### 「要素追加」モーダルのバリデーション（現状）

`NestedPropertyEditor` の「要素追加」モーダル（`showElementAddModal`）では、以下の処理のみ行っている。

```typescript
// 要素追加モーダル onOk
if (newElementName.trim() && newElementValue.trim()) {
  onUpdateNestedElement(propertyKey, newElementName.trim(), newElementValue.trim());
  ...
}
```

**問題点:**
- 要素値（`newElementValue`）の内容チェックはゼロ。空白以外であれば何でも通る。
- `xsi:type` 属性がそのプロパティに設定されていても、型に合致しない値を入力・保存できてしまう。
- 例: `xsi:type="intType"` のプロパティに `"abc"` を入力しても保存可能。

#### 「属性追加」モーダルの `xsi:type` セレクト（現状）

`xsi:type` を選択する UI は存在しており、`MAIML_PROPERTY_TYPES` の一覧（42種類）からドロップダウン選択できる。**ただしこれは「どの xsi:type を設定するか」の選択 UI であり、「入力した値が xsi:type に適合するか」のバリデーションではない。**

#### 子要素追加時のバリデーション（現状）

子要素追加時（`onAddNestedChild`）は、キーの重複チェックのみ実装されており、型チェックは一切なし。

---

### 2-3. DataRecordDialog の現状

`DataRecordDialog` では、各プロパティの `type`（`xsi:type` からマッピングされた `PropertyType`）に応じて入力 UI コンポーネントを切り替えている（`renderPropertyInput`）。

| PropertyType | 使用コンポーネント | バリデーション状況 |
|---|---|---|
| `stringType` | `TextArea` | なし（必須チェックのみ） |
| `intType` | `InputNumber` (step=1, precision=0) | **型制約あり**（InputNumber により整数のみ） |
| `floatType` | `InputNumber` (step=0.01, precision=2) | **型制約あり**（InputNumber により数値のみ） |
| `booleanType` | `Checkbox` | **UI制約あり**（チェックボックスのため不正値入力不可） |
| `dateType` | `DatePicker` (format=YYYY-MM-DD) | **UI制約あり**（DatePickerのため日付のみ） |
| `dateTimeType` | `DatePicker` (showTime) | **UI制約あり**（DatePickerのため日時のみ） |
| `contentDoubleListType` | カスタム DataGrid (`InputNumber`) | **型制約あり**（InputNumberのため数値のみ） |
| `propertyListType` | ネスト表示（再帰） | バリデーションなし |
| `insertion` | `Upload` | バリデーションなし（TODO記載あり） |
| その他（未知型） | `Input` | なし（必須チェックのみ） |

**現状の評価:**
- `DataRecordDialog` は、既に `xsi:type` → `PropertyType` マッピングを行い、型に応じたコンポーネント切り替えが実装されている。
- `intType` / `floatType` / `booleanType` / `dateType` / `dateTimeType` については、**UIコンポーネントの制約によって型に合わない値の入力自体が困難な状態**になっている。
- ただし **Ant Design の `Form.Item` の `rules` には必須チェックしか入っていない**。型バリデーションのルールは未定義。
- `stringType` と `その他（未知型）` については型制約がなく、どんな値も入力できる（これは文字列型として正しい）。

---

### 2-4. 既存バリデーション関連ファイル

| ファイル | 内容 |
|---|---|
| `frontend/src/utils/validation.ts` | ユーザー名・パスワード・メール等の汎用バリデーション関数。xsi:type関連は**未対応** |
| `frontend/src/types/maimlValidation.ts` | MAIMLのバリデーション結果型定義（`AnalysisResult` 等）。入力バリデーションとは別用途 |

---

## 3. Content の扱い

### Content も NestedPropertyEditor を使用している

`TemplateEditorDialog` の Contents セクション（ResultTemplate のみ）でも、Property と同じ `NestedPropertyEditor` コンポーネントを使用している。

### Content の xsi:type の制約

`maiml-unified.ts` の `ContentType` 定義より、Content に設定できる `xsi:type` は**すべてリスト型のみ**。

| 種別 | 代表的な xsi:type |
|---|---|
| 文字列リスト | `contentStringListType` |
| 数値リスト | `contentDoubleListType`, `contentFloatListType`, `contentIntListType` 等 |
| 真偽値リスト | `contentBooleanListType` |
| その他 | `contentStringEnumType`, `contentUuidListType` 等 |

### Content の子要素の選択肢

`maiml-unified.ts` の `Content` 型より、Content の子要素（elements）として有効なのは以下：

| 要素名 | 内容 |
|---|---|
| `value` | **スペース区切りのリスト値**（例: `"25.5 26.0 25.8"`） |
| `description` | 説明文（自由テキスト） |

`unit`, `formatString`, `scaleFactor` は Content では**属性**として扱われるため、要素追加の選択肢に含めない。

### Content と Property の要素名セレクト選択肢の差異

`NestedPropertyEditor` は Property にも Content にも使われているが、Content の場合は選択肢が異なる。

**区別の方法:** `propertyData.tagName` で判別する。
- `tagName === 'content'` → Content 用選択肢: `value` / `description` / カスタム のみ
- それ以外（`property`, `parameter` 等）→ Property 用選択肢: `value` / `description` / `unit` / `formatString` / `scaleFactor` / カスタム

---

## 4. propertyListType の制約

`xsi:type="propertyListType"` のプロパティは、子要素（`property`）を持つコンテナ型であり、`value` 要素は**使用しない**。

**要素名セレクトでの対応:**
- `xsi:type === 'propertyListType'` のとき、`value（プロパティ値）` の選択肢を**非表示またはdisabled**にする
- これにより「設定するべきではない型が選べる」問題を防ぐ

```typescript
// propertyListType のとき value 選択肢を disabled にする
const isPropertyListType = propertyData.attributes?.['xsi:type'] === 'propertyListType';

<Option value="value" disabled={isPropertyListType}>
  value（プロパティ値）⚡ 型に応じた入力欄
  {isPropertyListType ? '（propertyListType には使用不可）' : ''}
</Option>
```

---

## 5. 問題の整理

### 問題A: TemplateEditorDialog / NestedPropertyEditor（テンプレート編集）

**「要素追加」時に xsi:type に応じた値のバリデーションがない。**

テンプレート編集ダイアログでは、プロパティに `value` 要素を手動で追加する際、入力値が文字列として保存される。この際、そのプロパティの `xsi:type` を参照した型チェックが一切行われていない。

**影響:** テンプレートの `value` 要素に型不整合な値が保存され、MAIML が無効になる可能性がある。

### 問題B: DataRecordDialog（実験記録）


**UIコンポーネントによる型制約は機能しているが、Antd Form の rules によるバリデーションメッセージが `intType` / `floatType` 等に未定義。**

`InputNumber` コンポーネントは数値以外の入力を UI レベルで弾くため、実質的に型安全は保たれている。しかし、厳密な Form バリデーション（`min` / `max` チェック、整数のみなど）が rules として宣言されていないため、フォーム送信時のバリデーションが不完全。

---

## 6. 対応方針

### 方針A: DataRecordDialog — `Form.Item` の rules に xsi:type ベースのバリデーションを追加

**対応難易度: 低〜中**

`renderPropertyInput` 関数内の各 `Form.Item` の `rules` に、型に応じたバリデーターを追加する。

```typescript
// 例: intType の rules に整数チェックを追加
rules={[
  { required: property.required, message: `${property.label}は必須項目です` },
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') return Promise.resolve();
      if (!Number.isInteger(Number(value))) {
        return Promise.reject(new Error(`${property.label}は整数値を入力してください`));
      }
      return Promise.resolve();
    }
  }
]}
```

ただし `intType` / `floatType` については `InputNumber` を使用しているため、手入力で不正値を入れることは難しい。Antd の `InputNumber` 自体がバリデーターとして機能しているため、**rules の追加は「念のための二重チェック」および「エラーメッセージの明示化」として有効**。

### 方針B: NestedPropertyEditor — 要素追加時に xsi:type 依存のバリデーションを追加

**対応難易度: 中**

「要素追加」モーダルで `elemName` が `value` の場合、親プロパティの `xsi:type` 属性を参照して入力値の形式チェックを行う。

実装イメージ:
1. `NestedPropertyEditor` の props または内部 state から `xsi:type` を取得する（`propertyData.attributes['xsi:type']`）。
2. 要素追加モーダルの `onOk` ハンドラ内で、`elemName === 'value'` かつ `xsi:type` が判明している場合にバリデーションを実施する。
3. バリデーション失敗時は `message.error()` でフィードバックを表示し、保存をブロックする。

---

## 7. 実装ステップ（詳細）

### Phase 1: xsi:typeバリデーション共通ユーティリティの作成

**新規作成ファイル:** `frontend/src/utils/xsiTypeValidator.ts`

以下の関数を実装する:

```typescript
export interface XsiTypeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * xsi:type に応じて値の形式バリデーションを行う
 * @param xsiType - xsi:type の値（例: 'intType', 'floatType'）
 * @param value - 検証対象の値
 * @returns バリデーション結果
 */
export function validateByXsiType(xsiType: string, value: string): XsiTypeValidationResult
```

**バリデーション対象 xsi:type と判定ルール（最低限）:**

| xsi:type | バリデーションルール |
|---|---|
| `intType` | 整数値のみ（`/^-?\d+$/`） |
| `longType` | 整数値のみ |
| `shortType` | 整数値のみ（-32768 ≤ x ≤ 32767） |
| `byteType` | 整数値のみ（-128 ≤ x ≤ 127） |
| `unsignedIntType` | 0以上の整数 |
| `unsignedLongType` | 0以上の整数 |
| `unsignedShortType` | 0以上の整数（0 ≤ x ≤ 65535） |
| `unsignedByteType` | 0以上の整数（0 ≤ x ≤ 255） |
| `floatType` | 数値（`/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/`） |
| `doubleType` | 数値（同上） |
| `decimalType` | 数値（同上） |
| `booleanType` | `"true"` または `"false"`（大小文字問わず）、`"0"` または `"1"` |
| `dateTimeType` | ISO 8601 日時形式（`dayjs` で検証） |
| `uriType` | `http://` または `https://` または相対パス形式 |
| `uuidType` | UUID形式（`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`） |
| `stringType` 等 | バリデーションなし（何でも可） |
| リスト型（`*ListType`） | カンマまたはスペース区切りの値列として緩やかに許容 |
| `propertyListType` | バリデーションなし（子要素で管理するため） |

---

### Phase 2: NestedPropertyEditor の入力コンポーネントを xsi:type に応じて切り替え

**変更ファイル:** `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`

#### Phase 2-A-1: 要素名入力欄をセレクト化（NEW）

**目的:** `value` かそれ以外かを確実に判別し、型対応コンポーネント切り替えを安全に実装する

**変更内容:** 現状の `Input`（自由テキスト）を `Select` に変更する。

**選択肢一覧:**

| 選択肢 | 要素名 | 説明 |
|---|---|---|
| `value（プロパティ値）⚡ 型に応じた入力欄` | `value` | xsi:type に応じた型対応コンポーネントで入力 |
| `description（説明）` | `description` | 自由テキスト（TextArea） |
| `unit（単位）` | `unit` | 自由テキスト |
| `formatString（書式文字列）` | `formatString` | 自由テキスト（printf 形式等） |
| `scaleFactor（スケール係数）` | `scaleFactor` | 自由テキスト（数値文字列） |
| `🔧 その他（カスタム要素名を入力...）` | `__custom__` | カスタム要素名入力欄を追加表示 |

**実装イメージ:**

```typescript
// State 追加
const [customElementName, setCustomElementName] = useState('');

// 要素名セレクト
<Select
  placeholder="要素名を選択"
  value={newElementName}
  onChange={(value) => {
    setNewElementName(value);
    if (value === '__custom__') setCustomElementName('');
  }}
  style={{ width: '100%' }}
>
  <Option value="value">value（プロパティ値）⚡ 型に応じた入力欄</Option>
  <Option value="description">description（説明）</Option>
  <Option value="unit">unit（単位）</Option>
  <Option value="formatString">formatString（書式文字列）</Option>
  <Option value="scaleFactor">scaleFactor（スケール係数）</Option>
  <Option value="__custom__">🔧 その他（カスタム要素名を入力...）</Option>
</Select>

{/* カスタム要素名入力欄（__custom__ 選択時のみ表示） */}
{newElementName === '__custom__' && (
  <Input
    placeholder="カスタム要素名を入力（例: customField）"
    value={customElementName}
    onChange={(e) => setCustomElementName(e.target.value)}
  />
)}
```

**最終要素名の決定ロジック（onOk）:**

```typescript
const finalElementName = newElementName === '__custom__'
  ? customElementName.trim()
  : newElementName.trim();

if (!finalElementName) {
  message.error('要素名を入力してください');
  return;
}
```

---

#### Phase 2-A-2: 要素値入力欄を xsi:type に応じて切り替え

`finalElementName === 'value'` かつ `xsi:type` が設定されている場合のみ、入力欄を `TextArea` 固定から型対応コンポーネントへ切り替える。カスタム要素・`value` 以外の標準要素は `TextArea` のまま。

**型対応コンポーネント切り替え条件:**

```typescript
const xsiType = propertyData.attributes?.['xsi:type'] ?? '';
const shouldUseTypedInput = finalElementName === 'value' && xsiType !== '';
```

`shouldUseTypedInput` が `true` の場合のみ、以下の型対応入力欄に切り替える。

**型対応マッピング:**

| xsi:type | 変更後の入力コンポーネント |
|---|---|
| `intType` / `longType` / `shortType` / `byteType` 等の整数型 | `InputNumber` (整数、precision=0) |
| `unsignedIntType` 等の符号なし整数型 | `InputNumber` (min=0、整数) |
| `floatType` / `doubleType` / `decimalType` | `InputNumber` (小数) |
| `booleanType` | `Select` (true / false の2択) |
| `dateTimeType` | `DatePicker` (showTime) |
| `dateType` ※ | `DatePicker` (format=YYYY-MM-DD) |
| `stringType` / `tokenType` / `idType` 等の文字列型 | `TextArea`（現状維持） |
| リスト型 (`*ListType`) | `TextArea`（スペース区切りで入力。ヘルプテキストを表示） |
| `propertyListType` | 入力欄なし（子要素ダイアログを促す注意書き） |
| その他 | `TextArea`（現状維持） |

実装イメージ（モーダル内の入力部分を関数で切り出す）:

```typescript
// 入力コンポーネントをxsi:typeに応じてレンダリングする関数
function renderElementValueInput(xsiType: string, value: string, onChange: (v: string) => void) {
  if (xsiType === 'booleanType') {
    return (
      <Select value={value || undefined} onChange={onChange} style={{ width: '100%' }}>
        <Select.Option value="true">true</Select.Option>
        <Select.Option value="false">false</Select.Option>
      </Select>
    );
  }
  if (['intType', 'longType', 'shortType', 'byteType', 'unsignedIntType', ...].includes(xsiType)) {
    return (
      <InputNumber precision={0} style={{ width: '100%' }}
        value={value ? Number(value) : undefined}
        onChange={(v) => onChange(String(v ?? ''))} />
    );
  }
  if (['floatType', 'doubleType', 'decimalType'].includes(xsiType)) {
    return (
      <InputNumber style={{ width: '100%' }}
        value={value ? Number(value) : undefined}
        onChange={(v) => onChange(String(v ?? ''))} />
    );
  }
  if (xsiType === 'dateTimeType') {
    return (
      <DatePicker showTime style={{ width: '100%' }}
        value={value ? dayjs(value) : undefined}
        onChange={(_, s) => onChange(typeof s === 'string' ? s : '')} />
    );
  }
  // デフォルト: TextArea
  return <TextArea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
}
```

#### Phase 2-B: 既存要素表示行の入力欄も型に応じて切り替え

「要素セクション」に表示されている既存要素の編集行（現状: `Input` 固定）も同様に、`xsi:type` に応じたコンポーネントへ切り替える。

これにより既存データを編集する際も、型不整合な値への上書きを防止できる。

**onOk でのバリデーションとの併用:**
- `booleanType` / `dateTimeType` 等は UI コンポーネント制約によりそもそも不正値入力不能になる
- `intType` / `floatType` 等は `InputNumber` により制約される
- **テキスト入力が残る型**（文字列型・リスト型）に対しては、追加ボタン押下時（`onOk`）に `validateByXsiType()` を呼び出してバリデーションエラーをブロックする（Phase 1 のユーティリティを使用）

---

### Phase 3: DataRecordDialog の Form.Item rules への適用

**変更ファイル:** `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

変更箇所:
- `renderPropertyInput` 内の `intType` / `floatType` / `booleanType`（チェックボックスは不要） の `Form.Item` の `rules` に型バリデーターを追加する。
- ただし、`InputNumber` / `DatePicker` 等の UI 制約が既に有効なため、**rules は「型名をエラーメッセージに含める形式的な確認ルール」として最小限に留める**。

主な追加ルール:
- `intType`: `Number.isInteger` チェック（InputNumber の `precision={0}` と併用）
- `floatType`: `isNaN(Number(value))` チェック（InputNumber と併用）

また `mapXsiTypeToPropertyType` が `stringType` にフォールバックする未知型については、`その他` の `Input` フィールドにも「テキスト入力が許容されている旨の説明 extra テキスト」を追加することを検討する。

---

## 8. 変更ファイル一覧

### 新規作成
1. `frontend/src/utils/xsiTypeValidator.ts` — xsi:type バリデーション共通関数
2. `frontend/src/utils/__tests__/xsiTypeValidator.test.ts` — ユニットテスト

### 変更
1. `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` — 要素追加モーダルにバリデーション追加
2. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — Form.Item rules に型バリデーター追加

---

## 9. 影響範囲

### 影響を受ける機能
- **テンプレート編集** (`TemplateEditorDialog` → `NestedPropertyEditor`): 要素の `value` 追加時にバリデーションが走るようになる
- **実験記録** (`DataRecordDialog`): フォーム送信時に型バリデーションのエラーメッセージが表示されるようになる

### 影響を受けない機能
- 既存データの読み込み・表示（バリデーションは入力時のみ）
- XMLビュー（`TemplateEditorDialog` の XML タブ）— 直接 XML を書く場合はバリデーション対象外
- バックエンド API への送信処理（バリデーションはフロントエンドのみ、バックエンドは変更なし）

---

## 10. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| xsi:type の判定ルールが仕様と一致しない | 中 | 中 | MaiML Schema XSD（`specification/MaiML-Schema-1_0/maiml-property.xsd`）を参照して型定義を確認する |
| 既存テンプレートデータの `value` が型不整合でバリデーションエラーになる | 中 | 低 | 新規追加時のみバリデーション。既存値の読み込みには適用しない |
| リスト型（`*ListType`）の値形式が不明確 | 低 | 高 | リスト型は「空白区切り or カンマ区切りの文字列」として緩やかに許容する（過剰に厳格にしない） |

---

## 11. テスト計画

### ユニットテスト（新規作成）
- `xsiTypeValidator.ts` の各型バリデーション関数について正常系・異常系をテスト

### 手動テスト
- [ ] `NestedPropertyEditor` の要素追加モーダルで `value` 要素に整数型 `intType` のプロパティへ `"abc"` を入力 → エラーメッセージが表示されること
- [ ] 同プロパティへ `"42"` を入力 → 正常に保存されること
- [ ] `DataRecordDialog` の `intType` フィールドに数値 `42` を入力 → 正常に保存されること
- [ ] `DataRecordDialog` の `floatType` フィールドに `"hello"` を直接入力（InputNumber の制約を回避しようとした場合）→ バリデーションエラーが出ること

---

## 12. 優先度とスコープの考え方

### 最優先（今回の対応スコープ）
- `NestedPropertyEditor` の要素追加時の `value` バリデーション（問題Aの解消）
- `DataRecordDialog` の `Form.Item` rules への型バリデーター追加（問題Bの補完）

### 今回スコープ外（将来対応）
- XMLビュー直接編集時のバリデーション（現在は XMLバリデーション ボタン押下時のみ）
- バックエンド側での xsi:type バリデーション
- リスト型の詳細な値パースバリデーション
- `insertion`（ファイルアップロード）の拡張子・MIME タイプチェック（TODO として既存コードに記載あり）

---

## 13. 承認記録

- **計画書提示日時**: 2026-04-01 13:18
- **承認日時**: 2026-04-01 13:44
- **承認者コメント**: 承認。新しいセッションで実装を進める。
