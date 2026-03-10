# タスク計画書: maimlFileKey ハードコード廃止

## メタデータ
- **作成日時**: 2026-03-09 11:07
- **タスクID**: maiml_file_key_動的取得
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

`ProgressMonitoring.tsx` の `handleViewDetails()` 内で以下のようにハードコードされている `maimlFileKey` を、APIから取得した実際の値に置き換える。

**現状（問題のあるコード）:**
```typescript
const handleViewDetails = (record: ProgressRecord) => {
  setSelectedProject(record);
  // test_omori11.maimlを使用（mock環境）
  const dummyFileData: FileData = {
    maimlFileKey: `org_001/projects/${record.projectId}/test_omori11.maiml`,
    fileName: `test_omori11.maiml`,
  };
  setFileData(dummyFileData);
  setIsDetailDialogOpen(true);
};
```

**問題点:**
- `org_001` という固定の organizationId
- `test_omori11.maiml` という固定のファイル名
- 実際のS3パス（`maimlFileKey`）が取得できていない

---

## 2. 目的と期待される成果

### 目的
プロジェクトの詳細ボタン押下時に、実際にAPIからそのプロジェクトのMAIMLファイルキーを取得して、`WorkProgressDetailDialog` に正確な情報を渡す。

### 期待される成果
- [x] 詳細ボタン押下時に `GET /api/v1/projects/:projectName/files` が呼び出される
- [x] APIレスポンスから現行MAIMLファイル（archive外）の `maimlFileKey` と `fileName` が抽出される
- [x] `org_001` `test_omori11.maiml` のハードコードが削除される
- [x] ファイル取得中にローディング状態が表示される
- [x] ファイルが見つからない場合にエラーメッセージが表示される

---

## 3. 実装ステップ

### Phase 1: `apiClient.ts` に実APIコール関数を追加
- [x] 既存の `fetchProjectFiles`（モック使用）とは別に `fetchProjectFilesReal` 関数を追加
  - エンドポイント: `GET /api/v1/projects/:projectName/files`
  - credentials: `include`（Cookie認証）
  - 戻り値: `ApiResponse<{ files: ProjectFile[]; archiveFiles: ProjectFile[] }>`

### Phase 2: `ProgressMonitoring.tsx` の `handleViewDetails` を修正
- [x] `handleViewDetails` を非同期関数（`async`）に変更
- [x] ダイアログ表示前にAPIコールを実行（`fetchProjectFilesReal`）
- [x] APIレスポンスの `files`（archiveではなく現行ファイル）から `.maiml` 拡張子のファイルを取得
- [x] 取得したファイルの `path`（S3キー）を `maimlFileKey`、`name` を `fileName` に設定
- [x] ハードコードの `dummyFileData` を削除

### Phase 3: ローディング状態の追加
- [x] `loadingProjectId` という State を追加（`string | null`、初期値 `null`）
- [x] `handleViewDetails` 実行中は `loadingProjectId = record.projectId` にセット
- [x] 処理完了（成功/失敗とも）後に `loadingProjectId = null` にリセット
- [x] 詳細ボタンに `loading` プロパティを設定（クリックした行のみローディング表示）

### Phase 4: エラーハンドリングの追加
- [x] APIコール失敗時は `message.error(...)` でエラーを表示（`ApiErrorResponse` ナローイング対応）
- [x] `files` 配列が空の場合（MAIMLファイルが存在しない）もエラーメッセージを表示
- [x] エラー時はダイアログを開かない（現状維持）

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/utils/apiClient.ts` - `fetchProjectFilesReal` 関数を追加
2. `frontend/src/components/progress/ProgressMonitoring.tsx` - `handleViewDetails` の修正・非同期化、ローディング状態追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 進捗確認タブの「詳細」ボタン押下処理
- `WorkProgressDetailDialog` に渡す `fileData`（正確な値が渡るようになる）

---

## 5. 技術的詳細

### 使用する既存API
- `GET /api/v1/projects/:projectName/files`
  - Route定義: `backend/src/routes/projectRoutes.ts`（既実装）
  - Controller: `projectController.getProjectFiles`（既実装）
  - レスポンス: `{ success: true, data: { files: ProjectFile[], archiveFiles: ProjectFile[] } }`

### `ProjectFile.path` と `maimlFileKey` の対応
バックエンドの `getProjectFiles` は S3 の `{organization_id}/projects/{projectName}/{projectName}.maiml` というパスを返す。このパスが `ProjectFile.path` に格納されており、これがそのまま `maimlFileKey` として使用可能。

### 主要ロジック（`handleViewDetails` 修正後のイメージ）
```typescript
const handleViewDetails = async (record: ProgressRecord) => {
  setSelectedProject(record);
  setIsDetailLoading(true);
  try {
    // プロジェクトのファイル一覧をAPIから取得
    const filesResponse = await fetchProjectFilesReal(record.projectName);
    const mainFiles = filesResponse.data?.files ?? [];
    
    // .maiml ファイルを探す（archiveではなく現行ファイルから）
    const maimlFile = mainFiles.find(f => f.name.endsWith('.maiml'));
    
    if (!maimlFile) {
      message.error('MAIMLファイルが見つかりません');
      return;
    }
    
    const fileData: FileData = {
      maimlFileKey: maimlFile.path,  // 実際のS3キー
      fileName: maimlFile.name,
    };
    setFileData(fileData);
    setIsDetailDialogOpen(true);
  } catch (error) {
    message.error('ファイル情報の取得に失敗しました');
  } finally {
    setIsDetailLoading(false);
  }
};
```

### 型情報
- `ProjectFile.path`: S3キー（例: `{org_id}/projects/{projectName}/{projectName}.maiml`）
- `ProjectFile.name`: ファイル名（例: `sample_project.maiml`）
- `FileData.maimlFileKey`: S3キー（`ProjectFile.path` をそのまま使用）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `ProjectFile.path` ではなく別フィールドがS3キーに対応している | 中 | 低 | `getProjectFiles` の実装を再確認して正しいフィールドを特定する |
| プロジェクトにMAIMLファイルが存在しない場合 | 低 | 低 | エラーメッセージを表示してダイアログを開かない処理を実装 |
| `files` の型定義が実際のAPIレスポンスと異なる | 中 | 低 | `fetchProjectFilesReal` の戻り値型を実際のレスポンスに合わせる |

---

## 7. テスト計画

### 手動テスト
- [ ] 進捗確認タブを開き、プロジェクト一覧が表示されることを確認
- [ ] 詳細ボタンをクリックした際にローディングスピナーが表示されることを確認
- [ ] ローディング完了後に `WorkProgressDetailDialog` が正しく開くことを確認
- [ ] ブラウザの開発者ツールで `GET /api/v1/projects/:projectName/files` が呼び出されることを確認
- [ ] `maimlFileKey` がハードコードではなく実際のS3パスになっていることをコンソールログで確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-09 11:07
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）
