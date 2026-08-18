# タスク計画書: チーム一覧代表者フィルタとlayer自動算出修正

## メタデータ
- **作成日時**: 2026-08-05 09:29
- **タスクID**: チーム一覧代表者フィルタとlayer自動算出修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

チーム管理機能に存在する以下の2つの不具合を修正する。

1. チーム一覧取得API（`GET /organization-groups`）が組織内の全チームを返しており、ログインユーザーが代表者のチームのみを返すべき仕様に反している
2. `organization_group` 新規作成時に `layer`（階層番号）が常に `null` になっている（親子関係から自動算出すべき）

## 目的と期待される成果
- [x] 調査・原因特定
- [ ] タスク計画書作成・承認
- [ ] チーム一覧APIが「自分が代表者のチームのみ」を返すよう修正
- [ ] チーム新規作成時にlayerが自動算出（親なし→1、親あり→親のlayer+1）されるよう修正
- [ ] テスト確認

## 実装ステップ

### Phase 1: バックエンド修正

#### 1-1. organizationGroupRepository.ts — chiefUserIdフィルタ追加
- `OrganizationGroupFilters` 型に `chiefUserId?: string` を追加
- `findAll` のSQL動的構築部分に `chiefUserId` 条件を追加

#### 1-2. organizationGroupService.ts — layer自動算出 + chiefUserId中継
- `createOrganizationGroup` 内で `parent_group_cd` の有無に応じて `layer` を自動算出
  - `parent_group_cd` が null → `layer = '1'`
  - `parent_group_cd` が指定あり → `findAncestorChain` の結果件数 + 1
- `getOrganizationGroups` の filters 型を更新して `chiefUserId` を中継

#### 1-3. organizationGroupController.ts — chiefUserId付与 + layer受取り除去
- `getOrganizationGroups`: `req.user!.userId` を `filters.chiefUserId` として渡す
- `createOrganizationGroup`: リクエストボディから `layer` を受け取らないよう修正

#### 1-4. organizationGroupRoutes.ts — JSDocの @body layer 削除

### Phase 2: フロントエンド修正

#### 2-1. types/team.ts — CreateOrganizationGroupRequest から layer 削除

#### 2-2. organizationGroupApiService.ts — layer 送信除去（型変更のみで自動的に対応）

### Phase 3: テスト確認

## 変更ファイル
1. `backend/src/repositories/organizationGroupRepository.ts` — chiefUserIdフィルタ追加
2. `backend/src/services/organizationGroupService.ts` — layer自動算出 + chiefUserId中継
3. `backend/src/controllers/organizationGroupController.ts` — chiefUserId付与 + layer受取り除去
4. `backend/src/routes/organizationGroupRoutes.ts` — JSDocコメント修正
5. `frontend/src/types/team.ts` — CreateOrganizationGroupRequest から layer 削除
6. `frontend/src/services/organizationGroupApiService.ts` — layer 送信除去（必要に応じて）

## リスク
| リスク | 対策 |
|--------|------|
| chiefUserIdフィルタ追加により管理者が全チーム参照できなくなる | 今回は実験管理者メニューのチーム一覧のみ対象。Admin向けAPIは別エンドポイントのため影響なし |
| layer自動算出でfindAncestorChainが失敗した場合 | エラーをthrowし、作成を中断する（nullになるより整合性を優先） |

## テスト計画
- [x] バックエンドTypeScriptビルドエラーなし（`npx tsc --noEmit` = 0エラー）
- [ ] チーム一覧APIが自分が代表者のチームのみ返すことを確認（他ユーザーが代表者のチームが除外される）
- [ ] 親なしでチーム作成 → `layer = '1'` になることを確認
- [ ] 親ありでチーム作成 → `layer = 親のlayer + 1` になることを確認
- [ ] 既存のupdate/ステータス変更APIに影響がないことを確認

## 承認記録
- **計画書提示日時**: 2026-08-05 09:29
- **承認日時**: 2026-08-05 09:29
- **承認者コメント**: updateで親変更不可のため新規作成時のlayer算出のみ対応

---

## 追加不具合対応（2026-08-05 09:55）

### 追加不具合3: チーム作成後コールバックに parentGroupCd が設定されていない

**現象**: 親を設定して新規チームを作成した後、詳細ペインの「親グループ」が表示されない  
**原因**: `TeamManagementPanel.tsx` の `handleTeamCreated` コールバックが `parentGroupCd` / `layer` / `isActive` を受け取っておらず、`newTeam` オブジェクトにこれらが未設定  
**修正方針**:
- `TeamAddDialog.tsx` の `onCreated` 呼び出しに `parentGroupCd` / `layer` / `isActive` を追加
- `TeamManagementPanel.tsx` の `handleTeamCreated` コールバック引数を拡張して `newTeam` に設定
- `types/team.ts` の `TeamAddDialogProps.onCreated` 型定義を更新

**変更ファイル**:
1. `frontend/src/types/team.ts` — `TeamAddDialogProps.onCreated` に引数追加
2. `frontend/src/components/team/TeamAddDialog.tsx` — `onCreated` 呼び出しに `parentGroupCd` / `layer` / `isActive` を渡す
3. `frontend/src/components/team/TeamManagementPanel.tsx` — `handleTeamCreated` を拡張

### 追加不具合4: namespace URI が画面表示から消えた

**現象**: チーム詳細ペインに namespace URI が表示されない  
**原因**: モック時代に `department_unit.namespace_uri` として表示されていたが、`organization_group` 移行時に表示から削除された。実際には `namespace` テーブルの `scope_key = organization_group_cd` に URI が登録されている。  
**修正方針**:
- `findAll.sql` / `findById.sql` に `namespace` テーブルを LEFT JOIN して `uri` を取得
- `OrganizationGroupRow` 型に `namespace_uri?: string | null` を追加
- `TeamManagementPanel.tsx` の詳細ペインに「名前空間URI」行を追加

**変更ファイル**:
1. `backend/src/sql/queries/organization_groups/findAll.sql` — namespace JOIN追加
2. `backend/src/sql/queries/organization_groups/findById.sql` — namespace JOIN追加
3. `backend/src/repositories/organizationGroupRepository.ts` — `namespace_uri` フィールド追加
4. `frontend/src/types/team.ts` — `OrganizationGroupRow` に `namespace_uri` 追加、`Team` に `namespaceUri` 追加
5. `frontend/src/components/team/TeamManagementPanel.tsx` — 詳細ペインに namespace URI 行を追加、loadTeams の変換に `namespaceUri` 追加

---

## 実施記録

### 実施日時
開始: 2026-08-05 09:29
完了: 2026-08-05 09:33

### 実施内容

#### Phase 1: バックエンド修正

**1-1. `backend/src/repositories/organizationGroupRepository.ts`**
- `OrganizationGroupFilters` 型に `chiefUserId?: string` を追加
- `findAll` の動的条件構築に `chiefUserId` フィルタ（`AND og.chief_user_id = $n`）を追加

**1-2. `backend/src/services/organizationGroupService.ts`**
- `createOrganizationGroup` の引数から `layer` を削除
- `parent_group_cd` の有無から `layer` を自動算出するロジックを追加
  - `parent_group_cd` が null → `layer = '1'`
  - `parent_group_cd` が指定あり → `findAncestorChain` 結果件数 + 1

**1-3. `backend/src/controllers/organizationGroupController.ts`**
- `getOrganizationGroups`: `req.user!.userId` を `filters.chiefUserId` として渡すよう修正
- `createOrganizationGroup`: リクエストボディから `layer` の受け取りを削除（自動算出に統一）
- JSDocのコメントを更新

**1-4. `backend/src/routes/organizationGroupRoutes.ts`**
- `POST /` エンドポイントの JSDoc から `@body layer` の記述を削除
- `layer` 自動算出に関するコメントを追記

#### Phase 2: フロントエンド修正

**2-1. `frontend/src/types/team.ts`**
- `CreateOrganizationGroupRequest` から `layer?: string | null` フィールドを削除
- remarks に「layer はバックエンドで自動算出」の説明を追記

**2-2. `frontend/src/services/organizationGroupApiService.ts`**
- `layer` の送信なし（修正不要）

#### Phase 3: 確認

**バックエンド TypeScript ビルドチェック**
- `npx tsc --noEmit` → エラーなし（TSC_DONE）

### 計画からの変更点
なし

### 最終的な成果物
- [x] チーム一覧APIがログインユーザーが代表者のチームのみ返すよう修正
- [x] チーム新規作成時に `layer` が自動算出されるよう修正
- [x] バックエンド TypeScript ビルドエラーなし確認
