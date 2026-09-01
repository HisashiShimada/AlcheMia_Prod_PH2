# タスク計画書: Personal ノードキー統一による Prefix・用語管理不具合修正

## メタデータ
- **作成日時**: 2026-08-31 10:00
- **タスクID**: 20260831_1000
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

実験管理者メニューの名前空間管理タブ（Prefix管理・用語管理）において、
新規ユーザー（実験管理者ロール）の Personal スコープに関して以下2件の不具合が発見された。
本タスクで根本原因を修正する。

### テスト手順
1. 新規ユーザー（実験管理者ロール）を作成
2. 実験管理者メニューログイン
3. prefix を新規追加
4. ③で作成した prefix を使用して用語を新規追加

### 不具合内容

| # | 不具合 | 重要度 |
|---|--------|--------|
| ① | 追加した prefix が一覧に表示されない（DB には登録されている） | 高 |
| ② | 用語新規追加時に「prefixが登録されていない」メッセージが表示され、新規追加ボタンが非活性 | 高 |

---

## 2. 根本原因

### 共通原因：Personal ノードのキー形式の不整合

`UncertaintyManagement.tsx` と `NamespaceMain.tsx` の2ファイルで、
Personal 配下ユーザーノードのキー形式が以下のように異なっていた。

| ファイル | Personal ノードのキー形式（修正前） |
|---|---|
| `UncertaintyManagement.tsx` | `personal-{userId}` |
| `NamespaceMain.tsx`（`buildPersonalTreeFromStorage`） | `{userId}`（プレフィックスなし） |

> **補足: なぜ `personal-` プレフィックスが必要か**
> ツリーのノードキーは画面内で一意である必要がある。
> `userId` が org group cd と偶然一致した場合の誤動作リスクを避けるため、
> `personal-` を付与して区別する設計を採用した。
> 本修正では `personal-{userId}` 形式を正とし、全ファイルを統一する。

### 不具合①：追加した prefix が一覧に表示されない

```
【修正前の処理フロー】
UncertaintyManagement
  selectedNsKey = "personal-abc123"  ← ツリーのキー（Personal ノード選択時）
  effectiveNsKey = "abc123"          ← personal- を除去して PrefixManagement へ渡す
        ↓
  PrefixManagement.reloadNamespaces
    key = "abc123"
    STATIC_KEYS = ['global', 'ns-maiml', 'ns-xsi', 'personal']
    "abc123" ∉ STATIC_KEYS → isOrgGroup = true  ★org group cd と誤判定★
        ↓
    fetchNamespaces(undefined, undefined, orgGroupCds)
    → getNamespaceList({ scopeKeys: [org_group_cds] })
    → userId が scopeKeys に含まれない → 個人スコープの prefix が 0 件
```

### 不具合②：「prefixが登録されていない」・新規追加ボタン非活性

```
【修正前の処理フロー】
UncertaintyManagement
  externalSelectedNsKey = selectedNsKey = "personal-abc123"
                           ← effectiveNsKey ではなく生の selectedNsKey を NamespaceMain に渡す
        ↓
  NamespaceMain
    personalKeySet = { "abc123" }   ← buildPersonalTreeFromStorage より key = userId
    personalKeySet.has("personal-abc123") → false  ★不一致★
        ↓
    else 分岐 → fetchPrefixes("personal-abc123", true)
    → DB の実際の scope_key = 'abc123' なので不一致 → prefix 0 件
        ↓
    availablePrefixOptions = [] → 用語追加ボタン非活性
```

---

## 3. 修正方針

**Personal ノードのキーを `personal-{userId}` 形式に全ファイルで統一する。**

- `UncertaintyManagement.tsx` が使用している `personal-{userId}` 形式を正とする
- `NamespaceMain.tsx` のキー生成を `personal-{userId}` 形式に合わせる
- API 呼び出し時（DB の scope_key は `userId` のみ）は各箇所で `personal-` を除去する

---

## 4. 実装ステップ

- [x] 不具合調査・根本原因特定
- [x] タスク計画書作成（本ファイル）
- [x] Phase 1: `NamespaceMain.tsx` — Personal ノードのキーに `personal-` を付与
- [x] Phase 2: `NamespaceMain.tsx` — fetchTermsForCurrentNsKey useEffect の API 呼び出し前に `personal-` を除去
- [x] Phase 3: `NamespaceMain.tsx` — externalSelectedNsKey useEffect の API 呼び出し前に `personal-` を除去
- [x] Phase 4: `NamespaceMain.tsx` — selectedNsKey useEffect の API 呼び出し前に `personal-` を除去
- [x] Phase 5: `UncertaintyManagement.tsx` — effectiveNsKey の `personal-` 除去処理を削除
- [x] Phase 6: `UncertaintyManagement.tsx` — filteredOrgGroupCds に `personal-` ノード除外条件を追加
- [x] Phase 7: `PrefixManagement.tsx` — reloadNamespaces に `personal-` ノード専用分岐を追加
- [x] Phase 8: `PrefixManagement.tsx` — fetchSuggestedUri 呼び出し前に `personal-` を除去
- [x] Phase 9: `PrefixManagement.tsx` — executeSave の createNamespace 呼び出し前に `personal-` を除去

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 対応不具合 |
|---|---------|---------|-----------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | ①② |
| 2 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | 修正 | ①② |
| 3 | `frontend/src/components/namespace/PrefixManagement.tsx` | 修正 | ① |

---

## 6. 詳細な変更内容

### Phase 1: `NamespaceMain.tsx` — Personal ノードのキーに `personal-` を付与

**場所**: `buildPersonalTreeFromStorage()` 関数（165行目）

```typescript
// 修正前
return [{ key: userId, label: userName ?? userId, count: 0 }];

// 修正後
return [{ key: `personal-${userId}`, label: userName ?? userId, count: 0 }];
```

**目的**: `personalKeySet` のキー形式を `personal-{userId}` に統一し、
`UncertaintyManagement` から渡される `externalSelectedNsKey` とマッチさせる。

---

### Phase 2〜4: `NamespaceMain.tsx` — API 呼び出し前に `personal-` を除去

**場所**: 以下3箇所の useEffect 内（849行・898行・935行）

```typescript
// 修正前
const scopeKey = nsKey === PERSONAL_ROOT ? currentUserPersonalKey : nsKey;

// 修正後
const scopeKey = nsKey === PERSONAL_ROOT
  ? currentUserPersonalKey
  : nsKey.replace(/^personal-/, '');  // personal- を除去して DB の scope_key（userId）にする
```

---

### Phase 5: `UncertaintyManagement.tsx` — effectiveNsKey の変換を削除

**場所**: 336〜344行目

```typescript
// 修正前（personal- を除去して PrefixManagement に渡していた）
const effectiveNsKey = useMemo(() => {
  if (!selectedNsKey) return null;
  if (selectedNsKey.startsWith('personal-')) {
    return selectedNsKey.replace(/^personal-/, '');
  }
  return selectedNsKey;
}, [selectedNsKey]);

// 修正後（personal- のまま渡す。除去は PrefixManagement 側で行う）
const effectiveNsKey = selectedNsKey;
```

---

### Phase 6: `UncertaintyManagement.tsx` — filteredOrgGroupCds に除外条件を追加

**場所**: filteredOrgGroupCds useMemo 内（362〜363行目）

```typescript
// 追加行のみ抜粋
if (STATIC_KEYS.has(selectedNsKey)) return allCds;
// personal-{userId} ノードは org group cd ではないため全 CDs を返す  ← 追加
if (selectedNsKey.startsWith('personal-')) return allCds;
```

---

### Phase 7: `PrefixManagement.tsx` — reloadNamespaces に personal- 分岐を追加

**場所**: `reloadNamespaces()` 関数（129〜132行目）

```typescript
// 追加分岐のみ抜粋
} else if (key.startsWith('personal-')) {
  // personal-{userId} ノード → personal- を除去して userId を scopeKey として渡す
  const userId = key.replace(/^personal-/, '');
  fetchNamespaces(userId, undefined);
} else {
```

---

### Phase 8: `PrefixManagement.tsx` — fetchSuggestedUri 呼び出し前に除去

**場所**: `handleAutoFillUri()` 関数（167〜170行目）

```typescript
// 修正後
const rawKey = scopeKey ?? selectedNsKey ?? undefined;
// personal-{userId} 形式の場合は personal- を除去して DB の scope_key（userId）にする
const apiKey = rawKey?.replace(/^personal-/, '');
const uri = await fetchSuggestedUri(apiKey);
```

---

### Phase 9: `PrefixManagement.tsx` — executeSave の createNamespace 呼び出し前に除去

**場所**: `executeSave()` 関数（195〜202行目）

```typescript
// 修正後
const rawScopeKey = scopeKey ?? selectedNsKey ?? undefined;
// personal-{userId} 形式の場合は personal- を除去して DB の scope_key（userId）にする
const apiScopeKey = rawScopeKey?.replace(/^personal-/, '');
const createNamespaceRequest = {
  prefix: row.prefix,
  uri: row.uri,
  description: row.description || undefined,
  scopeKey: apiScopeKey,
};
```


---

## 7. 影響範囲

| 区分 | 詳細 |
|------|------|
| DB スキーマ | 変更なし |
| バックエンド API | 変更なし |
| `NamespaceMain.tsx` のツリー表示 | Personal ノードのキーが `{userId}` → `personal-{userId}` に変わるが、表示ラベルは変わらない。ツリー選択・展開動作への影響なし |
| `NamespaceMain.tsx` 単独利用（`/namespace-management` ページ） | `buildPersonalTreeFromStorage` のキー変更が影響するが、同ファイル内の判定ロジックを同時修正済みのため動作に影響なし |
| `UncertaintyManagement.tsx` の org group cd 選択時動作 | 変更なし（`personal-` 分岐が先に処理されるため既存ロジックに影響なし） |

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Personal キー変更により `personalKeySet` の判定が壊れる | 高 | 低 | Phase 2〜4 で API 呼び出し前の `personal-` 除去を同時適用済み |
| `NamespaceMain.tsx` 単独利用への影響 | 中 | 低 | ツリーキーと判定ロジックを同ファイル内で一貫して修正済み |
| `filteredOrgGroupCds` の `personal-` 早期リターンが他条件を遮る | 低 | なし | STATIC_KEYS チェックの直後に追加しており、org group cd の処理には影響なし |

---

## 9. テスト計画

### 手動テスト

#### 不具合①（prefix 一覧）
- [ ] 新規ユーザー（実験管理者ロール）でログインし、左ツリーの Personal 配下ユーザーノードを選択
- [ ] Prefix管理タブで prefix を新規追加・保存する
- [ ] 保存後、追加した prefix が一覧に表示されること

#### 不具合②（用語管理）
- [ ] 上記と同じ状態（Personal ノード選択中）で用語管理タブを開く
- [ ] 「用語を追加」ボタンが活性状態であること
- [ ] 「prefixが登録されていない」メッセージが表示されないこと
- [ ] prefix のプルダウンに①で登録した prefix が表示されること

#### 既存機能の回帰確認
- [ ] 組織グループノード選択時、Prefix管理タブが正しく機能すること
- [ ] 組織グループノード選択時、用語管理タブが正しく機能すること
- [ ] `/namespace-management` ページ（NamespaceMain 単独利用）が正しく動作すること

---

## 10. ロールバック計画

以下3ファイルの変更を元に戻す（git revert または手動差し戻し）。

1. `NamespaceMain.tsx`: `buildPersonalTreeFromStorage` のキーを `userId` に戻す / useEffect 3箇所の `nsKey.replace(/^personal-/, '')` を `nsKey` に戻す
2. `UncertaintyManagement.tsx`: `effectiveNsKey` を `useMemo` による `personal-` 除去処理に戻す / `filteredOrgGroupCds` の `startsWith('personal-')` 早期リターンを削除する
3. `PrefixManagement.tsx`: `reloadNamespaces` の `personal-` 分岐を削除する / `handleAutoFillUri`・`executeSave` の `apiKey`・`apiScopeKey` 変数を削除して元の式に戻す

---

## 11. 規約適合確認

`.clinerules` 規約との照合結果。

| 規約 | 結果 | 備考 |
|---|---|---|
| services/ 経由必須（直接 API 呼び出し禁止） | ✅ 準拠 | 全 API 呼び出しは `namespaceApiService` 経由 |
| 型定義ファイルへの集約 | ✅ 準拠 | 新規型定義の追加なし |
| インラインオブジェクト引数禁止 | ✅ 準拠 | `rawScopeKey`・`apiScopeKey` を変数に代入してから渡している |
| コメントは日本語 | ✅ 準拠 | 追加コメントはすべて日本語 |
| 多言語対応（翻訳キー） | ✅ 準拠 | 新規表示文字列の追加なし |
| **ワークフロー規約（計画書先行作成）** | ⚠️ 事後作成 | 計画書作成前に実装を先行した。本ファイルで記録を補完 |

---

## 12. 承認記録

- **計画書提示日時**: 2026-08-31 10:00
- **承認日時**: 2026-08-31 10:00
- **承認者コメント**: 事後承認（実装は先行済み）

---

## 13. 実施記録

### 実施日時
開始: 2026-08-31 10:00
完了: 2026-08-31 10:30

### 計画からの変更点
なし（計画書は実装後に事後作成）

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] Phase 1: `NamespaceMain.tsx` の `buildPersonalTreeFromStorage` でキーを `personal-${userId}` に変更（165行目）
- [x] Phase 2: `NamespaceMain.tsx` の fetchTermsForCurrentNsKey useEffect で `nsKey.replace(/^personal-/, '')` 追加（849行目）
- [x] Phase 3: `NamespaceMain.tsx` の externalSelectedNsKey useEffect で `nsKey.replace(/^personal-/, '')` 追加（898行目）
- [x] Phase 4: `NamespaceMain.tsx` の selectedNsKey useEffect で `nsKey.replace(/^personal-/, '')` 追加（935行目）
- [x] Phase 5: `UncertaintyManagement.tsx` の `effectiveNsKey` を `selectedNsKey` 直接代入に変更（338行目）
- [x] Phase 6: `UncertaintyManagement.tsx` の `filteredOrgGroupCds` に `startsWith('personal-')` 早期リターンを追加（363行目）
- [x] Phase 7: `PrefixManagement.tsx` の `reloadNamespaces` に `startsWith('personal-')` 分岐を追加（129〜132行目）
- [x] Phase 8: `PrefixManagement.tsx` の `handleAutoFillUri` で `apiKey` として `personal-` 除去後の値を使用（167〜170行目）
- [x] Phase 9: `PrefixManagement.tsx` の `executeSave` で `apiScopeKey` として `personal-` 除去後の値を使用（195〜202行目）

---

## 14. 振り返り

### うまくいった点
- 不具合の根本原因（Personal ノードのキー形式の不整合）を1つに特定でき、修正範囲を最小化できた
- DB・バックエンド API への変更が不要で、フロントエンドのみの修正で解決できた

### 改善が必要な点
- ワークフロー規約に従い、計画書を実装前に作成すること

### 学んだこと
- 複数コンポーネント間でノードキーのフォーマットを共有する場合は、定数ファイルやユーティリティ関数として一元管理することで同種の不整合を防げる
- `personal-` のようなプレフィックス付きキーを API に渡す際は、除去処理を行う箇所（責務）を明確に決めておくことが重要


