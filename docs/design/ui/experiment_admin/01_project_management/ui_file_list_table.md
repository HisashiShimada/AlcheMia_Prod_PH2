# ファイル一覧テーブル UI仕様書

## メタデータ
- **画面名**: ファイル一覧テーブル
- **物理名**: FileListTable.tsx
- **ファイルパス**: `frontend/src/components/project/FileListTable.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-01-21
- **最終更新日**: 2026-08-20
- **バージョン**: 3.0.0

---

## 1. 概要

### 1.1 コンポーネントの目的
ファイル一覧テーブルは、プロジェクト管理画面の「ファイル管理」タブ内に表示され、選択したプロジェクトのファイル・フォルダ一覧をテーブル形式で表示するコンポーネントです。ファイルのダウンロード・ビューア表示・名前変更・削除、フォルダナビゲーション・削除機能を提供します。

### 1.2 使用場面
- プロジェクト管理画面 → 「ファイル管理」タブ選択時
- プロジェクト選択後に表示
- rootフォルダ、またはサブフォルダ（archive / rawdata など任意の階層）の内容を表示

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証
- **組織分離**: マルチテナント（organizationId）

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────────────────┐
│ テーブルヘッダー                                                      │
│ [種別] [ファイル名] [サイズ] [更新日時] [操作(280px)]               │
├─────────────────────────────────────────────────────────────────────┤
│ [📁] archive (5)                              [削除]                │
├─────────────────────────────────────────────────────────────────────┤
│ [📄] project-001.maiml ⚠ │ 45.2KB │ 2時間前 │ [⋯] [DL] [ビューア]│
├─────────────────────────────────────────────────────────────────────┤
│ [📄] result.csv           │ 12.8KB │ 1日前   │ [⋯] [DL] [ビューア]│
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 テーブルカラム

**1. 種別（type）**
- 幅: 50px、中央揃え
- 表示: ファイル/フォルダタイプに応じたアイコン（下記参照）

**2. ファイル名（name）**
- ソート可能（日本語対応: `localeCompare('ja')`）
- フォルダの場合: 太字 + オレンジ色 + ファイル数表示（例: `archive (5)`）
- フォルダ名がフルパス（`rawdata/sub/`）の場合: 末尾スラッシュを除いた最後セグメントのみ表示
- MAIMLファイルの場合: バリデーション警告アイコン（`WarningOutlined`）を右横に表示
- ツールチップ: `record.path`（ファイルパス）

**3. サイズ（size）**
- 幅: 120px、ソート可能
- フォルダの場合: 非表示
- フォーマット: `formatFileSize()`（KB/MB/GB単位）

**4. 更新日時（lastModified）**
- 幅: 150px、ソート可能
- フォルダの場合: 非表示
- フォーマット: `formatRelativeTime()`（相対時刻）

**5. 操作（actions）**
- 幅: 280px、中央揃え
- **フォルダ行**: 削除ボタンのみ（`onDeleteFolder` が渡されている場合）
- **ファイル行**: `[⋯]`（Dropdownメニュー）+ ダウンロード + ビューア

#### 2.2.2 ファイルタイプアイコン

| ファイルタイプ | アイコン | 色 |
|--------------|---------|-----|
| フォルダ | `FolderOpenOutlined` | オレンジ（`token.colorWarning`）|
| MAIML（.maiml）| `FileTextOutlined` | 青（`token.colorInfo`）|
| PDF（.pdf）| `FileTextOutlined` | 赤（`token.colorError`）|
| Excel（.xlsx）| `TableOutlined` | 緑（`token.colorSuccess`）|
| CSV（.csv）| `TableOutlined` | グレー（`token.colorTextSecondary`）|
| アーカイブ | `FolderOpenOutlined` | オレンジ（`token.colorWarning`）|
| その他 | `FileOutlined` | グレー（`token.colorTextSecondary`）|

#### 2.2.3 操作ボタン（ファイル行）

**Dropdownメニューボタン（`MoreOutlined`）**:
- `data-testid="file-more-menu-button"`
- クリックでドロップダウンメニューを表示
- メニュー項目:
  1. **名前の変更**（`EditOutlined`, `data-testid="file-menu-rename"`）: リネームモーダルを開く
  2. **区切り線**
  3. **削除**（`DeleteOutlined`, danger, `data-testid="file-menu-delete"`）: `onDeleteFile` を呼び出し
- 名前変更・削除の disabled 条件: `!isEditable || isProjectCompleted || isCheckoutLocked`

**ダウンロードボタン**:
- アイコン: `DownloadOutlined`, サイズ: small
- `data-testid="file-download-button"`
- ローディング: ダウンロード中は spinner表示
- disabled: `downloadingFileId !== null`（他ファイルダウンロード中）

**ビューアボタン**:
- アイコン: `EyeOutlined`, サイズ: small, タイプ: primary
- 背景色: `token.colorSuccess`
- `data-testid="file-viewer-button"`

#### 2.2.4 フォルダ行の操作ボタン

- **削除ボタン**（`DeleteOutlined`, danger, small）
- `data-testid="folder-delete-button"`
- disabled 条件: `!isEditable || isProjectCompleted || isCheckoutLocked`
- `onDeleteFolder` が `undefined` の場合は非表示

#### 2.2.5 Empty状態
```typescript
locale={{
  emptyText: <Empty description={t('projectManagement.fileManagement.emptyState')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
}}
```

---

## 3. 機能仕様

### 3.1 ファイル一覧表示

```typescript
<Table
  dataSource={files}
  columns={columns}
  rowKey="id"
  size="small"
  pagination={false}
/>
```

- `files`: 親コンポーネント（ProjectManagement）から渡されるファイル一覧
- rootフォルダ: プロジェクト直下のファイル + archiveフォルダ（存在する場合）
- サブフォルダ: フォルダ内のファイル + 「↑ 戻る」疑似エントリ

### 3.2 ファイルダウンロード

```typescript
const handleDownloadFile = async (file: ProjectFile) => {
  setDownloadingFileId(file.id);
  if (!file.path || file.path.trim() === '') throw new Error(...);
  await getFileDownloadUrlByKey(file.path);
  message.success(t('...').replace('{{fileName}}', file.name));
  // finally: setDownloadingFileId(null)
};
```

バックエンド経由（プロキシ方式）でファイルをダウンロード。S3署名付きURLは内部で生成。

### 3.3 ビューア表示

ビューアボタンクリック → `onViewFile?.(record)` を呼び出し → 親コンポーネントで `ViewRendererDialog` を開く。

### 3.4 フォルダクリック（ナビゲーション）

- フォルダ行クリック → `onFolderClick?.(record.id)` を呼び出し
- `id === 'back'` の疑似エントリ → rootフォルダに戻る

### 3.5 ファイル名変更（リネーム）

#### 3.5.1 処理フロー
1. Dropdown「名前の変更」クリック → `handleOpenRenameModal(file)` → `renameModalOpen = true`
2. モーダルに拡張子を除いたベース名をデフォルト値としてセット
3. 「保存」クリック → `handleRenameConfirm()` → `renameFile({ fileKey, newFileName })` API呼び出し
4. 成功: `message.success`, `onRenameFile?.()` でファイル一覧を再取得
5. 失敗: `message.error`

#### 3.5.2 リネームモーダル仕様
- タイトル: `t('file.renameModalTitle')`
- 入力フィールド: ベース名のみ（拡張子は `addonAfter` で固定表示）
- バリデーション: 必須 / 空白不可 / 最大255文字
- `Enter` キーでも確定可能
- `destroyOnHidden`: true

### 3.6 ファイル削除

Dropdown「削除」クリック → `onDeleteFile?.(record)` → 親コンポーネントで確認ダイアログ表示 → 削除実行。

### 3.7 フォルダ削除

削除ボタンクリック → `onDeleteFolder?.(record)` → 親コンポーネントで確認ダイアログ表示 → 削除実行。

### 3.8 MAIMLバリデーション警告アイコン

`record.type === 'maiml'` かつ `maimlValidationRow` が存在する場合:

| 条件 | アイコン | 色 | Tooltip |
|------|---------|---|---------|
| `errors.length > 0` | `WarningOutlined` | 🔴 `colorError` | `t('file.validationErrors') (N)` |
| `warnings.length > 0`（エラーなし）| `WarningOutlined` | 🟡 `colorWarning` | `t('file.validationWarnings') (N)` |
| どちらもなし | 非表示 | — | — |

- `errors` / `warnings` フィールドは Array またはJSON文字列の両方に対応（`node-postgres` が自動変換する場合あり）

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface FileListTableProps {
  files: ProjectFile[];
  currentFolder?: string;          // 現在表示中のフォルダパス（'root' またはパス文字列）
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
  onDeleteFile?: (file: ProjectFile) => void;
  onDeleteFolder?: (file: ProjectFile) => void;
  onRenameFile?: () => void;       // ファイル名変更後のコールバック（ファイル一覧再取得用）
  maimlValidationRow?: MaimlAnalysisResultRow | null;
  isEditable?: boolean;            // デフォルト: true
  isProjectCompleted?: boolean;    // デフォルト: false
  isCheckoutLocked?: boolean;      // デフォルト: false
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| `files` | `ProjectFile[]` | ✅ | 表示するファイル・フォルダ一覧 |
| `currentFolder` | `string` | - | 現在表示中のフォルダパス |
| `onFileClick` | `(file) => void` | - | ファイル行クリック時のコールバック |
| `onFolderClick` | `(folderId) => void` | - | フォルダ行クリック時のコールバック |
| `onViewFile` | `(file) => void` | - | ビューアボタンクリック時のコールバック |
| `onDeleteFile` | `(file) => void` | - | ファイル削除メニュークリック時のコールバック |
| `onDeleteFolder` | `(file) => void` | - | フォルダ削除ボタンクリック時のコールバック |
| `onRenameFile` | `() => void` | - | ファイル名変更後のコールバック（一覧再取得用）|
| `maimlValidationRow` | `MaimlAnalysisResultRow \| null` | - | DB保存済みバリデーション結果 |
| `isEditable` | `boolean` | - | 編集権限フラグ（false で変更系ボタン無効）|
| `isProjectCompleted` | `boolean` | - | プロジェクト完了フラグ（true で変更系ボタン無効）|
| `isCheckoutLocked` | `boolean` | - | チェックアウト中フラグ（true で変更系ボタン無効）|

### 4.2 State定義

| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| `downloadingFileId` | `string \| null` | `null` | ダウンロード中のファイルID |
| `renameModalOpen` | `boolean` | `false` | リネームモーダルの表示状態 |
| `renamingFile` | `ProjectFile \| null` | `null` | 名前変更対象ファイル |
| `renameLoading` | `boolean` | `false` | リネームAPI呼び出し中フラグ |
| `renameForm` | `FormInstance` | — | リネームフォームインスタンス |

### 4.3 ProjectFile型定義

```typescript
interface ProjectFile {
  id: string;
  name: string;
  path: string;           // S3キー
  size: number;           // バイト
  lastModified: string;   // ISO8601
  type: string;           // 'maiml' | 'pdf' | 'excel' | 'csv' | 'archive' | etc.
  isFolder: boolean;
  fileCount?: number;     // フォルダの場合のファイル数
}
```

---

## 5. API連携

| # | 関数名 | メソッド | エンドポイント | 説明 |
|---|--------|---------|--------------|------|
| 1 | `getFileDownloadUrlByKey` | GET | `/api/v1/files/download-proxy` | プロキシ経由でファイルをダウンロード |
| 2 | `renameFile` | PATCH | `/api/v1/files/rename` | ファイル名変更 |

---

## 6. エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| ファイルパスが空 | `message.error(t('...filePathMissing'))` |
| ダウンロード失敗 | `message.error(t('...downloadError').replace('{{error}}', ...))` |
| リネーム失敗（`result.success === false`）| `message.error(t('...renameFailed'))` |
| リネームAPI例外 | `console.error` + `message.error(t('...renameFailed'))` |

---

## 7. 実装ファイル

### 7.1 メインファイル
- **パス**: `frontend/src/components/project/FileListTable.tsx`
- **行数**: 467行
- **エクスポート**: `FileListTable`（default export）

### 7.2 依存サービス・ユーティリティ
- `@/services/fileAccessService` - `getFileDownloadUrlByKey`, `renameFile`
- `@/utils/formatUtils` - `formatFileSize`, `formatRelativeTime`
- `@/contexts/LanguageContext` - `useLanguage`

### 7.3 依存型定義
- `@/types/file` - `ProjectFile`
- `@/types/maimlEditor` - `MaimlAnalysisResultRow`

### 7.4 Ant Design コンポーネント
- `Table`, `Button`, `Tooltip`, `Space`, `Empty`, `Dropdown`, `message`, `theme`, `Modal`, `Form`, `Input`

### 7.5 アイコン（@ant-design/icons）
- `FileTextOutlined`, `FileOutlined`, `TableOutlined`, `FolderOpenOutlined`
- `DownloadOutlined`, `DeleteOutlined`, `EditOutlined`, `EyeOutlined`, `MoreOutlined`, `WarningOutlined`

---

## 8. 補足事項

### 8.1 フォルダ名表示のパス対応
フォルダ名がフルパス（例: `rawdata/sub/`）の場合、末尾スラッシュを除いた最後セグメントのみを表示する。

```typescript
const getDisplayName = (name: string) => {
  if (!record.isFolder || !name.includes('/')) return name;
  const parts = name.split('/').filter(s => s !== '');
  return parts[parts.length - 1] || name;
};
```

### 8.2 変更系ボタンの disabled 条件
以下いずれかが `true` の場合に名前変更・削除・フォルダ削除ボタンを無効化:
- `!isEditable`
- `isProjectCompleted`
- `isCheckoutLocked`

### 8.3 イベントバブリング制御
ボタン・Dropdownクリック時に `e.stopPropagation()` で行クリックへの伝播を防止。

### 8.4 ダウンロード状態管理
- 一度に1ファイルのみダウンロード可能
- `downloadingFileId !== null` で全ダウンロードボタンを disabled に設定

### 8.5 MAIMLバリデーション警告アイコンの JSONB 対応
`maimlValidationRow.errors` / `.warnings` は Array または JSON文字列の両方に対応:
```typescript
const parseField = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return [];
};
```

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 3.0.0 | 2026-08-20 | 実装ベースで全面改訂（Props追加: `currentFolder/onRenameFile/isEditable/isProjectCompleted/isCheckoutLocked`・`projectId` 削除・リネームモーダル追加・Dropdownメニュー詳細追加・操作カラム幅280px修正・フォルダ名フルパス対応追加・data-testid追記）|
| 2.0.0 | 2026-04-24 | MAIMLバリデーション警告アイコン機能追加 |
| 1.1.0 | 2026-04-01 | `onDeleteFile` Props追加、操作カラム幅220→280px変更、Dropdownメニュー追加 |
| 1.0.0 | 2026-01-21 | 初版作成 |
