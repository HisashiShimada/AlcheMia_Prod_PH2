# HTTPS「保護されていない通信」解消手順書

- **作成日**: 2026-04-16
- **対象**: SaaS版 AWS環境（ECS Fargate + NLB）
- **問題**: NLB経由で `https://` アクセスすると Chrome に「保護されていない通信」と表示される

---

## 原因

NLBはTCPパススルー（L4）のため、SSL/TLS終端はnginxコンテナが担います。  
しかし、ECSタスクの `mmdpf-nginx` コンテナに **SSL証明書が渡されていない** ことが原因です。

nginx の設定（`config/nginx/nginx.prod.conf`）では以下の環境変数から証明書を受け取る想定です：

| 環境変数 | 内容 |
|----------|------|
| `SSL_CERT` | サーバー証明書（PEM） |
| `SSL_KEY` | サーバー秘密鍵（PEM） |
| `SSL_CA_CERT` | クライアント証明書検証用CA証明書（PEM） |

これらを **AWS SSM Parameter Store** に登録し、ECSタスク定義の `secrets` セクションから参照する構成にします。

```
ECSタスク起動時:
  SSM Parameter Store
    /alchemia/nginx/ssl-cert    ─┐
    /alchemia/nginx/ssl-key     ─┼─ ecsTaskExecutionRole が取得
    /alchemia/nginx/ssl-ca-cert ─┘
        ↓
  mmdpf-nginx コンテナの環境変数 SSL_CERT / SSL_KEY / SSL_CA_CERT に注入
        ↓
  nginx が証明書ファイルに書き出して HTTPS:443 で待受
```

---

## 対応済みの変更点

| ファイル | 変更内容 |
|---------|---------|
| `aws/ecs-task-definition-alchemia-nginx.json` | `mmdpf-nginx` コンテナに `secrets` セクション追加（SSM ARN参照） |
| `scripts/setup-ssm-ssl.sh` | SSM Parameter Store へ証明書を登録するスクリプト（新規作成） |

---

## 実施手順

### Step 1: SSM Parameter Store に証明書を登録

ローカル環境（プロジェクトルート）で実行します。

```bash
# 登録内容をドライランで確認（実際には登録しない）
./scripts/setup-ssm-ssl.sh --dry-run

# 問題なければ実際に登録
./scripts/setup-ssm-ssl.sh
```

**登録されるパラメータ:**

| パラメータ名 | タイプ | ソースファイル |
|-------------|--------|--------------|
| `/alchemia/nginx/ssl-cert` | String | `backend/certs/server/server.crt` |
| `/alchemia/nginx/ssl-key` | SecureString | `backend/certs/server/server.key` |
| `/alchemia/nginx/ssl-ca-cert` | String | `backend/certs/ca/ca.crt` |

> **前提**: `backend/certs/server/server.crt`, `server.key`, `backend/certs/ca/ca.crt` が存在すること。  
> 存在しない場合は先に `bash scripts/generate-certificates.sh` を実行してください。

---

### Step 2: ecsTaskExecutionRole に SSM 読み取り権限を付与

ECSタスク起動時に `ecsTaskExecutionRole` が SSM から証明書を取得します。  
以下のポリシーが未設定の場合のみ実行してください。

```bash
# インラインポリシーで付与（推奨: 最小権限）
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name AlchemiaNginxSSMPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ssm:GetParameters", "ssm:GetParameter"],
      "Resource": "arn:aws:ssm:ap-northeast-1:137068252939:parameter/alchemia/nginx/*"
    }]
  }'
```

設定確認:

```bash
aws iam get-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name AlchemiaNginxSSMPolicy
```

---

### Step 3: nginx を再デプロイ

タスク定義を再登録し、ECSサービスを更新します。

```bash
# フェーズ1（ALB + NLB 共存構成）の場合
./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push

# フェーズ2（NLBのみ本番構成）の場合
./scripts/deploy.ecr.sh --nginx --no-build --no-push
```

ECSサービスの更新状況を確認:

```bash
# フェーズ1の場合
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service-https \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
```

`running` と `desired` が一致するまで待ちます（1〜2分程度）。

---

### Step 4: 動作確認

```bash
NLB_DNS="alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com"

# HTTPS疎通確認（-k は自己署名証明書のため）
curl -k https://${NLB_DNS}/api/health
# 期待レスポンス: {"status":"ok"}

# nginx ログでエラーがないか確認
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 10m
```

---

### Step 5: Chrome の証明書警告を解消する（自己署名CAの場合）

証明書が正しく配置されても、**自己署名CAがChromeに信頼されていない**ため警告が表示されます。

#### 方法A: CA証明書をWindowsの信頼済みルートに追加（推奨）

1. `backend/certs/ca/ca.crt` をローカルにコピー
2. `ca.crt` をダブルクリック →「証明書のインストール」
3. 「ローカルコンピュータ」を選択 →「次へ」
4. 「証明書をすべて次のストアに配置する」→「参照」→「信頼されたルート証明機関」
5. 「完了」→ Chrome を完全再起動（`Ctrl+Shift+Q` で全ウィンドウ閉じてから再起動）

#### 方法B: staging環境の一時的な回避（非推奨）

Chrome の証明書警告画面にフォーカスした状態で `thisisunsafe` とキーボード入力します。  
（このセッション中のみ有効）

---

## トラブルシューティング

### ECSタスクが起動しない（`ResourceInitializationError`）

```bash
# タスクの停止理由を確認
aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks $(aws ecs list-tasks --cluster alchemia-staging --service-name alchemia-nginx-service-https --region ap-northeast-1 --query 'taskArns[0]' --output text) \
  --region ap-northeast-1 \
  --query 'tasks[0].{status:lastStatus,reason:stoppedReason,containers:containers[*].{name:name,reason:reason}}'
```

**`CannotPullContainerError` または `ResourceInitializationError: unable to pull secrets`** が出た場合:

- `ecsTaskExecutionRole` に SSM 読み取り権限が付与されているか確認（Step 2 を再実行）
- SSM パラメータが正しく登録されているか確認:

```bash
aws ssm get-parameter --name "/alchemia/nginx/ssl-cert" --region ap-northeast-1 --query 'Parameter.{Name:Name,Type:Type}'
aws ssm get-parameter --name "/alchemia/nginx/ssl-key"  --region ap-northeast-1 --query 'Parameter.{Name:Name,Type:Type}'
aws ssm get-parameter --name "/alchemia/nginx/ssl-ca-cert" --region ap-northeast-1 --query 'Parameter.{Name:Name,Type:Type}'
```

### nginx がHTTPS:443 でLISTENしていない

```bash
# nginx コンテナのログを確認
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 5m --filter-pattern "nginx"
```

`SSL_CERT`, `SSL_KEY` が空の場合、nginx の起動スクリプト（`docker-entrypoint.sh` 等）が証明書ファイルへの書き出しに失敗しています。  
環境変数の注入が正しく行われているか ECS タスク定義の `secrets` セクションを確認してください。

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `scripts/setup-ssm-ssl.sh` | SSM Parameter Store への証明書登録スクリプト |
| `aws/ecs-task-definition-alchemia-nginx.json` | nginxタスク定義（secrets セクションでSSM参照） |
| `config/nginx/nginx.prod.conf` | nginx 設定（SSL_CERT/SSL_KEY/SSL_CA_CERT 環境変数を使用） |
| `scripts/generate-certificates.sh` | 自己署名CA・サーバー証明書の生成スクリプト |
| `docs/deploy-guide/saas/nlb-migration-guide.md` | NLB移行手順書 |
