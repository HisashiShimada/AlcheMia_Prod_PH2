# タスク計画書: 不確かさ基準選択ダイアログ - 基準名検索バグ修正

## メタデータ
- **作成日時**: 2026-09-09
- **タスクID**: uncertainty-criteria-name-search-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

不確かさ基準選択ダイアログ（`UncertaintyCriteriaSelectorModal` / `UncertaintyCriteriaSelectorPanel`）の「不確かさ基準名(Key属性)」検索欄で、基準名（日本語表示名）を入力しても候補が絞り込まれない不具合を修正する。

## 根本原因

`filteredCriteria` の `useMemo` 内で、検索フィルタが `c.key`（`uncertainty_key`）のみの部分一致になっており、`c.name`（`uncertainty_name` = 日本語表示名「温度」など）が検索対象に含まれていない。

## 修正内容

両ファイルの同一箇所を修正：

**修正前：**
```typescript
if (ns && !c.key.toLowerCase().includes(ns)) return false;
```

**修正後：**
```typescript
if (ns && !c.key.toLowerCase().includes(ns) && !c.name.toLowerCase().includes(ns)) return false;
```

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` - フィルタロジック修正
2. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` - フィルタロジック修正

## 承認記録
- **承認日時**: 2026-09-09（plan モードで承認済み）
