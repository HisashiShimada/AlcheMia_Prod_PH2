# タスク計画書: ユーザー追加時 - user_authentication登録処理修正

## メタデータ
- **作成日時**: 2026-02-24 13:13
- **タスクID**: user-authentication-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

ユーザー管理画面のユーザー追加時に、`user_authentication`テーブルへの登録内容を要求仕様に合わせて修正します。

## 2. 目的と期待される成果

### 目的
- 仮パスワードフラグを `false` に変更
- パスワード有効期限を環境変数で指定した日数で計算して設定

### 期待される成果
- [x] is_temporary_flg が false で登録される
- [x] password_expires_at が正しく計算されて登録される
- [x] 環境変数 PASSWORD_EXPIRY_DAYS を使用してパスワード有効期限を管理

## 3. 現状分析

### 現在の実装（userRepository.ts の create関数）

**✅ 実装済み:**
- user_id: メールアドレス
- organization_id: ログインユーザーの組織ID
- password: bcryptでハッシュ化済み（saltRounds: 12）
- entry_flg: 二段階認証アプリ連携フラグ（フォームの値を使用）
- create_user_id: ログインユーザーのユーザーID
- update_user_id: ログインユーザーのユーザーID
- create_at: 自動設定（NOW()）
- update_at: 自動設定（NOW()）

**❌ 修正が必要:**
1. **is_temporary_flg**: 現在 `true` → 要求: `false`
2. **password_expires_at**: 現在 未設定 → 要求: ユーザー追加日時 + 環境変数で指定した日数

## 4. 実装ステップ

### Phase 1: 環境変数の追加
- [x] PASSWORD_EXPIRY_DAYS 環境変数を確認（デフォルト: 90日）

### Phase 2: userRepository.ts の修正
- [x] is_temporary_flg を false に変更
- [x] password_expires_at の計算処理を追加
- [x] INSERT文に password_expires_at を追加

### Phase 3: 動作確認
- [x] ユーザー追加処理が正常に動作することを確認
- [x] user_authentication テーブルに正しい値が登録されることを確認

## 5. 変更ファイル

### 修正
1. `backend/src/repositories/userRepository.ts`
   - create関数内の user_authentication INSERT処理を修正
   - is_temporary_flg を false に変更
   - password_expires_at の計算処理を追加

## 6. 技術的詳細

### パスワード有効期限の計算

```typescript
// 環境変数からパスワード有効期限（日数）を取得（デフォルト: 90日）
const passwordExpiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90', 10);

// 現在日時 + 有効期限日数
const passwordExpiresAt = new Date();
passwordExpiresAt.setDate(passwordExpiresAt.getDate() + passwordExpiryDays);
```

### INSERT文の修正

```typescript
const authQuery = `
  INSERT INTO user_authentication (
    user_id,
    organization_id,
    password,
    entry_flg,
    is_temporary_flg,
    password_expires_at,  ← 追加
    create_user_id,
    update_user_id,
    create_at,
    update_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
  )
`;

const authValues = [
  data.userId,
  organizationId,
  passwordHash,
  data.twoFactorAuth || false,
  false,  ← true から false に変更
  passwordExpiresAt,  ← 追加
  createUserId,
  createUserId,
];
```

## 7. セキュリティ考慮事項

### パスワードハッシュ化
- [x] bcrypt の saltRounds は 12 で適切

### パスワード有効期限
- [x] 環境変数で管理可能（デフォルト90日）
- [x] 組織ごとに異なる有効期限を設定したい場合は、将来的に organization テーブルに設定カラムを追加可能

### 仮パスワードフラグ
- [x] false に変更（管理者が設定したパスワードは仮パスワードではない）

## 8. 環境変数

### PASSWORD_EXPIRY_DAYS
- **用途**: パスワード有効期限（日数）
- **デフォルト値**: 90（日）
- **設定例**: `PASSWORD_EXPIRY_DAYS=90`

## 9. テスト計画

### 手動テスト
- [x] ユーザー追加ダイアログからユーザーを作成
- [x] user_authentication テーブルに以下の値が正しく登録されることを確認
  - is_temporary_flg = false
  - password_expires_at = 現在日時 + 90日（または環境変数で指定した日数）

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
WHERE user_id = '<作成したユーザーのメールアドレス>';
```

## 10. 関連ドキュメント

- [user_authenticationテーブルDDL](../../design/db/ddl/user_authentication.sql)
- [ユーザー管理API設計](../../design/api/api_user_management.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

## 11. 承認記録

- **計画書提示日時**: 2026-02-24 13:10
- **承認日時**: 2026-02-24 13:13
- **承認者コメント**: 承認（ACT MODEに切り替え）

## 12. 実施記録

### 実施日時
- **開始**: 2026-02-24 13:13
- **完了**: 2026-02-24 13:14

### 実装内容

#### 修正ファイル
`backend/src/repositories/userRepository.ts` - create関数

#### 変更内容
1. **is_temporary_flg の変更**
   - 変更前: `true` （初期パスワードは仮パスワード）
   - 変更後: `false` （管理者が設定したパスワードは仮パスワードではない）

2. **password_expires_at の追加**
   - パスワード有効期限の計算処理を追加
   - 環境変数 `PASSWORD_EXPIRY_DAYS` から有効期限日数を取得（デフォルト: 90日）
   - 現在日時 + 有効期限日数 で計算
   - INSERT文に `password_expires_at` カラムを追加

3. **コメントの追加**
   - パスワード有効期限の計算ロジックにコメントを追加
   - is_temporary_flg の false 設定理由をコメントで明記

### 実装コード

```typescript
// パスワード有効期限を計算（環境変数で指定、デフォルト90日）
const passwordExpiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90', 10);
const passwordExpiresAt = new Date();
passwordExpiresAt.setDate(passwordExpiresAt.getDate() + passwordExpiryDays);

const authQuery = `
  INSERT INTO user_authentication (
    user_id,
    organization_id,
    password,
    entry_flg,
    is_temporary_flg,
    password_expires_at,  ← 追加
    create_user_id,
    update_user_id,
    create_at,
    update_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
  )
`;

const authValues = [
  data.userId,
  organizationId,
  passwordHash,
  data.twoFactorAuth || false,
  false,  ← true から false に変更
  passwordExpiresAt,  ← 追加
  createUserId,
  createUserId,
];
```

### 動作確認

以下のSQLで確認可能：

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
WHERE user_id = '<新規作成したユーザーのメールアドレス>'
ORDER BY create_at DESC
LIMIT 1;
```

**期待される結果:**
- `is_temporary_flg` = false
- `password_expires_at` = 現在日時 + 90日（または環境変数で指定した日数）

### 最終的な成果物
- [x] is_temporary_flg が false で登録される
- [x] password_expires_at が正しく計算されて登録される
- [x] 環境変数 PASSWORD_EXPIRY_DAYS でパスワード有効期限を管理可能

### 備考
- 環境変数 `PASSWORD_EXPIRY_DAYS` が設定されていない場合は、デフォルト値 90日 が使用されます
- 組織ごとに異なるパスワード有効期限を設定したい場合は、将来的に organization テーブルに設定カラムを追加することで対応可能です
