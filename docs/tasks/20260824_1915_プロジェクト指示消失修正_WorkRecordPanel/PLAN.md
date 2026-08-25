# タスク計画書: プロジェクト指示消失修正（WorkRecordPanel）

## メタデータ
- **作成日時**: 2026-08-24 19:15
- **タスクID**: プロジェクト指示消失修正_WorkRecordPanel
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ内「プロジェクト指示」が表示されなくなった問題を修正する。

## 原因

`WorkRecordPanel.tsx` 内の `InstructionCollapse` コンポーネントに `onConfirmInstruction` が渡されない場合、コンポーネント全体がレンダリングされない設計になっている。

具体的には：
1. `InstructionCollapse` の定義: `onConfirmInstruction` が未指定の場合、指示確認ボタンは非表示になるが、表示自体は行われる想定だった
2. しかし `WorkRecordPanelProps` に `onConfirmInstruction` が定義されておらず、`ExperimentWorkerMenu` からも渡されていない
3. `<InstructionCollapse instructions={instructions} />` の呼び出しに `onConfirmInstruction` が渡されていない

## 修正方針

### 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `WorkRecordPanelProps` に `onConfirmInstruction?: () => void` を追加
   - 2箇所の `<InstructionCollapse>` に `onConfirmInstruction={onConfirmInstruction}` を渡す

2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - `confirmInstruction` を `projectApiService` からインポート
   - `handleConfirmInstruction` ハンドラーを実装（プロジェクト指示を一括確認）
   - `WorkRecordPanel` に `onConfirmInstruction={handleConfirmInstruction}` を渡す

## 承認記録
- **計画書提示日時**: 2026-08-24 19:15
