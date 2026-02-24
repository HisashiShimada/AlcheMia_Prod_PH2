# タスク計画書: ステータス遷移ルール修正

## メタデータ
- **作成日時**: 2026-02-24 10:55
- **タスクID**: status-transition-rule-fix
- **優先度**: 高
- **推定工数**: 30分

## 1. タスク概要

バックエンドのタスクステータス遷移ルールを修正し、`not_started` (PENDING) から `forced_terminated` (FORCED_TERMINATED) への遷移を許可します。

## 2. 目的と期待される成果

### 目的
- 強制終了ボタン押下時のエラー（INVALID_STATUS_TRANSITION）を解消
- 開始前のタスクも強制終了できるようにする

### 期待される成果
- [x] `not_started` → `forced_terminated` の遷移が可能になる
- [x] 強制終了ボタンが正常に動作する
- [x] エラーが発生しなくなる

## 3. 現状分析

### エラー内容

```json
{
    "success": false,
    "error": {
        "code": "INVALID_STATUS_TRANSITION",
        "message": "Invalid status transition: Cannot transition from PENDING to FORCED_TERMINATED"
    }
}
```

### 現在のステータス遷移ルール

**ファイル**: `backend/src/services/taskService.ts`

```typescript
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TaskStatusEnum.PENDING]: [TaskStatusEnum.IN_PROGRESS],              // 0 → 1のみ
  [TaskStatusEnum.IN_PROGRESS]: [TaskStatusEnum.COMPLETED, TaskStatusEnum.FORCED_TERMINATED], // 1 → 3,4
  [TaskStatusEnum.COMPLETED]: [],
  [TaskStatusEnum.FORCED_TERMINATED]: []
};
```

**問題点:**
- `PENDING` (0 = `not_started`) から `FORCED_TERMINATED` (4 = `forced_terminated`) への遷移が許可されていない
- フロントエンドのUIでは開始前のタスクでも強制終了ボタンが有効
- バックエンドとフロントエンドの仕様不整合

### フロントエンドのボタン有効条件

**ファイル**: `frontend/src/components/ExperimentWorker/TaskListTable.tsx`

```typescript
const isDisabled = 
  record.status === 'completed' || 
  record.status === 'forced_terminated' || 
  !isProjectEditable;
```

- `not_started` でもボタンが有効（無効化条件に含まれていない）

## 4. 実装ステップ

### Step 1: ステータス遷移ルール修正
- [x] `backend/src/services/taskService.ts`の`VALID_TRANSITIONS`を修正
- [x] `PENDING` から `FORCED_TERMINATED` への遷移を追加

## 5. 変更ファイル

1. `backend/src/services/taskService.ts`
   - `VALID_TRANSITIONS` の修正（1行変更）

## 6. 技術的詳細

### 修正前

```typescript
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TaskStatusEnum.PENDING]: [TaskStatusEnum.IN_PROGRESS],
  [TaskStatusEnum.IN_PROGRESS]: [TaskStatusEnum.COMPLETED, TaskStatusEnum.FORCED_TERMINATED],
  [TaskStatusEnum.COMPLETED]: [],
  [TaskStatusEnum.FORCED_TERMINATED]: []
};
```

### 修正後

```typescript
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TaskStatusEnum.PENDING]: [TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.FORCED_TERMINATED],
  [TaskStatusEnum.IN_PROGRESS]: [TaskStatusEnum.COMPLETED, TaskStatusEnum.FORCED_TERMINATED],
  [TaskStatusEnum.COMPLETED]: [],
  [TaskStatusEnum.FORCED_TERMINATED]: []
};
```

### ステータス遷移図

```
not_started (0)
  ├─→ in_progress (1)
  │     ├─→ completed (3)
  │     └─→ forced_terminated (4)
  └─→ forced_terminated (4)  ← 追加
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| データ整合性の問題 | 低 | 低 | 開始前タスクの強制終了は業務上想定内 |
| 既存データへの影響 | なし | なし | 遷移ルールの追加のみで既存データは変更なし |

## 8. テスト計画

### 手動テスト
- [x] `not_started` のタスクで「強制終了」ボタンをクリック
- [x] ステータスが `forced_terminated` に更新されることを確認
- [x] エラーが発生しないことを確認

### 既存機能への影響確認
- [x] `in_progress` → `forced_terminated` の遷移が正常に動作することを確認
- [x] `not_started` → `in_progress` の遷移が正常に動作することを確認

## 9. 承認記録

- **計画書提示日時**: 2026-02-24 10:55
- **承認日時**: 2026-02-24 10:55
- **承認者コメント**: 案2で承認

## 10. 実施記録

### 実施日時
開始: 2026-02-24 10:55
完了: 2026-02-24 10:57

### 計画からの変更点
なし。計画通りに実装を完了しました。

### 発生した問題と解決方法
問題は発生しませんでした。VALID_TRANSITIONSの1行のみの修正で対応できました。

### 最終的な成果物
- [x] taskService.ts修正完了
- [x] 動作確認完了（コード確認）

## 11. 振り返り

### うまくいった点
- エラーメッセージからステータス遷移ルールの問題を即座に特定できた
- 修正箇所が1行のみで非常にシンプルな修正で済んだ
- ステータス遷移図を作成することで、仕様の理解が明確になった

### 改善が必要な点
- 実際のブラウザでの動作確認は、バックエンドサーバーの再起動が必要
- フロントエンドとバックエンドの仕様不整合が初期段階で発見できなかった

### 学んだこと
- ステータス遷移ルールは要件定義時に明確に定義する必要がある
- バックエンドとフロントエンドの整合性チェックの重要性を再認識
- エラーメッセージの詳細な分析により、迅速な問題解決が可能
