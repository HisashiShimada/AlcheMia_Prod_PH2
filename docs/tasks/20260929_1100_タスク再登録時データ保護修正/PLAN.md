# タスク計画書: タスク再登録時データ保護修正

## メタデータ

- **作成日時**: 2026-09-29 11:00
- **タスクID**: 20260929_1100_タスク再登録時データ保護修正
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

同一メソッドに対してタスクを2回目以降登録する際に発生する以下2バグを修正する。

1. **`taskRegistrationService.ts`（問題1）**: `transition_data` / `template_data` のプロジェクト全件削除が実行済みタスクのレコードも巻き込む。さらにINSERT時のtask_noが常に1始まりのため既存データと衝突する
2. **`maimlWriterService.ts`（問題2）**: チェックアウト時の `writeExperimentPlanProperties` が `<data>` 全体を置換するため、既存の実績データ（`_actual` サフィックス付き `<results>`）が消失する

---

## 問題の詳細分析

### 問題1: `taskRegistrationService.ts` — transition_data / template_data の全件削除 + task_no 1始まり

#### 現状のフロー（`saveTaskRegistration` 内）

```
6-2. project_task_detail: task_status=0 (未着手) のみ DELETE → batchInsert  <- 正しい
6-3. transition_data:     deleteByProject (全件DELETE) -> INSERT              <- 実行済みも削除
6-4. template_data:       deleteByProject (全件DELETE) -> INSERT              <- 実行済みも削除
```

`transition_data/deleteByProject.sql` / `template_data/deleteByProject.sql` はどちらも
`WHERE organization_id=$1 AND project_id=$2` のみ。ステータスを問わず全件削除する。

また `deleteAndInsertTransitionData` / `deleteAndInsertTemplateData` は
`for (let taskNo = 1; taskNo <= task.trialCount; taskNo++)` と**常に1始まり**でINSERTするため
2回目登録（task_no 6-8 相当）でも task_no 1-3 で生成してしまう。



#### 期待する動作

| テーブル | 現状 | 期待 |
|---------|------|------|
| `project_task_detail` | `task_status=0` のみ削除 | 変更なし |
| `transition_data` | 全件削除 → task_no=1始まりINSERT | 未着手行のみ削除 → 削除後の最大task_no+1始まりでINSERT |
| `template_data` | 全件削除 → task_no=1始まりINSERT | 未着手行のみ削除 → 削除後の最大task_no+1始まりでINSERT |

「未着手タスク行」は `project_task_detail.task_status = 0` の `(method_id, task_no)` を持つ行。
INSERT 開始 task_no は `deleteByProjectAndPendingTasks` 実行後に `findMaxTaskNoByMethod` で取得した最大値+1。

---

### 問題2: `maimlWriterService.ts` — `writeExperimentPlanProperties` が実績データを上書き

#### 現状の Step 7

```
_replaceDataSection(maimlContent, plannedDataXml)
 -> <data>...</data> 全体を正規表現で置換
 -> 既存の _actual 付き <results>（実績データ）が消える
```

`writeDataAndEventLog`（強制終了・訂正時）では `extractPlannedResultsBlocksFromMaiml` による退避→再追記が実装済みだが、`writeExperimentPlanProperties`（チェックアウト時）には同等の保護がない。

#### 期待する Step 7（追記方式）

`_replaceDataSection`（`<data>` 全体置換）をやめ、計画 `<results>` ブロックを `appendResultsToData` で追記するだけにする。
`appendResultsToData` は同一 id の重複を自動スキップするため、チェックアウトを複数回実行しても二重追記されない。

```
変更前: _replaceDataSection(maimlContent, plannedDataXml)
         → <data> 全体を置換（既存実績データが消える）

変更後: const plannedResultsXml = extractResultsBlocksFromDataXml(plannedDataXml)
        appendResultsToData(maimlContent, plannedResultsXml)
         → </data> 直前に計画 <results> を追記するだけ（既存は一切触らない）
```

`extractResultsBlocksFromDataXml` / `appendResultsToData` は `maimlDataWriter.ts` に既存実装済みかつ `maimlWriterService.ts` に import 済みのため、新規追加は不要。


---

## 実装ステップ

- [x] Step 1: `backend/src/sql/queries/transition_data/deleteByProjectAndPendingTasks.sql` を作成
- [x] Step 2: `backend/src/sql/queries/template_data/deleteByProjectAndPendingTasks.sql` を作成
- [x] Step 3: `TransitionDataRepository` に `deleteByProjectAndPendingTasks` メソッドを追加
- [x] Step 4: `TemplateDataRepository` に `deleteByProjectAndPendingTasks` メソッドを追加
- [x] Step 5: `taskRegistrationService.ts` の `deleteAndInsertTransitionData` を修正（削除対象絞り込み + task_no 開始値修正）
- [x] Step 6: `taskRegistrationService.ts` の `deleteAndInsertTemplateData` を修正（同上）
- [x] Step 7: `maimlWriterService.ts` の `writeExperimentPlanProperties` Step 7 を修正（`_replaceDataSection` → `extractResultsBlocksFromDataXml` + `appendResultsToData` 追記方式に変更）
- [x] Step 8: TypeScript ビルド確認 `cd backend && npx tsc --noEmit` → EXIT:0

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|----------|----------|
| 1 | `backend/src/sql/queries/transition_data/deleteByProjectAndPendingTasks.sql` | 新規作成（未着手タスクのみ削除 SQL） |
| 2 | `backend/src/sql/queries/template_data/deleteByProjectAndPendingTasks.sql` | 新規作成（未着手タスクのみ削除 SQL） |
| 3 | `backend/src/repositories/transitionDataRepository.ts` | `deleteByProjectAndPendingTasks` メソッド追加 |
| 4 | `backend/src/repositories/templateDataRepository.ts` | `deleteByProjectAndPendingTasks` メソッド追加 |
| 5 | `backend/src/services/taskRegistrationService.ts` | `deleteAndInsertTransitionData` / `deleteAndInsertTemplateData` 修正 |
| 6 | `backend/src/services/maimlWriterService.ts` | `writeExperimentPlanProperties` Step 7 修正（追記方式、新規ファイル追加なし） |

---

## 影響範囲の分析

| 対象 | 影響 |
|------|------|
| 初回タスク登録（既存動作） | 変更なし（未着手のみ存在するため結果は同じ） |
| 2回目以降の同一メソッド登録 | 修正目的: 実行済みタスクのデータが保護される |
| チェックアウト時のMAIML書き込み | 修正目的: 既存実績データが保護される |
| `writeDataAndEventLog`（強制終了・訂正時） | 変更なし（既に保護ロジック実装済み） |

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `deleteByProjectAndPendingTasks` が未着手タスクを正しく特定できない | 高 | 低 | SQL の EXISTS + task_status=0 条件で厳密にフィルタ |
| INSERT 開始 task_no の計算ミス | 高 | 低 | `findMaxTaskNoByMethod` で削除後の最大値を取得 |
| `extractActualResultsBlocksFromDataXml` が計画データも拾う | - | - | 追記方式に変更したため不要 |
| 初回登録への退行バグ | 高 | 低 | 初回は未着手のみ存在するため全件削除と同じ結果 |

---

## テスト計画

### 手動テスト

- [ ] 初回タスク登録が正常に完了すること（退行なし）
- [ ] 作業順序1（trialCount=5）登録・実験後、作業順序2（trialCount=3）を追加登録 → `transition_data` / `template_data` の task_no 1〜5 が保持されること
- [ ] 2回目登録後 task_no 6〜8 の `transition_data` / `template_data` が新規生成されること
- [ ] チェックアウト後、MAIMLの `<data>` 内に計画データ（`_actual` なし）と実績データ（`_actual` あり）が両方含まれること

---

## 承認記録

- **計画書提示日時**: 2026-09-29 11:00
- **承認日時**: 2026-09-29 11:30
- **承認者コメント**: writeExperimentPlanPropertiesは追記方式に変更すること

