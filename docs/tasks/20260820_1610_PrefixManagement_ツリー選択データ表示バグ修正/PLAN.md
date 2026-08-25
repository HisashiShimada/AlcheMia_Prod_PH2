# タスク計画書: PrefixManagement ツリー選択時データ表示バグ修正

## メタデータ
- **作成日時**: 2026-08-20 16:10
- **タスクID**: PrefixManagement_ツリー選択データ表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

名前空間管理の「Prefix管理」タブにて、左ペインのツリーが**未選択状態**だとデータが表示されるが、
ノードを**選択**するとデータが消えてしまうバグを修正する。

## 根本原因

`PrefixManagement.tsx` の `useEffect` 内のスコープフィルタ分岐が誤っている。

```
【未選択時】
  key = undefined
  → !key が true → fetchNamespaces(undefined, undefined, orgGroupCds)
  → 全 orgGroupCds を scopeKeys として OR 検索 → データあり ✅

【選択時（例: 'DEP001-1-1-1'）】
  key = 'DEP001-1-1-1' (organization_group_cd)
  → else ブランチ → fetchNamespaces('DEP001-1-1-1', withAncestors=true)
  → 選択ノードとその「祖先」のみ検索（子孫は含まれない）
  → データが登録されている子孫CDと一致しない → データなし ❌
```

**正しい挙動**: ノード選択時は選択したノード＋その**配下（子孫）全ノード**のデータを表示すべき。
`withAncestors=true` は「祖先」を検索するため逆方向。

## 修正方針

2ファイルを修正する。

### 修正1: `UncertaintyManagement.tsx`

選択ノードの**配下CD（自身含む）**を計算する `filteredOrgGroupCds` を `useMemo` で生成し、
`PrefixManagement` に渡す `orgGroupCds` をこの値に変更する。

- 未選択 or 'company': 全 orgGroupCds をそのまま渡す
- 特定ノード選択時: 選択ノード ＋ その子孫の CDs のみ渡す

### 修正2: `PrefixManagement.tsx`

`else` ブランチで、org group CD が選択されかつ `orgGroupCds` が渡されている場合は、
`fetchNamespaces(undefined, undefined, orgGroupCds)` を呼ぶよう変更する
（`orgGroupCds` には既に UncertaintyManagement 側でフィルタ済みの配下 CDs が入っている）。

## 変更ファイル

1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - filteredOrgGroupCds 計算追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` - else ブランチの fetchNamespaces 呼び出し修正

## 承認記録
- **計画書提示日時**: 2026-08-20 16:10
