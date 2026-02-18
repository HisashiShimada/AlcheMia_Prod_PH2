/**
 * トークンストレージユーティリティ
 * 
 * リフレッシュトークン機能のためのトークン管理
 * - アクセストークン（sessionToken）
 * - リフレッシュトークン
 * - トークン有効期限
 * 
 * ※ ブラウザを閉じてもデータが残るようにLocal Storageを使用
 */

/**
 * アクセストークンを保存
 * 
 * @param accessToken アクセストークン
 */
export function setTokenPair(
  accessToken: string
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('sessionToken', accessToken);
  } catch (error) {
    console.error('Failed to set token pair:', error);
  }
}

/**
 * アクセストークンを取得
 * 
 * @returns アクセストークン（存在しない場合はnull）
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('sessionToken');
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}


/**
 * トークンの有効期限を取得
 * 
 * @returns 有効期限（ISO 8601形式、存在しない場合はnull）
 */
export function getTokenExpiresAt(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('tokenExpiresAt');
  } catch (error) {
    console.error('Failed to get token expires at:', error);
    return null;
  }
}

/**
 * トークンの有効期限が近づいているかチェック
 * 
 * @param marginMinutes 余裕時間（分）デフォルト: 5分
 * @returns true: 有効期限が近い, false: まだ余裕がある
 */
export function isTokenExpiringSoon(marginMinutes: number = 5): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const expiresAt = getTokenExpiresAt();
    if (!expiresAt) return true;

    const expiresTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const margin = marginMinutes * 60 * 1000;

    return expiresTime - now < margin;
  } catch (error) {
    console.error('Failed to check token expiry:', error);
    return true;
  }
}

/**
 * すべてのトークンをクリア
 */
export function clearAllTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('tokenExpiresAt');
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}
