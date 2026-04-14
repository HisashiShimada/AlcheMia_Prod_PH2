# 調査報告: file_metadataテーブル未登録問題

## メタデータ
- **作成日時**: 2026-04-03 11:47
- **タスクID**: file_metadata未登録問題調査
- **優先度**: 高
- **種類**: 調査レポート

---

## 1. 問題概要

Jira課題：フォーマット管理画面での新規ファイル作成時に `file_metadata` テーブルへのレコードが作成されない。

---

## 2. 調査対象の全体像

S3/Swiftへのファイルアップロード処理は以下のサービスで行われている。

| サービスファイル | 役割 |
|---|---|
| `fileAccessService.ts` | プロジェクト向けファイルアップロード（メインAPI） |
| `formatService.ts` | フォーマット管理画面向けファイル操作 |
| `maimlService.ts` | MAIMLエディタからの保存 |
| `maimlWriterService.ts` | MAIML書き込み専用サービス |
| `projectService.ts` | プロジェクト作成時のフォルダ作成 |
| `certificateService.ts` | クライアント証明書保存 |
| `chunkUploadService.ts` | チャンクアップロード |

---

## 3. file_metadata登録有無の整理

### ✅ 登録されている処理

#### (1) fileAccessService.ts — `uploadFiles()`
- **経路**: `POST /api/v1/files/upload` → `fileAccessController` → `FileAccessService.uploadFiles()`
- **対象ファイル種別**: MAIMLファイル（`.maiml`）のみ `file_metadata` を登録
- **条件**: `isMaimlFile(sanitizedFileName, file.mimetype)` が true のとき
- **登録箇所**: `this.saveFileMetadata({ organizationId, ... })` → `this.repository.insertFileMetadata(fileMetadata)`

#### (2) fileAccessService.ts — プレースホルダー作成
- ダウンロードバッチ等でプレースホルダーファイルを作成する際に `saveFileMetadata()` 呼び出しあり

#### (3) maimlService.ts — `saveMaiML()`
- **経路**: `POST /api/v1/maiml/save`
- **登録箇所**: `fileMetadataRepository.insertFileMetadata(newMetadata)` を直接呼び出し
- **条件**: 新規ファイルキーの場合のみ登録（既存の場合はスキップ）

#### (4) maimlWriterService.ts
- MAIMLエディタ書き込み時にアーカイブファイルおよびメインファイルに対して `fileMetadataRepository.insertFileMetadata()` を呼び出し

---

### ❌ 登録されていない処理（問題箇所）

#### (1) formatService.ts — `createFormatFile()`
- **経路**: `POST /api/v1/formats/:folderName/files` → `formatController` → `formatService.createFormatFile()`
- **処理内容**: フォーマット管理画面でのファイル新規作成
- **問題**: `storageService.uploadFile()` のみ呼び出しており、`file_metadata` テーブルへの登録が**一切ない**
- **コード該当箇所**: `formatService.ts` L480〜546

#### (2) formatService.ts — `createFormatFolder()`
- **経路**: `POST /api/v1/formats/folders`
- **処理内容**: フォーマット管理フォルダ作成
- **問題**: ディレクトリマーカー（0バイトオブジェクト）を S3 に作成するが `file_metadata` 登録なし
- **備考**: フォルダはファイルとは別管理が一般的なため、要件を確認する必要あり

#### (3) formatService.ts — `createFormatSubfolder()`
- **経路**: `POST /api/v1/formats/subfolders`
- **問題**: 上記と同様、ディレクトリマーカーのみでメタデータ登録なし

#### (4) formatService.ts — `updateFormatFile()`
- **経路**: `PUT /api/v1/formats/files`
- **処理内容**: フォーマットファイルの内容更新（上書き）
- **問題**: `storageService.uploadFile()` のみ。`file_metadata` の更新処理なし
- **備考**: 既存レコードがないためUPDATEもできない状態

#### (5) fileAccessService.ts — XML等ファイルのアップロード
- **問題**: MAIMLファイル以外（XMLファイル等）はアップロード時に `file_metadata` 登録をスキップしている
- **コード**: `if (isMaimlFile(sanitizedFileName, file.mimetype))` の条件分岐による

#### (6) DataRecordDialog（実験作業画面）— insertion要素のファイルアップロード
- **経路**: `DataRecordDialog.tsx` → `uploadFiles()` サービス（`@/services/fileAccessService`）
- **アップロード先**: `projects/{projectName}/attachments` パス
- **問題**: `fileAccessService.uploadFiles()` 経由だが、アップロードされるのは画像・バイナリ等の添付ファイル（MAIMLファイルではない）のため、`isMaimlFile()` 判定をパスせず `file_metadata` 登録されない
- **コード**: `DataRecordDialog.tsx` 内 `uploadFiles({ uploadMode: 'single', targetPath: 'projects/${projectName}/attachments' })`
- **備考**: 実験データのinsertionとして添付したファイルが `file_metadata` に記録されないため、ファイル管理画面から参照・ダウンロードできない可能性あり

#### (6) projectService.ts — プロジェクト作成時のS3フォルダ生成
- **処理**: `storageService.uploadFile(organizationId, s3Path, '', { contentType: 'text/plain' })` で空フォルダを作成
- **問題**: `file_metadata` 登録なし（プレースホルダーのため意図的かもしれないが要確認）

#### (7) certificateService.ts — クライアント証明書保存
- `storageService.uploadFile()` のみ（証明書ファイルは `file_metadata` 管理対象外と思われる）

---

## 4. file_metadataテーブルとリポジトリの構造

### Repository: `fileMetadataRepository.ts`

```
backend/src/repositories/fileMetadataRepository.ts
```

- `insertFileMetadata(data: Partial<FileMetadata>)` — INSERT処理
- `getFileMetadata(organizationId, projectId, fileName)` — メタデータ取得
- 既存の登録先は `FileMetadataRepository` クラスとして実装済み

---

## 5. 問題の根本原因

**構造的な問題**: S3/Swiftへのアップロードが `storageService.uploadFile()` で直接行われており、`file_metadata` テーブルへの登録は**各サービスが個別に実装する**設計になっている。

そのため、`formatService.ts` のように後から追加されたサービスでは `file_metadata` 登録が漏れる。

---

## 6. 改善方針の選択肢

### 案A: storageService.uploadFile() にfile_metadata登録を組み込む（共通化）
- `storageService.ts` の `uploadFile()` 内で自動的に `file_metadata` を登録
- **メリット**: 今後の漏れがなくなる、最も根本的な対策
- **デメリット**: フォルダマーカー（0バイト）や証明書など「登録不要」ケースへの条件分岐が必要。storageServiceがDBに依存する形になり、層の分離が崩れる

### 案B: 各サービス側でfile_metadata登録を追加する（個別対応）
- `formatService.createFormatFile()` に `fileMetadataRepository.insertFileMetadata()` を追加
- **メリット**: 影響範囲が限定的、既存動作を壊さない
- **デメリット**: 今後の漏れは防げない。各サービスで意識的に実装する必要がある

### 案C: ファイルアップロードを fileAccessService 経由に統一する
- `formatService` のアップロード処理を `fileAccessService.uploadFiles()` を通じて行う
- **メリット**: アップロードのメインロジックが1箇所に集約される
- **デメリット**: `fileAccessService` が主にプロジェクトファイル向けに設計されており、フォーマット用途への拡張が必要

### 案D: ファイルアップロードファサードを作成する（推奨）
- `storageService.uploadFile()` を直接呼ぶ代わりに、`uploadFileWithMetadata()` というラッパー関数を新設する
- 具体的には `fileUploadService.ts`（または `storageService` にメソッド追加）として、「S3アップロード + file_metadata INSERT」をセットで行う関数を作成
- 登録不要なケース（フォルダマーカー、証明書）は既存の `storageService.uploadFile()` を直接呼び続ける
- **メリット**: storageServiceの純粋なS3層としての役割を維持しつつ、共通化が実現できる。今後の漏れを防げる
- **デメリット**: 既存の各サービスのアップロード呼び出しを順次移行する必要がある
- **イメージ**:
  ```typescript
  // 新設: backend/src/services/fileUploadService.ts
  export async function uploadFileWithMetadata(
    organizationId: string,
    filePath: string,
    content: Buffer | string,
    options?: { contentType?: string; uploadedBy?: string; uploadSource?: string }
  ): Promise<string> {
    // 1. S3/Swiftにアップロード
    const s3Key = await storageService.uploadFile(organizationId, filePath, content, options);
    // 2. file_metadataにINSERT（フォルダマーカーは除外）
    if (!filePath.endsWith('/')) {
      await fileMetadataRepository.insertFileMetadata({ ... });
    }
    return s3Key;
  }
  ```

---

## 7. 推奨対応

**べき論**: ファイルをS3に連携する処理で自動的に `file_metadata` の登録を実行すべき。

そのため、**案D（ファイルアップロードファサード新設）** を採用し、順次各サービスを移行することを推奨。

### 短期対応（Jira課題の直接修正）

| ファイル | 関数 | 対応内容 |
|---|---|---|
| `formatService.ts` | `createFormatFile()` | S3アップロード後に `file_metadata` INSERT追加 |
| `formatService.ts` | `updateFormatFile()` | `file_metadata` のUPDATE追加（レコードなければINSERT） |

### 中長期対応（案D: 共通化ファサード導入）

| 対応内容 | 概要 |
|---|---|
| `fileUploadService.ts` 新設 | `uploadFileWithMetadata()` 関数を作成（S3+file_metadata一体化） |
| `formatService.ts` 移行 | `storageService.uploadFile()` → `uploadFileWithMetadata()` |
| `fileAccessService.ts` 移行 | `isMaimlFile()` 条件分岐を撤廃し全ファイル対象に |
| `DataRecordDialog` 対応 | insertion添付ファイルのfile_metadata登録 |

### 要件確認が必要な箇所

| ファイル | 関数 | 確認事項 |
|---|---|---|
| `formatService.ts` | `createFormatFolder()` / `createFormatSubfolder()` | フォルダ（ディレクトリマーカー）は `file_metadata` 管理対象か？ |
| `projectService.ts` | プロジェクト作成 | S3プレースホルダーは登録対象か？ |
| `certificateService.ts` | 証明書保存 | `.p12` ファイルは `file_metadata` 管理対象外か？ |

---

## 8. 関連ファイルまとめ

```
backend/src/
├── services/
│   ├── formatService.ts              ← 問題のメインファイル（file_metadata登録なし）
│   ├── fileAccessService.ts          ← MAIMLのみfile_metadata登録あり
│   ├── maimlService.ts               ← file_metadata登録あり
│   ├── maimlWriterService.ts         ← file_metadata登録あり
│   ├── projectService.ts             ← file_metadata登録なし
│   └── storageService.ts             ← S3/Swiftアクセスのみ（DB操作なし）
├── repositories/
│   └── fileMetadataRepository.ts     ← insertFileMetadata() 実装済み
└── controllers/
    ├── formatController.ts           ← formatService呼び出し
    └── fileAccessController.ts       ← fileAccessService呼び出し
```
