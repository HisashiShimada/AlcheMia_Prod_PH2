# REPORT15: サブネット分離・AZ冗長構成の検討

**作成日時**: 2026-04-24  
**対象ファイル**: `production-architecture.drawio` / `staging-architecture.drawio`

---

## 1. frontend / backend を別サブネットにする必要はあるか？

### 現状の構成

`production-architecture.drawio` の VPC 内では `alchemia-frontend-service` と `alchemia-backend-service` が明示的なサブネット区分なく同居している（ラベルには「プライベートサブネット」と一括表記）。

---

### 結論：**分離は「必須」ではないが、推奨される**

#### ✅ 同一サブネットで問題ない理由（現構成の防御）

| 観点 | 現構成での対策 |
|------|--------------|
| **frontend → backend の直接通信を防ぐ** | frontend-sg は ALB からの TCP:3000 のみ許可。backend-sg は ALB からの TCP:3001 のみ許可。**VPC 内での frontend→backend 直接通信は SG で遮断済み** |
| **外部からの直接アクセス防止** | 両サービスともプライベートサブネットに配置、ALB 経由のみ |
| **DB/Redis へのアクセス制限** | aurora-sg / redis-sg は backend-sg のみ許可（frontend は到達不可） |

この構成では **セキュリティグループ (SG) が主要な分離境界** となっており、同一サブネットでも機能的・セキュリティ的に問題はない。

---

#### ⚠️ 別サブネットにすべきケース

以下に該当する場合は分離を推奨する：

1. **コンプライアンス要件がある場合**（PCI DSS、ISO 27001 等でネットワーク層の分離を要求）
2. **NACL（ネットワーク ACL）を活用したい場合**（NACL はサブネット単位で適用）
3. **将来的に frontend から backend への直接通信を許可する可能性がある場合**（APIプロキシ等）

---

#### 🔑 より重要な指摘：Multi-AZ のためのサブネット分割

現図では「プライベートサブネット」が1つに見えるが、**`desiredCount: 2以上` を実現するためには最低2AZ（例：ap-northeast-1a / ap-northeast-1c）にまたがるサブネットが必要**。

この点が図から読み取れていないため、図の修正が望ましい。

---

### 推奨する構成案（3択）

#### 案A：現状維持（SG分離のみ）

```
プライベートサブネット-1a (10.0.1.0/24)
  └─ frontend タスク × 1
  └─ backend タスク × 1

プライベートサブネット-1c (10.0.2.0/24)
  └─ frontend タスク × 1
  └─ backend タスク × 1
```

最小構成。SG による分離で十分な場合。

#### 案B：ロール別サブネット分離（推奨・Well-Architected 準拠）

```
frontend-subnet-1a (10.0.1.0/24)  + frontend-subnet-1c (10.0.2.0/24)
  └─ alchemia-frontend-service

backend-subnet-1a (10.0.3.0/24)   + backend-subnet-1c (10.0.4.0/24)
  └─ alchemia-backend-service

data-subnet-1a (10.0.5.0/24)      + data-subnet-1c (10.0.6.0/24)
  └─ Aurora / Redis / VPC Endpoints
```

AWS Well-Architected の「Web 層 / App 層 / Data 層」に対応。NACL での追加制御が可能。

#### 案C：簡略化（frontend+backend 共用 / data 分離）

```
app-subnet-1a/1c  : frontend + backend ECS タスク
data-subnet-1a/1c : Aurora / Redis / VPC Endpoints
```

---

### まとめ（サブネット分離）

| | 同一サブネット | 別サブネット |
|--|--|--|
| **セキュリティ** | SG で十分確保可能 | 深層防御（NACL 追加可） |
| **運用複雑性** | 低 | やや高 |
| **コンプライアンス** | 一般用途は問題なし | 厳格な要件では必要 |
| **Multi-AZ 対応** | AZ 分割は必須（どちらも同じ） | 同左 |

**今回の mmdpf 本番環境では**、コンプライアンス要件が特になければ **案A（同一サブネット、Multi-AZ 対応を明示）** で問題ない。ただし図の表現として **2つの AZ にまたがるサブネットを明示する**修正は行うべき。

---

## 2. desiredCount=2 + AZ:2 でのタスク配置動作

### デフォルト動作（設定なし）

ECS のデフォルトの配置戦略は `RANDOM`（ランダム）。

```
デフォルト（RANDOM）の場合：
  1a に 2つ → あり得る ⚠️
  1a に 1つ + 1c に 1つ → あり得る
  1c に 2つ → あり得る ⚠️
```

### AZ 分散を保証するには明示的な配置戦略が必要

ECS サービスに以下の配置戦略（Placement Strategy）を設定することで、AZ 間に均等分散される。

```json
{
  "placementStrategy": [
    {
      "type": "spread",
      "field": "attribute:ecs.availability-zone"
    }
  ]
}
```

CloudFormation / CDK での設定例：

```yaml
PlacementStrategies:
  - Type: spread
    Field: attribute:ecs.availability-zone
```

この設定をすることで：

```
desiredCount: 2 + AZ: 2 の場合
  ap-northeast-1a のサブネット → タスク × 1 ✅
  ap-northeast-1c のサブネット → タスク × 1 ✅
```

### 補足：Fargate の場合の注意点

Fargate でも EC2 の配置戦略と同様の設定が使える。ただし **AWS Fargate では `spread by instanceId` は使えない**（インスタンス概念がないため）ので、必ず `attribute:ecs.availability-zone` を指定する。

### まとめ（配置戦略）

| 設定 | 結果 |
|------|------|
| 配置戦略なし（デフォルト） | AZ分散は保証されない（同じAZになる可能性あり） |
| `spread: ecs.availability-zone` 指定 | AZに均等分散が保証される ✅ |
| desiredCount=4, AZ=2 | 各AZに2タスクずつ均等配置 ✅ |

**本番環境の ECS サービス設定には `spread: attribute:ecs.availability-zone` を必ず追加すること。**

---

## 3. 検証環境の AZ 構成の問題点

### 現状の構成（staging）

```
1a: alchemia-nginx-service (desiredCount=1)  ← nginx + frontend コンテナ
1c: alchemia-backend-service (desiredCount=1) ← backend コンテナ
```

### 結論：**AZ 冗長として意味がない構成**

| AZ障害のケース | 結果 |
|---|---|
| **1a が落ちる** | nginx + frontend が全停止 → サービス完全停止 💥 |
| **1c が落ちる** | backend が全停止 → サービス完全停止 💥 |

どちらのAZが落ちてもサービスは停止する。**AZを2つに分けた意味がない。**

### なぜこうなっているか

- `desiredCount=1` のため、各サービスのタスクが1つしか存在しない
- nginx/frontend と backend が**異なるAZに1つずつ**配置されているだけ
- AZ冗長の目的は「**同じサービスのタスクを複数AZに分散**」させること

### 真のAZ冗長に必要な構成

```
desiredCount=2 + spread: ecs.availability-zone を設定

1a: nginx-service タスク × 1  +  backend-service タスク × 1
1c: nginx-service タスク × 1  +  backend-service タスク × 1
```

これなら1aが落ちても1cで継続稼働できる。

### 検証環境なので割り切りも可

ただし、検証環境（staging）では：
- コスト削減のため `desiredCount=1` は合理的
- AZ冗長は**本番環境で対応**すれば十分

`⚠️` 記号が多数ついているように、現状は「検証用の最小構成」として意図的にこうなっているものと思われる。**本番環境の production-architecture.drawio では `desiredCount=2以上` + 配置戦略の明示が必要。**
