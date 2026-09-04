# タスク計画書: eventLog 進捗プロパティ削除（ゴミ調査・削除）

## メタデータ
- **作成日時**: 2026-09-03 14:00
- **タスクID**: 20260903_1400_eventLog進捗プロパティ削除
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`insertTransitionProgressLog` の property 配列（450〜475行）に存在する
`Alchemia:progressPercentage` と `Alchemia:comments` を調査し、
参照箇所がなくゴミと判定されたため削除する。

## 調査結果

| プロパティキー | 参照箇所 | 判定 |
|---|---|---|
| `Alchemia:status` | `progressService.ts` でフィルタ利用 | ✅ 保持 |
| `Alchemia:progressPercentage` | マイグレーションSQLのみ（既存データ移行済み） | ❌ 削除 |
| `Alchemia:comments` | マイグレーションSQLのみ（既存データ移行済み） | ❌ 削除 |
| `Alchemia:lifecycleTransition` | `eventlog_structure.md` 規定の必須キー | ✅ 保持 |
| `time:timestamp` | XES標準キー、必須 | ✅ 保持 |

- 進捗率は `transition_data.progress_rate` で管理（eventLog に重複保存不要）
- コメントは `insertTransitionCommentLog` で `Alchemia:transitionComment` キーとして別管理

## 実装内容

### 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `backend/src/repositories/eventLogRepository.ts` | `Alchemia:progressPercentage` / `Alchemia:comments` property エントリ削除、引数 `progressPercentage` / `comment` 削除、JSDoc更新 |
| 2 | `backend/src/services/progressService.ts` | 呼び出し引数修正（メイン更新・連鎖更新 2箇所） |
| 3 | `backend/src/services/experimentDataService.ts` | 呼び出し引数修正（みなし進捗 1箇所） |
| 4 | `backend/src/services/projectService.ts` | 呼び出し引数修正（チェックアウト 1箇所） |
| 5 | `backend/tests/repositories/eventLogRepository.test.ts` | 呼び出し引数修正（2箇所） |

## 承認記録
- **承認日時**: 2026-09-03 14:00
- **承認者コメント**: 計画承認済み（ユーザー承認後 act モード実行）

## 実施記録

### 実施日時
開始: 2026-09-03 14:00
完了: 2026-09-03 14:10

### 最終的な成果物
- [x] TODO-1: `eventLogRepository.ts` プロパティ削除・引数削除・JSDoc更新
- [x] TODO-2: `progressService.ts` 呼び出し引数修正（2箇所）
- [x] TODO-3: `experimentDataService.ts` 呼び出し引数修正（1箇所）
- [x] TODO-4: `projectService.ts` 呼び出し引数修正（1箇所）
- [x] TODO-5: `eventLogRepository.test.ts` 呼び出し引数修正（2箇所）
- [x] TypeScript ビルド（`tsc --noEmit`）が EXIT:0 で通過
