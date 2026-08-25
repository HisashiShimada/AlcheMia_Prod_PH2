# タスク計画書: チーム管理 論理削除対応（is_active による無効化）

## メタデータ
- **作成日時**: 2026-08-05 08:19
- **タスクID**: team-soft-delete
- **優先度**: 中
- **推定工数**: 3〜4時間

## タスク概要

`organization_group` テーブルに追加された `is_active` カラムを環境へ反映（マイグレーション）し、
現在の物理削除（`DELETE`）を論理削除（`is_active = false` に更新）に変更する。
あわせてフロントエンドの削除ボタンの位置・ラベルを変更し、無効化・有効化の切替 UI に対応する。

## 目的と期待される成果
- [ ] `organization_group` テーブルに `is_active` カラムを追加するマイグレーションSQLの作成
- [ ] バックエンドの削除 API を物理削除から論理削除（`is_active` 更新）に変更
- [ ] 無効化時に `organization_group_user`（メンバー）を物理削除（連動削除）
- [ ] フロントエンドの削除ボタン（ゴミ箱）を撤去し、右ペインに「無効化/有効化」ボタンを配置
- [ ] 非アクティブなチームも一覧に表示（グレー表示）、再有効化が可能

## 方針

| 論点 | 方針 |
|------|------|
| 削除ボタン位置 | 一覧行のゴミ箱アイコンを撤去、右ペインの編集ボタン隣に「無効化/有効化」ボタンを配置 |
| 非アクティブ表示 | 一覧に残してグレー表示（組織管理と統一） |
| 子グループ制約 | 特に制約なし（子グループは独立して有効のまま残せる） |
| メンバー（organization_group_user） | 無効化時に物理削除 |
| エンドポイント | `DELETE /:groupCd` を廃止し `PATCH /:groupCd/status` に一本化 |

## 実装ステップ

### Phase 1: マイグレーションSQL
- [ ] `backend/migrations/20260805_add_is_active_to_organization_group.sql` を作成
  - `is_active BOOLEAN NOT NULL DEFAULT true` を `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` で追加

### Phase 2: バックエンド

#### 2-1. SQLファイル
- [ ] `findAll.sql` : SELECT句に `og.is_active` を追加
- [ ] `findById.sql` : SELECT句に `og.is_active` を追加
- [ ] `create.sql` : RETURNING句に `is_active` を追加
- [ ] `update.sql` : RETURNING句に `is_active` を追加
- [ ] 新規 `updateActiveStatus.sql` : `is_active` / `update_user_id` / `update_at` を更新する専用UPDATE
- [ ] `deleteById.sql` を削除（論理削除に切替後は不要）

#### 2-2. Repository（`organizationGroupRepository.ts`）
- [ ] `OrganizationGroupRow` 型に `is_active: boolean` を追加
- [ ] `deleteById` 関数を削除
- [ ] `updateActiveStatus(organizationId, groupCd, isActive, updateUserId)` 関数を追加

#### 2-3. Service（`organizationGroupService.ts`）
- [ ] `deleteOrganizationGroup` を廃止
- [ ] `updateOrganizationGroupActiveStatus(organizationId, groupCd, isActive, updaterId)` を追加
  - 存在確認（`findById`）→ なければ E6001
  - `is_active = false` 時: メンバーを物理削除（`deleteMembers`）→ `updateActiveStatus(..., false)` 呼び出し
  - `is_active = true` 時: `updateActiveStatus(..., true)` 呼び出しのみ

#### 2-4. Controller（`organizationGroupController.ts`）
- [ ] `deleteOrganizationGroup` 関数を削除
- [ ] `updateOrganizationGroupStatus` 関数を追加（`PATCH /:groupCd/status` 用）
  - `req.body.isActive: boolean` を受け取り Service を呼び出す

#### 2-5. Routes（`organizationGroupRoutes.ts`）
- [ ] `DELETE /:groupCd` ルートを削除
- [ ] `PATCH /:groupCd/status` ルートを追加（body バリデーション: `isActive` が boolean 必須）

#### 2-6. 型定義（`backend/src/types/database.ts` 等）
- [ ] `OrganizationGroup` 型に `is_active: boolean` を追加（database.ts に定義がある場合）

### Phase 3: フロントエンド

#### 3-1. 型定義（`frontend/src/types/team.ts`）
- [ ] `OrganizationGroupRow.is_active: boolean` を追加
- [ ] `Team.isActive: boolean` を追加

#### 3-2. API Service（`frontend/src/services/organizationGroupApiService.ts`）
- [ ] `deleteOrganizationGroup` 関数を削除
- [ ] `updateOrganizationGroupStatus(groupCd, isActive)` 関数を追加
  - `PATCH /organization-groups/:groupCd/status { isActive }` を呼び出す

#### 3-3. TeamManagementPanel.tsx（UI変更）
- [ ] 左サイドバー各行から常時表示のゴミ箱アイコンボタンを撤去
- [ ] 右ペイン見出し行（編集ボタンの隣）に「無効化する / 有効化する」ボタンを追加
  - アクティブ時: `danger` スタイルで「無効化する」
  - 非アクティブ時: 通常スタイルで「有効化する」
- [ ] 無効化確認モーダルの文言を変更（「削除」→「無効化」）
- [ ] 有効化は確認モーダルなし（または軽い確認のみ）
- [ ] 非アクティブなチームの一覧行をグレー表示（`opacity` / `rowClassName` 相当）
- [ ] ステータスドットを非アクティブ時はグレーに変更
- [ ] チーム一覧マッピング時に `isActive: row.is_active` を追加

#### 3-4. 多言語ファイル（`ja.json` / `en.json`）
- [ ] `teamManagement` 配下に以下キーを追加:
  - `deactivateBtn` / `activateBtn`
  - `deactivateConfirmTitle` / `deactivateConfirmContent`
  - `deactivateSuccess` / `activateSuccess`
  - `inactiveLabel`（一覧の非アクティブ表示用）

#### 3-5. 親グループ選択のフィルタ
- [ ] `TeamAddDialog` / `TeamEditDialog` の `parentGroups` 生成時、`is_active === false` のグループを除外

## 変更ファイル一覧

### 新規作成
1. `backend/migrations/20260805_add_is_active_to_organization_group.sql`
2. `backend/src/sql/queries/organization_groups/updateActiveStatus.sql`

### 修正
3. `backend/src/sql/queries/organization_groups/findAll.sql`
4. `backend/src/sql/queries/organization_groups/findById.sql`
5. `backend/src/sql/queries/organization_groups/create.sql`
6. `backend/src/sql/queries/organization_groups/update.sql`
7. `backend/src/repositories/organizationGroupRepository.ts`
8. `backend/src/services/organizationGroupService.ts`
9. `backend/src/controllers/organizationGroupController.ts`
10. `backend/src/routes/organizationGroupRoutes.ts`
11. `frontend/src/types/team.ts`
12. `frontend/src/services/organizationGroupApiService.ts`
13. `frontend/src/components/team/TeamManagementPanel.tsx`
14. `frontend/src/locales/ja.json`
15. `frontend/src/locales/en.json`
16. `frontend/src/components/team/TeamAddDialog.tsx`（親グループフィルタ）

### 削除
17. `backend/src/sql/queries/organization_groups/deleteById.sql`

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| マイグレーション適用漏れ | 高 | `IF NOT EXISTS` で冪等性を確保 |
| 無効化後も名前空間 URI 等に group_cd が残る | 中 | 表示上は問題なし（コード参照のみ）、issue として記録 |
| 親グループが非アクティブになった後も子グループが有効のまま | 低 | 設計方針として許容（制約なし）|

## 承認記録
- **計画書提示日時**: 2026-08-05 08:19
- **承認日時**: 2026-08-05 08:19
- **承認者コメント**: 方針確認済み（削除ボタン位置変更OK・非アクティブ一覧表示OK・メンバー物理削除・エンドポイント一本化）

## 実施記録

### 実施日時
開始: 2026-08-05 08:19
完了: 進行中

### フェーズ1（マイグレーションSQL）: ✅ 完了
- [x] `backend/migrations/20260805_add_is_active_to_organization_group.sql` 作成

### フェーズ2（バックエンド）: ✅ 完了
- [x] `findAll.sql` に `og.is_active` を追加
- [x] `findById.sql` に `og.is_active` を追加
- [x] `create.sql` に `is_active` を RETURNING に追加
- [x] `update.sql` に `is_active` を RETURNING に追加
- [x] `updateActiveStatus.sql` 新規作成
- [x] `organizationGroupRepository.ts` に `is_active` フィールド追加・`updateActiveStatus` 関数追加
- [x] `organizationGroupService.ts` に `deactivateGroup` / `activateGroup` 追加
- [x] `organizationGroupController.ts` に `updateOrganizationGroupStatus` 追加（`PATCH /:groupCd/status`）
- [x] `organizationGroupRoutes.ts` にルート追加

### フェーズ3（フロントエンド）: ✅ 完了（追加修正対応中）
- [x] `frontend/src/types/team.ts` に `is_active` / `isActive` 追加
- [x] `frontend/src/services/organizationGroupApiService.ts` に `updateOrganizationGroupStatus` 追加
- [x] `TeamManagementPanel.tsx` に無効化/有効化ボタン追加
- [x] `ja.json` / `en.json` の `teamManagement` セクション更新
- [x] TeamManagementPanel: 右ペインの削除ボタン廃止 → 一覧行ごとのアクティブ/非アクティブ切替ボタン方式に変更（組織管理・ユーザー管理と統一）
- [x] TeamAddDialog: 親グループ選択で非アクティブグループを除外
- [x] TeamEditDialog: teamIsActive prop 追加（非アクティブ時は外部から無効化可能）

### 修正対応（2026-08-05 08:43〜）

**ユーザーからの指摘：**
- ボタン配置は一覧行ではなく右ペイン（詳細エリア）に配置すること
- 追加・編集ダイアログにアクティブ判定のプルダウンを追加すること

**修正内容：**
- [ ] `TeamManagementPanel.tsx`
  - 一覧行の「無効化」/「有効化」ボタンを撤去
  - 右ペイン（詳細エリア）の編集ボタン隣に「非アクティブ」/「アクティブ」切り替えボタンを配置
    - アクティブ状態 → 「非アクティブ」ボタン（danger）を表示
    - 非アクティブ状態 → 「アクティブ」ボタン（通常）を表示
- [ ] `TeamAddDialog.tsx`
  - アクティブ判定のプルダウン（「アクティブ」/「非アクティブ」）を追加
  - 選択値を `createOrganizationGroup` リクエストに含める
- [ ] `TeamEditDialog.tsx`
  - アクティブ判定のプルダウン（「アクティブ」/「非アクティブ」）を追加
  - 保存時に `updateOrganizationGroupStatus` を呼び出してアクティブ状態を更新
- [ ] `frontend/src/types/team.ts`
  - `TeamAddDialogProps` / `TeamEditDialogProps` を必要に応じて更新
- [ ] `ja.json` / `en.json`
  - ダイアログ用のアクティブ判定ラベル・選択肢キーを追加
