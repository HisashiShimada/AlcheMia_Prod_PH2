# タスク計画書: 指示確認タブのタスクフィルタにプロジェクトIDが表示されるバグ修正

## メタデータ
- **作成日時**: 2026-04-30 10:24
- **タスクID**: 指示確認タブタスクフィルタプロジェクトID表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

進捗確認タブの「指示」ボタンを押下後、指示確認タブに遷移した際に、タスクフィルタのセレクトボックスにタスク番号ではなく `project_yG3YR_Nxl-...` のようなプロジェクトIDを含む文字列が表示されてしまうバグを修正する。

## 目的と期待される成果

### 目的
- `ProgressCheckTab` と `InstructionConfirmationTab` の taskId フォーマットの不一致を解消する
- 遷移後に正しいメソッド・タスクが選択された状態で指示確認タブが表示されるようにする

### 期待される成果
- [ ] 指示確認タブのタスクフィルタに正しいタスク番号が表示される
- [ ] 進捗確認タブから遷移後、対象タスクが選択された状態になる
- [ ] 進捗確認タブから遷移後、対象メソッドが選択された状態になる

## 原因

### 根本原因: `taskId` フォーマットの不一致

`ProgressCheckTab.tsx` と `InstructionConfirmationTab.tsx` で taskId の生成フォーマットが異なる。

| コンポーネント | taskId フォーマット |
|---|---|
| ProgressCheckTab | `${project_id}-${method_id}-${task_no}-${taskIndex}` |
| InstructionConfirmationTab | `${project_id}-${method_id}-${task_no}` |

ProgressCheckTab で生成された taskId（末尾に `-{taskIndex}` あり）が `setSelectedTaskId` で保存され、指示確認タブの Select の `value` にセットされるが、選択肢の taskId（末尾なし）と一致しないため、Ant Design が raw value（プロジェクトID含む文字列）をそのまま表示してしまう。

### 副次問題: メソッドIDが引き継がれない

`handleSelectTaskAndTab` でタスクIDとタブのみ設定し、メソッドIDを設定していないため、遷移後にメソッドが未選択のまま（または以前の選択のまま）になる。

## 実装ステップ

### Phase 1: taskId フォーマット統一（対応案1）

- [ ] `ProgressCheckTab.tsx` の taskId 生成フォーマットから末尾の `-${taskIndex}` を削除（4箇所）
  - 初回フェッチ時（L115）
  - `start` アクション後の再取得時（L322）
  - `start` アクション後の 409 競合時の再取得（L388）
  - `forceTerminate` アクション後の再取得時（L524）

### Phase 2: メソッドID引き継ぎ対応（対応案2）

- [ ] `ProgressCheckTab.tsx` の `onSelectTaskAndTab` の型定義を `methodId` オプション引数追加に更新
- [ ] `ProgressCheckTab.tsx` の `handleTaskAction` の `instruction` ケースに `task.methodId` を第3引数として追加
- [ ] `ProgressCheckTab.tsx` の `handleTaskAction` の `record` ケースにも同様に `task.methodId` を追加
- [ ] `ExperimentWorkerMenu.tsx` の `handleSelectTaskAndTab` で `methodId` を受け取り `setSelectedMethodId` を呼び出す

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
   - taskId 生成フォーマット修正（4箇所）
   - `onSelectTaskAndTab` 呼び出し時に `task.methodId` を追加（2箇所）
   - Props の型定義更新（`onSelectTaskAndTab` のシグネチャ変更）

2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - `handleSelectTaskAndTab` に `methodId` パラメータを追加し `setSelectedMethodId` を呼び出す

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| taskId フォーマット変更による他機能への影響 | 中 | 低 | taskId は ProgressCheckTab 内でのみ使用されており、他コンポーネントへの影響は軽微 |
| 重複タスクが表示される可能性 | 低 | 低 | `uniqueTasksMap` による重複排除処理が既に存在するため問題なし |

## テスト計画

### 手動テスト
- [ ] 進捗確認タブで任意のタスクの「指示」ボタンを押下し、指示確認タブに遷移後、タスクフィルタに正しいタスク番号が表示されることを確認
- [ ] 遷移後に対象メソッドが選択されていることを確認
- [ ] 遷移後に対象タスクが選択されていることを確認
- [ ] 指示確認タブを直接開いた場合に正常動作することを確認
- [ ] タスク開始・強制終了後も正常動作することを確認

## 承認記録
- **計画書提示日時**: 2026-04-30 10:24
- **承認日時**: 2026-04-30 10:24
- **承認者コメント**: 対応案1+2での実装を承認
