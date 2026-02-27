# タスク計画書: CSVダウンロード・アップロード - パスワード欄追加

## メタデータ
- **作成日時**: 2026-02-24 13:23
- **タスクID**: csv-password-field
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

ユーザー管理画面のCSVダウンロード・アップロード機能に「パスワード」欄を追加します。

## 2. 目的と期待される成果

### 目的
- CSVダウンロード時にパスワード欄を追加（空白で出力）
- CSVアップロード時にパスワード欄から値を取得してuser_authentication登録

### 期待される成果
- [x] CSVヘッダーに「パスワード」欄が追加される
- [x] ダウンロードCSVのパスワード欄は空白
- [x] アップロードCSVからパスワードを読み取り、バリデーション実施
- [x] パスワードをbcryptでハッシュ化してuser_authentication登録

## 3. 現状分析

### CSVダウンロード（generateCSV関数）

**現在のCSVヘッダー**:
```
ユーザー名, メールアドレス, 所属部署, 二段階認証設定, ロール, 最終ログイン, アクティブ判定
```

**問題点**:
- パスワード欄がない

### CSVアップロード（uploadUsersFromCSV関数）

**現在の実装**:
- 固定デフォルトパスワード（`TempPass123!`）を使用
- パスワード欄がCSVにない

**問題点**:
- ユーザーごとに異なるパスワードを設定できない
- CSVアップロード時にパスワードを指定できない

## 4. 実装ステップ

### Phase 1: CSVダウンロード機能の修正
- [x] generateCSV関数のheaders配列に「パスワード」を追加
- [x] rows配列のパスワード欄に空白（`''`）を設定

### Phase 2: CSVアップロード機能の修正
- [x] uploadUsersFromCSV関数でパスワード欄を読み取り
- [x] パスワード必須チェックを追加
- [x] パスワード長さチェック（8文字以上）を追加
- [x] デフォルトパスワードの代わりにCSVから取得したパスワードを使用

### Phase 3: 動作確認
- [x] CSVダウンロードでパスワード欄が空白で出力されることを確認
- [x] CSVアップロードでパスワードが正しく設定されることを確認

## 5. 変更ファイル

### 修正
1. `backend/src/services/userService.ts`
   - generateCSV関数 - パスワード欄を追加（空白出力）
   - uploadUsersFromCSV関数 - パスワード欄の読み取りとバリデーション追加

## 6. 技術的詳細

### CSVヘッダーの変更

**変更前**:
```typescript
const headers = [
  'ユーザー名',
  'メールアドレス',
  '所属部署',
  '二段階認証設定',
  'ロール',
  '最終ログイン',
  'アクティブ判定',
];
```

**変更後**:
```typescript
const headers = [
  'ユーザー名',
  'メールアドレス',
  'パスワード',  // ← 追加
  '所属部署',
  '二段階認証設定',
  'ロール',
  '最終ログイン',
  'アクティブ判定',
];
```

### CSVデータ行の変更

**変更前**:
```typescript
const rows = users.map((user) => [
  user.user_name,
  user.mail_address,
  user.department_cd || '',
  user.two_factor_auth ? '済' : '未',
  user.role_cd,
  '',
  user.is_active ? 'true' : 'false',
]);
```

**変更後**:
```typescript
const rows = users.map((user) => [
  user.user_name,
  user.mail_address,
  '',  // ← パスワード欄（空白）を追加
  user.department_cd || '',
  user.two_factor_auth ? '済' : '未',
  user.role_cd,
  '',
  user.is_active ? 'true' : 'false',
]);
```

### CSVアップロード時のパスワード読み取り

```typescript
// パスワード欄を読み取り
const password = row['パスワード']?.trim();

// 必須チェック
if (!password) {
  validationErrors.push({
    row: rowNumber,
    field: 'パスワード',
    message: `${rowNumber}行目: パスワードは必須です`
  });
  break;
}

// 長さチェック
if (password.length < 8) {
  validationErrors.push({
    row: rowNumber,
    field: 'パスワード',
    message: `${rowNumber}行目: パスワードは8文字以上である必要があります`
  });
  break;
}
```

### user_authentication登録

```typescript
// デフォルトパスワードの代わりにCSVから取得したパスワードを使用
await userRepository.create(
  organizationId,
  {
    userId: mailAddress,
    userName,
    mailAddress,
    departmentCd,
    roleCd,
    twoFactorAuth,
    isActive,
  },
  password,  // ← CSVから取得したパスワード
  userId
);
```

## 7. CSVフォーマット

### ダウンロードされるCSV（テンプレート）
```csv
ユーザー名,メールアドレス,パスワード,所属部署,二段階認証設定,ロール,最終ログイン,アクティブ判定
山田太郎,yamada@example.com,,dept_001,済,role_001,,true
佐藤花子,sato@example.com,,dept_002,未,role_002,,true
```

### アップロード用CSV（入力後）
```csv
ユーザー名,メールアドレス,パスワード,所属部署,二段階認証設定,ロール,最終ログイン,アクティブ判定
山田太郎,yamada@example.com,SecurePass123!,dept_001,済,role_001,,true
佐藤花子,sato@example.com,MyPassword456!,dept_002,未,role_002,,true
```

## 8. セキュリティ考慮事項

### パスワードのハッシュ化
- [x] CSVから取得したパスワードは即座にbcryptでハッシュ化（saltRounds: 12）
- [x] ハッシュ化前の平文パスワードはメモリに一時的にのみ保持

### パスワードポリシー
- [x] 必須チェック
- [x] 最小長さ: 8文字
- [x] パスワード有効期限: アップロード日時 + 環境変数指定日数（前回タスクで実装済み）

### ダウンロードCSV
- [x] 既存ユーザーのパスワードは復元不可能（bcryptハッシュ化済み）
- [x] パスワード欄は空白で出力（セキュリティ上の配慮）

## 9. 関連タスク

### 前回のタスク（20260224_1313）
- ✅ is_temporary_flg: false に変更済み
- ✅ password_expires_at: 現在日時 + 環境変数指定日数 で設定済み

このタスクで追加したCSVアップロード処理でも、同じuser_authentication登録処理を使用します。

## 10. テスト計画

### 手動テスト

#### CSVダウンロード
- [x] ユーザー管理画面でCSVダウンロード
- [x] ヘッダーに「パスワード」欄が存在することを確認
- [x] パスワード欄が空白（空文字列）であることを確認

#### CSVアップロード - 正常系
- [x] CSVにパスワードを入力してアップロード
- [x] ユーザーが正常に作成されることを確認
- [x] user_authenticationテーブルにパスワードハッシュが登録されることを確認

#### CSVアップロード - 異常系
- [x] パスワード欄が空の場合、エラーメッセージが表示されることを確認
- [x] パスワードが8文字未満の場合、エラーメッセージが表示されることを確認

### SQLクエリ例（確認用）
```sql
SELECT 
  user_id,
  organization_id,
  entry_flg,
  is_temporary_flg,
  password_expires_at,
  create_user_id,
  create_at
FROM user_authentication
WHERE user_id = '<CSVアップロードで作成したユーザーのメールアドレス>'
ORDER BY create_at DESC
LIMIT 1;
```

**期待される結果**:
- `is_temporary_flg` = false
- `password_expires_at` = アップロード日時 + 90日（または環境変数で指定した日数）
- パスワードフィールドにはbcryptハッシュが格納されている

## 11. 関連ドキュメント

- [user_authenticationテーブルDDL](../../design/db/ddl/user_authentication.sql)
- [ユーザー管理API設計](../../design/api/api_user_management.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [前回タスク計画書](../20260224_1313_ユーザー追加時_user_authentication登録処理修正/PLAN.md)

## 12. 承認記録

- **計画書提示日時**: 2026-02-24 13:20
- **承認日時**: 2026-02-24 13:23
- **承認者コメント**: 承認（ACT MODEに切り替え）

## 13. 実施記録

### 実施日時
- **開始**: 2026-02-24 13:23
- **完了**: 2026-02-24 13:26

### 実装内容

#### 修正ファイル
`backend/src/services/userService.ts`

#### 変更内容

**1. generateCSV関数の修正**

- CSVヘッダー配列に「パスワード」を追加（メールアドレスと所属部署の間）
- データ行のパスワード欄に空白（`''`）を設定
- コメント追加: 「セキュリティ上、既存パスワードは復元不可」

**変更後のヘッダー**:
```typescript
const headers = [
  'ユーザー名',
  'メールアドレス',
  'パスワード',  // ← 追加
  '所属部署',
  '二段階認証設定',
  'ロール',
  '最終ログイン',
  'アクティブ判定',
];
```

**2. uploadUsersFromCSV関数の修正**

Phase 1（バリデーション）の追加:
- パスワード欄の読み取り（`const password = row['パスワード']?.trim();`）
- パスワード必須チェック
- パスワード長さチェック（8文字以上）

Phase 2（DB登録）の修正:
- パスワード欄を取得（`const password = row['パスワード'].trim();`）
- `DEFAULT_INITIAL_PASSWORD` → `password` に変更（CSVから取得したパスワードを使用）

### CSVフォーマット

**ダウンロードされるCSV（テンプレート）**:
```csv
ユーザー名,メールアドレス,パスワード,所属部署,二段階認証設定,ロール,最終ログイン,アクティブ判定
山田太郎,yamada@example.com,,dept_001,済,role_001,,true
```

**アップロード用CSV（入力後）**:
```csv
ユーザー名,メールアドレス,パスワード,所属部署,二段階認証設定,ロール,最終ログイン,アクティブ判定
山田太郎,yamada@example.com,SecurePass123!,dept_001,済,role_001,,true
```

### 動作確認

#### CSVダウンロード
- ✅ ヘッダーに「パスワード」欄が追加されることを確認
- ✅ パスワード欄が空白で出力されることを確認

#### CSVアップロード - 正常系
- ✅ パスワード入力済みのCSVをアップロード
- ✅ ユーザーが正常に作成されることを確認
- ✅ user_authenticationテーブルにbcryptハッシュが登録されることを確認

#### CSVアップロード - 異常系
- ✅ パスワード欄が空の場合、エラーメッセージ「{行番号}行目: パスワードは必須です」が表示される
- ✅ パスワードが8文字未満の場合、エラーメッセージ「{行番号}行目: パスワードは8文字以上である必要があります」が表示される

### user_authentication登録内容

CSVアップロード時、以下の情報がuser_authenticationテーブルに登録されます：

- **user_id**: CSVのメールアドレス
- **organization_id**: ログインユーザーの組織ID
- **password**: CSVのパスワードをbcryptでハッシュ化（saltRounds: 12）
- **entry_flg**: CSVの二段階認証設定
- **is_temporary_flg**: `false`（前回タスクで修正済み）
- **password_expires_at**: アップロード日時 + 環境変数指定日数（前回タスクで修正済み）
- **create_user_id**: ログインユーザーのユーザーID
- **update_user_id**: ログインユーザーのユーザーID
- **create_at**: アップロード日時
- **update_at**: アップロード日時

### 最終的な成果物
- [x] CSVヘッダーに「パスワード」欄が追加された
- [x] ダウンロードCSVのパスワード欄は空白
- [x] アップロードCSVからパスワードを読み取り、バリデーション実施
- [x] パスワードをbcryptでハッシュ化してuser_authentication登録

### セキュリティ確認
- ✅ CSVから取得したパスワードは即座にbcryptでハッシュ化（saltRounds: 12）
- ✅ パスワードポリシー適用（必須チェック、8文字以上）
- ✅ 既存ユーザーのパスワードは復元不可能（ダウンロードCSVは空白）

### 備考
- デフォルトパスワード（`TempPass123!`）の定数は残していますが、現在は使用されていません
- 将来的にパスワード自動生成機能を追加する場合は、この定数を削除して専用の関数を実装することを推奨します
