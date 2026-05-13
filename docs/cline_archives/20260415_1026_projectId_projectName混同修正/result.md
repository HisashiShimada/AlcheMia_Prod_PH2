# 修正結果レポート: projectId/projectName混同修正

- **作成日時**: 2026-04-15 10:39
- **タスクID**: projectId_projectName混同修正

---

## 1. 概要

`WorkProgressDetailDialog.tsx` にて、APIパスに `projectId`（UUID）ではなく `projectName`（プロジェクト名文字列）を使用すべきところで、`maimlFileKey` から正規表現でプロジェクト名を抽出していた問題を発端として、同様のパターンをフロントエンド全体で調査・修正した。

---

## 2. 発見された問題箇所

### 問題パターン A: FileData型にprojectIdが存在しない

`frontend/src/types/progress.ts` の `FileData` 型に `projectId` フィールドがなかったため、ダイアログ側がIDを受け取れず、代替手段（maimlFileKeyからの名前抽出）に頼っていた。

### 問題パターン B: WorkProgressDetailDialog.tsx（主障害箇所）

`maimlFileKey` から正規表現でプロジェクト名を抽出し、`/progress/projects/${projectName}/work-details` のAPIパスに使用していた。プロジェクト名が変更された場合や特殊文字を含む場合に誤動作するリスクがあった。

```typescript
// 修正前（問題あり）
const projectNameMatch = fileData.maimlFileKey.match(/(?:^|\/)projects\/([^/]+)\//);
const projectName = projectNameMatch ? decodeURIComponent(projectNameMatch[1]) : null;
const response = await client.get(`/progress/projects/${encodeURIComponent(projectName)}/work-details`);

// 修正後
const projectId = fileData.projectId;
const response = await client.get(`/progress/projects/${projectId}/work-details`);
```

### 問題パターン C: ProjectManagement.tsx（handleRenameSuccess）

プロジェクト名変更後のファイル一覧再取得で、`newName`（変更後のプロジェクト名）を `getProjectFiles()` の第1引数に渡していた。`getProjectFiles` は `projectId`（UUID）を第1引数に取るため、名前変更直後に古い名前が渡ると404エラーが発生する可能性があった。

```typescript
// 修正前（問題あり）
const fileResponse = await getProjectFiles(newName, true);

// 修正後
const fileResponse = await getProjectFiles(selectedProjectId, true);
```

---

## 3. 修正ファイル一覧

| ファイル | 修正内容 |
|---------|---------|
| `frontend/src/types/progress.ts` | `FileData` 型に `projectId: string` フィールドを追加 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `resolvedFileData` 構築時に `projectId: record.projectId` をセット |
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | maimlFileKeyからの正規表現抽出を廃止し、`fileData.projectId` を直接使用 |
| `frontend/src/components/project/ProjectManagement.tsx` | `handleRenameSuccess` 内で `newName` → `selectedProjectId` に変更 |

---

## 4. ビルドチェック結果

```
(cd frontend && npx tsc --noEmit 2>&1) | head -50
```

今回修正した4ファイルに起因するTypeScriptエラー: **0件**

検出されたエラーはすべて既存テストファイル（`AuthContainer.integration.test.tsx` 等）の無関係な問題であり、本修正とは無関係。

---

## 5. 修正方針まとめ

- **IDとNameの混在を防ぐ**: API呼び出し時のパスパラメータには必ずUUID（projectId）を使用する
- **型定義でIDを明示**: `FileData` 等の中間データ型には `projectId` を含めることで、受け渡し時にIDが失われないようにする
- **名前からの逆引きを避ける**: `maimlFileKey` や文字列からの正規表現抽出でIDを代替することは禁止
