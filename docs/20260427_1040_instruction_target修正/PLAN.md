# タスク計画書: instruction_target=0バグ修正（タスク登録タブ経由の指示追加）

## メタデータ
- **作成日時**: 2026-04-27 10:40
- **タスクID**: fix-instruction-target-task-tab
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

タスク登録タブから指示を追加した際、`project_instruction.instruction_target` に常に `0`（プロジェクト全体）が登録される不具合を修正する。

## 根本原因

`frontend/src/components/project/InstructionEditDialog.tsx` の `TARGET_TYPES_LOCAL` 定数がバックエンドの定義と乖離しており、`methodId` のみ設定された場合（トランジション・タスク番号なし）の判定分岐が存在しなかった。

### バックエンドの定義（正）
| 値 | 意味 |
|----|------|
| 0 | FILE（プロジェクト全体） |
| 1 | METHOD（メソッド指示） |
| 2 | TRANSITION（トランジション指示） |
| 3 | TASK（タスク指示） |

### 修正前のフロントエンド定数（誤）
```typescript
const TARGET_TYPES_LOCAL = {
  FILE: 0,
  TASK: 1,       // 本来2
  TRANSITION: 2, // 本来3
} as const;
// METHOD(1)が未定義
```

### 判定ロジックの問題
`methodId` のみ（transitionId・taskNumber が空）のケースで `else` に落ちて `targetType = 0（FILE）` になる。

## 変更ファイル

1. `frontend/src/components/project/InstructionEditDialog.tsx`
   - `TARGET_TYPES_LOCAL` にバックエンドと一致した値を設定
   - `saveInstruction` の `targetType` 判定に `methodId` 分岐を追加

## 承認記録
- **承認日時**: 2026-04-27 10:41

## 実施記録

### 実施日時
開始: 2026-04-27 10:41
完了: 2026-04-27 10:42

### 最終的な成果物
- [x] `frontend/src/components/project/InstructionEditDialog.tsx` 修正完了
