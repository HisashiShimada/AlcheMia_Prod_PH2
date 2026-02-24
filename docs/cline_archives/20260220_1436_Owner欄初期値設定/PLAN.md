# タスク計画書: Owner欄初期値設定

## メタデータ
- **作成日時**: 2026-02-20 14:36
- **タスクID**: owner-initial-value-from-login-user
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

DocumentEditDialog.tsxのOwner欄に、ログインユーザー情報から取得した初期値を自動設定する機能を実装します。

## 2. 目的と期待される成果

### 目的
- Document作成時にOwner情報を手動入力する手間を削減
- ログインユーザー情報との整合性を保つ

### 期待される成果
- [x] ログインユーザー情報からOwnerの初期値（id, name, uuid）を自動生成
- [x] メールアドレスベースのUUID v5生成を実装
- [x] 新規Document作成時に自動的にOwnerが1件設定される

## 3. 実装ステップ

### Phase 1: 調査・分析
- [x] 現在のDocumentEditDialog.tsxのOwner欄実装状況を確認
- [x] ログインユーザー情報の取得方法を調査（localStorage.getItem('userInfo')）
- [x] User型定義を確認（id, username, email）

### Phase 2: UUID v5生成関数の実装
- [ ] メールアドレスベースのUUID v5生成関数を実装
- [ ] UUID v5 namespaceの選定（DNS namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8）

### Phase 3: Owner初期値生成ロジックの実装
- [ ] ログインユーザー情報取得関数を実装
- [ ] Owner用DocumentTagDataの生成関数を実装
- [ ] getInitialDocumentData()のowners配列に初期値を設定

### Phase 4: 動作確認
- [ ] 新規Document作成時にOwnerが自動設定されることを確認
- [ ] 既存Document編集時には既存のOwnerが保持されることを確認
- [ ] UUID v5が正しく生成されることを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` - Owner初期値設定ロジック追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- Document新規作成機能（Owner欄が自動入力される）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- uuid（既存依存関係）: バージョン 9.0.0以上（v5サポート）

### UUID v5生成仕様
```typescript
// メールアドレスベースのUUID v5生成
// namespace: UUID v5 DNS namespace (6ba7b810-9dad-11d1-80b4-00c04fd430c8)
// name: ユーザーのメールアドレス
const ownerUuid = uuidv5(email, uuidv5.DNS);
```

### Owner初期値の構造
```typescript
{
  tagName: 'Owner',
  id: user.id,           // ログインユーザーのID
  uuid: uuidv5(email),   // メールアドレスベースのUUID v5
  name: user.username,   // ログインユーザー名
  description: '',
  annotation: '',
}
```

### セキュリティ考慮事項
- [ ] ログインユーザー情報が存在しない場合のフォールバック処理
- [ ] メールアドレスが存在しない場合のエラーハンドリング

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| localStorage.getItem('userInfo')が取得できない | 中 | 低 | フォールバック: 空配列のまま（手動入力必須） |
| メールアドレスが存在しない | 中 | 低 | ランダムUUID v4を生成して代用 |
| UUID生成ライブラリのバージョン不一致 | 低 | 低 | package.jsonで依存関係を確認 |

## 7. テスト計画

### ユニットテスト
- [ ] UUID v5生成関数のテスト
- [ ] ログインユーザー情報取得関数のテスト
- [ ] Owner初期値生成関数のテスト

### 手動テスト
- [ ] 新規Document作成時のOwner自動設定を確認
- [ ] 既存Document編集時の動作確認
- [ ] ログアウト状態での動作確認（エラーが発生しないこと）

## 8. ロールバック計画

変更は1ファイルのみで、ロジック追加のため影響範囲は限定的です。

**ロールバック手順:**
1. Git revertで変更を取り消す
2. Owner欄は手動入力に戻る

## 9. 関連ドキュメント

- [User型定義](../../../frontend/src/types/auth.ts)
- [DocumentEditDialog実装](../../../frontend/src/components/editorv2/components/DocumentEditDialog.tsx)
- [UUID v5仕様](https://datatracker.ietf.org/doc/html/rfc4122#section-4.3)

## 10. 承認記録

- **計画書提示日時**: 2026-02-20 14:36
- **承認日時**: （承認待ち）
- **承認者コメント**: （なし）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未開始）

### 計画からの変更点
（なし）

### 発生した問題と解決方法
（なし）

### 最終的な成果物
- [ ] Owner欄にログインユーザー情報が自動設定される

## 12. 振り返り

### うまくいった点
（実施後に記載）

### 改善が必要な点
（実施後に記載）

### 学んだこと
（実施後に記載）
