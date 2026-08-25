# タスク計画書: チーム管理新規作成後に代表者が未設定で表示される問題の修正

## メタデータ
- **作成日時**: 2026-08-04 09:47
- **タスクID**: team_chief_not_displayed_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

チーム管理で新規グループを作成した直後、一覧から該当グループを選択すると代表者欄が「未設定」として表示される。
DB には `chief_user_id` が正しく登録されているにもかかわらず画面に反映されない。

## 原因

`TeamManagementPanel.tsx` の `handleTeamCreated` コールバックで、グループ作成後に
フロントエンドのローカル状態 (`Team` オブジェクト) を組み立てる際に
`ownerUserId` および `ownerName` が設定されていない。

```typescript
// TeamManagementPanel.tsx 104-115行
const handleTeamCreated = useCallback((groupCd: string, groupName: string) => {
  const newTeam: Team = {
    groupCd,
    unitName:    groupName,
    ownerName:   '',   // ← 常に空
    members:     [],
    memberCount: 1,
    // ownerUserId が未設定！
  };
  setSelectedTeam(newTeam);  // ← 代表者情報なしで選択状態になる
```

詳細表示では `ownerName || ownerUserId || t('chiefNotSet')` で表示するため、
両方空の場合に「未設定」と表示される。

`TeamAddDialogProps.onCreated` のシグネチャが `(groupCd, groupName)` の2引数しかなく、
代表者情報を渡す手段がない。

## 修正方針

1. `types/team.ts` の `TeamAddDialogProps.onCreated` に `ownerUserId` と `ownerName` を追加
2. `TeamAddDialog.tsx` の `onCreated` 呼び出しで `chiefUserId` と `chiefUserName` を渡す
3. `TeamManagementPanel.tsx` の `handleTeamCreated` の引数を拡張して `Team` に設定する

## 変更ファイル

1. `frontend/src/types/team.ts` — `TeamAddDialogProps.onCreated` シグネチャに `ownerUserId`, `ownerName` を追加
2. `frontend/src/components/team/TeamAddDialog.tsx` — `onCreated` 呼び出しに `chiefUserId`, `chiefUserName` を追加
3. `frontend/src/components/team/TeamManagementPanel.tsx` — `handleTeamCreated` の引数・`Team` 組み立てを修正

## テスト計画
- [ ] チーム新規作成後、一覧に追加されたグループを選択して代表者名が表示されることを確認
- [ ] 既存グループの代表者表示に影響がないことを確認

## 承認記録
- **承認日時**: 2026-08-04 09:47（自己承認・軽微なバグ修正）
