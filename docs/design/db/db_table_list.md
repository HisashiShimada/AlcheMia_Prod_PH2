# データベーステーブル一覧

## 概要

このドキュメントは、mmdpfプロジェクトで使用する全テーブルの物理名、論理名、主要カラム、DDLファイルの対応表です。

**重要**: DDLファイルを変更した際は、必ずこのファイルも更新してください。

**最終更新**: 2026-01-16
**ER図ファイル**: `docs/design/db/er_diagram.a5er`
**DDLディレクトリ**: `docs/design/db/ddl/`

---

## 📋 テーブル一覧（カテゴリ別）

### 1. 認証関連テーブル

#### 1.1 corporation（会社）
- **物理名**: `corporation`
- **論理名**: 会社
- **DDLファイル**: `docs/design/db/ddl/corporation.sql`
- **主キー**: `corporation_code` (VARCHAR(30))
- **主要カラム**:
  - `corporation_code` - 会社CD
  - `corporation_name` - 会社名

---

#### 1.2 organization（組織）
- **物理名**: `organization`
- **論理名**: 組織
- **DDLファイル**: `docs/design/db/ddl/organization.sql`
- **主キー**: `organization_id` (UUID)
- **主要カラム**:
  - `organization_id` - 組織ID
  - `organization_name` - 組織名
  - `organization_display_name` - 組織表示名
  - `organization_email` - 組織E-mail
  - `corporation_code` - 会社CD (FK: corporation)
  - `is_active` - アクティブ判定
  - `create_at` - 作成日時
  - `update_at` - 更新日時
- **外部キー**: 
  - `corporation_code` → `corporation(corporation_code)`

---

#### 1.3 organization_user（組織利用者）
- **物理名**: `organization_user`
- **論理名**: 組織利用者
- **DDLファイル**: `docs/design/db/ddl/organization_user.sql`
- **主キー**: `user_id` (UUID), `organization_id` (UUID)
- **主要カラム**:
  - `user_id` - ユーザID
  - `organization_id` - 組織ID (FK: organization)
  - `user_name` - ユーザ名
  - `role` - ロール
  - `mail_address` - メールアドレス
  - `locked_until` - 有効期限
  - `last_login` - 最終ログイン日時
  - `is_active` - アクティブ判定
  - `create_at` - 作成日時
  - `update_at` - 更新日時
- **外部キー**:
  - `organization_id` → `organization(organization_id)`

---

#### 1.4 user_authentication（利用者認証）
- **物理名**: `user_authentication`
- **論理名**: 利用者認証
- **DDLファイル**: `docs/design/db/ddl/user_authentication.sql`
- **主キー**: `user_id` (UUID), `organization_id` (UUID)
- **主要カラム**:
  - `user_id` - ユーザID (FK: organization_user)
  - `organization_id` - 組織ID (FK: organization_user)
  - `password` - ハッシュパスワード
  - `entry_flg` - 二段階認証アプリ連携フラグ
  - `create_at` - 作成日時
  - `update_at` - 更新日時
- **外部キー**:
  - `(user_id, organization_id)` → `organization_user(user_id, organization_id)`

---

#### 1.5 pin_codes（PINコード）
- **物理名**: `pin_codes`
- **論理名**: PINコード
- **DDLファイル**: `docs/design/db/ddl/pin_codes.sql`
- **説明**: メールPINコード二段階認証用の一時データ
- **主キー**: `id` (SERIAL)
- **主要カラム**:
  - `id` - ID
  - `user_id` - ユーザID (FK: organization_user)
  - `organization_id` - 組織ID (FK: organization_user)
  - `pin_code` - PINコード（6桁数字）
  - `session_token` - セッショントークン
  - `is_used` - 使用済みフラグ
  - `used_at` - 使用日時
  - `expires_at` - 有効期限（作成時刻 + 5分）
  - `attempts_count` - 試行回数（0-3）
  - `max_attempts` - 最大試行回数（デフォルト: 3）
  - `created_at` - 作成日時
- **外部キー**:
  - `(user_id, organization_id)` → `organization_user(user_id, organization_id)`
- **インデックス**:
  - `idx_pin_codes_pin_session` (UNIQUE) - pin_code, session_token
  - `idx_pin_codes_user` - user_id
  - `idx_pin_codes_token` - session_token
  - `idx_pin_codes_expires` - expires_at
  - `idx_pin_codes_is_used` - is_used

---

#### 1.6 login_history（ログイン履歴）
- **物理名**: `login_history`
- **論理名**: ログイン履歴
- **DDLファイル**: `docs/design/db/ddl/login_history.sql`
- **主キー**: `id` (SERIAL)
- **主要カラム**:
  - `id` - ID
  - `user_name` - ユーザ名
  - `organization_id` - 組織ID
  - `login_at` - ログイン日時
  - `login_sf` - ログイン成否
  - `failure_reason` - 失敗原因
  - `ip_address` - IPアドレス（セキュリティ監査用、IPv4/IPv6対応）
  - `user_agent` - User-Agent（ブラウザ・OS情報）
- **インデックス**:
  - `idx_login_history_rate_limit` - login_at, login_sf

---

#### 1.7 function（機能）
- **物理名**: `function`
- **論理名**: 機能
- **DDLファイル**: `docs/design/db/ddl/function.sql`
- **主キー**: `function_id` (VARCHAR(30))
- **主要カラム**:
  - `function_id` - 機能ID
  - `permission` - 機能名

---

#### 1.8 role_permission（ロール権限）
- **物理名**: `role_permission`
- **論理名**: ロール権限
- **DDLファイル**: `docs/design/db/ddl/role_permission.sql`
- **主キー**: `role` (VARCHAR(30)), `function_id` (VARCHAR(30))
- **主要カラム**:
  - `role` - ロール（ユーザのロールと同一）
  - `function_id` - 機能ID（画面単位の機能ID）(FK: function)
  - `permission` - 権限（CRUDの権限）
- **外部キー**:
  - `function_id` → `function(function_id)`

---

### 2. プロジェクト管理関連テーブル

#### 2.1 project（プロジェクト）
- **物理名**: `project`
- **論理名**: プロジェクト
- **DDLファイル**: `docs/design/db/ddl/project.sql`
- **主キー**: `organization_id` (UUID), `project_id` (UUID)
- **主要カラム**:
  - `organization_id` - 組織ID (FK: organization)
  - `project_id` - プロジェクトID
  - `project_name` - プロジェクト名（プロジェクト名かつフォルダ名）
  - `description` - 概要
  - `department_id` - 部門ID
  - `owner_user_id` - 所有者ユーザID
  - `project_status` - プロジェクトステータス
  - `project_maiml_flg` - プロジェクトMaiml有無（false:ファイルなし、true:ファイルあり）
  - `checkout_status` - チェックアウトステータス
  - `create_at` - 作成日
- **外部キー**:
  - `organization_id` → `organization(organization_id)`
- **インデックス**:
  - `idx_project_organization_id` - organization_id
  - `idx_project_owner_user_id` - owner_user_id
  - `idx_project_status` - project_status
  - `idx_project_department_id` - department_id

---

#### 2.2 project_task（プロジェクトタスク）
- **物理名**: `project_task`
- **論理名**: プロジェクトタスク
- **DDLファイル**: `docs/design/db/ddl/project_task.sql`
- **主キー**: `organization_id` (UUID), `project_id` (UUID), `method_id` (VARCHAR)
- **主要カラム**:
  - `organization_id` - 組織ID (FK: project)
  - `project_id` - プロジェクトID (FK: project)
  - `method_id` - メソッドID
  - `task_name` - タスク名
  - `experiment_order` - 実験順序
  - `experiment_condition` - 実験条件
  - `attempts_count` - 試行回数
- **外部キー**:
  - `(organization_id, project_id)` → `project(organization_id, project_id)`

---

#### 2.3 project_task_detail（プロジェクトタスク_詳細）
- **物理名**: `project_task_detail`
- **論理名**: プロジェクトタスク_詳細
- **DDLファイル**: `docs/design/db/ddl/project_task_detail.sql`
- **主キー**: `organization_id` (UUID), `project_id` (UUID), `method_id` (VARCHAR), `task_no` (NUMERIC)
- **主要カラム**:
  - `organization_id` - 組織ID (FK: project_task)
  - `project_id` - プロジェクトID (FK: project_task)
  - `method_id` - メソッドID (FK: project_task)
  - `task_no` - タスク連番
  - `task_status` - タスクステータス
  - `experiment_start_at` - 実験開始日
  - `experiment_end_at` - 実験終了日
  - `experiment_user_id` - 実験作業者ID
  - `reviewed_at` - レビュー完了日
  - `review_user_id` - レビュアーID
- **外部キー**:
  - `(organization_id, project_id, method_id)` → `project_task(organization_id, project_id, method_id)`

---

#### 2.4 project_instruction（プロジェクト指示）
- **物理名**: `project_instruction`
- **論理名**: プロジェクト指示
- **DDLファイル**: `docs/design/db/ddl/project_instruction.sql`
- **主キー**: `organization_id` (UUID), `project_id` (UUID), `experiment_instruction_id` (VARCHAR)
- **主要カラム**:
  - `organization_id` - 組織ID (FK: project)
  - `project_id` - プロジェクトID (FK: project)
  - `experiment_instruction_id` - 実験指示ID
  - `instruction_target` - 指示対象（1:ファイル全体、2:タスク、3:トランジション）
  - `priority` - 優先度
  - `type` - タイプ
  - `task_no` - タスク連番
  - `transition_id` - トランジションID
  - `instructions` - 指示内容
  - `instruction_user_id` - 実験指示ユーザID
  - `instruction_date` - 指示送信日
- **外部キー**:
  - `(organization_id, project_id)` → `project(organization_id, project_id)`

---

### 3. 共通マスタテーブル

#### 3.1 code_master（コードマスタ）
- **物理名**: `code_master`
- **論理名**: コードマスタ
- **DDLファイル**: `docs/design/db/ddl/code_master.sql`
- **主キー**: `organization_id` (UUID), `code_division` (VARCHAR(30)), `code_value` (VARCHAR(30))
- **主要カラム**:
  - `organization_id` - 組織ID
  - `code_division` - コード区分
  - `code_value` - コード値
  - `code_description` - コード概要
  - `code_name` - コード名称
  - `code_remark` - 備考

---

#### 3.2 creator（作成者マスタ）
- **物理名**: `creator`
- **論理名**: 作成者マスタ
- **DDLファイル**: `docs/design/db/ddl/creator.sql`
- **主キー**: `organaization_id` (UUID), `creator_uuid` (UUID)
- **主要カラム**:
  - `organaization_id` - 組織ID
  - `creator_uuid` - 作成者_uuid
  - `creator_id` - 作成者_ID
  - `creator_name` - 作成者_名称
  - `creator_description` - 作成者_説明
  - `creator_annotation` - 作成者_注釈

---

#### 3.3 owner（所有者マスタ）
- **物理名**: `owner`
- **論理名**: 所有者マスタ
- **DDLファイル**: `docs/design/db/ddl/owner.sql`
- **主キー**: `organization_id` (UUID), `owner_uuid` (UUID)
- **主要カラム**:
  - `organization_id` - 組織ID
  - `owner_uuid` - 所有者_uuid
  - `owner_id` - 所有者_ID
  - `owner_name` - 所有者_名称
  - `owner_description` - 所有者_説明
  - `owner_annotation` - 所有者_注釈

---

#### 3.4 instrument（実験装置マスタ）
- **物理名**: `instrument`
- **論理名**: 実験装置マスタ
- **DDLファイル**: `docs/design/db/ddl/instrument.sql`
- **主キー**: `organization_id` (UUID), `instrument_uuid` (UUID)
- **主要カラム**:
  - `organization_id` - 組織ID
  - `instrument_uuid` - 実験装置_uuid
  - `instrument_id` - 実験装置_ID
  - `instrument_name` - 実験装置_名称
  - `instrument_description` - 実験装置_説明
  - `instrument_annotation` - 実験装置_注釈

---

#### 3.5 vendor（ベンダーマスタ）
- **物理名**: `vendor`
- **論理名**: ベンダーマスタ
- **DDLファイル**: `docs/design/db/ddl/vendor.sql`
- **主キー**: `organization_id` (UUID), `vendor_uuid` (UUID)
- **主要カラム**:
  - `organization_id` - 組織ID
  - `vendor_uuid` - ベンダー_uuid
  - `vendor_id` - ベンダー_ID
  - `vendor_name` - ベンダー_名称
  - `vendor_description` - ベンダー_説明
  - `vendor_annotation` - ベンダー_注釈

---

#### 3.6 attribute（属性マスタ）
- **物理名**: `attribute`
- **論理名**: 属性マスタ
- **DDLファイル**: `docs/design/db/ddl/attribute.sql`
- **主キー**: `organization_id` (UUID), `attribute_id` (VARCHAR)
- **主要カラム**:
  - `organization_id` - 組織ID
  - `attribute_id` - 属性_ID
  - `attribute_name` - 属性_名称
  - `attribute_value` - 属性_属性値

---

### 4. ファイル管理関連テーブル

#### 4.1 file_metadata（ファイルメタデータ）
- **物理名**: `file_metadata`
- **論理名**: ファイルメタデータ
- **DDLファイル**: `docs/design/db/ddl/file_metadata.sql`
- **説明**: S3/Swiftファイルのメタデータ管理テーブル（v1.0 - 初期実装: S3アクセス必須カラムのみ）
- **主キー**: `file_key` (VARCHAR(500)) - S3キーを主キーとする自然キー設計
- **主要カラム**:
  - `file_key` - S3キー（org_prefix/path/to/file形式、主キー）
  - `s3_bucket` - S3バケット名またはSwiftコンテナ名
  - `organization_id` - 組織ID（マルチテナント分離用、必須）
  - `original_filename` - 元のファイル名（アップロード時の名前）
  - `file_size` - ファイルサイズ（バイト単位）
  - `file_type` - MIMEタイプ（例: application/xml）
  - `uploaded_by` - アップロードユーザーID
  - `created_at` - 作成日時（自動設定）
  - `updated_at` - 更新日時（トリガーで自動更新）
- **外部キー**: なし
- **インデックス**:
  - `idx_file_metadata_organization_id` - organization_id（マルチテナント分離必須）
  - `idx_file_metadata_uploaded_by` - uploaded_by（ユーザー単位のファイル一覧取得用）
- **トリガー**:
  - `update_file_metadata_updated_at` - updated_at自動更新
- **特記事項**:
  - file_keyは主キーなので、インデックスは自動作成される
  - すべてのクエリでorganization_idフィルタを必須とする
  - v2.0でMAIML解析メタデータ追加予定

---

## 📊 テーブル数サマリー

| カテゴリ | テーブル数 |
|---------|----------|
| 認証関連 | 8 |
| プロジェクト管理関連 | 4 |
| 共通マスタ | 6 |
| ファイル管理関連 | 1 |
| **合計** | **19** |

---

## 🔗 主要な外部キー関係

### 認証フロー
```
corporation
  ↓
organization
  ↓
organization_user
  ↓ ↓
  │ └→ user_authentication
  └→ pin_codes

function
  ↓
role_permission
```

### プロジェクト管理フロー
```
organization
  ↓
project
  ↓
project_task
  ↓
project_task_detail

project
  ↓
project_instruction
```

---

## 📌 重要な設計原則

### 1. マルチテナント分離
- **すべてのテーブル**に `organization_id` カラムを含める（corporation以外）
- すべてのクエリに `organization_id` フィルタを必須とする
- クロステナントアクセスを防ぐ

### 2. UUID使用
- 主要な識別子（organization_id, user_id, project_id等）にUUIDを使用
- セキュリティと一意性を確保

### 3. タイムスタンプ
- 作成日時: `create_at` / `created_at`
- 更新日時: `update_at` / `updated_at`
- テーブルによって命名が異なるため注意

### 4. インデックス設計
- 外部キーカラムに必ずインデックスを作成
- 検索頻度の高いカラムにインデックスを作成
- JSONB型カラムにはGINインデックスを使用

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-16 | file_metadataテーブル追加（ファイル管理関連カテゴリ新設、合計19テーブル） | Cline |
| 2026-01-09 | DDLファイル削除に伴い18テーブルに調整（format, format_subfolder, experiment_recordを削除） | Cline |
| 2026-01-09 | DDLファイルが存在するテーブルのみに絞り込み（21テーブル） | Cline |
| 2026-01-09 | 初版作成（24テーブル） | Cline |
