# サーバー証明書再生成手順書

- **作成日**: 2026-04-17
- **対象**: SaaS版 AWS環境（ECS Fargate + NLB）
- **目的**: Chrome の「保護されていない通信」解消のため、NLB DNS名を含むサーバー証明書を再生成する

---

## 背景・原因

既存のサーバー証明書は `CN=localhost` で生成されており、実際のアクセス先である NLB の DNS 名と一致しないため、Chrome が「保護されていない通信」と表示します。

| 項目 | 値 |
|------|-----|
| 既存証明書の CN | `localhost` |
| 実際のアクセス先 | `alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com` |
| 問題 | CN/SAN 不一致 → Chrome が警告を表示 |

---

## 前提条件

- CA証明書・秘密鍵が以下に存在すること（**CA は再生成しない**）
  - `backend/certs/ca/ca.crt`
  - `backend/certs/ca/ca.key`
- 作業はプロジェクトルート（`Alchemia_Staging/`）で実行すること

> ⚠️ **CA を再生成すると既存のクライアント証明書（各組織の `.p12`）がすべて無効**になります。  
> 本手順では CA は変更せず、サーバー証明書のみを再生成します。

---

## 手順

### Step 1: NLB DNS名を変数にセット

```bash
NLB_DNS="alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com"
```

### Step 2: CSR（証明書署名要求）を生成

> ⚠️ **CN フィールドは最大 64 文字** という制限があります。NLB の DNS 名（70文字）をそのまま CN に指定するとエラーになるため、CN には短い名前を使用し、フル DNS 名は SAN（Step 3）で指定します。

```bash
openssl req -new -newkey rsa:2048 -nodes \
    -keyout backend/certs/server/server.key \
    -out    backend/certs/server/server.csr \
    -subj   "/C=JP/ST=Tokyo/L=Tokyo/O=MMDPF/OU=Development/CN=alchemia-staging"
```

### Step 3: CA で署名してサーバー証明書を発行（SAN 付き）

```bash
openssl x509 -req -days 365 \
    -in    backend/certs/server/server.csr \
    -CA    backend/certs/ca/ca.crt \
    -CAkey backend/certs/ca/ca.key \
    -CAcreateserial \
    -out   backend/certs/server/server.crt \
    -extfile <(printf "subjectAltName=DNS:%s,DNS:localhost,IP:127.0.0.1" "${NLB_DNS}")
```

> **ポイント**: Chrome は CN よりも **SAN（Subject Alternative Name）を優先**して検証します。  
> `-extfile` で SAN を付与しないと、CN が正しくても警告が出る場合があります。

### Step 4: 証明書の内容を確認

```bash
# CN と SAN を確認
openssl x509 -noout -subject -ext subjectAltName -in backend/certs/server/server.crt
```

**期待される出力例:**

```
subject=C=JP, ST=Tokyo, L=Tokyo, O=MMDPF, OU=Development, CN=alchemia-staging
X509v3 Subject Alternative Name:
    DNS:alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com, DNS:localhost, IP Address:127.0.0.1
```

### Step 5: SSM Parameter Store に証明書を再登録

```bash
./scripts/setup-ssm-ssl.sh
```

### Step 6: nginx を再デプロイ

```bash
./scripts/deploy.ecr.phase1.sh --nginx --no-build --no-push
```

### Step 7: デプロイ完了を確認

```bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service-https \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
```

`running=1, desired=1, pending=0` になるまで待ちます（1〜2分程度）。

### Step 8: 動作確認

```bash
NLB_DNS="alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com"

# HTTPS疎通確認（-k は証明書検証をスキップ）
curl -k https://${NLB_DNS}/api/health
# 期待レスポンス: {"status":"ok"}

# CA証明書を指定して証明書検証付きで確認（CA を信頼済みの場合）
curl --cacert backend/certs/ca/ca.crt https://${NLB_DNS}/api/health
# 期待レスポンス: {"status":"ok"}
```

---

## Chrome で警告が出なくなるための追加確認

CA証明書が Windows の信頼済みルートに登録されているか確認してください。

1. `Win + R` → `certmgr.msc` を開く
2. 「信頼されたルート証明機関」→「証明書」を確認
3. 発行者 `CN=MMDPF CA` の証明書が存在するか確認
4. 存在しない場合は `backend/certs/ca/ca.crt` をダブルクリックしてインポート
5. Chrome を **完全再起動**（`Ctrl+Shift+Q` で全ウィンドウ閉じてから起動）

---

## 証明書の依存関係（参考）

```
CA証明書 (backend/certs/ca/ca.crt)        ← 変更しない
  │
  ├─ 署名 → サーバー証明書 (backend/certs/server/server.crt)  ← 今回再生成
  │          nginx が HTTPS:443 に使用
  │
  └─ 署名 → クライアント証明書 (各組織の .p12)               ← 再生成不要
             CA が変わらなければ引き続き有効
```

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `backend/certs/ca/ca.crt` | CA証明書（変更しない） |
| `backend/certs/ca/ca.key` | CA秘密鍵（変更しない） |
| `backend/certs/server/server.crt` | サーバー証明書（今回再生成） |
| `backend/certs/server/server.key` | サーバー秘密鍵（今回再生成） |
| `scripts/setup-ssm-ssl.sh` | SSM Parameter Store へ証明書を登録するスクリプト |
| `scripts/generate-certificates.sh` | 証明書一括生成スクリプト（CA含む ⚠️ 本手順では使用しない） |
| `docs/deploy-guide/saas/ssl-ssm-setup-guide.md` | SSM証明書登録手順書 |
