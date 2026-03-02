import { Permission, MenuType, MENU_FUNCTION_IDS } from '@/types/auth';
import { getPermissionsFromToken } from '@/utils/jwtUtils';

/**
 * ユーザーが指定されたメニューにアクセスする権限があるかチェック
 * 
 * @param permissions - ユーザーのPermission配列
 * @param menuType - チェック対象のメニュータイプ
 * @returns アクセス権限がある場合true
 */
export function hasMenuPermission(
  permissions: Permission[] | undefined,
  menuType: MenuType
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  
  // メニュータイプに対応するfunctionIdを取得
  const targetFunctionId = MENU_FUNCTION_IDS[menuType];
  
  // permissions配列の中に該当functionIdが存在するかチェック
  return permissions.some(p => p.functionId === targetFunctionId);
}

/**
 * 指定されたメニューの権限値を取得
 * 
 * セッショントークンから権限情報を読み取り、指定メニューの権限値を返す。
 * 
 * @param menuType - チェック対象のメニュータイプ
 * @returns 権限値（0=読取専用, 1=書込可）、権限情報が取得できない場合はundefined
 * 
 * @example
 * ```typescript
 * const isReadOnly = getMenuPermission('provider') === 0;
 * ```
 */
export function getMenuPermission(menuType: MenuType): number | undefined {
  const permissions = getPermissionsFromToken();
  if (!permissions || permissions.length === 0) {
    return undefined;
  }

  const targetFunctionId = MENU_FUNCTION_IDS[menuType];
  const found = permissions.find(p => p.functionId === targetFunctionId);
  return found?.permission;
}
