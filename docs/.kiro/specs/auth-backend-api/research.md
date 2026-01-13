# Research & Design Decisions: 認証バックエンドAPI

## Summary
- **Feature**: `auth-backend-api`
- **Discovery Scope**: Extension（既存システムへの統合）
- **Key Findings**:
  - 既存ER図準拠により、pin_codesテーブルのみの追加で実装可能
  - bcrypt + JWTの組み合わせで業界標準のセキュリティレベルを実現
  - nodemailerによる非同期メール送信でAPIレスポンスをブロックしない設計が可能

## Research Log

### 既存システムとの統合

- **Context**: mmdpfプロジェクトには既にER図が存在し、organization_user、user_authentication、login_historyテーブルが定義されている
- **Sources Consulted**: 
  - `docs/design/db/er_diagram.a5er`（既存ER図）
  - `docs/design/db/db_auth.md`（既存DB設計書）
- **Findings**:
  - organization_user、user_authenticationテーブルはそのまま活用可能
  - 複合主キー(user_id, organization_id)設計を踏襲
  - 新規テーブルはpin_codesのみで実装可能
- **Implications**: 既存システムへの影響を最小化し、スムーズな統合が可能

### パスワードハッシュアルゴリズムの選択

- **Context**: パスワードを安全に保存する方法の選定
- **Sources Consulted**:
  - OWASP Password Storage Cheat Sheet
  - bcrypt公式ドキュメント（npmjs.com/package/bcrypt）
  - Argon2, PBKDF2との比較
- **Findings**:
  - **bcrypt**: 業界標準、レインボーテーブル攻撃耐性、調整可能なコストファクター（rounds）
  - **Argon2**: より新しいアルゴリズムだが、Node.jsエコシステムでのサポートはbcryptより少ない
  - **PBKDF2**: 標準だが、bcryptより攻撃耐性が低い
  - Admin権限は14 rounds、その他は12 roundsで適切なセキュリティレベル
- **Implications**: bcryptを選択し、ロール別にrounds数を調整することで、セキュリティと性能のバランスを実現

### JWTトークン方式の選択

- **Context**: セッション管理方式の選定（JWT vs Server-side Session）
- **Sources Consulted**:
  - JWT.io公式ドキュメント
  - OWASP Session Management Cheat Sheet
  - jsonwebtoken npmパッケージ（npmjs.com/package/jsonwebtoken）
- **Findings**:
  - **JWT方式**:
    - ステートレス、スケーラブル
    - HTTPOnly Cookieで保存可能（XSS対策）
    - HS256署名アルゴリズムで十分なセキュリティ
  - **Server-side Session方式**:
    - セッション無効化が容易
    - データベースまたはRedis必須
  - **Hybrid方式（選択）**:
    - JWTトークンをHTTPOnly Cookieで保存
    - 将来的にuser_sessionsテーブルで管理も可能
- **Implications**: 初期実装はJWTのみ、将来的にuser_sessionsテーブル追加でHybrid化も容易

### メール送信ライブラリの選択

- **Context**: PINコードとパスワードリセットリンクの送信方法
- **Sources Consulted**:
  - nodemailer公式ドキュメント（nodemailer.com）
  - SendGrid、AWS SES、Mailgun比較
- **Findings**:
  - **nodemailer**: 柔軟なSMTP設定、テンプレート対応、非同期送信
  - **SendGrid/Mailgun**: SaaS型、API経由、高い配信率
  - **AWS SES**: AWSネイティブ、低コスト、柔軟性
  - 非同期送信とリトライロジックが必須
- **Implications**: 初期実装はnodemailer（SMTP）、将来的にAWS SES統合も容易

### レート制限実装方式

- **Context**: ブルートフォース攻撃対策のレート制限実装
- **Sources Consulted**:
  - express-rate-limit npmパッケージ
  - ioredis + Redis Sliding Window方式
  - データベーステーブルベース方式
- **Findings**:
  - **express-rate-limit**: メモリベース、シングルインスタンスのみ
  - **Redis Sliding Window**: 分散環境対応、高性能
  - **DBテーブルベース（選択）**: 既存のlogin_historyテーブル活用、追加インフラ不要
  - 15分間のタイムウィンドウでログイン失敗回数をカウント
- **Implications**: 初期実装はlogin_historyテーブル、将来的にRedis統合で分散環境対応

### PINコード生成方式

- **Context**: セキュアなランダムPINコード生成
- **Sources Consulted**:
  - Node.js crypto.randomInt公式ドキュメント
  - Math.random()との比較
  - NIST SP 800-90A（乱数生成ガイドライン）
- **Findings**:
  - **crypto.randomInt**: 暗号学的に安全な乱数生成（CSPRNG）
  - **Math.random()**: 予測可能、セキュリティ用途には不適切
  - 6桁数字（100000-999999）で100万通りの組み合わせ
  - 有効期限5分、最大試行回数3回で十分なセキュリティレベル
- **Implications**: crypto.randomIntを使用し、暗号学的に安全なPINコード生成を実現

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| レイヤードアーキテクチャ（選択） | Routes → Middleware → Controller → Service → Repository | 明確な責任分離、テスト容易性、既存バックエンド規約に準拠 | サービス層の肥大化リスク | 既存のmmdpfプロジェクト構造に一致 |
| ヘキサゴナルアーキテクチャ | Ports & Adapters、ドメイン中心設計 | ドメインロジックの独立性、外部依存の抽象化 | 小規模機能には過剰、学習コスト | 将来的な大規模リファクタリング時に検討 |
| マイクロサービス | 認証を独立したマイクロサービスとして分離 | スケーラビリティ、独立デプロイ | 運用コスト増、ネットワークレイテンシ | 現時点では不要（モノリス内で十分） |

## Design Decisions

### Decision: JWT + HTTPOnly Cookie方式

- **Context**: セッション管理方式の選定。ステートレス性とセキュリティのバランスが必要
- **Alternatives Considered**:
  1. **JWT + localStorage** — XSS攻撃に脆弱、非推奨
  2. **Server-side Session + Cookie** — セッションストア（Redis）必須、スケーラビリティに課題
  3. **JWT + HTTPOnly Cookie（選択）** — ステートレス、XSS対策、HTTPSでCSRF対策
- **Selected Approach**: 
  - JWTトークンをHTTPOnly Cookie（Secure, SameSite=Strict）で保存
  - HS256署名アルゴリズムで完全性保証
  - ロール別有効期限（Admin: 48h, Manager: 24h, Worker: 12h）
- **Rationale**: 
  - ステートレス性によるスケーラビリティ
  - HTTPOnly属性でXSS攻撃対策
  - HTTPS + SameSite=StrictでCSRF対策
  - 既存フロントエンド（AuthContainer）と統合が容易
- **Trade-offs**:
  - **Benefits**: スケーラブル、追加インフラ不要、実装シンプル
  - **Compromises**: セッション即座無効化が困難（トークン期限まで有効）、将来的にuser_sessionsテーブル追加で対応可能
- **Follow-up**: 本番運用後、セッション管理要件が厳格化した場合、user_sessionsテーブル追加を検討

### Decision: bcryptでロール別rounds設定

- **Context**: パスワードハッシュ化のセキュリティレベルとパフォーマンスのバランス
- **Alternatives Considered**:
  1. **全ユーザー12 rounds** — シンプルだが、Admin権限のセキュリティが不十分
  2. **全ユーザー14 rounds** — 高セキュリティだが、一般ユーザーのログイン遅延
  3. **ロール別rounds設定（選択）** — Admin: 14 rounds, Others: 12 rounds
- **Selected Approach**: 
  - Admin権限（provider, system_admin）: 14 rounds
  - その他のユーザー: 12 rounds
  - 非同期版bcrypt（bcrypt.hash, bcrypt.compare）使用
- **Rationale**: 
  - Admin権限は高リスク、より強力なハッシュが必要
  - 一般ユーザーは12 roundsで十分なセキュリティレベル
  - 非同期版でAPIレスポンスをブロックしない
- **Trade-offs**:
  - **Benefits**: セキュリティとパフォーマンスのバランス、Admin特化保護
  - **Compromises**: ロール変更時のパスワード再ハッシュが必要（稀なケース）
- **Follow-up**: パフォーマンス測定後、rounds数の調整を検討

### Decision: pin_codesテーブルのみ追加

- **Context**: 二段階認証実装に必要なデータベース変更の最小化
- **Alternatives Considered**:
  1. **organization_userテーブルにPINコードカラム追加** — 既存テーブル変更、一時データと永続データの混在
  2. **専用pin_codesテーブル作成（選択）** — 新規テーブル、責任分離
  3. **Redisでキャッシュ** — 追加インフラ、初期実装には過剰
- **Selected Approach**: 
  - pin_codesテーブルを新規作成
  - 有効期限（5分）、試行回数（3回）、使用済みフラグを管理
  - 期限切れPINコードは定期削除（1時間ごと）
- **Rationale**: 
  - 既存テーブルへの影響を最小化
  - 一時データと永続データの明確な分離
  - 既存ER図の設計思想に準拠
- **Trade-offs**:
  - **Benefits**: 既存システムへの影響最小、責任分離、削除容易
  - **Compromises**: テーブル数増加（1個のみ）
- **Follow-up**: 期限切れPINコード削除のパフォーマンス監視

### Decision: メール送信の非同期処理

- **Context**: PINコード送信時のAPIレスポンス遅延を防ぐ
- **Alternatives Considered**:
  1. **同期送信** — シンプルだが、SMTPタイムアウトでAPIレスポンス遅延
  2. **非同期送信（選択）** — APIレスポンス即座返却、メール送信はバックグラウンド
  3. **メッセージキュー（RabbitMQ/SQS）** — 高信頼性だが、初期実装には過剰
- **Selected Approach**: 
  - nodemailerで非同期送信
  - 送信失敗時は最大3回リトライ
  - タイムアウト30秒
  - 送信結果はログに記録
- **Rationale**: 
  - APIレスポンスをブロックしない
  - リトライロジックで送信成功率向上
  - 初期実装に適したシンプルさ
- **Trade-offs**:
  - **Benefits**: APIレスポンス高速化、ユーザー体験向上
  - **Compromises**: 送信失敗をユーザーに即座通知できない（ログで検知）
- **Follow-up**: 本番運用後、送信失敗率が高い場合、メッセージキュー導入を検討

## Risks & Mitigations

### リスク1: メール送信失敗
- **Proposed Mitigation**: 
  - 非同期送信 + リトライロジック（最大3回）
  - 送信失敗をログ記録
  - CloudWatch Alarmsで送信失敗率監視
  - 代替メールプロバイダー（AWS SES）への切り替え計画

### リスク2: レート制限の分散環境対応
- **Proposed Mitigation**: 
  - 初期実装はlogin_historyテーブルベース（単一データベース）
  - 将来的にRedis統合でSliding Window方式実装
  - 現時点では単一ECSインスタンスで運用

### リスク3: JWT_SECRET漏洩
- **Proposed Mitigation**: 
  - 環境変数で管理（.envファイルはGit管理外）
  - AWS Secrets Managerで本番環境の秘密鍵管理
  - 定期的なシークレットローテーション（90日ごと）
  - アクセスログ監視

### リスク4: 期限切れPINコード削除の負荷
- **Proposed Mitigation**: 
  - 1時間ごとの削除バッチ実行
  - インデックス（expires_at）でクエリ最適化
  - 削除件数監視、1000件超過でアラート
  - 必要に応じて削除頻度調整

### リスク5: bcrypt処理の遅延
- **Proposed Mitigation**: 
  - 非同期版bcrypt使用（bcrypt.hash, bcrypt.compare）
  - パフォーマンス測定（p95レスポンスタイム）
  - rounds数の調整（現在: Admin 14, Others 12）
  - キャッシュ層の追加検討（パフォーマンス要件次第）

## References

### Official Documentation
- [bcrypt npm](https://www.npmjs.com/package/bcrypt) — パスワードハッシュ化ライブラリ
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken) — JWT生成・検証ライブラリ
- [nodemailer](https://nodemailer.com/) — メール送信ライブラリ
- [express-validator](https://express-validator.github.io/) — リクエストバリデーション
- [winston](https://github.com/winstonjs/winston) — ロギングライブラリ

### Security Standards
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — パスワード保存のベストプラクティス
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — セッション管理のベストプラクティス
- [JWT Best Current Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725) — JWTのベストプラクティス
- [NIST SP 800-90A](https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final) — 乱数生成ガイドライン

### Internal Documentation
- [API設計書](../../design/api/api_auth.md) — 既存API仕様
- [データベース設計書](../../design/db/db_auth.md) — 既存DB設計
- [セキュリティ規約](../../.clinerules/development/security.md) — プロジェクトセキュリティ規約
- [バックエンド規約](../../.clinerules/development/backend.md) — プロジェクトバックエンド規約
- [API設計ポリシー](../../.clinerules/development/api.md) — プロジェクトAPI設計ポリシー
