# Implementation Tasks: プロジェクト作成API

## Overview

本実装計画は、プロジェクト作成API（POST /api/v1/projects）のバックエンド実装タスクを定義します。既存のController-Service-Routerアーキテクチャを拡張し、データベース登録とS3フォルダ作成を統合的に処理します。

**実装対象**:
- Router層: POST /api/v1/projectsエンドポイント追加
- Controller層: createメソッド、バリデーション、レスポンス生成
- Service層: トランザクション管理、DB操作、S3統合
- テスト: Unit、Integration、E2Eテスト

**推定工数**: 約12-18時間（6-9タスク × 1.5-3時間）

---

## Implementation Tasks

### 1. Router層の実装
- [x] 1.1 POST /api/v1/projectsエンドポイントを追加する
  - projectRoutes.tsに新規ルート定義を追加
  - authMiddleware適用によるJWT認証の有効化
  - express-validatorによる基本バリデーションルール設定（projectName必須、1-255文字、description任意最大1000文字）
  - projectController.createへのルーティング設定
  - _Requirements: 3.1, 3.2_

---

### 2. Controller層の実装
- [x] 2.1 プロジェクト作成リクエストを処理する
  - projectController.tsにcreateメソッドを追加
  - リクエストボディからprojectName、descriptionを抽出
  - req.userからorganizationId、userId、departmentIdを取得
  - requestId生成（UUID v4）
  - _Requirements: 1.1, 9.5_

- [x] 2.2 入力値の詳細バリデーションを実装する
  - projectName必須チェック（1-255文字）
  - projectNameの制御文字チェック
  - descriptionの文字数制限チェック（最大1000文字）
  - バリデーションエラー時の400レスポンス生成（VALIDATION_REQUIRED_FIELD、VALIDATION_STRING_LENGTH、VALIDATION_INVALID_FORMAT、VALIDATION_STRING_TOO_LONG）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_

- [x] 2.3 Service層を呼び出してレスポンスを生成する
  - ProjectService.createメソッド呼び出し
  - ServiceResult<Project>からHTTPレスポンスへの変換
  - 成功時: 201 Createdとプロジェクト情報の返却
  - エラー時: 適切なHTTPステータスコード（400、401、403、409、500）とエラー情報の返却
  - スネークケース→キャメルケース変換
  - _Requirements: 1.5, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.3_

- [x] 2.4 エラーハンドリングとロギングを実装する
  - try-catchによる予期しないエラーのキャッチ
  - エラーログ記録（requestId、userId、organizationId、エラー詳細）
  - 500 Internal Server Error（SYSTEM_ERROR）レスポンス生成
  - _Requirements: 7.5, 7.7_

---

### 3. Service層の実装
- [x] 3.1 プロジェクト作成のビジネスロジックを実装する
  - ProjectService.tsにcreateメソッドを追加
  - メソッドシグネチャ: create(organizationId, userId, departmentId, data)
  - ServiceResult<Project>型でのレスポンス返却
  - _Requirements: 1.1_

- [x] 3.2 データベーストランザクション管理を実装する
  - PostgreSQL接続プール（getPool()）の取得
  - BEGIN TRANSACTIONの開始
  - 処理成功時のCOMMIT
  - 処理失敗時のROLLBACK
  - トランザクション保持時間の最小化（目標5秒以内）
  - _Requirements: 5.1, 5.2, 5.4, 10.4_

- [x] 3.3 プロジェクト名重複チェックを実装する
  - トランザクション内でのSELECT COUNT(*)クエリ実行
  - 同一organization_id、project_name での重複確認
  - Parameterized Query使用
  - 重複検出時の409エラー（BUSINESS_DUPLICATE_PROJECT_NAME）返却
  - _Requirements: 2.5, 4.4, 5.5_

- [x] 3.4 新規プロジェクトレコードをデータベースに登録する
  - UUID v4形式のproject_id生成
  - デフォルト値設定（project_status=0、checkout_status=0、project_maiml_flg=false）
  - create_atの現在日時設定（ISO 8601形式）
  - INSERT INTO projectクエリ実行（Parameterized Query）
  - organization_id、project_name、description、owner_user_id、department_idの設定
  - _Requirements: 1.2, 4.2, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.5_

- [x] 3.5 organization_prefixを取得してS3パスを生成する
  - organizationテーブルからorganization_name取得（Parameterized Query）
  - スペースをアンダースコアに変換してorganization_prefix生成
  - S3パス `projects/{project_name}/.keep` を構築
  - _Requirements: 8.3_

- [x] 3.6 S3にプロジェクトフォルダを作成する
  - storageService.uploadFile呼び出し
  - マーカーファイル（.keep）の配置
  - `org_{organization_prefix}/projects/{project_name}/` パスへのアップロード
  - S3エラー時のエラーハンドリング（SYSTEM_S3_ERROR）
  - S3失敗時のデータベーストランザクションロールバック
  - _Requirements: 1.3, 1.4, 5.3, 8.1, 8.2, 8.4, 8.5_

- [x] 3.7 プロジェクトステータス名を取得してレスポンスデータを構築する
  - code_masterテーブルからproject_status_name、checkout_status_name取得
  - スネークケース→キャメルケース変換
  - 全フィールドを含むProjectオブジェクト生成
  - ServiceResult<Project>でのラップ
  - _Requirements: 9.4, 9.6_

---

### 4. 権限チェックとマルチテナント分離
- [x] 4.1 認証・認可チェックを実装する
  - authMiddlewareによるJWT検証（Router層で既に適用済み）
  - Controller層でreq.userの存在確認
  - Workerロール（experiment_worker）の403エラー処理
  - Manager以上（experiment_admin、data_admin、system_admin）の許可
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 マルチテナント分離を保証する
  - Controller層でorganization_idの検証
  - すべてのDBクエリにorganization_idフィルタ適用
  - S3パスに `org_{organization_prefix}` プレフィックス強制
  - クロステナントアクセスの防止
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

---

### 5. Unit Testing
- [ ] 5.1 ProjectController.createのユニットテストを作成する
  - バリデーション成功ケース
  - バリデーションエラーケース（projectName未入力、255文字超、制御文字含む）
  - Service層成功時の201レスポンス生成テスト
  - Service層エラー時の適切なHTTPステータスコード変換テスト
  - エラーログ記録の検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 9.1_

- [ ] 5.2 ProjectService.createのユニットテストを作成する
  - プロジェクト作成成功フロー（DB INSERT + S3フォルダ作成）
  - プロジェクト名重複チェック（409エラー）
  - トランザクションコミット成功
  - S3エラー時のロールバック
  - organization_name取得とプレフィックス生成
  - デフォルト値設定（status=0、checkout_status=0、project_maiml_flg=false）
  - スネークケース→キャメルケース変換
  - _Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 9.3_

---

### 6. Integration Testing
- [ ] 6.1 POST /api/v1/projectsエンドポイントの統合テストを作成する
  - 認証成功 → プロジェクト作成成功（201）
  - 認証失敗 → 401エラー
  - Worker権限 → 403エラー
  - プロジェクト名重複 → 409エラー
  - バリデーションエラー → 400エラー
  - データベース登録とS3フォルダ作成の確認
  - S3エラー時のデータベースロールバック確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 7.2, 7.3, 7.4_

---

### 7. E2E Testing
- [ ]* 7.1 プロジェクト作成フローのE2Eテストを作成する（オプション）
  - ログイン → プロジェクト作成画面 → フォーム入力 → 作成成功 → プロジェクト一覧表示
  - プロジェクト作成後、S3にフォルダが存在することを確認
  - プロジェクト一覧APIで新規プロジェクトが取得できることを確認
  - MVPリリース後に実装可能（受入基準1.5をカバー）
  - _Requirements: 1.5_

---

### 8. Performance Testing
- [ ]* 8.1 パフォーマンステストを実施する（オプション）
  - 目標レスポンスタイム300ms以内の検証（並行1リクエスト）
  - 最大許容レスポンスタイム1000ms以内の検証（並行10リクエスト）
  - トランザクション保持時間5秒以内の検証
  - 並行リクエスト時のプロジェクト名重複防止の検証
  - データベース接続プール枯渇の検証（最大20接続）
  - 100並行リクエスト時のエラー率 < 1% の検証
  - MVPリリース後に実施可能（受入基準10.1-10.5をカバー）
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

---

## Task Summary

**Total Tasks**: 8メジャータスク、21サブタスク（うち2タスクはオプション）

**Requirements Coverage**:
- Requirement 1: 1.1, 1.2, 1.3, 1.4, 1.5 → タスク1.1, 2.1, 2.3, 3.1, 3.4, 3.6, 5.2, 6.1
- Requirement 2: 2.1, 2.2, 2.3, 2.4, 2.5 → タスク2.2, 3.3, 5.1, 6.1
- Requirement 3: 3.1, 3.2, 3.3, 3.4, 3.5 → タスク1.1, 4.1, 6.1
- Requirement 4: 4.1, 4.2, 4.3, 4.4, 4.5 → タスク3.3, 3.4, 3.6, 4.2
- Requirement 5: 5.1, 5.2, 5.3, 5.4, 5.5 → タスク3.2, 3.3, 3.4, 3.6, 5.2, 6.1
- Requirement 6: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 → タスク3.4, 5.2
- Requirement 7: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7 → タスク2.2, 2.3, 2.4, 6.1
- Requirement 8: 8.1, 8.2, 8.3, 8.4, 8.5 → タスク3.5, 3.6, 5.2
- Requirement 9: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6 → タスク2.1, 2.3, 3.7, 5.1, 5.2
- Requirement 10: 10.1, 10.2, 10.3, 10.4, 10.5 → タスク3.2, 3.4, 8.1

**All 10 requirements fully covered** ✅

**Estimated Time**: 約12-18時間
- Router層: 2-3時間
- Controller層: 4-6時間
- Service層: 6-9時間
- Testing: オプション（MVP後）

**Implementation Order**: 順次実行（1 → 2 → 3 → 4 → 5 → 6 → 7* → 8*）
- タスク1-4は実装タスク（依存関係あり）
- タスク5-6は必須テスト（実装完了後）
- タスク7-8はオプションテスト（MVP後に実施可能）

**Notes**:
- `*` マークのタスク（7.1、8.1）は、MVP後に実施可能なオプションタスクです
- すべてのタスクは既存ファイル（projectRoutes.ts、projectController.ts、projectService.ts）への追加です
- 新規ファイル作成は不要です
