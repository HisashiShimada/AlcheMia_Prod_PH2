# タスク計画書: 実験記録タブ状態プルダウン修正

## メタデータ
- **作成日時**: 2026-08-25 09:00
- **タスクID**: 実験記録タブ状態プルダウン修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブで、各ボタン押下時に「状態プルダウンメニュー」が変わらない問題を修正する。
また、`maiml_event_log` テーブルへの登録が確実に行われるよう状態遷移フローを修正する。

## 根本原因

### 問題1: `WorkRecordPanel.tsx` の状態保持バグ

`buildTransitions()` の `setTasks()` 内で、既存 tasks state の `status` を常に優先するため
API から取得した最新ステータスが反映されない。

```typescript
// バグ: existing?.status が非 null の場合、apiStatus が絶対に使われない
status: existing?.status ?? apiStatus,
```

### 問題2: `ProgressRow.status` のマッピング不備

`toProgressRowStatus()` が PREPARING(1) と READY(2) を両方 `'in_progress'` に変換しているため
状態の区別ができない。また `WorkRecordPanel.tsx` 内の `apiStatus` 変換で ERROR と PAUSED が
`'not_started'` にフォールバックしている。

### 問題3: `handleConfirmInstruction` の検索条件

`preparingRow = progressRows.find((r) => r.status === 'in_progress')` では
PREPARING 以外の状態も対象になってしまう。

## 変更ファイル

1. `frontend/src/types/progress.ts` — `ProgressRow.status` に `'preparing'` と `'ready'` を追加
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `toProgressRowStatus` 修正、`handleConfirmInstruction` の検索条件修正
3. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — `status: apiStatus` に変更、`apiStatus` マッピング拡充

## 実装ステップ

- [x] タスク計画書作成
- [x] `frontend/src/types/progress.ts` 修正（ProgressRow.status 拡張）
- [x] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` 修正（toProgressRowStatus / handleConfirmInstruction / onStart 対象選択）
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` 修正（apiStatus 優先 / マッピング拡充 / activeEntry 計算改善）
- [x] `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` 修正（STATUS_CONFIG / byStatus 初期値 / renderAction 追加）
- [x] TypeScript ビルドエラー確認（exit code 0、対象ファイルエラーなし）

## 状態遷移の正しいフロー（修正後）

| 操作 | API ステータス値 | バックエンドラベル | ProgressRow.status | WorkRecordPanel TransitionStatus |
|------|----------------|------------------|-------------------|----------------------------------|
| 進捗確認「開始」 | PREPARING(1) | 準備中 | preparing | preparing |
| 「指示確認」ボタン | READY(2) | 準備完了 | ready | ready |
| 「開始」ボタン | IN_PROGRESS(3) | 実行中 | in_progress | running |
| 「終了」ボタン | COMPLETED(5) | 完了 | completed | completed |
| 「異常終了」ボタン | ERROR(6) | エラー | issue | error |

## 承認記録
- **承認日時**: 2026-08-25 09:00（Act モード移行により承認済み）
