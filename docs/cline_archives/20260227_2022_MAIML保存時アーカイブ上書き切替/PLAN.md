# タスク計画書: MAIML保存時アーカイブ/上書き切替機能

## メタデータ
- **作成日時**: 2026-02-27 20:22
- **タスクID**: maiml-save-archive-toggle
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

MAIML編集画面からの保存処理で、アーカイブ化（archive/フォルダへバックアップ作成）と上書き保存を切り替えられるようにする。

**現在の動作:**
- 保存時は常にアーカイブ化（既存ファイルをarchive/フォルダへ移動してから新ファイル保存）

**要望:**
- **プロジェクト管理からの編集**: アーカイブ化（従来通り）
- **フォーマット管理からの編集**: 上書き保存（アーカイブ化しない）

## 2. 目的と期待される成果

### 目的
- プロジェクトファイルとフォーマットファイルで異なる保存動作を実現
- フォーマット管理では履歴を残さず最新版のみ管理

### 期待される成果
- [x] バックエンドに`archive`パラメータ追加
- [ ] フロントエンドで`editMode`に応じて`archive`パラメータ設定
- [ ] アーカイブ化/上書きの条件分岐実装
- [ ] 動作テスト

## 3. 実装ステップ

### Phase 1: バックエンドAPI修正
- [ ] `maimlRoutes.ts`: `/maiml/save`エンドポイントに`archive`パラメータ追加
- [ ] `maimlController.ts`: `save()`で`archive`パラメータ受け取り
- [ ] `maimlService.ts`: `saveMaiML()`に`archive`パラメータ追加し条件分岐

### Phase 2: フロントエンド修正
- [ ] `PetriNetEditorInner.tsx`: `handleSaveConfirmAction()`で`editMode`判定
- [ ] `maimlApiService.ts`: `saveMaiml()`に`archive`パラメータ追加

### Phase 3: テスト
- [ ] プロジェクト管理からの保存でアーカイブ化確認
- [ ] フォーマット管理からの保存で上書き確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/routes/maimlRoutes.ts`
   - `/maiml/save`エンドポイントのバリデーション追加

2. `backend/src/controllers/maimlController.ts`
   - `save()`関数で`archive`パラメータ取得・転送

3. `backend/src/services/maimlService.ts`
   - `saveMaiML()`関数の引数に`archive`追加
   - `createBackup()`呼び出しの条件分岐

4. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - `handleSaveConfirmAction()`で`editMode`判定
   - `maimlService.saveMaiml()`呼び出しに`archive`パラメータ追加

5. `frontend/src/services/maimlApiService.ts`
   - `saveMaiml()`関数の引数に`archive`追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- MAIML保存機能
- プロジェクト管理画面
- フォーマット管理画面

## 5. 技術的詳細

### バックエンド実装

#### maimlRoutes.ts
```typescript
body('archive')
  .optional()
  .isBoolean()
  .withMessage('archiveはbooleanである必要があります'),
```

#### maimlController.ts
```typescript
export async function save(req: Request, res: Response): Promise<void> {
  try {
    const { fileKey, content, archive = true } = req.body; // デフォルトtrue（従来通り）
    const organizationId = req.user!.organizationId;
    
    const decodedContent = decodeBase64Content(content);
    
    const result = await maimlService.saveMaiML(fileKey, decodedContent, organizationId, archive);
    
    res.json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    handleError(res, error, 'MAIML保存エラー');
  }
}
```

#### maimlService.ts
```typescript
export async function saveMaiML(
  fileKey: string,
  content: string,
  organizationId: string,
  archive: boolean = true // デフォルトtrue
): Promise<maimlSaveResult> {
  try {
    // アーカイブ化するかどうか判定
    if (archive) {
      await createBackup(fileKey, organizationId);
    }
    
    // S3/Swiftアップロード
    await uploadFileWithRetry(/* ... */);
    
    // ... 残りの処理
  }
}
```

### フロントエンド実装

#### PetriNetEditorInner.tsx
```typescript
const handleSaveConfirmAction = useCallback(async (action: string, saveDestination: string, folder?: string) => {
  // ...
  
  // editModeに応じてarchiveフラグを決定
  const shouldArchive = editMode === 'project'; // プロジェクトの場合true、フォーマットの場合false
  
  const response = await maimlService.saveMaiml(fileKey, base64Data, shouldArchive);
  
  // ...
}, [editMode]);
```

#### maimlApiService.ts
```typescript
export const saveMaiml = async (
  fileKey: string,
  content: string,
  archive: boolean = true // デフォルトtrue（後方互換性）
): Promise<ApiResponse<SaveMaimlResult>> => {
  const client = createApiClient();
  
  try {
    const response = await client.post<ApiResponse<SaveMaimlResult>>(
      '/maiml/save',
      { fileKey, content, archive }
    );
    
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| archiveパラメータ未指定時の動作 | 中 | 低 | デフォルト値`true`で従来通りの動作を保証 |
| editModeの判定ミス | 中 | 低 | editModeが'project'か'format'かを明確に判定 |
| 既存の保存処理への影響 | 高 | 低 | デフォルト値により既存コードは変更不要 |

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト管理からMAIML編集→保存→archive/フォルダに旧ファイル確認
- [ ] フォーマット管理からMAIML編集→保存→archive/フォルダに旧ファイルなし確認
- [ ] 新規ファイル作成時（既存ファイルなし）→エラーなく保存完了

### 確認ポイント
- [ ] プロジェクトモード: `createBackup()`が実行される
- [ ] フォーマットモード: `createBackup()`がスキップされる
- [ ] エラーハンドリングが正常に動作する

## 8. ロールバック計画

変更箇所が限定的なため、以下の手順でロールバック可能：
1. 変更したファイルをGitで元に戻す
2. バックエンド・フロントエンドを再起動

## 9. 関連ドキュメント

- `backend/src/services/maimlService.ts` - MAIML保存処理
- `backend/src/routes/maimlRoutes.ts` - MAIMLルート定義
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - MAIML編集画面
- `frontend/src/services/maimlApiService.ts` - MAIML API通信

## 10. 承認記録

- **計画書提示日時**: 2026-02-27 20:22
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] バックエンドAPI修正完了
- [ ] フロントエンド修正完了
- [ ] 動作テスト完了

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
