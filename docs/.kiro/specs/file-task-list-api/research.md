# Research & Design Decisions

## Summary
- **Feature**: `file-task-list-api`
- **Discovery Scope**: Extension (既存のプロジェクト管理APIの拡張)
- **Key Findings**:
  - 既存の`projectController.ts`と`projectService.ts`のパターンを踏襲
  - S3操作は`storageService.ts`経由で署名付きURLを生成
  - データベースクエリはParameterized Queriesとorganization_idフィルタが必須
  - レスポンス形式は統一されたAPI形式（success, data, meta）を使用

## Research Log

### 既存APIパターンの調査
- **Context**: 新規API追加時の設計パターンを確認するため
- **Sources Consulted**: 
  - `backend/src/controllers/projectController.ts`
  - `backend/src/services/projectService.ts`
  - `.clinerules/development/api.md`
  - `.clinerules/development/backend.md`
- **Findings**:
  - Controller層: 認証チェック → バリデーション → Service層呼び出し → エラーハンドリング
  - Service層: データベースクエリ → 結果整形（キャメルケース変換） → ServiceResult型で返却
  - エラーコード体系: `VALIDATION_*`, `AUTH_*`, `PERMISSION_*`, `RESOURCE_*`, `BUSINESS_*`, `SYSTEM_*`
  - UUIDバリデーション: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  - ログ記録: `logError`関数でaction、organizationId、requestIdを含める
- **Implications**: 
  - 新規APIも同一パターンで実装することで一貫性を保つ
  - 既存のServiceResult型、エラーハンドリングパターンを再利用

### S3ファイル一覧取得の実装調査
- **Context**: ファイル一覧APIでS3からファイルリストを取得する方法を確認
- **Sources Consulted**:
  - `backend/src/services/storageService.ts`
  - `backend/src/services/projectService.ts` (getById メソッド)
  - `.clinerules/references/s3_structure.md`
- **Findings**:
  - `storageService.listFiles(organizationPrefix, path)`: 指定パス配下のファイルリストを取得
  - `storageService.getSignedUrl(organizationPrefix, filePath, ttl)`: 署名付きURL生成（デフォルトTTL: 3600秒）
  - S3パス形式: `org_{organization_prefix}/projects/{project_name}/` (現在のファイル)
  - アーカイブパス: `org_{organization_prefix}/projects/{project_name}/archive/` (過去バージョン)
  - バージョン番号抽出: `_v{number}.maiml`パターンから正規表現で取得
- **Implications**:
  - organizationPrefixは`organization.organization_name`から生成（スペース→アンダースコア変換）
  - ファイル操作はすべて`storageService`経由で実施（直接S3クライアントを使用しない）
  - S3エラーはグレースフルに処理（エラー時は空配列を返す）

### データベースクエリパターンの調査
- **Context**: タスク一覧取得のためのクエリ設計
- **Sources Consulted**:
  - `backend/src/services/projectService.ts` (list メソッド)
  - `docs/design/db/db_table_list.md`
  - `.clinerules/development/backend.md`
- **Findings**:
  - JOINパターン: LEFT JOINでユーザー名、部署名を取得
  - GROUP BY + COUNT: タスク集計をデータベース側で実施
  - ステータスフィルタ: WHEREで動的に条件追加（Parameterized Queries使用）
  - インデックス利用: organization_id, project_idにインデックスが存在
  - データ変換: DB取得後にキャメルケースに変換（snake_case → camelCase）
- **Implications**:
  - タスク集計はアプリケーション側ではなくデータベースで実施（パフォーマンス最適化）
  - Parameterized Queriesで必ずorganization_idフィルタを含める
  - 複数のステータスでフィルタする場合はIN句を使用

### 認証・認可フローの確認
- **Context**: tenantIsolationミドルウェア削除後の認証フロー確認
- **Sources Consulted**:
  - `docs/20260123_0944_API仕様書_認証部分見直し_PLAN.md`
  - 要件ドキュメント (requirements.md)
- **Findings**:
  - authMiddlewareがJWT検証 + セッション検証を実施
  - `req.user`に格納される情報: organizationId, userId, role
  - permissionCheck(['experiment_admin', 'system_admin'])で権限チェック
  - organization_idはセッション情報から取得（リクエストヘッダーからは受け取らない）
- **Implications**:
  - ミドルウェアチェーン: auth → permissionCheck → コントローラー処理
  - コントローラーで`req.user.organizationId`を直接使用
  - クロステナントアクセスはauthMiddlewareとデータベースフィルタで防止

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | projectController/projectServiceと同じレイヤードアーキテクチャ | 一貫性、保守性、学習コスト低 | なし（既に実証済み） | 推奨 |
| Repository層分離 | データアクセス層を独立させる | テスト容易性向上 | オーバーエンジニアリングのリスク | シンプルなCRUD操作のため不要 |

## Design Decisions

### Decision: ファイル一覧APIのS3操作パターン

- **Context**: S3からファイルリストを取得し、署名付きURLを生成する必要がある
- **Alternatives Considered**:
  1. 直接S3Clientを使用 - 低レベル制御が可能
  2. storageService経由で操作 - 既存パターン、マルチテナント分離が保証される
- **Selected Approach**: storageService経由で操作
- **Rationale**: 
  - 既存の`projectService.getById`で同様のパターンが実証済み
  - organization_prefixの付与が自動化されている
  - 署名付きURL生成が統一的に実施される
- **Trade-offs**: 
  - Benefits: セキュリティ、一貫性、保守性
  - Compromises: 追加の抽象化レイヤー（パフォーマンスへの影響は無視できる程度）
- **Follow-up**: S3エラー時のグレースフルな処理を確認

### Decision: タスク統計情報の集計方法

- **Context**: タスク一覧APIでステータス別の集計を提供する必要がある
- **Alternatives Considered**:
  1. アプリケーション側で集計 - シンプル、柔軟
  2. データベース側で集計 - パフォーマンス最適化
- **Selected Approach**: データベース側で集計（GROUP BY + COUNT）
- **Rationale**:
  - 既存の`projectService.list`で同様のパターンを使用
  - 大量タスク（1,000件以上）でもパフォーマンスが保証される
  - ネットワーク転送量が削減される
- **Trade-offs**:
  - Benefits: パフォーマンス、スケーラビリティ
  - Compromises: SQLクエリがやや複雑
- **Follow-up**: インデックスの存在確認（organization_id, project_id, task_status）

### Decision: ファイル一覧のinclude_archiveパラメータ

- **Context**: アーカイブファイルを含めるかどうかをクライアントが制御できるようにする
- **Alternatives Considered**:
  1. 常に全ファイルを返す - シンプル
  2. クエリパラメータで制御 - 柔軟性、パフォーマンス最適化
- **Selected Approach**: クエリパラメータで制御（デフォルト: false）
- **Rationale**:
  - 通常の画面表示では現在のファイルのみが必要
  - アーカイブファイルが大量にある場合のパフォーマンス問題を回避
  - 必要に応じてクライアントが明示的に要求できる
- **Trade-offs**:
  - Benefits: パフォーマンス、レスポンスサイズ削減
  - Compromises: クエリパラメータの追加
- **Follow-up**: フロントエンドでの使用パターン確認

## Risks & Mitigations

- **Risk 1**: S3アクセスエラーでAPI全体が失敗する
  - **Mitigation**: グレースフルエラーハンドリング（空配列返却）、try-catchでS3エラーを分離
- **Risk 2**: 大量タスク（10,000件以上）でのパフォーマンス劣化
  - **Mitigation**: データベース側での集計、インデックスの活用、ページネーション（要件外だが将来実装可能）
- **Risk 3**: organization_prefixの生成ロジック不整合
  - **Mitigation**: 既存の`projectService.getById`と同じロジックを使用、単体テストで検証

## References

- [API設計ポリシー](.clinerules/development/api.md) - RESTful API設計原則
- [バックエンド規約](.clinerules/development/backend.md) - レイヤードアーキテクチャ、SQL記述ルール
- [セキュリティ規約](.clinerules/development/security.md) - マルチテナント分離、Parameterized Queries
- [S3構造定義](.clinerules/references/s3_structure.md) - S3パス構造、organization_prefix
- [データベース構造](.clinerules/references/db_structure.md) - テーブル定義、外部キー関係
- [API仕様書](docs/design/api/api_project_management.md) - プロジェクト管理API仕様