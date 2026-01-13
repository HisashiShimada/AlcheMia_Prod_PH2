# テーブル定義書: プロバイダー・システム管理者・データ管理者メニュー

## メタデータ
- **作成日**: 2026-01-06
- **対象メニュー**: プロバイダーメニュー、システム管理者メニュー、データ管理者メニュー
- **データベース**: PostgreSQL
- **バージョン**: 1.0.0

## 目次

1. [companies（会社マスタ）](#1-companies会社マスタ)
2. [organizations（組織マスタ）](#2-organizations組織マスタ)
3. [users（ユーザー）](#3-usersユーザー)
4. [user_sessions（ユーザーセッション）](#4-user_sessionsユーザーセッション)
5. [departments（部署マスタ）](#5-departments部署マスタ)
6. [roles（ロールマスタ）](#6-rolesロールマスタ)
7. [role_functions（ロール機能）](#7-role_functionsロール機能)
8. [laboratory_equipment_masters（実験機器マスタ）](#8-laboratory_equipment_masters実験機器マスタ)
9. [equipment_vendors（機器ベンダーマスタ）](#9-equipment_vendors機器ベンダーマスタ)
10. [equipment_types（機器種別マスタ）](#10-equipment_types機器種別マスタ)
11. [equipment_attributes（機器属性マスタ）](#11-equipment_attributes機器属性マスタ)

---

## 1. companies（会社マスタ）

### 概要
会社情報を管理するマスタテーブル。プロバイダーメニューの会社管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | company_code | 会社コード | VARCHAR(50) | NOT NULL, UNIQUE | - | 会社を識別する一意のコード |
| 3 | company_name | 会社名 | VARCHAR(255) | NOT NULL | - | 会社の正式名称 |
| 4 | shareable_across_organizations | 組織間共有 | BOOLEAN | NOT NULL | false | 組織間で共有可能かどうか |
| 5 | status | ステータス | VARCHAR(20) | NOT NULL, CHECK | 'active' | active: 有効, inactive: 無効 |
| 6 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 7 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| companies_pkey | PRIMARY KEY | id | 主キー |
| uk_companies_company_code | UNIQUE | company_code | 会社コードの一意性 |
| idx_companies_status | INDEX | status | ステータスでの検索 |

### DDL例

```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    shareable_across_organizations BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_companies_company_code ON companies(company_code);
CREATE INDEX idx_companies_status ON companies(status);

COMMENT ON TABLE companies IS '会社マスタ';
COMMENT ON COLUMN companies.id IS '内部ID（自動採番）';
COMMENT ON COLUMN companies.company_code IS '会社を識別する一意のコード';
COMMENT ON COLUMN companies.company_name IS '会社の正式名称';
COMMENT ON COLUMN companies.shareable_across_organizations IS '組織間で共有可能かどうか';
COMMENT ON COLUMN companies.status IS 'active: 有効, inactive: 無効';
```

---

## 2. organizations（組織マスタ）

### 概要
研究所などの組織情報を管理するマスタテーブル。プロバイダーメニューの組織管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | organization_id | 組織ID | VARCHAR(50) | NOT NULL, UNIQUE | - | 組織を識別する一意のID |
| 3 | organization_name | 組織名 | VARCHAR(255) | NOT NULL | - | 組織の正式名称 |
| 4 | display_name | 表示名 | VARCHAR(255) | | - | 画面表示用の短縮名 |
| 5 | email | メールアドレス | VARCHAR(255) | NOT NULL | - | 組織の代表メールアドレス |
| 6 | representative_admin_id | 代表管理者ID | INTEGER | FOREIGN KEY | - | 代表管理者のユーザーID（users.id） |
| 7 | company_id | 会社ID | INTEGER | NOT NULL, FOREIGN KEY | - | 所属会社ID（companies.id） |
| 8 | certificate_url | 証明書URL | TEXT | | - | 組織証明書のURL |
| 9 | status | ステータス | VARCHAR(20) | NOT NULL, CHECK | 'active' | active: 有効, inactive: 無効 |
| 10 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 11 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| organizations_pkey | PRIMARY KEY | id | 主キー |
| uk_organizations_organization_id | UNIQUE | organization_id | 組織IDの一意性 |
| idx_organizations_company_id | INDEX | company_id | 会社IDでの検索 |
| idx_organizations_status | INDEX | status | ステータスでの検索 |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_organizations_company | companies | id | ON DELETE RESTRICT |
| fk_organizations_rep_admin | users | id | ON DELETE SET NULL |

### DDL例

```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL UNIQUE,
    organization_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    representative_admin_id INTEGER,
    company_id INTEGER NOT NULL,
    certificate_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_organizations_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
);

-- 代表管理者の外部キーは後で追加（循環参照を避けるため）
-- ALTER TABLE organizations ADD CONSTRAINT fk_organizations_rep_admin 
--     FOREIGN KEY (representative_admin_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uk_organizations_organization_id ON organizations(organization_id);
CREATE INDEX idx_organizations_company_id ON organizations(company_id);
CREATE INDEX idx_organizations_status ON organizations(status);

COMMENT ON TABLE organizations IS '組織マスタ';
```

---

## 3. users（ユーザー）

### 概要
システムユーザー情報を管理するテーブル。システム管理者メニューのユーザー管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | user_id | ユーザーID | VARCHAR(255) | NOT NULL, UNIQUE | - | ログインID（通常はメールアドレス） |
| 3 | last_name | 姓 | VARCHAR(100) | NOT NULL | - | ユーザーの姓 |
| 4 | first_name | 名 | VARCHAR(100) | NOT NULL | - | ユーザーの名 |
| 5 | email | メールアドレス | VARCHAR(255) | NOT NULL, UNIQUE | - | メールアドレス |
| 6 | password_hash | パスワードハッシュ | VARCHAR(255) | NOT NULL | - | bcryptハッシュ化されたパスワード |
| 7 | department_id | 部署ID | INTEGER | FOREIGN KEY | - | 所属部署ID（departments.id） |
| 8 | role_id | ロールID | INTEGER | NOT NULL, FOREIGN KEY | - | ロールID（roles.id） |
| 9 | organization_id | 組織ID | INTEGER | NOT NULL, FOREIGN KEY | - | 所属組織ID（organizations.id） |
| 10 | two_factor_auth_enabled | 2要素認証有効 | BOOLEAN | NOT NULL | false | 2要素認証が有効かどうか |
| 11 | last_login_at | 最終ログイン日時 | TIMESTAMP WITH TIME ZONE | | - | 最後にログインした日時 |
| 12 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | アカウントが有効かどうか |
| 13 | avatar_text | アバター文字 | VARCHAR(10) | | - | アバター表示用の文字（姓の1文字など） |
| 14 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 15 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| users_pkey | PRIMARY KEY | id | 主キー |
| uk_users_user_id | UNIQUE | user_id | ユーザーIDの一意性 |
| uk_users_email | UNIQUE | email | メールアドレスの一意性 |
| idx_users_organization_id | INDEX | organization_id | 組織IDでの検索 |
| idx_users_department_id | INDEX | department_id | 部署IDでの検索 |
| idx_users_role_id | INDEX | role_id | ロールIDでの検索 |
| idx_users_is_active | INDEX | is_active | 有効フラグでの検索 |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_users_organization | organizations | id | ON DELETE RESTRICT |
| fk_users_department | departments | id | ON DELETE SET NULL |
| fk_users_role | roles | id | ON DELETE RESTRICT |

### DDL例

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department_id INTEGER,
    role_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    two_factor_auth_enabled BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_text VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uk_users_user_id ON users(user_id);
CREATE UNIQUE INDEX uk_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE users IS 'ユーザー';
COMMENT ON COLUMN users.password_hash IS 'bcryptハッシュ化されたパスワード（平文保存禁止）';
```

---

## 4. user_sessions（ユーザーセッション）

### 概要
ログインセッション情報を管理するテーブル。システム管理者メニューのセッション管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | session_id | セッションID | VARCHAR(255) | NOT NULL, UNIQUE | - | 一意のセッションID |
| 3 | user_id | ユーザーID | INTEGER | NOT NULL, FOREIGN KEY | - | ユーザーID（users.id） |
| 4 | login_time | ログイン時刻 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | ログインした日時 |
| 5 | last_activity_time | 最終活動時刻 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | 最後に活動した日時 |
| 6 | ip_address | IPアドレス | VARCHAR(45) | | - | ログイン元のIPアドレス（IPv6対応） |
| 7 | user_agent | ユーザーエージェント | TEXT | | - | ブラウザ情報 |
| 8 | is_current | 現在のセッション | BOOLEAN | NOT NULL | false | 現在アクティブなセッションか |
| 9 | expires_at | 有効期限 | TIMESTAMP WITH TIME ZONE | NOT NULL | - | セッションの有効期限 |
| 10 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| user_sessions_pkey | PRIMARY KEY | id | 主キー |
| uk_user_sessions_session_id | UNIQUE | session_id | セッションIDの一意性 |
| idx_user_sessions_user_id | INDEX | user_id | ユーザーIDでの検索 |
| idx_user_sessions_user_current | INDEX | user_id, is_current | ユーザーの現在のセッション検索 |
| idx_user_sessions_expires_at | INDEX | expires_at | 有効期限での検索（クリーンアップ用） |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_user_sessions_user | users | id | ON DELETE CASCADE |

### DDL例

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_current BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_user_current ON user_sessions(user_id, is_current);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

COMMENT ON TABLE user_sessions IS 'ユーザーセッション';
COMMENT ON COLUMN user_sessions.expires_at IS 'セッション有効期限。期限切れセッションは定期的にクリーンアップ';
```

---

## 5. departments（部署マスタ）

### 概要
組織内の部署情報を管理するマスタテーブル。システム管理者メニューの部署管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | department_id | 部署ID | VARCHAR(50) | NOT NULL, UNIQUE | - | 部署を識別する一意のID |
| 3 | organization_id | 組織ID | INTEGER | NOT NULL, FOREIGN KEY | - | 所属組織ID（organizations.id） |
| 4 | department_name | 部署名 | VARCHAR(255) | NOT NULL | - | 部署の正式名称 |
| 5 | display_name | 表示名 | VARCHAR(255) | | - | 画面表示用の短縮名 |
| 6 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | 部署が有効かどうか |
| 7 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 8 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| departments_pkey | PRIMARY KEY | id | 主キー |
| uk_departments_department_id | UNIQUE | department_id | 部署IDの一意性 |
| idx_departments_organization_id | INDEX | organization_id | 組織IDでの検索 |
| idx_departments_org_active | INDEX | organization_id, is_active | 組織の有効な部署検索 |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_departments_organization | organizations | id | ON DELETE RESTRICT |

### DDL例

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL UNIQUE,
    organization_id INTEGER NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_departments_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uk_departments_department_id ON departments(department_id);
CREATE INDEX idx_departments_organization_id ON departments(organization_id);
CREATE INDEX idx_departments_org_active ON departments(organization_id, is_active);

COMMENT ON TABLE departments IS '部署マスタ';
```

---

## 6. roles（ロールマスタ）

### 概要
システム管理者、データ管理者などのロールを定義するマスタテーブル。システム管理者メニューのロール管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | role_code | ロールコード | VARCHAR(50) | NOT NULL, UNIQUE | - | ロールを識別する一意のコード |
| 3 | role_name | ロール名（日本語） | VARCHAR(100) | NOT NULL | - | ロールの日本語名 |
| 4 | role_name_en | ロール名（英語） | VARCHAR(100) | | - | ロールの英語名 |
| 5 | description | 説明 | TEXT | | - | ロールの詳細説明 |
| 6 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | ロールが有効かどうか |
| 7 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 8 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| roles_pkey | PRIMARY KEY | id | 主キー |
| uk_roles_role_code | UNIQUE | role_code | ロールコードの一意性 |
| idx_roles_is_active | INDEX | is_active | 有効フラグでの検索 |

### 標準ロール

| role_code | role_name | role_name_en | 説明 |
|-----------|-----------|--------------|------|
| system_admin | システム管理 | System Administrator | 全システムの管理権限 |
| data_admin | データ管理 | Data Administrator | データマスタの管理権限 |
| experiment_admin | 実験管理 | Experiment Manager | 実験記録の管理権限 |
| experiment_worker | 実験作業 | Experiment Worker | 実験実施の権限 |
| mi_engineer | MI技術者 | MI Engineer | データ分析の権限 |

### DDL例

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    role_name_en VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_roles_role_code ON roles(role_code);
CREATE INDEX idx_roles_is_active ON roles(is_active);

COMMENT ON TABLE roles IS 'ロールマスタ';

-- 標準ロールの投入
INSERT INTO roles (role_code, role_name, role_name_en, description) VALUES
('system_admin', 'システム管理', 'System Administrator', '全システムの管理権限'),
('data_admin', 'データ管理', 'Data Administrator', 'データマスタの管理権限'),
('experiment_admin', '実験管理', 'Experiment Manager', '実験記録の管理権限'),
('experiment_worker', '実験作業', 'Experiment Worker', '実験実施の権限'),
('mi_engineer', 'MI技術者', 'MI Engineer', 'データ分析の権限');
```

---

## 7. role_functions（ロール機能）

### 概要
ロールごとの権限・機能を定義するテーブル。システム管理者メニューのロール管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | role_id | ロールID | INTEGER | NOT NULL, FOREIGN KEY | - | ロールID（roles.id） |
| 3 | function_id | 機能ID | VARCHAR(50) | NOT NULL | - | 機能を識別するID |
| 4 | function_name | 機能名 | VARCHAR(255) | NOT NULL | - | 機能の名称 |
| 5 | permission_type | 権限種別 | VARCHAR(50) | NOT NULL | - | read: 読み取り, write: 書き込み, admin: 管理 |
| 6 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | 機能が有効かどうか |
| 7 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 8 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| role_functions_pkey | PRIMARY KEY | id | 主キー |
| idx_role_functions_role_id | INDEX | role_id | ロールIDでの検索 |
| idx_role_functions_role_active | INDEX | role_id, is_active | ロールの有効な機能検索 |
| uk_role_functions_role_function | UNIQUE | role_id, function_id | ロールと機能の組み合わせの一意性 |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_role_functions_role | roles | id | ON DELETE CASCADE |

### 標準機能

| function_id | function_name | 説明 |
|------------|---------------|------|
| FUNC001 | 組織管理 | 組織情報の管理 |
| FUNC002 | ファイル管理 | ファイルの管理 |
| FUNC003 | 実験記録管理 | 実験記録の管理 |
| FUNC004 | 実験実施 | 実験の実施 |
| FUNC005 | データ分析 | データ分析機能 |
| FUNC006 | システム監視 | システム監視機能 |
| FUNC007 | データアクセス | データへのアクセス |
| FUNC008 | 進捗報告 | 進捗報告機能 |
| FUNC009 | セッション管理 | セッション管理機能 |
| FUNC010 | ユーザー管理 | ユーザー管理機能 |

### DDL例

```sql
CREATE TABLE role_functions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    function_id VARCHAR(50) NOT NULL,
    function_name VARCHAR(255) NOT NULL,
    permission_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_role_functions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT uk_role_functions_role_function UNIQUE (role_id, function_id)
);

CREATE INDEX idx_role_functions_role_id ON role_functions(role_id);
CREATE INDEX idx_role_functions_role_active ON role_functions(role_id, is_active);

COMMENT ON TABLE role_functions IS 'ロール機能';
COMMENT ON COLUMN role_functions.permission_type IS 'read: 読み取り, write: 書き込み, admin: 管理';
```

---

## 8. laboratory_equipment_masters（実験機器マスタ）

### 概要
実験機器の基本情報を管理するマスタテーブル。データ管理者メニューのマスタ管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | equipment_id | 機器ID | VARCHAR(50) | NOT NULL, UNIQUE | - | 機器を識別する一意のID |
| 3 | equipment_name | 機器名 | VARCHAR(255) | NOT NULL | - | 機器の名称 |
| 4 | vendor_id | ベンダーID | INTEGER | NOT NULL, FOREIGN KEY | - | ベンダーID（equipment_vendors.id） |
| 5 | type_id | 種別ID | INTEGER | NOT NULL, FOREIGN KEY | - | 種別ID（equipment_types.id） |
| 6 | attribute_id | 属性ID | INTEGER | NOT NULL, FOREIGN KEY | - | 属性ID（equipment_attributes.id） |
| 7 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | 機器が有効かどうか |
| 8 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 9 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| laboratory_equipment_masters_pkey | PRIMARY KEY | id | 主キー |
| uk_lab_equipment_equipment_id | UNIQUE | equipment_id | 機器IDの一意性 |
| idx_lab_equipment_vendor_id | INDEX | vendor_id | ベンダーIDでの検索 |
| idx_lab_equipment_type_id | INDEX | type_id | 種別IDでの検索 |
| idx_lab_equipment_attr_id | INDEX | attribute_id | 属性IDでの検索 |
| idx_lab_equipment_active | INDEX | is_active, updated_at | 有効な機器の更新日時順検索 |

### 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | アクション |
|--------|---------------|-------------|----------|
| fk_lab_equipment_vendor | equipment_vendors | id | ON DELETE RESTRICT |
| fk_lab_equipment_type | equipment_types | id | ON DELETE RESTRICT |
| fk_lab_equipment_attribute | equipment_attributes | id | ON DELETE RESTRICT |

### DDL例

```sql
CREATE TABLE laboratory_equipment_masters (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(255) NOT NULL,
    vendor_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lab_equipment_vendor FOREIGN KEY (vendor_id) REFERENCES equipment_vendors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_equipment_type FOREIGN KEY (type_id) REFERENCES equipment_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_equipment_attribute FOREIGN KEY (attribute_id) REFERENCES equipment_attributes(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uk_lab_equipment_equipment_id ON laboratory_equipment_masters(equipment_id);
CREATE INDEX idx_lab_equipment_vendor_id ON laboratory_equipment_masters(vendor_id);
CREATE INDEX idx_lab_equipment_type_id ON laboratory_equipment_masters(type_id);
CREATE INDEX idx_lab_equipment_attr_id ON laboratory_equipment_masters(attribute_id);
CREATE INDEX idx_lab_equipment_active ON laboratory_equipment_masters(is_active, updated_at);

COMMENT ON TABLE laboratory_equipment_masters IS '実験機器マスタ';
```

---

## 9. equipment_vendors（機器ベンダーマスタ）

### 概要
機器メーカー情報を管理するマスタテーブル。データ管理者メニューのマスタ管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | vendor_id | ベンダーID | VARCHAR(50) | NOT NULL, UNIQUE | - | ベンダーを識別する一意のID |
| 3 | vendor_name | ベンダー名 | VARCHAR(255) | NOT NULL | - | ベンダーの名称 |
| 4 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | ベンダーが有効かどうか |
| 5 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 6 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| equipment_vendors_pkey | PRIMARY KEY | id | 主キー |
| uk_equipment_vendors_vendor_id | UNIQUE | vendor_id | ベンダーIDの一意性 |
| idx_equipment_vendors_is_active | INDEX | is_active | 有効フラグでの検索 |

### DDL例

```sql
CREATE TABLE equipment_vendors (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_equipment_vendors_vendor_id ON equipment_vendors(vendor_id);
CREATE INDEX idx_equipment_vendors_is_active ON equipment_vendors(is_active);

COMMENT ON TABLE equipment_vendors IS '機器ベンダーマスタ';
```

---

## 10. equipment_types（機器種別マスタ）

### 概要
機器の種類を管理するマスタテーブル。データ管理者メニューのマスタ管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | type_id | 種別ID | VARCHAR(50) | NOT NULL, UNIQUE | - | 種別を識別する一意のID |
| 3 | type_name | 種別名 | VARCHAR(255) | NOT NULL | - | 種別の名称 |
| 4 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | 種別が有効かどうか |
| 5 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 6 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| equipment_types_pkey | PRIMARY KEY | id | 主キー |
| uk_equipment_types_type_id | UNIQUE | type_id | 種別IDの一意性 |
| idx_equipment_types_is_active | INDEX | is_active | 有効フラグでの検索 |

### DDL例

```sql
CREATE TABLE equipment_types (
    id SERIAL PRIMARY KEY,
    type_id VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_equipment_types_type_id ON equipment_types(type_id);
CREATE INDEX idx_equipment_types_is_active ON equipment_types(is_active);

COMMENT ON TABLE equipment_types IS '機器種別マスタ';
```

---

## 11. equipment_attributes（機器属性マスタ）

### 概要
機器の属性を管理するマスタテーブル。データ管理者メニューのマスタ管理で使用。

### テーブル定義

| # | カラム名 | 論理名 | データ型 | 制約 | デフォルト値 | 説明 |
|---|---------|--------|----------|------|-------------|------|
| 1 | id | ID | SERIAL | PRIMARY KEY | - | 内部ID（自動採番） |
| 2 | attribute_id | 属性ID | VARCHAR(50) | NOT NULL, UNIQUE | - | 属性を識別する一意のID |
| 3 | attribute_name | 属性名 | VARCHAR(255) | NOT NULL | - | 属性の名称 |
| 4 | is_active | 有効フラグ | BOOLEAN | NOT NULL | true | 属性が有効かどうか |
| 5 | created_at | 作成日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| 6 | updated_at | 更新日時 | TIMESTAMP WITH TIME ZONE | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

### インデックス

| インデックス名 | 種類 | カラム | 説明 |
|---------------|------|--------|------|
| equipment_attributes_pkey | PRIMARY KEY | id | 主キー |
| uk_equipment_attributes_attr_id | UNIQUE | attribute_id | 属性IDの一意性 |
| idx_equipment_attributes_is_active | INDEX | is_active | 有効フラグでの検索 |

### DDL例

```sql
CREATE TABLE equipment_attributes (
    id SERIAL PRIMARY KEY,
    attribute_id VARCHAR(50) NOT NULL UNIQUE,
    attribute_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_equipment_attributes_attr_id ON equipment_attributes(attribute_id);
CREATE INDEX idx_equipment_attributes_is_active ON equipment_attributes(is_active);

COMMENT ON TABLE equipment_attributes IS '機器属性マスタ';
```

---

## 付録

### A. マイグレーションSQL実行順序

```sql
-- 1. 依存関係のないテーブルから作成
CREATE TABLE companies (...);
CREATE TABLE roles (...);
CREATE TABLE equipment_vendors (...);
CREATE TABLE equipment_types (...);
CREATE TABLE equipment_attributes (...);

-- 2. companiesに依存するテーブル
CREATE TABLE organizations (...);

-- 3. organizationsに依存するテーブル
CREATE TABLE departments (...);

-- 4. roles, organizations, departmentsに依存するテーブル
CREATE TABLE users (...);

-- 5. usersに依存するテーブル
CREATE TABLE user_sessions (...);

-- 6. rolesに依存するテーブル
CREATE TABLE role_functions (...);

-- 7. equipment_vendors, equipment_types, equipment_attributesに依存するテーブル
CREATE TABLE laboratory_equipment_masters (...);

-- 8. 循環参照の外部キー制約を追加
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_rep_admin 
FOREIGN KEY (representative_admin_id) REFERENCES users(id) ON DELETE SET NULL;
```

### B. 更新日時の自動更新トリガー

```sql
-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_functions_updated_at BEFORE UPDATE ON role_functions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_equipment_masters_updated_at BEFORE UPDATE ON laboratory_equipment_masters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_vendors_updated_at BEFORE UPDATE ON equipment_vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_types_updated_at BEFORE UPDATE ON equipment_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_attributes_updated_at BEFORE UPDATE ON equipment_attributes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### C. セッションクリーンアップ用SQL

```sql
-- 期限切れセッションの削除
DELETE FROM user_sessions 
WHERE expires_at < CURRENT_TIMESTAMP;

-- 定期実行推奨（例: 1時間ごと）
```

### D. サンプルデータ投入SQL

```sql
-- companies
INSERT INTO companies (company_code, company_name, shareable_across_organizations, status) VALUES
('K001', 'アルファテクノロジーズ株式会社', true, 'active'),
('K002', 'ベータサイエンス株式会社', false, 'active');

-- roles（標準ロールは本文参照）

-- equipment_vendors
INSERT INTO equipment_vendors (vendor_id, vendor_name) VALUES
('COS12345', 'コスモ計測株式会社'),
('COS12346', '日本精密機器株式会社');

-- equipment_types
INSERT INTO equipment_types (type_id, type_name) VALUES
('K001', '分光光度計'),
('RI89', '放射線測定器');

-- equipment_attributes
INSERT INTO equipment_attributes (attribute_id, attribute_name) VALUES
('A01', '高精度'),
('B02', '標準型');
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-06 | 初版作成 | Cline |

---

## 関連ドキュメント

- [ER図説明書](./er_diagram_3menus.md)
- [タスク計画書](../../20260106_1138_ER図作成_3メニュー_PLAN.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [セキュリティ規約](../../../.clinerules/development/security.md)
