# タスク計画書: Property値取得ロジックの改善

## メタデータ
- **作成日時**: 2026-04-20 15:40
- **タスクID**: maiml-property-value-extraction
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`frontend/src/utils/maimlTypeConverter.ts` の `convertXmlJsProperty` 関数および `convertContent` 関数において、XML要素の `value` 値の取得ロジックを改善します。

### 背景
現在の実装では `xmlProp.value?._text` / `xmlContent.value?._text` という固定的な取得方法を使用していますが、以下のような様々なXML構造に柔軟に対応できていません：
- `<value>` タグが存在しないケース
- `<value>` タグが複数存在するケース（配列）
- `<value>` タグは存在するがテキストがないケース

### 対象関数
1. **`convertXmlJsProperty`**（920行目〜）: Property要素の値取得
2. **`convertContent`**（848行目〜）: Content要素の値取得（888行目 `value: xmlContent.value?._text || xmlContent.values?._text`）

## 2. 目的と期待される成果

### 目的
- XMLの様々な構造パターンに柔軟に対応する
- `value` タグの有無を明確に区別できるようにする
- コードの保守性と可読性を向上させる

### 期待される成果
- [ ] `extractPropertyValue` ヘルパー関数の実装（Property/Content共用）
- [ ] `convertXmlJsProperty` 関数内の全ての値取得箇所を修正（9箇所）
- [ ] `convertContent` 関数の value 取得箇所を修正（888行目）
- [ ] `value` タグがない場合は `undefined` を返す仕様の実装
- [ ] `value` タグが複数の場合はスペース区切りで連結する仕様の実装

## 3. 仕様詳細

### value値取得の振る舞い

| 状況 | 結果 |
|------|------|
| `<value>` タグが存在しない | `undefined` |
| `<value>` タグがあるがテキストなし（`<value/>` 等） | `''`（空文字）→ 呼び出し側でデフォルト値に置換 |
| `<value>` タグがあり、テキストあり | テキスト文字列 |
| `<value>` タグが複数（配列） | スペース区切りで連結 |
| `<values>` タグ（既存仕様） | テキストをそのまま返す |

### 各型のデフォルト値（valueタグなし、またはテキストなし時）

| 型 | デフォルト値 |
|----|------------|
| 数値型（intType, doubleType 等） | `0` |
| booleanType | `false` |
| dateTimeType | `''` |
| 文字列系特殊型（tokenType 等） | `''` |
| バイナリ型（base64BinaryType 等） | `''` |
| リスト型（*ListType） | `''` |
| stringEnumType | `''` |
| stringType | `''` |
| xsi:type未指定 | `''` |

## 4. 実装ステップ

### Phase 1: ヘルパー関数の実装
- [ ] `extractPropertyValue()` 関数を実装
  - `value` タグなし → `undefined` を返す
  - `value` タグあり、テキストなし → `''`（空文字）を返す
  - `value` タグ複数 → スペース区切りで連結
  - `values` タグ → テキストをそのまま返す

### Phase 2: convertXmlJsProperty 関数の修正
- [ ] 数値型（970行目付近）の修正
  - 対象: `intType`, `doubleType`, `floatType`, `longType`, `shortType`, `byteType`
  - デフォルト値: `0`
- [ ] Boolean型（995行目付近）の修正
  - デフォルト値: `false`
- [ ] DateTime型（1009行目付近）の修正
  - デフォルト値: `''`
- [ ] 文字列系特殊型（1024行目付近）の修正
  - 対象: `tokenType`, `idType`, `idRefType`, `qualifiedNameType`, `uriType`, `uuidType`, `languageType`
  - デフォルト値: `''`
- [ ] バイナリ型（1039行目付近）の修正
  - 対象: `base64BinaryType`, `hexBinaryType`
  - デフォルト値: `''`
- [ ] リスト型（1053行目付近）の修正
  - 対象: `*ListType`
  - デフォルト値: `''`
- [ ] stringEnumType（1071行目付近）の修正
  - デフォルト値: `''`
- [ ] stringType（1085行目付近）の修正
  - デフォルト値: `''`
- [ ] xsi:type未指定（1098行目付近）の修正
  - デフォルト値: `''`

### Phase 2.5: convertContent 関数の修正
- [ ] `convertContent`（888行目）の value 取得箇所を修正
  - 現在: `value: xmlContent.value?._text || xmlContent.values?._text`
  - 修正後: `extractPropertyValue(xmlContent)` を使用
  - valueタグなし → `undefined`
  - valueタグあり、テキストなし → `''`（空文字）
  - valueタグ複数 → スペース区切りで連結

### Phase 3: 変更しないもの
- `propertyListType`（944-962行目付近）: `xmlProp.property` から直接取得 → **現状維持**

### Phase 4: テストソース作成
- [ ] `frontend/src/utils/__tests__/maimlTypeConverter.valueExtraction.test.ts` を新規作成
  - `extractPropertyValue` 関数の単体テスト
  - `convertXmlJsProperty` の各型テスト（valueタグあり/なし/複数/空）
  - `convertContent` のテスト（valueタグあり/なし）
  - 既存の `maimlTypeConverter.sync.test.ts` と同様のスタイルで作成

### Phase 5: バックエンド側との同期
- [ ] `backend/src/utils/maimlTypeConverter.ts` に同様の修正を適用
  - `extractPropertyValue` ヘルパー関数の追加
  - `convertXmlJsProperty` の各型の value 取得箇所を修正
  - `convertContent` の value 取得箇所を修正
- [ ] `backend/tests/utils/maimlTypeConverter.sync.test.ts` を新規作成
  - フロントエンドのテストと同様のケースをバックエンド向けに作成

### Phase 6: 動作確認
- [ ] フロントエンドテストが全て通ることを確認（`npm test` in frontend）
- [ ] バックエンドテストが全て通ることを確認（`npm test` in backend）

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/utils/maimlTypeConverter.ts` - 値取得ロジックの改善
2. `backend/src/utils/maimlTypeConverter.ts` - フロントエンドと同期
3. `frontend/src/utils/__tests__/maimlTypeConverter.valueExtraction.test.ts` - 新規作成（テスト）
4. `backend/tests/utils/maimlTypeConverter.sync.test.ts` - 新規作成（テスト）

### 変更しないファイル
- `propertyListType` の処理は現状維持

### 影響を受ける機能
- MAIMLファイルのパース処理全般
- Property要素の値取得処理

## 6. 技術的詳細

### extractPropertyValue 関数の実装

```typescript
/**
 * xml-js要素から<value>タグの値を柔軟に取得するヘルパー関数
 * 
 * @param xmlProp - xml-js要素
 * @returns 取得した値（文字列）、または undefined（valueタグが存在しない場合）
 * 
 * @remarks
 * - valueタグが存在しない場合: undefined を返す
 * - valueタグがあるがテキストなし: '' を返す（呼び出し側でデフォルト値に置換）
 * - valueタグが複数: スペース区切りで連結
 * - valuesタグ: テキストをそのまま返す（既存仕様）
 */
function extractPropertyValue(xmlProp: any): string | undefined {
  // <value>/<values> タグが存在しない場合 → undefined
  if (!xmlProp.value && !xmlProp.values) {
    return undefined;
  }

  // <values> タグの場合
  if (xmlProp.values !== undefined) {
    return xmlProp.values._text !== undefined ? String(xmlProp.values._text) : '';
  }

  // <value> タグが配列（複数）の場合 → スペース区切りで連結
  if (Array.isArray(xmlProp.value)) {
    const values = xmlProp.value
      .map((v: any) => v._text !== undefined ? String(v._text) : '')
      .filter((s: string) => s !== '');
    return values.length > 0 ? values.join(' ') : '';
  }

  // <value> タグが単一オブジェクトの場合
  if (typeof xmlProp.value === 'object') {
    return xmlProp.value._text !== undefined ? String(xmlProp.value._text) : '';
  }

  return '';
}
```

### 呼び出し側の使用パターン（数値型の例）

```typescript
// ① valueText を取得（undefined = valueタグなし）
const valueText = extractPropertyValue(xmlProp);

// ② valueタグがない場合は value: undefined として扱う
if (valueText === undefined) {
  const result: Property = {
    key, xsiType, description,
    value: undefined,
    units, formatString, scaleFactor,
    properties: [], contents: []
  };
  if (hasCustomAttrs) result.attributes = customAttrs;
  return result;
}

// ③ valueタグがあるがテキストなし or 変換失敗 → デフォルト値
const value = parseFloat(valueText || '0');
const result: Property = {
  key, xsiType, description,
  value: isNaN(value) ? 0 : value,
  units, formatString, scaleFactor,
  properties: [], contents: []
};
if (hasCustomAttrs) result.attributes = customAttrs;
return result;
```

## 7. テスト計画

### テストケース

| # | XML構造 | 期待される value |
|---|---------|----------------|
| 1 | `<value>100</value>` | `100`（数値型） |
| 2 | valueタグなし | `undefined` |
| 3 | `<value></value>` | `0`（数値型のデフォルト値） |
| 4 | `<value>10</value><value>20</value><value>30</value>` | `"10 20 30"` |
| 5 | `<values>a,b,c</values>` | `"a,b,c"` |
| 6 | `<value>true</value>` | `true`（booleanType） |

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のMAIMLファイルとの互換性 | 中 | 低 | 既存の動作を再現するよう実装 |
| 予期しないXML構造 | 中 | 中 | フォールバック処理を適切に実装 |

## 9. 承認記録

- **計画書提示日時**: 2026-04-20 15:40
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 10. 実施記録

### 実施日時
開始: （実装開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業を記録）

### 最終的な成果物
- [ ] extractPropertyValue関数の実装
- [ ] convertXmlJsProperty関数の9箇所の修正
- [ ] 動作確認完了
