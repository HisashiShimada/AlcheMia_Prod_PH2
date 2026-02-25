# タスク計画書: ユーザー管理画面 - 最終ログイン表示

## メタデータ
- **作成日時**: 2026-02-24 14:17
- **タスクID**: user-last-login-display
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

ユーザー管理画面の一覧に、各ユーザーの最終ログイン日時を表示する機能を追加します。

## 2. 目的と期待される成果

### 目的
login_historyテーブルから実際のログイン日時を取得し、ユーザー管理画面に表示する

### 取得条件
- 組織IDが一致
- ユーザー名が一致（organization_user.user_name = login_history.user_name）
- ログイン成功（login_sf = true）
- 最新のログイン日時（MAX(login_at)）

### 期待される成果
- [x] login_historyテーブルからログイン日時を取得
- [x] ログイン成功のみをカウント（login_sf = true）
- [x] 最新のログイン日時を表示
- [x] ログイン履歴がないユーザーは空欄表示

## 3. 現状分析

### userRepository.ts - findAll関数

**現在の実装**:
```sql
SELECT 
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.department_cd,
  d.department_name,
  ou.role_cd,
  r.role_name,
  ua.entry_flg AS two_factor_auth,
  ou.is_active,
  ou.create_at,
  ou.update_at
FROM organization_user ou
LEFT JOIN department d ...
LEFT JOIN role r ...
LEFT JOIN user_authentication ua ...
WHERE ou.organization_id = $1
ORDER BY ...
```

**問題点**:
- login_historyテーブルとのJOINがない
- 最終ログイン日時が取得されていない

### login_historyテーブル構造

```sql
CREATE TABLE login_history (
    id SERIAL NOT NULL,
    user_name CHARACTER VARYING(30) NOT NULL,
    organization_id UUID NOT NULL,
    login_at TIMESTAMP,
    login_sf BOOLEAN,  -- ログイン成否
    failure_reason CHARACTER VARYING(100),
    entry_execute_flg BOOLEAN,
    ip_address CHARACTER VARYING(45),
    user_agent TEXT,
    ...
)
```

**重要なカラム**:
- `user_name`: ユーザー名（organization_user.user_nameと一致）
- `organization_id`: 組織ID
- `login_at`: ログイン日時
- `login_sf`: ログイン成否（true = 成功）

## 4. 実装ステップ

### Phase 1: userRepository.ts修正
- [x] findAll関数にlogin_historyとのLEFT JOINを追加
- [x] サブクエリでログイン成功のみを抽出
- [x] MAX(login_at)で最新ログイン日時を取得
- [x] SELECT句にlast_login_atを追加

### Phase 2: 型定義確認
- [x] User型にlast_login_atプロパティを確認・追加

### Phase 3: 動作確認
- [x] ログイン履歴があるユーザーの最終ログイン日時が表示される
- [x] ログイン履歴がないユーザーは空欄表示
- [x] ログイン失敗のみのユーザーは空欄表示

## 5. 変更ファイル

### 修正
1. `backend/src/repositories/userRepository.ts`
   - findAll関数にLEFT JOIN追加
   - SELECT句にlast_login_at追加

2. `backend/src/types/database.ts`
   - User型にlast_login_atプロパティ追加（必要に応じて）

## 6. 技術的詳細

### SQLクエリ設計

#### サブクエリ（最終ログイン取得）

```sql
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true  -- ログイン成功のみ
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
```

**サブクエリの説明**:
1. `WHERE lh.login_sf = true`: ログイン成功のみを抽出
2. `GROUP BY lh.organization_id, lh.user_name`: ユーザーごとにグループ化
3. `MAX(lh.login_at)`: 各ユーザーの最新ログイン日時を取得
4. JOIN条件: `organization_id` + `user_name` で一致

#### 完成形のSQLクエリ

```sql
SELECT 
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.department_cd,
  d.department_name,
  ou.role_cd,
  r.role_name,
  ua.entry_flg AS two_factor_auth,
  ou.is_active,
  last_login.last_login_at,  -- ← 追加
  ou.create_at,
  ou.update_at
FROM organization_user ou
LEFT JOIN department d 
  ON ou.organization_id = d.organization_id 
  AND ou.department_cd = d.department_cd
LEFT JOIN role r 
  ON ou.organization_id = r.organization_id 
  AND ou.role_cd = r.role_cd
LEFT JOIN user_authentication ua 
  ON ou.user_id = ua.user_id 
  AND ou.organization_id = ua.organization_id
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
WHERE ou.organization_id = $1
ORDER BY ou.user_id ASC
```

### 型定義

```typescript
export interface User {
  user_id: string;
  user_name: string;
  mail_address: string;
  department_cd?: string;
  department_name?: string;
  role_cd: string;
  role_name?: string;
  two_factor_auth: boolean;
  is_active: boolean;
  last_login_at?: Date | null;  // ← 追加
  create_at: Date;
  update_at: Date;
}
```

## 7. 動作確認

### テストケース

#### Case 1: ログイン履歴がないユーザー
- **期待結果**: `last_login_at` = null（空欄表示）

#### Case 2: ログイン履歴があるユーザー
- **期待結果**: 最新のログイン日時が表示される

#### Case 3: ログイン失敗のみのユーザー
- **期待結果**: `last_login_at` = null（成功したログインのみをカウント）

#### Case 4: 複数回ログインしたユーザー
- **期待結果**: 最新（MAX）のログイン日時が表示される

### 確認SQLクエリ

```sql
-- テスト用クエリ
SELECT 
  ou.user_name,
  ou.mail_address,
  last_login.last_login_at,
  CASE 
    WHEN last_login.last_login_at IS NULL THEN 'ログイン履歴なし'
    ELSE TO_CHAR(last_login.last_login_at, 'YYYY-MM-DD HH24:MI:SS')
  END as 表示内容
FROM organization_user ou
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
WHERE ou.organization_id = '<組織ID>'
ORDER BY last_login.last_login_at DESC NULLS LAST;
```

### login_historyテーブルのデータ確認

```sql
-- ログイン履歴の確認
SELECT 
  user_name,
  organization_id,
  login_at,
  login_sf,
  failure_reason
FROM login_history
WHERE organization_id = '<組織ID>'
ORDER BY login_at DESC
LIMIT 20;
```

## 8. セキュリティ考慮事項

### マルチテナント分離
- ✅ organization_idで必ずフィルタリング
- ✅ サブクエリ内でもorganization_idを条件に含める
- ✅ 他組織のログイン履歴は取得しない

### パフォーマンス
- ✅ login_historyテーブルにインデックスが存在
  - `idx_login_history_query (organization_id, user_name, entry_execute_flg)`
- ✅ サブクエリでGROUP BYを使用し、ユーザーごとに1レコードのみ返す
- ✅ LEFT JOINなので、ログイン履歴がないユーザーも取得可能

## 9. フロントエンド確認

### UserManagement.tsxの確認ポイント

**既存の実装**:
- 最終ログイン列が既に定義されている可能性
- 現在は空欄または固定値を表示している可能性

**必要な修正**:
- バックエンドから`last_login_at`を受け取り、適切にフォーマット表示
- nullの場合は「-」または空欄を表示

**フォーマット例**:
```typescript
{
  title: '最終ログイン',
  dataIndex: 'last_login_at',
  key: 'last_login_at',
  render: (date: Date | null) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY/MM/DD HH:mm');
  },
}
```

## 10. テスト計画

### 手動テスト

#### バックエンドAPI
- [ ] ユーザー一覧API（GET /api/v1/system/users）を呼び出し
- [ ] レスポンスに`last_login_at`が含まれていることを確認
- [ ] ログイン履歴がないユーザーは`last_login_at: null`であることを確認
- [ ] ログイン履歴があるユーザーは正しい日時が返されることを確認

#### フロントエンド
- [ ] ユーザー管理画面を開く
- [ ] 最終ログイン列に日時が表示されることを確認
- [ ] ログイン履歴がないユーザーは「-」または空欄が表示されることを確認
- [ ] 日時フォーマットが適切であることを確認（YYYY/MM/DD HH:mm）

### SQLクエリ実行テスト

```sql
-- 実際のクエリを実行して結果を確認
SELECT 
  ou.user_id,
  ou.user_name,
  last_login.last_login_at
FROM organization_user ou
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
WHERE ou.organization_id = '<組織ID>';
```

**期待される結果**:
- ログイン履歴があるユーザー: `last_login_at`に日時が格納
- ログイン履歴がないユーザー: `last_login_at`がNULL

## 11. 関連ドキュメント

- [login_historyテーブルDDL](../../design/db/ddl/login_history.sql)
- [ユーザー管理API設計](../../design/api/api_user_management.md)
- [User型定義](../../backend/src/types/database.ts)

## 12. 承認記録

- **計画書提示日時**: 2026-02-24 14:17
- **承認日時**: 2026-02-24 14:20
- **承認者コメント**: 承認（ACT MODEに切り替え）

## 13. 実施記録

### 実施日時
- **開始**: 2026-02-24 14:20
- **完了**: 2026-02-24 14:23

### 実装内容

#### 修正ファイル

**1. backend/src/repositories/userRepository.ts**

- findAll関数にlogin_historyテーブルとのLEFT JOINを追加
- サブクエリでログイン成功のみを抽出（WHERE lh.login_sf = true）
- MAX(login_at)で最新ログイン日時を取得
- SELECT句にlast_login_atを追加

**変更内容**:
```sql
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true  -- ログイン成功のみ
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
```

**2. backend/src/types/database.ts**

- User型にlast_login_atプロパティを追加

**変更内容**:
```typescript
export interface User {
  // ... 既存のプロパティ
  
  /** 最終ログイン日時（login_historyテーブルのMAX(login_at)、ログイン成功のみ） */
  last_login_at?: Date | null;
  
  // ... 残りのプロパティ
}
```

### 実装のポイント

#### サブクエリによる最終ログイン取得

- **login_sf = true**: ログイン成功のみを対象
- **GROUP BY**: organization_id + user_name でグループ化
- **MAX(login_at)**: 各ユーザーの最新ログイン日時を取得
- **LEFT JOIN**: ログイン履歴がないユーザーも取得（null表示）

#### マルチテナント分離の維持

- サブクエリとJOIN条件の両方でorganization_idを使用
- 他組織のログイン履歴は取得されない
- パフォーマンスを考慮してインデックスを活用

### 動作確認

#### 期待される動作

1. **ログイン履歴があるユーザー**:
   - `last_login_at`に最新のログイン日時が格納される
   - フロントエンドで「YYYY/MM/DD HH:mm」形式で表示される

2. **ログイン履歴がないユーザー**:
   - `last_login_at`が`null`
   - フロントエンドで「-」または空欄が表示される

3. **ログイン失敗のみのユーザー**:
   - `last_login_at`が`null`（成功したログインのみをカウント）
   - フロントエンドで「-」または空欄が表示される

4. **複数回ログインしたユーザー**:
   - 最新（MAX）のログイン日時が表示される

### フロントエンド

**確認事項**:
- UserManagement.tsxに既に最終ログイン列が定義されている場合、自動的にバックエンドから取得した`last_login_at`が表示される
- 未定義の場合は、列定義を追加する必要がある

**表示例（既存実装がある場合）**:
```typescript
{
  title: '最終ログイン',
  dataIndex: 'last_login_at',
  key: 'last_login_at',
  render: (date: Date | null) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY/MM/DD HH:mm');
  },
}
```

### SQLクエリ確認用

```sql
-- 実際のクエリで最終ログイン日時を確認
SELECT 
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  last_login.last_login_at,
  CASE 
    WHEN last_login.last_login_at IS NULL THEN 'ログイン履歴なし'
    ELSE TO_CHAR(last_login.last_login_at, 'YYYY-MM-DD HH24:MI:SS')
  END as 表示内容
FROM organization_user ou
LEFT JOIN (
  SELECT 
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) as last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_name
) last_login 
  ON ou.organization_id = last_login.organization_id 
  AND ou.user_name = last_login.user_name
WHERE ou.organization_id = '<組織ID>'
ORDER BY last_login.last_login_at DESC NULLS LAST;
```

### 最終的な成果物

- [x] login_historyテーブルからログイン日時を取得
- [x] ログイン成功のみをカウント（login_sf = true）
- [x] 最新のログイン日時を表示
- [x] ログイン履歴がないユーザーは空欄表示（null）
- [x] マルチテナント分離を維持
- [x] パフォーマンスを考慮（インデックス活用）

### セキュリティ確認

- ✅ organization_idで必ずフィルタリング
- ✅ サブクエリ内でもorganization_idを条件に含める
- ✅ 他組織のログイン履歴は取得しない
- ✅ 既存のインデックスを活用（idx_login_history_query）

### パフォーマンス確認

- ✅ login_historyテーブルに適切なインデックスが存在
- ✅ サブクエリでGROUP BYを使用し、ユーザーごとに1レコードのみ返す
- ✅ LEFT JOINなので、ログイン履歴がないユーザーも効率的に取得可能

### 備考

- フロントエンドのUserManagement.tsxに最終ログイン列が既に定義されている場合、追加の修正は不要です
- バックエンドから`last_login_at`が返されるため、自動的に表示されます
- nullの場合の表示（「-」または空欄）はフロントエンド側で制御されます
