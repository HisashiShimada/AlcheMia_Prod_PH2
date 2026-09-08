# タスク計画書: プロジェクト作成グループ選択_一般ユーザー未表示修正

## メタデータ

- **作成日時**: 2026-09-04
- **タスクID**: 20260904_プロジェクト作成グループ選択_一般ユーザー未表示修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

プロジェクト新規作成モーダル（`CreateProjectModal.tsx`）において、
ログインユーザーが所属しているグループがグループ選択ドロップダウンに表示されない不具合を修正する。

### 事象

- 「結合テスト グループ001」に所属している一般ユーザー（代表者でない）が
  プロジェクト作成時にグループ選択肢に所属グループが表示されない
- 代表者（chief_user_id）は選択できる

### 根本原因

`CreateProjectModal.tsx` が `GET /api/v1/organization-groups` を
**クエリパラメータなし**で呼び出している。

バックエンドのデフォルト動作（`organizationGroupController.ts` L122〜130）は
`chiefUserId = req.user!.userId` をフィルタとして付与するため、
**代表者グループのみ**が返却される。

```typescript
// organizationGroupController.ts L122〜130（現状）
const chiefUserId = req.user!.userId;
const groups = await organizationGroupService.getOrganizationGroups(
  organizationId,
  { search, chiefUserId }  // ← chiefUserId でフィルタリング
);
```

一般ユーザー（代表者でない）は 0 件となりドロップダウンが空になる。

### 仕様確認

`docs/design/spec/organization_group_project_access.md §7.2` に以下の記述あり：
> 「ユーザーが直接所属するグループのみ選択肢として表示」

代表者・一般ユーザー問わず、自分が所属するグループが表示されるべき。

バックエンドには既に `?memberOf=true` クエリパラメータ対応が実装済み
（ログインユーザーの所属グループ＋祖先グループを返す）。

### 類似実装の参照

`NamespaceMain.tsx` および `UncertaintyManagement.tsx` では同様の問題を以下で解決済み：

```typescript
Promise.all([
  getOrganizationGroups(),                               // ① chiefUserId フィルタ（代表グループ）
  getOrganizationGroups(undefined, { memberOf: true }), // ② 所属グループ＋祖先グループ
])
.then(([chiefGroups, memberGroups]) => { /* マージ処理 */ });
```

ただし `CreateProjectModal.tsx` が使用している `organizationGroupApiService.ts` の
`getOrganizationGroups` は `memberOf` オプションを持たないため、
まず同サービス関数の拡張が必要。

---

## 2. 目的と期待される成果

- [ ] 一般ユーザーがプロジェクト作成モーダルを開いた際、自身が所属するグループが選択肢に表示される
- [ ] 代表者も引き続き所属グループを選択できる
- [ ] `services/` 経由 API 呼び出しルール（clinerules）への準拠

---

## 3. 影響範囲分析

| 対象 | 影響 |
|------|------|
| `CreateProjectModal.tsx` | グループ取得方法の変更（直接 fetch → service 経由、memberOf=true 付与） |
| `organizationGroupApiService.ts` | `getOrganizationGroups` に `options.memberOf` オプション追加 |
| バックエンド API | 変更なし（`?memberOf=true` は実装済み） |
| DB / テーブル定義 | 変更なし |
| UI デザイン | 変更なし |
| 既存の `getOrganizationGroups` 呼び出し箇所 | `options` は任意パラメータのため影響なし |

---

## 4. 実装ステップ

### Step 1: `organizationGroupApiService.ts` 修正

**ファイル**: `frontend/src/services/organizationGroupApiService.ts`

**変更内容**:
`getOrganizationGroups` 関数のシグネチャに `options` パラメータを追加し、
`memberOf: true` 指定時に `?memberOf=true` クエリパラメータを付与する。

```typescript
// 変更前
export const getOrganizationGroups = async (
  search?: string
): Promise<OrganizationGroupRow[]>

// 変更後
export const getOrganizationGroups = async (
  search?: string,
  options?: { memberOf?: boolean }
): Promise<OrganizationGroupRow[]>
```

内部処理に追加:
```typescript
if (options?.memberOf) params.memberOf = 'true';
```

### Step 2: `CreateProjectModal.tsx` 修正

**ファイル**: `frontend/src/components/project/CreateProjectModal.tsx`

**変更内容**:

① `createApiClient` の直接利用を廃止（`services/` 経由ルール遵守）
② `organizationGroupApiService.ts` の `getOrganizationGroups` を import
③ `getOrganizationGroups(undefined, { memberOf: true })` で呼び出し

```typescript
// 変更前（import）
import { createApiClient } from '@/utils/authUtils';

// 変更後（import）
import { getOrganizationGroups } from '@/services/organizationGroupApiService';
```

```typescript
// 変更前（fetchTeams 内）
const client = createApiClient();
const response = await client.get<{
  success: boolean;
  data: Array<{ organization_group_cd: string; organization_group_name: string }>;
}>('/organization-groups');
setTeams(
  (response.data?.data ?? []).map((g) => ({
    organizationGroupCd: g.organization_group_cd,
    organizationGroupName: g.organization_group_name,
  }))
);

// 変更後（fetchTeams 内）
const groups = await getOrganizationGroups(undefined, { memberOf: true });
setTeams(
  groups.map((g) => ({
    organizationGroupCd: g.organization_group_cd,
    organizationGroupName: g.organization_group_name,
  }))
);
```

---

## 5. 変更ファイル一覧

| # | ファイルパス | 変更種別 | 変更内容の概要 |
|---|------------|---------|--------------|
| 1 | `frontend/src/services/organizationGroupApiService.ts` | 修正 | `getOrganizationGroups` に `options?: { memberOf?: boolean }` を追加 |
| 2 | `frontend/src/components/project/CreateProjectModal.tsx` | 修正 | `organizationGroupApiService` 経由に変更 + `memberOf: true` で所属グループ取得 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `memberOf=true` で祖先グループも返却され、意図しないグループが選択肢に現れる | 中 | 低 | 仕様上は「所属グループ＋祖先グループ」を返す設計であり `organization_group_project_access.md §7.2` にも適合。祖先グループにプロジェクトを紐づける用途も存在するため許容 |
| `organizationGroupApiService.ts` の既存呼び出し箇所への影響 | 低 | 低 | `options` は任意パラメータのため、既存呼び出し（`options` 未指定）は動作変わらず |

---

## 7. テスト計画

### 手動テスト

- [ ] 一般ユーザー（代表者でない）でログインし、プロジェクト作成モーダルを開く
      → 所属グループが選択肢に表示されること
- [ ] 代表者ユーザーでログインし、プロジェクト作成モーダルを開く
      → 所属グループが選択肢に表示されること（従来通り）
- [ ] どのグループにも所属していないユーザーの場合
      → 選択肢が空（データなし）であること
- [ ] グループを選択してプロジェクトを作成できること（正常系）

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-04
- **承認日時**: （承認時に記入）
- **承認者コメント**: （承認時に記入）

---

## 9. 実施記録

### 実施日時

開始: 2026-09-08
完了: 2026-09-08

### 最終的な成果物

- [x] `frontend/src/services/organizationGroupApiService.ts` 修正完了
- [x] `frontend/src/components/project/CreateProjectModal.tsx` 修正完了
