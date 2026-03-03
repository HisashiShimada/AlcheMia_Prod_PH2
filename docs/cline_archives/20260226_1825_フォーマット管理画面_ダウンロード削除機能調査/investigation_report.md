# ファイル管理機能 - ダウンロードボタンと削除ボタン機能調査レポート

## 調査概要

- **調査日時**: 2026年2月26日 18:30
- **調査対象**: 各画面（フォーマット管理・プロジェクト管理）のダウンロードボタンと削除ボタンの機能実装状況
- **結論**: **画面によって実装状況が異なる**

---

## 📋 調査結果サマリー

### フォーマット管理画面（FormatFileListTable.tsx）

| 機能 | フロントエンド実装 | バックエンドAPI | 状態 |
|------|------------------|----------------|------|
| **ダウンロードボタン** | ❌ 未実装（console.logのみ） | ❌ APIエンドポイントなし | **機能していない** |
| **削除ボタン** | ❌ 未実装（console.logのみ） | ❌ APIエンドポイントなし | **機能していない** |

### プロジェクト管理画面（FileListTable.tsx）

| 機能 | フロントエンド実装 | バックエンドAPI | 状態 |
|------|------------------|----------------|------|
| **ダウンロードボタン** | ✅ 実装済み（`getFileDownloadUrlByKey`使用） | ✅ 実装済み（`POST /files/download-url`） | **正常動作** |
| **削除ボタン** | ❌ ボタン自体が存在しない | ❌ 不明 | **未実装** |

---

## 🔍 詳細調査結果

## A. フォーマット管理画面（FormatFileListTable.tsx）

### 1. ダウンロードボタンの実装状況

#### 1.1 フロントエンド（FormatFileListTable.tsx）

**ファイルパス**: `frontend/src/components/project/FormatFileListTable.tsx`

```typescript
<Button
  type="default"
  size="small"
  icon={<DownloadOutlined />}
  onClick={(e) => {
    e.stopPropagation();
    console.log('Download file:', record.name);  // ❌ console.logのみ
  }}
>
  ダウンロード
</Button>
```

**問題点:**
- ボタンクリック時に`console.log`を実行するだけ
- 実際のダウンロード処理が一切実装されていない
- 親コンポーネント（FormatManagement.tsx）にも`onDownload`プロップが存在しない

#### 1.2 バックエンドAPI（formatRoutes.ts）

**ファイルパス**: `backend/src/routes/formatRoutes.ts`

**問題点:**
- ファイルダウンロード用のAPIエンドポイントが存在しない
- 以下のようなエンドポイントが必要:
  ```typescript
  GET /api/v1/formats/files/download
  ```

### 2. 削除ボタンの実装状況

#### 2.1 フロントエンド（FormatFileListTable.tsx）

**ファイルパス**: `frontend/src/components/project/FormatFileListTable.tsx`

```typescript
<Button
  type="default"
  danger
  size="small"
  icon={<DeleteOutlined />}
  onClick={(e) => {
    e.stopPropagation();
    onDelete?.(record);  // ❌ 親に委譲するが実装なし
    console.log('Delete file:', record.name);
  }}
>
  削除
</Button>
```

**問題点:**
- `onDelete`プロップを呼び出しているが、親コンポーネントで実処理がない

#### 2.2 親コンポーネント（FormatManagement.tsx）

**ファイルパス**: `frontend/src/components/project/FormatManagement.tsx`

```typescript
<FormatFileListTable
  files={formatFiles}
  onFileClick={(file) => console.log('File clicked:', file.name)}
  onFolderClick={handleFolderClick}
  onDetail={handleFileDetail}
  onEdit={handleFileEdit}
  onDelete={(file) => console.log('Delete file:', file.name)}  // ❌ console.logのみ
/>
```

**問題点:**
- `onDelete`で`console.log`を実行するだけ
- 削除確認モーダルやAPI呼び出しが一切実装されていない

#### 2.3 バックエンドAPI（formatRoutes.ts）

**ファイルパス**: `backend/src/routes/formatRoutes.ts`

**問題点:**
- ファイル削除用のAPIエンドポイントが存在しない
- 以下のようなエンドポイントが必要:
  ```typescript
  DELETE /api/v1/formats/files
  ```

---

## B. プロジェクト管理画面（FileListTable.tsx）

### 1. ダウンロードボタンの実装状況

#### 1.1 フロントエンド実装

**ファイルパス**: `frontend/src/components/project/FileListTable.tsx`

```typescript
const handleDownloadFile = async (file: ProjectFile) => {
  try {
    setDownloadingFileId(file.id);

    // ファイルパスが存在するか確認
    if (!file.path || file.path.trim() === '') {
      throw new Error('ファイルパスが指定されていません');
    }

    // ファイルキーベースで直接ダウンロード（プロキシ方式）
    await getFileDownloadUrlByKey(file.path);  // ✅ 実装済み

    // 成功メッセージ表示
    message.success(`「${file.name}」のダウンロードを開始しました`);
  } catch (error) {
    console.error('ファイルダウンロードエラー:', error);
    message.error(
      `ファイルのダウンロードに失敗しました: ${
        error instanceof Error ? error.message : '不明なエラー'
      }`
    );
  } finally {
    setDownloadingFileId(null);
  }
};
```

**実装状況:**
- ✅ ダウンロード処理が完全に実装されている
- ✅ ローディング状態の管理あり
- ✅ エラーハンドリングあり
- ✅ 成功・失敗メッセージ表示あり

#### 1.2 バックエンドAPI

**ファイルパス**: `backend/src/services/fileAccessService.ts`

```typescript
/**
 * POST /api/v1/files/download-url
 * 署名付きURLを取得してファイルをダウンロード
 */
export async function getFileDownloadUrlByKey(fileKey: string): Promise<void> {
  // 実装済み - Swift/S3から署名付きURLを取得してダウンロード
}
```

**実装状況:**
- ✅ APIエンドポイント実装済み
- ✅ 署名付きURL方式でセキュアなダウンロード

---

### 2. 削除ボタンの実装状況

#### 2.1 フロントエンド実装

**ファイルパス**: `frontend/src/components/project/FileListTable.tsx`

**問題点:**
- ❌ 削除ボタン自体が存在しない
- ❌ 削除処理の実装なし

**現在のボタン構成:**
```typescript
<Space size="small">
  <Button icon={<DownloadOutlined />}>ダウンロード</Button>
  <Button icon={<EyeOutlined />}>ビューア</Button>
  {/* 削除ボタンなし */}
</Space>
```

#### 2.2 バックエンドAPI

**調査が必要:**
- プロジェクトファイル削除用のAPIエンドポイントが存在するか不明
- 可能性のあるエンドポイント: `DELETE /api/v1/projects/:projectId/files`

---

## 🛠️ 実装されている機能（参考）

現在、フォーマット管理画面で実装されている機能は以下の通り:

| 機能 | 実装状況 | APIエンドポイント |
|------|---------|------------------|
| フォーマット一覧取得 | ✅ 実装済み | `GET /api/v1/formats` |
| フォーマットファイル一覧取得 | ✅ 実装済み | `GET /api/v1/formats/:folderName/files` |
| フォーマットフォルダ作成 | ✅ 実装済み | `POST /api/v1/formats/folders` |
| サブフォルダ作成 | ✅ 実装済み | `POST /api/v1/formats/subfolders` |
| フォーマットファイル作成 | ✅ 実装済み | `POST /api/v1/formats/:folderName/files` |
| フォーマットファイル更新 | ✅ 実装済み | `PUT /api/v1/formats/files` |
| フォーマットファイル編集 | ✅ 実装済み | （XMLエディタ・MAIMLエディタ） |
| **ファイルダウンロード（フォーマット）** | ❌ **未実装** | **なし** |
| **ファイル削除（フォーマット）** | ❌ **未実装** | **なし** |
| **ファイルダウンロード（プロジェクト）** | ✅ **実装済み** | `POST /files/download-url` |
| **ファイル削除（プロジェクト）** | ❌ **未実装** | **不明** |

---

## 💡 実装に必要な作業

## フォーマット管理画面

### Phase 1: バックエンドAPI実装

#### 1. ファイルダウンロードAPI

```typescript
// backend/src/routes/formatRoutes.ts に追加

/**
 * GET /api/v1/formats/files/download
 * フォーマットファイルダウンロード
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、読み取り専用（0）
 * 
 * クエリパラメータ:
 *   - filePath: ファイルパス（formats/{dept}/{folder}/{file}形式）
 */
router.get(
  '/files/download',
  authMiddleware,
  checkPermission('040000', 0),
  formatController.downloadFormatFile
);
```

**コントローラー実装例:**
- Swift/S3から署名付きURLを取得
- ファイル内容を取得してレスポンス
- Content-Dispositionヘッダーでファイル名を指定

#### 2. ファイル削除API

```typescript
// backend/src/routes/formatRoutes.ts に追加

/**
 * DELETE /api/v1/formats/files
 * フォーマットファイル削除
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、書込可（1）
 * 
 * リクエストボディ:
 *   - filePath: ファイルパス（formats/{dept}/{folder}/{file}形式）
 */
router.delete(
  '/files',
  authMiddleware,
  checkPermission('040000', 1),
  formatController.deleteFormatFile
);
```

**コントローラー実装例:**
- Swift/S3からファイルを削除
- トランザクション処理（必要に応じてDB記録も削除）

---

### Phase 2: フロントエンド実装

**参考実装**: プロジェクト管理画面の`FileListTable.tsx`を参考にする

#### 1. ダウンロード機能

```typescript
// frontend/src/components/project/FormatManagement.tsx に追加

const handleFileDownload = useCallback(async (file: FormatFileData) => {
  try {
    console.log('📥 ファイルダウンロード開始:', file.name);
    
    const client = createApiClient();
    
    // ダウンロードAPI呼び出し
    const response = await client.get('/formats/files/download', {
      params: { filePath: file.path },
      responseType: 'blob',
    });
    
    // Blobをダウンロード
    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success('ダウンロードしました');
  } catch (error) {
    console.error('❌ ダウンロードエラー:', error);
    message.error('ダウンロードに失敗しました');
  }
}, []);
```

```typescript
// FormatFileListTable に onDownload プロップを追加
<FormatFileListTable
  files={formatFiles}
  onDownload={handleFileDownload}  // ✅ 追加
  // ...
/>
```

#### 2. 削除機能

```typescript
// frontend/src/components/project/FormatManagement.tsx に追加

const handleFileDelete = useCallback(async (file: FormatFileData) => {
  modal.confirm({
    title: 'ファイル削除',
    content: `${file.name} を削除しますか？この操作は取り消せません。`,
    okText: '削除',
    okButtonProps: { danger: true },
    cancelText: 'キャンセル',
    onOk: async () => {
      try {
        console.log('🗑️ ファイル削除開始:', file.name);
        
        const client = createApiClient();
        
        // 削除API呼び出し
        await client.delete('/formats/files', {
          data: { filePath: file.path },
        });
        
        message.success('削除しました');
        
        // ファイル一覧を更新
        if (selectedFormatId && selectedFormat) {
          const fileResponse = await fetchFormatFiles(selectedFormatId, undefined);
          setFormatFilesData(prev => ({
            ...prev,
            [selectedFormatId]: {
              allFiles: (fileResponse.success && fileResponse.data?.files) 
                ? fileResponse.data.files as FormatFileData[] 
                : [],
            }
          }));
        }
      } catch (error) {
        console.error('❌ 削除エラー:', error);
        message.error('削除に失敗しました');
      }
    },
  });
}, [selectedFormatId, selectedFormat]);
```

```typescript
// FormatFileListTable の onDelete を handleFileDelete に変更
<FormatFileListTable
  files={formatFiles}
  onDelete={handleFileDelete}  // ✅ 変更
  // ...
/>
```

---

---

## プロジェクト管理画面

### 削除機能の実装

#### Phase 1: バックエンドAPI実装（必要な場合）

既存のファイル削除APIを確認し、なければ実装:

```typescript
// backend/src/routes/projectRoutes.ts に追加

/**
 * DELETE /api/v1/projects/:projectId/files
 * プロジェクトファイル削除
 * 
 * 認証: 必須（JWT + Session）
 * 権限: 実験管理者メニュー（040000）、書込可（1）
 * 
 * リクエストボディ:
 *   - filePath: ファイルパス
 */
router.delete(
  '/:projectId/files',
  authMiddleware,
  checkPermission('040000', 1),
  projectController.deleteProjectFile
);
```

#### Phase 2: フロントエンド実装

```typescript
// frontend/src/components/project/FileListTable.tsx に追加

const handleDeleteFile = async (file: ProjectFile) => {
  Modal.confirm({
    title: 'ファイル削除',
    content: `${file.name} を削除しますか？この操作は取り消せません。`,
    okText: '削除',
    okButtonProps: { danger: true },
    cancelText: 'キャンセル',
    onOk: async () => {
      try {
        const client = createApiClient();
        await client.delete(`/projects/${projectId}/files`, {
          data: { filePath: file.path },
        });
        message.success('削除しました');
        // ファイル一覧を更新
      } catch (error) {
        console.error('削除エラー:', error);
        message.error('削除に失敗しました');
      }
    },
  });
};

// 削除ボタンを追加
<Space size="small">
  <Button icon={<DownloadOutlined />}>ダウンロード</Button>
  <Button icon={<EyeOutlined />}>ビューア</Button>
  <Button 
    danger 
    icon={<DeleteOutlined />}
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteFile(record);
    }}
  >
    削除
  </Button>
</Space>
```

---

## 📋 実装推奨優先順位

### フォーマット管理画面

1. **Phase 1-1**: ダウンロードAPI実装（高優先度）
   - ファイルを確認できないと編集が困難
   
2. **Phase 1-2**: 削除API実装（高優先度）
   - 不要ファイルの管理が必要

3. **Phase 2-1**: フロントエンドダウンロード機能実装（中優先度）
   - APIが完成してから実装

4. **Phase 2-2**: フロントエンド削除機能実装（中優先度）
   - APIが完成してから実装

### プロジェクト管理画面

1. **Phase 1**: 削除API実装確認（中優先度）
   - 既存APIの有無を確認
   - なければ新規実装

2. **Phase 2**: フロントエンド削除ボタン実装（中優先度）
   - 削除ボタンの追加
   - 削除確認モーダルの実装

---

## 📊 画面別実装状況比較

| 画面 | ダウンロード | 削除 | 備考 |
|------|------------|------|------|
| **フォーマット管理** | ❌ 未実装 | ❌ 未実装 | 両方とも機能していない |
| **プロジェクト管理** | ✅ 実装済み | ❌ 未実装 | ダウンロードのみ動作 |

**実装優先度:**
1. フォーマット管理のダウンロード機能（高）
2. プロジェクト管理の削除機能（中）
3. フォーマット管理の削除機能（中）

---

## 🔗 関連ファイル

### フロントエンド
- `frontend/src/components/project/FormatManagement.tsx`
- `frontend/src/components/project/FormatFileListTable.tsx`
- `frontend/src/utils/formatApi.ts`

### バックエンド
- `backend/src/routes/formatRoutes.ts`
- `backend/src/controllers/formatController.ts`
- `backend/src/services/storageService.ts`

---

## 📝 備考

- 現在の実装では、ボタンは表示されているが実際には機能していない
- ユーザーがボタンをクリックしても何も起こらない（コンソールにログが出力されるのみ）
- 早急な実装が推奨される

---

**作成日**: 2026年2月26日 18:25  
**作成者**: Cline  
**調査対象バージョン**: 最新版（2026年2月26日時点）
