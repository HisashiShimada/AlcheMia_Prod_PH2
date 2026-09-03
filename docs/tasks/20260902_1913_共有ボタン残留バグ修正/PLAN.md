# タスク計画書: 「n件を共有」ボタン残留バグ修正

## メタデータ
- **作成日時**: 2026-09-02 19:13
- **タスクID**: share-btn-residual-fix
- **優先度**: 高
- **推定工数**: 0.5時間
- **更新日時**: 2026-09-03 08:13（Prefix管理タブへの同様修正を追加）

## タスク概要

名前空間管理画面（`/namespace-management`）において、ある階層で用語/Prefixを選択（チェック）した後、別の階層を選択すると「n件を共有」「n件を無効化」ボタンがずっと表示され続けるバグを修正する。

対象コンポーネント：
- `frontend/src/components/namespace/NamespaceMain.tsx`（用語管理タブ）
- `frontend/src/components/namespace/PrefixManagement.tsx`（Prefix管理タブ）

## 目的と期待される成果

- [ ] 別階層に移動した際に「n件を共有」ボタンが非表示になる
- [ ] 一括無効化ボタンも同様に非表示になる（同じ条件で表示されているため）
- [ ] PrefixManagement.tsx の Prefix 管理タブでも同様に動作する

## 原因分析

### NamespaceMain.tsx（用語管理タブ）

「n件を共有」ボタンと「n件を無効化」ボタンは `selectedTermIds.length > 0` のときに表示される。

ある階層で用語をチェック → 別の階層のノードをクリック すると：
1. `selectedNsKey` が変わり、用語一覧が再フェッチされる
2. しかし **`selectedTermIds` がリセットされない**

→ 前の階層で選択していたIDが `selectedTermIds` に残り続け、ボタンが表示され続ける。

### PrefixManagement.tsx（Prefix管理タブ）

同様に `selectedRowKeys.length > 0` のときに「n件を共有」「n件を無効化」ボタンが表示される。

- `selectedNsKey` / `orgGroupCds` が変化するとノード切り替えが発生するが、`selectedRowKeys` がリセットされない

## 実装ステップ

- [x] `docs/tasks/20260902_1913_共有ボタン残留バグ修正/PLAN.md` 作成（本ファイル）
- [ ] `NamespaceMain.tsx` の `externalSelectedNsKey` 変化時 `useEffect` 先頭に `setSelectedTermIds([])` を追加
- [ ] `NamespaceMain.tsx` の `selectedNsKey` 変化時 `useEffect` 先頭に `setSelectedTermIds([])` を追加
- [ ] `NamespaceMain.tsx` の `visibilitychange` ハンドラに `hidden` 時 `setSelectedTermIds([])` を追加
- [ ] `PrefixManagement.tsx` の `selectedNsKey`/`orgGroupCds` 変化時 `useEffect`（行154）に `setSelectedRowKeys([])` を追加
- [ ] `PrefixManagement.tsx` に `visibilitychange` ハンドラを新規追加（`hidden` 時に `setSelectedRowKeys([])`）

## 変更ファイル

1. `frontend/src/components/namespace/NamespaceMain.tsx` - 3箇所に `setSelectedTermIds([])` を追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` - `useEffect` に `setSelectedRowKeys([])` を追加、`visibilitychange` ハンドラを新規追加

## リスク

| リスク | 対策 |
|--------|------|
| 意図しないタイミングでチェックが消える | ノード切り替え時のみリセットするため、同一ノード内での操作には影響なし |
| PrefixManagement の visibilitychange が既存処理と競合 | 既存ハンドラがないため、新規追加のみで競合なし |

## テスト計画

### NamespaceMain.tsx
- [ ] 階層Aで用語をチェック → 階層Bを選択 → 「n件を共有」ボタンが消えることを確認
- [ ] 階層Aで用語をチェック → 別ブラウザタブに移動 → 戻ってきたとき「n件を共有」ボタンが消えていることを確認
- [ ] `externalSelectedNsKey` を使うケース（DepartmentTreeManagement等）でも同様に動作確認

### PrefixManagement.tsx
- [ ] 階層AでPrefixをチェック → 階層Bを選択 → ボタンが消えることを確認
- [ ] 階層AでPrefixをチェック → 別ブラウザタブに移動 → 戻ってきたときボタンが消えていることを確認

## 承認記録
- **計画書提示日時**: 2026-09-02 19:13
- **初回承認日時**: 2026-09-03 08:09
- **更新承認日時**: 2026-09-03 08:13（Prefix管理タブへの拡張）
