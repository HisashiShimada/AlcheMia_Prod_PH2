# タスク計画書: project_uuid採番分離

## メタデータ
- **作成日時**: 2026-05-18 08:53
- **最終更新**: 2026-05-18 09:22
- **タスクID**: project_uuid採番分離
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

現状、`project`テーブルの`project_uuid`と`file_metadata`テーブルの`project_uuid`には、MAIMLファイルの`<Document>`タグに記述されたUUID（以下「Document UUID」）をそのまま設定している。

これをMAIMLの Document UUID から切り離し、**プロジェクト作成時**にシステム側で `uuidv4()` を採番して `project.project_uuid` に設定するよう変更する。  
MAIMLファイルがプロジェクトに登録（アップロード・編集保存）された際は、`project.project_uuid` の値を `file_metadata.project_uuid` に設定する（Document UUIDは使用しない）。

---

## 2. 現状の問題整理

| 箇所 | 現状の動作 |
|------|-----------|
| `maimlService.ts` の `saveMaiML()` | `<Document uuid>` を抽出 → `project.project_uuid` を更新 |
| `fileAccessController.ts` の `completeChunkUpload()` | MAIMLをパースして `<Document uuid>` を抽出 → `project.project_uuid` を更新 |
| `fileAccessController.ts` の `initChunkUpload()` | `documentUuid === project.project_uuid` の比較で同一MAIMLか判定・E7013チェック |
| `file_metadata` テーブル | `uk_file_metadata_project_uuid UNIQUE (project_uuid)` が設定されている |

**問題点:**
- プロジェクト作成時に `project_uuid` が採番されず NULL のままになっている
- MAIMLアップロード・編集保存時に Document UUID を `project_uuid` に設定しており、Document UUID が変わると `project_uuid` も変わってしまう
- `project_uuid` がプロジェクトの不変識別子として機能していない

---

## 3. 目的と期待される成果

- [ ] `project_uuid` はプロジェクト作成時に `uuidv4()` で採番され、以降は変更されない
- [ ] MAIMLファイルがプロジェクトに登録（アップロード・編集保存）された際、`file_metadata.project_uuid` に `project.project_uuid` の値が設定される（Document UUID は使用しない）
- [ ] 既存の UUID 重複チェック（E7013）を廃止する
- [ ] 同一プロジェクトへのMAIML再アップロード時は、ストレージから現在のMAIMLを取得して Document UUID を比較し、同一MAIMLベースの場合のみ上書きを許可する
- [ ] 既存データの `project_uuid` は変更されず、既存動作への影響がない

---

## 4. 設計方針（確定済み）

### 4-1. `project.project_uuid` の採番

```
[プロジェクト作成時]
  → project_uuid = uuidv4() で採番（以降変更しない）

[MAIMLファイル初回アップロード完了時（completeChunkUpload）]
  → file_metadata.project_uuid = project.project_uuid を設定
  → Document UUID は project_uuid に設定しない
  → フォールバック: project.project_uuid が NULL の場合は uuidv4() で採番してから設定

[MAIMLファイル編集保存時（saveMaiML）]
  → project.project_uuid は変更しない
  → file_metadata.project_uuid = project.project_uuid を設定（更新）
```

### 4-2. `file_metadata.project_uuid` の UNIQUE 制約

**維持する**（削除しない）

- 理由: アーカイブファイルのレコードには `project_uuid = NULL` を設定（対象外）
- プロジェクトの最新MAIMLファイルのみ `project_uuid` を持つため、1プロジェクト1レコードの関係が成立

### 4-3. E7013 UUID重複チェック

**廃止する**

- `project_uuid` がシステム採番になるため Document UUID との紐付けがなくなる
- Document UUID が同じMAIMLを別プロジェクトにアップロードすることは許可

### 4-4. 同一プロジェクトへのMAIML上書きチェック（重要）

`documentUuid === project.project_uuid` の比較は廃止され、代わりに以下のロジックを実装する。  
**チャンクアップロード（`initChunkUpload`）と単一ファイルアップロード（`fileAccessService.uploadFiles()`）の両方に適用する。**

```
[project_maiml_flg = true の場合（チャンク・単一ファイル共通）]
  1. file_metadata テーブルから project_uuid でレコードを検索
     - フォールバック: project_uuid が NULL の場合は project_name で検索
  2. 取得した fileKey でストレージから現在のMAIMLファイルを取得
  3. 現在のMAIMLから Document UUID を抽出
  4. アップロード対象のMAIMLの Document UUID と比較
     - 一致する場合: 同じMAIMLをベースにした変更 → 上書き許可
     - 不一致の場合: 全く別のMAIML → エラー（E7013を転用）
```

**ユースケース**: プロジェクトのMAIMLをDLして手修正し再アップロードするケース
- DL → 手修正 → 再アップロード時、Document UUID は変わらない → 許可
- 全く別のMAIMLをアップロードしようとした場合 → エラー

---

## 5. 実装ステップ

### Phase 1: プロジェクト作成時の project_uuid 採番

#### Step 1-1: `projectService.ts` の変更
- **対象ファイル**: `backend/src/services/projectService.ts`
- **変更内容**: `createProject()` 内でプロジェクトINSERT時に `project_uuid = uuidv4()` を設定する

### Phase 2: MAIMLアップロード時の処理変更

#### Step 2-1: `fileAccessController.ts` の `completeChunkUpload()` 変更
- **対象ファイル**: `backend/src/controllers/fileAccessController.ts`
- **変更内容**:
  - Document UUID を `project_uuid` に設定する処理を削除
  - `file_metadata.project_uuid` = `project.project_uuid` に変更
  - フォールバック: `project.project_uuid` が NULL の場合は `uuidv4()` で採番して `project` を UPDATE してから設定

#### Step 2-2: `fileAccessController.ts` の `initChunkUpload()` の上書きチェック変更
- **対象ファイル**: `backend/src/controllers/fileAccessController.ts`
- **変更内容**:
  - `documentUuid === project.project_uuid` の比較ロジックを廃止
  - **E7013 チェックを廃止**
  - 代わりに以下のロジックを実装：
    1. `file_metadata` テーブルから `project_uuid` でレコードを検索（フォールバック: `project_name` で検索）
    2. `fileKey` でストレージからMAIMLを取得
    3. Document UUID を抽出して比較
    4. 不一致の場合は新規エラーコード（`E7013` を転用または新規追加）でエラーを返す

### Phase 3: MAIMLファイル編集保存時の変更

#### Step 3-1: `maimlService.ts` の `saveMaiML()` 変更
- **対象ファイル**: `backend/src/services/maimlService.ts`
- **変更内容**:
  - Document UUID を `project_uuid` に設定する処理を削除（`project.project_uuid` は変更しない）
  - `file_metadata.project_uuid` = `project.project_uuid` を設定する

### Phase 4: SQLファイル・Repository 追加

#### Step 4-1: SQLファイル追加（外部管理）
- **新規作成**: `backend/src/sql/queries/file_metadata/findByProjectUuid.sql`
- **新規作成**: `backend/src/sql/queries/file_metadata/findByProjectName.sql`

#### Step 4-2: `fileMetadataRepository.ts` にメソッド追加
- **対象ファイル**: `backend/src/repositories/fileMetadataRepository.ts`（または該当Repository）
- **変更内容**:
  - `findByProjectUuid(organizationId, projectUuid): Promise<FileMetadata | null>` を追加
  - `findByProjectName(organizationId, projectName): Promise<FileMetadata | null>` を追加（フォールバック用）

### Phase 5: 動作確認・テスト

- [ ] 新規プロジェクト作成 → `project_uuid` が `uuidv4()` で設定されること（NULL でないこと）
- [ ] MAIMLファイルアップロード → `file_metadata.project_uuid` = `project.project_uuid` で設定されること
- [ ] MAIMLファイルアップロード → `project.project_uuid` が変わらないこと
- [ ] MAIMLファイル編集保存 → `project.project_uuid` が変わらないこと
- [ ] MAIMLファイル編集保存 → `file_metadata.project_uuid` = `project.project_uuid` で設定されること
- [ ] 同一プロジェクトへの同一MAIMLの再アップロード → エラーなく上書きできること
- [ ] 同一プロジェクトへの別MAIMLのアップロード → エラーが返ること
- [ ] プロジェクトダウンロード（`<parent>` タグ注入） → `project_uuid` を使って `<parent>` が正しく挿入されること

---

## 6. 影響範囲

### 変更するファイル
1. `backend/src/services/projectService.ts` - プロジェクト作成時に `project_uuid = uuidv4()` を採番
2. `backend/src/services/maimlService.ts` - `saveMaiML()` の `project_uuid` 設定を `project.project_uuid` 参照に変更
3. `backend/src/controllers/fileAccessController.ts` - `completeChunkUpload()` の `project_uuid` 設定変更、`initChunkUpload()` の上書きチェック変更（E7013廃止・Document UUID比較ロジック追加）
4. `backend/src/services/fileAccessService.ts` - 単一ファイルアップロード（`uploadFiles()`）の `project_uuid` 設定変更、上書きチェック変更（E7013廃止・Document UUID比較ロジック追加）
5. `backend/src/repositories/fileMetadataRepository.ts` - `findByProjectUuid` / `findByProjectName` メソッド追加

### 新規作成するファイル
1. `backend/src/sql/queries/file_metadata/findByProjectUuid.sql` - `project_uuid` で検索するSQLクエリ
2. `backend/src/sql/queries/file_metadata/findByProjectName.sql` - `project_name` で検索するSQLクエリ（フォールバック用）

### 影響を受ける機能
- MAIMLファイルアップロード機能
- MAIMLファイル編集保存機能
- プロジェクト作成機能
- プロジェクトのMAIML重複チェック機能（E7013 廃止 → Document UUID比較ロジックに変更）
- `<parent>` タグ挿入機能（`maimlParentInjector.ts`）: `project_uuid` を参照しており、変更後も同様に動作

---

## 7. 技術的詳細

### project_uuid と Document UUID の役割分担（変更後）

| 項目 | 設定値 | 変更タイミング |
|------|--------|---------------|
| `project.project_uuid` | `uuidv4()`（システム採番） | プロジェクト作成時に1度だけ採番・以降変更しない |
| `file_metadata.project_uuid` | `project.project_uuid` と同値 | MAIMLファイルがプロジェクトに登録された時 |
| `<Document uuid>` in MAIML | MAIMLファイル内のUUID | このタスクでは変更しない（Document UUID 自動更新は別タスク） |

### project_uuid の採番タイミング（変更前後）

| タイミング | 現状 | 変更後 |
|-----------|------|--------|
| プロジェクト新規作成 | NULL | `uuidv4()` で採番（固定） |
| MAIML初回アップロード完了 | Document UUID を設定 | `project.project_uuid` をそのまま使用（フォールバックで NULL チェック） |
| MAIML編集保存 | Document UUID で上書き | **変更しない** |

### file_metadata.project_uuid の設定（変更前後）

| タイミング | 現状 | 変更後 |
|-----------|------|--------|
| MAIML初回アップロード（completeChunkUpload） | Document UUID を設定 | `project.project_uuid` の値を設定 |
| MAIML編集保存（saveMaiML） | Document UUID を設定 | `project.project_uuid` の値を設定 |
| アーカイブファイル | （設定していない） | **変更なし（NULL のまま）** |

### initChunkUpload の上書きチェックロジック変更

```typescript
// 変更前（Document UUID と project_uuid の比較）
if (project.project_maiml_flg) {
  if (documentUuid === project.project_uuid) {
    // 同一MAIMLとみなして上書き許可
  } else {
    // E7013: 別のプロジェクトのMAIML
  }
}

// 変更後（file_metadata + ストレージから現在のMAIMLを取得して比較）
if (project.project_maiml_flg) {
  // 1. file_metadata から fileKey を取得
  const fileMetadata = project.project_uuid
    ? await fileMetadataRepository.findByProjectUuid(organizationId, project.project_uuid)
    : await fileMetadataRepository.findByProjectName(organizationId, projectName);
  
  if (fileMetadata) {
    // 2. ストレージから現在のMAIMLを取得
    const currentMaimlBuffer = await storageService.downloadFile(
      organizationId,
      fileMetadata.fileKey
    );
    
    // 3. Document UUID を抽出して比較
    const currentDocumentUuid = extractDocumentUuidFromMaiml(currentMaimlBuffer);
    
    if (uploadingDocumentUuid !== currentDocumentUuid) {
      // 異なるDocument UUID → エラー（E7013 を転用または新規コード）
      return error(E7013, '別のMAIMLファイルへの上書きは許可されていません。同じMAIMLをベースにした変更のみ許可されます。');
    }
    // 一致する場合: 上書き許可
  }
  // fileMetadata が見つからない場合（データ不整合）: 新規アップロードとして扱う
}
```

### SQLファイルの新規追加

**`backend/src/sql/queries/file_metadata/findByProjectUuid.sql`**
```sql
-- file_metadata を project_uuid で検索（最新のMAIMLファイル）
SELECT
  organization_id,
  file_id,
  project_name,
  project_uuid,
  file_name,
  file_type,
  file_size,
  file_key,
  upload_status,
  upload_date,
  chunk_total_count,
  chunk_upload_count,
  upload_batch_id,
  create_at,
  update_at
FROM file_metadata
WHERE organization_id = $1
  AND project_uuid = $2
LIMIT 1
```

**`backend/src/sql/queries/file_metadata/findByProjectName.sql`**
```sql
-- file_metadata を project_name で検索（project_uuid が NULL の場合のフォールバック）
SELECT
  organization_id,
  file_id,
  project_name,
  project_uuid,
  file_name,
  file_type,
  file_size,
  file_key,
  upload_status,
  upload_date,
  chunk_total_count,
  chunk_upload_count,
  upload_batch_id,
  create_at,
  update_at
FROM file_metadata
WHERE organization_id = $1
  AND project_name = $2
LIMIT 1
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の `project_uuid = NULL` のプロジェクトへのMAIMLアップロード | 中 | 低 | `completeChunkUpload()` で NULL チェック + フォールバック採番で対応 |
| `initChunkUpload` でのストレージ読み込みによるレイテンシ増加 | 低 | 低 | MAIMLファイルは数百KB程度。アップロード開始時の1回のみ実行のため影響は小さい |
| E7013 廃止後のエラーコードの扱い | 低 | 低 | エラーメッセージを適切に更新し、E7013 を転用（または新規エラーコードを追加）して意味を明確にする |
| UNIQUE 制約との競合 | 低 | 低 | アーカイブファイルは `project_uuid = NULL` のままとするため問題なし |

---

## 9. テスト計画

### 手動テスト
- [ ] 新規プロジェクト作成 → `project.project_uuid` が UUID として設定されているか確認（DB確認）
- [ ] MAIMLファイルアップロード → `file_metadata.project_uuid` = `project.project_uuid` であることを確認（DB確認）
- [ ] MAIMLファイルアップロード → `project.project_uuid` が変わっていないことを確認（DB確認）
- [ ] MAIMLファイル編集保存 → `project.project_uuid` が変わっていないことを確認（DB確認）
- [ ] 同一MAIMLの再アップロード → エラーなく上書きできること
- [ ] 別MAIMLのアップロード（project_maiml_flg = true） → エラーが返ること
- [ ] プロジェクトの `<parent>` タグ付きMAIMLダウンロード → 正しく動作すること

---

## 10. 承認記録

- **計画書提示日時**: 2026-05-18 09:22（最終版）
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

---

## 11. 実施記録

### 実施日時
開始: 2026-05-18 09:00  
完了: （継続中）

### 実装状況（2026-05-18 10:40 時点）

| ステップ | 状態 | 実装内容 |
|---------|------|---------|
| Phase 1: `projectService.ts` `project_uuid` 採番 | ✅ 完了 | `createProject()` 内で `uuidv4()` を採番して `project_uuid` に設定 |
| Phase 2 Step 2-1: `completeChunkUpload()` の `project_uuid` 設定変更 | ✅ 完了 | Document UUID → `project.project_uuid` に変更。フォールバックも実装済み |
| Phase 2 Step 2-2: `initChunkUpload()` の上書きチェック変更 | ❌ **未実装** | `documentUuid === project.project_uuid` の比較が残存しており、常に不一致でエラーになる原因 |
| Phase 2 Step 2-2: `initChunkUpload()` の E7013 廃止 | ❌ **未実装** | `findProjectNameByUuid` 呼び出しが残存している |
| Phase 3: `maimlService.ts` `saveMaiML()` 変更 | ✅ 完了 | Document UUID → `project.project_uuid` に変更。インポートも先頭に追加済み |
| Phase 4 Step 4-1: SQLファイル追加 | ✅ 完了 | `findMaimlByProjectName.sql` を追加（計画書では `findByProjectName.sql` の名称だったが `findMaimlByProjectName.sql` として作成） |
| Phase 4 Step 4-2: `fileMetadataRepository.ts` にメソッド追加 | ✅ 完了 | `findMaimlByProjectName()` / `updateFileMetadata()` を追加 |
| `fileAccessService.ts` 上書きチェック変更 | ❌ **未実装** | `documentUuid === projectUuid` の比較が残存。E7013 チェック（`findProjectNameByUuid`）も残存 |
| `fileAccessService.ts` `project_uuid` 設定変更 | ✅ 完了 | Document UUID → `project.project_uuid` に変更済み |

### 計画からの変更点
- SQLファイル名が計画書（`findByProjectName.sql` / `findByProjectUuid.sql`）と異なり、`findMaimlByProjectName.sql` として作成した
- `findByProjectUuid.sql` は未作成（`updateFileMetadata()` での直接更新で代替）

### 残作業（エラー原因）
1. **`fileAccessController.ts` `initChunkUpload()` のチェック1・チェック1-b を変更**
   - チェック1: `documentUuid === project.project_uuid` → ストレージからMAIMLを取得してDocument UUID同士を比較するロジックに変更
   - チェック1-b: `findProjectNameByUuid` による E7013 チェックを廃止
2. **`fileAccessService.ts` `uploadFiles()` の上書きチェックを変更**
   - `documentUuid === projectUuid` → ストレージからMAIMLを取得してDocument UUID同士を比較するロジックに変更
   - `findProjectNameByUuid` による E7013 チェックを廃止

### 最終的な成果物
- `backend/src/controllers/fileAccessController.ts`
  - 先頭に `import { getStorageService }` を追加
  - `initChunkUpload()` のチェック1（`documentUuid === project.project_uuid` 比較）を廃止し、ストレージから現在のMAIMLを取得してDocument UUID同士を比較するロジックに変更
  - チェック1-b（`findProjectNameByUuid` による E7013 チェック）を廃止
- `backend/src/services/fileAccessService.ts`
  - `uploadFiles()` の既存MAIMLチェック（`documentUuid === projectUuid` 比較）を廃止し、ストレージから現在のMAIMLを取得してDocument UUID同士を比較するロジックに変更
  - `findProjectNameByUuid` による E7013 チェック（③-a UUID重複チェック）を廃止
- TypeScriptコンパイルエラーなし（`tsc --noEmit` exit:0）
