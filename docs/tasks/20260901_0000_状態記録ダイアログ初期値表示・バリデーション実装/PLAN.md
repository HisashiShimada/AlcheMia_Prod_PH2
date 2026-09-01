# タスク計画書: 状態記録ダイアログ初期値表示・バリデーション実装

## メタデータ
- **作成日時**: 2026-09-01 00:00
- **タスクID**: 20260901_0000
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者メニューの実験記録タブ内「状態記録ダイアログ」について、以下4点を実装した。

1. **初期値表示**: ダイアログを開いた際に maiml_event_log 記録済みの遷移時刻を DatePicker の初期値として表示する
2. **バグ修正①**: 「終了」ボタン押下後にダイアログを開いても空欄になる問題の修正
3. **バリデーション**: 「保存」押下時に時系列の整合性チェックを行い、不正な時系列をエラーで弾く
4. **バグ修正②**: 「保存」後に再度ダイアログを開くと入力内容が消える問題の修正

## 目的と期待される成果

- [x] 状態記録ダイアログを開くと maiml_event_log の記録済み遷移時刻が初期表示される
- [x] 「終了」ボタン押下後に状態記録ダイアログを開いても正しいトランジションの時刻が表示される
- [x] 保存時に不正な時系列をエラーで弾く（準備→終状態・準備→異常終了・休止ペア・終状態＋異常終了同時入力）
- [x] 「保存」後に再度ダイアログを開くと保存した内容が反映されている

## 実装ステップ

### バックエンド

- [x] TODO-1: `backend/src/sql/queries/event_log/findTransitionStateRecords.sql` 新規作成
- [x] TODO-2: `backend/src/repositories/eventLogRepository.ts` に `findTransitionStateRecords()` 追加
- [x] TODO-3: `backend/src/services/progressService.ts` に `getTransitionStateRecords()` 追加
- [x] TODO-4: `backend/src/controllers/progressController.ts` に `getTransitionStateRecords` 追加
- [x] TODO-5: `backend/src/routes/progressRoutes.ts` に GET エンドポイント追加
  - `GET /projects/:projectId/methods/:methodId/transitions/:transitionId/state-records`
  - 権限: checkPermission('050000', 0)（実験作業者、読取専用）
- [x] TODO-6: `backend/src/types/api.ts` に `PauseEntryRecord`・`TransitionStateRecordsResult` 型追加

### フロントエンド

- [x] TODO-7: `frontend/src/types/api.ts` に型追加（フロントエンド側）
- [x] TODO-8: `frontend/src/services/projectApiService.ts` に `getTransitionStateRecords()` 追加
- [x] TODO-9: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` 修正（初期値表示）
  - `dayjs` import 追加・`stateRecordLoading` state 追加
  - `onStateRecord` を非同期に変更（API 呼び出し → state 反映 → ダイアログ open）
  - 各 DatePicker に `value` prop 追加（初期値表示）・Modal に `confirmLoading` 追加
- [x] TODO-10: バグ修正① `pendingEndKey` 考慮漏れ修正
  - `onStateRecord` 内: `viewingKey ?? activeTaskEntry` → `viewingKey ?? pendingEndKey ?? activeTaskEntry`
- [x] TODO-11: `handleStateRecordSave` にバリデーション追加（8チェック）
- [x] TODO-12: バグ修正② 「保存」後に state がリセットされる問題の修正
  - `handleStateRecordSave` 末尾: `handleStateRecordClose()` → `setStateRecordDialogOpen(false)` に変更
  - `onStateRecord` 内: API が null を返したフィールドは既存 state を維持
- [x] TODO-13: `frontend/src/locales/ja.json` にバリデーションメッセージ・stateRecord 関連キー追加
- [x] TODO-14: `frontend/src/locales/en.json` に同上キー追加

## 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `backend/src/sql/queries/event_log/findTransitionStateRecords.sql` | 新規 | transitionId に一致するイベントログ取得 SQL |
| 2 | `backend/src/repositories/eventLogRepository.ts` | 修正 | `findTransitionStateRecords()` メソッド追加 |
| 3 | `backend/src/services/progressService.ts` | 修正 | `getTransitionStateRecords()` ビジネスロジック追加 |
| 4 | `backend/src/controllers/progressController.ts` | 修正 | `getTransitionStateRecords` ハンドラ追加 |
| 5 | `backend/src/routes/progressRoutes.ts` | 修正 | state-records GET エンドポイント追加 |
| 6 | `backend/src/types/api.ts` | 修正 | `PauseEntryRecord`・`TransitionStateRecordsResult` 型追加 |
| 7 | `frontend/src/types/api.ts` | 修正 | 同上（フロントエンド側） |
| 8 | `frontend/src/services/projectApiService.ts` | 修正 | `getTransitionStateRecords()` API 関数追加 |
| 9 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | 初期値表示・バグ修正・バリデーション実装 |
| 10 | `frontend/src/locales/ja.json` | 修正 | バリデーションメッセージ・stateRecord キー追加 |
| 11 | `frontend/src/locales/en.json` | 修正 | 同上（英語版） |


## リスク

| リスク | 対策 |
|--------|------|
| maiml_event_log の JSON 構造が想定と異なる場合 | パース失敗を catch して continue で無視し、ダイアログは空欄で開く |
| API エラー時 | message.error() 表示後、空欄のままダイアログを開くフォールバック実装済み |
| Do Not 制約違反（UIの変更・MaiMLファイル保存） | DatePicker に value prop 追加のみ。maiml_event_log への読み取り専用操作のみ実施 |

## テスト計画

### 手動テスト

- [x] 各状態遷移後に状態記録ダイアログを開き、各状態の時刻が初期表示されること
- [x] 「終了」ボタン押下後にダイアログを開いても空欄にならないこと
- [x] 時系列が逆転した入力でエラーメッセージが表示されること
- [x] 終状態・異常終了状態の同時入力でエラーが出ること
- [x] 「保存」後に再度ダイアログを開くと入力値が保持されていること
- [x] 「キャンセル」後に再度ダイアログを開くと入力値がリセットされていること

## 承認記録
- **承認日時**: 2026-09-01 00:00

## 実施記録

### 実施日時
開始: 2026-09-01 00:00
完了: 2026-09-01 00:00

### 計画からの変更点

実施中に以下の追加バグを発見・修正した。

#### バグ追加①: 「終了」ボタン押下後のダイアログが空欄になる（TODO-10）

- **原因**: `onStateRecord` 内の `targetEntry` 決定式が `pendingEndKey` を考慮していなかった
  - 「終了」押下後、`progressRows` 更新により `activeTaskEntry` が `null` になるが `pendingEndKey` には完了したトランジションIDが残っている
  - `onStateRecord` は `viewingKey ?? activeTaskEntry` のみ参照していたため `targetEntry = null` となり API 呼び出しがスキップされた
- **修正**: `viewingKey ?? activeTaskEntry` → `viewingKey ?? pendingEndKey ?? activeTaskEntry`

#### バグ追加②: 「保存」後に再度ダイアログを開くと入力内容が消える（TODO-12）

- **原因①**: `handleStateRecordSave` 末尾で `handleStateRecordClose()` を呼んでおり全 state が空文字にリセットされていた
- **原因②**: 次回ダイアログ再表示時、API が null を返したフィールドで `?? ''` により空文字に上書きされていた（保存がモック実装のため maiml_event_log に書き込まれず次回取得時に null が返る）
- **修正①**: 保存時は `setStateRecordDialogOpen(false)` のみ（`handleStateRecordClose()` は呼ばない）
- **修正②**: `records.xxx !== null` の場合のみ state を更新（null の場合は既存 state を維持）

### 最終的な成果物

- [x] TODO-1 〜 TODO-14 すべて完了
- [x] バックエンド TypeScript ビルド確認（エラー 0）
- [x] フロントエンド TypeScript ビルド確認（新規エラーなし・既存エラーのみ）
