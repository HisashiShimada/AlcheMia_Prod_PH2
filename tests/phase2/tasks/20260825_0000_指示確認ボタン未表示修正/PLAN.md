# タスク計画書: 指示確認ボタン未表示修正

## メタデータ
- **作成日時**: 2026-08-25 00:00
- **タスクID**: fix-instruction-confirm-button
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブ内「プロジェクト指示」セクションに「指示確認」ボタンが表示されない問題を修正する。

## 原因

3つの問題が組み合わさっている：

### 問題1（最重要）: PlanA の InstructionCollapse に `onConfirmInstruction` が渡されていない
`WorkRecordPanel.tsx` 内の `PlanA` コンポーネントで `InstructionCollapse` を呼ぶ際、
`onConfirmInstruction` を渡していない。ボタンは `onConfirmInstruction` が存在する場合のみ描画されるため、
PlanA では常にボタン非表示になる。

```tsx
// PlanA（現状）
<InstructionCollapse instructions={instructions} />  // ← onConfirmInstruction なし

// PlanB（正常）
<InstructionCollapse instructions={instructions} onConfirmInstruction={onConfirmInstruction} />
```

### 問題2: `onConfirmInstruction` の実装が不完全（API呼び出しなし）
`ExperimentWorkerMenu.tsx` の `onConfirmInstruction` は `message.success(...)` のみで、
バックエンドの `confirmInstruction` API を呼んでいない。

### 問題3: `refetchInstructions` が呼ばれない
確認後に指示一覧を再取得して `is_acknowledged` 状態を更新しない。

## 修正方針

### 修正1: WorkRecordPanel.tsx
- PlanA の `InstructionCollapse` 呼び出しに `onConfirmInstruction={onConfirmInstruction}` を追加

### 修正2: ExperimentWorkerMenu.tsx
- `useInstructions` から `refetchInstructions` を取得
- `confirmInstruction` を `projectApiService` からインポート
- `onConfirmInstruction` で未確認のプロジェクト指示（methodId・transitionId なし）を全て API 確認処理し、完了後 `refetchInstructions()` を呼ぶ

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - PlanA の InstructionCollapse に onConfirmInstruction 追加
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - API 呼び出し実装・refetch 追加

## 承認記録
- **計画書提示日時**: 2026-08-25 00:00
- **承認日時**: 2026-08-25 00:00（ユーザー承認済み）
