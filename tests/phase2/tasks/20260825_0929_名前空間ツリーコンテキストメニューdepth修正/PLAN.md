# タスク計画書: 名前空間ツリーコンテキストメニュー depth 修正

## メタデータ
- **作成日時**: 2026-08-25 09:29
- **タスクID**: namespace-tree-context-menu-depth-fix
- **優先度**: 高
- **推定工数**: 0.25時間

## タスク概要

名前空間管理画面の左ペインツリーおよび不確かさ管理画面の左ペインツリーにおいて、
組織グループノードを右クリックしても意図したコンテキストメニューが出ない場合がある。

## 原因

`renderTreeTitle` 内の `isTeam` 判定が `companyDepth === 3` にハードコードされているため、
組織階層の深さが3段以外（2段や4段以上）の場合はコンテキストメニューが表示されない。

## 変更ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - L1241: `=== 3` → `>= 2`
2. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - L374: `=== 3` → `>= 2`

## 承認記録
- **承認日時**: 2026-08-25 09:29
