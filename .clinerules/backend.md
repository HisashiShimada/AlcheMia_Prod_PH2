# バックエンド規約

## 言語とフレームワーク

### 基本技術スタック
- **言語**: TypeScript (Node.js 18+)
- **フレームワーク**: Express.js 4.18.3
- **データベース**: PostgreSQL (AWS Aurora)
- **データベースクライアント**: pg 8.11.3
- **認証**: jsonwebtoken 9.0.2、bcrypt 6.0.0
- **セッション管理**: express-session 1.18.2
- **パッケージマネージャー**: npm

### 主要ライブラリ
- **AWS SDK**: @aws-sdk/client-s3、@aws-sdk/client-bedrock-runtime、aws-sdk v2
- **セキュリティ**: helmet 7.2.0、cors 2.8.5、express-rate-limit 7.5.1
- **ファイル処理**: multer 1.4.5、xml2js 0.6.2、fast-xml-parser 5.2.5
- **ロギング**: winston 3.17.0、winston-daily-rotate-file 4.7.1、morgan 1.10.1
- **バリデーション**: express-validator 7.0.1
- **その他**: compression 1.7.4、dotenv 16.4.5、uuid 9.0.1

## アーキテクチャ

### ディレクトリ構造
```
backend/
├── routes/              # APIルート定義
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   ├── managerRoutes.js
│   ├── workerRoutes.js
│   ├── s3Routes.js
│   ├── enhancedRoutes.js
│   ├── s3/             # S3関連ルート（モジュール化）
│   ├── tenants/        # マルチテナント関連
│   ├── admin/          # 管理者専用ルート
│   ├── provider/       # プロバイダー管理
│   └── shared/         # 共有機能
├── middleware/          # Expressミドルウェア
│   ├── auth.js         # JWT認証
│   ├── tenantIsolation.js
│   ├── permissionCheck.js
│   ├── s3TenantGuard.js
│   ├── editMiddleware.js
│   └── errorHandler.js
├── services/            # ビジネスロジック
├── database/            # DB接続・操作
├── config/              # 設定ファイル
├── schemas/             # MAIMLスキーマ定義
├── scripts/             # ユーティリティスクリプト
├── tests/               # テストコード
├── utils/               # ユーティリティ関数
├── output/              # 生成ファイル出力先
├── logs/                # ログファイル
└── server.js            # エントリーポイント
```

### レイヤードアーキテクチャ

#### 1. ルート層（Routes）
- HTTPリクエストのルーティング
- リクエストパラメータの抽出
- レスポンスの返却
- エラーのハンドリング

#### 2. ミドルウェア層（Middleware）
- 認証・認可
- テナント分離
- バリデーション
- ロギング
- エラーハンドリング

#### 3. サービス層（Services）
- ビジネスロジックの実装
- データ処理
- 外部APIとの連携
- トランザクション管理

#### 4. データアクセス層（Database）
- データベース接続
- クエリの実行
- データの永続化

## コーディング規約

### ルート定義

#### ミドルウェアチェーン
すべてのAPIルートは以下の順序でミドルウェアを適用：
1. `auth` - JWT認証
2. `tenantIsolation` - テナント分離
3. `permissionCheck` - 権限チェック
4. ルートハンドラ

#### ルートファイルの構造
1. インポート
2. Routerインスタンス作成
3. ルート定義
4. エクスポート

### ミドルウェア実装

#### 認証ミドルウェア（auth.js）
- JWTトークンの検証
- セッションの検証
- ユーザー情報の抽出
- req.userへの格納

#### テナント分離ミドルウェア（tenantIsolation.js）
- organization_idの検証
- req.organizationIdへの格納
- クロステナントアクセスの防止

#### 権限チェックミドルウェア（permissionCheck.js）
- ユーザーロールの検証
- 必要な権限の確認
- アクセス拒否の処理

### データベース操作

#### Parameterized Queries（必須）
- すべてのクエリでParameterized Queryを使用
- SQLインジェクションを防ぐ
- 文字列連結でクエリを構築しない

#### organization_idフィルタ（必須）
- すべてのクエリにorganization_idフィルタを含める
- マルチテナント分離を保証
- System Admin以外はクロステナントアクセス不可

#### トランザクション管理
- 複数のクエリを含む処理はトランザクションで保護
- エラー時は必ずロールバック
- コミット前にバリデーション

#### 接続プール
- PostgreSQL接続プールを使用
- 最大接続数: 20
- アイドルタイムアウト: 30秒
- 接続タイムアウト: 2秒

### S3操作

#### Organization Prefix（必須）
- すべてのS3キーに`org_{organization_id}`プレフィックスを含める
- パス形式: `org_{org_id}/projects/{project_id}/{filename}`
- クロステナントアクセスを防ぐ

#### 署名付きURL（必須）
- S3の直接URLを返さない
- Pre-signed URLを生成して返す
- 有効期限: 1時間
- アクセス権限の一時的な付与

#### S3操作のエラーハンドリング
- ファイルが存在しない場合の処理
- アクセス権限エラーの処理
- ネットワークエラーの処理

### エラーハンドリング

#### エラーの種類
- **ValidationError**: バリデーションエラー（400）
- **AuthenticationError**: 認証エラー（401）
- **AuthorizationError**: 認可エラー（403）
- **NotFoundError**: リソースが見つからない（404）
- **DatabaseError**: データベースエラー（500）
- **InternalServerError**: その他のサーバーエラー（500）

#### エラーレスポンス形式
- 統一されたJSON形式
- エラーメッセージ
- エラーコード
- タイムスタンプ

#### ログ記録
- すべてのエラーをログに記録
- スタックトレースを含める
- コンテキスト情報を付与

### バリデーション

#### 入力バリデーション
- express-validatorを使用
- すべてのユーザー入力を検証
- サニタイゼーション処理

#### ビジネスロジックバリデーション
- サービス層で実装
- データの整合性チェック
- ドメインルールの適用

### ロギング

#### Winstonの使用
- 構造化ロギング
- ログレベル: error, warn, info, debug
- 日次ローテーション

#### ログ出力先
- コンソール（開発環境）
- ファイル（backend/logs/）
- 本番環境: CloudWatch Logs

#### ログ内容
- タイムスタンプ
- ログレベル
- メッセージ
- コンテキスト情報
- スタックトレース（エラー時）

### セキュリティ

#### パスワード処理
- bcryptでハッシュ化
- Admin権限: 14 rounds
- その他: 12 rounds

#### JWT管理
- 秘密鍵は環境変数
- 適切な有効期限設定
- トークンの検証

#### セッション管理
- データベースとメモリの二重管理
- 自動クリーンアップ
- セキュアCookie設定

#### レート制限
- ログインAPI: 15分間に5回
- その他のAPI: 適切に設定
- ブルートフォース攻撃の防止

### 非同期処理

#### async/await の使用
- Promise chainingより優先
- try-catchでエラーハンドリング
- 並列処理はPromise.all

#### エラープロパゲーション
- エラーは適切に伝播させる
- 最終的にエラーハンドリングミドルウェアで処理
- ユーザーフレンドリーなエラーメッセージ

### パフォーマンス最適化

#### データベースクエリ
- N+1問題の回避
- 適切なインデックス使用
- クエリの最適化

#### キャッシング
- node-cacheの使用
- 頻繁にアクセスされるデータをキャッシュ
- TTL（Time To Live）の設定

#### 圧縮
- レスポンスの圧縮（compression）
- 大きなペイロードの最適化

## ベストプラクティス

### DO（推奨）
✅ 常にParameterized Queriesを使用する
✅ すべてのクエリにorganization_idフィルタを含める
✅ ミドルウェアチェーンを正しく適用する
✅ エラーハンドリングを適切に実装する
✅ 環境変数で設定を管理する
✅ ログを適切に記録する
✅ 非同期処理でasync/awaitを使用する
✅ セキュリティベストプラクティスに従う

### DON'T（非推奨）
❌ 文字列連結でSQLクエリを構築しない
❌ organization_idなしでクエリを実行しない
❌ 認証・認可ミドルウェアを省略しない
❌ エラーを握りつぶさない
❌ 機密情報をログに出力しない
❌ グローバル変数を使用しない
❌ 同期的なファイル操作を使用しない
❌ ハードコーディングされた設定値を使用しない
