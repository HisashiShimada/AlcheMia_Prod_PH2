# タスク計画書: xmlConverter xsi:type自動付与問題修正

## メタデータ
- **作成日時**: 2026-02-26 15:17
- **タスクID**: xmlconverter-default-xsitype-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

XMLファイルから読み込んだpropertyに`xsi:type`属性がない場合、デフォルトで`'stringType'`が設定されてしまい、次回保存時に勝手に`xsi:type="stringType"`が追加される問題を修正します。

## 2. 問題の発生フロー

### 現状の動作
```
1. ユーザーがkey="addTest2"のみの属性を追加
   → XML: <property key="addTest2" />

2. XMLを再読み込み
   → parsePropertyElement()がxsi:typeがないのにデフォルト値'stringType'を設定
   → Property型: { key: 'addTest2', xsiType: 'stringType' }

3. 次回保存時
   → convertPropertyToXml()がxsiTypeプロパティを検出
   → XML: <property key="addTest2" xsi:type="stringType" />
```

### 問題箇所

#### Line 387: parsePropertyElement
```typescript
const xsiType = propertyElement.getAttribute('xsi:type') || 'stringType';
```
→ `xsi:type`属性がない場合、強制的に`'stringType'`をデフォルト値として設定

#### Line 536: parseContentElement
```typescript
const xsiType = contentElement.getAttribute('xsi:type') || 'stringType';
```
→ 同様の問題

## 3. 修正方針

`xsi:type`属性がXMLに存在しない場合は、`undefined`を設定する（デフォルト値を設定しない）

### 修正の理由
1. MaiMLスキーマでは`xsi:type`は**オプショナル属性**
2. 属性がないプロパティに勝手に型を付けるべきではない
3. 元のXMLの形式を保持すべき

## 4. 実装ステップ

- [ ] xmlConverter.tsの修正
  - [ ] Line 387: parsePropertyElementのxsiType取得処理を修正
  - [ ] Line 536: parseContentElementのxsiType取得処理を修正
  - [ ] 両方とも`|| 'stringType'`を削除し、`|| undefined`に変更

## 5. 修正内容

### parsePropertyElement (Line 387)

#### Before
```typescript
const xsiType = propertyElement.getAttribute('xsi:type') || 'stringType';
```

#### After
```typescript
const xsiType = propertyElement.getAttribute('xsi:type') || undefined;
```

### parseContentElement (Line 536)

#### Before
```typescript
const xsiType = contentElement.getAttribute('xsi:type') || 'stringType';
```

#### After
```typescript
const xsiType = contentElement.getAttribute('xsi:type') || undefined;
```

### Property型への代入 (Line 420)
```typescript
const property: Property = {
  key,
  xsiType,  // ← undefinedの場合もそのまま設定
  properties: childProperties,
  contents: childContents
};
```

## 6. 影響範囲

### 既存機能への影響
- ✅ **影響なし**: `convertPropertyToXml`は`if (prop.xsiType)`でチェックしているため、`undefined`の場合は出力されない
- ✅ **影響なし**: 既に`xsi:type`を持つプロパティは変更なし
- ✅ **改善**: `xsi:type`がないプロパティの形式が保持される

### 副作用の確認
- `xsiType`プロパティが`undefined`になることで、TypeScript型定義との整合性を確認
- Property型定義で`xsiType`はオプショナル（`xsiType?:`）なので問題なし

## 7. テスト計画

### 手動テスト
- [ ] **テスト1**: xsi:type なしのプロパティ
  - XML: `<property key="test1" />`
  - 読み込み後、再保存
  - 期待結果: `<property key="test1" />` （xsi:typeが付かない）

- [ ] **テスト2**: xsi:type ありのプロパティ
  - XML: `<property key="test2" xsi:type="propertyListType" />`
  - 読み込み後、再保存
  - 期待結果: `<property key="test2" xsi:type="propertyListType" />` （変更なし）

- [ ] **テスト3**: 属性追加操作
  - 属性名: `key`, 属性値: `addTest2`を追加
  - 保存後のXML確認
  - 期待結果: `<property key="addTest2" />` （xsi:typeが勝手に付かない）

## 8. ユーザー報告の`propertyListType`について

ユーザー報告では`xsi:type="propertyListType"`となっていますが、これは以下の可能性があります：

1. **可能性1**: 編集画面で何か別の操作（子要素追加など）を行った
2. **可能性2**: 既存のプロパティに`propertyListType`が設定されていた
3. **可能性3**: 編集画面のロジックで自動的に設定された

→ この修正により、少なくとも`stringType`が勝手に付く問題は解決します。

## 9. 承認記録

- **計画書提示日時**: 2026-02-26 15:17
- **承認日時**: （承認待ち）

## 10. 関連情報

### 修正ファイル
- `frontend/src/utils/xmlConverter.ts`

### Property型定義
```typescript
export interface Property {
  key: string;
  xsiType?: string;  // ← オプショナル（undefinedを許容）
  // ...
}
```

### MaiMLスキーマ仕様
- `xsi:type`属性はオプショナル
- 省略可能な属性にデフォルト値を設定すべきではない
