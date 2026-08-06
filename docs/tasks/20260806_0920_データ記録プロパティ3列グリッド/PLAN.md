# タスク計画書: データ記録プロパティ横3列グリッドレイアウト

## メタデータ
- **作成日時**: 2026-08-06 09:20
- **タスクID**: データ記録プロパティ3列グリッド
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験作業者メニュー「実験記録タブ」の DataRecordDialog において、プロパティカードを現在の横2列（span=12）から横3列（span=8）グリッドレイアウトに変更する。

## 目的と期待される成果
- [ ] プロパティカードが横3列で表示される
- [ ] propertyListType の場合は引き続き span=24（全幅）を維持

## 実装ステップ
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` の行2735を修正
  - `span={prop.type === 'propertyListType' ? 24 : 12}` → `span={prop.type === 'propertyListType' ? 24 : 8}` に変更

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - span値を12→8に変更

## 承認記録
- **承認日時**: 2026-08-06 09:25（ユーザー承認済み）
