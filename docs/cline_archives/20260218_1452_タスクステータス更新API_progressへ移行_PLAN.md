# タスク計画書: タスクステータス更新API - progressへ移行

## メタデータ
- **作成日時**: 2026-02-18 14:52
- **タスクID**: task-status-update-api-migration
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

API仕様書（`api_progress_monitoring.md`）に基づき、タスクステータス更新APIのエンドポイントを`taskRoutes.ts`から`progressRoutes.ts`に移行します。

### 現状
- **現在のエンドポイント**: `PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status`
- **実装場所**: `backend/src/routes/taskRoutes.ts`
- **コントローラー**: `backend/src/controllers/taskController.ts`の`updateStatus`メソッド

### 目標
- **新エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status`
- **実装場所**: `backend/src/routes/progressRoutes.ts`
- **コントローラー**: `backend/src/controllers/progressController.ts`の`updateTaskStatus`メソッド

## 2. 目的と期待される成果

### 目的
- API仕様書の構造に合わせたエンドポイント整理
- progress関連のAPIを`progressRoutes.ts`に集約
- プロジェクト名ベースのエンドポイントへの統一

### 期待される成果
- [x] 仕様書通りのエンドポイント実装
- [ ] progressRoutes.tsにPATCHエンドポイント追加
- [ ] progressController.tsにupdateTaskStatusメソッド追加
- [ ] taskRoutes.tsから旧エンドポイント削除
- [ ] バリデーションの適切な実装
- [ ] 既存の機能が正常動作

## 3. 実装ステップ

### Phase 1: progressController.tsにupdateTaskStatusメソッド追加
- [ ] progressController.tsを開く
- [ ] taskController.tsのupdateStatusメソッドをベースに新メソッド作成
- [ ] プロジェクト名からプロジェクトIDを取得する処理を追加
- [ ] 楽観的ロック（currentUpdatedAt）の処理を追加
- [ ] エラーハンドリングを実装
- [ ] ロギング処理を追加

### Phase 2: progressRoutes.tsにエンドポイント追加
- [ ] progressRoutes.tsを開く
- [ ] PATCHエンドポイントを追加
- [ ] パスパラメータのバリデーション実装
  - projectName: 文字列（1-255文字）
  - methodId: 文字列（1-255文字）
  - taskNo: 整数（1以上）
- [ ] リクエストボディのバリデーション実装
  - status: 必須、列挙値
  - currentUpdatedAt: 必須、ISO8601形式
  - comment: 任意、最大500文字
- [ ] authMiddlewareの適用
- [ ] checkPermission('050000', 1)の適用
- [ ] handleValidationErrorsの適用

### Phase 3: taskRoutes.tsから旧エンドポイント削除
- [ ] taskRoutes.tsを開く
- [ ] 該当するPUTエンドポイントを削除
- [ ] または非推奨コメントを追加して残す（移行期間用）

### Phase 4: テスト実行
- [ ] TypeScriptコンパイルチェック
- [ ] 関連するユニットテストの確認
- [ ] 手動でエンドポイントテスト（可能であれば）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/routes/progressRoutes.ts` - PATCHエンドポイント追加
2. `backend/src/controllers/progressController.ts` - updateTaskStatusメソッド追加
3. `backend/src/routes/taskRoutes.ts` - PUTエンドポイント削除

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- **タスクステータス更新機能**: エンドポイントが変更されるため、フロントエンドも対応が必要
- **実験作業者メニュー**: タスクステータス更新を使用している画面

## 5. 技術的詳細

### エンドポイントの違い

| 項目 | 旧エンドポイント | 新エンドポイント |
|------|-----------------|-----------------|
| HTTPメソッド | PUT | PATCH |
| パス | `/api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status` | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` |
| プロジェクト特定 | projectId（UUID） | projectName（文字列） |
| 楽観的ロック | なし | currentUpdatedAt（オプション） |
| 権限 | experiment_worker, experiment_admin, system_admin | experiment_worker（書込可）のみ |

### リクエストボディ

```typescript
{
  status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'forced_terminated',
  currentUpdatedAt: string, // ISO 8601形式（楽観的ロック用）
  comment?: string // 最大500文字
}
```

### レスポンス形式

```typescript
{
  success: true,
  data: {
    task_no: number,
    project_name: string,
    method_id: string,
    previous_status: string,
    new_status: string,
    updated_by: string,
    updated_by_name: string,
    updated_at: string,
    comment?: string
  },
  meta: {
    timestamp: string,
    requestId: string
  }
}
```

### ステータス遷移ルール

```typescript
const validTransitions: Record<string, string[]> = {
  'not_started': ['started', 'forced_terminated'],
  'started': ['in_progress', 'forced_terminated'],
  'in_progress': ['completed', 'forced_terminated'],
  'completed': ['in_progress'], // 再開可能
  'forced_terminated': ['started'] // 再開可能
};
```

### 処理フロー

1. パスパラメータ・リクエストボディのバリデーション
2. プロジェクト名からプロジェクトIDを取得（DBクエリ）
3. プロジェクトステータスが編集可能かチェック（draft, active）
4. タスク情報を取得（project_id, method_id, task_noで特定）
5. 楽観的ロックチェック（currentUpdatedAtが指定されている場合）
6. 権限チェック（自分に割り当てられたタスクのみ）
7. ステータス遷移チェック
8. トランザクション内でステータス更新
9. コメントがあれば記録
10. 監査ログ記録
11. レスポンス返却

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドが旧エンドポイントを使用し続ける | 高 | 高 | 移行期間を設けて旧エンドポイントを非推奨化 |
| プロジェクト名の取得に失敗 | 中 | 低 | 適切なエラーハンドリングとログ記録 |
| 楽観的ロックの実装ミス | 中 | 中 | 既存の実装パターンを参考に慎重に実装 |
| バリデーション漏れ | 中 | 低 | API仕様書と照らし合わせて確認 |

## 7. テスト計画

### ユニットテスト
- [ ] progressController.updateTaskStatusのテスト
- [ ] バリデーションのテスト
- [ ] ステータス遷移ルールのテスト
- [ ] 楽観的ロックのテスト

### 統合テスト
- [ ] エンドポイント全体のテスト（正常系）
- [ ] エラーケースのテスト（400, 401, 403, 404, 409, 500）
- [ ] マルチテナント分離のテスト

### 手動テスト
- [ ] Postmanでのエンドポイントテスト
- [ ] 実際の画面での動作確認（可能であれば）

## 8. ロールバック計画

問題が発生した場合：
1. taskRoutes.tsの旧エンドポイントを復活
2. progressRoutes.tsの新エンドポイントをコメントアウト
3. フロントエンドが旧エンドポイントを使い続けられるようにする

## 9. 関連ドキュメント

- [API仕様書](../design/api/api_progress_monitoring.md) - API #5仕様
- [タスク管理API仕様](../design/api/api_task_management.md) - 旧エンドポイント仕様
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-18 14:52
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-18 14:58
完了: 2026-02-18 15:05

### 計画からの変更点
- TypeScriptコンパイルチェックはWindows環境での実行が困難なため、VS Codeのエラー表示で確認
- 当初は移行期間を考慮して旧エンドポイントを残す予定だったが、ユーザーの要望により完全に削除

### 発生した問題と解決方法
1. **問題**: progressController.tsでupdateAtフィールドにtoISOString()を呼ぼうとしてエラー
   - **原因**: updateAtは既にstring型だった
   - **解決**: toISOString()を削除して直接使用

2. **問題**: WindowsでTypeScriptコンパイルコマンドの実行エラー
   - **原因**: Unix用のシェルスクリプトをWindows環境で実行しようとした
   - **解決**: VS Codeのエラー表示で型エラーがないことを確認

### 最終的な成果物
- [x] progressController.tsにupdateTaskStatusメソッド追加
- [x] progressRoutes.tsにPATCHエンドポイント追加
- [x] taskRoutes.tsから旧エンドポイント完全削除
- [x] TypeScript型エラーなし（VS Codeで確認）
- [ ] テスト実行（フロントエンド対応後に実施予定）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
