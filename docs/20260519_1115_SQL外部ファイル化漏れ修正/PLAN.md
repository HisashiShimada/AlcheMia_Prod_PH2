# タスク計画書: SQL外部ファイル化 完了記録 & 残漏れ修正

## メタデータ
- **作成日時**: 2026-05-19 11:15（統合更新: 2026-05-19 13:45）
- **タスクID**: SQL外部ファイル化漏れ修正
- **優先度**: 中
- **推定工数**: 1時間（残漏れ4件分）

---

## 1. タスク概要

`test_data/外部ファイル置き換え対象.txt` に列挙された18ファイルを対象に、SQL外部ファイル化（`loadSqlFile`化）を実施した。

本計画書は以下2フェーズの記録・計画を統合したものである。

| フェーズ | 内容 | 状況 |
|---------|------|------|
| **Phase A** | 18ファイルの外部ファイル化（82SQLファイル作成） | ✅ 完了（2026-05-19 12:31） |
| **Phase B** | Phase A完了後に発見された残漏れ4件の修正 | ❌ 未実施 |

> **注**: 旧計画書 `docs/20260519_1142_SQL外部ファイル化対応漏れ修正/PLAN.md` の内容を本計画書に統合済み。

---

## 2. Phase A 完了記録（2026-05-19 11:42〜12:31）

### 実施内容

18ファイルのインラインSQLを `loadSqlFile` による外部ファイル参照に統一。  
TypeScriptビルド（`npx tsc --noEmit`）: **EXIT:0（エラーなし）**

### 作成SQLファイル一覧（合計約82ファイル）

| ディレクトリ | ファイル数 |
|------------|-----------|
| `backend/src/sql/queries/organizations/` | 3 |
| `backend/src/sql/queries/password_reset_tokens/` | 2 |
| `backend/src/sql/queries/role_permissions/` | 2 |
| `backend/src/sql/queries/maiml_analysis_results/` | 2 |
| `backend/src/sql/queries/codeMaster/` | 2 |
| `backend/src/sql/queries/maiml_drafts/` | 4 |
| `backend/src/sql/queries/organization_users/` | 4 |
| `backend/src/sql/queries/user_authentication/` | 4 |
| `backend/src/sql/queries/maiml_validation_history/` | 4 |
| `backend/src/sql/queries/file_metadata/` | 10 |
| `backend/src/sql/queries/projects/` | 12 |
| `backend/src/sql/queries/project_tasks/` | 3 |
| `backend/src/sql/queries/project_instructions/` | 8 |
| `backend/src/sql/queries/upload_batches/` | 4 |
| `backend/src/sql/queries/creators/` | 16 |
| `backend/src/sql/queries/event_log/` | 2 |
| **合計** | **約82** |

### 対応方針（例外として外部化対象外とした SQL）

| パターン | 理由 |
|---------|------|
| 動的カラムリストの INSERT/UPDATE（`Object.keys(data)` 方式） | テーブル型Objectから動的構築するため外部化不可 |
| 動的スキーマ名を含む SQL（`maimlAssetRepository.ts`） | `${schemaName}` 置換が必要なため外部化不可 |
| 1〜2行のシンプルな存在確認（EXISTS） | `database.md` 規約の例外許容 |
| `deleteOldRecords` の INTERVAL（`daysToKeep` 動的注入） | 一部インライン維持 |

---

## 3. Phase B 残漏れ4件（未実施）

Phase A 完了後の追加調査で、以下4件のインラインSQL残存を確認した。

### 調査結果

| ファイル | メソッド名 | インラインSQL内容 | 優先度 |
|---------|-----------|-----------------|--------|
| `UploadBatchRepository.ts` | `findById()` | `SELECT * FROM upload_batch WHERE batch_id = $1` | 高 |
| `UploadBatchRepository.ts` | `delete()` | `DELETE FROM upload_batch WHERE batch_id = $1` | 高 |
| `attributeRepository.ts` | `existsByPk()` | `SELECT EXISTS (SELECT 1 FROM attribute WHERE ...)` | 中 |
| `creatorRepository.ts` | `create()` | `INSERT INTO creator (...) VALUES (...) RETURNING ...` | 中 |

> ※ `UploadBatchRepository.update()` / `search()` は動的条件構築のため例外。  
> ※ `creatorRepository.ts` の `update()` は動的SET句、`findAll()` / `findAllWithFilters()` は動的WHERE句のため例外。  
> ※ `creatorRepository.ts` の `existsById()` は既に外部化済み（`creators/existsByIdByCorporation.sql` / `creators/existsByIdByOrganization.sql`）。  
> ※ `attributeRepository.ts` の `existsByPk()` は 規約上の「単純EXISTS例外」対象だが、今回は統一方針で外部化する。

---

## 4. 期待される成果（Phase B）

- [x] `UploadBatchRepository.findById()` のSQL外部ファイル化
- [x] `UploadBatchRepository.delete()` のSQL外部ファイル化
- [x] `attributeRepository.existsByPk()` のSQL外部ファイル化
- [x] `creatorRepository.create()` のSQL外部ファイル化

---

## 5. 実装ステップ（Phase B）

### Step 1: UploadBatchRepository（2件）

**新規作成**: `backend/src/sql/queries/upload_batches/findById.sql`
```sql
-- バッチIDでバッチを取得するクエリ
-- $1: batch_id
SELECT * FROM upload_batch WHERE batch_id = $1
```

**新規作成**: `backend/src/sql/queries/upload_batches/delete.sql`
```sql
-- バッチIDでバッチを削除するクエリ
-- $1: batch_id
DELETE FROM upload_batch WHERE batch_id = $1
```

**Repository修正** (`UploadBatchRepository.ts`):
```typescript
// findById() 変更前
const query = 'SELECT * FROM upload_batch WHERE batch_id = $1';
// findById() 変更後
const query = await loadSqlFile('upload_batches/findById.sql');

// delete() 変更前
const query = 'DELETE FROM upload_batch WHERE batch_id = $1';
// delete() 変更後
const query = await loadSqlFile('upload_batches/delete.sql');
```

---

### Step 2: attributeRepository（1件）

**新規作成**: `backend/src/sql/queries/attributes/existsByPk.sql`
```sql
-- 主キー（attribute_name + attribute_value）の存在確認クエリ
-- $1: organization_id, $2: attribute_name, $3: attribute_value
SELECT EXISTS (
  SELECT 1 FROM attribute
  WHERE organization_id = $1 AND attribute_name = $2 AND attribute_value = $3
) AS exists
```

**Repository修正** (`attributeRepository.ts`):
```typescript
// 変更前（インラインSQL）
const query = `
  SELECT EXISTS (
    SELECT 1 FROM attribute
    WHERE organization_id = $1 AND attribute_name = $2 AND attribute_value = $3
  ) as exists
`;
// 変更後
const query = await loadSqlFile('attributes/existsByPk.sql');
```

---

### Step 3: creatorRepository（1件）

**新規作成**: `backend/src/sql/queries/creators/create.sql`
```sql
-- Creatorマスタを新規作成するクエリ
-- $1: organization_id, $2: creator_uuid, $3: creator_id, $4: creator_name
-- $5: creator_description, $6: creator_annotation, $7: vendor_uuid
-- $8: instrument_uuid, $9: corporation_id, $10: is_active
-- $11: create_user_id, $12: update_user_id
INSERT INTO creator (
  organization_id,
  creator_uuid,
  creator_id,
  creator_name,
  creator_description,
  creator_annotation,
  vendor_uuid,
  instrument_uuid,
  corporation_id,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
)
RETURNING
  creator_id,
  creator_name,
  creator_description,
  creator_annotation,
  is_active,
  update_at
```

**Repository修正** (`creatorRepository.ts`):
```typescript
// 変更前（インラインSQL）
const query = `
  INSERT INTO creator (
    organization_id, creator_uuid, creator_id, creator_name,
    ...
  ) VALUES (...) RETURNING ...
`;
// 変更後
const query = await loadSqlFile('creators/create.sql');
```

---

## 6. 影響範囲（Phase B）

### 新規作成するファイル（4件）
1. `backend/src/sql/queries/upload_batches/findById.sql`
2. `backend/src/sql/queries/upload_batches/delete.sql`
3. `backend/src/sql/queries/attributes/existsByPk.sql`
4. `backend/src/sql/queries/creators/create.sql`

### 修正するファイル（3件）
1. `backend/src/repositories/UploadBatchRepository.ts` - `findById()`・`delete()` メソッド内
2. `backend/src/repositories/attributeRepository.ts` - `existsByPk()` メソッド内
3. `backend/src/repositories/creatorRepository.ts` - `create()` メソッド内

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SQLファイルパスの誤記 | 中 | 低 | 既存のSQLファイル命名規則に従う |
| SQLの内容変更（意図しない差異） | 中 | 低 | インラインSQLと完全一致で移植するのみ |

---

## 8. テスト計画

### 手動テスト
- [ ] バッチ取得API（GET /files/batches/:batchId）が正常動作すること
- [ ] バッチ削除操作が正常動作すること
- [ ] 属性マスタ登録時の重複チェック（`existsByPk`）が正常動作すること
- [ ] Creatorマスタ新規作成（POST /creators）が正常動作すること

---

## 9. 承認記録
- **計画書提示日時**: 2026-05-19 13:45
- **承認日時**: （承認後記入）
- **承認者コメント**:
