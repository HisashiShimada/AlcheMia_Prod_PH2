# 認証関連テーブル DDL

このディレクトリには、材料開発データ管理システムの認証関連ER図から生成されたCREATE文が格納されています。

## 📋 テーブル一覧

| ファイル名 | テーブル名 | 説明 |
|-----------|-----------|------|
| corporation.sql | corporation | 会社マスタテーブル |
| organization.sql | organization | 組織マスタテーブル |
| organization_user.sql | organization_user | 組織利用者テーブル |
| user_authentication.sql | user_authentication | 利用者認証テーブル |
| pin_codes.sql | pin_codes | PINコードテーブル（二段階認証用） |
| login_history.sql | login_history | ログイン履歴テーブル |
| function.sql | function | 機能マスタテーブル |
| role_permission.sql | role_permission | ロール権限テーブル |

## 🔗 テーブル依存関係

```
corporation (会社)
  ↓
organization (組織)
  ↓
organization_user (組織利用者)
  ↓ ↓
  │ └→ user_authentication (利用者認証)
  └→ pin_codes (PINコード)

function (機能)
  ↓
role_permission (ロール権限)

login_history (ログイン履歴) ※独立
```

## 🚀 実行順序

外部キー制約があるため、以下の順序で実行してください：

```bash
# 1. 基本マスタ
psql -U postgres -d mmdpf -f corporation.sql

# 2. 組織
psql -U postgres -d mmdpf -f organization.sql

# 3. 組織利用者
psql -U postgres -d mmdpf -f organization_user.sql

# 4. 認証関連
psql -U postgres -d mmdpf -f user_authentication.sql
psql -U postgres -d mmdpf -f pin_codes.sql

# 5. 履歴（独立）
psql -U postgres -d mmdpf -f login_history.sql

# 6. 機能・権限
psql -U postgres -d mmdpf -f function.sql
psql -U postgres -d mmdpf -f role_permission.sql
```

## 📝 一括実行スクリプト

全テーブルを一括で作成する場合：

### Windows PowerShell
```powershell
cd docs/design/db/ddl
$files = @(
    "corporation.sql",
    "organization.sql",
    "organization_user.sql",
    "user_authentication.sql",
    "pin_codes.sql",
    "login_history.sql",
    "function.sql",
    "role_permission.sql"
)
foreach ($file in $files) {
    Write-Host "実行中: $file"
    psql -U postgres -d mmdpf -f $file
}
```

### Linux / macOS / Git Bash
```bash
cd docs/design/db/ddl
for file in corporation.sql organization.sql organization_user.sql user_authentication.sql pin_codes.sql login_history.sql function.sql role_permission.sql; do
  echo "実行中: $file"
  psql -U postgres -d mmdpf -f "$file"
done
```

### 統合SQLファイルを作成して実行
```bash
cat corporation.sql organization.sql organization_user.sql user_authentication.sql pin_codes.sql login_history.sql function.sql role_permission.sql > all_tables.sql
psql -U postgres -d mmdpf -f all_tables.sql
```

## ⚠️ 注意事項

### 1. DROP TABLE IF EXISTS文について（重要）
**全てのSQLファイルに `DROP TABLE IF EXISTS テーブル名 CASCADE;` が含まれています。**

- ✅ **開発環境**: スキーマの再構築が容易になります
- ⚠️ **本番環境**: 実行前に必ずバックアップを取得してください
- 🔒 **データ損失リスク**: DROP実行により既存のテーブルとデータが完全に削除されます
- 🔗 **CASCADE オプション**: 外部キー制約を持つ関連テーブルも自動的に削除されます

### 2. UUID拡張機能
`uuid_generate_v4()` を使用するため、事前に以下を実行してください：
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3. 既存テーブルの削除
各SQLファイルに `DROP TABLE IF EXISTS` が含まれているため、**個別に削除する必要はありません**。
ただし、手動で削除する場合は以下の順序で削除してください（逆順）：
```sql
DROP TABLE IF EXISTS role_permission CASCADE;
DROP TABLE IF EXISTS function CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS pin_codes CASCADE;
DROP TABLE IF EXISTS user_authentication CASCADE;
DROP TABLE IF EXISTS organization_user CASCADE;
DROP TABLE IF EXISTS organization CASCADE;
DROP TABLE IF EXISTS corporation CASCADE;
```

### 4. 本番環境での実行手順（必読）
```bash
# 1. バックアップ取得（必須）
pg_dump -U postgres -d mmdpf > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. バックアップの確認
ls -lh backup_*.sql

# 3. DDLファイルの実行（上記の実行順序に従う）
# ...実行...

# 4. データの確認
psql -U postgres -d mmdpf -c "\dt"

# 5. 問題がある場合はロールバック
# psql -U postgres -d mmdpf < backup_YYYYMMDD_HHMMSS.sql
```

### 3. データ型について
- `@VARCHAR` → `VARCHAR`
- `@BOOLEAN` → `BOOLEAN`
- `@DATETIME` → `TIMESTAMP`
- `@INT` → `INTEGER`

## 🔄 ER図からの主な変更点（2026-01-07）

### user_id の型変更
- **変更前**: `VARCHAR(30)`
- **変更後**: `UUID`
- **影響テーブル**: 
  - `organization_user`
  - `user_authentication`
  - `pin_codes`
  - `login_history`

### login_history の変更
- **追加**: `organization_id UUID NOT NULL`
- **削除**: `organization_code VARCHAR(30)`
- **インデックス変更**: 
  - 変更前: `idx_login_history_rate_limit(organization_code, user_id, login_at, login_sf)`
  - 変更後: `idx_login_history_rate_limit(user_id, login_at, login_sf)`
  - 追加: `idx_login_history_organization(organization_id)`

## 📚 関連ドキュメント

- [ER図ファイル](../er_diagram.a5er)
- [認証関連変更サマリー](../db_auth_changes_summary.md)
- [既存CREATE文](../create_tables_authentication.sql)

## 🔄 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-07 | ER図更新に伴う再作成（番号なしファイル名） | Cline |
| 2026-01-07 | 初版作成 | Cline |

## 💡 Tips

- **インデックスの確認**: 各テーブルにはパフォーマンス最適化のためのインデックスが定義されています
- **コメント**: すべてのテーブル・カラムには日本語コメントが付与されています
- **制約**: 主キー、外部キー、ユニーク制約が適切に設定されています
- **UUID使用**: 主要な識別子にUUIDを使用してセキュリティと一意性を確保しています
