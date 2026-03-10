# TransitionSetBatchProcessingPanel - バッチ処理パネル

## 1. 概要

### 1.1 コンポーネントの目的
組織内の全MAIMLファイルのトランジションセット検索インデックス（4軸ベクトルEmbedding）を一括生成・管理するパネル。バッチジョブの開始・キャンセル・進捗確認を行う。

### 1.2 使用場面
- TransitionSetSearchModal の「バッチ処理」タブ内に配置

---

## 2. 画面構成

```
┌──────────────────────────────────────────────────────┐
│ 🔵 トランジションセット検索バッチ処理               │
│                                                      │
│ ┌── 統計カード ──────────────────────────────────┐  │
│ │ 総ジョブ数  処理済ファイル  失敗ファイル        │  │
│ │    XX          XX              XX               │  │
│ │ 生成Embedding数: XX                             │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌── 新規バッチ処理 ───────────────────────────────┐  │
│ │ 説明テキスト                                    │  │
│ │                                                  │  │
│ │ 既存ファイルを強制再処理: [OFF/ON]              │  │
│ │ 最大処理ファイル数: [___________] (省略可)      │  │
│ │                                                  │  │
│ │ [エラー / 成功メッセージ]                       │  │
│ │                                                  │  │
│ │ [▶ バッチ処理を開始] (全幅ボタン)              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌── バッチジョブ一覧 ────────── [更新 ↺] ────────┐  │
│ │ Job #xxxxxxxx [処理中] [キャンセル]             │  │
│ │ 進捗: 5 / 20 ファイル                          │  │
│ │ [████████░░░░░░░░] 25%                          │  │
│ │ 処理済: 5  失敗: 0  スキップ: 2                │  │
│ │ 作成: 2026/03/06 15:00                          │  │
│ └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 2.2 ジョブステータスの色分け

| ステータス | ラベル | Tag色 |
|----------|--------|-------|
| started | 開始中 | blue |
| processing | 処理中 | blue |
| completed | 完了 | green |
| failed | エラー | red |
| cancelled | キャンセル済 | default |

---

## 3. 機能仕様

### 3.1 データ取得
- マウント時にジョブ一覧・統計を並列取得
- アクティブなジョブ（started/processing）がある場合は 3秒ごとにポーリング

### 3.2 バッチ開始

```typescript
const handleStart = async () => {
  const options: BatchIngestOptions = {
    forceReprocess,
    maxFiles: maxFiles ?? null,
  };
  const result = await startBatch(options);
  // 成功: "バッチ処理を開始しました（Job ID: xxx）"
};
```

### 3.3 ジョブキャンセル

```typescript
const handleCancel = async (jobId: string) => {
  await cancelBatchJob(jobId);
  // 成功: "ジョブ xxx をキャンセルしました"
};
```

### 3.4 進捗率計算

```typescript
const calcProgress = (job: BatchJob): number => {
  if (job.total_files === 0) return 0;
  return Math.round((job.processed_files / job.total_files) * 100);
};
```

---

## 4. データ仕様

### 4.1 BatchJob型定義

```typescript
interface BatchJob {
  id: string;
  status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_files: number;
  processed_files: number;
  failed_files: number;
  skipped_files: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
```

### 4.2 BatchStats型定義

```typescript
interface BatchStats {
  total_jobs: number;
  total_files_processed: number;
  total_files_failed: number;
  total_embeddings_generated: number;
}
```

### 4.3 BatchIngestOptions型定義

```typescript
interface BatchIngestOptions {
  forceReprocess: boolean;
  maxFiles: number | null;
}
```

---

## 5. API連携

| API名 | メソッド | エンドポイント | 説明 |
|------|---------|--------------|------|
| バッチ開始 | POST | `/api/v1/semantic-search/batch/start` | バッチ処理を開始 |
| ジョブ一覧 | GET | `/api/v1/semantic-search/batch/jobs` | ジョブ一覧取得 |
| バッチ統計 | GET | `/api/v1/semantic-search/batch/stats` | 統計情報取得 |
| ジョブキャンセル | POST | `/api/v1/semantic-search/batch/jobs/:id/cancel` | ジョブキャンセル |

---

## 6. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-03-06 | 1.0.0 | 初版作成 | Cline |
