# バックエンド規約

## API設計

**API設計の詳細は [api.md](api.md) を参照してください。**

このドキュメントではバックエンド実装の詳細に焦点を当てます。URL設計、HTTPメソッド、レスポンス形式などのAPIインターフェース設計については、api.mdで統一的に定義されています。

## 言語とフレームワーク

### 基本技術スタック
- **言語**: TypeScript
- **フレームワーク**: Express.js
- **データベース**: PostgreSQL
- **認証**: jsonwebtoken、bcrypt
- **セッション管理**: express-session
- **パッケージマネージャー**: npm

### 主要ライブラリ
- **AWS SDK**: @aws-sdk/client-s3、@aws-sdk/client-bedrock-runtime、aws-sdk v2
- **セキュリティ**: 
- **ファイル処理**: 
- **ロギング**: 
- **バリデーション**: 
- **その他**: dotenv、uuid

## アーキテクチャ

### ディレクトリ構造
```
backend/
├── routes/              # APIルート定義
├── middleware/          # Expressミドルウェア
├── services/            # ビジネスロジック
├── repository/          # DB接続・操作
├── config/              # 設定ファイル
├── tests/               # テストコード
├── utils/               # ユーティリティ関数
├── constants/           # 定数定義
├── output/              # 生成ファイル出力先
├── logs/                # ログファイル
└── server.js            # エントリーポイント
```

### レイヤードアーキテクチャ

#### 1. ルート層（Routes）
- HTTPリクエストのルーティング
- リクエストパラメータの抽出
- レスポンスの返却
- エラーのハンドリング

#### 2. ミドルウェア層（Middleware）
- 認証・認可
- テナント分離
- バリデーション
- ロギング
- エラーハンドリング

#### 3. サービス層（Services）
- ビジネスロジックの実装
- データ処理
- 外部APIとの連携
- トランザクション管理

#### 4. データアクセス層（Repository）
- データベース接続
- クエリの実行
- データの永続化

## コーディング規約

### ルート定義

#### ミドルウェアチェーン
すべてのAPIルートは以下の順序でミドルウェアを適用：
1. `auth` - JWT認証
2. `tenantIsolation` - テナント分離
3. `permissionCheck` - 権限チェック
4. ルートハンドラ

#### ルートファイルの構造
1. インポート
2. Routerインスタンス作成
3. ルート定義
4. エクスポート

### ミドルウェア実装

#### 認証ミドルウェア（auth.js）
- JWTトークンの検証
- セッションの検証
- ユーザー情報の抽出
- req.userへの格納

#### テナント分離ミドルウェア（tenantIsolation.js）
- organization_idの検証
- req.organizationIdへの格納
- クロステナントアクセスの防止

#### 権限チェックミドルウェア（permissionCheck.js）
- ユーザーロールの検証
- 必要な権限の確認
- アクセス拒否の処理

### SQL管理方法

#### 基本方針: Kysely + SQL-in-File パターン

**採用パッケージ**: Kysely（TypeScript-first Query Builder）

- **型安全性**: データベーススキーマから型を自動生成
- **Parameterized Query**: 自動対応でSQLインジェクション対策
- **マルチテナント対応**: organization_id強制が容易
- **学習コスト**: 生SQLに近い記法で習得が容易

詳細は `docs/SQL管理方法選定_提案書.md` を参照してください。

#### SQL記述の使い分けルール

##### 1. 簡単なクエリ: Kyselyのクエリビルダーを使用

**対象:**
- 単一テーブルへのCRUD操作
- 簡単なWHERE条件のみのクエリ
- 基本的なORDER BY、LIMIT、OFFSET

**例:**
```typescript
// ✅ 推奨: Kyselyのクエリビルダー
export class ProjectRepository {
  async findById(id: string, organizationId: string) {
    return await db
      .selectFrom('projects')
      .selectAll()
      .where('id', '=', id)
      .where('organization_id', '=', organizationId)
      .executeTakeFirst();
  }

  async create(project: NewProject) {
    return await db
      .insertInto('projects')
      .values(project)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
```

##### 2. 複雑なクエリ: 外部SQLファイルを必須使用（重要）

**対象（いずれかに該当する場合は外部SQLファイル化必須）:**
- **JOINを使用するクエリ**（INNER JOIN、LEFT JOIN、RIGHT JOIN等）
- 複数テーブルのサブクエリ
- WITH句（CTE: Common Table Expression）を使用
- UNION、INTERSECT、EXCEPT
- ウィンドウ関数（ROW_NUMBER、RANK等）
- 複雑な集計（GROUP BY + HAVING + 複数の集計関数）

**重要**: JOINを使うクエリは必ず外部SQLファイルを使用してください。

**ディレクトリ構造:**
```
backend/src/
├── sql/
│   ├── queries/
│   │   ├── projects/
│   │   │   ├── findWithExperiments.sql
│   │   │   └── getProjectStats.sql
│   │   ├── experiments/
│   │   │   └── findWithTasks.sql
│   │   └── reports/
│   │       └── complexReport.sql
│   └── loader.ts
```

**外部SQLファイルの例:**
```sql
-- src/sql/queries/projects/findWithExperiments.sql
-- プロジェクトと実験の結合取得
SELECT
  p.id,
  p.project_name,
  p.description,
  COUNT(DISTINCT e.id) as experiment_count,
  MAX(e.updated_at) as latest_experiment_update
FROM projects p
LEFT JOIN experiments e ON e.project_id = p.id
WHERE p.organization_id = $1
  AND e.organization_id = $1  -- マルチテナント分離（両方で必須）
GROUP BY p.id, p.project_name, p.description
ORDER BY p.created_at DESC;
```

**リポジトリでの使用例:**
```typescript
// src/repositories/projectRepository.ts
import { sql } from 'kysely';
import { db } from '../database/db';
import { loadSqlFile } from '../sql/loader';

export class ProjectRepository {
  // ✅ 推奨: JOINを使う場合は外部SQLファイルを使用
  async findWithExperiments(organizationId: string) {
    const sqlQuery = await loadSqlFile('projects/findWithExperiments.sql');
    
    const result = await sql.raw(sqlQuery).execute(db);
    return result.rows;
  }
}
```

**SQLローダーの実装:**
```typescript
// src/sql/loader.ts
import fs from 'fs/promises';
import path from 'path';

/**
 * 外部SQLファイルを読み込む
 * @param filename クエリファイル名（queries/からの相対パス）
 */
export async function loadSqlFile(filename: string): Promise<string> {
  const filePath = path.join(__dirname, 'queries', filename);
  return await fs.readFile(filePath, 'utf-8');
}
```

#### データベース操作の基本ルール

##### Parameterized Queries（必須）
- すべてのクエリでParameterized Queryを使用
- SQLインジェクションを防ぐ
- 文字列連結でクエリを構築しない
- Kyselyは自動的にParameterized Queryを生成

##### organization_idフィルタ（必須）
- すべてのクエリにorganization_idフィルタを含める
- マルチテナント分離を保証
- System Admin以外はクロステナントアクセス不可
- JOINを使う場合、**全てのテーブルでorganization_idを指定**

**例（重要）:**
```sql
-- ❌ 悪い例: 片方のテーブルのみでorganization_id指定
SELECT p.*, e.*
FROM projects p
JOIN experiments e ON e.project_id = p.id
WHERE p.organization_id = $1;  -- これだけでは不十分

-- ✅ 良い例: 両方のテーブルでorganization_id指定
SELECT p.*, e.*
FROM projects p
JOIN experiments e ON e.project_id = p.id
WHERE p.organization_id = $1
  AND e.organization_id = $1;  -- 必須
```

##### トランザクション管理
- 複数のクエリを含む処理はトランザクションで保護
- エラー時は必ずロールバック
- コミット前にバリデーション

**Kyselyでのトランザクション例:**
```typescript
export class ProjectService {
  async createProjectWithExperiment(
    projectData: NewProject,
    experimentData: NewExperiment,
    organizationId: string
  ) {
    return await db.transaction().execute(async (trx) => {
      const project = await trx
        .insertInto('projects')
        .values({ ...projectData, organization_id: organizationId })
        .returningAll()
        .executeTakeFirstOrThrow();

      const experiment = await trx
        .insertInto('experiments')
        .values({
          ...experimentData,
          project_id: project.id,
          organization_id: organizationId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return { project, experiment };
    });
  }
}
```

##### 接続プール
- PostgreSQL接続プールを使用
- 最大接続数: 20
- アイドルタイムアウト: 30秒
- 接続タイムアウト: 2秒

### S3操作

#### Organization Prefix（必須）
- すべてのS3キーに`org_{organization_id}`プレフィックスを含める
- パス形式: `org_{org_id}/projects/{project_id}/{filename}`
- クロステナントアクセスを防ぐ

#### 署名付きURL（必須）
- S3の直接URLを返さない
- Pre-signed URLを生成して返す
- 有効期限: 1時間
- アクセス権限の一時的な付与

#### S3操作のエラーハンドリング
- ファイルが存在しない場合の処理
- アクセス権限エラーの処理
- ネットワークエラーの処理

### エラーハンドリング

**エラーレスポンス形式とHTTPステータスコードの詳細は [api.md](api.md#レスポンス仕様) を参照してください。**

#### エラークラスの定義

カスタムエラークラスを作成し、適切なHTTPステータスコードを設定：

```typescript
// utils/errors.ts
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string, public details?: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

#### エラーハンドリングミドルウェア

統一されたエラーレスポンスを返すミドルウェア：

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const requestId = req.headers['x-request-id'] || uuidv4();

  // ログ記録
  logger.error({
    message: err.message,
    statusCode,
    requestId,
    path: req.path,
    method: req.method,
    stack: err.stack,
    userId: req.user?.id,
    organizationId: req.organizationId
  });

  // api.mdで定義された統一形式でレスポンス
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.name || 'INTERNAL_SERVER_ERROR',
      message: err.message,
      details: err.details || undefined
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId
    }
  });
};
```

#### ログ記録
- すべてのエラーをログに記録
- スタックトレースを含める
- コンテキスト情報を付与（userId, organizationId, requestId）

### バリデーション

#### 入力バリデーション
- express-validatorを使用
- すべてのユーザー入力を検証
- サニタイゼーション処理

#### ビジネスロジックバリデーション
- サービス層で実装
- データの整合性チェック
- ドメインルールの適用

### ロギング

#### Winstonの使用
- 構造化ロギング
- ログレベル: error, warn, info, debug
- 日次ローテーション

#### ログ出力先
- コンソール（開発環境）
- ファイル（backend/logs/）
- 本番環境: CloudWatch Logs

#### ログ内容
- タイムスタンプ
- ログレベル
- メッセージ
- コンテキスト情報
- スタックトレース（エラー時）

### レスポンス形式の統一

**レスポンス形式の詳細は [api.md](api.md#レスポンス仕様) を参照してください。**

すべてのAPIレスポンスは以下の共通型を使用：

```typescript
// types/api.ts
export interface ApiResponse<T> {
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
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### 実装例

```typescript
// controllers/projectController.ts
export const list = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const organizationId = req.organizationId;

    const result = await projectService.list(organizationId, { page, limit });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    });
  } catch (error) {
    throw error; // エラーハンドリングミドルウェアで処理
  }
};
```

### セキュリティ

**認証・認可・マルチテナント分離の詳細は [api.md](api.md#セキュリティ) と [security.md](security.md) を参照してください。**

#### パスワード処理
- bcryptでハッシュ化
- Admin権限: 14 rounds
- その他: 12 rounds

#### JWT管理
- 秘密鍵は環境変数
- 適切な有効期限設定
- トークンの検証

#### セッション管理
- データベースとメモリの二重管理
- 自動クリーンアップ
- セキュアCookie設定

#### レート制限

**レート制限の詳細は [api.md](api.md#セキュリティ) を参照してください。**

実装例：

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// 認証API用のレート制限
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 5回まで
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

// 一般API用のレート制限
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 100, // 100回まで
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded. Please retry after 60 seconds.'
    }
  }
});
```

### 非同期処理

#### async/await の使用
- Promise chainingより優先
- try-catchでエラーハンドリング
- 並列処理はPromise.all

#### エラープロパゲーション
- エラーは適切に伝播させる
- 最終的にエラーハンドリングミドルウェアで処理
- ユーザーフレンドリーなエラーメッセージ

### パフォーマンス最適化

#### データベースクエリ
- N+1問題の回避
- 適切なインデックス使用
- クエリの最適化

#### キャッシング
- node-cacheの使用
- 頻繁にアクセスされるデータをキャッシュ
- TTL（Time To Live）の設定

#### 圧縮
- レスポンスの圧縮（compression）
- 大きなペイロードの最適化

## ベストプラクティス

### DO（推奨）
✅ 常にParameterized Queriesを使用する
✅ すべてのクエリにorganization_idフィルタを含める
✅ ミドルウェアチェーンを正しく適用する
✅ エラーハンドリングを適切に実装する
✅ 環境変数で設定を管理する
✅ ログを適切に記録する
✅ 非同期処理でasync/awaitを使用する
✅ セキュリティベストプラクティスに従う

### DON'T（非推奨）
❌ 文字列連結でSQLクエリを構築しない
❌ organization_idなしでクエリを実行しない
❌ 認証・認可ミドルウェアを省略しない
❌ エラーを握りつぶさない
❌ 機密情報をログに出力しない
❌ グローバル変数を使用しない
❌ 同期的なファイル操作を使用しない
❌ ハードコーディングされた設定値を使用しない
