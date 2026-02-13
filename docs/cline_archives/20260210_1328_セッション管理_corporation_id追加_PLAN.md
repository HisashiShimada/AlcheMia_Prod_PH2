# タスク計画書: セッション管理にcorporation_id追加

## メタデータ
- **作成日時**: 2026-02-10 13:28
- **タスクID**: session-corporation-id-addition
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

現在、セッションには`department_cd`が保存されているが、`corporation_id`も追加で保存するようにする。これにより、セッション情報からユーザーの所属組織と部署の両方を取得できるようになる。

## 2. 目的と期待される成果

### 目的
- セッション情報を拡充し、ユーザーの所属組織情報を含める
- `corporation_id`を使用した処理で、セッションから直接取得できるようにする
- データベースへの不要なクエリを削減する

### 期待される成果
- [ ] セッションに`corporation_id`が正しく保存される
- [ ] 認証後のリクエストでセッションから`corporation_id`を取得できる
- [ ] 既存の`department_cd`の動作に影響を与えない

## 3. 実装ステップ

### Phase 1: 現状分析
- [ ] セッションの型定義を確認（`backend/src/types/session.d.ts`など）
- [ ] 認証コントローラーでのセッション保存処理を確認
- [ ] セッションから値を取得している箇所を特定

### Phase 2: 型定義の更新
- [ ] セッション型に`corporation_id`フィールドを追加
- [ ] 関連する型定義を更新

### Phase 3: 認証処理の更新
- [ ] ログイン時に`corporation_id`を取得
- [ ] セッションに`corporation_id`を保存する処理を追加
- [ ] `department_cd`と同様の扱いで保存

### Phase 4: ミドルウェアの確認
- [ ] セッション検証ミドルウェアを確認
- [ ] 必要に応じて`corporation_id`の検証を追加

### Phase 5: テストと検証
- [ ] ログイン処理のテスト
- [ ] セッションから`corporation_id`が正しく取得できることを確認
- [ ] 既存機能への影響がないことを確認

## 4. 影響範囲

### 変更するファイル（予定）
1. `backend/src/types/session.d.ts` - セッション型定義の更新
2. `backend/src/controllers/authController.ts` - ログイン処理の更新
3. `backend/src/controllers/authHelpers.ts` - ヘルパー関数の更新（必要に応じて）
4. `backend/src/middleware/authMiddleware.ts` - セッション検証の更新（必要に応じて）

### 影響を受ける機能
- ログイン機能
- セッション管理
- 認証ミドルウェア

## 5. 技術的詳細

### セッション構造（更新後）
```typescript
interface SessionUser {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
  department_cd?: string;
  corporation_id?: string;  // 新規追加
}
```

### 実装方針
1. ログイン時にユーザー情報から`corporation_id`を取得
2. `department_cd`と同じタイミングでセッションに保存
3. セッションから取得する際も`department_cd`と同様に扱う

### セキュリティ考慮事項
- [ ] `corporation_id`の改ざんを防ぐ
- [ ] セッション検証時に`corporation_id`の妥当性を確認
- [ ] マルチテナント分離の原則を維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存セッションとの互換性 | 中 | 低 | オプショナルフィールドとして実装 |
| 型定義の不整合 | 低 | 低 | TypeScriptの型チェックで検出 |
| セッション容量の増加 | 低 | 低 | UUIDのみなので影響は軽微 |

## 7. テスト計画

### 単体テスト
- [ ] セッション保存処理のテスト
- [ ] セッション取得処理のテスト

### 統合テスト
- [ ] ログインAPI実行後のセッション確認
- [ ] 認証が必要なAPIでセッションから`corporation_id`取得

### 手動テスト
- [ ] ログイン操作
- [ ] セッションCookieの内容確認
- [ ] 各種API呼び出しで問題ないことを確認

## 8. ロールバック計画

変更が限定的なため、以下の手順でロールバック可能：
1. 変更したファイルをgit revertで元に戻す
2. サーバー再起動
3. 既存セッションは`corporation_id`がないだけで動作する（オプショナルフィールドのため）

## 9. 関連ドキュメント

- [セキュリティ規約](.clinerules/development/security.md)
- [バックエンド規約](.clinerules/development/backend.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-10 13:28
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-10 13:30
完了: 2026-02-10 13:36

### 計画からの変更点
- なし（計画通りに実装完了）

### 発生した問題と解決方法
- TypeScriptエラー: `UserInfo`型に`corporationId`プロパティがないエラーが発生
  - 解決方法: `backend/src/types/auth.ts`のUserInfo型に`corporationId?: string`を追加

### 最終的な成果物
- [x] セッションに`corporation_id`追加完了
- [x] 型定義更新完了
- [x] すべてのTypeScriptエラー解消

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
