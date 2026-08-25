# タスク計画書: プロジェクト管理画面「強制終了」ボタン追加

## メタデータ
- **作成日時**: 2026-07-27 17:29
- **タスクID**: force-terminate-button
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
プロジェクト管理画面のファイル操作ツールバーに「強制終了」ボタンを追加する。
「問題確認」ボタンと「公開/非公開」ボタンの間に配置し、ボタン押下時に確認ダイアログを表示後、プロジェクトステータスを強制終了（ERROR=5）に更新する。

## 実装ステップ
- [ ] バックエンド: POST /api/v1/projects/:projectId/force-terminate ルート追加
- [ ] バックエンド: projectController.ts に forceTerminateProject ハンドラ追加
- [ ] バックエンド: projectService.ts に forceTerminateProject サービス追加
- [ ] フロントエンド: projectApiService.ts に forceTerminateProject API関数追加
- [ ] フロントエンド: ProjectManagement.tsx にボタン・ハンドラ追加
- [ ] 多言語: ja.json にキー追加
- [ ] 多言語: en.json にキー追加

## 変更ファイル
1. `backend/src/routes/projectRoutes.ts` - エンドポイント追加
2. `backend/src/controllers/projectController.ts` - ハンドラ追加
3. `backend/src/services/projectService.ts` - サービス追加
4. `frontend/src/services/projectApiService.ts` - API関数追加
5. `frontend/src/components/project/ProjectManagement.tsx` - ボタン追加
6. `frontend/src/locales/ja.json` - キー追加
7. `frontend/src/locales/en.json` - キー追加

## 承認記録
- **承認日時**: 2026-07-27 17:33
