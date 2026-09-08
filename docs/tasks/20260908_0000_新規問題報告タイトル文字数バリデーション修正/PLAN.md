# タスク計画書: 新規問題報告タイトル文字数バリデーション修正

## メタデータ
- **作成日時**: 2026-09-08
- **タスクID**: 新規問題報告タイトル文字数バリデーション修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者画面の新規問題報告フォームにおいて、タイトルを100文字以上入力して保存ボタンを押下してもエラーが表示されず、100文字目以降が切り捨てられてそのまま保存されてしまうバグを修正する。

## 根本原因

3層にまたがる不整合が原因：

1. **フロントエンド**: `<Input maxLength={100} />` という HTML 属性が、ブラウザレベルでペースト時に無音で文字を切り捨てる。その結果 Form バリデーションルール `{ max: 100 }` が発動しない。
2. **バックエンド ルート**: `title` の `.isLength({ min: 1, max: 200 })` → UI仕様書の100文字と不整合
3. **バックエンド サービス**: `if (data.issueTitle.length > 200)` → 同様に不整合

## 目的と期待される成果

- [ ] タイトルが100文字を超えた場合にエラーメッセージが正しく表示される
- [ ] 100文字以下でなければ保存できない
- [ ] ユーザーが入力中にリアルタイムで文字数を確認できる（showCount）
- [ ] フロントエンド・バックエンド・仕様書の文字数制限が一致する

## 実装ステップ

- [x] 調査（Plan モード）
- [x] `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` 修正
- [x] `backend/src/routes/issueRoutes.ts` 修正
- [x] `backend/src/services/issueService.ts` 修正
- [x] `backend/src/types/issue.ts` 修正（コメント）
- [x] `docs/design/api/api_issue_management.md` 修正

## 変更ファイル

| # | ファイルパス | 修正内容 |
|---|------------|---------|
| 1 | `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | `maxLength={100}` 削除、`showCount` 追加 |
| 2 | `backend/src/routes/issueRoutes.ts` | title の max を 200→100 に変更 |
| 3 | `backend/src/services/issueService.ts` | issueTitle 長さチェックを 200→100 に変更 |
| 4 | `docs/design/api/api_issue_management.md` | title フィールドの仕様を 1-200→1-100 文字に更新 |

## リスク

| リスク | 対策 |
|--------|------|
| 既存テストがmax=200を前提にしている場合ビルドエラー | 修正後にテストファイルを確認・修正 |

## テスト計画

- [ ] タイトルに100文字ちょうど入力 → 保存できる
- [ ] タイトルに101文字以上入力 → エラーメッセージが表示される
- [ ] タイトルを空欄 → 必須エラーが表示される

## 承認記録
- **承認日時**: 2026-09-08
- **承認者コメント**: Plan モードで承認後 Act モードに移行
