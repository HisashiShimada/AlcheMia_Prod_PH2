# タスク計画書（Step7）: Frontend/Backend department残存参照の修正

## メタデータ

- **作成日時**: 2026-07-15 09:47
- **ステップ**: Step7 / 7（PLAN_05の前提タスク）
- **前提**: Step1〜Step4（DB層・Backend・Frontend移行）完了後に着手
- **推定工数**: 0.5日

---

## 1. ステップ概要

PLAN_03（Backend他機能参照置換）・PLAN_04（Frontend移行）では対応しきれなかった `department` 参照が残存しており、このまま PLAN_05 を実施すると以下の問題が発生する。

1. **`departmentApiService.ts` 削除時にビルドエラーが発生** (`UserManagement.tsx` が依存)
2. **Attributeマスタ編集でデータが正しく保存されないバグが存在** (フロントは `departmentCd` キーで送信しているが、バックエンドは `organizationGroupCd` キーを期待)
3. **`departmentRoutes.ts` 削除後に Attribute 部署選択肢の取得が失敗** (フロントが削除予定の `/systemManagement/department` を直接 fetch)

本ステップでこれらを解消し、PLAN_05 を安全に実施できる状態にする。

---

## 2. 目的と期待される成果

- [ ] `UserManagement.tsx` から `departmentApiService` 依存が除去されている
- [ ] ユーザー検索フィルタの `departmentCd` 関連コード（Backend/Frontend）が削除されている
- [ ] `MasterManagement.tsx` の Attribute マスタ「部署」選択が `/api/v1/organization-groups` API を使用するよう修正されている
- [ ] Attribute マスタの POST/PUT 送信キーが `organizationGroupCd` に統一されている
- [ ] Backend / Frontend ビルドが成功する

---

## 3. 実装ステップ

### Phase 1: UserManagement.tsx の部署関連コード削除

- [ ] `departmentApiService` の import を削除
- [ ] `departments` state および `fetchDepartments` 関連コードを削除
- [ ] 部署フィルタの Select コンポーネントを削除
- [ ] ユーザーテーブルの `departmentName` カラム定義を削除
- [ ] `matchesDepartment` フィルタロジックを削除
- [ ] フォームの `departmentCd` Form.Item を削除（ユーザー作成・編集モーダル）

### Phase 2: Backend userController / userRoutes / database.ts の整理

- [ ] `backend/src/controllers/userController.ts`
  - `department_cd` クエリパラメータを `filters.departmentCd` に代入している処理を削除
- [ ] `backend/src/routes/userRoutes.ts`
  - `query('department_cd')` バリデーションルールを削除
  - `body('departmentCd')` バリデーションルール（ユーザー作成・更新）を削除
- [ ] `backend/src/types/database.ts`
  - `UserSearchFilters` インターフェースの `departmentCd?: string` フィールドを削除

### Phase 3: MasterManagement.tsx の Attribute 部署選択修正

- [ ] `departmentOptions` / `setDepartmentOptions` 変数を `organizationGroupOptions` / `setOrganizationGroupOptions` にリネーム
- [ ] Attribute マスタ選択時の選択肢取得処理を修正
  - 変更前: `fetch(\`\${apiUrl}/systemManagement/department\`, ...)`
  - 変更後: `fetch(\`/api/v1/organization-groups\`, { credentials: 'include' })` 
  - レスポンス構造の差異を吸収（`organizationGroupCd`/`organizationGroupName` キーで受け取る）
- [ ] フォーム内 `departmentName` フィールドの参照を修正
  - Form.Item の `name="departmentCd"` → `name="organizationGroupCd"` に変更
  - Select の options を `organizationGroupOptions` に変更
- [ ] POST（新規作成）リクエストボディの修正
  - `departmentCd: values.departmentCd` → `organizationGroupCd: values.organizationGroupCd` に変更
- [ ] PUT（更新）リクエストボディの修正
  - 同様に `departmentCd` → `organizationGroupCd` に変更
- [ ] `masterDataTypes.ts` の定義確認・修正
  - `departmentCd`/`departmentName` が Attribute 関連で使われている箇所を `organizationGroupCd`/`organizationGroupName` に変更

### Phase 4: ビルド確認

- [ ] Backend ビルドが成功すること
  ```bash
  (cd backend && npx tsc --noEmit 2>&1)
  ```
- [ ] Frontend ビルドが成功すること
  ```bash
  (cd frontend && npx tsc --noEmit 2>&1)
  ```

---

## 4. 変更ファイル一覧

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/SystemManagement/UserManagement.tsx` | departmentApiService 依存・部署フィルタ・departmentCd フォームフィールドを削除 |
| `backend/src/controllers/userController.ts` | department_cd フィルタ処理を削除 |
| `backend/src/routes/userRoutes.ts` | department_cd / departmentCd バリデーションルールを削除 |
| `backend/src/types/database.ts` | UserSearchFilters.departmentCd フィールドを削除 |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | Attribute部署選択を organization-groups API 使用に修正 |
| `frontend/src/types/masterDataTypes.ts` | departmentCd/departmentName → organizationGroupCd/organizationGroupName に変更（Attribute関連） |

---

## 5. スコープ外（今回対応しない）

以下の `department` 参照は今回のスコープ外とする。

| 対象 | 理由 |
|------|------|
| `backend/src/repositories/departmentUnitRepository.ts` 等 `departmentUnit` 関連ファイル | チーム管理機能（`department_unit` テーブル）は今回の移行対象外の独立機能 |
| `backend/src/repositories/namespaceTermRepository.ts` の `departmentCd` | 名前空間機能は今回の移行対象外 |
| `backend/src/services/maimlService.ts` の `departmentCd` 変数名 | S3パス構造 `formats/{departmentCd}/...` の変数名で、DB の `department` テーブルとは無関係（別タスク） |
| `docs/design/db/ddl/namespace.sql` の `department_cd` カラム | DDL ファイルの整合性は別タスクで対応 |

---

## 6. テスト計画

- [ ] ユーザー管理画面が表示されること（部署フィルタなしで動作すること）
- [ ] ユーザーの追加・編集モーダルが表示されること
- [ ] Attribute マスタ管理画面で組織グループの選択肢が表示されること
- [ ] Attribute マスタの新規作成・編集保存で `organizationGroupCd` が正しくバックエンドに送信されること
- [ ] Backend / Frontend ビルドがエラーなく完了すること

---

## 7. PLAN_05との関係

本ステップ（PLAN_07）完了後、PLAN_05（後片付け）を実施すること。
PLAN_05実施時には以下の点に注意する。

- **grep完了条件から除外するファイル・パターン**:
  - `*departmentUnit*`, `*department_unit*` （チーム管理機能：スコープ外）
  - `*namespace*` （名前空間機能：スコープ外）
  - `maimlService.ts` の `departmentCd` 変数名（S3パス変数：スコープ外）

---

## 8. 承認記録

- **計画書提示日時**: 2026-07-15 09:47
- **承認日時**: （承認後に記入）
