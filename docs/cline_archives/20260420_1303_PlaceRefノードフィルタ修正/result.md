# 修正結果: PlaceRef選択ダイアログのノードフィルタ修正

## 概要
- **日時**: 2026-04-20 13:03
- **対象機能**: TemplateEditorDialog の PlaceRef 選択ダイアログ
- **問題**: メソッド単位のテンプレートを編集する際、対象メソッドに含まれないノードが表示される

---

## 問題の原因

`PetriNetEditorInner.tsx` の `TemplateEditorDialog` へ渡す `allNodes` プロパティの算出部分で、共通テンプレートかどうかの判定が誤っていた。

### 誤ったコード（修正前）

```typescript
allNodes={(() => {
  const isCommonTemplate =
    !templateEditNode?.data?.template?.methodId ||  // ← 誤り
    showCommonTemplates;
  ...
})()}
```

**原因**: `templateEditNode.data.template.methodId` を参照していたが、`NodeData` の `template` プロパティは `Template` 型であり、`Template` 型に `methodId` プロパティは存在しない。そのため常に `undefined` となり `!undefined = true` → `isCommonTemplate = true` が常に成立し、全メソッドの全ノードが渡されていた。

---

## 修正内容

### 修正ファイル

- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

### 変更箇所

```diff
  allNodes={(() => {
    const isCommonTemplate =
-     !templateEditNode?.data?.template?.methodId ||
+     !templateEditNode?.data?.methodId ||
      showCommonTemplates;
    ...
  })()}
```

**修正理由**: `NodeData.methodId`（ノード自体に設定されたメソッドID）を参照するのが正しい。`handleOpenTemplateEditor` 内で `methodId` の未設定時にアクティブメソッドの ID を補完する処理があり、ここで確実に `data.methodId` が設定される。

---

## 修正後の動作

| 状況 | `isCommonTemplate` | `allNodes` の内容 |
|------|--------------------|-------------------|
| 通常テンプレート（`data.methodId` 設定あり） | `false` | 現在のメソッド（`nodes`）のみ |
| 共通テンプレート（`data.methodId` が null/undefined） | `true` | 全メソッドのノード |
| `showCommonTemplates = true` の場合 | `true` | 全メソッドのノード |

---

## 影響範囲

- `frontend/src/components/editorv2/PetriNetEditorInner.tsx` のみ
- テンプレートエディタの PlaceRef 選択ダイアログの表示ロジックに影響
- 共通テンプレートの動作は変更なし
