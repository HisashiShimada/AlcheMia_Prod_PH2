# エンティティと画面の対応表

## メタデータ
- **作成日**: 2026-01-13
- **対象システム**: mmdpf（マルチモーダルデータプラットフォーム）
- **対象メニュー**: プロバイダーメニュー、システム管理者メニュー、データ管理者メニュー
- **バージョン**: 1.0.0

---

## 1. エンティティ別画面一覧

### 1.1. companies（会社マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | 会社管理 | プロバイダー | CRUD | 会社の登録・更新・削除・一覧表示 |
| 2 | 組織管理 | プロバイダー | Read | 組織の所属会社表示（外部キー参照） |
| 3 | システム概要 | システム管理者 | Read | 会社数の集計・統計表示 |

**主な使用カラム:**
- 会社管理: 全カラム（id, company_code, company_name, shareable_across_organizations, status, created_at, updated_at）
- 組織管理: company_name（表示用）
- システム概要: COUNT(id)（集計用）

---

### 1.2. organizations（組織マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | 組織管理 | プロバイダー | CRUD | 組織の登録・更新・削除・一覧表示 |
| 2 | システム概要 | システム管理者 | Read | 組織数の集計・統計表示 |
| 3 | 組織統計情報 | システム管理者 | Read | 組織別の統計情報表示 |
| 4 | ユーザー管理 | システム管理者 | Read | ユーザーの所属組織表示（外部キー参照） |
| 5 | 部署管理 | システム管理者 | Read | 部署の所属組織表示（外部キー参照） |
| 6 | 情報ダウンロード | プロバイダー | Read | 組織情報のエクスポート |

**主な使用カラム:**
- 組織管理: 全カラム（id, organization_id, organization_name, display_name, email, representative_admin_id, company_id, certificate_url, status, created_at, updated_at）
- システム概要: COUNT(id)（集計用）
- 組織統計情報: organization_name, organization_id（表示・フィルタ用）
- ユーザー管理: organization_name（表示用）
- 部署管理: organization_name（表示用）

---

### 1.3. departments（部署マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | 部署管理 | システム管理者 | CRUD | 部署の登録・更新・削除・一覧表示 |
| 2 | ユーザー管理 | システム管理者 | Read | ユーザーの所属部署表示（外部キー参照） |
| 3 | システム概要 | システム管理者 | Read | 部署数の集計・統計表示 |
| 4 | マスタ管理 | データ管理者 | Read | マスタデータ選択時の部署フィルタ |

**主な使用カラム:**
- 部署管理: 全カラム（id, department_id, organization_id, department_name, display_name, is_active, created_at, updated_at）
- ユーザー管理: department_name（表示用）
- システム概要: COUNT(id)（集計用）
- マスタ管理: department_name（フィルタ用）

---

### 1.4. roles（ロールマスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | ロール管理 | システム管理者 | CRUD | ロールの登録・更新・削除・一覧表示 |
| 2 | ユーザー管理 | システム管理者 | Read | ユーザーのロール表示・編集（外部キー参照） |
| 3 | システム概要 | システム管理者 | Read | ロール別ユーザー数の集計 |

**主な使用カラム:**
- ロール管理: 全カラム（id, role_code, role_name, role_name_en, description, is_active, created_at, updated_at）
- ユーザー管理: role_name（表示・選択用）
- システム概要: role_name, COUNT(*)（集計用）

---

### 1.5. organization_users（組織利用者）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | ユーザー管理 | システム管理者 | CRUD | ユーザーの登録・更新・削除・一覧表示 |
| 2 | セッション管理 | システム管理者 | Read | セッション一覧のユーザー表示（外部キー参照） |
| 3 | システム概要 | システム管理者 | Read | ユーザー数の集計・統計表示 |
| 4 | 組織統計情報 | システム管理者 | Read | 組織別ユーザー数の集計 |
| 5 | 組織管理 | プロバイダー | Read | 代表管理者の表示（representative_admin_id参照） |
| 6 | 情報ダウンロード | プロバイダー | Read | ユーザー情報のエクスポート |

**主な使用カラム:**
- ユーザー管理: 全カラム（id, organization_user_id, last_name, first_name, email, password_hash, department_id, role_id, organization_id, two_factor_auth_enabled, last_login_at, is_active, avatar_text, created_at, updated_at）
- セッション管理: last_name, first_name, email（表示用）
- システム概要: COUNT(id), COUNT(CASE WHEN is_active THEN 1 END)（集計用）
- 組織統計情報: COUNT(id) GROUP BY organization_id（集計用）
- 組織管理: last_name, first_name（代表管理者表示用）

---

### 1.6. organization_user_sessions（組織利用者セッション）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | セッション管理 | システム管理者 | RD | セッションの一覧表示・削除（強制ログアウト） |
| 2 | システム概要 | システム管理者 | Read | アクティブセッション数の集計 |
| 3 | ユーザー管理 | システム管理者 | Read | ユーザーのログイン状態表示（is_current参照） |

**主な使用カラム:**
- セッション管理: 全カラム（id, session_id, organization_user_id, login_time, last_activity_time, ip_address, user_agent, is_current, expires_at, created_at）
- システム概要: COUNT(id) WHERE is_current=true AND expires_at > NOW()（集計用）
- ユーザー管理: last_login_at（最終ログイン日時表示）

---

### 1.7. role_functions（ロール機能）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | ロール管理 | システム管理者 | CRUD | ロールごとの権限設定・一覧表示 |
| 2 | システム概要 | システム管理者 | Read | ロール別機能数の集計 |

**主な使用カラム:**
- ロール管理: 全カラム（id, role_id, function_id, function_name, permission_type, is_active, created_at, updated_at）
- システム概要: COUNT(id) GROUP BY role_id（集計用）

**権限種別の使用例:**
- `read`: 閲覧のみ可能
- `write`: 編集・追加可能
- `admin`: 削除・管理機能も可能

---

### 1.8. equipment_vendors（機器ベンダーマスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | マスタ管理 > 機器ベンダー | データ管理者 | CRUD | 機器ベンダーの登録・更新・削除・一覧表示 |
| 2 | マスタ管理 > 実験機器 | データ管理者 | Read | 実験機器のベンダー表示・選択（外部キー参照） |
| 3 | 情報ダウンロード | プロバイダー | Read | マスタ情報のエクスポート |

**主な使用カラム:**
- マスタ管理: 全カラム（id, vendor_id, vendor_name, is_active, created_at, updated_at）
- 実験機器管理: vendor_name（表示・選択用）

---

### 1.9. equipment_types（機器種別マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | マスタ管理 > 機器種別 | データ管理者 | CRUD | 機器種別の登録・更新・削除・一覧表示 |
| 2 | マスタ管理 > 実験機器 | データ管理者 | Read | 実験機器の種別表示・選択（外部キー参照） |
| 3 | 情報ダウンロード | プロバイダー | Read | マスタ情報のエクスポート |

**主な使用カラム:**
- マスタ管理: 全カラム（id, type_id, type_name, is_active, created_at, updated_at）
- 実験機器管理: type_name（表示・選択用）

---

### 1.10. equipment_attributes（機器属性マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | マスタ管理 > 機器属性 | データ管理者 | CRUD | 機器属性の登録・更新・削除・一覧表示 |
| 2 | マスタ管理 > 実験機器 | データ管理者 | Read | 実験機器の属性表示・選択（外部キー参照） |
| 3 | 情報ダウンロード | プロバイダー | Read | マスタ情報のエクスポート |

**主な使用カラム:**
- マスタ管理: 全カラム（id, attribute_id, attribute_name, is_active, created_at, updated_at）
- 実験機器管理: attribute_name（表示・選択用）

---

### 1.11. laboratory_equipment_masters（実験機器マスタ）

| No | 画面名 | メニュー | 操作種別 | 用途 |
|----|--------|----------|----------|------|
| 1 | マスタ管理 > 実験機器 | データ管理者 | CRUD | 実験機器の登録・更新・削除・一覧表示 |
| 2 | 情報ダウンロード | プロバイダー | Read | マスタ情報のエクスポート |

**主な使用カラム:**
- マスタ管理: 全カラム（id, equipment_id, equipment_name, vendor_id, type_id, attribute_id, is_active, created_at, updated_at）

**外部キー参照:**
- vendor_id → equipment_vendors.id
- type_id → equipment_types.id
- attribute_id → equipment_attributes.id

---

## 2. 画面別エンティティ一覧

### 2.1. プロバイダーメニュー

#### 2.1.1. 会社管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| companies | CRUD | メインテーブル |

#### 2.1.2. 組織管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| organizations | CRUD | メインテーブル |
| companies | Read | 所属会社表示（外部キー） |
| organization_users | Read | 代表管理者表示（外部キー） |

#### 2.1.3. 情報ダウンロード

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| companies | Read | 会社情報エクスポート |
| organizations | Read | 組織情報エクスポート |
| organization_users | Read | ユーザー情報エクスポート |
| departments | Read | 部署情報エクスポート |
| roles | Read | ロール情報エクスポート |
| equipment_vendors | Read | 機器ベンダーエクスポート |
| equipment_types | Read | 機器種別エクスポート |
| equipment_attributes | Read | 機器属性エクスポート |
| laboratory_equipment_masters | Read | 実験機器エクスポート |

---

### 2.2. システム管理者メニュー

#### 2.2.1. システム概要

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| companies | Read | 会社数集計 |
| organizations | Read | 組織数集計 |
| departments | Read | 部署数集計 |
| organization_users | Read | ユーザー数・アクティブユーザー数集計 |
| organization_user_sessions | Read | アクティブセッション数集計 |
| roles | Read | ロール別ユーザー数集計 |
| role_functions | Read | ロール別機能数集計 |

#### 2.2.2. 組織統計情報

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| organizations | Read | 組織一覧・フィルタ |
| organization_users | Read | 組織別ユーザー数集計 |

#### 2.2.3. ユーザー管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| organization_users | CRUD | メインテーブル |
| organizations | Read | 所属組織表示（外部キー） |
| departments | Read | 所属部署表示・選択（外部キー） |
| roles | Read | ロール表示・選択（外部キー） |
| organization_user_sessions | Read | ログイン状態表示 |

#### 2.2.4. セッション管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| organization_user_sessions | RD | メインテーブル（削除=強制ログアウト） |
| organization_users | Read | ユーザー情報表示（外部キー） |

#### 2.2.5. 部署管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| departments | CRUD | メインテーブル |
| organizations | Read | 所属組織表示（外部キー） |

#### 2.2.6. ロール管理

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| roles | CRUD | メインテーブル |
| role_functions | CRUD | ロール別権限設定 |

---

### 2.3. データ管理者メニュー

#### 2.3.1. マスタ管理 > 機器ベンダー

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| equipment_vendors | CRUD | メインテーブル |

#### 2.3.2. マスタ管理 > 機器種別

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| equipment_types | CRUD | メインテーブル |

#### 2.3.3. マスタ管理 > 機器属性

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| equipment_attributes | CRUD | メインテーブル |

#### 2.3.4. マスタ管理 > 実験機器

| エンティティ | 操作種別 | 用途 |
|-------------|----------|------|
| laboratory_equipment_masters | CRUD | メインテーブル |
| equipment_vendors | Read | ベンダー表示・選択（外部キー） |
| equipment_types | Read | 種別表示・選択（外部キー） |
| equipment_attributes | Read | 属性表示・選択（外部キー） |
| departments | Read | 部署フィルタ |

---

## 3. エンティティの重要度分類

### 3.1. コアエンティティ（最重要）

システムの基盤となる必須エンティティ

| エンティティ | 理由 |
|-------------|------|
| organizations | すべてのマルチテナント分離の基点 |
| organization_users | システムの主要利用者 |
| roles | 権限管理の基盤 |

### 3.2. 第1層エンティティ（重要）

コアエンティティを支える重要なマスタデータ

| エンティティ | 理由 |
|-------------|------|
| companies | 組織の上位概念 |
| departments | 組織構造を表現 |
| role_functions | 詳細な権限制御 |
| organization_user_sessions | セキュリティ・セッション管理 |

### 3.3. 第2層エンティティ（補助）

業務データを支えるマスタデータ

| エンティティ | 理由 |
|-------------|------|
| laboratory_equipment_masters | 実験機器の中心データ |
| equipment_vendors | 実験機器の補足情報 |
| equipment_types | 実験機器の補足情報 |
| equipment_attributes | 実験機器の補足情報 |

---

## 4. データアクセスパターン

### 4.1. 読み取り頻度（高）

| エンティティ | アクセス頻度 | 主なアクセス元 |
|-------------|-------------|--------------|
| organization_users | 非常に高 | 全画面（ログインユーザー情報） |
| organizations | 高 | 全画面（テナント情報） |
| roles | 高 | 権限チェック |
| departments | 中 | ユーザー管理画面 |

### 4.2. 書き込み頻度（高）

| エンティティ | 更新頻度 | 主な更新処理 |
|-------------|---------|------------|
| organization_user_sessions | 非常に高 | ログイン・ログアウト |
| organization_users | 中 | ユーザー情報更新・最終ログイン日時 |
| laboratory_equipment_masters | 低〜中 | マスタデータメンテナンス |

---

## 5. 関連ドキュメント

- [ER図（A5er形式）](./er_diagram_organization_users.a5er)
- [ER図説明書](./design/db/er_diagram_3menus.md)
- [テーブル定義書](./design/db/table_definitions_3menus.md)

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-13 | 初版作成 | Cline |

---

## 7. 備考

### 7.1. 操作種別の凡例

- **C**: Create（新規作成）
- **R**: Read（読み取り）
- **U**: Update（更新）
- **D**: Delete（削除）
- **CRUD**: すべての操作が可能
- **RD**: 読み取りと削除のみ

### 7.2. 今後の拡張予定

以下のエンティティは、Phase 2以降で追加予定：

- projects（プロジェクト）
- experiments（実験）
- files（ファイル）
- tasks（タスク）
- workflows（ワークフロー）

これらのエンティティは、実験管理者メニューと実験作業者メニューで使用されます。
