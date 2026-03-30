# タスク計画書: storageService削除メソッド実装

## メタデータ
- **作成日時**: 2026-03-25 13:01
- **タスクID**: storageService-delete-folder-recursive
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト削除時に実際のストレージ上のフォルダが削除されていない問題を修正する。

**根本原因**:
`storageService.ts`に`deleteFolderRecursive()`メソッドが実装されていないため、`fileAccessService.ts`や`projectService.ts`から呼び出しても実際のファイル削除が行われていない。

## 2. 目的と期待される成果

### 目的
- ストレージサービスにフォルダ再帰削除機能を実装
- プロジェクト削除時に実際のファイルが削除されるようにする

### 期待される成果
- [x] 問題の特定完了
- [ ] `storageService.ts`に`deleteFolderRecursive()`メソッドを実装
- [ ] 既存の呼び出し元（`fileAccessService.ts`、`projectService.ts`）が正常に動作する
- [ ] プロジェクト削除時にストレージ上のファイルが確実に削除される

## 3. 実装ステップ

### Phase 1: storageServiceへのメソッド追加
- [x] `storageService.ts`に`deleteFolderRecursive()`メソッドを実装
  - フォルダパス配下のすべてのファイルを取得（`listFiles`使用）
  - 各ファイルを削除（`deleteFile`使用）
  - 削除されたファイル数を返す
  - エラーハンドリング

### Phase 2: 動作確認
- [x] 既存の呼び出し元との整合性確認
- [ ] プロジェクト削除フローの動作確認（手動テスト必要）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/storageService.ts` - `deleteFolderRecursive()`メソッド追加

### 変更不要のファイル（既に呼び出し実装済み）
- `backend/src/services/fileAccessService.ts` - 既に`storageService.deleteFolderRecursive()`を呼び出している
- `backend/src/services/projectService.ts` - 既に`fileAccessService.deleteFolderRecursive()`を呼び出している

## 5. 技術的詳細

### 実装方針
```typescript
/**
 * フォルダを再帰的に削除
 * @param organizationId 組織ID
 * @param folderPath フォルダパス（相対パス）
 * @returns 削除されたファイル数
 */
async deleteFolderRecursive(
  organizationId: string,
  folderPath: string
): Promise<number> {
  // 1. フォルダパスの正規化
  // 2. フォルダ配下のファイル一覧を取得
  // 3. 各ファイルを削除
  // 4. 削除されたファイル数を返す
}
```

### 参考実装
- `listFiles()` - ファイル一覧取得（既存）
- `deleteFile()` - 単一ファイル削除（既存）
- `fileAccessService.ts`の`deleteFolderRecursive()`の呼び出し方

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 一部ファイルの削除失敗 | 中 | 中 | 削除エラーをログに記録し、成功した件数を返す |
| パフォーマンス問題（大量ファイル） | 中 | 低 | 並列削除または分割処理を検討 |
| 不正なフォルダパス | 高 | 低 | パストラバーサル攻撃対策（既存のbuildKey()で対応済み） |

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト作成
- [ ] プロジェクトにファイルをアップロード
- [ ] プロジェクト削除実行
- [ ] ストレージ上のファイルが削除されたことを確認

## 8. 承認記録

- **計画書提示日時**: 2026-03-25 13:01
- **承認日時**: 2026-03-25 13:11
- **承認者コメント**: 承認。実装を進めてください

## 9. 実施記録

### 実施日時
- 開始: 2026-03-25 13:11
- 完了: 2026-03-25 13:15

### 実装内容
`backend/src/services/storageService.ts`に`deleteFolderRecursive()`メソッドを追加：

```typescript
async deleteFolderRecursive(
  organizationId: string,
  folderPath: string
): Promise<number>
```

**実装の特徴:**
1. フォルダパス配下のすべてのファイルを取得（`listFiles()`使用）
2. 各ファイルを順次削除（`deleteFile()`使用）
3. フォルダマーカー（'/'で終わるキー）はスキップ
4. 個別ファイルの削除エラーはログ記録して続行
5. 削除成功数と失敗数をログ出力
6. 削除進捗を10ファイルごとに表示

### 修正箇所
- **ファイル**: `backend/src/services/storageService.ts`
- **追加行数**: 約80行
- **変更内容**: `deleteFolderRecursive()`メソッドの新規追加

### 動作確認
- TypeScriptコンパイルエラーなし
- 既存の呼び出し元（`fileAccessService.ts`、`projectService.ts`）との整合性確認完了
- 手動テストは未実施（次のステップで実施推奨）

### 最終的な成果物
- [x] `storageService.ts`に`deleteFolderRecursive()`メソッド実装完了
- [x] 既存の呼び出し元との整合性確認完了
- [ ] プロジェクト削除時にストレージ上のファイルが削除される（手動テスト必要）

## 10. 振り返り

### うまくいった点
- シンプルで分かりやすい実装ができた
- 既存の`listFiles()`と`deleteFile()`を活用して実装を効率化できた
- 削除進捗のログ出力により、大量ファイル削除時の状況が把握しやすくなった

### 改善が必要な点
- 大量ファイル削除時のパフォーマンス検証が必要
- 並列削除処理の検討

### 学んだこと
- 既存メソッドの組み合わせによる効率的な実装方法
- 削除処理のエラーハンドリングの重要性
- ログ出力による進捗管理の有効性

---

## 実装内容まとめ

### 変更ファイル
- `backend/src/services/storageService.ts` - `deleteFolderRecursive()`メソッド追加

### 実装詳細

#### deleteFolderRecursive() メソッドの実装

**実装コード:**
```typescript
// backend/src/services/storageService.ts

/**
 * フォルダを再帰的に削除
 * 
 * @param organizationId 組織ID
 * @param folderPath フォルダパス（相対パス）
 * @returns 削除されたファイル数
 */
async deleteFolderRecursive(
  organizationId: string,
  folderPath: string
): Promise<number> {
  logger.info('🗑️ [deleteFolderRecursive] フォルダ削除開始', {
    organizationId,
    folderPath
  });
  
  // 1. フォルダパスの正規化（末尾のスラッシュを削除）
  const normalizedPath = folderPath.endsWith('/') 
    ? folderPath.slice(0, -1) 
    : folderPath;
  
  // 2. フォルダ配下のファイル一覧を取得
  const files = await this.listFiles(organizationId, normalizedPath);
  
  logger.info('📋 [deleteFolderRecursive] 削除対象ファイル一覧取得完了', {
    organizationId,
    folderPath: normalizedPath,
    fileCount: files.length
  });
  
  if (files.length === 0) {
    logger.info('✅ [deleteFolderRecursive] 削除対象ファイルなし', {
      organizationId,
      folderPath: normalizedPath
    });
    return 0;
  }
  
  // 3. 各ファイルを削除
  let deletedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // フォルダマーカー（'/'で終わるキー）はスキップ
    if (file.key.endsWith('/')) {
      logger.debug('⏭️ [deleteFolderRecursive] フォルダマーカーをスキップ', {
        key: file.key
      });
      continue;
    }
    
    try {
      await this.deleteFile(organizationId, file.key);
      deletedCount++;
      
      // 10ファイルごとに進捗を表示
      if ((i + 1) % 10 === 0 || (i + 1) === files.length) {
        logger.info('📊 [deleteFolderRecursive] 削除進捗', {
          organizationId,
          folderPath: normalizedPath,
          progress: `${i + 1}/${files.length}`,
          deletedCount,
          failedCount
        });
      }
    } catch (error) {
      failedCount++;
      logger.error('❌ [deleteFolderRecursive] ファイル削除エラー（続行）', {
        error,
        fileKey: file.key,
        organizationId
      });
    }
  }
  
  logger.info('✅ [deleteFolderRecursive] フォルダ削除完了', {
    organizationId,
    folderPath: normalizedPath,
    totalFiles: files.length,
    deletedCount,
    failedCount
  });
  
  return deletedCount;
}
```

### 実装の特徴

#### 1. フォルダパスの正規化
```typescript
const normalizedPath = folderPath.endsWith('/') 
  ? folderPath.slice(0, -1) 
  : folderPath;
```
- 末尾のスラッシュを削除して一貫性を保つ
- 例: `projects/sample_project/` → `projects/sample_project`

#### 2. 既存メソッドの活用
- **ファイル一覧取得**: `listFiles()` を使用
- **単一ファイル削除**: `deleteFile()` を使用
- 新規実装を最小限に抑え、既存の動作確認済みメソッドを再利用

#### 3. フォルダマーカーのスキップ
```typescript
if (file.key.endsWith('/')) {
  continue;  // フォルダマーカーはスキップ
}
```
- S3/Swiftでは空フォルダを表現するために'/'で終わるキーを使用
- これらは実際のファイルではないためスキップ

#### 4. エラーハンドリング
```typescript
try {
  await this.deleteFile(organizationId, file.key);
  deletedCount++;
} catch (error) {
  failedCount++;
  logger.error('ファイル削除エラー（続行）', { error, fileKey: file.key });
}
```
- 個別ファイルの削除失敗でも処理を続行
- 失敗したファイルはログに記録
- 成功数と失敗数を集計

#### 5. 削除進捗のログ出力
```typescript
if ((i + 1) % 10 === 0 || (i + 1) === files.length) {
  logger.info('削除進捗', {
    progress: `${i + 1}/${files.length}`,
    deletedCount,
    failedCount
  });
}
```
- 10ファイルごと、または最後のファイル時に進捗を表示
- 大量ファイル削除時の進行状況を把握しやすくする

### 処理フロー

```
deleteFolderRecursive(organizationId, folderPath)
  ↓
1. フォルダパスの正規化
  ↓
2. listFiles() でファイル一覧を取得
  ↓
3. ファイル数が0の場合は早期リターン
  ↓
4. 各ファイルをループ処理
  ├─ フォルダマーカー（'/'で終わる）はスキップ
  ├─ deleteFile() で削除
  ├─ 成功 → deletedCount++
  └─ 失敗 → failedCount++ + ログ記録（処理続行）
  ↓
5. 削除結果をログ出力
  ↓
6. 削除成功数を返す
```

### 呼び出し元との連携

#### fileAccessService.ts から呼び出し
```typescript
// backend/src/services/fileAccessService.ts

async deleteFolderRecursive(
  organizationId: string,
  folderPath: string
): Promise<number> {
  // 1. 削除前にファイル一覧を取得（file_key収集用）
  const files = await storageService.listFiles(organizationId, folderPath);
  const fileKeys = files.map(file => file.key);
  
  // 2. ストレージから削除
  await storageService.deleteFolderRecursive(organizationId, folderPath);
  
  // 3. DBメタデータを論理削除
  await fileMetadataRepository.softDeleteBatch(organizationId, fileKeys);
  
  return fileKeys.length;
}
```

#### projectService.ts から呼び出し（間接的）
```typescript
// backend/src/services/projectService.ts

async deleteProject(...) {
  // ... プロジェクト削除処理 ...
  
  // fileAccessService経由でstorageServiceを呼び出し
  await fileAccessService.deleteFolderRecursive(
    organizationId,
    `projects/${projectId}`
  );
}
```

### 実装のポイント

1. **シンプルな実装**
   - 既存メソッド（`listFiles`, `deleteFile`）を組み合わせ
   - 複雑なロジック不要

2. **堅牢なエラーハンドリング**
   - 個別ファイル削除失敗でも処理続行
   - 失敗件数を集計してログ出力

3. **パフォーマンス考慮**
   - 進捗ログで大量ファイル削除時の状況を把握
   - 将来的な並列削除実装への拡張性

4. **マルチテナント分離**
   - `organizationId`を必ず指定
   - `deleteFile()`内で自動的に組織プレフィックスが付与される

### テスト結果

#### TypeScriptコンパイル
- ✅ エラーなし
- ✅ 型チェック通過

#### 既存コードとの整合性
- ✅ `fileAccessService.ts`から呼び出し可能
- ✅ `projectService.ts`から間接的に呼び出し可能
- ✅ シグネチャ（引数・戻り値）が一致

#### 手動テスト（実施推奨）
- [ ] プロジェクト作成
- [ ] ファイルアップロード
- [ ] プロジェクト削除実行
- [ ] ストレージ上のファイルが削除されたことを確認

### セキュリティ実装

#### 1. マルチテナント分離
- `organization_id`を必ず指定
- `buildKey()`で組織プレフィックスを自動付与

#### 2. パストラバーサル攻撃対策
- `buildKey()`内で実装済み
- 不正なパスは拒否される

### 今後の改善案

1. **並列削除処理**
   - 大量ファイル削除時のパフォーマンス向上
   - `Promise.all()`で並列実行

2. **バッチサイズの制限**
   - 一度に削除するファイル数を制限
   - メモリ使用量の削減

3. **削除リトライ機能**
   - 一時的なエラーでの削除失敗時に再試行
   - 最大リトライ回数を設定

### 次のタスク
- 別タスク `20260327_0822_maimlファイル削除時project_status確認追加` で削除条件チェックを強化
