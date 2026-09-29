# タスク計画書: 用語管理タブ スコープ切替時の Race Condition 修正

## メタデータ
- **作成日時**: 2026-09-29 00:00
- **タスクID**: 20260929_0000
- **課題番号**: 課題対応-451
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

名前空間管理画面の用語管理タブにおいて、**globalスコープを選択した後にユーザーのスコープを選択すると、関係ない用語が表示されてしまうことがある**不具合を修正する。

---

## 2. 根本原因

### バグの種類
**Race Condition（競合状態）/ Stale Fetch（古い非同期レスポンスの上書き）**

### 問題のコード

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`  
**関数**: `fetchTerms`（約956行目）

```typescript
// 現状（バグあり）
const fetchTerms = useCallback((options?: { ... }) => {
    setTermsLoading(true);
    getTerms(options)
      .then((data) => setTerms(data as Term[]))  // ← stale fetch 対策がない
      .catch(() => { setTerms([]); })
      .finally(() => setTermsLoading(false));
}, []);
```

`fetchTerms` はスコープ切替のたびに呼ばれるが、**古いリクエストのレスポンスが新しいリクエストのレスポンスより後に返ってきた場合に `setTerms` を上書きしてしまう**仕組みになっている。

### バグが発生するシナリオ（タイムライン）

```
時刻  | 操作                         | 発生する処理
------|------------------------------|------------------------------------------
T=0   | ①globalスコープを選択        | fetchTerms() 呼び出し（引数なし＝全件取得）
T=50  | ②ユーザーのスコープを選択    | fetchTerms({ scopeKey: 'userId' }) 呼び出し
T=80  | APIレスポンス②が先に返る     | setTerms(ユーザーの用語) → 画面は正常
T=120 | APIレスポンス①が遅れて返る   | setTerms(全件の用語) → ②の結果を上書き ← バグ！
```

**結果**: ユーザースコープを選択しているのに、先に発行した global のリクエスト結果（全件の用語）が後から届いて上書きされ、「関係ない用語」が表示される。

### なぜ `PrefixManagement.tsx` では発生しないか

`PrefixManagement.tsx` には `fetchSeqRef`（シーケンス番号 useRef）による stale fetch 対策が実装済みである：

```typescript
// PrefixManagement.tsx（約111〜158行目）：正しい実装
const fetchSeqRef = useRef(0);

const fetchNamespaces = async (...) => {
    const seq = ++fetchSeqRef.current;  // ① シーケンス番号を払い出す
    setLoading(true);
    try {
        const list = await getNamespaceList(options);
        if (seq !== fetchSeqRef.current) return;  // ② 古いフェッチなら結果を捨てる
        setRows(...);
    } catch {
        if (seq !== fetchSeqRef.current) return;  // ③ エラー時も同様
        ...
    } finally {
        if (seq === fetchSeqRef.current) setLoading(false);  // ④ 最新のみローディング解除
    }
};
```

`fetchTerms` にはこの対策が**一切実装されていない**。

---

## 3. 修正方針

`PrefixManagement.tsx` と同様に、`fetchTerms` に `fetchTermsSeqRef`（`useRef(0)`）を導入し、スコープ切替後に遅延完了した古いリクエスト結果を破棄する。

### 修正後のコード

```typescript
// ① useRef を追加（fetchTerms の直前に配置）
const fetchTermsSeqRef = useRef(0);

// ② fetchTerms にシーケンス番号チェックを追加
const fetchTerms = useCallback((options?: { scopeKey?: string; scopeKeys?: string[]; globalFlg?: boolean; withAncestors?: boolean }) => {
    const seq = ++fetchTermsSeqRef.current;  // シーケンス番号を払い出す
    setTermsLoading(true);
    getTerms(options)
      .then((data) => {
        if (seq !== fetchTermsSeqRef.current) return;  // stale なら破棄
        setTerms(data as Term[]);
      })
      .catch(() => {
        if (seq !== fetchTermsSeqRef.current) return;  // stale なら破棄
        setTerms([]);
      })
      .finally(() => {
        if (seq === fetchTermsSeqRef.current) setTermsLoading(false);  // 最新のみローディング解除
      });
}, []);
```

---

## 4. 実装ステップ

- [ ] タスク計画書作成（本ファイル）
- [ ] Phase 1: `fetchTermsSeqRef` の useRef 追加
- [ ] Phase 2: `fetchTerms` にシーケンス番号チェックを追加
- [ ] 動作確認・検証

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | `fetchTermsSeqRef` 追加、`fetchTerms` に stale fetch 対策を追加 |

バックエンド変更は不要。

---

## 6. 影響範囲

| 区分 | 詳細 |
|------|------|
| DB スキーマ | 変更なし |
| バックエンド API | 変更なし |
| 他コンポーネント | 影響なし（`fetchTerms` は `NamespaceMain.tsx` 内でのみ定義・使用） |
| 既存の用語フェッチ動作 | **正常時の動作は変わらない**（シーケンス番号が一致する場合は従来通り処理） |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `fetchTermsSeqRef.current` の型や初期値に起因するバグ | 低 | 低 | `useRef(0)` で初期化し、`PrefixManagement.tsx` と同一パターンで実装 |
| `fetchAllTerms`（バッジ計算用）にも同様の問題がある | 低 | 低 | `fetchAllTerms` は引数なしの全件取得のみで競合が発生しないため対象外 |

---

## 8. テスト計画

### 手動確認項目
- [ ] globalスコープ → ユーザースコープの順で素早く切り替えたとき、最終的にユーザースコープの用語のみが表示されること
- [ ] ユーザースコープ → globalスコープの順で切り替えたとき、全件の用語が表示されること
- [ ] 通常のスコープ切替（間隔をおいた操作）で用語が正常に表示されること
- [ ] 用語の新規追加・編集後の再取得が正常に動作すること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-29 00:00
- **承認日時**: 2026-09-29 00:00
- **承認者コメント**: 承認

---

## 10. 実施記録

### 実施日時
開始: 2026-09-29 00:00
完了: 2026-09-29 00:00

### 最終的な成果物
- [x] Phase 1: `NamespaceMain.tsx` に `fetchTermsSeqRef` (useRef) 追加（958行目）
- [x] Phase 2: `NamespaceMain.tsx` の `fetchTerms` に stale fetch 対策追加（960〜975行目）
