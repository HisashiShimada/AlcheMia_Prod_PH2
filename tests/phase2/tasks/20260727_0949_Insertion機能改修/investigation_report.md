# 不具合調査レポート: アップロード確認ダイアログが表示されない

## 調査日時
2026-07-27 15:37

## 報告された不具合

1. エクスプローラーからのファイル選択時に、ファイルアップロードを確認するダイアログが表示されない
2. ドラッグ&ドロップでも同様に確認ダイアログが表示されない

---

## アーキテクチャの概要（理解の前提）

`useInsertionEditor.ts` の `handleFileSelect` は以下の仕様になっている：

```typescript
// ファイル選択時点で4項目（URI/Hash Method/Hash Value/Format）を即座にセット
onChange(nextInsertion);

// ★ uploadTargetPath が指定されていない場合はダイアログを出さない
if (!uploadTargetPath) {
  return;
}

// uploadTargetPath が指定されている場合のみ Modal.confirm を呼び出す
Modal.confirm({ title: 'ファイルをサーバーにアップロードしますか？', ... });
```

つまり **`uploadTargetPath = undefined` だとダイアログは一切表示されない**。
ドラッグ&ドロップも `handleDrop` → `handleFileSelect` を通るため同じ制御になっている。

---

## 画面別の原因調査

### 1. ExperimentPlanDialog（TemplateInputPanel）

**結論: uploadTargetPath は正しく組み立てられている → ダイアログは表示されるはず**

調査経路：
```
ExperimentPlanDialog.tsx (line 1055)
  → <TemplateInputPanel projectId={projectId} />
      ↓
TemplateInputPanel.tsx (line 285-287)
  → const uploadTargetPath = projectId
      ? `projects/${projectId}/attachments`
      : undefined;
      ↓
<InsertionEditorCompact
  uploadTargetPath={uploadTargetPath}   ← 正しく渡されている
/>
```

`ExperimentPlanDialog` には `projectId` prop があり、`TemplateInputPanel` に渡されている。
`TemplateInputPanel` 内で `projects/${projectId}/attachments` として組み立て、`InsertionEditorCompact` に渡している。

**ただし注意点：** `TemplateInputPanel` の「insertion 追加」ボタンは現在コメントアウトされている（line 739〜750）。
既存 insertion アイテムへのファイル選択ダイアログは動作する設計になっているが、新規追加ができないため実際には操作できない状態。

### 2. WorkRecordPanel（ExperimentWorker作業画面）

**結論: `uploadTargetPath` がコンポーネントツリーの途中で断絶しており、常に `undefined` になっている**

調査経路：

```
WorkRecordPanel（export default function WorkRecordPanel()）
  ↓
planProps: PlanProps = {
  tasks,
  activeTaskNo,
  ...
  onInsertionAdd: handleInsertionAdd,
  onInsertionRemove: handleInsertionRemove,
  // ★ uploadTargetPath が planProps に含まれていない
}
  ↓
<PlanB {...planProps} />
  ↓
const PlanB: React.FC<PlanProps> = ({
  tasks, activeTaskNo, ..., onInsertionAdd, onInsertionRemove, ...
  // ★ PlanProps インターフェースに uploadTargetPath フィールドが存在しない
})
  ↓
<PropertyList
  template={activeTemplate}
  uploadTargetPath={uploadTargetPath}   ← undefined（渡されていないため）
  ...
/>
  ↓
<InsertionEditorCompact
  uploadTargetPath={uploadTargetPath}   ← undefined
/>
  ↓
useInsertionEditor({ uploadTargetPath: undefined })
  → Modal.confirm が呼ばれない（仕様通りの動作）
```

**問題の箇所：**
- `PlanProps` インターフェース（WorkRecordPanel.tsx 内）に `uploadTargetPath` フィールドが定義されていない
- `planProps` の組み立て時に `uploadTargetPath` が含まれていない
- `PlanB` が `uploadTargetPath` を受け取れないため `PropertyList` に渡せない

**また、`WorkRecordPanel` 自体に props がない（`function WorkRecordPanel()`）ため、外部からプロジェクト名を受け取る口もない。**

---

## 修正方針

### WorkRecordPanel の修正（必須）

1. `WorkRecordPanel` に `projectName?: string` prop を追加し、`ExperimentWorkerMenu` から渡す
2. `PlanProps` インターフェースに `uploadTargetPath?: string` を追加
3. `planProps` 組み立て時に `uploadTargetPath: projectName ? \`projects/${projectName}/attachments\` : undefined` を設定
4. `PlanB` コンポーネントの引数に `uploadTargetPath` を追加し、`PropertyList` に渡す

### ExperimentPlanDialog（TemplateInputPanel）の確認・修正（要動作確認）

- コード上は正しく `uploadTargetPath` が渡されている
- ダイアログが表示されない場合は `Modal`（static API）の問題の可能性がある
- 実際に動作確認して問題があれば `App.useApp()` の `modal` インスタンスを使うよう変更する
- `insertion` 追加ボタンがコメントアウトされているため、既存データへの操作しか確認できない点を留意

---

## 影響ファイル

| ファイル | 修正内容 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `WorkRecordPanel` に `projectName` prop追加、`PlanProps`/`planProps`/`PlanB` に `uploadTargetPath` を通す |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `WorkRecordPanel` に `projectName` を渡す |

---

## 追加調査（2026-07-28）: PetriNetEditorInner の editingFileName 渡し忘れ

### 報告された不具合（再確認）

- **エクスプローラーからのファイル選択時にアップロード確認ダイアログが表示されない**
- **ドラッグ&ドロップでも確認ダイアログが表示されない**

### 根本原因

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` において、`PetriNetEditorContent` から `<PetriNetEditorInnerUI>` を呼び出す箇所（旧 L3232〜L3323）で `editingFileName` プロパティを**渡し忘れていた**。

```tsx
// ❌ 修正前（editingFileName が渡されていなかった）
<PetriNetEditorInnerUI
  ...
  onOpenStructureTree={handleOpenStructureTree}
  onCloseStructureTree={handleCloseStructureTree}
  // editingFileName={editingFileName}  ← この行が存在しなかった
/>

// ✅ 修正後
<PetriNetEditorInnerUI
  ...
  onOpenStructureTree={handleOpenStructureTree}
  onCloseStructureTree={handleCloseStructureTree}
  editingFileName={editingFileName}
/>
```

### 影響チェーン

```
PetriNetEditorContent
  editingFileName（受け取り） ← props から正しく受け取っている
    ↓
<PetriNetEditorInnerUI editingFileName={???}>
  ← 渡し忘れのため常に undefined
    ↓
<TemplateEditorDialog editingFileName={undefined}>
    ↓
uploadTargetPath = editingFileName?.replace(/\.maiml$/, '')
  = undefined?.replace(...)
  = undefined  ← 常に undefined
    ↓
useInsertionEditor({ uploadTargetPath: undefined })
  → Modal.confirm が呼ばれない（仕様通りの動作）
```

### ドラッグ&ドロップについて

`useInsertionEditor.ts` の `handleDrop` は内部で `handleFileSelect` を呼んでおり、エクスプローラー選択と全く同じロジック（`uploadTargetPath` があれば `Modal.confirm` を表示）を通る実装になっている。  
今回の `editingFileName` 渡し忘れが修正されたことで、DnD でも確認ダイアログが表示されるようになる。

### 修正内容

- `frontend/src/components/editorv2/PetriNetEditorInner.tsx` の `<PetriNetEditorInnerUI>` 呼び出しに `editingFileName={editingFileName}` を追加（2026-07-28 実施済み）

### 型定義への影響

なし。`PetriNetEditorInnerUIProps` には `editingFileName?: string` が既に定義されており、型エラーは発生しない。
