# 認証関連データベース設計書（既存テーブル準拠版）

## メタデータ
- **作成日**: 2025-12-29
- **バージョン**: 2.0.0（既存ER図準拠）
- **最終更新**: 2025-12-29
- **担当**: Backend Development Team

---

## 1. 概要

本ドキュメントは、mmdpfプロジェクトの認証機能に必要なデータベーステーブル設計を定義します。**既存のER図（`er_diagram.a5er`）に準拠**し、必要最小限の変更のみを行います。

### 設計方針
- ✅ **既存テーブルの最大限活用**: `org_user`, `user_authentication`, `login_history`を活用
- ✅ **最低限の新規テーブル**: `pin_codes`の2つのみ追加
- ✅ **既存システムへの影響最小化**: カラム追加は最小限、全てNULL許容
- ✅ **マルチテナント分離**: 全テーブルで`org_id`を使用
- ✅ **複合主キー対応**: 既存の`(user_id, org_id)`設計を踏襲

### 認証方式
- **パスワード認証**: bcryptハッシュ化
- **メールPINコード二段階認証**: 6桁数字、有効期限5分

---

## 2. 既存テーブルの活用

### 2.1. organization_user テーブル（既存テーブル - 変更なし）

#### 既存構造

```sql
CREATE TABLE organization_user (
  user_id VARCHAR(30) NOT NULL,
  organization_id uuid NOT NULL,
  user_name VARCHAR(30) NOT NULL,
  role VARCHAR(30) NOT NULL,
  mail_address VARCHAR(50) NOT NULL,
  locked_until TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN,
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  PRIMARY KEY (user_id, organization_id)
);
```

#### 活用方法
- ユーザー基本情報の管理
- メールアドレスはPINコード送信先として使用
- `role`カラムでロールベースアクセス制御（RBAC）
- `is_active`でアカウント有効性管理

**変更**: なし（そのまま活用）

---

### 2.2. user_authentication テーブル（既存テーブル - 変更なし）

#### 既存構造

```sql
CREATE TABLE user_authentication (
  user_id VARCHAR(30) NOT NULL,
  organization_id uuid NOT NULL,
  password VARCHAR(50) NOT NULL,      -- ハッシュパスワード（bcrypt）
  entry_flg BOOLEAN NOT NULL,         -- 二段階認証アプリ連携フラグ
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  PRIMARY KEY (user_id, organization_id),
  FOREIGN KEY (user_id, organization_id) REFERENCES organization_user(user_id, organization_id)
);
```

#### 活用方法
- パスワードハッシュの保存・検証に使用
- `entry_flg`は将来的な2FAアプリ連携用（現在は未使用）
- メールPINコード認証では、このテーブルは参照のみ

**変更**: なし（そのまま活用）

---

### 2.3. login_history テーブル（既存テーブル + カラム追加推奨）

#### 既存構造

```sql
CREATE TABLE login_history (
  id VARCHAR(30) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  org_cd VARCHAR(30) NOT NULL,    -- 注: org_idではなくorg_cd
  login_at TIMESTAMP,
  login_sf VARCHAR(10),            -- ログイン成否
  failure_reason VARCHAR(100)
);
```

#### 追加推奨カラム（オプション）

```sql
ALTER TABLE login_history
ADD COLUMN ip_address VARCHAR(45),    -- IPアドレス
ADD COLUMN user_agent TEXT;           -- User-Agent

-- レート制限判定用インデックス
CREATE INDEX idx_login_history_rate_limit 
  ON login_history(org_cd, user_id, login_at, login_sf);
```

#### 活用方法
- ログイン試行履歴の記録
- レート制限の判定（15分以内の失敗回数カウント）
- セキュリティ監査

**注意**: `org_cd`を使用（`org_id`ではない）

---

## 3. 新規作成テーブル

### 3.1. pin_codes テーブル（新規作成）⭐

#### 作成理由

**必要性:**
1. メールPINコード認証の実装
2. PINコード（6桁数字）の保存と検証
3. 有効期限管理（5分）
4. 試行回数制限（3回まで）
5. 使用済みフラグ管理

**専用テーブルが必要な理由:**
- 一時的なデータ（5分後に自動削除）
- 頻繁な書き込み・削除操作
- 既存テーブルに追加すると、パフォーマンスとデータ整合性に悪影響

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
  
  -- 外部キー制約（既存のorganization_userテーブルを参照）
  CONSTRAINT fk_pin_codes_user 
    FOREIGN KEY (user_id, org_id) 
    REFERENCES organization_user(user_id, organization_id) 
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

#### カラム定義

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | PINコードID（主キー） |
| user_id | VARCHAR(30) | NOT NULL | - | ユーザーID（FK） |
| org_id | UUID | NOT NULL | - | 組織ID（FK） |
| pin_code | VARCHAR(6) | NOT NULL | - | PINコード（6桁数字） |
| session_token | VARCHAR(255) | NOT NULL | - | 仮セッショントークン |
| is_used | BOOLEAN | NOT NULL | false | 使用済みフラグ |
| used_at | TIMESTAMP | NULL | - | 使用日時 |
| expires_at | TIMESTAMP | NOT NULL | - | 有効期限（作成時刻 + 5分） |
| attempts_count | INTEGER | NOT NULL | 0 | 入力試行回数 |
| max_attempts | INTEGER | NOT NULL | 3 | 最大試行回数 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

#### 制約

```sql
-- 外部キー制約
CONSTRAINT fk_pin_codes_user 
  FOREIGN KEY (user_id, org_id) 
  REFERENCES organization_user(user_id, organization_id) 
  ON DELETE CASCADE

-- チェック制約
CONSTRAINT chk_pin_codes_pin_format 
  CHECK (pin_code ~ '^[0-9]{6}$')

CONSTRAINT chk_pin_codes_attempts 
  CHECK (attempts_count >= 0 AND attempts_count <= max_attempts)

-- ユニーク制約（複合）
UNIQUE (pin_code, session_token)
```

---

## 4. マイグレーションスクリプト

### 4.1. Migration 003: pin_codes テーブル作成

```sql
-- 003_create_pin_codes_table.sql
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

---

### 4.4. Migration 004: login_history テーブル拡張（オプション）

```sql
-- 004_add_security_columns_to_login_history.sql
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

---

### 4.5. ロールバック用スクリプト

```sql
-- 003_rollback_login_history.sql
BEGIN;
ALTER TABLE login_history
DROP COLUMN IF EXISTS ip_address,
DROP COLUMN IF EXISTS user_agent;
DROP INDEX IF EXISTS idx_login_history_rate_limit;
COMMIT;

-- 002_rollback_pin_codes.sql
BEGIN;
DROP TABLE IF EXISTS pin_codes CASCADE;
COMMIT;

```

---

## 5. データメンテナンス

### 5.1. 期限切れPINコードの自動削除

```sql
-- 定期実行クエリ（例: 1時間ごと）
DELETE FROM pin_codes
WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
```

### 5.2. 古いログイン履歴の削除

```sql
-- 定期実行クエリ（例: 毎日実行）
-- 90日以上前のログイン履歴を削除
DELETE FROM login_history
WHERE login_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
```

---

## 6. パフォーマンス考慮事項

### 6.1. インデックス戦略

| テーブル | インデックス | 目的 |
|---------|-------------|------|
| pin_codes | (pin_code, session_token) | PIN検証（UNIQUE） |
| pin_codes | expires_at | 期限切れPINコード削除 |
| login_history | (org_cd, user_id, login_at, login_sf) | レート制限判定 |

### 6.2. クエリ最適化

```sql
-- レート制限判定クエリ（最適化版）
SELECT COUNT(*) 
FROM login_history
WHERE org_cd = $1
  AND user_id = $2
  AND login_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
  AND login_sf = 'failure';

-- インデックスが効く: idx_login_history_rate_limit
```

---

## 7. セキュリティ考慮事項

### 7.1. パスワードハッシュ化

- **アルゴリズム**: bcrypt
- **Admin権限**: 14 rounds
- **その他ユーザー**: 12 rounds
- **保存先**: `user_authentication.password`カラム

### 7.2. PINコード生成

- **形式**: 6桁の数字（000000 ～ 999999）
- **生成方法**: `crypto.randomInt(100000, 999999)`
- **有効期限**: 5分
- **最大試行回数**: 3回

```typescript
// PINコード生成例
const pinCode = crypto.randomInt(100000, 999999).toString();
const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分後
```

### 7.4. データ暗号化

- **パスワード**: bcrypt（ハッシュ化、不可逆）
- **PINコード**: 平文保存（短期間のみ有効、使用後即削除）
- **セッショントークン**: JWT署名

---

## 8. 既存システムへの影響評価

### 8.1. 影響度: 最小限

#### 新規テーブル追加（pin_codes）
- **影響**: 既存システムへの影響なし
- **独立性**: 新規機能として独立して実装可能
- **既存テーブル**: org_user, user_authentication, login_historyはそのまま活用

#### login_history テーブルへのカラム追加（オプション）
- **影響**: 最小限（NULL許容カラム追加）
- **互換性**: 既存のクエリに影響なし

### 8.2. 互換性の確認

```sql
-- 既存のクエリ例（影響なし）
SELECT user_id, user_name, role, mail_address
FROM organization_user
WHERE organization_id = $1 AND is_active = true;

-- 既存のパスワード検証クエリ（影響なし）
SELECT password
FROM user_authentication
WHERE user_id = $1 AND organization_id = $2;
```

---

## 9. 変更サマリー

### 9.1. テーブル変更一覧

| テーブル名 | 変更種別 | 変更内容 | 影響度 |
|-----------|---------|---------|--------|
| org_user | 変更なし | - | なし |
| user_authentication | 変更なし | - | なし |
| pin_codes | 新規作成 | PINコード管理テーブル | なし |
| login_history | カラム追加（オプション） | IPアドレス、User-Agent | 最小 |

### 9.2. 既存テーブルとの対応関係

| 機能 | 既存テーブル | 新規テーブル | 備考 |
|------|------------|------------|------|
| ユーザー情報 | org_user | - | 変更なし（そのまま活用） |
| パスワード管理 | user_authentication | - | 変更なし（そのまま活用） |
| ログイン履歴 | login_history | - | カラム追加推奨（オプション） |
| PINコード管理 | - | pin_codes | 新規作成 |

---

## 10. 関連ドキュメント

- [既存ER図との差分分析](db_auth_diff_analysis.md) - 詳細な変更理由と影響評価
- [認証API仕様書](../api/api_auth.md)
- [既存ER図](er_diagram.a5er) - ページ: 材料開発データ管理システム_認証関連_ER図.a5er
- [セキュリティ規約](../../.clinerules/development/security.md)
- [バックエンド規約](../../.clinerules/development/backend.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-29 | 既存ER図に準拠して全面改訂 | Backend Development Team |
| 1.0.0 | 2025-12-26 | 初版作成 | Backend Development Team |
