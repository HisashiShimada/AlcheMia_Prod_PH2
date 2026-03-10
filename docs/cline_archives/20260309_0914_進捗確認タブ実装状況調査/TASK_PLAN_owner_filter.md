# タスク計画書: ownerFilter条件をfilteredDataのuseMemoに追加する

## メタデータ
- **作成日時**: 2026-03-09 15:29
- **タスクID**: owner_filter_usememo
- **優先度**: 中
- **推定工数**: 0.5時間
- **参照元**: docs/20260309_0914_進捗確認タブ実装状況調査/PLAN.md

## タスク概要

`ProgressMonitoring.tsx` の `filteredData` を算出する `useMemo` フックに、`ownerFilter` の値（`'my_only'` / `'all'`）に応じた絞り込み条件を追加する。

現状、`ownerFilter` の state・UIセレクトボックスは実装済みだが、`filteredData` の `useMemo` 内に `ownerFilter` を参照するフィルタロジックが存在しないため、セレクトを切り替えてもテーブルに反映されていない。

---

## 現状の問題

```typescript
// filteredData の useMemo（現状）
const filteredData = useMemo(() => {
  return allData.filter((item) => {
    // ...
    return (
      matchesSearch &&
      matchesCheckout &&
      matchesProjectStatus &&
      matchesDepartment
      // ← ownerFilter の条件がない！
    );
  });
}, [
  allData,
  searchText,
  checkoutFilter,
  projectStatusFilter,
  departmentFilter,
  t,
  // ← ownerFilter が依存配列に含まれていない！
]);
```

---

## 目的と期待される成果

- [ ] `ownerFilter === 'my_only'` のとき、ログインユーザーが所有するプロジェクトのみをテーブルに表示する
- [ ] `ownerFilter === 'all'` のとき、全プロジェクトを表示する（現状と同じ）
- [ ] `ownerFilter` を依存配列に追加し、セレクト変更時にテーブルが即時再計算される

---

## 実装方針

### 比較方法の選択

ログインユーザーとプロジェクトオーナーの照合には **メールアドレス一致** を使用する。

**理由:**
- `ProgressRecord` が持つオーナー識別子は `ownerEmail: string` と `ownerName: string` の2フィールド
- `SessionUserInfo` は `id`・`email` を持つ
- `ownerEmail` はAPIから直接マッピングされており、`email` との比較が最も確実
- `managerId`（ユーザーID）はコンポーネント内で保持しているが、`ProgressRecord` にオーナーIDフィールドがないため直接比較不可

### フォールバック

`ownerEmail` が空文字の場合（APIがメールアドレスを返さない場合）を考慮し、ログインユーザー名（`displayName`）と `ownerName` の比較を2次条件として追加する。

---

## 実装ステップ

### Step 1: useMemo 内に ownerFilter 条件変数を追加する
- `filteredData` の `useMemo` 内で `ownerFilter` に基づく `matchesOwner` 変数を定義する
- ログインユーザーの email は `getUserInfo()` で取得する（既に `getUserInfo` はインポート済み）

```typescript
// 追加するロジック（イメージ）
const userInfo = getUserInfo();
let matchesOwner = true;
if (ownerFilter === 'my_only' && userInfo) {
  if (item.ownerEmail && userInfo.email) {
    matchesOwner = item.ownerEmail === userInfo.email;
  } else if (item.ownerName && userInfo.displayName) {
    matchesOwner = item.ownerName === userInfo.displayName;
  }
}
```

### Step 2: return 条件に matchesOwner を追加する
```typescript
return (
  matchesSearch &&
  matchesOwner &&          // ← 追加
  matchesCheckout &&
  matchesProjectStatus &&
  matchesDepartment
);
```

### Step 3: 依存配列に ownerFilter を追加する
```typescript
}, [
  allData,
  searchText,
  ownerFilter,              // ← 追加
  checkoutFilter,
  projectStatusFilter,
  departmentFilter,
  t,
]);
```

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `filteredData` の `useMemo` に `ownerFilter` 条件追加・依存配列に `ownerFilter` 追加 |

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| API が `ownerEmail` を返さないケースがある | `ownerName` vs `displayName` のフォールバック比較を追加する |
| セッション情報が null の場合 | `userInfo` の null チェックを行い、null の場合は `matchesOwner = true` としてフィルタしない |
| `my_only` で全件が非表示になるバグ | フォールバック条件のロジックを慎重に実装する |

---

## テスト計画

- [ ] `ownerFilter` を `'my_only'` に切り替えたとき、自分のプロジェクトのみが表示されることを確認
- [ ] `ownerFilter` を `'all'` に切り替えたとき、全プロジェクトが表示されることを確認
- [ ] ログアウト状態（セッション情報なし）のとき、フィルタが動作せず全件表示されることを確認（安全側に倒す）
- [ ] TypeScript コンパイルエラーが発生しないことを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-09 15:29
- **承認日時**: 
- **承認者コメント**: 
