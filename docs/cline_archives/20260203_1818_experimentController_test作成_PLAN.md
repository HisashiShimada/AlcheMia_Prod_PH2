# タスク計画書: experimentController.test.ts作成

## メタデータ
- **作成日時**: 2026-02-03 18:18
- **タスクID**: experimentController_test_creation
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

トランジションステータス更新API処理がprojectControllerからexperimentControllerに移動したため、テストファイルも対応する必要があります。
projectController.test.tsから不要なテストを削除し、experimentController.test.tsを新規作成します。

## 2. 目的と期待される成果

### 目的
- projectController.test.tsから削除されたupdateTransitionStatusのテストを、適切な場所（experimentController.test.ts）に移行する
- テストの整合性を保ち、コードカバレッジを維持する

### 期待される成果
- [x] projectController.test.tsからupdateTransitionStatusテストが削除される
- [ ] experimentController.test.tsが作成される
- [ ] updateTransitionStatusの全テストケースが移行される
- [ ] テストが正常に実行される

## 3. 実装ステップ

### Phase 1: projectController.test.tsの修正
- [x] updateTransitionStatusテストブロックを削除
- [x] 不要なインポートを削除（transitionDataService等）
- [x] ファイルを保存

### Phase 2: experimentController.test.tsの作成
- [ ] 新規テストファイルを作成
- [ ] 必要なインポートを追加
- [ ] describeブロックの構造を作成
- [ ] beforeEach/afterEachのセットアップ

### Phase 3: テストケースの実装
- [ ] 成功ケースのテスト実装
  - [ ] 200 OK with updated transition data
  - [ ] Status update without comment
- [ ] エラーケースのテスト実装
  - [ ] 404 Not Found (transition does not exist)
  - [ ] 422 Unprocessable Entity (invalid status transition)
  - [ ] 500 Internal Server Error (unexpected errors)
  - [ ] Missing organization_id
  - [ ] Missing user information

### Phase 4: テスト実行と確認
- [ ] テストを実行
- [ ] すべてのテストが成功することを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/tests/controllers/projectController.test.ts` - updateTransitionStatusテストブロック削除
2. `backend/tests/controllers/experimentController.test.ts` - 新規作成

### 新規作成するファイル
1. `backend/tests/controllers/experimentController.test.ts`

## 5. 技術的詳細

### experimentController.tsの構造
- エンドポイント: `PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status`
- パラメータ: projectId, methodId, transitionId
- ボディ: status (required), comment (optional)
- 認証情報: organizationId, updatedBy (userId)

### テストで使用するモック
- experimentDataService.updateStatus
- uuid.v4
- logError (暗黙的)

### テストケース一覧
1. **成功ケース**
   - 200 OK: ステータス更新成功
   - コメントなしでのステータス更新

2. **エラーケース**
   - 404: トランジションが存在しない
   - 422: 不正なステータス遷移
   - 500: 予期しないエラー
   - ValidationError: organization_id不足
   - AuthenticationError: ユーザー情報不足

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テストケースの漏れ | 中 | 低 | 元のテストを参照して全ケースを移行 |
| モックの設定ミス | 中 | 低 | experimentDataServiceのモック設定を確認 |
| パスパラメータの違い | 高 | 中 | methodIdの追加に注意 |

## 7. テスト計画

### ユニットテスト
- [x] projectController.test.ts修正後のテスト実行
- [ ] experimentController.test.ts作成後のテスト実行
- [ ] 全テストスイート実行

## 8. 承認記録

- **計画書提示日時**: 2026-02-03 18:18
- **承認日時**: (承認待ち)

## 9. 実施記録

### 実施日時
開始: 2026-02-03 18:18

### 計画からの変更点
(実施中に追記)

### 発生した問題と解決方法
(実施中に追記)