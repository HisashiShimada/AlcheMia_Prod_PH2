# タスク計画書: 非アクティブグループ編集権限バグ修正

## メタデータ
- **作成日時**: 2026-08-06 15:45
- **タスクID**: fix-inactive-group-edit-permission
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`hq_user`（HQグループ代表者）が `P_HQ_DEV_A`（非アクティブグループ HQ-DEV-A 所属プロジェクト）を編集できてしまうという報告があった。調査の結果、これは仕様通りの正しい動作であった。

**本当のバグ**: `dev_a_user`（非アクティブグループ HQ-DEV-A に直接所属するユーザー）が `P_HQ_DEV_A` を編集できてしまっている点が仕様と異なる。

## 正しい仕様（ユーザーより確認）

| ユーザー | 対象プロジェクト | 正しい権限 |
|---|---|---|
| hq_user（HQグループ代表者） | P_HQ_DEV_A | **閲覧・編集可（祖先grpの代表者特例）← 仕様通り** |
| dev_user（HQ-DEVグループ代表者） | P_HQ_DEV_A | **閲覧・編集可（祖先grpの代表者特例）← 仕様通り** |
| dev_a_user（HQ-DEV-Aに直接所属） | P_HQ_DEV_A | **閲覧のみ可、編集不可（非アクティブグループ直接所属者は編集不可）← バグあり** |

## 原因

`backend/src/services/projectService.ts` の `list()` メソッド、493行目：

```typescript
// 修正前（バグあり）
editableGroupCds = Array.from(new Set([...organizationGroupCds, ...inactiveEditableCds]));
```

`organizationGroupCds`（ユーザーが直接所属するグループCDのリスト）を **is_active チェックなし**でそのまま `editableGroupCds` に含めているため、`dev_a_user` が直接所属する `HQ-DEV-A`（is_active=false）がそのまま編集可能グループに混入してしまう。

## 目的と期待される成果

- [ ] 非アクティブグループに直接所属しているユーザーが、そのグループのプロジェクトを編集できないように修正する
- [ ] 祖先グループの代表者（chief_user_id）は引き続き非アクティブグループのプロジェクトを編集できる（既存仕様は維持）
- [ ] テストデータ（SQL / README）を修正後の正しい仕様に合わせて更新する
- [ ] 仕様書ドキュメントを修正後の正しい仕様に合わせて更新する

## 実装ステップ

### Phase 1: ソースコード修正
- [ ] `backend/src/services/projectService.ts` の493行目付近：`organizationGroupCds` を `editableGroupCds` に含める際、`is_active=true` のグループのみに絞り込むロジックを追加する

### Phase 2: テストデータ修正
- [ ] `backend/sql/test_data_organization_group_access.sql`：コメント内の期待動作の記述を修正（dev_a_user の P_HQ_DEV_A 権限を「閲・編」→「閲のみ」に）
- [ ] `backend/sql/README_organization_group_test_data.md`：アクセスマトリクス表・シナリオ詳細・確認シナリオ A-5 の記述を正しい仕様に更新

### Phase 3: 仕様書修正
- [ ] `docs/design/spec/organization_group_project_access.md`：§5.2 の編集権限特例記述を修正（直接所属はアクティブグループのみ・非アクティブグループ chiefは編集不可）

## 変更ファイル

1. `backend/src/services/projectService.ts` - editableGroupCds の is_active フィルタ追加（約493行目）
2. `backend/sql/test_data_organization_group_access.sql` - コメント内の期待権限記述修正（A-3 ブロック）
3. `backend/sql/README_organization_group_test_data.md` - アクセス対応表・マトリクス・シナリオ A-5 修正
4. `docs/design/spec/organization_group_project_access.md` - §5.2 修正

## セキュリティ考慮事項

- 今回の修正は権限の付与を **削る方向**の修正であるため、既存の閲覧・編集が「できなくなる」方向。セキュリティ観点では修正することが正しい。
- 祖先グループの代表者特例（`inactiveEditableCds`）は変更しないため、`hq_user`・`dev_user` の既存の動作は維持される。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の箇所でも organizationGroupCds が is_active チェックなしで使用されている | 中 | 低 | 修正後に grep で確認 |

## 承認記録
- **計画書提示日時**: 2026-08-06 15:45
- **承認日時**: 2026-08-06 15:44（ACT MODE 移行により承認）

## 実施記録

### 実施日時
開始: 2026-08-06 15:45  
完了: 2026-08-06 15:48

### 変更内容

- **ソースコード修正**:  
  `backend/src/services/projectService.ts` 約493行目 — `editableGroupCds` に `organizationGroupCds` を含める際、`is_active=true` のグループのみに絞り込むフィルタを追加  
  `allGroups`（全グループ一覧）から `is_active=false` なグループCDを除外する1行を追加。

- **テストデータSQLコメント修正**:  
  `backend/sql/test_data_organization_group_access.sql` — A-3ブロックのコメントを正しい仕様（dev_a_user は非アクティブグループ直接所属のみ→編集不可）に更新。

- **README修正**:  
  `backend/sql/README_organization_group_test_data.md` — アクセス対応表・確認シナリオ詳細（A-5行）・全体アクセスマトリクスを正しい仕様に更新。

- **仕様書修正**:  
  `docs/design/spec/organization_group_project_access.md` — §5.1の `editableGroupCds` 算出説明を「直接所属グループのうちis_active=trueのみ」に更新。

### 最終的な成果物
- [x] `dev_a_user` が P_HQ_DEV_A を編集できないよう修正完了
- [x] `hq_user`・`dev_user` の有効祖先chief特例は維持
- [x] テストデータ・README・仕様書の記述を統一
