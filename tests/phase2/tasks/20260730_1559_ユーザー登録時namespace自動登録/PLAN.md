# タスク計画書: ユーザー登録時namespace自動登録の修正・実装

## メタデータ
- **作成日時**: 2026-07-30 15:59
- **タスクID**: user-namespace-registration
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

ユーザー登録時に `namespace` テーブルへのレコード自動登録を正しく実装する。
現状の実装には以下の問題がある：

1. `userService.createUser()` でnamespace登録処理はあるが、try-catchで失敗を握り込んでおりユーザー作成とアトミックになっていない
2. `userService.uploadUsersFromCSV()` (CSV一括登録) にはnamespace登録処理が未実装
3. `backend/migrations/20260724_namespace_unique_organization_id.sql` という誤ったマイグレーションファイルが存在する（実DBには未反映）

## 目的と期待される成果

- [ ] ユーザー作成とnamespace登録を同一トランザクション内で実行し、失敗時は両方ロールバックされること
- [ ] CSVアップロード経由のユーザー作成でもnamespace登録が行われること
- [ ] namespace登録失敗時にはユーザー登録もエラーになること（握り込みを廃止）
- [ ] 誤ったマイグレーションファイルを削除すること

## 実装ステップ

### Phase 1: 誤ったマイグレーションファイルの削除
- [ ] `backend/migrations/20260724_namespace_unique_organization_id.sql` を削除

### Phase 2: userRepository.create() の修正
- [ ] `userRepository.create()` がトランザクションオブジェクト `t` を外部から受け取れるように修正
  - トランザクションオブジェクトが渡された場合は、それを使ってクエリを実行
  - 渡されなかった場合は、従来通り内部でトランザクションを作成
  - インターフェースに影響が出ないよう下位互換を維持

### Phase 3: userService.ts の修正
- [ ] 共通ヘルパー関数 `registerUserNamespace(t, organizationId, userId)` を追加
  - 組織CDの取得
  - namespace URI生成（既存の `generateNamespaceUri` を使用）
  - URI重複チェック
  - namespaceレコードのINSERT
- [ ] `createUser()` を修正
  - `pgp.tx()` を `createUser()` 側で起動
  - 同一トランザクション内で `userRepository.create(t, ...)` と `registerUserNamespace(t, ...)` を実行
  - 既存の try-catchによる握り込みコードを削除
- [ ] `uploadUsersFromCSV()` を修正
  - 既存のトランザクション内で各ユーザーの `registerUserNamespace(t, ...)` を呼び出す処理を追加
  - 失敗時はそのままthrowして全体ロールバック

## 影響範囲

### 削除するファイル
1. `backend/migrations/20260724_namespace_unique_organization_id.sql` - 誤ったUNIQUE制約追加マイグレーション

### 変更するファイル
1. `backend/src/repositories/userRepository.ts` - `create()` にトランザクション引数対応
2. `backend/src/services/userService.ts` - `createUser()` / `uploadUsersFromCSV()` の修正、共通ヘルパー追加

### 影響を受ける機能
- ユーザー管理画面 (SystemManagement/UserManagement.tsx) からのユーザー個別追加
- CSV一括インポート機能

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| userRepository.create()の既存呼び出し元との非互換 | 高 | 低 | デフォルト引数でトランザクションオブジェクトをoptionalにして下位互換を維持 |
| CSVアップロードで大量ユーザー登録時のnamespace重複URI | 中 | 中 | 既存の重複チェックロジック（連番サフィックス付与）をCSVにも適用 |

## テスト計画

### 手動テスト
- [ ] ユーザー新規作成時にnamespaceレコードが1件追加されることを確認
- [ ] CSVアップロードで複数ユーザー登録時、各ユーザー分のnamespaceレコードが作成されることを確認
- [ ] namespace登録が失敗するケースで、ユーザー登録もロールバックされることを確認（エラーが返却されること）
- [ ] CSVアップロードで1行でもnamespace登録に失敗した場合、全件ロールバックされることを確認

## 承認記録

- **計画書提示日時**: 2026-07-30 15:59
- **承認日時**: 2026-07-30 15:59
- **承認者コメント**: Actモードに切り替えて承認

## 実施記録

### 実施日時
開始: 2026-07-30 16:00
完了: 2026-07-30 16:03

### 計画からの変更点
- `uploadUsersFromCSV()` のメール送信処理をトランザクション外に移動（トランザクション内での副作用を排除）
  - メール送信のために `createdUsers` リストにトランザクション内で収集し、トランザクションコミット後に送信する方式に変更

### 最終的な成果物
- [x] 誤ったマイグレーションファイルの削除（`backend/migrations/20260724_namespace_unique_organization_id.sql`）
- [x] userRepository.create() のトランザクション引数対応（`externalTx?: ITask<unknown>` 引数追加）
- [x] userService.ts の修正
  - 共通ヘルパー `registerUserNamespace()` 追加
  - `createUser()`: ユーザー作成 + namespace登録を同一トランザクションで実行、握り込みコードを削除
  - `uploadUsersFromCSV()`: 組織CD取得 + 外部トランザクション渡し + namespace登録追加、メール送信をトランザクション外に移動
- [x] TypeScriptビルドエラーなし確認（`tsc --noEmit` exit:0）
### 目的と期待される成果
- [x] ユーザー作成とnamespace登録を同一トランザクション内で実行し、失敗時は両方ロールバックされること
- [x] CSVアップロード経由のユーザー作成でもnamespace登録が行われること
- [x] namespace登録失敗時にはユーザー登録もエラーになること（握り込みを廃止）
- [x] 誤ったマイグレーションファイルを削除すること
