# タスク計画書: 名前空間ツリー選択グループ配下データ統一

## メタデータ
- **作成日時**: 2026-08-20 15:11
- **タスクID**: namespace-tree-scope-unify
- **優先度**: 高
- **推定工数**: 2時間

---

## 調査結果

### 三点のデータ抽出方法（現状）

#### 1. 階層ツリー

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

- `getOrganizationGroups()` で取得した `orgGroups` を `buildOrgTree()` でツリー化
- さらに `filterTreeForUser(fullTree, currentUserNsKey, currentUserRole)` でロール別に剪定
- **ログインユーザーが所属するグループとその子孫のみ** が表示される

---

#### 2. Prefix管理タブ（`PrefixManagement.tsx`）

**ファイル**: `frontend/src/components/namespace/PrefixManagement.tsx`  
**関数**: `fetchNamespaces(scopeKey?, withAncestors?)`

`selectedNsKey` の変化を `useEffect` で監視し、以下のように分岐：

| `selectedNsKey` の値 | 分岐条件 | API呼び出し |
|---|---|---|
| `'global'` / `'ns-maiml'` / `'ns-xsi'` / `'company'` / `'personal'` | `STATIC_KEYS.has(key)` → `isOrgGroup = false` | **scopeKey なし＝全件取得** (`findNamespacesByOrganization.sql`) |
| その他（org group cd） | `isOrgGroup = true` | `withAncestors=true` で scopeKey+祖先グループのみ |

> **問題**: `company` ノードが `STATIC_KEYS` に含まれているため、組織ノード選択時に **全 Prefix（他グループ含む）** が返される。

---

#### 3. 用語管理タブ（`NamespaceMain.tsx`）

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`  
**関数**: `fetchTerms(options?)`（`useEffect` で `selectedNsKey` 変化を監視）

| `selectedNsKey` の値 | 分岐条件 | API呼び出し |
|---|---|---|
| `'global'` / `'ns-maiml'` / `'ns-xsi'` | `GLOBAL_KEYS.has(nsKey)` | **scopeKey なし＝全件取得** |
| `'company'` | `COMPANY_KEYS.has(nsKey)` | `orgGroups` が取得済みなら `scopeKeys=全グループCD`、未取得なら **全件取得** |
| `'personal'` / userId | 個人ノード | `scopeKey=userId` で個人のみ |
| その他（org group cd） | - | `withAncestors=true` で scopeKey+祖先グループのみ |

> **問題1**: `company` ノード選択時、`orgGroups` に **全グループ**（計測技術部含む）が入っているため、ツリーに表示されない計測技術部の用語も表示される。  
> **問題2**: `PrefixManagement.tsx` は `company` を `STATIC_KEYS` として扱い scopeKey なしで全件取得している（用語管理タブの `company` 分岐ロジックを持っていない）。

---

### 相違点のまとめ

| 箇所 | 現状の取得範囲 | 期待する取得範囲 |
|---|---|---|
| 階層ツリー | ログインユーザー所属グループ＋その子孫のみ | （変更なし） |
| Prefix管理タブ（組織ノード選択時） | **全組織の Prefix**（他グループ含む） | ツリーに表示されるグループ＋その祖先の Prefix |
| 用語管理タブ（組織ノード選択時） | **全組織の用語**（計測技術部など他グループ含む） | ツリーに表示されるグループ＋その祖先の用語 |

---

## 目的と期待される成果

- [ ] 組織ノード（`company`）選択時、Prefix管理タブに表示されるデータがツリー表示グループ配下のみになる
- [ ] 組織ノード（`company`）選択時、用語管理タブに表示されるデータがツリー表示グループ配下のみになる
- [ ] 特定チームノード選択時（既存動作）に影響を与えない
- [ ] Personal ノード・Global ノード選択時の動作に影響を与えない

---

## 実装ステップ

### Phase 1: 階層ツリーのフィルタ済み scopeKeys を NamespaceMain に持たせる

- [ ] `NamespaceMain.tsx` の `orgGroups` 初回取得後（`useEffect`）で、`filterTreeForUser` 済みのツリーから全 org group CD を収集する変数 `filteredGroupCds` を state として持つ
  ```typescript
  const [filteredGroupCds, setFilteredGroupCds] = useState<string[]>([]);
  ```
- [ ] `buildOrgTree` → `filterTreeForUser` 後に `collectAllOrgGroupCds(filteredTree)` で全 CD を収集して `setFilteredGroupCds` にセットする
  ```typescript
  const collectAllOrgGroupCds = (nodes: NamespaceNode[]): string[] => {
    const result: string[] = [];
    for (const n of nodes) {
      if (n.key !== 'company' && n.key !== 'global' && n.key !== 'personal') {
        result.push(n.key);
      }
      if (n.children) result.push(...collectAllOrgGroupCds(n.children));
    }
    return result;
  };
  ```

### Phase 2: 用語管理タブ（NamespaceMain.tsx）— company ノード選択時のフェッチ修正

`selectedNsKey` 変化時の `useEffect`（約 910 行目）と `externalSelectedNsKey` の `useEffect`（約 847 行目）の `company` 分岐を修正する。

**Before**:
```typescript
} else if (COMPANY_KEYS.has(nsKey)) {
  const allGroupCds = orgGroups.map((g) => g.organization_group_cd);
  if (allGroupCds.length > 0) {
    fetchTerms({ scopeKeys: allGroupCds } as any);
    fetchPrefixes(undefined, undefined, allGroupCds);
  } else {
    fetchTerms();
    fetchPrefixes();
  }
}
```

**After**:
```typescript
} else if (COMPANY_KEYS.has(nsKey)) {
  // フィルタ済み（ツリー表示対象）のグループCDのみ渡す
  if (filteredGroupCds.length > 0) {
    fetchTerms({ scopeKeys: filteredGroupCds } as any);
    fetchPrefixes(undefined, undefined, filteredGroupCds);
  } else {
    fetchTerms();
    fetchPrefixes();
  }
}
```

- [ ] `selectedNsKey` 変化時の `useEffect` の `company` 分岐を `filteredGroupCds` 使用に修正
- [ ] `externalSelectedNsKey` 変化時の `useEffect` の `company` 分岐も同様に修正

### Phase 3: Prefix管理タブ（PrefixManagement.tsx）— company 選択時の修正

`PrefixManagement.tsx` は `selectedNsKey` を受け取って自律的にフェッチしているが、`company` ノードを `STATIC_KEYS` に含めているため全件取得になっている。

**方針A（推奨）**: `NamespaceMain.tsx` の Prefix管理タブへの props に `scopeKeys` を追加して、`company` 選択時はそちらから渡す。

- [ ] `PrefixManagementProps`（`frontend/src/types/namespace.ts`）に `scopeKeys?: string[]` を追加
- [ ] `PrefixManagement.tsx` の `useEffect` 内の `STATIC_KEYS` から `company` を除外し、`scopeKeys` が渡されている場合はそれを使用するよう修正

**Before（PrefixManagement.tsx 約 99 行目）**:
```typescript
const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'company', 'personal']);
const isOrgGroup = key !== undefined && !STATIC_KEYS.has(key);
fetchNamespaces(key, isOrgGroup ? true : undefined);
```

**After**:
```typescript
const STATIC_KEYS = new Set(['global', 'ns-maiml', 'ns-xsi', 'personal']);
// company ノード選択時: scopeKeys が渡されていればそれを使用
if (key === 'company') {
  const keys = scopeKeys ?? [];
  fetchNamespaces(undefined, undefined);  // → 内部で scopeKeys を使用
  // fetchNamespaces を scopeKeys 対応にリファクタ
} else {
  const isOrgGroup = key !== undefined && !STATIC_KEYS.has(key);
  fetchNamespaces(key, isOrgGroup ? true : undefined);
}
```

- [ ] `fetchNamespaces` を `scopeKeys` 配列対応に拡張（既存 API は `scopeKeys` クエリパラメータ対応済み）
- [ ] `NamespaceMain.tsx` の `<Tabs>` 内の Prefix管理タブ（`activeKey === 'prefix'`）に `filteredGroupCds` を渡す

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/namespace.ts` | `PrefixManagementProps` に `scopeKeys?: string[]` を追加 |
| `frontend/src/components/namespace/PrefixManagement.tsx` | `company` ノードを `STATIC_KEYS` から除外、`scopeKeys` props 対応 |
| `frontend/src/components/namespace/NamespaceMain.tsx` | `filteredGroupCds` state 追加、`company` 選択時のフェッチを修正、Prefix管理タブに `filteredGroupCds` を渡す |

---

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| `filteredGroupCds` 取得タイミングが遅れる | 低 | `orgGroups` 取得後に算出するため、通常は問題なし。空の場合は全件取得にフォールバック |
| `externalSelectedNsKey` 経由での呼び出しに両 useEffect で二重フェッチが発生 | 低 | `externalSelectedNsKey` が渡されている場合は内部 `selectedNsKey` の useEffect は早期 return 済み |

---

## テスト計画

- [ ] 組織ノード（組織 1）選択時、計測技術部（非所属グループ）の用語が用語管理タブに表示されないことを確認
- [ ] 組織ノード選択時、計測技術部の Prefix が Prefix管理タブに表示されないことを確認
- [ ] 組織ノード選択時、自グループ配下の用語・Prefix が正しく表示されることを確認
- [ ] 特定チームノード選択時の動作が変わっていないことを確認
- [ ] グローバルノード・パーソナルノード選択時の動作が変わっていないことを確認

---

## 承認記録
- **計画書提示日時**: 2026-08-20 15:11
- **承認日時**: 
- **承認者コメント**: 
