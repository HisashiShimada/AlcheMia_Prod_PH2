# 開発注意事項メモ

> **作成日**: 2026-07-30  
> **対象**: mmdpf プロジェクト全開発者・AI開発エージェント  
> **目的**: 開発時の共通ルールを明示し、実装品質の統一を図る

---

## 1. レイヤードアーキテクチャ（必須）

### ルール: Controller → Service → Repository の順で呼び出す

コントローラーは必ずサービスクラスを経由してRepositoryを呼び出してください。  
直接RepositoryをControllerから呼ぶことは**禁止**です。  
処理が増えたときにサービス層がないと、ロジックが分散して保守不能になります。

```typescript
// ✅ 正しい例
// Controller → Service → Repository
class ProjectController {
  async getProject(req: Request, res: Response) {
    const result = await projectService.getProjectById(req.params.id); // Service経由
    res.json(result);
  }
}

class ProjectService {
  async getProjectById(id: string) {
    return await projectRepository.findById(id); // Repository呼び出しはServiceで
  }
}

// ❌ 間違った例（禁止）
class ProjectController {
  async getProject(req: Request, res: Response) {
    const result = await projectRepository.findById(req.params.id); // Controllerから直接Repositoryを呼ぶのは禁止
    res.json(result);
  }
}
```

---

## 2. バリデーション（必須）

### ルール: リクエストパラメータの検証はmiddlewareで実施する

コントローラー内にバリデーションロジックを書かないでください。  
バリデーションは専用のmiddlewareとして切り出してください。

```typescript
// ✅ 正しい例
// middleware/validateProject.ts
export const validateCreateProject = [
  body('projectName').notEmpty().withMessage('プロジェクト名は必須です'),
  body('organizationId').isUUID().withMessage('組織IDの形式が不正です'),
  handleValidationErrors, // エラーハンドリングmiddleware
];

// routes/projectRoutes.ts
router.post('/projects', validateCreateProject, projectController.create);

// ❌ 間違った例（禁止）
class ProjectController {
  async create(req: Request, res: Response) {
    // バリデーションをControllerに書くのは禁止
    if (!req.body.projectName) {
      return res.status(400).json({ error: 'プロジェクト名は必須です' });
    }
    // ...
  }
}
```

---

## 3. SQL管理（必須）

### ルール: pg-promiseを使用して外部ファイル化する

SQLはTypeScriptファイル内にインラインで記述せず、外部の`.sql`ファイルとして管理してください。

**ファイル配置先**: `backend/src/sql/queries/{ドメイン名}/`

```typescript
// ✅ 正しい例
// backend/src/sql/queries/projects/findById.sql に記述
// backend/src/repositories/projectRepository.ts でロード
import { loadSqlFile } from '../sql/loader';

export async function findById(id: string, organizationId: string) {
  const sql = await loadSqlFile('projects/findById.sql');
  return await pgp.oneOrNone(sql, [id, organizationId]);
}

// ❌ 間違った例（禁止）
export async function findById(id: string, organizationId: string) {
  // SQLをインラインで書くのは禁止（複雑なクエリの場合）
  const query = `
    SELECT p.*, u.username FROM projects p
    JOIN users u ON p.created_by = u.id
    WHERE p.id = $1 AND p.organization_id = $2
  `;
  return await pgp.oneOrNone(query, [id, organizationId]);
}
```

---

## 4. 型定義の使用（必須）

### ルール: インラインでオブジェクトを作らず、型定義のインスタンスを作成してから渡す

引数の箇所でインラインオブジェクトを作成することは**禁止**です。  
型定義に沿ったインスタンスを事前に作成してから渡してください。  
可読性と型安全性が大幅に向上します。

```typescript
// ✅ 正しい例
// 型定義のインスタンスを作成してから渡す
const projectData: CreateProjectRequest = {
  projectName: req.body.projectName,
  organizationId: req.user.organizationId,
  description: req.body.description,
};
const result = await projectService.createProject(projectData);

// ❌ 間違った例（禁止）
// 引数の箇所でオブジェクトを作成するのは禁止（可読性が下がる）
const result = await projectService.createProject({
  projectName: req.body.projectName,
  organizationId: req.user.organizationId,
  description: req.body.description,
});
```

---

## 5. 引数への型変換（必須）

### ルール: 引数へ渡すときに型定義に変換できるなら型定義に変換して渡す

関数・メソッドへ引数を渡す際は、型定義に変換可能な場合は必ず型定義の型に変換してから渡してください。  
引数の箇所でオブジェクトを作ると可読性が下がります。

```typescript
// ✅ 正しい例
// 事前に型変換してから渡す
const searchParams: ProjectSearchParams = {
  organizationId: req.user.organizationId,
  status: req.query.status as ProjectStatus,
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 20,
};
const projects = await projectService.searchProjects(searchParams);

// ❌ 間違った例（禁止）
// 引数の箇所で変換するのは禁止
const projects = await projectService.searchProjects(
  req.user.organizationId,
  req.query.status as ProjectStatus,
  Number(req.query.page) || 1,
  Number(req.query.limit) || 20
);
```

---

## 6. MaiMLファイル検索方式（必須）

### ルール: プロジェクトUUIDからメタデータを検索して特定する

MaiMLファイルを検索する際は、プロジェクトUUID（`project_uuid`）を基にメタデータテーブルを検索し、対象ファイルを特定してください。  
ファイル名や直接のパスで検索することは避けてください。

```typescript
// ✅ 正しい例
// プロジェクトUUIDからメタデータ経由でMaiMLファイルを特定
const metadata = await fileMetadataRepository.findByProjectUuid(projectUuid, organizationId);
if (!metadata) {
  throw new AppError(E6002, 'MAIMLファイルが見つかりません');
}
const maimlContent = await storageService.downloadFile(organizationId, metadata.filePath);

// ❌ 間違った例（禁止）
// ファイル名でダイレクトに検索するのは禁止
const maimlContent = await storageService.downloadFile(
  organizationId,
  `projects/${projectName}/${projectName}.maiml`
);
```

---

## 7. 多言語対応（必須）

### ルール: フロントエンドの文字列は必ず多言語対応を実施する

UIに表示するすべての文字列は、多言語対応ファイル（`ja.json` / `en.json`）に定義し、`useTranslation` フックを使って参照してください。  
ハードコーディングした日本語・英語文字列を直接JSX/TSXに書くことは**禁止**です。

```typescript
// ✅ 正しい例
// frontend/src/locales/ja.json に追加
// "project": { "createButton": "プロジェクト作成" }

// コンポーネントで使用
const { t } = useTranslation();
return <Button>{t('project.createButton')}</Button>;

// ❌ 間違った例（禁止）
// 直接文字列を書くのは禁止
return <Button>プロジェクト作成</Button>;
return <Button>Create Project</Button>;
```

**追加すべきファイル:**
- `frontend/src/locales/ja.json` — 日本語テキスト
- `frontend/src/locales/en.json` — 英語テキスト

---

## 8. コントローラーの責務（必須）

### ルール: コントローラーはリクエストの受け取りとレスポンスの返却のみを担当する

ビジネスロジックはすべてサービスクラスに記述してください。  
コントローラーに条件分岐や計算処理、データ変換などのロジックを記述することは**禁止**です。

```typescript
// ✅ 正しい例
// Controller: 受け取り → Service呼び出し → 返却のみ
export const createProject = async (req: Request, res: Response) => {
  const requestData: CreateProjectRequest = {
    projectName: req.body.projectName,
    organizationId: req.user.organizationId,
  };
  const project = await projectService.createProject(requestData); // ロジックはServiceへ
  res.status(201).json({ success: true, data: project });
};

// ❌ 間違った例（禁止）
export const createProject = async (req: Request, res: Response) => {
  // ControllerにロジックやDB操作を書くのは禁止
  const existingProject = await projectRepository.findByName(req.body.projectName);
  if (existingProject) {
    return res.status(409).json({ error: 'プロジェクト名が重複しています' });
  }
  const uuid = generateUUID();
  const project = await projectRepository.insert({ ...req.body, id: uuid });
  res.status(201).json({ success: true, data: project });
};
```

---

## チェックリスト（実装前に確認）

実装を開始する前に以下を確認してください：

- [ ] Controller → Service → Repository の呼び出し順になっているか
- [ ] バリデーションはmiddlewareに記述しているか
- [ ] SQLは外部`.sql`ファイルに記述しているか（pg-promise使用）
- [ ] 引数を渡す際に型定義のインスタンスを作成してから渡しているか
- [ ] 引数の箇所でインラインオブジェクトを作成していないか
- [ ] MaiMLファイルはプロジェクトUUID → メタデータ検索で特定しているか
- [ ] フロントエンドの文字列は多言語対応（ja.json / en.json）しているか
- [ ] コントローラーにロジックを書いていないか（受け取り・返却のみか）

---

## 関連ドキュメント

- `.clinerules/development/config.md` — コーディング規約全般
- `.clinerules/development/database.md` — DB操作規約（Repository層）
- `.clinerules/development/typescript.md` — TypeScript型定義規約
- `.clinerules/development/security.md` — セキュリティ規約
- `.clinerules/references/error_codes.md` — エラーコード一覧
