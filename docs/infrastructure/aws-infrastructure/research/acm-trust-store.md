# 調査報告: ACM Trust Store とは何か？設定方法まとめ

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（ECS Fargate）
- **関連レポート**: REPORT1.md（ALB mTLS 構成検討）

---

## 1. ACM Trust Store とは？

**ACM Trust Store（AWS Certificate Manager Trust Store）** は、ALB の mTLS（相互TLS認証）機能で使用する **「信頼するCA証明書の束」を管理するための AWS リソース** です。

### 概念の整理

通常の HTTPS（サーバー認証のみ）では、サーバーがクライアントに証明書を提示して「私は正規のサーバーです」を証明します。  
mTLS では **クライアント側も証明書を提示** し、サーバー（今回は ALB）が「このクライアントは信頼できるか？」を検証します。

この「信頼できるかの判断基準」が **Trust Store（信頼ストア）** です。  
`backend/certs/ca/ca.crt`（自己署名CA）で署名されたクライアント証明書のみを「正規の証明書」として認める、という設定を ACM 上で管理するのが ACM Trust Store です。

```
クライアント証明書（p12）
  └── 発行元: ca.crt（自己署名CA）
            ↓
       ACM Trust Store に登録
            ↓
       ALB が「この CA で署名されている → 信頼できる」と判断
```

---

## 2. 具体的に必要な設定

### ステップ1: Trust Store の作成と CA 証明書のアップロード

AWS コンソール または AWS CLI で ACM Trust Store を作成します。

```bash
# 1. CA証明書を S3 にアップロード（Trust Store 作成時に S3 URI を指定するため）
aws s3 cp backend/certs/ca/ca.crt s3://<your-bucket>/certs/ca.crt

# 2. Trust Store を作成
aws acm create-trust-store \
  --name "mmdpf-ca-trust-store" \
  --ca-certificate-bundle-s3-bucket "<your-bucket>" \
  --ca-certificate-bundle-s3-key "certs/ca.crt"
```

→ 作成後に `TrustStoreArn` が払い出されます（後で ALB の設定に使用）。

---

### ステップ2: ACM サーバー証明書の登録

ALB に紐付けるサーバー証明書を ACM に登録します。

| ケース | 方法 |
|--------|------|
| カスタムドメインあり | ACM でパブリック証明書を **発行**（無料・自動更新） |
| カスタムドメインなし | 自己署名証明書を ACM に **インポート**（手動更新が必要） |

```bash
# 自己署名証明書をインポートする場合の例
aws acm import-certificate \
  --certificate fileb://server.crt \
  --private-key fileb://server.key \
  --certificate-chain fileb://ca.crt
```

---

### ステップ3: ALB の HTTPS リスナーに mTLS を設定

ALB のリスナーを作成・編集する際に、以下の設定を行います。

```bash
# ALB リスナーを mTLS verify モードで作成
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<acm-server-cert-arn> \
  --mutual-authentication \
    Mode=verify,TrustStoreArn=<trust-store-arn>
```

AWS コンソールでは以下の箇所で設定します：

```
EC2 → ロードバランサー → 対象ALB
  → リスナー → HTTPS:443 を編集
    → 「相互認証 (mTLS)」セクション
      → モード: verify
      → 信頼ストア: 上記で作成したもの を選択
```

---

## 3. 設定後の動作イメージ

```
① ブラウザが p12 証明書を提示
         ↓
② ALB が Trust Store の ca.crt を使って証明書を検証
         ↓ 検証OK
③ ALB が以下のヘッダーを付与してバックエンドへ転送
   X-Amzn-Mtls-Clientcert-Subject: CN=<organization-id (UUID)>,O=MMDPF,...
         ↓
④ バックエンドの tenantIsolationMiddleware.ts が CN を抽出して organization_id を取得
```

---

## 4. 本プロジェクトにおける具体的な作業イメージ

| # | 作業 | 使用するファイル |
|---|------|----------------|
| 1 | Trust Store に CA をアップロード | `backend/certs/ca/ca.crt` |
| 2 | ACM にサーバー証明書を登録 | ドメインに応じて発行 or インポート |
| 3 | ALB を mTLS `verify` モードで構成 | Trust Store ARN を指定 |
| 4 | バックエンドのヘッダー参照を修正 | `backend/src/middleware/tenantIsolationMiddleware.ts` |

操作コスト自体は低く、**CA証明書ファイルさえあれば Trust Store の作成は数分で完了** します。  
管理が複雑な nginx + SSM Parameter Store の証明書配置が不要になることと比較すると、大幅なシンプル化が見込めます。

---

*本レポートは `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT1.md` の ACM Trust Store に関する補足調査として作成。*
