# Implementation Tasks: 進捗データ取得API

## Overview
本タスクリストは、進捗データ取得APIの実装を段階的に進めるための作業計画です。各タスクは1-3時間で完了可能な単位に分割されており、並列実行可能なタスクには(P)マークが付いています。

---

## Implementation Tasks

### Phase 1: 基盤実装（既存実装活用により簡略化）

- [ ] 1. MAIMLパーサーアダプターの実装
- [ ] 1.1 (P) 既存parsePetriNetStructure関数のラッパー作成
  - `maimlService.parsePetriNetStructure()`を呼び出し
  - 既存の返却データ構造（methods配列）をそのまま使用
  - 必要に応じて軽微なデータ変換を実装
  - エラーハンドリングを統一形式に変換
  - **既存実装**: `backend/src/services/maimlService.ts`の`parsePetriNetStructure`
  - **推定工数**: 0.5-1時間（既存実装活用により大幅削減）
  - _Requirements: 4_

- [ ] 1.2 (P) 型定義の整備
  - 既存の`maimlService.ts`の型を再利用
  - 必要に応じてProgressService用のインターフェース追加
  - Result型を使用したエラーハンドリング
  - **推定工数**: 0.5時間
  - _Requirements: 4_

### Phase 2: データアクセス層の実装

- [ ] 2. TaskRepositoryの拡張
- [ ] 2.1 (P) getTaskByProjectMethodTaskNoメソッドの実装
  - project_taskテーブルとprojectテーブルをJOIN
  - projectId、methodId、taskNo、organizationIdでフィルタリング
  - task_id、task_name、project_id、project_name、method_id、task_noを取得
  - organization_idによるマルチテナント分離を実装
  - Kyselyクエリビルダーを使用した型安全なクエリ構築
  - _Requirements: 1, 3_

- [ ] 3. ExperimentRecordRepositoryの拡張
- [ ] 3.1 (P) getLatestRecordByTransitionメソッドの実装
  - task_id、transition_id、organization_idでフィルタリング
  - update_atでDESCソート、LIMIT 1で最新レコードのみ取得
  - record_id、status、progress、update_atを返却
  - レコードが存在しない場合はnullを返却
  - organization_idによるマルチテナント分離を実装
  - _Requirements: 1, 3, 5_

- [ ] 3.2 (P) countRecordsByTransitionメソッドの実装
  - task_id、transition_id、organization_idでフィルタリング
  - db.fn.countを使用してデータ件数を取得
  - 削除済みレコードを除外
  - organization_idによるマルチテナント分離を実装
  - _Requirements: 1, 3, 5_

### Phase 3: ビジネスロジック層の実装

- [ ] 4. ProgressServiceの実装
- [ ] 4.1 getProgressDataメソッドの基本構造実装
  - サービスインターフェースの定義
  - ProgressData、ProgressServiceError型の定義
  - メソッドシグネチャの実装（projectId, methodId, taskNo, organizationId）
  - Result型を使用したエラーハンドリング
  - _Requirements: 1, 5_

- [ ] 4.2 タスク基本情報取得の実装
  - TaskRepositoryのgetTaskByProjectMethodTaskNoを呼び出し
  - タスクが存在しない場合はTASK_NOT_FOUNDエラーを返却
  - project_name、task_nameを取得
  - _Requirements: 1, 3_

- [ ] 4.3 MAIMLファイルのダウンロードとパース（既存実装活用）
  - **既存実装**: `storageService.downloadFile(organizationId, filePath)`を呼び出し
  - organization prefixを使用してマルチテナント分離されたパスからダウンロード
  - **既存実装**: `maimlService.parsePetriNetStructure(content)`でMAIML構造を抽出
  - 既存の返却データ構造から必要な情報を取得（methods配列、transitions配列）
  - ダウンロード失敗時はMAIML_DOWNLOAD_FAILEDエラーを返却
  - パース失敗時はMAIML_PARSE_FAILEDエラーを返却
  - **推定工数**: 0.5-1時間（既存実装活用により削減）
  - _Requirements: 4_

- [ ] 4.4 メソッド検索とトランジション抽出
  - methods配列から指定されたmethodIdを検索
  - メソッドが見つからない場合はMETHOD_NOT_FOUNDエラーを返却
  - method_nameをMAIMLから取得
  - petriNet.transitionsを抽出
  - _Requirements: 4_

- [ ] 4.5 トランジション進捗データの並列取得
  - Promise.allを使用して各トランジションのデータを並列取得
  - 各トランジションに対してgetLatestRecordByTransitionを呼び出し
  - 各トランジションに対してcountRecordsByTransitionを呼び出し
  - レコードが存在しない場合はステータスをnot_started、progressを0に設定
  - has_dataフラグとdata_countを設定
  - _Requirements: 1, 5, 8_

- [ ] 4.6 進捗計算ロジックの実装
  - 各トランジションのステータスに基づいてcompleted、in_progress、not_startedをカウント
  - overall_percentageを計算（全トランジションの進捗率の平均値、小数点第1位）
  - トランジション数が0の場合は0を返却
  - ステータスがcompletedの場合はprogressを100に設定
  - ステータスがnot_startedの場合はprogressを0に設定
  - _Requirements: 1, 9_

- [ ] 4.7 レスポンスデータの構築
  - ProgressData型のオブジェクトを構築
  - project_id、project_name、method_id、method_name、task_no、task_nameを設定
  - transitions配列を設定（transition_id, transition_name, status, progress, last_updated, has_data, data_count）
  - overall_progress（total_transitions, completed, in_progress, not_started, overall_percentage）を設定
  - _Requirements: 1, 5, 9_

### Phase 4: API層の実装

- [ ] 5. ProgressControllerの実装
- [ ] 5.1 getProgressDataメソッドの実装
  - リクエストパラメータの取得（projectId, methodId, taskNo）
  - req.userからorganizationIdを取得
  - パラメータバリデーション（UUID形式、整数型、文字列型）
  - バリデーション失敗時は400 VALIDATION_ERRORを返却
  - ProgressServiceのgetProgressDataを呼び出し
  - _Requirements: 1, 6, 10_

- [ ] 5.2 統一レスポンス形式への変換
  - 成功時は200 OKと統一レスポンス形式（success: true, data, meta）を返却
  - エラー時は適切なHTTPステータスコードとエラーレスポンス形式（success: false, error, meta）を返却
  - metaにtimestamp（ISO 8601形式）とrequestIdを含める
  - Content-Typeヘッダーに"application/json"を設定
  - X-Request-Idヘッダーを含める
  - _Requirements: 6, 10_

- [ ] 5.3 エラーハンドリングの実装
  - TASK_NOT_FOUND → 404エラー
  - METHOD_NOT_FOUND → 404エラー
  - MAIML_DOWNLOAD_FAILED → 500エラー
  - MAIML_PARSE_FAILED → 500エラー
  - DATABASE_ERROR → 500エラー
  - 予期しない例外はSYSTEM_ERRORとして処理し、スタックトレースをクライアントに公開しない
  - _Requirements: 6_

- [ ] 6. progressRoutesの実装
- [ ] 6.1 ルート定義とミドルウェアチェーン
  - `/api/v1/progress/:projectId/:methodId/:taskNo`のGETルートを定義
  - authMiddleware → permissionCheck → controller.getProgressDataのチェーンを構築
  - permissionCheckで許可ロール（experiment_admin, experiment_worker, system_admin）を設定
  - _Requirements: 2, 10_

### Phase 5: ログ記録の実装

- [ ] 7. ログ記録の統合
- [ ] 7.1 (P) ProgressServiceのログ記録
  - APIリクエスト受信時のログ記録（リクエストID、タイムスタンプ、ユーザーID、organizationId）
  - MAIMLファイルダウンロード時のログ記録（ファイルパス、ファイルサイズ）
  - データベースクエリ実行時のログ記録（クエリ実行時間）
  - エラー発生時のログ記録（エラーレベル、エラー詳細、スタックトレース、コンテキスト情報）
  - レスポンス返却時のログ記録（レスポンスステータスコード、処理時間）
  - _Requirements: 7_

### Phase 6: テスト実装

- [ ] 8. ユニットテストの実装
- [ ] 8.1 MAIMLパーサーアダプターのテスト
  - **参考実装**: 既存の`maimlService.parsePetriNetStructure`のテストパターン
  - アダプター関数の正常系テスト
  - 既存関数のエラーハンドリングの統合テスト
  - データ変換ロジックのテスト（必要な場合）
  - 複数メソッド対応の検証テスト
  - **推定工数**: 1-2時間（既存テストパターン参考により削減）
  - _Requirements: 4_

- [ ] 8.2 TaskRepositoryのテスト
  - getTaskByProjectMethodTaskNoの正常系テスト
  - タスクが存在しない場合のnull返却テスト
  - organization_idフィルタの動作確認テスト
  - JOINクエリの結果検証テスト
  - _Requirements: 1, 3_

- [ ] 8.3 ExperimentRecordRepositoryのテスト
  - getLatestRecordByTransitionの正常系テスト
  - レコードが存在しない場合のnull返却テスト
  - countRecordsByTransitionの正常系テスト
  - organization_idフィルタの動作確認テスト
  - _Requirements: 1, 3, 5_

- [ ] 8.4 ProgressServiceのテスト
  - 進捗計算ロジック（overall_percentage算出）のテスト
  - ステータス判定ロジック（not_started/in_progress/completed）のテスト
  - データ整合性チェック（Invariants検証）のテスト
  - 各種エラーハンドリングのテスト
  - 並列処理の正常動作確認テスト
  - _Requirements: 1, 5, 8, 9_

- [ ] 8.5 ProgressControllerのテスト
  - パラメータバリデーション（UUID形式、整数型、文字列型）のテスト
  - ProgressService呼び出しの正常系・異常系テスト
  - エラーレスポンス形式の検証テスト
  - HTTPステータスコードの検証テスト
  - _Requirements: 1, 6, 10_

- [ ] 9. 統合テストの実装
- [ ] 9.1 API統合テスト
  - 認証ミドルウェアチェーンの動作確認テスト
  - 権限チェックの動作確認テスト（各ロール）
  - エンドツーエンドの正常系フローテスト
  - 各種エラーケースのエンドツーエンドフローテスト
  - _Requirements: 2, 10_

- [ ] 9.2 マルチテナント分離の検証
  - クロステナントアクセス防止テスト
  - 異なる組織のタスクIDが指定された場合の404返却テスト
  - すべてのDBクエリでorganization_idフィルタの動作確認
  - _Requirements: 3_

- [ ] 9.3 データベース統合テスト
  - 複数トランジションの並列取得の動作確認テスト
  - インデックス使用の検証テスト（EXPLAIN ANALYZE）
  - データカウントの正確性検証テスト
  - _Requirements: 5, 8_

- [ ] 9.4 ストレージ統合テスト
  - **参考実装**: 既存の`storageService`のテストパターン
  - MAIMLファイルダウンロードの正常系・異常系テスト
  - organization prefixを使用したパス生成の検証
  - S3/Swift両環境での動作確認テスト
  - 既存の`maimlService.parsePetriNetStructure`との統合動作確認
  - **推定工数**: 1-2時間（既存テストパターン参考）
  - _Requirements: 4_

### Phase 7: 統合と最終検証

- [ ] 10. システム統合
- [ ] 10.1 全コンポーネントの統合
  - すべてのレイヤー（Utility、Repository、Service、API）を接続
  - ミドルウェアチェーンとルート定義をExpress Appに登録
  - エラーハンドリングの統合動作確認
  - ログ記録の統合動作確認
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 10_

- [ ] 10.2 エンドツーエンド検証
  - すべての要件の動作確認
  - パフォーマンステスト（レスポンスタイム、スループット）
  - セキュリティテスト（マルチテナント分離、認証・認可）
  - エラーシナリオの網羅的テスト
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_

---

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1. 進捗データ取得機能 | 2.1, 3.1, 3.2, 4.1, 4.2, 4.5, 4.6, 4.7, 5.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2 |
| 2. 認証と認可 | 6.1, 9.1, 10.1, 10.2 |
| 3. マルチテナントデータ分離 | 2.1, 3.1, 3.2, 4.2, 8.2, 8.3, 9.2, 10.1, 10.2 |
| 4. MAIMLファイルとの連携 | 1.1, 1.2, 4.3, 4.4, 8.1, 9.4, 10.1, 10.2 |
| 5. データ取得とレスポンス生成 | 3.1, 3.2, 4.1, 4.5, 4.7, 8.3, 8.4, 9.3, 10.1, 10.2 |
| 6. エラーハンドリング | 5.1, 5.2, 5.3, 8.5, 10.1, 10.2 |
| 7. ログ記録と監査 | 7.1, 10.1, 10.2 |
| 8. パフォーマンスと最適化 | 4.5, 8.4, 9.3, 10.2 |
| 9. データ整合性 | 4.6, 4.7, 8.4, 10.2 |
| 10. API仕様準拠 | 5.1, 5.2, 6.1, 8.5, 9.1, 10.1, 10.2 |

**All Requirements Covered**: ✅ すべての要件がタスクにマッピングされています

---

## Task Summary

- **合計メジャータスク数**: 10
- **合計サブタスク数**: 29
- **並列実行可能タスク**: 7（マークされた(P)タスク）
- **推定総工数**: 53-81時間（各サブタスク1-3時間）
- **工数削減**: 既存実装活用により約5-6時間削減（Phase 1とPhase 3の一部）

## Notes

- 各タスクは1-3時間で完了可能な単位に分割されています
- 並列実行可能なタスクには(P)マークが付いています
- すべての要件が適切にタスクにマッピングされています
- テストは実装と並行して進めることを推奨します
- Phase 7の統合タスクは、すべての前段階のタスクが完了した後に実行してください

### 既存実装の活用

以下の既存実装を最大限活用することで、工数を削減しています：

- **`maimlService.parsePetriNetStructure()`**: MAIMLファイルの構造解析（複数method対応済み）
  - ファイル: `backend/src/services/maimlService.ts`
  - 機能: XMLパース、method/transition抽出、エラーハンドリング
  - 活用箇所: Phase 1（タスク1.1）、Phase 3（タスク4.3）

- **`storageService.downloadFile()`**: S3/SwiftからのMAIMLファイルダウンロード
  - ファイル: `backend/src/services/storageService.ts`
  - 機能: マルチテナント対応のファイルダウンロード
  - 活用箇所: Phase 3（タスク4.3）

これらの既存実装を使用することで、新規実装の必要性を最小限に抑え、コードの一貫性と保守性を向上させています。
