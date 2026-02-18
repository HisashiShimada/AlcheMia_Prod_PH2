# タスク計画書: worker-tasksエンドポイント権限チェック実装

## メタデータ
- **作成日時**: 2026-02-18 16:38
- **タスクID**: worker-tasks-permission-check
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

`GET /api/v1/progress/projects/:projectName/worker-tasks` エンドポイントに権限チェックミドルウェアを追加し、実験作業者（experiment_worker）のみがアクセスできるように実装します。

## 2. 目的と期待される成果

### 目的
- API仕様書（api_progress_monitoring.md）の権限要件に従った実装
- セキュリティ強化：実験作業者ロールのみがアクセス可能にする
- 既存のミドルウェアパターンを活用した統一的な実装

### 期待される成果
- [x] API仕様書の権限要件を満たす実装
- [ ] 権限チェックミドルウェアの適用
- [ ] テストコードの追加
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 1: 現状分析（完了）
- [x] progressRoutes.tsの確認
- [x] permissionCheckMiddleware.tsの確認
- [x] 既存の権限チェック実装パターンの確認
- [x] API仕様書の権限要件の確認

### Phase 2: 権限チェック実装
- [ ] progressRoutes.tsの修正
  - `GET /api/v1/progress/projects/:projectName/worker-tasks` に `checkPermission('050000', 0)` を追加
  - ミドルウェアチェーンの順序確認（authMiddleware → checkPermission → バリデーション → handler）

### Phase 3: テストコード作成
- [ ] テストファイルの作成または更新
  - `backend/tests/routes/progressRoutes.test.ts`
  - 権限チェックのテストケース追加
    - 実験作業者（050000, 0）: アクセス可能
    - 実験管理者（040000, 0）: アクセス不可
    - システム管理者（020000, 1）: アクセス不可
    - 権限なし: 403エラー

### Phase 4: 動作確認
- [ ] ユニットテスト実行
- [ ] 統合テスト実行（必要に応じて）
- [ ] ドキュメント更新

## 4. 影響範囲

### 変更するファイル
1. `backend/src/routes/progressRoutes.ts` - 権限チェックミドルウェア追加

### 新規作成するファイル
なし（既存のテストファイルに追加）

### 影響を受ける機能
- タスク一覧取得（実験作業者用）API
  - 実験作業者（experiment_worker）のみがアクセス可能になる
  - 他のロールはアクセス不可（403エラー）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- Express.js: ルーティング
- permissionCheckMiddleware: 権限チェック
- express-validator: リクエストバリデーション

### 実装パターン

#### 現在の実装
```typescript
router.get(
  '/projects/:projectName/worker-tasks',
  authMiddleware,
  [
    // バリデーション
  ],
  handleValidationErrors,
  progressController.getWorkerTasks
);
```

#### 修正後の実装
```typescript
router.get(
  '/projects/:projectName/worker-tasks',
  authMiddleware,
  checkPermission('050000', 0),  // 実験作業者メニュー、読取専用
  [
    // バリデーション
  ],
  handleValidationErrors,
  progressController.getWorkerTasks
);
```

### ミドルウェアチェーンの順序
1. `authMiddleware`: JWT認証、セッション検証、req.userに格納
2. `checkPermission('050000', 0)`: 権限チェック（機能CD: 050000、読取専用）
3. バリデーションルール: パラメータ・クエリ検証
4. `handleValidationErrors`: バリデーションエラーハンドリング
5. `progressController.getWorkerTasks`: コントローラー処理

### 権限レベルの意味
- `0`: 読取専用（Ⓡ READER）- データの参照・検索が可能
- `1`: 書込可（Ⓦ WRITER）- データの参照・検索・作成・更新・削除が可能

### 機能CD
- `050000`: 実験作業者メニュー（experiment_worker）

## 6. API仕様書との対応

### API仕様書の記載（api_progress_monitoring.md）

**API #4: タスク一覧取得（実験作業者用）**

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`

**権限**: `experiment_worker`（読取専用）

**ミドルウェアチェーン**:
```typescript
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証（セッション検証、req.userに格納）
  permissionCheck([...]),   // 2. 権限チェック
  controller.handler        // 3. コントローラー処理
);
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のテストが失敗する | 中 | 低 | テストコードを更新して権限チェックを追加 |
| ミドルウェアの順序が不適切 | 高 | 低 | 既存の実装パターンに従う |
| 権限レベルの誤設定 | 高 | 低 | API仕様書を確認し、読取専用（0）を使用 |

## 8. テスト計画

### ユニットテスト
- [ ] 権限チェックのテストケース
  - 実験作業者（050000, 0）: 200 OK
  - 実験管理者（040000, 0）: 403 Forbidden
  - システム管理者（020000, 1）: 403 Forbidden
  - 権限なし: 403 Forbidden

### 統合テスト
- [ ] エンドツーエンドテスト（必要に応じて）
  - 実験作業者でログイン → タスク一覧取得 → 成功
  - 実験管理者でログイン → タスク一覧取得 → 失敗（403）

## 9. ロールバック計画

権限チェックの追加によって問題が発生した場合：
1. `checkPermission('050000', 0)` の行を削除
2. コミットをrevert
3. テストを再実行

## 10. 関連ドキュメント

- [API仕様書](./design/api/api_progress_monitoring.md) - API #4の権限要件
- [セキュリティ規約](../.clinerules/development/security.md) - role_permissionテーブルの権限値定義
- [権限チェックミドルウェア](../backend/src/middleware/permissionCheckMiddleware.ts)

## 11. 承認記録

- **計画書提示日時**: 2026-02-18 16:38
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 12. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] progressRoutes.ts修正完了
- [ ] テストコード追加完了
- [ ] ユニットテスト成功
- [ ] 動作確認完了

## 13. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
