# 一括ファイルアップロードダイアログ UI仕様書

## メタデータ
- **画面名**: 一括ファイルアップロードダイアログ
- **物理名**: BulkUploadDialog.tsx
- **ファイルパス**: `frontend/src/components/project/BulkUploadDialog.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-03-11
- **最終更新日**: 2026-08-20
- **バージョン**: 2.0.0

---

## 1. 概要

### 1.1 コンポーネントの目的
一括ファイルアップロードダイアログは、プロジェクト管理画面から複数のファイルやフォルダを一括でS3にアップロードするためのモーダルダイアログです。単一ファイル・一括ファイル・フォルダの3つのアップロードモードをサポートし、進捗表示・リトライ表示・エラーハンドリングを提供します。

### 1.2 使用場面
- プロジェクト管理画面 → 「アップロード」ボタンクリック時に表示
- モーダル形式で画面中央に表示
- `ProjectManagement` の `uploadDialogOpen` state で制御

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証
- **組織分離**: マルチテナント（organizationId）

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌───────────────────────────────────────────────────┐
│ 一括ファイルアップロード                     [×]  │
├───────────────────────────────────────────────────┤
│                                                   │
│ アップロードタイプ                                │
│ [単一ファイル] [一括ファイル] [フォルダ]         │
│                                                   │
│ ┌───────────────────────────────────────────┐   │
│ │           📦                              │   │
│ │   ファイルをドラッグ&ドロップ             │   │
│ │   または、クリックしてファイルを選択      │   │
│ └───────────────────────────────────────────┘   │
│ （フォルダモード時は「フォルダを選択」ボタン）    │
│                                                   │
│ 選択ファイル (3個)                                │
│ ┌───────────────────────────────────────────┐   │
│ │ file1.maiml              45.2 KB          │   │
│ │ file2.csv                12.8 KB          │   │
│ │ file3.xlsx               128 KB           │   │
│ │ 総サイズ: 186 KB                          │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ ─────────────────────────────────────────────    │
│                                                   │
│ アップロード先プロジェクト                        │
│ ┌───────────────────────────────────────────┐   │
│ │ プロジェクトA                             │   │
│ │ パス: projects/プロジェクトA              │   │
│ └───────────────────────────────────────────┘   │
│ ※未選択時は Warning Alert                        │
│                                                   │
│ サブフォルダパス（オプション）                    │
│ [例: data/experiment01                     ]     │
│                                                   │
│ バッチ名（オプション）※一括/フォルダ時のみ表示   │
│ [例: 実験データ2024-01-15                  ]     │
│                                                   │
│ ── 進捗 / 結果 Alert（状態に応じて表示） ──       │
│                                                   │
│                       [閉じる] [追加]             │
└───────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 アップロードタイプセグメント
- `Segmented`（block表示）、アップロード中は `disabled`
- 3つのオプション:
  1. **単一ファイル** (`'single'`, `FileOutlined`)
  2. **一括ファイル** (`'bulk'`, `InboxOutlined`)
  3. **フォルダ** (`'folder'`, `FolderOutlined`)

#### 2.2.2 ファイル選択エリア

**単一ファイル / 一括ファイルモード:**
- `Dragger`（ドラッグ&ドロップエリア）
- アイコン: `InboxOutlined`（`#0093CF`, 48px）
- 許可拡張子: `.maiml, .xml, .json, .txt, .csv, .png, .jpg, .jpeg, .gif, .pdf, .tif, .tiff, .bmp, .svg, .webp`

**フォルダモード:**
- ボタン: `t('upload.selectFolder')`（`FolderOutlined`, block, large）
- 非表示の `<input type="file" webkitdirectory multiple>` で実装

#### 2.2.3 選択ファイル表示エリア（`fileList.length > 0` の場合）
- 背景色: `#f5f5f5`、最大高さ: 200px（スクロール）
- 最大10ファイル表示（超過分は `t('upload.moreFiles', { count })` で省略表示）
- 各ファイル: ファイル名（ellipsis）+ サイズ（右揃え）
- 総サイズ表示（`#E6F7FC` 背景、文字色 `#007AB3`）

#### 2.2.4 アップロード先プロジェクト表示
- `preselectedFolder` が存在する場合に表示
- 背景色: `#E6F7FC`、ボーダー: `1px solid #0093CF`
- プロジェクト名 + `t('upload.pathLabel', { path })`
- **`preselectedFolder` が存在しない場合**: `Alert(warning)` を表示

#### 2.2.5 オプション入力フィールド
- **サブフォルダパス**: `Input`（`preselectedFolder` が存在する場合のみ表示）
  - プレースホルダー: `t('upload.subFolderPlaceholder')`
- **バッチ名**: `Input`（`uploadMode !== 'single' && fileList.length > 0` の場合のみ表示）
  - プレースホルダー: `t('upload.batchNamePlaceholder')`

#### 2.2.6 リトライ中表示（`retryState !== null && isUploading`）
- `Alert(warning)` + `LoadingOutlined`
- 内容: `t('upload.retryingAlert', { count, max })`

#### 2.2.7 アップロード進行状況（`isUploading === true`）
- `Alert(info)` + `LoadingOutlined`
- Alert内にインライン「キャンセル」ボタン（赤色、`handleCancelUpload`）
  - 無効条件: `abortController === null || progress >= 100`
- `Progress（active）` + テキスト（`uploadedCount / totalCount`）

#### 2.2.8 アップロード結果サマリー（`!isUploading && resultSummary !== null`）

| 状態 | Alert種別 | アイコン |
|------|----------|---------|
| 全成功（`failureCount === 0`）| `success` | `CheckCircleOutlined` |
| 全失敗（`successCount === 0`）| `error` | `CloseCircleOutlined` |
| 部分失敗（その他）| `warning` | `WarningOutlined` |

- 失敗時: `List`コンポーネントで `failedFileNames` を表示。`failedFileReasons[name]` がある場合は失敗理由も表示

#### 2.2.9 エラー表示（`uploadState.error !== null`）
- `Alert(error)` + `CloseCircleOutlined`、`closable`

#### 2.2.10 フッターボタン

| ボタン | キー | disabled条件 |
|--------|-----|------------|
| 閉じる（`t('common.close')`）| `"close"` | `isUploading === true` |
| 追加（通常: `t('common.add')` / アップロード中: `t('common.loading')`）| `"upload"` | `fileList.length === 0 \|\| isUploading` |
- 追加ボタンアイコン: アップロード中は `LoadingOutlined`、通常は `UploadOutlined`

---

## 3. 機能仕様

### 3.1 アップロードモード

| mode | 説明 | バッチ名自動生成 |
|------|------|--------------|
| `'single'` | 1ファイルのみ（自動で最後の1件に絞る）| `t('upload.batchNameSingle', { name })` |
| `'bulk'` | 複数ファイル | `t('upload.batchNameBulk', { count })` |
| `'folder'` | webkitdirectory でフォルダ選択 | `t('upload.batchNameFolder', { name })` |

### 3.2 複数MAIMLファイルチェック

ファイル選択・フォルダ選択の両方で実施。
`.maiml` ファイルが2件以上選択された場合:
1. `t('upload.maimlSingleFileWarning')` の warning を表示
2. `.maiml` 以外のファイル + 最後の `.maiml` ファイル1件のみ保持

### 3.3 アップロード先パス構築

```typescript
const getTargetPath = () => {
  const basePath = `projects/${preselectedFolder}`;
  const cleanSubFolder = subFolderPath.trim().replace(/^\/+|\/+$/g, '');
  return cleanSubFolder ? `${basePath}/${cleanSubFolder}` : basePath;
};
```

### 3.4 アップロード実行（`handleUpload`）

```
1. バリデーション（ファイル未選択 / プロジェクト未選択）
2. AbortController 作成
3. uploadState を isUploading: true で初期化
4. initBatch() でバッチID先行取得（失敗しても続行）
5. uploadFiles() でアップロード実行
   - onProgress: 進捗更新 + retryState クリア
   - onRetry: リトライ状態を表示
   - onSessionInit: activeUploadIdsRef に uploadId 追加
6. resultSummary をセット
7. onUploadComplete() コールバック呼び出し
8. 成功/部分失敗/全失敗に応じて message 表示
```

**エラーハンドリング分岐:**
- `CanceledError`: キャンセルとして処理（`cancelBatch` 呼び出し、`isUploading: false`）
- `MAIML_VALIDATION_ERROR`: `Modal.error` でエラー詳細一覧を表示（ファイル名・エラー種別・提案）
- その他: `extractErrorMessage` でメッセージ抽出、`Alert(error)` 表示

### 3.5 MAIMLバリデーションエラーダイアログ

アップロード中に `.maiml` ファイルがバリデーションエラーになった場合:
- `Modal.error` を表示（width: 640）
- タイトル: `t('upload.maimlValidationErrorTitle', { fileName })`
- 内容: エラー数テキスト + エラー一覧（`type`, `message`, `suggestion`）
- エラー項目スタイル: `#fff2f0` 背景、`#ffccc7` ボーダー

### 3.6 キャンセル処理

**2つの経路:**

1. **インライン「キャンセル」ボタン（`handleCancelUpload`）**: アップロード進行中の Alert 内
   - `Modal.confirm` を表示（確認後）
   - `abortControllerRef.current?.abort()` → `activeUploadIdsRef` 全件 `abortChunkUpload()` → `cancelBatch()`

2. **フッター「閉じる」ボタン / ×ボタン（`handleClose`）**:
   - `isUploading === true` の場合: `Modal.confirm` で確認後に abort + cancel + `onClose()`
   - `isUploading === false` の場合: `onClose()` を即時呼び出し

> フッター「閉じる」ボタンは `isUploading === true` の間は `disabled`

### 3.7 ダイアログ開閉時のリセット

`useEffect([open])` でダイアログが開くたびに全 state をリセット:
- `fileList`, `subFolderPath`, `batchName`, `uploadState`, `retryState`, `resultSummary`
- `abortController`, `batchId`
- `activeUploadIdsRef.current = []`, `batchIdRef.current = null`, `abortControllerRef.current = null`

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete?: (result: {
    mode: UploadMode;
    fileCount: number;
    success: boolean;
    hasMaimlFile?: boolean;
  }) => void;
  preselectedFolder?: string;
  projectId: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| `open` | `boolean` | ✅ | ダイアログの表示状態 |
| `onClose` | `() => void` | ✅ | 閉じるハンドラ |
| `onUploadComplete` | `(result) => void` | - | アップロード完了時のコールバック |
| `preselectedFolder` | `string` | - | 事前選択されたプロジェクトフォルダ名（デフォルト: `''`）|
| `projectId` | `string` | ✅ | プロジェクトID |

### 4.2 State定義

| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| `uploadMode` | `'single' \| 'bulk' \| 'folder'` | `'single'` | アップロードモード |
| `fileList` | `UploadFile[]` | `[]` | 選択されたファイル一覧 |
| `subFolderPath` | `string` | `''` | サブフォルダパス |
| `batchName` | `string` | `''` | バッチ名 |
| `uploadState` | `UploadState` | 初期状態 | アップロード進行状況 |
| `retryState` | `UploadRetryState \| null` | `null` | リトライ状態（null = リトライなし）|
| `abortController` | `AbortController \| null` | `null` | アップロードキャンセル用 |
| `batchId` | `string \| null` | `null` | バッチID（キャンセル時のサーバー側削除に使用）|
| `resultSummary` | `UploadResultSummary \| null` | `null` | アップロード結果サマリー（null = 未完了）|

### 4.3 Ref定義

| Ref名 | 型 | 説明 |
|-------|---|------|
| `folderInputRef` | `HTMLInputElement` | フォルダ選択用 input 要素 |
| `activeUploadIdsRef` | `string[]` | チャンクアップロード中のセッションID |
| `batchIdRef` | `string \| null` | batchId（stale closure 対策）|
| `abortControllerRef` | `AbortController \| null` | abortController（stale closure 対策）|

### 4.4 型定義

```typescript
interface UploadState {
  isUploading: boolean;
  progress: number;      // 0-100
  uploadedCount: number;
  totalCount: number;
  error: string | null;
}

// UploadRetryState: @/types/file
interface UploadResultSummary {
  successCount: number;
  failureCount: number;
  failedFileNames: string[];
  failedFileReasons?: Record<string, string>;
}
```

---

## 5. API連携

### 5.1 使用するAPI

| # | 関数名 | メソッド | エンドポイント | 説明 |
|---|--------|---------|--------------|------|
| 1 | `initBatch` | POST | `/api/v1/files/batches/init` | バッチ先行作成 |
| 2 | `uploadFiles` | POST | `/api/v1/files/upload` | ファイル一括アップロード |
| 3 | `abortChunkUpload` | POST | `/api/v1/files/upload/chunk/:uploadId/abort` | チャンクセッション中断 |
| 4 | `cancelBatch` | POST | `/api/v1/files/batches/:batchId/cancel` | バッチキャンセル |

### 5.2 uploadFiles のオプション

```typescript
uploadFiles({
  uploadMode,
  targetPath,
  files,
  metadata: { projectId, batchName, batchId },
  signal,           // AbortController.signal
  onProgress,       // (progress: { percentage, uploadedCount }) => void
  onRetry,          // (state: UploadRetryState) => void
  onSessionInit,    // (uploadId: string) => void
})
```

### 5.3 レスポンス

```typescript
{
  batchId?: string;
  hasMaimlFile?: boolean;
  summary: { successfulFiles: number; failedFiles: number };
  failedFileNames: string[];
  failedFileReasons?: Record<string, string>;
}
```

---

## 6. エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| ファイル未選択 | `message.warning(t('upload.noFileSelected'))` |
| プロジェクト未選択 | `message.error(t('upload.noProjectSelected'))` + Alert(warning) |
| キャンセル（`CanceledError`）| `message.info(t('upload.cancelled'))`, `cancelBatch()` 呼び出し |
| MAIMLバリデーションエラー（`MAIML_VALIDATION_ERROR`）| `Modal.error` でエラー一覧を表示 |
| その他のアップロードエラー | `Alert(error)` + `message.error` |
| バッチ先行作成失敗 | `console.warn` のみ（処理は続行）|
| バッチキャンセル失敗 | `console.error` のみ |

---

## 7. 実装ファイル

### 7.1 メインファイル
- **パス**: `frontend/src/components/project/BulkUploadDialog.tsx`
- **行数**: 939行
- **エクスポート**: `BulkUploadDialog`（default export）

### 7.2 依存サービス・ユーティリティ
- `@/services/fileAccessService` - `uploadFiles`, `abortChunkUpload`, `cancelBatch`, `initBatch`
- `@/utils/errorUtils` - `extractErrorMessage`
- `@/contexts/LanguageContext` - `useLanguage`

### 7.3 依存型定義
- `@/types/file` - `UploadRetryState`, `UploadResultSummary`
- `@/types/project` - `UploadMode`, `UploadState`

### 7.4 Ant Design コンポーネント
- `Modal`, `Segmented`, `Upload(Dragger)`, `Button`, `Input`, `Alert`, `Progress`, `Space`, `Typography`, `Divider`, `List`, `App`

### 7.5 アイコン（@ant-design/icons）
- `UploadOutlined`, `InboxOutlined`, `FolderOutlined`, `FileOutlined`
- `CheckCircleOutlined`, `CloseCircleOutlined`, `LoadingOutlined`, `WarningOutlined`

---

## 8. 補足事項

### 8.1 許可ファイル拡張子
```
.maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf,.tif,.tiff,.bmp,.svg,.webp
```

### 8.2 ファイルサイズフォーマット
```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

### 8.3 モーダル設定
- `width`: 800
- `body.maxHeight`: 70vh、`overflowY`: auto
- `onCancel`: `handleClose`

### 8.4 stale closure 対策
`Modal.confirm` の `onOk` 内では state が古い値を参照するため、`abortController` と `batchId` は state と並行して Ref でも最新値を保持する（`abortControllerRef`, `batchIdRef`）。

### 8.5 フォルダアップロードの仕組み
- HTML5 の `webkitdirectory` 属性を使用
- `webkitRelativePath` でフォルダ階層を取得
- フォルダモードかつパスに `/` を含む場合、`new File([originFile], f.name)` で名前にパスを含む新しい File を作成してバックエンドに送信

### 8.6 バッチID の先行取得
アップロード開始前に `initBatch()` でバッチIDを取得することで、ファイル送信前（大容量ファイルのチャンクアップロード中）でもキャンセル操作でサーバー側のデータを削除できる。

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 2.0.0 | 2026-08-20 | 実装ベースで全面改訂（MAIMLバリデーションエラーダイアログ追加・複数MAIMLファイルチェック追加・リトライ表示追加・部分失敗パターン追加・失敗ファイル詳細表示追加・stale closure 対策追記）|
| 1.1.0 | 2026-04-14 | アップロード中断処理修正（フッター「閉じる」ボタン化・インラインキャンセルボタン確認ダイアログ追加・batchId先行取得）|
| 1.0.1 | 2026-04-01 | `onUploadComplete` の `result` に `hasMaimlFile?: boolean` を追加 |
| 1.0.0 | 2026-03-11 | 初版作成 |
