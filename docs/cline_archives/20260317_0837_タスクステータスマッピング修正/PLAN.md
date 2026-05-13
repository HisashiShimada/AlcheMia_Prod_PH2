# タスク計画書: タスクステータスマッピング修正

## メタデータ
- **作成日時**: 2026-03-17 08:37
- **タスクID**: task-status-mapping-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
プロジェクト管理画面のタスク結果確認タブにてタスクステータス2で登録されているレコードが「failed」と表示されている問題を修正する。バックエンドの `TaskStatusEnum` 定義と、各ファイルの変換マップが不整合になっているため、全ファイルを正しい定義に統一する。

## 正しいマッピング（TaskStatusEnum基準）

| DB数値 | 意味 | 文字列キー |
|--------|------|-----------|
| 0 | 実行待ち | `pending` |
| 1 | 実行中 | `in_progress` |
| 2 | レビュー待ち | `review_waiting` |
| 3 | 完了 | `completed` |
| 4 | 強制終了（異常終了） | `forced_terminated` |

## 変更ファイル

1. `backend/src/types/project.ts` - TaskStatus型・TASK_STATUS_MAP修正
2. `backend/src/repositories/projectTaskDetailRepository.ts` - TASK_STATUS_MAP修正
3. `backend/src/controllers/projectController.ts` - statusMap修正
4. `backend/src/services/taskService.ts` - convertToTaskSummary内statusMap修正（2追加）
5. `frontend/src/components/project/TaskResultsTable.tsx` - ステータス文字列修正

## 承認記録
- **承認日時**: 2026-03-17 08:37
