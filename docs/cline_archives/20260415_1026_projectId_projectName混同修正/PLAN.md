# タスク計画書: projectId/projectName混同修正

## メタデータ
- **作成日時**: 2026-04-15 10:26
- **タスクID**: fix-projectid-projectname-mismatch
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

バックエンドAPIのルートが `:projectId`（UUID）を期待しているにもかかわらず、フロントエンドでプロジェクト「名」を渡している箇所が2件確認された。これを修正する。

## 問題箇所

### 問題1: `WorkProgressDetailDialog.tsx`（指摘済み）

**ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`  
**行**: ~99〜117  
**内容**: `maimlFileKey`からプロジェクト名を正規表現で抽出し、`/progress/projects/:projectId/work-details` に渡している。

```typescript
// 現状（問題あり）
const projectNameMatch = fileData.maimlFileKey.match(/(?:^|\/)projects\/([^/]+)\//);
const projectName = projectNameMatch ? decodeURIComponent(projectNameMatch[1]) : null;
// ...
`/progress/projects/${encodeURIComponent(projectName)}/work-details`
```

**修正方針**: `fileData` に `projectId`（UUID）が含まれているか確認し、
含まれていれば直接使用する。含まれていない場合はpropsでprojectIdを受け取るよう変更する。

---

### 問題2: `ProjectManagement.tsx` L1400

**ファイル**: `frontend/src/components/project/ProjectManagement.tsx`  
**行**: 1400  
**内容**: リネーム成功コールバックで、新しいプロジェクト「名」を`getProjectFiles()`に渡している。

```typescript
// 現状（問題あり）
const handleRenameSuccess = useCallback(async (newName: string) => {
  // ...
  const fileResponse = await getProjectFiles(newName, true);  // ← nameを渡している
```

**修正方針**: `selectedProjectId`（UUID）を渡すよう変更する。

```typescript
// 修正後
const fileResponse = await getProjectFiles(selectedProjectId, true);
```

## 実装ステップ

### Phase 1: WorkProgressDetailDialog.tsx の修正
- [ ] `fileData` の型定義を確認し、`projectId`（UUID）フィールドの有無を調べる
- [ ] `projectId` が取得可能であれば、正規表現によるプロジェクト名抽出をやめてUUIDを使用する
- [ ] `projectId` が取得できない場合は、呼び出し元からpropsで受け取るよう変更する
- [ ] 修正後、ビルドエラーがないことを確認する

### Phase 2: ProjectManagement.tsx の修正
- [ ] `handleRenameSuccess` 内の `getProjectFiles(newName, true)` を `getProjectFiles(selectedProjectId, true)` に変更する（1行修正）
- [ ] `selectedProjectId` が `null` になりうるケースのガード処理が既にあることを確認（L1397の `if (selectedProjectId && ...)` で担保済み）

## 変更ファイル
1. `frontend/src/components/progress/WorkProgressDetailDialog.tsx` - projectName→projectId修正
2. `frontend/src/components/project/ProjectManagement.tsx` - L1400のgetProjectFiles引数修正

## リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| WorkProgressDetailDialogのfileDataにprojectIdが存在しない場合 | 中 | 呼び出し元コンポーネントを確認して対応 |
| 修正後にAPIエラーが発生する場合 | 中 | 手動テストで確認 |

## テスト計画
- [ ] ProjectManagement画面でプロジェクトをリネーム後、ファイル一覧が正常に表示されることを確認
- [ ] WorkProgressDetailDialogが正常に作業詳細を表示することを確認

## 承認記録
- **計画書提示日時**: 2026-04-15 10:26
- **承認日時**: 
- **承認者コメント**: 
