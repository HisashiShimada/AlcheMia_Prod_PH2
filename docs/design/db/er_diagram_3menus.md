# ER図: プロバイダー・システム管理者・データ管理者メニュー

## メタデータ
- **作成日**: 2026-01-06
- **対象メニュー**: プロバイダーメニュー、システム管理者メニュー、データ管理者メニュー
- **データベース**: PostgreSQL
- **バージョン**: 1.0.0

## 1. 概要

本ER図は、mmdpfシステムにおける以下の3つのメニューで使用されるエンティティとそのリレーションシップを定義します。

### 対象メニュー

#### プロバイダーメニュー
- 会社管理
- 組織管理
- 情報ダウンロード

#### システム管理者メニュー
- システム概要
- 組織統計情報
- ユーザー管理
- セッション管理
- 部署管理
- ロール管理

#### データ管理者メニュー
- マスタ管理（実験機器マスタ）

## 2. エンティティ一覧

### 2.1. プロバイダーメニュー関連

| No | エンティティ名 | 論理名 | 説明 |
|----|---------------|--------|------|
| 1 | companies | 会社マスタ | 会社情報を管理 |
| 2 | organizations | 組織マスタ | 研究所などの組織情報を管理 |

### 2.2. システム管理者メニュー関連

| No | エンティティ名 | 論理名 | 説明 |
|----|---------------|--------|------|
| 3 | users | ユーザー | システムユーザー情報を管理 |
| 4 | user_sessions | ユーザーセッション | ログインセッション情報を管理 |
| 5 | departments | 部署マスタ | 組織内の部署情報を管理 |
| 6 | roles | ロールマスタ | システム管理者、データ管理者などのロールを定義 |
| 7 | role_functions | ロール機能 | ロールごとの権限・機能を定義 |

### 2.3. データ管理者メニュー関連

| No | エンティティ名 | 論理名 | 説明 |
|----|---------------|--------|------|
| 8 | laboratory_equipment_masters | 実験機器マスタ | 実験機器の基本情報を管理 |
| 9 | equipment_vendors | 機器ベンダーマスタ | 機器メーカー情報を管理 |
| 10 | equipment_types | 機器種別マスタ | 機器の種類を管理 |
| 11 | equipment_attributes | 機器属性マスタ | 機器の属性を管理 |

## 3. エンティティ関連図（テキスト表現）

```
┌─────────────────┐
│   companies     │
│  (会社マスタ)    │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐       N   ┌─────────────────┐
│ organizations   │───────────│  departments    │
│  (組織マスタ)    │           │  (部署マスタ)    │
└────────┬────────┘           └────────┬────────┘
         │ 1                           │ 1
         │                             │
         │ N                           │ N
┌────────▼────────┐       N   ┌─────────────────┐
│     users       │───────────│      roles      │
│  (ユーザー)      │           │  (ロールマスタ)  │
└────────┬────────┘           └────────┬────────┘
         │ 1                           │ 1
         │                             │
         │ N                           │ N
┌────────▼────────┐           ┌────────▼────────┐
│ user_sessions   │           │ role_functions  │
│(セッション)      │           │ (ロール機能)     │
└─────────────────┘           └─────────────────┘

┌──────────────────────────┐
│laboratory_equipment_     │
│       masters            │
│   (実験機器マスタ)        │
└───┬────────┬────────┬────┘
    │ N      │ N      │ N
    │        │        │
    │ 1      │ 1      │ 1
┌───▼───┐ ┌──▼──┐ ┌──▼───────┐
│vendors│ │types│ │attributes│
│(ベンダ)│ │(種別)│ │(属性)    │
└───────┘ └─────┘ └──────────┘
```

## 4. リレーションシップ詳細

### 4.1. companies - organizations (1:N)

**リレーションシップ**: 1つの会社は複数の組織を持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| companies | organizations | 1:N | company_id |

**制約**:
- 組織は必ず1つの会社に所属する（NOT NULL）
- 会社を削除する場合は、所属する組織がないことを確認する（RESTRICT）

---

### 4.2. organizations - users (1:N)

**リレーションシップ**: 1つの組織は複数のユーザーを持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| organizations | users | 1:N | organization_id |

**制約**:
- ユーザーは必ず1つの組織に所属する（NOT NULL）
- 組織を削除する場合は、所属するユーザーがないことを確認する（RESTRICT）

---

### 4.3. organizations - departments (1:N)

**リレーションシップ**: 1つの組織は複数の部署を持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| organizations | departments | 1:N | organization_id |

**制約**:
- 部署は必ず1つの組織に所属する（NOT NULL）
- 組織を削除する場合は、所属する部署がないことを確認する（RESTRICT）

---

### 4.4. departments - users (1:N)

**リレーションシップ**: 1つの部署は複数のユーザーを持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| departments | users | 1:N | department_id |

**制約**:
- ユーザーは1つの部署に所属する（NULL許可 - 部署未所属のユーザーも存在可能）
- 部署を削除する場合は、所属するユーザーの部署IDをNULLに設定する（SET NULL）

---

### 4.5. roles - users (1:N)

**リレーションシップ**: 1つのロールは複数のユーザーに割り当てられる

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| roles | users | 1:N | role_id |

**制約**:
- ユーザーは必ず1つのロールを持つ（NOT NULL）
- ロールを削除する場合は、割り当てられているユーザーがないことを確認する（RESTRICT）

---

### 4.6. roles - role_functions (1:N)

**リレーションシップ**: 1つのロールは複数の機能を持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| roles | role_functions | 1:N | role_id |

**制約**:
- ロール機能は必ず1つのロールに所属する（NOT NULL）
- ロールを削除する場合、関連するロール機能も削除する（CASCADE）

---

### 4.7. users - user_sessions (1:N)

**リレーションシップ**: 1人のユーザーは複数のセッションを持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| users | user_sessions | 1:N | user_id |

**制約**:
- セッションは必ず1人のユーザーに所属する（NOT NULL）
- ユーザーを削除する場合、関連するセッションも削除する（CASCADE）

---

### 4.8. users - organizations (N:1) - 代表管理者

**リレーションシップ**: 組織の代表管理者として1人のユーザーを指定

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| users | organizations | N:1 | representative_admin_id |

**制約**:
- 組織は代表管理者を持たない場合もある（NULL許可）
- 代表管理者ユーザーを削除する場合は、組織の代表管理者IDをNULLに設定する（SET NULL）

**注意**: このリレーションシップは循環参照を避けるため、アプリケーション層で制御することを推奨

---

### 4.9. equipment_vendors - laboratory_equipment_masters (1:N)

**リレーションシップ**: 1つのベンダーは複数の実験機器を提供

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| equipment_vendors | laboratory_equipment_masters | 1:N | vendor_id |

**制約**:
- 実験機器は必ず1つのベンダーに所属する（NOT NULL）
- ベンダーを削除する場合は、関連する実験機器がないことを確認する（RESTRICT）

---

### 4.10. equipment_types - laboratory_equipment_masters (1:N)

**リレーションシップ**: 1つの機器種別は複数の実験機器を持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| equipment_types | laboratory_equipment_masters | 1:N | type_id |

**制約**:
- 実験機器は必ず1つの種別に所属する（NOT NULL）
- 種別を削除する場合は、関連する実験機器がないことを確認する（RESTRICT）

---

### 4.11. equipment_attributes - laboratory_equipment_masters (1:N)

**リレーションシップ**: 1つの機器属性は複数の実験機器を持つ

| 親エンティティ | 子エンティティ | カーディナリティ | 外部キー |
|---------------|---------------|-----------------|---------|
| equipment_attributes | laboratory_equipment_masters | 1:N | attribute_id |

**制約**:
- 実験機器は必ず1つの属性を持つ（NOT NULL）
- 属性を削除する場合は、関連する実験機器がないことを確認する（RESTRICT）

## 5. インデックス設計

### 5.1. 主キーインデックス

すべてのテーブルの主キー（id）には自動的にインデックスが作成されます。

### 5.2. 外部キーインデックス

外部キーには検索性能向上のためインデックスを作成します。

| テーブル名 | インデックス名 | カラム | 説明 |
|-----------|---------------|--------|------|
| organizations | idx_organizations_company_id | company_id | 会社IDでの検索 |
| users | idx_users_organization_id | organization_id | 組織IDでの検索 |
| users | idx_users_department_id | department_id | 部署IDでの検索 |
| users | idx_users_role_id | role_id | ロールIDでの検索 |
| departments | idx_departments_organization_id | organization_id | 組織IDでの検索 |
| user_sessions | idx_user_sessions_user_id | user_id | ユーザーIDでの検索 |
| role_functions | idx_role_functions_role_id | role_id | ロールIDでの検索 |
| laboratory_equipment_masters | idx_lab_equipment_vendor_id | vendor_id | ベンダーIDでの検索 |
| laboratory_equipment_masters | idx_lab_equipment_type_id | type_id | 種別IDでの検索 |
| laboratory_equipment_masters | idx_lab_equipment_attr_id | attribute_id | 属性IDでの検索 |

### 5.3. ユニークインデックス

| テーブル名 | インデックス名 | カラム | 説明 |
|-----------|---------------|--------|------|
| companies | uk_companies_company_code | company_code | 会社コードの一意性 |
| organizations | uk_organizations_organization_id | organization_id | 組織IDの一意性 |
| users | uk_users_user_id | user_id | ユーザーIDの一意性 |
| users | uk_users_email | email | メールアドレスの一意性 |
| user_sessions | uk_user_sessions_session_id | session_id | セッションIDの一意性 |
| departments | uk_departments_department_id | department_id | 部署IDの一意性 |
| roles | uk_roles_role_code | role_code | ロールコードの一意性 |
| equipment_vendors | uk_equipment_vendors_vendor_id | vendor_id | ベンダーIDの一意性 |
| equipment_types | uk_equipment_types_type_id | type_id | 種別IDの一意性 |
| equipment_attributes | uk_equipment_attributes_attr_id | attribute_id | 属性IDの一意性 |
| laboratory_equipment_masters | uk_lab_equipment_equipment_id | equipment_id | 機器IDの一意性 |

### 5.4. 複合インデックス

| テーブル名 | インデックス名 | カラム | 説明 |
|-----------|---------------|--------|------|
| user_sessions | idx_user_sessions_user_current | user_id, is_current | ユーザーの現在のセッション検索 |
| departments | idx_departments_org_active | organization_id, is_active | 組織の有効な部署検索 |
| laboratory_equipment_masters | idx_lab_equipment_active | is_active, updated_at | 有効な機器の更新日時順検索 |

## 6. 正規化

### 第1正規形（1NF）
- すべてのテーブルの各列は原子値（分割不可能な値）を持つ
- 各行は一意に識別可能

### 第2正規形（2NF）
- 1NFを満たす
- 部分関数従属性を排除（非キー属性が主キーの一部にのみ依存しない）

### 第3正規形（3NF）
- 2NFを満たす
- 推移的関数従属性を排除（非キー属性が他の非キー属性に依存しない）

すべてのテーブルは第3正規形を満たすように設計されています。

## 7. データ整合性制約

### 7.1. NOT NULL制約

主要な必須項目にNOT NULL制約を設定します。詳細は各テーブル定義を参照。

### 7.2. CHECK制約

| テーブル名 | カラム | 制約内容 |
|-----------|--------|----------|
| companies | status | IN ('active', 'inactive') |
| organizations | status | IN ('active', 'inactive') |
| users | is_active | BOOLEAN |
| user_sessions | is_current | BOOLEAN |
| departments | is_active | BOOLEAN |
| roles | is_active | BOOLEAN |
| role_functions | is_active | BOOLEAN |
| laboratory_equipment_masters | is_active | BOOLEAN |
| equipment_vendors | is_active | BOOLEAN |
| equipment_types | is_active | BOOLEAN |
| equipment_attributes | is_active | BOOLEAN |

### 7.3. 外部キー制約

外部キー制約のアクションは以下のように設定します：

- **RESTRICT**: 親レコード削除時、子レコードが存在する場合は削除を拒否
- **CASCADE**: 親レコード削除時、子レコードも自動削除
- **SET NULL**: 親レコード削除時、子レコードの外部キーをNULLに設定

## 8. タイムスタンプ管理

### 8.1. created_at（作成日時）
- すべてのテーブルに設定
- デフォルト値: CURRENT_TIMESTAMP
- 更新不可

### 8.2. updated_at（更新日時）
- すべてのテーブルに設定
- デフォルト値: CURRENT_TIMESTAMP
- 更新時に自動更新（トリガーまたはアプリケーション層で制御）

## 9. セキュリティ考慮事項

### 9.1. パスワード保存
- usersテーブルのpassword_hashカラムにはbcryptでハッシュ化されたパスワードを保存
- 平文パスワードは保存しない

### 9.2. セッション管理
- user_sessionsテーブルでセッション情報を管理
- expires_atカラムで有効期限を制御
- 定期的な期限切れセッションのクリーンアップが必要

### 9.3. 論理削除
- 物理削除ではなく、is_activeフラグでの論理削除を推奨
- 監査ログとしてデータを保持

## 10. パフォーマンス考慮事項

### 10.1. インデックス戦略
- 頻繁に検索されるカラムにインデックスを作成
- 外部キーには必ずインデックスを作成
- 複合インデックスは検索パターンに応じて設計

### 10.2. パーティショニング
- user_sessionsテーブルは時系列データのため、将来的にパーティショニングを検討
- created_atカラムでの月次パーティショニングを推奨

## 11. マイグレーション戦略

### 11.1. マイグレーション順序
テーブル作成は以下の順序で実行する必要があります：

1. companies
2. roles
3. equipment_vendors
4. equipment_types
5. equipment_attributes
6. organizations
7. departments
8. users
9. user_sessions
10. role_functions
11. laboratory_equipment_masters

### 11.2. 外部キー追加
循環参照を避けるため、organizations.representative_admin_idの外部キー制約は、すべてのテーブル作成後に追加します。

## 12. 今後の拡張性

### 12.1. 追加予定のエンティティ
- projects（プロジェクト）
- experiments（実験）
- files（ファイル）
- tasks（タスク）
- workflows（ワークフロー）

### 12.2. リレーションシップの拡張
- users - projects（ユーザーとプロジェクトの関連）
- projects - experiments（プロジェクトと実験の関連）
- experiments - laboratory_equipment_masters（実験と機器の関連）

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-06 | 初版作成 | Cline |

## 14. 関連ドキュメント

- [テーブル定義書](./table_definitions_3menus.md)
- [タスク計画書](../../20260106_1138_ER図作成_3メニュー_PLAN.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [セキュリティ規約](../../../.clinerules/development/security.md)
