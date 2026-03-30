# タスク計画書: API仕様書未記載エンドポイント追記

## メタデータ
- **作成日時**: 2026-03-30 11:23
- **タスクID**: API仕様書未記載エンドポイント追記
- **優先度**: 高
- **推定工数**: 30分

---

## 1. タスク概要

プロジェクト管理画面のAPI仕様書（`api_project_management.md`）とAPI一覧対応表（`api_list.md`）に、実装済みだが未記載の6件のエンドポイントを追記する。

---

## 2. 目的と期待される成果

### 目的
- API仕様書と実装の整合性を確保
- 開発者が正確なAPI情報を参照できるようにする
- ドキュメントの信頼性を向上

### 期待される成果
- [x] 6件のエンドポイントがAPI仕様書に記載される
- [x] API一覧対応表の実装状況が最新化される
- [x] 変更履歴が記録される

---

## 3. 実装ステップ

### Phase 1: api_project_management.md の更新

- [ ] API #2.18: プロジェクト削除（DELETE /api/v1/projects/:projectName）を追加
- [ ] API #2.19: レビュー待ちタスク一括完了（POST /api/v1/projects/:projectName/tasks/complete-review）を追加
- [ ] API #2.20: タスク登録状況取得（GET /api/v1/projects/:projectName/instructions/status）を追加
- [ ] API #2.21: 指示更新（PUT /api/v1/projects/:projectName/instructions/:instructionId）を追加
- [ ] API #2.22: 指示削除（DELETE /api/v1/projects/:projectName/instructions/:instructionId）を追加
- [ ] API #2.23: 未送信指示一括送信（POST /api/v1/projects/:projectName/instructions/send）を追加
- [ ] ヘッダー情報を更新（最終更新日、総API数、実装状況サマリー）
- [ ] 変更履歴を追記（バージョン3.1.0）

### Phase 2: api_list.md の更新

- [ ] セクション2（プロジェクト管理API）のテーブルに6件を追加
- [ ] 実装状況サマリーを更新（19→25実装済み、86%→96%）
- [ ] 全体統計を更新（127→133実装済み、89%→91%）
- [ ] 変更履歴を追記（バージョン2.19.0）

---

## 4. 変更ファイル

### 新規作成
1. `docs/20260330_1122_API仕様書未記載エンドポイント追記/PLAN.md` - このタスク計画書

### 修正
1. `docs/design/api/api_project_management.md` - 6件のエンドポイント追加
2. `docs/design/api/api_list.md` - 実装状況更新

---

## 5. 追加するエンドポイント詳細

### 1. プロジェクト削除
- **HTTPメソッド**: DELETE
- **エンドポイント**: `/api/v1/projects/:projectName`
- **権限**: experiment_admin（書込可）
- **制約**: `project_maiml_flg=false`の場合のみ削除可能

### 2. レビュー待ちタスク一括完了
- **HTTPメソッド**: POST
- **エンドポイント**: `/api/v1/projects/:projectName/tasks/complete-review`
- **権限**: experiment_admin（書込可）
- **用途**: タスク確認完了ボタン

### 3. タスク登録状況取得
- **HTTPメソッド**: GET
- **エンドポイント**: `/api/v1/projects/:projectName/instructions/status`
- **権限**: experiment_admin（読取専用）
- **用途**: ボタン活性制御

### 4. 指示更新
- **HTTPメソッド**: PUT
- **エンドポイント**: `/api/v1/projects/:projectName/instructions/:instructionId`
- **権限**: experiment_admin（書込可）
- **制約**: 未送信の指示のみ更新可能

### 5. 指示削除
- **HTTPメソッド**: DELETE
- **エンドポイント**: `/api/v1/projects/:projectName/instructions/:instructionId`
- **権限**: experiment_admin（書込可）
- **制約**: 未送信の指示のみ削除可能

### 6. 未送信指示一括送信
- **HTTPメソッド**: POST
- **エンドポイント**: `/api/v1/projects/:projectName/instructions/send`
- **権限**: experiment_admin（書込可）
- **処理**: トランザクション処理（指示送信+タスク作成+ステータス更新）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のAPI番号との競合 | 中 | 低 | 最新のAPI番号（2.17）から連番で追加 |
| フォーマット不整合 | 低 | 低 | 既存のフォーマットに従う |
| 実装詳細の不足 | 中 | 中 | projectRoutes.tsのコメントを参照 |

---

## 7. 承認記録

- **計画書提示日時**: 2026-03-30 11:23
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

---

## 8. 実施記録

### 実施日時
開始: （実施後記入）
完了: （実施後記入）

### 計画からの変更点
（実施後記入）

### 発生した問題と解決方法
（実施後記入）

### 最終的な成果物
- [ ] api_project_management.md更新完了
- [ ] api_list.md更新完了
- [ ] 変更履歴記録完了
