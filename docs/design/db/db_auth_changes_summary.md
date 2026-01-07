# 認証機能実装に伴うデータベース変更サマリー

## メタデータ
- **作成日**: 2026-01-06
- **バージョン**: 1.0.0
- **最終更新**: 2026-01-06
- **担当**: Development Team

---

## 概要

login-screen および auth-backend-api タスクの実装に必要なデータベース変更をまとめたドキュメントです。

**参照ドキュメント:**
- [login-screen 要件書](../../.kiro/specs/login-screen/requirements.md)
- [auth-backend-api 要件書](../../.kiro/specs/auth-backend-api/requirements.md)
- [認証データベース設計書](db_auth.md)

---

## 1. 新規テーブル

### 1.1. pin_codes テーブル ⭐新規作成

**目的:** メールPINコード二段階認証の実装

**作成理由:**
- メールで送信される6桁のPINコードを保存・管理
- 有効期限（5分）と試行回数制限（3回）の管理
- 一時的なデータで頻繁な書き込み・削除が発生するため、専用テーブルが必要

#### DDL

```sql
CREATE TABLE pin_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  pin_code VARCHAR(6) NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_pin_codes_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES organization_user(user_id, organization_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT chk_pin_codes_pin_format 
    CHECK (pin_code ~ '^[0-9]{6}$'),
  
  CONSTRAINT chk_pin_codes_attempts 
    CHECK (attempts_count >= 0 AND attempts_count <= max_attempts)
);
```

#### インデックス

```sql
CREATE UNIQUE INDEX idx_pin_codes_pin_session ON pin_codes(pin_code, session_token);
CREATE INDEX idx_pin_codes_user ON pin_codes(user_id, org_id);
CREATE INDEX idx_pin_codes_token ON pin_codes(session_token);
CREATE INDEX idx_pin_codes_expires ON pin_codes(expires_at);
CREATE INDEX idx_pin_codes_is_used ON pin_codes(is_used);
```

#### カラム定義

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | PINコードID（主キー） |
| user_id | VARCHAR(30) | NOT NULL | - | ユーザーID（FK to organization_user） |
| org_id | UUID | NOT NULL | - | 組織ID（FK to organization_user） |
| pin_code | VARCHAR(6) | NOT NULL | - | PINコード（6桁数字：000000-999999） |
| session_token | VARCHAR(255) | NOT NULL | - | 仮セッショントークン（temp_session-{id}_{timestamp}） |
| is_used | BOOLEAN | NOT NULL | false | 使用済みフラグ |
| used_at | TIMESTAMP | NULL | - | 使用日時 |
| expires_at | TIMESTAMP | NOT NULL | - | 有効期限（作成時刻 + 5分） |
| attempts_count | INTEGER | NOT NULL | 0 | 入力試行回数（0-3） |
| max_attempts | INTEGER | NOT NULL | 3 | 最大試行回数 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

#### 関連する要件

- **Requirement 3** (login-screen): PINコード二段階認証
- **要件1.2** (auth-backend-api): PINコード生成と送信
- **要件2.1** (auth-backend-api): PINコード検証
- **要件3.1** (auth-backend-api): PINコード再送信

---

## 2. 既存テーブルへのカラム追加

### 2.1. login_history テーブル（オプション追加）

**目的:** セキュリティ監査とレート制限の強化

**追加カラム:**
- `ip_address` - クライアントのIPアドレス
- `user_agent` - クライアントのUser-Agent情報

#### DDL

```sql
ALTER TABLE login_history
ADD COLUMN ip_address VARCHAR(45),    -- IPv4/IPv6対応
ADD COLUMN user_agent TEXT;           -- ブラウザ・OS情報
```

#### 追加インデックス

```sql
-- レート制限判定用インデックス
CREATE INDEX idx_login_history_rate_limit 
  ON login_history(org_cd, user_id, login_at, login_sf);
```

#### カラム定義

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| ip_address | VARCHAR(45) | NULL | - | クライアントIPアドレス（IPv4/IPv6対応） |
| user_agent | TEXT | NULL | - | クライアントのUser-Agent情報 |

**注意:** 
- 両カラムともNULL許容のため、既存データへの影響なし
- オプション追加であり、必須ではない
- セキュリティ監査を強化する場合に推奨

#### 関連する要件

- **要件7.1** (auth-backend-api): ログイン試行のレート制限
- **要件9.2** (auth-backend-api): ログイン試行履歴の記録
- **Requirement 8** (login-screen): セキュリティ対策

---

## 3. 既存テーブル（変更なし）

以下のテーブルは**変更なし**で、そのまま活用します。

### 3.1. organization_user テーブル

**活用方法:**
- ユーザー基本情報の管理
- メールアドレス（`mail_address`）はPINコード送信先として使用
- ロール（`role`）でRBAC（ロールベースアクセス制御）
- アカウント有効性（`is_active`）の管理

**変更:** なし

### 3.2. user_authentication テーブル

**活用方法:**
- パスワードハッシュの保存・検証
- bcryptでハッシュ化されたパスワードを`password`カラムに保存
- `entry_flg`は将来的な2FAアプリ連携用（現在は未使用）

**変更:** なし

### 3.3. login_history テーブル（基本構造）

**既存構造:**
```sql
CREATE TABLE login_history (
  id VARCHAR(30) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  org_cd VARCHAR(30) NOT NULL,
  login_at TIMESTAMP,
  login_sf VARCHAR(10),            -- ログイン成否（success/failure）
  failure_reason VARCHAR(100)
);
```

**活用方法:**
- ログイン試行履歴の記録
- レート制限判定（15分以内の失敗回数カウント）
- セキュリティ監査

**注意:** `org_cd`を使用（`org_id`ではない）

---

## 4. マイグレーションスクリプト

### 4.1. Migration 003: pin_codes テーブル作成

**ファイル名:** `003_create_pin_codes_table.sql`

```sql
-- Description: 二段階認証用PINコードテーブルを作成

BEGIN;

CREATE TABLE IF NOT EXISTS pin_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  pin_code VARCHAR(6) NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_pin_codes_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES organization_user(user_id, organization_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT chk_pin_codes_pin_format 
    CHECK (pin_code ~ '^[0-9]{6}$'),
  
  CONSTRAINT chk_pin_codes_attempts 
    CHECK (attempts_count >= 0 AND attempts_count <= max_attempts)
);

-- インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_pin_codes_pin_session 
  ON pin_codes(pin_code, session_token);
CREATE INDEX IF NOT EXISTS idx_pin_codes_user 
  ON pin_codes(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_pin_codes_token 
  ON pin_codes(session_token);
CREATE INDEX IF NOT EXISTS idx_pin_codes_expires 
  ON pin_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_pin_codes_is_used 
  ON pin_codes(is_used);

COMMIT;
```

### 4.2. Migration 004: login_history テーブル拡張（オプション）

**ファイル名:** `004_add_security_columns_to_login_history.sql`

```sql
-- Description: IPアドレス、User-Agentカラムを追加（オプション）

BEGIN;

ALTER TABLE login_history
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- レート制限判定用インデックス
CREATE INDEX IF NOT EXISTS idx_login_history_rate_limit 
  ON login_history(org_cd, user_id, login_at, login_sf);

COMMIT;
```

### 4.3. ロールバック用スクリプト

```sql
-- 004_rollback_login_history.sql
BEGIN;
ALTER TABLE login_history
DROP COLUMN IF EXISTS ip_address,
DROP COLUMN IF EXISTS user_agent;
DROP INDEX IF EXISTS idx_login_history_rate_limit;
COMMIT;

-- 003_rollback_pin_codes.sql
BEGIN;
DROP TABLE IF EXISTS pin_codes CASCADE;
COMMIT;
```

---

## 5. データメンテナンス

### 5.1. 期限切れPINコードの自動削除

**実行頻度:** 1時間ごと

```sql
DELETE FROM pin_codes
WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
```

**実装場所:** バックエンドのcronジョブまたはスケジューラー

### 5.2. 古いログイン履歴の削除

**実行頻度:** 毎日

```sql
-- 90日以上前のログイン履歴を削除
DELETE FROM login_history
WHERE login_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
```

**注意:** Admin権限のログイン履歴は監査目的で保持する場合は、WHERE句に条件を追加

---

## 6. 影響評価

### 6.1. 既存システムへの影響: **最小限**

| 変更内容 | 影響度 | 理由 |
|---------|--------|------|
| pin_codesテーブル新規作成 | **なし** | 独立した新規テーブルで既存テーブルに影響なし |
| login_historyカラム追加 | **最小** | NULL許容カラムのため既存クエリに影響なし（オプション） |
| organization_user | **なし** | 変更なし、そのまま活用 |
| user_authentication | **なし** | 変更なし、そのまま活用 |

### 6.2. パフォーマンスへの影響

- **pin_codesテーブル**: 一時的なデータで定期削除されるため、テーブルサイズは小さい
- **login_historyカラム追加**: 文字列カラムの追加のみで、パフォーマンス影響は軽微
- **インデックス追加**: レート制限判定クエリのパフォーマンス向上に寄与

---

## 7. セキュリティ考慮事項

### 7.1. PINコード管理

- **生成方法**: `crypto.randomInt(100000, 999999)` - 暗号学的に安全な乱数生成
- **有効期限**: 5分（短期間のみ有効）
- **試行回数制限**: 3回まで
- **使用後処理**: 即座に削除（再利用不可）

### 7.2. パスワードハッシュ化

- **アルゴリズム**: bcrypt
- **ラウンド数**: Admin権限 14 rounds、その他 12 rounds
- **保存先**: `user_authentication.password`カラム

### 7.3. レート制限

- **ログイン試行**: 15分以内に5回まで
- **PINコード入力**: 5分以内に3回まで
- **PINコード再送信**: 15分以内に3回まで

---

## 8. 変更サマリー一覧

### 新規テーブル

| テーブル名 | 目的 | 主要カラム | 優先度 |
|-----------|------|-----------|--------|
| pin_codes | PINコード二段階認証 | pin_code, session_token, expires_at | **必須** |

### カラム追加（既存テーブル）

| テーブル名 | 追加カラム | 型 | NULL | 優先度 |
|-----------|-----------|-----|------|--------|
| login_history | ip_address | VARCHAR(45) | NULL | オプション |
| login_history | user_agent | TEXT | NULL | オプション |

### 変更なし（既存テーブル）

| テーブル名 | 活用方法 |
|-----------|---------|
| organization_user | ユーザー基本情報、メールアドレス、ロール管理 |
| user_authentication | パスワードハッシュ保存・検証 |
| login_history（基本構造） | ログイン履歴記録、レート制限判定 |

---

## 9. 実装チェックリスト

### Phase 1: データベース準備

- [ ] `003_create_pin_codes_table.sql` マイグレーションスクリプト作成
- [ ] `004_add_security_columns_to_login_history.sql` マイグレーションスクリプト作成（オプション）
- [ ] ロールバックスクリプト作成
- [ ] 開発環境でマイグレーション実行
- [ ] テストデータ投入

### Phase 2: バックエンド実装

- [ ] PINコード生成・保存ロジック実装
- [ ] PINコード検証ロジック実装
- [ ] PINコード再送信ロジック実装
- [ ] 期限切れPINコード自動削除ジョブ実装
- [ ] レート制限ミドルウェア実装
- [ ] ログイン履歴記録（IPアドレス、User-Agent含む）

### Phase 3: テスト

- [ ] pin_codesテーブルのCRUD操作テスト
- [ ] PINコード有効期限テスト
- [ ] PINコード試行回数制限テスト
- [ ] レート制限テスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト

### Phase 4: 本番環境デプロイ

- [ ] マイグレーションスクリプトレビュー
- [ ] 本番環境でマイグレーション実行
- [ ] データベーススキーマ確認
- [ ] インデックス作成確認
- [ ] ロールバック手順確認

---

## 10. 関連ドキュメント

- [認証データベース設計書](db_auth.md)
- [認証API仕様書](../api/api_auth.md)
- [login-screen 要件書](../../.kiro/specs/login-screen/requirements.md)
- [auth-backend-api 要件書](../../.kiro/specs/auth-backend-api/requirements.md)
- [認証機能バックエンド実装計画書](../../20251229_1451_認証機能バックエンド実装_PLAN.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-06 | 初版作成 | Development Team |
