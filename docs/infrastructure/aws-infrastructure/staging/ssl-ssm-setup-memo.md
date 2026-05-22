### Step 1: SSM Parameter Store に証明書を登録

```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ ./scripts/setup-ssm-ssl.sh --dry-run
========================================
 SSL証明書 SSM Parameter Store 登録
========================================

リージョン  : ap-northeast-1
アカウントID: 137068252939

証明書ファイル確認:
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/server/server.crt
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/server/server.key
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/ca/ca.crt

証明書情報:
  server.crt: subject=C=JP, ST=Tokyo, L=Tokyo, O=MMDPF, OU=Development, CN=localhost notBefore=Feb 19 06:13:59 2026 GMT notAfter=Feb 19 06:13:59 2027 GMT
  ca.crt    : subject=C=JP, ST=Tokyo, L=Tokyo, O=MMDPF, OU=Development, CN=MMDPF CA notBefore=Feb 18 07:51:54 2026 GMT notAfter=Feb 16 07:51:54 2036 GMT

========================================
 [DRY-RUN] 以下のパラメータを登録します
========================================

  /alchemia/nginx/ssl-cert    (String)       ← server.crt
  /alchemia/nginx/ssl-key     (SecureString) ← server.key
  /alchemia/nginx/ssl-ca-cert (String)       ← ca.crt

[DRY-RUN] --dry-run を外して実行すると実際に登録されます。
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ ./scripts/alchemia-staging/setup-ssm-ssl.sh
========================================
 SSL証明書 SSM Parameter Store 登録
========================================

リージョン  : ap-northeast-1
アカウントID: 137068252939

証明書ファイル確認:
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/server/server.crt
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/server/server.key
  ✅ /home/ec2-user/projects/Alchemia_Staging/backend/certs/ca/ca.crt

証明書情報:
  server.crt: subject=C=JP, ST=Tokyo, L=Tokyo, O=MMDPF, OU=Development, CN=localhost notBefore=Feb 19 06:13:59 2026 GMT notAfter=Feb 19 06:13:59 2027 GMT
  ca.crt    : subject=C=JP, ST=Tokyo, L=Tokyo, O=MMDPF, OU=Development, CN=MMDPF CA notBefore=Feb 18 07:51:54 2026 GMT notAfter=Feb 16 07:51:54 2036 GMT

SSM Parameter Store に証明書を登録します...

[1/3] /alchemia/nginx/ssl-cert を登録中...
{
    "Version": 1,
    "Tier": "Standard"
}
  ✅ 登録完了
[2/3] /alchemia/nginx/ssl-key を登録中...
{
    "Version": 1,
    "Tier": "Standard"
}
  ✅ 登録完了
[3/3] /alchemia/nginx/ssl-ca-cert を登録中...
{
    "Version": 1,
    "Tier": "Standard"
}
  ✅ 登録完了

========================================
 ✅ SSM Parameter Store 登録完了
========================================

登録されたパラメータ:
-------------------------------------------------------------------------------------
|                                DescribeParameters                                 |
+-----------------------------------+-------------------------------+---------------+
|           LastModified            |             Name              |     Type      |
+-----------------------------------+-------------------------------+---------------+
|  2026-04-16T23:52:03.275000+00:00 |  /alchemia/nginx/ssl-ca-cert  |  String       |
|  2026-04-16T23:52:01.420000+00:00 |  /alchemia/nginx/ssl-cert     |  String       |
|  2026-04-16T23:52:02.339000+00:00 |  /alchemia/nginx/ssl-key      |  SecureString |
+-----------------------------------+-------------------------------+---------------+

========================================
 次のステップ
========================================

① ecsTaskExecutionRole に SSM 読み取り権限を付与（未設定の場合のみ）:

   # インラインポリシーで追加する場合
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

   # または AmazonSSMReadOnlyAccess を付与（全SSM読み取りが許可されます）
   aws iam attach-role-policy \
     --role-name ecsTaskExecutionRole \
     --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess

② nginx を再デプロイ:
   ./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push

[ec2-user@ip-10-1-11-44 Alchemia_Staging]$
```

### Step 2: ecsTaskExecutionRole に SSM 読み取り権限を付与
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws iam put-role-policy \
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
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws iam get-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name AlchemiaNginxSSMPolicy
{
    "RoleName": "ecsTaskExecutionRole",
    "PolicyName": "AlchemiaNginxSSMPolicy",
    "PolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "ssm:GetParameters",
                    "ssm:GetParameter"
                ],
                "Resource": "arn:aws:ssm:ap-northeast-1:137068252939:parameter/alchemia/nginx/*"
            }
        ]
    }
}
```

### Step 3: nginx を再デプロイ
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ ./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push
[2026-04-16 23:55:23] [INFO ] ============================================================
[2026-04-16 23:55:23] [INFO ]   Alchemia Staging ECR デプロイ開始（フェーズ1: ALB+NLB共存）
[2026-04-16 23:55:23] [INFO ] ============================================================
[2026-04-16 23:55:23] [INFO ]   クラスター  : alchemia-staging
[2026-04-16 23:55:23] [INFO ]   リージョン  : ap-northeast-1
[2026-04-16 23:55:23] [INFO ]   イメージタグ: staging
[2026-04-16 23:55:23] [INFO ]   ビルド      : false
[2026-04-16 23:55:23] [INFO ]   プッシュ    : false
[2026-04-16 23:55:23] [INFO ]   デプロイ    : true
[2026-04-16 23:55:23] [INFO ]   マイグレ    : false
[2026-04-16 23:55:23] [INFO ]   対象        : nginx(frontend含む) のみ
[2026-04-16 23:55:23] [INFO ]   ⚠️  [フェーズ1] nginx更新対象サービス:
[2026-04-16 23:55:23] [INFO ]        - alchemia-nginx-service       (ALB → HTTP:80)
[2026-04-16 23:55:23] [INFO ]        - alchemia-nginx-service-https  (NLB → TCP:443)
[2026-04-16 23:55:23] [INFO ]   ログ        : /home/ec2-user/projects/Alchemia_Staging/logs/deploy-ecr-20260416_235523.log
[2026-04-16 23:55:23] [INFO ] ============================================================
[2026-04-16 23:55:23] [INFO ] --- Step 1: 前提条件チェック ---
[2026-04-16 23:55:23] [OK   ] ✅ Docker: Docker version 25.0.14, build 0bab007
[2026-04-16 23:55:23] [OK   ] ✅ AWS CLI: aws-cli/2.33.15 Python/3.9.25 Linux/6.1.166-197.305.amzn2023.x86_64 source/x86_64.amzn.2023
[2026-04-16 23:55:24] [OK   ] ✅ AWS 認証: アカウント 137068252939
[2026-04-16 23:55:25] [OK   ] ✅ ECSクラスター: alchemia-staging (ACTIVE)
[2026-04-16 23:55:26] [OK   ] ✅ [フェーズ1] alchemia-nginx-service-https: ACTIVE（NLBサービス確認OK）
[2026-04-16 23:55:26] [OK   ] ✅ 前提条件: すべてOK
[2026-04-16 23:55:26] [INFO ] --- Step 2: ECR ログインをスキップ（ビルド・プッシュなし）---
[2026-04-16 23:55:26] [WARN ] ⚠️  --- Step 3: ビルドをスキップ（--no-build）---
[2026-04-16 23:55:26] [WARN ] ⚠️  --- Step 4: ECRプッシュをスキップ（--no-push）---
[2026-04-16 23:55:26] [INFO ] --- Step 5: DBマイグレーションをスキップ（--migrate で実行）---
[2026-04-16 23:55:26] [INFO ] --- Step 6: ECSタスク定義の登録 & サービス更新 ---
[2026-04-16 23:55:26] [INFO ] [Nginx] タスク定義を登録中...
[2026-04-16 23:55:27] [OK   ] ✅ [Nginx] タスク定義登録完了: arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:11
[2026-04-16 23:55:27] [INFO ] [Nginx] ECSサービスを更新中... (ALB: alchemia-nginx-service)
-------------------------------------------------------------
|                       UpdateService                       |
+---------+----------+----------+---------------------------+
| desired | pending  | running  |          service          |
+---------+----------+----------+---------------------------+
|  1      |  0       |  1       |  alchemia-nginx-service   |
+---------+----------+----------+---------------------------+
[2026-04-16 23:55:28] [OK   ] ✅ [Nginx] サービス更新リクエスト送信完了 (ALB: alchemia-nginx-service)
[2026-04-16 23:55:28] [INFO ] [Nginx] ECSサービスを更新中... (NLB: alchemia-nginx-service-https)
-------------------------------------------------------------------
|                          UpdateService                          |
+---------+----------+----------+---------------------------------+
| desired | pending  | running  |             service             |
+---------+----------+----------+---------------------------------+
|  1      |  0       |  1       |  alchemia-nginx-service-https   |
+---------+----------+----------+---------------------------------+
[2026-04-16 23:55:30] [OK   ] ✅ [Nginx] サービス更新リクエスト送信完了 (NLB: alchemia-nginx-service-https)
[2026-04-16 23:55:30] [INFO ] --- Step 6.5: デプロイ開始直後のECSサービス状態確認 ---
[2026-04-16 23:55:30] [INFO ]   ※ ローリングアップデート開始直後のため pending > 0 は正常です
[2026-04-16 23:55:30] [INFO ]   [Nginx+Frontend (ALB)] サービス状態を取得中...
[2026-04-16 23:55:32] [INFO ]   ┌─────────────────────────────────────────────
[2026-04-16 23:55:32] [INFO ]   │ ✅ [Nginx+Frontend (ALB)] alchemia-nginx-service
[2026-04-16 23:55:32] [INFO ]   │   ステータス    : ACTIVE
[2026-04-16 23:55:32] [INFO ]   │   desired       : 1
[2026-04-16 23:55:32] [INFO ]   │   running       : 1
[2026-04-16 23:55:32] [INFO ]   │   pending       : 0
[2026-04-16 23:55:32] [INFO ]   │   タスク定義Rev : 11 / 最新: 11 ✅ 最新  (登録日時: 2026-04-16T23:55:27.148000+00:00)
[2026-04-16 23:55:34] [INFO ]   │   稼働中イメージ:
[2026-04-16 23:55:34] [INFO ]   │     - mmdpf-nginx:staging
[2026-04-16 23:55:34] [INFO ]   │     - mmdpf-frontend:staging
[2026-04-16 23:55:34] [INFO ]   │   直近イベント:
[2026-04-16 23:55:34] [INFO ]   └─────────────────────────────────────────────
[2026-04-16 23:55:34] [OK   ] ✅ [Nginx+Frontend (ALB)] デプロイ正常完了 (running=1/1, pending=0)
[2026-04-16 23:55:35] [INFO ]   [Nginx+Frontend (NLB)] サービス状態を取得中...
[2026-04-16 23:55:36] [INFO ]   ┌─────────────────────────────────────────────
[2026-04-16 23:55:36] [INFO ]   │ ✅ [Nginx+Frontend (NLB)] alchemia-nginx-service-https
[2026-04-16 23:55:36] [INFO ]   │   ステータス    : ACTIVE
[2026-04-16 23:55:36] [INFO ]   │   desired       : 1
[2026-04-16 23:55:36] [INFO ]   │   running       : 1
[2026-04-16 23:55:36] [INFO ]   │   pending       : 0
[2026-04-16 23:55:36] [INFO ]   │   タスク定義Rev : 11 / 最新: 11 ✅ 最新  (登録日時: 2026-04-16T23:55:27.148000+00:00)
[2026-04-16 23:55:38] [INFO ]   │   稼働中イメージ:
[2026-04-16 23:55:38] [INFO ]   │     - mmdpf-frontend:staging
[2026-04-16 23:55:38] [INFO ]   │     - mmdpf-nginx:staging
[2026-04-16 23:55:38] [INFO ]   │   直近イベント:
[2026-04-16 23:55:39] [INFO ]   └─────────────────────────────────────────────
[2026-04-16 23:55:39] [OK   ] ✅ [Nginx+Frontend (NLB)] デプロイ正常完了 (running=1/1, pending=0)
[2026-04-16 23:55:39] [INFO ] --- Step 7: 安定化待ちをスキップ（--wait を付けると待機・詳細確認）---
[2026-04-16 23:55:39] [INFO ]
[2026-04-16 23:55:39] [INFO ] ============================================================
[2026-04-16 23:55:39] [OK   ] ✅   Alchemia Staging ECR デプロイ完了！（フェーズ1: ALB+NLB共存）
[2026-04-16 23:55:39] [INFO ] ============================================================
[2026-04-16 23:55:39] [INFO ]
[2026-04-16 23:55:39] [INFO ]   デプロイ情報:
[2026-04-16 23:55:39] [INFO ]     イメージタグ : staging
[2026-04-16 23:55:39] [INFO ]     クラスター   : alchemia-staging
[2026-04-16 23:55:39] [INFO ]     リージョン   : ap-northeast-1
[2026-04-16 23:55:39] [INFO ]
[2026-04-16 23:55:39] [INFO ]   ▼ 現在のECSサービス状態（デプロイ後）
[2026-04-16 23:55:39] [INFO ]   [Nginx+Frontend (ALB)] サービス状態を取得中...
[2026-04-16 23:55:40] [INFO ]   ┌─────────────────────────────────────────────
[2026-04-16 23:55:40] [INFO ]   │ ✅ [Nginx+Frontend (ALB)] alchemia-nginx-service
[2026-04-16 23:55:40] [INFO ]   │   ステータス    : ACTIVE
[2026-04-16 23:55:40] [INFO ]   │   desired       : 1
[2026-04-16 23:55:40] [INFO ]   │   running       : 1
[2026-04-16 23:55:40] [INFO ]   │   pending       : 0
[2026-04-16 23:55:40] [INFO ]   │   タスク定義Rev : 11 / 最新: 11 ✅ 最新  (登録日時: 2026-04-16T23:55:27.148000+00:00)
[2026-04-16 23:55:42] [INFO ]   │   稼働中イメージ:
[2026-04-16 23:55:42] [INFO ]   │     - mmdpf-nginx:staging
[2026-04-16 23:55:42] [INFO ]   │     - mmdpf-frontend:staging
[2026-04-16 23:55:42] [INFO ]   │   直近イベント:
[2026-04-16 23:55:43] [INFO ]   └─────────────────────────────────────────────
[2026-04-16 23:55:43] [OK   ] ✅ [Nginx+Frontend (ALB)] デプロイ正常完了 (running=1/1, pending=0)
[2026-04-16 23:55:43] [INFO ]   [Nginx+Frontend (NLB)] サービス状態を取得中...
[2026-04-16 23:55:45] [INFO ]   ┌─────────────────────────────────────────────
[2026-04-16 23:55:45] [INFO ]   │ ✅ [Nginx+Frontend (NLB)] alchemia-nginx-service-https
[2026-04-16 23:55:45] [INFO ]   │   ステータス    : ACTIVE
[2026-04-16 23:55:45] [INFO ]   │   desired       : 1
[2026-04-16 23:55:45] [INFO ]   │   running       : 1
[2026-04-16 23:55:45] [INFO ]   │   pending       : 0
[2026-04-16 23:55:45] [INFO ]   │   タスク定義Rev : 11 / 最新: 11 ✅ 最新  (登録日時: 2026-04-16T23:55:27.148000+00:00)
[2026-04-16 23:55:46] [INFO ]   │   稼働中イメージ:
[2026-04-16 23:55:46] [INFO ]   │     - mmdpf-frontend:staging
[2026-04-16 23:55:46] [INFO ]   │     - mmdpf-nginx:staging
[2026-04-16 23:55:46] [INFO ]   │   直近イベント:
[2026-04-16 23:55:47] [INFO ]   └─────────────────────────────────────────────
[2026-04-16 23:55:47] [OK   ] ✅ [Nginx+Frontend (NLB)] デプロイ正常完了 (running=1/1, pending=0)
[2026-04-16 23:55:47] [INFO ]
[2026-04-16 23:55:47] [INFO ]   ℹ️  --wait オプションなしのため、デプロイは非同期で進行中です
[2026-04-16 23:55:47] [INFO ]      以下のコマンドで状態を再確認できます:
[2026-04-16 23:55:47] [INFO ]        ./scripts/deploy.ecr.phase1.sh --check
[2026-04-16 23:55:47] [INFO ]
[2026-04-16 23:55:47] [INFO ]   AWSコンソール:
[2026-04-16 23:55:47] [INFO ]     https://console.aws.amazon.com/ecs/home?region=ap-northeast-1#/clusters/alchemia-staging/services
[2026-04-16 23:55:47] [INFO ]
[2026-04-16 23:55:47] [INFO ]   CloudWatch Logs:
[2026-04-16 23:55:47] [INFO ]     Backend  : https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Falchemia-backend
[2026-04-16 23:55:47] [INFO ]     Nginx    : https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Falchemia-nginx
[2026-04-16 23:55:47] [INFO ]
[2026-04-16 23:55:47] [INFO ]   デプロイログ: /home/ec2-user/projects/Alchemia_Staging/logs/deploy-ecr-20260416_235523.log
[2026-04-16 23:55:47] [INFO ] ============================================================
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service-https \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
{
    "running": 1,
    "desired": 1,
    "pending": 1
}
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws ecs describe-services   --cluster alchemia-staging   --services alchemia-nginx-service-https   --region ap-northeast-1   --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
{
    "running": 1,
    "desired": 1,
    "pending": 0
}
```