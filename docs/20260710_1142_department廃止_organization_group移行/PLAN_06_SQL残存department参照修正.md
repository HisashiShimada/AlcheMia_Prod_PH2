# タスク計画書: SQL残存department参照修正

## メタデータ

- **作成日時**: 2026-07-13 09:25
- **タスクID**: sql_department_ref_fix
- **優先度**: 高（動作確認エラーの解消）
- **推定工数**: 2〜3時間
- **依存**: PLAN_01〜04 完了後（Step5実施前に本タスクを完了すること）

---

## 1. タスク概要

Step4完了後の動作確認で、プロジェクト一覧取得APIがエラーとなった。原因は `backend/src/sql/queries` 配下（`departments/`フォルダを除く）に、すでにマイグレーション済みの `project.department_cd`（→`organization_group_cd`）・`attribute.department_cd`（→`organization_group_cd`）を**旧カラム名・旧テーブル名で参照しているSQLファイルが残存**していたため。

該当SQLおよび対応するTypeScript側（Repository/Service/Controller）を修正する。  
あわせて、組織ユーザー作成時のSQL（`createOrganizationUser.sql`）が廃止予定の `department_cd` カラムを参照しているため、`organization_group_user` への割当に置き換える。

---

## 2. 目的と期待される成果

- [ ] `project` / `attribute` テーブルを参照するSQLが `organization_group` テーブル・`organization_group_cd` カラムを正しく参照する
- [ ] 組織ユーザー作成時に `organization_user.department_cd` を使用せず、`organization_group_user` テーブルへの割当に変更される
- [ ] プロジェクト一覧取得API・Attributeマスタ関連API・ユーザー作成APIが正常に動作する
- [ ] `tsc --noEmit` でエラーゼロ

---

## 3. 変更ファイル一覧

### 新規作成

| ファイル | 目的 |
|---|---|
| `backend/src/sql/queries/organizations/createOrganizationGroupUser.sql` | `organization_group_user` への INSERT クエリ |

### 修正対象

| ファイル | 変更内容の概要 |
|---|---|
| `backend/src/sql/queries/projects/findAllWithDetails.sql` | `department_cd`→`organization_group_cd`、`LEFT JOIN department d`→`LEFT JOIN organization_group d`、GROUP BY句も修正 |
| `backend/src/sql/queries/projects/findWithOwnerAndDept.sql` | 同上 |
| `backend/src/sql/queries/attributes/findById.sql` | `department_cd`→`organization_group_cd`、`LEFT JOIN department d`→`LEFT JOIN organization_group d` |
| `backend/src/sql/queries/attributes/findAll.sql` | 同上 |
| `backend/src/sql/queries/attributes/findAllWithFilters.sql` | 同上 |
| `backend/src/sql/queries/attributes/create.sql` | INSERT列・RETURNING列の `department_cd`→`organization_group_cd`、`NULL AS department_name`→`NULL AS organization_group_name` |
| `backend/src/sql/queries/attributes/update.sql` | SET句・RETURNING句を同様に修正 |
| `backend/src/sql/queries/attributes/updateStatus.sql` | RETURNING句を同様に修正 |
| `backend/src/sql/queries/organizations/createOrganizationUser.sql` | INSERT列から `department_cd` を削除 |
| `backend/src/repositories/attributeRepository.ts` | `AttributeMaster`型・`departmentCd`パラメータ名を `organizationGroupCd` に変更 |
| `backend/src/repositories/projectRepository.ts` | `findWithOwnerAndDept` 戻り値型の `department_cd`/`department_name` を修正 |
| `backend/src/repositories/organizationManagementRepository.ts` | `createOrganizationUser` 引数の `departmentCd`→`organizationGroupCds?: string[]`、`organization_group_user` INSERT処理を追加 |
| `backend/src/services/masterService.ts` | `attr.department_cd`/`department_name` 参照箇所を修正 |
| `backend/src/services/progressService.ts` | `proj.department_name`/`department_cd` 参照箇所を修正 |
| `backend/src/services/projectService.ts` | `insertResult.department_cd`, `row.department_cd`, `row.department_name` 参照箇所を修正 |
| `backend/src/controllers/masterController.ts` | `'department_cd'` キー参照を `'organization_group_cd'` に修正 |

---

## 4. 実装ステップ

### Phase 1: SQLファイル修正

#### 4-1. `projects/findAllWithDetails.sql`

以下の修正を行う：
- `p.department_cd` → `p.organization_group_cd`
- `d.department_name` → `d.organization_group_name`
- `LEFT JOIN department d ON d.department_cd = p.department_cd` → `LEFT JOIN organization_group d ON d.organization_group_cd = p.organization_group_cd`
- GROUP BY句: `p.department_cd`, `d.department_name` → `p.organization_group_cd`, `d.organization_group_name`

#### 4-2. `projects/findWithOwnerAndDept.sql`

4-1 と同様の修正。

#### 4-3. `attributes/findById.sql`

- `a.department_cd` → `a.organization_group_cd`
- `d.department_name` → `d.organization_group_name`
- `LEFT JOIN department d ON a.organization_id = d.organization_id AND a.department_cd = d.department_cd`  
  → `LEFT JOIN organization_group d ON a.organization_id = d.organization_id AND a.organization_group_cd = d.organization_group_cd`

#### 4-4. `attributes/findAll.sql`

4-3 と同様の修正。

#### 4-5. `attributes/findAllWithFilters.sql`

4-3 と同様の修正。

#### 4-6. `attributes/create.sql`

- INSERT列: `department_cd` → `organization_group_cd`
- RETURNING列: `department_cd` → `organization_group_cd`
- RETURNING列: `NULL AS department_name` → `NULL AS organization_group_name`

#### 4-7. `attributes/update.sql`

- SET句: `department_cd = $5` → `organization_group_cd = $5`
- RETURNING列: `department_cd` → `organization_group_cd`
- RETURNING列: `NULL AS department_name` → `NULL AS organization_group_name`

#### 4-8. `attributes/updateStatus.sql`

- RETURNING列: `department_cd` → `organization_group_cd`
- RETURNING列: `NULL AS department_name` → `NULL AS organization_group_name`

---

### Phase 2: organization_user 作成・組織グループ割当 SQL対応

#### 4-9. `organizations/createOrganizationUser.sql`（修正）

INSERT列から `department_cd` を削除し、プレースホルダーの番号を詰める。

**修正前のINSERT列/VALUES:**
```sql
INSERT INTO organization_user (
  user_id, organization_id, user_name, role_cd, mail_address,
  department_cd, is_active, create_user_id, update_user_id, create_at, update_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
```

**修正後:**
```sql
INSERT INTO organization_user (
  user_id, organization_id, user_name, role_cd, mail_address,
  is_active, create_user_id, update_user_id, create_at, update_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
```

#### 4-10. `organizations/createOrganizationGroupUser.sql`（新規作成）

```sql
-- 組織グループユーザー割当
-- $1: organization_id, $2: organization_group_cd, $3: user_id
INSERT INTO organization_group_user (
  organization_id,
  organization_group_cd,
  user_id,
  create_at
) VALUES (
  $1, $2, $3, NOW()
)
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING
```

---

### Phase 3: TypeScript 追随修正

#### 4-11. `backend/src/repositories/attributeRepository.ts`

- `AttributeMaster` 型:
  - `department_cd: string | null` → `organization_group_cd: string | null`
  - `department_name: string | null` → `organization_group_name: string | null`
- `findAllWithFilters` のフィルタ引数:
  - `departmentCd?: string` → `organizationGroupCd?: string`
  - フィルタ適用時のSQL文字列置換内の `a.department_cd` → `a.organization_group_cd`
- `create` の引数:
  - `departmentCd?: string` → `organizationGroupCd?: string`
  - `data.departmentCd` → `data.organizationGroupCd`
- `update` の引数:
  - `departmentCd?: string` → `organizationGroupCd?: string`
  - `data.departmentCd` → `data.organizationGroupCd`

#### 4-12. `backend/src/repositories/projectRepository.ts`

- `findWithOwnerAndDept` 戻り値型:
  - `department_cd: string | null` → `organization_group_cd: string | null`
  - `department_name: string | null` → `organization_group_name: string | null`

#### 4-13. `backend/src/repositories/organizationManagementRepository.ts`

- `createOrganizationUser()` 引数:
  - `departmentCd?: string | null` → `organizationGroupCds?: string[] | null`
- VALUES配列から `data.departmentCd || null` を削除（$6 以降の番号を詰める）
- 関数内でグループ割当ループを追加:
  ```typescript
  if (data.organizationGroupCds && data.organizationGroupCds.length > 0) {
    const groupQuery = await loadSqlFile('organizations/createOrganizationGroupUser.sql');
    for (const groupCd of data.organizationGroupCds) {
      await t.none(groupQuery, [data.organizationId, groupCd, data.userId]);
    }
  }
  ```

#### 4-14. `backend/src/services/masterService.ts`

- `attr.department_cd` → `attr.organization_group_cd`
- `attr.department_name` → `attr.organization_group_name`（各マッピング箇所）

#### 4-15. `backend/src/services/progressService.ts`

- `proj.department_name` → `proj.organization_group_name`
- `proj.department_cd` → `proj.organization_group_cd`

#### 4-16. `backend/src/services/projectService.ts`

- `insertResult.department_cd` → `insertResult.organization_group_cd`
- `row.department_cd` → `row.organization_group_cd`
- `row.department_name` → `row.organization_group_name`

#### 4-17. `backend/src/controllers/masterController.ts`

- レスポンスオブジェクトのキー: `'department_cd'` → `'organization_group_cd'`

---

### Phase 4: 確認

- [ ] `tsc --noEmit` でエラーゼロを確認
- [ ] プロジェクト一覧取得APIの動作確認（`GET /api/v1/projects`）
- [ ] Attributeマスタ一覧・作成・更新APIの動作確認
- [ ] ユーザー新規作成APIの動作確認（組織グループ割当含む）

---

## 5. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `createOrganizationUser`引数変更が呼び出し元に型エラーを起こす | 高 | `tsc --noEmit`で全呼び出し箇所を洗い出してから修正 |
| `organization_user.department_cd` を参照する他のSQLが残っている可能性 | 中 | Phase 1-3実施後に改めて `grep -r "department" backend/src/sql/queries/` で確認 |
| `progressService` / `projectService` の修正漏れによる実行時エラー | 中 | tscチェック後に動作確認で確認 |

---

## 6. テスト計画

### 手動確認

- [ ] プロジェクト一覧取得API（`GET /api/v1/projects`）が200を返す
- [ ] プロジェクト詳細表示で `organization_group_cd` / `organization_group_name` が表示される
- [ ] Attributeマスタ一覧（`GET /api/v1/master/attributes`）が200を返す
- [ ] Attributeマスタ作成（`POST /api/v1/master/attributes`）が正常に動作する
- [ ] ユーザー新規作成（`POST /api/v1/users`）が正常に動作し、`organization_group_user` にレコードが登録される

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-13 09:25
- **承認日時**: （承認後に記入）

---

## 8. 実施記録

| 日時 | 内容 |
|------|------|
| | |
