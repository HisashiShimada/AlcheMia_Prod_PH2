# 検証環境デプロイ手順書（SaaS版 / AWS ECS Fargate）

- **作成日**: 2026-04-21
- **対象環境**: 検証環境（`alchemia-staging` ECS クラスター）
- **デプロイ方式**: ファイル同期（`sync-to-staging.sh`）→ ECR イメージプッシュ → ECS ローリングデプロイ

---

## 目次

1. [リリース対象コミット・前回リリースコミットの確認](#step-1-リリース対象コミット前回リリースコミットの確認)
2. [開発メンバーへのアナウンス](#step-2-開発メンバーへのアナウンス)
3. [ビルド確認](#step-3-ビルド確認)
4. [リリースノートの作成](#step-4-リリースノートの作成)
5. [計画書の移動](#step-5-計画書の移動)
6. [島田さんへの連絡（デプロイ開始）](#step-6-島田さんへの連絡デプロイ開始)
7. [環境変数の確認](#step-7-環境変数の確認)
8. [DBのテーブル構成の確認](#step-8-dbのテーブル構成の確認)
9. [デプロイスクリプトの実行](#step-9-デプロイスクリプトの実行)
10. [動作確認](#step-10-動作確認)

---

## STEP 1: リリース対象コミット・前回リリースコミットの確認

### 1-1. 最新コミット一覧の確認

```bash
# 直近のコミット一覧（git log）
git log --oneline -20
```

### 1-2. 前回リリースコミットの確認

最新のリリースタグを確認(release_2026XXXX_vXX.XX.XX)

### 1-3. コミット情報のメモ

| 項目 | コミットハッシュ |
|------|----------------|
| 前回リリースコミット（`--from-commit`） | *(前回リリースノートの「今回リリースコミット」を記入)* |
| 今回リリースコミット（`--to-commit`） | *(今回デプロイする最新コミットを記入)* |

### チェックリスト

- [ ] `git log` で今回のリリース対象コミットハッシュを特定した
- [ ] 前回リリースノートから `--from-commit` を確認した
- [ ] 上記テーブルにコミットハッシュを記録した

---

## STEP 2: 開発メンバーへのアナウンス

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

- [ ] Teamsでデプロイ開始をアナウンスした
- [ ] メンバーから了承を得た（または十分な時間を置いた）

---

## STEP 3: ビルド確認

### 3-1. 最新コードの取得

```bash
git pull
```

### 3-2. テストの実行

```bash
# バックエンドテスト
(cd backend && npm test 2>&1) | tail -30

# フロントエンドテスト（必要に応じて）
(cd frontend && npm test -- --passWithNoTests 2>&1) | tail -30
```

### 3-3. ビルド確認

```bash
# バックエンドのビルド確認
(cd backend && npm run build 2>&1) | tail -20

# フロントエンドのビルド確認
(cd frontend && npm run build 2>&1) | tail -20
```

### 3-4. 差分ファイルの確認（ドライラン）

`sync-to-staging.sh` の `--dry-run` オプションで変更ファイルの一覧を事前確認する。

```bash
# ドライラン（ファイルを操作せず差分のみ表示）
bash scripts/sync-to-staging.sh \
  --from-commit <前回リリースコミット> \
  --to-commit   <今回リリースコミット> \
  --src-repo    /home/yukihiroomori/projects/mmdpf \
  --dest-repo   <検証環境用リポジトリのパス> \
  --dry-run
```

> **確認ポイント**
> - 想定外のファイルが含まれていないか
> - 削除ファイルに重要なものがないか
> - `backend/migrations/` に新規SQLが含まれているか（→ STEP 8 で対応）

### チェックリスト

- [ ] `git pull` で最新コードを取得した
- [ ] テストがすべてパスした
- [ ] バックエンド・フロントエンドのビルドが成功した
- [ ] `--dry-run` で差分ファイルを確認し、問題がないことを確認した

---

## STEP 4: リリースノートの作成

### 4-1. リリースノートファイルの作成

`docs/deliverables/release_notes_YYYYMMDD.md` を作成する。

**テンプレート:**

```markdown
# リリースノート

**リリース日**: YYYY-MM-DD
**対象ブランチ**: main
**前回リリースコミット**: `<前回リリースコミット>`
**今回リリースコミット**: `<今回リリースコミット>`

---

## 新機能・改善

### 1. （機能名）

- **概要**: ...

---

## バグ修正

### 1. （バグ名）

- **問題**: ...
- **修正**: ...

---

## インフラ・デプロイ対応

### 1. （対応内容）

- ...

---

## DB マイグレーション

なし  <!-- または実施内容を記載 -->

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/...` | ... |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/...` | ... |

### インフラ

| ファイル | 変更概要 |
|---------|---------|
| `config/...` | ... |
```

### 4-2. 変更内容の確認

```bash
# コミット間の変更ファイルと差分を確認
git log --oneline <前回リリースコミット>..<今回リリースコミット>
git diff --name-status <前回リリースコミット> <今回リリースコミット>
```

### チェックリスト

- [ ] `docs/deliverables/release_notes_YYYYMMDD.md` を作成した
- [ ] バグ修正・新機能・インフラ対応・DBマイグレーション情報を記載した
- [ ] 前回・今回のコミットハッシュを記載した

---

## STEP 5: 計画書の移動

`docs/` 配下（サブフォルダ含む）に残っているタスク計画書（`PLAN.md` 等）を `docs/cline_archives/` へ移動する。

### 5-1. 移動対象の確認

```bash
# docs/ 直下の .md ファイルを確認
ls docs/*.md

# docs/ 配下のタスクフォルダを確認（YYYYMMDD_ で始まるフォルダ）
ls -d docs/[0-9]*/
```

### 5-2. アーカイブへ移動

```bash
# 例: docs/YYYYMMDD_HHMM_タスク名/ フォルダをアーカイブへ移動
mv docs/YYYYMMDD_HHMM_タスク名 docs/cline_archives/

# 例: docs/PLAN.md 単体ファイルを移動
mv docs/PLAN.md docs/cline_archives/YYYYMMDD_PLAN.md
```

### チェックリスト

- [ ] `docs/` 配下の計画書・タスクフォルダを確認した
- [ ] 対象ファイル・フォルダを `docs/cline_archives/` へ移動した

---

## STEP 6: 島田さんへの連絡（デプロイ開始）

デプロイ実施前に島田さんへメールで連絡する。

### メールテンプレート

```
件名: 【mmdpf】検証環境デプロイ実施のご連絡

島田さん

お疲れ様です。

これより mmdpf 検証環境（alchemia-staging）へのデプロイを実施いたします。

■ デプロイ日時
  YYYY年MM月DD日 HH:MM 頃

■ 今回のリリース内容
  - （主な変更点を箇条書きで記載）

■ DBマイグレーション
  あり / なし（※あり の場合は内容を記載）

デプロイ完了後に改めてご連絡いたします。
何かご不明な点がございましたらお知らせください。

よろしくお願いいたします。
```

### チェックリスト

- [ ] 島田さんへデプロイ開始のメールを送信した

---

## STEP 7: 環境変数の確認

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

### 7-2. `.env.prod.aws` の確認

```bash
# 必須項目が設定されているか確認（値は表示しない）
grep -E "^(DB_HOST|DB_PASSWORD|REDIS_HOST|REDIS_PASSWORD|AWS_S3_BUCKET|JWT_SECRET|SESSION_SECRET|CORS_ORIGIN|FRONTEND_URL)=" .env.prod.aws
```

> **確認ポイント（必須項目）**

| 環境変数 | 確認内容 |
|---------|---------|
| `DB_HOST` | Aurora エンドポイントが設定されている |
| `DB_PASSWORD` | `CHANGE_ME` のままになっていないか |
| `REDIS_HOST` | ElastiCache エンドポイントが設定されている |
| `REDIS_PASSWORD` | `CHANGE_ME` のままになっていないか |
| `AWS_S3_BUCKET` | 正しいバケット名（`mmdpf-files-production`）になっているか |
| `JWT_SECRET` | `CHANGE_ME` のままになっていないか |
| `SESSION_SECRET` | `CHANGE_ME` のままになっていないか |
| `CORS_ORIGIN` | NLB の正しいドメインが設定されている |

### 7-3. ECS タスク定義 JSON の確認

```bash
# バックエンドタスク定義の主要な環境変数を確認
cat aws/ecs-task-definition-alchemia-backend.json | grep -A1 '"name":'
```

> **確認ポイント**
> - `DB_HOST` が実環境の Aurora エンドポイントになっているか
> - `EMBEDDING_PROVIDER=bedrock` が設定されているか
> - `BEDROCK_EMBEDDING_MODEL_ID` が正しいモデルIDになっているか

### チェックリスト

- [ ] `aws sts get-caller-identity` で AWS CLI 認証が有効であることを確認した
- [ ] `.env.prod.aws` の必須項目がすべて設定されていることを確認した
- [ ] ECS タスク定義 JSON の環境変数が実環境の値になっていることを確認した

---

## STEP 8: DBのテーブル構成の確認

### 8-1. マイグレーションファイルの確認

```bash
# 前回リリース以降に追加されたマイグレーションファイルを確認
git diff --name-only <前回リリースコミット> <今回リリースコミット> -- backend/migrations/
```

または

```bash
# backend/migrations/ 配下のファイルを日付順で確認
ls -lt backend/migrations/*.sql | head -10
```

### 8-2. マイグレーション内容の確認

新規 SQL ファイルが存在する場合、内容を確認してデプロイ時に `--migrate` が必要か判断する。

```bash
# 新規マイグレーションファイルの内容確認
cat backend/migrations/YYYYMMDD_<説明>.sql
```

> **確認ポイント**
> - `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 等でべき等に書かれているか
> - ロールバックSQLが必要かどうか
> - データの移行が必要かどうか

### 8-3. Aurora への疎通確認（必要に応じて）

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

### 8-4. マイグレーション要否の判断

| 条件 | 対応 |
|------|------|
| 新規マイグレーションSQLなし | `--migrate` 不要 → STEP 9 へ |
| 新規マイグレーションSQLあり | `--migrate` を付けて実行 → STEP 9 で対応 |

### チェックリスト

- [ ] `backend/migrations/` に新規 SQL ファイルがあるか確認した
- [ ] 新規ファイルがある場合、内容（べき等性・影響範囲）を確認した
- [ ] マイグレーション実施要否を判断した

---

## STEP 9: デプロイスクリプトの実行

### 9-1. ファイル同期（sync-to-staging.sh）

検証環境用リポジトリへ差分ファイルを同期する。

```bash
# 実行（ドライランを外す）
bash scripts/sync-to-staging.sh \
  --from-commit <前回リリースコミット> \
  --to-commit   <今回リリースコミット> \
  --src-repo    /home/yukihiroomori/projects/mmdpf \
  --dest-repo   <検証環境用リポジトリのパス>
```

> **完了メッセージの確認**: `同期が正常に完了しました。` が表示されることを確認する。

### 9-2. ECS デプロイ（deploy.ecr.sh）

#### ケース A: フルデプロイ（標準 / マイグレーションなし）

```bash
./scripts/deploy.ecr.sh
```

#### ケース B: DBマイグレーション付きフルデプロイ

```bash
export DB_HOST=YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
export DB_PASSWORD=YOUR_DB_PASSWORD

./scripts/deploy.ecr.sh --migrate
```

#### ケース C: バックエンドのみデプロイ

```bash
./scripts/deploy.ecr.sh --backend
```

#### ケース D: nginx（frontend含む）のみデプロイ

```bash
./scripts/deploy.ecr.sh --nginx
```

#### ケース E: 安定化まで待機する場合

```bash
./scripts/deploy.ecr.sh --wait
```

> **デプロイログ**: `logs/deploy-ecr-*.log` に自動保存される。

### チェックリスト

- [ ] `sync-to-staging.sh` によるファイル同期が完了した（エラー 0 件）
- [ ] `deploy.ecr.sh` の実行コマンドを選択した（ケース A〜E）
- [ ] デプロイスクリプトが正常に完了した

---

## STEP 10: 動作確認

### 10-1. ECS サービス状態の確認

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

### 10-2. API ヘルスチェック

```bash
curl https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/api/health

# 期待レスポンス: {"status":"ok"}
```

### 10-3. CloudWatch ログの確認

```bash
# バックエンドログ（直近10分）
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 10m

# nginx / frontend ログ（直近10分）
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 10m
```

> **確認ポイント**: ERROR レベルのログが出ていないことを確認する。

### 10-4. ブラウザでの画面確認

| 確認項目 | URL / 操作 | 期待結果 |
|---------|-----------|---------|
| トップページ表示 | NLB URL にアクセス | ログイン画面が表示される |
| ログイン | 管理者アカウントでログイン | ダッシュボードに遷移する |
| 主要機能の動作 | 今回リリース内容に応じた画面操作 | 正常に動作する |

### 10-5. 完了アナウンス

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
- [ ] `GET /api/health` が `{"status":"ok"}` を返すことを確認した
- [ ] CloudWatch Logs に ERROR が出ていないことを確認した
- [ ] ブラウザでログイン・主要機能の動作を確認した
- [ ] Slack でデプロイ完了をアナウンスした

---

## デプロイ全体チェックリスト

```
STEP 1: リリース対象コミット・前回リリースコミットの確認
  - [ ] 前回・今回のコミットハッシュを確認・記録した

STEP 2: 開発メンバーへのアナウンス
  - [ ] デプロイ開始を Slack でアナウンスした

STEP 3: ビルド確認
  - [ ] テスト通過・ビルド成功を確認した
  - [ ] --dry-run で差分ファイルを確認した

STEP 4: リリースノートの作成
  - [ ] release_notes_YYYYMMDD.md を作成した

STEP 5: 計画書の移動
  - [ ] docs/ 配下の計画書を docs/cline_archives/ へ移動した

STEP 6: 島田さんへの連絡
  - [ ] デプロイ開始メールを送信した

STEP 7: 環境変数の確認
  - [ ] AWS CLI 認証・.env.prod.aws・ECS タスク定義を確認した

STEP 8: DBのテーブル構成の確認
  - [ ] migrations/ の新規 SQL 確認・マイグレーション要否を判断した

STEP 9: デプロイスクリプトの実行
  - [ ] sync-to-staging.sh でファイル同期完了
  - [ ] deploy.ecr.sh でデプロイ完了

STEP 10: 動作確認
  - [ ] ECS サービス状態・ヘルスチェック・ログ・ブラウザ動作を確認した
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
| [`scripts/sync-to-staging.sh`](../../../scripts/sync-to-staging.sh) | 検証環境ファイル同期スクリプト |
| [`scripts/deploy.ecr.sh`](../../../scripts/deploy.ecr.sh) | ECS デプロイスクリプト |
| `docs/deliverables/release_notes_YYYYMMDD.md` | リリースノート（デプロイごとに作成） |

---

*本手順書は mmdpf プロジェクトの検証環境（alchemia-staging / AWS ECS Fargate）へのデプロイ作業手順です。*
