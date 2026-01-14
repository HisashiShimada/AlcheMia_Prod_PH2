# S3/Swiftフォルダ構成定義

## 概要

このドキュメントは、mmdpfプロジェクトにおけるS3（本番環境）およびOpenStack Swift（開発環境）のフォルダ構成を定義します。

**重要**: マルチテナント分離のため、すべてのファイルパスは `org_{organization_prefix}` プレフィックスが必須です。

---

## 📂 基本構造

### ルート構造

```
{bucket_name}/
└── org_{organization_prefix}/
    ├── projects/              # プロジェクトフォルダ
    │   └── {project_name}/
    │       ├── {project_name}.maiml
    │       └── archive/
    └── formats/               # フォーマット定義
```

### バケット名とプレフィックス

**開発環境（Swift）:**
- コンテナ名: `mmdpf-files` (デフォルト)
- 環境変数: `SWIFT_CONTAINER` または `S3_BUCKET_NAME`

**本番環境（S3）:**
- バケット名: 組織ごとに設定
- 環境変数: `AWS_S3_BUCKET`

**組織プレフィックス:**
- 形式: `org_{organization_prefix}`
- `organization_prefix` は `organization` テーブルの `organization_name` から生成
- 例: `org_maiml_lab_001`, `org_research_center_a`

---

## 🎯 フォルダ構成詳細

### 1. projects/ - プロジェクトフォルダ

```
org_{organization_prefix}/projects/
└── {project_name}/
    ├── {project_name}.maiml       # 現在のMAIMLファイル
    └── archive/
        ├── {project_name}_v1.maiml
        ├── {project_name}_v2.maiml
        └── {project_name}_v3.maiml
```

**パス例:**
```
org_maiml_lab_001/projects/sample_project/sample_project.maiml
org_maiml_lab_001/projects/sample_project/archive/sample_project_v1.maiml
org_maiml_lab_001/projects/sample_project/archive/sample_project_v2.maiml
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
org_{organization_prefix}/formats/
└── {format_prefix}/
    ├── file.maiml または file.xml  # プレフィックス直下に配置可能
    └── {subfolder_name}/             # サブフォルダ（任意の階層構造）
        └── file.maiml または file.xml
```

**パス例:**
```
org_maiml_lab_001/formats/chemistry/synthesis_workflow.maiml
org_maiml_lab_001/formats/chemistry/analysis/analysis_workflow.maiml
org_maiml_lab_001/formats/materials/material_template.xml
org_maiml_lab_001/formats/materials/conditions/condition_template.xml
org_maiml_lab_001/formats/biology/cell_culture.maiml
org_maiml_lab_001/formats/reagents/reagent_template.xml
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

---

## 🔒 セキュリティとアクセス制御

### マルチテナント分離（必須）

#### 1. プレフィックスの強制

```typescript
// ✅ 正しい例
const projectName = 'sample_project';
const filePath = storageService.uploadFile(
  organizationPrefix,          // organization_prefixを必須指定
  `projects/${projectName}/${projectName}.maiml`,
  fileContent
);
// 実際のS3キー: org_maiml_lab_001/projects/sample_project/sample_project.maiml

// ❌ 間違った例（organization_prefixなし）
const filePath = s3Client.putObject({
  Key: `projects/${projectName}/${projectName}.maiml`  // プレフィックスなし
});
```

#### 2. アクセス権限の検証

- すべてのS3操作でorganization_prefixを必須とする
- ユーザーは自組織のファイルのみアクセス可能
- クロステナントアクセスは厳禁（System Admin除く）

#### 3. 署名付きURL（Pre-signed URL）

```typescript
// ✅ 推奨: 署名付きURLを使用
const projectName = 'sample_project';
const signedUrl = await storageService.getSignedUrl(
  organizationPrefix,
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

✅ **organization_prefixを必ず指定する**
```typescript
// すべての操作でorganization_prefixを指定
await storageService.listFiles(organizationPrefix, 'projects/archive');
```

✅ **相対パスを使用する**
```typescript
// プレフィックスは自動付与されるため、相対パスで指定
const projectName = 'sample_project';
const path = `projects/${projectName}/${projectName}.maiml`;
```

✅ **署名付きURLを使用する**
```typescript
// フロントエンドへはPre-signed URLを返す
const url = await storageService.getSignedUrl(organizationPrefix, path, 3600);
res.json({ url });
```

### DON'T（非推奨）

❌ **S3Clientを直接使用しない**
```typescript
// storageService経由で操作すること
import { S3Client } from '@aws-sdk/client-s3';  // 直接使用禁止
```

❌ **organization_prefixなしでファイル操作しない**
```typescript
// organization_prefixは必須
await storageService.uploadFile('', filePath, content);  // NG
```

❌ **絶対パスを使用しない**
```typescript
// プレフィックスを含めない
const path = 'org_maiml_lab_001/projects/...';  // NG
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
  'maiml_lab_001',  // organization_prefix
  `projects/${projectName}/${projectName}.maiml`,
  maimlContent,
  { contentType: 'application/xml' }
);

// 現在のファイルをアーカイブに移動（バージョン番号付き）
// まず既存ファイルを取得
const existingFile = await storageService.downloadFile(
  'maiml_lab_001',
  `projects/${projectName}/${projectName}.maiml`
);

// アーカイブファイル一覧を取得して次のバージョン番号を決定
const archiveFiles = await storageService.listFiles(
  'maiml_lab_001',
  `projects/${projectName}/archive`
);
const nextVersion = archiveFiles.length + 1;

// アーカイブに保存
await storageService.uploadFile(
  'maiml_lab_001',
  `projects/${projectName}/archive/${projectName}_v${nextVersion}.maiml`,
  existingFile,
  { contentType: 'application/xml' }
);

// フォーマット - ワークフローのアップロード
await storageService.uploadFile(
  'maiml_lab_001',
  'formats/chemistry/synthesis/synthesis_workflow.maiml',
  workflowContent,
  { contentType: 'application/xml' }
);

// フォーマット - テンプレートのアップロード
await storageService.uploadFile(
  'maiml_lab_001',
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
  'maiml_lab_001',
  `projects/${projectName}/${projectName}.maiml`
);

// 特定バージョンのアーカイブファイルを取得
const version = 2;
const archivedMaimlBuffer = await storageService.downloadFile(
  'maiml_lab_001',
  `projects/${projectName}/archive/${projectName}_v${version}.maiml`
);

// 署名付きURLの取得（フロントエンド用）
const signedUrl = await storageService.getSignedUrl(
  'maiml_lab_001',
  `projects/${projectName}/${projectName}.maiml`,
  3600  // 1時間有効
);

// アーカイブファイルの署名付きURL
const archivedSignedUrl = await storageService.getSignedUrl(
  'maiml_lab_001',
  `projects/${projectName}/archive/${projectName}_v${version}.maiml`,
  3600
);
```

### ファイル一覧取得

```typescript
// プロジェクト一覧を取得
const projectFolders = await storageService.listFiles(
  'maiml_lab_001',
  'projects'
);

// 特定プロジェクトのアーカイブファイル一覧を取得
const projectName = 'sample_project';
const archiveFiles = await storageService.listFiles(
  'maiml_lab_001',
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
  'maiml_lab_001',
  'formats/chemistry'
);

// フォーマット - テンプレート一覧を取得
const templateFiles = await storageService.listFiles(
  'maiml_lab_001',
  'formats/materials'
);

// 特定サブフォルダのファイル一覧を取得
const synthesisWorkflows = await storageService.listFiles(
  'maiml_lab_001',
  'formats/chemistry/synthesis'
);
```

### ファイルの削除

```typescript
// 古いアーカイブファイルの削除
const projectName = 'sample_project';
await storageService.deleteFile(
  'maiml_lab_001',
  `projects/${projectName}/archive/${projectName}_v1.maiml`
);

// プロジェクト全体の削除（注意: 現在のファイルとアーカイブすべて）
// まずアーカイブファイルを削除
const archiveFiles = await storageService.listFiles(
  'maiml_lab_001',
  `projects/${projectName}/archive`
);
for (const file of archiveFiles) {
  await storageService.deleteFile('maiml_lab_001', file.key);
}
// 現在のファイルを削除
await storageService.deleteFile(
  'maiml_lab_001',
  `projects/${projectName}/${projectName}.maiml`
);

```

---

## 🔍 トラブルシューティング

### よくある問題

#### 1. ファイルが見つからない

**症状:**
```
Error: File not found: org_maiml_lab_001/projects/sample_project/sample_project.maiml
```

**原因:**
- organization_prefixが間違っている
- project_nameが間違っている
- ファイルパスが間違っている
- ファイルがまだアップロードされていない

**解決方法:**
```typescript
// ファイルの存在確認
const projectName = 'sample_project';
const filePath = `projects/${projectName}/${projectName}.maiml`;
const exists = await storageService.fileExists(organizationPrefix, filePath);
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
- organization_prefixが指定されていない

**解決方法:**
```typescript
// 必ずリクエストユーザーのorganization_prefixを使用
const organizationPrefix = req.organizationPrefix;  // ミドルウェアで設定
await storageService.downloadFile(organizationPrefix, filePath);
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
  organizationPrefix,
  filePath,
  7200  // 2時間
);
```

---

## 📚 関連ドキュメント

- [セキュリティ規約](../development/security.md) - マルチテナント分離の詳細
- [バックエンド規約](../development/backend.md) - ファイル操作の実装ガイド
- [データベース構造](./db_structure.md) - file_metadataテーブルとの連携

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-09 | 初版作成 | Cline |
