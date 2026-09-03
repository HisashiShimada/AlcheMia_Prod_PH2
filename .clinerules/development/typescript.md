# TypeScript型定義規約

## 概要

このドキュメントは、TypeScriptプロジェクトにおける型定義の作成・管理・利用に関する規約を定義します。型の一元管理と、型安全性の向上を目的としています。

---

## 基本原則

### 1. 型定義ファイルへの集約

すべての型定義は専用の型定義ファイルに作成し、他のソースファイルはそこからimportして使用します。

### 2. Object型の明示的な型定義

型定義内で変数の型が`Object`になる場合は、そのObjectの構造を表す専用の型を定義し、その型を参照します。

### 3. 型の再利用性

共通する型は適切にネーミングして再利用可能にし、重複を避けます。

### 4. リテラルユニオン型禁止 ─ interface は基本型（string）を使う

**interface のフィールド型にリテラルユニオン型（`'ACTIVE' | 'DEPRECATED'` 等）を使ってはならない。**

#### 背景・理由

- 実行時に外部（APIレスポンス・DB・ユーザー入力）から来る値は `string` 型の変数に入るため、リテラルユニオン型と合わせるためだけの余計な型アサーション（`as 'ACTIVE' | 'DEPRECATED'`）が必要になる
- アサーションはコンパイラの型チェックを無効化するため、バグの温床になる
- 値の種類が変わるたびに型定義・使用箇所すべてに連鎖修正が発生する

#### ルール

**interface フィールドは基本型（`string`）で定義する。**  
**有効な値の集合は `as const` オブジェクト定数として専用ファイルに定義し、値の参照・比較にはそこから使う。**

```typescript
// ❌ 禁止: interface フィールドにリテラルユニオン型を使う
export interface AggregationRule {
  status: 'ACTIVE' | 'DEPRECATED';
  target_rollup: 'WORST_CASE' | 'MAJORITY' | 'AVERAGE';
}

// ✅ 正しい: interface フィールドは string、有効な値は定数オブジェクトで管理
// backend/src/enums/aggregationRule.enum.ts
export const AggregationRuleStatus = {
  ACTIVE:     'ACTIVE',
  DEPRECATED: 'DEPRECATED',
} as const;

// backend/src/types/aggregationRule.ts
export interface AggregationRule {
  status: string;
  target_rollup: string;
}

// 使用箇所
import { AggregationRuleStatus } from '../enums/aggregationRule.enum';
if (rule.status === AggregationRuleStatus.ACTIVE) { ... }
```

#### 定数ファイルの配置場所

| 対象 | バックエンド | フロントエンド |
|------|------------|--------------|
| 評価・集約ルール関連 | `backend/src/enums/aggregationRule.enum.ts` | `frontend/src/constants/aggregationRule.ts` |
| code_master のコード値 | `backend/src/enums/codeMaster.enum.ts` | `frontend/src/constants/codeMaster.ts` |

#### 判定基準

| ケース | 型 | 有効値の管理場所 |
|---|---|---|
| interface のフィールド（DBカラム・APIパラメータ等） | `string` | `as const` 定数オブジェクト |
| ユーザーに表示する表示文言 | `string` | 翻訳ファイル（locales） |
| **関数の引数（Public メソッド・外部から呼ばれる可能性があるもの）** | **`string`（`as const` 定数で管理）** | **`enums/` ファイル** |
| 関数内ローカル変数（型推論が明確な場合のみ） | リテラルユニオン型も許容 | ─ |

> ⚠️ **注意**: 関数の引数にリテラルユニオン型（`'approved' | 'ng'` 等）を使うと、将来の値追加時に呼び出し元すべての修正が必要になる。  
> Public なメソッドの引数は `string` 型にして、有効な値の集合は `as const` 定数で管理すること。

---

## ファイル構成

### バックエンド型定義の配置

```
backend/src/types/
├── database.ts          # データベーステーブルの型定義
├── api.ts              # API リクエスト/レスポンスの型定義
├── service.ts          # サービス層の型定義
├── common.ts           # 共通の型定義
├── enums.ts            # Enum型定義
└── index.ts            # 型定義のエクスポート集約
```

### データベース型定義の参照元

**重要**: データベーステーブルの型定義（`backend/src/types/database.ts`）を作成する際は、必ず以下のDDLファイルを参照してください。

**参照先**: `docs/design/db/ddl/`

各テーブルのDDLファイル:
- `project.sql` - projectテーブル
- `organization.sql` - organizationテーブル
- `project_task.sql` - project_taskテーブル
- その他、各テーブルごとのDDLファイル

**DO（推奨）**:
```typescript
// ✅ DDLファイルを参照して型定義を作成
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
  // ... その他のカラム
}
```

**DON'T（非推奨）**:
```typescript
// ❌ backend/reference/sql/ 配下のファイルは参照しない
// ❌ 既存コードから推測して型定義を作成しない
// ❌ カラム名を勝手に変更しない（created_at → create_atなど）
```

### フロントエンド型定義の配置

```
frontend/src/types/
├── api.ts              # API リクエスト/レスポンスの型定義
├── components.ts       # コンポーネントPropsの型定義
├── state.ts            # 状態管理の型定義
├── common.ts           # 共通の型定義
├── enums.ts            # Enum型定義
└── index.ts            # 型定義のエクスポート集約
```

---

## 型定義のパターン

### ✅ 推奨: 型定義ファイルへの集約

#### 型定義ファイル（types/database.ts）

```typescript
// backend/src/types/database.ts

/**
 * 組織テーブルの型定義
 */
export interface Organization {
  id: string;
  name: string;
  domain: string;
  created_at: Date;
  updated_at: Date;
  settings: OrganizationSettings; // Object型を明示的な型で定義
}

/**
 * 組織設定の型定義（Objectの構造を明示）
 */
export interface OrganizationSettings {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  features: FeatureFlags;
}

/**
 * 機能フラグの型定義（ネストされたObjectも明示）
 */
export interface FeatureFlags {
  enableAdvancedAnalytics: boolean;
  enableExport: boolean;
  maxProjects: number;
}

/**
 * プロジェクトテーブルの型定義
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  metadata: ProjectMetadata; // Object型を明示的な型で定義
  created_at: Date;
  updated_at: Date;
}

/**
 * プロジェクトメタデータの型定義
 */
export interface ProjectMetadata {
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'archived' | 'draft';
  customFields: Record<string, any>; // 動的なフィールドはRecord型
}

/**
 * ユーザーテーブルの型定義
 */
export interface User {
  id: string;
  username: string;
  email: string;
  organization_id: string;
  role_id: number;
  profile: UserProfile; // Object型を明示的な型で定義
  preferences: UserPreferences; // Object型を明示的な型で定義
  created_at: Date;
  updated_at: Date;
}

/**
 * ユーザープロフィールの型定義
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
}

/**
 * ユーザー設定の型定義
 */
export interface UserPreferences {
  notifications: NotificationPreferences;
  display: DisplayPreferences;
}

/**
 * 通知設定の型定義
 */
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
}

/**
 * 表示設定の型定義
 */
export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  itemsPerPage: number;
}
```

#### 使用する側のファイル

```typescript
// backend/src/repositories/projectRepository.ts

import { Project, ProjectMetadata } from '../types/database'; // 型定義をimport

/**
 * プロジェクトを取得
 */
export async function getProjectById(id: string, organizationId: string): Promise<Project> {
  const query = `
    SELECT * FROM projects
    WHERE id = $1 AND organization_id = $2
  `;
  const result = await pool.query(query, [id, organizationId]);
  return result.rows[0] as Project; // 型定義を使用
}

/**
 * プロジェクトメタデータを更新
 */
export async function updateProjectMetadata(
  projectId: string,
  organizationId: string,
  metadata: ProjectMetadata // 明示的な型を使用
): Promise<Project> {
  const query = `
    UPDATE projects
    SET metadata = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND organization_id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [metadata, projectId, organizationId]);
  return result.rows[0] as Project;
}
```

---

### ❌ 非推奨: 型定義の散在とany型の使用

```typescript
// ❌ 悪い例1: 型定義をファイル内に記述
// backend/src/repositories/projectRepository.ts

interface Project { // ファイル内に型定義（他のファイルで再利用不可）
  id: string;
  name: string;
  metadata: any; // Object型をanyで定義（型安全性の欠如）
}

export async function getProjectById(id: string): Promise<Project> {
  // ...
}

// ❌ 悪い例2: Object型を明示せず使用
// backend/src/services/projectService.ts

export async function updateProject(
  projectId: string,
  updates: any // 型定義なし
): Promise<any> { // 戻り値の型も不明確
  // ...
}

// ❌ 悪い例3: インライン型定義
export async function createProject(
  data: { // インライン型定義（再利用不可）
    name: string;
    description: string;
    metadata: { // ネストされたObjectもインライン
      tags: string[];
      priority: string;
    };
  }
): Promise<void> {
  // ...
}
```

---

## API型定義のパターン

### リクエスト/レスポンス型の定義

```typescript
// backend/src/types/api.ts

/**
 * プロジェクト作成リクエストの型定義
 */
export interface CreateProjectRequest {
  name: string;
  description: string;
  metadata: ProjectMetadata; // 他の型定義を再利用
}

/**
 * プロジェクト作成レスポンスの型定義
 */
export interface CreateProjectResponse {
  success: boolean;
  data: Project; // database.tsから再利用
  message: string;
}

/**
 * ページネーションパラメータの型定義
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * ページネーション結果の型定義（ジェネリック）
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

/**
 * ページネーション情報の型定義
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * エラーレスポンスの型定義
 */
export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}

/**
 * エラー詳細の型定義
 */
export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

---

## フロントエンドコンポーネントの型定義

### コンポーネントPropsの型定義

```typescript
// frontend/src/types/components.ts

import { Project, User } from './api'; // API型を再利用

/**
 * プロジェクトリストコンポーネントのProps型定義
 */
export interface ProjectListProps {
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
  loading?: boolean;
  pagination?: PaginationConfig;
}

/**
 * ページネーション設定の型定義
 */
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

/**
 * プロジェクトカードコンポーネントのProps型定義
 */
export interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  actions: ProjectCardAction[];
  style?: React.CSSProperties;
}

/**
 * プロジェクトカードアクションの型定義
 */
export interface ProjectCardAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (project: Project) => void;
  disabled?: boolean;
  danger?: boolean;
}

/**
 * モーダルコンポーネントのProps型定義
 */
export interface ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onOk?: () => void;
  footer?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}
```

---

## 共通型定義のパターン

### 再利用可能な共通型

```typescript
// backend/src/types/common.ts

/**
 * IDパラメータの型定義
 */
export interface IdParam {
  id: string;
}

/**
 * 組織IDパラメータの型定義
 */
export interface OrganizationIdParam {
  organizationId: string;
}

/**
 * タイムスタンプの型定義
 */
export interface Timestamps {
  created_at: Date;
  updated_at: Date;
}

/**
 * ソフトデリート用タイムスタンプの型定義
 */
export interface SoftDeleteTimestamps extends Timestamps {
  deleted_at: Date | null;
}

/**
 * 成功レスポンスの型定義（ジェネリック）
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 検索条件の型定義
 */
export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  pagination?: PaginationParams;
}

/**
 * 検索フィルターの型定義
 */
export interface SearchFilters {
  [key: string]: string | number | boolean | string[];
}
```

---

## Enum型定義のパターン

### 列挙型の定義

```typescript
// backend/src/types/enums.ts

/**
 * ユーザーロールの列挙型
 */
export enum UserRole {
  SYSTEM_ADMIN = 1,
  DATA_ADMIN = 2,
  EXPERIMENT_ADMIN = 3,
  EXPERIMENT_WORKER = 4,
  MI_ENGINEER = 5
}

/**
 * プロジェクトステータスの列挙型
 */
export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * タスクステータスの列挙型
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * ファイルアップロードステータスの列挙型
 */
export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error'
}
```

---

## 型定義のエクスポート集約

### index.ts による集約

```typescript
// backend/src/types/index.ts

// データベース型
export * from './database';

// API型
export * from './api';

// 共通型
export * from './common';

// Enum型
export * from './enums';

// サービス型
export * from './service';
```

### 使用例

```typescript
// backend/src/controllers/projectController.ts

// 単一のimportで複数の型を取得
import {
  Project,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectStatus,
  SuccessResponse
} from '../types';

export async function createProject(req: Request, res: Response): Promise<void> {
  const requestData: CreateProjectRequest = req.body;
  
  // ... 処理 ...
  
  const response: SuccessResponse<Project> = {
    success: true,
    data: newProject,
    message: 'Project created successfully'
  };
  
  res.json(response);
}
```

---

## ベストプラクティス

### DO（推奨）

✅ **型定義は専用の型定義ファイルに作成する**
```typescript
// backend/src/types/database.ts
export interface Project {
  // ...
}
```

✅ **Object型は明示的な型定義を作成する**
```typescript
export interface Project {
  metadata: ProjectMetadata; // Object型を明示
}

export interface ProjectMetadata {
  tags: string[];
  priority: string;
}
```

✅ **型定義をimportして使用する**
```typescript
import { Project, ProjectMetadata } from '../types/database';
```

✅ **共通の型は再利用する**
```typescript
export interface CreateProjectRequest {
  name: string;
  metadata: ProjectMetadata; // 既存の型を再利用
}
```

✅ **ジェネリック型を活用する**
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
```

✅ **Enumを活用する**
```typescript
export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active'
}
```

✅ **型のネストは適切に分離する**
```typescript
// 3階層以上のネストは別の型として定義
export interface User {
  profile: UserProfile; // 分離
  preferences: UserPreferences; // 分離
}

export interface UserProfile {
  // ...
}

export interface UserPreferences {
  notifications: NotificationPreferences; // さらに分離
}
```

### DON'T（非推奨）

❌ **ファイル内に型定義を記述しない**
```typescript
// コントローラー内に型定義（再利用不可）
interface Project {
  // ...
}
```

❌ **any型を使用しない**
```typescript
function updateProject(data: any): any { // any型使用
  // ...
}
```

❌ **Object型を明示せず使用しない**
```typescript
interface Project {
  metadata: any; // Object構造が不明
}
```

❌ **インライン型定義を乱用しない**
```typescript
function createProject(data: {
  name: string;
  metadata: {
    tags: string[];
  }
}) { // インライン型定義
  // ...
}
```

❌ **型定義の重複を作らない**
```typescript
// file1.ts
interface Project { /* ... */ }

// file2.ts
interface Project { /* ... */ } // 重複
```

---

## 型の命名規則

### インターフェース名

- **PascalCase**を使用
- 意味のある名前を付ける
- 用途を明確に示す接尾辞を使用

```typescript
// ✅ 良い例
export interface ProjectListProps { }
export interface CreateProjectRequest { }
export interface UpdateProjectResponse { }
export interface ProjectMetadata { }

// ❌ 悪い例
export interface props { } // 小文字始まり
export interface Data { } // 意味が不明確
export interface Project1 { } // 数字での識別
```

### 型エイリアス名

- **PascalCase**を使用
- Type接尾辞は不要（TypeScriptでは慣習的に使用しない）

```typescript
// ✅ 良い例
export type ProjectId = string;
export type ProjectFilter = (project: Project) => boolean;

// ❌ 悪い例
export type ProjectIdType = string; // 不要な接尾辞
export type projectId = string; // 小文字始まり
```

### Enum名

- **PascalCase**を使用
- 単数形を使用

```typescript
// ✅ 良い例
export enum ProjectStatus { }
export enum UserRole { }

// ❌ 悪い例
export enum ProjectStatuses { } // 複数形
export enum projectStatus { } // 小文字始まり
```

---

## 型のドキュメント化

### JSDocコメントの使用

```typescript
/**
 * プロジェクトテーブルの型定義
 * 
 * @remarks
 * この型は projects テーブルのスキーマに対応しています。
 * metadata フィールドは JSONB 型として保存されます。
 */
export interface Project {
  /** プロジェクトの一意識別子（UUID） */
  id: string;
  
  /** プロジェクト名（最大255文字） */
  name: string;
  
  /** プロジェクトの説明 */
  description: string;
  
  /** 所属組織のID（マルチテナント分離用） */
  organization_id: string;
  
  /** プロジェクトのメタデータ（JSONB） */
  metadata: ProjectMetadata;
  
  /** レコード作成日時 */
  created_at: Date;
  
  /** レコード更新日時 */
  updated_at: Date;
}
```

---

## よくある違反パターンと対処法

### 違反パターン1: 関数引数にインライン型定義

```typescript
// ❌ 悪い例: インライン型定義
export async function createProject(data: {
  name: string;
  description: string;
  metadata: {
    tags: string[];
    priority: string;
  }
}): Promise<void> {
  // ...
}

// ✅ 正しい例: 型定義ファイルに集約
import { CreateProjectRequest } from '../types/api';

export async function createProject(
  data: CreateProjectRequest
): Promise<void> {
  // ...
}
```

**対処法:**
1. `backend/src/types/api.ts` または `frontend/src/types/api.ts` に型定義を作成
2. 必要な箇所でimportして使用
3. 他の場所でも再利用できる形で命名

---

### 違反パターン2: コンポーネントPropsにインライン型定義

```typescript
// ❌ 悪い例: インライン型定義
const TaskList: React.FC<{
  tasks: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  onTaskClick: (taskId: string) => void;
}> = ({ tasks, onTaskClick }) => {
  // ...
};

// ✅ 正しい例: 型定義ファイルに集約
import { TaskListProps, Task } from '@/types/components';

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskClick }) => {
  // ...
};
```

**対処法:**
1. `frontend/src/types/components.ts` に型定義を作成
2. Props型とデータ型を分離して定義
3. 他のコンポーネントでも再利用できる形で命名

---

### 違反パターン3: API型定義の重複

```typescript
// ❌ 悪い例: 各ファイルで型定義を重複
// file1.ts
interface Project {
  id: string;
  name: string;
}

// file2.ts
interface Project {
  id: string;
  name: string;
}

// ✅ 正しい例: 型定義ファイルに一元化
// backend/src/types/database.ts
export interface Project {
  id: string;
  name: string;
  // ...
}

// file1.ts
import { Project } from '../types/database';

// file2.ts
import { Project } from '../types/database';
```

**対処法:**
1. 既存の型定義ファイルを検索（`grep -r "interface Project" src/types/`）
2. 既に定義されている場合は、それを再利用
3. 定義されていない場合は、適切な型定義ファイルに作成

---

## 実装前のセルフチェックリスト

型定義を作成する前に、以下を必ず確認すること：

- [ ] この型定義は既に存在しないか？（`src/types/` を検索）
- [ ] インライン型定義になっていないか？
- [ ] 型定義ファイル（`types/`）に作成しているか？
- [ ] 他の場所でも再利用できる命名か？
- [ ] Object型を明示的な型で定義しているか？（`any` を使っていないか？）
- [ ] JSDocコメントを追加しているか？

---

## 型定義作成フローチャート

```
型定義が必要になった
  ↓
既存の型定義ファイルを検索
  ↓
存在する？
  ├─ Yes → その型定義をimportして使用
  └─ No  → 新規作成
              ↓
        適切な型定義ファイルを選択
          - database.ts（DBテーブル）
          - api.ts（API型）
          - components.ts（コンポーネントProps）
          - common.ts（共通型）
              ↓
        型定義を作成
          - interface または type で定義
          - JSDocコメント追加
          - export を忘れない
              ↓
        必要な箇所でimport
              ↓
        ✅ 完了
```

---

## 関連ドキュメント

- [データベース操作規約](database.md) - データベース型の使用方法
- [コーディング規約](config.md) - インポート順序とファイル命名規則
- [セキュリティ規約](security.md) - 型安全性とセキュリティ
- [ワークフロー規約](../core/workflow.md) - 実装中の規約確認タイミング

---

## まとめ

### 重要なポイント

1. **すべての型定義は専用の型定義ファイルに集約する**
2. **Object型は明示的な型定義を作成し、any型を避ける**
3. **型定義は他のファイルからimportして使用する**
4. **共通の型は再利用し、重複を避ける**
5. **ジェネリック型を活用して柔軟性を確保する**

この規約に従うことで、型安全性が高く、保守性の良いコードベースを実現できます。

---

**作成日**: 2026-02-18  
**バージョン**: 1.0
