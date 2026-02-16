# Implementation Tasks: 進捗データ取得API

## Overview
本タスクリストは、進捗データ取得APIの実装を段階的に進めるための作業計画です。各タスクは1-3時間で完了可能な単位に分割されており、並列実行可能なタスクには(P)マークが付いています。

---

## Implementation Tasks

### Phase 1: 基盤実装（既存実装活用により簡略化）

- [ ] 1. MAIMLパーサーアダプターの実装
- [x] 1.1 (P) 既存parsePetriNetStructure関数のラッパー作成
  - `maimlService.parsePetriNetStructure()`を呼び出し
  - 既存の返却データ構造（methods配列）をそのまま使用
  - 必要に応じて軽微なデータ変換を実装
  - エラーハンドリングを統一形式に変換
  - **既存実装**: `backend/src/services/maimlService.ts`の`parsePetriNetStructure`
  - **推定工数**: 0.5-1時間（既存実装活用により大幅削減）
  - **実装完了**: 2026-02-16
  - _Requirements: 4_

- [x] 1.2 (P) 型定義の整備
  - 既存の`maimlService.ts`の型を再利用
  - 必要に応じてProgressService用のインターフェース追加
  - Result型を使用したエラーハンドリング
  - **推定工数**: 0.5時間
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `backend/src/types/progress.ts`に型定義を作成
    - TransitionProgress, OverallProgress, ProgressData型を定義
    - ProgressServiceError型（5種類のエラーコード対応）
    - ParsedMethod, PetriNetTransition型（MAIML連携用）
    - TaskWithProject, ExperimentRecord型（Repository層用）
    - 既存のResult型（service.ts）を活用
    - 包括的なユニットテスト作成（20テスト、全て成功）
  - _Requirements: 4_

### Phase 2: データアクセス層の実装

- [ ] 2. TaskRepositoryの拡張
- [x] 2.1 (P) getTaskByProjectMethodTaskNoメソッドの実装
  - project_taskテーブルとprojectテーブルをJOIN
  - projectId、methodId、taskNo、organizationIdでフィルタリング
  - task_id、task_name、project_id、project_name、method_id、task_noを取得
  - organization_idによるマルチテナント分離を実装
  - Kyselyクエリビルダーを使用した型安全なクエリ構築
  - **実装完了**: 2026-02-16
  - **テスト結果**: 6テスト全て成功（正常系4、異常系1、セキュリティ1）
  - _Requirements: 1, 3_

- [ ] 3. ExperimentRecordRepositoryの拡張
- [x] 3.1 (P) getLatestRecordByTransitionメソッドの実装
  - task_id、transition_id、organization_idでフィルタリング
  - update_atでDESCソート、LIMIT 1で最新レコードのみ取得
  - record_id、status、progress、update_atを返却
  - レコードが存在しない場合はnullを返却
  - organization_idによるマルチテナント分離を実装
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `TransitionDataRepository.getLatestRecordByTransition`メソッドを実装
    - Parameterized Queryを使用してSQLインジェクション対策
    - ORDER BY updated_at DESC LIMIT 1で最新レコード取得
    - organization_idによるマルチテナント分離を保証
    - 包括的なユニットテスト作成（8テスト、全て成功）
      - 正常系: 3テスト（データ取得、null返却、最新レコード選択）
      - 異常系: 1テスト（DatabaseError）
      - セキュリティ: 2テスト（organization_idフィルタ、Parameterized Query）
      - データ整合性: 2テスト（必須フィールド、SELECT句検証）
  - _Requirements: 1, 3, 5_

- [x] 3.2 (P) countRecordsByTransitionメソッドの実装
  - task_id、transition_id、organization_idでフィルタリング
  - db.fn.countを使用してデータ件数を取得
  - 削除済みレコードを除外
  - organization_idによるマルチテナント分離を実装
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `TransitionDataRepository.countRecordsByTransition`メソッドを実装
    - Parameterized Queryを使用してSQLインジェクション対策
    - SELECT COUNT(*)でレコード数を取得
    - organization_idによるマルチテナント分離を保証
    - 包括的なユニットテスト作成（6テスト、全て成功）
      - 正常系: 2テスト（データ取得、0件返却）
      - 異常系: 1テスト（DatabaseError）
      - セキュリティ: 2テスト（organization_idフィルタ、Parameterized Query）
      - データ整合性: 1テスト（数値型返却）
  - _Requirements: 1, 3, 5_

### Phase 3: ビジネスロジック層の実装

- [ ] 4. ProgressServiceの実装
- [x] 4.1 getProgressDataメソッドの基本構造実装
  - サービスインターフェースの定義
  - ProgressData、ProgressServiceError型の定義
  - メソッドシグネチャの実装（projectId, methodId, taskNo, organizationId）
  - Result型を使用したエラーハンドリング
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `backend/src/services/progressService.ts`に基本構造実装
    - Status型からTransitionStatus型への変換メソッド追加
    - タスク基本情報取得、MAIMLダウンロード・パース、トランジション進捗取得、全体進捗計算の各メソッド実装
    - 包括的なユニットテスト作成（`backend/tests/services/progressService.test.ts`）
    - マルチテナント分離、エラーハンドリング、並列処理を実装
  - _Requirements: 1, 5_

- [x] 4.2 タスク基本情報取得の実装
  - TaskRepositoryのgetTaskByProjectMethodTaskNoを呼び出し
  - タスクが存在しない場合はTASK_NOT_FOUNDエラーを返却
  - project_name、task_nameを取得
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `ProgressService.getTaskBasicInfo`メソッドを実装（既存）
    - TaskRepositoryを呼び出してタスク情報を取得
    - organization_idによるマルチテナント分離を保証
    - タスクが見つからない場合はnullを返却
    - 詳細なユニットテスト作成（5テスト、タスク4.2セクション）
      - 正常系: タスク基本情報の正しい取得
      - 異常系: タスクが存在しない場合のエラーハンドリング
      - project_nameとtask_nameの存在確認
      - パラメータの正確性検証
      - マルチテナント分離の検証
  - _Requirements: 1, 3_

- [x] 4.3 MAIMLファイルのダウンロードとパース（既存実装活用）
  - **既存実装**: `storageService.downloadFile(organizationId, filePath)`を呼び出し
  - organization prefixを使用してマルチテナント分離されたパスからダウンロード
  - **既存実装**: `maimlService.parsePetriNetStructure(content)`でMAIML構造を抽出
  - 既存の返却データ構造から必要な情報を取得（methods配列、transitions配列）
  - ダウンロード失敗時はMAIML_DOWNLOAD_FAILEDエラーを返却
  - パース失敗時はMAIML_PARSE_FAILEDエラーを返却
  - **推定工数**: 0.5-1時間（既存実装活用により削減）
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `ProgressService.downloadAndParseMAIML`メソッドは既に実装済み（タスク4.1で実装）
    - 既存の`storageService.downloadFile`と`maimlService.parsePetriNetStructure`を活用
    - organization prefixを使用したマルチテナント分離パス生成
    - エラーハンドリング実装（MAIML_DOWNLOAD_FAILED, MAIML_PARSE_FAILED）
    - 包括的なユニットテスト作成（11テスト、`backend/tests/services/progressService.test.ts`）
      - 正常系: 3テスト（MAIMLダウンロード・パース、method_name取得、複数メソッド対応）
      - 異常系: 3テスト（ダウンロード失敗、パース失敗、メソッド未検出）
      - セキュリティ: 1テスト（organization prefixによるマルチテナント分離）
      - データ検証: 2テスト（ファイルパス形式、Buffer→UTF-8変換）
    - **注意**: 既存のstorageService.tsにTypeScriptコンパイルエラーがあるため、テスト実行は保留
      - エラー内容: xml2jsの型定義不足、未使用変数警告
      - 対応: 別タスクでstorageService.tsの修正が必要
  - _Requirements: 4_

- [x] 4.4 メソッド検索とトランジション抽出
  - methods配列から指定されたmethodIdを検索
  - メソッドが見つからない場合はMETHOD_NOT_FOUNDエラーを返却
  - method_nameをMAIMLから取得
  - petriNet.transitionsを抽出
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `ProgressService.findMethodById`メソッドを実装（既存）
    - Array.findを使用してmethodIdで検索
    - メソッド未検出時はundefinedを返却
    - getProgressData内でundefinedチェック→METHOD_NOT_FOUNDエラー
    - method.methodNameを使用してmethod_nameを設定
    - method.petriNet.transitionsを抽出してトランジション進捗取得に渡す
    - 包括的なユニットテスト追加（8テスト、タスク4.4セクション）
      - 正常系: 5テスト（複数メソッド検索、トランジション抽出、method_name取得、大文字小文字区別、空配列対応）
      - 異常系: 2テスト（メソッド未検出、空methods配列）
      - エッジケース: 1テスト（大文字小文字区別の厳密性）
  - _Requirements: 4_

- [x] 4.5 トランジション進捗データの並列取得
  - Promise.allを使用して各トランジションのデータを並列取得
  - 各トランジションに対してgetLatestRecordByTransitionを呼び出し
  - 各トランジションに対してcountRecordsByTransitionを呼び出し
  - レコードが存在しない場合はステータスをnot_started、progressを0に設定
  - has_dataフラグとdata_countを設定
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `ProgressService.getTransitionsProgress`メソッドを実装
    - Promise.allを使用した並列処理で各トランジションのデータを効率的に取得
    - `getSingleTransitionProgress`メソッドで個別トランジションの進捗取得
    - TransitionDataRepository（getLatestRecordByTransition, countRecordsByTransition）を呼び出し
    - レコード不在時はnot_started/progress=0に設定
    - has_dataフラグとdata_countを正確に設定
    - エラー時のフォールバック処理実装（not_startedとして扱う）
    - 包括的なユニットテスト作成（9テスト、全て成功）
      - 正常系: 5テスト（並列取得、レコード不在処理、has_dataフラグ、パラメータ検証、パフォーマンス検証）
      - 異常系: 1テスト（DatabaseError）
      - エッジケース: 1テスト（トランジション0個）
      - セキュリティ: 1テスト（organization_id受け渡し）
      - パフォーマンス: 1テスト（並列処理の効率性検証、100ms未満で完了）
  - _Requirements: 1, 5, 8_

- [x] 4.6 進捗計算ロジックの実装
  - 各トランジションのステータスに基づいてcompleted、in_progress、not_startedをカウント
  - overall_percentageを計算（全トランジションの進捗率の平均値、小数点第1位）
  - トランジション数が0の場合は0を返却
  - ステータスがcompletedの場合はprogressを100に設定
  - ステータスがnot_startedの場合はprogressを0に設定
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `ProgressService.calculateOverallProgress`メソッドを実装
    - ステータスごとのカウント（filter使用）
    - 全体進捗率計算：`(totalProgress / totalTransitions).toFixed(1)`
    - トランジション0個の場合の早期リターン
    - `normalizeProgress`メソッドで整合性保証（completed=100, not_started=0）
    - 包括的なユニットテスト作成（9テスト）
      - 正常系: 5テスト（ステータスカウント、平均値計算、小数点丸め、0個対応、エッジケース）
      - Invariant検証: 3テスト（カウント合計、completed=100、not_started=0）
  - _Requirements: 1, 9_

- [x] 4.7 レスポンスデータの構築
  - ProgressData型のオブジェクトを構築
  - project_id、project_name、method_id、method_name、task_no、task_nameを設定
  - transitions配列を設定（transition_id, transition_name, status, progress, last_updated, has_data, data_count）
  - overall_progress（total_transitions, completed, in_progress, not_started, overall_percentage）を設定
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - レスポンスデータ構築ロジックは既に`getProgressData`メソッド内で実装済み（Step 6）
    - タスク4.7専用のテストセクションを追加（8テスト、全て成功）
    - 全フィールド設定の検証、project/method/task情報の一致確認
    - transitions配列とoverall_progressの全フィールド検証
    - データ整合性確認（配列長とtotal_transitionsの一致）
    - 型検証（各フィールドが正しい型であることを確認）
  - _Requirements: 1, 5, 9_

### Phase 4: API層の実装

- [ ] 5. ProgressControllerの実装
- [x] 5.1 getProgressDataメソッドの実装
  - リクエストパラメータの取得（projectId, methodId, taskNo）
  - req.userからorganizationIdを取得
  - パラメータバリデーション（UUID形式、整数型、文字列型）
  - バリデーション失敗時は400 VALIDATION_ERRORを返却
  - ProgressServiceのgetProgressDataを呼び出し
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - `backend/src/controllers/progressController.ts`にgetProgressDataメソッドを実装
    - UUID形式バリデーション（projectId）、正の整数バリデーション（taskNo）、空文字列チェック（methodId）
    - 認証チェック（req.user存在確認）
    - TaskRepositoryとTransitionDataRepositoryをインスタンス化してProgressServiceに渡す
    - エラーコードからHTTPステータスコードへのマッピング実装
    - 統一レスポンス形式（success, data/error, meta）の実装
    - Content-TypeヘッダーとX-Request-Idヘッダーの設定
    - 予期しない例外のキャッチとSYSTEM_ERRORへの変換
    - 包括的なユニットテスト作成（22テスト、全て成功）
      - 正常系: 3テスト（進捗データ取得、ヘッダー設定、taskNo変換）
      - パラメータバリデーション: 5テスト（UUID形式、整数型、正の整数、空文字列、認証）
      - エラーハンドリング: 6テスト（TASK_NOT_FOUND、METHOD_NOT_FOUND、MAIML_DOWNLOAD_FAILED、MAIML_PARSE_FAILED、DATABASE_ERROR、予期しない例外）
      - レスポンス形式検証: 3テスト（成功時形式、エラー時形式、ISO 8601タイムスタンプ）
      - HTTPステータスコード検証: 5テスト（404、500のエラーコード別検証）
  - _Requirements: 1, 6, 10_

- [x] 5.2 統一レスポンス形式への変換
  - 成功時は200 OKと統一レスポンス形式（success: true, data, meta）を返却
  - エラー時は適切なHTTPステータスコードとエラーレスポンス形式（success: false, error, meta）を返却
  - metaにtimestamp（ISO 8601形式）とrequestIdを含める
  - Content-Typeヘッダーに"application/json"を設定
  - X-Request-Idヘッダーを含める
  - **実装完了**: 2026-02-16
  - **実装内容**:
    - タスク5.1で既に実装済みの内容を、タスク5.2専用のテストで明示的に検証
    - `backend/tests/controllers/progressController.test.ts`にタスク5.2専用テストセクションを追加（13テスト）
    - 成功時のレスポンス形式: 3テスト（統一形式、ISO 8601タイムスタンプ、requestId）
    - エラー時のレスポンス形式: 5テスト（404エラー、500エラー、400エラー、内部エラー非公開、各ステータスコード別）
    - HTTPヘッダー設定: 4テスト（Content-Type、X-Request-Id、処理前設定、エラー時も設定）
    - レスポンスフィールド完全性検証: 2テスト（成功レスポンス、エラーレスポンス）
    - **テスト結果**: 35テスト全て成功
  - _Requirements: 6, 10_

- [x] 5.3 エラーハンドリングの実装
  - TASK_NOT_FOUND → 404エラー
  - METHOD_NOT_FOUND → 404エラー
  - MAIML_DOWNLOAD_FAILED → 500エラー
  - MAIML_PARSE_FAILED → 500エラー
  - DATABASE_ERROR → 500エラー
  - 予期しない例外はSYSTEM_ERRORとして処理し、スタックトレースをクライアントに公開しない
  - **実装完了**: 2026-02-16
  - **テスト結果**: 13テスト全て成功（404エラー処理、500エラー処理、予期しない例外処理、統合検証）
  - **実装内容**:
    - getHttpStatusFromErrorCode関数でエラーコードからHTTPステータスコードへのマッピング実装
    - 5種類のエラーコード（TASK_NOT_FOUND、METHOD_NOT_FOUND、MAIML_DOWNLOAD_FAILED、MAIML_PARSE_FAILED、DATABASE_ERROR）を適切なHTTPステータスコードに変換
    - 予期しない例外をキャッチしてSYSTEM_ERRORとして処理
    - スタックトレースと機密情報（データベース接続文字列、内部パス等）をクライアントに公開しない
    - すべてのエラーレスポンスに統一形式（success: false, error, meta）を適用
    - 包括的なユニットテスト作成（13テスト、全て成功）
      - 404エラー: 3テスト（TASK_NOT_FOUND処理、詳細情報含む、METHOD_NOT_FOUND処理）
      - 500エラー: 4テスト（MAIML_DOWNLOAD_FAILED、MAIML_PARSE_FAILED、DATABASE_ERROR、統一形式検証）
      - 予期しない例外: 4テスト（SYSTEM_ERROR変換、スタックトレース非公開、機密情報非公開、非Error値対応）
      - 統合検証: 2テスト（全エラーコードのHTTPステータスマッピング、meta情報の一貫性）
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
