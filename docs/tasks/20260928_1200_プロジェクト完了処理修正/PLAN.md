# タスク計画書: プロジェクト完了処理修正

## メタデータ
- **作成日時**: 2026-09-28 12:00
- **タスクID**: 20260928_1200_プロジェクト完了処理修正
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

`ProjectCompletionDialog.tsx` の完了ボタン押下時の処理が正しく実装されていない。

### 現状の問題

| 問題 | 詳細 |
|------|------|
| ❌ ステータス更新なし | プロジェクトステータスを「完了（4）」に更新するAPIが存在せず、フロントも呼んでいない |
| ❌ `onComplete` コールバックが空 | `ProjectManagementInner.tsx` から `onCompletionComplete` が渡されておらず常に空関数 |
| ❌ 不要な評価UI・処理が残存 | 評価機能は評価登録タブ・全体評価タブに移行済みなのにダイアログに残っている |
| ✅ MaiML書き込みは残す | `exportOverallEvaluationToMaiml()` による品質評価eventLogのMaiML書き込みは継続必要 |

### あるべき姿

完了ボタン押下時に以下の処理のみを行う：
1. **プロジェクトステータスを「完了（4）」に更新**（新規APIエンドポイント追加）
2. **記録済み評価のeventLogをMaiMLファイルへ書き込み**（既存の `exportToMaiml` を維持）

---

## 目的と期待される成果

- [ ] 完了ボタン押下でプロジェクトステータスが COMPLETED(4) に更新される
- [ ] 完了ボタン押下で品質評価 eventLog が MaiML ファイルに書き込まれる
- [ ] 不要な評価UIおよび評価処理コードが除去される
- [ ] ダイアログが「完了確認ダイアログ」としてシンプルな構成になる

---

## 実装ステップ

### Phase 1: バックエンド — 完了エンドポイント追加

#### Step 1-1. SQL ファイル作成
- [ ] `backend/src/sql/queries/project/completeProject.sql` を新規作成
  - `forceTerminate.sql` と同様の構造でステータスを `COMPLETED(4)` に更新

#### Step 1-2. Service 層 — `completeProject()` メソッド追加
- [ ] `backend/src/services/projectService.ts` に `completeProject()` を追加
  - 許可ステータス: `REVIEW_WAITING(3)` のみ
  - 処理: プロジェクト情報取得→前提条件チェック→ステータス更新→COMMIT後MaiML書き出し

#### Step 1-3. Controller 層 — `complete()` アクション追加
- [ ] `backend/src/controllers/projectController.ts` に `complete()` を追加
  - `forceTerminate()` コントローラーと同様のパターン

#### Step 1-4. Routes 層 — エンドポイント定義追加
- [ ] `backend/src/routes/projectRoutes.ts` に追加
  - `POST /api/v1/projects/:projectId/complete`
  - 権限: `040000`（実験管理者メニュー）、書込可（1）

---

### Phase 2: フロントエンド — API サービス追加

#### Step 2-1. `projectApiService.ts` に `completeProject()` 追加
- [ ] `forceTerminateProject()` と同様のパターンで追加
  - エンドポイント: `POST /projects/:projectId/complete`
  - 戻り値型: `{ projectId: string; projectStatus: number }`

---

### Phase 3: フロントエンド — ダイアログ刷新

#### Step 3-1. `ProjectCompletionDialog.tsx` の処理を整理
- [ ] 削除: 不要なインポート（`saveSubEvaluations`、`SaveSubEvaluationsRequest`、`createOverallEvaluation`、`ColumnsType`、`Table`、`Select`、`Tag`、`Divider`、`Input`）
- [ ] 削除: 評価関連の型定義（`EvalRow` interface）
- [ ] 削除: 評価関連の State（`selectedCriteriaKey`、`evalRows`、`selectedCriteria`、`updateRow`、`evalColumns`）
- [ ] 削除: 評価UI（不確かさ基準 Select、評価テーブル、関連説明文）
- [ ] 削除: `handleComplete` 内の `createOverallEvaluation()` 呼び出し
- [ ] 削除: Props から `criteriaList`（評価UIが不要になるため）
- [ ] 追加: `handleComplete` 内で `completeProject()` を呼び出す（最初のステップとして）
- [ ] 維持: `exportOverallEvaluationToMaiml()` 呼び出し
- [ ] 維持: `onComplete()` コールバック呼び出し
- [ ] ダイアログ本文を「この操作は取り消せません。よろしいですか？」のシンプルな確認文に変更

#### Step 3-2. Props 型の変更
- [ ] `ProjectCompletionDialogProps` から `criteriaList` を削除

---

### Phase 4: フロントエンド — 親コンポーネント修正

#### Step 4-1. `ProjectModals.tsx` の Props 修正
- [ ] `ProjectModalsProps` から `completionCriteriaList?: any[]` を削除
- [ ] `ProjectCompletionDialog` への `criteriaList` props 渡しを削除
- [ ] `onCompletionComplete` の型を必須化（`?: ` → `: `）

#### Step 4-2. `ProjectManagementInner.tsx` に `handleCompletionComplete` を実装
- [ ] 完了後のプロジェクトリロード（`refetchProjects()`）を行うハンドラーを実装
- [ ] 成功メッセージを表示（`message.success(t('projectCompletion.completeSuccess'))`）
- [ ] ダイアログを閉じる（`dialogs.setCompletionDialogOpen(false)`）
- [ ] `onCompletionComplete={handleCompletionComplete}` を `ProjectModals` に渡す
- [ ] 不要になった `completionCriteriaList` Props の渡しを削除

---

### Phase 5: 翻訳キー整理

#### Step 5-1. `ja.json` / `en.json` の整理
- [ ] 削除: `projectCompletion` セクションの評価UI関連キー（`criteriaLabel`、`criteriaPlaceholder`、`commentPlaceholder`、`colComment`、`colQualitative`、`colTarget`、`entireProject`、`noEvalTarget`、`saveNote`、`unevaluated`）
- [ ] 追加: `projectCompletion.completeSuccess`（完了成功メッセージ）
- [ ] 追加: `projectCompletion.statusUpdateFailed`（ステータス更新失敗メッセージ）
- [ ] 追加: `projectCompletion.confirmDescription`（確認ダイアログ本文）

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/sql/queries/project/completeProject.sql` | **新規作成** | COMPLETED に更新する SQL |
| `backend/src/services/projectService.ts` | **修正** | `completeProject()` メソッド追加 |
| `backend/src/controllers/projectController.ts` | **修正** | `complete()` アクション追加 |
| `backend/src/routes/projectRoutes.ts` | **修正** | `POST /:projectId/complete` 追加 |
| `frontend/src/services/projectApiService.ts` | **修正** | `completeProject()` 関数追加 |
| `frontend/src/components/project/ProjectCompletionDialog.tsx` | **修正** | 不要処理削除・UI刷新・completeProject呼び出し追加 |
| `frontend/src/components/project/subcomponents/ProjectModals.tsx` | **修正** | `criteriaList` Props削除・`onCompletionComplete` 修正 |
| `frontend/src/components/project/ProjectManagementInner.tsx` | **修正** | `handleCompletionComplete` 実装・Props渡し修正 |
| `frontend/src/locales/ja.json` | **修正** | 翻訳キー整理 |
| `frontend/src/locales/en.json` | **修正** | 翻訳キー整理 |

---

## 影響範囲の分析

- **プロジェクト完了処理**: 正常動作するようになる（現在は未動作）
- **評価登録タブ / 全体評価タブ**: 変更なし（独立しているため影響なし）
- **公開ボタン**: プロジェクトが COMPLETED になることで有効化（現行ロジック維持）
- **権限**: `040000`（実験管理者）のみ実行可能

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `completeProject` の許可ステータス判定誤り | 高 | `REVIEW_WAITING(3)` のみを許可し他は 409 エラー |
| `onCompletionComplete` 必須化によるコンパイルエラー | 中 | `ProjectModals.tsx` で一括修正 |
| MaiML書き込み失敗 | 低 | 既存パターン踏襲（warn扱いで処理続行） |

---

## テスト計画

- [ ] `REVIEW_WAITING` ステータスのプロジェクトで完了ボタン → ステータスが `COMPLETED` に変わること
- [ ] 完了後、公開ボタンが有効化されること
- [ ] `COMPLETED` 以外のステータスでは完了ボタンが disabled なこと（フロント制御）
- [ ] 完了後、ダイアログが閉じてプロジェクト一覧がリロードされること
- [ ] 完了後、成功メッセージが表示されること

---

## 承認記録

- **計画書提示日時**: 2026-09-28 12:00
- **承認日時**: 2026-09-28 12:30
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-28 12:30
完了: 2026-09-28 13:00

### 最終的な成果物
- [x] `backend/src/sql/queries/project/completeProject.sql` — 新規作成
- [x] `backend/src/services/projectService.ts` — `completeProject()` メソッド追加
- [x] `backend/src/controllers/projectController.ts` — `complete()` アクション追加
- [x] `backend/src/routes/projectRoutes.ts` — `POST /:projectId/complete` エンドポイント追加
- [x] `frontend/src/services/projectApiService.ts` — `completeProject()` 関数追加
- [x] `frontend/src/components/project/ProjectCompletionDialog.tsx` — 不要処理削除・UI刷新・completeProject呼び出し追加
- [x] `frontend/src/components/project/subcomponents/ProjectModals.tsx` — `criteriaList` Props削除・`onCompletionComplete` 必須化
- [x] `frontend/src/components/project/ProjectManagementInner.tsx` — `handleCompletionComplete` 実装・Props渡し修正
- [x] `frontend/src/locales/ja.json` — 翻訳キー整理（不要削除・新規追加）
- [x] `frontend/src/locales/en.json` — 翻訳キー整理（不要削除・新規追加）

### TypeScript コンパイルチェック
- バックエンド: エラーなし ✅
- フロントエンド: 今回の変更に起因するエラーなし ✅（既存の OverallEvaluationTabMock 不存在エラーのみ）

