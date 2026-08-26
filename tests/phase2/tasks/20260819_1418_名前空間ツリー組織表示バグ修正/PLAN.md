# タスク計画書: 名前空間ツリー組織表示バグ修正

## メタデータ
- **作成日時**: 2026-08-19 14:18
- **タスクID**: 20260819_1418_名前空間ツリー組織表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

スクリーンショット2点から確認された2つのバグを修正する。

1. `UncertaintyManagement.tsx`: 名前空間ツリーに組織情報（company配下）が表示されない
2. `NamespaceMain.tsx`: ツリーの全ノードで用語数バッジが 0 と表示される

## 変更ファイル

1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
   - `getOrganizationGroups(undefined, { visibleOnly: true })` → `getOrganizationGroups()` に変更
   
2. `frontend/src/components/namespace/NamespaceMain.tsx`
   - `toAntTree` 内の動的ノード集計をフラット比較から再帰集計に変更

## 承認記録
- **承認日時**: 2026-08-19 14:18
