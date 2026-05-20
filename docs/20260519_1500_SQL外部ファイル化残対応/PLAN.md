# タスク計画書: SQL外部ファイル化残対応

## メタデータ
- **作成日時**: 2026-05-19 15:46
- **タスクID**: sql-externalize-remaining
- **優先度**: 低
- **推定工数**: 1時間

---

## 1. タスク概要

以下の6ファイルに残存するインラインSQLについて、外部ファイル化の可否を調査し、
対応可能なものは `.sql` ファイルとして外部管理に移行する。

- `fileMetadataRepository.ts`
- `maimlAssetRepository.ts`
- `projectInstructionRepository.ts`
- `systemOverviewRepository.ts`
- `UploadBatchRepository.ts`
- `validationHistoryRepository.ts`

---

## 2. 調査結果サマリー

### ✅ 外部化対応する（2件）

| # | ファイル | メソッド | 作成するSQLファイル |
|---|---------|---------|-----------------|
| 1 | `systemOverviewRepository.ts` | `getOrganizationContractInfo()` | `system_overview/getOrganizationContractInfo.sql` |
| 2 | `projectInstructionRepository.ts` | `findByProject()` | `project_instructions/findByProject.sql` |

### ⏭️ スキップする（外部化不可・理由付き）

以下は構造上の理由により外部化できないため、インライン維持とする。

---

## 3. スキップ対象一覧（詳細）

### fileMetadataRepository.ts

| メソッド | スキップ理由 |
|---------|------------|
| `executeBatchInsert()` | `UNNEST($1::uuid[], $2::varchar[], ...)` の型キャスト付き配列パラメータを使用。配列の列数が動的に変わるため外部化不可 |
| `executeBatchUpdate()` | 同上。UNNESTを使用したバッチUPDATE |
| `executeBatchDelete()` | 同上。UNNESTを使用したバッチUPDATE（論理削除） |
| `insertIfNotExists()` | `Object.entries(data)` で動的にカラム・プレースホルダーを構築するため、固定SQLに置き換えられない |
| `insertFileMetadata()` | 同上。JSONB列への `::jsonb` キャストも動的に付与するため外部化不可 |
| `updateFileMetadata()` | 動的SET句構築 + JSONB動的キャストのため外部化不可 |

### maimlAssetRepository.ts

**全メソッドスキップ**。理由：

このファイルの全SQLは `"${schemaName}".maiml_asset` のように、
**組織ID由来の動的スキーマ名**をSQLの `FROM` / `INTO` テーブル名に直接埋め込む必要がある。
SQLパラメータ（`$1`等）はテーブル名の指定に使用できないため、
外部ファイル化しても実行時に文字列置換が必須となり、外部管理の意義がない。

| メソッド | スキップ理由 |
|---------|------------|
| `createSchemaIfNotExists()` | DDL（`CREATE SCHEMA`）+ 動的スキーマ名 |
| `schemaExists()` | 動的スキーマ名を `WHERE schema_name = $1` に渡しているが1行クエリ。DDL系のため外部化対象外 |
| `findByProject()` | `"${schemaName}".maiml_asset` のスキーマ名動的埋め込み |
| `insertAsset()` | 同上 |
| `deleteAsset()` | 同上 |
| `insertInstance()` | 同上 |
| `insertElement()` | 同上 |
| `insertElementValue()` | 同上 |
| `insertInsertion()` | 同上 |
| `insertTemplate()` | 同上 |
| `insertTemplateElement()` | 同上 |
| `insertTemplateElementValue()` | 同上 |
| `insertTemplateInsertion()` | 同上 |
| `insertEvent()` | 同上 |
| `insertEventElement()` | 同上 |
| `insertEventElementValue()` | 同上 |
| `findAllWithRetention()` | 同上 |
| `findAllWithRetentionUntil()` | 動的スキーマ横断クエリ（ループ内で各スキーマのテーブルに接続）|

### projectInstructionRepository.ts

| メソッド | スキップ理由 |
|---------|------------|
| `insert()` | `Object.keys(data)` で動的カラム・プレースホルダーを構築するため外部化不可（DB操作規約準拠の動的INSERT実装）|
| `update()` | 動的SET句・WHERE句構築のため外部化不可（DB操作規約準拠の動的UPDATE実装）|

### UploadBatchRepository.ts

| メソッド | スキップ理由 |
|---------|------------|
| `update()` | `setClauses.push(...)` で更新対象カラムを動的に構築するため外部化不可 |
| `search()` | `conditions.push(...)` で検索条件を動的に構築するため外部化不可 |

### validationHistoryRepository.ts

| メソッド | スキップ理由 |
|---------|------------|
| `findByOrganizationId()` | `projectId` / `isValid` の有無によって動的にWHERE条件を追加するため外部化不可 |
| `getFrequentErrors()` | `projectId` の有無によって動的にWHERE条件を追加するため外部化不可 |

---

## 4. 変更ファイル

### 新規作成するSQLファイル
1. `backend/src/sql/queries/system_overview/getOrganizationContractInfo.sql`
2. `backend/src/sql/queries/project_instructions/findByProject.sql`

### 修正するファイル
1. `backend/src/repositories/systemOverviewRepository.ts` — `getOrganizationContractInfo()` をloadSqlFile方式に変更
2. `backend/src/repositories/projectInstructionRepository.ts` — `findByProject()` をloadSqlFile方式に変更（オプション条件は動的追加パターンを維持）

---

## 5. 実装ステップ

### Phase 1: systemOverviewRepository.ts の対応
- [ ] `system_overview/getOrganizationContractInfo.sql` を作成
- [ ] `getOrganizationContractInfo()` を `loadSqlFile` 方式に変更

### Phase 2: projectInstructionRepository.ts の対応
- [ ] `project_instructions/findByProject.sql` を作成（ベースクエリのみ）
- [ ] `findByProject()` を `loadSqlFile` 方式に変更（動的条件追加ロジックは維持）

---

## 6. 承認記録
- **計画書提示日時**: 2026-05-19 15:46
- **承認日時**: 2026-05-19 15:49
- **承認者コメント**: 承認します

## 7. 実施記録

### 実施日時
開始: 2026-05-19 15:49
完了: 2026-05-19 15:51

### 作成ファイル
- [x] `backend/src/sql/queries/system_overview/getOrganizationContractInfo.sql` — 作成完了
- [x] `backend/src/sql/queries/project_instructions/findByProject.sql` — 作成完了

### 修正ファイル
- [x] `backend/src/repositories/systemOverviewRepository.ts` — `getOrganizationContractInfo()` を `loadSqlFile` 方式に変更
- [x] `backend/src/repositories/projectInstructionRepository.ts` — `findByProject()` を `loadSqlFile` 方式に変更（動的条件追加ロジックは維持）

### スキップしたもの
計画書 §3 のスキップ対象一覧を参照（構造上の理由により外部化不可と判定）
