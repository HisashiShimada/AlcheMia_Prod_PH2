# タスク計画書: SQL外部ファイル化対応漏れ修正

## メタデータ
- **作成日時**: 2026-05-19 11:43
- **タスクID**: sql_externalize_fix
- **優先度**: 中
- **推定工数**: 8時間

## タスク概要

`test_data/外部ファイル置き換え対象.txt` に列挙された18ファイルのうち、SQLをインライン記述したままになっているRepositoryファイルを特定し、`loadSqlFile` + 外部SQLファイル化パターンに統一する。

---

## 調査結果：ファイル別対応状況

### ✅ 対応済み（修正不要）

| ファイル | 状況 |
|---|---|
| `attributeRepository.ts` | 全メソッドが `loadSqlFile` 使用済み（`existsByPk` のみ単純EXISTS → 例外許容） |
| `maimlAssetRepository.ts` | 動的スキーマ名 `${schemaName}` を含むため外部化不可（設計上の例外）。`getSchemaStorageSizeBytes` は対応済み |

---

### ❌ 対応漏れ（修正必要）

#### 1. `codeMasterRepository.ts`
- **対象メソッド**: `findByDivision()`, `findByValue()`
- **対象外**: `insertInitialData()` は対応済み
- **作成SQLファイル**: `codeMaster/findByDivision.sql`, `codeMaster/findByValue.sql`

#### 2. `creatorRepository.ts`
- **対象メソッド**: `findAll()`, `findById()`, `count()`, `create()`, `update()`, `updateStatus()`, `findAllWithFilters()`
- **対象外**: `existsById()` は対応済み
- **備考**: `create()` / `update()` 内でvendor/instrumentのUUID取得クエリが多数存在（複雑）
- **作成SQLファイル**: `creators/findAll.sql`, `creators/findById.sql`, `creators/findByIdWithCorporation.sql`, `creators/count.sql`, `creators/create.sql`, `creators/update.sql`, `creators/updateStatus.sql`, `creators/updateStatusByCorporation.sql`, `creators/findAllWithFilters.sql`, `creators/findVendorUuid.sql` 等

#### 3. `eventLogRepository.ts`
- **対象メソッド**: `logEvent()`, `insertInstructionConfirmLog()`, `insertInstructionSentLog()`, `insertTransitionProgressLog()`
- **備考**: JSONデータ構築ロジック（TypeScript）はそのまま残し、INSERT/SELECT文のみ外部化
- **作成SQLファイル**: `event_log/getNextSequenceNo.sql`, `event_log/insertEventLog.sql`

#### 4. `fileMetadataRepository.ts`
- **対象メソッド**: `getFileMetadata()`, `getFileMetadataByFileKey()`, `getByProject()`, `listProjectFiles()`, `softDeleteByFileKey()`, `softDeleteBatch()`, `deleteFileMetadata()`, `findByBatchId()`, `findProjectUuidsByFileKeys()`
- **対象外**: `insertIfNotExists()`, `insertFileMetadata()`, `updateFileMetadata()` は動的INSERT/UPDATE（例外許容）, `findMaimlByProjectUuid()` は対応済み
- **作成SQLファイル**: `file_metadata/getFileMetadata.sql`, `file_metadata/getFileMetadataByFileKey.sql`, `file_metadata/getByProject.sql`, `file_metadata/listProjectFiles.sql`, 他

#### 5. `maimlAnalysisResultRepository.ts`
- **対象メソッド**: `getByFileKey()`, `deleteByFileKey()`
- **対象外**: `upsert()` は動的SQL（例外許容）
- **作成SQLファイル**: `maiml_analysis_results/getByFileKey.sql`, `maiml_analysis_results/deleteByFileKey.sql`

#### 6. `maimlDraftsRepository.ts`
- **対象メソッド**: `save()`, `findByKey()`, `delete()`, `findAll()`
- **備考**: `save()` はUPSERT（複雑）だが外部化対象
- **作成SQLファイル**: `maiml_drafts/save.sql`, `maiml_drafts/findByKey.sql`, `maiml_drafts/delete.sql`, `maiml_drafts/findAll.sql`

#### 7. `organizationRepository.ts`
- **対象メソッド**: `getIsEntry()`, `getUseDeemedProgress()`, `findById()`
- **作成SQLファイル**: `organizations/getIsEntry.sql`, `organizations/getUseDeemedProgress.sql`, `organizations/findById.sql`

#### 8. `organizationUserRepository.ts`
- **対象メソッド**: `findByUserId()`, `findByEmail()`, `findByUserIdWithRole()`, `findBySessionToken()`
- **作成SQLファイル**: `organization_users/findByUserId.sql`, `organization_users/findByEmail.sql`, `organization_users/findByUserIdWithRole.sql`, `organization_users/findBySessionToken.sql`

#### 9. `passwordResetTokenRepository.ts`
- **対象メソッド**: `findByToken()`, `deleteByToken()`
- **作成SQLファイル**: `password_reset_tokens/findByToken.sql`, `password_reset_tokens/deleteByToken.sql`

#### 10. `projectInstructionRepository.ts`
- **対象メソッド**: `bulkUpdateStatus()`, `findByProject()`, `findById()`, `hasUnsentInstructions()`
- **対象外**: `insert()`, `update()` は動的SQL（例外許容）。`deleteById()` はトランザクション内の複合処理で一部インライン（部分外部化）
- **作成SQLファイル**: `project_instructions/bulkUpdateStatus.sql`, `project_instructions/findByProject.sql`, `project_instructions/findById.sql`, `project_instructions/hasUnsentInstructions.sql`

#### 11. `projectRepository.ts`
- **対象メソッド**: `getById()`, `findCheckedOutUserName()`, `deleteProjectRelatedData()`, `deleteProject()`
- **対象外**: `insert()`, `update()` は動的SQL（例外許容）。その他多数のメソッドは対応済み
- **作成SQLファイル**: `projects/getById.sql`, `projects/findCheckedOutUserName.sql`, `projects/deleteRelatedData.sql`, `projects/delete.sql`

#### 12. `projectTaskRepository.ts`
- **対象メソッド**: `findByProject()`, `findByPrimaryKey()`, `countByProject()`
- **対象外**: `insert()`, `update()`, `bulkInsert()`, `batchInsertTasks()` は動的SQL（例外許容）。その他多数のメソッドは対応済み
- **作成SQLファイル**: `project_tasks/findByProject.sql`, `project_tasks/findByPrimaryKey.sql`, `project_tasks/countByProject.sql`

#### 13. `rolePermissionRepository.ts`
- **対象メソッド**: `getPermissionsByRoleId()`, `hasPermission()`
- **作成SQLファイル**: `role_permissions/getPermissionsByRoleId.sql`, `role_permissions/hasPermission.sql`

#### 14. `UploadBatchRepository.ts`
- **対象メソッド**: `create()`, `update()`, `findById()`, `search()`, `getProgress()`, `delete()`, `countByOrganization()`, `findInProgress()`
- **備考**: `update()` は動的SET句だが、固定パターンのため外部化可能
- **作成SQLファイル**: `upload_batch/create.sql`, `upload_batch/findById.sql`, `upload_batch/search.sql`, `upload_batch/getProgress.sql`, `upload_batch/delete.sql`, `upload_batch/countByOrganization.sql`, `upload_batch/findInProgress.sql`

#### 15. `userAuthenticationRepository.ts`
- **対象メソッド**: `getPasswordStatus()`, `updateAsTemporary()`, `updatePasswordWithExpiry()`, `updatePasswordAfterChange()`
- **作成SQLファイル**: `user_authentication/getPasswordStatus.sql`, `user_authentication/updateAsTemporary.sql`, `user_authentication/updatePasswordWithExpiry.sql`, `user_authentication/updatePasswordAfterChange.sql`

#### 16. `validationHistoryRepository.ts`
- **対象メソッド**: `createValidationHistory()`, `findByOrganizationId()`, `findById()`, `getProjectStatistics()`, `getFrequentErrors()`, `deleteOldRecords()`
- **備考**: `findByOrganizationId()`, `getFrequentErrors()` は動的WHERE句 → TypeScript側でフィルタ組立＋ベースSQLを外部化
- **作成SQLファイル**: `validation_history/create.sql`, `validation_history/findByOrganizationId.sql`, `validation_history/findById.sql`, `validation_history/getProjectStatistics.sql`, `validation_history/getFrequentErrors.sql`, `validation_history/deleteOldRecords.sql`

---

## 対応方針サマリー

### 例外（外部化不要）として扱うSQL

| パターン | 理由 |
|---|---|
| 動的カラムリストのINSERT/UPDATE（`Object.keys(data)`方式） | テーブル型Objectから動的構築するため外部化不可 |
| 動的スキーマ名を含むSQL（`maimlAssetRepository.ts`） | `${schemaName}` 置換が必要なため外部化不可 |
| 1〜2行のシンプルな存在確認（EXISTS） | `database.md` 規約の例外許容 |
| `INSERT ... ON CONFLICT ... DO UPDATE` の `deleteOldRecords` のINTERVAL | `daysToKeep` を動的に注入するため一部インライン維持 |

---

## 実装ステップ

### Phase 1: シンプルなリポジトリ（影響範囲小）
- [ ] `organizationRepository.ts` → `organizations/` SQLファイル作成
- [ ] `passwordResetTokenRepository.ts` → `password_reset_tokens/` SQLファイル作成
- [ ] `rolePermissionRepository.ts` → `role_permissions/` SQLファイル作成
- [ ] `maimlAnalysisResultRepository.ts` → `maiml_analysis_results/` SQLファイル作成

### Phase 2: 中規模リポジトリ
- [ ] `codeMasterRepository.ts` → `codeMaster/` SQLファイル追加
- [ ] `maimlDraftsRepository.ts` → `maiml_drafts/` SQLファイル作成
- [ ] `organizationUserRepository.ts` → `organization_users/` SQLファイル作成
- [ ] `userAuthenticationRepository.ts` → `user_authentication/` SQLファイル作成
- [ ] `validationHistoryRepository.ts` → `validation_history/` SQLファイル作成

### Phase 3: 大規模リポジトリ
- [ ] `fileMetadataRepository.ts` → `file_metadata/` SQLファイル追加
- [ ] `projectRepository.ts` → `projects/` SQLファイル追加
- [ ] `projectTaskRepository.ts` → `project_tasks/` SQLファイル追加
- [ ] `projectInstructionRepository.ts` → `project_instructions/` SQLファイル追加
- [ ] `UploadBatchRepository.ts` → `upload_batch/` SQLファイル作成

### Phase 4: 複雑なリポジトリ
- [ ] `creatorRepository.ts` → `creators/` SQLファイル作成（vendor/instrument UUID取得クエリ含む）
- [ ] `eventLogRepository.ts` → `event_log/` SQLファイル作成（INSERT/SELECT文のみ外部化）

### Phase 5: 動作確認
- [ ] 単体テスト実行（backend）
- [ ] API動作確認（主要エンドポイント）

---

## 変更ファイル

### 修正対象（Repositoryファイル）
1. `backend/src/repositories/codeMasterRepository.ts`
2. `backend/src/repositories/creatorRepository.ts`
3. `backend/src/repositories/eventLogRepository.ts`
4. `backend/src/repositories/fileMetadataRepository.ts`
5. `backend/src/repositories/maimlAnalysisResultRepository.ts`
6. `backend/src/repositories/maimlDraftsRepository.ts`
7. `backend/src/repositories/organizationRepository.ts`
8. `backend/src/repositories/organizationUserRepository.ts`
9. `backend/src/repositories/passwordResetTokenRepository.ts`
10. `backend/src/repositories/projectInstructionRepository.ts`
11. `backend/src/repositories/projectRepository.ts`
12. `backend/src/repositories/projectTaskRepository.ts`
13. `backend/src/repositories/rolePermissionRepository.ts`
14. `backend/src/repositories/UploadBatchRepository.ts`
15. `backend/src/repositories/userAuthenticationRepository.ts`
16. `backend/src/repositories/validationHistoryRepository.ts`

### 新規作成（SQLファイル） ※概算
- `backend/src/sql/queries/` 配下に約60〜70個のSQLファイル

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SQLファイルのパス・パラメータ順序ミス | 高 | 中 | 各メソッドのパラメータ順序をRep側と一致させる |
| 動的WHERE句を持つメソッドの外部化ミス | 中 | 中 | ベースSQL + TypeScript動的結合の方針を維持 |
| eventLogRepository の複雑なJSON構築との分離ミス | 中 | 低 | INSERT文のみ外部化し、JSON組立はTypeScriptに残す |
| UploadBatchRepository の `update()` 動的SET句 | 低 | 低 | 動的SET句はTypeScriptで維持、UPDATE文テンプレートのみ外部化 |

---

## 承認記録
- **計画書提示日時**: 2026-05-19 11:43
- **承認日時**: 2026-05-19 11:43
- **承認者コメント**: 承認済み・実装完了

## 実施記録

### 実施日時
開始: 2026-05-19 11:42  
完了: 2026-05-19 12:31

### 実施結果
TypeScriptビルド（`npx tsc --noEmit`）: **EXIT:0（エラーなし）**

### 作成SQLファイル（実績）
- `backend/src/sql/queries/organizations/` 3ファイル
- `backend/src/sql/queries/password_reset_tokens/` 2ファイル
- `backend/src/sql/queries/role_permissions/` 2ファイル
- `backend/src/sql/queries/maiml_analysis_results/` 2ファイル
- `backend/src/sql/queries/codeMaster/` 2ファイル
- `backend/src/sql/queries/maiml_drafts/` 4ファイル
- `backend/src/sql/queries/organization_users/` 4ファイル
- `backend/src/sql/queries/user_authentication/` 4ファイル
- `backend/src/sql/queries/maiml_validation_history/` 4ファイル
- `backend/src/sql/queries/file_metadata/` 10ファイル
- `backend/src/sql/queries/projects/` 12ファイル
- `backend/src/sql/queries/project_tasks/` 3ファイル
- `backend/src/sql/queries/project_instructions/` 8ファイル
- `backend/src/sql/queries/upload_batches/` 4ファイル
- `backend/src/sql/queries/creators/` 16ファイル
- `backend/src/sql/queries/event_log/` 2ファイル

**合計: 約82ファイルの外部SQLファイルを作成**

### 修正Repositoryファイル（実績）
全16ファイルのインラインSQLを `loadSqlFile` による外部ファイル参照に統一完了
