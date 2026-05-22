# トラブルシューティング: ログイン後502エラー

- **発生日時**: 2026-04-30
- **発生箇所**: NLB / ALB 経由でログイン操作時
- **担当者**: Cline

---

## 1. 現象

- `https://alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com/` および  
  `http://alchemia-staging-alb-987042084.ap-northeast-1.elb.amazonaws.com/?orgId=...` でログイン後、**「サーバーエラーが発生しました」**と表示される。
- ブラウザの開発者ツールで確認すると、`POST /api/v1/auth/login` に対して **HTTP 502** が返っている。

---

## 2. 調査経緯

| 手順 | 確認内容 | 結果 |
|-----|---------|------|
| backend ECS サービス確認 | `running:1 / desired:1` | ✅ 正常 |
| prod-backend-tg ヘルス確認 | `healthy` | ✅ 正常 |
| NLB リスナー/TG 構成確認 | NLB → nginx-tg (TCP:443) → nginx-https-service | ✅ 正常 |
| nginx サービス確認 | `running:1` | ✅ 正常 |
| nginx-tg ヘルス確認 | `healthy (10.1.2.108:443)` | ✅ 正常 |
| nginx タスク定義確認 | `BACKEND_HOST=alchemia-backend.alchemia.local` | ✅ 正常 |
| **Cloud Map インスタンス確認** | `Instances: []`（空） | **❌ 異常** |

---

## 3. 根本原因

### 直接原因

**prod-verification-alb-build-guide.md STEP 10-6 で backend ECS サービスを削除→再作成した際に、`--service-registries` オプションを付けなかった。**

その結果、新しい backend タスクが Cloud Map（`alchemia-backend.alchemia.local`）に自分の IP を登録しなかった。

### 詳細

nginx は環境変数 `BACKEND_HOST=alchemia-backend.alchemia.local` で backend に接続している。  
この DNS 名は ECS Service Discovery（AWS Cloud Map）が管理しており、ECS サービスにタスクが起動するたびにそのタスクの IP を Cloud Map に自動登録する仕組みになっている。

サービス再作成時に `--service-registries` を省略したため：

```
nginx → alchemia-backend.alchemia.local → DNS解決 → 応答なし（Instancesが空）→ 502
```

### Cloud Map の確認コマンド

```bash
# Cloud Map サービス ID を確認
aws servicediscovery list-services \
  --filters 'Name=NAMESPACE_ID,Values=<NAMESPACE_ID>,Condition=EQ' \
  --region ap-northeast-1

# インスタンス一覧を確認（空 = 未登録）
aws servicediscovery list-instances \
  --service-id srv-ohk4a5wcrxi5cs3c \
  --region ap-northeast-1
```

---

## 4. 対策

### 即時対応（実施済み）

`--service-registries` を付けて backend サービスを再作成した。

```bash
# 1. タスク数を0にして停止
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --desired-count 0 \
  --region ap-northeast-1

# 2. サービス削除
aws ecs delete-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --force \
  --region ap-northeast-1

# 3. --service-registries を付けて再作成（containerPort は指定しない）
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-backend-service \
  --task-definition arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-backend:28 \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0c386da2db38952dc,subnet-0388f1051ba7b98ce],securityGroups=[sg-0920f1a670e75b444],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/prod-backend-tg/472a41306e792942,containerName=mmdpf-backend,containerPort=3001" \
  --service-registries "registryArn=arn:aws:servicediscovery:ap-northeast-1:137068252939:service/srv-ohk4a5wcrxi5cs3c" \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --deployment-controller type=ECS \
  --region ap-northeast-1
```

> ⚠️ **重要**: `--service-registries` に `containerPort` を含めないこと。  
> Cloud Map サービスタイプが DNS（A レコード）の場合、`containerPort` を指定すると  
> `InvalidParameterException: The values specified for serviceRegistries do not require a value for 'containerPort'`  
> エラーになる。

### 修正後の確認

```bash
# Cloud Map にIPが登録されたか確認
aws servicediscovery list-instances \
  --service-id srv-ohk4a5wcrxi5cs3c \
  --region ap-northeast-1
# → AWS_INSTANCE_IPV4 に backend タスクの IP が登録されていれば成功
```

### prod-verification-alb-build-guide.md の恒久修正

`STEP 10-5` と `STEP 10-6-4` を修正し、`--service-registries` の確認・引き継ぎ手順を追加した（2ファイル）。

| ファイル | 修正箇所 |
|---------|---------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | STEP 10-5 / 10-6-4 |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/prod-verification-alb-build-guide.md` | STEP 10-5 / 10-6-4 |

---

## 5. 補足: ECS Service Discovery の仕組み

| ポイント | 説明 |
|---------|------|
| `--service-registries` | ECS サービスに Cloud Map サービスを紐付けるオプション |
| 自動登録 | タスク起動時に Cloud Map へ IP を自動登録、タスク停止時に自動削除 |
| DNS 解決 | `alchemia-backend.alchemia.local` → Cloud Map が管理する A レコード → タスクの IP |
| nginx との関係 | nginx が `BACKEND_HOST` 環境変数で指定した FQDN を DNS 解決して backend に接続 |
| `containerPort` の扱い | DNS タイプ（A レコード）の Cloud Map サービスでは **指定不要・指定するとエラー** |

---

## 6. 関連ファイル

| ファイル | 概要 |
|---------|------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | 本番検証環境構築手順書 |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/prod-verification-alb-build-guide.md` | デプロイガイド正式版 |
| `docs/20260428_1638_本番環境検証のため検証環境修正/ERROR_INVESTIGATION.md` | 過去のエラー調査レポート |
