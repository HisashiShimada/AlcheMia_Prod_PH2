# ファイルアップロード機能仕様（Part 3）
**現在のプロジェクト実装 (BulkUploadDialog.tsx) の分析**

## 10. 現在のプロジェクトのUI実装

### 10.1 コンポーネント構造
```typescript
interface BulkUploadDialogProps {
  open: boolean;                    // ダイアログ表示状態
  onClose: () => void;              // 閉じるハンドラ
  onUploadComplete?: (result: {    // 完了ハンドラ
    mode: UploadMode;
    fileCount: number;
    success: boolean;
  }) => void;
  preselectedFolder?: string;       // 事前選択フォルダ
}
```

### 10.2 Ant Design v6コンポーネント使用
- **Segmented**: アップロードモード選択（単一/一括/フォルダ）
- **Dragger**: ドラッグ&ドロップエリア
- **Cascader**: 階層的なフォルダ選択
- **Progress**: アップロード進捗表示
- **Alert**: 状態通知（進行中/完了/エラー）

### 10.3 フォルダ構造選択
**階層構造（Cascader使用）:**
```
組織（固定: ログイン情報から取得）
└── 部門
    └── プロジェクト
```

**モックデータ例:**
```typescript
const folderStructureOptions = [
  {
    value: 'dept_research',
    label: 'dept_research (研究部門)',
    children: [
      { value: 'project_001', label: 'project_001 (合金開発プロジェクト)' },
      { value: 'project_002', label: 'project_002 (セラミックス研究)' },
    ],
  },
  // ...他の部門
];
```

**changeOnSelect設定:**
- 単一ファイル: `false`（プロジェクトまで選択必須）
- 一括ファイル: `true`（部門レベルでも選択可能）
- フォルダ: `true`（部門レベルでも選択可能）

**選択パス生成:**
```typescript
// 組織IDを先頭に追加した完全パス
const selectedPath = `${organizationId}/${dept}/${project}`;
// 例: org_materials/dept_research/project_001
```

### 10.4 ファイル選択UI

**単一/一括ファイル（Dragger）:**
```tsx
<Dragger
  fileList={fileList}
  onChange={handleFileChange}
  beforeUpload={() => false}  // 自動アップロード無効化
  multiple={uploadMode !== 'single'}
  accept=".maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf,.tif,.tiff,.bmp,.svg,.webp"
>
  <InboxOutlined style={{ fontSize: 48 }} />
  <p>ファイルをドラッグ&ドロップ</p>
  <p>または、クリックしてファイルを選択</p>
</Dragger>
```

**フォルダ選択（input要素）:**
```tsx
<input
  type="file"
  webkitdirectory=""
  directory=""
  multiple
  onChange={handleFolderSelect}
/>
```

### 10.5 選択ファイル表示

**表示内容:**
- ファイル名（最大10件、それ以上は省略表示）
- 個別ファイルサイズ
- 総ファイル数
- 総サイズ（formatFileSize関数でフォーマット）

**formatFileSize実装:**
```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

### 10.6 アップロード進捗表示

**UploadState管理:**
```typescript
interface UploadState {
  isUploading: boolean;      // アップロード中フラグ
  progress: number;          // 進捗率（0-100）
  uploadedCount: number;     // アップロード完了数
  totalCount: number;        // 総ファイル数
  error: string | null;      // エラーメッセージ
}
```

**進捗表示（Alert + Progress）:**
```tsx
<Alert
  message="アップロード中"
  description={
    <>
      <Text>{uploadedCount} / {totalCount} ファイル完了</Text>
      <Progress percent={progress} status="active" />
    </>
  }
  type="info"
  icon={<LoadingOutlined />}
/>
```

### 10.7 バッチ名の自動生成

```typescript
// 単一ファイル
setBatchName(`単一アップロード: ${file.name}`);

// 一括ファイル
setBatchName(`一括アップロード ${fileCount}ファイル`);

// フォルダ
const folderName = file.webkitRelativePath.split('/')[0];
setBatchName(`フォルダアップロード: ${folderName}`);
```

### 10.8 エラーハンドリング

**アップロード中の閉じる処理:**
```typescript
const handleClose = () => {
  if (uploadState.isUploading) {
    Modal.confirm({
      title: 'アップロード中',
      content: 'アップロード処理が進行中です。キャンセルしますか？',
      okText: 'はい',
      cancelText: 'いいえ',
      onOk: onClose,
    });
  } else {
    onClose();
  }
};
```

**エラー表示:**
```tsx
<Alert
  message="アップロードエラー"
  description={error}
  type="error"
  icon={<CloseCircleOutlined />}
  closable
  onClose={() => setUploadState(prev => ({ ...prev, error: null }))}
/>
```

### 10.9 完了後の処理

```typescript
// 成功メッセージ
message.success('アップロードが完了しました');

// コールバック実行
onUploadComplete({
  mode: uploadMode,
  fileCount: fileList.length,
  success: true,
});

// 2秒後に状態リセット
setTimeout(() => {
  setFileList([]);
  setBatchName('');
  setUploadState(初期状態);
}, 2000);
```

## 11. API統合ポイント

### 11.1 リクエスト送信（実装予定）

```typescript
const handleUpload = async () => {
  const formData = new FormData();
  
  // アップロードモード
  formData.append('uploadMode', uploadMode);
  
  // アップロード先フォルダ（Cascaderで選択したパス）
  formData.append('targetFolder', selectedFolderPathString);
  
  // バッチ名
  formData.append('batchName', batchName);
  
  // フォルダ構造保持
  if (uploadMode === 'bulk' || uploadMode === 'folder') {
    formData.append('preserveFolderStructure', String(preserveFolderStructure));
  }
  
  // ファイル
  fileList.forEach((file) => {
    if (file.originFileObj) {
      formData.append('files', file.originFileObj);
    }
  });
  
  // API呼び出し
  const response = await fetch(
    `/api/v1/projects/${projectId}/files/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Organization-Id': organizationId,
      },
      body: formData,
    }
  );
  
  const result = await response.json();
  return result;
};
```

### 11.2 進捗更新（実装予定）

現在はモック実装（100msごとに進捗更新）：
```typescript
for (let i = 0; i < fileList.length; i++) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  setUploadState((prev) => ({
    ...prev,
    uploadedCount: i + 1,
    progress: Math.round(((i + 1) / fileList.length) * 100),
  }));
}
```

実際の実装では、バックエンドからの進捗情報を使用する予定。

## 12. バリデーション

### 12.1 フロントエンド側
- ファイル数チェック（最大100）
- ファイルサイズチェック（最大100MB/ファイル）
- ファイル種別チェック（accept属性）
- フォルダパス選択必須チェック

### 12.2 バックエンド側（実装必須）
- Parameterized Queries使用
- organization_id検証
- ファイルサイズ制限
- ファイル数制限
- MIME Type検証
- ファイル名サニタイゼーション

## 13. 実装済み機能

✅ 3つのアップロードモード（単一/一括/フォルダ）
✅ Cascaderによる階層的フォルダ選択
✅ ドラッグ&ドロップサポート
✅ ファイルリスト表示（10件まで、それ以上は省略）
✅ ファイルサイズフォーマット
✅ 進捗表示UI（Progress + Alert）
✅ バッチ名自動生成
✅ フォルダ構造保持オプション
✅ アップロード中の閉じる確認
✅ エラー表示UI

## 14. 未実装機能（TODO）

⏳ 実際のAPI呼び出し処理
⏳ リアルタイム進捗更新
⏳ ファイル名重複チェック
⏳ サーバーサイドバリデーション連携
⏳ キャンセル機能
⏳ リトライ機能
⏳ アップロード履歴保存
