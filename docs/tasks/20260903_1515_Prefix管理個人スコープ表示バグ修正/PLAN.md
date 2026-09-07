# タスク計画書: Prefix管理タブ・個人スコープ選択時に全スコープのデータが表示されるバグ修正

## メタデータ
- **作成日時**: 2026-09-03 15:15
- **タスクID**: Prefix管理個人スコープ表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

個人の名前空間（Personal配下のユーザーノード）を選択した状態でPrefix管理タブに遷移すると、個人スコープ以外（組織グループ等）のPrefixデータも表示される。用語管理タブでは個人スコープのみ正しく表示されており、両者の間に差異が生じている。

## 2. 目的と期待される成果

### 目的
個人ノード選択時のPrefix管理タブの表示を、用語管理タブと同様に個人スコープのデータのみに絞り込む。

### 期待される成果
- [ ] 個人名前空間選択時にPrefix管理タブが個人スコープのPrefixのみを表示する
- [ ] 組織グループ選択時の動作は変わらない
- [ ] 全体選択（company）時の動作は変わらない

## 3. 根本原因

### 問題ファイル
`frontend/src/components/uncertainty/UncertaintyManagement.tsx`

### 問題箇所
`filteredOrgGroupCds` の useMemo（419〜433行目）の `personal-` 分岐：

```typescript
// 修正前（問題のあるコード）
if (selectedNsKey.startsWith('personal-')) return allCds;
// ↑ personal- 選択時に全グループCDsを返してしまっている
```

### タブ間で差異が生じる理由

| タブ | コンポーネント | スコープフィルタの仕組み |
|---|---|---|
| **用語管理** | `NamespaceMain` に `externalSelectedNsKey` を渡す | NamespaceMain 内部で `personal-{userId}` を個人スコープとして判定 → 個人データのみ取得 |
| **Prefix管理** | `PrefixManagement` に `orgGroupCds={全グループCDs}` を渡す | 全グループCDsが渡されるため全グループのPrefixを取得してしまう |

## 4. 実装ステップ

- [ ] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` の `filteredOrgGroupCds` 計算ロジックを修正
  - `personal-` 始まりのキー選択時に `allCds` ではなく `[]` を返すよう変更（1行のみの修正）

## 5. 変更ファイル

### 修正
1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
   - `filteredOrgGroupCds` の `personal-` 分岐を `return []` に変更

### 修正内容詳細

```typescript
// 修正前
if (selectedNsKey.startsWith('personal-')) return allCds;

// 修正後
if (selectedNsKey.startsWith('personal-')) return [];
// 個人スコープ選択時はorgGroupCDsを渡さない。
// PrefixManagement は selectedNsKey（personal-{userId}）のみに基づいて
// 個人スコープのPrefixのみを取得する。
```

## 6. 影響範囲

### 影響あり
- `PrefixManagement` コンポーネント: `orgGroupCds=[]` が渡された場合、`selectedNsKey` ベースでフィルタが動作する

### 影響なし
- 用語管理タブ（NamespaceMain）
- 不確かさ基準管理タブ
- 組織グループノード選択時の動作
- 全体（company）選択時の動作

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `orgGroupCds=[]` 時に PrefixManagement が想定外の動作をする | 中 | 低 | PrefixManagement の `orgGroupCds` 空配列ハンドリングは `selectedNsKey` ベースにフォールバックする実装済みのため問題なし |

## 8. テスト計画

### 手動テスト
- [ ] 個人名前空間ノード選択 → Prefix管理タブ: 個人スコープのPrefixのみ表示されることを確認
- [ ] 個人名前空間ノード選択 → 用語管理タブ: 表示が変わらないことを確認（リグレッション）
- [ ] 組織グループノード選択 → Prefix管理タブ: 従来通りの表示であることを確認（リグレッション）
- [ ] company ルートノード選択 → Prefix管理タブ: 従来通りの表示であることを確認（リグレッション）

## 9. 承認記録
- **計画書提示日時**: 2026-09-03 15:15
- **承認日時**:
- **承認者コメント**:

## 10. 実施記録

### 実施日時
開始:
完了:

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）
