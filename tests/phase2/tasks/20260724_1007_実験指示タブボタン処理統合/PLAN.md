# タスク計画書: 実験指示タブボタン処理統合

## メタデータ
- **作成日時**: 2026-07-24 10:07
- **タスクID**: 実験指示タブボタン処理統合
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験指示タブ内の以下のボタン押下後の処理を、他タブと同一処理に統合する。

1. **ペトリネットを表示** → ファイル管理タブの「ビューア」ボタンと同じ `handleViewFile` を使用
2. **実験指示を編集** → タスク登録タブの「作業単位の指示追加」と同じ `ExperimentPlanDialog` を使用

## 実装方針

### ① ペトリネットを表示

- `ExperimentInstructionTab` に `onOpenViewer?: (file: ProjectFile) => void` prop を追加
- `handleOpenPetriNetViewer` で `onOpenViewer` が渡されていれば呼び出す（渡されていない場合は従来のローカルstate処理にフォールバック）
- `ProjectManagement` から `onOpenViewer={handleViewFile}` を渡す
- これにより `ProjectManagement` の `openDialogs` state で統一管理される

### ② 実験指示を編集

- `ProjectManagement` に `ExperimentPlanDialog` の state を追加（lift-up）
  - `experimentPlanDialogOpen: boolean`
  - `experimentPlanDialogMethodId: string`
- `ProjectManagement` に `handleOpenExperimentPlanDialog(methodId?: string)` を追加
- `ExperimentInstructionTab` に `onOpenPlanDialog?: (methodId?: string) => void` prop を追加
- `ExperimentInstructionTab` の `handleOpenPlanDialog` で `onOpenPlanDialog` が渡されていれば呼び出す
- `TaskRegistrationTab` にも `onOpenPlanDialog?: (methodId?: string) => void` prop を追加
- `TaskRegistrationTab` の `handleAddInstructionClick` で `onOpenPlanDialog` が渡されていれば呼び出す
- `ProjectManagement` に `ExperimentPlanDialog` を配置し、両タブから共有

## 変更ファイル

1. `frontend/src/components/project/ExperimentInstructionTab.tsx` - props追加・ハンドラ修正
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - props追加・ハンドラ修正
3. `frontend/src/components/project/ProjectManagement.tsx` - ExperimentPlanDialog管理追加・props渡し

## 承認記録
- **承認日時**: 2026-07-24 10:07
