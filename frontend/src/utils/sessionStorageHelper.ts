/**
 * SessionStorage操作のユーティリティ関数
 */

import type { SessionUserInfo } from '@/types/session';
import { SESSION_STORAGE_KEYS } from '@/types/session';

/**
 * SessionStorageからユーザー情報を取得
 * @returns ユーザー情報オブジェクト、存在しない場合はnull
 */
export const getUserInfo = (): SessionUserInfo | null => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時はnullを返す
    return null;
  }

  try {
    const userJson = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
    if (!userJson) {
      return null;
    }

    const user = JSON.parse(userJson) as SessionUserInfo;
    return user;
  } catch (error) {
    console.error('Failed to get user info from SessionStorage:', error);
    return null;
  }
};

/**
 * SessionStorageから組織IDを取得
 * @returns 組織ID、存在しない場合はnull
 */
export const getOrganizationId = (): string | null => {
  const user = getUserInfo();
  return user?.organizationId || null;
};

/**
 * SessionStorageにユーザー情報を保存
 * @param userInfo 保存するユーザー情報
 */
export const setUserInfo = (userInfo: SessionUserInfo): void => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時は何もしない
    return;
  }

  try {
    const userJson = JSON.stringify(userInfo);
    sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, userJson);
  } catch (error) {
    console.error('Failed to set user info to SessionStorage:', error);
  }
};

/**
 * SessionStorageからユーザー情報をクリア
 */
export const clearUserInfo = (): void => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時は何もしない
    return;
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Failed to clear user info from SessionStorage:', error);
  }
};

/**
 * SessionStorageからセッショントークンを取得
 * @returns セッショントークン、存在しない場合はnull
 */
export const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時はnullを返す
    return null;
  }

  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_TOKEN);
  } catch (error) {
    console.error('Failed to get session token from SessionStorage:', error);
    return null;
  }
};

/**
 * SessionStorageにセッショントークンを保存
 * @param token 保存するセッショントークン
 */
export const setSessionToken = (token: string): void => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時は何もしない
    return;
  }

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_TOKEN, token);
  } catch (error) {
    console.error('Failed to set session token to SessionStorage:', error);
  }
};

/**
 * SessionStorageからセッショントークンをクリア
 */
export const clearSessionToken = (): void => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時は何もしない
    return;
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_TOKEN);
  } catch (error) {
    console.error('Failed to clear session token from SessionStorage:', error);
  }
};

/**
 * SessionStorageの全データをクリア
 */
export const clearAllSessionData = (): void => {
  clearUserInfo();
  clearSessionToken();
};