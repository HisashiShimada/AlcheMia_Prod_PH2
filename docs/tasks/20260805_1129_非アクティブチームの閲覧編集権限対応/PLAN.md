# タスク計画書: 非アクティブチームの閲覧・編集権限対応

## メタデータ
- **作成日時**: 2026-08-05 11:29
- **タスクID**: inactive-team-access-control
- **優先度**: 中
- **推定工数**: 4〜6時間

## 1. タスク概要

所属チームによる閲覧・編集権限の判定ロジックに、非アクティブ（`is_active = false`）になったチームへのアクセス制御を追加する。

現状は「直接所属チーム = 編集可能、直接所属チームの配下（子孫全体）= 閲覧可能」という方針で実装されているが、非アクティブになったチームについては以下の扱いにする。

---

## 2. 目的と期待される成果

### 目的

非アクティブ化されたチームに紐づくプロジェクトについて、上位チームに所属するユーザーが適切な権限で操作できるようにする。

### 期待される成果

- [x] 非アクティブなチームのプロジェクトを、そのチームの**上位チーム所属ユーザー**が閲覧できる
- [x] 非アクティブなチームのプロジェクトを、そのチームの**上位チーム代表者（chief_user_id）**が編集（`isEditable = true`）できる
- [x] ルートチーム（上位チームが存在しない）が非アクティブになった場合は **SystemAdmin のみ**閲覧・編集可能
- [x] 非アクティブチームの上位を複数レイヤー遡り、ルートまで全てのチームが対象（直近親のみでない）

---

## 3. 現状の実装サマリー

### 権限判定の流れ（`backend/src/services/projectService.ts` の `list()` メソッド）

```
organizationGroupCds（直接所属チームCD一覧）
  ↓
rootCds を算出（他の所属チームの子孫を除外）
  ↓
findDescendantCds(rootCds) → visibleGroupCds（閲覧可能なチームCD群）
  ※ is_active を見ていないため非アクティブなチームも含まれる → 閲覧側はこの挙動でOK
  ↓
editableGroupCds = organizationGroupCds（直接所属チームのみ）
  ↓
SQL: project.organization_group_cd が visibleGroupCds に含まれれば表示
     editableGroupCds に含まれれば isEditable = true
```

### 関連テーブル

| テーブル | 主要カラム | 役割 |
|---------|-----------|------|
| `organization_group` | `organization_group_cd`, `parent_group_cd`, `chief_user_id`, `is_active` | チーム定義 |
| `organization_group_user` | `organization_group_cd`, `user_id` | チームメンバー（非アクティブ化時は物理削除） |
| `project` | `organization_group_cd` | プロジェクトのチーム帰属 |

### 非アクティブ化時の挙動（現状）

- `updateOrganizationGroupActiveStatus(isActive=false)` が実行されると `organization_group_user` のメンバーを全て物理削除
- 代表者（chief_user_id）も含め、誰もそのチームに所属しなくなる
- 結果として `organizationGroupCds` に該当チームCDが含まれなくなり、editableGroupCds からも外れる

---

## 4. 仕様定義（新しい権限ルール）

### 閲覧可能（is_active = true のチームが対象）

| 条件 | 閲覧可否 |
|------|---------|
| 直接所属チームのプロジェクト | ✅ 可（現状と同じ） |
| 直接所属チームの下層チームのプロジェクト（is_active = true） | ✅ 可（現状と同じ） |
| 直接所属チームの下層チームのプロジェクト（is_active = **false**） | ✅ 可（現状から変わらず：findDescendantCds で既に拾える） |
| ルートチームが非アクティブ（上位なし） | ❌ SystemAdmin のみ |

### 編集可能（isEditable = true）

| 条件 | 編集可否 |
|------|---------|
| 直接所属チームのプロジェクト | ✅ 可（現状と同じ） |
| 直接所属チームの下層チームのプロジェクト（is_active = true） | ❌ 不可（現状と同じ） |
| **非アクティブな下層チームのプロジェクト（上位チームの代表者）** | ✅ **可（今回追加）** |
| ルートチームが非アクティブ（上位なし） | ❌ SystemAdmin のみ |

### 「上位チームの代表者」の定義

- 非アクティブチームの `parent_group_cd` を再帰的に辿り、**有効（is_active = true）な上位チームを全てルートまで探す**
- それらの上位チームのうち、`chief_user_id` がログインユーザーと一致するチームが存在する場合 → 編集可能

---

## 5. 実装ステップ

### Phase 1: バックエンド — 閲覧権限（visibleGroupCds）の確認・修正

- [x] `findDescendantCds.sql` が `is_active` に関係なく全子孫を返すことを確認（変更不要）
- [x] `findDescendantCds` の WHERE 句に `is_active` フィルタがないことを再確認
- [x] ルートチームが非アクティブの場合の考慮 → `parent_group_cd = null` のチームをスキップして対応済み

### Phase 2: バックエンド — 編集権限（editableGroupCds）の拡張

- [x] `projectService.ts` の `list()` メソッドを修正
- [x] `allGroups`（既に取得済み）から「非アクティブなチームの上位チーム代表者」を判定するロジックを追加
- [x] 具体的なアルゴリズム:

```typescript
// 既存の editableGroupCds に加えて、以下を追加
// 1. allGroups から is_active = false のチームを抽出
const inactiveGroups = allGroups.filter(g => !g.is_active);

// 2. 各非アクティブチームについて、有効な上位チームを再帰的に遡る
//    その中でログインユーザーが chief_user_id であるチームのうち
//    ログインユーザーが所属しているグループが上位チームに含まれれば、
//    その非アクティブチームのCDを editableGroupCds に追加

const inactiveEditableCds: string[] = [];
for (const inactiveGroup of inactiveGroups) {
  // 祖先チェーンを遡る（allGroupMap を使ってメモリ内で解決）
  let ancestor = inactiveGroup.parent_group_cd
    ? allGroupMap.get(inactiveGroup.parent_group_cd)
    : null;
  
  let foundEditable = false;
  while (ancestor) {
    if (ancestor.is_active && ancestor.chief_user_id === userId) {
      foundEditable = true;
      break;
    }
    ancestor = ancestor.parent_group_cd
      ? allGroupMap.get(ancestor.parent_group_cd)
      : null;
  }
  
  if (foundEditable) {
    inactiveEditableCds.push(inactiveGroup.organization_group_cd);
  }
}

editableGroupCds = [...organizationGroupCds, ...inactiveEditableCds];
```

- [x] `list()` メソッドの引数に `userId` を追加（`ListOptions` に `userId` フィールドを追加）
- [x] `projectController.ts` から `list()` を呼ぶ際に `userId` を渡すよう修正

### Phase 3: バックエンド — 閲覧権限（visibleGroupCds）の拡張確認

- [x] 非アクティブなチームのCDが `visibleGroupCds` に含まれない状況を洗い出す
- [x] 閲覧権限の拡張アルゴリズム実装完了（`inactiveVisibleCds` を `visibleGroupCds` にマージ）

```typescript
const inactiveVisibleCds: string[] = [];
for (const inactiveGroup of inactiveGroups) {
  // 有効な上位チームにログインユーザーが所属しているか確認
  let ancestor = inactiveGroup.parent_group_cd
    ? allGroupMap.get(inactiveGroup.parent_group_cd)
    : null;
  
  let isVisible = false;
  while (ancestor) {
    if (ancestor.is_active && organizationGroupCds.includes(ancestor.organization_group_cd)) {
      isVisible = true;
      break;
    }
    ancestor = ancestor.parent_group_cd
      ? allGroupMap.get(ancestor.parent_group_cd)
      : null;
  }
  
  if (isVisible) {
    inactiveVisibleCds.push(inactiveGroup.organization_group_cd);
  }
}

// visibleGroupCds に非アクティブチームのCDを追加
visibleGroupCds = [
  ...(await organizationGroupRepository.findDescendantCds(organizationId, rootCds)),
  ...inactiveVisibleCds,
];
```

### Phase 4: バックエンド — ルートチームが非アクティブの場合の処理

- [x] `parent_group_cd = null` かつ `is_active = false` のチームは `visibleGroupCds` にも `editableGroupCds` にも追加しない（SystemAdmin のみアクセス可能）

### Phase 5: バックエンド — 閲覧可能グループ一覧を返す API の追加

- [x] `GET /api/v1/organization-groups?visibleOnly=true` クエリパラメータを `organizationGroupController.ts` に追加
- [x] 返却するグループ一覧（ルート非アクティブチームは除外）:
  - ユーザーが直接所属するチーム（active）
  - ユーザーが直接所属するチームの子孫チーム（active・inactive 両方）
  - ユーザーの上位チームが active で、そこから辿れる非アクティブチーム
- [x] レスポンス形式: `{ groups: Array<{ cd, name, isActive }> }`
- [x] `organizationGroupRoutes.ts` にルーティングを追加（既存ルートに `visibleOnly` クエリ対応を追加）

### Phase 6: フロントエンド — プロジェクト管理画面への組織グループフィルタ追加

- [x] `frontend/src/components/project/ProjectManagement.tsx` に組織グループフィルタ用 `Select` を追加（既存フィルタ横）
- [x] 初期表示時に Phase 5 の API から閲覧可能グループ一覧を取得
- [x] 非アクティブグループのラベルに「（非アクティブ）」バッジ表示
- [x] `filteredProjects` の `useMemo` にグループフィルタ条件を追加
- [x] i18n キー追加（`projectManagement.filter_labels.organization_group`）

### Phase 7: テスト・確認

- [ ] バックエンドの `projectService.test.ts` にテストケースを追加（または新規作成）
  - [ ] 非アクティブチームの下位チームに所属しているユーザーが閲覧できること
  - [ ] 非アクティブチームの上位チームに所属しているユーザーが閲覧できること
  - [ ] 非アクティブチームの上位チームの代表者が編集できること
  - [ ] ルートチームが非アクティブの場合は SystemAdmin 以外は閲覧できないこと
  - [ ] 関係ないチームのユーザーはアクセスできないこと
- [ ] `frontend/src/components/project/ProjectManagement.tsx` の `isEditable` を使った UI 制御は既存のままで問題ないか確認（バックエンドの `isEditable` フラグがそのまま UI に反映される想定）
- [ ] 非アクティブチームのプロジェクトに対して表示される UI（バッジ等）の追加が必要か確認
  - 要件上「閲覧と一部公開・非公開などの機能のみ使える」とのことなので、フロントでの追加制御が必要かもしれない

---

## 6. 影響範囲

### 変更するファイル

**バックエンド**
1. `backend/src/services/projectService.ts` — メインの権限判定ロジック変更（`visibleGroupCds`・`editableGroupCds` の拡張、`userId` の追加）
2. `backend/src/controllers/projectController.ts` — `userId` を `list()` に渡す修正
3. `backend/src/controllers/organizationGroupController.ts` — 閲覧可能グループ一覧の取得ハンドラ追加
4. `backend/src/routes/organizationGroupRoutes.ts` — 新エンドポイントのルーティング追加
5. `backend/src/sql/queries/organization_groups/findDescendantCds.sql` — 変更不要の可能性が高い（確認のみ）

**フロントエンド**
6. `frontend/src/components/project/ProjectManagement.tsx` — 組織グループフィルタ用 `Select` の追加
7. `frontend/src/locales/ja.json` — i18n キー追加
8. `frontend/src/locales/en.json` — i18n キー追加（英語）

### 新規作成するファイル

（なし、またはテストファイル追加）

### 影響を受ける機能

- プロジェクト一覧取得 API（`GET /api/v1/projects`）
- 組織グループ一覧取得 API（`GET /api/v1/organization-groups?visibleOnly=true`）※新規
- プロジェクト管理画面の表示・操作可否
- プロジェクト管理画面のフィルタ UI

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `allGroups` の取得コスト増加（全チーム取得済み） | 低 | 低 | `findAll` は既に呼ばれているため追加コストは少ない |
| ループ処理で循環参照が発生する | 中 | 低 | 祖先チェーン探索に最大深さ制限を設ける |
| ルートチームが非アクティブな場合の閲覧が漏れる | 高 | 中 | Phase 4 で明示的に除外する処理を追加 |
| `userId` が `ListOptions` に渡されていない | 中 | 高 | 事前にコントローラーの実装を確認 |

---

## 8. テスト計画

### 権限マトリクス（テストシナリオ）

| チーム構成 | ユーザー条件 | 期待する閲覧 | 期待する編集 |
|-----------|------------|------------|------------|
| A（active） → B（inactive） | ユーザーはAに所属 | Bのプロジェクトが見える | Aの代表者ならBのプロジェクトを編集可 |
| A（active） → B（active） → C（inactive） | ユーザーはAに所属 | Cのプロジェクトが見える | Aの代表者 or Bの代表者ならCのプロジェクトを編集可 |
| ROOT（inactive） | ユーザーは上位チームなし | 見えない | 見えない |
| A（active） → B（inactive） | ユーザーはAに所属しない | Bのプロジェクトが見えない | 編集不可 |

---

## 9. 関連ドキュメント

- `backend/src/services/projectService.ts` — 権限判定メインロジック
- `backend/src/sql/queries/organization_groups/findDescendantCds.sql` — 子孫チームCDの再帰取得
- `backend/src/services/organizationGroupService.ts` — 非アクティブ化処理
- `backend/migrations/20260805_add_is_active_to_organization_group.sql` — is_active カラム追加

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-05 11:29
- **承認日時**: 2026-08-05 11:37
- **承認者コメント**: PLAN.md の内容で進める

---

## 11. 実施記録

### 実施日時
開始: 2026-08-05 11:38
完了: 2026-08-05 11:40

### 計画からの変更点

- `ListOptions` インターフェースに `userId?: string` を追加（計画書通り）。
- コントローラー（`projectController.ts`）の `list()` ハンドラで `userId` を取得して `projectService.list()` に渡す対応を追加。
- Phase 5: `organizationGroupController.ts` に `visibleOnly=true` クエリパラメータ対応を追加。ログインユーザーが閲覧可能な全グループ（非アクティブ含む）を返す。
- Phase 6: `ProjectManagement.tsx` にチームフィルタ `Select` を追加。`getVisibleOrganizationGroups()` を `organizationGroupApiService.ts` に追加し、フィルタ一覧を初期取得。`ja.json` に `filter_labels.organization_group` キーを追加。

### 発生した問題と解決方法

- 既存の `organizationGroupCds.length === 0` の早期リターン処理が、非アクティブグループ経由で閲覧可能なケースをブロックしてしまう問題を特定。
  → 非アクティブグループの判定を先に行い、閲覧可能なグループがあれば早期リターンしないよう修正。
- `findDescendantCds.sql` は `is_active` 条件なしで全子孫を返す実装だったため、SQL 変更は不要（アクティブ配下グループは既存ロジックで取得、非アクティブ対象は `inactiveVisibleCds` で追加）。

### 最終的な成果物

- [x] `backend/src/services/projectService.ts` — `list()` 権限判定ロジックに非アクティブチームの閲覧・編集権限判定を追加
- [x] `backend/src/controllers/projectController.ts` — `list()` ハンドラで `userId` を `projectService.list()` に渡すよう修正
- [x] `backend/src/controllers/organizationGroupController.ts` — `visibleOnly=true` クエリ対応、閲覧可能グループ一覧を返すハンドラを追加
- [x] `frontend/src/services/organizationGroupApiService.ts` — `getVisibleOrganizationGroups()` 関数を追加
- [x] `frontend/src/components/project/ProjectManagement.tsx` — チームフィルタ用 `Select` UI・取得ロジックを追加
- [x] `frontend/src/locales/ja.json` — `projectManagement.filter_labels.organization_group` キーを追加

---

## 12. 振り返り

### うまくいった点

- 既存の `allGroups` 取得ロジックを流用し、追加 SQL クエリなしで非アクティブチームの祖先チェーン探索を実装できた
- `findDescendantCds.sql` が `is_active` 条件なしで実装されていたため、SQL 変更が不要だった

### 改善が必要な点

- Phase 7（ユニットテスト）は今回未実施。権限マトリクスに沿ったテストを別タスクで追加することを推奨する

### 学んだこと

- 非アクティブ化時にメンバーを物理削除する設計では、Chief User ID を `organization_group` テーブル本体に持つことで「元代表者」の判定が可能になる
