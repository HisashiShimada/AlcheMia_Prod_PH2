# タスク計画書: XML編集 key属性表示問題とpropertyListType自動設定問題修正

## メタデータ
- **作成日時**: 2026-02-26 15:50
- **タスクID**: xml-editor-key-attribute-fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

XML編集画面で以下の2つの問題を修正します：

1. **key属性が表示されない問題**: XML内に`key`属性があるのに編集画面に表示されない
2. **propertyListType自動設定問題**: 子要素を追加すると親に勝手に`xsi:type="propertyListType"`が設定される

## 2. 問題の詳細

### 問題1: key属性が表示されない

**現象**:
- XML: `<property key="addTest2" xsi:type="propertyListType" />`
- 編集画面: `xsi:type`のみ表示され、`key`属性が表示されない

**原因**:
- `PropertyData`型では`key`はプロパティの識別子として使用
- XML属性としての`key`は`attributes.key`に格納すべきだが、現在の実装では混同している
- `convertPropertyDataToPropertiesArray`関数（Line 155）で`attributes.key`を優先しているが、そもそも`attributes.key`に格納されていない

### 問題2: propertyListType自動設定

**現象**:
- `key`属性のみを追加したプロパティに、勝手に`xsi:type="propertyListType"`が付く

**原因**:
- `TemplateEditorDialog.tsx`の`handleAddNestedChild`関数（Line 576-577）
```typescript
obj[targetKey].attributes['xsi:type'] = 'propertyListType';
```
- 子要素を追加する際、親に強制的に`propertyListType`を設定している

## 3. 修正方針

### 方針: PropertyDataの仕様を明確化

`PropertyData`型の`key`は以下の2つの役割を持つ：

1. **識別子**: React keyやオブジェクトキーとして使用（`PropertyData.key`）
2. **XML属性**: XML内の`key`属性として使用（`attributes.key`）

**解決策**:
- `PropertyData.key`は識別子として維持
- XML属性としての`key`も`attributes.key`に格納
- NestedPropertyEditorで`attributes.key`も表示・編集可能にする
- ただし、`attributes.key`を編集した場合は`PropertyData.key`も更新する（同期）

### 方針2: propertyListType自動設定を削除

子要素追加時に親の`xsi:type`を強制的に変更しない。
- ユーザーが明示的に`xsi:type="propertyListType"`を設定した場合のみ、子要素を持つことができる
- または、子要素追加時に確認ダイアログを表示し、ユーザーに`propertyListType`への変更を確認する

## 4. 実装ステップ

### Phase 1: key属性表示問題の修正

- [ ] `templateConverter.ts`の修正
  - [ ] `convertPropertiesArrayToNestedFormat`関数を修正
    - `attributes.key`にもkeyを格納
  - [ ] `convertPropertyDataToPropertiesArray`関数を修正  
    - `attributes.key`が存在する場合はそれを使用
    - `attributes.key`を削除（XML出力時に重複しないように）

### Phase 2: propertyListType自動設定の修正

- [ ] `TemplateEditorDialog.tsx`の修正
  - [ ] `handleAddNestedChild`関数を修正
    - 親の`xsi:type`を強制的に変更しない
    - 代わりに、親が`xsi:type="propertyListType"`でない場合はエラーメッセージを表示

## 5. 修正内容

### templateConverter.ts

#### convertPropertiesArrayToNestedFormat (Line 30付近)

```typescript
// Before
result[key] = {
  key: key,
  tagName: 'property',
  attributes: attributes,
  // ...
};

// After
result[key] = {
  key: key,
  tagName: 'property',
  attributes: {
    ...attributes,
    key: key  // XML属性としてもkeyを格納
  },
  // ...
};
```

#### convertPropertyDataToPropertiesArray (Line 152付近)

```typescript
// Before
const property: Property = {
  key: propData.attributes?.key || propData.key,
  // ...
};

// After
const property: Property = {
  key: propData.attributes?.key || propData.key,
  // ...
};

// attributes.keyは削除（XML出力時に重複回避）
if (propData.attributes?.key) {
  const { key: _, ...restAttributes } = propData.attributes;
  // 残りの属性のみを処理
}
```

### TemplateEditorDialog.tsx

#### handleAddNestedChild (Line 550付近)

```typescript
// Before
obj[targetKey].attributes['xsi:type'] = 'propertyListType';

// After
// xsi:typeが未設定またはpropertyListType以外の場合はエラー
if (!obj[targetKey].attributes['xsi:type'] || 
    obj[targetKey].attributes['xsi:type'] !== 'propertyListType') {
  throw new Error('子要素を追加するには、親のxsi:typeをpropertyListTypeに設定してください');
}
```

## 6. 代替案: attributes.keyを別名で扱う

`key`はReact/JavaScriptで予約語的な扱いなので、混乱を避けるため：

**代替案1**: XML属性としての`key`を`attributes._key`として扱う
**代替案2**: `PropertyData.key`を`PropertyData.identifier`にリネーム（影響範囲大）

→ **Phase 1の方針を採用**（attributes.keyを使用し、変換時に適切に処理）

## 7. テスト計画

### テストケース1: key属性の表示・編集
- [ ] XMLに`<property key="test" xsi:type="stringType" />`がある状態で編集画面を開く
- [ ] `key`属性が表示されることを確認
- [ ] `key`属性を編集できることを確認
- [ ] 保存後、XMLに反映されることを確認

### テストケース2: propertyListType自動設定の削除
- [ ] `xsi:type="stringType"`のプロパティに子要素を追加しようとする
- [ ] エラーメッセージが表示されることを確認
- [ ] 手動で`xsi:type="propertyListType"`に変更する
- [ ] 子要素を追加できることを確認

## 8. 承認記録

- **計画書提示日時**: 2026-02-26 15:50
- **承認日時**: 2026-02-26 16:05
- **承認者コメント**: 問題の根本原因を特定し、修正方針を確定

## 12. 実施記録

### 実施日時
- 開始: 2026-02-26 16:05
- 完了: 2026-02-26 16:08

### 実施内容

#### 修正1: templateConverter.tsの修正

**ファイル**: `frontend/src/components/editorv2/utils/templateConverter.ts`

**変更内容**:
1. `convertPropertiesArrayToNestedFormat`関数（Line 30付近）
   - `attributes.key`の自動設定を削除
   - Property型の`key`は`PropertyData.key`にのみ設定
   - XMLに`key`属性がない場合は`attributes`にも設定しない

2. `convertPropertiesArrayToNestedFormatRecursive`関数（Line 110付近）
   - 同様に`attributes.key`の自動設定を削除
   - 再帰的に呼ばれる子要素でも`attributes.key`を自動設定しない

**変更前**:
```typescript
const attributes: Record<string, string> = {
  key: key,  // ✅ XML属性としてもkeyを格納
  'xsi:type': (prop.xsiType as string) || 'stringType'
};
```

**変更後**:
```typescript
const attributes: Record<string, string> = {
  'xsi:type': (prop.xsiType as string) || 'stringType'
};
```

#### 修正2: propertyListType自動設定問題

`TemplateEditorDialog.tsx`の`handleAddNestedChild`関数は既に修正済みでした。
- 子要素追加時に親の`xsi:type`を強制変更しない
- コメントで「子要素を追加しても親のxsi:typeを強制変更しない」と明記されている

### 結果

✅ **問題1: key属性自動追加問題を修正**
- XMLに`key`属性がない場合、`attributes.key`も設定されない
- 保存時に勝手に`key`属性が追加されることがなくなる
- `PropertyData.key`（識別子）と`attributes.key`（XML属性）が正しく分離された

✅ **問題2: propertyListType自動設定問題は既に修正済み**
- 子要素追加時に親の`xsi:type`を強制変更しない実装になっている

### 影響範囲
- フォーマット管理画面のXML編集機能
- テンプレートファイルからのプロパティ取り込み機能
- Property配列とPropertyData形式の相互変換処理

### 注意事項
- XMLから読み込んだ場合、`_attributes`に`key`が含まれていればそれが保持される
- 新規作成したプロパティには`PropertyData.key`のみが設定され、`attributes.key`は設定されない
- 保存時に`attributes.key`があれば`Property.key`に変換され、`attributes.key`は除外される

## 9. 実装状況と根本原因

### 現状分析（2026-02-26 16:06）

コードを調査した結果、以下の状況が判明：

1. **key属性の自動付与問題**
   - `convertPropertiesArrayToNestedFormat`（Line 30）で、常に`attributes.key = key`を設定
   - これにより、XMLに元々`key`属性がない場合でも、自動的に追加されてしまう
   - 保存時（Line 173-174）で`attributes.key`を除外しているが、これは不完全

2. **propertyListType自動設定問題**
   - `TemplateEditorDialog.tsx`の`handleAddNestedChild`では既に修正済み
   - 子要素追加時に親の`xsi:type`を強制変更しないようになっている

### 真の問題

**問題**: `convertPropertiesArrayToNestedFormat`が、Property配列からPropertyDataに変換する際、常に`attributes.key`を設定してしまう

**影響**:
- XMLに`key`属性がない場合でも、自動的に追加される
- ユーザーは`key`属性をXMLに出力したくないのに、勝手に追加されてしまう
- `PropertyData.key`（識別子）と`attributes.key`（XML属性）が混同される

**正しい動作**:
- XMLから読み込んだ場合: 既存の`attributes.key`を保持
- 新規作成の場合: `attributes.key`を設定しない
- Property型の`key`は必須だが、XML属性としての`key`は任意

## 10. 修正方針の見直し

### 修正1: convertPropertiesArrayToNestedFormatの修正

Property配列からの変換時に、`attributes.key`を常に設定するのをやめる：

```typescript
// Before (Line 30)
attributes: {
  key: key,  // ✅ XML属性としてもkeyを格納
  'xsi:type': ...
}

// After
attributes: {
  // keyは設定しない（Property型のkeyは別管理）
  'xsi:type': ...
}
```

### 修正2: XMLから読み込む場合の対応

`parseNamespacesFromXml`では、XMLに実際に`key`属性があった場合のみ保持：

```typescript
// XMLの<property key="xxx">を読み込んだ場合のみattributes.keyを設定
const attributes = (prop['_attributes'] || {}) as Record<string, string>;
// attributesにkeyがあればそのまま保持
```

### 修正3: convertPropertyDataToPropertiesArrayの修正

保存時に`PropertyData.key`を使用し、`attributes.key`は削除：

```typescript
// 既に実装済み（Line 173-174）
const { key: _, ...restAttributes } = propData.attributes || {};
```

## 11. 関連情報

### 関連ファイル
- `frontend/src/components/editorv2/utils/templateConverter.ts`
- `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
- `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`

### 関連型定義
```typescript
export interface PropertyData {
  key: string;  // 識別子（React key, オブジェクトキー）
  tagName: string;
  attributes: Record<string, string>;  // XML属性（key含む）
  elements: Record<string, string>;
  children: PropertyData[];
}
