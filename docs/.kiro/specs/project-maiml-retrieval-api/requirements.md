# Requirements Document

## Introduction

本ドキュメントは、実験作業者画面でMAIMLファイルを取得するバックエンドAPI機能の要件を定義します。

### 目的

実験作業者が指示確認タブでプロジェクトの実験フロー図を表示するために、プロジェクトの最新MAIMLファイルをS3から取得する機能を提供します。

### 対象API

- **エンドポイント**: `GET /api/v1/projects/:projectId/maiml`
- **参照仕様**: `docs/design/api/api_project_management.md` - 15. MAIMLファイル取得（プロジェクト）API

### スコープ

- ✅ プロジェクトの最新MAIMLファイル取得
- ✅ マルチテナント分離の徹底
- ✅ 実験作業者の閲覧権限サポート
- ❌ フォーマットファイルの取得（対象外）
- ❌ アーカイブ版ファイルの取得（対象外）

---

## Requirements

### Requirement 1: プロジェクトMAIMLファイル取得

**Objective:** 実験作業者として、プロジェクトの最新MAIMLファイルを取得できるようにし、指示確認タブで実験フロー図を表示できるようにします。

#### Acceptance Criteria

1. When 実験作業者がプロジェクトIDを指定してMAIMLファイル取得APIを呼び出すとき、the API Service shall プロジェクトの最新MAIMLファイルをXML形式で返却する

2. When APIが呼び出されたとき、the API Service shall S3から `org_{organization_prefix}/projects/{project_name}/{project_name}.maiml` パスのファイルを取得する

3. When MAIMLファイルを取得するとき、the API Service shall ファイル内容、ファイルサイズ、ファイルパス、読み込み日時を含むレスポンスを返却する

4. The API Service shall レスポンスにプロジェクトID、プロジェクト名、ファイル名を含める

5. When ファイル取得に成功したとき、the API Service shall HTTPステータス200とsuccess: trueを返却する

---

### Requirement 2: 認証と認可

**Objective:** システム管理者として、適切な権限を持つユーザーのみがMAIMLファイルにアクセスできるようにし、セキュリティを確保します。

#### Acceptance Criteria

1. The API Service shall すべてのリクエストでJWT認証を必須とする

2. When リクエストが認証されていないとき、the API Service shall HTTPステータス401とエラーコード `AUTH_TOKEN_INVALID` を返却する

3. When ユーザーのロールが `experiment_worker`, `experiment_admin`, または `system_admin` のいずれかであるとき、the API Service shall APIアクセスを許可する

4. When ユーザーのロールが上記以外のとき、the API Service shall HTTPステータス403とエラーコード `PERMISSION_INSUFFICIENT` を返却する

5. The API Service shall 認証ミドルウェア経由でリクエストユーザー情報（organizationId, role, userId）を取得する

---

### Requirement 3: マルチテナント分離

**Objective:** システム管理者として、組織間のデータが厳密に分離され、他組織のプロジェクトにアクセスできないようにします。

#### Acceptance Criteria

1. When プロジェクトを検索するとき、the API Service shall リクエストユーザーの `organization_id` でフィルタリングする

2. When プロジェクトが他組織に属する、または存在しないとき、the API Service shall HTTPステータス404とエラーコード `NOT_FOUND` を返却する

3. When S3からファイルを取得するとき、the API Service shall 組織プレフィックス（`org_{organization_prefix}`）を含むパスを使用する

4. The API Service shall データベースクエリで必ず `organization_id` フィルタを含める

5. The API Service shall クロステナントアクセスを防止する（System Admin除く）

---

### Requirement 4: エラーハンドリング

**Objective:** 開発者として、エラー発生時に適切なステータスコードとメッセージを受け取り、問題を特定できるようにします。

#### Acceptance Criteria

1. When プロジェクトIDが不正な形式のとき、the API Service shall HTTPステータス400とエラーコード `VALIDATION_ERROR` を返却する

2. When プロジェクトが存在しないとき、the API Service shall HTTPステータス404とエラーコード `NOT_FOUND`、メッセージ「プロジェクトが見つかりません」を返却する

3. When S3にMAIMLファイルが存在しないとき、the API Service shall HTTPステータス404とエラーコード `FILE_NOT_FOUND`、メッセージ「MAIMLファイルが見つかりません」を返却する

4. When S3接続エラーまたはその他のシステムエラーが発生したとき、the API Service shall HTTPステータス500とエラーコード `INTERNAL_ERROR`、メッセージ「システムエラーが発生しました」を返却する

5. When エラーが発生したとき、the API Service shall エラー詳細をログに記録し、タイムスタンプとrequestIdを含める

---

### Requirement 5: レスポンス形式

**Objective:** フロントエンド開発者として、統一されたレスポンス形式で一貫したデータ処理を実装できるようにします。

#### Acceptance Criteria

1. When APIが成功したとき、the API Service shall 以下の形式でレスポンスを返却する:
   ```json
   {
     "success": true,
     "data": {
       "file_id": "string",
       "project_id": "UUID",
       "project_name": "string",
       "file_name": "string",
       "file_path": "string",
       "file_size": number,
       "content": "string (XML)",
       "content_type": "application/xml",
       "loaded_at": "ISO8601 timestamp"
     },
     "meta": {
       "timestamp": "ISO8601 timestamp",
       "requestId": "string"
     }
   }
   ```

2. When APIがエラーになったとき、the API Service shall 以下の形式でレスポンスを返却する:
   ```json
   {
     "success": false,
     "error": {
       "code": "string",
       "message": "string"
     },
     "meta": {
       "timestamp": "ISO8601 timestamp",
       "requestId": "string"
     }
   }
   ```

3. The API Service shall レスポンスのContent-Typeヘッダーに `application/json` を設定する

4. The API Service shall レスポンスに必ずtimestampとrequestIdを含める

5. When ファイル内容を返却するとき、the API Service shall UTF-8エンコーディングされたXML文字列として返却する

---

### Requirement 6: パフォーマンス

**Objective:** システム管理者として、APIレスポンスタイムを最適化し、ユーザー体験を向上させます。

#### Acceptance Criteria

1. When MAIMLファイルサイズが10MB以下のとき、the API Service shall 5秒以内にレスポンスを返却する

2. The API Service shall S3からのファイル取得に storageService モジュールを使用する

3. When 同時に複数のリクエストがあるとき、the API Service shall 各リクエストを独立して処理する

4. The API Service shall データベース接続プールを使用して接続を効率化する

5. When ファイル取得が完了したとき、the API Service shall 接続リソースを適切に解放する

---

### Requirement 7: ロギングと監査

**Objective:** システム管理者として、API使用状況とエラーを追跡し、セキュリティ監査とトラブルシューティングを実施できるようにします。

#### Acceptance Criteria

1. When MAIMLファイル取得が成功したとき、the API Service shall 以下の情報をログに記録する: projectId, projectName, userId, organizationId, fileSize

2. When エラーが発生したとき、the API Service shall エラー詳細、スタックトレース、リクエストコンテキストをログに記録する

3. The API Service shall ログレベル（info, warn, error）を適切に使用する

4. The API Service shall センシティブ情報（認証トークン、パスワード）をログに記録しない

5. When ログを記録するとき、the API Service shall タイムスタンプとrequestIdを含める

---

### Requirement 8: 入力バリデーション

**Objective:** 開発者として、不正なリクエストを早期に検出し、適切なエラーメッセージを返すことでAPIの堅牢性を確保します。

#### Acceptance Criteria

1. When projectIdがUUID形式でないとき、the API Service shall HTTPステータス400とエラーコード `VALIDATION_INVALID_FORMAT` を返却する

2. When projectIdが空文字列のとき、the API Service shall HTTPステータス400とエラーコード `VALIDATION_REQUIRED_FIELD` を返却する

3. The API Service shall リクエストパラメータをサニタイズし、SQLインジェクション攻撃を防止する

4. When バリデーションエラーが複数ある場合、the API Service shall すべてのエラーをdetails配列に含めて返却する

5. The API Service shall Parameterized Queriesを使用してデータベースクエリを実行する

---

## 非機能要件

### セキュリティ

1. すべてのDBクエリに `organization_id` フィルタを含める（マルチテナント分離）
2. すべてのS3操作に `org_{organization_prefix}` プレフィックスを使用する
3. JWT認証をすべてのリクエストで必須とする
4. SQLインジェクション対策: Parameterized Queries必須
5. エラーメッセージに機密情報を含めない

### パフォーマンス

1. レスポンスタイム: 10MB以下のファイルで5秒以内
2. 同時接続数: 100リクエスト/秒をサポート
3. データベース接続プールを使用
4. S3接続のタイムアウト: 10秒

### 可用性

1. API稼働率: 99.9%
2. エラー時の適切なフォールバック処理
3. ヘルスチェックエンドポイントの提供

### 保守性

1. コードコメントによる実装意図の明示
2. エラーログによる問題追跡の容易化
3. ユニットテストカバレッジ: 80%以上
4. 統合テストによるエンドツーエンド検証

---

## 制約事項

### 技術的制約

1. Node.js 18+ + Express.js + TypeScript を使用
2. PostgreSQL 18+ をデータベースとして使用
3. AWS S3 または OpenStack Swift をストレージとして使用
4. Kysely をクエリビルダーとして使用

### ビジネス的制約

1. プロジェクトの最新版のみ取得可能（アーカイブ版は非対応）
2. プロジェクトのMAIMLファイルのみ対応（フォーマットは非対応）
3. 実験作業者は読み取り専用（編集機能なし）
4. 所属組織内のプロジェクトのみアクセス可能

---

## 依存関係

### データベーステーブル

- `project`: プロジェクト情報
- `organization`: 組織情報
- `organization_user`: ユーザー・組織関連
- `user_sessions`: セッション情報

### 外部サービス

- **S3/Swift**: MAIMLファイルストレージ
- **認証サービス**: JWT検証、セッション管理

### 内部モジュール

- `storageService`: S3/Swiftファイル操作
- `authMiddleware`: 認証ミドルウェア
- `permissionCheck`: 権限チェックミドルウェア
- `logger`: ロギングモジュール

---

## テスト要件

### ユニットテスト

1. プロジェクト存在チェック機能
2. organization_idフィルタリング機能
3. S3パス構築機能
4. バリデーション機能
5. エラーハンドリング機能

### 統合テスト

1. 正常系: 有効なprojectIdでMAIMLファイル取得
2. 異常系: 存在しないprojectIdでアクセス
3. 異常系: 他組織のprojectIdでアクセス
4. 異常系: 認証なしでアクセス
5. 異常系: 権限不足ユーザーでアクセス
6. 異常系: S3にファイルが存在しない場合

### パフォーマンステスト

1. 100リクエスト/秒の負荷テスト
2. 大容量ファイル（10MB）の取得テスト
3. 同時接続数の上限テスト

---

## 実装ファイル

### 予定されるファイル構成

```
backend/src/
├── routes/
│   └── projectRoutes.ts            # ルート定義（追加）
├── controllers/
│   └── projectController.ts        # getProjectMaiml() 追加
├── services/
│   └── projectService.ts           # getProjectMaiml() 追加
├── middleware/
│   ├── auth.ts                     # 既存（認証）
│   └── permissionCheck.ts          # 既存（権限チェック）
└── utils/
    ├── storageService.ts           # 既存（S3操作）
    └── logger.ts                   # 既存（ロギング）

backend/tests/
├── controllers/
│   └── projectController.test.ts   # getProjectMaiml() テスト追加
├── services/
│   └── projectService.test.ts      # getProjectMaiml() テスト追加
└── integration/
    └── projectMaiml.test.ts        # 統合テスト（新規）
```

---

## 参考資料

- [API設計ポリシー](.clinerules/development/api.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [セキュリティ規約](.clinerules/development/security.md)
- [S3構造定義](.clinerules/references/s3_structure.md)
- [データベース構造](.clinerules/references/db_structure.md)
- [プロジェクト管理API仕様](docs/design/api/api_project_management.md)
