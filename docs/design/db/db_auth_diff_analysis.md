# 認証機能実装のための既存テーブル分析と追加要件

## メタデータ
- **作成日**: 2025-12-29
- **バージョン**: 1.0.0
- **担当**: Backend Development Team

---

## 1. 既存テーブル構造の確認

### 1.1. 既存の認証関連テーブル

既存のER図（`er_diagram.a5er`）から、以下のテーブルが確認できました：

| テーブル物理名 | テーブル論理名 | 主な用途 |
|---------------|--------------|---------|
| `organization` | 組織 | 組織情報管理 |
| `org_user` | 組織利用者 | ユーザー情報管理（組織ごと） |
| `user_authentication` | 利用者認証 | パスワード情報管理 |
| `login_history` | ログイン履歴 | ログイン試行履歴 |
| `corporation` | 会社 | 会社情報管理（親組織） |
| `role_permission` | ロール権限 | ロール別機能権限管理 |
| `function` | 機能 | 機能マスタ |
| `code_master` | コードマスタ | コード値管理 |

---

## 2. 既存テーブルの詳細構造

### 2.1. organization（組織）テーブル

```sql
CREATE TABLE organization (
  org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name VARCHAR(50),
  org_display_name VARCHAR(50),
  org_email VARCHAR(50),
  corp_cd VARCHAR(30),  -- FK to corporation
  is_active BOOLEAN,
  create_at TIMESTAMP,
  update_at TIMESTAMP
);
```

### 2.2. org_user（組織利用者）テーブル

```sql
CREATE TABLE org_user (
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  user_name VARCHAR(30) NOT NULL,
  role VARCHAR(30) NOT NULL,
  mail_address VARCHAR(50) NOT NULL,
  locked_until TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN,
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  PRIMARY KEY (user_id, org_id)
);
```

**重要な設計ポイント:**
- 複合主キー: `(user_id, org_id)`
- 同一ユーザーが複数組織に所属可能
- ロールは組織ごとに設定

### 2.3. user_authentication（利用者認証）テーブル

```sql
CREATE TABLE user_authentication (
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  password VARCHAR(50) NOT NULL,  -- ハッシュパスワード
  entry_flg BOOLEAN NOT NULL,     -- 二段階認証アプリ連携フラグ
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  PRIMARY KEY (user_id, org_id)
);
```

**重要な設計ポイント:**
- 複合主キー: `(user_id, org_id)`
- `org_user`テーブルと1対1の関係
- `entry_flg`: 既存の2FA関連フラグ（現在未使用と推測）

### 2.4. login_history（ログイン履歴）テーブル

```sql
CREATE TABLE login_history (
  id VARCHAR(30) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  org_cd VARCHAR(30) NOT NULL,
  login_at TIMESTAMP,
  login_sf VARCHAR(10),           -- ログイン成否
  failure_reason VARCHAR(100)
);
```

---

## 3. 二段階認証（2FA）実装のための追加要件

### 3.1. 必要な機能

1. **クライアント証明書認証**
   - 証明書情報の保存・検証
   - 証明書有効期限管理
   - 組織IDの証明書からの抽出

2. **メールPINコード認証**
   - PINコード生成・送信
   - PINコード検証（有効期限、試行回数制限）
   - メールアドレスを持たないユーザーへの対応

3. **セッション管理**
   - JWT + Session Hybrid方式
   - 2FA検証済みフラグ管理
   - ロール別有効期限管理

---

## 4. 必要なテーブル変更と新規テーブル

### 4.1. org_user テーブルへのカラム追加

#### 追加理由
クライアント証明書認証を実装するため、証明書情報を保存する必要があります。

#### 追加カラム

```sql
ALTER TABLE org_user
ADD COLUMN certificate_serial_number VARCHAR(255),  -- 証明書シリアル番号
ADD COLUMN certificate_cn VARCHAR(255),             -- 証明書CN（Common Name）
ADD COLUMN certificate_ou VARCHAR(255),             -- 証明書OU（Organization Unit）
ADD COLUMN certificate_expires_at TIMESTAMP;         -- 証明書有効期限

-- インデックス追加
CREATE INDEX idx_org_user_cert_serial ON org_user(certificate_serial_number);
CREATE INDEX idx_org_user_cert_cn ON org_user(certificate_cn);
```

#### カラム説明

| カラム名 | 型 | NULL | 説明 | 使用目的 |
|---------|-----|------|------|---------|
| certificate_serial_number | VARCHAR(255) | NULL | 証明書シリアル番号 | 証明書の一意識別、検証 |
| certificate_cn | VARCHAR(255) | NULL | 証明書CN | Common Name、ユーザー識別 |
| certificate_ou | VARCHAR(255) | NULL | 証明書OU | Organization Unit、組織ID抽出 |
| certificate_expires_at | TIMESTAMP | NULL | 証明書有効期限 | 有効期限チェック |

---

### 4.2. 新規テーブル: user_sessions（ユーザーセッション）⭐

#### 作成理由

**既存テーブルでは対応できない要件:**
1. JWT + Session Hybrid方式のセッション管理が必要
2. 2FA検証済みフラグの管理が必要
3. セッションごとの有効期限、IPアドレス、User-Agent管理が必要
4. データベースとメモリの二重管理による高速なセッション検証が必要

**既存の`user_authentication`テーブルとの違い:**
- `user_authentication`: ユーザーの認証情報（パスワード）を保存
- `user_sessions`: ログイン後のセッション状態を保存

#### テーブル定義

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  is_2fa_verified BOOLEAN NOT NULL DEFAULT false,
  pin_verified_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 外部キー制約
  CONSTRAINT fk_user_sessions_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES org_user(user_id, org_id) 
    ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, org_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_2fa ON user_sessions(is_2fa_verified);
```

#### カラム説明

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | セッションID |
| user_id | VARCHAR(30) | NOT NULL | - | ユーザーID |
| org_id | UUID | NOT NULL | - | 組織ID |
| session_token | VARCHAR(255) | NOT NULL | - | セッショントークン（JWT） |
| is_2fa_verified | BOOLEAN | NOT NULL | false | 2FA検証済みフラグ |
| pin_verified_at | TIMESTAMP | NULL | - | PIN検証完了日時 |
| expires_at | TIMESTAMP | NOT NULL | - | セッション有効期限 |
| ip_address | VARCHAR(45) | NULL | - | IPアドレス（IPv4/IPv6） |
| user_agent | TEXT | NULL | - | User-Agent |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| last_accessed_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 最終アクセス日時 |

---

### 4.3. 新規テーブル: pin_codes（PINコード管理）⭐

#### 作成理由

**メールPINコード認証に必要な情報:**
1. PINコード（6桁数字）の保存
2. 有効期限管理（5分）
3. 試行回数制限（3回まで）
4. 使用済みフラグ管理
5. セッショントークンとの紐付け

**専用テーブルが必要な理由:**
- 一時的なデータ（5分で期限切れ）
- 頻繁な書き込み・削除が発生
- 既存テーブルに追加すると、パフォーマンスとデータ整合性に影響

#### テーブル定義

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
  
  -- 外部キー制約
  CONSTRAINT fk_pin_codes_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES org_user(user_id, org_id) 
    ON DELETE CASCADE,
  
  -- チェック制約
  CONSTRAINT chk_pin_codes_pin_format 
    CHECK (pin_code ~ '^[0-9]{6}$'),
  
  CONSTRAINT chk_pin_codes_attempts 
    CHECK (attempts_count >= 0 AND attempts_count <= max_attempts)
);

-- インデックス
CREATE UNIQUE INDEX idx_pin_codes_pin_session ON pin_codes(pin_code, session_token);
CREATE INDEX idx_pin_codes_user ON pin_codes(user_id, org_id);
CREATE INDEX idx_pin_codes_token ON pin_codes(session_token);
CREATE INDEX idx_pin_codes_expires ON pin_codes(expires_at);
CREATE INDEX idx_pin_codes_is_used ON pin_codes(is_used);
```

#### カラム説明

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | PINコードID |
| user_id | VARCHAR(30) | NOT NULL | - | ユーザーID |
| org_id | UUID | NOT NULL | - | 組織ID |
| pin_code | VARCHAR(6) | NOT NULL | - | PINコード（6桁数字） |
| session_token | VARCHAR(255) | NOT NULL | - | 仮セッショントークン |
| is_used | BOOLEAN | NOT NULL | false | 使用済みフラグ |
| used_at | TIMESTAMP | NULL | - | 使用日時 |
| expires_at | TIMESTAMP | NOT NULL | - | 有効期限（作成+5分） |
| attempts_count | INTEGER | NOT NULL | 0 | 入力試行回数 |
| max_attempts | INTEGER | NOT NULL | 3 | 最大試行回数 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

---

### 4.4. login_history テーブルの活用

既存の`login_history`テーブルをそのまま活用します。

#### 追加推奨カラム（オプション）

パフォーマンス向上とセキュリティ強化のため、以下のカラム追加を推奨します：

```sql
ALTER TABLE login_history
ADD COLUMN ip_address VARCHAR(45),    -- IPアドレス
ADD COLUMN user_agent TEXT;           -- User-Agent

-- レート制限判定用インデックス
CREATE INDEX idx_login_history_rate_limit 
  ON login_history(org_cd, user_id, login_at, login_sf);
```

---

## 5. マイグレーション計画

### 5.1. マイグレーション実行順序

```
1. org_user テーブルへの証明書カラム追加
   ↓
2. user_sessions テーブル作成
   ↓
3. pin_codes テーブル作成
   ↓
4. login_history テーブルへのカラム追加（オプション）
```

### 5.2. マイグレーションスクリプト

#### Migration 001: org_user テーブル拡張

```sql
-- 001_add_certificate_columns_to_org_user.sql
BEGIN;

ALTER TABLE org_user
ADD COLUMN IF NOT EXISTS certificate_serial_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS certificate_cn VARCHAR(255),
ADD COLUMN IF NOT EXISTS certificate_ou VARCHAR(255),
ADD COLUMN IF NOT EXISTS certificate_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_org_user_cert_serial 
  ON org_user(certificate_serial_number);
  
CREATE INDEX IF NOT EXISTS idx_org_user_cert_cn 
  ON org_user(certificate_cn);

COMMIT;
```

#### Migration 002: user_sessions テーブル作成

```sql
-- 002_create_user_sessions_table.sql
BEGIN;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(30) NOT NULL,
  org_id UUID NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  is_2fa_verified BOOLEAN NOT NULL DEFAULT false,
  pin_verified_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_sessions_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES org_user(user_id, org_id) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user 
  ON user_sessions(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
  ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
  ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_2fa 
  ON user_sessions(is_2fa_verified);

COMMIT;
```

#### Migration 003: pin_codes テーブル作成

```sql
-- 003_create_pin_codes_table.sql
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
    REFERENCES org_user(user_id, org_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT chk_pin_codes_pin_format 
    CHECK (pin_code ~ '^[0-9]{6}$'),
  
  CONSTRAINT chk_pin_codes_attempts 
    CHECK (attempts_count >= 0 AND attempts_count <= max_attempts)
);

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

#### Migration 004: login_history テーブル拡張（オプション）

```sql
-- 004_add_security_columns_to_login_history.sql
BEGIN;

ALTER TABLE login_history
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_login_history_rate_limit 
  ON login_history(org_cd, user_id, login_at, login_sf);

COMMIT;
```

---

## 6. ロールバック用スクリプト

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

-- 002_rollback_user_sessions.sql
BEGIN;
DROP TABLE IF EXISTS user_sessions CASCADE;
COMMIT;

-- 001_rollback_org_user.sql
BEGIN;
ALTER TABLE org_user
DROP COLUMN IF EXISTS certificate_serial_number,
DROP COLUMN IF EXISTS certificate_cn,
DROP COLUMN IF EXISTS certificate_ou,
DROP COLUMN IF EXISTS certificate_expires_at;
DROP INDEX IF EXISTS idx_org_user_cert_serial;
DROP INDEX IF EXISTS idx_org_user_cert_cn;
COMMIT;
```

---

## 7. 既存システムへの影響評価

### 7.1. 影響度: 低

#### org_user テーブルへのカラム追加
- **影響**: 既存レコードには NULL が設定される
- **対策**: 既存アプリケーションは影響なし（NULLを許容）
- **移行**: 段階的に証明書情報を登録

#### 新規テーブル追加
- **影響**: 既存システムへの影響なし
- **対策**: 新規機能として独立して実装可能

### 7.2. 互換性の維持

```sql
-- 既存のクエリ例（影響なし）
SELECT user_id, user_name, role, mail_address
FROM org_user
WHERE org_id = 'xxx' AND is_active = true;

-- 新しいクエリ例（証明書情報を含む）
SELECT user_id, user_name, role, mail_address,
       certificate_serial_number, certificate_expires_at
FROM org_user
WHERE org_id = 'xxx' 
  AND is_active = true
  AND certificate_expires_at > CURRENT_TIMESTAMP;
```

---

## 8. 変更サマリー

### 8.1. テーブル変更一覧

| テーブル名 | 変更種別 | 変更内容 | 理由 |
|-----------|---------|---------|------|
| org_user | カラム追加 | 証明書情報4カラム追加 | クライアント証明書認証 |
| user_sessions | 新規作成 | セッション管理テーブル | JWT + Session Hybrid認証 |
| pin_codes | 新規作成 | PINコード管理テーブル | メールPINコード認証 |
| login_history | カラム追加（推奨） | IPアドレス、User-Agent | セキュリティ強化、レート制限 |

### 8.2. 新規作成テーブルの必要性まとめ

#### user_sessions テーブル
- ✅ **必須**: ログイン後のセッション状態管理
- ✅ **必須**: 2FA検証済みフラグ管理
- ✅ **必須**: セッションごとの有効期限管理
- ✅ **必須**: データベース + メモリ二重管理

#### pin_codes テーブル
- ✅ **必須**: メールPINコード認証
- ✅ **必須**: 一時的なデータ管理（5分で削除）
- ✅ **必須**: 試行回数制限（3回まで）
- ✅ **必須**: 既存テーブルとの分離でパフォーマンス維持

---

## 9. 関連ドキュメント

- [認証API仕様書](../api/api_auth.md)
- [既存ER図](er_diagram.a5er) - ページ: 材料開発データ管理システム_認証関連_ER図.a5er
- [セキュリティ規約](../../.clinerules/development/security.md)

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-29 | 初版作成（既存ER図との差分分析） | Backend Development Team |
