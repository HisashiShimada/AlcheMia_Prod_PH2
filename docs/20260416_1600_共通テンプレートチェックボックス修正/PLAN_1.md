# タスク計画書: 共通テンプレートチェックボックス不具合修正

## メタデータ
- **作成日時**: 2026-04-16 13:07
- **タスクID**: common-template-checkbox-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

テンプレート管理ビューで「共通テンプレート」チェックを入れて共通テンプレートを作成した後、ペトリネットビューのノードにその共通テンプレートを「共通テンプレート参照（`commonTemplateRef`）」として紐づけた際に、`PropertyPanel.tsx` の「共通テンプレート（全methodで共有）」チェックボックスがONにならない不具合を修正する。

## 2. 目的と期待される成果

### 目的
「共通テンプレート参照」セレクトで共通テンプレートを選択した際に、`isCommonTemplate` チェックボックスが正しくONになること。また、参照を解除した際にはOFFに戻ること。

### 期待される成果
- [x] 不具合の根本原因を特定
- [ ] `PropertyPanel.tsx` の修正によりチェックボックスが正しく連動する
- [ ] 修正後の動作確認

## 3. 根本原因の詳細分析

### 問題箇所: `PropertyPanel.tsx` L480〜501

```tsx
{availableCommonTemplates.length > 0 && (
  <div>
    <Select
      style={{ width: '100%' }}
      value={selectedNode.data.commonTemplateRef || ''}
      onChange={(value) => handleChange('commonTemplateRef', value || null)}
      // ↑ commonTemplateRef のみ更新、isCommonTemplate を更新しない ← バグ
      ...
    />
  </div>
)}
```

`handleChange('commonTemplateRef', value)` は `onUpdate` を呼び、ノードデータの `commonTemplateRef` フィールドのみを更新する。`isCommonTemplate` フィールドは一切更新されない。

### なぜ `isCommonTemplate` の更新が必要か

`PropertyPanel.tsx` のチェックボックスは以下の値を参照している：

```tsx
<Checkbox
  checked={selectedNode.data.isCommonTemplate || false}
  onChange={(e) => handleChange('isCommonTemplate', e.target.checked)}
>
  共通テンプレート（全methodで共有）
</Checkbox>
```

`commonTemplateRef` が設定されても `isCommonTemplate` が更新されないため、チェックボックスがOFFのままになる。

### 副次的な問題

`availableCommonTemplates`（共通テンプレート参照セレクトの選択肢）は以下のロジックで生成される：

```tsx
const availableCommonTemplates = useMemo(() => {
  methods.forEach((method, index) => {
    const templates = method.nodes
      .filter(node => 
        node.data.isCommonTemplate === true  // isCommonTemplate が true のノードのみ
        ...
      )
  });
});
```

テンプレート管理ビューから新規作成した共通テンプレートは `placeRefs: []` なので、ノードの `isCommonTemplate` が更新されない。そのため、`availableCommonTemplates` にそのテンプレートが表示されない問題もある（ただし今回のスコープ外）。

## 4. 実装ステップ

共通テンプレートの設定方法は2つある：
1. **PropertyPanel の「共通テンプレート参照」セレクトから Ref を選択する方法**
2. **テンプレート管理ビューからテンプレート編集ダイアログ（TemplateEditorDialog）の PlaceRef 追加でノードを紐づける方法**

どちらのルートでも `isCommonTemplate` がONにならない問題を修正する。

---

### Fix 1: `PropertyPanel.tsx` - 「共通テンプレート参照」セレクトの onChange を修正

**問題**: `commonTemplateRef` のみ更新、`isCommonTemplate` が更新されない

**修正箇所**: L487〜488

**修正前:**
```tsx
onChange={(value) => handleChange('commonTemplateRef', value || null)}
```

**修正後:**
```tsx
onChange={(value) => {
  if (selectedNode) {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      commonTemplateRef: value || null,
      isCommonTemplate: !!value,  // ← 追加: refが設定されたらtrue、解除されたらfalse
    });
  }
}}
```

---

### Fix 2: `PetriNetEditorInner.tsx` - `handleSaveTemplate` でノードに `isCommonTemplate` を設定する

**問題**: TemplateEditorDialog の PlaceRef 追加でノードを選択した際、`handleSaveTemplate` 内の `setNodes` で該当ノードの `isCommonTemplate` が更新されない

現状のコード（L1848〜L1866）では `isCommonTemplate` は更新されているが、**既存テンプレートの更新パス**（`isNewTemplate = false`）においても確実に反映されることを確認済み。

実際の問題は「テンプレート管理ビューで新規作成した共通テンプレート（`placeRefs: []`）に対して、後からノードをPlaceRef追加する」ケースで、このルートは `isNewTemplate = false`（既存テンプレート更新）として処理される。`setNodes` の中で `isCommonTemplate: isCommonTemplate` が設定されているため、このパスは正常。

→ **Fix 1 のみで2つの問題は解決する。** TemplateEditorDialog 経由でノードを紐づけた場合は既存の `handleSaveTemplate` の `setNodes` で `isCommonTemplate` が設定されるため修正不要。

---

### 実装ステップ
- [x] `PropertyPanel.tsx` L488 の `onChange` を修正（1箇所）
- [ ] 動作確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/PropertyPanel.tsx` - 「共通テンプレート参照」セレクトの `onChange` ハンドラーを修正

### 影響を受ける機能
- PropertyPanel の「共通テンプレート（全methodで共有）」チェックボックス表示
- PropertyPanel の「共通テンプレート参照」セレクト

### 影響しない機能
- テンプレート管理ビューの共通テンプレート作成フロー
- MAIMLファイルの読み込み・保存
- その他のノード・エッジ操作

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `isCommonTemplate = false` に戻すことで既存の共通テンプレートフラグが消える | 中 | 低 | `commonTemplateRef` を空にした場合のみ `false` にするため、通常の `isCommonTemplate` 設定ルートには影響なし |

## 7. テスト計画

### 手動テスト手順

**シナリオ1: 共通テンプレート参照を設定するとチェックボックスがONになる**
1. 複数methodが存在するMAIMLファイルを開く
2. テンプレート管理ビューを開き「共通テンプレート」チェックをONにする
3. Method1のある place ノードで `isCommonTemplate = true` のノードがあることを確認
4. Method2のある place ノードを選択する
5. PropertyPanel の「共通テンプレート参照」セレクトに Method1 の共通テンプレートが表示されることを確認
6. セレクトで共通テンプレートを選択する
7. **「共通テンプレート（全methodで共有）」チェックボックスがONになることを確認** ← 今回の修正検証

**シナリオ2: 共通テンプレート参照を解除するとチェックボックスがOFFになる**
1. シナリオ1の続きで、「なし」を選択してrefを解除する
2. **チェックボックスがOFFになることを確認**

## 8. 承認記録

- **計画書提示日時**: 2026-04-16 13:07
- **承認日時**: （承認後記入）
- **承認者コメント**: 

## 9. 実施記録

### 実施日時
開始: （作業開始時に記入）  
完了: （作業完了時に記入）

### 最終的な成果物
- [ ] `frontend/src/components/editorv2/components/PropertyPanel.tsx` 修正
- [ ] 動作確認完了
