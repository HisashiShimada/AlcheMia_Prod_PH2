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

---

## STEP 1: ビルド確認

### 1-1. 最新コードの取得
対象はmainブランチ

```bash
git pull
```
### 1-2. ビルド確認

```bash
# バックエンドの依存パッケージインストール
(cd backend && npm install 2>&1) | tail -20

# フロントエンドの依存パッケージインストール
(cd frontend && npm install 2>&1) | tail -20
```

```bash
# バックエンドのビルド確認
(cd backend && npm run build 2>&1) | tail -20

# フロントエンドのビルド確認
(cd frontend && npm run build 2>&1) | tail -20
```

### チェックリスト

- [✓] `git pull` で最新コードを取得した
- [スキップ] テストがすべてパスした
- [✓] バックエンド・フロントエンドのビルドが成功した

---

## STEP 2: リリース対象の確認 / リリースディレクトリの初期化

### 2-1. 最新コミット一覧の確認

```bash
# 直近のコミット一覧（git log）
git log --oneline -20
```

### 2-2. 前回リリースコミットの確認

最新のリリースタグを確認(release_2026XXXX_vXX.XX.XX)

### 2-3. コミット情報のメモ

| 項目 | コミットハッシュ |
|------|----------------|
| 前回リリースコミット（`--from-commit`） | *(前回リリースノートの「今回リリースコミット」を記入)* |
| 今回リリースコミット（`--to-commit`） | *(今回デプロイする最新コミットを記入)* |

### 2-4. リリースディレクトリの初期化

上記で確認したコミット情報とリリースタグを使って、リリース作業用ディレクトリを初期化する。

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

> **以降のデプロイ作業は `docs/deliverables/<リリースタグ名>/checklist.md` に記録すること。**

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/init-release-dir.sh
```

### チェックリスト

- [✓] `git log` で今回のリリース対象コミットハッシュを特定した
- [✓] 前回リリースノートから `--from-commit` を確認した
- [✓] 上記テーブルにコミットハッシュを記録した
- [✓] `init-release-dir.sh` を実行し、リリースディレクトリが作成されたことを確認した
- [✓] `docs/deliverables/<リリースタグ名>/release_info.md` の内容が正しいことを確認した
- [✓] `docs/deliverables/<リリースタグ名>/checklist.md` が作成されたことを確認した

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

- [✓] `docs/deliverables/<リリースタグ名>/release_notes_YYYYMMDD.md` を作成した
- [✓] バグ修正・新機能・インフラ対応・DBマイグレーション情報を記載した
- [✓] 前回・今回のコミットハッシュを記載した

---

## STEP 4: 計画書の削除

`docs/` 配下（サブフォルダ含む）に残っているタスク計画書（`PLAN.md` 等）を削除する

### 4-1. 移動対象の確認
```bash
# docs/ 配下のタスクフォルダを確認（YYYYMMDD_ で始まるフォルダ）
ls -d docs/[0-9]*/
```

### 4-2. 削除

```bash
rm -rf docs/[0-9]*/
```

### 4-3. コミット・プッシュ

移動後、変更をコミット・プッシュする（手作業）。

```bash
git add docs/[0-9]*/
git commit -m "chore: move task plans to cline_archives"
git push
```

### 4-4. リリース対象コミットの更新

上記のコミット・プッシュにより、今回のリリース対象コミット（`--to-commit`）が変わる。  
以下の3箇所を最新のコミットハッシュに更新すること。

1. **STEP 2-3 のコミット情報メモ**（本手順書の「今回リリースコミット（`--to-commit`）」欄）
2. **`docs/deliverables/<リリースタグ名>/release_info.md`** の今回リリースコミット欄
3. **`docs/deliverables/<リリースタグ名>/release_notes_YYYYMMDD.md`** の今回リリースコミット欄

```bash
# 最新コミットハッシュの確認
git log --oneline -3
```

### チェックリスト

- [✓] `docs/` 配下の計画書・タスクフォルダを確認した
- [✓] 対象ファイル・フォルダを `docs/cline_archives/` へ移動した
- [✓] 移動をコミット・プッシュした
- [✓] STEP 2-3 のコミット情報メモ・`release_info.md`・リリースノートの今回リリースコミットを最新ハッシュに更新した

---

## STEP 5: 差分ファイルの確認（ドライラン）

`sync-to-staging.sh` の `--dry-run` オプションで変更ファイルの一覧を事前確認する。  
コミット情報は `docs/deliverables/<リリースタグ名>/release_info.md` から自動取得されるため、`--release-tag` のみ指定すればよい。

```bash
# ドライラン（ファイルを操作せず差分のみ表示）
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag <リリースタグ名> \
  --dry-run
```

> **実行例:**
> ```bash
> bash scripts/alchemia-staging/sync-to-staging.sh \
>   --release-tag release_20260422_v1.0.0 \
>   --dry-run
> ```

> **確認ポイント**
> - 想定外のファイルが含まれていないか
> - 削除ファイルに重要なものがないか
> - `backend/migrations/` に新規SQLが含まれているか（→ STEP 6 で対応）
> - ドライラン結果は `docs/deliverables/<リリースタグ名>/dry-run-result.md` に自動保存される

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/sync-to-staging.sh
```

### チェックリスト

- [✓] `--dry-run` で差分ファイルを確認し、問題がないことを確認した

---

## STEP 6: DBのテーブル構成の確認

### 6-1. マイグレーションファイルの確認

```bash
# 前回リリース以降に追加されたマイグレーションファイルを確認
git diff --name-only <前回リリースコミット> <今回リリースコミット> -- backend/migrations/
```

または

```bash
# backend/migrations/ 配下のファイルを日付順で確認
ls -lt backend/migrations/*.sql | head -10
```

### 6-2. マイグレーション内容の確認

新規 SQL ファイルが存在する場合、内容を確認してデプロイ時に `--migrate` が必要か判断する。

```bash
# 新規マイグレーションファイルの内容確認
cat backend/migrations/YYYYMMDD_<説明>.sql
```

> **確認ポイント**
> - `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 等でべき等に書かれているか
> - ロールバックSQLが必要かどうか
> - データの移行が必要かどうか

### 6-3. Aurora への疎通確認（必要に応じて）

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

### 6-4. マイグレーション要否の判断

| 条件 | 対応 |
|------|------|
| 新規マイグレーションSQLなし | `--migrate` 不要 → STEP 10 へ |
| 新規マイグレーションSQLあり | `--migrate` を付けて実行 → STEP 10 で対応 |

### チェックリスト

- [✓] `backend/migrations/` に新規 SQL ファイルがあるか確認した
- [スキップ] 新規ファイルがある場合、内容（べき等性・影響範囲）を確認した
- [✓] マイグレーション実施要否を判断した

---

## STEP 7: 環境変数の確認

### 7-0. 環境変数差分チェック（自動）

前回リリースコミットと今回リリースコミット間で、`.env系ファイル` および `aws/ecs-task-definition-*.json` の環境変数差分を自動チェックする。  
コミット情報は `docs/deliverables/<リリースタグ名>/release_info.md` から自動取得されるため、`--release-tag` のみ指定すればよい。

```bash
bash scripts/alchemia-staging/check-env-diff.sh \
  --release-tag <リリースタグ名>
```

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

### 7-1. AWS CLI 認証確認

```bash
aws sts get-caller-identity
```

> 正常レスポンス例:
> ```json
> {
>   "UserId": "...",
>   "Account": "137068252939",
>   "Arn": "arn:aws:iam::137068252939:user/..."
> }
> ```

### 7-2. ECS タスク定義 JSON の確認

```bash
# バックエンドタスク定義の主要な環境変数を確認
cat aws/ecs-task-definition-alchemia-backend.json | grep -A1 '"name":'
```

> **確認ポイント**
> - `DB_HOST` が実環境の Aurora エンドポイントになっているか
> - `EMBEDDING_PROVIDER=bedrock` が設定されているか
> - `BEDROCK_EMBEDDING_MODEL_ID` が正しいモデルIDになっているか

### チェックリスト

- [✓] `check-env-diff.sh` を実行し、環境変数の追加・変更・削除を確認した
- [✓] `⚠️ 要確認` の変数が存在する場合、対応方針を決定した
- [✓] `docs/deliverables/<リリースタグ名>/env_diff_*.md` にレポートが出力されていることを確認した
- [スキップ] `aws sts get-caller-identity` で AWS CLI 認証が有効であることを確認した
- [✓] ECS タスク定義 JSON の環境変数が実環境の値になっていることを確認した

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
 
また、デプロイ後にアナウンスするので、
各自検証環境にて対応箇所を確認して、問題ないかどうかを連絡ください。
```

### チェックリスト

- [✓] Teamsでデプロイ開始をアナウンスした
- [スキップ] メンバーから了承を得た（または十分な時間を置いた）

---

## STEP 9: 島田さんへの連絡（デプロイ開始）

デプロイ実施前に島田さんへメールで連絡する。

### メールテンプレート

```
件名: 【[MaiMLソフト]デプロイ連絡（日付）

島田様、山田様

お世話になっております。ソフトサービス大森です。

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

```bash
# 実行（ドライランを外す）
bash scripts/alchemia-staging/sync-to-staging.sh \
  --release-tag <リリースタグ名> \
  --dest-repo   <検証環境用リポジトリのパス>
```

> **実行例:**
> ```bash
> bash scripts/alchemia-staging/sync-to-staging.sh \
>   --release-tag release_20260422_v1.0.0 \
>   --dest-repo   /home/user/staging/mmdpf
> ```

> **完了メッセージの確認**: `同期が正常に完了しました。` が表示されることを確認する。

### 10-2. ECS デプロイ（deploy.ecr.sh）

#### ケース A: フルデプロイ（標準 / マイグレーションなし）

```bash
./scripts/alchemia-staging/deploy.ecr.phase1.sh
```

#### ケース B: DBマイグレーション付きフルデプロイ

```bash
export DB_HOST=YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
export DB_PASSWORD=YOUR_DB_PASSWORD

./scripts/alchemia-staging/deploy.ecr.phase1.sh --migrate
```

#### ケース C: バックエンドのみデプロイ

```bash
./scripts/alchemia-staging/deploy.ecr.phase1.sh --backend
```

#### ケース D: nginx（frontend含む）のみデプロイ

```bash
./scripts/alchemia-staging/deploy.ecr.phase1.sh --nginx
```

#### ケース E: 安定化まで待機する場合

```bash
./scripts/alchemia-staging/deploy.ecr.phase1.sh --wait
```

> **デプロイログ**: `logs/deploy-ecr-*.log` に自動保存される。

### チェックリスト

- [ ] `sync-to-staging.sh` によるファイル同期が完了した（エラー 0 件）
- [ ] `deploy.ecr.sh` の実行コマンドを選択した（ケース A〜E）
- [ ] デプロイスクリプトが正常に完了した

---

## STEP 11: 動作確認

### 11-1. ECS サービス状態の確認

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

> **正常**: `runningCount` = `desiredCount`、`pendingCount` = 0

### 11-2. スキーマの差分チェック

デプロイ後、開発環境と検証環境（Aurora）のスキーマが一致していることを確認する。

#### ① 開発環境（ローカル）のスキーマダンプ

```bash
bash scripts/alchemia-staging/dump-dev-schema.sh
```

> 出力先: `docs/deliverables/schema_dump_dev_<タイムスタンプ>.sql`

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/dump-dev-schema.sh
```

#### ② 検証環境（Aurora）のスキーマダンプ

```bash
bash scripts/alchemia-staging/dump-staging-schema.sh --key <秘密鍵ファイルパス>
# 例: bash scripts/alchemia-staging/dump-staging-schema.sh --key ~/.ssh/alchemia_staging_stepping.pem
```

> 出力先: `docs/deliverables/schema_dump_staging_<タイムスタンプ>.sql`

※スクリプトに実行権限がない場合は下記を実行すること
```bash
chmod +x scripts/alchemia-staging/dump-staging-schema.sh
```

#### ③ diff による差分チェック

```bash
diff \
  docs/deliverables/schema_dump_dev_<タイムスタンプ>.sql \
  docs/deliverables/schema_dump_staging_<タイムスタンプ>.sql
```

> **判断基準**
>
> | 結果 | 対応 |
> |------|------|
> | 差分なし（`diff` の出力が空） | スキーマ一致 → 次のステップへ |
> | 差分あり（`CREATE TABLE` / `ADD COLUMN` 等） | マイグレーション未適用の可能性 → 内容を精査し、必要なら `--migrate` オプション付きで再デプロイ |
> | 差分あり（コメント・`pg_dump` ヘッダー行のみ） | 実質的な差分なし → 無視して次のステップへ |

### 11-3. API ヘルスチェック

```bash
curl https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/api/health

# 期待レスポンス: {"status":"ok"}
```

### 11-4. CloudWatch ログの確認

```bash
# バックエンドログ（直近10分）
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 10m

# nginx / frontend ログ（直近10分）
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 10m
```

> **確認ポイント**: ERROR レベルのログが出ていないことを確認する。

### 11-5. ブラウザでの画面確認

| 確認項目 | URL / 操作 | 期待結果 |
|---------|-----------|---------|
| トップページ表示 | NLB URL にアクセス | ログイン画面が表示される |
| ログイン | 管理者アカウントでログイン | ダッシュボードに遷移する |
| 主要機能の動作 | 今回リリース内容に応じた画面操作 | 正常に動作する |

### 11-6. 完了アナウンス

Slack でデプロイ完了を通知する。

```
【検証環境デプロイ完了】
alchemia-staging へのデプロイが完了しました。
動作確認をお願いします。

■ 今回のリリース内容
  - （主な変更点）

■ リリースノート
  docs/deliverables/release_notes_YYYYMMDD.md
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
- [ ] Slack でデプロイ完了をアナウンスした

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

STEP 4: 計画書の移動
  - [ ] docs/ 配下の計画書を docs/cline_archives/ へ移動した
  - [ ] 移動をコミット・プッシュした
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
  - [ ] Slack でデプロイ完了をアナウンスした
```

---

## ロールバック手順

問題が発生した場合は以下の手順でロールバックする。

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

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [`deploy-guide-aws.md`](./deploy-guide-aws.md) | SaaS版 AWS デプロイ手順書（詳細版） |
| [`scripts/alchemia-staging/sync-to-staging.sh`](../../../../alchemia-staging/scripts/sync-to-staging.sh) | 検証環境ファイル同期スクリプト |
| [`scripts/alchemia-staging/deploy.ecr.sh`](../../../../scripts/alchemia-staging/deploy.ecr.sh) | ECS デプロイスクリプト |
| [`scripts/alchemia-staging/check-env-diff.sh`](../../../../scripts/alchemia-staging/check-env-diff.sh) | 環境変数差分チェックスクリプト |
| [`scripts/alchemia-staging/dump-dev-schema.sh`](../../../../scripts/alchemia-staging/dump-dev-schema.sh) | 開発環境（ローカル）スキーマダンプスクリプト |
| [`scripts/alchemia-staging/dump-staging-schema.sh`](../../../../scripts/alchemia-staging/dump-staging-schema.sh) | 検証環境（Aurora）スキーマダンプスクリプト（SSH踏み台経由） |
| `docs/deliverables/release_notes_YYYYMMDD.md` | リリースノート（デプロイごとに作成） |

---

*本手順書は mmdpf プロジェクトの検証環境（alchemia-staging / AWS ECS Fargate）へのデプロイ作業手順です。*
