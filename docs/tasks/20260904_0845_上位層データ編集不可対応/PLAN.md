# タスク計画書: 用語管理タブ・上位層データ編集不可対応

## メタデータ
- **作成日時**: 2026-09-04 10:28
- **タスクID**: 上位層データ編集不可対応
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

用語管理タブでグループノード（例: testGrp8）を選択した際、上位層（例: testGroup6, testGrp7）に属する用語の「編集」「非アクティブ化」ボタンが活性のまま操作できてしまうバグを修正する。

## 原因

`NamespaceMain.tsx` の `actionCell` 内で上位層判定に `ancestorPrefixesForSelected` を使用しているが、これは **組織グループノードの `prefix` プロパティが存在しない** ため常に空 Set となり、判定が機能していない。

組織グループノード（`company` 配下の動的ノード）は `buildOrgTree(orgGroups)` で DB から生成されるため `prefix` を持たない。一方、`findAllByScopeKeyWithAncestors.sql` は各用語の `scopeKey`（`organization_group_cd`）を返しているため、これを使った判定に切り替えることで正しく動作する。

## 修正内容

### 変更ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - `actionCell` 内の判定ロジックを修正

### 修正箇所

`actionCell` 関数内で以下の変数を追加し、2か所の判定を置き換える。

```typescript
// 追加: 現在選択スコープキー（personal-プレフィックス除去）
const currentScopeKey = effectiveNsKey
  ? effectiveNsKey.replace(/^personal-/, '')
  : null;

// 追加: 上位層用語フラグ
const isAncestorTerm =
  isCompanyNodeSelected &&
  currentScopeKey != null &&
  record.scopeKey != null &&
  record.scopeKey !== currentScopeKey;
```

`readonlyEdit` / `readonlyToggle` の判定を以下に変更：
```typescript
// 修正前
(isCompanyNodeSelected && ancestorPrefixesForSelected.has(record.prefix)) ||

// 修正後
isAncestorTerm ||
```

## 動作確認

- testGrp8 選択時、testGroup6 / testGrp7 の用語 → 編集・非アクティブ化ボタンが無効
- testGrp8 選択時、testGrp8 自身の用語 → 編集・非アクティブ化ボタンが有効
- Personal ノード選択時 → 影響なし
- Global ノード選択時 → 影響なし

## 承認記録
- **承認日時**: 2026-09-04 10:28
