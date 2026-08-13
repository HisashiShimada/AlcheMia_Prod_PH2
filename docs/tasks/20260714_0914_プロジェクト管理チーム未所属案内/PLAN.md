# タスク計画書: プロジェクト管理 チーム未所属ユーザー案内UI追加

## メタデータ
- **作成日時**: 2026-07-14 09:14
- **タスクID**: project-management-team-unassigned-notice
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

プロジェクト管理画面（実験管理者メニュー）において、組織階層グループ（チーム）に所属していないユーザーはプロジェクトが0件表示される。その際、原因が「未所属」であることをユーザーが把握できず混乱を招く。

本タスクでは、チームに未所属の場合にプロジェクト一覧の代わりに案内メッセージと「チーム管理へ移動」ボタンを表示し、スムーズにチーム管理タブへ誘導する。

## 背景

### 既存実装（確認済み）

バックエンド（`projectService.ts`）では既に組織グループ絞り込みが実装済み：

- `organizationGroupCds`が空配列 → 0件を返す
- 直接所属グループ ＋ その配下（子孫）グループのプロジェクトを閲覧可能
- 直接所属グループのプロジェクトのみ編集可能（`isEditable: true`）
- SystemAdmin（ROLE002）は全件・全編集可能

つまり、チーム未所属ユーザーは正常にAPIへアクセスしても0件が返ることが確定している。

## 目的と期待される成果

- [ ] チーム未所属ユーザーがプロジェクト管理タブを開いた際、案内メッセージ＋「チーム管理へ移動」ボタンが表示される
- [ ] ボタンクリックでチーム管理タブ（タブ5）へ自動的に切り替わる
- [ ] チームに所属しているユーザーは従来通りの動作

## 実装ステップ

### Phase 1: i18n文言追加
- [x] `frontend/src/locales/ja.json`: 案内文言キー追加
- [x] `frontend/src/locales/en.json`: 案内文言キー追加

### Phase 2: ProjectManagement コンポーネント修正
- [ ] `ProjectManagementInnerProps` に `user?: User` と `onNavigateToTeamManagement?: () => void` を追加
- [ ] `ProjectManagementProps` にも同様に追加し、`ProjectManagementInner` へ伝達
- [ ] `isUnassignedToTeam` フラグを算出（`user.organizationGroupCds.length === 0`）
- [ ] 左側の `ProjectFolderTree` 描画部分で `isUnassignedToTeam` の場合に案内UIを表示
- [ ] 右側の「プロジェクトを選択してください」表示エリアでも案内UIを表示

### Phase 3: ExperimentAdminMenu 修正
- [ ] `<ProjectManagement>` に `user={user}` と `onNavigateToTeamManagement={() => setCurrentTab('5')}` を追加

## 変更ファイル

1. `frontend/src/locales/ja.json` - 案内文言追加
2. `frontend/src/locales/en.json` - 案内文言追加（英語）
3. `frontend/src/components/project/ProjectManagement.tsx` - Props追加・案内UI追加
4. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - Props渡し追加

## 影響範囲

- プロジェクト管理画面（実験管理者メニュー タブ1）の表示
- チームに所属しているユーザーへの影響はなし（`user.organizationGroupCds.length > 0` の場合は従来通り）
- バックエンド変更なし

## リスク

| リスク | 対策 |
|--------|------|
| `user`がnullの場合の型エラー | optional props (`user?: User`) にし、undefinedの場合は未所属チェックをスキップ |
| チーム管理タブのキー変更 | ExperimentAdminMenuのtabItemsを参照して'5'が正しいことを確認済み |

## テスト計画

- [ ] `organizationGroupCds: []`のユーザーでプロジェクト管理タブを開き、案内UIが表示されること
- [ ] 「チーム管理へ移動」ボタンをクリックしてタブ5に切り替わること
- [ ] `organizationGroupCds`が1件以上あるユーザーで従来通り動作すること

## 承認記録

- **計画書提示日時**: 2026-07-14 09:14
- **承認日時**: 2026-07-14 09:14
- **承認者コメント**: 追加実装計画を計画書に追記したうえで実装を開始してください
