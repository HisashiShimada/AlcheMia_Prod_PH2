# タスク計画書: チーム管理不具合修正

## メタデータ
- **作成日時**: 2026-08-21
- **タスクID**: team-management-bug-fix
- **優先度**: 高
- **推定工数**: 30分

## タスク概要

チーム管理画面に以下の2つの不具合がある。

### 不具合1: URI が表示されるチームとされないチームがある

**原因調査結果:**
- `backend/src/sql/queries/organization_groups/findAll.sql` は正しく `namespace` テーブルを `LEFT JOIN` している（`scope_key = organization_group_cd`）
- フロントエンドの表示ロジックも正しい（`selectedTeam.namespaceUri && (...)` で条件表示）
- URI が表示されないチームは `namespace` テーブルに該当 `scope_key` のレコードが存在しない（古いチームやbackfillが未実行のチーム）
- **コード修正は不要。これはデータの問題（backfill 未実行）**

### 不具合2: ボタン名称の書き換わり

**現状（マージ → 復元後）:**
- `deactivateBtn`: `"無効化"` （is_active=true → false にするボタン）
- `activateBtn`: `"有効化"` （is_active=false → true にするボタン）

**正しい文言（他の管理画面の統一パターン）:**
- `deactivateBtn`: `"非アクティブ"` （他の会社/組織/ユーザー管理と統一）
- `activateBtn`: `"アクティブ"` （他の会社/組織/ユーザー管理と統一）

**根拠:** `ja.json` の他セクション（1288, 1289行目等）はすべて `"アクティブ"` / `"非アクティブ"` を使用している。

## 実装ステップ

- [x] 調査完了（不具合1はデータ問題、不具合2のみコード修正が必要）
- [x] `frontend/src/locales/ja.json` の `teamManagement.deactivateBtn` を `"非アクティブ"` に修正
- [x] `frontend/src/locales/ja.json` の `teamManagement.activateBtn` を `"アクティブ"` に修正
- [x] `frontend/src/locales/en.json` の対応するキーが適切であることを確認（`"Deactivate"` / `"Activate"` → 変更不要）

## 変更ファイル
1. `frontend/src/locales/ja.json` — `deactivateBtn` / `activateBtn` 文言修正

## 不具合1への補足説明
URI が表示されていないチームについては、`backend/scripts/backfill-organization-group-namespace.ts` スクリプトを実行することで既存チームに namespace URI が付与される。コードの修正は不要。

## 承認記録
- **承認日時**: 2026-08-21（ユーザー確認中）
