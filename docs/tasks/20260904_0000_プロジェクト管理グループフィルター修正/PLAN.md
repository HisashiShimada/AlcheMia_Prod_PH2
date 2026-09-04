# タスク計画書: プロジェクト管理グループフィルター修正

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000
- **優先度**: 高
- **推定工数**: 30分

## タスク概要

プロジェクト管理画面のグループフィルターが機能しない事象を修正する。
「結合テスト　グループ001」を選択してもプロジェクト一覧が0件になる。

## 原因

`frontend/src/hooks/project/useProjectList.ts` の143行目で
存在しないプロパティ `organizationGroupCd` を参照していた。

`Project` 型の実際のプロパティ名は `organizationGroup` であり、
`organizationGroupCd` は `undefined` になるためフィルターが常に0件になっていた。

## データフロー

```
DB: project.organization_group_cd
     ↓ (backend/src/services/projectService.ts L483)
APIレスポンス: project.organizationGroup  ← Project 型の正しいプロパティ名
     ↓ (frontend/src/hooks/project/useProjectList.ts L143)
フィルター比較: project.organizationGroup === groupFilter  ← 修正後に一致する
     ↑
visibleGroups の g.cd (= organization_group_cd の値)
```

## 修正内容

### 修正前

```typescript
// organizationGroupCd は Project 型に存在しないため常に undefined → 全件不一致で0件
if (groupFilter !== 'all') matchesGroup = (project as any).organizationGroupCd === groupFilter;
```

### 修正後

```typescript
// Project 型の正しいプロパティ名 organizationGroup を使用
if (groupFilter !== 'all') matchesGroup = project.organizationGroup === groupFilter;
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/hooks/project/useProjectList.ts` | 143行目：`(project as any).organizationGroupCd` → `project.organizationGroup` |

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 他フィルターへの影響 | なし | 変更箇所は1行のみ。他フィルターに影響なし |

## テスト計画

- [ ] グループフィルターで特定グループを選択したとき、該当グループのプロジェクトのみ表示されること（目視確認）
- [ ] 「すべて」フィルター選択時に全プロジェクトが表示されること（目視確認）

## 承認記録

- **承認日時**: 2026-09-04（ユーザーが Act モードで実行指示）

## 実施記録

- **開始**: 2026-09-04
- **完了**: 2026-09-04
- **成果**: `useProjectList.ts` 143行目の `(project as any).organizationGroupCd` を `project.organizationGroup` に修正
- **TypeScript 型チェック**: `useProjectList` 関連エラー 0件 確認済み
