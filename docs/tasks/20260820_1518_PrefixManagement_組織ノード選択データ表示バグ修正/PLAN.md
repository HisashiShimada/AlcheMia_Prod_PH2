# タスク計画書: PrefixManagement 組織ノード選択時データ未表示バグ修正

## メタデータ
- **作成日時**: 2026-08-20 15:42
- **タスクID**: PrefixManagement_orgNode_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

名前空間管理の Prefix管理タブで、組織ノード（「組織」ルートノード）を選択した際にデータが表示されない。
用語管理タブは正常にデータが表示されるため、Prefix管理タブへの props 渡し漏れが原因。

## 原因分析

### 問題箇所

**`frontend/src/components/uncertainty/UncertaintyManagement.tsx` L611**

```tsx
{/* 現状（バグあり） */}
<PrefixManagement showShareButton={true} selectedNsKey={effectiveNsKey} />
```

`orgGroupCds` prop が渡されていない。

### PrefixManagement.tsx の動作ロジック（L109〜134）

```typescript
useEffect(() => {
  const key = selectedNsKey ?? undefined;
  if (!key || key === 'company') {
    // 組織ルートノード選択時
    if (orgGroupCds && orgGroupCds.length > 0) {
      fetchNamespaces(undefined, undefined, orgGroupCds);  // ← orgGroupCds が必要
    } else {
      fetchNamespaces(undefined, undefined);  // ← scopeKey なし全件取得（データ0件になる）
    }
  }
}, [selectedNsKey, orgGroupCds]);
```

- `selectedNsKey === 'company'`（組織ルートノード）のとき、`orgGroupCds` が空なので `fetchNamespaces(undefined, undefined)` を呼ぶ
- APIがスコープなしで0件を返すため「データがありません」と表示される

### 用語管理タブが正常な理由

`NamespaceMain` は `externalSelectedNsKey` のみ受け取り、**内部で自前の organization_group 取得処理**を持っているため正常動作する。

## 修正内容

**`UncertaintyManagement.tsx` L611 を修正**：

`orgGroups`（既存state）から全 `organization_group_cd` を抽出して `orgGroupCds` として渡す。

```tsx
{/* 修正後 */}
<PrefixManagement
  showShareButton={true}
  selectedNsKey={effectiveNsKey}
  orgGroupCds={orgGroups.map((g) => g.organization_group_cd)}
/>
```

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - PrefixManagement に orgGroupCds を追加

## テスト計画
- [ ] 組織ルートノード（「組織」）を選択 → 配下全グループの Prefix が表示されること
- [ ] 個別 org group ノードを選択 → そのグループの Prefix のみ表示されること
- [ ] 用語管理タブの動作が変わっていないこと

## 承認記録
- **計画書提示日時**: 2026-08-20 15:42
