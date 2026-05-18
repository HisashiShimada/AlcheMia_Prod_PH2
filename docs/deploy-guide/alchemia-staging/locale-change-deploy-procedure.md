# 言語ファイル変更時の検証環境デプロイ手順

## 概要

`frontend/src/locales/en.json` または `ja.json` の文言を変更し、検証環境（alchemia-staging）に反映する手順です。

言語ファイルはフロントエンドのビルドに含まれるため、以下の2段階のデプロイを行います。

| ステップ | コマンド | 目的 |
|---|---|---|
| phase1 | `--mode phase1 --nginx` | フロントエンドをビルド＆ECRプッシュ＋ECSサービス更新 |
| prod-verification | `--mode prod-verification --no-build` | ビルド済みイメージを使ってprod-verificationサービスを更新 |

---

## 前提条件

- リポジトリへのpush権限があること
- 検証環境サーバーへのSSHアクセスが可能なこと
- 検証環境サーバーでAWS CLIの認証が設定済みであること（`aws sts get-caller-identity` が成功すること）
- 検証環境サーバーでDockerが使用可能なこと

---

## STEP 1: 言語ファイルの修正

ローカル環境で以下のファイルを編集します。

```
frontend/src/locales/en.json   # 英語の文言
frontend/src/locales/ja.json   # 日本語の文言
```

**注意事項**
- JSONの構造を壊さないよう注意してください
- キーは変更せず、値（文言）のみを変更してください
- 変更後はJSONとして正しい形式であることを確認してください（末尾カンマや括弧の対応など）

---

## STEP 2: コミット・プッシュ

```bash
# 変更内容を確認
git diff frontend/src/locales/

# ステージング
git add frontend/src/locales/en.json
git add frontend/src/locales/ja.json

# コミット
git commit -m "fix: 表示文言を修正"

# リモートにプッシュ
git push origin <ブランチ名>
```

---

## STEP 3: 検証環境サーバーへのログイン

```bash
ssh <鍵ファイルのパス> ec2-user@ec2-3-112-188-39.ap-northeast-1.compute.amazonaws.com
```

---

## STEP 4: フェッチ・プル

```bash
# リポジトリのディレクトリに移動
cd ~/projects/Alchemia_Staging

# リモートの変更を取得
git fetch origin

# ブランチを最新に更新
git pull origin <ブランチ名>

# 変更が取り込まれたことを確認
git log --oneline -3
```

---

## STEP 5: phase1デプロイ（フロントエンドビルド＆ECS更新）

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --nginx
```

このコマンドは以下を実行します。

1. フロントエンドイメージをビルド（`frontend/Dockerfile.prod` を使用）
2. Nginxイメージをビルド（`config/nginx/Dockerfile` を使用）
3. ECR（`mmdpf-frontend`、`mmdpf-nginx`）へプッシュ
4. ECSサービス `alchemia-nginx-service`（ALB用）を更新
5. ECSサービス `alchemia-nginx-service-https`（NLB用）を更新（存在する場合）

**完了の目安**  
コマンドが正常終了し、以下のようなログが表示されれば成功です。

```
[OK   ] ✅ [phase1] ALB+NLB共存構成 デプロイ完了！
```

---

## STEP 6: prod-verificationデプロイ（ビルドスキップ）

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --mode prod-verification --no-build
```

このコマンドは以下を実行します。

1. STEP 5 でビルド済みのイメージをそのまま使用（ビルドをスキップ）
2. ECSサービス `prod-frontend-service` のタスク定義を更新・再デプロイ

**完了の目安**  
コマンドが正常終了し、以下のようなログが表示されれば成功です。

```
[OK   ] ✅ [prod-verification] デプロイ完了！
```

---

## STEP 7: 起動確認

### ECSサービスの状態確認

```bash
./scripts/alchemia-staging/deploy.prod-verification.sh --mode all --check
```

以下の3サービスすべてで `running == desired`、`pending == 0` になっていれば正常です。

| サービス | 確認内容 |
|---|---|
| `prod-frontend-service` | running=desired, pending=0 |
| `alchemia-nginx-service` | running=desired, pending=0 |
| `alchemia-nginx-service-https` | running=desired, pending=0 |

**ロールアップデート中の場合**  
デプロイ直後は `pending > 0` になることがあります。数分待ってから再度確認してください。

### ブラウザでの動作確認

1. 検証環境のURLにアクセスする
2. 変更した文言が正しく表示されていることを確認する
3. 日本語・英語の言語切り替えが正常に動作することを確認する

---

## トラブルシューティング

### ECRへのプッシュに失敗する場合

```bash
# ECRへの再ログインを試みる
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin \
    137068252939.dkr.ecr.ap-northeast-1.amazonaws.com
```

### ECSサービスが安定化しない場合

CloudWatch Logsでエラーログを確認してください。

- Frontend: `https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Fprod-frontend`
- Nginx: `https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Falchemia-nginx`

### タスク定義ファイルが見つからない場合

リポジトリルートに以下のファイルが存在することを確認してください。

```
aws/ecs-task-definition-prod-frontend.json
aws/ecs-task-definition-alchemia-nginx.json
```

### デプロイ後も文言が変わっていない場合

ブラウザキャッシュが残っている可能性があります。

- ブラウザのキャッシュをクリアしてから再度確認してください（`Ctrl + Shift + R` または `Cmd + Shift + R`）
- ECSサービスのタスクが新しいリビジョンで起動しているかを `--check` オプションで確認してください

---

## コマンドまとめ（コピー用）

```bash
# [検証環境サーバーで実行]

# STEP 4: 最新コードを取得
git fetch origin && git pull origin <ブランチ名>

# STEP 5: フロントエンドをビルドしてECSを更新
./scripts/alchemia-staging/deploy.prod-verification.sh --mode phase1 --nginx

# STEP 6: prod-verificationサービスを更新（ビルドスキップ）
./scripts/alchemia-staging/deploy.prod-verification.sh --mode prod-verification --no-build

# STEP 7: 状態確認
./scripts/alchemia-staging/deploy.prod-verification.sh --mode all --check
```
