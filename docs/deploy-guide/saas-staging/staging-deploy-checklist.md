# 検証環境デプロイ手順書（SaaS版 / AWS ECS Fargate）

- **作成日**: 2026-04-21
- **対象環境**: 検証環境（`alchemia-staging` ECS クラスター）
- **デプロイ方式**: ファイル同期（`sync-to-staging.sh`）→ ECR イメージプッシュ → ECS ローリングデプロイ

---

## 目次

1. [ビルド確認](#step-1-ビルド確認)
2. [リリース対象の確認 / リリースディレクトリの初期化](#step-2-リリース対象の確認--リリースディレクトリの初期化)
3. [リリースノートの作成](#step-3-リリースノートの作成)
4. [計画書の削除](#step-4-計画書の削除)
5. [差分ファイルの確認（ドライラン）](#step-5-差分ファイルの確認ドライラン)
6. [DBのテーブル構成の確認](#step-6-dbのテーブル構成の確認)
7. [環境変数の確認](#step-7-環境変数の確認)
8. [開発メンバーへのアナウンス](#step-8-開発メンバーへのアナウンス)
9. [島田さんへの連絡（デプロイ開始）](#step-9-島田さんへの連絡デプロイ開始)
10. [デプロイスクリプトの実行](#step-10-デプロイスクリプトの実行)
11. [動作確認](#step-11-動作確認)
12. [デプロイ記録のコミット・タグ作成](#step-12-デプロイ記録のコミットタグ作成)

---

## 事前準備: WSL でターミナルを開く

本手順書のコマンドはすべて **WSL（シェル環境）** で実行する。  
スクリプトがシェルスクリプト（`.sh`）のため、Windows のコマンドプロンプトや PowerShell では実行できない。

**WSL ターミナルを起動し、プロジェクトルートに移動する：**

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
cd /home/ssv/projects/mmdpf
```

> ✅ **成功時の表示**: プロンプトが `/home/ssv/projects/mmdpf` になる（例: `ssv@hostname:/home/ssv/projects/mmdpf$`）

> **VSCode でファイルを確認・編集する場合:** [`vscode-wsl-setup.md`](./vscode-wsl-setup.md) を参照

---

## STEP 1: ビルド確認

### 1-1. 最新コードの取得
mainブランチをプルして新ブランチを作成する

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# main ブランチに切り替え・最新コードを取得
git checkout main
git pull

# 新ブランチを作成して切り替え（日付とバージョン番号を変更して入力）
# 前回のバージョン：mmdpf\docs\deliverables\release_YYYYMMDD_v00.00.**
git checkout -b feature/deploy-DDMM
```

> **例:** `git checkout -b release_20260526_v00.00.08`

> ✅ **成功時の表示（pull）**: `Already up to date.` または差分ファイルの更新ログが表示される
> ✅ **成功時の表示（checkout -b）**: `Switched to a new branch 'release_YYYYMMDD_vXX.XX.XX'` が表示される

### 1-2. ビルド確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# バックエンドの依存パッケージインストール
(cd backend && npm install 2>&1) | tail -20

# フロントエンドの依存パッケージインストール
(cd frontend && npm install 2>&1) | tail -20
```

> ✅ **成功時の表示**: `added XXX packages` または `up to date, audited XXX packages` が表示される（`npm error` が含まれないこと）

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# バックエンドのビルド確認
(cd backend && npm run build 2>&1) | tail -20

# フロントエンドのビルド確認
(cd frontend && npm run build 2>&1) | tail -20
```

> ✅ **成功時の表示（バックエンド）**: 出力に `error TS` が含まれない（TypeScript エラー 0件）
> ✅ **成功時の表示（フロントエンド）**: `Compiled successfully` が表示される

### チェックリスト

- [ ] `git checkout main` + `git pull` で main の最新コードを取得した
- [ ] `git checkout -b release_YYYYMMDD_vXX.XX.XX` で新ブランチを作成した
- [ ] バックエンド `npm install` が `added XXX packages` または `up to date` で完了した（`npm error` なし）
- [ ] フロントエンド `npm install` が `added XXX packages` または `up to date` で完了した（`npm error` なし）
- [ ] バックエンド `npm run build` が **TypeScript エラー 0件** で完了した（出力に `error TS` が含まれない）
- [ ] フロントエンド `npm run build` が **`Compiled successfully`** で完了した

---

## STEP 2: リリース対象の確認 / リリースディレクトリの初期化

### 2-1. 最新コミット一覧の確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# 直近のコミット一覧（git log）
git log --oneline -20
```

> ✅ **成功時の表示**: コミットハッシュとメッセージの一覧が20件表示される（例: `a40d124 fix: ログイン処理修正`）

> **確認ポイント**
> - 一番上のコミットハッシュを「今回リリースコミット（`--to-commit`）」として STEP 2-3 に記録する
> - 今回リリース対象の Issue 対応コミットが含まれていることを確認する
> - 想定外のコミットが混入していないことを確認する

### 2-2. 前回リリースタグの確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

**① リリースタグ一覧を確認する**

```bash
git tag -l "release*" --sort=-creatordate | head -5
```

> ✅ 新しい順にタグが表示される。**1番目**が前回のタグ

> **出力例:**
> ```
> release-20260519-v00.00.07   ← 前回のタグ
> release-20260513-v00.00.06   ← 前々回のタグ
> ```

> **今回のタグは存在しない（新規作成する）。**  
> 1番目のタグのバージョン番号を +1 し、日付を今日の日付にして今回のタグ名を決める。  
> 例: `release-20260519-v00.00.07` の次 → `release-20260525-v00.00.08`

| 項目 | 値（実行後に記入） |
|------|-----------------|
| 前回のタグ（1番目） | |
| 今回のタグ（新規作成・日付+バージョン+1） | |

> **タグが1件しかない場合（初回デプロイ）:** ② をスキップして以下を実行し、表示された値を「前回のタグのコミットハッシュ」欄に記入する
> ```bash
> git rev-list --max-parents=0 HEAD
> ```

**② 前回のタグのコミットハッシュを取得する（`--from-commit` に使用）**

```bash
git rev-parse --short <前回のタグ名>
```

> ✅ 短縮ハッシュ（7桁）が1行表示される

| 項目 | 値（実行後に記入） |
|------|-----------------|
| 前回のタグのコミットハッシュ | |

### 2-3. コミット情報のメモ

| 項目 | コミットハッシュ |
|------|----------------|
| 前回リリースコミット（`--from-commit`） | *(前回リリースノートの「今回リリースコミット」を記入)* |
| 今回リリースコミット（`--to-commit`） | *(今回デプロイする最新コミットを記入)* |

### 2-4. リリースディレクトリの初期化

STEP 2-1・2-2 で確認した値を以下に当てはめて実行する。

| パラメータ | 値の取得元 |
|-----------|-----------|
| `--to-commit` | STEP 2-1 の `git log` で確認した**一番上のコミットハッシュ** |
| `--from-commit` | STEP 2-2 ② で確認した**前回のタグのコミットハッシュ**（初回デプロイの場合は `git rev-list --max-parents=0 HEAD` で取得したハッシュ） |
| `--tag` | STEP 2-2 ① で新規作成した**今回のタグ名**（バージョン+1・日付を今日にして作成） ※コミットハッシュではなくタグ名を指定すること |

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
bash scripts/alchemia-staging/init-release-dir.sh \
  --to-commit   <今回リリースコミット> \
  --from-commit <前回リリースコミット> \
  --tag         <リリースタグ名>
```

> **実行例:**
> ```bash
> bash scripts/alchemia-staging/init-release-dir.sh \
>   --to-commit   a40d124e938672cdfb1360d7bcd4cd12fe17fdc3 \
>   --from-commit e19f5d46513141f186c46f61d1e0192d9444bfe2 \
>   --tag         release_20260422_v1.0.0
> ```

スクリプト実行後、以下のファイルが `docs/deliverables/<リリースタグ名>/` 配下に作成される。

| ファイル | 内容 |
|---------|------|
| `release_info.md` | リリースタグ・コミットハッシュ・作成日時 |
| `checklist.md` | 本手順書のコピー（デプロイ作業記録用） |

> ✅ **成功時の表示**: `release_info.md` と `checklist.md` が `docs/deliverables/<リリースタグ名>/` に作成されたメッセージが表示される

> **以降のデプロイ作業は `docs/deliverables/<リリースタグ名>/checklist.md` に記録すること。**

※スクリプトに実行権限がない場合は下記を実行すること（通常は不要）
```bash
chmod +x scripts/alchemia-staging/init-release-dir.sh
```

### チェックリスト

- [ ] `git log` で今回のリリース対象コミットハッシュを特定した
- [ ] 前回リリースノートから `--from-commit` を確認した
- [ ] 上記テーブルにコミットハッシュを記録した
- [ ] `init-release-dir.sh` を実行し、リリースディレクトリが作成されたことを確認した
- [ ] `docs/deliverables/<リリースタグ名>/release_info.md` の内容が正しいことを確認した
- [ ] `docs/deliverables/<リリースタグ名>/checklist.md` が作成されたことを確認した

---

## STEP 3: リリースノートの作成

### 3-1. リリースノートファイルの作成

`docs/deliverables/release_notes_YYYYMMDD.md` を作成する。  
Skillにリリースノート作成を登録しているので、clineに作成を依頼する。

#### 指示テンプレート
```
リリースノートを作成してください。
今回リリースするコミット、前回リリースしたコミットは、
@\docs/deliverables/<リリースタグ名>/release_info.md
に記載しています。
リリースノートは
@\docs/deliverables/<リリースタグ名>
に出力してください。
```

### チェックリスト

- [ ] `docs/deliverables/<リリースタグ名>/release_notes_YYYYMMDD.md` を作成した
- [ ] バグ修正・新機能・インフラ対応・DBマイグレーション情報を記載した
- [ ] 前回・今回のコミットハッシュを記載した

---

## STEP 4: 計画書の削除

`docs/` 配下（サブフォルダ含む）に残っているタスク計画書（`PLAN.md` 等）を削除する

### 4-1. 削除対象の確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# docs/ 配下のタスクフォルダを確認（YYYYMMDD_ で始まるフォルダ）
ls -d docs/[0-9]*/
```

> ✅ **成功時の表示**: `docs/20260512_XXXX_.../` のようなフォルダ一覧が表示される（対象フォルダが存在しない場合はエラーが出るが問題なし）

### 4-2. 削除

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
rm -rf docs/[0-9]*/
```

> ✅ **成功時の表示**: 何も表示されない（エラーなし = 正常）

### 4-3. コミット・プッシュ

削除後、コミット・プッシュする（手作業）。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
git add -u docs/
git commit -m "タスク計画書の削除"
git push
```

> ✅ **成功時の表示**: `git push` 完了後に `release_YYYYMMDD_vXX.XX.XX -> release_YYYYMMDD_vXX.XX.XX` などのリリースブランチ名と共に push 完了メッセージが表示される

### 4-4. リリース対象コミットの更新

STEP 4-3 の `git push` により「計画書削除のコミット」が新たに追加された。  
このコミットが「今回の最終的なリリースコミット（`--to-commit`）」となるため、以下のコマンドで新しいコミットハッシュを確認し、3箇所を更新する。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# 最新コミットハッシュの確認
git log --oneline -3
```

> ✅ **成功時の表示**: 最新3件のコミットが表示される。**一番上の行のハッシュ**（7桁）が新しいリリースコミット
> ```
> abc1234 chore: remove task plans    ← このハッシュを使う
> e7bf953 fix: 前のコミット
> a40d124 fix: さらに前のコミット
> ```

以下の3箇所を上記で確認したハッシュに更新する。

1. **STEP 2-3 のコミット情報メモ**（本手順書の「今回リリースコミット（`--to-commit`）」欄）
2. **`docs/deliverables/<リリースタグ名>/release_info.md`** の今回リリースコミット欄
3. **`docs/deliverables/<リリースタグ名>/release_notes_YYYYMMDD.md`** の今回リリースコミット欄

### チェックリスト

- [ ] `docs/` 配下の計画書・タスクフォルダを確認した
- [ ] 対象ファイル・フォルダを削除した
- [ ] 削除をコミット・プッシュした
- [ ] STEP 2-3 のコミット情報メモ・`release_info.md`・リリースノートの今回リリースコミットを最新ハッシュに更新した

---

## STEP 5: 差分ファイルの確認（ドライラン）

`sync-to-staging.sh` の `--dry-run` オプションで変更ファイルの一覧を事前確認する。  
コミット情報は `docs/deliverables/<リリースタグ名>/release_info.md` から自動取得されるため、`--release-tag` のみ指定すればよい。

> 📖 スクリプトの仕組みについては [`scripts-guide.md`](../../deliverables/scripts-guide.md) を参照

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# ドライラン（ファイルを操作せず差分のみ表示）
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag <リリースタグ名> \
  --dry-run
```

> ✅ **成功時の表示**: 差分ファイルの一覧が出力され、最後に `docs/deliverables/<リリースタグ名>/dry-run-result.md` にレポートが保存されたメッセージが表示される

> **実行例:**
> ```bash
> bash scripts/alchemia-staging/sync-to-staging.sh \
>   --release-tag release_20260422_v1.0.0 \
>   --dry-run
> ```

> **確認ポイント**
> - 想定外のファイルが含まれていないか
> - 削除ファイルに重要なものがないか
> - ドライラン結果は `docs/deliverables/<リリースタグ名>/dry-run-result.md` に自動保存される

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/sync-to-staging.sh
```

### チェックリスト

- [ ] `--dry-run` で差分ファイルを確認し、問題がないことを確認した

---

## STEP 6: DBのテーブル構成の確認

### 6-1. マイグレーションファイルの確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# 前回リリース以降に追加されたマイグレーションファイルを確認
git diff --name-only <前回リリースコミット> <今回リリースコミット> -- backend/migrations/
```

> ✅ **成功時の表示**: 新規追加されたSQLファイルのパスが表示される（例: `backend/migrations/20260519_add_column.sql`）。新規ファイルがなければ何も表示されない

### 6-2. マイグレーション内容の確認

新規 SQL ファイルが存在する場合、内容を確認してデプロイ時に `--migrate` が必要か判断する。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# 新規マイグレーションファイルの内容確認
# （上記 git diff で表示されたファイル名をそのまま使う）
cat <上記で表示されたファイルパス>
# 例: cat backend/migrations/20260519_add_file_metadata_column.sql
```

> ✅ **成功時の表示**: SQLの内容が出力される

> **確認ポイント**
> - `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 等でべき等に書かれているか
> - ロールバックSQLが必要かどうか
> - データの移行が必要かどうか

### 6-3. Aurora への疎通確認（必要に応じて）

> 🖥️ **実行環境**: WSL（ローカル開発PC）※踏み台ポートフォワード時はローカルから実行
> 📂 **実行ディレクトリ**: 任意のディレクトリ

```bash
# 踏み台サーバー経由でポートフォワード（必要な場合）
# ssh -L 5432:YOUR_AURORA_ENDPOINT:5432 user@bastion-host

# Aurora への接続確認
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${DB_HOST} \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "\dt"
```

> ✅ **成功時の表示**: テーブル名の一覧が表示される（例: `public | users | table | maiml_user`）

### 6-4. マイグレーション要否の判断

| 条件 | 対応 |
|------|------|
| 新規マイグレーションSQLなし | `--migrate` 不要 → STEP 10 へ |
| 新規マイグレーションSQLあり | `--migrate` を付けて実行 → STEP 10 で対応 |

### チェックリスト

- [ ] `backend/migrations/` に新規 SQL ファイルがあるか確認した
- [ ] 新規ファイルがある場合、内容（べき等性・影響範囲）を確認した
- [ ] マイグレーション実施要否を判断した

---

## STEP 7: 環境変数の確認

### 7-0. 環境変数差分チェック（自動）

前回リリースコミットと今回リリースコミット間で、`.env系ファイル` および `aws/ecs-task-definition-*.json` の環境変数差分を自動チェックする。  
コミット情報は `docs/deliverables/<リリースタグ名>/release_info.md` から自動取得されるため、`--release-tag` のみ指定すればよい。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
bash scripts/alchemia-staging/check-env-diff.sh \
  --release-tag <リリースタグ名>
```

> ✅ **成功時の表示**: 環境変数の差分一覧（ADDED / CHANGED / REMOVED）が出力され、最後に `docs/deliverables/<リリースタグ名>/env_diff_YYYYMMDD_HHMMSS.md` に保存完了メッセージが表示される

> **機密値をマスクせず確認したい場合（ローカル環境のみ）:**
> ```bash
> bash scripts/alchemia-staging/check-env-diff.sh \
>   --release-tag <リリースタグ名> \
>   --show-secrets
> ```

スクリプトは以下の2フェーズで動作する。

| フェーズ | 対象 | 内容 |
|---------|------|------|
| フェーズ1 | `.env*`, `docker-compose*.yml` | 追加(ADDED) / 変更(CHANGED) / 削除(REMOVED) された環境変数を列挙 |
| フェーズ2 | `aws/ecs-task-definition-*.json` | フェーズ1の変更変数が ECS タスク定義にも反映されているかを照合 |

実行後、結果は `docs/deliverables/<リリースタグ名>/env_diff_YYYYMMDD_HHMMSS.md` に自動保存される。

> **確認ポイント**
> - `⚠️ 要確認` と表示された変数は ECS タスク定義への反映が必要かどうかを確認する
> - `ADDED` の変数で ECS 未追加の場合、タスク定義の更新が必要か検討する
> - `CHANGED` の変数で ECS 未変更の場合、意図的な差分かどうかを確認する

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/check-env-diff.sh
```

### 7-1. AWS CLI 認証確認（実施不要）

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: 任意のディレクトリ

```bash
aws sts get-caller-identity
```

> ✅ **成功時の表示**: `"Account": "137068252939"` を含む JSON が返る（下記例）
> ```json
> {
>   "UserId": "...",
>   "Account": "137068252939",
>   "Arn": "arn:aws:iam::137068252939:user/..."
> }
> ```

### 7-2. ECS タスク定義 JSON の確認（実施不要）

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# バックエンドタスク定義の主要な環境変数を確認
cat aws/ecs-task-definition-alchemia-backend.json | grep -A1 '"name":'
```

> ✅ **成功時の表示**: 環境変数名（`"name": "DB_HOST"` 等）と値が一覧で出力される

> **確認ポイント**
> - `DB_HOST` が実環境の Aurora エンドポイントになっているか
> - `EMBEDDING_PROVIDER=bedrock` が設定されているか
> - `BEDROCK_EMBEDDING_MODEL_ID` が正しいモデルIDになっているか

### チェックリスト

- [ ] `check-env-diff.sh` を実行し、環境変数の追加・変更・削除を確認した
- [ ] `⚠️ 要確認` の変数が存在する場合、対応方針を決定した
- [ ] `docs/deliverables/<リリースタグ名>/env_diff_*.md` にレポートが出力されていることを確認した
- [ ] `aws sts get-caller-identity` で AWS CLI 認証が有効であることを確認した
- [ ] ECS タスク定義 JSON の環境変数が実環境の値になっていることを確認した

---

## STEP 8: 開発メンバーへのアナウンス

デプロイ作業中はブランチへのプッシュを避けてもらうため、開発メンバーに通知する（Teamsを使用）。

- Teams
  - チーム : AISTソリューションズ（福岡事業部）
  - チャネル : 材料開発データ管理システム
  - メンション : devタグ

### 通知テンプレート

```
これからデプロイ作業を実施します。
 
コミット: ～
までを対象とします。
（前回デプロイはコミット: ～です）
 
対応したGithubのissueは、

---

との認識ですが、過不足あれば連絡ください。

デプロイ完了のアナウンスまで、mainブランチへのマージはお控えください。
 
また、デプロイ後にアナウンスするので、
各自検証環境にて対応箇所を確認して、問題ないかどうかを連絡ください。
 
```

### チェックリスト

- [ ] Teamsでデプロイ開始をアナウンスした
- [ ] メンバーから了承を得た（または十分な時間を置いた）

---

## STEP 9: 島田さんへの連絡（デプロイ開始）

デプロイ実施前に島田さんへメールで連絡する。

### メールテンプレート

```
件名: 【[MaiMLソフト]デプロイ連絡（日付）

島田様、山田様

お世話になっております。ソフトサービス〇〇です。

これから検証環境へのデプロイを実施します。

下記、Issueに対応致しましたので、
動作確認後、再度ご連絡を差し上げます。

---

よろしくお願い致します。
以上です。
```

### チェックリスト

- [ ] 島田さんへデプロイ開始のメールを送信した

---

## STEP 10: デプロイスクリプトの実行

### 10-1. ファイル同期（sync-to-staging.sh）

検証環境用リポジトリへ差分ファイルを同期する。  
コミット情報は `docs/deliverables/<リリースタグ名>/release_info.md` から自動取得されるため、`--release-tag` と `--dest-repo` のみ指定すればよい。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# 実行（ドライランを外す）
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag <リリースタグ名> \
  --dest-repo   /home/ssv/projects/Alchemia_Staging
```

> **実行例:**
> ```bash
> bash scripts/alchemia-staging/sync-to-staging.sh \
>   --release-tag release_20260422_v1.0.0 \
>   --dest-repo   /home/user/staging/mmdpf
> ```

> ✅ **成功時の表示**: `同期が正常に完了しました。` が表示される

### 10-2. コミット・プッシュ

同期後、検証環境用リポジトリで変更をコミット・プッシュする（手作業）。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
git add .
git commit -m "リリースノートの作成"
git push
```

> ✅ **成功時の表示**: `main -> main` などの push 完了メッセージが表示される

以降、踏み台サーバで作業

### 10-3. ソースコードのフェッチ、プル

> 📖 踏み台サーバーへの SSH 接続手順は [`bastion-ssh.md`](./bastion-ssh.md) を参照

> ️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）に SSH ログインして実行
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
git fetch
git pull
```

sshキーのパスフレーズを要求された場合は入力（パスフレーズ：soft-service）
> ✅ **成功時の表示**: `Already up to date.` または最新コミットの差分が表示される

### 10-4. ECS デプロイ（deploy.prod-verification.sh）

#### ケース A: フルデプロイ（標準 / マイグレーションなし）

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --mode all
```

> ✅ **成功時の表示**: `✅ [prod-verification] デプロイ完了！` が表示される

#### ケース B: DBマイグレーションありの場合

ケース A（フルデプロイ）でアプリケーションをデプロイした後、A5M2 で SQL を手動実行する。  
**SQL 実行前に必ずバックアップを取得すること。**

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

**① ケース A でフルデプロイを実行する**

**② 対象テーブルのバックアップを取得する**
（A5M2 で対象テーブルを右クリック → CSV/INSERT文等でエクスポート）

**③ A5M2 でマイグレーション SQL を実行する**
- A5M2 で検証環境のDB に接続（踏み台ポートフォワード経由）
- `backend/migrations/` 配下の対象 SQL ファイルを開いて実行する

#### ケース C: バックエンドのみデプロイ

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --backend
```

> ✅ **成功時の表示**: `✅ Alchemia Staging ECR デプロイ完了！` が表示される

#### ケース D: nginx（frontend含む）のみデプロイ

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --nginx
```

> ✅ **成功時の表示**: `✅ Alchemia Staging ECR デプロイ完了！` が表示される

#### ケース E: 安定化まで待機する場合

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --wait
```

> ✅ **成功時の表示**: ECS サービスが安定状態になるまで待機し、`✅ Alchemia Staging ECR デプロイ完了！` が表示される

> **デプロイログ**: `logs/deploy-ecr-*.log` に自動保存される。

### チェックリスト

- [ ] `sync-to-staging.sh` によるファイル同期が完了した（エラー 0 件）
- [ ] `deploy.ecr.sh` の実行コマンドを選択した（ケース A〜E）
- [ ] デプロイスクリプトが正常に完了した

---

## STEP 11: 動作確認

### 11-1. ECS サービス状態の確認

> 🖥️ **実行環境**: 踏み台サーバー（EC2 / alchemia-staging）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/Alchemia_Staging`

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --mode all --check
```

> ✅ **成功時の表示**: backend・nginx 各サービスのステータスが表示され、すべて正常稼働中であることが確認できる

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: 任意のディレクトリ

以下のコマンドは実行不要。

```bash
# backend サービスの状態確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'

# nginx サービス（frontend含む）の状態確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'
```

> ✅ **成功時の表示**: 以下のように `running` = `desired`、`pending` = `0` が返る
> ```json
> {
>     "running": 1,
>     "pending": 0,
>     "desired": 1
> }
> ```

> **正常**: `runningCount` = `desiredCount`、`pendingCount` = 0

### 11-2. スキーマの差分チェック

デプロイ後、開発環境と検証環境（Aurora）のスキーマが一致していることを確認する。

#### ① 開発環境（ローカル）のスキーマダンプ

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
bash scripts/alchemia-staging/dump-dev-schema.sh
```

> ✅ **成功時の表示**: `✅ スキーマダンプ完了: docs/deliverables/schema_dump_dev_<タイムスタンプ>.sql` のようなメッセージが表示される

> 出力先: `docs/deliverables/schema_dump_dev_<タイムスタンプ>.sql`

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/dump-dev-schema.sh
```

#### ② 検証環境（Aurora）のスキーマダンプ

> 🖥️ **実行環境**: WSL（ローカル開発PC）※踏み台EC2経由でSSH接続して Aurora にダンプを取得
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
bash scripts/alchemia-staging/dump-staging-schema.sh --key <秘密鍵ファイルパス>
# 例: bash scripts/alchemia-staging/dump-staging-schema.sh --key ~/.ssh/alchemia_staging_stepping.pem
```

> ✅ **成功時の表示**: `✅ スキーマダンプ完了: docs/deliverables/schema_dump_staging_<タイムスタンプ>.sql` のようなメッセージが表示される

> 出力先: `docs/deliverables/schema_dump_staging_<タイムスタンプ>.sql`

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/dump-staging-schema.sh
```

#### ③ diff による差分チェック

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
diff \
  docs/deliverables/schema_dump_dev_<タイムスタンプ>.sql \
  docs/deliverables/schema_dump_staging_<タイムスタンプ>.sql
```

> ✅ **成功時の表示**: 何も出力されない（= 差分なし・スキーマ一致）

> **判断基準**
>
> | 結果 | 対応 |
> |------|------|
> | 差分なし（`diff` の出力が空） | スキーマ一致 → 次のステップへ |
> | 差分あり（`CREATE TABLE` / `ADD COLUMN` 等） | マイグレーション未適用の可能性 → 内容を精査し、必要なら `--migrate` オプション付きで再デプロイ |
> | 差分あり（コメント・`pg_dump` ヘッダー行のみ） | 実質的な差分なし → 無視して次のステップへ |

### 11-3. API ヘルスチェック

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: 任意のディレクトリ

```bash
curl https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/api/health

# 期待レスポンス: {"status":"ok"}
```

> ✅ **成功時の表示**: `{"status":"ok"}` が返る

### 11-4. CloudWatch ログの確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: 任意のディレクトリ

```bash
# バックエンドログ（直近10分）
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 10m

# nginx / frontend ログ（直近10分）
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 10m
```

> ✅ **成功時の表示**: ログが流れ、`ERROR` レベルのログが含まれない

> **確認ポイント**: ERROR レベルのログが出ていないことを確認する。

### 11-5. ブラウザでの画面確認

| 確認項目 | URL / 操作 | 期待結果 |
|---------|-----------|---------|
| トップページ表示 | NLB URL にアクセス | ログイン画面が表示される |
| ログイン | 管理者アカウントでログイン | ダッシュボードに遷移する |
| 主要機能の動作 | 今回リリース内容に応じた画面操作 | 正常に動作する |

### 11-6. 完了アナウンス

Teams でデプロイ完了を通知する。

```
デプロイ完了しました。
お手数ですが、各自issueの動作確認をお願いします。
 
検証環境で確認ができましたら連絡をください。
島田さんにデプロイ完了の報告をします
```

### チェックリスト

- [ ] `alchemia-backend-service` の `runningCount` = `desiredCount` を確認した
- [ ] `alchemia-nginx-service` の `runningCount` = `desiredCount` を確認した
- [ ] `dump-dev-schema.sh` で開発環境のスキーマダンプを取得した
- [ ] `dump-staging-schema.sh` で検証環境のスキーマダンプを取得した
- [ ] `diff` でスキーマ差分を確認し、問題がないことを確認した（差分あった場合は内容を精査した）
- [ ] `GET /api/health` が `{"status":"ok"}` を返すことを確認した
- [ ] CloudWatch Logs に ERROR が出ていないことを確認した
- [ ] ブラウザでログイン・主要機能の動作を確認した
- [ ] Teams でデプロイ完了をアナウンスした

---

## デプロイ全体チェックリスト

```
STEP 1: ビルド確認
  - [ ] テスト通過・ビルド成功を確認した

STEP 2: リリース対象の確認 / リリースディレクトリの初期化
  - [ ] 前回・今回のコミットハッシュを確認・記録した
  - [ ] init-release-dir.sh を実行し、リリースディレクトリを作成した
  - [ ] release_info.md・checklist.md が作成されたことを確認した

STEP 3: リリースノートの作成
  - [ ] release_notes_YYYYMMDD.md を作成した

STEP 4: 計画書の削除
  - [ ] docs/ 配下の計画書・タスクフォルダを削除した
  - [ ] 削除をコミット・プッシュした
  - [ ] release_info.md・リリースノートの今回リリースコミットを最新ハッシュに更新した

STEP 5: 差分ファイルの確認（ドライラン）
  - [ ] --dry-run で差分ファイルを確認した

STEP 6: DBのテーブル構成の確認
  - [ ] migrations/ の新規 SQL 確認・マイグレーション要否を判断した

STEP 7: 環境変数の確認
  - [ ] check-env-diff.sh を実行し環境変数差分を確認した
  - [ ] ECS タスク定義 JSON の環境変数が実環境の値になっていることを確認した

STEP 8: 開発メンバーへのアナウンス
  - [ ] デプロイ開始を Teams でアナウンスした

STEP 9: 島田さんへの連絡
  - [ ] デプロイ開始メールを送信した

STEP 10: デプロイスクリプトの実行
  - [ ] sync-to-staging.sh でファイル同期完了
  - [ ] deploy.ecr.sh でデプロイ完了

STEP 11: 動作確認
  - [ ] ECS サービス状態を確認した
  - [ ] スキーマ差分チェック（dump-dev / dump-staging → diff）を実施した
  - [ ] ヘルスチェック・ログ・ブラウザ動作を確認した
  - [ ] Teams でデプロイ完了をアナウンスした
```

---

## STEP 12: デプロイ記録のコミット・タグ作成

デプロイ作業中に作成・更新されたファイル（チェックリスト・リリースノート等）をコミットし、リリースタグを打つ。

### 12-1. デプロイ作業ファイルのコミット

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

コミット対象のファイル（存在するものだけ add すること）：
- `docs/deliverables/<リリースタグ名>/checklist.md`（本手順書の記録）
- `docs/deliverables/<リリースタグ名>/release_info.md`
- `docs/deliverables/<リリースタグ名>/release_notes_YYYYMMDD.md`
- `docs/deliverables/<リリースタグ名>/dry-run-result.md`
- `docs/deliverables/<リリースタグ名>/env_diff_*.md`
- `docs/deliverables/schema_dump_dev_*.sql`
- `docs/deliverables/schema_dump_staging_*.sql`

```bash
git add docs/deliverables/
git commit -m "chore: add release records for <リリースタグ名>"
git push
```

> ✅ **成功時の表示**: `git push` 完了後に `main -> main` などの push 完了メッセージが表示される

### 12-2. リリースタグの作成・プッシュ

タグは STEP 2-2 ① で確認した「今回のタグ名」を使用する。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`（プロジェクトルート）

```bash
# タグを作成
git tag <リリースタグ名>

# タグをリモートにプッシュ
git push origin <リリースタグ名>
```

> ✅ **成功時の表示（tag）**: 何も出力されない（エラーなし = 正常）
> ✅ **成功時の表示（push）**: `* [new tag]  <リリースタグ名> -> <リリースタグ名>` と表示される

### チェックリスト

- [ ] デプロイ作業ファイルをコミット・プッシュした
- [ ] リリースタグを作成・プッシュした

---

## ロールバック手順

問題が発生した場合は以下の手順でロールバックする。

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: 任意のディレクトリ

```bash
# タスク定義リビジョン一覧を確認
aws ecs list-task-definitions \
  --family-prefix alchemia-backend \
  --region ap-northeast-1 \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'

# 前のリビジョンにロールバック（例: リビジョン10に戻す）
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --task-definition alchemia-backend:10 \
  --force-new-deployment \
  --region ap-northeast-1

# nginx もロールバックする場合
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service \
  --task-definition alchemia-nginx:10 \
  --force-new-deployment \
  --region ap-northeast-1
```

> ✅ **成功時の表示（list-task-definitions）**: `alchemia-backend:XX` 形式のARN一覧が表示される
> ✅ **成功時の表示（update-service）**: ECS サービスの JSON 情報が返り、ローリングデプロイが開始される

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [`deploy-guide-aws.md`](./deploy-guide-aws.md) | SaaS版 AWS デプロイ手順書（詳細版） |
| [`scripts/alchemia-staging/sync-to-staging.sh`](../../../scripts/alchemia-staging/sync-to-staging.sh) | 検証環境ファイル同期スクリプト |
| [`scripts/alchemia-staging/deploy.ecr.sh`](../../../scripts/alchemia-staging/deploy.ecr.sh) | ECS デプロイスクリプト |
| [`scripts/alchemia-staging/check-env-diff.sh`](../../../scripts/alchemia-staging/check-env-diff.sh) | 環境変数差分チェックスクリプト |
| [`scripts/alchemia-staging/dump-dev-schema.sh`](../../../scripts/alchemia-staging/dump-dev-schema.sh) | 開発環境（ローカル）スキーマダンプスクリプト |
| [`scripts/alchemia-staging/dump-staging-schema.sh`](../../../scripts/alchemia-staging/dump-staging-schema.sh) | 検証環境（Aurora）スキーマダンプスクリプト（SSH踏み台経由） |
| `docs/deliverables/release_notes_YYYYMMDD.md` | リリースノート（デプロイごとに作成） |

---

*本手順書は mmdpf プロジェクトの検証環境（alchemia-staging / AWS ECS Fargate）へのデプロイ作業手順です。*
