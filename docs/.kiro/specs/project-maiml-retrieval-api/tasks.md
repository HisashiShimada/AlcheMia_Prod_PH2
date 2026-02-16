# Implementation Tasks

## 実装タスク一覧

### 1. ルート定義とバリデーション実装

- [x] 1.1 (P) projectRoutesにMAIML取得エンドポイントを追加
  - `GET /api/v1/projects/:projectId/maiml`エンドポイントを定義
  - express-validatorでprojectIdのUUID形式バリデーションを実装
  - authMiddleware、tenantIsolation、handleValidationErrorsのミドルウェアチェーンを適用
  - バリデーションエラー時は400エラーを返却（VALIDATION_INVALID_FORMAT）
  - _Requirements: 8_

### 2. Controller層実装

- [x] 2.1 (P) projectControllerにgetProjectMaimlメソッドを実装
  - リクエスト認証状態の検証（req.user存在確認）
  - projectIdのUUID形式検証（正規表現による二重チェック）
  - organization_prefixをDBから取得（organizationsテーブルクエリ）
  - projectService.getProjectMaimlを呼び出してビジネスロジック実行
  - ServiceResultからHTTPステータスコードへのマッピング（200, 404, 500）
  - 統一レスポンス形式でJSONを返却（success, data, meta）
  - requestIdとtimestampをmetaに含める
  - エラー発生時はerrorハンドリングミドルウェアに委譲
  - _Requirements: 1, 2, 4, 5, 7_

### 3. Service層実装

- [x] 3.1 (P) projectServiceにgetProjectMaimlメソッドを実装
  - プロジェクト存在確認クエリを実行（Parameterized Query使用）
  - organization_idフィルタを必須適用してマルチテナント分離を保証
  - プロジェクト不在時はRESOURCE_NOT_FOUNDエラーを返却
  - project_nameをDBから取得
  - S3パスを構築（`projects/${projectName}/${projectName}.maiml`）
  - storageService.downloadFileでS3からファイルを取得
  - BufferをUTF-8文字列に変換してXML内容を取得
  - ファイルサイズ、ファイルパス、読み込み日時を含むMAIMLFileDataを構築
  - S3ファイル不在時はFILE_NOT_FOUNDエラーを返却
  - DB/S3エラー時はSYSTEM_DATABASE_ERROR/SYSTEM_S3_ERRORを返却
  - 成功時とエラー時にロギング（winston使用、機密情報除外）
  - ServiceResult型でラップして返却
  - _Requirements: 1, 3, 4, 6, 7_

### 4. 型定義とインターフェース

- [x] 4.1 (P) backend/src/types/maiml.tsを作成
  - MAIMLFileData型を定義（file_id, project_id, project_name, file_name, file_path, file_size, content, content_type, loaded_at）
  - ServiceResult型を定義（success, data, error）
  - TypeScriptインターフェースとしてエクスポート
  - JSDOCコメントで各フィールドの説明を追加
  - _Requirements: 5_

### 5. ユニットテスト実装

- [x] 5.1 (P) projectController.test.tsにgetProjectMaimlのテストを追加
  - 認証なしでアクセス時に401エラーを返却することを検証
  - 無効なUUID形式のprojectIdで400エラーを返却することを検証
  - organization_prefix取得失敗時に500エラーを返却することを検証
  - Service層エラー時に適切なHTTPステータスコードを返却することを検証
  - Service層成功時に200とMAIMLFileDataを返却することを検証
  - レスポンスにrequestIdとtimestampが含まれることを検証
  - モックを使用してService層を分離
  - _Requirements: 1, 2, 4, 5_

- [x] 5.2 (P) projectService.test.tsにgetProjectMaimlのテストを追加
  - プロジェクト不在時にRESOURCE_NOT_FOUNDエラーを返却することを検証
  - 他組織のプロジェクトにアクセス時にRESOURCE_NOT_FOUNDエラーを返却することを検証
  - S3ファイル不在時にFILE_NOT_FOUNDエラーを返却することを検証
  - DB接続エラー時にINTERNAL_ERRORを返却することを検証
  - S3接続エラー時にINTERNAL_ERRORを返却することを検証
  - 正常系でMAIMLFileDataを含むServiceResultを返却することを検証
  - BufferからUTF-8文字列への変換が正しく動作することを検証
  - organization_idフィルタが全クエリに適用されていることを検証
  - モックを使用してDB/Storage層を分離
  - _Requirements: 1, 3, 4, 6, 7_

### 6. 統合テスト実装

- [x] 6.1 統合テストファイルbackend/tests/integration/projectMaiml.test.tsを作成
  - テスト用DBとテスト用S3環境を準備
  - テストデータ（organization, project, MAIMLファイル）をセットアップ
  - 正常系: 有効なprojectIdでMAIMLファイルを取得し200とXML内容を返却することを検証
  - 異常系: 存在しないprojectIdで404 NOT_FOUNDを返却することを検証
  - 異常系: 他組織のprojectIdで404 NOT_FOUNDを返却することを検証
  - 異常系: 認証なしで401 AUTH_TOKEN_INVALIDを返却することを検証
  - 異常系: 権限不足ユーザー（experiment_worker以外）で403 PERMISSION_INSUFFICIENTを返却することを検証
  - 異常系: S3にファイルが存在しない場合に404 FILE_NOT_FOUNDを返却することを検証
  - 異常系: 無効なUUID形式で400 VALIDATION_INVALID_FORMATを返却することを検証
  - レスポンス形式が統一形式に準拠していることを検証
  - 各テスト後にテストデータをクリーンアップ
  - _Requirements: 1, 2, 3, 4, 5, 8_

### 7. パフォーマンステスト実装

- [ ] 7.1* backend/tests/performance/projectMaimlPerformance.test.tsを作成
  - 10MB以下のMAIMLファイルを5秒以内に取得できることを検証
  - 100リクエスト/秒の負荷に耐えられることを検証（並列リクエストテスト）
  - 大容量ファイル（10MB）の取得レスポンスタイムを測定
  - タイムアウト設定（10秒）が機能することを検証
  - データベース接続プールが適切に動作することを検証
  - メモリリーク発生がないことを確認
  - _Requirements: 6_

## カバレッジ要件

- [ ] すべてのRequirements（1〜8）がタスクでカバーされていることを確認
- [ ] ユニットテストカバレッジ80%以上を達成
- [ ] 統合テストで全エンドツーエンドフローを検証
- [ ] セキュリティチェックリスト項目を満たしていることを確認

## 実装完了基準

- [ ] すべてのユニットテストが成功
- [ ] すべての統合テストが成功
- [ ] ESLintエラーがゼロ
- [ ] TypeScript型エラーがゼロ
- [ ] APIドキュメント（JSDoc）が完備
- [ ] エラーハンドリングが適切に実装されている
- [ ] ロギングが適切に実装されている
- [ ] マルチテナント分離が保証されている
