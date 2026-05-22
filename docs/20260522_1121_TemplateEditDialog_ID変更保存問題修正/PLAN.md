# タスク計画書: TemplateEditDialogでIDを変更して保存した際に内容が保存されない問題修正

## メタデータ
- **作成日時**: 2026-05-22 11:21
- **タスクID**: TemplateEditDialog_ID変更保存問題修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`TemplateEditorDialog`でIDを変更して保存した際に、対象テンプレートの内容が保存されず編集が効かない状態になっている。

## 調査結果

### 問題の流れ

1. ユーザーがテンプレートのIDを変更して保存ボタンを押す
2. `TemplateEditorDialog.handleSave()` が呼ばれる
3. `onSave()` → `PetriNetEditorInner.handleSaveTemplate()` が呼ばれる
4. `handleSaveTemplate` 内の2002行目付近で以下の処理が実行される：

```typescript
const searchId = templateEditNode?.data?.template?.id || templateId;
```

ここで `templateEditNode` を使って**編集前のテンプレートID（旧ID）**を取得しようとしているが、`templateEditNode` が **null** になっている。

### templateEditNodeが null になる理由

**確認された事実**: PropertyPanelから開いても、Template一覧から開いても、`handleSaveTemplate` が呼ばれる時点で `templateEditNode` が null になっている。

**原因の詳細**: `templateEditNode` は React の `useState` で管理されているが、このステートは `handleSaveTemplate` の `useCallback` の依存配列に含まれていない。そのため、`useCallback` がメモ化された時点の古い値（初期値 null）が参照されている。

```typescript
// PetriNetEditorInner.tsx
const [templateEditNode, setTemplateEditNode] = useState<Node<NodeData> | null>(null);

// handleSaveTemplate の useCallback 依存配列に templateEditNode が含まれていない
const handleSaveTemplate = useCallback((
  nodeId: string, 
  templateRef: Template, 
  ...
) => {
  // ...
  // ← ここで templateEditNode は常に null（古いクロージャ参照）
  const searchId = templateEditNode?.data?.template?.id || templateId;
}, [setNodes, setMethods, activeMethodIndex, edges, pushState, convertNestedPropertiesToArray, onContentChange, methods, documentData, markTemplateDirty, setDirtyFlags]);
//   ↑ templateEditNode が依存配列に含まれていない！
```

### 確認されたデータフロー

| 経路 | 関数 | templateEditNode に設定される値 |
|------|------|-------------------------------|
| PropertyPanelから編集 | `handleOpenTemplateEditor` | `nodeWithMethodId`（ノードのコピー） |
| Template一覧から選択 | `handleTemplateSelect` | template情報から作成した仮ノード |
| 新規テンプレート追加 | `handleTemplateAdd` | 空のtemplate情報で作成した仮ノード |

どの経路でも `setTemplateEditNode(xxx)` は呼ばれているが、`handleSaveTemplate` のクロージャがその変更を参照できていない。

## 修正方針

### 方針A（採用）: `onSave` の引数に `originalTemplateId` を追加

`templateEditNode` に依存せず、**TemplateEditorDialog の内部で保持している「開いた時点の元のテンプレートID」**を `onSave` 引数として明示的に渡す。

この方法により：
- React のステートのクロージャ問題を完全に回避
- 明示的で理解しやすい実装になる
- `handleSaveTemplate` の依存配列を変更する必要がない

## 実装ステップ

### Phase 1: TemplateEditorDialog.tsx の修正

- [ ] `originalTemplateId` state を追加
- [ ] `useEffect` の初期化処理で `originalTemplateId` を設定
- [ ] `Props` 型の `onSave` シグネチャを更新
- [ ] `handleSave` で `originalTemplateId` を `onSave` に渡す

### Phase 2: PetriNetEditorInner.tsx の修正

- [ ] `handleSaveTemplate` のシグネチャに `originalTemplateId` 引数を追加
- [ ] `searchId` の計算を `originalTemplateId` を使用するよう修正
- [ ] 呼び出し箇所（JSX 内の `onSave`）を更新

## 変更ファイル

1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
   - `TemplateEditorDialogProps.onSave` に `originalTemplateId: string` 追加
   - `originalTemplateId` state 追加
   - `useEffect` の初期化ロジック修正
   - `handleSave` の呼び出しに `originalTemplateId` を追加

2. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - `handleSaveTemplate` シグネチャ修正
   - `searchId` の計算ロジック修正
   - JSX 内の `onSave` コールバック修正

## リスク

| リスク | 対策 |
|--------|------|
| 新規テンプレート作成時の `originalTemplateId` が空になる | `isNewTemplate` フラグで分岐して処理 |
| Template一覧から開いた場合と PropertyPanel から開いた場合で ID の形式が異なる可能性 | 双方のケースで初期化ロジックを確認 |

## 承認記録

- **計画書提示日時**: 2026-05-22 11:21
- **承認日時**: 2026-05-22 11:21
