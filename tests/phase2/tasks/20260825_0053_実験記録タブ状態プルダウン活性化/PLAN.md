# タスク計画書: 実験記録タブ「状態」プルダウン活性化

## メタデータ
- **作成日時**: 2026-08-25 00:53
- **タスクID**: 実験記録タブ状態プルダウン活性化
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験作業者メニューの実験記録タブの「状態」プルダウンが `disabled` 属性により常に非活性になっている。これを活性化し、ユーザーが状態を変更できるようにする。

## 原因
`WorkRecordPanel.tsx` の `WorkHeader` コンポーネント内（814行目）の `Select` に `disabled` プロパティが直接設定されている。

## 実装ステップ
- [ ] `WorkHeaderProps` に `onStatusChange` コールバックを追加
- [ ] `WorkHeader` コンポーネントの引数に `onStatusChange` を追加
- [ ] `Select` から `disabled` を削除し、`onChange` ハンドラを接続
- [ ] 親 `WorkRecordPanel` に `handleStatusChange` 関数を実装して `WorkHeader` に渡す

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - 上記修正

## 承認記録
- **承認日時**: 2026-08-25 00:53
