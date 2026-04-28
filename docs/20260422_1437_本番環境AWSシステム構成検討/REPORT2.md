# 調査報告: nginx/frontend の ECS タスク分離検討

- **作成日**: 2026-04-22
- **対象**: SaaS版 AWS環境（ECS Fargate）
- **調査内容**: `alchemia-nginx-service` タスクに同居している nginx コンテナと frontend コンテナを別タスクに分離することの可否・必要性

---

## 1. 現在の構成（検証環境）

```
alchemia-nginx-service タスク
├── mmdpf-nginx コンテナ (ポート 80/443)
│     ├── SSL終端（サーバー証明書）
│     ├── クライアント証明書検証 (mTLS)
│     ├── X-Organization-Id ヘッダー付与（organization_id 抽出）
│     ├── /api/ → alchemia-backend.alchemia.local:3001（Service Discovery）
│     └── /    → localhost:3000  ←【同タスク内の frontend へ直接ルーティング】
└── mmdpf-frontend コンテナ (ポート 3000)
```

同一タスク内のコンテナは **同じネットワーク名前空間（localhost）を共有** するため、
nginx は `proxy_pass http://localhost:3000` で frontend に通信している。

---

## 2. 分離した場合の構成

```
alchemia-nginx-service タスク
└── mmdpf-nginx コンテナ (ポート 80/443)
      ├── /api/ → alchemia-backend.alchemia.local:3001（Service Discovery）
      └── /    → alchemia-frontend.alchemia.local:3000  ←【Service Discovery 経由に変更】

alchemia-frontend-service タスク（新設）
└── mmdpf-frontend コンテナ (ポート 3000)
```

---

## 3. 技術的な可否

**可能**。ただし以下の追加対応が必要になる。

| 対応項目 | 内容 |
|---------|------|
| Cloud Map サービス追加 | `alchemia-frontend` サービスを `alchemia.local` 名前空間に新規作成 |
| nginx 設定変更 | `proxy_pass http://localhost:3000` → `proxy_pass http://alchemia-frontend.alchemia.local:3000` |
| DNS リゾルバー設定 | nginx.conf に `resolver 169.254.169.253 valid=10s;` を追加（ECS DNS リゾルバー指定） |
| セキュリティグループ追加 | nginx → frontend 間の TCP:3000 通信許可 |
| ECS サービス追加 | `alchemia-frontend-service` の新規作成 |
| デプロイスクリプト修正 | `deploy.ecr.sh` を frontend サービスも更新するよう修正 |

---

## 4. メリット（分ける場合）

| メリット | 詳細 |
|---------|------|
| **独立したスケール** | フロントエンドアクセス増加時に frontend タスクのみスケールアウト可能。nginx は軽量なため最小タスク数を維持できる |
| **独立したデプロイ** | nginx 設定変更（証明書・ルーティング）と frontend のコード変更を完全に独立してデプロイできる |
| **リソース配分の最適化** | nginx は軽量（256MB / 0.25vCPU 程度）、Next.js SSR の frontend は重い（1-2GB / 0.5-1vCPU）という違いに応じたタスクサイズを設定できる |
| **障害分離** | frontend クラッシュ時に nginx タスク自体は生き続ける（502 応答にはなるが、nginx プロセスは維持される） |
| **イメージビルドの高速化** | nginx と frontend を別イメージとして独立してビルド・プッシュできる（現在も別イメージだが、デプロイ単位が分離できる） |

---

## 5. デメリット（分ける場合）

| デメリット | 詳細 |
|---------|------|
| **レイテンシ増加** | `localhost` 通信（ほぼゼロ） → VPC 内 TCP 通信（数 ms）に変わる |
| **Service Discovery 管理の追加** | Cloud Map サービスの追加作成・管理が必要 |
| **nginx 設定変更・検証コスト** | `resolver` 設定の追加が必要。DNS 解決のタイミングによっては nginx のリロード処理が必要になるケースもある |
| **セキュリティグループ設計の複雑化** | nginx タスクの SG → frontend タスクの SG への TCP:3000 開放が必要 |
| **コスト増加** | Fargate タスク数が増えるため CPU/メモリのコストが増加する |
| **ヘルスチェックの複雑化** | NLB ヘルスチェックが nginx 経由で frontend の疎通まで確認するようになる |

---

## 6. このシステム特有の重要な考慮点

### 6-1. mTLS アーキテクチャとの関係

本システムは nginx が **mTLS（クライアント証明書認証）+ organization_id 抽出** を担う設計になっている。

```
NLB（TCP パススルー）
  ↓
nginx
  ├── ① SSL 終端（サーバー証明書）
  ├── ② クライアント証明書検証（mTLS）
  ├── ③ 証明書の CN（UUID）→ X-Organization-Id ヘッダー付与
  ├── /api/ → backend（マルチテナント分離はこのヘッダーで実現）
  └── /    → frontend
```

frontend（Next.js）が SSR で backend API を呼ぶ場合、`X-Organization-Id` ヘッダーの伝搬設計が必要になる。
frontend を別タスクに分離しても、**ブラウザ → NLB → nginx → frontend** という経路は変わらないため、
ブラウザ起点のリクエストでは問題は発生しない。

ただし **Server Components / Route Handler が backend API を直接呼ぶ**場合は、
VPC 内通信（nginx を経由しない経路）での `X-Organization-Id` 伝搬方法を別途設計する必要がある。

### 6-2. 現在の frontend の SSR 利用状況

Next.js の SSR（Server-side Rendering）または Route Handler から backend API を VPC 内で直接呼んでいる場合、
nginx を経由しない経路での認証方法（organization_id の取得方法）を設計する必要がある。

---

## 7. 推奨判断

| ケース | 推奨 |
|-------|------|
| **検証環境 → 本番環境への移行（現状）** | **同居のまま継続を推奨** |
| **フロントエンドが独立してトラフィックが急増する** | 分離を検討（スケール要件を確認してから） |
| **nginx 設定変更と frontend デプロイを完全に独立させたい** | 分離を検討（Service Discovery の追加管理コストが発生することを考慮） |
| **本番環境でのコスト最適化が最優先** | 同居のまま（タスク数が少ない方がコストが低い） |

---

## 8. 結論

**技術的には分離可能**だが、**このシステムにおいては分ける必要性は低く、同居のまま継続することを推奨する。**

### 根拠

1. **ECS の同一タスク内コンテナ同居（サイドカーパターン）は AWS の一般的な設計パターン**であり、
   nginx + フロントエンドの組み合わせで広く採用されている

2. **mTLS 認証が絡む本システムの構成上**、nginx がリクエスト入口を一元管理することが重要であり、
   frontend をその直後に配置する同居構成はアーキテクチャ的に合理的

3. **本番環境移行における優先対応事項**（シークレット管理・MultiAZ 化・監視設定・SSL 証明書など）の方が
   運用リスク・セキュリティ観点で重要度が高い

4. **分離によるメリット（独立スケール・独立デプロイ）** は、現在のトラフィック規模や
   デプロイ頻度では効果が薄く、追加の管理コストに見合わない

---

## 9. 参考: 構成比較

| 項目 | 現在（同居） | 分離後 |
|-----|------------|--------|
| タスク数 | 2（nginx-service + backend-service） | 3（nginx-service + frontend-service + backend-service） |
| nginx → frontend 通信 | localhost（ゼロレイテンシ） | VPC 内 TCP（数 ms） |
| Service Discovery | 1 サービス（alchemia-backend） | 2 サービス（alchemia-backend + alchemia-frontend） |
| スケール単位 | nginx + frontend が連動 | nginx / frontend を独立してスケール可能 |
| デプロイ単位 | nginx + frontend が連動 | nginx / frontend を独立してデプロイ可能 |
| Fargate コスト | 相対的に低い | 相対的に高い（タスク数増加） |
| 設定・管理の複雑さ | 低い | やや高い |

---

*本レポートは `docs/20260422_1437_本番環境AWSシステム構成検討/REPORT.md` の関連調査として作成。*
