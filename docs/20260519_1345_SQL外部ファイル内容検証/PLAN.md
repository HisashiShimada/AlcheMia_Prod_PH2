# タスク計画書: 外部化済みSQLとインラインSQLの内容一致検証

## メタデータ
- **作成日時**: 2026-05-19 13:45
- **タスクID**: SQL外部ファイル内容検証
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`docs/20260519_1115_SQL外部ファイル化漏れ修正/PLAN.md`（Phase A）にて作成した約82件の外部SQLファイルについて、**元になったインラインSQL（Repositoryファイル内）と内容が一致しているか**を検証する。

外部化の際にSQL内容が意図せず変更されていた場合、実行時に異なるクエリが発行されバグに繋がる可能性があるため、本検証を実施する。

---

## 2. 検証対象

### 対象ファイル（16 Repository / 約82 SQLファイル）

| Repository ファイル | SQLディレクトリ | SQLファイル数 |
|-------------------|--------------|-------------|
| `organizationRepository.ts` | `sql/queries/organizations/` | 3 |
| `passwordResetTokenRepository.ts` | `sql/queries/password_reset_tokens/` | 2 |
| `rolePermissionRepository.ts` | `sql/queries/role_permissions/` | 2 |
| `maimlAnalysisResultRepository.ts` | `sql/queries/maiml_analysis_results/` | 2 |
| `codeMasterRepository.ts` | `sql/queries/codeMaster/` | 2 |
| `maimlDraftsRepository.ts` | `sql/queries/maiml_drafts/` | 4 |
| `organizationUserRepository.ts` | `sql/queries/organization_users/` | 4 |
| `userAuthenticationRepository.ts` | `sql/queries/user_authentication/` | 4 |
| `validationHistoryRepository.ts` | `sql/queries/maiml_validation_history/` | 4 |
| `fileMetadataRepository.ts` | `sql/queries/file_metadata/` | 10 |
| `projectRepository.ts` | `sql/queries/projects/` | 12 |
| `projectTaskRepository.ts` | `sql/queries/project_tasks/` | 3 |
| `projectInstructionRepository.ts` | `sql/queries/project_instructions/` | 8 |
| `UploadBatchRepository.ts` | `sql/queries/upload_batches/` | 4 |
| `creatorRepository.ts` | `sql/queries/creators/` | 16 |
| `eventLogRepository.ts` | `sql/queries/event_log/` | 2 |
| **合計** | | **約82** |

### 検証対象外（外部化時から除外された SQL）

以下は設計上インラインのまま残しているため、検証対象外とする。

| パターン | 対象 Repository |
|---------|----------------|
| 動的カラムリストの INSERT/UPDATE | `fileMetadataRepository.ts`, `projectInstructionRepository.ts` など |
| 動的スキーマ名（`${schemaName}`） | `maimlAssetRepository.ts`（18ファイル対象外のため除外済み） |
| `daysToKeep` 動的 INTERVAL | `validationHistoryRepository.ts` `deleteOldRecords()` |

---

## 3. 検証方法

### 各SQLファイルについて以下6点を照合する

1. **操作種別**（SELECT / INSERT / UPDATE / DELETE）が一致しているか
2. **テーブル名**が一致しているか
3. **SELECT句・INSERT列・UPDATE SET句・RETURNING句**のカラム一覧が一致しているか
4. **WHERE条件**（カラム名・比較演算子・パラメータ番号）が一致しているか
5. **パラメータ番号**（`$1`〜`$N`）の順序・総数が一致しているか
6. **SQL関数**（`NOW()`・`CURRENT_TIMESTAMP`・`EXISTS`・`UNNEST` など）の使用が一致しているか

### 検証手順

1. `git log --oneline` でSQL外部ファイル化コミットを特定する
2. `git show <commit>:<SQLファイルパス>` で外部化時点のSQLファイル内容を取得する
3. 同コミットの直前（`git show <commit>^:<Repositoryファイルパス>`）でインラインSQL内容を取得する
4. 両者を比較し、齟齬があれば記録する

> **注意**: 現在のRepositoryファイルは外部化後のコードであり、インラインSQLは削除済みの可能性が高い。git履歴から外部化前の状態を取得して比較する。

---

## 4. 実装ステップ

### Phase 1: git履歴の確認

- [ ] `git log --oneline backend/src/repositories/` でSQL外部ファイル化コミットを特定する
- [ ] 対象コミットのハッシュを記録する

### Phase 2: 各Repositoryの検証（優先度順）

#### 優先度 高（運用頻度が高いRepository）

- [ ] `projectRepository.ts` ↔ `sql/queries/projects/`（12ファイル）
- [ ] `fileMetadataRepository.ts` ↔ `sql/queries/file_metadata/`（10ファイル）
- [ ] `creatorRepository.ts` ↔ `sql/queries/creators/`（16ファイル）
- [ ] `projectInstructionRepository.ts` ↔ `sql/queries/project_instructions/`（8ファイル）
- [ ] `projectTaskRepository.ts` ↔ `sql/queries/project_tasks/`（3ファイル）
- [ ] `UploadBatchRepository.ts` ↔ `sql/queries/upload_batches/`（4ファイル）

#### 優先度 中

- [ ] `organizationUserRepository.ts` ↔ `sql/queries/organization_users/`（4ファイル）
- [ ] `userAuthenticationRepository.ts` ↔ `sql/queries/user_authentication/`（4ファイル）
- [ ] `validationHistoryRepository.ts` ↔ `sql/queries/maiml_validation_history/`（4ファイル）
- [ ] `maimlDraftsRepository.ts` ↔ `sql/queries/maiml_drafts/`（4ファイル）

#### 優先度 低

- [ ] `organizationRepository.ts` ↔ `sql/queries/organizations/`（3ファイル）
- [ ] `codeMasterRepository.ts` ↔ `sql/queries/codeMaster/`（2ファイル）
- [ ] `rolePermissionRepository.ts` ↔ `sql/queries/role_permissions/`（2ファイル）
- [ ] `maimlAnalysisResultRepository.ts` ↔ `sql/queries/maiml_analysis_results/`（2ファイル）
- [ ] `passwordResetTokenRepository.ts` ↔ `sql/queries/password_reset_tokens/`（2ファイル）
- [ ] `eventLogRepository.ts` ↔ `sql/queries/event_log/`（2ファイル）

### Phase 3: 齟齬の修正

- [ ] 齟齬が見つかったSQLファイルを特定し、インラインSQLの内容を正とする
- [ ] SQLファイルを修正する（`replace_in_file`）
- [ ] TypeScriptビルドで問題がないことを確認する（`npx tsc --noEmit`）

### Phase 4: 検証結果の記録

- [ ] 本計画書の「5. 検証結果」セクションに結果を記録する
- [ ] 齟齬件数・修正件数をサマリーとして記録する

---

## 5. 検証結果（実施後に記録）

### 5-1. 対象コミット情報

- **外部ファイル化コミットハッシュ**: （実施後記入）
- **コミット日時**: 2026-05-19 12:31

### 5-2. Repository別 検証結果

| Repository | SQLファイル数 | 齟齬あり | 齟齬内容 |
|-----------|------------|---------|---------|
| `organizationRepository.ts` | 3 | - | - |
| `passwordResetTokenRepository.ts` | 2 | - | - |
| `rolePermissionRepository.ts` | 2 | - | - |
| `maimlAnalysisResultRepository.ts` | 2 | - | - |
| `codeMasterRepository.ts` | 2 | - | - |
| `maimlDraftsRepository.ts` | 4 | - | - |
| `organizationUserRepository.ts` | 4 | - | - |
| `userAuthenticationRepository.ts` | 4 | - | - |
| `validationHistoryRepository.ts` | 4 | - | - |
| `fileMetadataRepository.ts` | 10 | - | - |
| `projectRepository.ts` | 12 | - | - |
| `projectTaskRepository.ts` | 3 | - | - |
| `projectInstructionRepository.ts` | 8 | - | - |
| `UploadBatchRepository.ts` | 4 | - | - |
| `creatorRepository.ts` | 16 | - | - |
| `eventLogRepository.ts` | 2 | - | - |
| **合計** | **約82** | **-** | |

### 5-3. 修正サマリー

- **検証済みSQLファイル数**: （実施後記入）
- **齟齬検出件数**: （実施後記入）
- **修正件数**: （実施後記入）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| git履歴に外部化前のインラインSQLが残っていない | 高 | 低 | 外部化コミット直前のリビジョンを `git show` で確認 |
| 齟齬が多数あり修正工数が増大する | 高 | 中 | 優先度高のRepositoryから対応し、影響範囲の大きいものを先に修正 |
| SQLの空白・改行の違いによる誤検出 | 低 | 高 | SQL意味が同一であれば「一致」とみなす（空白・大文字小文字の差異は無視） |

---

## 7. 承認記録
- **計画書提示日時**: 2026-05-19 13:45
- **承認日時**: （承認後記入）
- **承認者コメント**:
