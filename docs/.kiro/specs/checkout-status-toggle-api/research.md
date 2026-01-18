# 調査ログ: checkout-status-toggle-api

## メタデータ
- **機能名**: checkout-status-toggle-api
- **調査日時**: 2026-01-16T11:16:00+09:00
- **調査範囲**: Light Discovery（既存システム拡張）

---

## 概要

既存のプロジェクト管理APIを拡張し、MAIMLファイルのチェックイン/チェックアウト機能を追加する。既存のアーキテクチャパターン（Routes → Controller → Service）を踏襲し、新たな外部依存は不要。

---

## 調査ログ

### 1. 既存アーキテクチャの分析

#### 確認した既存パターン

**Routes層** (`backend/src/routes/projectRoutes.ts`):
- Express Routerを使用
- express-validatorでリクエストバリデーション
- authMiddlewareで認証チェック
- GETとPOSTエンドポイントが実装済み

**Controller層** (`backend/src/controllers/projectController.ts`):
- リクエストパラメータの抽出とバリデーション
- Service層の呼び出し
- 統一されたレスポンス形式（success, data, error, meta）
- requestIdによるトレーシング
- エラーハンドリングとステータスコード管理

**Service層** (`backend/src/services/projectService.ts`):
- ビジネスロジックの実装
- トランザクション管理（BEGIN/COMMIT/ROLLBACK）
- Parameterized Queryの使用
- ServiceResult<T>型による型安全なエラーハンドリング
- organization_id必須のマルチテナント分離

**Middleware層** (`backend/src/middleware/authMiddleware.ts`):
- JWT認証
- req.userへのペイロード格納
- 401エラー処理

#### 統一されたレスポンス形式

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
  pagination?: { ... };  // リスト取得時のみ
}
```

### 2. データベーススキーマの確認

**projectテーブル** (`docs/design/db/ddl/project.sql`):
- 複合主キー: `(organization_id, project_id)`
- `checkout_status`: `NUMERIC(2,0)` 型
  - 0: チェックイン中
  - 1: チェックアウト済
- `project_status`: `NUMERIC(2,0)` 型
  - 0: プロジェクト計画中
  - 1: タスク実行待ち
  - 2: タスク実行中
  - 3: タスク結果レビュー待ち
  - 4: プロジェクト完了
  - 5: タスク異常終了

**関連テーブル**:
- `project_instruction`: プロジェクト指示情報
- `project_task_detail`: タスク詳細（task_status: 0=未実行, 1=実行中, 2=完了）

### 3. ビジネスルールの確認

**チェックアウト前提条件**:
1. `project_status != 0`（計画中以外）
2. `project_instruction`テーブルにレコードが存在

**チェックイン前提条件**:
1. `project_task_detail`テーブルに`task_status = 1`のレコードが存在しない

### 4. 技術スタックの確認

**既存スタック**:
- Node.js 18+
- Express.js 4.18.3
- TypeScript 5.x
- PostgreSQL 18+
- express-validator（バリデーション）
- uuid（ID生成）

**新規依存**: なし（既存ライブラリのみで実装可能）

---

## アーキテクチャ決定

### AD-1: 既存パターンの踏襲

**決定**: 既存のRoutes → Controller → Serviceパターンを完全に踏襲する

**理由**:
- 既存コードとの一貫性を保つ
- チーム内の学習コストが不要
- 既存のミドルウェア（auth）を再利用可能

**影響**:
- 新しいファイル: `projectRoutes.ts`への追加（3エンドポイント）
- 新しいファイル: `projectController.ts`への追加（3ハンドラ関数）
- 新しいファイル: `projectService.ts`への追加（3メソッド）

### AD-2: トランザクション管理

**決定**: チェックアウト/チェックイン操作はトランザクション内で実行

**理由**:
- 前提条件チェックとステータス更新をアトミックに実行
- 競合状態を防ぐ（FOR UPDATEロック）
- 既存のcreate/updateパターンと一貫性

**実装方針**:
```typescript
const client = await pool.connect();
await client.query('BEGIN');
try {
  // 1. SELECT ... FOR UPDATE（排他ロック）
  // 2. 前提条件チェック
  // 3. UPDATE checkout_status
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

### AD-3: エラーコード体系

**決定**: 既存のエラーコード命名規則に従う

**パターン**:
- `PROJECT_ALREADY_CHECKED_OUT`: 409 Conflict
- `PROJECT_STATUS_INVALID`: 400 Bad Request
- `PROJECT_INSTRUCTION_NOT_FOUND`: 400 Bad Request
- `TASK_IN_PROGRESS`: 400 Bad Request
- `PERMISSION_INSUFFICIENT`: 403 Forbidden
- `AUTH_TOKEN_INVALID`: 401 Unauthorized
- `SYSTEM_DATABASE_ERROR`: 500 Internal Server Error

### AD-4: 冪等性の保証

**決定**: 同一ユーザーによる重複操作は冪等性を保つ

**実装**:
- チェックアウト: 既にチェックアウト済み → 200 OK（再実行可能）
- チェックイン: 既にチェックイン済み → 200 OK（再実行可能）
- 別ユーザー: 409 Conflict（エラー）

---

## リスクと緩和策

### R-1: 同時チェックアウト競合

**リスク**: 複数ユーザーが同時にチェックアウトを試みる

**緩和策**:
- `SELECT ... FOR UPDATE`で排他ロック
- トランザクション内でステータス確認→更新を実行
- 409 Conflictエラーで明確にフィードバック

### R-2: チェックイン時のタスク状態確認

**リスク**: タスクが実行中なのにチェックインが成功してしまう

**緩和策**:
- `project_task_detail`テーブルを`task_status = 1`で検索
- 存在する場合は400エラーで拒否
- エラーメッセージに実行中タスク数を含める

### R-3: パフォーマンス

**リスク**: FOR UPDATEロックによる待機時間の増加

**緩和策**:
- トランザクションを可能な限り短く保つ
- タイムアウト設定（2秒）
- 要件で定義されたレスポンス時間目標（2秒以内）を遵守

---

## 統合ポイント

### 既存ファイルへの変更

**backend/src/routes/projectRoutes.ts**:
- 3つの新規エンドポイント追加
  - `POST /:projectId/checkout`
  - `POST /:projectId/checkin`
  - `GET /:projectId/checkout-status`

**backend/src/controllers/projectController.ts**:
- 3つの新規ハンドラ関数追加
  - `export async function checkout(...)`
  - `export async function checkin(...)`
  - `export async function getCheckoutStatus(...)`

**backend/src/services/projectService.ts**:
- 3つの新規メソッド追加
  - `async checkout(organizationId, projectId, userId)`
  - `async checkin(organizationId, projectId, userId)`
  - `async getCheckoutStatus(organizationId, projectId)`

### 新規ファイル

なし（既存ファイルへの追加のみ）

---

## テスト戦略

### 単体テスト対象

- `ProjectService.checkout()`: 前提条件チェック、ステータス更新
- `ProjectService.checkin()`: タスク状態確認、ステータス更新
- `ProjectService.getCheckoutStatus()`: ステータス取得

### 統合テスト対象

- チェックアウト → チェックイン フロー
- 同時チェックアウト試行（競合検出）
- 実行中タスクありでのチェックイン拒否

### セキュリティテスト対象

- マルチテナント分離（organization_id）
- 未認証アクセス拒否（401）
- 権限チェック（他組織のプロジェクトへのアクセス拒否）

---

## 参考資料

### 内部ドキュメント

- `docs/design/db/ddl/project.sql` - projectテーブルDDL
- `docs/design/db/db_table_list.md` - テーブル一覧
- `.clinerules/development/backend.md` - バックエンド規約
- `.clinerules/development/api.md` - API設計規約

### コード参照

- `backend/src/routes/projectRoutes.ts` - 既存Routesパターン
- `backend/src/controllers/projectController.ts` - 既存Controllerパターン
- `backend/src/services/projectService.ts` - 既存Serviceパターン（トランザクション管理）
- `backend/src/middleware/authMiddleware.ts` - 認証ミドルウェア

---

## 次のステップ

1. ✅ 調査完了: 既存パターン、データベーススキーマ、ビジネスルールを確認
2. → 設計書作成: design.mdでアーキテクチャと詳細設計を定義
3. → タスク分解: 実装タスクを生成
4. → 実装開始: Routes → Controller → Service の順で実装
