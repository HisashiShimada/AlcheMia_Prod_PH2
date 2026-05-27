# 命名規則規約

## 概要

本プロジェクトにおける命名規則は、**「値の性質（固定値か可変値か）」** を基準として定めます。
スコープ（モジュールレベルかローカルかなど）は判断基準に含みません。

### 判断基準

| 値の性質 | 定義 | 命名規則 |
|---------|------|----------|
| **固定値**（実行中に変わらない） | 定数 | `UPPER_SNAKE_CASE` |
| **可変値**（実行中に変わりうる） | 変数 | `camelCase` |

---

## 基本ルール一覧

| 識別子の種類 | 命名規則 | 備考 |
|------------|----------|------|
| 変数（可変値） | `camelCase` | `let` 宣言、または再代入される `const` |
| 定数（固定値） | `UPPER_SNAKE_CASE` | プリミティブ・配列・Set・固定オブジェクト |
| 関数の戻り値を受け取る変数 | `camelCase` | 戻り値は可変値扱い |
| 関数 | `camelCase` / `PascalCase` | Reactコンポーネントは `PascalCase` |
| クラス | `PascalCase` | |
| interface / typeAlias | `PascalCase` | |
| enum | `PascalCase` | |
| enumMember | 制限なし | `UPPER_CASE` 推奨 |
| パラメータ | `camelCase` | |
| プロパティ（オブジェクトのKey） | 制限なし | DBカラム名・APIレスポンスキーを含むため |

---

## 変数（camelCase）

### 定義

**可変値**とは、実行中に値が変わりうる（または変わる可能性がある）値です。

- `let` 宣言された変数
- 関数の戻り値を受け取る識別子
- `useState` などの状態値
- ループ変数、条件によって異なる値

### 正しい例

```typescript
// ✅ let 変数（可変値）
let currentPage = 1;
let isLoading = false;

// ✅ 関数の戻り値を受け取る変数（可変値扱い）⑤
const result = await fetchProjects();
const userId = getUserId(token);
const formattedDate = formatDate(rawDate);

// ✅ 状態値（可変値）
const [selectedTab, setSelectedTab] = useState('');
const [projects, setProjects] = useState<Project[]>([]);

// ✅ ループ変数（可変値）
for (let i = 0; i < items.length; i++) { ... }
items.forEach((item) => { ... });
```

### 誤った例

```typescript
// ❌ 可変値なのに UPPER_SNAKE_CASE
let CURRENT_PAGE = 1;
const RESULT = await fetchProjects();  // 戻り値は camelCase
```

---

## 定数（UPPER_SNAKE_CASE）

### 定義

**固定値**とは、初期化後に値が変わらず、実行全体を通じて同じ値を保持する識別子です。

- 数値・文字列などのプリミティブリテラル
- 固定の配列・Set
- **固定の Key:Value を持つオブジェクト**（`const` 宣言でも中身が固定ならば定数）

### 正しい例

```typescript
// ✅ プリミティブ定数
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const API_BASE_URL = '/api/v1';
const DEFAULT_TIMEOUT = 30000;

// ✅ 固定配列・Set
const ALLOWED_EXTENSIONS = ['.xml', '.maiml', '.csv'];
const PROTOCOL_KNOWN_KEYS = new Set(['id', 'name', 'type']);

// ✅ 固定オブジェクト（Key:Value が固定）⑥
const TASK_STATUS_MAP: { [key: string]: number } = {
  'pending': 0,
  'in_progress': 1,
  'review_waiting': 2,
  'completed': 3,
  'forced_terminated': 4,
};

// ✅ 固定オブジェクト（設定値が固定）
const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
};

// ✅ ローカルスコープの固定値も UPPER_SNAKE_CASE
function buildQuery(status: string) {
  const MAX_DEPTH = 5;                              // 固定数値
  const VALID_STATUSES = new Set(['active', 'done']); // 固定 Set
  ...
}
```

### 誤った例

```typescript
// ❌ 固定値なのに camelCase
const maxFileSize = 10 * 1024 * 1024;
const taskStatusMap: { [key: string]: number } = {  // ← 固定オブジェクトは UPPER_SNAKE_CASE
  'pending': 0,
  'in_progress': 1,
};

// ❌ 固定配列なのに camelCase
const allowedExtensions = ['.xml', '.maiml'];
```

---

## ⑤ 関数の戻り値は変数（camelCase）

関数・メソッドの戻り値を受け取る識別子は、その値が将来変わりうる**可変値**として扱い、`camelCase` で命名します。

```typescript
// ✅ 非同期関数の戻り値
const projects = await projectService.findAll(organizationId);
const user = await userRepository.findById(userId);

// ✅ 同期関数の戻り値
const filtered = items.filter((item) => item.isActive);
const mapped = data.map((d) => d.id);
const errorMessage = getErrorMessage(code);

// ✅ ビルダー系の戻り値
const queryResult = db.query(sql, params);
const signedUrl = await storageService.getSignedUrl(orgId, path);

// ❌ 関数の戻り値なのに UPPER_SNAKE_CASE（NG）
const PROJECTS = await projectService.findAll(organizationId);
const USER = await userRepository.findById(userId);
```

---

## ⑥ constオブジェクト：固定か可変かの区別

`const` キーワードは「再代入禁止」を表すだけであり、オブジェクトの中身が変わらないことは保証しません。
命名は **オブジェクトの中身（Key:Value）が実行中に変わるか否か** で判断します。

### 固定オブジェクト → UPPER_SNAKE_CASE（定数）

オブジェクトのすべての Key:Value が初期化後に変更されない場合は定数として扱います。

```typescript
// ✅ ステータスコードマッピング（固定）
const TASK_STATUS_MAP: { [key: string]: number } = {
  'pending': 0,
  'in_progress': 1,
  'review_waiting': 2,
  'completed': 3,
  'forced_terminated': 4,
};

// ✅ HTTPステータスコードマッピング（固定）
const HTTP_STATUS_CODE: { [key: string]: number } = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
};

// ✅ ラベルマッピング（固定）
const ROLE_LABEL_MAP: { [key: number]: string } = {
  1: '管理者',
  2: 'マネージャー',
  3: 'ワーカー',
};

// ✅ 設定定数（固定）
const DEFAULT_QUERY_OPTIONS = {
  page: 1,
  limit: 20,
  sortOrder: 'asc',
} as const;
```

### 可変オブジェクト → camelCase（変数）

オブジェクトのプロパティが実行中に追加・変更・削除される場合は変数として扱います。

```typescript
// ✅ 実行中にプロパティが変わるオブジェクト
const queryParams: Record<string, unknown> = {};
if (status) queryParams.status = status;        // プロパティ追加
if (page) queryParams.page = page;

// ✅ 関数の戻り値を受け取るオブジェクト（可変値扱い）
const projectData = await projectRepository.findById(id);
const formValues = form.getFieldsValue();

// ✅ 状態として管理するオブジェクト
const [formData, setFormData] = useState({ name: '', description: '' });
```

### 判定フローチャート

```
const で宣言したオブジェクトの命名を決める
  ↓
中身（Key:Value）は実行中に変わる？
  ├─ 変わらない（固定）→ UPPER_SNAKE_CASE（定数）
  └─ 変わりうる（可変）→ camelCase（変数）
```

---

## その他の識別子

### 関数・メソッド

```typescript
// ✅ 通常の関数（camelCase）
function calculateTotal(items: Item[]): number { ... }
const formatDate = (date: Date): string => { ... };
export async function findAll(orgId: string) { ... }

// ✅ Reactコンポーネント（PascalCase）
const ProjectList: React.FC<Props> = ({ projects }) => { ... };
function HeaderComponent() { ... }
```

### クラス / interface / typeAlias / enum

```typescript
// ✅ クラス（PascalCase）
class ProjectRepository { ... }

// ✅ interface（PascalCase）
interface ProjectResponse { ... }

// ✅ typeAlias（PascalCase）
type ProjectStatus = 'active' | 'archived';

// ✅ enum（PascalCase）
enum ProjectStatusEnum {
  ACTIVE = 1,
  ARCHIVED = 2,
}
```

---

## ESLint設定との対応

本規約は以下の ESLint 設定ファイルと連動しています。

| ファイル | 対象 |
|---------|------|
| `backend/.eslintrc.json` | バックエンド（`backend/src/`） |
| `frontend/eslint.config.mjs` | フロントエンド（`frontend/src/`） |
| `eslint.config.js` | ルート（両方を対象） |

### 主なルール設定の対応表

| naming-convention ルール | ESLint selector | 許可フォーマット |
|------------------------|-----------------|----------------|
| 変数（可変） | `variable` | `camelCase`, `UPPER_CASE`, `PascalCase` |
| モジュールレベル定数 | `variable` + `const` + `global` | `UPPER_CASE`, `camelCase`, `PascalCase` |
| 関数 | `function` | `camelCase`, `PascalCase` |
| クラス | `class` | `PascalCase` |
| interface / typeAlias / enum | 各 selector | `PascalCase` |
| プロパティ（Keyを含む） | `property` | 制限なし |
| 分割代入（DBカラム名対応） | `variable` + `destructured` | 制限なし |

> **Note**: ESLint は `property`（オブジェクトのKey）を制限なしとしているため、オブジェクト内の Key 命名（`'pending'`, `snake_case` 等）はチェック対象外です。定数オブジェクト自体の識別子（変数名）が `UPPER_SNAKE_CASE` であることが重要です。

---

## よくある違反パターン

### パターン1: 関数の戻り値を UPPER_SNAKE_CASE にしてしまう

```typescript
// ❌ 違反
const PROJECTS = await projectService.findAll(orgId);
const USER_DATA = getUserFromToken(token);

// ✅ 正しい
const projects = await projectService.findAll(orgId);
const userData = getUserFromToken(token);
```

### パターン2: 固定オブジェクト（マッピング）を camelCase にしてしまう

```typescript
// ❌ 違反
const taskStatusMap: { [key: string]: number } = {
  'pending': 0,
  'in_progress': 1,
};

// ✅ 正しい
const TASK_STATUS_MAP: { [key: string]: number } = {
  'pending': 0,
  'in_progress': 1,
};
```

### パターン3: ローカルスコープの固定値を camelCase にしてしまう

```typescript
// ❌ 違反（ローカルでも固定値は UPPER_SNAKE_CASE）
function validate(input: string) {
  const maxLength = 255;
  const allowedChars = /^[a-zA-Z0-9_]+$/;
  ...
}

// ✅ 正しい
function validate(input: string) {
  const MAX_LENGTH = 255;
  const ALLOWED_CHARS = /^[a-zA-Z0-9_]+$/;
  ...
}
```

### パターン4: 可変オブジェクトを UPPER_SNAKE_CASE にしてしまう

```typescript
// ❌ 違反（プロパティが追加・変更される可変オブジェクト）
const QUERY_PARAMS: Record<string, unknown> = {};
if (status) QUERY_PARAMS.status = status;

// ✅ 正しい
const queryParams: Record<string, unknown> = {};
if (status) queryParams.status = status;
```

### パターン5: 固定プリミティブを camelCase にしてしまう

```typescript
// ❌ 違反
const apiBaseUrl = '/api/v1';
const maxFileSize = 10 * 1024 * 1024;

// ✅ 正しい
const API_BASE_URL = '/api/v1';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

---

## セルフチェックリスト

命名する前に以下を確認してください。

- [ ] この値は実行中に変わる（可変値）か？ → `camelCase`
- [ ] この値は実行全体を通じて固定（固定値）か？ → `UPPER_SNAKE_CASE`
- [ ] 関数・メソッドの戻り値を受け取っているか？ → `camelCase`（可変値扱い）
- [ ] `const` で宣言したオブジェクトの中身（Key:Value）は固定か？ → `UPPER_SNAKE_CASE`
- [ ] `const` で宣言したオブジェクトのプロパティが実行中に変わるか？ → `camelCase`
- [ ] Reactコンポーネント関数か？ → `PascalCase`
- [ ] クラス・interface・typeAlias・enum か？ → `PascalCase`

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-05-22 | 再作成（①変数camelCase ②定数UPPER_SNAKE_CASE ③定数=固定値 ④変数=可変値 ⑤戻り値は変数 ⑥固定オブジェクトは定数） | Cline |
| 2026-05-22 | 型注釈付き固定オブジェクトの定数パターン（パターン6）を追記 | Cline |
| 2026-05-21 | 判断基準をスコープ基準から値の性質基準に変更 | Cline |
