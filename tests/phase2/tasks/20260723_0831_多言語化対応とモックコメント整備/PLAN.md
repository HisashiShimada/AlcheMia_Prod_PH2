# タスク計画書: プロジェクト管理タブ 多言語化対応とモックコメント整備

## メタデータ
- **作成日時**: 2026-07-23 08:31
- **タスクID**: i18n-mock-project-tab
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`frontend/src/components/project/` 配下のコンポーネントについて、
1. 日本語ハードコード文字列を `t()` に変換して多言語化対応を行う
2. モックデータ・モック処理に `// TODO:[MOCK]` コメントを追加して視認性を向上させる

## 目的と期待される成果
- [ ] 各コンポーネントの日本語ハードコード文字列を i18n キーへ変換
- [ ] `ja.json` / `en.json` に新規キーを追加
- [ ] モック箇所に `// TODO:[MOCK] バックエンド実装時に削除/置換` コメントを統一形式で追加

## 実装ステップ

### Phase 1: モックTODOコメント整備（優先度高）
- [ ] `UncertaintyApprovalTab.tsx` — モックJSON import に TODO:[MOCK] 追加
- [ ] `EvaluationDialog.tsx` — MOCK_TRANSITION_NAMES / MOCK_EVALUATION_RECORDS / MOCK_CRITERIA_LABEL_MAP に TODO:[MOCK] 追加
- [ ] `EvaluationRegistrationTab.tsx` — 同上
- [ ] `ExperimentInstructionTab.tsx` — MOCK_UNCERTAINTY_DATA / mockIdx に TODO:[MOCK] 追加
- [ ] `TaskRegistrationTab.tsx` — モックmessage.success / TODO コメント統一
- [ ] `CreateProjectModal.tsx` — ダミーデータ箇所に TODO:[MOCK] 追加

### Phase 2: i18n対応 — EvaluationDialog.tsx / EvaluationRegistrationTab.tsx
- [ ] EVALUATION_UNIT_OPTIONS / UNIT_LABEL / RESULT_UNIT_OPTIONS のラベルを t() 化
- [ ] テーブル列タイトルを t() 化
- [ ] メッセージ・プレースホルダー・Emptyテキストを t() 化
- [ ] ja.json / en.json にキー追加

### Phase 3: i18n対応 — ProjectCompletionDialog.tsx
- [ ] モーダルタイトル・列タイトル・メッセージを t() 化
- [ ] ja.json / en.json にキー追加

### Phase 4: i18n対応 — その他ファイル
- [ ] `MaimlValidationModal.tsx` — バリデーション結果テキスト等を t() 化
- [ ] `ApprovalWizardDialog.tsx` — モーダルタイトル・プレースホルダーを t() 化
- [ ] `WorkerScreenOverlay.tsx` — タイトル文字列を t() 化
- [ ] `TemplateInputPanel.tsx` — Empty / タグ / Tooltip テキストを t() 化
- [ ] `CreateProjectModal.tsx` — 残りのi18n未対応箇所を t() 化
- [ ] ja.json / en.json にキー追加

## 変更ファイル
1. `frontend/src/components/project/UncertaintyApprovalTab.tsx` — TODO:[MOCK]追加
2. `frontend/src/components/project/EvaluationDialog.tsx` — TODO:[MOCK]追加 + i18n
3. `frontend/src/components/project/EvaluationRegistrationTab.tsx` — TODO:[MOCK]追加 + i18n
4. `frontend/src/components/project/ExperimentInstructionTab.tsx` — TODO:[MOCK]追加
5. `frontend/src/components/project/TaskRegistrationTab.tsx` — TODO:[MOCK]統一
6. `frontend/src/components/project/CreateProjectModal.tsx` — TODO:[MOCK]追加 + i18n
7. `frontend/src/components/project/ProjectCompletionDialog.tsx` — i18n
8. `frontend/src/components/project/MaimlValidationModal.tsx` — i18n
9. `frontend/src/components/project/ApprovalWizardDialog.tsx` — i18n
10. `frontend/src/components/project/WorkerScreenOverlay.tsx` — i18n
11. `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` — i18n
12. `frontend/src/locales/ja.json` — キー追加
13. `frontend/src/locales/en.json` — キー追加

## 承認記録
- **計画書提示日時**: 2026-07-23 08:31
- **承認日時**: 2026-07-23 08:46

## 実施記録

### 完了済み作業（2026-07-23）
- [x] `EvaluationDialog.tsx` — `MOCK_TRANSITION_NAMES` に `TODO:[MOCK]` 追加、`MOCK_EVALUATION_RECORDS` ブロックコメントを `TODO:[MOCK]` 形式に統一
- [x] `EvaluationRegistrationTab.tsx` — `MOCK_TRANSITION_NAMES` に `TODO:[MOCK]` 追加
- [x] `CreateProjectModal.tsx` — teams フォールバックモックコメントを `TODO:[MOCK]` 形式に統一

### 未完了作業（次回対応）
- [ ] `ProjectCompletionDialog.tsx` — ハードコードテキストの i18n キー化
- [ ] `UncertaintyManagement.tsx` / `UncertaintyListTable.tsx` — 残存ハードコードテキスト i18n 化
- [ ] `EvaluationDialog.tsx` / `EvaluationRegistrationTab.tsx` — EVALUATION_UNIT_OPTIONS / UNIT_LABEL ラベル等の i18n 化
- [ ] `ja.json` / `en.json` — uncertainty / evaluation / projectCompletion セクションのキー追加
