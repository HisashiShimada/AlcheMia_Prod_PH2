# タスク計画書: extractSingleFile処理のstorageServiceからの分離

## メタデータ
- **作成日時**: 2026-02-20 15:57
- **タスクID**: extractSingleFile-separation
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`storageService.ts`に一時的に配置されている`extractSingleFile`メソッドおよび関連処理を、適切な層に移動し、責務を明確化する。`storageService`はS3/Swiftへのファイルアクセス処理のみを担当し、MAIMLメタデータ抽出処理はUtilityに分離、DB更新処理はRepository層に移動する。

## 2. 目的と期待される成果

### 目的
- 層の責務を明確化し、保守性を向上させる
- `storageService`をストレージアクセス専用のサービスとして整理する
- MAIMLメタデータ抽出処理をUtility層に配置する
- DB更新処理をRepository層に配置する（既存のRepositoryパターンに従う）

### 期待される成果
- [x] `storageService`からメタデータ抽出関連処理を削除
- [x] 新しい`maimlMetadataExtractor.ts`（Utility）を作成し、メタデータ抽出処理を移動
- [x] DB更新処理を`FileMetadataRepository`を使用する形に変更
- [x] `maimlService`から新Utilityを呼び出すように変更
- [x] 既存の動作を維持（後方互換性）

## 3. 現状分析

### storageService.tsの現状

#### 責務の混在
現在の`storageService.ts`は以下の処理を含んでいる：

1. **本来の責務（S3/Swiftアクセス）**:
   - `uploadFile`, `downloadFile`, `deleteFile`
   - `listFiles`, `fileExists`, `getFileMetadata`
   - `getSignedUrl`, `copyFile`, `moveFile`

2. **責務外の処理（MAIMLメタデータ抽出）**:
   - `extractSingleFile` - メイン処理
   - `getMaiMLContent` - S3からXML取得
   - `extractMetadata` - XMLパース・メタデータ抽出
   - `_extractFromNode` - 再帰的XML走査
   - `updateFileMetadata` - DB更新（直接SQL実行）

#### 問題点
- ✗ ストレージアクセスとビジネスロジック（メタデータ抽出）が混在
- ✗ XMLパース処理がストレージサービスに含まれている
- ✗ DB操作がストレージサービスに直接含まれている
- ✗ Repository層を使用せず直接SQLを実行している
- ✗ 単一責任原則（SRP）に違反
- ✗ テストの複雑化（モックが困難）

### maimlService.tsでの使用箇所

**呼び出し箇所**: `saveMaiML`関数内（L155-L168）
```typescript
const extractResult = await storageService.extractSingleFile(fileKey, organizationId);
metadataExtracted = extractResult.success;
```

**用途**: `.maiml`ファイル保存後に自動でメタデータを抽出してDBに保存

### アーキテクチャ設計

#### レイヤー構成（修正後）
```
maimlService (Service層)
    ↓ 呼び出し
maimlMetadataExtractor (Utility層)
    ├─ XMLパース・メタデータ抽出
    └─ 戻り値: MetaData型
    ↓ 抽出結果を渡す
FileMetadataRepository (Repository層)
    └─ DB更新処理（UPSERT）
```

#### 責務の明確化
- **Utility層**: 純粋な計算・変換処理（副作用なし）
- **Repository層**: DB操作専用
- **Service層**: ビジネスロジックの制御・調整

## 4. 実装ステップ

### Phase 1: Utility層とRepository層の準備
- [x] `backend/src/utils/maimlMetadataExtractor.ts`を作成
- [x] 型定義を`backend/src/types/maimlMetadata.ts`に作成
- [x] `FileMetadataRepository`に新メソッドを追加

### Phase 2: メタデータ抽出処理の移動（Utility層）
- [x] `storageService.ts`から以下を`maimlMetadataExtractor.ts`に移動:
  - `extractMetadata`メソッド → `extractMetadataFromXML`
  - `_extractFromNode`メソッド → `extractFromNode`
  - 型定義: `MetaData`, `ExtractResult`
- [x] 純粋関数として実装（副作用なし）

### Phase 3: maimlService.tsでのDB更新処理
- [x] 既存レコード確認: `getFileMetadataByFileKey`を使用
- [x] 既存の`updateFileMetadata`メソッドを使用（新メソッドは作成しない）
- [x] 新規の場合は`insertFileMetadata`を使用
- [x] organization_id検証を含める

### Phase 4: storageService.tsの整理
- [x] `extractSingleFile`を削除
- [x] `getMaiMLContent`を削除
- [x] `updateFileMetadata`を削除
- [x] `_extractFromNode`を削除
- [x] 型定義を削除
- [x] S3/Swiftアクセス処理のみを残す
- [x] コメントを更新（責務を明確化）

### Phase 5: maimlService.tsの変更
- [x] `maimlMetadataExtractor`をimport
- [x] `FileMetadataRepository`をimport
- [x] メタデータ抽出＋DB更新の処理フローを実装:
  1. `storageService.downloadFile`でXML取得
  2. `maimlMetadataExtractor.extractMetadataFromXML`で抽出
  3. `fileMetadataRepository.upsertMaimlMetadata`でDB更新
- [x] エラーハンドリングを適切に実装

### Phase 6: テスト・検証
- [x] 既存の動作が維持されているか確認
- [x] ファイルアップロード時のメタデータ抽出が正常に動作するか確認
- [x] エラーハンドリングが適切か確認

## 5. 影響範囲

### 新規作成するファイル
1. `backend/src/utils/maimlMetadataExtractor.ts` - メタデータ抽出Utility
2. `backend/src/types/maimlMetadata.ts` - メタデータ型定義

### 変更するファイル
1. `backend/src/services/storageService.ts`
   - メタデータ抽出関連の処理を削除（extractSingleFile等）
   - 型定義を削除
   - S3/Swiftアクセス専用に整理

2. `backend/src/repositories/fileMetadataRepository.ts`
   - 変更なし（既存の`updateFileMetadata`と`insertFileMetadata`を使用）

3. `backend/src/services/maimlService.ts`
   - import文を追加: `maimlMetadataExtractor`, `FileMetadataRepository`
   - メタデータ抽出＋DB更新の処理フローを実装

### 影響を受ける機能
- MAIMLファイル保存機能（`saveMaiML`）
- メタデータ自動抽出機能

### 影響を受けない機能
- その他のストレージ操作（upload, download, listなど）
- MAIMLファイルの読み込み・一覧取得
- バリデーション機能

## 6. 技術的詳細

### 新規作成: utils/maimlMetadataExtractor.ts

```typescript
/**
 * MAIML Metadata Extractor (Utility)
 * 
 * MAIMLファイル（XML）からメタデータを抽出する純粋関数
 * 副作用なし、テスト容易
 */

import { parseStringPromise } from 'xml2js';
import { MetaData, ExtractResult } from '../types/maimlMetadata';

/**
 * MaiML XMLをパースしてメタデータ抽出
 * 
 * @param xmlContent - XML文字列
 * @returns 抽出されたメタデータ
 */
export async function extractMetadataFromXML(xmlContent: string): Promise<MetaData> {
  try {
    const parsedXML = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false
    });

    const metadata: MetaData = {
      document_uuid: '',
      document_name: '',
      document_description: '',
      measurement_values: [],
      units: [],
      section_types: [],
      ids: [],
      refs: [],
      keys: [],
      elements: [],
      values: []
    };

    // Document情報抽出
    if (parsedXML.maiml?.document) {
      const doc = parsedXML.maiml.document;
      metadata.document_uuid = doc.uuid || doc['@_uuid'] || '';
      metadata.document_name = doc.name || doc['@_name'] || '';
      metadata.document_description = doc.description || '';
    }

    // 再帰的にXML全体を走査してメタデータ収集
    extractFromNode(parsedXML, metadata);

    // 重複削除
    metadata.measurement_values = [...new Set(metadata.measurement_values)];
    metadata.units = [...new Set(metadata.units)];
    metadata.section_types = [...new Set(metadata.section_types)];
    metadata.ids = [...new Set(metadata.ids)];
    metadata.refs = [...new Set(metadata.refs)];
    metadata.keys = [...new Set(metadata.keys)];
    metadata.elements = [...new Set(metadata.elements)];
    metadata.values = [...new Set(metadata.values)];

    return metadata;
  } catch (error) {
    throw new Error(`Failed to extract metadata from XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 再帰的にXMLノードを走査してメタデータ収集
 * 
 * @param node - XMLノード
 * @param metadata - メタデータオブジェクト（参照渡し）
 * @param parentKey - 親キー（オプション）
 */
export function extractFromNode(node: any, metadata: MetaData, parentKey = ''): void {
  if (!node || typeof node !== 'object') {
    // プリミティブ値の場合、valuesに追加
    if (node && String(node).trim()) {
      metadata.values.push(String(node).trim());
    }
    return;
  }

  // 配列の場合
  if (Array.isArray(node)) {
    node.forEach(item => extractFromNode(item, metadata, parentKey));
    return;
  }

  // オブジェクトの場合、各プロパティを処理
  Object.keys(node).forEach(key => {
    const value = node[key];

    // Element名を収集（@_で始まらないキー）
    if (!key.startsWith('@_') && !key.startsWith('$')) {
      metadata.elements.push(key);
    }

    // 属性情報を収集
    if (key === '@_id' && value) {
      metadata.ids.push(String(value));
    }
    if (key === '@_ref' && value) {
      metadata.refs.push(String(value));
    }
    if (key === '@_key' && value) {
      metadata.keys.push(String(value));
    }

    // 測定値・単位を収集
    if ((key === 'value' || key === '@_value' || parentKey === 'measurement') && value) {
      const strValue = String(value).trim();
      if (strValue && !isNaN(parseInt(strValue))) {
        metadata.measurement_values.push(strValue);
      }
    }
    if ((key === 'unit' || key === '@_unit' || key === 'units') && value) {
      metadata.units.push(String(value));
    }

    // セクション種別を収集
    if ((key === 'section' || key === 'sectionType' || key === '@_type') && value) {
      metadata.section_types.push(String(value));
    }

    // 再帰的に子ノードを処理
    if (typeof value === 'object') {
      extractFromNode(value, metadata, key);
    }
  });
}
```

### maimlService.tsでの実装（既存Repositoryメソッド使用）

```typescript
// FileMetadataRepositoryは既存メソッドのみ使用（新規メソッド追加不要）
// - updateFileMetadata(fileKey, updates) - 既存
// - insertFileMetadata(data) - 既存
// - getFileMetadataByFileKey(fileKey) - 既存
```

### 新規作成: types/maimlMetadata.ts

```typescript
/**
 * MAIMLメタデータの型定義
 */
export interface MetaData {
  document_uuid: string;
  document_name: string;
  document_description: string;
  measurement_values: string[];
  units: string[];
  section_types: string[];
  ids: string[];
  refs: string[];
  keys: string[];
  elements: string[];
  values: string[];
}

/**
 * メタデータ抽出結果の型定義
 */
export interface ExtractSingleFileResult {
  success: boolean;
  fileKey: string;
  metadata?: MetaData;
  error?: string;
  stack?: string;
}
```

### 変更: maimlService.ts

```typescript
// 変更前
import { getStorageService } from './storageService';
const storageService = getStorageService();
const extractResult = await storageService.extractSingleFile(fileKey, organizationId);

// 変更後
import { getStorageService } from './storageService';
import * as maimlMetadataExtractor from '../utils/maimlMetadataExtractor';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';

const storageService = getStorageService();
const fileMetadataRepository = new FileMetadataRepository();

// メタデータ抽出フロー
try {
  console.log('🔍 [MAIML Save] MaiMLメタデータ抽出開始:', fileKey);
  
  // 1. S3/SwiftからXML取得
  const xmlBuffer = await storageService.downloadFile(organizationId, fileKey);
  const xmlContent = xmlBuffer.toString('utf-8');
  
  // 2. メタデータ抽出（Utility）
  const metadata = await maimlMetadataExtractor.extractMetadataFromXML(xmlContent);
  
  // 3. DB更新（Repository - 既存メソッド使用）
  const existingRecord = await fileMetadataRepository.getFileMetadataByFileKey(fileKey);
  
  if (existingRecord) {
    // 既存レコードの更新（既存のupdateFileMetadataを使用）
    const updateData = {
      organization_id: organizationId,
      maiml_document_uuid: metadata.document_uuid,
      maiml_document_name: metadata.document_name,
      maiml_document_description: metadata.document_description,
      maiml_measurement_values: JSON.stringify(metadata.measurement_values),
      maiml_units: JSON.stringify(metadata.units),
      maiml_section_types: JSON.stringify(metadata.section_types),
      maiml_ids: JSON.stringify(metadata.ids),
      maiml_refs: JSON.stringify(metadata.refs),
      maiml_keys: JSON.stringify(metadata.keys),
      maiml_elements: JSON.stringify(metadata.elements),
      maiml_values: JSON.stringify(metadata.values),
      maiml_metadata_extracted_at: new Date(),
      maiml_metadata_extraction_status: 'success'
    };
    
    await fileMetadataRepository.updateFileMetadata(fileKey, updateData);
    metadataExtracted = true;
    console.log('✅ [MAIML Save] MaiMLメタデータ抽出成功（更新）');
  } else {
    // 新規レコードの作成（既存のinsertFileMetadataを使用）
    const insertData: Partial<FileMetadata> = {
      file_key: fileKey,
      organization_id: organizationId,
      s3_bucket: process.env.S3_BUCKET_NAME || 'maiml-storage',
      original_filename: fileKey.split('/').pop(),
      file_size: 0,
      file_type: 'application/xml',
      uploaded_by: 'system-metadata-extractor',
      is_maiml_file: true,
      maiml_document_uuid: metadata.document_uuid,
      maiml_document_name: metadata.document_name,
      maiml_document_description: metadata.document_description,
      maiml_measurement_values: JSON.stringify(metadata.measurement_values),
      maiml_units: JSON.stringify(metadata.units),
      maiml_section_types: JSON.stringify(metadata.section_types),
      maiml_ids: JSON.stringify(metadata.ids),
      maiml_refs: JSON.stringify(metadata.refs),
      maiml_keys: JSON.stringify(metadata.keys),
      maiml_elements: JSON.stringify(metadata.elements),
      maiml_values: JSON.stringify(metadata.values),
      maiml_metadata_extracted_at: new Date(),
      maiml_metadata_extraction_status: 'success',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await fileMetadataRepository.insertFileMetadata(insertData);
    metadataExtracted = true;
    console.log('✅ [MAIML Save] MaiMLメタデータ抽出成功（新規作成）');
  }
} catch (metadataError) {
  console.error('❌ [MAIML Save] MaiMLメタデータ抽出エラー:', metadataError);
  
  // エラー状態を記録
  try {
    const existingRecord = await fileMetadataRepository.getFileMetadataByFileKey(fileKey);
    if (existingRecord) {
      await fileMetadataRepository.updateFileMetadata(fileKey, {
        maiml_metadata_extraction_status: 'failed',
        maiml_metadata_extracted_at: new Date()
      });
    }
  } catch (dbError) {
    console.error('❌ [MAIML Save] DB更新エラー:', dbError);
  }
  
  // メタデータ抽出失敗しても保存は成功とする
  metadataExtracted = false;
}
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の呼び出し箇所の見落とし | 高 | 低 | 全プロジェクトで`extractSingleFile`を検索 |
| メタデータ抽出処理のエラー | 中 | 低 | エラーハンドリングを維持、ログを確認 |
| DB接続エラー | 中 | 低 | 既存のエラーハンドリングをそのまま移動 |
| 型定義の不整合 | 低 | 低 | TypeScriptのコンパイルチェックで検証 |

## 8. テスト計画

### 手動テスト
- [ ] MAIMLファイルをアップロードして保存
- [ ] `file_metadata`テーブルにメタデータが正しく保存されるか確認
- [ ] エラー発生時のログとDB状態を確認
- [ ] 既存のストレージ操作が正常に動作するか確認

### 確認ポイント
- [ ] `maiml_document_uuid`, `maiml_document_name`などが正しく抽出されるか
- [ ] `maiml_metadata_extraction_status`が'success'または'failed'に更新されるか
- [ ] エラー時に適切なエラーメッセージが返されるか

## 9. ロールバック計画

問題が発生した場合の対処：

1. **Git revert**で変更を元に戻す
2. 一時的に`storageService.ts`に処理を戻す
3. 段階的に再度分離を試みる

## 10. 関連ドキュメント

- [.clinerules/development/config.md](../../.clinerules/development/config.md) - コーディング規約
- [.clinerules/development/typescript.md](../../.clinerules/development/typescript.md) - TypeScript型定義規約
- [.clinerules/development/database.md](../../.clinerules/development/database.md) - DB操作規約
- [backend/src/services/storageService.ts](../../backend/src/services/storageService.ts) - 現在の実装
- [backend/src/services/maimlService.ts](../../backend/src/services/maimlService.ts) - 呼び出し元

## 11. 承認記録

- **計画書提示日時**: 2026-02-20 15:57
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 12. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] `backend/src/utils/maimlMetadataExtractor.ts`（新規）
- [ ] `backend/src/types/maimlMetadata.ts`（新規）
- [ ] `backend/src/repositories/fileMetadataRepository.ts`（変更なし - 既存メソッド使用）
- [ ] `backend/src/services/storageService.ts`（整理済み - メタデータ処理削除）
- [ ] `backend/src/services/maimlService.ts`（変更済み - 新しい処理フロー実装）

## 13. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
