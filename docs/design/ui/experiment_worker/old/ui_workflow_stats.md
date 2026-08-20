# ワークフロー統計バー UI設計書

## メタデータ
- **画面名**: ワークフロー統計バー
- **物理名**: WorkflowStats.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/WorkflowStats.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験作業者メイン画面の進捗概要タブで使用される、タスクのステータス別件数と進捗率をまとめて表示する統計バーコンポーネントです。

### 1.2. 主要機能

1. 「開始前のトランジション」件数の表示
2. 「開始」件数の表示
3. 「作業中」件数の表示
4. 「完了」件数の表示
5. 「進捗率（%）」の表示

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│ 開始前のトランジション  │ 開始  │ 作業中  │ 完了  │ 進捗率  │
│         12             │   3   │    5   │   4   │  33%   │
└──────────────────────────────────────────────────────────────┘
```

- 背景色: `#E8F5E9`（淡い緑）
- `data-testid="workflow-stats"` 付き

---

## 3. コンポーネント Props 定義

```typescript
interface WorkflowStatsProps {
  statistics: WorkflowStatistics;
}
```

### `WorkflowStatistics` 型

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `notStarted` | `number` | 開始前のトランジション件数 |
| `started` | `number` | 開始件数 |
| `inProgress` | `number` | 作業中件数 |
| `completed` | `number` | 完了件数 |
| `progressRate` | `number` | 進捗率（0〜100）|

---

## 4. 表示仕様

| 項目 | フォントサイズ | カラー | data-testid |
|------|-------------|--------|-------------|
| 開始前 | 18px太字 | `#212121` | `workflow-stats-not-started` |
| 開始 | 18px太字 | `#0093CF` | `workflow-stats-started` |
| 作業中 | 18px太字 | `#0093CF` | `workflow-stats-in-progress` |
| 完了 | 18px太字 | `#CF0027` | `workflow-stats-completed` |
| 進捗率 | 20px太字 | `#CF0027` | `workflow-stats-progress-rate` |

---

## 5. レスポンシブ対応

`Row / Col` による12グリッドレイアウト。`gutter={[16, 8]}`、`align="middle"`。

| 項目 | xs | sm | md |
|------|----|----|-----|
| 開始前 | 24 | 12 | 6 |
| 開始 | 12 | 6 | 4 |
| 作業中 | 12 | 6 | 4 |
| 完了 | 12 | 6 | 4 |
| 進捗率 | 12 | 6 | 6 |
