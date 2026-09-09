# タスク計画書: NamespaceMain 用語追加ボタン非活性バグ修正

## メタデータ

- **作成日時**: 2026-09-09 11:00
- **タスクID**: 20260909_1100_NamespaceMain用語追加ボタン非活性バグ修正
- **優先度**: 高
- **推定工数**: 1時間 → 追記後 2時間

---

## 1. タスク概要

`UncertaintyManagement`（実験管理者メニューのタブ4）で、prefixも用語も持たないグループを選択した状態で「Prefix管理」タブにてprefixを新規登録し、「用語管理」タブに切り替えると、新規追加ボタンが非活性のまま（`disabled`）になる。

別のグループを選択して再度選択しなおすとボタンが活性化することから、prefix登録後に`NamespaceMain`内部の`dbPrefixes`ステートが更新されていないことが根本原因。

### Phase 2 追加調査（2026-09-09）

「用語管理タブ選択時に再取得」の修正を機に、他タブ・グループ切り替え時の最新化状況を調査した結果、以下の問題を追加特定。

| タブ | タブ切り替え時に最新化 | グループ切り替え時に最新化 |
|------|----------------------|--------------------------|
| 用語管理（NamespaceMain） | ✅ Phase 1 修正済み | ✅ 済み |
| Prefix管理（PrefixManagement） | ❌ **未対応** | ✅ 済み（`selectedNsKey` 変化で発火） |
| 不確かさ基準管理 | ❌ **未対応** | ✅ 済み（`selectedNsKey` 変化で発火） |

---

## 2. 根本原因

### Phase 1（用語管理タブ）

```
[グループ選択]
  → externalSelectedNsKey 変化
  → NamespaceMain の useEffect([externalSelectedNsKey]) が発火
  → fetchPrefixes(nsKey, true) 実行
  → dbPrefixes = [] (prefixが0件のため)
  → 新規追加ボタン: disabled={true}

[PrefixManagement タブで prefix を新規登録]
  → PrefixManagement 側の DB は更新される
  → NamespaceMain 側の dbPrefixes は更新されない  ← 問題

[用語管理タブに切り替え]
  → externalSelectedNsKey は変化していない
  → useEffect([externalSelectedNsKey]) は発火しない
  → dbPrefixes は空のまま → 新規追加ボタン: disabled={true}（バグ）
```

### Phase 2（Prefix管理・不確かさ基準管理タブ）

**PrefixManagement.tsx の useEffect（252行目）:**
```tsx
useEffect(() => {
  reloadNamespaces();
}, [selectedNsKey, JSON.stringify(orgGroupCds)]);
// → タブ切り替えでは selectedNsKey / orgGroupCds は変化しないため再取得されない
```

**UncertaintyManagement.tsx の不確かさ基準取得 useEffect（514行目）:**
```tsx
useEffect(() => {
  fetchUncertaintyCriteriaList(scopeKey)...
}, [selectedNsKey, resolveScopeKey]);
// → タブ切り替えでは selectedNsKey は変化しないため再取得されない
```

---

## 3. 修正方針

### Phase 1（実装済み）

`NamespaceMainProps` に `tabActivatedAt?: number` を追加し、用語管理タブへの切り替え時にタイムスタンプを更新することで `terms` と `dbPrefixes` を再取得させる。

### Phase 2（追加実装）

`UncertaintyManagement.tsx` のタブ切り替えハンドラを拡張し、各タブがアクティブになった際に対応するコンポーネントへ再取得を指示する。

- **Prefix管理タブ**: `PrefixManagement` は既存の `reloadNamespaces()` 関数を持つため、`PrefixManagementProps` に `tabActivatedAt?: number` を追加して切り替え時に呼び出させる
- **不確かさ基準管理タブ**: `UncertaintyManagement` 内で直接 `fetchUncertaintyCriteriaList` を呼ぶ useEffect に `criteriaTabActivatedAt` state を追加してトリガーする

---

## 4. 実装ステップ

### Phase 1（完了）

- [x] `docs/tasks/20260909_1100_NamespaceMain用語追加ボタン非活性バグ修正/PLAN.md` 作成（本ファイル）
- [x] `frontend/src/types/namespace.ts` — `NamespaceMainProps` に `tabActivatedAt?: number` を追加
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `tabActivatedAt` 変化時に `fetchTermsForCurrentNsKey` と `fetchPrefixesForCurrentNsKey` の両方を呼ぶ `useEffect` を追加
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — `namespaceTabActivatedAt` state 追加・用語管理タブ切り替え時にタイムスタンプ更新・`<NamespaceMain>` に `tabActivatedAt` prop を渡す
- [x] TypeScript コンパイルエラーがないことを確認（`tsc --noEmit`） → エラーなし

### Phase 2（追加実装）

- [x] PLAN.md 追記（本セクション）
- [x] `frontend/src/types/namespace.ts` — `PrefixManagementProps` に `tabActivatedAt?: number` を追加
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` — `tabActivatedAt` 変化時に `reloadNamespaces()` を呼ぶ `useEffect` を追加
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — `prefixTabActivatedAt` state 追加・Prefix管理タブ切り替え時にタイムスタンプ更新・`<PrefixManagement>` に `tabActivatedAt` prop を渡す
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — `criteriaTabActivatedAt` state 追加・不確かさ基準管理タブ切り替え時にタイムスタンプ更新・不確かさ基準再取得 useEffect を追加
- [x] TypeScript コンパイルエラーがないことを確認（`tsc --noEmit`） → エラーなし
- [ ] 動作確認（手動テスト）

---

## 5. 変更ファイル

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/types/namespace.ts` | `NamespaceMainProps` に `tabActivatedAt?: number` 追加（Phase 1 済み）、`PrefixManagementProps` に `tabActivatedAt?: number` 追加（Phase 2） |
| 2 | `frontend/src/components/namespace/NamespaceMain.tsx` | `tabActivatedAt` 変化時に terms + prefixes を再取得する useEffect 追加（Phase 1 済み） |
| 3 | `frontend/src/components/namespace/PrefixManagement.tsx` | `tabActivatedAt` 変化時に `reloadNamespaces()` を呼ぶ useEffect 追加（Phase 2） |
| 4 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `namespaceTabActivatedAt` 追加（Phase 1 済み）、`prefixTabActivatedAt` / `criteriaTabActivatedAt` 追加・各タブ切り替え時のタイムスタンプ更新・各コンポーネントへの prop 渡し（Phase 2） |

---

## 6. 影響範囲

- `NamespaceMain` 呼び出し元: `namespace-management/page.tsx`（`tabActivatedAt` 未渡しのため影響なし）
- `PrefixManagement` 呼び出し元: `UncertaintyManagement.tsx`（今回修正対象）

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 初回マウント時に余分なAPIコールが走る | 低 | 中 | useEffect 内で `tabActivatedAt === undefined` の場合は早期リターン |
| 既存動作への影響 | 低 | 低 | prop は全て optional のため、渡さない呼び出し元への影響なし |
| 不確かさ基準取得が二重発火する | 低 | 低 | `selectedNsKey` 変化と `criteriaTabActivatedAt` 変化は別の useEffect のため競合しない |

---

## 8. テスト計画

### 手動テスト

**Phase 1（用語管理タブ）**
- [ ] prefixも用語も持たないグループを選択 → Prefix管理タブでprefixを新規登録 → 用語管理タブに切り替え → 新規追加ボタンが **活性化**
- [ ] 不確かさ基準管理タブを経由した後に用語管理タブを選択しても同様に **活性化**

**Phase 2（Prefix管理・不確かさ基準管理タブ）**
- [ ] グループAを選択してPrefix管理タブを開く → 別タブ経由でPrefix管理タブに戻る → **最新のPrefix一覧が表示される**
- [ ] グループAを選択して不確かさ基準管理タブを開く → 別タブ経由で不確かさ基準管理タブに戻る → **最新の一覧が表示される**
- [ ] グループ切り替え時も各タブで正常に再取得されること（既存動作維持）

### TypeScriptコンパイル確認

- [x] Phase 1: `tsc --noEmit` エラーなし
- [ ] Phase 2: `tsc --noEmit` エラーなし

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-09 11:00
- **承認日時**: 承認済み（Phase 1）
- **承認者コメント**: Phase 2 追記・実装を指示（2026-09-09）
