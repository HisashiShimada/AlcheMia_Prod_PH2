# backend ECS サービスと prod-backend-tg の接続方式 設計検討

- **作成日**: 2026-04-28
- **関連手順書**: [BUILD_GUIDE.md](../staging-production-like/BUILD_GUIDE.md)
- **対象環境**: alchemia-staging（VPC: vpc-037a0cb50e47092a0）

---

## 1. 背景・問題提起

BUILD_GUIDE.md の STEP 6 で `prod-backend-tg`（バックエンド用ALBターゲットグループ）を新規作成するが、  
STEP 10 の ECS サービス作成では **新規フロントエンドサービス（prod-frontend-service）のみ** `FRONTEND_TG_ARN` を紐付けていた。

```
STEP 10-1（元の記述）:
  aws ecs create-service
    --load-balancers "targetGroupArn=<FRONTEND_TG_ARN>,containerName=mmdpf-frontend,containerPort=3000"
    # ← prod-backend-tg との接続手順がなかった
```

**疑問**: 新規に作成した `prod-backend-tg` は、既存の backend ECS サービスとどのように接続するのか？

---

## 2. ECS Fargate の制約（根本原因）

ECS Fargate（awsvpc モード）には以下の制約がある。

> **ECS サービスにロードバランサーを紐付けられるのはサービス作成時のみ。**  
> `aws ecs update-service` コマンドでは `--load-balancers` パラメータを変更できない。

つまり、既存の backend ECS サービスに後から `prod-backend-tg` を追加することは **AWS の仕様上不可能**。

---

## 3. 対応案の比較検討

### 案A: 手動 IP 登録（暫定対応）

実行中の backend タスクの IP を調べて、`prod-backend-tg` に手動で登録する方法。

```bash
# タスクIPを取得して手動登録
TASK_IP=$(aws ecs describe-tasks --cluster alchemia-staging --tasks $TASK_ARN \
  --query 'tasks[0].attachments[0].details[?name==`privateIPv4Address`].value' \
  --output text)

aws elbv2 register-targets \
  --target-group-arn <BACKEND_TG_ARN> \
  --targets Id=$TASK_IP,Port=3001
```

**問題点:**
- タスクが入れ替わる（デプロイ・障害復旧・スケールアウト等）たびに手動で再登録が必要
- ECS サービスとターゲットグループの管理が分離するため、自動ヘルスチェック連動が失われる
- 本番運用には適さない一時対応

### 案B: backend ECS サービスの再作成（採用）✅

既存 backend ECS サービスを削除し、`prod-backend-tg` を `--load-balancers` に追加した形で再作成する。

**メリット:**
- ECS サービスがターゲットグループを自律管理（タスク起動・停止時に自動登録・解除）
- ヘルスチェック連動が正常に機能する
- 永続的な解決策

**デメリット:**
- 再作成中（旧サービス削除〜新サービス RUNNING まで）に数分間のダウンタイムが発生する

**採用理由:** 検証環境での一時的なダウンタイムは許容できるため、運用上正しい接続方式である案Bを採用。

---

## 4. 既存通信経路への影響分析

backend サービスを再作成した場合、既存の通信経路（NLB / 旧ALB 経由）への影響を確認した。

### 現状の通信経路

```
[外部クライアント]
  │
  ├─ NLB（TCP:443/80）
  │    └─ nginx ECS タスク
  │         └─ BACKEND_HOST:3001 → alchemia-backend.alchemia.local
  │                                      ↕ ECS Service Discovery（DNS）
  │                                 backend ECS タスク（TCP:3001）
  │
  └─ 旧ALB（HTTPS:443）
       └─ nginx ECS タスク（同上）
```

### nginx の BACKEND_HOST 設定

`config/nginx/nginx.prod.conf` の設定を確認した。

```nginx
# nginx が backend に接続する際のホスト名
set $backend_upstream http://alchemia-backend.alchemia.local:3001;
```

nginx は **ECS Service Discovery の DNS 名**（`alchemia-backend.alchemia.local`）で backend に接続している。

### ECS Service Discovery の動作

ECS Service Discovery は Route 53 Private Hosted Zone を使用した DNS ベースのサービスディスカバリ機能。

| イベント | 動作 |
|---------|------|
| backend タスクが `RUNNING` になった時 | DNS に新しいタスクの IP アドレスが自動登録される |
| backend タスクが停止した時 | DNS から該当 IP アドレスが自動削除される |
| backend サービスを再作成して新タスクが起動した時 | DNS が新しい IP に自動更新される |

### nginx による動的 DNS 解決

nginx 設定で `set $backend_upstream` による変数化がされているため、nginx はリクエストのたびに DNS を引き直す。  
これにより、backend タスクの IP が変わっても nginx の設定変更・再起動なしに自動追従する。

### 結論：既存通信への影響なし

```
backend サービス再作成の影響タイムライン:

  旧タスク停止  →  DNS から旧IP削除  →  新タスク RUNNING  →  DNS に新IP登録
  ↑                                                          ↑
  ここから nginx の backend 接続失敗（数分間）              ここから自動復旧 ✅

  ダウンタイム: 旧サービス削除〜新タスクが RUNNING になるまで（目安: 5〜10分）
```

**既存の ALB / NLB → nginx → backend の通信は、新タスクが `RUNNING` になった時点で自動復旧する。**  
nginx の設定変更・再起動・手動操作は不要。

---

## 5. prod-backend-tg 接続後の通信経路

backend サービス再作成後の全通信経路。

```
[外部クライアント]
  │
  ├─ NLB（TCP:443/80）
  │    └─ nginx ECS タスク
  │         └─ alchemia-backend.alchemia.local:3001 → backend ECS タスク ✅（従来通り）
  │
  ├─ 旧ALB（HTTPS:443）
  │    └─ nginx ECS タスク（同上） ✅（従来通り）
  │
  └─ 新ALB prod-verification-alb（HTTPS:443）  ← 今回追加
       ├─ /* → prod-frontend-tg → frontend ECS タスク（TCP:3000） ✅（新規）
       └─ /api/* → prod-backend-tg → backend ECS タスク（TCP:3001） ✅（新規）
```

---

## 6. 作業時の注意事項

### ダウンタイムの最小化

| 操作 | 所要時間（目安） |
|------|----------------|
| `desired-count 0` でタスク停止 | 1〜2分 |
| `delete-service` の完了 | 即時（INACTIVE 確認） |
| 新サービス作成〜タスク RUNNING | 3〜5分 |
| backend-tg ヘルスチェック通過 | 1〜2分（healthy_threshold: 2回） |
| **合計ダウンタイム** | **約 5〜10分** |

### 再作成時の引き継ぎ必須パラメータ

backend サービスを再作成する際、以下のパラメータを元の設定から変更しないこと。

| パラメータ | 確認方法 |
|-----------|---------|
| `--task-definition` | `describe-services` → `taskDefinition` |
| `--desired-count` | `describe-services` → `desiredCount` |
| `--network-configuration` | `describe-services` → `networkConfiguration` |
| 既存の `--load-balancers` | `describe-services` → `loadBalancers` |
| `--service-registries`（Service Discovery設定） | `describe-services` → `serviceRegistries` |

> ⚠️ **`--service-registries` を忘れると ECS Service Discovery が無効になり、nginx からの接続が失敗する**。  
> `describe-services` で `serviceRegistries` が存在する場合は、再作成コマンドに必ず含めること。

---

## 7. 参照ファイル

| ファイル | 内容 |
|---------|------|
| `config/nginx/nginx.prod.conf` | nginx の `BACKEND_HOST` 設定（ECS Service Discovery DNS 使用を確認） |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/BUILD_GUIDE.md` | 実際の構築手順（STEP 10-5 / 10-6） |
| `docs/deploy-guide/aws-infrastructure/research/alb-target-group.md` | ALB ターゲットグループの調査資料 |

---

*本ドキュメントは `BUILD_GUIDE.md` の設計検討内容を補足するものです。*
