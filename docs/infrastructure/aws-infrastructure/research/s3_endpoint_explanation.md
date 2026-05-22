# S3 Gateway Endpoint が必要な理由

> **作成日**: 2026-04-27  
> **対象**: prod-verification-alb-build-guide.md の STEP 4「VPC Endpoints の作成」に関する補足説明

---

## 結論

**フロントエンドアプリケーション（Next.js）がS3に直接接続しているわけではありません。**  
S3 Gateway Endpoint が必要な理由は、**ECSがECRからDockerイメージを取得する際に、内部的にS3へアクセスするため**です。

---

## 仕組みの説明

### ECRのアーキテクチャ

AWSのECR（Elastic Container Registry）は、Dockerイメージのレイヤーデータを**内部的にS3に保存**しています。

ECSがFargateタスクを起動する際、以下の流れでコンテナイメージをプルします：

```
ECSタスク（frontend）
    ↓ (1) イメージのメタ情報を取得
ecr.api Interface Endpoint
    ↓ (2) Dockerマニフェストを取得
ecr.dkr Interface Endpoint
    ↓ (3) 実際のイメージレイヤー（.tar.gz）をダウンロード
S3 Gateway Endpoint
    ↓
S3（AWS内部でECRのバックエンドとして使用）
```

---

## なぜS3 Gateway Endpointが必要か

prod-verification-alb-build-guide.mdでは、frontendのECSタスクを**プライベートサブネット（インターネット経路なし）**に配置しています。

| サブネット | インターネットアクセス |
|-----------|----------------------|
| 既存のパブリックサブネット | IGW経由で可能 |
| **新規: prod-app-private-1a/1c** | **なし（意図的に遮断）** |

インターネット経路がないため、通常のルートではS3に到達できません。  
そのためVPC内からS3へプライベートにアクセスするために **S3 Gateway Endpoint** が必要です。

prod-verification-alb-build-guide.md STEP 4 の説明コメントにも明記されています：

> `S3 Gateway` → **S3 への Privateアクセス（ECR レイヤー取得用）**

---

## VPC Endpoints の役割まとめ

| 目的 | エンドポイント | タイプ |
|------|--------------|--------|
| ECR APIへのアクセス（イメージメタ情報） | `ecr.api` Interface Endpoint | Interface |
| Dockerマニフェスト取得 | `ecr.dkr` Interface Endpoint | Interface |
| **Dockerイメージレイヤー取得（S3経由）** | **S3 Gateway Endpoint** | **Gateway** |
| CloudWatch Logsへのログ送信 | `logs` Interface Endpoint | Interface |

---

## Gateway型 と Interface型 の違い

| 項目 | Gateway型（S3, DynamoDB） | Interface型（ECR, Logs等） |
|------|--------------------------|--------------------------|
| 仕組み | ルートテーブルにルートを追加 | VPC内にENI（IPアドレス）を作成 |
| 料金 | **無料** | 有料（時間 + データ転送） |
| DNS | 変更なし | Private DNS で名前解決を上書き |
| セキュリティグループ | 不要 | 必要 |

S3 は Gateway型 で提供されているため、ルートテーブル（`prod-app-private-rt`）に S3 へのルートを追加するだけで利用できます（STEP 5 の設定）。

---

## フロントエンドアプリ（Next.js）とS3の関係

Next.jsアプリケーション自体がS3を操作する場合（ファイルアップロード・ダウンロード等）は**バックエンドAPI経由**で行われます。  
今回の S3 Gateway Endpoint は、アプリケーションロジックとは無関係な**インフラ起動時のイメージ取得経路**として機能しています。

```
【アプリロジック（ファイル操作）】
  Frontend → ALB → Backend (/api/*) → S3（署名付きURL等）

【インフラ起動時（コンテナ取得）】
  ECS Fargate → S3 Gateway Endpoint → S3（ECRのレイヤー保存先）
                 ↑ 今回の設定はこちら
```
