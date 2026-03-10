# テスト規約

## テストコードの配置

### ディレクトリ構造
```
backend/tests/
├── setup.js                          # テスト環境セットアップ
├── utils/
│   ├── tenantValidator.test.js      # バリデーターテスト
│   └── s3TenantHelper.test.js       # S3ヘルパーテスト
├── middleware/
│   ├── tenantIsolation.test.js      # テナント分離テスト
│   └── permissionCheck.test.js      # 権限チェックテスト
├── services/
│   ├── tenantService.test.js        # テナントサービステスト
│   └── permissionService.test.js    # 権限サービステスト
└── integration/
    └── api.test.js                  # 統合テスト
```

## テスト実行方法

### 全テスト実行
```bash
cd backend
npm test
```

### カバレッジ付きテスト実行
```bash
npm run test:coverage
```

### 特定のテストファイルを実行
```bash
npm test -- tenantValidator.test.js
```

### Watch モードでテスト実行
```bash
npm run test:watch
```

### ユニットテストのみ
```bash
npm run test:unit
```

### 統合テストのみ
```bash
npm run test:integration
```

## テスト種類と対象

### 1. ユニットテスト
- **対象**: 関数、コンポーネント、hooks、middleware、services
- **目的**: 個別の機能が正しく動作することを確認
- **カバレッジ目標**: 80%以上
- **配置**: tests/(utils|middleware|services)/

### 2. 統合テスト
- **対象**: APIエンドポイント、複数のモジュールの連携
- **目的**: システム全体の動作を確認
- **カバレッジ目標**: 主要フローの網羅
- **配置**: tests/integration/

### 3. E2Eテスト（将来実装予定）
- **対象**: フロントエンドとバックエンドの統合
- **目的**: ユーザーシナリオの検証
- **ツール**: Playwright（予定）

## テスト記述規約

### テストファイルの命名規則
- ユニットテスト: `[ファイル名].test.js`
- 統合テスト: `[機能名].integration.test.js`

### テスト構造
```javascript
describe('テスト対象の名前', () => {
  // セットアップ
  beforeEach(() => {
    // 各テスト前の準備
  });

  // クリーンアップ
  afterEach(() => {
    // 各テスト後の後処理
  });

  describe('メソッド/機能名', () => {
    test('期待される動作を説明', () => {
      // Arrange（準備）
      const input = 'test';
      
      // Act（実行）
      const result = functionToTest(input);
      
      // Assert（検証）
      expect(result).toBe('expected');
    });

    test('エラーケースを説明', () => {
      // エラーケースのテスト
      expect(() => {
        functionToTest(null);
      }).toThrow();
    });
  });
});
```

### テストケースの命名
- 何をテストしているかを明確に記述
- 日本語での記述を推奨
- 期待する結果を含める

**良い例:**
```javascript
test('有効な組織名を受け入れる', () => {
  // テスト実装
});

test('空の名前を拒否する', () => {
  // テスト実装
});
```

**悪い例:**
```javascript
test('test1', () => {
  // テスト実装
});

test('validation', () => {
  // テスト実装
});
```

## テストヘルパー

### グローバルヘルパー（setup.js）
- モックユーザー
- モックOrganization
- モックProject
- モックWorkspace
- モックPermission
- モックリクエスト生成
- モックレスポンス生成
- モックNext関数

### モック設定

#### データベースモック
```javascript
const { getPool } = require('../database/db');

beforeEach(() => {
  const mockQuery = jest.fn();
  getPool.mockReturnValue({
    query: mockQuery
  });
});
```

#### 監査サービスモック
```javascript
// デフォルトでモック済み
// 必要に応じてカスタマイズ可能
jest.spyOn(auditService, 'logAuditEvent')
  .mockResolvedValue({ success: true });
```

## カバレッジ目標

### 目標値
- **Branches**: 70%以上
- **Functions**: 70%以上
- **Lines**: 70%以上
- **Statements**: 70%以上

### カバレッジ対象
```javascript
// jest.config.js
collectCoverageFrom: [
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'routes/tenants/**/*.js',
    'routes/shared/**/*.js',
    'routes/provider/**/*.js'
]
```

## ベストプラクティス

### DO（推奨）
✅ 各テストは独立して実行できるようにする
✅ AAA（Arrange-Act-Assert）パターンを使用する
✅ テスト名は具体的で分かりやすくする
✅ エッジケースをテストする
✅ エラーケースをテストする
✅ モックは最小限に留める
✅ テストデータはテスト内で生成する
✅ 非同期処理は適切にawaitする

### DON'T（非推奨）
❌ テスト間で状態を共有しない
❌ 実際のAPIやDBに依存しない
❌ テストに実装の詳細を含めない
❌ 1つのテストで複数のことをテストしない
❌ console.logをテストコードに残さない
❌ タイムアウト値を長く設定しすぎない

## テストの優先順位

### 優先度: 高
1. **認証・認可**: セキュリティに関わる重要な機能
2. **マルチテナント分離**: データ漏洩を防ぐ重要な機能
3. **APIエンドポイント**: 外部インターフェース
4. **データベース操作**: データ整合性に関わる処理

### 優先度: 中
5. **バリデーション**: 入力検証
6. **エラーハンドリング**: エラー処理
7. **ユーティリティ関数**: 共通処理

### 優先度: 低
8. **UI/UX**: 見た目の調整
9. **ログ出力**: ログ記録

## トラブルシューティング

### テストが失敗する場合

#### モジュールが見つからない
```bash
npm install
```

#### タイムアウトエラー
- jest.config.jsのtestTimeoutを増やす
- 非同期処理のawaitを確認

#### データベース接続エラー
- tests/setup.jsの環境変数を確認
- モックが正しく設定されているか確認

### カバレッジが低い場合

1. **エッジケースを追加**
   - 境界値のテスト
   - null/undefinedのテスト
   - 空配列/空文字列のテスト

2. **エラーハンドリングのテストを追加**
   - try-catchブロックのテスト
   - エラー時の処理のテスト

3. **異常系のテストを追加**
   - 不正な入力のテスト
   - 権限エラーのテスト
   - リソース不足のテスト

## テストドキュメント

### 参考資料
- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-testing-and-overall-quality-practices)
- backend/TEST_GUIDE.md - 詳細なテストガイド

## 継続的な改善

### 定期的な見直し
- テストカバレッジの確認（週次）
- 失敗するテストの原因分析
- テストコードのリファクタリング

### テストの追加タイミング
- 新機能追加時
- バグ修正時（リグレッションテスト）
- リファクタリング前後

### レビュー時の確認項目
- [ ] 新しいテストが追加されているか
- [ ] カバレッジが維持/向上しているか
- [ ] すべてのテストが成功しているか
- [ ] テスト名が明確か
- [ ] エッジケースがカバーされているか

---

## E2Eテスト規約（Playwright + playwright-bdd）

### 概要

E2Eテストは **Playwright** + **playwright-bdd** を使用した BDD（Gherkin）形式で実装する。  
フロントエンド・バックエンド・PostgreSQL がすべて起動している状態でテストを実行する。

---

### ディレクトリ構造

```
e2e/
├── playwright.config.ts          # Playwright 設定
├── db.ts                         # DB接続（テストデータ検証・クリーンアップ用）
├── features/                     # Gherkin シナリオファイル（.feature）
│   └── {機能グループ}/
│       └── {シナリオID}_{機能名}.feature
├── steps/                        # Steps 実装ファイル（.ts）
│   └── {機能グループ}/
│       └── {シナリオID}_{機能名}.ts
└── test-scenarios/               # テストシナリオ一覧（業務内容定義）
    └── {番号}_{グループ名}.md
```

**ルール:**
- `.feature` ファイルと Steps ファイルは同じ名前・同じグループフォルダに配置する
- 例: `features/provider/1-1_corporation_create.feature` → `steps/provider/1-1_corporation_create.ts`
- テストが完了したファイルは `e2e/done/` へ移動して退避する（後述）

---

### feature ファイル作成前の設計ドキュメント参照（必須）

Gherkin を使用して feature ファイルを作成する際は、テストに関係する画面の以下の設計ドキュメントを **必ず事前に参照** すること。

#### ① UI設計ドキュメント（`docs/design/ui/`）

画面ごとの UI ドキュメントが格納されている。テスト対象画面の名前で対応するファイルを特定して参照する。

| ドキュメント例 | 内容 |
|---|---|
| `ui_corporation_main.md` | 会社管理画面（一覧） |
| `ui_corporation_add_dialog.md` | 会社追加ダイアログ |
| `ui_corporation_edit_dialog.md` | 会社編集ダイアログ |
| `ui_organization_main.md` | 組織管理画面（一覧） |
| `ui_login.md` | ログイン画面 |

**参照目的:**
- 画面に存在するボタン・入力フィールド・テーブル列などの UI 要素を正確に把握する
- バリデーションルール（必須/文字数制限など）を確認する
- エラーメッセージの文言を確認する
- 操作フロー（ダイアログ開閉・確認ダイアログの有無など）を確認する

#### ② DBテーブル定義（`docs/design/db/ddl/`）【必須】

DB操作（`db.query()` によるクエリ・クリーンアップ・検証）を含むステップを実装する前に、  
**必ず対象テーブルの DDL ファイルを参照**してカラム名・型・制約を確認すること。

**DDLファイル一覧（`docs/design/db/ddl/`）:**

| DDLファイル | テーブル | 主なカラム |
|---|---|---|
| `corporation.sql` | corporation（会社） | `corporation_id`, `corporation_name`, `is_active` |
| `organization.sql` | organization（組織） | `organization_id`, `organization_cd`, `organization_display_name`, `organization_email`, `chief_user_id`, `corporation_id`, `is_entry`, `use_deemed_progress`, `contract_capacity`, `contract_users`, `contract_projects`, `is_active` |
| `organization_user.sql` | organization_user | 組織ユーザー紐づけ |
| `user_authentication.sql` | user_authentication | ユーザー認証情報 |
| `role.sql` | role | ロール定義 |
| `role_permission.sql` | role_permission | ロール権限 |
| `project.sql` | project | プロジェクト |
| `project_task.sql` | project_task | プロジェクトタスク |
| `department.sql` | department | 部門 |
| `file_metadata.sql` | file_metadata | ファイルメタデータ |

**参照目的:**
- カラム名を正確に確認する（例: `organization_name` は存在せず `organization_display_name` が正しい）
- NOT NULL 制約のあるカラムに値を漏れなく指定する
- 主キー・ユニーク制約を把握して INSERT/SELECT クエリを正しく組み立てる
- タイムスタンプカラムが `create_at`/`update_at` か `created_at`/`updated_at` かを確認する

**確認フロー:**

```
DB操作ステップを実装する前に
  ↓
① docs/design/db/ddl/{テーブル名}.sql を開く
② カラム名・型・NOT NULL 制約を確認する
③ 確認したカラム名で SELECT / INSERT / UPDATE / DELETE を記述する
```

**よくある間違い（DDL を確認せずに実装した場合）:**

```typescript
// ❌ 誤り: organization テーブルに organization_name カラムは存在しない
await db.query('SELECT organization_id FROM organization WHERE organization_name = $1', [name]);

// ✅ 正しい: DDL を確認するとカラム名は organization_display_name
await db.query('SELECT organization_id FROM organization WHERE organization_display_name = $1', [name]);
```

---

#### ③ API設計ドキュメント（`docs/design/api/`）

画面で使用する API エンドポイントのドキュメントが格納されている。

| ドキュメント例 | 内容 |
|---|---|
| `api_corporation_management.md` | 会社管理 API |
| `api_organization_management.md` | 組織管理 API |
| `api_user_management.md` | ユーザー管理 API |

**参照目的:**
- 保存・更新・削除時のエンドポイントパス（`Promise.race` の URL 判定に使用）
- リクエスト/レスポンスのデータ構造を確認する
- エラーレスポンスのパターンを確認する

#### 参照フロー

```
feature ファイル作成開始
  ↓
① docs/design/ui/{画面名}.md を確認
   → UI要素・バリデーション・操作フローを把握
  ↓
② docs/design/api/{機能名}.md を確認
   → APIエンドポイントパス・レスポンスを把握
  ↓
テストシナリオ（test-scenarios/*.md）を読む
  ↓
Gherkin シナリオを作成する
```

---

### featureファイルのタグ付け規約

#### すべてのシナリオに @タグ を付けること（必須）

featureファイルのシナリオには **必ず `@タグ`** を付ける。  
タグがないシナリオは `--grep` による絞り込み実行ができないため。

**タグ命名規則:** `@{シナリオID}` （例: `@1-4-1`, `@1-4-2`）

```gherkin
# ✅ 正しい例: タグあり（--grep で絞り込み可能）
@1-4-1
シナリオ: [1-4-1] CSVダウンロードボタンをクリックすると...

# ❌ 悪い例: タグなし（--grep で絞り込みできない）
シナリオ: [1-4-4] 会社名が空のCSVをアップロードすると...
```

---

### 特定シナリオのみ実行する（--grep）

`--grep` オプションでタグを指定することで、featureファイル内の特定シナリオだけを実行できる。

#### 単一シナリオを実行

```bash
cd tests
npx bddgen --config e2e/playwright.config.ts && \
npx playwright test --config e2e/playwright.config.ts --headed --grep "@1-4-1"
```

#### 複数シナリオを実行（OR条件）

```bash
npx playwright test --config e2e/playwright.config.ts --headed --grep "@1-4-1|@1-4-2"
```

#### グループ全体を実行

```bash
npx playwright test --config e2e/playwright.config.ts --headed --grep "@1-4"
```

#### 特定シナリオを除外して実行

```bash
npx playwright test --config e2e/playwright.config.ts --headed --grep-invert "@1-4-3"
```

| やりたいこと | コマンド例 |
|---|---|
| 1-4-1 のみ | `--grep "@1-4-1"` |
| 1-4-1 と 1-4-2 | `--grep "@1-4-1|@1-4-2"` |
| 1-4-x 全部 | `--grep "@1-4"` |
| 1-4-3 を除外 | `--grep-invert "@1-4-3"` |

---

### テスト実行前提

E2Eテストを実行する前に以下がすべて起動していること：

- フロントエンド: `http://localhost:3000`
- バックエンド: `http://localhost:3001`
- PostgreSQL: 起動済み
- テスト用ユーザーが DB に存在すること（事前データ投入）

---

### After フック（クリーンアップ）

テストで作成したデータは必ず `After` フックで削除する。  
タグによって削除対象を制御できる。

```typescript
import { After, AfterAll } from 'playwright-bdd';
import { db, closeDb } from '../../db';

/** 作成したレコードを追跡する配列 */
const createdNames: string[] = [];

// @常設データ タグ以外のシナリオ: DB からレコードを削除
After({ tags: 'not @常設データタグ' }, async () => {
  for (const name of createdNames) {
    await db.query('DELETE FROM some_table WHERE name = $1', [name]);
  }
  createdNames.length = 0;
});

// @常設データ タグのシナリオ: DB 削除は行わずリストだけリセット
After({ tags: '@常設データタグ' }, async () => {
  createdNames.length = 0;
});

// 全シナリオ完了後に DB 接続プールを1回だけクローズ
AfterAll(async () => {
  await closeDb();
});
```

---

### ログイン手順

`orgId` クエリパラメータを含む URL へ遷移してログインする。

```typescript
When('プロバイダーユーザー {string} でログインする', async ({ page }, userId: string) => {
  // orgId をクエリパラメータに含めた URL へ遷移
  await page.goto('/?orgId=809cae51-cd16-4429-b2cf-bb6cab13c3f6');

  // ログインフォームが表示されるまで待機
  await page.waitForSelector('#userId', { timeout: 15000 });

  // ユーザーID・パスワードを入力してログイン
  await page.fill('#userId', userId);
  await page.fill('#password', 'パスワード');
  await page.click('button[type="submit"]');

  // ログイン完了を待機（networkidle でコンテンツが表示されるまで）
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});
```

---

### Ant Design v6 セレクタ一覧

Ant Design v6 で使用する CSS クラス名を統一して使用すること。  
バージョンによってクラス名が変わるため、下記以外のクラスを使用する場合は実際の DOM を確認すること。

| 用途 | セレクタ |
|------|---------|
| モーダル全体 | `.ant-modal` |
| モーダル 保存/OKボタン | `.ant-modal-footer .ant-btn-primary` |
| モーダル キャンセルボタン | `.ant-modal-footer .ant-btn-default` |
| テキスト入力フィールド | `.ant-input` |
| Select コンポーネント | `.ant-select` |
| Select ドロップダウン（全体） | `.ant-select-dropdown` |
| Select 非表示ドロップダウン | `.ant-select-dropdown-hidden` |
| Select オプション | `.ant-select-item-option[title="値"]` |
| フォームバリデーションエラー | `.ant-form-item-explain-error` |
| トーストメッセージ | `.ant-message-notice-wrapper` |
| Form.Item コンテナ | `.ant-form-item` |

---

### React 制御コンポーネントへの入力方法（重要）

`page.fill()` は HTML の value を変えるだけで React の `onChange` イベントをトリガーしない。  
React が状態として管理している入力フィールドには `nativeInputValueSetter` を使って強制的に `onChange` を発火させる必要がある。

```typescript
// ❌ 悪い例: React の onChange が発火しないため、入力値がフォーム状態に反映されない
await page.fill('.ant-modal .ant-input', '入力値');

// ✅ 正しい例: nativeInputValueSetter で React の onChange を強制トリガー
await page.evaluate(
  ({ selector, val }: { selector: string; val: string }) => {
    /* eslint-disable no-undef */
    const el = (document as Document).querySelector(selector) as HTMLInputElement | null;
    if (!el) return;
    const proto = (window as Window & typeof globalThis).HTMLInputElement.prototype;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    nativeInputValueSetter?.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    /* eslint-enable no-undef */
  },
  { selector: '.ant-modal .ant-input', val: '入力値' }
);
```

**適用ケース:**
- Ant Design の `<Input>` コンポーネント
- React が `value` と `onChange` で制御している全てのフォーム要素

---

### Ant Design Select の操作手順

Ant Design の Select は DOM 上でドロップダウンが常に存在するが、非表示時は `.ant-select-dropdown-hidden` クラスが付与される。  
`click()` で開いた後、`waitForFunction` で可視状態を確認してからオプションを選択する。

```typescript
// 1. Select をクリックしてドロップダウンを開く
const selectEl = page.locator('.ant-modal .ant-select');
await selectEl.waitFor({ state: 'visible', timeout: 5000 });
await selectEl.click();

// 2. ドロップダウンが visible になるまで待機
//    .ant-select-dropdown-hidden がなく、display が none でないものを確認
await page.waitForFunction(
  () => {
    /* eslint-disable no-undef */
    const dropdowns = (document as Document).querySelectorAll('.ant-select-dropdown');
    return Array.from(dropdowns).some((d) => {
      const el = d as HTMLElement;
      return (
        !el.classList.contains('ant-select-dropdown-hidden') &&
        (window as Window & typeof globalThis).getComputedStyle(el).display !== 'none'
      );
    });
    /* eslint-enable no-undef */
  },
  { timeout: 5000 }
);

// 3. 表示中のドロップダウン内の title 属性でオプションを選択
const visibleDropdown = page
  .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
  .first();
await visibleDropdown
  .locator(`.ant-select-item-option[title="選択したい値"]`)
  .click();
```

**注意:**
- `page.selectOption()` は Ant Design Select では機能しない（ネイティブ `<select>` ではないため）
- オプションは `title` 属性で特定する（テキストコンテンツよりも安定している）

---

### 待機戦略

#### ❌ 禁止: `waitForLoadState('networkidle')`

保存後の検証に `waitForLoadState('networkidle')` を使ってはならない。  
理由: トーストメッセージ（`.ant-message-notice-wrapper`）が消えるまで networkidle にならないため、  
トーストの検証を行う前に消えてしまう。

```typescript
// ❌ 悪い例
await page.click('.ant-modal-footer .ant-btn-primary');
await page.waitForLoadState('networkidle'); // トーストが消えるまで待つため検証できない
await expect(page.locator('.ant-message-notice-wrapper')).toBeVisible(); // 既に消えている
```

#### ✅ 推奨: `Promise.race()` で並列待機

保存ボタンクリック後は以下の3パターンのいずれかが発生する。  
`Promise.race()` で最初に発生したものを検知する。

```typescript
await page.click('.ant-modal-footer .ant-btn-primary');

// ケース A: POST API レスポンス（正常保存・重複エラー）
// ケース B: フロントバリデーションエラー（必須/文字数違反）
// ケース C: トーストメッセージ表示（API エラー通知）
await Promise.race([
  page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/api/エンドポイントパス') &&
        resp.request().method() === 'POST',
      { timeout: 10000 }
    )
    .catch(() => {}),
  page
    .waitForSelector('.ant-form-item-explain-error', { timeout: 10000 })
    .catch(() => {}),
  page
    .waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 })
    .catch(() => {}),
]);
```

---

### モーダルの確認・特定方法

同一ページに複数のモーダルが存在する場合や、タイトルでモーダルを特定する場合は  
`filter({ hasText: 'タイトル名' })` を使う。

```typescript
// ✅ タイトルテキストでモーダルを特定（複数モーダルが存在しても安全）
await expect(
  page.locator('.ant-modal').filter({ hasText: '会社追加' })
).toBeVisible({ timeout: 10000 });

// モーダルが閉じたことを確認
await expect(
  page.locator('.ant-modal').filter({ hasText: '会社追加' })
).not.toBeVisible({ timeout: 10000 });
```

---

### 一括アクティブ/非アクティブボタンの操作（ツールバー）

画面上部のツールバーには「追加」「アクティブ」「非アクティブ」「リロード」が並んでいる。  
テーブル行の個別切り替えボタンと区別するため、**ツールバーの親 div を基点にボタンを特定**する。

**ボタン配置（左→右）:** 追加 ｜ アクティブ ｜ 非アクティブ ｜ リロード

```typescript
// ① 「追加」ボタン右隣の「アクティブ」ボタン
const addBtn = page.locator('button:has-text("追加")');
await addBtn.waitFor({ state: 'visible', timeout: 10000 });
const toolbar = addBtn.locator('xpath=ancestor::div[1]');
await toolbar.locator('button:has-text("アクティブ")').first().click();
await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });

// ② 「リロード」ボタン左隣の「非アクティブ」ボタン
const reloadBtn = page.locator('button:has-text("リロード")');
await reloadBtn.waitFor({ state: 'visible', timeout: 10000 });
const toolbar = reloadBtn.locator('xpath=ancestor::div[1]');
await toolbar.locator('button:has-text("非アクティブ")').first().click();
await page.waitForSelector('.ant-modal-confirm', { timeout: 10000 });
```

**なぜ XPath sibling を使わないのか:**  
Ant Design のボタンは `<button>` の直接兄弟ではなくラッパー `<div>` で囲まれているため、  
`following-sibling::button` / `preceding-sibling::button` による XPath は一致しない。  
代わりに `ancestor::div[1]` でツールバー親 div を取得し、その中から `has-text` でボタンを特定する。

```typescript
// ❌ 悪い例: XPath sibling は Ant Design のボタン DOM に合わない
await addBtn.locator('xpath=following-sibling::button[contains(., "アクティブ")]').first().click();

// ✅ 正しい例: ancestor div 経由でツールバー内ボタンを特定
const toolbar = addBtn.locator('xpath=ancestor::div[1]');
await toolbar.locator('button:has-text("アクティブ")').first().click();
```

---

### テーブル行の状態確認（CSS クラスベース）

テーブルの行スタイルが `rowClassName` で制御されている場合（例: `inactive-row`）、  
`toHaveClass` / `not.toHaveClass` で状態を検証する。

```typescript
// 対象行を「その行に含まれるテキスト」で特定する
const row = page.locator('table tr', {
  has: page.locator(`td:has-text("${corporationName}")`),
});
await expect(row).toBeVisible({ timeout: 10000 });

// アクティブ: inactive-row クラスが存在しないこと
await expect(row).not.toHaveClass(/inactive-row/);

// 非アクティブ: inactive-row クラスが存在すること
await expect(row).toHaveClass(/inactive-row/, { timeout: 10000 });
```

---

### テーブルセルのテキスト確認

一覧画面に特定の値が表示されているかを検証するパターン。

```typescript
// ✅ 表示されていること
await expect(
  page.locator(`table td:has-text("${targetName}")`)
).toBeVisible({ timeout: 10000 });

// ✅ 表示されていないこと
await expect(
  page.locator(`table td:has-text("${targetName}")`)
).not.toBeVisible({ timeout: 10000 });
```

---

### エラーメッセージの検証

フォームバリデーションエラー（フロント）とトーストメッセージ（API エラー）では  
使用するセレクタが異なる。

```typescript
// フロントバリデーションエラー（Form.Item 直下のエラーテキスト）
await expect(
  page.locator(`.ant-form-item-explain-error:has-text("${errorMessage}")`)
).toBeVisible({ timeout: 5000 });

// API エラー（トーストメッセージ） または バリデーションエラー の両方を対象にしたい場合
await expect(
  page.locator(
    `.ant-message-notice-wrapper:has-text("${errorMessage}"), .ant-form-item-explain-error:has-text("${errorMessage}")`
  )
).toBeVisible({ timeout: 5000 });
```

---

### Select の初期値確認

Ant Design Select の表示テキストは `.ant-select-selector` 内の DOM が複雑なため、  
親の Form.Item コンテナを基点にテキストを確認する方が安定している。

```typescript
// ❌ 不安定: .ant-select-selector の DOM 構造に依存
await expect(page.locator('.ant-select-selector')).toHaveText('アクティブ');

// ✅ 安定: Form.Item 全体を基点に containsText で確認
const statusFormItem = page.locator('.ant-modal .ant-form-item', { hasText: '状態' });
await expect(statusFormItem).toBeVisible({ timeout: 5000 });
await expect(statusFormItem).toContainText('アクティブ', { timeout: 5000 });
```

---

### E2Eテスト ベストプラクティス

#### DO（推奨）

✅ **`nativeInputValueSetter` で React 制御入力に値をセットする**  
✅ **Ant Design Select は `waitForFunction` でドロップダウン可視確認後に選択する**  
✅ **保存後の待機は `Promise.race()` で API レスポンス・バリデーションエラー・トーストを並列監視する**  
✅ **モーダルは `filter({ hasText: 'タイトル' })` で特定する**  
✅ **テーブル行の状態は `rowClassName` に使われる CSS クラスで検証する**  
✅ **テスト後は `After` フックで必ず DB レコードを削除する**  
✅ **常設テストデータはタグ（`@タグ名`）で識別して削除対象から除外する**  
✅ **`AfterAll` で DB 接続プールを1回だけクローズする**  
✅ **DB 検証（INSERT/DELETE確認）は Playwright の `db.query()` で直接行う**

#### DON'T（非推奨）

❌ **`page.fill()` を React 制御コンポーネントに使わない** → `onChange` が発火しない  
❌ **保存後に `waitForLoadState('networkidle')` を使わない** → トーストが消えてから解決される  
❌ **`page.selectOption()` を Ant Design Select に使わない** → ネイティブ `<select>` ではない  
❌ **`.ant-select-selector` のテキストを直接検証しない** → DOM 構造が不安定  
❌ **テストで作成した DB レコードを削除せずに終了しない** → 他のテストに干渉する

---

### ステップ定義の重複エラー（Multiple definitions matched）

#### エラーの症状

```
Error: Multiple definitions matched scenario step.
Step: 前提プロバイダーのユーザID "xxx" がDB（organization_userテーブル）に存在する
  - Given '...' # e2e\steps\provider\1-1_xxx.ts:XX
  - Given '...' # e2e\steps\provider\1-2_xxx.ts:XX
```

#### 原因

複数の `.ts` ステップファイルに**同一文言の `Given/When/Then`** が定義されている。  
playwright-bdd はすべての steps ファイルを一括ロードするため、同じパターンが2か所以上存在すると上記エラーが発生する。

#### 解決策: 共通ステップファイルに集約する

複数の feature ファイルで共有するステップは、専用の **`common.ts`** ファイルに一元定義する。

**ファイル配置例:**
```
e2e/steps/
└── provider/
    ├── common.ts                   # ← 共通ステップはここに集約
    ├── 1-1_corporation_create.ts
    └── 1-2_corporation_edit.ts
```

**`common.ts` の実装例:**
```typescript
// e2e/steps/provider/common.ts
import { createBdd } from 'playwright-bdd';

const { Given } = createBdd();

Given(
  'プロバイダーのユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);
```

**各ステップファイルからは重複定義を削除する:**
```typescript
// ❌ 1-1_xxx.ts / 1-2_xxx.ts に同じ Given を書かない
Given('プロバイダーのユーザID {string} がDB...', async ({}, _userId) => { ... }); // 削除

// ✅ common.ts の1か所だけに定義する
```

> **注意:** `common.ts` を `import` する必要はない。  
> playwright-bdd は `steps/` ディレクトリ配下のファイルを自動ロードするため、  
> ファイルを配置するだけで有効になる（`playwright.config.ts` の `steps` glob 設定に従う）。

#### bddgen キャッシュが原因で同じエラーが継続する場合

ソースファイルの重複を解消してもエラーが継続する場合、`bddgen` が生成した  
`e2e/.features-gen/` フォルダに古い生成ファイルが残っていることが原因。  
`npm run test` は実行前に自動でこのフォルダを削除してから `bddgen` を再実行する。

```json
// package.json（参考）
"test": "node -e \"try{require('fs').rmSync('e2e/.features-gen',{recursive:true,force:true})}catch(e){}\" && npx bddgen ..."
```

手動で削除したい場合：

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force e2e\.features-gen -ErrorAction SilentlyContinue
npm run test
```

```bash
# Mac / Linux
rm -rf e2e/.features-gen
npm run test
```

#### DO / DON'T

✅ **複数 feature で共有するステップは `common.ts` に1か所だけ定義する**  
✅ **グループ（機能単位）ごとに `common.ts` を作成する**（例: `steps/provider/common.ts`, `steps/system/common.ts`）  
✅ **`npm run test` はキャッシュ自動削除済み（`e2e/.features-gen` を削除してから実行）**  
❌ **同じステップ文言を複数のファイルに重複定義しない**  
❌ **ソースを修正してもエラーが続く場合、`e2e/.features-gen` の削除を疑う**

---

### 完了済みテストの退避（e2e/done/）

#### 概要

テストが完了したシナリオ（`.feature` + `.ts`）は、`e2e/done/` フォルダへ移動して退避する。  
`features/` / `steps/` の外なので `npm run test` で一切読み込まれない。

#### フォルダ構造

```
e2e/
├── done/                            # ← 完了済みテストの退避先（テスト実行対象外）
│   ├── features/
│   │   └── provider/
│   │       └── 1-1_corporation_create.feature
│   └── steps/
│       └── provider/
│           └── 1-1_corporation_create.ts
├── features/                        # ← テスト実行対象
└── steps/                           # ← テスト実行対象
```

#### 退避手順（PowerShell）

```powershell
# フォルダ作成（存在しない場合）
New-Item -ItemType Directory -Force -Path "e2e\done\features\provider" | Out-Null
New-Item -ItemType Directory -Force -Path "e2e\done\steps\provider" | Out-Null

# ファイルを移動
Move-Item "e2e\features\provider\1-1_xxx.feature" "e2e\done\features\provider\1-1_xxx.feature"
Move-Item "e2e\steps\provider\1-1_xxx.ts" "e2e\done\steps\provider\1-1_xxx.ts"
```

#### 再実行したい場合

退避済みファイルを元の場所に戻すだけで再実行できる。

```powershell
Move-Item "e2e\done\features\provider\1-1_xxx.feature" "e2e\features\provider\1-1_xxx.feature"
Move-Item "e2e\done\steps\provider\1-1_xxx.ts" "e2e\steps\provider\1-1_xxx.ts"
```

#### DO / DON'T

✅ **完了したテストは `e2e/done/` へ移動して退避する**  
✅ **退避はファイルを削除せず移動する（Git 履歴が残る）**  
✅ **`features/` と `steps/` のペアを必ず同時に退避する**  
❌ **`features/` / `steps/` 配下にサブフォルダを作って退避しない** → glob `**/*.feature` にマッチしてしまう  
❌ **完了済みファイルを削除しない** → 後から参照・再実行できなくなる

---

### テストデータの準備方針（グループ登録パターン）

#### 概要

複数シナリオが同じマスターデータを前提とするグループ（例: `1-2-1`〜`1-2-6` が同じ会社データを使う）では、  
**グループ最初のシナリオの `Before` フックで UI 経由一括登録**し、  
後続シナリオは **DB UPDATE で `is_active` のみ調整**する方式を採用する。

これにより、テストデータが「実際の画面操作で作成されたもの」であることを保証できる。

#### テストデータ JSON ファイルの構造

テストデータは `e2e/fixtures/testdata/` に JSON ファイルで管理する。

```
e2e/fixtures/testdata/
├── corporation_test_data.json    # 会社マスターデータ
├── organization_test_data.json   # 組織マスターデータ
└── ...
```

**JSON の構造（会社の例）:**

```json
{
  "_comment": "group-X-X-setup: グループ最初のシナリオの Before で UI 経由一括登録するデータ",

  "group-1-2-setup": {
    "description": "[1-2] グループで使う会社を UI 経由で一括登録",
    "records": [
      { "corporation_name": "MaimlソフトAAA", "is_active": true },
      { "corporation_name": "MaimlソフトBBB", "is_active": true }
    ],
    "cleanup_names": ["E2E編集後株式会社", "E2Eキャンセル後テスト社"]
  },

  "1-2-1": {
    "description": "会社名変更テスト",
    "is_active_overrides": [
      { "corporation_name": "MaimlソフトAAA", "is_active": true }
    ],
    "cleanup_names": ["E2E編集後株式会社"]
  },
  "1-2-2": {
    "description": "アクティブ→非アクティブ変更テスト",
    "is_active_overrides": [
      { "corporation_name": "MaimlソフトBBB", "is_active": true }
    ],
    "cleanup_names": []
  }
}
```

| キー | 説明 |
|---|---|
| `group-X-X-setup` | グループ全体で共通利用するデータ。UI 経由で登録する。`is_active` は初期値（通常 `true`）。 |
| `X-X-X`（シナリオID） | 各シナリオ固有の設定。`is_active_overrides` で DB UPDATE する is_active 値を指定する。 |
| `records` | グループ登録時に UI 経由で作成するレコード一覧。 |
| `is_active_overrides` | シナリオ開始直前に DB UPDATE で適用する is_active 値。グループ登録後の差分のみ記述。 |
| `cleanup_names` | Before で事前削除する名前リスト（前回のテストで残ったゴミデータを除去するため）。 |

#### Before フックのフロー

```
グループ最初のシナリオ（例: @1-2-1）の Before:
  1. loginForSetup(page)        ← プロバイダーとしてログイン
  2. registerCorporationsViaUI(page, 'group-1-2-setup')
     ├── cleanup_names を DB DELETE
     ├── 会社管理画面へ遷移
     └── records の各会社を「追加」ダイアログ経由で登録（DB に存在する場合はスキップ）
  3. applyCorporationIsActiveOverrides('1-2-1')
     ├── cleanup_names を DB DELETE
     └── is_active_overrides を DB UPDATE で適用

後続シナリオ（例: @1-2-3）の Before:
  1. applyCorporationIsActiveOverrides('1-2-3')
     ├── cleanup_names を DB DELETE
     └── is_active = false に DB UPDATE
```

#### After フックのクリーンアップ

UI 経由で作成したレコードは `createdCorporationNames` / `createdOrganizationCds` 配列で追跡し、  
After フックで DB DELETE する。

```typescript
// After フック（クリーンアップ例）
After(async () => {
  for (const name of createdCorporationNames) {
    await db.query('DELETE FROM corporation WHERE corporation_name = $1', [name]).catch(() => {});
  }
  createdCorporationNames.length = 0;

  for (const cd of createdOrganizationCds) {
    await db.query('DELETE FROM organization WHERE organization_cd = $1', [cd]).catch(() => {});
  }
  createdOrganizationCds.length = 0;

  // is_active の復元
  for (const { name, isActive } of corpStatusRestore) {
    await db.query(
      'UPDATE corporation SET is_active = $1 WHERE corporation_name = $2',
      [isActive, name]
    ).catch(() => {});
  }
  corpStatusRestore.length = 0;
});
```

#### ヘルパー関数一覧

| 関数名 | 役割 |
|---|---|
| `loginForSetup(page)` | Before フック用ログイン（プロバイダーユーザー） |
| `registerCorporationsViaUI(page, groupKey)` | `group-X-X-setup` キーの会社を会社追加ダイアログ経由で一括登録 |
| `registerOrganizationsViaUI(page, groupKey)` | `group-X-X-setup` キーの組織を組織追加ダイアログ経由で一括登録 |
| `applyCorporationIsActiveOverrides(scenarioId)` | `is_active_overrides` を DB UPDATE で適用 |
| `applyOrganizationIsActiveOverrides(scenarioId)` | `is_active_overrides` を DB UPDATE で適用 |

#### DO / DON'T

✅ **グループ最初のシナリオ（`@1-2-1`, `@1-3-1`, `@1-6-1`, `@1-7-1`）の Before で UI 経由一括登録する**  
✅ **後続シナリオは `applyCorporationIsActiveOverrides` / `applyOrganizationIsActiveOverrides` で is_active のみ調整する**  
✅ **テストデータは JSON ファイルに集約し、コードに直書きしない**  
✅ **UI 経由で作成したレコードを `createdXxxNames` / `createdXxxCds` に追跡し After フックで削除する**  
❌ **グループ最初のシナリオ以外の Before で UI ログイン → 登録操作をしない**（テスト時間が長くなる）  
❌ **DB に直接 INSERT してテストデータを作成しない**（UI 経由で作成したデータである保証が失われる）
