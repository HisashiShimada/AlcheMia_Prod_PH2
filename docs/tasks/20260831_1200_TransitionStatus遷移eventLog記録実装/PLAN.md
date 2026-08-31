# タスク計画書: TransitionStatus遷移eventLog記録実装

## メタデータ
- **作成日時**: 2026-08-31 12:00
- **タスクID**: 20260831_1200
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

実験作業者メニューのトランジションステータスが更新されるタイミングで、
`maiml_event_log` テーブルの `log` カラムの該当 `event` タグ内に
`lifecycle:transition` および `time:timestamp` プロパティを記録する。

## 目的と期待される成果

- [ ] トランジションステータス手動更新時（①パス）の `event` タグに `lifecycle:transition` + `time:timestamp` を追加
- [ ] チェックアウト時の一括更新（③パス）にイベントログ記録を新規追加

## 対象外

- ② みなし進捗（`experimentDataService.updateDeemedProgress`）は今回スコープ外
- UI の変更は行わない
- MAIMLファイルへの保存は実験記録タブ内では行わない

## 実装ステップ

### TODO-1: `eventLogRepository.insertTransitionProgressLog` に `lifecycle:transition` + `time:timestamp` を追加

- [ ] `event.property` 配列の末尾に以下2件を追加する
  ```json
  { "@key": "lifecycle:transition", "@xsi:type": "stringType", "#text": "<statusLabel>" }
  { "@key": "time:timestamp",       "@xsi:type": "dateTimeType","#text": "<ISO8601日時>" }
  ```
- [ ] JSDoc の XML 構造コメントを更新する
- [ ] `time:timestamp` の値は `nowIso`（既存変数）を流用する
- [ ] `lifecycle:transition` の値は引数 `statusLabel`（既存）をそのまま使用する

対象ファイル: `backend/src/repositories/eventLogRepository.ts`（行 578〜609 周辺）

---

### TODO-2: チェックアウト時のイベントログ記録を追加

チェックアウト時は複数トランジションが一括で `INITIAL(1) → PREPARING(2)` に更新される。
更新対象トランジション一覧を取得するSQLを新規追加し、各トランジションに対してイベントログを記録する。

- [ ] TODO-2a: 新規SQL `transition_data/findPreparedByCheckout.sql` を作成
  - チェックアウト更新後に `status = 2` かつ `prerequisite_transition_ids = '{}'` のレコードを返す
- [ ] TODO-2b: `TransitionDataRepository` に `findPreparedForCheckout` メソッドを追加
- [ ] TODO-2c: `projectService.checkout()` に、`updateStatusForCheckout` 呼び出し直後の
  イベントログ記録処理を追加（各トランジションに対して `insertTransitionProgressLog` を呼ぶ）
  - statusLabel は `'preparing'` 固定
  - `comment` は `null`
  - `methodId` / `programId` / `instructionId` / `resultsRefs` は全て `null`（MAIMLパースは行わない）

対象ファイル:
- `backend/src/sql/queries/transition_data/findPreparedByCheckout.sql`（新規）
- `backend/src/repositories/transitionDataRepository.ts`
- `backend/src/services/projectService.ts`

---

### TODO-3: `.clinerules/references/eventlog_structure.md` 更新

- [ ] フェーズ識別名テーブルに「トランジション進捗（WorkerTransition）」行を追記
- [ ] lifecycle:transition 遷移値テーブルに全7値を追記

---

### TODO-4: ユニットテスト更新（phase2テスト）

- [ ] `backend/tests/repositories/eventLogRepository.test.ts` の `insertTransitionProgressLog` テストに
  `lifecycle:transition` と `time:timestamp` プロパティの検証を追加

## 変更ファイル一覧

| # | ファイル | 変更種別 |
|---|---------|---------|
| 1 | `backend/src/repositories/eventLogRepository.ts` | 修正（TODO-1） |
| 2 | `backend/src/sql/queries/transition_data/findPreparedByCheckout.sql` | 新規（TODO-2a） |
| 3 | `backend/src/repositories/transitionDataRepository.ts` | 修正（TODO-2b） |
| 4 | `backend/src/services/projectService.ts` | 修正（TODO-2c） |
| 5 | `.clinerules/references/eventlog_structure.md` | 修正（TODO-3） |
| 6 | `backend/tests/repositories/eventLogRepository.test.ts` | 修正（TODO-4） |

## リスク

| リスク | 対策 |
|--------|------|
| チェックアウト時のイベントログ失敗でチェックアウト自体がロールバックされる | `non-fatal` 扱いにする（COMMIT後に記録、失敗は警告ログのみ） |
| 既存の `timestamp` キーと `time:timestamp` キーが重複 | 既存は維持しつつ `time:timestamp` を追加（後方互換性確保） |

## テスト計画

- [ ] `insertTransitionProgressLog` の property に `lifecycle:transition` と `time:timestamp` が含まれることを確認

## 承認記録
- **承認日時**: 2026-08-31 12:00

## 実施記録

### 実施日時
開始: 2026-08-31 12:00
完了: 2026-08-31 12:30

### 最終的な成果物
- [x] TODO-1: `eventLogRepository.insertTransitionProgressLog` に `lifecycle:transition` + `time:timestamp` を追加
- [x] TODO-2a: `findPreparedByCheckout.sql` 新規作成
- [x] TODO-2b: `TransitionDataRepository.findPreparedForCheckout` メソッド追加
- [x] TODO-2c: `projectService.checkout()` にチェックアウト時イベントログ記録追加
- [x] TODO-3: `.clinerules/references/eventlog_structure.md` 更新
- [x] TODO-4: `eventLogRepository.test.ts` にテスト追加（3ケース）
- [x] TypeScript ビルド確認（エラー0）
