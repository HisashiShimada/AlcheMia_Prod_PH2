# タスク計画書: チーム管理タブ organization_group 接続

## メタデータ
- **作成日時**: 2026-07-31 08:31
- **タスクID**: team_management_org_group
- **優先度**: 高
- **推定工数**: 2〜3日

---

## 1. タスク概要

`ExperimentAdminMenu.tsx` の「チーム管理」タブ（`TeamManagementPanel` / `TeamAddDialog` / `TeamEditDialog`）を、旧テーブル構成（`department_unit`）から現行の `organization_group` テーブルに接続し直す。

また、ダミーデータ/未実装状態になっているAPIコール部分を、実際に動作するAPIに完全接続する。

---

## 2. 現状の問題点

| 問題 | 詳細 |
|------|------|
| `department_unit` 接続 | `TeamAddDialog` / `TeamEditDialog` が `POST /api/v1/department-units`、`GET/PUT /api/v1/department-units/...` を呼び出しているが、これは廃止予定の旧テーブル（`department`テーブルへのFKを持つ旧構成） |
| チーム一覧取得が未実装 | `GET /api/v1/department-units/my-teams` が存在しないため、常に fetch 失敗 → ダミーデータ表示 |
| 代表者更新が未実装 | `PUT /api/v1/department-units/:id/owner` が存在しない |
| organization_group にメンバーAPI未整備 | `organization_group_user` テーブルへのメンバー一覧取得・更新用 API が Backend に存在しない |

---

## 3. 目的と期待される成果

- [ ] チーム管理タブで `organization_group` テーブルのデータを取得・表示できる
- [ ] チーム（グループ）の作成・編集・削除ができる
- [ ] メンバーの追加・削除ができる
- [ ] 代表者（`chief_user_id`）の変更ができる
- [ ] ダミーデータを排除し、モックへのフォールバックをなくす
- [ ] `department_unit` 関連ファイルを廃止する

---

## 4. テーブル構成の比較

### 旧: `department_unit`（廃止対象）
```sql
department_unit (
  organization_id UUID NOT NULL,
  department_unit_id VARCHAR(50) NOT NULL,  -- PK
  department_cd VARCHAR(50),                -- department テーブルへの FK（廃止予定）
  unit_name VARCHAR(255) NOT NULL,
  layer INTEGER NOT NULL,
  ...
)
-- メンバーは organization_user.department_unit_id（1人1チームのみ）
```

### 新: `organization_group`（移行先）
```sql
organization_group (
  organization_id UUID NOT NULL,
  organization_group_cd VARCHAR(50) NOT NULL,  -- PK（CDはユーザー/自動生成）
  organization_group_name VARCHAR(255) NOT NULL,
  chief_user_id VARCHAR(50) NOT NULL,          -- 代表者ユーザーID
  parent_group_cd VARCHAR(50),                 -- 親グループ（階層構造対応）
  layer VARCHAR(20),
  create_user_id, create_at, update_user_id, update_at
)
-- メンバーは organization_group_user（多対多）
-- organization_group_user(organization_id, organization_group_cd, user_id)
```

---

## 5. 確認事項（回答済み）

| # | 質問 | 回答 |
|---|------|------|
| Q1 | `organization_group_cd` の入力方法 | ✅ **ユーザーがUIで直接入力**（バリデーション：英数字・アンダースコア、重複チェックをAPI側で実施） |
| Q2 | 既存 `department_unit` データの扱い | ✅ **単純廃棄**（データ移行は行わない。テーブル・関連ファイルを削除） |
| Q3 | 階層構造（parent_group_cd / layer）のUI対応 | ✅ **親グループ選択も可能にする**（作成・編集ダイアログに親グループSelectを追加） |
| Q4 | チーム削除機能 | ✅ **追加する**（確認ダイアログ付きの削除ボタンをチーム詳細ペインに追加） |


---

## 6. 実装ステップ（確認後に着手）

### Phase 1: Backend — organization_group にメンバー管理APIを追加

#### 1-1. 新規SQLファイルの作成
- [ ] `backend/src/sql/queries/organization_groups/findMembers.sql` — グループメンバー一覧取得（`organization_group_user` JOIN `organization_user`）
- [ ] `backend/src/sql/queries/organization_groups/deleteMembers.sql` — グループメンバー全削除
- [ ] `backend/src/sql/queries/organization_groups/insertMember.sql` — グループメンバー1件追加

#### 1-2. `organizationGroupRepository.ts` にメソッド追加
- [ ] `findMembersByGroupCd(organizationId, groupCd)` — メンバー一覧取得
- [ ] `setMembers(organizationId, groupCd, userIds, tx?)` — メンバー一括更新（トランザクション）

#### 1-3. `organizationGroupService.ts` にサービス追加
- [ ] `getOrganizationGroupMembers(organizationId, groupCd)` — メンバー一覧
- [ ] `setOrganizationGroupMembers(organizationId, groupCd, userIds)` — メンバー更新
- [ ] `updateOrganizationGroupChief(organizationId, groupCd, chiefUserId)` — 代表者変更

#### 1-4. `organizationGroupController.ts` にハンドラー追加
- [ ] `getOrganizationGroupMembers` (GET `/:groupCd/members`)
- [ ] `setOrganizationGroupMembers` (PUT `/:groupCd/members`)
- [ ] `updateOrganizationGroupChief` (PUT `/:groupCd/chief`)

#### 1-5. `organizationGroupRoutes.ts` にルート追加
- [ ] `GET /api/v1/organization-groups/:groupCd/members`
- [ ] `PUT /api/v1/organization-groups/:groupCd/members`
- [ ] `PUT /api/v1/organization-groups/:groupCd/chief`

---

### Phase 2: Backend — department_unit 廃止

#### 2-1. ルート登録解除
- [ ] `backend/src/server.ts` から `departmentUnitRoutes` の import・登録を削除

#### 2-2. ファイル削除（要確認：他に参照がないか）
- [ ] `backend/src/routes/departmentUnitRoutes.ts`（削除）
- [ ] `backend/src/controllers/departmentUnitController.ts`（削除）
- [ ] `backend/src/services/departmentUnitService.ts`（削除）
- [ ] `backend/src/repositories/departmentUnitRepository.ts`（削除）
- [ ] `backend/src/sql/queries/department_units/`（フォルダごと削除）

#### 2-3. マイグレーション作成
- [ ] `backend/migrations/20260731_drop_department_unit.sql` を作成
  - `ALTER TABLE organization_user DROP COLUMN IF EXISTS department_unit_id`
  - `DROP TABLE IF EXISTS department_unit CASCADE`

---

### Phase 3: Frontend — API接続層の整備

#### 3-1. `frontend/src/services/` に `organizationGroupApiService.ts` を拡張または新規作成
既存の organizationGroupApiService があれば追記、なければ新規作成
- [ ] `getOrganizationGroups(): Promise<OrganizationGroup[]>` — チーム一覧
- [ ] `createOrganizationGroup(data): Promise<OrganizationGroup>` — チーム作成
- [ ] `updateOrganizationGroup(groupCd, data): Promise<OrganizationGroup>` — チーム更新
- [ ] `deleteOrganizationGroup(groupCd): Promise<void>` — チーム削除
- [ ] `getOrganizationGroupMembers(groupCd): Promise<OrgUser[]>` — メンバー一覧
- [ ] `setOrganizationGroupMembers(groupCd, userIds): Promise<void>` — メンバー更新
- [ ] `updateOrganizationGroupChief(groupCd, chiefUserId): Promise<void>` — 代表者変更
- [ ] `getOrgUsers(): Promise<OrgUser[]>` — ユーザー一覧（既存APIの再利用）

---

### Phase 4: Frontend — コンポーネント変更

#### 4-1. `frontend/src/types/namespace.ts` の型定義更新
- [ ] `Team` インターフェースを organization_group 仕様に更新（`departmentUnitId` → `organizationGroupCd`、`unitName` → `organizationGroupName`、`ownerUserId`/`ownerName` → `chiefUserId`/`chiefUserName`等）
- [ ] `TeamMember` インターフェースを更新
- [ ] `TeamAddDialogProps` / `TeamEditDialogProps` を更新
- [ ] `CreateTeamResponse` を更新

#### 4-2. `TeamManagementPanel.tsx` の変更
- [ ] `DUMMY_TEAMS` 定数を削除
- [ ] fetch先を `GET /api/v1/organization-groups` に変更
- [ ] `departmentUnitId` キーを `organizationGroupCd` に変更
- [ ] 親グループ名を表示（`parent_group_cd` から名称を解決して表示）
- [ ] 削除ボタンを詳細ペインに追加し、`Popconfirm`（確認ダイアログ）付きで `DELETE /api/v1/organization-groups/:groupCd` を呼び出す
  - 削除確認時：所属メンバーがいる場合は警告文言を表示
- [ ] `department-unit-members.json` モックの依存を削除

#### 4-3. `TeamAddDialog.tsx` の変更
- [ ] `POST /api/v1/organization-groups` に接続変更
- [ ] リクエストボディを organization_group 仕様に変更（`organization_group_cd`, `organization_group_name`, `parent_group_cd`, `layer`）
  - `chief_user_id` はバックエンドでログインユーザーが自動セットされるため送信不要
- [ ] `organization_group_cd` 入力フォームを追加（ユーザー直接入力・英数字/アンダースコアのみ許可するバリデーション、`onBlur`等での重複チェックは任意）
- [ ] 親グループ選択 `Select` を追加（既存の `organization-groups` 一覧を取得し、`parent_group_cd` として設定できるようにする。未選択時は `null` = ルートグループ）
- [ ] `GET /api/v1/department-units/users` → 既存のユーザー一覧API（`GET /api/v1/systemManagement/user` 等）に変更
- [ ] モックデータ依存を削除

#### 4-4. `TeamEditDialog.tsx` の変更
- [ ] `PUT /api/v1/organization-groups/:groupCd`（名称・親グループ・layer更新）に接続変更
- [ ] 親グループ選択 `Select` を追加（自分自身・自分の子孫は選択候補から除外し、循環参照を防止）
- [ ] `GET /api/v1/organization-groups/:groupCd/members`（メンバー取得）に接続変更
- [ ] `PUT /api/v1/organization-groups/:groupCd/members`（メンバー更新）に接続変更
- [ ] `PUT /api/v1/organization-groups/:groupCd/chief`（代表者変更）に接続変更
- [ ] `GET /api/v1/department-units/users` → 既存のユーザー一覧API に変更
- [ ] モックデータ依存を削除


---

## 7. 変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `backend/src/sql/queries/organization_groups/findMembers.sql` | メンバー一覧取得SQL |
| `backend/src/sql/queries/organization_groups/deleteMembers.sql` | メンバー全削除SQL |
| `backend/src/sql/queries/organization_groups/insertMember.sql` | メンバー追加SQL |
| `backend/migrations/20260731_drop_department_unit.sql` | department_unit 廃止マイグレーション |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/repositories/organizationGroupRepository.ts` | メンバー管理メソッド追加 |
| `backend/src/services/organizationGroupService.ts` | メンバー管理サービス追加 |
| `backend/src/controllers/organizationGroupController.ts` | メンバー管理ハンドラー追加 |
| `backend/src/routes/organizationGroupRoutes.ts` | メンバー管理ルート追加 |
| `backend/src/server.ts` | departmentUnitRoutes 削除 |
| `frontend/src/types/namespace.ts` | Team/TeamMember等の型更新 |
| `frontend/src/components/namespace/TeamManagementPanel.tsx` | organization-groups API接続 |
| `frontend/src/components/namespace/TeamAddDialog.tsx` | organization-groups API接続 |
| `frontend/src/components/namespace/TeamEditDialog.tsx` | organization-groups API接続 |

### 削除
| ファイル | 理由 |
|---------|------|
| `backend/src/routes/departmentUnitRoutes.ts` | department_unit廃止 |
| `backend/src/controllers/departmentUnitController.ts` | department_unit廃止 |
| `backend/src/services/departmentUnitService.ts` | department_unit廃止 |
| `backend/src/repositories/departmentUnitRepository.ts` | department_unit廃止 |
| `backend/src/sql/queries/department_units/` | department_unit廃止 |
| `frontend/mock/namespace/department-unit-members.json` | モック廃止 |

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `organization_group_cd` が NOT NULL かつ重複不可 | 中 | 自動生成 or バリデーション強化 |
| `chief_user_id` が NOT NULL のため、メンバーなしでグループ作成不可 | 高 | グループ作成時に必ず代表者を選択させる。または作成者を自動的に代表者にセット |
| `department_unit` を参照している他コードが残っていないか | 中 | 削除前に `search_files` で全参照を確認 |
| 既存の organization_group_user データが認証系SQLで使われている | 高 | メンバー削除時に `ON CONFLICT DO NOTHING` パターンを使用し、慎重に操作 |

---

## 9. 未確認事項

すべて回答済み（セクション5参照）。

---

## 10. 承認記録

- **計画書提示日時**: 2026-07-31 08:31
- **確認事項回答日時**: 2026-07-31 08:36
- **承認日時**: （承認後に記入）
- **承認者コメント**: Q1:ユーザがUIで入力 / Q2:単純廃棄 / Q3:親グループ選択も可能にする / Q4:追加する


---

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 最終的な成果物
（完了後に記録）
