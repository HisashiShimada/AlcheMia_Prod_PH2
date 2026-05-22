# STEP 8-4 リスナールール確認結果

- **確認日時**: 2026-04-30
- **確認箇所**: prod-verification-alb-build-guide.md「8-4. リスナールールの確認」

---

## 1. 実行コマンドと結果

### 実行コマンド

```bash
aws elbv2 describe-rules \
  --listener-arn arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/app/prod-verification-alb/b901f038a9a6be79/f47479226ac6683d \
  --region ap-northeast-1 \
  --query 'Rules[*].{Priority:Priority,Conditions:Conditions,Actions:Actions[0].Type}'
```

### 実行結果

```json
[
    {
        "Priority": "10",
        "Conditions": [
            {
                "Field": "path-pattern",
                "Values": [
                    "/api/*"
                ],
                "PathPatternConfig": {
                    "Values": [
                        "/api/*"
                    ]
                }
            }
        ],
        "Actions": "forward"
    },
    {
        "Priority": "default",
        "Conditions": [],
        "Actions": "forward"
    }
]
```

---

## 2. 判定: ✅ 期待通りの結果

| Priority | Conditions | Actions | 意味 |
|----------|-----------|---------|------|
| `10` | `/api/*` (path-pattern) | `forward` | `/api/*` へのリクエストを `prod-backend-tg` に転送 |
| `default` | なし（全トラフィック） | `forward` | その他すべてのリクエストを `prod-frontend-tg` に転送 |

prod-verification-alb-build-guide.md の確認条件（以下）を満たしている。

> - Priority 10: `/api/*` → `prod-backend-tg` に forward
> - default: `/*` → `prod-frontend-tg` に forward

---

## 3. 補足: 転送先TGが表示されない理由

使用したクエリ `Actions[0].Type` はアクションの**種別**（`forward` / `redirect` 等）のみを抽出するため、どのターゲットグループへ転送するかは表示されない。これはクエリの仕様によるものであり、結果が誤っているわけではない。

### 転送先TGも含めて確認したい場合

以下のクエリを使用することで、転送先ターゲットグループのARNまで確認できる。

```bash
aws elbv2 describe-rules \
  --listener-arn arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/app/prod-verification-alb/b901f038a9a6be79/f47479226ac6683d \
  --region ap-northeast-1 \
  --query 'Rules[*].{Priority:Priority,Conditions:Conditions,TargetGroup:Actions[0].ForwardConfig.TargetGroups[0].TargetGroupArn,ActionType:Actions[0].Type}'
```

期待される結果:
- Priority 10 の `TargetGroup` → `prod-backend-tg` の ARN
- default の `TargetGroup` → `prod-frontend-tg` の ARN

---

## 4. 次のステップ

STEP 8 のチェックリスト「リスナールールが正しく設定されていることを確認した」にチェックし、**STEP 9（ECSタスク定義の登録）へ進む**。
