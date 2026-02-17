# Implementation Tasks: 実験データ保存API

## Overview

本ドキュメントは、実験作業者が実験データを効率的かつ安全に記録するためのバックエンドAPI実装タスクを定義します。複数プレースの実験データ（Material、Condition、Result）を一括保存し、トランジションの進捗状況をリアルタイムで更新できる機能を実装します。

**主要機能:**
- 実験データ一括保存API（POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data）
- トランジションステータス更新API（既存APIへのイベントログ記録追加）
- All or Nothingトランザクション保証
- マルチテナント分離とRBACによるアクセス制御

## Implementation Tasks

### 1. データベースマイグレーション

- [ ] 1.1 (P) template_dataテーブルのマイグレーションファイルを作成する
  - `backend/migrations/YYYYMMDD_create_template_data_table.sql` を作成
  - テーブル定義（id, organization_id, project_id, method_id, task_no, place_id, template_type, template_id, data (JSONB), status, comment, recorded_by, recorded_at, created_at, updated_at）
  - 一意キー制約 (organization_id, project_id, method_id, task_no, place_id) を設定
  - 外部キー制約（projects, project_task）を設定
  - インデックス作成（organization_id + recorded_at、project_id + task_no、data列にGINインデックス）
  - CHECK制約（template_type, status）を設定
  - _Requirements: 1, 4, 9_

- [ ] 1.2 (P) マイグレーション実行とテーブル確認を行う
  - 開発環境でマイグレーションを実行
  - テーブル構造が正しく作成されたことを確認
  - インデックスとConstraintsが正しく設定されたことを確認
  - _Requirements: 1, 9_

### 2. リポジトリ層の実装

- [ ] 2.1 (P) TemplateDataRepositoryを実装する
  - `backend/src/repositories/templateDataRepository.ts` を新規作成
  - upsert()メソッド: 一意キーでUPSERT操作を実行（ON CONFLICT ... DO UPDATE）
  - findByTaskNo()メソッド: タスク番号でtemplate_dataレコードを取得
  - findByPlaceId()メソッド: プレースIDでレコードを取得
  - すべてのメソッドでorganization_idフィルタを必須とする
  - Parameterized Queriesを使用してSQLインジェクション対策
  - JSONB型のdata列を適切に処理（JSON.stringify + $n::jsonb）
  - トランザクション内で実行可能なようPoolClientを引数で受け取る
  - _Requirements: 1, 4, 9_

- [ ] 2.2 (P) EventLogRepositoryを実装する
  - `backend/src/repositories/eventLogRepository.ts` を新規作成
  - logEvent()メソッド: maiml_event_logテーブルにイベントを記録
  - sequence_noの自動採番ロジック（organization_id, project_id単位）
  - イベントデータをJSONB形式で保存（jsonb_build_object使用）
  - organization_idフィルタを必須とする
  - トランザクション内で実行可能なようPoolClientを引数で受け取る
  - _Requirements: 10, 4_

- [ ] 2.3 TransitionDataRepositoryの既存実装を確認・拡張する
  - `backend/src/repositories/transitionDataRepository.ts` の既存実装を確認
  - updateStatus()メソッドが存在することを確認
  - 必要に応じてfindByTransitionId()メソッドを追加
  - organization_idフィルタが正しく適用されていることを確認
  - _Requirements: 3, 4_

### 3. サービス層の実装

- [ ] 3.1 ステータス遷移バリデーションロジックを実装する
  - `backend/src/services/experimentDataService.ts` にvalidateStatusTransition()メソッドを追加
  - ALLOWED_TRANSITIONSマトリクスを定義（initial→preparing→ready→running→completed等）
  - 不正な状態遷移を検出しInvalidStatusTransitionErrorをスロー
  - status='completed'の場合はprogressRateを自動的に100に設定
  - _Requirements: 3_

- [ ] 3.2 実験データ一括保存サービスメソッドを実装する
  - `backend/src/services/experimentDataService.ts` にsaveBatchData()メソッドを実装
  - トランザクション開始（db.transaction()）
  - プロジェクトステータスを確認（draft/active/waiting_approval以外は403エラー）
  - タスク存在確認（存在しない場合は404エラー）
  - records配列の各要素をTemplateDataRepository.upsert()で保存
  - 1件でも失敗したら全体をロールバック（All or Nothing）
  - 成功時はコミットして保存されたレコード配列を返す
  - _Requirements: 1, 2, 4_

- [ ] 3.3 トランジションステータス更新サービスメソッドにイベントログ記録を追加する
  - `backend/src/services/experimentDataService.ts` の既存updateStatus()メソッドを拡張
  - トランジション更新後にEventLogRepository.logEvent()を呼び出す
  - イベントタイプ='transition_status_update'を設定
  - イベントデータ（method_id, task_no, transition_id, status, progress_rate, updated_by）を記録
  - タスク進捗率の再計算ロジックを追加（トランジションの平均進捗率）
  - すべてをトランザクション内で実行
  - _Requirements: 3, 10, 2_

### 4. コントローラ層の実装

- [ ] 4.1 実験データ一括保存コントローラーを実装する
  - `backend/src/controllers/experimentController.ts` にsaveBatchData()メソッドを追加
  - パスパラメータ（projectId, methodId, taskNo）を抽出
  - リクエストボディ（records配列）を抽出
  - organizationId、userIdをreq.userから取得
  - experimentDataService.saveBatchData()を呼び出す
  - 成功時はHTTPステータスコード201で統一レスポンス形式を返す
  - エラー時はnext()でエラーハンドリングミドルウェアに委譲
  - _Requirements: 1, 7, 8_

- [ ] 4.2 トランジションステータス更新コントローラーを確認・拡張する
  - `backend/src/controllers/experimentController.ts` の既存updateTransitionStatus()メソッドを確認
  - サービス層の拡張に対応していることを確認
  - レスポンスに更新後のトランジション情報を含めることを確認
  - HTTPステータスコード200で統一レスポンス形式を返すことを確認
  - _Requirements: 3, 7, 8_

### 5. ルート層の実装

- [ ] 5.1 実験データ一括保存APIのバリデーションルールを定義する
  - `backend/src/routes/experimentRoutes.ts` にバリデーションルールを追加
  - param('projectId').isUUID() - UUID形式の検証
  - param('methodId').notEmpty() - 空文字列でないことを検証
  - param('taskNo').isInt({ min: 1 }) - 1以上の整数を検証
  - body('records').isArray({ min: 1, max: 50 }) - 配列要素数の検証
  - records配列の各要素（placeId, templateType, templateId, data, status, comment）のバリデーション
  - templateTypeは['material', 'condition', 'result']のいずれか
  - statusは有効なステータス値のいずれか
  - commentは最大2000文字
  - _Requirements: 5_

- [ ] 5.2 実験データ一括保存APIのルートを定義する
  - `backend/src/routes/experimentRoutes.ts` に新しいエンドポイントを追加
  - POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
  - ミドルウェアチェーン（auth → tenantIsolation → バリデーション → handleValidationErrors → experimentController.saveBatchData）
  - permissionCheck(['worker', 'manager', 'admin']) を適用
  - _Requirements: 6, 5_

- [ ] 5.3 トランジションステータス更新APIの既存ルートを確認する
  - `backend/src/routes/experimentRoutes.ts` の既存ルートを確認
  - PUT /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status
  - ミドルウェアチェーンが正しく適用されていることを確認
  - バリデーションルールが適切であることを確認
  - _Requirements: 6, 5_

### 6. エラーハンドリングの実装

- [ ] 6.1 (P) カスタムエラークラスを定義する
  - `backend/src/utils/errors.ts` に必要なエラークラスを追加（存在しない場合のみ）
  - ProjectNotEditableError（403） - プロジェクトが編集不可状態
  - TaskNotFoundError（404） - タスクが存在しない
  - InvalidStatusTransitionError（422） - 不正なステータス遷移
  - 既存のValidationError、AuthenticationError、DatabaseError等を確認
  - _Requirements: 7_

- [ ] 6.2 (P) エラーメッセージの多言語対応を確認する
  - エラーメッセージが日本語で分かりやすいことを確認
  - 機密情報（パスワード、トークン、内部パス）が含まれていないことを確認
  - ユーザーフレンドリーなエラーメッセージを提供
  - _Requirements: 7_

### 7. ユニットテストの実装

- [ ] 7.1 (P) TemplateDataRepositoryのユニットテストを実装する
  - `backend/tests/repositories/templateDataRepository.test.ts` を作成
  - upsert()メソッド: 新規レコードの場合INSERTされる
  - upsert()メソッド: 既存レコードの場合UPDATEされる
  - upsert()メソッド: JSONB型のdataが正しく保存される
  - findByTaskNo()メソッド: organization_idフィルタが正しく適用される
  - _Requirements: 1, 4_

- [ ] 7.2 (P) EventLogRepositoryのユニットテストを実装する
  - `backend/tests/repositories/eventLogRepository.test.ts` を作成
  - logEvent()メソッド: sequence_noが正しく自動採番される
  - logEvent()メソッド: イベントデータがJSONB形式で保存される
  - logEvent()メソッド: トランザクション内で実行される
  - _Requirements: 10_

- [ ] 7.3 (P) experimentDataServiceのユニットテストを実装する
  - `backend/tests/services/experimentDataService.test.ts` を作成（既存の場合は追加）
  - saveBatchData(): プロジェクトステータスがdraftの場合、正常に保存される
  - saveBatchData(): プロジェクトステータスがarchivedの場合、ProjectNotEditableErrorがスローされる
  - saveBatchData(): タスクが存在しない場合、TaskNotFoundErrorがスローされる
  - saveBatchData(): records配列の1件でも失敗した場合、全体がロールバックされる
  - updateStatus(): 有効なステータス遷移の場合、正常に更新される
  - updateStatus(): 不正なステータス遷移の場合、InvalidStatusTransitionErrorがスローされる
  - updateStatus(): status='completed'の場合、progress_rateが自動的に100になる
  - updateStatus(): イベントログが正しく記録される
  - _Requirements: 1, 2, 3, 10_

### 8. 統合テストの実装

- [ ] 8.1 実験データ一括保存APIの統合テストを実装する
  - `backend/tests/integration/experimentData.test.ts` を作成
  - 認証なしの場合、401エラーが返される
  - 権限不足の場合、403エラーが返される
  - バリデーションエラーの場合、400エラーが返される
  - 正常な場合、201ステータスとsavedRecords[]が返される
  - プロジェクトステータスがarchivedの場合、403エラーが返される
  - records配列の途中で失敗した場合、すべてロールバックされる
  - _Requirements: 1, 6, 7, 2_

- [ ] 8.2 トランジションステータス更新APIの統合テストを実装する
  - `backend/tests/integration/transitionStatus.test.ts` を作成（既存の場合は追加）
  - 不正なステータス遷移の場合、422エラーが返される
  - トランジションが存在しない場合、404エラーが返される
  - 正常な場合、200ステータスと更新後のデータが返される
  - イベントログが正しく記録される
  - イベントログ記録が失敗した場合、ステータス更新もロールバックされる
  - _Requirements: 3, 10, 2_

### 9. パフォーマンステストの実装

- [ ] 9.1* パフォーマンステストシナリオを実装する
  - `backend/tests/performance/experimentData.performance.test.ts` を作成
  - records配列50件の一括保存が2秒以内に完了する
  - 並行トランザクション100件でもデータ整合性が保たれる
  - レスポンスタイムP95が500ms以下
  - データベース接続プールが枯渇しない
  - _Requirements: 9_

### 10. ドキュメント更新

- [ ] 10.1 (P) API一覧を更新する
  - `docs/design/api/api_list.md` に新しいAPIエンドポイントを追加
  - POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
  - 実装状態を「実装済み」に更新
  - ルートファイルパス、コントローラー名を記載
  - _Requirements: 8_

- [ ] 10.2 (P) API設計書を更新する
  - `docs/design/api/api_experiment_data.md` が最新の実装と一致していることを確認
  - リクエスト/レスポンス例を追加
  - エラーケースの詳細を追加
  - 変更履歴に実装完了日を記録
  - _Requirements: 8_

## Requirements Coverage

| Requirement | タスク |
|-------------|--------|
| 1 - 実験データ一括保存 | 1.1, 1.2, 2.1, 3.2, 4.1, 5.1, 5.2, 7.1, 7.3, 8.1 |
| 2 - トランザクション管理 | 3.2, 3.3, 7.3, 8.1, 8.2 |
| 3 - トランジションステータス更新 | 2.3, 3.1, 3.3, 4.2, 5.3, 7.3, 8.2 |
| 4 - マルチテナント分離 | 1.1, 2.1, 2.2, 3.2, 7.1 |
| 5 - 入力バリデーション | 5.1, 5.2, 5.3 |
| 6 - 認証と認可 | 5.2, 5.3, 8.1 |
| 7 - エラーハンドリング | 4.1, 4.2, 6.1, 6.2, 8.1 |
| 8 - レスポンス形式 | 4.1, 4.2, 10.1, 10.2 |
| 9 - パフォーマンスと最適化 | 1.1, 1.2, 2.1, 9.1 |
| 10 - 監査とロギング | 2.2, 3.3, 7.2, 8.2 |

**全10要件がタスクにマッピングされています。**

## Task Execution Notes

### 並行実行可能なタスク

以下のタスクは依存関係がないため並行実行可能です（`(P)` マーカー付き）：

**Phase 1 - データベース＆リポジトリ層:**
- 1.1, 1.2: マイグレーション作成・実行
- 2.1, 2.2: TemplateDataRepository、EventLogRepository実装（独立）

**Phase 3 - エラーハンドリング:**
- 6.1, 6.2: エラークラス定義、メッセージ確認（独立）

**Phase 4 - テスト:**
- 7.1, 7.2, 7.3: ユニットテスト（各レイヤー独立）

**Phase 5 - ドキュメント:**
- 10.1, 10.2: API一覧、設計書更新（独立）

### 依存関係のあるタスク

以下のタスクは順次実行が必要です：

1. **2.3** → **3.1, 3.3** - 既存リポジトリ確認後にサービス層実装
2. **2.1, 2.2** → **3.2** - リポジトリ完成後に一括保存サービス実装
3. **3.1, 3.2, 3.3** → **4.1, 4.2** - サービス層完成後にコントローラ実装
4. **4.1, 4.2** → **5.1, 5.2, 5.3** - コントローラ完成後にルート実装
5. **すべての実装タスク** → **8.1, 8.2** - 統合テストは実装完了後

### 推奨実行順序

1. **Phase 1**: タスク1.1 → 1.2（マイグレーション）
2. **Phase 2**: タスク2.1, 2.2（並行） + 2.3（並行）
3. **Phase 3**: タスク3.1 → 3.2, 3.3
4. **Phase 4**: タスク4.1, 4.2
5. **Phase 5**: タスク5.1 → 5.2, 5.3 + 6.1, 6.2（並行）
6. **Phase 6**: タスク7.1, 7.2, 7.3（並行）
7. **Phase 7**: タスク8.1, 8.2
8. **Phase 8**: タスク9.1（オプショナル）
9. **Phase 9**: タスク10.1, 10.2（並行）

## Definition of Done

各タスク完了時に以下を確認：
- [ ] コードがTypeScriptの型チェックをパスする
- [ ] Lintエラーがない
- [ ] 関連するユニットテストがすべてパスする
- [ ] コードレビューで承認を得る
- [ ] ドキュメントが更新されている

全体完了時に以下を確認：
- [ ] すべての統合テストがパスする
- [ ] APIドキュメントが最新である
- [ ] セキュリティチェックリストを満たしている
- [ ] パフォーマンス要件を満たしている（P95 < 500ms）

## Notes

- **トランザクション管理**: すべてのDB操作はトランザクション内で実行し、All or Nothing保証を実現
- **マルチテナント分離**: すべてのクエリにorganization_idフィルタを必須とする
- **セキュリティ**: Parameterized Queriesを使用し、SQLインジェクション対策を徹底
- **パフォーマンス**: GINインデックスを使用してJSONB型の高速検索を実現
- **エラーハンドリング**: 統一されたエラーレスポンス形式を使用し、機密情報を含めない

## Related Documents

- [要件定義書](./requirements.md)
- [設計書](./design.md)
- [API仕様書](../../../design/api/api_experiment_data.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [API設計ポリシー](.cline/skills/backend-develop-skill/docs/api.md)
