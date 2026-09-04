# タスク計画書: 実験記録タブ 状態プルダウン表示・非表示制御

## メタデータ
- **作成日時**: 2026-08-31
- **タスクID**: 20260831_PLAN_状態プルダウン表示非表示制御
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブ内「状態プルダウンメニュー」において、
現在のトランジションステータスに基づいて、選択可能な次の状態のみを表示するよう制御する。

## 目的と期待される成果

- 無効な状態遷移（例: 動作状態から準備状態への逆行）の UI での混入を防止する
- 現在のステータスに応じた適切な遷移先のみをプルダウンに表示する

## 遷移先表示ルール

| 現在のステータス | 表示する選択肢 |
|---|---|
| 1: 初期状態（not_started） | 全表示（要件未定義のため現状維持） |
| 2: 準備状態（preparing）   | preparing（選択中）、ready、running |
| 3: 準備完了状態（ready）   | ready（選択中）、running |
| 4: 動作状態（running）     | running（選択中）、paused、completed、error |
| 5: 休止状態（paused）      | paused（選択中）、running |
| 6: 終状態（completed）     | completed（選択中）のみ |
| 7: 異常終了状態（error）   | error（選択中）のみ |

## 実装ステップ

- [x] タスク計画書作成
- [x] `WorkRecordPanel.tsx` に `ALLOWED_NEXT_STATUSES` 定数を追加
- [x] `WorkHeader` コンポーネントの `statusSelectOptions` にフィルタリングを適用
- [x] TypeScript ビルドエラー確認（今回追加分に起因するエラーなし）

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — `ALLOWED_NEXT_STATUSES` 定数追加 + `statusSelectOptions` フィルタリング適用

## Do Not
- UIの変更は行わない
- MaiMLファイルへの保存処理は変更しない
- バックエンドAPIは変更しない
- 関連しないリファクタリングは行わない

## リスク
| リスク | 対策 |
|--------|------|
| 現在値がフィルタ後に選択肢に含まれない | 現在値を必ずフィルタ後に含める実装にする |
| `not_started` の挙動変化 | 要件未定義のため全表示を維持 |

## テスト計画
- [ ] ステータス2（preparing）: ready / running が表示されること
- [ ] ステータス3（ready）: running のみ表示されること
- [ ] ステータス4（running）: paused / completed / error が表示されること
- [ ] ステータス5（paused）: running のみ表示されること
- [ ] ステータス6（completed）: 選択肢がcompletedのみ（変更不可）
- [ ] ステータス7（error）: 選択肢がerrorのみ（変更不可）

## 承認記録
- **承認日時**: 2026-08-31（Act モード移行により承認済み）
