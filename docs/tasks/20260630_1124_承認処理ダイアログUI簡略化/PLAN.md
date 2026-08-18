# タスク計画書: 承認処理ダイアログUI簡略化

## メタデータ
- **作成日時**: 2026-06-30 11:24
- **タスクID**: 承認処理ダイアログUI簡略化
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験指示タブの「承認処理」ボタンを押したときに開くモーダルダイアログを、
「フィルターなし + タスク番号（プルダウン） + 操作（承認/NG Radio）」のシンプルなUIに修正する。
プルダウン内のタスク番号はステータスが「レビュー待ち（04）」のものだけ表示する。

## 目的と期待される成果

- [ ] ダイアログ内のフィルターバー（メソッドID / タスクNo / ステータス）を削除
- [ ] テーブル形式をやめ、「タスク番号 Select + 操作 Radio.Group」の1行UIに変更
- [ ] Select のオプションはレビュー待ち（04）のタスクのみ
- [ ] NG選択時のみNG理由TextAreaを表示する仕様を維持

## 変更ファイル

1. `frontend/src/components/project/ExperimentInstructionTab.tsx` - ダイアログUI変更 + 状態変数整理

## 実装ステップ

- [ ] 不要な状態変数を削除（bulkActions, bulkNgReasons, bulkFilterMethodId, bulkFilterTaskNo, bulkFilterTaskStatus）
- [ ] 新しい状態変数を追加（bulkSelectedTaskKey, bulkSelectedAction, bulkSelectedNgReason）
- [ ] handleOpenBulkApproveDialog を新仕様に合わせてリセット処理を修正
- [ ] handleBulkExecute を単一タスク処理ロジックに変更
- [ ] モーダルのJSXをシンプルなUI（Select + Radio.Group + TextArea）に書き換え
- [ ] モーダル幅を縮小（760 → 480）

## 承認記録
- **承認日時**: 2026-06-30 11:24
