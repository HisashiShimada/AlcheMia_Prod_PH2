# データベース操作規約

## 概要

このドキュメントは、Repository層におけるデータベース操作（Insert/Update）の統一化ルールを定義します。SQLクエリの重複を避け、保守性と可読性を向上させることを目的としています。

---

## Repository層のSQL管理規約（重要）

### 基本原則

#### 新規実装では必ずpg-promiseライブラリを使用し、SQLファイルで外部管理

複雑なSQLクエリは、TypeScriptファイル内にインラインで記述せず、**専用のSQLファイルとして外部管理**します。これにより、保守性・可読性・テスタビリティが向上します。

**適用範囲:**
- ✅ **新規実装のみ**: これから作成するRepositoryメソッドに適用
- ⚠️ **既存コード**: リファクタリング不要（段階的に移行予定）

---

### ファイル配置規則

```
backend/src/sql/
├── loader.ts                          # SQLファイル読み込みユーティリティ
└── queries/                           # SQLクエリファイル格納ディレクトリ
    └── {ドメイン名}/                  # テーブル名またはドメイン名
        ├── findAll.sql               # 一覧取得
        ├── findById.sql              # ID検索
        ├── create.sql                # 作成
        ├── update.sql                # 更新
        └── delete.sql                # 削除
```

**命名規則:**
- ディレクトリ名: テーブル名の複数形（例: `departments`, `projects`, `users`）
- ファイル名: 操作を表す動詞 + 目的語（例: `findAll.sql`, `findById.sql`）

**例:**
```
backend/src/sql/queries/
├── departments/
│   ├── findAll.sql
│   └── findById.sql
├── projects/
│   ├── findAll.sql
│   ├── findById.sql
│   └── findByStatus.sql
└── tasks/
    └── listMethodsAndTasksByProject.sql
```

---

### 実装パターン

#### ✅ 推奨: SQLファイル外部管理

**SQLファイル（backend/src/sql/queries/departments/findAll.sql）**

```sql
-- Department一覧取得クエリ
-- 組織IDでフィルタリングし、部署情報を取得
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

**Repositoryファイル（backend/src/repositories/departmentRepository.ts）**

```typescript
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

export interface DepartmentRow {
  organization_id: string;
  department_cd: string;
  department_name: string;
  is_active: boolean;
  create_at: Date;
  update_at: Date;
}

/**
 * Department一覧を取得
 */
export async function findAll(
  organizationId: string
): Promise<DepartmentRow[]> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('departments/findAll.sql');
  
  // pg-promiseでクエリを実行
  return await pgp.any<DepartmentRow>(sqlQuery, [organizationId]);
}
```

---

#### ❌ 非推奨: インラインSQL（複雑なクエリ）

```typescript
// ❌ 悪い例: 複雑なSQLをインラインで記述
export async function findAll(organizationId: string): Promise<DepartmentRow[]> {
  const pool = getPool();
  
  // 複雑なクエリがTypeScript内に埋め込まれている
  const query = `
    SELECT 
      d.organization_id,
      d.department_cd,
      d.department_name,
      d.is_active,
      d.create_at,
      d.update_at,
      COUNT(u.user_id) as user_count
    FROM department d
    LEFT JOIN users u ON d.organization_id = u.organization_id 
      AND d.department_cd = u.department_cd
    WHERE d.organization_id = $1
    GROUP BY d.organization_id, d.department_cd, d.department_name, 
             d.is_active, d.create_at, d.update_at
    ORDER BY d.department_cd ASC
  `;
  
  const result = await pool.query(query, [organizationId]);
  return result.rows;
}
```

---

### 例外ケース: インラインSQL許容

以下の場合のみ、インラインSQLを許容します：

#### ✅ 極めて単純なクエリ（1-2行）

```typescript
// ✅ 許容: 単純な存在確認クエリ
export async function existsById(
  organizationId: string,
  departmentCd: string
): Promise<boolean> {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM department
      WHERE organization_id = $1 AND department_cd = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId, departmentCd]);
  return result.rows[0].exists;
}
```

```typescript
// ✅ 許容: 単純なINSERT文
export async function create(data: DepartmentRow): Promise<DepartmentRow> {
  const pool = getPool();
  
  const query = `
    INSERT INTO department (organization_id, department_cd, department_name)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    data.organization_id,
    data.department_cd,
    data.department_name
  ]);
  return result.rows[0];
}
```

---

### 動的フィルタの扱い

検索条件が動的に変わる場合：
- **ベースクエリ**: 外部SQLファイルで管理
- **動的条件**: TypeScript側で文字列置換または追加

**実装例:**

```typescript
export async function findAll(
  organizationId: string,
  filters: { search?: string; isActive?: boolean }
): Promise<DepartmentRow[]> {
  const pgp = getPgp();
  
  // ベースクエリを外部ファイルから読み込み
  let sqlQuery = await loadSqlFile('departments/findAll.sql');
  
  const params: any[] = [organizationId];
  let paramIndex = 2;
  
  // 動的フィルターを追加
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (department_cd ILIKE $${paramIndex} OR department_name ILIKE $${paramIndex})
ORDER BY`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND is_active = $${paramIndex}
ORDER BY`
    );
    params.push(filters.isActive);
    paramIndex++;
  }
  
  return await pgp.any<DepartmentRow>(sqlQuery, params);
}
```

---

### ベストプラクティス

#### DO（推奨）

✅ **複雑なクエリは外部SQLファイルで管理**
```typescript
const sqlQuery = await loadSqlFile('departments/findAll.sql');
```

✅ **pg-promiseライブラリを使用（新規実装）**
```typescript
const pgp = getPgp();
await pgp.any<DepartmentRow>(sqlQuery, params);
```

✅ **SQLファイルにコメントを記載**
```sql
-- Department一覧取得クエリ
-- 組織IDでフィルタリングし、部署情報を取得
SELECT ...
```

✅ **ドメインごとにディレクトリを分ける**
```
queries/departments/
queries/projects/
queries/tasks/
```

#### DON'T（非推奨）

❌ **複雑なSQLをインラインで記述しない**
```typescript
// JOINや複雑な条件がある場合は外部ファイル化
const query = `SELECT ... FROM ... JOIN ... WHERE ...`; // NG
```

❌ **SQLファイルをバラバラに配置しない**
```typescript
// queries/配下に統一的に配置
await loadSqlFile('../../../sql/findAll.sql'); // NG
```

❌ **既存コードを無理にリファクタリングしない**
```typescript
// 既存の動作しているコードは触らない（段階的に移行）
```

---

### 参照モデル

既存の実装例として、以下のファイルが参考になります：

- **Repository実装**: `backend/src/repositories/departmentRepository.ts`
  - `findAll()`メソッドでSQLファイル外部管理を実装済み
  
- **SQLファイル**: `backend/src/sql/queries/departments/findAll.sql`
  - 外部SQLファイルの例
  
- **ローダー**: `backend/src/sql/loader.ts`
  - `loadSqlFile()`関数の実装

---

## Insert/Update操作の統一化規約

### 基本原則

### 1. テーブルごとにRepository層を作成

各テーブルに対応したRepositoryファイルを作成し、そのファイル内に**insertメソッドとupdateメソッドを1つずつ**用意します。

### 2. テーブル型を引数として受け取る

insertメソッドとupdateメソッドは、**テーブルの型定義Objectを引数として受け取り**、その内容をもとにSQLクエリを動的に構築します。

### 3. 呼び出し元でテーブル型Objectを生成

Service層やController層など、呼び出し元でテーブル型のObjectを生成し、Repositoryメソッドに連携します。

### 4. Updateは既存レコード取得後に実行

Updateの場合は、**更新対象のレコードを先に取得**し、取得できた場合、更新するパラメータのみを既存Objectに反映してupdateメソッドに連携します。

### 5. 型安全性の確保

TypeScriptの型システムを活用し、コンパイル時にデータ構造の妥当性を保証します。

---

## 実装パターン

### データベーステーブル定義の参照元

**重要**: Repository層の実装やテーブル型定義を作成する際は、必ず正しいDDLファイルを参照してください。

**参照先**: `docs/design/db/ddl/`

各テーブルのDDLファイル:
- `project.sql` - projectテーブル
- `organization.sql` - organizationテーブル
- `project_task.sql` - project_taskテーブル
- その他、各テーブルごとのDDLファイル

**DO（推奨）**:
```typescript
// ✅ DDLファイルを参照してテーブル構造を確認
/**
 * projectテーブルの型定義
 * 
 * @remarks
 * DDL: docs/design/db/ddl/project.sql
 * 主キー: (organization_id, project_id)
 */
export interface Project {
  organization_id: string;  // DDLに従って正確に定義
  project_id: string;
  project_name?: string;
  // ... その他のカラム（DDL参照）
}
```

**DON'T（非推奨）**:
```typescript
// ❌ backend/reference/sql/ 配下のファイルは参照しない
// ❌ 既存コードから推測してテーブル構造を決定しない
// ❌ カラム名を勝手に変更しない（update_at → updated_atなど）
```

### ✅ 推奨: テーブルごとのRepository実装

#### Repository層の実装（projectRepository.tsの例）

```typescript
// backend/src/repositories/projectRepository.ts

import { Pool, PoolClient } from 'pg';
import { getPool } from '../database/db';
import { Project } from '../types/database';

/**
 * プロジェクトをInsert
 * @param data Insertするプロジェクトデータ（テーブル型Object）
 * @returns Insertされたプロジェクト
 */
export async function insert(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // データからカラム名と値を抽出
  const columns = Object.keys(data).filter(key => data[key] !== undefined);
  const values = columns.map(col => data[col]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築
  const query = `
    INSERT INTO projects (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * プロジェクトをUpdate
 * @param data 更新するプロジェクトデータ（テーブル型Object）
 * @returns 更新されたプロジェクト
 */
export async function update(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（id と organization_id）
  const whereColumns = ['id', 'organization_id'];
  const whereValues = whereColumns.map(col => data[col]);
  
  // 更新するカラム（WHERE句で使用するカラムを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col]);
  
  // SET句を構築 (name = $1, description = $2, ...)
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築 (id = $N AND organization_id = $N+1)
  const whereClauseStr = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE projects
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE ${whereClauseStr}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in projects table`);
  }
  
  return result.rows[0];
}

/**
 * プロジェクトを取得（Update前に使用）
 * @param id プロジェクトID
 * @param organizationId 組織ID
 * @returns プロジェクト
 */
export async function getById(
  id: string,
  organizationId: string
): Promise<Project | null> {
  const pool = getPool();
  
  const query = `
    SELECT * FROM projects
    WHERE id = $1 AND organization_id = $2
  `;
  
  const result = await pool.query(query, [id, organizationId]);
  return result.rows[0] || null;
}
```

#### 使用例（Service層からの呼び出し）

```typescript
// backend/src/services/projectService.ts

import * as projectRepository from '../repositories/projectRepository';
import { Project } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * プロジェクトを新規作成
 */
export async function createProject(
  name: string,
  description: string,
  organizationId: string
): Promise<Project> {
  // テーブル型Objectを生成
  const projectData: Project = {
    id: uuidv4(),
    name,
    description,
    organization_id: organizationId,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Repositoryのinsertメソッドを呼び出し
  return await projectRepository.insert(projectData);
}

/**
 * プロジェクトを更新
 */
export async function updateProject(
  projectId: string,
  organizationId: string,
  name?: string,
  description?: string
): Promise<Project> {
  // 既存のプロジェクトを取得
  const existingProject = await projectRepository.getById(projectId, organizationId);
  
  if (!existingProject) {
    throw new Error('Project not found');
  }
  
  // 更新するパラメータのみを既存Objectに反映
  const updatedProject: Project = {
    ...existingProject,  // 既存データを展開
    ...(name !== undefined && { name }),           // nameが指定されていれば更新
    ...(description !== undefined && { description }), // descriptionが指定されていれば更新
    updated_at: new Date()  // 更新日時を現在時刻に
  };
  
  // Repositoryのupdateメソッドを呼び出し
  return await projectRepository.update(updatedProject);
}
```

---

### ❌ 非推奨: メソッドの乱立

```typescript
// ❌ 悪い例: 同じようなInsertメソッドが乱立
export async function insertProject(data: Project): Promise<Project> {
  const query = `
    INSERT INTO projects (id, name, organization_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await pool.query(query, [data.id, data.name, data.organization_id, data.created_at, data.updated_at]);
  return result.rows[0];
}

export async function insertUser(data: User): Promise<User> {
  const query = `
    INSERT INTO users (id, username, email, organization_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await pool.query(query, [data.id, data.username, data.email, data.organization_id, data.created_at, data.updated_at]);
  return result.rows[0];
}

// ... 同じパターンが続く（DRY原則違反）
```


---

## セキュリティ考慮事項

### 1. organization_idの必須チェック

Repository層のinsertメソッドとupdateメソッドでは、必ず`organization_id`を含むテーブル型Objectを受け取ります。

```typescript
// ✅ 正しい例: organization_idを含む
const projectData: Project = {
  id: uuidv4(),
  name: 'New Project',
  description: 'Description',
  organization_id: organizationId,  // 必須
  created_at: new Date(),
  updated_at: new Date()
};
await projectRepository.insert(projectData);

// ❌ 間違った例: organization_idがない
const projectData = {
  id: uuidv4(),
  name: 'New Project',
  // organization_id が欠けている
};
```

### 2. SQLインジェクション対策

- **必須**: Parameterized Queriesを使用（上記の実装では `$1, $2, ...` を使用）
- **禁止**: テーブル名やカラム名を動的に生成する際の文字列連結

```typescript
// ✅ 正しい例: Parameterized Queries
const query = `INSERT INTO projects (name, description) VALUES ($1, $2)`;
await pool.query(query, [name, description]);

// ❌ 間違った例: 文字列連結
const query = `INSERT INTO projects (name) VALUES ('${name}')`;  // SQLインジェクションのリスク
```

---

## ベストプラクティス

### DO（推奨）

✅ **テーブルの型定義を活用する**
```typescript
import { Project } from '../types/database';
const projectData: Project = { id: uuidv4(), name, description, organization_id, ... };
await projectRepository.insert(projectData);
```

✅ **organization_idを必ず含める**
```typescript
const projectData: Project = {
  id: uuidv4(),
  name,
  description,
  organization_id: organizationId,  // 必須
  created_at: new Date(),
  updated_at: new Date()
};
```

✅ **エラーハンドリングを実装する**
```typescript
try {
  await projectRepository.insert(projectData);
} catch (error) {
  logger.error('Failed to insert project', { error, projectData });
  throw error;
}
```

### DON'T（非推奨）

❌ **個別のInsert/Updateメソッドを乱立させない**
```typescript
// 各テーブルごとにinsertProject, insertUser, insertTask... を作らない
```

❌ **文字列連結でSQLクエリを構築しない**
```typescript
// SQLインジェクションのリスク
const query = `INSERT INTO ${tableName} (name) VALUES ('${name}')`;
```

❌ **organization_idなしでDB操作しない**
```typescript
// マルチテナント分離違反
await projectRepository.update(projectData);  // organization_idが欠けている
```

❌ **undefinedの値をInsertしない**
```typescript
// undefinedは明示的に除外する
const data = { name: undefined, description: 'test' }; // NG
```


---

## 関連ドキュメント

- [TypeScript型定義規約](typescript.md) - テーブル型の定義方法
- [セキュリティ規約](security.md) - マルチテナント分離とSQLインジェクション対策
- [コーディング規約](config.md) - DRY原則とSOLID原則

---

## まとめ

### 重要なポイント

1. **テーブルごとにRepositoryファイルを作成し、insert/updateメソッドを1つずつ用意する**
2. **テーブル型Objectを引数として受け取り、動的にSQLクエリを構築する**
3. **呼び出し元でテーブル型Objectを生成してRepositoryに渡す**
4. **Updateは既存レコードを取得してから、更新パラメータを反映する**
5. **organization_idを必ず含めてマルチテナント分離を維持する**
6. **Parameterized QueriesでSQLインジェクションを防ぐ**

この規約に従うことで、保守性が高く、安全で、拡張しやすいRepository層を実現できます。

---

**作成日**: 2026-02-18  
**バージョン**: 1.0
