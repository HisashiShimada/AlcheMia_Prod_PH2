# タスク計画書: ファイルリネームAPI実装（バックエンドのみ）

## メタデータ
- **作成日時**: 2026-03-03 10:10
- **タスクID**: file-rename-api-only
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

**バックエンドのリネームAPI実装のみ**を行います。**リネームAPIは共通化し、プロジェクト管理画面でも使用できる汎用的な設計とします。** フロントエンドのUI実装（リネームボタン、モーダル）は今回の対象外とし、APIの完成を優先します。

## 2. 目的と期待される成果

### 目的
- **将来的にプロジェクトファイルでも同じAPIを使用できる汎用的な仕組みを構築する**
- 適切なバリデーションにより、システムの整合性を保つ
- S3/Swiftストレージ上のファイル名変更と組織内の一意性を保証する

### 期待される成果
- [ ] **共通リネームAPIエンドポイントが実装される**（PUT /api/v1/files/:fileId/rename）
- [ ] バリデーションルールが適用される
- [ ] S3/Swiftストレージでファイル移動が実行される
- [ ] file_metadataテーブルが更新される
- [ ] **プロジェクト管理画面・フォーマット管理画面の両方で使用可能**

## 3. 実装ステップ

### Phase 1: バックエンドAPI実装（共通化）
- [ ] **共通リネームAPIエンドポイントを作成**（PUT /api/v1/files/:fileId/rename）
  - [ ] フォーマットファイルとプロジェクトファイルの両方に対応
  - [ ] ファイルタイプ判定ロジックを実装（file_pathから判定）
  - [ ] **Routes内で直接バリデーションを実装**
    - [ ] ファイル名長チェック（1-255文字）
    - [ ] 使用可能文字チェック（英数字、日本語、ハイフン、アンダースコア、スペース、ピリオド）
    - [ ] 拡張子保持チェック（.maiml または該当拡張子）
    - [ ] 組織内一意性チェック（同一フォルダ内）
- [ ] リクエスト型定義を追加（backend/src/types/api.ts）
- [ ] コントローラー実装（backend/src/controllers/fileController.ts）
  - [ ] ファイルタイプに応じた処理分岐
  - [ ] フォーマットファイル用のリネーム処理
  - [ ] プロジェクトファイル用のリネーム処理（将来対応）
- [ ] リポジトリメソッド実装（backend/src/repositories/fileMetadataRepository.ts）
  - [ ] 汎用的なファイル情報取得・更新メソッド
- [ ] S3/Swiftファイル移動処理実装（backend/src/services/storageService.ts）
  - [ ] 汎用的なファイル移動メソッド（moveFile）

### Phase 2: テストとドキュメント
- [ ] バリデーションテストケース作成
- [ ] API統合テスト
- [ ] 手動テスト実施（curlコマンド等）
- [ ] APIドキュメント更新

## 4. 影響範囲

### 変更するファイル
1. **`backend/src/routes/fileRoutes.ts`** - **共通リネームエンドポイント追加（バリデーション含む）**
2. **`backend/src/controllers/fileController.ts`** - **汎用リネームコントローラー追加**
3. **`backend/src/repositories/fileMetadataRepository.ts`** - **汎用リネームリポジトリメソッド追加**
4. `backend/src/services/storageService.ts` - 汎用ファイル移動メソッド追加
5. `backend/src/types/api.ts` - リクエスト/レスポンス型定義追加

### 新規作成するファイル
なし（すべて既存ファイルへの追加）

### 影響を受ける機能
- S3/Swiftストレージのファイル管理
- file_metadataテーブルのレコード
- **将来: フォーマット管理画面とプロジェクト管理画面で使用**

## 5. 技術的詳細

### 共通化設計のポイント

#### ファイルタイプ判定
```typescript
// file_metadataテーブルのfile_pathから判定
function getFileType(filePath: string): 'format' | 'project' {
  if (filePath.startsWith('formats/')) {
    return 'format';
  } else if (filePath.startsWith('projects/')) {
    return 'project';
  }
  throw new Error('Unknown file type');
}
```

### バリデーションルール

#### ファイル名バリデーション（Routes内で実装）
```typescript
// Routes内でのバリデーション実装例
router.put('/files/:fileId/rename', auth, tenantIsolation, async (req, res) => {
  const { fileId } = req.params;
  const { newFileName } = req.body;
  
  // 1. 入力バリデーション
  if (!newFileName || newFileName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ファイル名を入力してください',
      validationErrors: ['ファイル名は必須です']
    });
  }
  
  // 2. ファイル名長: 1-255文字
  if (newFileName.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'ファイル名が長すぎます',
      validationErrors: ['ファイル名は255文字以内にしてください']
    });
  }
  
  // 3. 使用可能文字: 英数字、日本語、ハイフン、アンダースコア、スペース、ピリオド
  const validFilenamePattern = /^[\w\s\-\.ぁ-んァ-ヶー一-龯々]+$/;
  if (!validFilenamePattern.test(newFileName)) {
    return res.status(400).json({
      success: false,
      error: '使用できない文字が含まれています',
      validationErrors: ['ファイル名には英数字、日本語、ハイフン、アンダースコア、スペース、ピリオドのみ使用できます']
    });
  }
  
  // 4. 拡張子チェック（必要に応じて）
  // ...
  
  // コントローラーを呼び出し
  await fileController.renameFile(req, res);
});
```

#### 組織内一意性チェック
```sql
-- file_metadataテーブルで確認（同一フォルダ内）
SELECT COUNT(*) FROM file_metadata
WHERE organization_id = $1
  AND file_path = $2  -- 同一フォルダパス
  AND file_name = $3
  AND file_id != $4  -- 自分自身を除外
```

### API仕様（共通化）

#### リクエスト
```typescript
PUT /api/v1/files/:fileId/rename

interface RenameFileRequest {
  newFileName: string;  // 新しいファイル名（拡張子込み）
}
```

#### レスポンス
```typescript
interface RenameFileResponse {
  success: boolean;
  message: string;
  data?: {
    fileId: string;
    oldFileName: string;
    newFileName: string;
    oldPath: string;
    newPath: string;
    fileType: 'format' | 'project';  // ファイルタイプ
    organizationId: string;
  };
}
```

### ストレージ操作（汎用化）

S3/Swiftでのファイル移動:
```typescript
/**
 * 汎用ファイル移動メソッド
 */
async function moveFile(
  organizationId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const storageService = getStorageService();
  
  // 1. 既存ファイルを新しいキーにコピー
  const oldKey = `${organizationId}/${oldPath}`;
  const newKey = `${organizationId}/${newPath}`;
  
  await storageService.copyFile(oldKey, newKey);
  
  // 2. コピー成功を確認
  const exists = await storageService.fileExists(organizationId, newPath);
  if (!exists) {
    throw new Error('File copy failed');
  }
  
  // 3. 古いファイルを削除
  await storageService.deleteFile(organizationId, oldPath);
  
  // 4. file_metadataテーブルを更新（呼び出し元で実行）
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| S3/Swift操作中のエラー | 高 | 中 | トランザクション的な処理（コピー→確認→削除）、エラー時のロールバック |
| 同名ファイルの存在 | 中 | 中 | 事前に一意性チェック、明確なエラーメッセージ |
| 特殊文字によるパス問題 | 中 | 低 | 厳格なバリデーション、エンコード処理 |
| 同時編集による競合 | 中 | 低 | 楽観的ロック、最終更新日時チェック |
| 異なるファイルタイプの混在 | 中 | 低 | ファイルタイプ判定の徹底、明確なエラーメッセージ |

## 7. テスト計画

### ユニットテスト
- [ ] バリデーション関数のテスト
  - [ ] 有効なファイル名パターン
  - [ ] 無効な文字を含むファイル名
  - [ ] 長さ制限の境界値テスト
  - [ ] 拡張子チェック（.maiml, .xml等）
- [ ] ファイルタイプ判定のテスト
  - [ ] フォーマットファイル判定
  - [ ] プロジェクトファイル判定
- [ ] リポジトリメソッドのテスト
- [ ] ストレージサービスのテスト

### 統合テスト
- [ ] APIエンドポイントのテスト
  - [ ] 正常系: フォーマットファイル名変更成功
  - [ ] 正常系: プロジェクトファイル名変更成功（将来）
  - [ ] 異常系: 存在しないファイル
  - [ ] 異常系: 重複ファイル名
  - [ ] 異常系: 無効なファイル名
  - [ ] 異常系: 権限不足

### 手動テスト（curlコマンド）
```bash
# 正常系テスト
curl -X PUT http://localhost:3001/api/v1/files/file-id-123/rename \
  -H "Content-Type: application/json" \
  -H "Cookie: maiml_session=..." \
  -d '{"newFileName": "新しいファイル名.maiml"}'

# 異常系テスト: 無効な文字
curl -X PUT http://localhost:3001/api/v1/files/file-id-123/rename \
  -H "Content-Type: application/json" \
  -H "Cookie: maiml_session=..." \
  -d '{"newFileName": "invalid/name.maiml"}'

# 異常系テスト: 拡張子なし
curl -X PUT http://localhost:3001/api/v1/files/file-id-123/rename \
  -H "Content-Type: application/json" \
  -H "Cookie: maiml_session=..." \
  -d '{"newFileName": "noextension"}'
```

## 8. ロールバック計画

問題が発生した場合:
1. バックエンドAPIエンドポイントを無効化
2. データベースの変更をロールバック（必要な場合）
3. S3/Swiftの変更はバックアップから復元（必要な場合）

## 9. 関連ドキュメント

- [S3フォルダ構成定義](.clinerules/references/s3_structure.md)
- [TypeScript型定義規約](.clinerules/development/typescript.md)
- [データベース操作規約](.clinerules/development/database.md)
- [セキュリティ規約](.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-03-03 10:10
- **承認日時**: （承認待ち）
- **承認者コメント**: リネームAPIを共通化、今回はバックエンドAPIのみ実装

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
- フロントエンド実装を削除し、バックエンドAPIのみに絞る
- API設計を共通化し、フォーマットファイルとプロジェクトファイルの両方に対応
- ファイルタイプ判定ロジックを追加

### 発生した問題と解決方法
（実施後に記録）

### 最終的な成果物
（実施後に記録）

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
