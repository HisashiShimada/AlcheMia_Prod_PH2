/**
 * メニュー関連の型定義
 */

/**
 * メニューアイテム
 */
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  description?: string;
  disabled?: boolean;
}

/**
 * メニューカテゴリ
 */
export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}
