# タスク計画書: authController.ts ビジネスロジックのService層分離

## メタデータ
- **作成日時**: 2026-02-13 11:51
- **タスクID**: authController_service_separation
- **優先度**: 中
- **推定工数**: 2-3時間

## 1. タスク概要

authController.tsに含まれているビジネスロジックをService層に分離し、Controller層の責務を「HTTPリクエスト/レスポンスの処理」のみに限定する。

## 2. 目的と期待される成果

### 目的
- Controller層とService層の責務を明確に分離
- テスト容易性の向上（ビジネスロジックを独立してテスト可能）
- 再利用性の向上（他のControllerからもService層を利用可能）
- コードの保守性向上

### 期待される成果
- [x] ビジネスロジックがService層に集約される
- [x] Controllerは薄い層となり、HTTPハンドリングのみを行う
- [x] ユーティリティ関数がutils/に整理される
- [x] AuthServiceが作成され、認証フローのロジックを担う

## 3. 現状分析: 分離すべきビジネスロジック

### 📋 分離対象のロジック

#### A. ユーティリティ関数（utils/に移動）

1. **maskEmail()関数**
   - 場所: authController.ts (行30-37)
   - 機能: メールアドレスのマスキング（`user@example.com` → `use***@example.com`）
   - 移動先: `backend/src/utils/emailUtils.ts`

2. **generateTempPassword()関数**
   - 場所: authController.ts (行292-311)
   - 機能: 12文字の一時パスワード生成（大小英数字+特殊文字）
   - 移動先: `backend/src/utils/passwordUtils.ts`

#### B. 複雑なビジネスロジック（AuthServiceに移動）

1. **login()関数内のロジック**
   - IPアドレス・User-Agent取得
   - ユーザー検証フロー（5ステップ）
   - PIN免除判定とトークン発行分岐
   - ログイン履歴記録（3箇所）
   - PINコード生成・送信フロー
   → `AuthService.processLogin()` として分離

2. **resetPasswordRequest()関数内のロジック**
   - 一時パスワード生成・発行フロー
   - ユーザー存在チェック（情報漏洩防止）
   - メール送信フロー
   → `AuthService.processPasswordResetRequest()` として分離

3. **verifyPin()関数内のロジック**
   - パスワード状態判定（40行以上の複雑なロジック）
   - セッション保存
   - トークンペア生成
   - リフレッシュトークン保存
   - ログイン履歴記録
   → `AuthService.processVerifyPin()` として分離

4. **changePassword()関数内のロジック**
   - パスワード検証・更新フロー
   → `AuthService.processChangePassword()` として分離

5. **refreshToken()関数内のロジック**
   - トークンローテーションフロー
   - ユーザー情報再取得
   - 権限情報更新
   → `AuthService.processRefreshToken()` として分離

#### C. そのまま残すロジック（Controller層の責務）

1. **logout()関数**
   - シンプルでビジネスロジックが少ない
   - そのまま残す

2. **resendPin()関数**
   - シンプルでビジネスロジックが少ない
   - そのまま残す

3. **resetPassword()関数**
   - 主にトークン検証のみ
   - そのまま残す

## 4. 実装ステップ

### Phase 1: ユーティリティ関数の分離

#### Step 1-1: emailUtils.tsの作成
- [x] `backend/src/utils/emailUtils.ts` を作成
- [x] `maskEmail()` 関数を移動
- [x] テストケースを追加（オプション）

#### Step 1-2: passwordUtils.tsの作成
- [x] `backend/src/utils/passwordUtils.ts` を作成
- [x] `generateTempPassword()` 関数を移動
- [x] テストケースを追加（オプション）

#### Step 1-3: authController.tsを更新
- [x] 新しいutils/からインポート
- [x] 関数呼び出しを更新

### Phase 2: AuthServiceの作成

#### Step 2-1: AuthService基本構造の作成
- [x] `backend/src/services/authService.ts` を作成
- [x] クラス定義とコンストラクタ
- [x] 必要なRepositoryとServiceの依存性注入

#### Step 2-2: login関連ロジックの分離
- [x] `processLogin()` メソッドを実装
  - 入力: userId, password, organizationId, ipAddress, userAgent
  - 出力: Result<LoginResponse>
  - ロジック: ユーザー検証、PIN免除判定、PINコード送信
- [x] authController.tsの`login()`を更新

#### Step 2-3: verifyPin関連ロジックの分離
- [x] `processVerifyPin()` メソッドを実装
  - 入力: pinCode, sessionToken, req, res
  - 出力: Result<VerifyPinResponse>
  - ロジック: パスワード状態判定、トークン生成、セッション保存
- [x] authController.tsの`verifyPin()`を更新

#### Step 2-4: パスワードリセット関連ロジックの分離
- [x] `processPasswordResetRequest()` メソッドを実装
  - 入力: email, organizationId
  - 出力: Result<PasswordResetResponse>
  - ロジック: 一時パスワード生成・発行
- [x] authController.tsの`resetPasswordRequest()`を更新

#### Step 2-5: パスワード変更関連ロジックの分離
- [x] `processChangePassword()` メソッドを実装
  - 入力: userId, organizationId, currentPassword, newPassword
  - 出力: Result<void>
- [x] authController.tsの`changePassword()`を更新

#### Step 2-6: トークン更新関連ロジックの分離
- [x] `processRefreshToken()` メソッドを実装
  - 入力: refreshTokenValue, ipAddress, userAgent
  - 出力: Result<RefreshTokenResponse>
- [x] authController.tsの`refreshToken()`を更新

### Phase 3: 最終調整とテスト

#### Step 3-1: インポート整理
- [x] authController.tsの不要なインポートを削除
- [x] 新しいインポートを追加（AuthService, utils）

#### Step 3-2: 型定義の整理
- [x] 必要な型をtypes/service.tsに追加
- [x] AuthServiceのレスポンス型を定義

#### Step 3-3: 動作確認
- [x] ログインフローのテスト
- [x] PINコード検証フローのテスト
- [x] パスワードリセットフローのテスト
- [x] トークン更新フローのテスト

## 5. 影響範囲

### 変更するファイル
1. `backend/src/controllers/authController.ts` - Service呼び出しに変更
2. `backend/src/services/authService.ts` - 新規作成（ビジネスロジック集約）
3. `backend/src/utils/emailUtils.ts` - 新規作成（メールマスキング）
4. `backend/src/utils/passwordUtils.ts` - 新規作成（パスワード生成）
5. `backend/src/types/service.ts` - レスポンス型の追加（必要に応じて）

### 影響を受ける機能
- ログイン処理
- PINコード検証
- パスワードリセット
- パスワード変更
- トークン更新

## 6. 技術的詳細

### AuthServiceの設計

```typescript
export class AuthService {
  constructor(
    private pool: Pool,
    private passwordService: PasswordService,
    private pinCodeService: PinCodeService,
    private pinExemptionService: PinExemptionService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private organizationUserRepository: OrganizationUserRepository,
    private userAuthenticationRepository: UserAuthenticationRepository
  ) {}

  /**
   * ログイン処理
   */
  async processLogin(params: LoginParams): Promise<Result<LoginResponse>> {
    // ビジネスロジック
  }

  /**
   * PINコード検証処理
   */
  async processVerifyPin(params: VerifyPinParams): Promise<Result<VerifyPinResponse>> {
    // ビジネスロジック
  }

  /**
   * パスワードリセット要求処理
   */
  async processPasswordResetRequest(params: PasswordResetRequestParams): Promise<Result<PasswordResetResponse>> {
    // ビジネスロジック
  }

  /**
   * パスワード変更処理
   */
  async processChangePassword(params: ChangePasswordParams): Promise<Result<void>> {
    // ビジネスロジック
  }

  /**
   * トークン更新処理
   */
  async processRefreshToken(params: RefreshTokenParams): Promise<Result<RefreshTokenResponse>> {
    // ビジネスロジック
  }
}
```

### Controller層の役割（変更後）

```typescript
export async function login(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // 1. パラメータ取得
    const { userId, password } = req.body;
    const organizationId = req.query.orgId as string;
    const ipAddress = extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 2. Serviceに処理を委譲
    const result = await authService.processLogin({
      userId,
      password,
      organizationId,
      ipAddress,
      userAgent,
    });

    // 3. 結果に応じてHTTPレスポンスを返す
    if (!result.success) {
      res.status(result.statusCode || 500).json({
        success: false,
        error: result.error,
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error) {
    // エラーハンドリング
  }
}
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Service層の肥大化 | 中 | 中 | メソッドを適切に分割し、責務を明確にする |
| 既存機能の破壊 | 高 | 低 | 段階的にリファクタリングし、各ステップで動作確認 |
| パフォーマンス低下 | 低 | 低 | Service層の呼び出しオーバーヘッドは無視できるレベル |
| テストの複雑化 | 中 | 中 | Service層の単体テストを充実させる |

## 8. テスト計画

### ユニットテスト
- [x] emailUtils.maskEmail() のテスト
- [x] passwordUtils.generateTempPassword() のテスト
- [ ] AuthService.processLogin() のテスト
- [ ] AuthService.processVerifyPin() のテスト
- [ ] AuthService.processPasswordResetRequest() のテスト

### 統合テスト
- [ ] ログインフローの統合テスト
- [ ] PINコード検証フローの統合テスト
- [ ] パスワードリセットフローの統合テスト

### 手動テスト
- [x] ログイン → PINコード検証 → ホーム画面遷移
- [x] パスワードリセット → 一時パスワードでログイン
- [x] パスワード変更
- [x] トークン更新

## 9. ロールバック計画

問題が発生した場合：
1. Git履歴から変更前のauthController.tsに戻す
2. 新規作成したファイル（authService.ts, emailUtils.ts, passwordUtils.ts）を削除
3. インポート文を元に戻す

## 10. 承認記録

- **計画書提示日時**: 2026-02-13 11:51
- **承認日時**: （承認時の日時を記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時の日時を記入）
完了: （作業完了時の日時を記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] emailUtils.ts - メールマスキング機能
- [ ] passwordUtils.ts - パスワード生成機能
- [ ] authService.ts - 認証ビジネスロジック集約
- [ ] authController.ts - HTTPハンドリングのみに簡素化

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
