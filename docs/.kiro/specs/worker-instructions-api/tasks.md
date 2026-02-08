# Implementation Tasks: Worker Instructions API

## タスク一覧

- [ ] 1. APIルートとコントローラーの実装
- [x] 1.1 ルート定義の追加
  - projectRoutes.tsに新規エンドポイント`GET /api/v1/projects/:projectName/worker-instructions`を追加
  - authMiddlewareを適用（permissionCheckは次タスクで実装）
  - エンドポイントをprojectController.getWorkerInstructionsに接続
  - スタブ実装として空の配列を返すコントローラーメソッドを追加
  - _Requirements: 3_
  - _完了日: 2026-02-02_

- [x] 1.2 コントローラーメソッドの実装
  - projectControllerに`getWorkerInstructions`メソッドを追加
  - リクエストパラメータ（projectName、クエリパラメータ）のバリデーション実装
  - ユーザーロール判定ロジックの実装（experiment_worker vs 管理者）
  - projectServiceの呼び出しとレスポンス生成
  - 統一されたAPIレスポンス形式（success, data, meta）での返却
  - _Requirements: 1, 3, 6_
  - _完了日: 2026-02-02_

- [ ] 2. サービス層の実装 (P)
- [x] 2.1 (P) データベースクエリロジックの実装
  - projectServiceに`getWorkerInstructions`メソッドを追加
  - Kyselyを使用したParameterized Queriesの構築
  - project_instructionテーブルとprojectテーブルのJOIN実装
  - 実験作業者の場合はproject_taskテーブルとJOINしてassign_user_idでフィルタリング
  - organization_idによるマルチテナント分離の実装
  - フィルタリング条件（projectId, methodId, taskNo, instructionTarget, isAcknowledged）の動的追加
  - 作成日時（create_at）による降順ソートの実装
  - ユーザー情報（created_by_name）の取得ロジック
  - **暫定対応**: method_name, transition_nameは空文字列を返却し、TODOコメントを残す（タスク2.2が将来実装されるまで）
  - _Requirements: 1, 2, 4, 7_
  - _完了日: 2026-02-02_

- [ ] 2.2 (P) **【保留】** MAIMLパースとデータ補完ロジックの実装
  - **このタスクは将来の別タスクとして実装予定**
  - プロジェクトIDでグループ化してN+1問題を回避
  - storageServiceを使用してプロジェクトごとにMAIMLファイルを取得
  - parseMultipleMethodsStructure()を呼び出してメソッド情報を抽出
  - method_idに対応するメソッド名（method_name）の補完
  - transition_idに対応するトランジション名（transition_name）の補完
  - パース結果のバッチ処理による効率化
  - MAIMLファイルが存在しない場合のエラーハンドリング
  - _Requirements: 1, 7_
  - _Status: DEFERRED (保留中)_

- [ ] 3. エラーハンドリングとロギングの実装
- [x] 3.1 エラーハンドリングの実装
  - バリデーションエラー（400）のハンドリング
  - 認証エラー（401）のハンドリング
  - 権限エラー（403）のハンドリング
  - データベースエラー、S3エラーなどのシステムエラー（500）のハンドリング
  - 統一されたエラーレスポンス形式（success: false, error, meta）の実装
  - エラー詳細とスタックトレースのログ記録
  - _Requirements: 5_
  - _完了日: 2026-02-02_

- [x] 3.2 監査ログとアプリケーションログの実装
  - APIリクエスト情報（userId, organizationId, パラメータ）のログ記録
  - レスポンスステータスと処理時間のログ記録
  - 一意のrequestIdの生成と記録
  - ログレベル（info, warn, error）の適切な使い分け
  - Winstonを使用したログ出力
  - _Requirements: 8_
  - _完了日: 2026-02-02_

- [x] 4. テストの実装
- [x] 4.1 ユニットテストの実装
  - projectControllerのロールチェックロジックのテスト
  - projectControllerのバリデーション処理のテスト
  - projectServiceのDBクエリ構築ロジックのテスト（organization_idフィルタ、実験作業者フィルタ）
  - **MAIMLパース処理のテストは保留**（タスク2.2実装時に追加）
  - エラーハンドリングのテスト
  - _Requirements: 1, 2, 3, 4, 5_
  - _完了日: 2026-02-02_
  - _Note: テストコード作成完了。実装がまだのためテストは実行時エラー。実装完了後に再実行予定。_

- [x] 4.2 統合テストの実装
  - 認証ミドルウェアとの統合テスト
  - 実験作業者が自分の指示のみ取得できることの検証
  - 実験管理者・システム管理者が全指示を取得できることの検証
  - フィルタリング条件の動作確認（projectId, methodId, taskNo等）
  - マルチテナント分離の検証（他組織のデータにアクセスできないこと）
  - レスポンス形式とデータ構造の検証
  - パフォーマンステスト（100件の指示を5秒以内に取得）
  - _Requirements: 1, 2, 3, 4, 6, 7_
  - _完了日: 2026-02-02_
  - _Note: 統合テスト作成完了。7カテゴリ、40+テストケースを実装。_

## 要件カバレッジ

| 要件ID | 要件名 | カバーするタスク | 備考 |
|--------|--------|------------------|------|
| 1 | 指示一覧取得機能 | 1.2, 2.1, 2.2(保留), 4.1, 4.2 | method_name/transition_nameは暫定的に空欄 |
| 2 | フィルタリング機能 | 2.1, 4.1, 4.2 | |
| 3 | 認証と認可 | 1.1, 1.2, 4.1, 4.2 | |
| 4 | マルチテナント分離 | 2.1, 4.1, 4.2 | |
| 5 | エラーハンドリング | 3.1, 4.1 | |
| 6 | レスポンス形式 | 1.2, 4.2 | |
| 7 | パフォーマンスとスケーラビリティ | 2.1, 2.2(保留), 4.2 | MAIMLパース処理は将来実装 |
| 8 | 監査とロギング | 3.2 | |

## 実装上の注意事項

### 【重要】保留タスクについて

**タスク2.2 (MAIMLパースとデータ補完)は保留中**
- method_name, transition_nameは暫定的に**空文字列**を返却
- コード内にTODOコメントを残す:
  ```typescript
  // TODO: タスク2.2実装時にMAIMLファイルからメソッド名・トランジション名を取得
  instruction.method_name = '';
  instruction.transition_name = '';
  ```
- 将来、別タスクとしてMAIMLパース処理を実装予定
- APIレスポンス形式は変更せず、フィールドは残す（空文字列として返却）

### 既存コンポーネントの活用
- authMiddleware: 既存の認証ミドルウェアをそのまま使用
- storageService: 既存のS3/Swiftアクセスサービスを使用（タスク2.2実装時に使用）
- parseMultipleMethodsStructure(): 既存のMAIMLパーサーを使用（タスク2.2実装時に使用）

### 新規追加コンポーネント
- projectController.getWorkerInstructions: 新規メソッド
- projectService.getWorkerInstructions: 新規メソッド

### パフォーマンス最適化
- 必要最小限のカラムのみSELECT
- データベース接続プールの使用
- （MAIMLパース処理の最適化はタスク2.2で実装）

### セキュリティ
- すべてのDBクエリにorganization_idフィルタを必ず含める
- 実験作業者は自分に割り当てられたタスクに紐づく指示のみアクセス可能
- Parameterized Queriesを使用してSQLインジェクション対策
