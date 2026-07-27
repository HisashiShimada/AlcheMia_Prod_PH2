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
