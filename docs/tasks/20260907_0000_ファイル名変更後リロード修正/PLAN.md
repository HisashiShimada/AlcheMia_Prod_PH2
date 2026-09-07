# タスク計画書: ファイル名変更後リロード修正

## メタデータ
- **作成日時**: 2026-09-07 00:00
- **タスクID**: 20260907_0000
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

ProjectManagement の「ファイル管理」タブでファイル名変更を行った後、ファイル一覧がリロードされない問題を修正する。

## 問題の根本原因

`FileListTable.tsx` は `onRenameFile?.()` コールバックを呼び出しているが、
`FileManagementTabContent.tsx` がそのコールバック props を持っておらず、
`ProjectManagementInner.tsx` もハンドラを渡していないため、リネーム後のファイル一覧再取得が実行されない。

## データフロー（現状）

```
FileListTable.tsx
  └─ handleRenameConfirm() でリネーム成功
       └─ onRenameFile?.()  ← コールバックを呼ぶが...
            ↑
FileManagementTabContent.tsx
  └─ FileListTable に onRenameFile を渡していない ← ❌ 欠如
            ↑
ProjectManagementInner.tsx
  └─ FileManagementTabContent に onRenameFile を渡していない ← ❌ 欠如
```

## データフロー（修正後）

```
FileListTable.tsx
  └─ handleRenameConfirm() でリネーム成功
       └─ onRenameFile?.()
            ↑
FileManagementTabContent.tsx
  └─ onRenameFile を FileListTable に渡す ← ✅
            ↑
ProjectManagementInner.tsx
  └─ handleRenameFile = async () => {
       const fr = await getProjectFiles(selectedProject.id, true);
       setProjectFilesData(prev => ({ ...prev, [selectedProject.id]: ... }));
     }
     FileManagementTabContent に onRenameFile={handleRenameFile} を渡す ← ✅
```

## 実装ステップ

- [x] STEP 1: `FileManagementTabContent.tsx` に `onRenameFile` props を追加し `FileListTable` に渡す
- [x] STEP 2: `ProjectManagementInner.tsx` に `handleRenameFile` コールバックを追加
- [x] STEP 3: `ProjectManagementInner.tsx` の `FileManagementTabContent` に `onRenameFile={handleRenameFile}` を渡す
- [x] STEP 4: 型チェック確認

## 変更ファイル

1. `frontend/src/components/project/subcomponents/tabs/FileManagementTabContent.tsx` - `onRenameFile` props追加・FileListTableへ渡す
2. `frontend/src/components/project/ProjectManagementInner.tsx` - `handleRenameFile` コールバック作成・FileManagementTabContentへ渡す

## リスク

| リスク | 対策 |
|--------|------|
| 既存機能への影響 | 影響範囲はファイル名変更機能のみ。既存の削除処理と同じパターンで実装するため低リスク |

## テスト計画

- [x] TypeScriptコンパイルエラーがないことを確認
- [ ] ファイル名変更後にファイル一覧が即時リロードされることを手動確認

## 承認記録
- **承認日時**: 2026-09-07 00:00
- **承認者コメント**: 計画承認済み・Act モードに切り替え
