# タスク計画書: 進捗確認タブ仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 17:30
- **タスクID**: 進捗確認タブ仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_progress_check_tab.md` の仕様書をソースコード（`frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`）の実際の実装に合わせて修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの実装と一致した状態にする
- [ ] 追加されたProps・State・アクション・モーダルを仕様書に反映する
- [ ] API連携済みの内容（モックからの変更）を正確に記載する

## 実装ステップ

### Step 1: Props定義の修正（5.1）
- [ ] `selectedProjectName: string` を追加
- [ ] `readOnly?: boolean` を追加（オーバーレイ閲覧モード用）

### Step 2: State管理の修正（5.2）
- [ ] `loading`, `projectId`, `prevProjectRef`, `needsAutoSelect` を追加

### Step 3: 自動メソッド選択ロジックの修正（5.2）
- [ ] `needsAutoSelect`フラグによる2段階制御ロジックに更新

### Step 4: useEffectの修正（5.4）
- [ ] API取得ロジックの記述に更新
- [ ] 自動選択ロジックを実装と一致させる

### Step 5: 使用するAPIの修正（5.5）
- [ ] タスク一覧取得API → 実装済みに更新（`getWorkerTasks`）
- [ ] タスクステータス更新API → 実装済みに更新（`updateTaskStatus`・楽観的ロック対応）

### Step 6: データソースの修正（5.6）
- [ ] モック記述をAPI連携の記述に変更

### Step 7: アクション一覧の修正（3.3）
- [ ] `issue`（問題報告）アクションを追加

### Step 8: アクション処理の修正（4.2）
- [ ] `start` を実装済み内容（`updateTaskStatus`・楽観的ロック）に更新
- [ ] `forceTerminate` を実装済み内容（`updateTaskStatus`・楽観的ロック）に更新
- [ ] `issue` アクション（問題報告モーダルを開く）を追加

### Step 9: モーダルの修正（2.2, 2.3）
- [ ] `IssueReportModal`（問題報告モーダル）を使用コンポーネントに追加
- [ ] レイアウト構造に `IssueReportModal` を追加

### Step 10: メソッドステータスロジックの修正（10.1）
- [ ] `'started'` ステータスを「作業中」の判定から除外

### Step 11: ローディング状態・空状態の追加（新規追加）
- [ ] ローディング中のUI表示を仕様書に追記
- [ ] 「メソッドなし」の空状態を仕様書に追記

### Step 12: モーダルイベントの修正（4.3）
- [ ] `IssueReportModal` 関連のイベント（`handleOpenIssueReport`, `handleCloseIssueReport`）を追加

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_progress_check_tab.md` - 上記11箇所の修正

## リスク

| リスク | 対策 |
|--------|------|
| 修正漏れ | Stepごとに細かく分けて実施・確認 |

## 承認記録
- **承認日時**: 2026-03-11 17:30
