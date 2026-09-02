# タスク計画書: ProgressOverviewTab 多言語対応

## メタデータ
- **作成日時**: 2026-09-02
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要
`frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` にハードコードされた日本語文字列を `useLanguage()` の `t()` に置き換える。
あわせて `ja.json` / `en.json` に不足している翻訳キーを追加する。

## 目的と期待される成果
- [ ] コンポーネント内の全日本語ハードコード文字列を翻訳キー経由に変更
- [ ] `ja.json` / `en.json` の `progressOverview` セクションを拡充
- [ ] STATUS_CONFIG の label も翻訳キー経由に変更

## 未翻訳箇所一覧

### A. STATUS_CONFIG（行 91-97）
ファイル先頭の定数定義のため `useLanguage` が使えない → `STATUS_CONFIG` を関数化 or 使用箇所で `t()` に置き換える

| ステータス | 日本語 | 翻訳キー |
|---|---|---|
| not_started | 未着手 | `progressOverview.status.not_started` |
| preparing | 準備中 | `progressOverview.status.preparing` |
| ready | 準備完了 | `progressOverview.status.ready` |
| in_progress | 作業中 | `progressOverview.status.in_progress` |
| on_hold | 一時停止 | `progressOverview.status.on_hold` |
| completed | 完了 | `progressOverview.status.completed` |
| issue | 問題あり | `progressOverview.status.issue` |

### B. SummaryCard（行 125, 131, 135-139, 145）
SummaryCard はトップレベルの関数コンポーネントなので `useLanguage` が使える。
ただし、SummaryCard は `useLanguage` の import がないため追加が必要。

| 箇所 | 日本語 | 翻訳キー |
|---|---|---|
| 全体進捗 タイトル | 全体進捗 | `progressOverview.summary.overallProgress` |
| タスク x/y 完了 | タスク {x}/{y} 完了 | `progressOverview.summary.taskCompleted`（パラメータ補間） |
| Statistic title: 未着手 | 未着手 | `progressOverview.summary.notStarted` |
| Statistic title: 作業中 | 作業中 | `progressOverview.summary.inProgress` |
| Statistic title: 完了 | 完了 | `progressOverview.summary.completed` |
| Statistic title: 問題あり | 問題あり | `progressOverview.summary.issue` |
| Statistic title: 問題報告 | 問題報告 | `progressOverview.summary.issueReport` |
| Statistic suffix | 件 | `progressOverview.summary.itemSuffix` |

### C. FilterBar（行 210, 217, 230, 241, 250, 255-259, 262）
FilterBar はトップレベルの関数コンポーネントだが `useLanguage` を使っていないため追加が必要。

| 箇所 | 日本語 | 翻訳キー |
|---|---|---|
| フィルタ: | フィルタ: | `progressOverview.filter.label` |
| placeholder: メソッド名 | メソッド名 | `progressOverview.filter.methodName` |
| placeholder: タスクNo | タスクNo | `progressOverview.filter.taskNo` |
| placeholder: トランジション名 | トランジション名 | `progressOverview.filter.transitionName` |
| placeholder: ステータス | ステータス | `progressOverview.filter.status` |
| option: 未着手 | 未着手 | `progressOverview.status.not_started`（A と共通） |
| option: 作業中 | 作業中 | `progressOverview.status.in_progress`（A と共通） |
| option: 一時停止 | 一時停止 | `progressOverview.status.on_hold`（A と共通） |
| option: 完了 | 完了 | `progressOverview.status.completed`（A と共通） |
| option: 問題あり | 問題あり | `progressOverview.status.issue`（A と共通） |
| x/y 件 表示 | 件 | `progressOverview.filter.countSuffix` |

### D. メインコンポーネント 操作列（行 406, 411, 418, 425, 433, 435, 451）

| 箇所 | 日本語 | 翻訳キー |
|---|---|---|
| 詳細確認 ボタン | 詳細確認 | `progressOverview.action.viewDetail` |
| 作業へ ボタン | 作業へ | `progressOverview.action.goToWork` |
| 再開 ボタン | 再開 | `progressOverview.action.resume` |
| 開始 ボタン (disabled) | 開始 | `progressOverview.action.start` |
| 開始 ボタン tooltip | 前の順序のトランジションを先に完了してください | `progressOverview.action.startLockedTooltip` |
| 開始 ボタン (active) | 開始 | `progressOverview.action.start`（共通） |

### E. テーブル列定義（行 474, 481, 485, 495, 504, 563, 596, 599）

| 箇所 | 日本語 | 翻訳キー |
|---|---|---|
| メソッド名 列 | メソッド名 | `progressOverview.column.methodName` |
| タスクNo 列 | タスクNo | `progressOverview.column.taskNo` |
| トランジション名 列 | トランジション名 | `progressOverview.column.transitionName` |
| prerequisiteTransitionIds tooltip | 前提トランジション: {x} が全て完了してから開始できます | `progressOverview.column.prereqTooltip`（補間） |
| ステータス 列 | ステータス | `progressOverview.column.status` |
| 進捗 列 | 進捗 | `progressOverview.column.progress` |
| 問題 列 | 問題 | `progressOverview.column.issue` |
| 操作 列 | 操作 | `progressOverview.column.action` |

### F. フロー図・テーブル共通（行 637, 652, 658, 695）

| 箇所 | 日本語 | 翻訳キー |
|---|---|---|
| フロー図 ボタン | フロー図 | `progressOverview.viewMode.flow` |
| リスト ボタン | リスト | `progressOverview.viewMode.list` |
| データがありません (Typography.Text) | データがありません | `progressOverview.empty` |
| locale.emptyText | データがありません | `progressOverview.empty`（共通） |

## 実装ステップ

- [ ] ステップ1: `ja.json` に `progressOverview` セクションを拡充
- [ ] ステップ2: `en.json` に対応する英語キーを追加
- [ ] ステップ3: `ProgressOverviewTab.tsx` の STATUS_CONFIG を関数化し `t()` を使用
- [ ] ステップ4: SummaryCard に `useLanguage` を追加し全ての日本語を `t()` に置換
- [ ] ステップ5: FilterBar に `useLanguage` を追加し全ての日本語を `t()` に置換
- [ ] ステップ6: メインコンポーネントの操作列・テーブル列・ボタン等を `t()` に置換
- [ ] ステップ7: ビルド確認

## 変更ファイル
1. `frontend/src/locales/ja.json` - `progressOverview` セクション拡充
2. `frontend/src/locales/en.json` - `progressOverview` セクション拡充
3. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - 全ハードコード文字列を `t()` に置換

## リスク
| リスク | 対策 |
|--------|------|
| STATUS_CONFIG がコンポーネント外の定数のため `useLanguage` が使えない | `getStatusLabel(status, t)` ヘルパー関数に置き換え、または `renderStatus` 内で直接 `t()` を使う |
| `t()` の補間形式がプロジェクト固有の形式 | 既存コードの補間パターンを確認してから実装 |

## テスト計画
- [ ] 日本語表示時: 全文字列が日本語で表示されること
- [ ] 英語表示時: 全文字列が英語で表示されること
- [ ] ビルドエラーがないこと

## 承認記録
- **計画書提示日時**: 2026-09-02
