# ネットワーク概念 Q&A

> 本番検証環境構築（BUILD_GUIDE.md）に関する調査・質疑応答まとめ  
> **作成日**: 2026-04-27

---

## Q1. ルートテーブル（Route Table）とは何か？

### 基本的な概念

**ルートテーブル**とは、AWS VPC（Virtual Private Cloud）内でネットワークトラフィックの「経路（ルート）」を定義する設定テーブルです。

サブネット内のリソース（ECSタスクなど）がパケットを送信するとき、「どの宛先IPアドレスへのトラフィックを、どこ経由で送るか」をルートテーブルが決定します。

```
宛先（Destination）  →  ターゲット（Target）
例:
10.1.0.0/16         →  local           （VPC内部はそのまま通信）
0.0.0.0/0           →  igw-xxxxxxxx    （インターネット向けはIGW経由）
pl-xxxxxxxxx        →  vpce-xxxxxxxx   （S3向けはVPC Endpoint経由）
```

### BUILD_GUIDE.md における役割

本手順書では **`prod-app-private-rt`** という名前のルートテーブルを新規作成しています（STEP 5）。

#### なぜ必要か？

今回作成するアプリ層プライベートサブネット（`prod-app-private-1a` / `prod-app-private-1c`）は **インターネットへの経路を持たない**設計です。  
しかし ECS タスクが起動するには ECR（コンテナイメージ取得）・S3・CloudWatch Logs へアクセスする必要があります。

そこで **VPC Endpoint** を経由してプライベートにAWSサービスへ到達できるよう、以下のルートをテーブルに設定しています：

| 宛先 | ターゲット | 用途 |
|------|-----------|------|
| `10.1.0.0/16`（VPC CIDR） | `local` | VPC内部通信（ALBとの通信など） |
| S3の prefix list | S3 Gateway Endpoint | ECRイメージのレイヤー取得（S3経由） |

### サブネットとの関連付け

ルートテーブルは**サブネット単位で関連付け**ます。

```
prod-app-private-rt（ルートテーブル）
    ├── prod-app-private-1a（サブネット）
    └── prod-app-private-1c（サブネット）
```

このサブネット内のECSタスクは、`prod-app-private-rt` のルールに従ってトラフィックを転送します。

### パブリックサブネット vs プライベートサブネットの違い（ルートテーブル観点）

| 種別 | `0.0.0.0/0` の向き先 | インターネット通信 |
|------|---------------------|-----------------|
| パブリックサブネット | Internet Gateway（IGW） | ✅ 可能 |
| プライベートサブネット（NAT有） | NAT Gateway | ✅ 可能（アウトバウンドのみ） |
| **今回のプライベートサブネット** | **なし（VPC Endpointのみ）** | **❌ 不可（意図的）** |

今回はセキュリティ強化のため、ECSタスクをインターネットから完全に隔離し、必要なAWSサービスへの通信のみ VPC Endpoint 経由で許可する構成になっています。

---

## Q2. VPC EndpointのGateway型とInterface型はなぜ2種類あるのか？

### Gateway型が先に登場した（歴史的経緯）

VPC Endpoint は最初 **Gateway型だけ**で登場しました（2015年頃）。  
対象は **S3 と DynamoDB** の2つのみで、これらは AWS の中でも特に**トラフィック量が膨大**なサービスです。

S3・DynamoDB 向けのトラフィックをすべて Interface型（ENI）で処理すると、膨大な数の ENI が必要になりコストが跳ね上がります。そのため、ルートテーブルでトラフィックを「曲げる」だけで済む **軽量な Gateway型** が採用されました。

### Interface型は後から汎用的に設計された

その後、ECR・Secrets Manager・Systems Manager など **多くのAWSサービスへのプライベートアクセス需要**が高まり、汎用的な仕組みとして **Interface型（PrivateLink）** が登場しました（2017年頃）。

Interface型は ENI（Elastic Network Interface）を使うため以下の特徴があります：

- **任意のAWSサービスに適用可能**（新しいサービスが増えても対応しやすい）
- **セキュリティグループで制御できる**（ENIに紐付けるため）
- **プライベートDNSで透過的に使える**（アプリ側のコード変更不要）

ただし ENI には **料金が発生**します（時間課金＋データ転送料）。

### 2種類の比較

| | Gateway型 | Interface型 |
|--|----------|------------|
| 対象サービス | S3・DynamoDB のみ（固定） | ほぼすべてのAWSサービス |
| 料金 | **無料** | 有料（時間＋データ転送） |
| 仕組み | ルートテーブルへのルート追加 | ENI＋PrivateLink |
| セキュリティグループ | 使えない | 使える |
| DNS上書き | なし | プライベートDNS利用可 |

### 一言まとめ

> 「S3・DynamoDB は使用量が桁違いに多いので、軽量・無料の Gateway型を専用設計した。それ以外のサービスは後から汎用的な Interface型（PrivateLink）で対応した」

という歴史的・コスト的な理由で2種類が併存しています。

### BUILD_GUIDE.md での使い分け

| Endpoint名 | 種別 | 理由 |
|-----------|------|------|
| prod-s3-endpoint | **Gateway型** | S3は無料のGateway型が使えるため |
| prod-ecr-api-endpoint | Interface型 | ECRはGateway型が存在しないため |
| prod-ecr-dkr-endpoint | Interface型 | ECRはGateway型が存在しないため |
| prod-logs-endpoint | Interface型 | CloudWatch LogsはGateway型が存在しないため |

---

*本ファイルは BUILD_GUIDE.md 読解中に発生した質疑応答をまとめたものです。*
