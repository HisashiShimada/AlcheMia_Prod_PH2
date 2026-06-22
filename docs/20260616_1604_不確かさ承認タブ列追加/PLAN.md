# タスク計画書: 不確かさ承認タブ列追加

## メタデータ
- **作成日時**: 2026-06-16 16:04
- **タスクID**: 不確かさ承認タブ列追加
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
プロジェクト管理画面の不確かさ承認タブのテーブルに以下3カラムを追加する。
1. 対象タイプ（material / condition / result）
2. メソッド名
3. トランジション名

## 変更ファイル
1. `frontend/mock/uncertainty-approval.json` - 新フィールド追加
2. `frontend/src/components/project/UncertaintyApprovalTab.tsx` - 型定義・カラム追加
3. `frontend/src/locales/ja.json` - 日本語キー追加
4. `frontend/src/locales/en.json` - 英語キー追加

## 承認記録
- **承認日時**: 2026-06-16 16:06
