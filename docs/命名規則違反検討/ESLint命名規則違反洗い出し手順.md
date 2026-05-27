# ESLint 命名規則違反 洗い出し手順

## 概要

本ドキュメントは、mmdpfプロジェクトにおける命名規則違反をESLintで静的解析し、違反箇所を洗い出すための手順を記載します。

命名規則の詳細は [`naming-convention.md`](./naming-convention.md) を参照してください。

---

## 0. 命名規則規約 → ESLint Config への反映フロー

命名規則を変更・追加した際は、以下のフローに従って ESLint の設定ファイルに反映します。

```
.clinerules/development/naming-convention.md
          │
          │ ① 規約の変更内容を確認
          ▼
  命名規則の「識別子の種類」と「許可フォーマット」を整理
          │
          │ ② ESLint ルールへの変換
          ▼
  @typescript-eslint/naming-convention の selector / modifiers / format を決定
          │
          ├─ 標準の識別子（変数・関数・クラス等）→ ③a
          └─ const の固定値/可変値判定          → ③b
          │
          ▼ ③a
  eslint.config.js（ルート）
  backend/.eslintrc.json
  frontend/eslint.config.mjs
  の namingConventionRules 配列を更新
          │
          ▼ ③b
  eslint-plugin-mmdpf/rules/const-naming.js
  の classifyInit() 関数を更新
          │
          │ ④ 動作確認
          ▼
  ESLint を実行して意図した違反のみが検出されることを確認
          │
          ▼ ⑤ docs/命名規則違反検討/ にコピーを反映
  本フォルダ内の設定ファイルを最新状態に更新
```

---

### Step ① 規約の変更内容を確認する

`.clinerules/development/naming-convention.md` の「基本ルール一覧」テーブルを起点に、
変更された識別子の種類と命名規則を確認します。

| 規約で定義している識別子 | ESLint での selector |
|----------------------|---------------------|
| 変数（可変値）`let` 宣言 | `variable`（modifiers なし） |
| 定数（固定値）`const` 宣言 | `variable` + `const` modifier |
| モジュールレベルの `const` 定数 | `variable` + `const` + `global` modifiers |
| 関数の戻り値を受け取る変数 | `variable` + `const`（`mmdpf/const-naming` で判定） |
| 関数・メソッド | `function` / `method` |
| クラス | `class` |
| interface / typeAlias | `interface` / `typeAlias` |
| enum | `enum` |
| enumMember | `enumMember` |
| パラメータ | `parameter` |
| プロパティ（オブジェクトのKey） | `property` |
| 型パラメータ | `typeParameter` |
| import名 | `import` |
| 分割代入変数 | `variable` + `destructured` modifier |

---

### Step ② ESLint ルールへの変換ルール

規約の「許可フォーマット」と ESLint の `format` の対応表：

| 規約の表記 | ESLint の format 値 |
|-----------|---------------------|
| `camelCase` | `"camelCase"` |
| `UPPER_SNAKE_CASE` | `"UPPER_CASE"` |
| `PascalCase` | `"PascalCase"` |
| 制限なし | `format: null` |

**注意**: `@typescript-eslint/naming-convention` は ESLint ルール配列の**後に定義されたルールが優先**されます。
より具体的な条件（modifiers が多いルール）を後に記述することで、意図した優先順位になります。

---

### Step ③a `@typescript-eslint/naming-convention` ルールの更新手順

#### 更新対象ファイル

| 状況 | 更新するファイル |
|------|----------------|
| バック・フロント両方に影響 | `eslint.config.js`（ルート） |
| バックエンドのみ | `backend/.eslintrc.json` |
| フロントエンドのみ | `frontend/eslint.config.mjs` |

#### 更新手順（例：新しい識別子種別を追加する場合）

1. `naming-convention.md` で追加された識別子の種類と許可フォーマットを確認する
2. 対応する `selector` と `format` を決める（Step②の変換表を参照）
3. 既存ルールとの重複・矛盾がないか確認する
4. `namingConventionRules` 配列に新しいエントリを追加する

**記述例（accessor を追加する場合）：**

```javascript
// naming-convention.md に「アクセサ（getter/setter）は camelCase」と定義された場合
{
  selector: "accessor",
  format: ["camelCase"],
  leadingUnderscore: "allow",
},
```

#### 既存ルールを変更する場合の注意事項

- **modifiers の組み合わせ**でルールの優先度が決まる（modifiers が多いほど具体的 → 後勝ち）
- `filter` を使った除外ルールは必ず `format: null` にする
- 変更後は必ず実際のソースファイルに ESLint を実行して意図通りか検証する

---

### Step ③b `mmdpf/const-naming` ルールの更新手順

`mmdpf/const-naming` は `const` 変数の**右辺のASTノード種別**から固定値か可変値かを判定します。
命名規則規約に新しい判定ケースが追加された場合は、`classifyInit()` 関数を更新します。

#### 更新対象ファイル

```
eslint-plugin-mmdpf/rules/const-naming.js
```

#### 更新手順

1. `naming-convention.md` の変更内容を確認し、新しい「固定値」または「可変値」のパターンを特定する
2. `const-naming.js` の `classifyInit()` 関数内の対応する分岐に追加する

**追加例（固定値として扱う新しいパターン）：**

```javascript
// const-naming.js の classifyInit() 内に追記
// 例: 正規表現リテラル（/pattern/）を固定値として追加する場合
// ※ Literal に含まれるため通常は不要だが、明示的に追加する場合
if (type === "RegexLiteral") {
  return "constant";
}
```

**追加例（対象外として扱う新しいパターン）：**

```javascript
// 例: JSX要素（<Component />）を対象外として追加する場合
if (type === "JSXElement" || type === "JSXFragment") {
  return "skip";
}
```

#### `classifyInit()` の戻り値の意味

| 戻り値 | 意味 | 期待する命名 |
|--------|------|------------|
| `'constant'` | 固定値 | `UPPER_SNAKE_CASE` 必須 |
| `'variable'` | 可変値・関数戻り値 | `camelCase` / `PascalCase` |
| `'skip'` | 対象外 | チェックしない |

---

### Step ④ 動作確認

設定ファイル更新後は必ず以下を実行して意図した結果になることを確認します。

#### ④-1. 正常ケースの確認（違反が出ないことを確認）

```bash
# テスト用の一時ファイルを作成して確認
cat > /tmp/test_naming.ts << 'EOF'
// ✅ 正しい命名（違反が出ないはず）
const MAX_SIZE = 1024;                          // 固定値 → UPPER_SNAKE_CASE
const result = await fetchData();               // 可変値 → camelCase
const ALLOWED_LIST = ['a', 'b'];               // 固定配列 → UPPER_SNAKE_CASE
const STATUS_MAP = { ok: 1, ng: 0 };           // 固定オブジェクト → UPPER_SNAKE_CASE
EOF

npx eslint --config eslint.config.js /tmp/test_naming.ts
# → エラーが出ないことを確認
```

#### ④-2. 違反ケースの確認（違反が検出されることを確認）

```bash
cat > /tmp/test_violation.ts << 'EOF'
// ❌ 意図的な違反（検出されるはず）
const maxSize = 1024;                           // 固定値なのに camelCase → 検出されるべき
const RESULT = await fetchData();               // 可変値なのに UPPER_SNAKE_CASE → 検出されるべき
EOF

npx eslint --config eslint.config.js /tmp/test_violation.ts
# → 上記2件の違反が検出されることを確認
```

#### ④-3. プロジェクト全体への影響確認

```bash
# バックエンドへの影響確認（違反件数が変化していないか）
(cd backend && npx eslint --config .eslintrc.json "src/**/*.ts" --format json -o /tmp/eslint_backend.json 2>&1)
node scripts/parse-eslint-violations.js /tmp/eslint_backend.json | head -20

# フロントエンドへの影響確認
(cd frontend && npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}" --format json -o /tmp/eslint_frontend.json 2>&1)
node scripts/parse-eslint-violations.js /tmp/eslint_frontend.json | head -20
```

---

### Step ⑤ `docs/命名規則違反検討/` 内のコピーを更新する

プロジェクトの設定ファイルを変更した場合は、このフォルダ内の参照用コピーも同期します。

| 変更したファイル | 更新するコピー |
|----------------|--------------|
| `eslint.config.js`（ルート） | `docs/命名規則違反検討/eslint.config.js` |
| `backend/.eslintrc.json` | `docs/命名規則違反検討/backend.eslintrc.json` |
| `frontend/eslint.config.mjs` | `docs/命名規則違反検討/frontend.eslint.config.mjs` |
| `eslint-plugin-mmdpf/rules/const-naming.js` | `docs/命名規則違反検討/eslint-plugin-mmdpf/rules/const-naming.js` |
| `.clinerules/development/naming-convention.md` | `docs/命名規則違反検討/naming-convention.md` |

---

## 1. 使用するファイル構成

```
docs/命名規則違反検討/
├── naming-convention.md              # 命名規則規約
├── eslint.config.js                  # ルートESLint設定（バック・フロント両対象）
├── backend.eslintrc.json             # バックエンド用ESLint設定（backend/.eslintrc.json のコピー）
├── frontend.eslint.config.mjs        # フロントエンド用ESLint設定（frontend/eslint.config.mjs のコピー）
├── eslint-plugin-mmdpf/              # カスタムESLintプラグイン
│   ├── package.json
│   ├── index.js
│   └── rules/
│       └── const-naming.js           # const命名規則チェックルール
└── ESLint命名規則違反洗い出し手順.md   # 本ドキュメント
```

### 実際に使用するファイル（プロジェクトルート）

| ファイル | 用途 |
|---------|------|
| `eslint.config.js` | ルートから両方のソースを対象に実行する際に使用 |
| `backend/.eslintrc.json` | バックエンドのみを対象に実行する際に使用 |
| `frontend/eslint.config.mjs` | フロントエンドのみを対象に実行する際に使用 |
| `eslint-plugin-mmdpf/` | `mmdpf/const-naming` カスタムルールの実体 |
| `scripts/run-eslint-violations.mjs` | Node.js API で違反一覧を抽出するスクリプト |
| `scripts/parse-eslint-result.js` | JSON形式の結果ファイルを解析するスクリプト |
| `scripts/parse-eslint-violations.js` | 違反一覧を整形して出力するスクリプト |

---

## 2. 前提条件・事前準備

### 2.1 Node.js バージョン確認

```bash
node --version
# v24.0.0 以上推奨
```

### 2.2 依存パッケージのインストール

プロジェクトルートで実行：

```bash
npm install
```

### 2.3 カスタムプラグインのリンク設定確認

`eslint-plugin-mmdpf` はプロジェクトローカルのカスタムプラグインです。
`package.json` に以下の設定が含まれていることを確認してください。

```json
{
  "devDependencies": {
    "eslint-plugin-mmdpf": "file:eslint-plugin-mmdpf"
  }
}
```

未設定の場合は以下を実行：

```bash
npm install --save-dev eslint-plugin-mmdpf
```

---

## 3. ESLint実行方法

### 方法① ルートのeslint.config.jsを使って両方対象に実行

バックエンド・フロントエンド両方の違反を一括で洗い出す方法です。

```bash
# ルートで実行（backend/src と frontend/src の両方が対象）
npx eslint --config eslint.config.js "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}" 2>&1
```

**結果をファイルに保存する場合：**

```bash
npx eslint --config eslint.config.js "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}" --format json -o docs/eslint_result.json 2>&1
```

---

### 方法② バックエンドのみ実行

```bash
cd backend
npx eslint --config .eslintrc.json "src/**/*.ts" 2>&1
```

**JSON形式で出力：**

```bash
cd backend
npx eslint --config .eslintrc.json "src/**/*.ts" --format json -o ../docs/eslint_result_backend.json 2>&1
```

---

### 方法③ フロントエンドのみ実行

```bash
cd frontend
npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}" 2>&1
```

**JSON形式で出力：**

```bash
cd frontend
npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}" --format json -o ../docs/eslint_result_frontend.json 2>&1
```

---

### 方法④ Node.js APIスクリプトで違反一覧を抽出（推奨）

`scripts/run-eslint-violations.mjs` を使うと、`mmdpf/const-naming` 違反のみを抽出して一覧化できます。

```bash
# バックエンドを対象に実行
node scripts/run-eslint-violations.mjs backend/src

# フロントエンドを対象に実行
node scripts/run-eslint-violations.mjs frontend/src

# バックエンドを対象に実行し、結果をファイルに保存
node scripts/run-eslint-violations.mjs backend/src docs/violations_backend.txt

# フロントエンドを対象に実行し、結果をファイルに保存
node scripts/run-eslint-violations.mjs frontend/src docs/violations_frontend.txt
```

**出力例：**

```
controllers/authController.ts
  L42: 'taskStatusMap' は固定値のため UPPER_SNAKE_CASE で命名してください（例: TASK_STATUS_MAP）。
  L87: 'maxRetryCount' は固定値のため UPPER_SNAKE_CASE で命名してください（例: MAX_RETRY_COUNT）。
services/projectService.ts
  L15: 'RESULT' は関数の戻り値または可変値のため camelCase で命名してください（例: result）。

TOTAL: 3 violation(s)
```

---

## 4. 違反結果の集計・整形

### 4.1 JSON結果ファイルからサマリーを生成

`docs/eslint_result.json` が存在する場合：

```bash
node scripts/parse-eslint-result.js
```

**出力ファイル：** `docs/eslint_violations.txt`

**出力フォーマット：**

```
=== mmdpf/const-naming 違反サマリー ===
TOTAL: 156
  shouldBeUpperSnakeCase: 120
  shouldBeCamelCase: 36

=== ファイル別一覧 ===

backend/src/controllers/authController.ts: 3件
  L42 [shouldBeUpperSnakeCase] 'taskStatusMap' は固定値のため ...
  L87 [shouldBeUpperSnakeCase] 'maxRetryCount' は固定値のため ...
  L103 [shouldBeCamelCase] 'RESULT' は関数の戻り値または可変値のため ...
```

### 4.2 違反一覧を整形表示

```bash
node scripts/parse-eslint-violations.js docs/eslint_result.json
```

---

## 5. 各ESLint設定ファイルの役割

### 5.1 ルート `eslint.config.js`

- **対象**: `backend/src/**/*.ts` および `frontend/src/**/*.{ts,tsx}`
- **形式**: ESLint Flat Config（ES Module形式）
- **使用ルール**:
  - `@typescript-eslint/naming-convention` — TypeScript識別子の命名規則
  - `mmdpf/const-naming` — const変数の固定値/可変値判定による命名規則

### 5.2 `backend/.eslintrc.json`

- **対象**: `backend/src/**/*.ts`
- **形式**: Legacy Config（JSON形式）
- **使用ルール**: ルートと同一の命名規則設定
- **ignorePatterns**: `dist/`, `node_modules/`, `tests/`

### 5.3 `frontend/eslint.config.mjs`

- **対象**: `frontend/src/**/*.{ts,tsx}`
- **形式**: ESLint Flat Config（ES Module形式）
- **追加ルール**: Next.js推奨ルール、React Hooks推奨ルール
- **使用ルール**: ルートと同一の命名規則設定

---

## 6. カスタムプラグイン `mmdpf/const-naming` の仕組み

### 6.1 概要

`@typescript-eslint/naming-convention` は命名形式（camelCase/UPPER_CASE等）を検証しますが、**「どの形式を使うべきか」の判断（固定値か可変値か）はできません**。

そこで `mmdpf/const-naming` が **右辺のASTノード種別** を解析し、より精密な判定を行います。

### 6.2 判定ロジック

| 右辺の型 | 分類 | 期待する命名 |
|---------|------|------------|
| `Literal`（数値・文字列・boolean・null・正規表現） | 固定値 | `UPPER_SNAKE_CASE` |
| `TemplateLiteral`（バッククォート文字列） | 固定値 | `UPPER_SNAKE_CASE` |
| `BinaryExpression`（`10 * 1024` 等） | 固定値 | `UPPER_SNAKE_CASE` |
| `UnaryExpression`（`-1` 等） | 固定値 | `UPPER_SNAKE_CASE` |
| `ArrayExpression`（`[1, 2, 3]` 等） | 固定値 | `UPPER_SNAKE_CASE` |
| `ObjectExpression`（`{ key: value }` 等） | 固定値 | `UPPER_SNAKE_CASE` |
| `NewExpression`（`new Set([...])` 等） | 固定値 | `UPPER_SNAKE_CASE` |
| `CallExpression`（`fn()` 等） | 可変値 | `camelCase` / `PascalCase` |
| `AwaitExpression`（`await fn()` 等） | 可変値 | `camelCase` / `PascalCase` |
| `MemberExpression`（`obj.prop` 等） | 可変値 | `camelCase` / `PascalCase` |
| `Identifier`（他の変数を代入） | 可変値 | `camelCase` / `PascalCase` |
| `ConditionalExpression`（三項演算子） | 可変値 | `camelCase` / `PascalCase` |

### 6.3 チェック対象外

以下は `mmdpf/const-naming` のチェック対象外です：

- `let` 宣言（`@typescript-eslint/naming-convention` が対応）
- 分割代入 `const { a, b } = obj`（DBカラム名 `snake_case` を含むため）
- アロー関数・通常関数の定義 `const fn = () => {}`
- Tagged Template（styled-components 等）`const S = styled.div\`...\``
- TypeScript型アサーション `const x = value as Type`
- エラーコード定数 `E1001`〜`E9999`

### 6.4 違反メッセージの種類

| messageId | 内容 |
|-----------|------|
| `shouldBeUpperSnakeCase` | 固定値なのに `camelCase` で命名されている（→ `UPPER_SNAKE_CASE` に変更すべき） |
| `shouldBeCamelCase` | 可変値/戻り値なのに `UPPER_SNAKE_CASE` で命名されている（→ `camelCase` に変更すべき） |

---

## 7. `@typescript-eslint/naming-convention` ルール設定の説明

本プロジェクトで定義しているルールの優先度と意図を説明します。
（ESLintは**後に定義されたルールが優先**されます）

| 順序 | selector | modifiers | 許可フォーマット | 意図 |
|------|---------|-----------|----------------|------|
| 1 | `default` | - | `camelCase` | 全識別子のデフォルト |
| 2 | `variable` | - | `camelCase` | let変数は可変値 |
| 3 | `variable` | `const` | `camelCase`, `UPPER_CASE`, `PascalCase` | const変数は両方許容 |
| 4 | `variable` | `const`, `global` | `UPPER_CASE`, `camelCase`, `PascalCase` | モジュールレベル定数 |
| 5 | `variable` | `const`, `global` + filter | `null`（制限なし） | エラーコード `E1001`〜`E9999` の除外 |
| 6 | `variable` | `destructured` | `null`（制限なし） | 分割代入の除外（DBカラム名対応） |
| 7 | `variable` | `const`, `global`, `destructured` | `null`（制限なし） | モジュールレベル分割代入の除外 |
| 8 | `import` | - | `camelCase`, `PascalCase`, `UPPER_CASE` | import名 |
| 9 | `function` | - | `camelCase`, `PascalCase` | 関数・Reactコンポーネント |
| 10 | `parameter` | - | `camelCase` | 引数 |
| 11 | `method` | - | `camelCase`, `PascalCase` | メソッド |
| 12 | `accessor` | - | `camelCase` | getter/setter |
| 13 | `class` | - | `PascalCase` | クラス |
| 14 | `interface` | - | `PascalCase` | インターフェース |
| 15 | `typeAlias` | - | `PascalCase` | 型エイリアス |
| 16 | `enum` | - | `PascalCase` | enum |
| 17 | `enumMember` | - | `null`（制限なし） | enumメンバー |
| 18 | `property` | - | `null`（制限なし） | プロパティ・オブジェクトキー（DBカラム名含む） |
| 19 | `typeParameter` | - | `PascalCase` | 型パラメータ（T, TData等） |

---

## 8. 違反結果の見方と修正方針

### 8.1 `shouldBeUpperSnakeCase` 違反

**意味**: 固定値（リテラル・配列・オブジェクト・`new`式等）なのに `camelCase` で命名されている。

**修正方法**: 変数名を `UPPER_SNAKE_CASE` に変更する。

```typescript
// ❌ 違反
const maxFileSize = 10 * 1024 * 1024;
const taskStatusMap = { pending: 0, in_progress: 1 };
const allowedExtensions = ['.xml', '.maiml'];

// ✅ 修正後
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TASK_STATUS_MAP = { pending: 0, in_progress: 1 };
const ALLOWED_EXTENSIONS = ['.xml', '.maiml'];
```

### 8.2 `shouldBeCamelCase` 違反

**意味**: 関数の戻り値・可変値（`await`・関数呼び出し等）なのに `UPPER_SNAKE_CASE` で命名されている。

**修正方法**: 変数名を `camelCase` に変更する。

```typescript
// ❌ 違反
const PROJECTS = await projectService.findAll(organizationId);
const USER_DATA = getUserFromToken(token);

// ✅ 修正後
const projects = await projectService.findAll(organizationId);
const userData = getUserFromToken(token);
```

### 8.3 修正時の注意事項

- **参照箇所もすべて変更する**: 変数名を変更した場合、その変数を参照している箇所もすべて更新する。
- **型定義への影響**: 型エイリアスや interface のプロパティ名には影響しない（`property` は制限なし）。
- **テストファイルの確認**: テストファイル内でも同名の変数が定義されている場合は修正が必要。

---

## 9. よくあるトラブルと対処法

### Q1. ESLintが `Cannot find module 'eslint-plugin-mmdpf'` エラーを出す

**原因**: カスタムプラグインがインストールされていない。

**対処**:
```bash
npm install
# または
npm install --save-dev eslint-plugin-mmdpf
```

### Q2. `parserOptions.project` 関連のエラーが出る

**原因**: TypeScriptの `tsconfig.json` が見つからない。

**対処**:
```bash
# バックエンドの場合
cd backend
npx eslint --config .eslintrc.json "src/**/*.ts"

# フロントエンドの場合
cd frontend
npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}"
```

### Q3. 結果が多すぎて見づらい

**対処**: `run-eslint-violations.mjs` で `mmdpf/const-naming` のみを抽出する。

```bash
node scripts/run-eslint-violations.mjs backend/src docs/violations_backend.txt
node scripts/run-eslint-violations.mjs frontend/src docs/violations_frontend.txt
```

### Q4. `@typescript-eslint/naming-convention` と `mmdpf/const-naming` が矛盾した結果を出す

**原因**: `@typescript-eslint/naming-convention` は命名形式のみ検証するため、`mmdpf/const-naming` とは異なる観点でエラーを出すことがある。

**対処**: `mmdpf/const-naming` の判定を優先する。`@typescript-eslint/naming-convention` のエラーは、`mmdpf/const-naming` に従って修正すれば自動的に解消される場合が多い。

---

## 10. 付録：スクリプト一覧

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `scripts/run-eslint-violations.mjs` | Node.js APIで `mmdpf/const-naming` 違反を抽出 | `node scripts/run-eslint-violations.mjs <対象ディレクトリ> [出力ファイル]` |
| `scripts/parse-eslint-result.js` | JSON結果からサマリーを生成 | `node scripts/parse-eslint-result.js` |
| `scripts/parse-eslint-violations.js` | JSON結果を整形表示 | `node scripts/parse-eslint-violations.js <JSONファイル>` |

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-05-27 | 初版作成 | Cline |
