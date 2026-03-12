# タスク計画書: TransitionList仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 23:20
- **タスクID**: TransitionList仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_transition_list.md` の仕様書をソースコード（`frontend/src/components/ExperimentWorker/TransitionList.tsx`）の実装内容に合わせて修正する。

## 目的と期待される成果
- [ ] 仕様書がソースコードの現状を正確に反映していること
- [ ] 未記載のProps、State、イベントハンドラが追記されていること
- [ ] TODOとして残っていたAPI実装状況が実装済みに更新されていること

## 実装ステップ

### Phase 1: Props定義の修正（3節）
- [ ] `projectName`、`onDataSaveComplete`、`useDeemedProgress` を追記
- [ ] `methodName`、`onTaskCreated` の「未使用」記載を削除または更新

### Phase 2: 使用コンポーネントの修正（2.3節）
- [ ] `InstructionConfirmationModal` をカスタムコンポーネントに追記（import済み、実体は未使用）

### Phase 3: Stateの修正（6.1節）
- [ ] `issueLoading` を追記

### Phase 4: イベントの修正（5.2節・5.3節）
- [ ] `handleDataSave`、`handleSubmitIssue`、`handleSubmitComment` のTODO記載を実装済みに更新
- [ ] `handleUpdateStatus`（ステータス変更ハンドラ）を追加

### Phase 5: 記録ボタン無効化条件の修正（4.4節）
- [ ] `isRecordableStatus` → `isRecordViewableStatus` に修正
- [ ] 無効化条件の説明をソースコードに合わせて更新

### Phase 6: API実装状況の修正（6.3節）
- [ ] 問題報告API、コメント投稿API、問題一覧取得API の実装状況を更新
- [ ] TODO として残っているAPIの現状を正確に反映

### Phase 7: IssueManagementModalの使い方の修正（全体）
- [ ] IssueManagementModalへのProps渡し方をソースコードの実態（モーダル内部で自律的にデータ取得）に更新

### Phase 8: 変更履歴の更新
- [ ] 変更履歴セクションに今回の修正を追記

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_transition_list.md` - 仕様書の修正

## リスク
| リスク | 対策 |
|--------|------|
| 仕様書の記述が実装と乖離している箇所の見落とし | ソースコードと仕様書を逐一照合 |

## テスト計画
- [ ] 修正後の仕様書をレビューし、ソースコードとの整合性を確認

## 承認記録
- **承認日時**: 2026-03-11 23:20
