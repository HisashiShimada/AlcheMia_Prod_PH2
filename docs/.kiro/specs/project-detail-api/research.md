# Research Log

## サマリー
- **機能名**: project-detail-api
- **ディスカバリー範囲**: Extension（既存システムへの機能追加）
- **主要な発見事項**:
  - Express + TypeScript構造が確立済み
  - 3層ミドルウェアチェーン（auth, tenantIsolation, permissionCheck）が標準化
  - express-validatorとParameterized Queryが標準パターン
  - storageService.tsによるS3/Swift抽象化が実装済み
  - 既存のproject-list-apiと統一されたレスポンス形式を採用

## 調査ログ

### 1. 既存バックエンド構造の分析

**目的**: プロジェクト詳細取得APIを既存構造に統合する方法を調査

**調査対象ファイル**:
- backend/src/routes/authRoutes.ts
- backend/src/middleware/authMiddleware.ts
- backend/src/controllers/authController.ts
- backend/src/services/storageService.ts

**発見事項**:
- Express Routerによる標準的なルート定義パターン
- ミドルウェアチェーン: auth → tenantIsolation → permissionCheck
- getPool()でDB接続、Parameterized Queries必須
- 統一されたエラーレスポンス形式（ApiResponse型）
- storageServiceによるS3/Swift操作の抽象化（listFiles, getSignedUrl）

### 2. API仕様書の詳細確認

**参照**: docs/design/api/api_project_management.md

**プロジェクト詳細取得API仕様**:
- エンドポイント: GET /api/v1/projects/:projectId
- 認証: JWT必須、X-Organization-Idヘッダー必須
- パスパラメータ: projectId（UUID形式）
- レスポンス: プロジェクト基本情報 + S3ファイル一覧 + タスク一覧 + サマリー

**レスポンス形式**:
- 統一されたApiResponse型
- projectテーブル、project_task_detailテーブル、S3ストレージからデータ集約
- organization_id必須フィルタでマルチテナント分離

### 3. S3フォルダ構造の確認

**参照**: .clinerules/references/s3_structure.md

**プロジェクトフォルダ構造**:
```
org_{organization_prefix}/projects/
└── {project_name}/
    ├── {project_name}.maiml       # 現在のMAIMLファイル
    └── archive/
        ├── {project_name}_v1.maiml
        ├── {project_name}_v2.maiml
        └── {project_name}_v3.maiml
```

**署名付きURL生成**:
- storageService.getSignedUrl()を使用
- 有効期限: 3600秒（1時間）
- organization_prefix必須（マルチテナント分離）

### 4. データベース構造の確認

**参照テーブル**:
- `project` - プロジェクト基本情報（organization_id + project_id が主キー）
- `project_task_detail` - タスク詳細（organization_id + project_id + method_id + task_no が主キー）
- `organization_user` - ユーザー情報（所有者名、作業者名取得用）
- `code_master` - コード値マスタ（ステータス名称取得用）

**重要なインデックス**:
- project(organization_id, project_id)
- project_task_detail(organization_id, project_id)

## 設計判断

### 判断1: レイヤードアーキテクチャの採用

**選択**: Routes → Controllers → Services

**根拠**: 
- 既存のproject-list-apiと一貫性維持
- テスト容易性の確保
- ビジネスロジックの再利用性

**影響する新規ファイル**:
- backend/src/routes/projectRoutes.ts（既存ファイルに追加）
- backend/src/controllers/projectController.ts（既存ファイルに追加）
- backend/src/services/projectService.ts（既存ファイルに追加）

### 判断2: 並列データ取得パターンの採用

**選択**: Promise.allによる並列実行

**根拠**:
- プロジェクト基本情報、S3ファイル一覧、タスク存在チェックは独立
- 並列実行により50-70%の時間短縮が期待できる
- レスポンスタイム目標200msを達成するために必要

**実装方法**:
```typescript
const [projectResult, filesResult, tasksExistResult] = await Promise.all([
  this.getProjectInfo(organizationId, projectId),
  this.listProjectFiles(organizationPrefix, projectName),
  this.checkTasksExist(organizationId, projectId)
]);
```

**トレードオフ**:
- 利点: 大幅なレスポンスタイム短縮
- 欠点: エラーハンドリングが複雑化（個別のエラー処理が必要）

### 判断3: 条件付きタスク取得

**選択**: タスク存在チェック後、存在する場合のみ詳細を取得

**根拠**:
- タスクが未作成のプロジェクトでは不要なJOINクエリを回避
- パフォーマンス最適化
- 新規プロジェクト作成時のレスポンス高速化

**実装方法**:
```typescript
let tasks = [];
if (tasksExistResult) {
  tasks = await this.getTaskDetails(organizationId, projectId);
}
```

### 判断4: S3エラーのグレースフル処理

**選択**: S3エラー時は警告ログを記録し、空配列を返却（500エラーにしない）

**根拠**:
- S3フォルダが存在しない新規プロジェクトでもAPIが正常動作
- 一時的なS3障害時もプロジェクト基本情報は取得可能
- ユーザー体験の向上

**トレードオフ**:
- 利点: システム全体の可用性向上
- 欠点: S3エラーの検知が遅れる可能性（監視で補完）

## リスクと軽減策

### リスク1: 並列実行時のエラーハンドリング

**リスク**: Promise.all内の1つのクエリが失敗すると全体が失敗

**軽減策**: 
- 各クエリに個別のtry-catchを実装
- S3エラーはグレースフル処理（空配列返却）
- データベースエラーは500エラーとして適切に報告

### リスク2: Worker権限のパフォーマンス

**リスク**: Worker権限チェックに追加のDBクエリが必要

**軽減策**: 
- タスク詳細取得時にJOINでworker_user_idを確認（追加クエリ不要）
- 権限チェック結果をキャッシュ（TTL: 3分）
- インデックスを活用した高速化

### リスク3: 大量ファイル時のレスポンスタイム

**リスク**: S3ファイルが1,000件を超えるとレスポンスが遅延

**軽減策**:
- storageService.listFilesは最大1,000件まで取得
- 将来的にページングを検討
- 通常のプロジェクトでは10-50ファイル程度（許容範囲）

### リスク4: マルチテナント分離の実装漏れ

**リスク**: organization_idフィルタ忘れによるデータ漏洩

**軽減策**: 
- tenantIsolationミドルウェアで自動チェック
- すべてのクエリにWHERE organization_id = $1を必須化
- コードレビューで確認
- テストでクロステナントアクセスを検証

## 参照資料

- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [プロジェクト管理API仕様](../../docs/design/api/api_project_management.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [S3構造定義](../../.clinerules/references/s3_structure.md)
- [データベース構造](../../.clinerules/references/db_structure.md)
