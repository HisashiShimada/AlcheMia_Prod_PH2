# transition_data.status型 調査結果レポート

## 作成日時
2026-02-20 17:12

## 調査対象
transition_dataテーブルのstatusカラムの型不整合問題

---

## 📋 調査結果サマリー

### 結論
**transition_dataテーブルのstatusカラムは、データベースでは数値型（numeric(2,0)）として定義されているが、バックエンドのTypeScript型定義では文字列型として定義されている。これは明確な型の不一致である。**

---

## 🔍 詳細調査結果

### 1. データベース定義（ER図）

**ファイル**: `docs/design/db/er_diagram.a5er`

```
Field="ステータス","status","numeric(2,0)",,,"","",$FFFFFFFF,""
```

✅ **正しい定義**: `numeric(2,0)` - 数値型（0-99の範囲）

---

### 2. バックエンド型定義

#### 2-1. TransitionData型定義

**ファイル**: `backend/src/types/transitionData.ts`

```typescript
/**
 * トランジションのステータス
 * 
 * - initial: 初期状態（未開始）
 * - preparing: 準備中
 * - ready: 準備完了
 * - running: 実行中
 * - paused: 一時停止
 * - completed: 完了
 * - error: エラー発生
 */
export type Status = 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

export interface TransitionData {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: Status;  // ❌ 文字列型として定義
  progress_rate: number;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}
```

❌ **問題**: `status`が**文字列型**として定義されている
- 7種類の文字列リテラル型（'initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'）
- データベースの数値型と一致しない

#### 2-2. Repository層

**ファイル**: `backend/src/repositories/transitionDataRepository.ts`

```typescript
import { Status } from '../types/transitionData';

export interface TransitionDataRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: Status;  // ❌ 文字列型のStatus型を使用
  progress_rate: number;
  comment?: string | null;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}
```

❌ **問題**: Repository層でも文字列型の`Status`を使用

---

### 3. サンプルデータ

**ファイル**: `backend/sql/insert_transition_data_samples.sql`

```sql
-- 例1: 未着手のトランジション
INSERT INTO transition_data (...) VALUES (
    ...
    0,  -- ステータス: 0=未着手
    ...
);

-- 例2: 進行中のトランジション
INSERT INTO transition_data (...) VALUES (
    ...
    1,  -- ステータス: 1=進行中
    ...
);

-- 例3: 完了したトランジション
INSERT INTO transition_data (...) VALUES (
    ...
    2,  -- ステータス: 2=完了
    ...
);
```

✅ **正しい**: サンプルデータは**数値型**（0, 1, 2）でデータを挿入している

**コメントでの定義**:
```sql
-- status              (numeric(2,0)): ステータス（0-99の範囲）
--                     例: 0=未着手, 1=進行中, 2=完了, 3=保留, 4=エラー
```

---

### 4. 他のテーブルとの比較

#### project_task_detailテーブルのtask_status

**ファイル**: `backend/src/types/task.ts`

```typescript
export interface MethodTaskRecord {
  // ...
  task_status: number | null;  // ✅ DBから返される値は数値（0, 1, 3, 4）
  // ...
}
```

✅ **正しい**: `task_status`は**数値型**として定義されている

**ファイル**: `backend/src/services/taskService.ts`

```typescript
export const TaskStatusEnum = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 3,
  FORCED_TERMINATED: 4
} as const;
```

✅ **正しい**: TaskStatusは**数値型**として定義され、適切に使用されている

---

### 5. フロントエンド

**ファイル**: `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`

- このコンポーネントは`transition_data`を直接扱っていない
- `project_task_detail.task_status`を扱っており、文字列型として処理している（'not_started', 'in_progress', 'completed', 'forced_terminated'）
- **注意**: フロントエンドでは表示用に文字列型を使用することは問題ないが、API通信では数値型を使用する必要がある

---

## 🚨 問題の影響範囲

### 影響を受けるファイル

1. **型定義**
   - `backend/src/types/transitionData.ts` - Status型の定義

2. **Repository層**
   - `backend/src/repositories/transitionDataRepository.ts` - Status型の使用

3. **Service層**
   - `backend/src/services/transitionDataService.ts`（存在する場合）

4. **Controller層**
   - transition_data関連のController（存在する場合）

5. **SQL実装ファイル**
   - `backend/src/sql/transition_data/*.sql` - SQLファイル内で文字列として扱っている可能性

6. **フロントエンド**
   - transition_dataを扱うコンポーネント（存在する場合）
   - API通信の型定義

---

## ✅ 修正方針

### 1. Status型を数値型に変更

```typescript
// 修正前
export type Status = 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

// 修正後
export type TransitionStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// または
export enum TransitionStatusEnum {
  INITIAL = 0,         // 初期状態（未開始）
  PREPARING = 1,       // 準備中
  READY = 2,           // 準備完了
  IN_PROGRESS = 3,     // 実行中
  PAUSED = 4,          // 一時停止
  COMPLETED = 5,       // 完了
  ERROR = 6            // エラー発生
}
```

### 2. ステータス値のマッピング

現在の文字列型から数値型へのマッピングを定義：

```typescript
export const TRANSITION_STATUS_MAP: Record<string, number> = {
  'initial': 0,
  'preparing': 1,
  'ready': 2,
  'running': 3,
  'paused': 4,
  'completed': 5,
  'error': 6
};

export const TRANSITION_STATUS_LABEL: Record<number, string> = {
  0: '未開始',
  1: '準備中',
  2: '準備完了',
  3: '実行中',
  4: '一時停止',
  5: '完了',
  6: 'エラー'
};
```

### 3. Repository層の修正

```typescript
// 修正前
status: Status;

// 修正後
status: number;  // または TransitionStatusEnum
```

### 4. API層での変換処理

- **バックエンド → フロントエンド**: 数値 → 文字列ラベル（表示用）
- **フロントエンド → バックエンド**: 文字列 → 数値（保存用）

---

## 📝 次のステップ

### Phase 2: 問題箇所の特定（完了）
- ✅ 型定義の不一致を特定
- ✅ 影響範囲を分析
- ✅ 修正方針を決定

### Phase 3: バックエンド修正（次）
1. `backend/src/types/transitionData.ts` の修正
2. `backend/src/repositories/transitionDataRepository.ts` の修正
3. 関連するService層の修正
4. 関連するController層の修正
5. SQLファイルの確認・修正

### Phase 4: フロントエンド修正
1. transition_data関連の型定義修正
2. API通信処理の修正
3. 表示ロジックの修正

### Phase 5: テストデータ・マイグレーション確認
1. サンプルデータの確認（既に数値型で正しい）
2. マイグレーションファイルの確認

### Phase 6: 動作確認
1. バックエンドのビルド確認
2. フロントエンドのビルド確認
3. 統合テスト

---

## 📊 リスク評価

| リスク項目 | リスクレベル | 対策 |
|-----------|-------------|------|
| 既存データとの不整合 | 低 | データベースには数値型で格納されているため、問題なし |
| 実装済み機能への影響 | 中 | transition_dataを使用している機能を特定し、慎重に修正 |
| 文字列→数値変換のバグ | 中 | マッピング定義を明確にし、テストを実施 |
| フロントエンド表示の崩れ | 低 | 数値→文字列変換処理を追加すれば問題なし |

---

## 🔧 推奨する実装パターン

### Enum定義（推奨）

```typescript
/**
 * トランジションステータスのEnum定義
 * データベースのnumeric(2,0)型に対応
 */
export enum TransitionStatusEnum {
  /** 初期状態（未開始） */
  INITIAL = 0,
  
  /** 準備中 */
  PREPARING = 1,
  
  /** 準備完了 */
  READY = 2,
  
  /** 実行中 */
  IN_PROGRESS = 3,
  
  /** 一時停止 */
  PAUSED = 4,
  
  /** 完了 */
  COMPLETED = 5,
  
  /** エラー発生 */
  ERROR = 6
}

/**
 * TransitionStatusEnumの型定義
 */
export type TransitionStatus = typeof TransitionStatusEnum[keyof typeof TransitionStatusEnum];
```

### ヘルパー関数

```typescript
/**
 * ステータス値から日本語ラベルを取得
 */
export function getTransitionStatusLabel(status: TransitionStatus): string {
  const labels: Record<TransitionStatus, string> = {
    [TransitionStatusEnum.INITIAL]: '未開始',
    [TransitionStatusEnum.PREPARING]: '準備中',
    [TransitionStatusEnum.READY]: '準備完了',
    [TransitionStatusEnum.IN_PROGRESS]: '実行中',
    [TransitionStatusEnum.PAUSED]: '一時停止',
    [TransitionStatusEnum.COMPLETED]: '完了',
    [TransitionStatusEnum.ERROR]: 'エラー'
  };
  return labels[status] || '不明';
}

/**
 * ステータス値が有効かどうかを検証
 */
export function isValidTransitionStatus(status: number): status is TransitionStatus {
  return status >= 0 && status <= 6;
}
```

---

**調査完了日時**: 2026-02-20 17:12
