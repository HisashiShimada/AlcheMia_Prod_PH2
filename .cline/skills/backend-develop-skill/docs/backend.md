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

### ⚠️ レイヤー間呼び出しルール（重要）

各レイヤーは **隣接する下位レイヤーのみ** を呼び出すこと。層をスキップした呼び出しは禁止。

```
Routes（Controller）
    ↓ のみ呼び出し可
Service 層
    ↓ のみ呼び出し可
Repository 層
```

```typescript
// ❌ 禁止: Routes（Controller）から Repository を直接呼び出す
router.get('/projects', auth, async (req, res) => {
  // Repository を直接呼び出してはいけない
  const projects = await projectRepository.findAll(req.organizationId);
  res.json(projects);
});

// ✅ 正しい: Routes → Service → Repository の順で呼び出す
router.get('/projects', auth, async (req, res) => {
  // Service 層を経由する
  const projects = await projectService.getProjects(req.organizationId);
  res.json(projects);
});

// services/projectService.ts
export async function getProjects(organizationId: string) {
  // Service 層が Repository を呼び出す
  return await projectRepository.findAll(organizationId);
}
```

**この規約の目的:**
- ビジネスロジック（バリデーション・権限チェック・トランザクション等）の Service 層への集約
- Controller のテスト容易性向上（Controller はルーティングのみに専念）
- Repository の直接利用によるビジネスロジック迂回防止



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

#### 権限チェックミドルウェア（permissionCheckMiddleware.ts）
- ユーザーロールの検証
- 必要な権限の確認
- アクセス拒否の処理

**詳細は [permission_check.md](permission_check.md) を参照してください。**

### SQL管理方法

#### 基本方針: Kysely + SQL-in-File パターン

**採用パッケージ**: Kysely（TypeScript-first Query Builder）

- **型安全性**: データベーススキーマから型を自動生成
- **Parameterized Query**: 自動対応でSQLインジェクション対策
- **マルチテナント対応**: organization_id強制が容易
- **学習コスト**: 生SQLに近い記法で習得が容易

詳細は `docs/SQL管理方法選定_提案書.md` を参照してください。

#### 代替方法: pg-promise + SQLファイル外部管理

**採用パッケージ**: pg-promise

新規実装では、以下の方針でpg-promiseを使用することも可能です：

- **SQLファイル外部管理**: 複雑なクエリは外部SQLファイルで管理
- **ファイル配置**: `backend/src/sql/queries/{ドメイン名}/{操作名}.sql`
- **動的フィルタ**: ベースクエリは外部ファイル、動的条件はTypeScript側で処理
- **参照モデル**: `backend/src/repositories/departmentRepository.ts` の `findAll()` メソッド

詳細は `.clinerules/development/database.md` の「Repository層のSQL管理規約」セクションを参照してください。

**使用例:**
```typescript
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

export async function findAll(organizationId: string): Promise<DepartmentRow[]> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('departments/findAll.sql');
  return await pgp.any<DepartmentRow>(sqlQuery, [organizationId]);
}
```

**SQLファイル例 (backend/src/sql/queries/departments/findAll.sql):**
```sql
SELECT 
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
FROM department
WHERE organization_id = $1
ORDER BY department_cd ASC
```

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


### 多言語対応規約（i18n）

#### 全体方針

バックエンドのエラーメッセージ・バリデーションメッセージはすべて日英両対応とする。

**メッセージ決定の優先順位（高→低）:**

| 優先度 | 取得元 | 用途 |
|--------|--------|------|
| 1（原則） | `messages.ts` の `getMessage(lang, key, params)` | **必ずここで個別メッセージを用意すること** |
| 2（保険） | `errorCodes.ts` の `getErrorDefaultMessage(code, lang)` | messages.ts にキーが未定義の場合の自動フォールバック |
| 3（最終） | エラーコード文字列そのもの（`'E1003'` 等） | 最終フォールバック |

> ⚠️ エラーを throw・返す箇所には **必ず** `messages.ts` に対応するメッセージキーを用意すること。
> エラーコードのデフォルトメッセージはあくまで「messages.ts への追加漏れ」に対する安全網であり、それに頼ることを目的としない。

**対応言語:**

| コード | 言語 | デフォルト |
|--------|------|-----------|
| `ja` | 日本語 | ✅（フォールバック） |
| `en` | 英語 | — |

---

#### lang 取得の統一パターン（Controller 層）

Controller 層では **必ず以下のパターン** で `lang` を取得し、Service 層に渡す。

```typescript
// ✅ 統一パターン（全 Controller で統一すること）
const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

// ❌ 禁止: 独自のパース方法
const lang = req.headers['accept-language']?.startsWith('en') ? 'en' : 'ja';
```

> **例外:** GET 系などユーザー向けエラーメッセージを返さないエンドポイントは省略可

---

#### lang 伝播パターン（Controller → Service）

```typescript
// ✅ Controller 層: lang を取得して Service に渡す
export const createFoo = async (req: Request, res: Response): Promise<void> => {
  const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];
  const result = await fooService.createFoo(req.body, String(userId), lang);
  res.json({ success: true, data: result, meta: { ... } });
};

// ✅ Service 層: lang 引数を受け取り、デフォルト値 'ja' を必ず設定する
export async function createFoo(
  data: FooInput,
  userId: string,
  lang: string = 'ja'
): Promise<Foo> {
  const existing = await fooRepository.findByName(data.name);
  if (existing) {
    const error: any = new Error(getMessage(lang, 'myFeature.duplicateName'));
    error.statusCode = 409;
    throw error;
  }
  // ...
}
```

---

#### messages.ts の管理ルール

**ファイル位置:** `backend/src/utils/messages.ts`

メッセージを追加する際は、**必ず以下の 3 箇所を同時に更新する。**
TypeScript の型定義と実装を一致させることで、追加漏れをコンパイルエラーで検出できる。

```typescript
// ① Messages 型定義にキーを追加
type Messages = {
  // ... 既存 ...
  myFeature: {
    duplicateName: string;
    csv: {
      nameRequired: string;
    };
  };
};

// ② ja オブジェクトに日本語メッセージを追加
const ja: Messages = {
  // ... 既存 ...
  myFeature: {
    duplicateName: 'この名前は既に使用されています',
    csv: {
      nameRequired: '{row}行目: 名前は必須です',
    },
  },
};

// ③ en オブジェクトに英語メッセージを追加
const en: Messages = {
  // ... 既存 ...
  myFeature: {
    duplicateName: 'This name is already in use',
    csv: {
      nameRequired: 'Row {row}: Name is required',
    },
  },
};
```

**プレースホルダー規則:**
- `{row}` — CSV 行番号
- `{name}`, `{cd}`, `{mail}`, `{id}` など — 値名を使う
- `{0}`, `{1}` のような位置指定は禁止

**Service 層での getMessage 使用例:**

```typescript
import { getMessage } from '../utils/messages';

// 単純なエラーメッセージ
const error: any = new Error(getMessage(lang, 'myFeature.duplicateName'));
error.statusCode = 409;
throw error;

// CSV バリデーションでプレースホルダーを使用する例
const errors: { message: string }[] = [];
if (!row.name) {
  errors.push({
    message: getMessage(lang, 'myFeature.csv.nameRequired', { row: String(rowNumber) }),
  });
}
```

---

#### エラーコードのデフォルトメッセージ（保険）

`messages.ts` に対応キーが**存在しない場合のフォールバック**として、`errorCodes.ts` に `ERROR_DEFAULT_MESSAGES` と `getErrorDefaultMessage()` を用意する。

> ⚠️ 通常の実装ではここまで落ちないようにすること。messages.ts へのキー追加を怠った際の安全網として機能する。

```typescript
// backend/src/enums/errorCodes.ts に追加

/** エラーコードごとのデフォルトメッセージ（保険用フォールバック） */
export const ERROR_DEFAULT_MESSAGES: Record<string, { ja: string; en: string }> = {
  E1001: { ja: 'ファイルサイズが制限を超えています', en: 'File size exceeds the limit' },
  E1002: { ja: 'ファイル形式が正しくありません', en: 'Invalid file format' },
  E1003: { ja: '入力内容に誤りがあります', en: 'Validation error' },
  // ... 全エラーコード分を定義 ...
  E9999: { ja: '予期しないエラーが発生しました', en: 'An unexpected error occurred' },
};

/**
 * エラーコードのデフォルトメッセージを取得する（保険用）
 * messages.ts に対応キーがある場合は getMessage() を優先すること
 */
export function getErrorDefaultMessage(code: string, lang: string = 'ja'): string {
  const langKey = (lang === 'en' ? 'en' : 'ja') as 'ja' | 'en';
  return ERROR_DEFAULT_MESSAGES[code]?.[langKey]
    ?? ERROR_DEFAULT_MESSAGES[code]?.ja
    ?? code;
}
```

---

#### 禁止事項

```typescript
// ❌ 禁止: lang 引数を無視して 'ja' をハードコード
getMessage('ja', 'role.csv.alreadyExists', { roleCd })
// ✅ 正しい: getMessage(lang, 'role.csv.alreadyExists', { roleCd })

// ❌ 禁止: messages.ts に未定義のキーをフォールバック文字列で誤魔化す
getMessage(lang, 'master.duplicateAttributeName') || 'この名前は重複しています'
// ✅ 正しい: Messages 型・ja・en の 3 箇所にキーを追加してから getMessage() を使う

// ❌ 禁止: 多言語化なしでメッセージをハードコード
throw new Error('このIDは重複しています');
// ✅ 正しい: getMessage(lang, 'xxx.duplicateId') を使う

// ❌ 禁止: Controller 層で lang を取得せず Service 層に渡さない
const result = await someService.createFoo(req.body, userId);  // lang なし
// ✅ 正しい: lang を取得して引数に渡す
const result = await someService.createFoo(req.body, userId, lang);
```


### バリデーション

#### バリデーション基本方針

mmdpfプロジェクトでは、バリデーション処理を以下の方針で実装します：

1. **express-validator**をバリデーションライブラリとして使用
2. **バリデーションミドルウェア**でルートレベルでバリデーションを実施
3. **コントローラー層**からバリデーション処理を分離し、ビジネスロジックに集中
4. **統一されたエラーレスポンス形式**を使用

#### バリデーションミドルウェアの使用

**ミドルウェアチェーンの順序:**
```typescript
auth → tenantIsolation → [バリデーションルール] → handleValidationErrors → controller
```

**実装例:**
```typescript
// routes/taskRoutes.ts
import { Router } from 'express';
import { param, body, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import * as taskController from '../controllers/taskController';

const router = Router();

router.put(
  '/:projectId/methods/:methodId/tasks/:taskNo/status',
  authMiddleware,
  [
    // バリデーションルール定義
    param('projectId').isUUID().withMessage('projectIdはUUID形式である必要があります'),
    param('methodId').notEmpty().withMessage('methodIdは必須です'),
    param('taskNo').isInt({ min: 1 }).withMessage('taskNoは1以上の整数である必要があります'),
    body('status').notEmpty().isIn(['pending', 'in_progress', 'completed', 'forced_terminated']),
    body('currentUpdateAt').notEmpty().isISO8601(),
    body('comment').optional().isLength({ max: 500 }),
  ],
  handleValidationErrors,  // バリデーションエラーハンドリングミドルウェア
  taskController.updateStatus
);
```

#### コントローラー実装

**DO（推奨）:**
```typescript
// ✅ バリデーションはミドルウェアで処理済み
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    // パラメータはバリデーション済みなので直接使用
    const { projectId, methodId, taskNo } = req.params;
    const { status, currentUpdateAt, comment } = req.body;
    const { organizationId, userId } = req.user!;
    
    // ビジネスロジックに集中
    const result = await taskService.updateStatus(
      organizationId, projectId, methodId, parseInt(taskNo, 10),
      status, currentUpdateAt, comment
    );
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    });
  } catch (error) {
    throw error; // エラーハンドリングミドルウェアで処理
  }
}
```

**DON'T（非推奨）:**
```typescript
// ❌ validationResult()をコントローラー内で使用しない
export async function updateStatus(req: Request, res: Response): Promise<void> {
  // ❌ この処理はミドルウェアで実施済みなので不要
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // ...
}
```

#### バリデーションエラーレスポンス形式

handleValidationErrorsミドルウェアは、バリデーションエラーを以下の統一形式で返します：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラーが発生しました",
    "details": [
      {
        "field": "projectId",
        "message": "projectIdはUUID形式である必要があります",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-04T20:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

#### 共通バリデーター関数

`utils/validators.ts`で提供される共通バリデーター：

```typescript
// UUID検証
validateUUID(fieldName, location)

// 列挙型検証
validateEnum(fieldName, allowedValues, location, options)

// 文字列長検証
validateStringLength(fieldName, min, max, location, options)

// 日付検証
validateDate(fieldName, location, options)

// メールアドレス検証
validateEmail(fieldName, location, options)

// 配列検証
validateArray(fieldName, location, options)

// オブジェクト検証
validateObject(fieldName, location, options)

// パスワード検証
validatePassword(fieldName, location)

// 正規表現パターン検証
validatePattern(fieldName, pattern, location, options)

// カスタムバリデーター
validateCustom(fieldName, validatorFn, location, options)
```

**使用例:**
```typescript
import { validateUUID, validateEnum } from '../utils/validators';

router.put(
  '/:id/status',
  authMiddleware,
  [
    validateUUID('id', 'param'),
    validateEnum('status', ['active', 'inactive'], 'body', { optional: false }),
  ],
  handleValidationErrors,
  controller.updateStatus
);
```

#### ビジネスロジックバリデーション

サービス層では、以下のビジネスルールバリデーションを実装：
- データの整合性チェック
- ドメインルールの適用
- リソースの存在確認
- 権限の詳細チェック

**例:**
```typescript
// services/taskService.ts
export async function updateTaskStatus(
  organizationId: string,
  projectId: string,
  taskId: string,
  status: TaskStatus
): Promise<Result<Task>> {
  // ビジネスルールバリデーション
  const task = await taskRepository.findById(taskId, organizationId);
  if (!task) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'タスクが見つかりません'
      }
    };
  }
  
  // ステータス遷移のルールチェック
  if (!isValidStatusTransition(task.status, status)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `${task.status}から${status}への遷移はできません`
      }
    };
  }
  
  // 更新処理
  const updatedTask = await taskRepository.update(taskId, { status });
  return { success: true, data: updatedTask };
}
```

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
✅ エラーメッセージは必ず messages.ts で日英両方を用意する
✅ Controller 層で Accept-Language ヘッダーから lang を取得し Service 層に渡す
✅ messages.ts に新しいキーを追加する際は Messages 型・ja・en の 3 箇所を同時に更新する

### DON'T（非推奨）
❌ 文字列連結でSQLクエリを構築しない
❌ organization_idなしでクエリを実行しない
❌ 認証・認可ミドルウェアを省略しない
❌ エラーを握りつぶさない
❌ 機密情報をログに出力しない
❌ グローバル変数を使用しない
❌ 同期的なファイル操作を使用しない
❌ ハードコーディングされた設定値を使用しない
❌ getMessage() の lang 引数に 'ja' をハードコードしない
❌ messages.ts に未定義のキーを参照してフォールバック文字列で誤魔化さない
❌ エラーメッセージを多言語化せずに日本語固定で throw しない
