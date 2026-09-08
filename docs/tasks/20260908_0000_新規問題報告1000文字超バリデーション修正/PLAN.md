# タスク計画書: 新規問題報告1000文字超バリデーション修正

## メタデータ
- **作成日時**: 2026-09-08
- **タスクID**: 20260908_0000
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者画面の新規問題報告フォームで、内容（content）を1000文字以上入力して保存ボタンを押してもバリデーションエラーが表示されず、1000文字目以降が無音でカットされて保存されてしまうバグを修正する。

## 根本原因

| レイヤー | 設定 | 状況 |
|---------|-----|------|
| フロントエンド TextArea `maxLength` | 1000 | ✅ UI で表示カウントは正しい。ただしコピペ時に**無音カット**するだけ |
| フロントエンド Form.Item `rules` | `required`, `min:10` のみ | ❌ **`max: 1000` ルールが欠落** → エラーメッセージが出ない |
| バックエンド APIバリデーション | `max: 2000` | ❌ UIと不整合（UIは1000文字制限、APIは2000文字まで通す） |
| バックエンド Service層 `validateIssueData` | 空欄チェックのみ | ❌ **最大文字数チェックなし** |

## 目的と期待される成果

- [ ] 1000文字を超えた内容を入力して保存ボタンを押すと、エラーメッセージが表示される
- [ ] バックエンドのバリデーションをフロントエンドの仕様（1000文字）と一致させる
- [ ] Service層にも防衛的バリデーションを追加する

## 実装ステップ

- [ ] PLAN.md 作成（完了）
- [ ] TODO-01: `IssueManagementModal.tsx` に `max: 1000` ルール追加
- [ ] TODO-02: `ja.json` に `contentMaxLength` キー追加
- [ ] TODO-03: `en.json` に `contentMaxLength` キー追加
- [ ] TODO-04: `issueRoutes.ts` の `description` max を 2000→1000 に変更
- [ ] TODO-05: `issueService.ts` の `validateIssueData` に最大文字数チェック追加
- [ ] TODO-06: `issue.ts` (backend) のコメント修正
- [ ] TODO-07: `ui_issue_management_modal.md` のバリデーション仕様に contentMaxLength 追記

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - Form.Item rules に max:1000 追加
2. `frontend/src/locales/ja.json` - contentMaxLength キー追加
3. `frontend/src/locales/en.json` - contentMaxLength キー追加
4. `backend/src/routes/issueRoutes.ts` - description max 2000→1000
5. `backend/src/services/issueService.ts` - validateIssueData に最大文字数チェック
6. `backend/src/types/issue.ts` - コメント修正
7. `docs/design/ui/experiment_worker/ui_issue_management_modal.md` - バリデーション仕様追記

## リスク

| リスク | 対策 |
|--------|------|
| 既存データへの影響 | 保存済みデータの変更なし（読み取りのみ） |
| バックエンド max 変更による既存テストへの影響 | テストを確認・修正 |

## テスト計画

- [ ] 1000文字入力 → 保存 → 正常保存されること
- [ ] 1001文字入力 → 保存ボタン押下 → エラーメッセージが表示されること
- [ ] 10文字未満入力 → 保存ボタン押下 → 既存の minLength エラーが表示されること

## 承認記録
- **承認日時**: 2026-09-08（ユーザー承認済み）

## 実施記録

### 実施日時
開始: 2026-09-08  
完了: 2026-09-08

### 計画からの変更点
- `docs/design/ui/experiment_worker/ui_issue_management_modal.md` の §8.2 テーブルはすでに「最大1000文字」と記載済みのため変更不要だった

### 最終的な成果物
- [x] TODO-01: `IssueManagementModal.tsx` に `max: 1000` ルール追加
- [x] TODO-02: `ja.json` に `contentMaxLength` キー追加
- [x] TODO-03: `en.json` に `contentMaxLength` キー追加
- [x] TODO-04: `issueRoutes.ts` の `description` max を 2000→1000 に変更
- [x] TODO-05: `issueService.ts` の `validateIssueData` に最大文字数チェック追加
- [x] TODO-06: `issue.ts` (backend) のコメント修正
- [x] TODO-07: `ui_issue_management_modal.md` のコード例に `contentMaxLength` ルール追記
- [x] フロントエンド TypeScript コンパイル: エラーなし（exit code 0）
- [x] バックエンド TypeScript コンパイル: エラーなし（exit code 0）
