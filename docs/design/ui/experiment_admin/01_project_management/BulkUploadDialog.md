# BulkUploadDialog - 一括ファイルアップロードダイアログ

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクトへのファイルアップロードを行うモーダルダイアログ。単一ファイル、一括ファイル、フォルダアップロードの3モードに対応し、進捗表示とエラーハンドリングを提供します。

### 1.2 使用場面
- プロジェクト管理画面のツールバーで「一括アップロード」ボタンをクリックした際に表示
- ファイルやフォルダをプロジェクトにアップロードする場合

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌──────────────────────────────────────────┐
│ 一括ファイルアップロード           [×]  │
├──────────────────────────────────────────┤
│ アップロードタイプ                       │
│ [📄 単一ファイル][📦 一括ファイル][📁 フォルダ] │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │      📦                            │  │
│ │  ファイルをドラッグ&ドロップ      │  │
│ │  または、クリックしてファイルを選択│  │
│ └────────────────────────────────────┘  │
│                                          │
│ 選択ファイル (3個)                       │
│ ┌────────────────────────────────────┐  │
│ │ sample1.maiml         1.2 MB       │  │
│ │ sample2.maiml         850 KB       │  │
│ │ data.csv              120 KB       │  │
│ │ 総サイズ: 2.17 MB                  │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ──────────────────────────────────────  │
│                                          │
│ アップロード先フォルダ                   │
│ 所属組織: org_materials (材料科学組織)   │
│ [部門 → プロジェクト 選択 ▼]            │
│ 選択パス: org_materials/dept_research/project_001 │
│                                          │
│ ☑ フォルダ構造を保持する                │
│                                          │
│ ℹ️ アップロード中                        │
│ 2 / 3 ファイル完了                       │
│ [進捗バー: 67%]                          │
│                                          │
├──────────────────────────────────────────┤
│              [キャンセル] [アップロード開始] │
└──────────────────────────────────────────┘
```

**モーダルサイズ:**
- 幅: 800px
- 高さ: 最大70vh（スクロール可能）

---

## 3. 機能仕様

### 3.1 アップロードモード

#### 3.1.1 モード切り替え

```typescript
type UploadMode = 'single' | 'bulk' | 'folder';
```

| モード | アイコン | 説明 | ファイル選択 |
|--------|---------|------|------------|
| 単一ファイル | FileOutlined | 1ファイルのみアップロード | 単一選択 |
| 一括ファイル | InboxOutlined | 複数ファイルを一括アップロード | 複数選択 |
| フォルダ | FolderOutlined | フォルダ全体をアップロード | フォルダ選択 |

#### 3.1.2 モード変更時の処理

```typescript
const handleModeChange = useCallback((value: string | number) => {
  setUploadMode(value as UploadMode);
  setFileList([]);        // ファイルリストをクリア
  setBatchName('');       // バッチ名をクリア
}, []);
```

### 3.2 ファイル選択

#### 3.2.1 単一ファイル・一括ファイルモード

**Dragger（ドラッグ&ドロップエリア）:**
```typescript
<Dragger
  fileList={fileList}
  onChange={handleFileChange}
  beforeUpload={beforeUpload}  // 自動アップロード無効化
  multiple={uploadMode !== 'single'}
  disabled={uploadState.isUploading}
  accept=".maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf,.tif,.tiff,.bmp,.svg,.webp"
  showUploadList={false}
>
```

**対応ファイル形式:**
- MAIML: `.maiml`, `.xml`
- データ: `.json`, `.txt`, `.csv`
- 画像: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.svg`, `.webp`
- ドキュメント: `.pdf`
- 画像（科学用途）: `.tif`, `.tiff`

#### 3.2.2 フォルダモード

```typescript
<Button
  icon={<FolderOutlined />}
  onClick={() => folderInputRef.current?.click()}
>
  フォルダを選択
</Button>

<input
  ref={folderInputRef}
  type="file"
  webkitdirectory=""
  directory=""
  multiple
  onChange={handleFolderSelect}
  style={{ display: 'none' }}
/>
```

**動作:**
- フォルダ選択ダイアログを表示
- フォルダ内の全ファイルを取得
- webkitRelativePathからフォルダ構造を保持

#### 3.2.3 ファイル選択時の処理

```typescript
const handleFileChange: UploadProps['onChange'] = useCallback(
  (info: { fileList: UploadFile[] }) => {
    let newFileList = [...info.fileList];
    
    // 単一ファイルモードの場合は1つのみ
    if (uploadMode === 'single') {
      newFileList = newFileList.slice(-1);
    }
    
    setFileList(newFileList);
    
    // バッチ名の自動生成
    if (newFileList.length === 1) {
      setBatchName(`単一アップロード: ${newFileList[0].name}`);
    } else if (newFileList.length > 1) {
      setBatchName(`一括アップロード ${newFileList.length}ファイル`);
    }
  },
  [uploadMode]
);
```

### 3.3 選択ファイル表示

#### 3.3.1 ファイルリストエリア

```
選択ファイル (3個)
┌────────────────────────────────────┐
│ sample1.maiml         1.2 MB       │
│ sample2.maiml         850 KB       │
│ data.csv              120 KB       │
│ （最大10ファイルまで表示）          │
│ 他 5 ファイル...                   │
│                                    │
│ 総サイズ: 2.17 MB                  │
└────────────────────────────────────┘
```

**特徴:**
- 最大10ファイルまで表示
- 10ファイル超える場合は「他 N ファイル...」と表示
- 各ファイル: 名前（省略表示） + サイズ
- 総サイズを水色背景で表示

#### 3.3.2 ファイルサイズフォーマット

```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

**例:**
- `1234` → "1.21 KB"
- `1234567` → "1.18 MB"
- `1234567890` → "1.15 GB"

### 3.4 アップロード先フォルダ選択

#### 3.4.1 所属組織表示

```
所属組織: org_materials (材料科学組織)
```

- グレー背景で表示
- 固定値（ログインユーザーの所属組織）
- 変更不可

#### 3.4.2 フォルダ階層選択（Cascader）

**階層構造:**
```
org_materials (所属組織・自動付与)
  └─ dept_research (部門)
      └─ project_001 (プロジェクト)
```

**Cascader設定:**
```typescript
<Cascader
  options={folderStructureOptions}
  value={selectedFolderPath}
  onChange={handleFolderPathChange}
  placeholder={cascaderPlaceholder}
  expandTrigger="hover"
  showSearch
  changeOnSelect={changeOnSelect}  // モード依存
/>
```

**プレースホルダー:**
- 単一ファイル: "プロジェクトを選択"
- 一括ファイル/フォルダ: "部門 または プロジェクト を選択"

**changeOnSelect（途中選択可否）:**
- 単一ファイル: `false`（プロジェクトまで選択必須）
- 一括ファイル/フォルダ: `true`（部門レベルでも選択可）

#### 3.4.3 選択パス表示

```
選択パス: org_materials/dept_research/project_001
```

- 水色背景で表示
- 完全なパスを表示（組織ID含む）

#### 3.4.4 フォルダ構造オプション（モック）

```typescript
const folderStructureOptions: DefaultOptionType[] = [
  {
    value: 'dept_research',
    label: 'dept_research (研究部門)',
    children: [
      { value: 'project_001', label: 'project_001 (合金開発プロジェクト)' },
      { value: 'project_002', label: 'project_002 (セラミックス研究)' },
      // ...
    ],
  },
  // 分析部門、合成部門、触媒部門、量子物理部門...
];
```

### 3.5 フォルダ構造保持オプション

#### 3.5.1 チェックボックス

```typescript
<Checkbox
  checked={preserveFolderStructure}
  onChange={(e) => setPreserveFolderStructure(e.target.checked)}
  disabled={uploadState.isUploading}
>
  フォルダ構造を保持する
</Checkbox>
```

**表示条件:**
- 一括ファイルモードまたはフォルダモードの場合のみ表示

**動作:**
- チェック: webkitRelativePathを保持してアップロード
- 未チェック: フラットにアップロード

### 3.6 アップロード実行

#### 3.6.1 アップロードフロー

```typescript
const handleUpload = useCallback(async () => {
  if (fileList.length === 0) {
    message.warning('ファイルを選択してください');
    return;
  }
  
  setUploadState({
    isUploading: true,
    progress: 0,
    uploadedCount: 0,
    totalCount: fileList.length,
    error: null,
  });
  
  try {
    // originFileObjを抽出してFile型に変換
    const files = fileList
      .map(f => f.originFileObj)
      .filter((f): f is RcFile => !!f)
      .map(f => f as unknown as File);
    
    // API呼び出し
    const response = await fileService.uploadFiles({
      projectId,
      uploadMode,
      targetFolder: selectedFolderPathString,
      files,
      batchName: batchName || undefined,
      preserveFolderStructure: uploadMode !== 'single' && preserveFolderStructure,
      onProgress: (progress) => {
        setUploadState(prev => ({
          ...prev,
          progress: progress.percentage,
          uploadedCount: progress.uploadedCount,
        }));
      },
    });
    
    if (response.success) {
      message.success('アップロードが完了しました');
      
      if (onUploadComplete) {
        onUploadComplete({
          mode: uploadMode,
          fileCount: fileList.length,
          success: true,
        });
      }
      
      // 完了後の状態リセット（2秒後）
      setTimeout(() => {
        setFileList([]);
        setBatchName('');
        setUploadState({
          isUploading: false,
          progress: 100,
          uploadedCount: fileList.length,
          totalCount: fileList.length,
          error: null,
        });
      }, 2000);
    }
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      error: errorMessage,
    }));
    message.error(errorMessage);
  }
}, [fileList, uploadMode, projectId, selectedFolderPathString, batchName, preserveFolderStructure, onUploadComplete]);
```

#### 3.6.2 進捗表示

**アップロード中:**
```
ℹ️ アップロード中
2 / 3 ファイル完了
[━━━━━━━━━━░░░░░░░░░░] 67%
```

**アップロード完了:**
```
✅ アップロード完了
3個のファイルが正常にアップロードされました
```

**エラー発生:**
```
❌ アップロードエラー
{エラーメッセージ}
```

### 3.7 ダイアログを閉じる

#### 3.7.1 閉じる処理

```typescript
const handleClose = useCallback(() => {
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
}, [uploadState.isUploading, onClose]);
```

**動作:**
- アップロード中: 確認ダイアログを表示
- 通常時: そのまま閉じる

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface BulkUploadDialogProps {
  open: boolean;                          // ダイアログの表示/非表示
  onClose: () => void;                    // 閉じるハンドラ
  onUploadComplete?: (result: {
    mode: UploadMode;
    fileCount: number;
    success: boolean;
  }) => void;                             // アップロード完了ハンドラ
  preselectedFolder?: string;             // 事前選択されたフォルダパス
  projectId: string;                      // プロジェクトID（必須）
}
```

### 4.2 UploadMode型定義

```typescript
type UploadMode = 'single' | 'bulk' | 'folder';
```

### 4.3 UploadState型定義

```typescript
interface UploadState {
  isUploading: boolean;      // アップロード中フラグ
  progress: number;          // 進捗率（0-100）
  uploadedCount: number;     // アップロード完了ファイル数
  totalCount: number;        // 総ファイル数
  error: string | null;      // エラーメッセージ
}
```

### 4.4 State定義

```typescript
const [uploadMode, setUploadMode] = useState<UploadMode>('single');
const [fileList, setFileList] = useState<UploadFile[]>([]);
const [selectedFolderPath, setSelectedFolderPath] = useState<(string | number)[]>([]);
const [batchName, setBatchName] = useState<string>('');
const [preserveFolderStructure, setPreserveFolderStructure] = useState<boolean>(true);
const [uploadState, setUploadState] = useState<UploadState>({
  isUploading: false,
  progress: 0,
  uploadedCount: 0,
  totalCount: 0,
  error: null,
});
```

---

## 5. API連携

### 5.1 ファイルアップロードAPI

```typescript
const response = await fileService.uploadFiles({
  projectId,                   // プロジェクトID
  uploadMode,                  // アップロードモード
  targetFolder,                // アップロード先フォルダパス
  files,                       // File配列
  batchName,                   // バッチ名（オプショナル）
  preserveFolderStructure,     // フォルダ構造保持フラグ
  onProgress: (progress) => {  // 進捗コールバック
    // 進捗更新処理
  },
});
```

**レスポンス:**
```typescript
{
  success: boolean;
  data?: {
    uploadedFiles: string[];
    failedFiles: string[];
  };
}
```

---

## 6. UI/UXポリシー準拠

### 6.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| モーダル | Modal | width=800, styles.body |
| セグメント | Segmented | block, options |
| アップロード | Upload.Dragger | multiple, accept, showUploadList |
| ボタン | Button | type, icon, disabled, loading |
| カスケーダー | Cascader | showSearch, expandTrigger, changeOnSelect |
| チェックボックス | Checkbox | checked, onChange |
| 警告 | Alert | type, showIcon, icon |
| 進捗バー | Progress | percent, status |
| スペース | Space | direction="vertical", size |
| テキスト | Typography.Text | strong, ellipsis, type |

### 6.2 カラーパレット

| 要素 | 色 | 用途 |
|------|-----|------|
| Draggerアイコン | #0093CF | アップロードエリア |
| 総サイズ背景 | #E6F7FC | 情報表示エリア |
| 所属組織背景 | #F0F0F0 | 固定情報表示 |
| 選択パス背景 | #E6F7FC | パス表示エリア |

---

## 7. エラーハンドリング

### 7.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| ファイル未選択 | ファイルが選択されていない | 警告メッセージ表示 |
| アップロード失敗 | ネットワークエラー、サーバーエラー等 | エラーメッセージ表示 |

### 7.2 エラーメッセージ

```typescript
// ファイル未選択
message.warning('ファイルを選択してください');

// アップロード失敗
message.error(`ファイルのアップロードに失敗しました: ${errorMessage}`);
```

---

## 8. 実装ファイル

### 8.1 ファイルパス
```
frontend/src/components/project/BulkUploadDialog.tsx
```

### 8.2 依存コンポーネント
- なし（単独で動作）

### 8.3 依存ライブラリ
- antd: Modal, Segmented, Upload, Button, Cascader, Checkbox, Alert, Progress, Space, Typography, message
- @ant-design/icons: 各種アイコン
- @/services/fileService: uploadFiles
- @/utils/errorUtils: extractErrorMessage

---

## 9. 既知の課題・TODO

### 9.1 既知の課題
- フォルダ構造がモックデータ（実際のAPIから取得する必要あり）
- アップロードキャンセル機能なし
- アップロード中のファイル単位進捗表示なし

### 9.2 将来の改善案
- [ ] 実際のAPI連携（フォルダ構造取得）
- [ ] アップロードキャンセル機能
- [ ] ファイル単位の進捗表示
- [ ] アップロード失敗時のリトライ機能
- [ ] ファイルサイズ制限チェック
- [ ] ファイル形式チェック強化
- [ ] 並列アップロード数の制御
- [ ] アップロード履歴の表示
- [ ] ドラッグ&ドロップ時の視覚フィードバック強化

---

## 10. テスト観点

### 10.1 単体テスト
- [ ] モード切り替えが正しく動作する
- [ ] ファイル選択が正しく動作する
- [ ] フォルダ選択が正しく動作する
- [ ] ファイルサイズフォーマットが正しい
- [ ] 進捗表示が正しく更新される
- [ ] エラーメッセージが正しく表示される

### 10.2 統合テスト
- [ ] アップロードAPIが正しく呼び出される
- [ ] 親コンポーネントへの完了通知
- [ ] アップロード中の閉じる確認ダイアログ

### 10.3 E2Eテスト
- [ ] ファイル選択からアップロード完了
- [ ] フォルダアップロード
- [ ] エラーケースの動作確認
- [ ] アップロード中のキャンセル

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 12. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [FileListTable仕様](./FileListTable.md) - ファイル一覧表示
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
- [ファイルアップロードAPI](../../../20260121_API一覧.md) - API仕様
