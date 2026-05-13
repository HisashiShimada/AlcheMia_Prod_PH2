# タスク計画書: No.25 dissolution異常値表示 テストシナリオ追加

## メタデータ
- **作成日時**: 2026-04-06 13:27
- **タスクID**: No25-dissolution-test-scenario
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

No.25対応（dissolution異常値表示）として実装された `DataRecordDialog.tsx` の dissolution 範囲チェック機能について、E2Eテストシナリオを追加する。

対応内容:
- `dissolution` または `溶解率` をキーに含む `doubleType` / `floatType` プロパティで、値が 0〜100 の範囲外の場合に警告 Alert を表示（保存はブロックしない）

## 目的と期待される成果
- [ ] `tests/e2e/test-scenarios/5_experiment_worker.md` の 5-2 グループに dissolution 関連シナリオ9件を追加

## 実装ステップ
- [ ] ステップ1: `5_experiment_worker.md` の 5-2 グループに dissolution シナリオ（5-2-27〜5-2-35）を追記
- [ ] ステップ2: 5-2 グループのスコープ表（§1）のシナリオ数・合計を更新
- [ ] ステップ3: 5-2 グループの前提条件に dissolution 用テストデータを追記

## 追加シナリオ一覧（9件）

| シナリオID | 内容 | 種別 |
|-----------|------|------|
| 5-2-27 | dissolution/doubleType に 0〜100 範囲内（50.0）→警告なし | 正常系 |
| 5-2-28 | dissolution/floatType に境界値 0 →警告なし | 正常系 |
| 5-2-29 | dissolution/floatType に境界値 100 →警告なし | 正常系 |
| 5-2-30 | dissolution/doubleType に -0.01 →警告 Alert 表示 | 異常系 |
| 5-2-31 | dissolution/doubleType に 100.01 →警告 Alert 表示 | 異常系 |
| 5-2-32 | dissolution/floatType に異常値を入力しても保存できること（ブロックしない） | 異常系 |
| 5-2-33 | Dissolution（大文字含む）/floatType に異常値 →警告 Alert 表示 | 正常系 |
| 5-2-34 | 溶解率/doubleType に -5.0 →警告 Alert 表示 | 異常系 |
| 5-2-35 | dissolution を含まない doubleType に範囲外値 →dissolution 警告なし | 正常系 |

## 変更ファイル
1. `tests/e2e/test-scenarios/5_experiment_worker.md` - 5-2グループにシナリオ追加、スコープ表・前提条件を更新

## 承認記録
- **承認日時**: 2026-04-06 13:27（Act mode 移行により承認済み）
