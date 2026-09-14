# タスク計画書: PrefixManagement 子孫Prefix混入バグ修正

## メタデータ
- **作成日時**: 2026-09-10
- **タスクID**: 20260910_0000_PrefixManagement子孫Prefix混入バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

`NamespaceMain`（名前管理タブ）において、左ツリーで組織グループノードを選択したとき、
Prefix管理タブに表示されるPrefixが

- **本来表示されるべきもの**: 選択グループ自身のPrefix ＋ 祖先グループのPrefix
- **実際に表示されているもの**: 選択グループのPrefix ＋ 祖先グループのPrefix ＋ **子孫グループのPrefix（バグ）**

となっており、子孫グループのPrefixが余分に表示されてしまっている。

用語管理タブ（`NamespaceMain.tsx` 内部）は正しく実装されており、本修正は
`PrefixManagement.tsx` の `reloadNamespaces` 関数を用語管理側と同一ロジックに統一することで解消する。

---

## 2. 根本原因

### データフロー

```
UncertaintyManagement.tsx
  └─ filteredOrgGroupCds (useMemo)
       collectDescendantKeys で「選択ノード＋その全子孫CDs」を計算
       └─ PrefixManagement.tsx の orgGroupCds プロパティとして渡される

PrefixManagement.tsx / reloadNamespaces()
  └─ isOrgGroup の分岐
       orgGroupCds.length > 0 → fetchNamespacesWithAncestorsAndDescendants(key, orgGroupCds)
                                 ↑ 祖先Prefix ＋ 子孫グループPrefix を両方取得してマージ
       orgGroupCds が空       → fetchNamespaces(key, true)  ← 祖先のみ（正しい）
```

### 問題のコード（`PrefixManagement.tsx` 237〜244行目）

```typescript
// 修正前
if (orgGroupCds && orgGroupCds.length > 0) {
  fetchNamespacesWithAncestorsAndDescendants(key, orgGroupCds); // 子孫Prefixも混入
} else {
  fetchNamespaces(key, true);
}
```

### 用語管理側（正常）の対応コード（`NamespaceMain.tsx`）

```typescript
// fetchPrefixesForCurrentNsKey / externalSelectedNsKey useEffect 内
} else {
  // org group cd（組織グループノード） → scopeKey＋祖先グループでフィルタ
  fetchPrefixes(nsKey, true);  // 子孫は一切取らない
}
```

---

## 3. 修正内容

### 変更ファイル

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/namespace/PrefixManagement.tsx` | `reloadNamespaces` 関数内、組織グループノード選択分岐（237〜244行目） | `fetchNamespacesWithAncestorsAndDescendants` の呼び出しを削除し、常に `fetchNamespaces(key, true)` を呼ぶよう変更 |

### 修正後コード

```typescript
// 修正後
const isOrgGroup = !STATIC_KEYS.has(key);
if (isOrgGroup) {
  // 組織グループノード選択時:
  // 選択ノード＋祖先グループのPrefixのみ取得（用語管理タブと同一ロジック）
  fetchNamespaces(key, true);
} else {
  // global / personal 等の静的キー
  fetchNamespaces(key, undefined);
}
```

---

## 4. 実装ステップ

- [x] `PrefixManagement.tsx` の `reloadNamespaces` 関数を修正
- [x] TypeScript ビルドエラーなし確認

---

## 5. 影響範囲

- **影響あり**: `PrefixManagement.tsx` のPrefix一覧表示（組織グループノード選択時）
- **影響なし**:
  - `company` ノード選択時（別分岐のため変更なし）
  - `personal-{userId}` ノード選択時（別分岐のため変更なし）
  - 用語管理タブ（`NamespaceMain.tsx` は変更なし）
  - Prefixの追加・編集・削除・共有機能（`reloadNamespaces` の呼び出し元は変わらない）

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `fetchNamespacesWithAncestorsAndDescendants` が他の場所でも使われている | 中 | 低 | grep 済み、`reloadNamespaces` 内からのみ呼ばれていることを確認済み |
| `orgGroupCds` が他の用途（共有ダイアログ等）に使われており、空にするとバグが出る | 低 | なし | 今回 `orgGroupCds` 自体は変更しない。フェッチ関数の呼び出しのみ変更 |

---

## 7. テスト計画

### 手動テスト

- [ ] 組織グループノード（例: チームA）を選択 → チームA自身のPrefixと祖先グループのPrefixのみ表示されること
- [ ] チームAの子グループ（例: チームA-1）のPrefixが表示されないこと
- [ ] 親グループ（例: 部門X）を選択 → 部門X自身のPrefixと部門Xの祖先のPrefixが表示されること（チームAのPrefixは表示されないこと）
- [ ] `company` ノードを選択 → 全グループのPrefixが表示されること（変更なし）
- [ ] `personal-{userId}` ノードを選択 → 該当ユーザーのPrefixのみ表示されること（変更なし）
- [ ] 用語管理タブの動作が変わっていないこと

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-10
- **承認日時**: 2026-09-10
- **承認者コメント**: 承認
