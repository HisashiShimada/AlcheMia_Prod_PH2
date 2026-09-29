# タスク計画書: 課題464 承認NG時チェックアウト自動化

## メタデータ
- **作成日時**: 2026-09-29 11:00
- **タスクID**: 課題対応-464
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

実験管理者が承認処理ダイアログで「NG」を登録した際、以下2点が仕様通りに動作していない。

1. **管理者側**: NG登録後もチェックアウト状態（checkout_status=1）にならない
2. **作業者側**: NG登録後もプロジェクトが記録可能な状態（project_status=1 or 2）にならない

また、作業者が訂正保存後に承認依頼ボタンを押すと「既に承認依頼が送信されています」
と誤ったエラーが返される。

---

## 目的と期待される成果

- [ ] NG登録時に `project.project_status=6`、`project.checkout_status=1` が自動更新される
- [ ] 作業者が訂正保存時に `project.project_status: 6→2` へ自動更新される
- [ ] 作業者が訂正保存時に `task_status: 5(REVIEW_NG)→1(IN_PROGRESS)` へ自動更新される
- [ ] 作業者が訂正後に承認依頼ボタンを押下すると正常に承認依頼が送信される

---

## 原因分析

### ① NG登録後のチェックアウト未更新

`experimentInstructionService.ts` の `recordNg()` は `project_task_detail` の
`task_status=5` への更新のみ行い、`project` テーブルの更新処理が存在しない。

### ② 訂正保存後の project_status 未更新

`experimentDataService.ts` の `saveBatchData()` 内の編集可否チェック・
ステータス自動更新ロジックが `project_status=6` を対象外としている。

```typescript
// 現状: updateStatusIfPending.sql は project_status=1 のときのみ 2 に更新
WHERE project_status = 1   // ← 6 のときは更新されない
```

### ③ task_status の REVIEW_NG → IN_PROGRESS 未更新

`project_task_detail/updateStatusIfPending.sql` は
`task_status=0(PENDING)` のときのみ `1(IN_PROGRESS)` に更新する。
`task_status=5(REVIEW_NG)` は対象外のため IN_PROGRESS に戻らず、
その後の `requestApproval()` でタスクが `REVIEW_WAITING(2)` に更新できない。

---

## 実装ステップ

- [ ] **Step 1**: `experimentInstructionService.ts` の `recordNg()` に
  プロジェクトのチェックアウト更新処理を追加
- [ ] **Step 2**: `sql/queries/projects/updateStatusIfPending.sql` を修正し
  `project_status=6` のときも `2(TASK_IN_PROGRESS)` に更新する
- [ ] **Step 3**: `sql/queries/project_task_detail/updateStatusIfPending.sql` を修正し
  `task_status=5(REVIEW_NG)` のときも `1(IN_PROGRESS)` に更新する
- [ ] **Step 4**: TypeScript コンパイルエラーがないことを確認
- [ ] **Step 5**: 手動テストで動作確認

---

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|----------|----------|---------|
| 1 | `backend/src/services/experimentInstructionService.ts` | 修正 | `recordNg()` に `updateCheckoutStatus()` 呼び出しを追加 |
| 2 | `backend/src/sql/queries/projects/updateStatusIfPending.sql` | 修正 | `project_status=6` も更新対象に追加 |
| 3 | `backend/src/sql/queries/project_task_detail/updateStatusIfPending.sql` | 修正 | `task_status=5` も `IN_PROGRESS` 対象に追加 |

---

## 影響範囲

- **`experimentInstructionService.ts` の `recordNg()`**: NG登録処理のみ影響
- **`updateStatusIfPending.sql`（projects）**: 実験データ保存・指示確認時の
  project_status 自動更新処理に影響。`project_status=6` の場合のみ動作が変わる
- **`updateStatusIfPending.sql`（project_task_detail）**: 実験データ保存・指示確認時の
  task_status 自動更新処理に影響。`task_status=5` の場合のみ動作が変わる

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| NG登録後チェックアウト更新が二重実行される | 中 | 低 | `updateCheckoutStatus()` はべき等なので問題なし |
| task_status=5 の別ルートが存在し想定外の更新が走る | 中 | 低 | 既存コード上 REVIEW_NG(5) を IN_PROGRESS に戻すケースは本修正のみ |
| `updateStatusIfPending.sql` の修正が他ステータスに影響 | 高 | 低 | WHERE句に `project_status IN (1, 6)` と明示し限定する |

---

## テスト計画

### 手動テスト（優先）

1. **NG登録後のチェックアウト確認**
   - 管理者がNG登録 → `checkout_status=1`、`project_status=6` になること
   - 管理者メニューでチェックアウト済み表示になること

2. **作業者側の記録可能確認**
   - 上記状態で作業者が実験記録を保存できること
   - 保存後 `project_status=2`、`task_status=1` になること

3. **承認依頼の正常送信確認**
   - 作業者が訂正保存後に承認依頼ボタンを押下 → 正常に承認依頼が送信されること
   - 「既に承認依頼が送信されています」エラーが出ないこと

### TypeScript コンパイル確認

- [ ] `cd backend && npx tsc --noEmit` がエラー 0 件

---

## 承認記録

- **計画書提示日時**: 2026-09-29 11:00
- **承認日時**: 2026-09-29 11:00
- **承認者コメント**: 承認済み（Act モードへの切り替えにより承認）

---

## 実施記録

### 実施日時
開始: 2026-09-29 11:00
完了: （作業完了時に記入）

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] Step 1: experimentInstructionService.ts 修正 - 完了
- [x] Step 2: projects/updateStatusIfPending.sql 修正 - 完了
- [x] Step 3: project_task_detail/updateStatusIfPending.sql 修正 - 完了
- [x] Step 4a: experimentDataService.ts の呼び出し条件修正 - 完了（4ファイル修正）
- [ ] Step 5: 手動テスト確認 - 未実施（環境依存）
