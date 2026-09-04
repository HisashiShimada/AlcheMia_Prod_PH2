# タスク計画書: ExperimentWorkerMenu NG理由ボタン修正

## メタデータ

- **作成日時**: 2026-09-02 16:00
- **タスクID**: 20260902_1600_NG理由ボタン修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

`ExperimentWorkerMenu` の「NG理由」ボタンを押すと、選択中プロジェクトのNGタスク一覧をモーダルで表示する機能が実装されているが、**バックエンドのフィルタ条件の値が誤っているため、NGタスクが1件も取得されない状態**になっている。

また、ボタン・モーダル内の表示文言がハードコードされており、多言語対応が未完了である。

---

## 2. 問題の詳細分析

### 問題 1（最重要）: バックエンドのフィルタ値バグ

#### NG理由の書き込み経路（正常動作）

```
Manager が「NG」ボタン押下
  → ExperimentInstructionTab.tsx
  → experimentInstructionApiService.recordNg()
  → PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng
  → experimentInstructionController.recordNg()
  → experimentInstructionService.recordNg()
  → projectTaskDetailRepo.recordNg()
  → recordNg.sql: SET task_status = 5, review_result = ngReason
```

`review_result` カラムへの書き込みは正しく実装されており、NGタスクは **`task_status = 5`（`REVIEW_NG`）** で保存される。

#### NG理由の読み取り経路（バグあり）

```
Worker が「NG理由」ボタン押下
  → ExperimentWorkerMenu.tsx の getNgTasks()
  → GET /api/v1/progress/projects/:projectId/ng-tasks
  → progressController.getNgTasks()
  → findByProject() で全タスク取得
  → allTasks.filter(t => t.task_status === 6)  ← ❌ 6 でフィルタ（実際は 5）
  → 常に空配列が返る
```

#### 根拠となる定義

| 定義箇所 | 値 |
|---|---|
| `backend/src/enums/codeMaster.enum.ts` `TaskStatusEnum.REVIEW_NG` | **5** |
| `backend/src/sql/queries/project_task_detail/recordNg.sql` SET句 | `task_status = 5` |
| `backend/migrations/20260618_006_...` code_master登録 | `'05': reviewNg` |
| `frontend/src/constants/codeMaster.ts` `TaskStatus.REVIEW_NG` | **5** |
| **`backend/src/controllers/progressController.ts` フィルタ** | `=== 6` ← **バグ** |
| **テストコード `progressController.phase2.test.ts`** | `task_status: 6` ← **バグ** |

### 問題 2: フロントエンドの多言語対応未完了

`ExperimentWorkerMenu.tsx` のNG理由ボタン・モーダル内の文言がハードコードされており、`useLanguage` の `t()` が使われていない。

| 場所 | ハードコード文言 |
|---|---|
| L893 ボタンラベル | `NG理由` |
| L919 フッターボタン | `閉じる` |
| L926 モーダルタイトル | `NG理由一覧` |
| L931 NGなし文言 | `NGタスクはありません。` |
| L953 NG理由未記入 | `（NG理由未記入）` |

---

## 3. 目的と期待される成果

- [ ] NG理由ボタン押下時に、正しくNGタスク一覧（`task_status = 5`）が取得される
- [ ] モーダルにNG理由が正しく表示される
- [ ] NG理由ボタン・モーダルの表示文言が多言語対応される
- [ ] テストコードがバグ修正後の正しい値で動作する

---

## 4. 実装ステップ

### STEP 1: バックエンドバグ修正

- [ ] `backend/src/controllers/progressController.ts`
  - `TaskStatusEnum` を `../enums/codeMaster.enum` からインポート
  - `t.task_status === 6` → `t.task_status === TaskStatusEnum.REVIEW_NG` に修正
  - JSDoc コメント: `task_status=6（NG）` → `task_status=5（REVIEW_NG）` に修正

### STEP 2: テストコード修正

- [ ] `backend/tests/phase2/controllers/progressController.phase2.test.ts`
  - モックデータ `task_status: 6` → `task_status: 5` に修正（2箇所）
  - コメント `task_status=6 の 2件` → `task_status=5（REVIEW_NG）の 2件` に修正

### STEP 3: コメント修正

- [ ] `backend/src/routes/progressRoutes.ts`
  - コメント `task_status=6（NG）` → `task_status=5（REVIEW_NG）` に修正

### STEP 4: i18nキー追加

- [ ] `frontend/src/locales/ja.json`
  - `experimentWorker` 名前空間の末尾に `ngReason` セクションを追加
  ```json
  "ngReason": {
    "button": "NG理由",
    "modalTitle": "NG理由一覧",
    "noNgTasks": "NGタスクはありません。",
    "noReason": "（NG理由未記入）"
  }
  ```
- [ ] `frontend/src/locales/en.json`
  - `experimentWorker` 名前空間の末尾に `ngReason` セクションを追加
  ```json
  "ngReason": {
    "button": "NG Reason",
    "modalTitle": "NG Reason List",
    "noNgTasks": "No NG tasks.",
    "noReason": "(No NG reason provided)"
  }
  ```

### STEP 5: フロントエンド多言語対応

- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
  - ボタンラベル `NG理由` → `{t('experimentWorker.ngReason.button')}`
  - フッターボタン `閉じる` → `{t('common.close')}`（既存キー）
  - モーダルタイトル `NG理由一覧` → `{t('experimentWorker.ngReason.modalTitle')}`
  - NGなし文言 `NGタスクはありません。` → `{t('experimentWorker.ngReason.noNgTasks')}`
  - NG理由未記入 `（NG理由未記入）` → `{t('experimentWorker.ngReason.noReason')}`

### STEP 6: テスト実行・確認

- [ ] バックエンドテスト: `cd backend && npx jest tests/phase2/controllers/progressController.phase2.test.ts --no-coverage`
- [ ] フロントエンド型チェック: `cd frontend && npx tsc --noEmit`

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---|---|---|
| 1 | `backend/src/controllers/progressController.ts` | **バグ修正** | `TaskStatusEnum` import追加、フィルタ `6` → `TaskStatusEnum.REVIEW_NG`(5)、JSDocコメント修正 |
| 2 | `backend/src/routes/progressRoutes.ts` | コメント修正 | `task_status=6` → `task_status=5（REVIEW_NG）` |
| 3 | `backend/tests/phase2/controllers/progressController.phase2.test.ts` | **テスト修正** | モックデータ `task_status: 6` → `5`、コメント修正 |
| 4 | `frontend/src/locales/ja.json` | i18n追加 | `experimentWorker.ngReason.*` キー追加 |
| 5 | `frontend/src/locales/en.json` | i18n追加 | `experimentWorker.ngReason.*` キー追加 |
| 6 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 多言語対応 | ハードコード文言を `t()` キーに置き換え |

---

## 6. 影響範囲の分析

### 機能への影響
- `GET /api/v1/progress/projects/:projectId/ng-tasks` の返却結果が変化（バグ修正による正常化）
- NGタスクが `task_status = 5` で保存されているプロジェクトでは、NG理由が正しく表示されるようになる

### 他コンポーネントへの影響
- `getNgTasks` は `ExperimentWorkerMenu.tsx` からのみ呼ばれているため、他コンポーネントへの影響なし
- DB スキーマ変更なし（マイグレーション不要）
- 認証・認可ロジックへの変更なし

### スコープ外（今回対応しない）
- `projectTaskDetailRepository.ts` の `TASK_STATUS_MAP` に `5: 'review_ng'` が欠けている件（別タスク対応）
- `progressRoutes.ts` 以外のコメントの整合性修正

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `TaskStatusEnum` のインポートパスが誤っている | 低 | 低 | `../enums/codeMaster.enum` を調査済みで確認 |
| `common.close` キーが存在しない | 低 | 低 | `ja.json` L484 / `en.json` L53 に存在を確認済み |
| フロントエンドの行番号がずれて誤った箇所を修正する | 低 | 低 | 文言の文字列検索で箇所を特定してから編集する |

---

## 8. テスト計画

### ユニットテスト
- [ ] `progressController.phase2.test.ts` 正常系: `task_status: 5` のモックで2件取得できること
- [ ] `progressController.phase2.test.ts` 異常系: エラー発生時に `next` を呼ぶこと

### 型チェック
- [ ] `cd frontend && npx tsc --noEmit` でコンパイルエラーなし

### 手動確認観点
- [ ] NG処理済みプロジェクトを選択してNG理由ボタンを押すと、NGタスク一覧が表示される
- [ ] NGタスクがないプロジェクトでは「NGタスクはありません。」が表示される
- [ ] 言語切替時にボタン・モーダルの文言が切り替わる

---

## 9. ロールバック計画

各STEPは独立しているため、問題が発生した場合は該当ファイルのみ元に戻す。
DBスキーマ変更がないため、ロールバックリスクは低い。

---

## 10. 関連ドキュメント

- `backend/src/enums/codeMaster.enum.ts` — TaskStatusEnum 定義
- `backend/src/sql/queries/project_task_detail/recordNg.sql` — NG記録SQL
- `backend/migrations/20260618_006_add_task_status_approved_and_ng.sql` — task_status 05追加マイグレーション
- `tests/phase2/tasks/20260703_1441_ProgressOverviewTab機能調査/PLAN.md` — 本機能の元の設計計画

---

## 11. 承認記録

- **計画書提示日時**: 2026-09-02 16:00
- **承認日時**: 2026-09-02 16:00
- **承認者コメント**: 承認済み。実装を開始する。

---

## 12. 実施記録

### 実施日時
開始: 2026-09-02 16:00
完了: 2026-09-02 16:30

### 計画からの変更点
なし

### 発生した問題と解決方法
- バックエンドテスト（`uuid` ESM問題）と フロントエンド型チェック（既存4件エラー）はいずれも本修正前から存在する既存問題であることをgit stashで確認。本修正による新規エラーはゼロ。

### 最終的な成果物
- [x] STEP 1: バックエンドバグ修正完了
- [x] STEP 2: テストコード修正完了
- [x] STEP 3: コメント修正完了
- [x] STEP 4: i18nキー追加完了
- [x] STEP 5: フロントエンド多言語対応完了
- [x] STEP 6: テスト・型チェック合格（既存問題のみ、本修正起因のエラーなし）

