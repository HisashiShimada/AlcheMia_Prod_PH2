# タスク計画書（Step2）: Backend — organization_group管理CRUD機能の実装

## メタデータ

- **作成日時**: 2026-07-10 11:45
- **更新日時**: 2026-07-10 16:06（エンドポイントパス変更・CSV/ステータス更新除外・承認反映）
- **ステップ**: Step2 / 5
- **前提**: Step1（DB層移行）完了後に着手
- **推定工数**: 1日

---

## 1. ステップ概要

`organization_group` テーブルに対する管理CRUD APIを新規実装する。

**方針（2026-07-10 承認済み）:**
- エンドポイントは `/api/v1/organization-groups`（`systemManagement` 配下ではなく独立マウント）
  - 後々「チーム管理」画面（実験管理者メニュー）から利用する予定
  - `department-units` と同じ命名・マウントパターンに準拠
- 権限ミドルウェアは `authMiddleware` のみ（ロール制限は将来追加）
- ステータス更新エンドポイント（`PATCH .../status`）は除外（`organization_group` に `is_active` カラムがないため）
- CSVアップロード/ダウンロードは除外（利用画面が現状ないため、将来必要になれば別タスクで追加）

---

## 2. 目的と期待される成果

- [ ] `GET /api/v1/organization-groups` が動作する（一覧取得）
- [ ] `GET /api/v1/organization-groups/:groupCd` が動作する（単件取得）
- [ ] `POST /api/v1/organization-groups` が動作する（新規作成）
- [ ] `PUT /api/v1/organization-groups/:groupCd` が動作する（更新）
- [ ] `DELETE /api/v1/organization-groups/:groupCd` が動作する（削除）

---

## 3. 実装ステップ

### Phase 1: SQLクエリファイルの作成

- [ ] `backend/src/sql/queries/organization_groups/findAll.sql` 作成
  - `organization_group` テーブルから一覧取得（`organization_id` でフィルタ、動的 search フィルタ付き）

- [ ] `backend/src/sql/queries/organization_groups/findById.sql` 作成
  - `organization_group_cd` + `organization_id` で1件取得

- [ ] `backend/src/sql/queries/organization_groups/existsById.sql` 作成
  - 存在確認クエリ

- [ ] `backend/src/sql/queries/organization_groups/create.sql` 作成
  - INSERT文

- [ ] `backend/src/sql/queries/organization_groups/update.sql` 作成
  - UPDATE文

- [ ] `backend/src/sql/queries/organization_groups/deleteById.sql` 作成
  - DELETE文

### Phase 2: Repository層の実装

- [ ] `backend/src/repositories/organizationGroupRepository.ts` 新規作成
  - `findAll(organizationId, filters)`: 一覧取得（動的 search フィルタ対応）
  - `findById(organizationId, groupCd)`: 単件取得
  - `existsById(organizationId, groupCd)`: 存在確認
  - `create(data)`: 新規作成
  - `update(data)`: 更新
  - `deleteById(organizationId, groupCd)`: 削除

### Phase 3: Service層の実装

- [ ] `backend/src/services/organizationGroupService.ts` 新規作成
  - `getOrganizationGroups(organizationId, filters)`: 一覧取得
  - `getOrganizationGroupById(organizationId, groupCd)`: 単件取得
  - `createOrganizationGroup(organizationId, data, userId)`: 新規作成（重複CDチェック含む）
  - `updateOrganizationGroup(organizationId, groupCd, data, userId)`: 更新
  - `deleteOrganizationGroup(organizationId, groupCd)`: 削除

### Phase 4: Controller層の実装

- [ ] `backend/src/controllers/organizationGroupController.ts` 新規作成
  - `getOrganizationGroups`: GET /
  - `getOrganizationGroupById`: GET /:groupCd
  - `createOrganizationGroup`: POST /
  - `updateOrganizationGroup`: PUT /:groupCd
  - `deleteOrganizationGroup`: DELETE /:groupCd

### Phase 5: Routes層の実装

- [ ] `backend/src/routes/organizationGroupRoutes.ts` 新規作成
  - `authMiddleware` のみを適用
  - 各エンドポイントのルーティング定義

### Phase 6: server.ts の更新

- [ ] `backend/src/server.ts` 修正
  - `import organizationGroupRoutes from './routes/organizationGroupRoutes'` を追加
  - `app.use('/api/v1/organization-groups', organizationGroupRoutes)` を追加（`department-units` の近くに配置）

### Phase 7: 型定義の追加

- [ ] `backend/src/types/database.ts` に `OrganizationGroup` インターフェースを追加

---

## 4. 変更ファイル

### 新規作成

| ファイル | 内容 |
|---------|------|
| `backend/src/sql/queries/organization_groups/findAll.sql` | 一覧取得クエリ |
| `backend/src/sql/queries/organization_groups/findById.sql` | 単件取得クエリ |
| `backend/src/sql/queries/organization_groups/existsById.sql` | 存在確認クエリ |
| `backend/src/sql/queries/organization_groups/create.sql` | 新規作成クエリ |
| `backend/src/sql/queries/organization_groups/update.sql` | 更新クエリ |
| `backend/src/sql/queries/organization_groups/deleteById.sql` | 削除クエリ |
| `backend/src/repositories/organizationGroupRepository.ts` | Repositoryクラス |
| `backend/src/services/organizationGroupService.ts` | Serviceクラス |
| `backend/src/controllers/organizationGroupController.ts` | Controllerクラス |
| `backend/src/routes/organizationGroupRoutes.ts` | Routesファイル |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/server.ts` | organizationGroupRoutes を追加マウント |
| `backend/src/types/database.ts` | OrganizationGroup インターフェース追加 |

---

## 5. APIエンドポイント設計

| メソッド | エンドポイント | 説明 |
|--------|--------------|------|
| GET | `/api/v1/organization-groups` | 一覧取得（クエリ: search） |
| GET | `/api/v1/organization-groups/:groupCd` | 単件取得 |
| POST | `/api/v1/organization-groups` | 新規作成 |
| PUT | `/api/v1/organization-groups/:groupCd` | 更新 |
| DELETE | `/api/v1/organization-groups/:groupCd` | 削除 |

---

## 6. テスト計画

- [ ] 一覧取得API（GET /organization-groups）が正常に動作すること
- [ ] 検索フィルタ（search）が動作すること
- [ ] 単件取得API（GET /organization-groups/:groupCd）が正常動作すること
- [ ] 存在しないgroupCdの場合に404を返すこと
- [ ] 新規作成API（POST /organization-groups）が正常動作すること
- [ ] 重複CDの場合に409を返すこと
- [ ] 更新API（PUT /organization-groups/:groupCd）が正常動作すること
- [ ] 削除API（DELETE /organization-groups/:groupCd）が正常動作すること
- [ ] 認証なしアクセスで401を返すこと

---

## 7. 次ステップへの引き渡し事項

- `/api/v1/organization-groups` のCRUD APIが動作していること
- `backend/src/types/database.ts` に `OrganizationGroup` 型が定義されていること
- Step3（他機能参照置換）はこのStep完了後または並行して着手可能

---

## 8. 承認記録

- **計画書提示日時**: 2026-07-10 11:45
- **修正提示日時**: 2026-07-10 16:06
- **承認日時**: 2026-07-10 16:06
- **承認者コメント**: 「この方針で承認します。PLAN_02.mdを修正してActモードで実装を開始してください」

---

## 9. 実施記録

### 実施日時

- **開始**: 2026-07-10 16:07
- **完了**: 2026-07-10 16:14

### 作成ファイル一覧

| ファイル | 状態 |
|---------|------|
| `backend/src/sql/queries/organization_groups/findAll.sql` | ✅ 新規作成 |
| `backend/src/sql/queries/organization_groups/findById.sql` | ✅ 新規作成 |
| `backend/src/sql/queries/organization_groups/existsById.sql` | ✅ 新規作成 |
| `backend/src/sql/queries/organization_groups/create.sql` | ✅ 新規作成 |
| `backend/src/sql/queries/organization_groups/update.sql` | ✅ 新規作成 |
| `backend/src/sql/queries/organization_groups/deleteById.sql` | ✅ 新規作成 |
| `backend/src/repositories/organizationGroupRepository.ts` | ✅ 新規作成 |
| `backend/src/services/organizationGroupService.ts` | ✅ 新規作成 |
| `backend/src/controllers/organizationGroupController.ts` | ✅ 新規作成 |
| `backend/src/routes/organizationGroupRoutes.ts` | ✅ 新規作成 |
| `backend/src/server.ts` | ✅ 修正（organizationGroupRoutes 追加マウント） |
| `backend/src/types/database.ts` | ✅ 修正（OrganizationGroup インターフェース追加） |

### 計画からの変更点

- なし（承認済み方針通りに実施）

### ビルド確認

- `npx tsc --noEmit` → **エラーなし**（出力空）

### 最終的な成果物

- [x] `GET /api/v1/organization-groups` 実装済み（一覧取得）
- [x] `GET /api/v1/organization-groups/:groupCd` 実装済み（単件取得）
- [x] `POST /api/v1/organization-groups` 実装済み（新規作成）
- [x] `PUT /api/v1/organization-groups/:groupCd` 実装済み（更新）
- [x] `DELETE /api/v1/organization-groups/:groupCd` 実装済み（削除）
- [x] `backend/src/types/database.ts` に `OrganizationGroup` 型定義済み
