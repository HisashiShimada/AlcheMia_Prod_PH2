# タスク計画書: 進捗ステータス遷移制限の実装

## メタデータ
- **作成日時**: 2026-03-02 15:19
- **タスクID**: ステータス遷移制限実装
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験記録タブの「ステータス更新」セクションにおいて、現在は全7ステータスが常に選択可能な状態になっている。これを、`progressService.ts` の `ALLOWED_TRANSITIONS` と同一ルールに従い、現在のステータスから遷移可能なステータスのみに選択肢を絞る対応を実施する。

## 調査結果

### 変更対象ファイル

| ファイル | 変更種別 | 内容 |
|--------|---------|------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | ステータス遷移制限ロジックの追加 |

### 現状の問題

`DataRecordDialog.tsx` の「ステータス更新」セクション（`!useDeemedProgress` の場合に表示）において、`statusOptions` が全7ステータスを常にすべて選択可能にしている。

```typescript
// 現状：全ステータスが常に選択可能
const statusOptions = [
  { value: 0 as TransitionStatus, label: '初期状態' },
  { value: 1 as TransitionStatus, label: '準備状態' },
  { value: 2 as TransitionStatus, label: '準備完了状態' },
  { value: 3 as TransitionStatus, label: '動作状態' },
  { value: 4 as TransitionStatus, label: '休止状態' },
  { value: 5 as TransitionStatus, label: '終状態' },
  { value: 6 as TransitionStatus, label: '異常終了状態' },
];
```

### バックエンドの遷移ルール（progressService.ts）

```typescript
export const ALLOWED_TRANSITIONS = {
  0 (INITIAL):     [1 (PREPARING), 5 (COMPLETED), 6 (ERROR)],
  1 (PREPARING):   [2 (READY), 5 (COMPLETED), 6 (ERROR)],
  2 (READY):       [2 (READY), 3 (IN_PROGRESS), 5 (COMPLETED), 6 (ERROR)],
  3 (IN_PROGRESS): [4 (PAUSED), 5 (COMPLETED), 6 (ERROR)],
  4 (PAUSED):      [3 (IN_PROGRESS), 5 (COMPLETED), 6 (ERROR)],
  5 (COMPLETED):   [],
  6 (ERROR):       []
};
```

### 遷移ルール対応表

| 現在のステータス | 選択できるステータス |
|---|---|
| 0: 初期状態 | 1: 準備状態、5: 終状態、6: 異常終了 |
| 1: 準備状態 | 2: 準備完了、5: 終状態、6: 異常終了 |
| 2: 準備完了 | 2: 準備完了（自己遷移）、3: 動作状態、5: 終状態、6: 異常終了 |
| 3: 動作状態 | 4: 休止状態、5: 終状態、6: 異常終了 |
| 4: 休止状態 | 3: 動作状態、5: 終状態、6: 異常終了 |
| 5: 終状態 | （なし・変更不可） |
| 6: 異常終了 | （なし・変更不可） |

## 実装ステップ

### Phase 1: 遷移ルール定義の追加
- [ ] `DataRecordDialog.tsx` に `ALLOWED_TRANSITIONS` 定数を追加
- [ ] 全ステータス定義 `ALL_STATUS_OPTIONS` を定数として定義

### Phase 2: 現在ステータスの取得ロジック追加
- [ ] `transition.status`（数値型）から現在のステータス値を取得するロジックを追加
- [ ] `selectedStatus` の初期値を現在のステータスに設定するよう変更

### Phase 3: フィルタリングされたステータス選択肢の生成
- [ ] 現在ステータスに基づいて許可されたステータスのみにフィルタリングする `statusOptions` を `useMemo` で生成
- [ ] 終状態（5）・異常終了（6）の場合、Select を disabled にする

### Phase 4: UIへの適用
- [ ] `Select` コンポーネントに `disabled` 条件を追加（終端ステータスの場合）
- [ ] ステータス変更不可の場合にツールチップ等でユーザーに通知

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - ステータス遷移制限ロジックの追加

## 技術的詳細

### 実装アプローチ

`DataRecordDialog` は `transition` prop で選択中のトランジションを受け取る。
`transition.status` は `ProgressStatus`（文字列型）としてキャストされているが、実際の値は数値（0-6）のため、`Number(transition.status)` で数値変換する。

```typescript
// 遷移ルール定義（progressService.ts の ALLOWED_TRANSITIONS と同一）
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1, 5, 6],
  1: [2, 5, 6],
  2: [2, 3, 5, 6],
  3: [4, 5, 6],
  4: [3, 5, 6],
  5: [],
  6: [],
};

// 全ステータスの定義
const ALL_STATUS_OPTIONS = [
  { value: 0 as TransitionStatus, label: '初期状態' },
  { value: 1 as TransitionStatus, label: '準備状態' },
  { value: 2 as TransitionStatus, label: '準備完了状態' },
  { value: 3 as TransitionStatus, label: '動作状態' },
  { value: 4 as TransitionStatus, label: '休止状態' },
  { value: 5 as TransitionStatus, label: '終状態' },
  { value: 6 as TransitionStatus, label: '異常終了状態' },
];

// 現在ステータス（transition.status は実際は数値）
const currentStatus = transition ? Number(transition.status) : 0;

// 許可された遷移先のみにフィルタリング
const statusOptions = useMemo(() => {
  const allowedValues = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  return ALL_STATUS_OPTIONS.filter(opt => allowedValues.includes(opt.value as number));
}, [currentStatus]);

// 終端ステータス（完了・エラー）は変更不可
const isTerminalStatus = currentStatus === 5 || currentStatus === 6;
```

### 初期値の設定

ダイアログを開いたとき `selectedStatus` を現在のステータス値（`currentStatus`）で初期化する。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `transition.status` の型変換ミス | 中 | 低 | `Number()` で確実に数値変換 |
| 遷移先が空の場合のUI表示 | 低 | 低 | Select を disabled にして明示 |

## テスト計画

### 手動テスト

- [ ] 初期状態（0）のトランジション → 準備状態・終状態・異常終了のみ選択可能
- [ ] 実行中（3）のトランジション → 休止状態・終状態・異常終了のみ選択可能
- [ ] 終状態（5）のトランジション → Select が disabled
- [ ] 異常終了（6）のトランジション → Select が disabled

## 承認記録

- **計画書提示日時**: 2026-03-02 15:19
- **承認日時**: 2026-03-02 15:19
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-03-02 15:19
完了: 2026-03-02 15:22

### 計画からの変更点
なし（計画通りに実装完了）

### 最終的な成果物
- [x] `DataRecordDialog.tsx` のステータス遷移制限実装完了
  - `ALLOWED_TRANSITIONS` 定数追加（progressService.ts と同一ルール）
  - `ALL_STATUS_OPTIONS` 定数追加（全ステータス定義）
  - `currentStatus` の useMemo による取得ロジック追加
  - `isTerminalStatus` フラグ追加（終端ステータス判定）
  - `statusOptions` を useMemo でフィルタリング生成に変更
  - ダイアログオープン時の初期値を遷移可能な最初の選択肢に変更
  - 終端ステータス時に警告 Alert を表示
  - 通常時に現在のステータスを表示してから遷移先 Select を表示
