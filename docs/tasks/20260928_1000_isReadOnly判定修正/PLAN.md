# タスク計画書: WorkRecordPanel isReadOnly 判定ロジック修正

## メタデータ
- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000_isReadOnly判定修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`WorkRecordPanel.tsx` の `isReadOnly` フラグ算出ロジックに問題がある。

現状、「記録済み（`isRecorded === true`）」であれば `status` に関わらず読み取り専用になってしまうため、  
保存ボタン押下直後（`isRecorded` が `true` になった瞬間）に `status` が `in_progress` 等の作業継続中ステータスであっても  
読み取り専用になってしまう。

## 問題の詳細

### 現状のロジック（L3537〜3542）

```typescript
const isErrorStatus = displayKeyRow?.status === 'issue';

// データ入力エリアの読み取り専用フラグ
// - isRecorded === true（記録済み）かつ訂正モードでない場合: 読み取り専用
// - isRecorded === true かつ status === 'issue'（異常終了）: 訂正モードでも読み取り専用
const isReadOnly = displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode);
```

### 問題点

- `isRecorded === true` かつ `status === 'in_progress'` の場合、`isErrorStatus = false` かつ `isCorrectionMode = false` → `isReadOnly = true` になる
- 保存後もステータスが `completed` になるまでは編集継続できるべきだが、保存直後に編集不可になる

## 目的と期待される成果

`isReadOnly` の算出ロジックを以下の条件に基づいて修正する：

| 条件 | isReadOnly |
|------|-----------|
| `status === 'not_started'`（未着手・WorkRecordPanel への読み込み想定外だが安全策として） | `true`（編集不可） |
| `status === 'issue'`（強制終了） | `true`（常に編集不可・訂正不可） |
| `status === 'completed'` かつ `isRecorded === true` かつ `isCorrectionMode === false` | `true`（読み取り専用） |
| `status === 'completed'` かつ `isRecorded === true` かつ `isCorrectionMode === true` | `false`（訂正モードで編集可） |
| `status` が `preparing`/`ready`/`in_progress`/`on_hold` | `false`（編集可） |

## 実装ステップ

- [ ] **STEP 1**: `WorkRecordPanel.tsx` の `isReadOnly` 算出ロジックを修正（L3537〜3542付近）
  - `isCompletedStatus` 変数を追加
  - `isReadOnly` の式を新ロジックに変更
  - コメントを更新
- [ ] **STEP 2**: `PlanProps` コメント（L1702付近）を新ロジックに合わせて更新
- [ ] **STEP 3**: 動作確認（tsc ビルドエラーなし確認）

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - L3537〜3542: `isReadOnly` ロジック変更（`isCompletedStatus` 追加）
   - L1702: Props コメント更新

## 新しい isReadOnly ロジック

```typescript
const isNotStartedStatus = displayKeyRow?.status === 'not_started';
const isErrorStatus = displayKeyRow?.status === 'issue';
const isCompletedStatus = displayKeyRow?.status === 'completed';

// データ入力エリアの読み取り専用フラグ
// - status === 'not_started'（未着手）: 常に読み取り専用（WorkRecordPanel への読み込み想定外・安全策）
// - status === 'issue'（強制終了）: 常に読み取り専用（訂正不可）
// - status === 'completed' かつ isRecorded === true かつ訂正モードでない: 読み取り専用
// - status === 'completed' かつ isRecorded === true かつ訂正モード中: 編集可
// - それ以外（preparing/ready/in_progress/on_hold）: 常に編集可
const isReadOnly =
  isNotStartedStatus ||
  isErrorStatus ||
  (isCompletedStatus && displayKeyRow?.isRecorded === true && !isCorrectionMode);
```

## 影響範囲

### 直接影響
- `WorkRecordPanel.tsx` 内の `isReadOnly` を受け取るすべての子コンポーネント
  - `PlanB` コンポーネント（`isReadOnly` prop）
  - `WorkHeader`（`PlanProps` 経由で `isReadOnly` を受け取る）

### 間接影響（変化なし）
- `isCorrectionMode` の State 管理ロジック（変更なし）
- `correctRecord` API 呼び出しロジック（変更なし）
- `isErrorStatus` の定義（変更なし）

### 挙動の変化

| シナリオ | 変更前 | 変更後 |
|---------|-------|-------|
| `not_started` + 任意 + 訂正モードOFF | **編集可 ❌** | 読み取り専用 ✅（安全策）|
| `in_progress` + `isRecorded=true` + 訂正モードOFF | 読み取り専用 ❌ | 編集可 ✅ |
| `completed` + `isRecorded=true` + 訂正モードOFF | 読み取り専用 ✅ | 読み取り専用 ✅ |
| `completed` + `isRecorded=true` + 訂正モードON | 編集可 ✅ | 編集可 ✅ |
| `issue` + `isRecorded=true` + 訂正モードOFF | 読み取り専用 ✅ | 読み取り専用 ✅ |
| `issue` + `isRecorded=true` + 訂正モードON | 読み取り専用 ✅ | 読み取り専用 ✅ |
| `issue` + `isRecorded=false` + 訂正モードOFF | 編集可 ❌ | 読み取り専用 ✅ |

> 注: 最後の行（`issue` + `isRecorded=false`）は変更前は `isRecorded === false` なので読み取り専用にならなかったが、変更後は `status === 'issue'` で無条件に読み取り専用になる（仕様上の改善）。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `PlanB` 等の子コンポーネントが `isReadOnly` を独自再計算している場合の不整合 | 中 | 低 | `isReadOnly` が Props 経由で渡されていることを事前確認済み |
| `isCompletedStatus` 追加による型エラー | 低 | 低 | `ProgressRow.status` の型定義に `'completed'` が含まれており問題なし |

## テスト計画

### 手動テスト
- [ ] `in_progress` ステータスで保存ボタン押下後、編集フィールドが編集可能なままであること
- [ ] `completed` + `isRecorded=true` の状態で閲覧時、編集フィールドが読み取り専用になること
- [ ] `completed` + `isRecorded=true` の状態で訂正ボタン押下後、編集フィールドが編集可能になること
- [ ] `issue`（強制終了）ステータスのとき、訂正ボタンがあっても編集不可であること

### ビルド確認
- [ ] `tsc --noEmit` でエラーなし

## 承認記録
- **計画書提示日時**: 2026-09-28 10:00
- **承認日時**: 2026-09-28 10:05
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-28 10:05
完了: 2026-09-28 10:10

### 変更内容
- [x] STEP 1: `WorkRecordPanel.tsx` L3537〜3542 の `isReadOnly` ロジックを修正
  - `isNotStartedStatus`・`isCompletedStatus` 変数を追加
  - `isReadOnly` の式を新ロジックに変更（3行→4行）
  - コメントを新仕様に合わせて更新
- [x] STEP 2: `PlanProps` コメント（L1701〜1705）を新ロジックに合わせて更新
- [x] STEP 3: `tsc --noEmit` でビルドエラーなし確認
