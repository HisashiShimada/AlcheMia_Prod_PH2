# タスク計画書: project_uuid・file_metadata.project_uuid 未更新バグ修正

## メタデータ
- **作成日時**: 2026-04-13 18:07
- **タスクID**: project_uuid_file_metadata_fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

MAIMLファイル保存時に以下2つのDB更新が欠落しており、一連の作業途中でMAIMLファイルが特定できない事象が発生している。

1. `maimlService.ts` の `saveMaiML` にて `project` テーブルの `project_uuid` が更新されていない
2. `storageService.ts` の `uploadFile` にて `file_metadata` テーブルの `project_uuid` が更新されていない

## 目的と期待される成果

- [ ] `saveMaiML` 実行時に MAIML XML の `<Document uuid="...">` から UUID を抽出し、`project.project_uuid` を更新する
- [ ] `storageService.uploadFile` で `file_metadata.project_uuid` を設定できるようにする
- [ ] `saveMaiML` から `uploadFileWithRetry` 経由で `project_uuid` を渡し、`file_metadata` へ反映する

## 問題の詳細分析

### 問題1: project.project_uuid が更新されない

`saveMaiML` は現在 `project_maiml_flg = true` の更新のみ行っている（220〜244行目）。
`project_uuid`（MAIMLの `<Document>` タグの uuid 属性）は一切設定していない。

### 問題2: file_metadata.project_uuid が設定されない

`storageService.ts` の `UploadOptions` に `project_uuid` フィールドが存在しない。
`insertIfNotExists` 呼び出し時に `project_uuid` を渡していないため、常に NULL になる。

## 実装ステップ

### Phase 1: storageService.ts の修正
- [ ] `UploadOptions` に `project_uuid?: string` を追加
- [ ] `insertIfNotExists` 呼び出し時に `project_uuid` を渡す
  - **条件: `filePath` が `projects/` を含む かつ `archive/` を含まない場合のみ**
  - 理由: archiveバックアップに同じ `project_uuid` が入ると UUID でのMAIML最新ファイル特定が不可能になるため
  - フォーマットファイル・archiveファイルは `project_uuid` を設定しない（NULL のまま）

### Phase 2: maimlService.ts の修正
- [ ] `uploadFileWithRetry` の options 型に `project_uuid?: string` を追加
- [ ] `saveMaiML` 内で MAIML XML から `<Document>` の uuid 属性を抽出するヘルパー関数 `extractDocumentUuid` を追加（DOMParser を利用）
- [ ] `project.project_uuid` を抽出した UUID で更新する（既存の `project_maiml_flg` 更新ブロックにまとめる）
- [ ] `uploadFileWithRetry` 呼び出し時に `project_uuid` を options に含める
  - **条件: `normalizedFileKey` が `/projects/` を含む かつ `/archive/` を含まない場合のみ** `project_uuid` を渡す
  - archiveバックアップ作成時（`createBackup` 内の `uploadFile`）は渡さない

## 変更ファイル

1. `backend/src/services/storageService.ts` - `UploadOptions.project_uuid` 追加、`insertIfNotExists` 呼び出し修正
2. `backend/src/services/maimlService.ts` - UUID抽出ヘルパー追加、`project_uuid` 更新、`uploadFileWithRetry` に `project_uuid` 渡し

## 承認記録
- **計画書提示日時**: 2026-04-13 18:07
- **承認日時**: 2026-04-13 18:12

## 実施記録

### 実施日時
開始: 2026-04-13 18:12  
完了: 2026-04-13 18:17

### 変更内容

#### `backend/src/services/storageService.ts`
- `UploadOptions` インターフェースに `project_uuid?: string` フィールドを追加
- `uploadFile` メソッド内の `insertIfNotExists` 呼び出し時に条件付きで `project_uuid` を渡す
  - 条件: `filePath` が `projects/` を含む かつ `archive/` を含まない場合のみ設定

#### `backend/src/services/maimlService.ts`
- `uploadFileWithRetry` の options 型に `project_uuid?: string` を追加
- `extractDocumentUuid(content)` ヘルパー関数を追加（DOMParser で `<Document uuid="...">` から UUID 抽出）
- `saveMaiML` 内でアップロード前に UUID を抽出し、`uploadFileWithRetry` に `project_uuid` を渡す
  - 条件: `normalizedFileKey` が `/projects/` を含む かつ `/archive/` を含まない場合のみ
- `project_maiml_flg` 更新ブロックを拡張し、`project_uuid` も必要に応じて更新するよう変更

### TypeScriptコンパイル結果
今回の修正に起因するエラーなし（既存エラー3件はすべて別ファイル・別課題）

### 最終的な成果物
- [x] `project.project_uuid` が `saveMaiML` 実行時に更新されるようになった
- [x] `file_metadata.project_uuid` が最新MAIMLアップロード時のみ設定されるようになった
- [x] archiveバックアップ・フォーマットファイルには `project_uuid` が設定されない（UUID一意特定を保証）
