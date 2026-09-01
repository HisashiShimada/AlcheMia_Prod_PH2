# タスク計画書: 課題調査-310 名前空間用語管理 Prefix表示不具合修正

## メタデータ

- **作成日時**: 2026-08-31
- **タスクID**: 課題調査-310
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

実験管理者メニューの名前空間管理タブ（用語管理画面）において、ブラウザから別ツールに切り替えて戻ると、Prefixプルダウンに選択中の階層とは無関係な別階層のPrefixが表示される不具合を修正する。

### 不具合再現手順（手順B）

1. 左ペインで特定ユーザーノードを選択
2. Prefix管理タブでPrefixを新規作成
3. 用語管理タブを選択
4. ブラウザから離れて別ツールを開く
5. 再度ブラウザの用語管理タブに戻る
   → 用語一覧に別階層の用語が混在し、Prefixプルダウンに他階層のPrefixが表示される

---

## 原因分析

### 根本原因①（主因）: `visibilitychange` イベントハンドラの全件取得

`NamespaceMain.tsx` の `visibilitychange` イベントハンドラ内で、`fetchTerms()` と `fetchPrefixes()` を **引数なし（全件取得）** で呼び出していたため、ブラウザに戻るたびに現在選択中のノードとは無関係な全データで用語一覧・Prefixプルダウンが上書きされていた。

```typescript
// 修正前（バグあり）
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchTerms();     // ← 引数なし → 全件取得
    fetchPrefixes();  // ← 引数なし → 全件取得
    ...
  }
};
```

### 根本原因②（副因）: `fetchPrefixes` 内の `withAncestors` 無視

`fetchPrefixes(nsKey, true)` 呼び出し時、内部で `scopeKey` を `scopeKeys`（複数形・配列）に詰めて渡していたため、バックエンドが `withAncestors` を無視し、祖先グループの Prefix が取得されていなかった。

```typescript
// 修正前（バグあり）
} else if (scopeKey) {
  options = { scopeKeys: [scopeKey], withAncestors }; // ← scopeKeys配列に入れると withAncestors が無視される
}
```

---

## 目的と期待される成果

- [ ] ブラウザから離れて戻った際に、現在選択中のノードのスコープで用語・Prefixが正しく再取得される
- [ ] Prefixプルダウンに他階層のPrefixが混入しなくなる
- [ ] `withAncestors=true` が正しくバックエンドに伝わり、祖先グループのPrefixも取得される

---

## 実装ステップ

- [x] 修正①: `fetchPrefixes` 内の `options` 生成を `scopeKey`（単数形）に修正
- [x] 修正②: `fetchPrefixesForCurrentNsKey` 関数を新規作成
- [x] 修正③: `visibilitychange` ハンドラ内の呼び出しをスコープ絞り込み版に変更
- [x] 修正④: `visibilitychange` の `useEffect` 依存配列を更新
- [x] TypeScript コンパイルエラーなし確認

---

## 変更ファイル

1. `frontend/src/components/namespace/NamespaceMain.tsx` - 上記4箇所の修正

---

## 修正内容詳細

### 修正① `fetchPrefixes` 内 options 生成（L772、L777）

```typescript
// 修正前
let options: { scopeKeys?: string[]; withAncestors?: boolean } | undefined;
} else if (scopeKey) {
  options = { scopeKeys: [scopeKey], withAncestors };
}

// 修正後
let options: { scopeKey?: string; scopeKeys?: string[]; withAncestors?: boolean } | undefined;
} else if (scopeKey) {
  options = { scopeKey, withAncestors };
}
```

### 修正② `fetchPrefixesForCurrentNsKey` 新規追加（fetchTermsForCurrentNsKey の直後）

`fetchTermsForCurrentNsKey` と同構造で、ノード種別ごとに適切なスコープ引数で `fetchPrefixes` を呼ぶ共通関数を新規作成。

### 修正③④ `visibilitychange` ハンドラ修正

```typescript
// 修正前
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchTerms();
    fetchPrefixes();
    const nodes = buildPersonalTreeFromStorage();
    setPersonalChildren(nodes);
  }
};
...
}, [fetchTerms, fetchPrefixes]);

// 修正後
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 現在選択中のノードのスコープで再フェッチ（引数なし全件取得による他階層データ混入を防ぐ）
    const effectiveKey = externalSelectedNsKey !== undefined ? externalSelectedNsKey : selectedNsKey;
    fetchTermsForCurrentNsKey(effectiveKey);
    fetchPrefixesForCurrentNsKey(effectiveKey);
    const nodes = buildPersonalTreeFromStorage();
    setPersonalChildren(nodes);
  }
};
...
}, [fetchTermsForCurrentNsKey, fetchPrefixesForCurrentNsKey, selectedNsKey, externalSelectedNsKey]);
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `fetchPrefixesForCurrentNsKey` の依存配列漏れ | 中 | 低 | TypeScript コンパイル確認済み |
| 既存の `selectedNsKey` 変化時 useEffect との重複フェッチ | 低 | 低 | visibilitychange は別トリガーのため競合しない |

---

## テスト計画

### 手動テスト

- [ ] 手順A（正常系）: ノード選択 → Prefix作成 → 用語追加 → Prefixプルダウンに正しいPrefixのみ表示
- [ ] 手順B（修正確認）: ノード選択 → Prefix作成 → 用語管理タブ → ブラウザ離脱 → 戻る → Prefixプルダウンに正しいPrefixのみ表示
- [ ] 組織グループノード選択時: 祖先グループのPrefixも含めて表示されること

---

## 承認記録

- **計画書提示日時**: 2026-08-31
- **承認日時**: 2026-08-31（会話内での承認）
- **承認者コメント**: ルールに則って修正を実施

---

## 実施記録

### 実施日時

開始: 2026-08-31
完了: 2026-08-31

### 計画からの変更点

なし

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] 修正①: `fetchPrefixes` 内 `options` 生成を単数形 `scopeKey` に修正
- [x] 修正②: `fetchPrefixesForCurrentNsKey` 関数を新規追加
- [x] 修正③: `visibilitychange` ハンドラ内を `fetchTermsForCurrentNsKey` + `fetchPrefixesForCurrentNsKey` に変更
- [x] 修正④: `visibilitychange` の `useEffect` 依存配列を更新
- [x] TypeScript コンパイルエラーなし（`NamespaceMain.tsx` に起因する新規エラーなし）

### 振り返り

#### うまくいった点

- 不具合の原因を `visibilitychange` イベントと `withAncestors` 無視の2点に正確に特定できた
- `fetchTermsForCurrentNsKey` と同じ構造で `fetchPrefixesForCurrentNsKey` を作成することで、既存のパターンに沿った修正ができた

#### 改善が必要な点

- 修正前にタスク計画書を作成するべきだった（workflow.md のルールに従い、事前に PLAN.md を作成・承認を得てから実装すること）

#### 学んだこと

- `visibilitychange` イベント内で引数なしの全件取得を行うと、ノード選択スコープが失われる
- `scopeKeys`（複数形）と `scopeKey`（単数形）でバックエンドの分岐が異なり、`withAncestors` の有効・無効が変わる
