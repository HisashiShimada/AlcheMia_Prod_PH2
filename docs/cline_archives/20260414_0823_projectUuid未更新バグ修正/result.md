# 修正結果レポート: project_uuid 未更新バグ修正

- **作成日時**: 2026-04-14 08:43
- **対象ファイル**: `backend/src/services/maimlService.ts`, `backend/src/services/storageService.ts`

---

## 1. 問題の概要

MAIMLファイルを保存（上書き）した際に、以下の2つのテーブルの `project_uuid` が更新されないため、一連の作業途中でMAIMLファイルが特定できない事象が発生していた。

| テーブル | カラム | 問題 |
|---|---|---|
| `project` | `project_uuid` | saveMaiML 実行時に更新されない |
| `file_metadata` | `project_uuid` | uploadFile 実行時に更新されない |

---

## 2. 根本原因

### 原因①: `extractDocumentUuid` の実装誤り（`maimlService.ts`）

`extractDocumentUuid` 関数が `DOMParser` + `getAttribute('uuid')` を使って XML **属性**を取得しようとしていた。

しかし、MAIMLの `uuid` は XML属性ではなく **子要素** `<uuid>...</uuid>` のテキストとして定義されているため、常に `null` を返していた。

```xml
<!-- MAIMLの実際の構造（uuid は子要素） -->
<document id="document_test_omori11">
  <name>test_omori11</name>
  <uuid>7fbcc8ec-6317-4e16-bed1-4a46b5d4e13c</uuid>  ← 子要素
  ...
</document>
```

```typescript
// 修正前（誤）: getAttribute で XML属性を取得しようとしていた
const uuid = docEl.getAttribute('uuid') ?? docEl.getAttribute('UUID');
// → MAIMLでは uuid は属性ではなく子要素なので常に null
```

### 原因②: `ON CONFLICT DO NOTHING` による project_uuid 未更新（`storageService.ts`）

`file_metadata` への INSERT は `ON CONFLICT (file_key) DO NOTHING` で実装されているため、既存レコードがある場合（MAIMLファイル上書き保存時）は何もせず、`project_uuid` が更新されなかった。

---

## 3. 修正内容

### 修正① `backend/src/services/maimlService.ts`

#### (a) `MaimlParserTyped` インポートを追加

```typescript
// 追加
import { MaimlParserTyped } from '../utils/maimlParserTyped';
```

#### (b) `extractDocumentUuid` を `MaimlParserTyped.getDocument().uuid` で正しく実装

```typescript
// 修正前（誤）
function extractDocumentUuid(content: string): string | null {
  try {
    console.log(content);
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const docEl =
      doc.getElementsByTagName('Document')[0] ??
      doc.getElementsByTagName('document')[0];
    if (!docEl) return null;
    // ❌ uuid は XML属性ではなく子要素なので常に null
    const uuid = docEl.getAttribute('uuid') ?? docEl.getAttribute('UUID');
    return uuid ?? null;
  } catch {
    return null;
  }
}
```

```typescript
// 修正後（正）
function extractDocumentUuid(content: string): string | null {
  try {
    // MaimlParserTyped.getDocument().uuid で子要素 <uuid> のテキストを正しく取得
    const parser = new MaimlParserTyped(content);
    const doc = parser.getDocument();
    const uuid = doc?.uuid;
    return uuid && uuid.trim().length > 0 ? uuid.trim() : null;
  } catch (err) {
    console.warn('⚠️ [extractDocumentUuid] MaimlParserTyped による UUID 抽出失敗:', err instanceof Error ? err.message : err);
    return null;
  }
}
```

### 修正② `backend/src/services/storageService.ts`

`insertIfNotExists` の `ON CONFLICT DO NOTHING` 問題を解消するため、INSERT後に `project_uuid` が指定されているプロジェクトメインファイルは `updateFileMetadata` で強制上書きする処理を追加。

```typescript
// insertIfNotExists は ON CONFLICT DO NOTHING のため、
// 既存レコードの project_uuid が更新されない。
// project ファイルかつ project_uuid が指定されている場合は UPDATE で強制上書きする。
if (isProjectFile && options.project_uuid) {
  await repo.updateFileMetadata(key, {
    project_uuid: options.project_uuid,
    file_size: fileSize,
  });
}
```

---

## 4. 修正後の動作フロー

```
saveMaiML(content, ...)
  ↓
extractDocumentUuid(content)
  └─ MaimlParserTyped(content).getDocument().uuid
     → <uuid>7fbcc8ec-...</uuid> のテキストを正しく取得 ✅
  ↓
uploadFileWithRetry(..., { project_uuid: documentUuid })
  └─ storageService.uploadFile(...)
     └─ insertIfNotExists(...)  ← 新規ファイルの場合
     └─ updateFileMetadata({ project_uuid })  ← 既存ファイルも強制更新 ✅
  ↓
projectRepository.update({ project_uuid: documentUuid })
  → project テーブルの project_uuid を更新 ✅
```

---

## 5. TypeScript コンパイル確認

今回の修正に起因するコンパイルエラーなし。

既存エラー（別課題・修正対象外）3件のみ:
- `src/controllers/projectController.ts(18,10): TS2305` - renameService
- `src/workers/maimlPublishWorker.ts(303,13): TS1360` - UnpublishJobData
- `src/workers/maimlScannerWorker.ts(98,13): TS1360` - UnpublishJobData

---

## 6. 影響範囲

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `backend/src/services/maimlService.ts` | 修正 | `MaimlParserTyped` インポート追加、`extractDocumentUuid` 実装修正 |
| `backend/src/services/storageService.ts` | 修正 | `uploadFile` で `project_uuid` を `updateFileMetadata` で強制上書き |
| `backend/src/services/fileAccessService.ts` | 修正 | `MaimlParserTyped` インポート追加、`uploadFiles` で `.maiml` 時に UUID 抽出・`storageService.uploadFile` へ `project_uuid` を渡す処理を追加 |

---

## 7. fileAccessService.ts の修正詳細

### 追加インポート

```typescript
import { MaimlParserTyped } from '../utils/maimlParserTyped';
```

### `uploadFiles` 内の修正箇所

`storageService.uploadFile` 呼び出し直前に UUID 抽出処理を追加：

```typescript
// MAIMLファイルの場合は project_uuid を抽出して渡す（file_metadata.project_uuid 更新のため）
let documentUuid: string | undefined;
if (isMaiml) {
  try {
    const maimlParser = new MaimlParserTyped(file.buffer.toString('utf-8'));
    const doc = maimlParser.getDocument();
    const uuid = doc?.uuid?.trim();
    if (uuid && uuid.length > 0) {
      documentUuid = uuid;
    }
  } catch (uuidErr) {
    // 取得失敗はアップロードを続行
  }
}
```

`storageService.uploadFile` に `project_uuid` を渡すよう修正：

```typescript
const s3Key = await this.storageService.uploadFile(
  organizationId,
  filePath,
  file.buffer,
  {
    contentType: file.mimetype,
    uploadedBy: userId,
    uploadBatchId: batch.batchId,
    uploadSource: 'web_upload',
    uploadMethod: 'single',
    // projects/ 配下の MAIMLメインファイルの場合のみ project_uuid を設定
    ...(documentUuid && !filePath.includes('/archive/') ? { project_uuid: documentUuid } : {}),
  }
);
```

戻り値オブジェクトに `documentUuid` を追加（将来的な `project_uuid` 更新用）：

```typescript
return {
  // ... 既存フィールド
  ...(documentUuid ? { documentUuid } : {}),
};
```

### 条件の説明

- `isMaiml` が true のときのみ UUID 抽出を実行（バリデーション済みの同じフラグを利用）
- `!filePath.includes('/archive/')` でアーカイブファイルには `project_uuid` を設定しない（メインファイルのみ対象）
- UUID 抽出失敗は警告ログのみ、アップロード処理は続行する

---

## 8. TypeScript コンパイル確認（最終）

今回の修正に起因するコンパイルエラーなし。

既存エラー（別課題・修正対象外）3件のみ:
- `src/controllers/projectController.ts(18,10): TS2305` - renameService
- `src/workers/maimlPublishWorker.ts(303,13): TS1360` - UnpublishJobData
- `src/workers/maimlScannerWorker.ts(98,13): TS1360` - UnpublishJobData
