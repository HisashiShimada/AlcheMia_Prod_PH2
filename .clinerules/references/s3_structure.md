# S3/Swiftフォルダ構成定義

## 概要

このドキュメントは、mmdpfプロジェクトにおけるS3（本番環境）およびOpenStack Swift（開発環境）のフォルダ構成を定義します。

**重要**: マルチテナント分離のため、すべてのファイルパスは `{organization_id}` プレフィックスが必須です。

---

## 📂 基本構造

### ルート構造

```
{bucket_name}/
└── {organization_id}/         # 組織ID（UUID形式）
    ├── projects/              # プロジェクトフォルダ
    │   └── {project_name}/
    │       ├── {project_name}.maiml
    │       └── archive/
    ├── formats/               # フォーマット定義
    └── certificates/          # クライアント証明書
```

### バケット名とプレフィックス

**開発環境（Swift）:**
- コンテナ名: `mmdpf-files` (デフォルト)
- 環境変数: `SWIFT_CONTAINER` または `S3_BUCKET_NAME`

**本番環境（S3）:**
- バケット名: 組織ごとに設定
- 環境変数: `AWS_S3_BUCKET`

**組織ID:**
- 形式: UUID（`{organization_id}`）
- `organization_id` は `organization` テーブルの主キー
- 例: `550e8400-e29b-41d4-a716-446655440000`, `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

---

## 🎯 フォルダ構成詳細

### 1. projects/ - プロジェクトフォルダ

```
{organization_id}/projects/
└── {project_name}/
    ├── {project_name}.maiml       # 現在のMAIMLファイル
    └── archive/
        ├── {project_name}_v1.maiml
        ├── {project_name}_v2.maiml
        └── {project_name}_v3.maiml
```

**パス例:**
```
550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml
550e8400-e29b-41d4-a716-446655440000/projects/sample_project/archive/sample_project_v1.maiml
550e8400-e29b-41d4-a716-446655440000/projects/sample_project/archive/sample_project_v2.maiml
```

**用途:**
- プロジェクトフォルダ名は `project_name` を使用
- 各プロジェクトフォルダ直下に現在のMAIMLファイルを配置
- archive/ サブフォルダに過去バージョンを保存
- バージョン番号（v1, v2, v3...）で履歴を管理

**命名規則:**
- **現在のファイル**: `{project_name}.maiml`
- **アーカイブファイル**: `{project_name}_v{version}.maiml`
- 例: `sample_project.maiml`, `sample_project_v1.maiml`

---

### 2. formats/ - フォーマット定義

```
{organization_id}/formats/
└── {format_prefix}/
    ├── file.maiml または file.xml  # プレフィックス直下に配置可能
    └── {subfolder_name}/             # サブフォルダ（任意の階層構造）
        └── file.maiml または file.xml
```

**パス例:**
```
550e8400-e29b-41d4-a716-446655440000/formats/chemistry/synthesis_workflow.maiml
550e8400-e29b-41d4-a716-446655440000/formats/chemistry/analysis/analysis_workflow.maiml
550e8400-e29b-41d4-a716-446655440000/formats/materials/material_template.xml
550e8400-e29b-41d4-a716-446655440000/formats/materials/conditions/condition_template.xml
550e8400-e29b-41d4-a716-446655440000/formats/biology/cell_culture.maiml
550e8400-e29b-41d4-a716-446655440000/formats/reagents/reagent_template.xml
```

**用途:**
- **各プレフィックスは「ワークフロー用（.maiml）」または「テンプレート用（.xml）」のどちらか**を保持
- どちらのファイル種別を保持するかは**データベースで定義・管理**される
- **ワークフローMAIMLファイル（.maiml）**: Petri Net形式の実験手順、メソッド定義
- **テンプレートファイル（.xml）**: Material（材料）、Condition（条件）、Result（結果）テンプレート
- プレフィックス直下にもファイルを配置可能
- サブフォルダを作成して階層化も可能（作成時に指定）
- 複数プロジェクトで再利用可能

**命名規則:**
- **format_prefix**: 任意の名前（作成時に指定、DBで管理）
  - 例: `chemistry`, `biology`, `materials`, `reagents`, `material_science`
- **サブフォルダ**: 任意の名前（作成時に指定、階層化可能）
- **ファイル名**: 用途を表す名前 + `.maiml` または `.xml`

---

### 3. certificates/ - クライアント証明書

```
{organization_id}/certificates/
└── {organization_id}.p12       # PKCS#12形式のクライアント証明書
```

**パス例:**
```
550e8400-e29b-41d4-a716-446655440000/certificates/550e8400-e29b-41d4-a716-446655440000.p12
6ba7b810-9dad-11d1-80b4-00c04fd430c8/certificates/6ba7b810-9dad-11d1-80b4-00c04fd430c8.p12
```

**用途:**
- 組織ごとのクライアント証明書（PKCS#12形式）
- ブラウザにインポートして使用
- クライアント証明書認証に使用
- 組織作成時に自動生成

**証明書の構成:**
- **クライアント秘密鍵**: RSA 2048bit
- **クライアント証明書**: Subject CN=組織ID（UUID）
- **CA証明書**: 発行元CA証明書（チェーン）
- **パスワード**: 環境変数 `CERT_P12_PASSWORD`（デフォルト: `mmdpf123`）
- **有効期限**: 365日（環境変数 `CERT_VALIDITY_DAYS` で変更可能）

**命名規則:**
- ファイル名: `{organization_id}.p12`
- 拡張子: `.p12`（PKCS#12形式）
- サイズ: 約4-6KB

**自動生成タイミング:**
- 組織作成時（`POST /api/v1/provider/organization`）
- `certificateService.generateAndSaveCertificate()` が自動実行
- 生成失敗時はログに記録されるが、組織作成は続行される

**手動再生成:**
```bash
# 既存組織の証明書を再生成
npx ts-node backend/scripts/regenerate-certificate.ts <organization_id>

# 例
npx ts-node backend/scripts/regenerate-certificate.ts 550e8400-e29b-41d4-a716-446655440000
```

**証明書のダウンロード:**
- API: `GET /api/v1/provider/organization/:organizationId/certificate`
- 署名付きURL有効期限: 5分間（短期間を推奨）
- Content-Type: `application/x-pkcs12`
- ブラウザで自動的にダウンロードが開始される

---

---

## 🔒 セキュリティとアクセス制御

### マルチテナント分離（必須）

#### 1. プレフィックスの強制

```typescript
// ✅ 正しい例
const projectName = 'sample_project';
const filePath = storageService.uploadFile(
  organizationId,          // organization_idを必須指定
  `projects/${projectName}/${projectName}.maiml`,
  fileContent
);
// 実際のS3キー: 550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml

// ❌ 間違った例（organization_idなし）
const filePath = s3Client.putObject({
  Key: `projects/${projectName}/${projectName}.maiml`  // プレフィックスなし
});
```

#### 2. アクセス権限の検証

- すべてのS3操作でorganization_idを必須とする
- ユーザーは自組織のファイルのみアクセス可能
- クロステナントアクセスは厳禁（System Admin除く）

#### 3. 署名付きURL（Pre-signed URL）

```typescript
// ✅ 推奨: 署名付きURLを使用
const projectName = 'sample_project';
const signedUrl = await storageService.getSignedUrl(
  organizationId,
  `projects/${projectName}/${projectName}.maiml`,
  3600  // 有効期限: 1時間
);

// ❌ 非推奨: 直接URLを返さない
const directUrl = `https://s3.amazonaws.com/${bucket}/${key}`;
```

---

## 🛠️ 実装ガイドライン

### DO（推奨）

✅ **storageService.tsを使用する**
```typescript
import { getStorageService } from '@/services/storageService';

const storageService = getStorageService();
await storageService.uploadFile(organizationId, filePath, content);
```

✅ **organization_idを必ず指定する**
```typescript
// すべての操作でorganization_idを指定
await storageService.listFiles(organizationId, 'projects/archive');
```

✅ **相対パスを使用する**
```typescript
// organization_idは自動付与されるため、相対パスで指定
const projectName = 'sample_project';
const path = `projects/${projectName}/${projectName}.maiml`;
```

✅ **署名付きURLを使用する**
```typescript
// フロントエンドへはPre-signed URLを返す
const url = await storageService.getSignedUrl(organizationId, path, 3600);
res.json({ url });
```

### DON'T（非推奨）

❌ **S3Clientを直接使用しない**
```typescript
// storageService経由で操作すること
import { S3Client } from '@aws-sdk/client-s3';  // 直接使用禁止
```

❌ **organization_idなしでファイル操作しない**
```typescript
// organization_idは必須
await storageService.uploadFile('', filePath, content);  // NG
```

❌ **絶対パスを使用しない**
```typescript
// organization_idを含めない
const path = '550e8400-e29b-41d4-a716-446655440000/projects/...';  // NG
```

❌ **直接URLをクライアントに返さない**
```typescript
// 署名付きURLを使用すること
const url = `https://s3.amazonaws.com/${bucket}/${key}`;  // NG
```

---

## 📐 パス命名規則

### ディレクトリ名

- **アルファベット + アンダースコア**: `projects`, `experiments`, `temp_uploads`, `Project_Data`
- **複数形を使用**: `templates`, `workflows`, `attachments`

### ファイル名

- **アルファベット + アンダースコア**: `project.maiml`, `method_001.maiml`, `Sample_Project.maiml`
- **拡張子を明示**: `.maiml`, `.xml`, `.json`, `.csv`

### ID形式

- **プロジェクト名**: プロジェクト名をそのまま使用（スペースはアンダースコアに変換）
- **format_prefix**: アルファベット + アンダースコア（例: `chemistry`, `biology`, `Material_Science`）
- **サブフォルダ名**: 任意の名前（作成時に指定）
- **バージョン番号**: `v1`, `v2`, `v3`...（連番）

---

## 🔄 ファイル操作の例

### アップロード

```typescript
// プロジェクトMAIMLファイルの新規作成・更新
const projectName = 'sample_project';
await storageService.uploadFile(
  '550e8400-e29b-41d4-a716-446655440000',  // organization_id
  `projects/${projectName}/${projectName}.maiml`,
  maimlContent,
  { contentType: 'application/xml' }
);

// 現在のファイルをアーカイブに移動（バージョン番号付き）
// まず既存ファイルを取得
const existingFile = await storageService.downloadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/${projectName}.maiml`
);

// アーカイブファイル一覧を取得して次のバージョン番号を決定
const archiveFiles = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive`
);
const nextVersion = archiveFiles.length + 1;

// アーカイブに保存
await storageService.uploadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive/${projectName}_v${nextVersion}.maiml`,
  existingFile,
  { contentType: 'application/xml' }
);

// フォーマット - ワークフローのアップロード
await storageService.uploadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  'formats/chemistry/synthesis/synthesis_workflow.maiml',
  workflowContent,
  { contentType: 'application/xml' }
);

// フォーマット - テンプレートのアップロード
await storageService.uploadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  'formats/materials/conditions/condition_template.xml',
  templateContent,
  { contentType: 'application/xml' }
);
```

### ダウンロード

```typescript
// 現在のプロジェクトMAIMLファイルを取得
const projectName = 'sample_project';
const maimlBuffer = await storageService.downloadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/${projectName}.maiml`
);

// 特定バージョンのアーカイブファイルを取得
const version = 2;
const archivedMaimlBuffer = await storageService.downloadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive/${projectName}_v${version}.maiml`
);

// 署名付きURLの取得（フロントエンド用）
const signedUrl = await storageService.getSignedUrl(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/${projectName}.maiml`,
  3600  // 1時間有効
);

// アーカイブファイルの署名付きURL
const archivedSignedUrl = await storageService.getSignedUrl(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive/${projectName}_v${version}.maiml`,
  3600
);
```

### ファイル一覧取得

```typescript
// プロジェクト一覧を取得
const projectFolders = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  'projects'
);

// 特定プロジェクトのアーカイブファイル一覧を取得
const projectName = 'sample_project';
const archiveFiles = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive`
);

// アーカイブファイルをバージョン順にソート
const sortedArchives = archiveFiles
  .filter(file => file.key.endsWith('.maiml'))
  .sort((a, b) => {
    // ファイル名から v{number} を抽出して比較
    const versionA = parseInt(a.key.match(/_v(\d+)\.maiml$/)?.[1] || '0');
    const versionB = parseInt(b.key.match(/_v(\d+)\.maiml$/)?.[1] || '0');
    return versionB - versionA; // 降順（最新が先頭）
  });

// フォーマット - ワークフロー一覧を取得
const workflowFiles = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  'formats/chemistry'
);

// フォーマット - テンプレート一覧を取得
const templateFiles = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  'formats/materials'
);

// 特定サブフォルダのファイル一覧を取得
const synthesisWorkflows = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  'formats/chemistry/synthesis'
);
```

### ファイルの削除

```typescript
// 古いアーカイブファイルの削除
const projectName = 'sample_project';
await storageService.deleteFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive/${projectName}_v1.maiml`
);

// プロジェクト全体の削除（注意: 現在のファイルとアーカイブすべて）
// まずアーカイブファイルを削除
const archiveFiles = await storageService.listFiles(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/archive`
);
for (const file of archiveFiles) {
  await storageService.deleteFile('550e8400-e29b-41d4-a716-446655440000', file.key);
}
// 現在のファイルを削除
await storageService.deleteFile(
  '550e8400-e29b-41d4-a716-446655440000',
  `projects/${projectName}/${projectName}.maiml`
);
```

### 証明書のダウンロード

```typescript
// クライアント証明書をダウンロード
const p12Buffer = await storageService.downloadFile(
  '550e8400-e29b-41d4-a716-446655440000',
  'certificates/550e8400-e29b-41d4-a716-446655440000.p12'
);

// フロントエンドへ提供（署名付きURL）
const signedUrl = await storageService.getSignedUrl(
  '550e8400-e29b-41d4-a716-446655440000',
  'certificates/550e8400-e29b-41d4-a716-446655440000.p12',
  300  // 5分間有効（短い有効期限を推奨）
);
res.json({ certificateUrl: signedUrl });

// またはcertificateService経由（推奨）
import { getCertificateFromStorage } from '@/services/certificateService';

const p12Buffer = await getCertificateFromStorage(organizationId);
```

### 証明書の存在確認

```typescript
import { certificateExists } from '@/services/certificateService';

// 証明書の存在確認
const exists = await certificateExists(organizationId);
if (!exists) {
  // 証明書を再生成
  await generateAndSaveCertificate(organizationId);
}
```

---

## 🔍 トラブルシューティング

### よくある問題

#### 1. ファイルが見つからない

**症状:**
```
Error: File not found: 550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml
```

**原因:**
- organization_idが間違っている
- project_nameが間違っている
- ファイルパスが間違っている
- ファイルがまだアップロードされていない

**解決方法:**
```typescript
// ファイルの存在確認
const projectName = 'sample_project';
const filePath = `projects/${projectName}/${projectName}.maiml`;
const exists = await storageService.fileExists(organizationId, filePath);
if (!exists) {
  throw new Error('File not found');
}
```

#### 2. アクセス権限エラー

**症状:**
```
Error: Access Denied
```

**原因:**
- 異なる組織のファイルにアクセスしようとしている
- organization_idが指定されていない

**解決方法:**
```typescript
// 必ずリクエストユーザーのorganization_idを使用
const organizationId = req.organizationId;  // ミドルウェアで設定
await storageService.downloadFile(organizationId, filePath);
```

#### 3. 署名付きURLの有効期限切れ

**症状:**
```
Error: Request has expired
```

**原因:**
- 署名付きURLの有効期限（デフォルト: 1時間）が切れている

**解決方法:**
```typescript
// 必要に応じて有効期限を延長
const signedUrl = await storageService.getSignedUrl(
  organizationId,
  filePath,
  7200  // 2時間
);
```

#### 4. 証明書が見つからない

**症状:**
```
Error: Certificate not found: 550e8400-e29b-41d4-a716-446655440000/certificates/550e8400-e29b-41d4-a716-446655440000.p12
```

**原因:**
- 組織作成時に証明書生成が失敗した
- CA証明書（nginx/certs/ca/）が存在しない
- 証明書が手動で削除された

**解決方法:**
```bash
# 1. CA証明書の存在確認
ls -la backend/certs/ca/ca.crt
ls -la backend/certs/ca/ca.key

# 2. CA証明書がない場合は生成
npx ts-node backend/scripts/generate-ca-certificate.ts

# 3. バックエンドを再起動
docker restart mmdpf-backend-1

# 4. クライアント証明書を再生成
npx ts-node backend/scripts/regenerate-certificate.ts 550e8400-e29b-41d4-a716-446655440000

# 5. ログで確認
docker logs mmdpf-backend-1 | grep "certificateService"
```

---

## 📚 関連ドキュメント

- [セキュリティ規約](../development/security.md) - マルチテナント分離の詳細
- [バックエンド規約](../development/backend.md) - ファイル操作の実装ガイド
- [データベース構造](./db_structure.md) - file_metadataテーブルとの連携
- [組織管理API](../../docs/design/api/api_organization_management.md) - 証明書ダウンロードAPI

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-02-19 | certificates/フォルダ構成定義を追加（クライアント証明書） | Cline |
| 2026-02-17 | 組織プレフィックス形式から組織ID（UUID）形式に変更 | Cline |
| 2026-01-09 | 初版作成 | Cline |
