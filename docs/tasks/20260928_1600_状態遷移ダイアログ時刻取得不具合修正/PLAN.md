# タスク計画書: 状態遷移ダイアログ時刻取得不具合修正

## メタデータ
- **作成日時**: 2026-09-28 16:00
- **タスクID**: 20260928_1600
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

`WorkRecordPanel.tsx` の `onStateRecord` ハンドラが呼び出す状態遷移ダイアログの時刻取得が正常に機能していない。  
原因は以下の3点で、それぞれ独立した修正が必要。

---

## 不具合の詳細分析

### 不具合 A: `getTransitionStateRecords` が `taskNo` をクエリパラメータに含めていない

**場所**: フロントエンド `projectApiService.ts` → バックエンド Controller → Service → SQL

**現状**:
- フロントエンドの `getTransitionStateRecords` は `taskNo` を渡していない
- バックエンドも `taskNo` を受け取っていない
- `findTransitionStateRecords.sql` は `trace/@id LIKE 'trace_{transitionId}_%'` でフィルタするが `taskNo` 無視
- 同一トランジションに対して複数タスク（task_no=1, 2, ...）が存在すると **全タスク分のログが混在**

**影響**: N回繰り返しトランジションで異なるタスクの遷移時刻が混在する

---

### 不具合 B: `insertTransitionProgressLog` / `insertLifecycleTransitionEventLog` に `taskNo` が渡されず `Alchemia:ReferenceTaskNo` が記録されない

**場所**: `eventLogRepository.ts`（`insertTransitionProgressLog`、`insertLifecycleTransitionEventLog`）

**現状**:
- 両メソッドの引数に `taskNo` がなく、生成するログの `property` に `Alchemia:ReferenceTaskNo` が含まれない
- SQL 側で `taskNo` フィルタしようとしてもデータが存在しないため根本解決できない

**影響**: 新規ログから正確なタスク特定が可能になるよう対処が必要

---

### 不具合 C: `insertLifecycleTransitionEventsForNoPrerequisite` のクエリが `DISTINCT method_id, transition_id` で取得するため、複数タスク・複数トランジション・複数メソッドに対してログが欠落する

**場所**: `projectInstructionService.ts` の `insertLifecycleTransitionEventsForNoPrerequisite`

**現状のクエリ**:

```sql
SELECT DISTINCT method_id, transition_id, prerequisite_transition_ids
FROM transition_data
WHERE organization_id = $1
  AND project_id = $2
  AND (prerequisite_transition_ids IS NULL OR prerequisite_transition_ids = '{}')
```

`insertLifecycleTransitionEventLog` は **1回の呼び出しで1件のINSERTしか行わない**。  
しかし上記クエリは `DISTINCT method_id, transition_id` で取得するため、以下のすべてのケースでログ件数が不足する：

1. **複数タスク（task_no）が存在する場合**: 同一 `method_id + transition_id` で `task_no=1, 2, ...` が存在しても、DISTINCTにより **task_no の次元が消えて1件**に圧縮される。他のタスクNoのログが記録されない。
2. **複数トランジションが存在する場合**: メソッド内の各トランジション（前提なし）に対してはループが回り1件ずつINSERTされるため、これ自体は問題なし。ただし task_no の次元が欠落している点は同一。
3. **複数メソッドが存在する場合**: 異なる `method_id` を持つトランジションはそれぞれ別行として取得されるため、これ自体は問題なし。

つまり**主問題は「task_no の欠落」**であり、同一トランジションの複数タスク分のログが漏れる。

**影響**: 複数タスク繰り返し実験で指示送信時の lifecycle:transition ログが task_no 単位で不足し、`getTransitionStateRecords` でのタスク別時刻特定の精度が悪化する

---

## 目的と期待される成果

- [ ] 同一トランジションの複数タスク実施時も、対象タスクの遷移時刻が正確に取得できる
- [ ] `insertTransitionProgressLog` / `insertLifecycleTransitionEventLog` のログに `Alchemia:ReferenceTaskNo` が含まれる
- [ ] `getTransitionStateRecords` で `taskNo` を指定してフィルタリングができる
- [ ] `insertLifecycleTransitionEventsForNoPrerequisite` が task_no ごとに1件ずつログを記録する

---

## 実装ステップ

### Step 1: `insertTransitionProgressLog` に `taskNo` 引数追加（不具合B対応その1）

**対象**: `backend/src/repositories/eventLogRepository.ts`

- 引数リスト末尾に `taskNo?: number | null` を追加（後方互換維持）
- event の `property` 配列に `taskNo != null` の場合のみ `Alchemia:ReferenceTaskNo` を追加

**呼び出し元修正**:
- `progressService.ts` `updateTransitionStatus` 内2箇所: `task_no` を渡す
- `progressService.ts` 連鎖更新ループ: `dep.task_no` を渡す
- `projectService.ts` checkout内: `preparedTransition.task_no` を渡す

---

### Step 2: `insertLifecycleTransitionEventLog` のパラメータに `taskNo` 追加（不具合B対応その2）

**対象**: `backend/src/repositories/eventLogRepository.ts`

- パラメータ型に `taskNo?: number | null` を追加
- event の `property` 配列に `taskNo != null` の場合のみ `Alchemia:ReferenceTaskNo` を追加

**呼び出し元修正**:
- `projectInstructionService.ts` の `insertLifecycleTransitionEventsForNoPrerequisite`: `task_no` を渡す
- `projectService.ts` の `forceTerminate`: 対象トランジションの `task_no` を渡す

---

### Step 3: `insertLifecycleTransitionEventsForNoPrerequisite` を task_no 単位に修正（不具合C対応）

**対象**: `backend/src/services/projectInstructionService.ts`

- クエリを `method_id, task_no, transition_id` 取得に変更（`DISTINCT` 廃止）
- 重複排除キーを `method_id__transition_id__task_no` に変更
- `insertLifecycleTransitionEventLog` に `taskNo` を渡す

---

### Step 4: `findTransitionStateRecords.sql` に `taskNo` パラメータ追加（不具合A対応その1）

**対象**: `backend/src/sql/queries/event_log/findTransitionStateRecords.sql`

- `$4` として `taskNo` を受け取る（`NULL` の場合は全件返す）
- `Alchemia:ReferenceTaskNo` の JSONB フィルタはサービス層で行う（SQL の jsonb_array_elements は複雑なため）

---

### Step 5: `progressService.getTransitionStateRecords` に `taskNo` 追加（不具合A対応その2）

**対象**: `backend/src/services/progressService.ts`

- `getTransitionStateRecords` に `taskNo?: number | null` 引数追加
- `findTransitionStateRecords` に `taskNo` を渡す
- エントリ解析ループで `Alchemia:ReferenceTaskNo` を取得:
  - `taskNo` 指定あり かつ ログに `Alchemia:ReferenceTaskNo` が存在 → 値が一致するもののみ残す
  - ログに `Alchemia:ReferenceTaskNo` が存在しない（旧ログ）→ そのまま残す（後方互換）

---

### Step 6: Controller に `taskNo` を渡す修正（不具合A対応その3）

**対象**: `backend/src/controllers/progressController.ts`

- `req.query.taskNo` から整数値として取得
- `progressService.getTransitionStateRecords` に渡す

---

### Step 7: ルーティングのバリデーション追加（不具合A対応その4）

**対象**: `backend/src/routes/progressRoutes.ts`

- state-records エンドポイントに `taskNo` クエリパラメータバリデーション追加（省略可・整数）

---

### Step 8: フロントエンド API に `taskNo` 追加（不具合A対応その5）

**対象**: `frontend/src/services/projectApiService.ts`

- `getTransitionStateRecords(projectId, methodId, transitionId, taskNo?: number | null)` に引数追加
- API URL に `?taskNo=${taskNo}` クエリパラメータを付与

---

### Step 9: `WorkRecordPanel.tsx` の呼び出しに `taskNo` 追加（不具合A対応その6）

**対象**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- `onStateRecord` ハンドラの `getTransitionStateRecords` 呼び出しに `displayKey.taskNo` を渡す

---

## 変更ファイル一覧

| # | ファイル | 変更概要 |
|---|---------|--------|
| 1 | `backend/src/repositories/eventLogRepository.ts` | `insertTransitionProgressLog` に `taskNo` 追加・`Alchemia:ReferenceTaskNo` 記録 |
| 2 | `backend/src/repositories/eventLogRepository.ts` | `insertLifecycleTransitionEventLog` パラメータに `taskNo` 追加・`Alchemia:ReferenceTaskNo` 記録 |
| 3 | `backend/src/services/progressService.ts` | `updateTransitionStatus` 内の `insertTransitionProgressLog` 2箇所に `task_no` 追加 |
| 4 | `backend/src/services/progressService.ts` | `getTransitionStateRecords` に `taskNo` 追加・エントリフィルタ処理追加 |
| 5 | `backend/src/services/projectService.ts` | checkout の `insertTransitionProgressLog` に `task_no` 追加 |
| 6 | `backend/src/services/projectInstructionService.ts` | `insertLifecycleTransitionEventsForNoPrerequisite` を task_no 単位に修正 |
| 7 | `backend/src/sql/queries/event_log/findTransitionStateRecords.sql` | `taskNo` パラメータ受け取り対応 |
| 8 | `backend/src/controllers/progressController.ts` | `getTransitionStateRecords` で `taskNo` をクエリパラメータから取得してサービスに渡す |
| 9 | `backend/src/routes/progressRoutes.ts` | state-records エンドポイントに `taskNo` クエリバリデーション追加 |
| 10 | `frontend/src/services/projectApiService.ts` | `getTransitionStateRecords` に `taskNo` 追加・クエリパラメータ付与 |
| 11 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `getTransitionStateRecords` 呼び出しに `taskNo` 追加 |

---

## 影響範囲の分析

### バックエンド
- `insertTransitionProgressLog` の引数変更（末尾追加のため後方互換あり）
- `insertLifecycleTransitionEventLog` のパラメータ型変更（`taskNo` 省略可能で後方互換あり）
- `getTransitionStateRecords` の引数変更（省略可能で後方互換あり）

### フロントエンド
- `getTransitionStateRecords` の引数追加（省略可能）
- `WorkRecordPanel.tsx` の呼び出し箇所修正

### データベース
- 既存ログへの影響なし（新規INSERT時のみ `Alchemia:ReferenceTaskNo` が追加）
- 既存ログは `Alchemia:ReferenceTaskNo` なしのため `taskNo` フィルタで除外されないよう考慮済み

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存ログ（taskNoなし）がフィルタで除外される | 高 | 中 | `Alchemia:ReferenceTaskNo` がないログはフィルタ対象外として残す（後方互換） |
| `insertTransitionProgressLog` 引数増加でコンパイルエラー | 低 | 低 | 省略可能引数（`?`）で後方互換を確保 |
| `insertLifecycleTransitionEventsForNoPrerequisite` のクエリ変更でログ件数増加 | 低 | 低 | task_no ごとに1件ずつとなり、より正確になるのみ |

---

## テスト計画

### 手動テスト
- [ ] 1タスクのトランジションで onStateRecord を押下 → 正しい時刻が表示される
- [ ] 複数タスク（task_no=1, 2）があるトランジションで各タスクを選択して onStateRecord を押下 → それぞれのタスクの時刻のみ表示される
- [ ] 既存ログ（taskNoなし）のプロジェクトで onStateRecord を押下 → 時刻が表示される（後方互換）
- [ ] 指示送信後、前提トランジション未設定の複数タスクがある場合 → task_no ごとに1件ずつログが記録される

### TypeScript コンパイル確認
- [ ] `cd backend && npx tsc --noEmit` でエラーなし
- [ ] `cd frontend && npx tsc --noEmit` でエラーなし

---

## 承認記録
- **計画書提示日時**: 2026-09-28 16:00
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）
