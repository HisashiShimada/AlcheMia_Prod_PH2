/**
 * フォーム入力バリデーションユーティリティ
 * 
 * フロントエンド側で入力値を検証し、ユーザーに即座のフィードバックを提供します。
 * バックエンドでも最小限のセキュリティチェックは実施されます。
 */

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  /** バリデーションが成功したか */
  isValid: boolean;
  /** エラーメッセージ（バリデーション失敗時のみ） */
  error?: string;
}

/**
 * ユーザー名バリデーション
 * 
 * ルール:
 * - 必須
 * - 最大100文字
 * 
 * @param username - 検証するユーザー名
 * @returns バリデーション結果
 */
export function validateUsername(username: string): ValidationResult {
  // 空文字チェック
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'ユーザー名を入力してください',
    };
  }

  // 最大文字数チェック
  if (username.length > 100) {
    return {
      isValid: false,
      error: 'ユーザー名は100文字以内で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * パスワードバリデーション
 * 
 * ルール:
 * - 必須
 * - 最小8文字
 * 
 * @param password - 検証するパスワード
 * @returns バリデーション結果
 */
export function validatePassword(password: string): ValidationResult {
  // 空文字チェック
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: 'パスワードを入力してください',
    };
  }

  // 最小文字数チェック
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'パスワードは8文字以上で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * PINコードバリデーション
 * 
 * ルール:
 * - 必須
 * - 6桁の数字
 * 
 * @param pinCode - 検証するPINコード
 * @returns バリデーション結果
 */
export function validatePinCode(pinCode: string): ValidationResult {
  // 空文字チェック
  if (!pinCode || pinCode.trim().length === 0) {
    return {
      isValid: false,
      error: 'PINコードを入力してください',
    };
  }

  // 6桁の数字チェック
  const pinPattern = /^\d{6}$/;
  if (!pinPattern.test(pinCode)) {
    return {
      isValid: false,
      error: 'PINコードは6桁の数字で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * 新パスワードバリデーション（パスワードリセット用）
 * 
 * ルール:
 * - 必須
 * - 最小8文字
 * - 推奨: 大文字、小文字、数字、特殊文字を含む（警告のみ）
 * 
 * @param password - 検証する新パスワード
 * @returns バリデーション結果
 */
export function validateNewPassword(password: string): ValidationResult {
  // 空文字チェック
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: '新しいパスワードを入力してください',
    };
  }

  // 最小文字数チェック
  if (password.length < 8) {
    return {
      isValid: false,
      error: '新しいパスワードは8文字以上で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * パスワード確認バリデーション
 * 
 * ルール:
 * - 必須
 * - パスワードと一致
 * 
 * @param password - 元のパスワード
 * @param confirmPassword - 確認用パスワード
 * @returns バリデーション結果
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  // 空文字チェック
  if (!confirmPassword || confirmPassword.length === 0) {
    return {
      isValid: false,
      error: '確認用パスワードを入力してください',
    };
  }

  // パスワード一致チェック
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'パスワードが一致しません',
    };
  }

  return { isValid: true };
}

/**
 * メールアドレス/ユーザーIDバリデーション（基本的な形式チェック）
 * 
 * ルール:
 * - 必須
 * - 基本的なメール形式（@を含む）
 * 
 * @param email - 検証するメールアドレスまたはユーザーID
 * @returns バリデーション結果
 */
export function validateEmail(email: string): ValidationResult {
  // 空文字チェック
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'ユーザーIDを入力してください',
    };
  }

  // 基本的なメール形式チェック
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      isValid: false,
      error: '有効なユーザーIDを入力してください',
    };
  }

  return { isValid: true };
}

/**
 * フォーム全体のバリデーション結果を統合
 * 
 * @param results - 個別のバリデーション結果の配列
 * @returns 統合されたバリデーション結果
 */
export function combineValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const firstError = results.find((result) => !result.isValid);

  if (firstError) {
    return {
      isValid: false,
      error: firstError.error,
    };
  }

  return { isValid: true };
}
