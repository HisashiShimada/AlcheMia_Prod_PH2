# タスク計画書: lifecycleTransition値修正

## メタデータ
- **作成日時**: 2026-09-03 00:00
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`maiml_event_log` テーブルの `log` カラムに保存される `lifecycle:transition` プロパティの値が、
現在は遷移後ステータス名（`running` / `completed` 等）をそのまま使用しており誤っている。

正しくは**遷移元→遷移先の組み合わせ**に応じた値（`schedule` / `assign` / `start` 等）を登録する必要がある。
また、`.clinerules` / `.cline/skills` 内のドキュメントにも誤記があるため合わせて修正する。

## 遷移値マッピング（正しい仕様）

| 遷移前 | 遷移後 | lifecycle:transition 値 |
|--------|--------|------------------------|
| 1(INITIAL)    | 2(PREPARING)   | `schedule`   |
| 2(PREPARING)  | 3(READY)       | `assign`     |
| 1(INITIAL)    | 6(COMPLETED)   | `autoskip`   |
| 2(PREPARING)  | 6(COMPLETED)   | `manualskip` |
| 3(READY)      | 3(READY)       | `reassign`   |
| 2(PREPARING)  | 7(ERROR)       | `withdraw`   |
| 3(READY)      | 7(ERROR)       | `withdraw`   |
| 3(READY)      | 4(IN_PROGRESS) | `start`      |
| 4(IN_PROGRESS)| 5(PAUSED)      | `suspend`    |
| 5(PAUSED)     | 4(IN_PROGRESS) | `resume`     |
| 4(IN_PROGRESS)| 6(COMPLETED)   | `complete`   |
| 4(IN_PROGRESS)| 7(ERROR)       | `ate_abort`  |
| 5(PAUSED)     | 7(ERROR)       | `ate_abort`  |

## 変更ファイル一覧

1. `backend/src/repositories/eventLogRepository.ts`
   - `LIFECYCLE_TRANSITION_VALUE_MAP` 定数追加
   - `insertTransitionProgressLog` に `fromStatus` パラメータ追加
   - `lifecycle:transition` の値をマッピングで決定するよう変更

2. `backend/src/services/progressService.ts`
   - `insertTransitionProgressLog` 呼び出しに `currentStatus` を渡す（メイン更新・連鎖更新）

3. `backend/src/services/projectService.ts`
   - チェックアウト時の `insertTransitionProgressLog` 呼び出しに `TransitionStatusEnum.INITIAL` を追加

4. `backend/src/services/experimentDataService.ts`
   - みなし進捗の `insertTransitionProgressLog` 呼び出しに遷移元ステータスを追加

5. `backend/tests/repositories/eventLogRepository.test.ts`
   - `lifecycle:transition` 値のテストケースを新マッピングに対応

6. `.clinerules/references/eventlog_structure.md`
   - WorkerTransition フェーズの遷移値一覧を正確に記載

7. `.cline/skills/backend-develop-skill/docs/status_transitions.md`
   - チェックアウト時の遷移説明 `1→3` を `1→2` に修正

## 承認記録
- **承認日時**: 2026-09-03 00:00
- **承認者コメント**: Act モードにて承認済み

## 実施記録（追記: 2026-09-03 第2次修正）

### 問題
前回修正後も `Alchemia:lifecycleTransition` に誤った値（statusLabel のフォールバック値）が
記録されていた。サンプルログ：
```
"Alchemia:lifecycleTransition": "running"  ← READY→IN_PROGRESS なので "start" が正しい
```

### 根本原因
1. **TypeScript リビルド未実施** — `.ts` ファイル修正後にサーバーが再起動されていなかった
2. **`req.body.status` の型変換未実施** — express-validator の `.isInt()` はバリデーションのみで
   型変換しない。文字列 `"4"` が来た場合 `LIFECYCLE_TRANSITION_VALUE_MAP[3]["4"]` で
   `undefined` になりフォールバックが発動する可能性があった

### 追加修正内容（第2次）
1. `backend/src/routes/progressRoutes.ts`
   - `body('status')` に `.toInt()` を追加（文字列→整数への確実な型変換）

2. `backend/src/services/progressService.ts`
   - DB からの `currentStatus` を `Number()` で明示的に整数キャスト
   - `update.status` も `Number()` でキャストし `toStatus` として一元管理
   - `statusLabel` / `finalProgressRate` / 連鎖更新トリガーを `toStatus` 変数に統一

3. `npm run build` 実施 → Exit 0（コンパイルエラーなし）
- **完了**: 2026-09-03
- **計画からの変更点**: なし
- **成果物**:
  - [x] TODO-1: `eventLogRepository.ts` に `LIFECYCLE_TRANSITION_VALUE_MAP` + `getLifecycleTransitionValue` 追加、`insertTransitionProgressLog` 修正
  - [x] TODO-2: `progressService.ts` のメイン更新・連鎖更新呼び出しに `fromStatus`/`toStatus` 追加
  - [x] TODO-3: `projectService.ts` のチェックアウト時呼び出しに `fromStatus`/`toStatus` 追加（+ `TransitionStatusEnum` インポート追加）
  - [x] TODO-4: `experimentDataService.ts` のみなし進捗に遷移元ステータス取得処理追加
  - [x] TODO-5: `eventLogRepository.test.ts` のテストを新マッピングに対応
  - [x] TODO-6: `.clinerules/references/eventlog_structure.md` 遷移値一覧修正
  - [x] TODO-7: `.cline/skills/backend-develop-skill/docs/status_transitions.md` チェックアウト遷移説明修正
