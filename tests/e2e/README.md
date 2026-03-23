# E2Eテスト ガイド

## 概要

[playwright-bdd](https://github.com/vitalets/playwright-bdd) を使用した BDD スタイルの E2E テストです。  
Gherkin 形式の `.feature` ファイルでシナリオを記述し、TypeScript のステップ定義と紐付けて実行します。

---

## ディレクトリ構成

```
tests/e2e/
├── features/                    # Gherkin シナリオファイル (.feature)
│   ├── 5_experiment_worker/
│   │   └── 5-1_project_selection.feature
│   └── provider/
│       └── ...
├── steps/                       # ステップ定義ファイル (.ts)
│   ├── 5_experiment_worker/
│   │   ├── common.ts            # 共通ステップ定義
│   │   └── 5-1_project_selection.ts
│   └── provider/
│       ├── common.ts
│       └── 1_provider.ts
├── fixtures/                    # テストフィクスチャ
├── scripts/
│   ├── run-e2e.js               # テスト実行ラッパースクリプト
│   └── md-to-feature.ts         # Markdownからfeatureファイルを生成するスクリプト
├── test-scenarios/              # テストシナリオ元資料 (Markdown)
├── playwright.config.ts         # Playwright + playwright-bdd 設定
├── db.ts                        # テスト用DBアクセスユーティリティ
└── README.md                    # このファイル
```

---

## テスト実行方法

### 事前準備

アプリケーションを起動しておきます（E2E テストはローカルサーバーを自動起動しません）。

```bash
# フロントエンド・バックエンドを起動
docker-compose up -d
```

---

### 全シナリオをテスト

```bash
npm run test
```

`features/` 配下の全 `.feature` ファイルが対象になります。

---

### 特定のシナリオファイルだけをテスト

```bash
npm run test -- <featureファイル名>
```

**例:**

```bash
npm run test -- 5-1_project_selection.feature
```

この場合、以下のファイルのみが使用されます:

| 種別 | 対象ファイル |
|------|------------|
| Feature | `features/**/5-1_project_selection.feature` |
| Steps | `steps/**/5-1_project_selection.ts` |
| Steps (共通) | `steps/**/common.ts` |

> **注意:** `npm run test` と引数の間に `--` が必要です（npm の仕様）。

---

### UI モードで実行（デバッグ用）

```bash
# 全シナリオを UI モードでテスト
npm run test:ui

# 特定のfeatureファイルのみ UI モードでテスト
npm run test:ui -- 5-1_project_selection.feature
```

Playwright の UI モードが起動し、テストを視覚的に確認・デバッグできます。

---

### タグで絞り込み

featureファイルのシナリオに付与された `@タグ名` を指定して絞り込めます。

```bash
# 特定のタグのみ実行
npm run test -- @3-1-1

# featureファイル + タグの組み合わせ
npm run test -- 3_data_management.feature @3-1-1

# 複数タグを OR 条件で指定（正規表現）
npm run test -- "@3-1-1|@3-2-1"
```

> **注意:** `@` で始まる引数はタグとして扱われ、Playwright の `--grep` オプションに渡されます。

---

### 特定のシナリオ名で絞り込み（grep）

bddgen で全ファイルを生成したうえでシナリオ名のキーワードで絞り込む場合は `test:grep` を使います。

```bash
npm run test:grep <シナリオ名のキーワード>
```

---

## ファイルの命名規則

`feature` ファイルと `steps` ファイルは **同一のベース名** にしてください。  
特定ファイル指定でのテスト実行時に、自動で対応する steps ファイルが読み込まれます。

```
features/5_experiment_worker/5-1_project_selection.feature
steps/5_experiment_worker/5-1_project_selection.ts   ← 同名 .ts
steps/5_experiment_worker/common.ts                   ← 共通ステップ（自動読み込み）
```

---

## 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|------------|------|
| `E2E_BASE_URL` | `http://localhost:3000/?orgId=...` | テスト対象のベース URL |
| `FEATURE_FILE` | （未設定時は全ファイル） | 実行する feature ファイル名（`run-e2e.js` が自動セット） |
| `CI` | - | CI 環境では並列実行無効・リトライ2回 |

---

## レポート

テスト実行後、HTML レポートが生成されます。

```
tests/e2e/reports/html/index.html
```

ブラウザで開いて結果を確認できます。

---

## シナリオファイルの自動生成

Markdown 形式のテストシナリオ資料から `.feature` ファイルを自動生成できます。

```bash
npm run e2e:gen-feature
```

元資料は `tests/e2e/test-scenarios/` に配置してください。
