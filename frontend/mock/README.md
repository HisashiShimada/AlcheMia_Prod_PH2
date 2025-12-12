# Mock Components

このディレクトリには、バックエンドなしで画面のレイアウトと操作を確認するためのモックコンポーネントが含まれています。

## 構成

```
mock/
├── components/          # モックコンポーネント
│   ├── UserManagement.tsx
│   └── OrganizationManagement.tsx
├── data/                # モックデータ（JSON）
│   ├── users.json
│   └── organizations.json
└── README.md
```

## 使用方法

### 1. 組織管理画面の確認

1. アプリケーションを起動
   ```bash
   cd frontend
   npm run dev
   ```

2. ブラウザで `http://localhost:3000` にアクセス

3. ログイン画面でプロバイダーとしてログイン
   - テストユーザー: `provider_user` / `password123`

4. プロバイダーメニューの「組織管理」タブを選択

### 2. ユーザー管理画面の確認

1. アプリケーションを起動（上記と同じ）

2. ログイン画面でシステム管理者としてログイン
   - テストユーザー: `admin_user` / `password123`

3. システム管理者メニューの「ユーザー管理」タブを選択

### 3. モック機能

#### ユーザー管理画面（UserManagement.tsx）

**主な機能:**
- ✅ ユーザー一覧表示（テーブル）
- ✅ 検索機能（ユーザー名、メール、氏名）
- ✅ フィルター機能（ロール、組織、ステータス）
- ✅ ユーザー追加（モーダル）
- ✅ ユーザー編集（モーダル）
- ✅ ユーザー削除（確認ダイアログ付き）
- ✅ ソート機能（各カラム）
- ✅ ページネーション
- ✅ 統計情報カード表示

**データソース:**
- `mock/data/users.json` からモックデータを読み込み
- 状態管理は React の useState を使用
- データの追加・編集・削除は画面内のみで動作（リロードで初期化）

#### 組織管理画面（OrganizationManagement.tsx）

**主な機能:**
- ✅ 組織一覧表示（テーブル）
- ✅ 検索機能（組織名、組織ID、説明文）
- ✅ フィルター機能（ステータス、言語）
- ✅ 組織追加（モーダル）
- ✅ 組織編集（モーダル）
- ✅ 組織削除（確認ダイアログ付き）
- ✅ ソート機能（各カラム）
- ✅ ページネーション
- ✅ 統計情報カード表示（総組織数、有効組織、トライアル組織、総ユーザー数、ストレージ使用量）
- ✅ ストレージ使用率の視覚化（プログレスバー）
- ✅ 組織IDのコピー機能

**データソース:**
- `mock/data/organizations.json` からモックデータを読み込み
- 状態管理は React の useState を使用
- データの追加・編集・削除は画面内のみで動作（リロードで初期化）

## モックデータ

### users.json

10件のユーザーデータを含んでいます：
- システム管理者: 2名
- データ管理者: 2名
- 実験管理者: 2名
- 実験作業者: 4名
- 複数の組織（テナントA、B、C）

**データ構造:**
```json
{
  "id": 1,
  "username": "admin_user",
  "email": "admin@example.com",
  "full_name": "管理 太郎",
  "role": "system_admin",
  "organization_id": "org_tenant_a",
  "organization_name": "テナントA",
  "is_active": true,
  "last_login": "2025-12-11T10:30:00Z",
  "created_at": "2024-01-15T09:00:00Z"
}
```

### organizations.json

8件の組織データを含んでいます：
- 有効組織: 6件
- 無効組織: 1件
- トライアル組織: 1件
- 複数の言語設定（日本語、英語）
- 複数のタイムゾーン設定

**データ構造:**
```json
{
  "id": 1,
  "organization_id": "org_maiml_lab_001",
  "organization_name": "MAIML研究所",
  "organization_name_en": "MAIML Laboratory",
  "description": "材料科学の研究開発を行う組織",
  "status": "active",
  "user_count": 15,
  "admin_count": 3,
  "storage_used_gb": 128.5,
  "storage_limit_gb": 500,
  "language": "ja",
  "timezone": "Asia/Tokyo",
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-11-20T14:30:00Z"
}
```

## カスタマイズ

### モックデータの追加

`mock/data/users.json` にユーザーデータを追加できます：

```json
{
  "id": 11,
  "username": "new_user",
  "email": "new@example.com",
  "full_name": "新規 太郎",
  "role": "experiment_worker",
  "organization_id": "org_tenant_a",
  "organization_name": "テナントA",
  "is_active": true,
  "last_login": "2025-12-11T15:00:00Z",
  "created_at": "2025-12-11T15:00:00Z"
}
```

### 新しいモックコンポーネントの追加

1. `mock/components/` にコンポーネントファイルを作成
2. `mock/data/` に必要なJSONデータを作成
3. メニューコンポーネント（例: `SystemAdminMenu.tsx`）でインポート
4. 適切なタブに割り当て

## 注意事項

⚠️ **このディレクトリはモック専用です**
- 本番環境では使用しません
- バックエンドAPIとの連携はありません
- データの永続化はされません（リロードで初期化）
- 開発・デザイン確認用途のみ

## 次のステップ

モック画面で確認後、以下を実装します：
1. バックエンドAPIの作成
2. APIサービスの実装
3. モックコンポーネントを実際のコンポーネントに置き換え
4. データの永続化
5. 認証・認可の実装

## ライセンス

このプロジェクトの一部として、同じライセンスが適用されます。
