# タスク計画書: XML編集で子要素追加時に描画されない問題修正

## メタデータ
- **作成日時**: 2026-02-26 17:18
- **タスクID**: xml-child-element-rendering-fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

フォーマット管理画面でXML編集時に子要素を追加すると、State上は追加されているが画面上に描画されない問題を修正する。

## 2. 目的と期待される成果

### 目的
- NestedPropertyEditorで子要素追加時の再レンダリングが正しく動作するようにする
- ユーザーが追加した子要素が即座に画面に反映されるようにする

### 期待される成果
- [x] 問題の原因を特定
- [ ] NestedPropertyEditorコンポーネントの調査
- [ ] 再レンダリング機構の問題点を明確化
- [ ] 修正案の実装
- [ ] 動作確認

## 3. 実装ステップ

### Phase 1: 問題調査
- [x] FormatEditorDialog.tsxの構造確認
- [ ] NestedPropertyEditor.tsxの実装確認
- [ ] 子要素追加時のデータフロー確認
- [ ] forceRenderKeyの伝播確認

### Phase 2: 原因特定
- [ ] Stateの更新タイミング確認
- [ ] Reactのkey属性の使用方法確認
- [ ] childrenの再レンダリング条件確認

### Phase 3: 修正実装
- [ ] NestedPropertyEditorの修正
- [ ] 必要に応じてFormatEditorDialogの修正
- [ ] forceRenderKeyの正しい使用方法の実装

### Phase 4: テスト
- [ ] 子要素追加の動作確認
- [ ] 複数階層での子要素追加確認
- [ ] 既存機能の動作確認

## 4. 技術的詳細

### 現状の問題点
FormatEditorDialog.tsxの`handleAddNestedChild`関数：
```typescript
setForceRenderKey(Date.now());  // 強制再レンダリング
```

NestedPropertyEditorのレンダリング：
```typescript
<NestedPropertyEditor
  key={`${key}_${forceRenderKey}`}
  forceRenderKey={forceRenderKey}
  // ...
/>
```

おそらく、NestedPropertyEditor内部で子要素（children）を再帰的にレンダリングする際に、
forceRenderKeyの変更が伝播していない可能性がある。

## 5. 関連ファイル

### 確認が必要なファイル
- [ ] `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`
- [x] `frontend/src/components/editorv2/components/FormatEditorDialog.tsx`

## 6. 実施記録

### 2026-02-26 17:18 - 調査開始
- FormatEditorDialog.tsxを確認
- handleAddNestedChild関数でforceRenderKeyを更新していることを確認
- 次にNestedPropertyEditorコンポーネントの実装を確認する必要がある

### 2026-02-26 17:20 - 原因特定
- NestedPropertyEditor.tsxの`hasChildren`のuseMemoの依存配列に問題発見
- 現状: `[propertyData.children, propertyData.attributes]`のみ
- 問題: forceRenderKeyが変更されても、hasChildrenが再計算されない
- 結果: 子要素が追加されても、UI上では子要素セクションが表示されない

**根本原因**:
```typescript
const hasChildren = useMemo(() => {
  // ... 子要素の存在チェック ...
}, [propertyData.children, propertyData.attributes]); // ← forceRenderKeyが含まれていない！
```

**修正方針（NestedPropertyEditor.tsxを修正しない方法）**:
- NestedPropertyEditorのhasChildrenは `propertyData.attributes` を依存配列に持っている
- 子要素追加時に、親要素の attributes オブジェクトの参照を強制的に変更する
- 具体的には：子要素追加後、親要素の attributes を新しいオブジェクトとしてコピーし直す
- これにより、useMemoが attributes の変更を検知して hasChildren を再計算する

**実装箇所**:
- ~~`FormatEditorDialog.tsx` の `handleAddNestedChild` 関数を修正~~
- ~~子要素追加後、親要素の attributes を `{ ...parent.attributes }` で再作成~~

**最終決定: NestedPropertyEditor.tsxを修正**
- NestedPropertyEditor.tsxの `hasChildren`, `hasAttributes`, `hasElements` の useMemo に `forceRenderKey` を依存配列に追加
- これにより、親コンポーネントからforceRenderKeyが変更されたときに、これらの値が再計算される
- 子要素追加時に正しく再レンダリングが実行される

### 2026-02-26 17:24 - 修正完了
**修正内容**:
```typescript
// Before:
const hasChildren = useMemo(() => {
  // ...
}, [propertyData.children, propertyData.attributes]);

// After:
const hasChildren = useMemo(() => {
  // ...
}, [propertyData.children, propertyData.attributes, forceRenderKey]);
```

同様に `hasAttributes` と `hasElements` にも `forceRenderKey` を追加。

**期待される動作**:
1. ユーザーが「子要素」ボタンをクリック
2. FormatEditorDialog の handleAddNestedChild が実行される
3. properties State が更新される
4. setForceRenderKey(Date.now()) が実行される
5. NestedPropertyEditor が再レンダリングされる
6. forceRenderKey が変更されたため、hasChildren の useMemo が再計算される
7. 新しく追加された子要素が検出される
8. hasChildren が true になり、子要素セクションが表示される
9. 追加した子要素が画面に描画される ✅

### 2026-02-26 17:29 - ロールバック完了
**ロールバック理由**: 正しく描画されなかった

**ロールバック内容**:
NestedPropertyEditor.tsxの修正を元に戻しました。
- `hasChildren`, `hasAttributes`, `hasElements` のuseMemo依存配列から `forceRenderKey` を削除
- 元の状態に戻りました

**現在の状態**:
```typescript
const hasChildren = useMemo(() => {
  // ...
}, [propertyData.children, propertyData.attributes]); // forceRenderKeyなし

const hasAttributes = useMemo(() => 
  // ...
  [propertyData.attributes] // forceRenderKeyなし
);

const hasElements = useMemo(() => 
  // ...
  [propertyData.elements] // forceRenderKeyなし
);
```

**結論**:
この修正では子要素追加時の描画問題は解決できませんでした。
別のアプローチが必要です。

### 2026-02-26 17:32 - 真の原因発見と修正完了

**真の原因**:
ユーザーから提供された画像（正しく動作していた状態）を分析した結果、以下が判明：
- 親要素に`xsi:type: propertyListType`が設定されていた
- ユーザーは「子要素ボタンを押したら自動的に設定された」と回答

しかし、現在のコードでは以下のコメントで自動設定を無効化していた：
```typescript
// ✅ 子要素を追加しても親のxsi:typeを強制変更しない
```

NestedPropertyEditorの`hasChildren`は以下の条件で子要素セクションを表示：
```typescript
const isParentPropertyListType = parentXsiType === 'propertyListType';
return isParentPropertyListType && hasValidChildren;
```

つまり、**親要素のxsi:typeがpropertyListTypeでなければ、子要素があっても表示されない**。

**修正内容**:
FormatEditorDialog.tsxの`handleAddNestedChild`関数内で、子要素追加時に親要素の`xsi:type`を自動的に`propertyListType`に設定するように変更：

```typescript
// Before:
// ✅ 子要素を追加しても親のxsi:typeを強制変更しない
return true;

// After:
// ✅ 子要素追加時に親のxsi:typeを自動的にpropertyListTypeに設定
if (!obj[targetKey].attributes) {
  obj[targetKey].attributes = {};
}
obj[targetKey].attributes['xsi:type'] = 'propertyListType';
return true;
```

**期待される動作**:
1. ユーザーが「子要素」ボタンをクリック
2. 子要素が追加される
3. 親要素の`xsi:type`が自動的に`propertyListType`に設定される
4. NestedPropertyEditorの`hasChildren`が`true`を返す
5. 子要素セクション（🌿 子要素）が表示される
6. 追加した子要素が画面に描画される ✅

**修正ファイル**:
- `frontend/src/components/editorv2/components/FormatEditorDialog.tsx`
  - `handleAddNestedChild`関数内の2箇所を修正
