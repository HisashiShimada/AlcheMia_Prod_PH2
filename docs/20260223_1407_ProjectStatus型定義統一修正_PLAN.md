# タスク計画書: ProjectStatusの型定義統一修正

## メタデータ
- **作成日時**: 2026-02-23 14:07
- **タスクID**: project_status_type_alignment
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

バックエンドの`ProjectStatus`型定義をフロントエンドと整合させ、タスク開始ボタン押下時のエラー「プロジェクトステータスが編集可能な状態ではありません」を解消します。

## 2. 目的と期待される成果

### 目的
- バックエンドとフロントエンド間のProjectStatus型定義の不整合を解消
- タスク開始ボタンが正常に動作するようにする
- 将来的な型不一致エラーを防ぐ

### 期待される成果
- [x] 問題の根本原因特定完了
- [ ] ProjectStatus型定義の修正完了
- [ ] タスク開始ボタンが正常に動作することを確認
- [ ] 関連APIのレスポンスが正しい値を返すことを確認

## 3. 実装ステップ

### Phase 1: 型定義の修正
- [x] `backend/src/types/project.ts`の`ProjectStatus`型定義を修正
  - `'pending'` → `'waiting_task'`（タスク実行待ち）
  - `'in_progress'` → `'executing_task'`（タスク実行中）
  - `'review_waiting'` → `'waiting_approval'`（承認待ち）
- [x] `backend/src/types/project.ts`の`PROJECT_STATUS_MAP`を修正
  - `1: 'pending'` → `1: 'waiting_task'`
  - `2: 'in_progress'` → `2: 'executing_task'`
  - `3: 'review_waiting'` → `3: 'waiting_approval'`

### Phase 2: 動作確認
- [x] TypeScriptコンパイルエラーの確認（今回の修正に関するエラーなし）
- [ ] タスク開始API（`PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status`）のテスト（ユーザー確認待ち）
- [ ] タスク一覧取得API（`GET /api/v1/progress/projects/:projectName/worker-tasks`）のレスポンス確認（ユーザー確認待ち）
- [ ] フロントエンドでタスク開始ボタンが正常に動作することを確認（ユーザー確認待ち）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/project.ts` - ProjectStatus型定義とPROJECT_STATUS_MAPの修正

### 影響を受ける可能性のあるファイル（確認のみ）
1. `backend/src/services/workerProjectService.ts` - PROJECT_STATUS_MAPを使用
2. `backend/src/controllers/progressController.ts` - プロジェクトステータスを数値でチェック（修正不要）

### 影響を受けない箇所
- TaskStatus（タスクのステータス）- 別の型なので修正不要
- TransitionStatus（トランジションのステータス）- 別の型なので修正不要
- UploadBatchStatus（アップロードバッチのステータス）- 別の型なので修正不要

## 5. 技術的詳細

### 現在の定義（バックエンド）
```typescript
export type ProjectStatus = 
  | 'planning'        // 0: プロジェクト計画中
  | 'pending'         // 1: タスク実行待ち
  | 'in_progress'     // 2: タスク実行中
  | 'review_waiting'  // 3: タスク結果レビュー待ち
  | 'completed'       // 4: プロジェクト完了
  | 'error';          // 5: タスク異常終了

export const PROJECT_STATUS_MAP: Record<number, ProjectStatus> = {
  0: 'planning',
  1: 'pending',
  2: 'in_progress',
  3: 'review_waiting',
  4: 'completed',
  5: 'error'
};
```

### 修正後の定義（フロントエンドと統一）
```typescript
export type ProjectStatus = 
  | 'planning'           // 0: プロジェクト計画中
  | 'waiting_task'       // 1: タスク実行待ち
  | 'executing_task'     // 2: タスク実行中
  | 'waiting_approval'   // 3: 承認待ち
  | 'completed'          // 4: プロジェクト完了
  | 'error';             // 5: タスク異常終了

export const PROJECT_STATUS_MAP: Record<number, ProjectStatus> = {
  0: 'planning',
  1: 'waiting_task',      // 'pending' → 'waiting_task'
  2: 'executing_task',    // 'in_progress' → 'executing_task'
  3: 'waiting_approval',  // 'review_waiting' → 'waiting_approval'
  4: 'completed',
  5: 'error'
};
```

### フロントエンドの定義（参考）
```typescript
// frontend/src/types/experimentWorker.ts
export type ProjectStatus = 
  | 'planning'           // 計画中
  | 'waiting_task'       // タスク実行待ち
  | 'executing_task'     // タスク実行中
  | 'waiting_approval'   // 承認待ち
  | 'completed';         // 完了

export function isEditableStatus(status: ProjectStatus): boolean {
  return ['waiting_task', 'executing_task'].includes(status);
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| TypeScriptコンパイルエラー | 中 | 低 | 修正後に即座にコンパイルして確認 |
| APIレスポンス形式の変更による既存機能への影響 | 高 | 低 | 主要なAPIをテストして動作確認 |
| 他のProjectStatus使用箇所の見落とし | 中 | 低 | 検索して全ての使用箇所を確認済み |

## 7. テスト計画

### ユニットテスト
- [ ] PROJECT_STATUS_MAPの変換が正しいことを確認

### 統合テスト
- [ ] タスク開始API呼び出し（project_status=1のプロジェクト）
- [ ] タスク開始API呼び出し（project_status=2のプロジェクト）
- [ ] タスク開始API呼び出し（project_status=0のプロジェクト）→ エラーを期待
- [ ] タスク一覧取得APIのレスポンス確認（projectStatusが'waiting_task'や'executing_task'になっているか）

### 手動テスト
- [ ] フロントエンドからタスク開始ボタンをクリック
- [ ] エラーメッセージが表示されないことを確認
- [ ] タスクステータスが正常に更新されることを確認

## 8. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：
1. `backend/src/types/project.ts`を元の定義に戻す
2. TypeScriptコンパイルを実行
3. サーバーを再起動

## 9. 関連ドキュメント

- `docs/design/ui/ui_task_list_table.md` - UI設計書
- `backend/src/types/project.ts` - ProjectStatus型定義
- `frontend/src/types/experimentWorker.ts` - フロントエンドのProjectStatus型定義
- `backend/src/controllers/progressController.ts` - エラー発生箇所

## 10. 承認記録

- **計画書提示日時**: 2026-02-23 14:07
- **承認日時**: 2026-02-23 14:08
- **承認者コメント**: 案1を採用。作業を細かく分けて実施。

## 11. 実施記録

### 実施日時
開始: 2026-02-23 14:08

### 実施内容
（作業完了後に記録）
