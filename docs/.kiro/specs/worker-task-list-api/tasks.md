# Implementation Tasks: Worker Task List API

## Overview
プロジェクト内の全タスクをメソッド単位でグループ化して取得するAPIの実装タスクです。既存のLayered Architectureに従い、Repository → Service → Controller → Routeの順に実装します。

---

## Implementation Tasks

### Phase 1: データアクセス層の実装

- [ ] 1. タスク一覧取得用SQLクエリの実装
- [x] 1.1 外部SQLファイルの作成
  - `backend/src/sql/queries/tasks/listMethodsAndTasksByProject.sql`を作成
  - project_taskとproject_task_detailをLEFT JOINしてメソッドとタスク詳細を取得
  - transition_dataをLEFT JOINして進捗率（AVG）を計算
  - organization_userとuser_authenticationをLEFT JOINして担当者名を取得
  - 全JOINでorganization_idフィルタを適用（マルチテナント分離）
  - WHERE句でprojectId ($1)とorganizationId ($2)をフィルタ
  - 動的フィルタ（methodId, status, assignUserId）用のプレースホルダーを準備
  - GROUP BY句で全非集約カラムを指定（AVG集約関数使用のため）
  - ORDER BY句でexperiment_order ASC、動的ソート条件、task_detail_no ASCを設定
  - COALESCEでprogress_rateがnullの場合0を返す
  - _Requirements: 1, 2, 4, 5, 10, 11_

- [x] 1.2 TaskRepositoryインターフェースと実装の作成
  - `backend/src/repositories/taskRepository.ts`を作成
  - TaskRepositoryインターフェースを定義（findMethodsAndTasksByProject）
  - MethodTaskRecord型を定義（method情報 + task詳細情報）
  - TaskFilters型を定義（methodId, status, assignUserId, sortBy, order）
  - Kyselyのsql.rawで外部SQLファイルを読み込み実行
  - 動的WHERE句の構築（フィルタ条件に応じてパラメータを追加）
  - 動的ORDER BY句の構築（sortByとorderに応じてソート条件を追加）
  - Parameterized Queriesで安全にクエリを実行
  - organization_idフィルタを必須で適用
  - _Requirements: 1, 2, 3, 5, 10_

### Phase 2: ビジネスロジック層の実装

- [ ] 2. タスクサービスの実装
- [x] 2.1 TaskServiceインターフェースと実装の作成
  - `backend/src/services/taskService.ts`を作成
  - TaskServiceインターフェースを定義（getTasksGroupedByMethod）
  - MethodGroup型、TaskSummary型を定義
  - TaskRepositoryを依存性として注入
  - getTasksGroupedByMethodメソッドを実装
  - TaskRepository.findMethodsAndTasksByProjectを呼び出し
  - 取得したMethodTaskRecordをmethod_id単位でグループ化
  - 各MethodGroupのtasks配列を構築
  - experiment_order順にMethodGroupをソート
  - 空のメソッド（タスクなし）も含める
  - 日時フィールドをISO 8601形式に変換
  - _Requirements: 1, 3, 4, 11_

- [x] 2.2 データ整合性検証ロジックの実装
  - TaskService内にvalidateDataConsistencyメソッドを追加
  - データベースから取得したメソッドIDの検証
  - 不整合が見つかった場合は警告ログを出力
  - エラーにはせず処理を継続（データを除外）
  - _Requirements: 11_

### Phase 3: API層の実装

- [ ] 3. TaskControllerとルーティングの実装
- [x] 3.1 TaskControllerの作成
  - `backend/src/controllers/taskController.ts`を作成
  - TaskControllerクラスを定義
  - TaskServiceを依存性として注入
  - listメソッドを実装（GET /api/v1/tasksのハンドラ）
  - クエリパラメータ（projectId, methodId, status, assignUserId, sortBy, order）を抽出
  - req.organizationIdを取得（tenantIsolationミドルウェアから）
  - TaskService.getTasksGroupedByMethodを呼び出し
  - 成功時は統一レスポンス形式（success: true, data, meta）で返却
  - エラー時はエラーハンドリングミドルウェアにスロー
  - _Requirements: 1, 9_

- [x] 3.2 (P) リクエストバリデーションの実装
  - TaskController内にvalidateListRequestメソッドを追加
  - express-validatorを使用してバリデーションルールを定義
  - projectId: 必須、UUID形式
  - methodId: オプション、UUID形式
  - status: オプション、enum値（not_started, started, in_progress, completed, forced_terminated）
  - assignUserId: オプション、UUID形式
  - sortBy: オプション、enum値（task_no, created_at, updated_at, status）
  - order: オプション、enum値（asc, desc）
  - バリデーションエラー時は400エラーで詳細情報を返却
  - _Requirements: 7_

- [x] 3.3 (P) ルート定義の追加
  - `backend/src/routes/taskRoutes.ts`を編集（存在する場合）または作成
  - GET /api/v1/tasksルートを定義
  - ミドルウェアチェーン: auth → tenantIsolation（permissionCheckは既存ルートで未使用のため省略）
  - TaskController.listをルートハンドラとして設定
  - `backend/src/server.ts`でtaskRoutesをマウント（完了）
  - _Requirements: 6_

### Phase 4: エラーハンドリングとロギング

- [x] 4. エラーハンドリングの実装
- [x] 4.1 (P) カスタムエラークラスの作成
  - `backend/src/utils/errorClasses.ts`を編集
  - ProjectNotFoundError（404）を追加 ✓
  - MAIMLParseError（500）を追加（将来使用）✓
  - ValidationError（400）を確認（既存）✓
  - DatabaseError（500）を追加 ✓
  - 各エラーにstatusCodeとエラーコードを設定 ✓
  - formatErrorResponseとgetHttpStatusFromErrorを更新 ✓
  - _Requirements: 8_

- [x] 4.2 (P) ロギングの実装
  - TaskService内に適切なログ出力を追加 ✓
  - INFO: API呼び出し情報（projectId, フィルタ条件、レスポンスタイム、結果件数）✓
  - WARN: データ整合性問題（不正なmethod_id）✓ (既に実装済み)
  - ERROR: データベースエラー、予期しない例外 ✓
  - ログにはorganizationId、projectId、フィルタ条件を含める ✓
  - _Requirements: 8_

### Phase 5: テスト実装

- [ ] 5. 単体テストの実装
- [ ] 5.1 (P) TaskRepositoryの単体テスト
  - `backend/tests/repositories/taskRepository.test.ts`を作成
  - findMethodsAndTasksByProjectメソッドをテスト
  - 正しいSQLクエリが生成されることを確認
  - フィルタ条件が正しくWHERE句に反映されることを確認
  - organization_idフィルタが全テーブルに適用されることを確認
  - Parameterized Queriesが使用されることを確認
  - モックデータベースを使用
  - _Requirements: 1, 2, 5, 10_

- [ ] 5.2 (P) TaskServiceの単体テスト
  - `backend/tests/services/taskService.test.ts`を作成
  - getTasksGroupedByMethodメソッドをテスト
  - タスクがmethod_id単位で正しくグループ化されることを確認
  - 空のメソッド（タスクなし）も含まれることを確認
  - experiment_order順にソートされることを確認
  - ソート条件が正しく適用されることを確認
  - 日時フィールドがISO 8601形式に変換されることを確認
  - モックTaskRepositoryを使用
  - _Requirements: 1, 3, 4, 11_

- [ ] 5.3 (P) TaskControllerの単体テスト
  - `backend/tests/controllers/taskController.test.ts`を作成
  - listメソッドをテスト
  - パラメータが正しく抽出されることを確認
  - バリデーションエラー時に400エラーを返却することを確認
  - 成功時に統一レスポンス形式で返却することを確認
  - エラー時に適切なHTTPステータスコードを返却することを確認
  - モックTaskServiceを使用
  - _Requirements: 7, 9_

- [ ] 6. 統合テストの実装
- [ ] 6.1 API統合テスト: 正常系
  - `backend/tests/integration/taskApi.test.ts`を作成
  - 認証トークン付きでGET /api/v1/tasks?projectId=xxxをリクエスト
  - 200 OKが返却されることを確認
  - レスポンスがMethodGroup配列であることを確認
  - レスポンス形式が仕様通り（success, data, meta）であることを確認
  - 実際のデータベースを使用（テスト用データ投入）
  - _Requirements: 1, 9_

- [ ] 6.2 API統合テスト: フィルタリングとソート
  - methodIdフィルタでタスクが絞り込まれることを確認
  - statusフィルタで指定ステータスのみ返却されることを確認
  - assignUserIdフィルタで担当者のタスクのみ返却されることを確認
  - 複数フィルタ条件の組み合わせが正しく動作することを確認
  - sortBy=task_no&order=ascで正しくソートされることを確認
  - sortBy=created_at&order=descで正しくソートされることを確認
  - _Requirements: 2, 3_

- [ ] 6.3 API統合テスト: エラーケース
  - 認証トークンなしで401エラーが返却されることを確認
  - 無効な認証トークンで401エラーが返却されることを確認
  - 存在しないprojectIdで404エラーが返却されることを確認
  - 不正なprojectId形式で400エラーが返却されることを確認
  - 不正なstatus値で400エラーが返却されることを確認
  - エラーレスポンスにerror code、message、detailsが含まれることを確認
  - _Requirements: 6, 7, 8_

- [ ] 6.4 マルチテナント分離テスト
  - 異なる組織のprojectIdで404エラーが返却されることを確認
  - レスポンスに他組織のタスクが含まれないことを確認
  - organization_idフィルタが全クエリに適用されていることを確認
  - クロステナントアクセスが厳格に防止されることを確認
  - _Requirements: 5_

- [ ] 7. パフォーマンステストの実装
- [ ] 7.1 レスポンスタイム測定テスト
  - `backend/tests/performance/taskApi.performance.test.ts`を作成
  - 10タスクで0.5秒以内にレスポンスが返ることを確認
  - 50タスクで1秒以内にレスポンスが返ることを確認
  - 100タスクで2秒以内にレスポンスが返ることを確認
  - N+1問題が発生していないことを確認（SQLクエリ数を計測）
  - データベースクエリのEXPLAIN ANALYZEを実行して最適化を確認
  - _Requirements: 10_

---

## Requirements Coverage Summary

すべての要件がタスクでカバーされています：

- **要件1（タスク一覧取得）**: 1.1, 1.2, 2.1, 3.1, 5.1, 5.2, 6.1
- **要件2（タスクフィルタリング）**: 1.1, 1.2, 5.1, 6.2
- **要件3（タスクソート）**: 1.2, 2.1, 5.2, 6.2
- **要件4（メソッドグループ化）**: 1.1, 2.1, 5.2
- **要件5（マルチテナント分離）**: 1.1, 1.2, 5.1, 6.4
- **要件6（認証と認可）**: 3.3, 6.3
- **要件7（バリデーション）**: 3.2, 5.3, 6.3
- **要件8（エラーハンドリング）**: 4.1, 4.2, 6.3
- **要件9（レスポンス形式）**: 3.1, 5.3, 6.1
- **要件10（パフォーマンス）**: 1.1, 1.2, 5.1, 7.1
- **要件11（データ整合性）**: 1.1, 2.1, 2.2, 5.2

---

## Task Execution Notes

### 推奨実行順序
1. Phase 1（データアクセス層）: 1.1 → 1.2
2. Phase 2（ビジネスロジック層）: 2.1 → 2.2
3. Phase 3（API層）: 3.1 → 3.2 (P) → 3.3 (P)
4. Phase 4（エラーハンドリング）: 4.1 (P) → 4.2 (P)
5. Phase 5-7（テスト）: すべて並列実行可能

### 並列実行可能なタスク
- 3.2, 3.3（API層のバリデーションとルート定義）
- 4.1, 4.2（エラーハンドリングとロギング）
- 5.1, 5.2, 5.3（単体テスト）
- 6.1, 6.2, 6.3, 6.4（統合テストの一部）

### 依存関係
- Phase 2はPhase 1に依存
- Phase 3はPhase 2に依存
- Phase 5-7（テスト）はPhase 1-4の完了に依存

### 推定工数
- Phase 1: 4-6時間
- Phase 2: 3-4時間
- Phase 3: 4-5時間
- Phase 4: 2-3時間
- Phase 5-7: 8-10時間
- **合計: 21-28時間**