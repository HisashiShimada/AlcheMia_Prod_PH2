# タスク計画書: グループノード選択時の用語追加ボタン非活性バグ修正

## メタデータ
- **作成日時**: 2026-09-03 09:49
- **タスクID**: グループノード用語追加ボタン非活性バグ修正
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

名前空間管理でグループノードを選択し「用語管理」タブを開くと、以下の問題が発生する。
1. Prefix登録済みにもかかわらず「Prefixが登録されていません」と表示される
2. 用語追加ボタンが非活性になっている

個人階層選択時は正常に動作する。

## 根本原因（調査済み）

### 用語追加ボタンの disabled 条件（NamespaceMain.tsx 2170行）
```tsx
disabled={effectiveViewOnly || availablePrefixOptions.length === 0}
```

### 原因A：`effectiveViewOnly = true` になるケース
- `isRepresentativeOfSelected` は `chiefGroupCds.has(selectedNsKey)` で判定される
- `chiefGroupCds` は `chief_user_id = currentUser` のグループのみ含む
- ログインユーザーがグループ代表者でない場合 `false` → `effectiveViewOnly = true` → ボタン非活性

### 原因B：`availablePrefixOptions.length === 0` になるケース（「Prefixが登録されていません」表示）
- グループノード選択時は `fetchPrefixes(nsKey, true)` が呼ばれる（withAncestors: true）
- バックエンドの `findNamespacesByScopeKeyWithAncestors.sql` が当該グループの prefix を正しく返せていなかったため `dbPrefixes` が空配列になっていた
- `availablePrefixOptions.length === 0` → ボタン非活性 + ツールチップ表示

**個人ノードとの違い**：個人ノードは `fetchPrefixes(scopeKey)` で呼ばれ、個人スコープの namespace を正常取得できている。

## 実装ステップ

- [x] Phase 1: バックエンド調査
  - [x] namespaceController.ts の scopeKey 取得ロジック確認 → withAncestors=true 対応済みを確認
  - [x] namespaceService.ts の getNamespaceList 実装確認
  - [x] グループ scopeKey で prefix が取得できない原因の特定 → `findNamespacesByScopeKeyWithAncestors.sql` の問題と特定

- [x] Phase 2: 修正実装
  - [x] `findNamespacesByScopeKeyWithAncestors.sql` を修正 → 想定通り動作することを確認
  - [x] `NamespaceMain.tsx` の修正は不要（SQLファイル修正のみで解決）

- [x] Phase 3: 動作確認
  - [x] グループノード選択時に Prefix が表示されること確認
  - [x] 用語追加ボタンが活性化されること確認

## 変更ファイル
1. `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql` - WITH RECURSIVE によるグループ祖先 Prefix 取得クエリを修正

## 当初の変更予定ファイル（実際には修正不要だったもの）
- `frontend/src/components/namespace/NamespaceMain.tsx` - SQLファイル修正で解決したため変更不要

## 承認記録
- **承認日時**: 2026-09-03 09:49

## 実施記録

### 実施日時
開始: 2026-09-03 09:49
完了: 2026-09-03 10:11

### 解決方法
`backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql` を修正することで、グループノード選択時に祖先グループを含む Prefix が正しく返されるようになり、両問題が解消された。

フロントエンド（`NamespaceMain.tsx`）の修正は不要だった。

### 最終的な成果物
- [x] グループノード選択時に「Prefixが登録されていません」と表示されなくなった
- [x] 用語追加ボタンが正常に活性化されるようになった
