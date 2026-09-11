# タスク計画書: プロジェクトステータスフィルタ修正

## メタデータ
- **作成日時**: 2026-09-09 12:00
- **タスクID**: 20260909_1200
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

ProjectManagement画面のプロジェクト一覧に適用されるステータスフィルタの挙動が要件と異なるため修正する。

## 目的と期待される成果

- [ ] 「すべて」選択時に 完了(4)・異常終了(5) を除外して表示する
- [ ] 「完了」「異常終了」はそれぞれのフィルタを選択したときのみ表示する
- [ ] フィルタ選択肢に「レビュー差戻(6)」を追加する（「すべて」では表示する）

## フィルタ仕様

| フィルタ選択 | 表示するステータス |
|---|---|
| すべて | 0, 1, 2, 3, 6（完了=4・異常終了=5 を除外） |
| プロジェクト計画中 | 0 のみ |
| タスク実行待ち | 1 のみ |
| タスク実行中 | 2 のみ |
| タスク結果レビュー待ち | 3 のみ |
| プロジェクト完了 | 4 のみ |
| タスク異常終了 | 5 のみ |
| レビュー差戻（新規追加） | 6 のみ |

## 実装ステップ

- [ ] 1. `useProjectList.ts`: `ProjectStatus` import 追加
- [ ] 2. `useProjectList.ts`: `'all'` 選択時に COMPLETED(4)・ERROR(5) を除外するロジック追加
- [ ] 3. `ProjectToolbar.tsx`: フィルタ options に `status_review_rejected`（value: `'6'`）を追加
- [ ] 4. `ja.json`: `projectManagement.status_review_rejected` キー追加（「レビュー差戻」）
- [ ] 5. `en.json`: `projectManagement.status_review_rejected` キー追加（「Review Rejected」）
- [ ] 6. `ui_project_management.md`: 設計書のフィルタ選択肢・仕様を更新

## 変更ファイル

1. `frontend/src/hooks/project/useProjectList.ts` - フィルタリングロジック修正
2. `frontend/src/components/project/subcomponents/ProjectToolbar.tsx` - 選択肢追加
3. `frontend/src/locales/ja.json` - 翻訳キー追加
4. `frontend/src/locales/en.json` - 翻訳キー追加
5. `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` - 設計書更新

## リスク

| リスク | 対策 |
|--------|------|
| 「すべて」の挙動変更により既存表示が変わる | 要件通りの変更。sessionStorage の古い `'all'` 値もロジック側変更で自動対応 |

## テスト計画

- [ ] 「すべて」選択時: status=4, 5 のプロジェクトが非表示になること
- [ ] 「プロジェクト完了」選択時: status=4 のみ表示されること
- [ ] 「タスク異常終了」選択時: status=5 のみ表示されること
- [ ] 「レビュー差戻」選択時: status=6 のみ表示されること
- [ ] 「すべて」選択時: status=6 のプロジェクトが表示されること

## 承認記録
- **承認日時**: 2026-09-09 12:00
- **承認者コメント**: Act モード移行により承認済み
