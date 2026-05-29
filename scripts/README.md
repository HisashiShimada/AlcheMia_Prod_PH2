# scripts/ — 開発・デプロイ・保守スクリプト一覧

mmdpf プロジェクトで使用するスクリプト群です。  
ビルド・デプロイ・証明書生成・コード品質チェックなどのユーティリティが含まれます。

---

## ディレクトリ構造

```
scripts/
├── build.js                          # オンプレ向けフルビルド（dist/ 生成）
├── check-error-codes.js              # エラーコード相互チェック
├── check-i18n-keys.js                # i18n キー整合性チェック
├── convert-ctadvanced-to-json.js     # CTAdvanced XML → JSON 変換
├── convert-xml-to-json.js            # MAIML XML → JSON 変換
├── deploy.aws.sh                     # AWS ECS デプロイ
├── deploy.onprem.sh                  # オンプレ環境フルデプロイ
├── dump-dev-schema.sh                # 開発環境 DB スキーマダンプ
├── generate-certificates.sh          # SSL / クライアント証明書一括生成
├── grep-commands.md                  # 英語メッセージ・ハードコード検出 grep コマンド集
├── alchemia-staging/                 # Alchemia ステージング環境専用スクリプト
│   ├── check-env-diff.sh             #   デプロイ前 環境変数差分チェック
│   ├── deploy.prod-verification.sh   #   本番検証環境デプロイ
│   ├── dump-staging-schema.sh        #   ステージング DB スキーマダンプ
│   ├── init-release-dir.sh           #   リリースディレクトリ初期化
│   ├── setup-ssm-ssl.sh              #   SSM SSL セットアップ
│   └── sync-to-staging.sh            #   検証環境リポジトリへ差分同期
├── deploy-onprem/                    # オンプレ向けデプロイスクリプト群
│   ├── build-and-export.sh           #   Docker イメージ ビルド & エクスポート
│   ├── install-docker.sh             #   Ubuntu への Docker インストール
│   ├── package-for-deploy.js         #   デプロイパッケージ作成（Node.js 版）
│   ├── package-for-deploy.sh         #   デプロイパッケージ作成（Bash 版）
│   └── start-onprem.sh               #   オンプレサーバ上での起動
└── result/                           # チェックスクリプトの出力先（自動生成）
    ├── error-codes-check-report.txt
    └── i18n-check-report.txt
```

---

## スクリプト詳細

### 🔨 ビルド・エクスポート

#### `build.js`

オンプレデプロイに必要な全ファイルを `dist/` に生成します。

```bash
npm run build
```

**処理内容:**
1. `dist/` をクリーン
2. `docker compose -f docker-compose.prod.yml build` でイメージをビルド
3. `docker save` で BE/FE の `.tar` ファイルを生成
4. デプロイに必要な設定ファイルをコピー（nginx 設定・証明書ディレクトリ・マイグレーション等）
5. サーバー上で実行する `deploy.sh` を生成

**出力ファイル:**
```
dist/
├── mmdpf-backend.tar
├── mmdpf-frontend.tar
├── docker-compose.prod.yml
├── .env.prod.onprem.example
├── deploy.sh
├── backend/certs/          # 空ディレクトリ（証明書はデプロイ先で配置）
└── backend/migrations/
```

---

#### `deploy-onprem/build-and-export.sh`

Docker イメージをビルドし、**gzip 圧縮された `.tar.gz`** としてエクスポートします。

```bash
chmod +x scripts/deploy-onprem/build-and-export.sh
./scripts/deploy-onprem/build-and-export.sh [オプション]
```

| オプション | 説明 |
|-----------|------|
| `--backend` | backend のみビルド & エクスポート |
| `--frontend` | frontend のみビルド & エクスポート |
| `--pull` | ベースイメージを pull してからビルド |
| `--output <dir>` | 出力先ディレクトリを指定（デフォルト: `./dist`） |

**出力ファイル:**
- `dist/mmdpf-backend.tar.gz`
- `dist/mmdpf-frontend.tar.gz`

---

### 📦 デプロイパッケージ作成

#### `deploy-onprem/package-for-deploy.js` （推奨）

オンプレサーバへの転送に必要なファイル一式をまとめた `dist/mmdpf-deploy.tar.gz` を生成します。  
`npm run package` で実行できます。

```bash
npm run package
```

**前提条件（事前に準備が必要なファイル）:**

| ファイル | 生成方法 |
|---------|---------|
| `dist/mmdpf-backend.tar.gz` | `npm run export` |
| `dist/mmdpf-frontend.tar.gz` | `npm run export` |
| `dist/mmdpf-schema.sql` | スキーマダンプ（STEP 2.5） |
| `dist/mmdpf-config-data.sql` | 設定データダンプ（STEP 2.5） |
| `.env.deploy` | 環境変数設定済みファイル |
| `backend/certs/` | SSL 証明書 |

**パッケージ内容:** サーバで `tar -xzf mmdpf-deploy.tar.gz -C ~/` で `~/mmdpf/` に展開されます。

#### `deploy-onprem/package-for-deploy.sh`

同等の処理を行う Bash スクリプト版。

```bash
chmod +x scripts/deploy-onprem/package-for-deploy.sh
./scripts/deploy-onprem/package-for-deploy.sh
```

---

### 🚀 デプロイ

#### `deploy-onprem/start-onprem.sh`

オンプレサーバ上で実行する起動スクリプトです。  
デプロイパッケージに同梱され、`~/mmdpf/scripts/` 配置後に実行します。

```bash
bash scripts/start-onprem.sh
```

**処理内容:**
1. Docker イメージのロード（`mmdpf-backend.tar.gz` / `mmdpf-frontend.tar.gz`）
2. ログディレクトリの作成（`./logs/`）
3. インフラサービスの起動（postgres / redis / swift）

---

#### `deploy.onprem.sh`

ソースリポジトリから直接オンプレ環境へフルデプロイします（ビルドも含む）。

```bash
chmod +x scripts/deploy.onprem.sh
./scripts/deploy.onprem.sh [オプション]
```

| オプション | 説明 |
|-----------|------|
| `--no-build` | イメージのビルドをスキップ |
| `--no-migrate` | DB マイグレーションをスキップ |
| `--pull` | ベースイメージを pull してからビルド |

**処理内容:** 前提条件チェック → ビルド → 既存コンテナ停止 → インフラ起動 → マイグレーション → アプリ起動 → ヘルスチェック

---

#### `deploy.aws.sh`

AWS ECS + ECR 環境へデプロイします。

```bash
chmod +x scripts/deploy.aws.sh
./scripts/deploy.aws.sh [オプション]
```

| オプション | 説明 |
|-----------|------|
| `--no-build` | イメージのビルドをスキップ |
| `--no-migrate` | DB マイグレーションをスキップ |
| `--backend` | バックエンドのみデプロイ |
| `--frontend` | フロントエンドのみデプロイ |
| `--tag <TAG>` | イメージタグを指定（デフォルト: Git コミットハッシュ） |

**前提条件:** AWS CLI 設定済み・`.env` に `AWS_ACCOUNT_ID`、`AWS_ECR_REGION`、`ECS_CLUSTER` 等が設定済みであること

---

### 🔧 サーバセットアップ

#### `deploy-onprem/install-docker.sh`

Ubuntu サーバに Docker CE と Docker Compose Plugin (v2.x) をインストールします。

```bash
chmod +x scripts/deploy-onprem/install-docker.sh
sudo bash scripts/deploy-onprem/install-docker.sh
```

**対応 OS:** Ubuntu 20.04 / 22.04 / 24.04 LTS

> **注意:** 実行後、`docker` グループの反映には `newgrp docker` の実行またはログアウト・再ログインが必要です。

---

### 🔑 証明書

#### `generate-certificates.sh`

開発環境用の SSL / クライアント証明書を一括生成します。

```bash
chmod +x scripts/generate-certificates.sh
./scripts/generate-certificates.sh
```

**生成物:**

| ファイル | 説明 |
|---------|------|
| `nginx/certs/ca/ca.crt` | CA 証明書 |
| `nginx/certs/ca/ca.key` | CA 秘密鍵 |
| `nginx/certs/server/server.crt` | サーバー証明書（Nginx 用） |
| `nginx/certs/server/server.key` | サーバー秘密鍵 |
| `nginx/certs/client/{tenant}.p12` | クライアント証明書（tenant1 / tenant2 / admin） |

クライアント証明書の PKCS#12 パスワードは `mmdpf123` です。

---

### 🗄️ データベース

#### `dump-dev-schema.sh`

ローカル開発環境の PostgreSQL スキーマ（DDL のみ）をダンプします。  
`backend/.env` の DB 接続情報を自動読み込みします。

```bash
bash scripts/dump-dev-schema.sh
```

**出力先:** `docs/deliverables/schema_dump_dev_YYYYMMDD_HHMMSS.sql`

**前提条件:** `pg_dump` のインストールと `backend/.env` の DB 接続情報設定

---

### 🔍 コード品質チェック

#### `check-error-codes.js`

バックエンド・フロントエンド間のエラーコード定義の整合性を多角的にチェックします。

```bash
node scripts/check-error-codes.js
```

**チェック内容（10 項目）:**

| # | 内容 |
|---|------|
| 1 | BE 定義コード ↔ FE 定数定義の差分 |
| 2 | BE 定義コード ↔ `ERROR_CODE_TO_KEY` マッピングの差分 |
| 3 | マッピングの翻訳キー ↔ `ja.json` の差分 |
| 4 | マッピングの翻訳キー ↔ `en.json` の差分 |
| 5 | `ja.json` の `errors.*` ↔ `en.json` の `errors.*` の差分 |
| 6 | `ja.json` に定義されているが `ERROR_CODE_TO_KEY` に未登録 |
| 7 | `en.json` に定義されているが `ERROR_CODE_TO_KEY` に未登録 |
| 8 | BE ソース内での旧コード（LEGACY_CODE_MAP キー）使用箇所 |
| 9 | FE ソース内での旧コード使用箇所 |
| 10 | BE ソースで使われているエラーコード文字列が定義に存在するか |

**出力先:** `scripts/result/error-codes-check-report.txt`

---

#### `check-i18n-keys.js`

フロントエンドのコンポーネントで使用している `t('key')` の翻訳キー整合性と、`message` 部品へのハードコードを検出します。

```bash
node scripts/check-i18n-keys.js
```

**チェック内容:**

| # | 内容 |
|---|------|
| 1 | コンポーネントで使用 & `ja.json` / `en.json` 両方に未定義 |
| 2 | コンポーネントで使用 & `ja.json` のみ未定義 |
| 3 | コンポーネントで使用 & `en.json` のみ未定義 |
| 4 | `ja.json` にあって `en.json` に未定義 |
| 5 | `en.json` にあって `ja.json` に未定義 |
| 6 | `message.error/success/...` に文字列リテラルが直接渡されている（i18n 化推奨） |

**出力先:** `scripts/result/i18n-check-report.txt`

---

### 🔄 データ変換（開発用ユーティリティ）

#### `convert-xml-to-json.js`

MAIML の XML ファイルを JSON に変換します。

```bash
node scripts/convert-xml-to-json.js
```

- 入力: `reference/specification/XRF2.maiml`
- 出力: `reference/specification/XRF2.json`

---

#### `convert-ctadvanced-to-json.js`

CTAdvanced の XML ファイルを JSON に変換します。

```bash
node scripts/convert-ctadvanced-to-json.js
```

- 入力: `reference/specification/CTAdvanced.xml`
- 出力: `reference/specification/CTAdvanced_parsed.txt`

---

### 📋 alchemia-staging/ — Alchemia ステージング環境専用

Alchemia ステージング環境（AWS ECS）向けのデプロイ・リリース管理スクリプト群です。

#### `alchemia-staging/init-release-dir.sh`

リリース作業用ディレクトリを `docs/deliverables/` 配下に初期化します。  
`check-env-diff.sh` や `sync-to-staging.sh` の実行前に使用します。

```bash
bash scripts/alchemia-staging/init-release-dir.sh \
  --to-commit   <今回リリースコミットハッシュ> \
  --from-commit <前回リリースコミットハッシュ> \
  --tag         release_YYYYMMDD_v1.0.0
```

**出力:**
- `docs/deliverables/<TAG>/release_info.md`
- `docs/deliverables/<TAG>/checklist.md`（デプロイチェックリストのコピー）

---

#### `alchemia-staging/sync-to-staging.sh`

開発リポジトリから検証環境リポジトリへ差分ファイルを同期します。

```bash
# ドライラン（差分確認のみ）
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag release_YYYYMMDD_v1.0.0 --dry-run

# 実行
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag release_YYYYMMDD_v1.0.0 \
  --dest-repo /home/user/staging/mmdpf
```

コミット情報は `init-release-dir.sh` で作成した `release_info.md` から自動取得します。

---

#### `alchemia-staging/check-env-diff.sh`

デプロイ前に `.env` 系ファイルの変更と ECS タスク定義への反映状況を照合します。

```bash
bash scripts/alchemia-staging/check-env-diff.sh \
  --release-tag release_YYYYMMDD_v1.0.0

# シークレット値も表示する場合
bash scripts/alchemia-staging/check-env-diff.sh \
  --release-tag release_YYYYMMDD_v1.0.0 --show-secrets
```

**チェック内容:** `.env` 系ファイルの ADDED / CHANGED / REMOVED 検出 + ECS タスク定義との照合（反映済み / 要確認）  
**出力先:** `docs/deliverables/<TAG>/env_diff_YYYYMMDD_HHMMSS.md`

---

#### `alchemia-staging/deploy.prod-verification.sh`

Alchemia ステージング環境（AWS ECS）の本番検証構成をデプロイします。

```bash
chmod +x scripts/alchemia-staging/deploy.prod-verification.sh
./scripts/alchemia-staging/deploy.prod-verification.sh [オプション]
```

**デプロイモード（`--mode`）:**

| モード | 説明 |
|--------|------|
| `prod-verification`（デフォルト） | ALB 追加 / nginx 無し構成（フロントエンドのみ） |
| `phase1` | ALB + NLB 共存構成（backend + nginx + frontend） |
| `all` | 上記2構成を順番にデプロイ |

**主なオプション:**

| オプション | 説明 |
|-----------|------|
| `--no-build` | ビルドをスキップ |
| `--no-push` | ECR へのプッシュをスキップ |
| `--no-deploy` | ECS デプロイをスキップ（ビルド & プッシュのみ） |
| `--migrate` | DB マイグレーションを実行（phase1 / all のみ） |
| `--wait` | ECS サービス安定化まで待機 |
| `--health` | デプロイ後にヘルスチェック（curl）を実行 |
| `--check` | デプロイせず現在の ECS サービス状態のみ確認 |
| `--tag <TAG>` | イメージタグを指定（デフォルト: `staging`） |
| `--alb-dns <DNS>` | ALB の DNS 名を直接指定 |

---

#### `alchemia-staging/dump-staging-schema.sh`

ステージング環境の PostgreSQL スキーマをダンプします。

---

#### `alchemia-staging/setup-ssm-ssl.sh`

AWS Systems Manager (SSM) 経由での SSL セットアップを行います。

---

### 📝 参考資料

#### `grep-commands.md`

英語メッセージ・ハードコードを手動で検出するための `grep` コマンド集です。  
`check-i18n-keys.js` の自動チェックで検出できないケースを補完します。

```bash
# 例: フロントエンドの message.error ハードコードを検出
grep -rn --include="*.tsx" -E "message\.(error|success|warning)\s*\(\s*'" frontend/src/
```

---

## npm スクリプトとの対応

| npm コマンド | スクリプト | 説明 |
|-------------|-----------|------|
| `npm run build` | `scripts/build.js` | オンプレ向けフルビルド |
| `npm run export` | （インライン） | Docker イメージを `dist/*.tar.gz` にエクスポート |
| `npm run export:backend` | （インライン） | backend のみエクスポート |
| `npm run export:frontend` | （インライン） | frontend のみエクスポート |
| `npm run export:pull` | （インライン） | ベースイメージ pull 付きエクスポート |
| `npm run package` | `scripts/deploy-onprem/package-for-deploy.js` | デプロイパッケージ（tar.gz）作成 |

---

## 典型的なオンプレデプロイの流れ

```
# 1. Docker イメージをビルド & エクスポート
npm run export

# 2. スキーマ・設定データをダンプ（DB更新がある場合）
bash scripts/dump-dev-schema.sh

# 3. デプロイパッケージを作成
npm run package
# → dist/mmdpf-deploy.tar.gz が生成される

# 4. サーバへ転送
scp dist/mmdpf-deploy.tar.gz user@your-server:~/

# 5. サーバ上で展開・起動
ssh user@your-server
tar -xzf mmdpf-deploy.tar.gz -C ~/
bash ~/mmdpf/scripts/start-onprem.sh
```
