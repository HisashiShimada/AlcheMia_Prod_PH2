import { Permission, MenuType, MENU_FUNCTION_IDS } from '@/types/auth';

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
