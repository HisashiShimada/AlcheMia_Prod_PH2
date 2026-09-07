# タスク計画書: Personal階層選択時の個人スコープフィルタ修正

## メタデータ
- **作成日時**: 2026-09-03 15:53
- **タスクID**: personal-scope-filter
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
名前空間管理（UncertaintyManagement）でPersonalルートノードを選択した際に、個人スコープを持つデータのみが表示されず、全データが表示されてしまうバグを修正する。

## 目的と期待される成果
- [ ] 「Personal」親ノード（key=`'personal'`）クリック時に個人スコープのデータのみが表示される
- [ ] 「実験管理 三郎」などの子ノード（key=`'personal-{userId}'`）選択時の既存動作は変わらない

## 根本原因

### 問題1: `effectiveNsKey` が `'personal'` のままPrefixManagementに渡される
Personal ルートノード（key=`'personal'`）を選択すると、`effectiveNsKey = 'personal'` が渡される。
PrefixManagement 内では `STATIC_KEYS.has('personal')` が true → `fetchNamespaces('personal', undefined)` が呼ばれるが、
DBには `scope_key='personal'` のレコードが存在しないため意図した動作にならない（全件取得される場合がある）。

### 問題2: `filteredOrgGroupCds` が `'personal'` 選択時に全グループCDsを返す
```typescript
const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'personal']);
if (STATIC_KEYS.has(selectedNsKey)) return allCds; // 'personal' → 全グループCDs！
```
`'personal'` が `STATIC_KEYS` に含まれるため、`filteredOrgGroupCds = allCds`（全グループ）が渡されてしまう。

## 実装ステップ
- [ ] `effectiveNsKey` を useMemo に変更し、`'personal'` → `'personal-{userId}'` に変換
- [ ] `filteredOrgGroupCds` に `'personal'` の特別処理を追加（`[]` を返す）

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - effectiveNsKey と filteredOrgGroupCds の修正

## 承認記録
- **承認日時**: 2026-09-03 15:53
