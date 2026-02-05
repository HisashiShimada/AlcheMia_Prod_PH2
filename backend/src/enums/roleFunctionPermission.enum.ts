/**
 * ロール管理画面
 * - ロール名
 */
export enum RoleList {
  PROVIDER = "プロバイダー",
  SYSTEM_MANAGER = "システム管理者",
  DATA_MANAGER = "データ管理者",
  EXPERMENT_MANAGER = "実験管理者",
  EXPERMENT_WORKER = "実験作業者",
  MI_ENGINEER = "MI技術者",
}

/**
 * ロール管理画面
 * - 機能名
 */
export enum FunctionList {
  "010000" = "プロバイダーメニュー",
  "020000" = "システム管理者メニュー",
  "030000" = "データ管理者メニュー",
  "040000" = "実験管理者メニュー",
  "050000" = "実験作業者メニュー",
}

/**
 * ロール管理画面
 * - 権限
 */
export enum PermissionList {
  WRITER = "Ⓦ",
  READER = "Ⓡ",
}
