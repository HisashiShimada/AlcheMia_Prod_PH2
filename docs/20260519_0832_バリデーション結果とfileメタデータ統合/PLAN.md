# タスク計画書: バリデーション結果とfile_metadata情報の統合修正

## メタデータ
- **作成日時**: 2026-05-19 08:32
- **タスクID**: fix-validation-filemetadata-integration
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

通常アップロード（`POST /api/v1/files/upload`）においてMAIMLファイルをアップロードすると、
バリデーションがアップロードより先に実行されるため以下の問題が発生している。

- バリデーション時点では `file_metadata` レコードが存在しないため `saveAnalysisResults()` が新規INSERT
- INSERT時に `file_size: 0`、`uploaded_by: 'system'` 等の不完全情報が登録される
- その後の `storageService.uploadFile()` 内 `insertIfNotExists()` は既にレコードが存在するため**スキップ**
- 結果として正しいファイル情報（file_size、uploaded_by等）が file_metadata に登録されない

## 目的と期待される成果
- [ ] アップロード時に正しいファイル情報（file_size, uploaded_by, file_type等）が file_metadata に登録される
- [ ] バリデーション結果（maiml_analysis_status, maiml_error_count等）も正規レコードに正しく反映される
- [ ] バリデーション前に不完全なfile_metadataレコードが作成されなくなる

## 根本原因

`fileAccessService.ts` の `uploadFiles()` において：

1. **バリデーション（先）**: `analyzeMaiMLFile(..., skipSave=false)` → `saveAnalysisResults()` が `file_size:0` で新規INSERT
2. **アップロード（後）**: `storageService.uploadFile()` → `insertIfNotExists()` → 既存レコードあり → **スキップ**

バリデーションを先に動かす設計（不正ファイルのアップロード阻止）は正しいが、
DB保存のタイミングが誤っており「先にバリデーション結果INSERT → アップロード情報がスキップ」という逆順になっている。

## 実装ステップ

### Phase 1: fileAccessService.ts の修正

**修正内容: バリデーションはskipSave=trueで実行し、アップロード後にバリデーション結果をUPDATE**

- [ ] `analyzeMaiMLFile()` の `skipSave` を `false` → `true` に変更
  ```typescript
  // 変更前
  analysisResult = await analyzeMaiMLFile(
    organizationId, content, fullFileKey,
    false,    // ← DB保存あり
    'lenient'
  );

  // 変更後
  analysisResult = await analyzeMaiMLFile(
    organizationId, content, fullFileKey,
    true,     // ← DB保存なし（バリデーションのみ）
    'lenient'
  );
  ```

- [ ] `storageService.uploadFile()` の後にバリデーション結果をUPDATE処理を追加
  ```typescript
  // アップロード後にバリデーション結果をfile_metadataに書き込む
  if (isMaiml && analysisResult) {
    const fileMetadataRepo = new FileMetadataRepository();
    const normalizedKey = `${organizationId}/${filePath}`;
    
    const errorCount = analysisResult.errors.length;
    const warningCount = analysisResult.warnings.length;
    let analysisStatus: string;
    if (errorCount > 0) {
      analysisStatus = 'has_errors';
    } else if (warningCount > 0) {
      analysisStatus = 'has_warnings';
    } else if (analysisResult.isValid) {
      analysisStatus = 'valid';
    } else {
      analysisStatus = 'analyzed';
    }

    await fileMetadataRepo.updateFileMetadata(normalizedKey, {
      maiml_analysis_status: analysisStatus,
      maiml_error_count: errorCount,
      maiml_warning_count: warningCount,
      maiml_transitions_count: analysisResult.statistics?.transitionsCount || 0,
      maiml_places_count: analysisResult.statistics?.placesCount || 0,
      maiml_version: String(analysisResult.version || ''),
      maiml_last_analyzed: new Date(),
    });
  }
  ```

### Phase 2: maiml_analysis_results テーブルへの保存（アップロード後）

- [ ] アップロード後に `maimlAnalysisResultRepository.upsert()` を明示的に呼び出して詳細結果を保存
  - バリデーション詳細（errors, warnings の JSON等）はアップロード後に保存することで、
    アップロード直後のエラー確認時も正しく表示される
  ```typescript
  // アップロード後にmaiml_analysis_resultsへの保存
  if (isMaiml && analysisResult) {
    const analysisData = {
      file_key: normalizedKey,
      is_valid: analysisResult.isValid,
      version: analysisResult.version || null,
      namespace: analysisResult.namespace || null,
      errors: JSON.stringify(analysisResult.errors),
      warnings: JSON.stringify(analysisResult.warnings),
      suggestions: JSON.stringify(analysisResult.suggestions || []),
      statistics: JSON.stringify(analysisResult.statistics || {}),
      processing_time: analysisResult.processingTime || null,
      analysis_timestamp: analysisResult.timestamp || new Date().toISOString()
    };
    await maimlAnalysisResultRepository.upsert(analysisData);
  }
  ```

### Phase 3: 動作確認

- [ ] MAIMLファイルをアップロードして `file_metadata` レコードの内容を確認
  - `file_size` が正しく登録されること
  - `uploaded_by` がシステムユーザーIDで登録されること
  - `maiml_analysis_status` が正しく設定されること
- [ ] バリデーションエラーがある場合にアップロードが中止されることを確認

## 変更ファイル
1. `backend/src/services/fileAccessService.ts` - `uploadFiles()` 内のバリデーション保存タイミングを修正
   - `skipSave=true` に変更（バリデーション時のDB保存を無効化）
   - アップロード後に `maimlAnalysisResultRepository.upsert()` で詳細保存
   - アップロード後に `fileMetadataRepository.updateFileMetadata()` でバリデーション結果をUPDATE

## リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| maiml_analysis_results テーブルへの保存がスキップされる | 中 | Phase 2 で別途保存処理を追加 |
| updateFileMetadata() が insertIfNotExists() より前に呼ばれるとレコードなしでUPDATE失敗 | 低 | storageService.uploadFile() の後に実行するため問題なし |
| チャンクアップロードへの影響 | 低 | チャンクアップロードは別フロー（fileAccessController内）のため今回の修正対象外 |

## テスト計画
- [ ] 正常なMAIMLをアップロード → file_metadata の全カラムが正しく登録されることを確認
- [ ] バリデーションエラーのあるMAIMLをアップロード → エラー内容に応じてアップロード中止 or 警告付き成功になることを確認
- [ ] file_size, uploaded_by, file_type が正しく登録されることを確認（今まで 0 / 'system' だった問題の解消）

## 承認記録
- **計画書提示日時**: 2026-05-19 08:32
- **承認日時**: 
- **承認者コメント**: 
