# タスク計画書: プロジェクト管理ボタン制御修正

## メタデータ
- **作成日時**: 2026-03-18 11:37
- **タスクID**: project-button-control-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

プロジェクト管理画面のボタン制御に2つの不具合がある。

1. **タスク登録タブのボタンがチェックアウト中でも押せる**  
   チェックアウト中（`isCheckoutLocked=true`）の場合、タスク登録タブ内の以下ボタンが活性のままになっている:
   - 「プロジェクト指示」ボタン
   - 「保存」ボタン
   - テーブル内の「指示追加」ボタン（`isFieldDisabled`が`isCheckoutLocked`を含んでいない）

2. **チェックインボタンが完了後も押せる**  
   プロジェクトステータスが「プロジェクト完了（status=4）」の場合、チェックインボタンが活性のままになっている。

## 目的と期待される成果

- [ ] チェックアウト中（`isCheckoutLocked=true`）はタスク登録タブのボタンを非活性にする
- [ ] プロジェクト完了後（`status === 4`）はチェックインボタンを非活性にする

## 実装ステップ

### Phase 1: TaskRegistrationTab.tsx の修正
- [ ] `isFieldDisabled` に `isCheckoutLocked` を追加
- [ ] 「プロジェクト指示」ボタンの `disabled` に `isCheckoutLocked` を追加
- [ ] 「保存」ボタンの `disabled` に `isCheckoutLocked` を追加

### Phase 2: ProjectManagement.tsx の修正
- [ ] チェックイン/チェックアウトボタンに `disabled` 条件を追加（`selectedProject.status === 4` の場合）

## 変更ファイル

1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `isFieldDisabled` 関数の修正
   - 「プロジェクト指示」ボタンの disabled 条件修正
   - 「保存」ボタンの disabled 条件修正

2. `frontend/src/components/project/ProjectManagement.tsx`
   - チェックインボタンの disabled 条件修正

## 承認記録
- **計画書提示日時**: 2026-03-18 11:37
- **承認日時**: -
