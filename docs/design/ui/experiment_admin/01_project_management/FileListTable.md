# FileListTable - ファイル一覧テーブル

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクト内のファイルとフォルダを一覧表示するテーブルコンポーネント。ファイルのダウンロード、ビューア起動、フォルダナビゲーションを提供します。

### 1.2 使用場面
- プロジェクト管理画面の右側コンテンツエリア
- 選択されたプロジェクトのファイル一覧表示

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 テーブル構造

```
┌──────────────────────────────────────────────────────────────────┐
│ タイプ │ ファイル名          │ サイズ   │ 最終更新日  │ 操作    │
├──────────────────────────────────────────────────────────────────┤
│   📁   │ experiment_data (5) │          │            │         │
│   📄   │ sample.maiml        │ 1.2 MB   │ 2時間前    │ [↓][👁] │
│   📄   │ result.pdf          │ 3.5 MB   │ 1日前      │ [↓][👁] │
│   📊   │ data.csv            │ 450 KB   │ 3日前      │ [↓][👁] │
└──────────────────────────────────────────────────────────────────┘
```

**テーブルサイズ:**
- size="small"
- ページング: なし（全件表示）

### 2.2 カラム定義

| カラム | 幅 | ソート | 配置 | 説明 |
|--------|-----|--------|------|------|
| タイプ | 50px | - | center | ファイルタイプアイコン |
| ファイル名 | 可変 | ○ | left | ファイル/フォルダ名 + パス（Tooltip） |
| サイズ | 120px | ○ | left | ファイルサイズ（フォルダは空） |
| 最終更新日 | 150px | ○ | left | 相対時間表示 |
| 操作 | 220px | - | center | ダウンロード・ビューアボタン |

---

## 3. 機能仕様

### 3.1 ファイルタイプアイコン

#### 3.1.1 アイコンマッピング

```typescript
const getFileIcon = (file: FileData) => {
  if (file.isFolder) {
    return <FolderOpenOutlined />;  // 📁 黄色（警告色）
  }
  
  switch (file.type) {
    case 'maiml':
      return <FileTextOutlined />;  // 📄 青色（情報色）
    case 'pdf':
      return <FileTextOutlined />;  // 📄 赤色（エラー色）
    case 'excel':
      return <TableOutlined />;     // 📊 緑色（成功色）
    case 'csv':
      return <TableOutlined />;     // 📊 グレー
    case 'archive':
      return <FolderOpenOutlined />; // 📁 黄色
    default:
      return <FileOutlined />;      // 📄 グレー
  }
};
```

#### 3.1.2 アイコンカラー

| ファイルタイプ | アイコン | カラー | トークン |
|--------------|---------|--------|----------|
| フォルダ | FolderOpenOutlined | 黄色 | colorWarning |
| MAIML | FileTextOutlined | 青色 | colorInfo |
| PDF | FileTextOutlined | 赤色 | colorError |
| Excel | TableOutlined | 緑色 | colorSuccess |
| CSV | TableOutlined | グレー | colorTextSecondary |
| その他 | FileOutlined | グレー | colorTextSecondary |

### 3.2 ファイル名表示

#### 3.2.1 フォルダ表示
```typescript
render: (text: string, record: FileData) => (
  <Tooltip title={record.path} placement="topLeft">
    <span
      style={{
        fontWeight: record.isFolder ? token.fontWeightStrong : 'normal',
        color: record.isFolder ? token.colorWarning : 'inherit',
        cursor: record.isFolder ? 'pointer' : 'inherit',
      }}
    >
      {text}
      {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
    </span>
  </Tooltip>
)
```

**フォルダの特徴:**
- 太字（fontWeightStrong）
- 黄色（colorWarning）
- ファイル数を括弧で表示（例: "experiment_data (5)"）
- パスをTooltipで表示

#### 3.2.2 ファイル表示
- 通常フォント
- デフォルトカラー
- パスをTooltipで表示

### 3.3 ソート機能

#### 3.3.1 ソート対応カラム

**ファイル名:**
```typescript
sorter: (a, b) => a.name.localeCompare(b.name, 'ja')
```
- 日本語対応のアルファベット順ソート

**サイズ:**
```typescript
sorter: (a, b) => a.size - b.size
```
- バイト数の昇順/降順

**最終更新日:**
```typescript
sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
```
- タイムスタンプの昇順/降順

### 3.4 ダウンロード機能

#### 3.4.1 ダウンロードフロー

```typescript
const handleDownloadFile = async (file: FileData) => {
  try {
    setDownloadingFileId(file.id);
    
    // 1. API通信: 署名付きURLを取得
    const fileDownloadInfo = await downloadFile(projectId, file.name);
    
    // 2. ファイルダウンロード実行
    executeFileDownload(
      fileDownloadInfo.downloadUrl, 
      fileDownloadInfo.fileName
    );
    
    // 3. 成功メッセージ表示
    message.success(`「${file.name}」のダウンロードを開始しました`);
  } catch (error) {
    // エラーメッセージ表示
    message.error(`ファイルのダウンロードに失敗しました: ${error.message}`);
  } finally {
    setDownloadingFileId(null);
  }
};
```

#### 3.4.2 ダウンロードボタン

```typescript
<Button
  type="default"
  size="small"
  icon={<DownloadOutlined />}
  loading={downloadingFileId === record.id}
  disabled={downloadingFileId !== null}
  onClick={(e) => {
    e.stopPropagation();  // 行クリックイベントを防止
    handleDownloadFile(record);
  }}
>
  ダウンロード
</Button>
```

**状態:**
- ダウンロード中: loading状態（スピナー表示）
- 他のファイルダウンロード中: disabled
- 通常: クリック可能

### 3.5 ビューア起動機能

#### 3.5.1 ビューアボタン

```typescript
<Button
  type="primary"
  size="small"
  icon={<EyeOutlined />}
  style={{ 
    backgroundColor: token.colorSuccess, 
    borderColor: token.colorSuccess 
  }}
  onClick={(e) => {
    e.stopPropagation();  // 行クリックイベントを防止
    onViewFile?.(record);
  }}
>
  ビューア
</Button>
```

**特徴:**
- 緑色ボタン（成功色）
- 親コンポーネントの`onViewFile`ハンドラを呼び出し

### 3.6 行クリックイベント

#### 3.6.1 クリック処理

```typescript
onRow={(record) => ({
  onClick: () => {
    if (record.isFolder) {
      onFolderClick?.(record.id);  // フォルダクリック
    } else {
      onFileClick?.(record);       // ファイルクリック
    }
  },
  style: {
    cursor: record.isFolder || onFileClick ? 'pointer' : 'default',
  },
})}
```

**動作:**
- フォルダ行: `onFolderClick`を呼び出し（フォルダ内へナビゲート）
- ファイル行: `onFileClick`を呼び出し（ファイル選択）
- カーソル: フォルダまたは`onFileClick`が存在する場合、pointer表示

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface FileListTableProps {
  files: FileData[];                        // ファイル一覧
  projectId: string;                        // プロジェクトID
  onFileClick?: (file: FileData) => void;   // ファイルクリックハンドラ
  onFolderClick?: (folderId: string) => void; // フォルダクリックハンドラ
  onViewFile?: (file: FileData) => void;    // ビューア起動ハンドラ
}
```

### 4.2 FileData型定義

```typescript
interface FileData {
  id: string;             // ファイルID
  name: string;           // ファイル名
  path: string;           // ファイルパス（Tooltip表示用）
  size: number;           // ファイルサイズ（バイト）
  lastModified: string;   // 最終更新日（ISO 8601）
  type: string;           // ファイルタイプ（'maiml', 'pdf', 'excel', 'csv', 'archive'等）
  isFolder?: boolean;     // フォルダフラグ
  fileCount?: number;     // フォルダ内ファイル数（フォルダの場合）
}
```

### 4.3 State定義

```typescript
const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
```

**用途:**
- ダウンロード中のファイルIDを保持
- ローディング表示と他ボタンの無効化に使用

---

## 5. API連携

### 5.1 ファイルダウンロードAPI

#### 5.1.1 署名付きURL取得 ✅

```typescript
const fileDownloadInfo = await downloadFile(projectId, file.name);
```

**使用API:** ✅
- POST `/api/v1/files/download` - ファイルダウンロード用署名付きURL取得

**詳細:** [共通API仕様書](../../api/api_common.md#2-ファイルダウンロード-)

**Request:**
```http
POST /api/v1/files/download
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "file_path": "org_{organization_prefix}/projects/{project_name}/{filename}",
  "expires_in": 3600
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "download_url": "https://s3.amazonaws.com/...",
    "file_name": "sample.maiml",
    "file_size": 1234567,
    "expires_at": "2026-01-23T09:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-23T08:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.1.2 ダウンロード実行

```typescript
executeFileDownload(fileDownloadInfo.downloadUrl, fileDownloadInfo.fileName);
```

**動作:**
- 署名付きURLから直接ダウンロード
- ブラウザのダウンロード機能を使用
- URLは1時間有効（デフォルト）

### 5.2 ファイル一覧取得

**親コンポーネントで実施:**
- プロジェクト選択時にファイル一覧を取得
- `files` propsとして渡される

**使用API:** 🔴
- GET `/api/v1/projects/:projectId/files` - プロジェクトファイル一覧取得 🔴

**詳細:** [プロジェクト管理API仕様書](../../api/api_project_management.md#34-ファイル一覧取得-)

---

## 6. UI/UXポリシー準拠

### 6.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| テーブル | Table | size="small", pagination=false |
| ボタン | Button | type, size="small", icon, loading, disabled |
| スペース | Space | size="small" |
| ツールチップ | Tooltip | title, placement="topLeft" |
| 空状態 | Empty | description, image |
| メッセージ | message | success, error |

### 6.2 デザイントークン使用

```typescript
const { token } = theme.useToken();

// アイコンサイズ
fontSize: token.fontSizeLG

// フォント
fontWeight: token.fontWeightStrong

// カラー
color: token.colorWarning
color: token.colorInfo
color: token.colorError
color: token.colorSuccess
color: token.colorTextSecondary
```

### 6.3 カラーパレット

| 要素 | カラー | トークン |
|------|--------|----------|
| フォルダアイコン | 黄色 | colorWarning |
| MAIMLアイコン | 青色 | colorInfo |
| PDFアイコン | 赤色 | colorError |
| Excel/CSVアイコン | 緑色 | colorSuccess |
| その他アイコン | グレー | colorTextSecondary |
| ビューアボタン | 緑色 | colorSuccess |

---

## 7. ユーティリティ関数

### 7.1 formatFileSize

```typescript
formatFileSize(record.size)
```

**例:**
- `1234` → "1.2 KB"
- `1234567` → "1.2 MB"
- `1234567890` → "1.2 GB"

### 7.2 formatRelativeTime

```typescript
formatRelativeTime(record.lastModified)
```

**例:**
- "2時間前"
- "1日前"
- "3日前"
- "2024/01/15"（古い日付）

---

## 8. 空状態

### 8.1 Empty表示

```typescript
locale={{
  emptyText: (
    <Empty 
      description="ファイルがありません" 
      image={Empty.PRESENTED_IMAGE_SIMPLE} 
    />
  ),
}}
```

**表示条件:**
- `files` 配列が空の場合

---

## 9. エラーハンドリング

### 9.1 ダウンロードエラー

```typescript
catch (error) {
  console.error('ファイルダウンロードエラー:', error);
  message.error(
    `ファイルのダウンロードに失敗しました: ${
      error instanceof Error ? error.message : '不明なエラー'
    }`
  );
}
```

**エラーメッセージ:**
- `ファイルのダウンロードに失敗しました: {詳細}`
- コンソールにも詳細ログを出力

---

## 10. 実装ファイル

### 10.1 ファイルパス
```
frontend/src/components/project/FileListTable.tsx
```

### 10.2 依存コンポーネント
- なし（単独で動作）

### 10.3 依存ライブラリ
- antd: Table, Button, Tooltip, Space, Empty, message, theme
- @ant-design/icons: 各種アイコン
- @/utils/formatters: formatFileSize, formatRelativeTime
- @/api/fileDownloadService: downloadFile, executeFileDownload

---

## 11. 既知の課題・TODO

### 11.1 既知の課題
- ページング機能なし（大量ファイル時にパフォーマンス問題の可能性）
- ファイルの一括ダウンロード機能なし
- ファイル削除機能なし
- ファイル名変更機能なし

### 11.2 将来の改善案
- [ ] ページング機能追加（100件以上の場合）
- [ ] 仮想スクロール（大量ファイル対応）
- [ ] ファイル選択機能（チェックボックス）
- [ ] 一括ダウンロード機能
- [ ] ファイル削除機能（権限チェック付き）
- [ ] ファイル名変更機能
- [ ] フィルター機能（ファイルタイプ、日付範囲等）
- [ ] ドラッグ&ドロップアップロード
- [ ] ファイルプレビュー機能
- [ ] ブレッドクラムナビゲーション
- [ ] ファイル検索機能

---

## 12. テスト観点

### 12.1 単体テスト
- [ ] ファイルタイプアイコンが正しく表示される
- [ ] フォルダ名が太字で黄色で表示される
- [ ] ソート機能が正しく動作する
- [ ] ダウンロードボタンがローディング状態になる
- [ ] エラーメッセージが正しく表示される

### 12.2 統合テスト
- [ ] ダウンロードAPIが正しく呼び出される
- [ ] 親コンポーネントへのイベント通知
- [ ] ビューア起動が正しく動作する

### 12.3 E2Eテスト
- [ ] ファイルクリックからビューア起動
- [ ] フォルダクリックから階層遷移
- [ ] ダウンロード実行と完了確認

---

## 13. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 14. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [BulkUploadDialog仕様](./BulkUploadDialog.md) - ファイルアップロード
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
- [ファイルダウンロードAPI](../../../20260121_API一覧.md) - API仕様
