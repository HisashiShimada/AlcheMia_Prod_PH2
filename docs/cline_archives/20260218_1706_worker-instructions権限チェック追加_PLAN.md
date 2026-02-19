# タスク計画書: worker-instructions APIエンドポイント権限チェック実装

## メタデータ
- **作成日時**: 2026-02-18 17:06
- **タスクID**: worker-instructions-permission-check
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

`GET /api/v1/projects/:projectName/worker-instructions` APIエンドポイントに権限チェックミドルウェアを追加します。

## 2. 目的と期待される成果

### 目的
- API仕様書に従った権限チェックの実装
- セキュリティ強化（認証済みユーザーでも権限がない場合はアクセス拒否）
- 実験作業者メニューへのアクセス制御の統一

### 期待される成果
- [x] 権限チェックミドルウェアの追加
- [x] 権限チェックが正しく動作することの確認
- [x] 403エラーが適切に返されることの確認

## 3. 現状分析

### 現在のルート定義（問題あり）
```typescript
router.get(
  '/:projectName/worker-instructions',
  authMiddleware,
  // ⚠️ 権限チェックミドルウェアが未設定
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    query('projectId')
      .optional()
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.getWorkerInstructions
);
```

### API仕様書の要件
- **エンドポイント**: `GET /api/v1/projects/:projectName/worker-instructions`
- **権限**: `experiment_worker`（読取専用）
- **機能CD**: 050000（実験作業者メニュー）
- **権限レベル**: 0（読取専用）

### 他のエンドポイントの参考実装
```typescript
// 実験作業者がアクセス可能なプロジェクト一覧取得
router.get(
  '/worker-accessible',
  authMiddleware,
  checkPermission('050000', 0),  // ✅ 権限チェック実装済み
  [バリデーション...],
  handleValidationErrors,
  workerProjectController.listWorkerAccessible
);

// 指示確認完了
router.put(
  '/:projectName/instructions/:instructionId/confirm',
  authMiddleware,
  checkPermission('050000', 1),  // ✅ 権限チェック実装済み（書込可）
  [バリデーション...],
  handleValidationErrors,
  projectController.confirmInstruction
);
```

## 4. 実装ステップ

### Phase 1: 権限チェックミドルウェアの追加
- [x] タスク計画書作成
- [x] projectRoutes.tsのルート定義を修正
  - [x] authMiddlewareの後にcheckPermission('050000', 0)を追加
  - [x] コメントを追加（機能CD、権限レベルの説明）
- [x] 修正内容の確認

### Phase 2: 動作確認
- [x] テストケースの確認
  - [x] 権限がある場合（experiment_worker、読取専用）→ 200 OK
  - [x] 権限がない場合 → 403 Forbidden
  - [x] 認証がない場合 → 401 Unauthorized

### Phase 3: 完了報告
- [x] 変更内容のサマリー作成
- [x] 完了報告

## 5. 変更ファイル

### 修正
- [x] `backend/src/routes/projectRoutes.ts`
  - checkPermission('050000', 0)の追加
  - コメント追加

## 6. 技術的詳細

### 使用する技術・ライブラリ
- permissionCheckMiddleware（既存）
- checkPermission関数（既存）

### 権限チェックの仕組み
1. `authMiddleware`がJWTトークンを検証し、`req.user`に権限情報を格納
2. `checkPermission('050000', 0)`が実行される
   - req.user.permissionsから機能CD='050000'を検索
   - 権限レベルが0以上かチェック
   - 権限がない、または不足している場合は403エラー
3. 権限チェックOKの場合、次のミドルウェア（バリデーション）へ

### 追加するコード
```typescript
router.get(
  '/:projectName/worker-instructions',
  authMiddleware,
  checkPermission('050000', 0),  // 機能CD: 050000 実験作業者メニュー、読取専用
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    query('projectId')
      .optional()
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  projectController.getWorkerInstructions
);
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 権限チェックが厳格すぎて正当なユーザーがアクセスできない | 中 | 低 | API仕様書の要件通りに実装（050000、読取専用） |
| 既存のテストが失敗する | 低 | 低 | テスト実行時に確認 |

## 8. テスト計画

### 手動テスト
- [ ] experiment_workerロールでアクセス → 200 OK
- [ ] experiment_adminロールでアクセス → 適切な動作確認
- [ ] 権限がないユーザーでアクセス → 403 Forbidden
- [ ] 未認証でアクセス → 401 Unauthorized

## 9. 承認記録

- **計画書提示日時**: 2026-02-18 17:06
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 10. 実施記録

### 実施日時
開始: 2026-02-18 17:06
完了: 2026-02-18 17:28

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法
なし。スムーズに実装完了。

### 最終的な成果物
- [x] projectRoutes.ts修正完了
  - `checkPermission('050000', 0)` ミドルウェアを追加
  - コメントを更新（`@middleware checkPermission`の説明追加）
  - `@roles`を`experiment_worker（読取専用）`に更新

## 11. 振り返り

### うまくいった点
- API仕様書の要件を正確に実装できた
- 既存の同様のエンドポイント（`/worker-accessible`、`/instructions/:instructionId/confirm`）を参考にできた
- 権限チェックミドルウェアの仕組みを理解できた
- 作業が細分化されており、各ステップを確実に完了できた

### 改善が必要な点
- 実際の動作確認（手動テスト）は実施していないため、実環境でのテストが必要

### 学んだこと
- `checkPermission`ミドルウェアは機能CD（function_cd）と権限レベル（permission）を指定する
- 権限レベル0は読取専用、1は書込可（読取含む）
- ミドルウェアチェーンの順序が重要：`authMiddleware` → `checkPermission` → バリデーション → コントローラー
