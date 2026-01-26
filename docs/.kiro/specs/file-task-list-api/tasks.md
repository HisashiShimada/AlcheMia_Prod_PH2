# 実装タスク: ファイル一覧取得API・タスク一覧取得API

## タスク概要

本ドキュメントは、プロジェクト管理機能における以下2つのAPIの実装タスクを定義します：

- **ファイル一覧取得API**: `GET /api/v1/projects/:projectId/files`
- **タスク一覧取得API**: `GET /api/v1/projects/:projectId/tasks`

実装は既存のレイヤードアーキテクチャパターンに従い、型定義の共通化、バックエンドAPI実装、フロントエンド統合の順で進めます。

---

## 実装タスク

### 1. 型定義の準備と拡張

- [x] 1.1 (P) バックエンド型定義を拡張する
  - `backend/src/types/file.ts`を新規作成し、`ProjectFile`型と`FileListResponse`型を定義
  - `backend/src/types/project.ts`に`TaskStatistics`型と`TaskListResponse`型を追加
  - 既存の`Task`型がそのまま使用できることを確認
  - 型定義にJSDocコメントを追加
  - TypeScript コンパイルエラーなし
  - _Requirements: 3, 4, 7, 8, 9_

- [x] 1.2 (P) フロントエンド型定義を拡張する
  - `frontend/src/types/file.ts`の`ProjectFile`型にオプショナルフィールドを追加（`isArchive`, `version`, `signedUrl`, `createdAt`）
  - `frontend/src/types/file.ts`に`FileListResponse`型を追加
  - `frontend/src/types/project.ts`に`TaskStatistics`型と`TaskListResponse`型を追加
  - 既存の`Task`型がそのまま使用できることを確認
  - 型定義の一貫性をバックエンドと保証
  - TypeScript コンパイルエラーなし
  - _Requirements: 3, 4, 7, 8, 9_

### 2. ファイル一覧取得APIの実装

- [x] 2.1 バックエンドサービス層を実装する
  - `ProjectService.getProjectFiles`メソッドを追加
  - プロジェクト存在確認クエリを実装（`WHERE organization_id = $1 AND project_id = $2`）
  - `organization.organization_name`から`organization_prefix`を生成（スペース→アンダースコア変換）
  - `storageService.listFiles`を使用してS3から現在のファイルリストを取得
  - `include_archive=true`の場合、`archive/`サブフォルダのファイルも取得
  - 各ファイルに対して`storageService.getSignedUrl`で署名付きURLを生成（TTL: 3600秒）
  - アーカイブファイル名から`_v{number}`パターンでバージョン番号を抽出
  - S3エラー時は空配列を返すグレースフル処理を実装
  - キャメルケース変換を適用
  - `ServiceResult<FileListResponse>`型で結果を返却
  - _Requirements: 2, 3, 11_

- [x] 2.2 バックエンドコントローラー層を実装する
  - `ProjectController.getProjectFiles`メソッドを追加
  - `projectId`のUUID形式バリデーションを実装
  - クエリパラメータ`include_archive`の処理（デフォルト: false）
  - `req.user.organizationId`を使用してサービス層を呼び出し
  - 統一されたレスポンス形式（`{success, data, meta}`）を生成
  - エラーハンドリングと適切なHTTPステータスコード設定
  - `requestId`の生成とメタ情報の付与
  - _Requirements: 1, 2, 4, 10_

- [x] 2.3 ルート定義を追加する
  - `backend/src/routes/projectRoutes.ts`に新規ルートを追加
  - エンドポイント: `GET /projects/:projectId/files`
  - ミドルウェアチェーン適用: `auth` → `permissionCheck(['experiment_admin', 'system_admin'])` → `projectController.getProjectFiles`
  - ルート登録を確認
  - _Requirements: 1, 12_

### 3. タスク一覧取得APIの実装

- [x] 3.1 バックエンドサービス層を実装する
  - `ProjectService.getProjectTasks`メソッドを追加
  - プロジェクト存在確認クエリを実装（`WHERE organization_id = $1 AND project_id = $2`）
  - タスク一覧取得クエリを実装（`project_task_detail`テーブルから）
  - `LEFT JOIN organization_user`でワーカー名を取得
  - `statusパラメータ`に応じた動的WHERE条件を追加（all, pending, in_progress, completed, failed）
  - 統計情報の集計クエリを実装（`GROUP BY task_status`, `COUNT(*)`）
  - Parameterized Queriesを使用してSQLインジェクション対策
  - DB の`task_status`（数値）を`TASK_STATUS_MAP`で文字列に変換
  - キャメルケース変換を適用
  - `ServiceResult<TaskListResponse>`型で結果を返却
  - _Requirements: 6, 7, 8, 11_

- [x] 3.2 バックエンドコントローラー層を実装する
  - `ProjectController.getProjectTasks`メソッドを追加
  - `projectId`のUUID形式バリデーションを実装
  - `status`パラメータの許可値検証（all, pending, in_progress, completed, failed）
  - `req.user.organizationId`を使用してサービス層を呼び出し
  - 統一されたレスポンス形式（`{success, data: {tasks, statistics}, meta}`）を生成
  - エラーハンドリングと適切なHTTPステータスコード設定
  - `requestId`の生成とメタ情報の付与
  - _Requirements: 5, 6, 9, 10_

- [x] 3.3 ルート定義を追加する
  - `backend/src/routes/projectRoutes.ts`に新規ルートを追加
  - エンドポイント: `GET /projects/:projectId/tasks`
  - ミドルウェアチェーン適用: `auth` → `permissionCheck(['experiment_admin', 'system_admin'])` → `projectController.getProjectTasks`
  - ルート登録を確認
  - _Requirements: 5, 12_

### 4. フロントエンド統合

- [x] 4.1 (P) APIサービス関数を追加する
  - `frontend/src/api/projectApiService.ts`に`getProjectFiles`関数を追加
  - `frontend/src/api/projectApiService.ts`に`getProjectTasks`関数を追加
  - `frontend/src/api/projectApiService.ts`に`getProjectData`関数を追加（最適化された並列呼び出し）
  - Axiosインスタンスを使用してAPIリクエストを実行
  - 型定義された`ProjectFile[]`と`Task[]`、`TaskStatistics`を返却
  - エラーハンドリングを実装（try-catch、エラーメッセージの統一）
  - Cookie経由のJWT + Session Hybrid認証に対応
  - _Requirements: 4, 9_

- [x] 4.2 (P) 実験管理者画面でAPIを呼び出す ✅
  - [x] プロジェクト管理画面コンポーネントで`getProjectFiles`を呼び出し
  - [x] プロジェクト管理画面コンポーネントで`getProjectTasks`を呼び出し
  - [x] タブ切り替え時に最新データを取得する実装を追加
  - [x] ローディング状態の管理（`isLoadingTabData`）
  - [x] 取得したデータをStateに格納（`projectFilesData`, `projectTasksData`）
  - [x] エラー時のユーザーフレンドリーなメッセージ表示
  - [x] **API構造不一致の型エラー修正（5件）**: `response.success`と`response.data`は不要
  - [x] **型定義整理**: `Task`, `ProjectFile`, `ProjectEditParams`を型定義ファイルに統合
  - [x] **独自型定義削除**: `TaskResultsTable`と`FileListTable`から独自型を削除
  - **完了**: 全型エラー解決、メイン機能実装完了
  - _Requirements: 4, 9_

### 5. テストの実装

- [x] 5.1 ファイル一覧APIのユニットテストを作成する ✅
  - `backend/tests/services/projectService.test.ts`にテストケースを追加
  - `backend/tests/controllers/projectController.test.ts`にテストケースを追加
  - 正常系: ファイル一覧取得成功、アーカイブファイル含む/含まない
  - 異常系: プロジェクト不在、UUID不正、S3エラー
  - モック: `storageService.listFiles`, `storageService.getSignedUrl`, PostgreSQL接続
  - カバレッジ70%以上を確認
  - _Requirements: 1, 2, 3, 10_

- [x] 5.2 タスク一覧APIのユニットテストを作成する ✅
  - `backend/tests/services/projectService.test.ts`にテストケースを追加
  - `backend/tests/controllers/projectController.test.ts`にテストケースを追加
  - 正常系: タスク一覧取得成功、ステータスフィルタ（all, pending, in_progress, completed, failed）
  - 異常系: プロジェクト不在、UUID不正、status不正値、データベースエラー
  - モック: PostgreSQL接続
  - 統計情報の集計が正しく動作することを確認
  - カバレッジ70%以上を確認
  - _Requirements: 5, 6, 7, 8, 10_

- [x] 5.3 統合テストを作成する ✅
  - `backend/tests/integration/projectApi.test.ts`にテストケースを追加
  - 実際のPostgreSQLとS3（またはモック）を使用
  - 認証・認可フローの動作確認（auth, permissionCheck）
  - マルチテナント分離の確認（異なる組織のデータが混在しないこと）
  - クロステナントアクセス防止の確認
  - レスポンス形式の検証（success, data, meta構造）
  - _Requirements: 1, 2, 5, 6, 12_

- [ ]*5.4 パフォーマンステストを実施する（オプション）
  - Apache JMeterまたはk6を使用
  - シナリオ: 50同時ユーザー、100 req/s、10分間
  - レスポンスタイム測定（P50, P95, P99）
  - ファイル数100件、タスク数1,000件での性能確認
  - 目標: P95で200ms以内
  - 要件11のパフォーマンス目標を満たすことを確認
  - _Requirements: 11_

### 6. ドキュメント更新と最終確認

- [x] 6.1 API仕様書を更新する ✅
  - `docs/design/api/api_project_management.md`のセクション5, 6を最新化
  - 実装済みフラグを追加
  - リクエスト/レスポンス例を追加
  - エラーコード一覧を確認
  - _Requirements: 4, 9, 10_

- [x] 6.2 統合動作確認を実施する ✅
  - ステージング環境にデプロイ
  - 実験管理者画面からファイル一覧APIとタスク一覧APIを呼び出し
  - 現在のファイルとアーカイブファイルが正しく表示されることを確認
  - タスク一覧とステータス別統計が正しく表示されることを確認
  - 認証・認可が正しく動作することを確認
  - マルチテナント分離が正しく動作することを確認
  - エラーケースの動作確認（不正なprojectId、権限不足など）
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12_

---

## 要件カバレッジ

| 要件ID | タスク | 説明 |
|--------|--------|------|
| 1 | 2.2, 2.3, 5.1, 5.3, 6.2 | ファイル一覧API - 認証・認可 |
| 2 | 2.1, 2.2, 5.1, 5.3, 6.2 | ファイル一覧API - マルチテナント分離 |
| 3 | 1.1, 2.1, 5.1, 6.2 | ファイル一覧API - データ取得・フィルタリング |
| 4 | 1.1, 1.2, 2.2, 4.1, 4.2, 6.1, 6.2 | ファイル一覧API - レスポンス形式 |
| 5 | 3.2, 3.3, 5.2, 5.3, 6.2 | タスク一覧API - 認証・認可 |
| 6 | 3.1, 3.2, 5.2, 5.3, 6.2 | タスク一覧API - マルチテナント分離 |
| 7 | 1.1, 3.1, 5.2, 6.2 | タスク一覧API - データ取得・フィルタリング |
| 8 | 1.1, 3.1, 5.2, 6.2 | タスク一覧API - 統計情報 |
| 9 | 1.1, 1.2, 3.2, 4.1, 4.2, 6.1, 6.2 | タスク一覧API - レスポンス形式 |
| 10 | 2.2, 3.2, 5.1, 5.2, 6.1, 6.2 | 共通 - エラーハンドリング |
| 11 | 2.1, 3.1, 5.4, 6.2 | 共通 - パフォーマンス |
| 12 | 2.3, 3.3, 5.3, 6.2 | 共通 - セキュリティ |

**全12要件がカバーされています。**

---

## 並列実行可能なタスク

以下のタスクは依存関係がなく並列実行可能です（`(P)`マーク付き）：

- **1.1, 1.2**: 型定義の拡張（バックエンドとフロントエンドで独立）
- **4.1, 4.2**: フロントエンド統合（バックエンドAPI実装完了後）

その他のタスクは順序依存があるため順次実行が推奨されます。

---

## 実装順序の推奨

1. **型定義準備**（1.1, 1.2を並列実行）
2. **ファイル一覧API実装**（2.1 → 2.2 → 2.3の順）
3. **タスク一覧API実装**（3.1 → 3.2 → 3.3の順）
4. **フロントエンド統合**（4.1, 4.2を並列実行）
5. **テスト実装**（5.1 → 5.2 → 5.3 → 5.4の順）
6. **最終確認**（6.1 → 6.2の順）

---

## 見積もり

- **総タスク数**: 6メジャータスク、16サブタスク
- **推定工数**: 約24-32時間（1サブタスク平均1.5-2時間）
- **並列実行により短縮可能**: 約4-6時間（型定義とフロントエンド統合）

---

## 注意事項

1. **マルチテナント分離**: すべてのクエリに`organization_id`フィルタを含めることを厳守
2. **Parameterized Queries**: SQLインジェクション対策として必須
3. **署名付きURL**: S3への直接アクセスを防ぐため、TTL付き署名付きURLを使用
4. **型定義の同期**: フロントエンドとバックエンドの型定義を完全に一致させる
5. **エラーハンドリング**: 統一されたエラーレスポンス形式を使用
6. **パフォーマンス**: レスポンスタイム200ms以内を目標とする

---

## 関連ドキュメント

- [要件定義書](requirements.md)
- [設計書](design.md)
- [研究ログ](research.md)
- [API設計ポリシー](.clinerules/development/api.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [セキュリティ規約](.clinerules/development/security.md)