# タスク計画書（Step5）: 後片付け — departmentテーブル・旧コード削除

## メタデータ

- **作成日時**: 2026-07-10 11:48
- **ステップ**: Step5 / 5
- **前提**: Step1〜Step4（全ステップ）完了後に着手
- **推定工数**: 0.5日

---

## 1. ステップ概要

Step1〜4で `organization_group` への移行が完了したことを確認した上で、`department` テーブルのDROP・`organization_user.department_cd` カラムのDROP・旧コードファイル・旧SQLファイルの削除を行い、プロジェクトから `department` 関連の残骸を完全に取り除く。

**多対多方針に基づく追加作業:**
- Step1で残置した `organization_user.department_cd` カラムをこのステップで正式にDROPする
- Step3でRedisフラッシュ済みのため、セッション関連の追加作業は不要

---

## 2. 目的と期待される成果

- [ ] `department` テーブルがDBから削除されている
- [ ] Backend の旧ファイル（`departmentRoutes.ts`, `departmentControler.ts`, `departmentService.ts`, `departmentRepository.ts`, `sql/queries/departments/`）が削除されている
- [ ] Frontend の旧ファイル（`DepartmentManagement.tsx`, `departmentApiService.ts`, `departmentTypes.ts`）が削除されている
- [ ] DDL の旧ファイル（`docs/design/db/ddl/department.sql`）が削除されている
- [ ] `grep -r "department" backend/src/` でヒットなし（テスト・ドキュメント除く）
- [ ] `grep -r "department" frontend/src/` でヒットなし（テスト・ドキュメント除く）

---

## 3. 実装ステップ

### Phase 1: 削除前の確認

- [ ] Backend に `department` 参照が残っていないことを確認
  ```bash
  grep -r "department" backend/src/ --include="*.ts" --include="*.sql"
  ```
- [ ] Frontend に `department` 参照が残っていないことを確認
  ```bash
  grep -r "department" frontend/src/ --include="*.ts" --include="*.tsx"
  ```
- [ ] アプリが正常に動作していることを確認（ビルド・起動・基本操作）

### Phase 2: DBマイグレーションの追加（department DROP + department_cd カラム DROP）

- [ ] `backend/migrations/20260710_drop_department.sql` を新規作成
  ```sql
  -- ============================================================
  -- 1. organization_user.department_cd カラムの削除
  --    （Step1で残置した互換カラム。Step3〜4の移行完了後に削除可能）
  -- ============================================================
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_user' AND column_name = 'department_cd'
    ) THEN
      ALTER TABLE organization_user DROP COLUMN department_cd;
    END IF;
  END$$;

  -- ============================================================
  -- 2. department テーブルの削除
  -- ============================================================
  DROP TABLE IF EXISTS department CASCADE;
  ```
- [ ] マイグレーション実行前に以下を確認すること
  - `organization_user.department_cd` カラムへのアクセスがBackend/Frontend全体で0件であること（Step3・Step4完了済みであること）
  - `project.department_cd` カラムが存在しないこと（Step1のRENAME COLUMN適用済みであること）
  - `attribute.department_cd` カラムが存在しないこと（Step1のRENAME COLUMN適用済みであること）

### Phase 3: Backend 旧ファイルの削除

- [ ] `backend/src/routes/departmentRoutes.ts` 削除
- [ ] `backend/src/controllers/departmentControler.ts` 削除
- [ ] `backend/src/services/departmentService.ts` 削除
- [ ] `backend/src/repositories/departmentRepository.ts` 削除
- [ ] `backend/src/sql/queries/departments/` ディレクトリごと削除
  - `findAll.sql`
  - `findById.sql`
  - `existsById.sql`
  - `create.sql`
  - `update.sql`
  - `updateStatus.sql`
  - `deleteById.sql`

### Phase 4: Frontend 旧ファイルの削除

- [ ] `frontend/src/components/SystemManagement/DepartmentManagement.tsx` 削除
- [ ] `frontend/src/services/departmentApiService.ts` 削除
- [ ] `frontend/src/types/departmentTypes.ts` 削除

### Phase 5: DDL 旧ファイルの削除

- [ ] `docs/design/db/ddl/department.sql` 削除

### Phase 6: テスト・その他ファイルの確認と更新

- [ ] `backend/tests/` 配下に department 関連のテストファイルがあれば削除または更新
- [ ] `backend/sql/test_data_insert.sql` 等のテストデータに `department` テーブルへのINSERTがあれば削除
- [ ] `frontend/src/types/__tests__/` 配下に department 参照があれば更新

### Phase 7: 最終確認

- [ ] Backend ビルドが成功すること
  ```bash
  cd backend && npm run build
  ```
- [ ] Frontend ビルドが成功すること
  ```bash
  cd frontend && npm run build
  ```
- [ ] `grep -r "department" backend/src/` でヒットなし
- [ ] `grep -r "department" frontend/src/` でヒットなし
- [ ] `grep -r "department" docs/design/db/` でヒットなし

---

## 4. 変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260710_drop_department.sql` | `DROP TABLE IF EXISTS department CASCADE` |

### 削除

| ファイル | 理由 |
|---------|------|
| `backend/src/routes/departmentRoutes.ts` | organization_groupRoutesに置き換え済み |
| `backend/src/controllers/departmentControler.ts` | organization_groupControllerに置き換え済み |
| `backend/src/services/departmentService.ts` | organization_groupServiceに置き換え済み |
| `backend/src/repositories/departmentRepository.ts` | organization_groupRepositoryに置き換え済み |
| `backend/src/sql/queries/departments/` (ディレクトリ) | organization_groups/に置き換え済み |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | OrganizationGroupManagement.tsxに置き換え済み |
| `frontend/src/services/departmentApiService.ts` | organizationGroupApiService.tsに置き換え済み |
| `frontend/src/types/departmentTypes.ts` | organizationGroupTypes.tsに置き換え済み |
| `docs/design/db/ddl/department.sql` | organization_group.sqlに置き換え済み |

---

## 5. テスト計画

- [ ] `DROP TABLE department` マイグレーション実行後もアプリが正常動作すること
- [ ] 組織グループ管理の CRUD が動作すること
- [ ] ユーザー管理・プロジェクト管理・フォーマット管理・進捗監視が正常動作すること
- [ ] ログイン → JWT取得 → 各画面アクセスが正常動作すること
- [ ] Backend ビルド・Frontend ビルドがエラーなく完了すること

---

## 6. 全体完了条件の最終チェックリスト

### DB状態
- [ ] `organization_group` テーブルが存在する
- [ ] `organization_group_user` テーブルが存在する（多対多中間テーブル）
- [ ] `organization_user.organization_group_cd` カラムは**存在しない**（Step1でRENAMEしたが、organization_userにはorganization_group_cdカラムは追加していない。department_cdはDROPされていること）
- [ ] `organization_user.department_cd` カラムがDB上から削除されている（Phase 2で実施）
- [ ] `project.organization_group_cd` カラムが存在する
- [ ] `attribute.organization_group_cd` カラムが存在する（attributeにdepartment_cdが存在した場合）
- [ ] `department` テーブルがDB上から削除されている

### コード状態
- [ ] Backend の全コードに `department` 参照が残っていない
- [ ] Frontend の全コードに `department` 参照が残っていない
- [ ] 関連する旧ファイルが全て削除されている
- [ ] Backend / Frontend ビルドが成功している

### 動作確認
- [ ] ログイン → JWTに `organizationGroupCds: string[]` が含まれている
- [ ] 複数グループ所属ユーザーで正常ログインできる
- [ ] 組織グループ管理の CRUD が動作する
- [ ] ユーザー管理・プロジェクト管理・フォーマット管理・進捗監視が正常動作する

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-10 11:48
- **承認日時**: （承認後に記入）
