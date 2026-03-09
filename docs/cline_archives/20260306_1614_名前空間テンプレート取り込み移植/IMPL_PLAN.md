# 実装タスク計画書: 名前空間テンプレート取り込み移植（必須対応）

## メタデータ
- **作成日時**: 2026-03-07 23:04
- **タスクID**: namespace_template_import_migration
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

PLAN.mdの🔴必須対応（5-1〜5-6）を実装する。
V2（editorv2 / TS版）の名前空間テンプレート取り込み機能を正しく動作させる。

## 実装ステップ

### Step 1: バックエンド - GET /api/v1/maiml/formats エンドポイント追加
- [ ] `backend/src/controllers/maimlController.ts` に `listFormats` 関数を追加
- [ ] `backend/src/routes/maimlRoutes.ts` に `GET /formats` ルートを追加
- 処理内容：`formats/` 配下を全部門横断で走査し、`material/` `condition/` `result/` 配下の `.xml` ファイルのみ抽出
- レスポンス形式：`{ success: true, data: { departments: [{ departmentCd, folders: [{ folderName, files: [{ key, fileName, size }] }] }] } }`

### Step 2: フロントエンド - templateApi.ts の呼び出し先修正
- [ ] `fetchTemplateFiles` → `GET /api/v1/maiml/formats` に変更
- [ ] `fetchTemplateContent` → `GET /api/v1/maiml/file-content` に変更
- [ ] 戻り値型を新APIのレスポンス形式に合わせて修正
- [ ] `getTemplateSignedUrl` を削除（未使用）

### Step 3: フロントエンド - TemplateEditorDialog.tsx の修正
- [ ] **Step 3-1**: `useNamespaceOperations` を import・接続
- [ ] **Step 3-2**: `handleOpenNamespaceImport` で `fetchTemplateFiles` ではなく `useNamespaceOperations` の API を使用するよう修正
- [ ] **Step 3-3**: `handleSelectNamespaceFile` で `analyzeNamespaceFile()` を使用（`parseNamespacesFromXml` を廃止）
- [ ] **Step 3-4**: `handleImportNamespace` で `replaceTemplateWithNamespace()` を使用（全置き換え方式に変更）
- [ ] **Step 3-5**: Contentsセクション描画バグ修正（`properties` → `contents`）

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `backend/src/controllers/maimlController.ts` | 修正 | `listFormats` 関数追加 |
| `backend/src/routes/maimlRoutes.ts` | 修正 | `GET /formats` ルート追加 |
| `frontend/src/services/templateApi.ts` | 修正 | 呼び出し先をV2バックエンドAPIに変更、型定義修正 |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | 修正 | useNamespaceOperations接続、解析・取り込み処理差し替え、Contentsバグ修正 |

## 技術的詳細

### バックエンド formats API レスポンス設計

```
GET /api/v1/maiml/formats

レスポンス:
{
  success: true,
  data: {
    departments: [
      {
        departmentCd: "dept_001",
        folders: [
          {
            folderName: "material",    // "material" | "condition" | "result"
            files: [
              {
                key: "formats/dept_001/material/template1.xml",  // S3相対パス（組織IDなし）
                fileName: "template1.xml",
                size: 1024
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### TemplateEditorDialog の useNamespaceOperations 接続方針

- `useNamespaceOperations` フックを呼び出し、`analyzeNamespaceFile` と `replaceTemplateWithNamespace` を取得
- `handleSelectNamespaceFile`: `fetchTemplateContent` + `parseNamespacesFromXml` → `analyzeNamespaceFile(fileKey)` に差し替え
  - ただし `analyzeNamespaceFile` は S3フルキー（組織ID付き）を要求する
  - templateApi から取得した `key` は組織IDなし相対パスのため、`organizationId + "/" + key` に変換してから渡す
- `handleImportNamespace`: マージ方式 → `replaceTemplateWithNamespace()` 全置き換え方式に変更
  - `namespaceImportMode === 'replace_all_properties'` → `replaceTemplateWithNamespace(namespaceData, 'properties', setEditingTemplate)`
  - `namespaceImportMode === 'replace_all_contents'` → `replaceTemplateWithNamespace(namespaceData, 'contents', setEditingTemplate)`
  - `setEditingTemplate` は properties/contents を個別に更新するため、専用のラッパーを実装

### useNamespaceOperations の fetchFileContent の修正

現在 `useNamespaceOperations.ts` の `fetchFileContent` は `/api/s3/file-content` を呼んでいる（古いパス）。
`analyzeNamespaceFile` 経由で `fetchFileContent` が使われるため、呼び出し先を `/api/v1/maiml/file-content` に修正する必要がある。

## 実施記録

- 開始: 2026-03-07 23:04
