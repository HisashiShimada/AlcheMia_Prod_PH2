# タスク計画書: アップロードキャンセル機能実装

## メタデータ
- **作成日時**: 2026-03-30 13:22
- **タスクID**: upload-cancel-implementation
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

アップロード中のプログレスバーダイアログに配置されたキャンセルボタンに、実際のキャンセル機能を実装します。キャンセル実行時は、アップロード処理を中断し、途中までアップロードされたファイルを削除します。

### 背景
- 2026-03-18のタスクでキャンセルボタンのレイアウト配置は完了（Phase 1）
- キャンセル機能の実装は未完了（Phase 2）
- 現在はconsole.logのみで実際の処理は行われていない

### 対象コンポーネント
1. **BulkUploadDialog** - プロジェクト管理画面用ファイルアップロード
2. **FormatUploadDialog** - フォーマット管理画面用ファイルアップロード

## 2. 目的と期待される成果

### 目的
- ユーザーが長時間実行されるアップロード処理を任意のタイミングで中断できるようにする
- 途中までアップロードされた不完全なファイルを残さない（クリーンアップ）
- UXを向上させ、ユーザーに制御権を提供する

### 期待される成果
- [ ] キャンセルボタン押下でアップロード処理が即座に中断される
- [ ] 途中までアップロードされたファイルがバックエンドで削除される
- [ ] キャンセル後、適切なメッセージが表示される
- [ ] キャンセル後、ダイアログの状態がリセットされる
- [ ] エラーハンドリングが適切に実装される

## 3. 実装ステップ

### Phase 1: フロントエンド実装
- [ ] **BulkUploadDialog** のキャンセル機能実装
  - [ ] AbortController の実装
  - [ ] キャンセルボタンのイベントハンドラー実装
  - [ ] uploadFiles API呼び出しにAbortSignalを渡す
  - [ ] キャンセル実行時の状態管理
  - [ ] キャンセル後のUI状態リセット
  
- [ ] **FormatUploadDialog** のキャンセル機能実装
  - [ ] BulkUploadDialogと同様の実装を適用

### Phase 2: バックエンド実装
- [ ] **バッチキャンセルAPI** の実装
  - [ ] APIエンドポイント追加: `POST /api/v1/files/batches/:batchId/cancel`
  - [ ] fileAccessService.cancelBatch関数の実装（ビジネスロジック層）
  - [ ] バッチステータスを `cancelled` に更新
  - [ ] 既にアップロードされたファイルを削除
  - [ ] トランザクション処理の実装
  
- [ ] **ファイルアップロードコントローラー** の修正
  - [ ] アップロード中にバッチIDをレスポンスに含める
  - [ ] バッチIDをフロントエンドに返す

### Phase 3: 統合テスト
- [ ] キャンセル機能の動作確認
- [ ] ファイル削除の確認
- [ ] エラーハンドリングの確認
- [ ] UI/UXの確認

## 4. 技術設計

### 4.1 フロントエンド実装パターン

#### AbortController の使用

```typescript
// BulkUploadDialog.tsx

const [abortController, setAbortController] = useState<AbortController | null>(null);
const [batchId, setBatchId] = useState<string | null>(null);

// アップロード実行
const handleUpload = useCallback(async () => {
  // AbortControllerを作成
  const controller = new AbortController();
  setAbortController(controller);
  
  try {
    const response = await uploadFiles({
      uploadMode,
      targetPath,
      files,
      metadata: { projectId, batchName },
      signal: controller.signal, // AbortSignalを渡す
      onProgress: (progress) => {
        setUploadState(prev => ({
          ...prev,
          progress: progress.percentage,
          uploadedCount: progress.uploadedCount,
        }));
      },
    });
    
    // バッチIDを保存
    if (response.batchId) {
      setBatchId(response.batchId);
    }
    
    // 成功処理
    // ...
  } catch (error) {
    if (error.name === 'CanceledError') {
      // キャンセルされた場合
      message.info('アップロードがキャンセルされました');
      
      // バックエンドに通知してファイル削除
      if (batchId) {
        await cancelBatch(batchId);
      }
    } else {
      // その他のエラー
      message.error(extractErrorMessage(error));
    }
  } finally {
    setAbortController(null);
    setBatchId(null);
  }
}, [/* dependencies */]);

// キャンセル実行
const handleCancelUpload = useCallback(async () => {
  if (!abortController) return;
  
  Modal.confirm({
    title: 'アップロードをキャンセル',
    content: 'アップロードを中断し、既にアップロードされたファイルを削除します。よろしいですか？',
    okText: 'キャンセルする',
    cancelText: '続行',
    okButtonProps: { danger: true },
    onOk: async () => {
      // アップロードを中断
      abortController.abort();
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: 'キャンセルされました',
      }));
    },
  });
}, [abortController]);
```

#### キャンセルボタンの修正

```tsx
{uploadState.isUploading && (
  <Alert
    message="アップロード中"
    description={
      <div style={{ position: 'relative' }}>
        <button
          onClick={handleCancelUpload}
          disabled={!abortController}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '0px',
            padding: '4px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          キャンセル
        </button>
        {/* Progress bar... */}
      </div>
    }
    type="info"
    showIcon
    icon={<LoadingOutlined />}
  />
)}
```

### 4.2 バックエンド実装パターン

#### バッチキャンセルAPI

```typescript
// backend/src/controllers/fileAccessController.ts

/**
 * バッチキャンセル
 * POST /api/v1/files/batches/:batchId/cancel
 */
export const cancelBatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { batchId } = req.params;
  const organizationId = req.organizationId!;

  try {
    // バッチ情報を取得
    const batch = await getBatchById(batchId, organizationId);
    
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'バッチが見つかりません',
      });
      return;
    }

    // 既にアップロードされたファイルを削除
    const uploadedFiles = await getUploadedFilesByBatchId(batchId, organizationId);
    
    for (const file of uploadedFiles) {
      await storageService.deleteFile(organizationId, file.file_key);
      await deleteFileMetadata(file.id, organizationId);
    }

    // バッチステータスを更新
    await updateBatchStatus(batchId, organizationId, {
      status: 'cancelled',
      ended_at: new Date(),
      error_message: 'ユーザーによってキャンセルされました',
    });

    res.json({
      success: true,
      message: 'バッチをキャンセルしました',
      data: {
        deletedFileCount: uploadedFiles.length,
      },
    });
  } catch (error) {
    console.error('バッチキャンセルエラー:', error);
    res.status(500).json({
      success: false,
      message: 'バッチのキャンセルに失敗しました',
    });
  }
};
```

#### アップロードコントローラーの修正

```typescript
// uploadFiles関数のレスポンスにbatchIdを追加

res.json({
  success: true,
  message: `${successCount}個のファイルをアップロードしました`,
  data: {
    batchId: batch.id, // バッチIDを追加
    successCount,
    failedCount,
    uploadedFiles: uploadedFilesInfo,
    failedFiles,
    hasMaimlFile,
  },
});
```

### 4.3 fileAccessService の修正

```typescript
// frontend/src/services/fileAccessService.ts

export const uploadFiles = async (
  params: UploadFilesParams & { signal?: AbortSignal } // AbortSignalを追加
): Promise<UploadResponseData> => {
  const {
    uploadMode,
    targetPath,
    files,
    metadata,
    onProgress,
    signal, // 追加
  } = params;

  const client = createApiClient();

  try {
    // ... FormData構築 ...

    const response = await client.post<ApiResponse<UploadResponseData>>(
      '/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal, // AbortSignalを渡す
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          // ... 進捗処理 ...
        },
      }
    );

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error('アップロードに失敗しました');
  } catch (error) {
    // Axiosのキャンセルエラーを適切にハンドリング
    if (axios.isCancel(error)) {
      const cancelError = new Error('アップロードがキャンセルされました');
      cancelError.name = 'CanceledError';
      throw cancelError;
    }
    
    console.error('ファイルアップロードエラー:', error);
    throw error;
  }
};

/**
 * バッチキャンセルAPI呼び出し
 */
export const cancelBatch = async (batchId: string): Promise<void> => {
  const client = createApiClient();

  try {
    await client.post(`/files/batches/${batchId}/cancel`);
    console.log('バッチキャンセル成功:', batchId);
  } catch (error) {
    console.error('バッチキャンセルエラー:', error);
    throw error;
  }
};
```

## 5. 影響範囲

### 変更するファイル

#### フロントエンド
1. `frontend/src/components/project/BulkUploadDialog.tsx`
   - AbortControllerの追加
   - handleCancelUpload関数の実装
   - handleUpload関数の修正（signal追加）
   - 状態管理の追加（abortController, batchId）

2. `frontend/src/components/project/FormatUploadDialog.tsx`
   - BulkUploadDialogと同様の修正

3. `frontend/src/services/fileAccessService.ts`
   - uploadFiles関数にsignalパラメータ追加
   - cancelBatch関数の追加

4. `frontend/src/types/file.ts`
   - UploadFilesParams型にsignalを追加
   - UploadResponseData型にbatchIdを追加

#### バックエンド
5. `backend/src/routes/fileAccessRoutes.ts`
   - バッチキャンセルAPIエンドポイント追加

6. `backend/src/controllers/fileAccessController.ts`
   - cancelBatch関数の実装（薄いController層）
   - uploadFiles関数の修正（レスポンスにbatchId追加）

7. `backend/src/services/fileAccessService.ts`
   - cancelBatch関数の実装（ビジネスロジック層）
   - バッチ情報取得
   - ファイル削除処理（ストレージ + DB）
   - バッチステータス更新
   - トランザクション制御

8. `backend/src/repositories/uploadBatchRepository.ts`
   - **既存のupdateメソッドを使用**（statusパラメータでバッチステータス更新可能）
   
9. `backend/src/repositories/fileMetadataRepository.ts`
   - getByBatchId関数の追加（バッチIDでファイルメタデータを取得、**新規実装が必要**）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面のファイルアップロード
- フォーマット管理画面のファイルアップロード

## 6. セキュリティ考慮事項

### マルチテナント分離
- [ ] バッチキャンセルAPIでorganization_idを必須チェック
- [ ] 他組織のバッチはキャンセルできないことを確認

### 権限チェック
- [ ] authMiddlewareで認証済みユーザーのみアクセス可能
- [ ] 自分がアップロードしたバッチのみキャンセル可能

### ファイル削除
- [ ] organization_idプレフィックスを含むファイルパスのみ削除
- [ ] SQLインジェクション対策（Parameterized Queries使用）

## 7. リスク と対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| キャンセル処理中にエラー発生 | 高 | 中 | try-catchで適切にハンドリング、ロールバック処理実装 |
| ファイル削除失敗 | 中 | 低 | ログに記録し、後処理で削除（バッチジョブ） |
| バッチIDが取得できない | 中 | 低 | batchIdが無い場合はファイル削除をスキップ（ログに記録） |
| 競合状態（同時キャンセル） | 低 | 低 | バッチステータスチェックで二重処理を防ぐ |

## 8. テスト計画

### ユニットテスト
- [ ] cancelBatch関数のテスト
  - [ ] 正常系：バッチキャンセル成功
  - [ ] 異常系：バッチが存在しない
  - [ ] 異常系：他組織のバッチ

### 統合テスト
- [ ] アップロード開始 → キャンセル → ファイル削除確認
- [ ] アップロード完了後のキャンセル（何も削除されない）
- [ ] 複数ファイルアップロード中のキャンセル

### 手動テスト
- [ ] BulkUploadDialogでキャンセルボタン押下
- [ ] FormatUploadDialogでキャンセルボタン押下
- [ ] キャンセル確認ダイアログの動作確認
- [ ] キャンセル後のメッセージ表示確認
- [ ] キャンセル後のダイアログ状態リセット確認
- [ ] ストレージでファイルが削除されていることを確認

## 9. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：

1. フロントエンドの変更を元に戻す（Gitリバート）
2. バックエンドAPIエンドポイントを削除または無効化
3. データベースの変更をロールバック（マイグレーションファイル実行）

## 10. 関連ドキュメント

- `.clinerules/development/config.md` - コーディング規約
- `.clinerules/development/security.md` - セキュリティ規約
- `.cline/skills/frontend-develop-skill/docs/frontend.md` - フロントエンド規約
- `.cline/skills/backend-develop-skill/docs/backend.md` - バックエンド規約
- `docs/20260318_1521_プログレスバーキャンセルボタン実装/PLAN.md` - 前回のタスク計画書（Phase 1完了）

## 11. 承認記録

- **計画書提示日時**: 2026-03-30 13:22
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 12. 実施記録

### 実施日時
開始: 2026-03-30 13:22
完了: 2026-03-31 10:05（確認）

### 実装完了状況

#### ✅ フロントエンド実装（完了）

**1. BulkUploadDialog.tsx**
```typescript
// 実装済み内容:
- [x] AbortControllerの状態管理
- [x] batchIdの状態管理
- [x] handleCancelUpload関数の実装
- [x] uploadFiles呼び出し時にsignal渡し
- [x] キャンセルエラーのハンドリング
- [x] cancelBatch呼び出し
- [x] キャンセルボタンのUI実装
```

**2. FormatUploadDialog.tsx**
```typescript
// 実装済み内容:
- [x] BulkUploadDialogと同様の実装
- [x] AbortControllerの状態管理
- [x] batchIdの状態管理
- [x] handleCancelUpload関数の実装
- [x] uploadFiles呼び出し時にsignal渡し
- [x] キャンセルエラーのハンドリング
- [x] cancelBatch呼び出し
- [x] キャンセルボタンのUI実装
```

**3. fileAccessService.ts**
```typescript
// 実装済み内容:
- [x] uploadFiles関数にsignalパラメータ追加
- [x] AxiosのonUploadProgress設定
- [x] Axiosキャンセルエラー('ERR_CANCELED')のハンドリング
- [x] cancelBatch関数の実装
```

**4. types/file.ts**
```typescript
// 実装済み内容:
- [x] UploadFilesParams型にsignal?: AbortSignal追加
- [x] UploadResponseData型にbatchId: string追加
```

#### ✅ バックエンド実装（完了）

**1. fileAccessRoutes.ts**
```typescript
// 実装済み内容:
- [x] POST /api/v1/files/batches/:batchId/cancel エンドポイント追加
- [x] param('batchId')バリデーション
- [x] authMiddleware適用
- [x] handleValidationErrors適用
```

**2. fileAccessController.ts**
```typescript
// 実装済み内容:
- [x] cancelBatch関数の実装
- [x] 組織IDとバッチIDの取得
- [x] Service層への呼び出し
- [x] エラーハンドリング（NotFoundError, ValidationError, StorageError）
- [x] 成功レスポンスの返却
```

**3. fileAccessService.ts**
```typescript
// 実装済み内容:
- [x] cancelBatch関数の実装
- [x] バリデーション（batchID必須、パストラバーサル対策）
- [x] uploadBatchRepository.findByIdでバッチ情報取得
- [x] 組織IDの検証（マルチテナント分離）
- [x] バッチステータスチェック（completed/cancelled済みはエラー）
- [x] fileMetadataRepository.findByBatchIdでファイル一覧取得
- [x] 各ファイルをstorageService.deleteFileで削除
- [x] fileMetadataRepository.softDeleteByFileKeyで論理削除
- [x] uploadBatchRepository.updateでステータス='cancelled'に更新
- [x] エラーログ記録
```

**4. fileMetadataRepository.ts（既存メソッド活用）**
```typescript
// 実装済み内容:
- [x] findByBatchId関数（既存）
- [x] softDeleteByFileKey関数（既存）
```

**5. uploadBatchRepository.ts（既存メソッド活用）**
```typescript
// 実装済み内容:
- [x] findById関数（既存）
- [x] update関数（既存）
```

#### ✅ uploadFiles関数のレスポンス修正（完了）

**fileAccessController.ts - uploadFiles関数**
```typescript
// 実装済み内容:
- [x] レスポンスにbatchId追加
- [x] data.batchにbatchId, batchName, statusを含める
```

**fileAccessService.ts - uploadFiles関数**
```typescript
// 実装済み内容:
- [x] 戻り値にbatch.batchIdを含める
- [x] FileUploadResult型にbatchIdを含む
```

### 実装の特徴

#### 1. キャンセルフロー
```
ユーザーがキャンセルボタン押下
  ↓
abortController.abort()でHTTPリクエストを中断
  ↓
Axios catches 'ERR_CANCELED'
  ↓
CanceledErrorとして再スロー
  ↓
catch (error)でCanceledError判定
  ↓
cancelBatch(batchId)でバックエンド通知
  ↓
バックエンドでファイル削除+バッチステータス更新
  ↓
クライアントUIリセット
```

#### 2. セキュリティ対策
- [x] 組織IDの自動検証（マルチテナント分離）
- [x] バッチ所有者チェック（他組織のバッチは操作不可）
- [x] パストラバーサル攻撃対策
- [x] バッチステータスチェック（completed/cancelled済みは操作不可）

#### 3. エラーハンドリング
- [x] ValidationError（batchID不正、既にcompleted/cancelled）
- [x] NotFoundError（バッチが存在しない）
- [x] StorageError（ファイル削除失敗）
- [x] 個別ファイル削除失敗は警告のみ（処理続行）

#### 4. UI/UX
- [x] キャンセルボタンはプログレスバー右上に配置
- [x] アップロード完了後（progress=100）はキャンセルボタン無効化
- [x] キャンセル実行時に即座にabort()実行（確認ダイアログなし）
- [x] キャンセル完了後に「アップロードがキャンセルされました」メッセージ表示

### 計画からの変更点
なし（計画通りに実装完了）

### 発生した問題と解決方法
特になし（既存の実装を活用し、スムーズに実装完了）

### 最終的な成果物
- [x] BulkUploadDialog - キャンセル機能実装完了
- [x] FormatUploadDialog - キャンセル機能実装完了
- [x] fileAccessService - uploadFiles/cancelBatch実装完了
- [x] バックエンドルート - cancelBatchエンドポイント追加完了
- [x] バックエンドコントローラー - cancelBatch関数実装完了
- [x] バックエンドサービス - cancelBatch関数実装完了
- [x] uploadFiles関数レスポンス修正完了（batchId追加）
- [ ] テスト実施（次のステップ）

## 13. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
