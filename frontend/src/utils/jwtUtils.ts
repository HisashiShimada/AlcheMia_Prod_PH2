/**
 * JWT（JSON Web Token）関連のユーティリティ関数
 */

import { Permission, JwtPayload } from '@/types/auth';

/**
 * JWTトークンをデコードしてpayloadを取得
 * 
 * @param token - JWTトークン文字列
 * @returns デコードされたペイロード、または失敗時はnull
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // "Bearer " プレフィックスを除去
    let cleanToken = token;
    if (token.startsWith('Bearer ')) {
      cleanToken = token.substring(7); // "Bearer " の7文字を除去
    }
    
    // カスタムプレフィックス（maiml_session-xxx_timestamp）を除去
    // 形式: maiml_session-uuid_timestamp.eyJ...
    if (cleanToken.includes('.eyJ')) {
      // 最初の ".eyJ" の位置を見つけて、それ以降をJWTとして扱う
      const jwtStartIndex = cleanToken.indexOf('.eyJ');
      if (jwtStartIndex > 0) {
        cleanToken = cleanToken.substring(jwtStartIndex + 1); // "." を除去してJWT部分のみ取得
      }
    }
    
    // JWTは "header.payload.signature" の3部構成
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      console.error('[jwtUtils] Invalid JWT format: expected 3 parts, got', parts.length, 'token:', cleanToken.substring(0, 50) + '...');
      return null;
    }
    
    // Base64デコード（payload部分）
    const base64Payload = parts[1];
    const decodedPayload = atob(base64Payload);
    const payload: JwtPayload = JSON.parse(decodedPayload);
    
    return payload;
  } catch (error) {
    console.error('[jwtUtils] JWT decode error:', error);
    return null;
  }
}

/**
 * localStorageからpermissionsを取得
 * 
 * メニュー切り替え機能で使用され、ユーザーの権限に基づいて
 * アクセス可能なメニューをフィルタリングする。
 * 
 * 優先順位:
 * 1. localStorageの`userInfo.permissions`から取得（推奨）
 * 2. フォールバック: JWTトークンをデコードして取得（後方互換性）
 * 
 * @returns ユーザーの権限配列、または取得失敗時はundefined
 * 
 * @example
 * ```typescript
 * const permissions = getPermissionsFromToken();
 * if (permissions) {
 *   // 権限チェック処理
 * }
 * ```
 */
export function getPermissionsFromToken(): Permission[] | undefined {
  // SSR（サーバーサイドレンダリング）時はwindowが存在しないため、undefinedを返す
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  // 1. localStorageのuserInfoから優先的に取得（推奨方式）
  const userInfoStr = localStorage.getItem('userInfo');
  if (userInfoStr) {
    try {
      const userInfo = JSON.parse(userInfoStr);
      if (userInfo.permissions && Array.isArray(userInfo.permissions)) {
        console.log('[jwtUtils] Permissions loaded from userInfo (優先方式)');
        return userInfo.permissions;
      }
    } catch (error) {
      console.warn('[jwtUtils] Failed to parse userInfo:', error);
    }
  }
  
  // 2. フォールバック: JWTトークンをデコードして取得（後方互換性）
  console.log('[jwtUtils] Fallback to JWT decode (後方互換性)');
  
  const token = localStorage.getItem('sessionToken');
  if (!token) {
    // トークンがない場合はundefinedを返す（ログイン前など）
    return undefined;
  }
  
  // 仮セッショントークン（maiml_session-で始まるがJWTを含まない）の場合はJWTではないのでundefinedを返す
  if ((token.startsWith('maiml_session-') || token.startsWith('temp_session-')) && !token.includes('.eyJ')) {
    console.warn('[jwtUtils] Temporary session token detected (no JWT). Returning undefined.');
    return undefined;
  }
  
  // JWTをデコード
  const payload = decodeJwt(token);
  if (!payload) {
    // デコード失敗時はundefinedを返す
    console.warn('[jwtUtils] Failed to decode JWT. Returning undefined.');
    return undefined;
  }
  
  // permissionsを返す
  return payload.permissions;
}
