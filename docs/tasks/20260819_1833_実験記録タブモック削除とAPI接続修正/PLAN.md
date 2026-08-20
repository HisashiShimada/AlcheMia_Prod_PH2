# タスク計画書: 実験記録タブ モック削除・API接続修正

## メタデータ
- **作成日時**: 2026-08-19 18:33
- **タスクID**: 実験記録タブモック削除とAPI接続修正
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

実験作業者メニューの「実験記録」タブ（WorkRecordPanel）がモックデータを使い続けている問題と、
それに起因する状態バー等のデグレを修正する。

## 根本原因

### 問題1: Props の不整合（最重要）
`ExperimentWorkerMenu.tsx` は `WorkRecordPanel` に以下を渡しているが、
`WorkRecordPanel` の Props インターフェースにこれらが**定義されていない**ため完全に無視されている。

```
渡している Props:       WorkRecordPanelProps に定義されているか？
- progressRows          → ❌ 未定義（無視される）
- useDeemedProgress     → ❌ 未定義（無視される）
- projectStatus         → ❌ 未定義（無視される）
- projectId             → ✅ 定義済み
```

### 問題2: WorkRecordPanel 内のモックデータ
以下のモックデータが WorkRecordPanel.tsx 内に残存しており、API取得データの代わりに使用されている。
- `INITIAL_TASKS`（タスク3件のモック）
- `MOCK_TRANSITIONS`（TR_A〜TR_D のモック）
- `MOCK_METHODS`（メソッドのモック）
- `MOCK_PROJECT_INSTRUCTIONS`（指示文のモック）
- `ASSIGNED_TASK_NO = 2`（固定タスクNo）
- `uncertaintyMockData`（mock/uncertainty.json の import）

## 実装ステップ

### Phase 1: WorkRecordPanel の Props インターフェース修正
- [ ] `WorkRecordPanelProps` に以下を追加:
  - `progressRows?: ProgressRow[]` — ProgressOverviewTab と共有する型
  - `projectStatus?: number` — プロジェクトステータス（数値コード）
  - `useDeemedProgress?: boolean` — みなし進捗フラグ
  - `projectName?: string` — プロジェクト名（既存）
  - `methodId?: string` — メソッドID（既存）
  - `taskNo?: number` — タスクNo（既存）

### Phase 2: WorkRecordPanel 内のモックデータ削除・API接続
- [ ] `MOCK_TRANSITIONS`, `MOCK_METHODS`, `INITIAL_TASKS`, `MOCK_PROJECT_INSTRUCTIONS` を削除
- [ ] `uncertaintyMockData` の import と参照を削除
- [ ] `ASSIGNED_TASK_NO = 2` ハードコードを除去
- [ ] `progressRows` prop から現在の作業対象トランジション・メソッドIDを導出するロジック実装
  - `in_progress` または最初の `not_started` のトランジションを選択
- [ ] `getTemplateData()` でテンプレートデータを取得する箇所を DataRecordDialog から流用
- [ ] WorkRecordPanel が既に `DataRecordDialog` をインラインモードで呼んでいる場合、
  正しい `projectId`, `methodId`, `taskNo`, `transitionId` を渡せるよう修正

### Phase 3: ExperimentWorkerMenu 側の確認
- [ ] `ExperimentWorkerMenu.tsx` の WorkRecordPanel 呼び出し部で Props が正しく渡されているか確認
- [ ] `progressRows`, `projectStatus`, `useDeemedProgress` が `WorkRecordPanel` に届くことを確認

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - Props インターフェース拡張
   - モックデータ削除
   - API 接続（DataRecordDialog への正しい Props 受け渡し）
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - 必要に応じて Props 渡し方を修正

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| WorkRecordPanel が DataRecordDialog のインラインモードを使っていない可能性 | 高 | WorkRecordPanel.tsx の全体構成を確認してから実装 |
| progressRows の型が ProgressRow と不一致の可能性 | 中 | ProgressOverviewTab の型定義を参照して合わせる |

## 承認記録
- **計画書提示日時**: 2026-08-19 18:33
