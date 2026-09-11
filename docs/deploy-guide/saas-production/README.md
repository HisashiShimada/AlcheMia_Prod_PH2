# 本番環境 情報・注意事項リファレンス（SaaS版 / AWS ECS Fargate）

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
|-----|---------|---------:|
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

## 環境情報

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
