# タスク計画書: プロジェクト名重複エラーメッセージ修正

## メタデータ
- **作成日時**: 2026-05-15 11:32
- **タスクID**: project-duplicate-error-msg-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

プロジェクト管理画面で重複したプロジェクト名を登録しようとした際、エラーモーダルの `description` に「作成エラー」ではなくバックエンドが返す `response.data.error.message`（例: `"プロジェクト名が既に存在します"`）を表示する。

## 目的と期待される成果

- [ ] 重複プロジェクト名登録時に `CreateProjectModal` の `<Alert>` の `description` に `"プロジェクト名が既に存在します"` が表示される
- [ ] `message.error` によるトースト通知との二重表示が発生しない

## 原因

`ProjectManagement.tsx` の `handleCreateProject` catch ブロック（line 1788-1802）で、`AxiosError` から `response.data.error.message`（バックエンドの日本語メッセージ）を取り出さず、`error.message`（Axios固有の技術的メッセージ `"Request failed with status code 409"`）をそのまま使っている。

その値が `throw error` で `CreateProjectModal.handleSubmit` catch に到達し、`setError(err.message)` で Alert の description にセットされる。

## 実装ステップ

- [ ] `ProjectManagement.tsx` の `handleCreateProject` catch ブロックを修正

## 変更ファイル

1. `frontend/src/components/project/ProjectManagement.tsx`
   - `handleCreateProject` catch ブロック（line 1788-1802）
   - AxiosError から `response.data.error.message` → `response.data.error.code` の順で抽出
   - `message.error` トーストを削除（Alert で表示するため二重表示防止）
   - バックエンドメッセージを持つ `new Error(errorMessage)` を再スロー

## テスト計画

- [ ] 重複プロジェクト名を入力して作成ボタンを押す → Alert に「プロジェクト名が既に存在します」が表示される
- [ ] 二重表示（トースト + Alert）が発生しないことを確認
- [ ] 正常作成時は従来通り成功メッセージが表示される

## 承認記録
- **計画書提示日時**: 2026-05-15 11:32
- **承認日時**: 2026-05-15 11:43
