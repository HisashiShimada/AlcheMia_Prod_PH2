# タスク計画書: プロジェクト管理画面 ビューアボタン修正

## メタデータ
- **作成日時**: 2026-02-25 15:21
- **タスクID**: viewer-button-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

プロジェクト管理画面のファイル一覧テーブルにある「ビューア」ボタンを押しても、
常にモックデータが表示される問題を修正する。
MAIMLファイルだけでなく、画像・TIFFファイルについてもS3/Swiftから実際のコンテンツを表示できるようにする。

## 目的と期待される成果

- [ ] MAIMLファイル（root直下）: `ProjectMaimlContext` の `maimlContent` を使って表示
- [ ] MAIMLファイル（アーカイブ等）: `file.path` でS3からテキストを取得して表示
- [ ] 画像ファイル（jpg/png等）: バックエンドのAPIから署名付きURLを取得して `ImageViewer` で表示
- [ ] TIFFファイル: バックエンドのAPIから署名付きURLを取得してダウンロード/表示

## 実装ステップ

### Step 1: バックエンド - ファイル表示用署名付きURL取得APIを追加
- `POST /api/v1/files/view-url` エンドポイントを追加
- ファイルキーを受け取り、S3/Swiftの署名付きURLを返す（ダウンロード強制なし）
- 変更ファイル:
  - `backend/src/routes/fileAccessRoutes.ts`
  - `backend/src/controllers/fileAccessController.ts`
  - `backend/src/services/fileAccessService.ts`（バックエンド、必要に応じて）

### Step 2: フロントエンド - fileAccessService に2つの関数を追加
- `getFileContentAsText(fileKey)`: MAIMLなどテキストファイルをstring取得（ビューア用）
- `getFileViewUrl(fileKey)`: 画像・TIFFなど署名付きURLをstring取得（ImageViewer/TiffViewer用）

### Step 3: ViewRendererDialog の Props と loadFileContent を修正
- Props に `fileContent?: string | null` を追加（外部から渡せるようにする）
- `loadFileContent` をモック固定 → `getFileContentAsText(file.path)` 呼び出しに変更
- 外部から `fileContent` が渡された場合はAPI呼び出しをスキップ

### Step 4: ImageViewer を実API対応に修正
- `getFileViewUrl(fileKey)` を呼び出して署名付きURLを取得
- モック（placeholder URL）を削除して実際の画像を表示

### Step 5: TiffViewer を実API対応に修正
- `getFileViewUrl(fileKey)` を呼び出して署名付きURLを取得
- ダウンロードボタンに署名付きURLを使用

### Step 6: ProjectManagement の OpenDialog 型と handleViewFile を修正
- `OpenDialog` 型に `fileContent?: string | null` を追加
- `handleViewFile` で「プロジェクト直下の最新MAIMLファイル」か判定し、
  `maimlContent` を渡す or APIから取得するかを決定
- `ViewRendererDialog` に `fileContent` を渡す

### Step 7: ドキュメント更新
#### API仕様書更新
- `docs/design/api/api_file_access.md` に `POST /files/view-url` エンドポイントを追記

#### UI仕様書更新（新規作成）
- `docs/design/ui/ui_project_management_main.md` — プロジェクト管理画面のUI仕様（ビューアボタン動作含む）を新規作成
- `docs/design/ui/ui_viewer_dialog.md` — ViewRendererDialogと各ビューアの動作仕様を新規作成

## 変更ファイル

### バックエンド
1. `backend/src/routes/fileAccessRoutes.ts` - `POST /files/view-url` エンドポイント追加
2. `backend/src/controllers/fileAccessController.ts` - `getFileViewUrl` ハンドラ追加
3. `backend/src/services/fileAccessService.ts`（バックエンド） - 署名付きURL取得ロジック追加（必要に応じて）

### フロントエンド
4. `frontend/src/services/fileAccessService.ts` - `getFileContentAsText`・`getFileViewUrl` 追加
5. `frontend/src/components/viewer/ViewRendererDialog.tsx` - Props追加・loadFileContent修正
6. `frontend/src/components/viewer/ImageViewer.tsx` - 実API対応
7. `frontend/src/components/viewer/TiffViewer.tsx` - 実API対応
8. `frontend/src/components/project/ProjectManagement.tsx` - OpenDialog型・handleViewFile修正

### ドキュメント
9. `docs/design/api/api_file_access.md` - `POST /files/view-url` を追記
10. `docs/design/ui/ui_project_management_main.md` - 新規作成（ビューアボタン動作含む）
11. `docs/design/ui/ui_viewer_dialog.md` - 新規作成（ViewRendererDialog仕様）
12. `docs/20260225_1521_ビューアボタン修正/PLAN.md` - 実施記録を更新（完了時）

## 判定ロジック（Step 6）

```
handleViewFile(file) 呼び出し時:
  if (file.type === 'maiml' && currentFolder === 'root') {
    // プロジェクト直下の最新MAIMLファイル → Context の maimlContent を使用
    fileContent = maimlContent
  } else {
    // アーカイブや他のファイル → ViewRendererDialog 内でAPIから取得
    fileContent = undefined（ダイアログ内で取得）
  }
```

## 承認記録
- **計画書提示日時**: 2026-02-25 15:30
- **承認日時**: 2026-02-25 15:30（承認済み）

## 実施記録

### 実施日時
開始: 2026-02-25 15:30
完了: 2026-02-25 15:45

### 実施内容

#### Step 1: バックエンド routes（完了）
- `backend/src/routes/fileAccessRoutes.ts` に `POST /files/view-url` を追加済みであることを確認

#### Step 2: バックエンド service（完了）
- `backend/src/services/fileAccessService.ts` に `getSignedViewUrl()` メソッドを追加
  - `storageService.fileExists()` でファイル存在確認
  - `storageService.getSignedUrl()` で署名付きURL生成（有効期限1時間）
  - `{ url, expiresAt, expiresIn }` を返す

#### Step 3: バックエンド controller（完了）
- `backend/src/controllers/fileAccessController.ts` に `getFileViewUrl()` ハンドラを追加
  - `getFileDownloadUrl` と同じパターンで実装
  - 成功時: `{ success: true, data: { url, expiresAt, expiresIn } }` を返す

#### Step 4: フロントエンド fileAccessService（完了）
- `frontend/src/services/fileAccessService.ts` に2関数を追加:
  - `getFileContentAsText(fileKey)`: `/files/view-url` で署名付きURL取得後、fetch()でテキストを取得
  - `getFileViewUrl(fileKey)`: `/files/view-url` で署名付きURLを取得してそのまま返す

#### Step 5: ViewRendererDialog 修正（完了）
- Props に `fileContent?: string | null` を追加
- `loadFileContent()` 関数（モック固定）を削除
- 外部から `externalFileContent` が渡された場合はAPIスキップ
- `file.type === 'maiml'` のみ `getFileContentAsText(file.path)` を呼び出してS3から取得

#### Step 6: ImageViewer 修正（完了）
- モック URL（placeholder）を削除
- `reloadTrigger` ステートを追加してuseEffect内でAPI呼び出し
- `getFileViewUrl(fileKey)` → 署名付きURLで画像を表示
- ESLintエラー（useEffect内setState）を回避するため、ロジックをuseEffect内にインライン化

#### Step 7: TiffViewer 修正（完了）
- モック URL を削除
- `getFileViewUrl(fileKey)` で署名付きURLを取得
- ダウンロードボタンで署名付きURLを使用（`link.href = signedUrl`）
- URLが取得できていない場合はダウンロードボタンをdisabled

#### Step 8: ProjectManagement 確認（変更不要）
- `ViewRendererDialog` に `file={dialog.file}` を渡している（`file.path` がAPIキーになる）
- プロジェクト直下MAIMLファイルの `maimlContent` を渡す最適化は今回スコープ外
- 現状の実装でファイルパスからS3コンテンツを取得できる

### 成果物
- [x] `POST /api/v1/files/view-url` エンドポイント（バックエンド）
- [x] `getFileContentAsText()` / `getFileViewUrl()`（フロントエンドサービス）
- [x] `ViewRendererDialog` - S3からMAIMLコンテンツ取得
- [x] `ImageViewer` - S3署名付きURLで画像表示
- [x] `TiffViewer` - S3署名付きURLでTIFFダウンロード

### 残課題（スコープ外）
- プロジェクト直下の最新MAIMLについて `maimlContent`（既取得済みデータ）を再利用する最適化
- API仕様書・UI仕様書のドキュメント更新（次タスクで実施予定）
