# 調査レポート: Insertion アップロード確認ダイアログ不具合 再調査

- **作成日時**: 2026-07-27 17:06
- **関連タスク**:
  - `docs/tasks/20260724_1550_Insertion機能整理/PLAN.md`
  - `docs/tasks/20260727_0949_Insertion機能改修/PLAN.md`

---

## 1. 報告された不具合

1. エクスプローラーからのファイル選択時にアップロード確認ダイアログが表示されない
2. 後から追加したドラッグ&ドロップ（DnD）機能も同じ確認フローに倣うべき

---

## 2. 確認ダイアログの仕組み（`useInsertionEditor.ts`）

```
handleFileSelect(file: File)
  ↓
1. バリデーション（サイズ・形式チェック）
2. ハッシュ計算（SHA-256）
3. 4項目（uri / hash.method / hash.value / format）を即時 onChange で親に通知
4. uploadTargetPath が undefined → return（ダイアログ非表示）
5. uploadTargetPath が設定済み → Modal.confirm を表示
   OK  → uploadFiles() → 成功時に URI を s3Key で上書き
   NG  → 何もしない（URI は file.name のまま確定）
```

**ファイル選択と DnD は同一の `handleFileSelect` を呼ぶ設計**（`InsertionEditorCompact` / `InsertionEditorForm` 共通）。
→ どちらかのダイアログが出ない場合は **`uploadTargetPath === undefined`** が原因。

---

## 3. 既存タスクで確認・修正済みの箇所

### `WorkRecordPanel.tsx` + `ExperimentWorkerMenu.tsx`

| 項目 | 内容 |
|------|------|
| 問題 | `WorkRecordPanel` に `uploadTargetPath` が渡されず `undefined` のままだった |
| 修正 | `WorkRecordPanelProps` に `projectName?: string` を追加し、`projects/${projectName}/attachments` を `uploadTargetPath` として構築 |
| 呼び出し元 | `ExperimentWorkerMenu.tsx` → `<WorkRecordPanel projectName={selectedProjectName \|\| undefined} />` に変更 |
| 確認 | `tsc --noEmit` exit:0 |

この修正は `20260727_0949_Insertion機能改修/PLAN.md` の実施記録（§11）に記録済み。

---

## 4. 今回の追加調査結果

### `TemplateInputPanel.tsx`（ExperimentPlanDialog 経由）での伝播経路

`TemplateInputPanel` 内での `uploadTargetPath` 構築：

```typescript
// TemplateInputPanel.tsx（insertion コンテナ行 L285〜287）
const uploadTargetPath = projectId
  ? `projects/${projectId}/attachments`
  : undefined;
```

`projectId` prop の伝播元を調査した結果：

| 呼び出し元 | `projectId` の渡し方 | 評価 |
|---|---|---|
| `ExperimentPlanDialog.tsx` | `<TemplateInputPanel projectId={projectId} />` | コード上は正しく伝播 |
| `TaskRegistrationTab.tsx` | `<ExperimentPlanDialog projectId={projectId} ...>` | 実データ。問題なさそう |
| `ExperimentInstructionTab.tsx` | `<ExperimentPlanDialog projectId={projectId} ...>` | 実データ。問題なさそう |
| `ExperimentInstructionMock.tsx` | `projectId="mock-project-id"` | 固定文字列モック。実 S3 アップロードは起きない（問題なし） |

### `TemplateEditorDialog.tsx` での伝播経路

```typescript
// TemplateEditorDialog.tsx
uploadTargetPath={(() => {
  const projectName = editingFileName?.replace(/\.maiml$/, '') ?? '';
  return projectName ? `projects/${projectName}/attachments` : undefined;
})()}
```

`editingFileName` が空または未設定の場合は `undefined` になり確認ダイアログが出ない。
ただし `PetriNetEditorInner` から `editingFileName` は渡されており、通常操作では設定されているはず。

### DnD（ドラッグ&ドロップ）の実装確認

`useInsertionEditor.ts` の `handleDrop`:

```typescript
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
  const file = e.dataTransfer.files?.[0];
  if (file) {
    handleFileSelect(file);  // ← ファイル選択と同じ関数を呼ぶ
  }
}, [handleFileSelect]);
```

DnD は `handleFileSelect` を経由するため、**ファイル選択と全く同じロジックで確認ダイアログが制御される**。
`uploadTargetPath` が正しく渡されていれば DnD でもダイアログが表示される。

---

## 5. 現状の結論

### コード調査上の判断
- `WorkRecordPanel` 側の修正（`projectName` prop 追加と `uploadTargetPath` 構築）は**コード上は実装済み**
- DnD 専用の別ロジックはなく、ファイル選択と同じフローを通るため**DnD の別対応は不要**
- ファイル選択・DnD どちらもダイアログが出ない場合は **`uploadTargetPath === undefined`** が原因であり、渡されるべき `projectName` / `projectId` が空になっていることが疑われる

### 未確認事項（次回ブラウザ実機確認が必要）

| 確認項目 | 確認方法 |
|---|---|
| どの画面（WorkRecordPanel / ExperimentPlanDialog / TemplateEditorDialog）で再発しているか | 実機操作 |
| `selectedProjectName`（ExperimentWorkerMenu.tsx）が空文字列ではないか | DevTools / ログ |
| `projectId`（ExperimentPlanDialog）が正しく渡されているか | DevTools / ログ |
| 修正済みコードが実際にデプロイ・ビルドされているか | フロントエンドの再ビルド確認 |

---

## 6. 次回アクション案

1. **ブラウザ実機で再現操作を行い、どの画面でダイアログが出ないかを特定する**
2. DevTools（React DevTools または console.log を一時追加）で `uploadTargetPath` の実際の値を確認する
3. `undefined` であることが確認できたら、対応する呼び出し元の props 伝播を修正する
4. 修正後に tsc + ブラウザ実機で確認し、PLAN.md に実施記録を追記する
