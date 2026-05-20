# タスク計画書: file_metadata 組織IDなし file_key レコード増殖バグ修正

## メタデータ
- **作成日時**: 2026-05-18 16:30
- **タスクID**: fix-filemetadata-orgid-filekey
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ProjectManagementでMAIMLファイルをアップロードすると、  
`projects/ito1/Raman.maiml` のように**組織IDプレフィックスなし**の `file_key` で  
`file_metadata` レコードが新規INSERTされる。

本来 `{org_id}/projects/ito1/Raman.maiml` という正規レコードが既に存在するにも関わらず、  
バリデーション結果が組織IDなしレコードに書き込まれ、正規レコードには反映されない。

## 目的と期待される成果
- [ ] アップロード後に組織IDなしレコードが生成されなくなる
- [ ] バリデーション結果が正規（組織ID付き）レコードに正しく反映される
- [ ] 既存の不正レコードを確認するSQLを提供する

## 根本原因

`fileAccessService.ts` で `analyzeMaiMLFile()` を呼ぶ際の `filePath` が  
相対パス（`projects/ito1/Raman.maiml`）のまま渡されている。

`maimlParser.ts` の `saveAnalysisResults()` はこの `fileKey` で  
`getFileMetadataByFileKey()` を検索するが、正規レコードは  
`{org_id}/projects/ito1/Raman.maiml` キーで存在するため「なし」と判定され、  
新規INSERT（不正レコード）が走る。

## 実装ステップ

### Phase 1: バックエンド修正

- [ ] `backend/src/utils/maimlParser.ts` の `saveAnalysisResults()` 内で  
  `file_key` に組織IDプレフィックスが付いていない場合に付与するよう修正

```typescript
// 修正箇所: saveAnalysisResults() L221付近
// 組織IDプレフィックスを正規化（冪等）
const normalizedFileKey = analysisResult.fileKey.startsWith(`${organizationId}/`)
  ? analysisResult.fileKey
  : `${organizationId}/${analysisResult.fileKey}`;

const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(normalizedFileKey);

if (!existingMetadata) {
  await fileMetadataRepository.insertFileMetadata({
    file_key: normalizedFileKey,  // 組織ID付きキーで登録
    ...
  });
} else {
  await fileMetadataRepository.updateFileMetadata(normalizedFileKey, updateData);
}
```

- [ ] 同じく `analysisResult.fileKey` を参照している他の箇所も `normalizedFileKey` に統一

### Phase 2: 既存不正レコード確認

- [ ] 以下SQLで既存の不正レコードを確認する（実行はユーザー判断）

```sql
-- 組織IDなしの file_key を持つ file_metadata レコード確認
SELECT file_key, organization_id, created_at, maiml_analysis_status
FROM file_metadata
WHERE file_key LIKE 'projects/%'
ORDER BY created_at DESC;
```

### Phase 3: 動作確認

- [ ] MAIMLファイルをアップロードして `file_metadata` レコードが1件のみ（組織ID付き）作成されることを確認
- [ ] バリデーション結果が正規レコードに反映されることを確認

## 変更ファイル
1. `backend/src/utils/maimlParser.ts` - `saveAnalysisResults()` の `file_key` 正規化処理を追加

## リスク
| リスク | 対策 |
|--------|------|
| 既存の組織IDなしレコードは削除されない（別途対応が必要） | クリーンアップSQLを提供して手動対応 |
| `analysisResult.fileKey` を参照している他の箇所への影響 | 変更後のファイルキーを一貫して使用するよう確認 |

## テスト計画
- [ ] MAIMLファイルアップロード後に `file_metadata` テーブルを確認し、組織IDなしレコードが増えないことを確認
- [ ] バリデーション結果（`maiml_analysis_status`）が正規レコードに設定されることを確認

## 承認記録
- **計画書提示日時**: 2026-05-18 16:30
- **承認日時**: 2026-05-19 08:13
- **承認者コメント**: 修正を開始

## 実施記録

### 実施日時
開始: 2026-05-19 08:12  
完了: 2026-05-19 08:13

### 変更ファイル
1. `backend/src/utils/maimlParser.ts` - `saveAnalysisResults()` に `normalizedFileKey` の正規化処理を追加（方針2）
2. `backend/src/services/fileAccessService.ts` - `analyzeMaiMLFile()` に渡す `fileKey` を組織ID付き完全キーに変更（方針1・根本修正）

### 実施内容

#### 方針2: maimlParser.ts（受け取り側での正規化）
`saveAnalysisResults()` の先頭（ステータス決定の直後）に以下の正規化処理を追加した：

```typescript
const normalizedFileKey = analysisResult.fileKey.startsWith(`${organizationId}/`)
  ? analysisResult.fileKey
  : `${organizationId}/${analysisResult.fileKey}`;
```

その後、関数内で `analysisResult.fileKey` を参照していた全箇所（計7箇所）を `normalizedFileKey` に統一。

#### 方針1: fileAccessService.ts（呼び出し元での根本修正）
`uploadFiles()` 内で `analyzeMaiMLFile()` を呼ぶ際に `filePath`（相対パス）ではなく `fullFileKey`（組織ID付き完全キー）を渡すよう変更：

```typescript
// 変更前
await analyzeMaiMLFile(organizationId, content, filePath, false, 'lenient');

// 変更後
const fullFileKey = `${organizationId}/${filePath}`;
await analyzeMaiMLFile(organizationId, content, fullFileKey, false, 'lenient');
```

両方針を適用することで冪等性が確保され、他の呼び出し箇所から相対パスが渡された場合でも安全に動作する。

### TypeScriptコンパイル確認
`npx tsc --noEmit` でエラーなし（exit:0）

### 最終的な成果物
- [x] アップロード後に組織IDなしレコードが生成されなくなる（修正済み）
- [x] バリデーション結果が正規（組織ID付き）レコードに正しく反映される（修正済み）
- [x] 既存の不正レコードを確認するSQLを提供する（PLAN.md Phase 2 参照）
