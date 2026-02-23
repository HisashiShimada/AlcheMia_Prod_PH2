# タスク計画書: GET /api/v1/projects/worker-accessible 権限チェック実装

## メタデータ
- **作成日時**: 2026-02-18 15:15
- **タスクID**: worker-accessible-permission-check
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

`GET /api/v1/projects/worker-accessible` エンドポイントに権限チェックミドルウェアを追加し、API仕様書で定義された権限要件を実装します。

## 2. 目的と期待される成果

### 目的
- API仕様書に従った権限チェックの実装
- セキュリティの強化（認証済みユーザーでも権限不足の場合はアクセス拒否）
- 統一された権限チェックパターンの適用

### 期待される成果
- [ ] authMiddleware の後に権限チェックミドルウェアを追加
- [ ] `experiment_worker` ロールのみアクセス可能（読取専用）
- [ ] 権限不足の場合は403エラーを返却
- [ ] 実装が他のルートパターンと統一されている

## 3. 実装ステップ

### Phase 1: 権限チェックミドルウェアの追加
- [ ] `backend/src/routes/projectRoutes.ts` を修正
  - [ ] `permissionCheckMiddleware.ts` から `checkPermission` をインポート
  - [ ] `/worker-accessible` エンドポイントに権限チェックを追加
  - [ ] 機能CD: `050000`(実験作業者メニュー)のみ
  - [ ] 権限レベル: 0（読み取り専用）

### Phase 2: 動作確認
- [ ] コード変更の確認
- [ ] エラーハンドリングの確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/routes/projectRoutes.ts` - 権限チェックミドルウェアの追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 実験作業者用プロジェクト一覧取得機能
- 既存の動作は変更なし（対象ロールのユーザーは引き続きアクセス可能）
- 権限のないユーザーは403エラーになる（セキュリティ向上）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- `permissionCheckMiddleware.ts`: 既存の権限チェックミドルウェア
- `checkAnyPermission`: OR条件で複数の機能CDをチェック

### 実装パターン
```typescript
router.get(
  '/worker-accessible',
  authMiddleware,
  checkPermission('050000', 0), // ← 追加
  [...バリデーション],
  handleValidationErrors,
  workerProjectController.listWorkerAccessible
);
```

### 権限レベルの選択根拠
- GETエンドポイント（読み取り専用操作）のため、権限レベル `0`（読み取り専用）
- API仕様書で「`experiment_worker`（読取専用）」と明記

### 機能CDの選択根拠
- `050000`: 実験作業者メニュー（experiment_worker）
- API仕様書で「`experiment_worker`（読取専用）」と記載
- 実験作業者専用エンドポイントのため、単一の機能CDで制御

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 権限のないユーザーがアクセス拒否される | 低 | 低 | API仕様書通りの実装のため、意図した動作 |
| ミドルウェアの順序が不正 | 中 | 低 | authMiddlewareの後に配置することで回避 |
| 機能CDの誤り | 中 | 低 | 既存の実装パターンを参照 |

## 7. テスト計画

### 手動テスト
- [ ] 実験作業者ロール（機能CD: 050000、権限レベル: 0以上）でアクセス → 200 OK
- [ ] 実験管理者ロールでアクセス → 403 Forbidden（050000権限なし）
- [ ] 権限のないロール（data_admin等）でアクセス → 403 Forbidden

### 確認項目
- [ ] エラーメッセージが適切（`PERMISSION_DENIED`）
- [ ] レスポンス形式が統一されている
- [ ] 既存の動作が壊れていない

## 8. ロールバック計画

変更は1ファイルのみで、ミドルウェアの追加のみなので、以下の手順でロールバック可能：
1. `checkPermission`の行をコメントアウトまたは削除
2. Gitで変更を元に戻す

## 9. 関連ドキュメント

- [API仕様書](docs/design/api/api_project_management.md) - API 14
- [権限チェックミドルウェア](backend/src/middleware/permissionCheckMiddleware.ts)
- [セキュリティ規約](.clinerules/development/security.md)
- [progressRoutes.ts](backend/src/routes/progressRoutes.ts) - 実装参考例

## 10. 承認記録

- **計画書提示日時**: 2026-02-18 15:15
- **承認日時**: 2026-02-18 15:21
- **承認者コメント**: 承認します。実装を進めてください

## 11. 実施記録

### 実施日時
開始: 2026-02-18 15:22
完了: 2026-02-18 15:22

### 計画からの変更点
なし。計画通りに実装しました。

### 発生した問題と解決方法
問題なく実装完了しました。

### 最終的な成果物
- [x] `backend/src/routes/projectRoutes.ts` - 権限チェック追加
  - `checkPermission` をインポート
  - `/worker-accessible` エンドポイントに `checkPermission('050000', 0)` を追加
  - コメントを更新（@middleware、@rolesセクション）

## 12. 振り返り

### うまくいった点
- API仕様書の権限変更を適切に反映できた
- 既存の実装パターン（progressRoutes.ts）を参考にすることで、統一されたコードを実装できた
- 細かく段階を分けたことで、各ステップを確実に実行できた

### 改善が必要な点
- 特になし

### 学んだこと
- API仕様書の権限要件が変更された場合は、タスク計画書も速やかに更新する必要がある
- `checkPermission` は単一の機能CDをチェック、`checkAnyPermission` は複数の機能CDをOR条件でチェックする
- 実験作業者専用のエンドポイントは機能CD `050000`（実験作業者メニュー）で制御する
