# タスク計画書: ワークフロー選択ダイアログをプロジェクトベースに変更

## メタデータ
- **作成日時**: 2026-07-14 15:54
- **タスクID**: workflow-selector-project-based
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`WorkflowSelectorDialog.tsx` は現状、S3/Swiftファイルサーバーから直接 `.maiml` ファイルを一覧表示・選択するUIになっている。  
これを「プロジェクトテーブルベースで自分が編集可能なプロジェクトを検索・選択し、選択したプロジェクトの最新MAIMLを取り込む」形に変更する。

## 目的と期待される成果

- [ ] プロジェクト一覧APIから「編集可能（`isEditable === true`）かつMAIML登録済み」のプロジェクトを表示する
- [ ] ユーザーがプロジェクトを選択して「決定」を押すと、そのプロジェクトのMAIML本文を取得してワークフローとして追加できる
- [ ] フォルダツリー形式のファイルブラウザUIをテーブル形式のプロジェクト選択UIに変更する
- [ ] ストレージ直接参照（`listStorageFiles` / `getStorageFileContent`）をこの用途では使用しない形に変更する

## 実装ステップ

### Phase 1: 型定義追加
- [ ] `frontend/src/types/project.ts` に `WorkflowProjectSelection` インターフェースを追加

### Phase 2: WorkflowSelectorDialog.tsx 改修
- [ ] Props 変更（`availableFiles: FileInfo[]` 削除、`onSelect` の型変更）
- [ ] ダイアログ open 時に `projectApiService.getProjects()` を呼び出してプロジェクト一覧を自己取得
- [ ] `isEditable === true` かつ MAIML登録済み（`maimlFileKey` が truthy）のプロジェクトのみ表示
- [ ] UIをテーブル形式に変更（検索Input + プロジェクト名フィルタSelect + AntD Table）
- [ ] 「決定」ボタン押下時に `getProjectMaiml(projectId)` を呼び出し、成功したら `onSelect(WorkflowProjectSelection)` を呼び出す
- [ ] エラー時は `message.error` で通知

### Phase 3: PetriNetEditorInner.tsx 改修
- [ ] `openWorkflowDialogInternal()` からファイル一覧取得処理（`listStorageFiles`）を削除
- [ ] `availableFiles` state・`isLoadingFiles` 関連コードを削除（他の場所での利用確認後）
- [ ] `handleWorkflowFileSelect` を `handleWorkflowProjectSelect` に変更
  - `getStorageFileContent` の呼び出しを削除
  - `selection.maimlContent` を直接 `addWorkflow()` に渡す
- [ ] `WorkflowSelectorDialog` へのprops受け渡しを更新

## 変更ファイル

1. `frontend/src/types/project.ts` - `WorkflowProjectSelection` 型を追加
2. `frontend/src/components/editorv2/WorkflowSelectorDialog.tsx` - プロジェクト選択UIに全面変更
3. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 呼び出し側を修正

## 技術詳細

### 使用API
- プロジェクト一覧: `projectApiService.getProjects()` → `Project[]` （`isEditable`, `maimlFileKey` を参照）
- MAIML取得: `projectApiService.getProjectMaiml(projectId)` → `ProjectMaimlResponse` （`maimlContent` を使用）

### WorkflowProjectSelection 型
```typescript
export interface WorkflowProjectSelection {
  projectId: string;
  projectName: string;
  maimlContent: string;
}
```

### WorkflowSelectorDialog の新Props
```typescript
interface WorkflowSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: WorkflowProjectSelection) => void;
}
```

### PetriNetEditorInner の変更箇所
- `handleWorkflowProjectSelect(selection: WorkflowProjectSelection)` に変更
- `addWorkflow(targetPosition, selection.maimlContent, selection.projectName)` で呼び出し

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `availableFiles` / `isLoadingFiles` が他の場所でも参照されている | 中 | 中 | 改修前に `search_files` で参照箇所を洗い出してから削除する |
| `getProjectMaiml` APIが `maiml_flg = false` のプロジェクトで404を返す | 低 | 低 | ダイアログ側で `maimlFileKey` truthy のみ表示するのでほぼ発生しない |

## テスト計画
- [ ] MAIMLが登録されているプロジェクトのみリストに表示されること
- [ ] 自分が編集可能なプロジェクト（`isEditable=true`）のみ表示されること
- [ ] プロジェクトを選択して「決定」を押すとワークフローが追加されること
- [ ] TypeScript ビルドエラーがないこと

## 承認記録
- **計画書提示日時**: 2026-07-14 15:54
- **承認日時**: 
- **承認者コメント**: 
