# タスクステータス更新API 実装タスク

---
**機能**: task-status-update-api  
**作成日**: 2026-01-28  
**言語**: 日本語
---

## 実装タスク

### 1. API層の実装

- [x] 1.1 (P) ルート定義とバリデーション実装
  - `backend/src/routes/taskRoutes.ts` に新しいルートを追加
  - エンドポイント `PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status` を定義
  - express-validatorでリクエストパラメータのバリデーションを実装（projectId: UUID、methodId: string、taskNo: number、status: enum、currentUpdateAt: ISO8601）
  - authMiddlewareを適用してJWT認証を有効化
  - taskControllerの`updateStatus`ハンドラーにルーティング
  - バリデーションエラー時は400エラーを即座に返却
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.4_

### 2. コントローラー層の実装

- [x] 2.1 (P) ステータス更新ハンドラーの実装
  - `backend/src/controllers/taskController.ts` に `updateStatus` 関数を実装
  - リクエストパラメータ（projectId、methodId、taskNo）とボディ（status、currentUpdateAt、comment）を抽出
  - UUID形式の追加バリデーション（projectId）を実施
  - taskNoの数値バリデーションを実施
  - ユーザー認証情報（organizationId、userId、role）を抽出
  - taskServiceの`updateTaskStatus`メソッドを呼び出し
  - ServiceResultをHTTPレスポンスに変換（成功時200、エラー時は適切なステータスコード）
  - requestIdをuuidv4()で生成してレスポンスに含める
  - _Requirements: 1.1, 2.1, 8.3, 8.5_

- [x] 2.2 (P) エラーハンドリングとロギング実装
  - エラーコードからHTTPステータスコードへのマッピング関数を実装
  - 統一されたエラーレスポンス形式を実装（success: false、error: {code, message, details}、meta: {timestamp, requestId}）
  - すべてのエラーをloggerユーティリティでロギング（organizationId、userId、projectId、methodId、taskNo、errorCode、requestIdを含める）
  - try-catchですべての例外をキャッチし、500エラーとして返却
  - エラーレスポンスにスタックトレースや内部実装詳細を含めない
  - 成功時もlogger.infoでログ記録
  - バリデーションエラー時もlogger.errorでログ記録
  - _Requirements: 2.2, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

### 3. サービス層の実装

- [x] 3.1 ステータス遷移バリデーター実装
  - `backend/src/services/taskService.ts` にステータス遷移ルールを定義
  - TaskStatusEnumを定義（PENDING=0、IN_PROGRESS=1、COMPLETED=3、FORCED_TERMINATED=4）
  - VALID_TRANSITIONSマップを実装（pending→in_progress、in_progress→completed/forced_terminated）
  - `validateTransition`関数を実装して有効な遷移のみを許可
  - 無効な遷移の場合はINVALID_STATUS_TRANSITIONエラーを返却
  - _Requirements: 1.2, 1.5_

- [x] 3.2 権限チェックロジック実装
  - `checkPermission`関数を実装してロールベースアクセス制御を実施
  - system_admin、experiment_adminは組織内のすべてのタスクにアクセス可能
  - experiment_workerは自分に割り当てられたタスク（experiment_user_id = userId）のみアクセス可能
  - 権限不足の場合はPERMISSION_INSUFFICIENTエラーを返却
  - _Requirements: 1.4, 3.3, 3.5, 3.6_

- [x] 3.3 楽観的ロック制御実装
  - UPDATE文にWHERE句で`update_at = currentUpdateAt`条件を追加
  - 更新結果のrowCountが0の場合は同時更新を検出
  - 同時更新検出時はCONCURRENT_UPDATE_DETECTEDエラー（409 Conflict）を返却
  - クライアント側でリトライ可能なエラーメッセージを含める
  - _Requirements: 1.3, 7.4, 7.5_

- [x] 3.4 タスクステータス更新メイン処理実装
  - `updateTaskStatus`メソッドを実装してトランザクション管理を実施
  - PostgreSQL接続プールから接続を取得し、BEGIN TRANSACTIONを開始
  - SELECT FOR UPDATEで対象タスクを排他ロック取得（organization_id、project_id、method_id、task_noでフィルタ）
  - JOINでproject_nameとexperiment_user_nameを取得（projectテーブル、organization_userテーブル）
  - タスクが存在しない場合はRESOURCE_NOT_FOUNDエラー（404）を返却
  - ステータス遷移バリデーション、権限チェック、楽観的ロックチェックを順次実行
  - バリデーション失敗時はROLLBACKして適切なエラーを返却
  - UPDATE文でtask_statusを更新し、experiment_start_at、experiment_end_atを条件に応じて設定
  - update_atを現在時刻（NOW()）に更新
  - COMMITしてトランザクションを完了
  - 更新後のタスク情報をServiceResultで返却（project_name、experiment_user_nameを含む）
  - _Requirements: 1.1, 1.6, 1.7, 1.8, 1.9, 9.1, 9.2, 9.5_

- [x] 3.5 マルチテナント分離の徹底
  - すべてのSQLクエリに`WHERE organization_id = $1`フィルタを必須化
  - リクエストユーザーのorganization_idとタスクのorganization_idが一致することを検証
  - organization_idが一致しない場合は404エラーを返却（403を返さずに他組織のデータ存在を隠蔽）
  - system_adminロールの場合はクロステナントアクセスを許可
  - Parameterized Queriesを使用してSQLインジェクションを防止
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 9.5_

### 4. 統合とテスト

- [x] 4.1 ユニットテストの実装
  - taskService.updateTaskStatusのユニットテストを作成
  - 有効な状態遷移（pending→in_progress→completed）のテストケース
  - 無効な状態遷移（pending→completed）のテストケース
  - experiment_workerが他人のタスクを更新しようとする権限エラーのテストケース
  - 楽観的ロック：update_atが異なる場合の409エラーのテストケース
  - 存在しない複合キー（projectId、methodId、taskNo）での404エラーのテストケース
  - taskController.updateStatusのユニットテスト（認証失敗、UUIDバリデーション、エラーマッピング）
  - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - **完了**: 既存テストファイルで全要件をカバー済み（taskService.test.ts, taskController.test.ts, taskService.optimisticLock.test.ts, taskService.multiTenant.test.ts）

- [x] 4.2 統合テストの実装
  - エンドツーエンドフローのテスト（pending→in_progress→completed）
  - 権限チェックのテスト（experiment_workerが自分のタスクのみ更新可能）
  - マルチテナント分離のテスト（異なる組織のタスクにアクセスできない）
  - 楽観的ロックのテスト（同時更新時に片方が409を受け取る）
  - トランザクション整合性のテスト（エラー時にROLLBACKされてデータが変更されない）
  - _Requirements: 2.1, 2.2, 3.5, 7.4, 9.1, 9.2_
  - **完了**: taskStatusUpdate.integration.test.ts作成、全要件をカバーする統合テストを実装

- [x]* 4.3 パフォーマンステストの実装
  - レスポンスタイムのテスト（95パーセンタイルで200ミリ秒以内）
  - 並行更新のテスト（10並行リクエストで5秒以内にすべて完了）
  - 楽観的ロック競合率のテスト（100並行更新で競合率 < 5%）
  - データベース接続プール枯渇のテスト（最大20接続まで）
  - _Requirements: 7.1, 7.2, 7.3_
  - **スキップ**: オプション項目のため実装を見送り（必要に応じて将来追加可能）

- [x] 4.4 既存システムとの統合確認
  - `backend/src/server.ts` にtaskRoutesがインポートされマウントされていることを確認
  - 既存の認証ミドルウェア（authMiddleware）との統合を確認
  - 既存のエラーハンドリングミドルウェアとの統合を確認
  - ログ出力がWinstonで正しく記録されることを確認
  - 開発環境でAPIエンドポイントが正常に動作することを確認
  - _Requirements: 3.1, 3.2, 5.1_
  - **完了**: server.tsでtaskRoutesが既にマウント済み、認証・エラーハンドリング・ロギングが正しく統合されている

## 要件カバレッジマトリクス

| 要件ID | 要件サマリー | カバーするタスク |
|--------|--------------|------------------|
| 1.1 | タスクステータス更新機能 | 1.1, 2.1, 3.4 |
| 1.2 | ステータス遷移ルール検証 | 3.1, 4.1 |
| 1.3 | 楽観的ロック制御 | 3.3, 4.1, 4.2 |
| 1.4 | ロールベース権限制御 | 3.2, 4.1, 4.2 |
| 1.5 | 無効な遷移のエラーハンドリング | 3.1, 4.1 |
| 1.6 | 成功レスポンスの返却 | 3.4 |
| 1.7 | update_atタイムスタンプ更新 | 3.4 |
| 1.8 | completed時のタイムスタンプ記録 | 3.4 |
| 1.9 | in_progress時のタイムスタンプ記録 | 3.4 |
| 2.1 | organization_idフィルタ必須化 | 3.5, 4.2 |
| 2.2 | organization_id一致検証 | 3.5, 4.2 |
| 2.3 | organization_id不一致時404エラー | 3.5 |
| 2.4 | クロステナントアクセス防止 | 3.5 |
| 2.5 | system_adminの全組織アクセス | 3.5 |
| 3.1 | JWTトークン必須 | 1.1, 4.4 |
| 3.2 | JWTトークン無効時401エラー | 1.1, 4.4 |
| 3.3 | ロール別アクセス許可 | 3.2 |
| 3.4 | 許可されていないロール403エラー | 3.2 |
| 3.5 | experiment_workerのアクセス制限 | 3.2, 4.2 |
| 3.6 | experiment_admin/system_adminのアクセス許可 | 3.2 |
| 4.1 | projectId UUID形式検証 | 1.1, 2.1 |
| 4.2 | projectId非UUID時400エラー | 1.1, 2.1 |
| 4.3 | status許可値検証 | 1.1 |
| 4.4 | status不正値時400エラー | 1.1 |
| 4.5 | comment文字数制限検証 | 1.1 |
| 4.6 | comment超過時400エラー | 1.1 |
| 5.1 | ステータス更新のログ記録 | 2.2, 4.4 |
| 5.2 | infoレベルでのログ記録 | 2.2 |
| 5.3 | 失敗時のerrorレベルログ記録 | 2.2 |
| 5.4 | 重要な変更のwarnレベルログ記録 | 2.2 |
| 6.1 | 統一エラーレスポンス形式 | 2.2 |
| 6.2 | データベースエラー時500エラー | 2.2 |
| 6.3 | バリデーションエラー時400エラー | 2.2 |
| 6.4 | スタックトレース非公開 | 2.2 |
| 6.5 | タイムアウト時504エラー | 2.2 |
| 7.1 | 95パーセンタイル500ミリ秒以内 | 4.3 |
| 7.2 | 接続プール使用 | 3.4 |
| 7.3 | 単一トランザクション内で完了 | 3.4 |
| 7.4 | 楽観的ロックで競合防止 | 3.3, 4.2 |
| 7.5 | データ競合時409エラー | 3.3 |
| 8.1 | エンドポイント提供 | 1.1 |
| 8.2 | リクエストボディ形式 | 1.1 |
| 8.3 | 成功レスポンス形式 | 2.1 |
| 8.4 | Content-Type application/json | 1.1 |
| 8.5 | 適切なHTTPステータスコード | 2.1 |
| 9.1 | トランザクション内で実行 | 3.4, 4.2 |
| 9.2 | エラー時ロールバック | 3.4, 4.2 |
| 9.3 | 外部キー制約の尊重 | 3.4 |
| 9.4 | project.update_at更新 | 3.4 |
| 9.5 | Parameterized Queries使用 | 3.5 |

## 見積もり

- **総タスク数**: 4メジャータスク、11サブタスク
- **総工数見積もり**: 2-3日
- **並列実行可能タスク**: 1.1, 2.1, 2.2（API層とコントローラー層は並行開発可能）
- **依存関係**: サービス層（タスク3）はコントローラー層（タスク2）の後に実装、統合テスト（タスク4）はすべての実装完了後

## 完了基準

- [ ] すべてのサブタスクが完了している
- [ ] すべての要件がタスクにマッピングされている
- [ ] ユニットテストと統合テストがすべて成功している
- [ ] コードレビューが完了している
- [ ] APIが開発環境で正常に動作している
- [ ] ドキュメント（API仕様書）が更新されている

---
**次のステップ**: タスク承認後、`/spec-impl task-status-update-api 1.1` から実装を開始してください。