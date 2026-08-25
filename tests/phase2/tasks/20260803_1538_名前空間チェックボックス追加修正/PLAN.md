# タスク計画書: 名前空間管理タブ チェックボックス追加・修正

## メタデータ
- **作成日時**: 2026-08-03 15:38
- **タスクID**: namespace-checkbox-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
名前空間管理タブの以下2点を修正する。
1. Prefix管理テーブルの左端にチェックボックスを追加
2. 用語管理テーブルで1行チェックすると全行にチェックが入るバグを修正

## 実装ステップ
- [x] タスク計画書作成
- [ ] PrefixManagement.tsx に rowSelection を追加（チェックボックス表示）
- [ ] TermManagement.tsx の rowKey 重複問題を修正し、rowSelection を独立管理

## 変更ファイル
1. `frontend/src/components/namespace/PrefixManagement.tsx` - rowSelection追加
2. `frontend/src/components/namespace/TermManagement.tsx` - rowKey修正・rowSelection独立管理

## 承認記録
- **承認日時**: 2026-08-03 15:40
