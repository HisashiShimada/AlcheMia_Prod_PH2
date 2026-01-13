/**
 * errorMapperのユニットテスト
 */

import { mapErrorToMessage } from '../errorMapper';

describe('errorMapper', () => {
  describe('mapErrorToMessage', () => {
    describe('認証エラー', () => {
      test('AUTH_INVALID_CREDENTIALS: ユーザー名またはパスワードが正しくないメッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_INVALID_CREDENTIALS');
        expect(message).toBe('ユーザー名またはパスワードが正しくありません');
      });

      test('AUTH_TOKEN_EXPIRED: セッションの有効期限切れメッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_TOKEN_EXPIRED');
        expect(message).toBe('セッションの有効期限が切れました。再度ログインしてください');
      });

      test('AUTH_TOKEN_INVALID: セッショントークンが無効メッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_TOKEN_INVALID');
        expect(message).toBe('セッショントークンが無効です');
      });

      test('AUTH_PIN_INVALID: PINコードが正しくないメッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_PIN_INVALID');
        expect(message).toBe('PINコードが正しくありません');
      });

      test('AUTH_PIN_EXPIRED: PINコードの有効期限切れメッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_PIN_EXPIRED');
        expect(message).toBe('PINコードの有効期限が切れました。再送信してください');
      });

      test('AUTH_PIN_MAX_ATTEMPTS: PIN入力試行回数超過メッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_PIN_MAX_ATTEMPTS');
        expect(message).toBe('PINコード入力試行回数の上限に達しました。最初からやり直してください');
      });

      test('AUTH_ACCOUNT_DISABLED: アカウント無効化メッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_ACCOUNT_DISABLED');
        expect(message).toBe('アカウントが無効化されています。管理者にお問い合わせください');
      });

      test('AUTH_RATE_LIMIT_EXCEEDED: レート制限超過メッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_RATE_LIMIT_EXCEEDED');
        expect(message).toBe('ログイン試行回数が上限に達しました。しばらくしてから再度お試しください');
      });

      test('AUTH_RESEND_LIMIT_EXCEEDED: PIN再送信制限超過メッセージを返す', () => {
        const message = mapErrorToMessage('AUTH_RESEND_LIMIT_EXCEEDED');
        expect(message).toBe('PINコード再送信回数が上限に達しました。しばらくしてから再度お試しください');
      });
    });

    describe('バリデーションエラー', () => {
      test('VALIDATION_ERROR: 入力内容誤りメッセージを返す', () => {
        const message = mapErrorToMessage('VALIDATION_ERROR');
        expect(message).toBe('入力内容に誤りがあります');
      });

      test('REQUIRED_FIELD: 必須項目メッセージを返す', () => {
        const message = mapErrorToMessage('REQUIRED_FIELD');
        expect(message).toBe('必須項目です');
      });
    });

    describe('システムエラー', () => {
      test('SYSTEM_EMAIL_SEND_FAILED: メール送信失敗メッセージを返す', () => {
        const message = mapErrorToMessage('SYSTEM_EMAIL_SEND_FAILED');
        expect(message).toBe('メール送信に失敗しました。しばらくしてから再度お試しください');
      });

      test('SYSTEM_DATABASE_ERROR: データベースエラーメッセージを返す', () => {
        const message = mapErrorToMessage('SYSTEM_DATABASE_ERROR');
        expect(message).toBe('システムエラーが発生しました。管理者にお問い合わせください');
      });
    });

    describe('未定義のエラーコード', () => {
      test('デフォルトメッセージを返す', () => {
        const message = mapErrorToMessage('UNKNOWN_ERROR_CODE');
        expect(message).toBe('エラーが発生しました。しばらくしてから再度お試しください');
      });

      test('カスタムデフォルトメッセージを返す', () => {
        const customDefault = 'カスタムエラーメッセージ';
        const message = mapErrorToMessage('UNKNOWN_ERROR_CODE', customDefault);
        expect(message).toBe(customDefault);
      });
    });

    describe('空文字列・null・undefined', () => {
      test('空文字列の場合デフォルトメッセージを返す', () => {
        const message = mapErrorToMessage('');
        expect(message).toBe('エラーが発生しました。しばらくしてから再度お試しください');
      });

      test('undefinedの場合デフォルトメッセージを返す', () => {
        const message = mapErrorToMessage(undefined as any);
        expect(message).toBe('エラーが発生しました。しばらくしてから再度お試しください');
      });

      test('nullの場合デフォルトメッセージを返す', () => {
        const message = mapErrorToMessage(null as any);
        expect(message).toBe('エラーが発生しました。しばらくしてから再度お試しください');
      });
    });
  });
});
