# 後追いクライアント証明書発行手順

> **用途**: DBに手動で組織を登録した場合など、クライアント証明書が未発行の組織に対して後追いで証明書を発行する手順です。

---

## 前提情報

| 項目 | 値 |
|------|----|
| S3バケット | `mmdpf-files-production` |
| 証明書の保存パス | `{organizationId}/certificates/{organizationId}.p12` |
| P12パスワード | `mmdpf123`（環境変数 `CERT_P12_PASSWORD`） |
| CA証明書（ローカル） | `backend/certs/ca/ca.crt` |
| CA秘密鍵（ローカル） | `backend/certs/ca/ca.key` |

---

## 前提条件

- ローカル環境に Node.js / npx がインストール済みであること
- `backend/certs/ca/ca.crt` と `backend/certs/ca/ca.key` が存在すること
- 踏み台サーバに AWS CLI がインストール・設定済みであること
- 踏み台サーバが S3 バケット `mmdpf-files-production` への書き込み権限を持つこと

### CA証明書の確認

```bash
ls -la backend/certs/ca/ca.crt
ls -la backend/certs/ca/ca.key
```

存在しない場合は以下で生成：

```bash
bash scripts/generate-certificates.sh
```

---

## 対象組織IDの確認

踏み台サーバからDBに接続し、対象組織のIDを確認します。

```bash
# psqlで接続
PGPASSWORD="maiml_user" psql \
  -h alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require

# 組織一覧を確認
SELECT organization_id, organization_cd, organization_display_name FROM organization;

# 特定の組織CDで検索
SELECT organization_id, organization_cd, organization_display_name
FROM organization
WHERE organization_cd = '対象の組織CD';
```

---

## Step 1: ローカルで .p12 ファイルを生成

ローカル環境（プロジェクトルート）で以下を実行します。

```bash
cd /path/to/Alchemia_Staging/backend

# 対象の組織IDを変数にセット
ORG_ID="b6ae9356-48e2-4b8c-bae6-945fa2db66ee"  # ← 実際の組織IDに変更

# 証明書を /tmp/{ORG_ID}.p12 として生成
npx ts-node --transpile-only -e "
const { generateClientCertificate } = require('./src/services/certificateService');
const fs = require('fs');
generateClientCertificate('${ORG_ID}').then(result => {
  if (result.success && result.p12Buffer) {
    fs.writeFileSync('/tmp/${ORG_ID}.p12', result.p12Buffer);
    console.log('✅ 証明書を /tmp/${ORG_ID}.p12 に保存しました（サイズ: ' + result.p12Buffer.length + ' bytes）');
  } else {
    console.error('❌ 失敗:', result.errorMessage);
    process.exit(1);
  }
}).catch(e => { console.error(e); process.exit(1); });
"
```

成功すると `/tmp/{ORG_ID}.p12` にファイルが生成されます。

---

## Step 2: 踏み台サーバに .p12 ファイルを転送

```bash
ORG_ID="b6ae9356-48e2-4b8c-bae6-945fa2db66ee"  # ← 実際の組織IDに変更

scp -i ~/.ssh/your-key.pem \
  /tmp/${ORG_ID}.p12 \
  ec2-user@<踏み台サーバのIPアドレス>:/tmp/
```

---

## Step 3: 踏み台サーバから S3 にアップロード

踏み台サーバにSSHで接続し、以下を実行します。

```bash
ORG_ID="b6ae9356-48e2-4b8c-bae6-945fa2db66ee"  # ← 実際の組織IDに変更

# S3にアップロード（フォルダは自動的に作成される）
aws s3 cp /tmp/${ORG_ID}.p12 \
  s3://mmdpf-files-production/${ORG_ID}/certificates/${ORG_ID}.p12 \
  --content-type "application/x-pkcs12" \
  --region ap-northeast-1

echo "✅ S3アップロード完了"
```

---

## Step 4: アップロード確認

踏み台サーバで以下を実行し、ファイルが正しく保存されているか確認します。

```bash
ORG_ID="b6ae9356-48e2-4b8c-bae6-945fa2db66ee"  # ← 実際の組織IDに変更

aws s3 ls s3://mmdpf-files-production/${ORG_ID}/certificates/ --region ap-northeast-1
```

以下のような出力が表示されれば成功です：

```
2026-04-16 10:00:00       4096 b6ae9356-48e2-4b8c-bae6-945fa2db66ee.p12
```

---

## Step 5: 一時ファイルの削除

証明書ファイルは機密情報のため、作業後は必ず削除してください。

```bash
ORG_ID="b6ae9356-48e2-4b8c-bae6-945fa2db66ee"  # ← 実際の組織IDに変更

# ローカルの一時ファイルを削除
rm /tmp/${ORG_ID}.p12

# 踏み台サーバの一時ファイルを削除
ssh -i ~/.ssh/your-key.pem ec2-user@<踏み台サーバのIPアドレス> "rm /tmp/${ORG_ID}.p12"
```

---

## Step 6: 動作確認

アプリの組織管理画面にアクセスし、対象組織の **「証明書DL」ボタン** を押下して `.p12` ファイルがダウンロードできることを確認してください。

---

## 補足: 既存スクリプトによる直接実行（ローカルS3/Swift環境向け）

ローカル開発環境（OpenStack Swift）や、ローカルから本番S3の書き込みが可能な場合は、既存スクリプトで一括実行できます。

```bash
cd /path/to/Alchemia_Staging/backend

# 環境変数で本番S3を指定して実行
STORAGE_TYPE=s3 \
AWS_REGION=ap-northeast-1 \
AWS_S3_BUCKET=mmdpf-files-production \
CA_CERT_PATH="$(pwd)/certs/ca/ca.crt" \
CA_KEY_PATH="$(pwd)/certs/ca/ca.key" \
CERT_P12_PASSWORD="mmdpf123" \
npx ts-node --transpile-only scripts/regenerate-certificate.ts <organization_id>
```

> ⚠️ この方法はローカル環境に本番AWSの書き込み権限がある場合のみ使用可能です。

---

## トラブルシューティング

### CA証明書が見つからない

```
[certificateService] CA証明書の検証失敗: CA証明書ファイルが見つかりません
```

→ `backend/certs/ca/ca.crt` を確認し、存在しない場合は以下で生成：
```bash
bash scripts/generate-certificates.sh
```

### S3アップロードに失敗する

```
upload failed: /tmp/xxx.p12 to s3://... An error occurred (AccessDenied)
```

→ 踏み台サーバのIAMロールに `s3:PutObject` 権限があるか確認してください。

### アプリで証明書DLができない

→ S3のパスが正しいか確認してください：
```
正しいパス: {organizationId}/certificates/{organizationId}.p12
```
