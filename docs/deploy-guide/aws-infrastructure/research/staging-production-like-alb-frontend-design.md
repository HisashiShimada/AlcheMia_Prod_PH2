# 調査報告: 検証環境に本番想定 ALB + Frontend を並列追加する構成検討

- **作成日**: 2026-04-23
- **調査内容**: 既存の検証環境を維持しつつ、本番想定の ALB (mTLS) + alchemia-frontend-service を並列追加できるかの検討
- **前提**: ECS スケールアウトは保留（desiredCount=1 で検証）

---

## 1. 結論

**可能。** 既存の検証環境（NLB + alchemia-nginx-service）を一切変更せず、本番想定の ALB と alchemia-frontend-service を **並列追加** することで実現できる。

Aurora / ElastiCache Redis / S3 / Bedrock といったバックエンドリソースは `alchemia-backend-service` を介して共用するため、追加のリソース作成は不要。

---

## 2. 全体システム構成図（検証環境 + 本番想定パス 共存）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  エンドユーザー（Chrome）                                                        │
│                                                                                 │
│  [パス①: HTTP アクセス（証明書なし）]                                            │
│  [パス②: HTTPS mTLS（既存 NLB 経由）]                                           │
│  [パス③: HTTPS mTLS（本番想定 ALB 経由）← 今回新規追加]                          │
└──────┬──────────────────────┬─────────────────────────┬───────────────────────-┘
       │ HTTP:80              │ TCP:443 (TLSパススルー)   │ HTTPS:443 (mTLS verify)
       ▼                      ▼                          ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────────┐
│  既存 ALB        │  │  既存 NLB        │  │  新規 ALB ← 今回追加                  │
│  (HTTP:80)       │  │  (TCPパススルー) │  │  HTTPS:443（mTLS verify モード）      │
│  alchemia-       │  │  alchemia-       │  │                                      │
│  staging-alb-    │  │  staging-nlb-    │  │  ・ACM サーバー証明書                 │
│  987042084...    │  │  0fd64d4...      │  │  ・ACM Trust Store（ca.crt 登録）     │
│                  │  │                  │  │                                      │
│  ?orgId= で      │  │  nginx が        │  │  ルーティング:                        │
│  org_id 取得     │  │  mTLS 終端       │  │  ├── /api/* → backend-tg (3001)      │
│  （証明書不要）   │  │                  │  │  └── /*     → frontend-tg (3000)     │
└────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────────┬───────────┘
         │                     │                        │              │
         │ HTTP:80              │ TCP:443                │ /api/*       │ /*
         ▼                     ▼                        ▼              ▼
         └─────────────────────┘            ┌───────────────┐  ┌────────────────────┐
                      │                     │  backend-tg   │  │  frontend-tg       │
                      ▼                     │  (TCP:3001)   │  │  (TCP:3000)        │
┌──────────────────────────────────┐        └───────┬───────┘  └──────────┬─────────┘
│  ECS: alchemia-nginx-service     │                │                     │
│  ┌────────────────────────────┐  │                ▼                     ▼
│  │ mmdpf-nginx (443/80)       │  │  ┌─────────────────────┐  ┌──────────────────────┐
│  │ SSL 終端 + mTLS 認証       │  │  │ ECS:                │  │ ECS:                 │
│  │ X-Organization-Id 付与     │  │  │ alchemia-backend-   │  │ alchemia-frontend-   │
│  │ /api/ → backend (SD)       │  │  │ service             │  │ service              │
│  │ /     → localhost:3000     │  │  │ ← 既存（共用）      │  │ ← 今回新規追加       │
│  └────────────────────────────┘  │  │                     │  │                     │
│  ┌────────────────────────────┐  │  │ mmdpf-backend(3001) │  │ mmdpf-frontend(3000)│
│  │ mmdpf-frontend (3000)      │  │  │ ORG_ID_SOURCE=alb   │  │ nginx なし          │
│  └────────────────────────────┘  │  │                     │  │ desiredCount=1      │
└──────────────────────────────────┘  └──────────┬──────────┘  └──────────────────────┘
       │ VPC内 Service Discovery                  │
       │ /api/ → backend-service (3001)           │ 共用バックエンドリソース
       └────────────────────────────────►         │
                                                  ▼
                                    ┌─────────────────────────┬────────────────────────────┐
                                    ▼                         ▼                            ▼
                          ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐
                          │  Aurora          │   │  ElastiCache Redis  │   │  Amazon S3 / Bedrock    │
                          │  PostgreSQL      │   │                    │   │                          │
                          │  (共用)          │   │  (共用)             │   │  (共用)                  │
                          └──────────────────┘   └────────────────────┘   └──────────────────────────┘
```

---

## 3. 3つのアクセスパス詳細

### パス① 既存 ALB（HTTP:80）— 証明書なしの開発・確認用

```
ブラウザ
  │ HTTP:80（クライアント証明書不要）
  │ URL: http://alchemia-staging-alb-987042084.../?orgId=<UUID>
  ▼
既存 ALB（HTTP:80）
  └── alchemia-nginx-service
        mmdpf-nginx: ?orgId= から organization_id を取得
        mmdpf-frontend: Next.js
```

- **変更**: なし（既存のまま）
- **用途**: クライアント証明書なしで手軽に動作確認するための開発用パス

---

### パス② 既存 NLB（TCP:443 パススルー）— 現行の証明書認証パス

```
ブラウザ
  │ TCP:443（TLS パススルー）
  │ クライアント証明書（.p12）をブラウザにインポート済み
  ▼
既存 NLB（TCPリスナー、TLS 終端なし）
  └── alchemia-nginx-service
        mmdpf-nginx: SSL 終端 + mTLS 認証
                     CN（UUID）→ X-Organization-Id ヘッダー付与
        mmdpf-frontend: Next.js
```

- **変更**: なし（既存のまま）
- **用途**: nginx mTLS による現行の証明書認証フローの検証

---

### パス③ 新規 ALB（HTTPS:443 mTLS）— 本番想定パス ← 今回追加

```
ブラウザ
  │ HTTPS:443（クライアント証明書 .p12 をブラウザにインポート済み）
  ▼
新規 ALB（HTTPS:443 mTLS verify モード）
  ├── ACM サーバー証明書でサーバー認証
  ├── ACM Trust Store（ca.crt）でクライアント証明書を検証
  │     └── 検証失敗 → 400 エラー（アクセス拒否）
  ├── X-Amzn-Mtls-Clientcert-Subject ヘッダー付与
  │     CN=<org-uuid>,O=...
  │
  ├── /api/* → alchemia-backend-service (3001)
  └── /*     → alchemia-frontend-service (3000)
```

- **変更**: 新規作成
- **用途**: 本番環境の ALB mTLS 構成の動作検証

---

## 4. 既存 ALB（HTTP:80）と新規 ALB（HTTPS:443）の共存について

AWSでは **ALB は複数同時に存在できる独立したリソース**のため、共存に技術的な問題はない。

| 項目 | 評価 |
|---|---|
| 技術的な干渉 | なし（ターゲットグループ・リスナーが完全に独立） |
| コスト | ALB 稼働時間課金が増加するが検証環境なら許容範囲 |
| セキュリティ | 既存ALBは nginx-service を向いており本番想定パスへの影響なし |
| 既存ALBの削除要否 | **不要**（引き続きそのまま利用可能） |

---

## 5. 必要な作業一覧

### 5-1. 新規作成するリソース

| リソース | 設定内容 |
|---|---|
| **新規 ALB** | HTTPS:443 リスナー、mTLS verify モード |
| **ACM 証明書** | ALB 用サーバー証明書（自己署名インポートでも可） |
| **ACM Trust Store** | `backend/certs/ca/ca.crt` を登録 |
| **alchemia-frontend-sg** | TCP:3000 を 新規ALBのSGからのみ許可 |
| **alchemia-frontend-service** | ECS Fargate、desiredCount=1 |
| **alchemia-frontend タスク定義** | `mmdpf-frontend` コンテナのみ（nginx なし） |
| **ALB ターゲットグループ x2** | backend-tg (3001)、frontend-tg (3000) |

### 5-2. 既存リソースへの変更（最小限）

| 変更対象 | 変更内容 |
|---|---|
| **alchemia-backend-sg** | TCP:3001 を 新規ALBのSGからも許可（既存 nginx-sg からのルールはそのまま維持） |
| **backend タスク定義** | 環境変数 `ORG_ID_SOURCE=alb` を追加（REPORT3 の実装が必要） |

### 5-3. バックエンドコードの変更（REPORT3 が未実装の場合）

`authController.ts` に `getOrganizationId()` ヘルパー関数を追加し、`ORG_ID_SOURCE` 環境変数で取得元を切り替える。

```typescript
function getOrganizationId(req: Request): string | undefined {
  const source = process.env.ORG_ID_SOURCE || 'nginx';

  if (source === 'alb') {
    // ALB mTLS モード: X-Amzn-Mtls-Clientcert-Subject の CN を解析
    const subject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
    const match = subject?.match(/CN=([^,]+)/);
    return match?.[1] || (req.query.orgId as string);
  } else {
    // nginx モード（デフォルト・既存検証環境）
    return (req.headers['x-organization-id'] || req.query.orgId) as string;
  }
}
```

環境変数の使い分け：

| 環境 | `ORG_ID_SOURCE` | 使用ヘッダー |
|---|---|---|
| 既存検証環境（NLB/nginx パス） | `nginx` | `X-Organization-Id` |
| 本番想定パス（新規 ALB） | `alb` | `X-Amzn-Mtls-Clientcert-Subject` |

---

## 6. セキュリティグループ設計（変更後）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  セキュリティグループ構成（変更後）                                           │
│                                                                            │
│  【既存】alchemia-nlb-sg（NLB 用）                                          │
│    インバウンド: TCP:443  0.0.0.0/0                                         │
│                                                                            │
│  【既存】alchemia-staging-alb-sg（既存 ALB 用）                              │
│    インバウンド: TCP:80  0.0.0.0/0                                          │
│                                                                            │
│  【新規追加】alchemia-alb-sg（新規 ALB 用）                                  │
│    インバウンド: TCP:443  0.0.0.0/0                                         │
│                                                                            │
│  【既存・変更あり】alchemia-nginx-sg（nginx ECS タスク用）                    │
│    インバウンド: TCP:443  alchemia-nlb-sg のみ（変更なし）                   │
│                 TCP:80   alchemia-staging-alb-sg のみ（変更なし）            │
│                                                                            │
│  【既存・変更あり】alchemia-backend-sg（backend ECS タスク用）                │
│    インバウンド: TCP:3001  alchemia-nginx-sg のみ（既存ルール・変更なし）      │
│                 TCP:3001  alchemia-alb-sg のみ  ← 新規追加                  │
│                                                                            │
│  【新規追加】alchemia-frontend-sg（frontend ECS タスク用）                   │
│    インバウンド: TCP:3000  alchemia-alb-sg のみ                              │
│                                                                            │
│  【既存・変更なし】alchemia-aurora-sg（Aurora 用）                           │
│    インバウンド: TCP:5432  alchemia-backend-sg のみ                         │
│                                                                            │
│  【既存・変更なし】alchemia-redis-sg（ElastiCache 用）                        │
│    インバウンド: TCP:6379  alchemia-backend-sg のみ                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. frontend タスク定義の注意点

既存の `mmdpf-frontend` コンテナは nginx タスクと同居しており、API リクエストを nginx が `/api/` プロキシ経由でルーティングしている。

新規の `alchemia-frontend-service` では nginx なしで standalone 動作させるため、以下の環境変数を ALB ドメインに合わせて設定する必要がある。

```json
{
  "name": "NEXT_PUBLIC_API_BASE_URL",
  "value": "https://<新規ALBのDNS名>/api"
}
```

※ Next.js のビルド時環境変数（`NEXT_PUBLIC_*`）はイメージビルド時に埋め込まれる場合があるため、別タグ（例: `production`）でビルド・ECR プッシュする必要がある場合がある。

---

## 8. まとめ

| 項目 | 対応方針 |
|---|---|
| 既存検証環境の維持 | ✅ NLB・既存ALB・nginx-service は一切変更なし |
| 本番想定 ALB + frontend の追加 | ✅ 新規ALB + alchemia-frontend-service を並列追加 |
| Aurora/Redis/S3/Bedrock の共用 | ✅ alchemia-backend-service を共用するため自動的に共用 |
| ECS スケールアウトの保留 | ✅ desiredCount=1 で検証可能 |
| 既存 ALB（HTTP:80）の扱い | ✅ 削除不要・共存可能 |
| バックエンドコード変更 | ⚠️ REPORT3 の `ORG_ID_SOURCE` 切り替えロジックの実装が必要 |

---

*本レポートは ARCHITECTURE.md で検討した本番システム構成を検証環境で検証するための構成設計として作成。*
