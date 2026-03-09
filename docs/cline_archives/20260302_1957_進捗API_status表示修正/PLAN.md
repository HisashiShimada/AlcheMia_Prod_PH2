# タスク計画書: 進捗API status表示修正

## メタデータ
- **作成日時**: 2026-03-02 19:57
- **タスクID**: progress-api-status-display-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

進捗確認画面のトランジション一覧で、DBに `status=3`（実行中）が登録されているにもかかわらず「未開始」と表示される問題を修正する。

調査により、以下の2つの問題が判明している：

1. **（修正済み）** `getLatestRecord.sql` に存在しないカラム `comment` が含まれており、SQLエラーが発生 → `catch` ブロックでデフォルト値（status=0, progress=0）が返されていた。
2. **（未修正）** `ExperimentRecordTab.tsx` でAPIレスポンスの数値ステータス（例: `3`）を `as string` でキャストしているが、値の変換は行われないため数値 `3` のままになる。`statusConfig[3]` が未定義なのでフォールバックの `not_started`（未開始）が表示される。

---

## 目的と期待される成果

- [x] `getLatestRecord.sql` から存在しない `comment` カラムを削除（修正済み）
- [ ] `ExperimentRecordTab.tsx` に数値ステータス → `ProgressStatus` 文字列への変換関数を追加
- [ ] `status=3` のトランジションが「実行中/作業中」と正しく表示される

---

## ステータス変換マッピング

| 数値 | バックエンド名 | フロントエンド ProgressStatus | 表示テキスト |
|------|-------------|---------------------------|------------|
| 0 | INITIAL     | `'not_started'`  | 未開始 |
| 1 | PREPARING   | `'in_progress'`  | 作業中 |
| 2 | READY       | `'in_progress'`  | 作業中 |
| 3 | IN_PROGRESS | `'in_progress'`  | 作業中 |
| 4 | PAUSED      | `'on_hold'`      | 保留中 |
| 5 | COMPLETED   | `'completed'`    | 完了 |
| 6 | ERROR       | `'issue'`        | 問題あり |

---

## 実装ステップ

- [ ] Step 1: `ExperimentRecordTab.tsx` に `mapTransitionStatusToProgressStatus()` 変換関数を追加
- [ ] Step 2: `transitionsWithProgress` の `status` 行を変換関数使用に修正
- [ ] Step 3: 動作確認（APIレスポンス status=3 → 「作業中」表示）

---

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - 数値→文字列ステータス変換関数追加

---

## リスク

| リスク | 対策 |
|--------|------|
| `ProgressStatus` 型に `'on_hold'` や `'issue'` が存在しない場合 | 修正前に型定義を確認して対応 |
| 変換漏れ（他のコンポーネントでも同様の問題が潜在） | 今回は `ExperimentRecordTab.tsx` のみ修正。他コンポーネントは別タスクで対応 |

---

## 承認記録
- **承認日時**: 2026-03-02 19:57
