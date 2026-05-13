# タスク計画書: progressController.ts バリデーション実装

## メタデータ
- **作成日時**: 2026-02-16 15:37
- **タスクID**: progressController_validation_implementation
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

progressController.tsのバリデーション処理を、backend.mdの規約に従って実装します。現在コントローラー内に記述されているバリデーション処理を、express-validatorを使用したミドルウェアベースのバリデーションに移行します。

## 2. 目的と期待される成果

### 目的
- バリデーション処理をミドルウェア層に分離し、コントローラーをビジネスロジックに集中させる
- 統一されたバリデーション方式を採用し、コードの保守性を向上させる
- backend.mdで定義されたバリデーション規約に準拠する

### 期待される成果
- [x] バリデーションロジックがミドルウェアに移行されている
- [x] コントローラーがシンプルになりビジネスロジックに集中している
- [x] 統一されたバリデーションエラーレスポンス形式が使用されている
- [x] テストコードが更新され、すべてのテストがパスする

## 3. 現状分析

### 現在の実装
```typescript
// progressController.ts
- isValidUUID()関数を独自実装
- isValidInteger()関数を独自実装
- コントローラー内でバリデーションチェック
- エラーレスポンスをコントローラー内で生成

// progressRoutes.ts
- authMiddlewareのみ適用
- バリデーションミドルウェアなし
```

### 問題点
1. バリデーション処理がコントローラーに混在
2. 他のAPIと異なるバリデーション方式
3. コードの重複（UUID検証など）
4. テスタビリティが低い

## 4. 実装ステップ

### Phase 1: バリデーター関数の拡張
- [x] utils/validators.tsにparam用バリデーター追加
  - `validateParamString()`: paramの文字列検証
  - `validateParamInt()`: paramの整数検証

### Phase 2: ルート定義の更新
- [x] progressRoutes.tsにバリデーションルール追加
  - projectId: UUID形式検証
  - methodId: 空でない文字列検証
  - taskNo: 正の整数検証（1以上）
  - handleValidationErrorsミドルウェアの追加

### Phase 3: コントローラーのリファクタリング
- [x] progressController.tsからバリデーション処理を削除
  - isValidUUID()関数の削除
  - isValidInteger()関数の削除
  - バリデーションエラーレスポンス処理の削除
- [x] パラメータを検証済みとして使用
- [x] ビジネスロジックに集中した実装に変更

### Phase 4: テストコードの更新
- [x] progressController.test.tsの更新
  - バリデーションエラーのテストケース更新
  - レスポンス形式の検証更新

### Phase 5: 動作確認
- [x] すべてのテストがパスすることを確認
- [x] エラーレスポンス形式の確認

## 5. 影響範囲

### 変更するファイル
1. `backend/src/utils/validators.ts` - param用バリデーター追加
2. `backend/src/routes/progressRoutes.ts` - バリデーションルール追加
3. `backend/src/controllers/progressController.ts` - バリデーション処理削除
4. `backend/tests/controllers/progressController.test.ts` - テスト更新

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 進捗データ取得API (`GET /api/v1/progress/:projectId/:methodId/:taskNo`)
- バリデーションエラーレスポンス形式

## 6. 技術的詳細

### 使用する技術・ライブラリ
- express-validator: バリデーションルール定義
- express: ミドルウェアチェーン
- TypeScript: 型安全性

### バリデーションルール詳細

#### projectId (param)
- 形式: UUID v4
- 必須: true
- バリデーター: `validateUUID('projectId', 'param')`

#### methodId (param)
- 形式: 空でない文字列
- 必須: true
- 最大長: 255文字
- バリデーター: `validateParamString('methodId', 1, 255)`（新規作成）

#### taskNo (param)
- 形式: 正の整数
- 必須: true
- 範囲: 1以上
- バリデーター: `validateParamInt('taskNo', 1)`（新規作成）

### ミドルウェアチェーン
```
auth → [バリデーションルール] → handleValidationErrors → controller
```

### エラーレスポンス形式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラーが発生しました",
    "details": [
      {
        "field": "projectId",
        "message": "projectIdはUUID形式である必要があります",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-16T15:37:00.000Z",
    "requestId": "req_abc123"
  }
}
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存テストの失敗 | 中 | 高 | テストコードを同時に更新 |
| バリデーションロジックの差異 | 低 | 低 | 既存のバリデーション要件を厳密に再現 |
| レスポンス形式の変更 | 中 | 低 | 統一されたレスポンス形式に準拠 |

## 8. テスト計画

### ユニットテスト
- [x] progressController.test.ts
  - 正常系: バリデーション済みパラメータで正常動作
  - 異常系: 各種バリデーションエラーのレスポンス確認

### テストケース詳細

#### 正常系
- [x] 有効なprojectId、methodId、taskNoで進捗データ取得成功

#### 異常系（バリデーションエラー）
- [x] 無効なprojectId（UUID形式でない）
- [x] 空のmethodId
- [x] 無効なtaskNo（非整数、0以下）

#### 異常系（ビジネスロジックエラー）
- [x] 存在しないタスク
- [x] 認証エラー
- [x] システムエラー

## 9. ロールバック計画

問題が発生した場合、以下の手順でロールバック：
1. 変更前のファイルに戻す（Git revert）
2. テストの実行と確認
3. 問題の原因を分析し、再実装

## 10. 関連ドキュメント

- `.cline/skills/backend-develop-skill/docs/backend.md` - バックエンド規約
- `.cline/skills/backend-develop-skill/docs/api.md` - API設計規約
- `docs/design/api/progress_api_design.md` - 進捗APIの設計書

## 11. 承認記録

- **計画書提示日時**: 2026-02-16 15:37
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

## 12. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] utils/validators.ts更新完了
- [ ] progressRoutes.ts更新完了
- [ ] progressController.ts更新完了
- [ ] テストコード更新完了
- [ ] すべてのテスト成功

## 13. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
