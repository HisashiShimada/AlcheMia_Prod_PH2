# タスク計画書: チームからグループへの表記統一

## メタデータ

- **作成日時**: 2026-08-21 10:00
- **タスクID**: 20260821_1000_チームからグループへ表記統一
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## タスク概要

`frontend/src/components/team/` 配下のコンポーネントをはじめ、フロントエンド全体に混在している「チーム（team）」という文言・命名を「グループ（group）」に統一する。

対象はフォルダ名・ファイル名・ソース内の識別子（コンポーネント名・型名・変数名・Props名）・ローケル翻訳キー・翻訳文言のすべて。

---

## 目的と期待される成果

- [ ] `components/team/` フォルダを `components/group/` に改名
- [ ] 3コンポーネントファイルを `Group〇〇.tsx` にリネーム
- [ ] `types/team.ts` を `types/group.ts` にリネームし型名を整合
- [ ] ローケル翻訳キー `teamAddDialog` / `teamEditDialog` / `teamManagement` を `groupAddDialog` / `groupEditDialog` / `groupManagement` に変更
- [ ] 日本語・英語の翻訳文言内に残る「チーム」→「グループ」置換
- [ ] 参照元ファイルのインポートパス・変数名を全件更新
- [ ] ビルドエラーなし

---

## 影響範囲

### 変更ファイル一覧（全13ファイル）

#### ① 新規作成（旧ファイルは削除）

| # | 旧ファイル | 新ファイル |
|---|-----------|-----------|
| 1 | `frontend/src/components/team/TeamAddDialog.tsx` | `frontend/src/components/group/GroupAddDialog.tsx` |
| 2 | `frontend/src/components/team/TeamEditDialog.tsx` | `frontend/src/components/group/GroupEditDialog.tsx` |
| 3 | `frontend/src/components/team/TeamManagementPanel.tsx` | `frontend/src/components/group/GroupManagementPanel.tsx` |
| 4 | `frontend/src/types/team.ts` | `frontend/src/types/group.ts` |

#### ② 既存ファイル編集

| # | ファイルパス | 変更内容 |
|---|-------------|---------|
| 5 | `frontend/src/components/menus/ExperimentAdminMenu.tsx` | インポートパス変更、コメント「チーム管理」→「グループ管理」 |
| 6 | `frontend/src/components/namespace/NamespaceMain.tsx` | インポートパス×3変更、状態変数 `teamAdd〇〇` → `groupAdd〇〇`、ローケルキー変更 |
| 7 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | インポートパス×2変更、状態変数同上、ローケルキー変更 |
| 8 | `frontend/src/types/namespace.ts` | `import from '@/types/team'` → `@/types/group`、型名 `CreateTeamResponse` → `CreateGroupResponse` |
| 9 | `frontend/src/services/organizationGroupApiService.ts` | `import from '@/types/team'` → `@/types/group`、コメント文言変更 |
| 10 | `frontend/src/components/project/ProjectManagement.tsx` | Props `onNavigateToTeamManagement` → `onNavigateToGroupManagement` |
| 11 | `frontend/src/components/project/ProjectManagementInner.tsx` | 同Props名変更、ローケルキー参照変更 |
| 12 | `frontend/src/locales/ja.json` | 翻訳キー・文言変更（詳細は実装ステップ参照） |
| 13 | `frontend/src/locales/en.json` | 翻訳キー・文言変更（詳細は実装ステップ参照） |

---

## 変更対象外（スコープ外）

| 対象 | 理由 |
|------|------|
| `TeamOutlined`（@ant-design/icons） | Antデザインのアイコン名であり変更不可 |
| `UserNsRole` 型の `kind: 'team_owner'` | ドメイン上の所有権種別（認可ロール）であり画面表記とは別概念 |
| バックエンドのエンドポイント・DBカラム名 | 今回はフロントエンドのUI表記統一のみが対象 |
| `organization_group` という命名 | DB設計上の命名であり変更対象外 |

---

## 実装ステップ（詳細チェックリスト）

### STEP 1: `types/group.ts` 作成（`types/team.ts` から改名・改修）

- [ ] `frontend/src/types/group.ts` を新規作成
  - コメント内「チーム管理機能」→「グループ管理機能」
  - コメント内「`components/team/`」→「`components/group/`」
  - `TeamMember` → `GroupMember`（型名）
  - `Team` interface → `Group` interface
  - `TeamAddDialogProps` → `GroupAddDialogProps`
  - `TeamEditDialogProps` → `GroupEditDialogProps`（Props変数名も変更）
    - `teamLabel` → `groupLabel`
    - `teamGroupCd` → `groupCd`
    - `teamOwnerUserId` → `ownerUserId`
    - `teamIsActive` → `isActive`
    - コールバック引数 `newTeamName` → `newGroupName`

### STEP 2: `components/group/` コンポーネント作成

#### 2-1: `GroupAddDialog.tsx`
- [ ] 新規作成。インポート・型名・ローケルキー `teamAddDialog.〇〇` → `groupAddDialog.〇〇` を全置換
- [ ] コンポーネント名 `TeamAddDialog` → `GroupAddDialog`

#### 2-2: `GroupEditDialog.tsx`
- [ ] 新規作成。インポート・型名・Props変数名・内部状態 `teamName` → `groupName`・ローケルキー全置換
- [ ] コンポーネント名 `TeamEditDialog` → `GroupEditDialog`

#### 2-3: `GroupManagementPanel.tsx`
- [ ] 新規作成。インポート・型名（`Team` → `Group`、`TeamMember` → `GroupMember`）・JSXコンポーネント参照・ローケルキー全置換
- [ ] コンポーネント名 `TeamManagementPanel` → `GroupManagementPanel`

### STEP 3: ローケル翻訳ファイル変更

#### 3-1: `ja.json`
- [ ] `"teamAddDialog"` → `"groupAddDialog"` キー名変更、値内「チーム」→「グループ」
- [ ] `"teamEditDialog"` → `"groupEditDialog"` キー名変更、値内「チーム」→「グループ」
- [ ] `"teamManagement"` → `"groupManagement"` キー名変更（値は現状維持）
- [ ] `projectManagement.no_team_assigned_title` → `no_group_assigned_title`（キー + 文言）
- [ ] `projectManagement.go_to_team_management` → `go_to_group_management`（キー + 文言）
- [ ] `projectManagement.no_team_assigned_description` → `no_group_assigned_description`（キー）
- [ ] `uncertainty.management.ctxMenuAddTeam` → `ctxMenuAddGroup`
- [ ] `uncertainty.management.toastTeamCreated` → `toastGroupCreated`、`toastTeamUpdated` → `toastGroupUpdated`
- [ ] `namespaceMain.ctxMenuAddTeam` → `ctxMenuAddGroup`、`toastTeamCreated` → `toastGroupCreated`、`toastTeamUpdated` → `toastGroupUpdated`
- [ ] `namespaceMain.teamAddParentLabelDefault` → `groupAddParentLabelDefault`

#### 3-2: `en.json`
- [ ] `"teamManagement"` → `"groupManagement"`、`"teamAddDialog"` → `"groupAddDialog"`、`"teamEditDialog"` → `"groupEditDialog"` キー名変更
- [ ] 値内 "team" → "group" 文言置換（title / chiefHint 等）
- [ ] `projectManagement` 配下の team → group キー・文言変更
- [ ] `uncertainty.management` / `namespaceMain` 配下の ctxMenuAddTeam / toastTeam〇〇 → group 系へ変更

### STEP 4: 参照元ファイル更新

- [ ] `ExperimentAdminMenu.tsx`: インポートパス・コンポーネント参照・コメント変更
- [ ] `NamespaceMain.tsx`: インポートパス×3・状態変数名・関数名・JSX・Props名・ローケルキー変更
- [ ] `UncertaintyManagement.tsx`: インポートパス×2・状態変数名・JSX・Props名・ローケルキー変更
- [ ] `types/namespace.ts`: import元・再エクスポート型名・`CreateTeamResponse` → `CreateGroupResponse`
- [ ] `organizationGroupApiService.ts`: import元・コメント変更
- [ ] `ProjectManagement.tsx`: Props名変更
- [ ] `ProjectManagementInner.tsx`: Props名・ローケルキー参照変更

### STEP 5: 旧ファイル削除

- [ ] `frontend/src/components/team/TeamAddDialog.tsx`
- [ ] `frontend/src/components/team/TeamEditDialog.tsx`
- [ ] `frontend/src/components/team/TeamManagementPanel.tsx`
- [ ] `frontend/src/types/team.ts`

### STEP 6: ビルド確認

- [ ] `cd frontend && npm run build` を実行してエラーゼロを確認

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ローケルキー変更漏れによる翻訳欠落（空文字表示） | 高 | 中 | grep で旧キーの残存を最終確認する |
| インポートパス変更漏れによるビルドエラー | 高 | 低 | ビルド確認ステップで検出 |
| Props名変更による型不整合 | 高 | 低 | TypeScript コンパイルで検出される |
| `types/namespace.ts` の再エクスポートが古い型名のまま | 中 | 中 | STEP4-4 で明示的に対応 |

---

## テスト計画

### ビルドテスト（必須）
- [ ] `cd frontend && npm run build` でビルドエラーゼロ

### 手動テスト（推奨）
- [ ] 実験管理者メニュー > グループ管理タブが正常表示
- [ ] グループ追加ダイアログが開閉できる
- [ ] グループ編集ダイアログが開閉・保存できる
- [ ] プロジェクト管理でグループ未所属の場合の案内文が正しく表示
- [ ] 名前空間管理のコンテキストメニュー「グループを追加」が表示
- [ ] 不確かさ管理のコンテキストメニュー「グループを追加」が表示

---

## 承認記録

- **計画書提示日時**: 2026-08-21 10:00
- **承認日時**: 2026-08-21 10:00
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-08-21 10:05
完了: 2026-08-24 （当日）

### 計画からの変更点
- `groupAddParentLabel` 変数は `UncertaintyManagement.tsx` でも使用されており計画通り対応
- `isUnassignedToTeam` → `isUnassignedToGroup` は `useProjectList.ts` のフック内変数も含めて変更（計画に明示していなかった追加対応）
- `ja.json` の `groupAddDialog` に `isActiveLabel` / `isActiveOptionActive` / `isActiveOptionInactive` を追加（旧 `teamAddDialog` に存在しなかったが `GroupAddDialog.tsx` で使用するため追加）
- `groupEditDialog` 同様に `isActiveLabel` / `isActiveOptionActive` / `isActiveOptionInactive` を追加

### 発生した問題と解決方法
- ビルド時に `TemplateEditorDialog.tsx` の既存型エラーが検出されたが、今回の変更とは無関係の既存問題であることを確認（team/group 関連エラーはゼロ）

### 最終的な成果物
- [x] `frontend/src/types/group.ts` 新規作成（旧 `team.ts` 削除済み）
- [x] `frontend/src/components/group/GroupAddDialog.tsx` 新規作成
- [x] `frontend/src/components/group/GroupEditDialog.tsx` 新規作成
- [x] `frontend/src/components/group/GroupManagementPanel.tsx` 新規作成
- [x] `frontend/src/components/team/` フォルダ削除（3ファイル削除）
- [x] `frontend/src/locales/ja.json` 翻訳キー・文言更新
- [x] `frontend/src/locales/en.json` 翻訳キー・文言更新
- [x] `ExperimentAdminMenu.tsx` インポート・参照更新
- [x] `NamespaceMain.tsx` インポート・状態変数・関数名・JSX更新
- [x] `UncertaintyManagement.tsx` インポート・状態変数・JSX更新
- [x] `types/namespace.ts` import元・再エクスポート型名更新
- [x] `organizationGroupApiService.ts` import元・コメント更新
- [x] `ProjectManagement.tsx` Props名更新
- [x] `ProjectManagementInner.tsx` Props名・ローケルキー更新
- [x] `hooks/project/useProjectList.ts` 変数名更新
- [x] 旧参照ゼロ確認済み（grep でヒットなし）

