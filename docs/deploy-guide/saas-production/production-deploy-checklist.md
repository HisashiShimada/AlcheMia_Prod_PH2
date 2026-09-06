# 本番環境デプロイ手順書（SaaS版 / AWS ECS Fargate）

- **作成日**: 2026-09-03
- **対象環境**: 本番環境（`alchemia-production` ECS クラスター）
- **デプロイ方式**: ソース同期（WSL → AlcheMia_prd）→ Dockerビルド → ECR イメージプッシュ → ECS ローリングデプロイ
- **デプロイURL**: https://prod.mmdpf-aisol.com

---

## ⚠️ 本番環境デプロイの重要事項

```
① ソースは毎回「完全上書き」する
   踏み台サーバ上の既存ソースを削除してから配置する
   古いファイルが残ると不整合が発生するため必須

② DBマイグレーションは慎重に実施する
   本番データが存在するため、必ずバックアップを確認してから実行

③ デプロイ前に必ず関係者に連絡する
   本番環境のため、ユーザーが利用中の可能性がある
```

---

## ✅ 既知の問題と対処済み事項

### ALBターゲットグループのヘルスチェックパス（2026-09-05 修正済み）

```
問題: 初回構築時にヘルスチェックパスが誤って設定されていた
  誤: /api/v1/health （404 Not Found → Backendが unhealthy になる）
  正: /api/health   （200 OK）

対処: 以下のコマンドで修正済み（再設定は不要）

現在の設定: alchemia-prod-backend-tg → /api/health ✅
→ 次回デプロイからは自動的に正しいパスでヘルスチェックされる
```

> ⚠️ もし Backend が `unhealthy` になる場合は以下で確認すること
>
> ```bash
> # ヘルスチェックパスの確認
> aws elbv2 describe-target-groups \
>   --names alchemia-prod-backend-tg \
>   --region ap-northeast-1 \
>   --query 'TargetGroups[0].HealthCheckPath' \
>   --output text
> # → /api/health と表示されればOK
>
> # 誤っている場合は以下で修正
> aws elbv2 modify-target-group \
>   --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-prod-backend-tg/846b52a2be9f5a1b \
>   --health-check-path "/api/health" \
>   --region ap-northeast-1
> ```

---

## 検証環境との主な違い

| 項目 | 検証環境 | 本番環境 |
|-----|---------|---------|
| ブランチ | main | デプロイ対象ブランチ（担当者に確認） |
| 本番リポジトリ | AIST-Solutions/Alchemia_Staging | **AIST-Solutions/AlcheMia_prd** |
| 踏み台作業Dir | ~/projects/Alchemia_Staging | **~/projects/AlcheMia_prd** |
| デプロイ方法 | deploy.prod-verification.sh | **Dockerビルド → ECR push → ECS更新** |
| ECSクラスター | alchemia-staging | **alchemia-production** |
| ECSサービス（BE） | alchemia-backend-service | **alchemia-backend-service** |
| ECSサービス（FE） | alchemia-nginx-service | **alchemia-frontend-service** |
| タスク定義（BE） | alchemia-backend | **mmdpf-backend** |
| タスク定義（FE） | alchemia-nginx | **mmdpf-frontend** |
| URL | alchemia-staging-alb-xxx... | **https://prod.mmdpf-aisol.com** |
| DB接続先 | alchemia-staging-aurora | **alchemia-production-aurora** |

---

## 目次

1. [ビルド確認](#step-1-ビルド確認)
2. [リリース対象の確認](#step-2-リリース対象の確認)
3. [リリースノートの作成](#step-3-リリースノートの作成)
4. [計画書の削除](#step-4-計画書の削除)
5. [差分ファイルの確認](#step-5-差分ファイルの確認)
6. [DBのテーブル構成の確認](#step-6-dbのテーブル構成の確認)
7. [環境変数の確認](#step-7-環境変数の確認)
8. [関係者へのアナウンス](#step-8-関係者へのアナウンス)
9. [デプロイ開始連絡](#step-9-デプロイ開始連絡)
10. [デプロイスクリプトの実行](#step-10-デプロイスクリプトの実行)
11. [動作確認](#step-11-動作確認)
12. [デプロイ記録のコミット・タグ作成](#step-12-デプロイ記録のコミットタグ作成)

---

## 事前準備: WSL でターミナルを開く

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
cd /home/ssv/projects/mmdpf
```

---

## 事前準備: 踏み台サーバへのSSH接続確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
ssh -i /home/ssv/.ssh/alchemia_staging_stepping.pem \
  ec2-user@ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com \
  "echo '接続成功'"
```

> ✅ **成功時の表示**: `接続成功` が表示される

---

## STEP 1: ビルド確認

### 1-1. 最新コードの取得

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`

```bash
# ⚠️ デプロイ対象ブランチは担当者に確認すること
# 例: git checkout main / git checkout feature/phase2_mock
git checkout <デプロイ対象ブランチ>
git pull

# 新ブランチを作成（日付とバージョン番号を変更）
git checkout -b release_YYYYMMDD_vXX.XX.XX
```

> ✅ **成功時の表示（pull）**: `Already up to date.` または差分ファイルの更新ログ
> ✅ **成功時の表示（checkout -b）**: `Switched to a new branch 'release_YYYYMMDD_vXX.XX.XX'`

### 1-2. ビルド確認

```bash
# バックエンドのビルド確認
(cd backend && npm install 2>&1) | tail -5
(cd backend && npm run build 2>&1) | tail -5

# フロントエンドのビルド確認
(cd frontend && npm install 2>&1) | tail -5
(cd frontend && npm run build 2>&1) | tail -5
```

> ✅ **成功時の表示（バックエンド）**: 出力に `error TS` が含まれない
> ✅ **成功時の表示（フロントエンド）**: `prerendered as static content` が表示される

### チェックリスト

- [ ] デプロイ対象ブランチを確認・取得した
- [ ] 新ブランチ `release_YYYYMMDD_vXX.XX.XX` を作成した
- [ ] バックエンド `npm run build` が TypeScript エラー 0件で完了した
- [ ] フロントエンド `npm run build` が正常に完了した

---

## STEP 2: リリース対象の確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`

```bash
# 直近のコミット一覧
git log --oneline -20

# リリースディレクトリの初期化
bash scripts/alchemia-staging/init-release-dir.sh \
  --tag release_YYYYMMDD_vXX.XX.XX \
  --from-commit <前回のコミットハッシュ> \
  --to-commit <今回のコミットハッシュ>
```

### チェックリスト

- [ ] 今回のリリース対象コミットを確認した
- [ ] リリースディレクトリを作成した

---

## STEP 3: リリースノートの作成

`docs/deliverables/release_YYYYMMDD_vXX.XX.XX/release_notes_YYYYMMDD.md` を作成する。

### チェックリスト

- [ ] リリースノートを作成した

---

## STEP 4: 計画書の削除

今回リリースに含まれる改善計画書のPLAN.mdを削除する。

### チェックリスト

- [ ] 今回リリース分の計画書を削除した（不要な場合はスキップ）

---

## STEP 5: 差分ファイルの確認

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`

```bash
# 差分ファイルの確認（ドライラン）
bash scripts/sync-to-staging.sh \
  --release-tag release_YYYYMMDD_vXX.XX.XX \
  --dry-run
```

> ✅ **成功時の表示**: 変更ファイル一覧が表示される（実際のコピーは行われない）

### チェックリスト

- [ ] 差分ファイルを確認した（想定外のファイルが含まれていないこと）

---

## STEP 6: DBのテーブル構成の確認

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
# 本番Auroraのエンドポイントを取得・接続確認
AURORA_ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier alchemia-production-aurora \
  --region ap-northeast-1 \
  --query 'DBClusters[0].Endpoint' \
  --output text)

# テーブル数を確認
PGPASSWORD=<DBパスワード> psql \
  -h $AURORA_ENDPOINT \
  -U maiml_user \
  -d maiml_db \
  -p 5432 \
  --set=sslmode=require \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

> ⚠️ DBパスワードは AWS Secrets Manager (`mmdpf/production`) の `DB_PASSWORD` を参照

### DBマイグレーションが必要な場合

```bash
# ① WSLでマイグレーションSQLを踏み台に転送
scp -i /home/ssv/.ssh/alchemia_staging_stepping.pem \
  /home/ssv/projects/mmdpf/backend/migrations/*.sql \
  ec2-user@ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com:~/migrations/

# ② 踏み台サーバでマイグレーション実行
for sql_file in $(ls ~/migrations/*.sql | sort); do
  echo "実行中: $(basename $sql_file)"
  PGPASSWORD=<DBパスワード> psql \
    -h $AURORA_ENDPOINT \
    -U maiml_user \
    -d maiml_db \
    -p 5432 \
    --set=sslmode=require \
    -f "$sql_file" 2>&1 | grep -E 'ERROR|CREATE|ALTER' | head -3
  echo "✅ 完了: $(basename $sql_file)"
done
```

> ⚠️ VPC Peering（検証VPC ↔ 本番VPC）が設定済みのため踏み台から接続可能

### チェックリスト

- [ ] 本番DBのテーブル構成を確認した
- [ ] 必要なマイグレーションを実行した（不要な場合はスキップ）

---

## STEP 7: 環境変数の確認

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
# 本番ECSタスク定義の環境変数を確認
aws ecs describe-task-definition \
  --task-definition mmdpf-backend \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment[*]' \
  --output table
```

### チェックリスト

- [ ] 環境変数に変更がある場合はタスク定義を更新した
- [ ] Secrets Manager の値が最新であることを確認した

---

## STEP 8: 関係者へのアナウンス

Teams等でデプロイ開始をアナウンスする。

```
【本番環境デプロイのお知らせ】
これより本番環境（https://prod.mmdpf-aisol.com）のデプロイを開始します。
完了次第ご連絡します。
```

### チェックリスト

- [ ] Teams等でデプロイ開始をアナウンスした

---

## STEP 9: デプロイ開始連絡

お客様（AIST-Solutions担当者）にデプロイ開始を連絡する。

### チェックリスト

- [ ] お客様へデプロイ開始を連絡した

---

## STEP 10: デプロイスクリプトの実行

### ⚠️ 重要：ソースの完全上書き手順

**毎回必ず以下の手順でソースを完全上書きすること。**
古いファイルが残ると不整合が発生するため、削除→コピーを徹底する。

---

### 10-1. WSLでソースをAlcheMia_prdに同期

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
# ① AlcheMia_prdの既存ファイルを削除（.gitディレクトリは残す）
find /home/ssv/projects/AlcheMia_prd \
  -mindepth 1 \
  -not -path '/home/ssv/projects/AlcheMia_prd/.git*' \
  -delete
echo "✅ 既存ファイル削除完了"

# ② 最新ソースをコピー（--delete で削除も同期）
rsync -av --delete \
  --exclude='.git' --exclude='node_modules' \
  --exclude='dist' --exclude='.env' \
  --exclude='logs' --exclude='*.log' \
  /home/ssv/projects/mmdpf/ \
  /home/ssv/projects/AlcheMia_prd/
echo "✅ ソースコピー完了"
```

---

### 10-2. AlcheMia_prdをコミット・プッシュ

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
cd /home/ssv/projects/AlcheMia_prd
git add .
git commit -m "chore: deploy release_YYYYMMDD_vXX.XX.XX"
git push origin main
echo "✅ プッシュ完了"
```

---

### 10-3. 踏み台サーバでソースを取得

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

**方法A: GitHubからclone（推奨）**

```bash
rm -rf ~/projects/AlcheMia_prd
cd ~/projects
git clone git@github.com:AIST-Solutions/AlcheMia_prd.git
echo "✅ clone完了"
```

**方法B: SCPで転送（GitHubアクセスできない場合）**

> 🖥️ **実行環境**: WSL（ローカル開発PC）

```bash
# 踏み台サーバの既存ソースを完全削除
ssh -i /home/ssv/.ssh/alchemia_staging_stepping.pem \
  ec2-user@ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com \
  "rm -rf ~/projects/AlcheMia_prd && mkdir -p ~/projects/AlcheMia_prd"

# ソースを転送（進捗表示あり）
rsync -av --progress \
  --exclude='.git' --exclude='node_modules' \
  --exclude='dist' --exclude='.env' --exclude='logs' \
  -e "ssh -i /home/ssv/.ssh/alchemia_staging_stepping.pem" \
  /home/ssv/projects/AlcheMia_prd/ \
  ec2-user@ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com:~/projects/AlcheMia_prd/
echo "✅ 転送完了"
```

---

### 10-4. ECRログイン

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin \
    137068252939.dkr.ecr.ap-northeast-1.amazonaws.com
echo "✅ ECRログイン完了"
```

---

### 10-5. Dockerイメージのビルド

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

> ⚠️ **重要**: FrontendはDockerfileが2つある
> - `frontend/Dockerfile`      → 開発用（`npm run dev`で起動）❌ 使わない
> - `frontend/Dockerfile.prod` → **本番用**（ビルド済みイメージ）✅ こちらを使う

```bash
cd ~/projects/AlcheMia_prd
ECR_URI="137068252939.dkr.ecr.ap-northeast-1.amazonaws.com"

docker build -f backend/Dockerfile.prod \
  -t $ECR_URI/mmdpf-backend:production ./backend
echo "✅ Backendビルド完了"

# ✅ Dockerfile.prod を使うこと（Dockerfileは開発用のため使わない）
docker build -f frontend/Dockerfile.prod \
  -t $ECR_URI/mmdpf-frontend:production ./frontend
echo "✅ Frontendビルド完了"
```

---

### 10-6. ECRにPush

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
ECR_URI="137068252939.dkr.ecr.ap-northeast-1.amazonaws.com"

docker push $ECR_URI/mmdpf-backend:production
echo "✅ Backend Push完了"

docker push $ECR_URI/mmdpf-frontend:production
echo "✅ Frontend Push完了"
```

---

### 10-7. ECSサービスの更新

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
# ECSサービスを強制再デプロイ（新しいイメージを使用）
aws ecs update-service \
  --cluster alchemia-production \
  --service alchemia-backend-service \
  --force-new-deployment \
  --enable-execute-command \
  --region ap-northeast-1 \
  --query 'service.serviceName' --output text
echo "✅ Backend ECSサービス更新開始"

aws ecs update-service \
  --cluster alchemia-production \
  --service alchemia-frontend-service \
  --force-new-deployment \
  --region ap-northeast-1 \
  --query 'service.serviceName' --output text
echo "✅ Frontend ECSサービス更新開始"
```

> ⚠️ 環境変数の変更がある場合は先に `aws ecs register-task-definition` で
> 新しいリビジョンを作成してから `--task-definition mmdpf-backend:<リビジョン>` を指定すること

---

### 10-8. デプロイ完了確認

```bash
# Running: 2 になるまで数分おきに確認
aws ecs describe-services \
  --cluster alchemia-production \
  --services alchemia-backend-service alchemia-frontend-service \
  --region ap-northeast-1 \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
  --output table
```

> ✅ **成功時**: Backend/Frontend ともに `Running: 2 / Pending: 0`

```bash
# バックエンドログで正常起動を確認
aws logs get-log-events \
  --log-group-name /ecs/mmdpf-backend \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /ecs/mmdpf-backend \
    --order-by LastEventTime --descending \
    --region ap-northeast-1 \
    --query 'logStreams[0].logStreamName' --output text) \
  --limit 20 --region ap-northeast-1 \
  --query 'events[*].message' --output text 2>&1 | tr '\t' '\n' | \
  grep -E 'Session|Redis接続|Server is running|Error'
```

> ✅ **成功時の表示**:
> ```
> ✅ Redis接続成功
> 🗄️  Session Store: REDIS (production mode)
> 🚀 Server is running on port 3001
> ```

### チェックリスト

- [ ] AlcheMia_prdリポジトリの既存ソースを**削除**した（完全上書きのため必須）
- [ ] 最新ソースをAlcheMia_prdに配置した
- [ ] ECRにログインできた
- [ ] Backend Dockerビルドが成功した
- [ ] Frontend Dockerビルドが成功した
- [ ] Backend イメージをECRにpushした
- [ ] Frontend イメージをECRにpushした
- [ ] Backend ECSサービスを更新した
- [ ] Frontend ECSサービスを更新した
- [ ] ECSサービスが `Running: 2` になった
- [ ] バックエンドログで正常起動を確認した

---

## STEP 11: 動作確認

### 11-1. ECSサービス状態確認

```bash
aws ecs describe-services \
  --cluster alchemia-production \
  --services alchemia-backend-service alchemia-frontend-service \
  --region ap-northeast-1 \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount}' \
  --output table
```

### 11-2. ブラウザ動作確認

```
URL: https://prod.mmdpf-aisol.com
証明書: MMDPF CA のクライアント証明書（.p12）を使用
```

確認事項：
- [ ] ログイン画面が表示される
- [ ] ログインができる
- [ ] 主要画面が正常に表示される

### 11-3. CloudWatch Logsでエラー確認

```bash
aws logs get-log-events \
  --log-group-name /ecs/mmdpf-backend \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /ecs/mmdpf-backend \
    --order-by LastEventTime --descending \
    --region ap-northeast-1 \
    --query 'logStreams[0].logStreamName' --output text) \
  --limit 50 --region ap-northeast-1 \
  --query 'events[*].message' --output text 2>&1 | tr '\t' '\n' | \
  grep -i 'error' | head -10
```

### チェックリスト

- [ ] ECS サービス状態を確認した（Running: 2）
- [ ] ブラウザでログイン画面が表示された
- [ ] ログインができた
- [ ] CloudWatch Logsにエラーがないことを確認した
- [ ] Teams でデプロイ完了をアナウンスした

---

## STEP 12: デプロイ記録のコミット・タグ作成

> 🖥️ **実行環境**: WSL（ローカル開発PC）
> 📂 **実行ディレクトリ**: `/home/ssv/projects/mmdpf`

```bash
git add docs/deliverables/
git commit -m "chore: add release records for release_YYYYMMDD_vXX.XX.XX"
git push

git tag release_YYYYMMDD_vXX.XX.XX
git push origin release_YYYYMMDD_vXX.XX.XX
```

### チェックリスト

- [ ] デプロイ作業ファイルをコミット・プッシュした
- [ ] リリースタグを作成・プッシュした

---

## ロールバック手順

> 🖥️ **実行環境**: 踏み台サーバ（SSH接続）

```bash
# タスク定義リビジョン一覧を確認
aws ecs list-task-definitions \
  --family-prefix mmdpf-backend \
  --region ap-northeast-1 \
  --sort DESC \
  --query 'taskDefinitionArns[:5]' \
  --output table

# 前のリビジョンにロールバック（例: リビジョン3に戻す）
aws ecs update-service \
  --cluster alchemia-production \
  --service alchemia-backend-service \
  --task-definition mmdpf-backend:3 \
  --force-new-deployment \
  --region ap-northeast-1

aws ecs update-service \
  --cluster alchemia-production \
  --service alchemia-frontend-service \
  --task-definition mmdpf-frontend:1 \
  --force-new-deployment \
  --region ap-northeast-1
```

---

## 環境情報（参照用）

| 項目 | 値 |
|-----|---|
| AWSアカウントID | 137068252939 |
| リージョン | ap-northeast-1 |
| ECSクラスター | alchemia-production |
| ECSサービス（BE） | alchemia-backend-service |
| ECSサービス（FE） | alchemia-frontend-service |
| タスク定義（BE） | mmdpf-backend |
| タスク定義（FE） | mmdpf-frontend |
| ALB名 | alch-prod |
| ALB DNS | alch-prod-138077130.ap-northeast-1.elb.amazonaws.com |
| 本番URL | https://prod.mmdpf-aisol.com |
| Aurora エンドポイント | alchemia-production-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com |
| Redis エンドポイント | master.alchemia-production-redis.rekssa.apne1.cache.amazonaws.com |
| S3バケット | mmdpf-files-production |
| Secrets Manager ARN | arn:aws:secretsmanager:ap-northeast-1:137068252939:secret:mmdpf/production-5ViYZd |
| Trust Store ARN | arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:truststore/alchemia-production-truststore/76ef8aa58a8dccc7 |
| 踏み台サーバ | ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com |
| 踏み台SSHキー | /home/ssv/.ssh/alchemia_staging_stepping.pem |
| VPC | alchemia-production-vpc (10.2.0.0/16) |

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [`staging-deploy-checklist.md`](../saas-staging/staging-deploy-checklist.md) | 検証環境デプロイ手順書 |
| [`production-aws-architecture.md`](../../design/infrastructure/production-aws-architecture.md) | 本番環境AWSシステム構成図 |

---

*本手順書は mmdpf プロジェクトの本番環境（alchemia-production / AWS ECS Fargate）へのデプロイ作業手順です。*



