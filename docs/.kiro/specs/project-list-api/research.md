# Research Log

## サマリー
- **機能名**: project-list-api
- **ディスカバリー範囲**: Extension（既存システムへの機能追加）
- **主要な発見事項**:
  - Express + TypeScript構造が確立済み
  - 3層ミドルウェアチェーン（auth, tenantIsolation, permissionCheck）が標準化
  - express-validatorとParameterized Queryが標準パターン

## 調査ログ

### 1. 既存バックエンド構造の分析

**目的**: プロジェクト一覧取得APIを既存構造に統合する方法を調査

**調査対象ファイル**:
- backend/src/routes/authRoutes.ts
- backend/src/middleware/authMiddleware.ts  
- backend/src/controllers/authController.ts

**発見事項**:
- Express Routerによる標準的なルート定義パターン
- ミドルウェアチェーン: auth → tenantIsolation → permissionCheck
- getPool()でDB接続、Parameterized Queries必須
- 統一されたエラーレスポンス形式

### 2. API仕様書の詳細確認

**参照**: docs/design/api/api_project_management.md

**プロジェクト一覧取得API仕様**:
- エンドポイント: GET /api/v1/projects
- 認証: JWT必須、X-Organization-Idヘッダー必須
- ページネーション: オフセットベース（page, limit）
- フィルタリング: status, search対応
- ソート: created_at, updated_at対応

**レスポンス形式**:
- 統一されたApiResponse型
- projectsテーブルとの結合（LEFT JOIN）でexperiment数取得
- organization_id必須フィルタでマルチテナント分離

## 設計判断

### 判断1: レイヤードアーキテクチャの採用

**選択**: Routes → Controllers → Services → Repository

**根拠**: 
- 既存コードとの一貫性維持
- テスト容易性の確保
- ビジネスロジックの再利用性

**影響する新規ファイル**:
- backend/src/routes/projectRoutes.ts
- backend/src/controllers/projectController.ts  
- backend/src/services/projectService.ts

### 判断2: ページネーション方式

**選択**: オフセットベース（page + limit）

**根拠**:
- API仕様書で定義済み
- プロジェクト数は比較的少量（数百件程度）
- カーソルベースは不要

**トレードオフ**:
- 利点: 実装がシンプル、ページ番号表示可能
- 欠点: 大量データでは性能劣化の可能性

## リスクと軽減策

### リスク1: N+1クエリ問題

**リスク**: experiments数を個別に取得するとN+1問題が発生

**軽減策**: LEFT JOINとCOUNTで1回のクエリで取得

**実装方法**:
```sql
SELECT p.*, COUNT(e.id) as experiment_count
FROM projects p
LEFT JOIN experiments e ON e.project_id = p.id
WHERE p.organization_id = $1
GROUP BY p.id
```

### リスク2: マルチテナント分離の実装漏れ

**リスク**: organization_idフィルタ忘れによるデータ漏洩

**軽減策**: 
- tenantIsolationミドルウェアで自動チェック
- すべてのクエリにWHERE organization_id = $1を必須化
- コードレビューで確認

### リスク3: ページネーションのパフォーマンス

**リスク**: OFFSET使用時の大量データでの性能劣化

**軽減策**:
- created_atにインデックス作成
- 必要に応じてキャッシング
- 将来的にカーソルベースへの移行を検討

## 参照資料

- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [プロジェクト管理API仕様](../../docs/design/api/api_project_management.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
