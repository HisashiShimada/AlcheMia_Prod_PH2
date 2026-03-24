# E2Eテスト 実行手順書

> **対象読者**: Docker・Node.js の基本操作がわかる開発者  
> **テスト構成**: Playwright + playwright-bdd（Gherkin 日本語シナリオ）  
> **テスト対象**: フロント(Next.js) → バックエンド(Node.js) → DB(PostgreSQL) の一気通貫

---

## 目次

1. [前提条件の確認](#1-前提条件の確認)
2. [初回セットアップ（初回のみ）](#2-初回セットアップ初回のみ)
3. [テスト実行前の準備（毎回）](#3-テスト実行前の準備毎回)
4. [テスト用ユーザーの準備](#4-テスト用ユーザーの準備)
5. [テストの実行](#5-テストの実行)
6. [テスト結果の確認](#6-テスト結果の確認)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. 前提条件の確認

以下のツールがインストール済みであることを確認してください。

```bash
# Node.js バージョン確認（v18以上が必要）
node --version

# npm バージョン確認
npm --version

# Docker 起動確認
docker --version
docker ps
```

| ツール | 必要バージョン |
|---|---|
| Node.js | v18 以上 |
| npm | v9 以上 |
| Docker Desktop | 最新推奨 |

---

## 2. 初回セットアップ（初回のみ）

### 2-1. ルートの依存関係をインストール

```bash
# プロジェクトのルートディレクトリで実行
cd c:\Git\mmdpf

npm install
```

インストールされる主なパッケージ:

| パッケージ | 用途 |
|---|---|
| `@playwright/test` | E2E テストランナー |
| `playwright-bdd` | Gherkin → Playwright 変換 |
| `pg` | PostgreSQL 直接接続（Given/Then ステップで使用） |
| `@types/pg` | pg の TypeScript 型定義 |

### 2-2. Playwright ブラウザをインストール

```bash
# Chromium ブラウザをインストール（初回のみ・約200MB）
npx playwright install chromium
```

> **補足**: E2E テストは Chromium のみで実行します（`playwright.config.ts` で設定済み）。

---

## 3. テスト実行前の準備（毎回）

### 3-1. Docker サービスを起動

```bash
# PostgreSQL・Redis・Swift を起動
docker-compose up -d postgres redis swift

# 起動確認
docker ps
```

期待する出力（postgres が `healthy` になっていること）:

```
CONTAINER ID   IMAGE               STATUS
xxxxxxxxxxxx   postgres:17-alpine  Up X minutes (healthy)
xxxxxxxxxxxx   redis:8-alpine      Up X minutes (healthy)
```

### 3-2. バックエンドを起動

```bash
cd c:\Git\mmdpf\backend

# 依存関係インストール（初回・package.json 変更時のみ）
npm install

# 開発サーバー起動
npm run dev
```

バックエンドが起動すると以下のようなログが表示されます:

```
Server is running on port 3001
Database connection established
```

### 3-3. フロントエンドを起動

**別のターミナル**を開いて実行します:

```bash
cd c:\Git\mmdpf\frontend

# 依存関係インストール（初回・package.json 変更時のみ）
npm install

# 開発サーバー起動
npm run dev
```

フロントエンドが起動すると以下のようなログが表示されます:

```
▲ Next.js 15.x
- Local:        http://localhost:3000
```

### 3-4. 動作確認

ブラウザで `http://localhost:3000` を開き、ログイン画面が表示されることを確認します。

---

## 4. テスト用ユーザーの準備

E2E テストでは、テスト実行時に **Given ステップが自動的に DB へテストユーザーを挿入** します。  
ただし、挿入するパスワードは **bcrypt ハッシュ済みの値** である必要があります。

### 4-1. bcrypt ハッシュを生成する

以下のコマンドで `E2eTestPass!1` のハッシュを生成します:

```bash
# backend ディレクトリで実行（bcryptjs が利用可能）
cd c:\Git\mmdpf\backend

node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('E2eTestPass!1', 12).then(h => console.log(h))"
```

実行すると以下のようなハッシュが出力されます（毎回異なる値）:

```
$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4-2. ステップ定義ファイルにハッシュを設定する

`e2e/steps/organizationManagement.ts` の以下の箇所を生成したハッシュに書き換えます:

```typescript
// 変更前（プレースホルダー）
const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oG3NHUe5a';

// 変更後（4-1 で生成した値に置き換える）
const bcryptHash = '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

> **注意**: ハッシュは bcrypt の仕様上毎回異なる値が生成されますが、どの値でも `E2eTestPass!1` と照合できます。

---

## 5. テストの実行

**ルートディレクトリ** (`c:\Git\mmdpf`) で実行します。

### 5-1. 通常実行（推奨）

```powershell
# PowerShell / コマンドプロンプト どちらでも可
cd C:\Git\mmdpf

npm test
```

> ⚠️ **注意**: `frontend\` や `backend\` の中ではなく、**プロジェクトルート** (`C:\Git\mmdpf`) で実行してください。

内部で以下の2ステップが実行されます:

```
Step 1: npx bddgen --config e2e/playwright.config.ts
        .feature ファイルを Playwright テストファイルに自動変換
        出力先: .features-gen/ ディレクトリ

Step 2: npx playwright test --config e2e/playwright.config.ts
        変換されたテストファイルを Chromium で実行
```

### 5-2. UI モードで実行（デバッグ時推奨）

```powershell
# プロジェクトルートで実行
cd C:\Git\mmdpf
npm run test:ui
```

Playwright UI Mode が起動し、以下の操作が可能になります:

- 各ステップの実行をタイムラインで確認
- ステップ単位での再実行
- ブラウザのスクリーンショット確認
- ネットワークリクエストの確認

### 5-3. 特定のシナリオのみ実行

```bash
# シナリオ名で絞り込み
npx bddgen && npx playwright test --grep "新規組織を1件追加"

# 特定の feature ファイルのみ
npx bddgen && npx playwright test e2e/features/organizationManagement.feature
```

---

## 6. テスト結果の確認

### 6-1. コンソール出力

成功時:

```
Running 1 test using 1 worker

  ✓  1 [chromium] › 組織管理機能 > 新規組織を1件追加できること (12.3s)

  1 passed (13s)
```

失敗時:

```
  ✗  1 [chromium] › 組織管理機能 > 新規組織を1件追加できること (8.1s)

  1 failed

  [chromium] › 組織管理機能 > 新規組織を1件追加できること
    Error: Locator not found: table td:has-text("e2e_test_org_001")
```

### 6-2. HTML レポートを開く

```bash
# テスト実行後、以下のコマンドでブラウザでレポートを表示
npx playwright show-report e2e/reports/html
```

HTML レポートで確認できる情報:
- テストの成功/失敗状態
- 各ステップの実行時間
- 失敗時のスクリーンショット
- 失敗時のトレース（ステップごとのブラウザ操作履歴）

### 6-3. テストデータのクリーンアップ確認

テスト終了後、`After` フックが自動的に以下を削除します:

- `organization` テーブルの `organization_cd = 'e2e_test_org_001'` のレコード
- `user` テーブルの `user_id = 'e2e_provider_user_id'` のレコード

手動で確認する場合:

```sql
-- PostgreSQL に接続して確認
SELECT * FROM organization WHERE organization_cd = 'e2e_test_org_001';
-- 0 rows が返れば正常にクリーンアップされています
```

---

## 7. トラブルシューティング

### ❌ `bddgen` でエラーが出る

```
Error: No feature files found matching pattern: e2e/features/**/*.feature
```

**対処法**: カレントディレクトリがルート (`c:\Git\mmdpf`) であることを確認してください。

```bash
cd c:\Git\mmdpf
npm test
```

---

### ❌ ログイン画面が表示されない / タイムアウト

```
Error: Timeout 15000ms exceeded while waiting for selector "#userId"
```

**対処法**: フロントエンド・バックエンドが起動しているか確認してください。

```bash
# フロントエンド確認
curl http://localhost:3000

# バックエンド確認
curl http://localhost:3001/api/health
```

---

### ❌ ログイン後にプロバイダーメニューが表示されない

```
Error: Timeout 15000ms exceeded while waiting for text "組織管理"
```

**原因**: bcrypt ハッシュが正しくない可能性があります。

**対処法**: [手順 4-1](#4-1-bcrypt-ハッシュを生成する) で再度ハッシュを生成し直してください。

---

### ❌ DB 接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**対処法**: PostgreSQL コンテナが起動しているか確認してください。

```bash
docker ps | grep postgres

# 起動していない場合
docker-compose up -d postgres
```

---

### ❌ `role` テーブルに `provider` ロールが存在しない

```
roleId が undefined になり、フォールバック値 1 が使用される
```

**対処法**: テストデータを確認してください。

```sql
SELECT role_id, role_name FROM role WHERE role_name = 'provider';
```

`provider` ロールが存在しない場合は、テストデータの INSERT が必要です（`backend/sql/test_data_insert.sql` を参照）。

---

## 参考情報

| ドキュメント | 場所 |
|---|---|
| E2E 概要 | `e2e/README.md` |
| Playwright 公式ドキュメント | https://playwright.dev/docs/intro |
| playwright-bdd 公式ドキュメント | https://vitalets.github.io/playwright-bdd/ |
| Gherkin 文法リファレンス | https://cucumber.io/docs/gherkin/reference/ |
