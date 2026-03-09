# タスク計画書: WorkProgressDetailDialog maimlFileKey パス修正

## メタデータ
- **作成日時**: 2026-03-09 17:53
- **タスクID**: WorkProgressDetailDialog_maimlFileKey修正
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

`WorkProgressDetailDialog.tsx` の `fetchFileDetails` 関数内で、`fileData.maimlFileKey` からプロジェクト名を抽出する正規表現が誤っており、プロジェクト名が取得できずエラーが発生する問題を修正する。

## 2. 調査結果

### データフロー

```
ProgressMonitoring.tsx
  ↓ handleViewDetails()
  ↓ fetchProjectFilesReal(record.projectName)
    → GET /api/v1/projects/:projectName/files
      ↓ projectService.getProjectFiles()
        → storageService.listFiles()
          → S3/Swiftのfileキー: "{organizationId}/projects/{name}/{name}.maiml"
          → organizationIdプレフィックスを除去して返却
          → path: "projects/{name}/{name}.maiml"  ← organizationIdなし
  ↓ maimlFile.path  →  "projects/{name}/{name}.maiml"
  ↓ setFileData({ maimlFileKey: maimlFile.path, ... })

WorkProgressDetailDialog.tsx
  ↓ fileData.maimlFileKey  →  "projects/{name}/{name}.maiml"
  ↓ .match(/\/projects\/([^/]+)\//)  ← 先頭に"/"を要求するためマッチしない！
  ↓ projectName = null
  ↓ throw new Error('maimlFileKeyからプロジェクト名を取得できませんでした')
```

### 根本原因

バックエンド `projectService.ts` の `getProjectFiles` は、S3/Swiftから取得したフルキー（`{organizationId}/projects/{name}/{name}.maiml`）から **`organizationId` プレフィックスを除去** して `path` として返す：

```typescript
// file.key 例: "550e8400.../projects/Sample_Project/Sample_Project.maiml"
// 相対パス例: "projects/Sample_Project/Sample_Project.maiml"
const relativePath = file.key.startsWith(`${organizationId}/`)
  ? file.key.slice(`${organizationId}/`.length)
  : file.key;
path: relativePath,  // ← organizationId なしの相対パス
```

### 問題箇所（WorkProgressDetailDialog.tsx 95行目付近）

```typescript
// ❌ 誤り：コメントが実態と異なる
// 形式: {organizationId}/projects/{projectName}/{projectName}.maiml
const projectNameMatch = fileData.maimlFileKey.match(/\/projects\/([^/]+)\//);
```

正規表現 `/\/projects\/([^/]+)\//` は先頭に `/` を必要とするため、
`"projects/xxx/yyy.maiml"` にはマッチしない（`null` が返る）。

## 3. 目的と期待される成果

- [ ] 正規表現を修正してプロジェクト名が正しく抽出されること
- [ ] コメントを実態に合わせて修正すること
- [ ] `ProgressMonitoring.tsx` の誤ったコメントも修正すること

## 4. 実装ステップ

### Step 1: WorkProgressDetailDialog.tsx の正規表現修正
- [ ] 正規表現を `(?:^|\/)projects\/([^/]+)\/` に変更（先頭パターンを許容）
- [ ] コメントを正しい形式に修正

### Step 2: ProgressMonitoring.tsx のコメント修正
- [ ] `maimlFileKey` のコメント（誤った形式説明）を修正

## 5. 変更ファイル

1. `frontend/src/components/progress/WorkProgressDetailDialog.tsx` - 正規表現とコメント修正
2. `frontend/src/components/progress/ProgressMonitoring.tsx` - コメント修正

## 6. 修正内容

### WorkProgressDetailDialog.tsx（95行目付近）

**変更前:**
```typescript
// maimlFileKey からプロジェクト名を抽出
// 形式: {organizationId}/projects/{projectName}/{projectName}.maiml
const projectNameMatch = fileData.maimlFileKey.match(/\/projects\/([^/]+)\//);
```

**変更後:**
```typescript
// maimlFileKey からプロジェクト名を抽出
// 形式: "projects/{projectName}/{projectName}.maiml"（organizationIdプレフィックスなし）
// ※ バックエンドはorganizationIdを除去した相対パスを返す
const projectNameMatch = fileData.maimlFileKey.match(/(?:^|\/)projects\/([^/]+)\//);
```

### ProgressMonitoring.tsx（handleViewDetails内）

**変更前:**
```typescript
maimlFileKey: maimlFile.path, // 実際のS3キー（例: {org_id}/projects/{name}/{name}.maiml）
```

**変更後:**
```typescript
maimlFileKey: maimlFile.path, // 相対パス（例: projects/{name}/{name}.maiml）※organizationIdプレフィックスなし
```

## 7. リスク

| リスク | 対策 |
|--------|------|
| バックエンドが将来的にorganizationIdプレフィックス付きのパスを返す可能性 | `(?:^|\/)` を使い両形式に対応した正規表現を使用 |

## 8. テスト計画

- [ ] `projects/sample_project/sample_project.maiml` でプロジェクト名が `sample_project` に抽出されること
- [ ] `550e8400-e29b-41d4-a716-446655440000/projects/sample_project/sample_project.maiml` でも正しく抽出されること（後方互換）

## 9. 承認記録
- **計画書提示日時**: 2026-03-09 17:53
- **承認日時**: 2026-03-09 17:53
- **承認者コメント**: 修正を承認
