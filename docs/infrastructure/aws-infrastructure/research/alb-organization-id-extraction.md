# 調査報告: ALB で organization_id 抽出を代替できるか？

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（ECS Fargate）
- **調査内容**: NLB + nginx による mTLS / organization_id 抽出を、ALB で代替できるか検討する

---

## 1. 結論

**可能です。**

ALB は 2023年に **mTLS（相互TLS認証）をネイティブサポート** しており、nginx なしで organization_id の抽出が実現できます。ただし、**バックエンドのコード変更** と **AWS ACM Trust Store への CA 証明書登録** が必要になります。

---

## 2. 仕組みの比較

### 現在（NLB + nginx）

```
ブラウザ
  ↓ TCP:443 パススルー
NLB (Network Load Balancer)
  ↓ TLS を終端せずそのまま転送
nginx コンテナ (ECS タスク内)
  ├── ① SSL 終端（サーバー証明書）
  ├── ② クライアント証明書検証（CA で検証）
  ├── ③ 証明書 CN（UUID）を抽出
  ├── ④ X-Organization-Id: <uuid> ヘッダーを付与
  └── → backend へ転送
```

### 代替案（ALB mTLS）

```
ブラウザ
  ↓ HTTPS:443
ALB (Application Load Balancer)
  ├── ① SSL 終端（ACM サーバー証明書）
  ├── ② クライアント証明書検証（ACM Trust Store の CA で検証）
  ├── ③ X-Amzn-Mtls-Clientcert-Subject: CN=<uuid>,O=... ヘッダーを付与
  └── → ECS タスク（frontend / backend）へ転送  ←【nginx コンテナ不要】
```

---

## 3. ALB mTLS の動作モード

ALB には mTLS に関して 2 つのモードがあります。

| モード | 動作 | 用途 |
|-------|------|------|
| `verify` | ALB がクライアント証明書を検証し、証明書情報をヘッダーで backend に渡す | **今回の用途に合致** |
| `passthrough` | TLS をそのまま backend に転送（NLB TCP パススルーと同様） | nginx で終端する場合 |

`verify` モードを使うことで、nginx なしで organization_id 抽出が実現できます。

---

## 4. ALB が付与するヘッダー（verify モード）

ALB は検証済みのクライアント証明書情報を以下のヘッダーで渡します。

| ヘッダー名 | 内容 | 例 |
|-----------|------|-----|
| `X-Amzn-Mtls-Clientcert-Subject` | 証明書のサブジェクト DN | `CN=b6ae9356-48e2-4b8c-bae6-945fa2db66ee,O=MMDPF,...` |
| `X-Amzn-Mtls-Clientcert-Issuer` | 発行者 | `CN=MMDPF CA,...` |
| `X-Amzn-Mtls-Clientcert-Serial-Number` | シリアル番号 | `01` |
| `X-Amzn-Mtls-Clientcert-Validity` | 有効期限情報 | `NotBefore=...;NotAfter=...` |
| `X-Amzn-Mtls-Clientcert` | 証明書 PEM（URL エンコード） | |

→ `X-Amzn-Mtls-Clientcert-Subject` から `CN=<uuid>` 部分を正規表現で抽出すれば organization_id が取得できます。

---

## 5. 必要な変更点

### 5-1. AWS 側の変更

| 作業 | 内容 |
|-----|------|
| ACM Trust Store 作成 | `backend/certs/ca/ca.crt`（自己署名 CA）を ACM Trust Store にアップロード |
| ACM サーバー証明書 | ALB 用のサーバー証明書を ACM に登録（カスタムドメインがあれば ACM で発行可能、なければ自己署名証明書を import） |
| ALB 作成 | HTTPS:443 リスナー + mTLS `verify` モードで設定 |
| ALB ターゲットグループ | ECS タスク（frontend を含む nginx サービス、または frontend 単体）を向ける |
| NLB 廃止 | NLB が不要になる |
| nginx コンテナ廃止 | ECS の nginx コンテナ・サービスが不要になる（大幅にシンプル化） |

### 5-2. バックエンドのコード変更（必須）

現在の nginx が付与する `X-Organization-Id` ヘッダーを読むミドルウェアを、  
ALB が付与する `X-Amzn-Mtls-Clientcert-Subject` を解析するよう変更する必要があります。

**変更前（現在）：**
```typescript
// nginx が X-Organization-Id を設定済みのため、そのまま参照
const organizationId = req.headers['x-organization-id'] as string;
```

**変更後（ALB mTLS）：**
```typescript
// ALB が付与した Subject ヘッダーから CN（UUID）を抽出
const subject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
// subject の例: "CN=b6ae9356-48e2-4b8c-bae6-945fa2db66ee,OU=Development,O=MMDPF,L=Tokyo,ST=Tokyo,C=JP"
const match = subject?.match(/CN=([^,]+)/);
const organizationId = match?.[1];

if (!organizationId) {
  // クライアント証明書なし or CN 不正
  return res.status(401).json({ error: 'E5013' });
}
```

> **変更箇所の特定**: `x-organization-id` を参照している箇所を全て変更する。
> 主に `backend/src/middleware/tenantIsolationMiddleware.ts` が対象と想定される。

---

## 6. ALB 採用のメリット

| メリット | 詳細 |
|---------|------|
| **nginx コンテナ不要** | ECS タスクがシンプルになる。frontend コンテナ単体またはすでに構成されているタスクに直接ルーティングできる |
| **SSL 証明書の ACM 管理** | SSM Parameter Store への証明書登録・nginx コンテナ内での証明書配置が不要になる |
| **ACM 証明書の自動更新** | カスタムドメインの場合、ACM 証明書は 60 日前から自動更新される（有効期限切れリスクを排除） |
| **AWS WAF との統合** | ALB は AWS WAF と統合可能（NLB は不可）。IP 制限・レートリミット・マネージドルールの適用が可能 |
| **HTTP アクセスログの充実** | ALB は HTTP レベルのアクセスログ（パス・ステータスコード・レスポンスタイム・クライアント IP）を S3 に出力できる |
| **ヘルスチェックの充実** | ALB の HTTP ヘルスチェックが使える（`/api/health` でステータスコード確認。NLB は TCP レベルのみ） |
| **HTTP → HTTPS リダイレクト** | ALB リスナールールで HTTP:80 → HTTPS:443 の 301 リダイレクトをネイティブに設定できる |
| **コスト** | NLB + ALB の 2 台構成から ALB 1 台になるため LB コストが削減される |

---

## 7. ALB 採用のデメリット・注意点

| デメリット | 内容 |
|---------|------|
| **バックエンドコード変更が必要** | 既存の `X-Organization-Id` ヘッダーを読む実装をすべて変更する必要がある |
| **ACM Trust Store に CA が必要** | 自己署名 CA の場合、ACM Trust Store（カスタム信頼ストア）へのアップロードが必要。操作コストは低い |
| **クライアント証明書なしアクセスの扱い** | `verify` モードでは証明書なしのアクセスはデフォルトで 400 応答になる（nginx の `ssl_verify_client optional` と異なる）。ただし本番環境では証明書必須のため問題なし |
| **カスタムドメインが実質必須** | ACM の公的証明書（無料・自動更新）はカスタムドメインが必要。ドメインなしの場合は ACM に自己署名証明書を import する必要がある（import した証明書は自動更新されない） |
| **ヘッダー改ざんリスク** | ALB より内側（ECS タスク）からの通信でも `X-Amzn-Mtls-Clientcert-Subject` ヘッダーを偽装できてしまう。ALB のセキュリティグループ外からの直接アクセスを SG で遮断することで対策する |

---

## 8. セキュリティ考慮点（ヘッダー改ざん対策）

NLB + nginx 構成では nginx が証明書を直接検証するため、バックエンドへの偽装は困難です。  
ALB 構成では `X-Amzn-Mtls-Clientcert-Subject` ヘッダーを ECS タスク内から直接付与することで偽装できるため、  
**セキュリティグループで ALB のみからのアクセスを許可**する設計が必要です。

```
[ALB] → [ECS タスク (alchemia-backend-sg)]
  ↑ インバウンドに ALB のセキュリティグループのみ許可
  ✅ ALB 以外からのポート 3001 直接アクセスをブロック
```

これは現在の nginx 経由構成でも同様の SG 設計が必要であり、  
ALB 構成に変更しても同じアプローチで対応できます。

---

## 9. 構成比較まとめ

| 比較項目 | 現在（NLB + nginx） | ALB mTLS（代替案） |
|--------|---------------------|-------------------|
| organization_id 抽出 | nginx が CN 抽出 → `X-Organization-Id` | ALB が Subject 付与 → backend で CN 解析 |
| SSL 終端 | nginx コンテナ | ALB |
| 証明書管理 | SSM Parameter Store + nginx コンテナ内配置 | ACM（マネージド） |
| WAF 統合 | 不可 | 可 |
| アクセスログ | TCP レベル（NLB） | HTTP レベル（S3 出力）|
| バックエンド変更 | 不要（現状維持） | 必要（ヘッダー名・解析ロジック変更） |
| nginx コンテナ | 必要 | **不要** |
| アーキテクチャの複雑さ | NLB + nginx タスク管理が必要 | ALB のみ（シンプル）|
| HTTP→HTTPS リダイレクト | nginx で設定 | ALB リスナールールでネイティブ対応 |
| コスト（LB） | NLB + （ALB 廃止後は NLB のみ） | ALB のみ |
| 推奨度（本番） | △ 動作実績あり、管理コスト高 | ◎ よりマネージドで運用しやすい |

---

## 10. 推奨

**本番環境では ALB mTLS 構成を推奨します。**

### 根拠

1. **nginx コンテナの管理コストを排除できる** — SSL 証明書の SSM 管理・nginx 設定管理・nginx コンテナのビルド・デプロイが不要になる
2. **ACM による証明書の自動更新** — サーバー証明書の有効期限切れリスクを排除できる（カスタムドメインが前提）
3. **WAF 統合が可能** — 本番環境のセキュリティ強化（IP 制限・DDoS 対策）が ALB + WAF で実現できる
4. **バックエンドのコード変更は 1 箇所の修正** — `tenantIsolationMiddleware.ts` のヘッダー参照を変更するだけで対応可能（工数は低い）

### 移行手順概要

1. バックエンドのテナント分離ミドルウェアのヘッダー参照を変更（`X-Organization-Id` → `X-Amzn-Mtls-Clientcert-Subject` 解析）
2. ACM Trust Store に `backend/certs/ca/ca.crt` をアップロード
3. カスタムドメイン用の ACM 証明書を発行（または自己署名証明書を import）
4. ALB を作成（HTTPS:443、mTLS `verify` モード、ACM Trust Store 指定）
5. ECS サービスのターゲットを ALB に切り替え
6. NLB・nginx コンテナ・SSM パラメータを廃止

---

*本レポートは `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT.md` の関連調査として作成。*
