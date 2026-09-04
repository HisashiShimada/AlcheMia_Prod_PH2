# タスク計画書: ProjectManagement画面修正

## メタデータ
- **作成日時**: 2026-09-03 00:00
- **タスクID**: project-management-ui-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ProjectManagement画面で報告された4件のUIバグを修正する。

## 目的と期待される成果

- [ ] 担当者フィルタリング（ownerFilter）が正しく動作する
- [ ] 強制終了ボタンが表示非表示ではなく活性非活性（disabled）で制御される
- [ ] 「プロジェクト完了処理」ボタンのラベルが「プロジェクト完了」に変更される
- [ ] 「プロジェクト完了」ボタンと「公開」ボタンの順序が入れ替わる（公開→プロジェクト完了 の順に）

## 実装ステップ

### 1. 担当者フィルタリング修正（useProjectList.ts）
- [ ] `filteredProjects` の `useMemo` に `ownerFilter` のフィルタ条件を追加
  - `ownerFilter === 'my_only'` の場合: `project.owner === user?.id` の一致するプロジェクトのみ表示
  - `ownerFilter === 'all'` の場合: すべて表示
- [ ] `filteredProjects` の依存配列に `ownerFilter` と `user` を追加（既に `user` は hook 引数として受け取っている）

### 2. 強制終了ボタンを表示非表示→活性非活性に変更（ProjectManagementInner.tsx）
- [ ] 現在の条件付きレンダリング（`{selectedProject && (...) && (<Button>)}`）を廃止
- [ ] 常に `<Button>` を表示し、以下のステータス以外のときに `disabled` にする
  - 表示条件: 常に表示
  - active（押せる）条件: `selectedProject.status` が `TASK_PENDING / TASK_IN_PROGRESS / REVIEW_WAITING / REVIEW_REJECTED` のいずれか、かつ `!isProjectCheckedOut`

### 3. 「プロジェクト完了処理」→「プロジェクト完了」にラベル変更
- [ ] `frontend/src/locales/ja.json` の `projectManagement.completionButton` を `"プロジェクト完了処理"` → `"プロジェクト完了"` に変更
- [ ] `frontend/src/locales/en.json` の `projectManagement.completionButton` を `"Project Completion"` → `"Complete Project"` に変更（既に `completeProject` キーに `"Complete Project"` があるため、既存の翻訳を参考に統一）

### 4. 「プロジェクト完了」ボタンと「公開/非公開」ボタンの順序入れ替え
- [ ] `ProjectManagementInner.tsx` のアクションボタンエリアで、公開/非公開ボタン（291行目）とプロジェクト完了ボタン（292-294行目）の順序を入れ替える

## 変更ファイル

1. `frontend/src/hooks/project/useProjectList.ts` - ownerFilter のフィルタリングロジック追加
2. `frontend/src/components/project/ProjectManagementInner.tsx` - 強制終了ボタン制御変更・ボタン順序変更
3. `frontend/src/locales/ja.json` - completionButton テキスト変更
4. `frontend/src/locales/en.json` - completionButton テキスト変更

## リスク

| リスク | 対策 |
|--------|------|
| ownerFilter のフィルタに使うユーザーID取得: `project.owner` フィールドが userId か確認が必要 | types/project.ts を確認済み（`owner: string` = userId） |
| ボタン順序変更で他のUIに影響する可能性 | アクションボタンエリアのみの変更のため影響小 |

## テスト計画

- [ ] 担当者フィルタ「自分のみ」で自分が作成したプロジェクトのみ表示されることを確認
- [ ] 担当者フィルタ「すべて」で全プロジェクトが表示されることを確認
- [ ] 強制終了ボタンが常に表示されることを確認
- [ ] ステータスが対象外のとき強制終了ボタンが非活性（グレー）になることを確認
- [ ] 「プロジェクト完了」ボタンのラベルが正しく表示されることを確認
- [ ] ボタン順序が「公開/非公開」→「プロジェクト完了」の順になっていることを確認

## 承認記録
- **計画書提示日時**: 2026-09-03 00:00
- **承認日時**: 2026-09-03
- **承認者コメント**: 承認します

## 実施記録

### 実施日時
開始: 2026-09-03  
完了: 2026-09-03

### 最終的な成果物
- [x] `frontend/src/hooks/project/useProjectList.ts` — ownerFilter フィルタ条件追加・依存配列更新
- [x] `frontend/src/components/project/ProjectManagementInner.tsx` — 強制終了ボタンを常時表示+disabled制御に変更・ボタン順序入れ替え（プロジェクト完了→公開）
- [x] `frontend/src/locales/ja.json` — `completionButton` を「プロジェクト完了処理」→「プロジェクト完了」（2箇所）
- [x] `frontend/src/locales/en.json` — `completionButton` を「Project Completion」→「Complete Project」（2箇所）
