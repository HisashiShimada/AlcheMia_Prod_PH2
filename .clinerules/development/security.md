# セキュリティルール

## 機密ファイル

以下のファイルの読み取りと変更を禁止：
- `.env` ファイル
- `backend/.env` ファイル
- `frontend/.env.*` ファイル
- APIキー、トークン、認証情報を含むすべてのファイル
- `backend/output/production-passwords.json`

## セキュリティ対策

- **機密ファイルを絶対にコミットしない**
- **シークレット情報は環境変数を使用する**
- **ログや出力に認証情報を含めない**
- **コード内にハードコーディングされた認証情報を含めない**

## ユーザー認証

### JWT + Session Hybrid認証

- **JWT形式**: `maiml_session-id_timestamp`
- **保存方法**: HTTPOnly Cookieとして保存
- **検証**: 各APIリクエストでミドルウェアが自動検証
- **有効期限**: ロール別に設定（Admin: 48時間、Manager: 24時間、Worker: 12時間）

### パスワードポリシー

- **Admin権限**: 12文字以上、bcrypt 14 rounds
- **その他のユーザー**: 8文字以上、bcrypt 12 rounds
- **推奨**: 大文字、小文字、数字、特殊文字を含む

### セッション管理

- データベース（`user_sessions`テーブル）とメモリストレージで二重管理
- 自動クリーンアップ: 有効期限切れセッションを定期削除
- セッション無効化: ログアウト時、有効期限切れ時、アカウント無効化時

## 機密情報の取り扱い

### 環境変数の管理

- `.env.example`を参照して環境変数を設定
- 本番環境では AWS Secrets Manager を使用
- 開発環境でも実際の認証情報は`.env`に保存（Git管理外）

### データベース認証情報

- 接続文字列は環境変数で管理
- パスワードは暗号化して保存
- 接続プールの適切な管理（最大接続数: 20）

### AWS認証情報

- IAMロールベースの認証を優先
- アクセスキーは環境変数で管理
- S3署名付きURLで一時的なアクセス権を付与（有効期限: 1時間）

## アクセス制御

### マルチテナント分離（重要）

- **すべてのDBテーブル**に`organization_id`カラムが必須
- **すべてのS3パス**に`org_{organization_id}`プレフィックスが必須
- **すべてのAPIルート**でtenantIsolationミドルウェアを適用
- クロステナントアクセスは厳禁（System Adminを除く）

### ロールベースアクセス制御（RBAC）

**Level 3 - Admin（システム管理者）:**
- 全システムへのフルアクセス
- 全組織の閲覧・操作
- ユーザー管理
- システム設定変更
- 監査ログ閲覧

**Level 2 - Manager（実験管理者）:**
- 実験管理
- ユーザー管理（所属組織内）
- ファイル管理
- 統計情報閲覧
- 所属組織のみアクセス

**Level 1 - Worker（実験作業者）:**
- 実験記録
- ファイル操作（割り当てられたファイルのみ）
- 自分の作業進捗確認
- 所属組織のみアクセス

### S3アクセス制御

**パス構造:**
```
s3://maiml-bucket/
  └── organizations/
      ├── org_maiml_lab_001/
      │   ├── files/
      │   └── experiments/
      └── org_maiml_lab_002/
          ├── files/
          └── experiments/
```

**アクセス制御:**
- ユーザーは自組織のパスのみアクセス可能
- S3 Pre-signed URLで一時的なアクセス権を付与
- URL有効期限: 1時間
- `s3TenantGuard`ミドルウェアで検証

## 認証と認可

### APIルートの保護

すべてのAPIルートは以下のミドルウェアチェーンで保護：
1. `auth` - JWT認証
2. `tenantIsolation` - テナント分離
3. `permissionCheck` - 権限チェック

### データベースクエリ

- **必須**: Parameterized Queriesを使用（SQLインジェクション対策）
- **必須**: すべてのクエリに`organization_id`フィルタを含める
- 文字列連結でSQLクエリを構築しない

### role_permissionテーブルの権限値定義

role_permissionテーブルのpermissionカラムは以下の値を使用します：

- **0**: 読取専用（Ⓡ READER）
  - 該当機能の閲覧のみ可能
  - データの参照・検索が可能
  - データの作成・更新・削除は不可

- **1**: 書込可（Ⓦ WRITER）
  - 該当機能への完全なアクセス権限
  - データの参照・検索・作成・更新・削除が可能
  - 管理操作が可能

**実装時の注意**:
- バックエンド: `backend/src/repositories/roleRepository.ts` で定義
- フロントエンド表示: Ⓦ（書込可）は緑色、Ⓡ（読取専用）は青色で表示
- DB設計: `docs/design/db/db_table_list.md` を参照

### セキュリティヘッダー

すべてのレスポンスに以下を自動付与：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

### レート制限

- ログインAPI: 15分間に5回まで
- その他のAPI: 必要に応じて設定
- ブルートフォース攻撃を防ぐ

### CSRF対策

- セキュアCookie設定（httpOnly, secure, sameSite: 'strict'）
- 重要な操作にはCSRFトークンを使用
- トークンベース保護を実装

## 監査とロギング

### 監査ログ

- Admin権限のログイン・ログアウトを記録
- 保存先: `admin_audit_log`テーブル
- 記録項目: ユーザーID、アクション、組織ID、IPアドレス、User-Agent、タイムスタンプ

### ログイン履歴

- すべてのログイン試行（成功・失敗）を記録
- 保存先: `login_history`テーブル
- 用途: 不正アクセスの検知、セキュリティ監査

### アプリケーションログ

- Winston + Daily Rotate Fileを使用
- ログレベル: error, warn, info, debug
- 保存先: `backend/logs/`
- ローテーション: 日次、最大14日間保存

## セキュリティチェックリスト

### 新機能追加時のチェック項目

- [ ] 認証ミドルウェア（auth）が適用されているか
- [ ] tenantIsolationミドルウェアが適用されているか
- [ ] 適切な権限チェック（permissionCheck）が適用されているか
- [ ] すべてのDBクエリがParameterized Queryを使用しているか
- [ ] すべてのDBクエリにorganization_idフィルタが含まれているか
- [ ] S3操作にorganization prefixが含まれているか
- [ ] S3アクセスに署名付きURLを使用しているか
- [ ] ユーザー入力のバリデーションが実装されているか
- [ ] エラーメッセージに機密情報が含まれていないか

## ベストプラクティス

### DO（推奨）
✅ すべてのパスワードをbcryptでハッシュ化する
✅ セッションを適切に管理し、定期的にクリーンアップする
✅ HTTPS通信を必須とする
✅ レート制限で不正アクセスを防ぐ
✅ エラーメッセージは汎用的にする
✅ 監査ログを記録し、定期的にレビューする
✅ 常にParameterized Queriesを使用する
✅ すべてのルートに認証・認可ミドルウェアを適用する
✅ S3操作には署名付きURLを使用する
✅ 環境変数で設定を管理する

### DON'T（非推奨）
❌ パスワードを平文で保存する
❌ セッションをクライアント側のLocalStorageに保存する
❌ エラーメッセージで詳細情報を漏らす
❌ セッション有効期限を無期限にする
❌ SQL文を動的に生成する（SQLインジェクション対策）
❌ ユーザー入力を検証せずに使用する
❌ テナント間でデータを共有する（System Admin以外）
❌ organization_idなしでDBクエリを実行する
❌ 文字列連結でSQLクエリを構築する
❌ S3の直接URLをクライアントに返す
❌ ハードコーディングされた認証情報を使用する
❌ エラーメッセージにスタックトレースをそのまま返す
