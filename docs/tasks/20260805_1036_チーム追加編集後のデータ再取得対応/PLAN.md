# タスク計画書: チーム追加・編集後のデータ再取得対応

## メタデータ
- **作成日時**: 2026-08-05 10:36
- **タスクID**: team-refresh-on-save
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`TeamManagementPanel.tsx` において、チーム追加・編集・ステータス変更の操作後に
コールバック引数だけで `Team` オブジェクトを手組み生成している現状を廃止し、
操作完了後は必ずサーバーから最新データを再取得して画面を更新する方式に変更する。

## 目的と期待される成果
- [ ] チーム追加後、サーバーから取得した最新データ（layer, namespaceUri, memberCount 等）が正しく表示される
- [ ] チーム編集後、サーバーから取得した最新データが正しく反映される
- [ ] ステータス変更後の更新ロジックを他操作と共通化し、重複コードを排除する
- [ ] `Team` 型にフィールドが増えても手組みロジックの追従漏れが発生しない構造にする

## 実装ステップ

- [ ] 共通関数 `refreshTeamDetail(groupCd)` を追加
  - `getOrganizationGroups()` で一覧再取得 → `setTeams` 更新
  - `getGroupMembers(groupCd)` でメンバー再取得 → `setSelectedTeam` 更新
- [ ] `rowToTeam` ヘルパー関数を抽出し `loadTeams` と `refreshTeamDetail` で共通利用
- [ ] `handleTeamCreated` をコールバック引数の手組み生成から `refreshTeamDetail` 呼び出しに変更
- [ ] `handleTeamSaved` をコールバック引数のマージロジックから `refreshTeamDetail` 呼び出しに変更
- [ ] `handleStatusChange` を `refreshTeamDetail` 呼び出しに変更（既存の個別再取得ロジックを削除）
- [ ] 左一覧クリック（`setSelectedTeam`）は既存のまま維持（UIレスポンス用）
- [ ] `selectedTeam?.groupCd` を監視する `useEffect`（メンバー取得）は維持

## 変更ファイル
1. `frontend/src/components/team/TeamManagementPanel.tsx` - メインの修正対象

## 変更しないファイル
- `frontend/src/components/team/TeamAddDialog.tsx`
- `frontend/src/components/team/TeamEditDialog.tsx`
- `frontend/src/types/team.ts`
- `frontend/src/services/organizationGroupApiService.ts`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`

## リスク
| リスク | 対策 |
|--------|------|
| refreshTeamDetail のローディング状態が既存のloadTeams と競合 | setLoading（一覧ローディング）とsetMembersLoading（詳細ローディング）を使い分ける |
| グループCDが見つからない場合 | converted.find が null の場合はsetSelectedTeamにnullをセットしてガード |

## 承認記録
- **計画書提示日時**: 2026-08-05 10:36
- **承認日時**: 2026-08-05 10:36
