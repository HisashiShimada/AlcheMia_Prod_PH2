/**
 * ロール管理画面
 * - ロール名（DB格納値・日本語固定）
 *
 * フロントエンドでの表示は多言語対応済み。
 * i18nキーマッピング（frontend/src/locales/*.json の roleFunctionPermission.roles.*）:
 *   PROVIDER        → roleFunctionPermission.roles.PROVIDER        (ja: プロバイダー       / en: Provider)
 *   SYSTEM_MANAGER  → roleFunctionPermission.roles.SYSTEM_MANAGER  (ja: システム管理者    / en: System Administrator)
 *   DATA_MANAGER    → roleFunctionPermission.roles.DATA_MANAGER    (ja: データ管理者      / en: Data Administrator)
 *   EXPERMENT_MANAGER → roleFunctionPermission.roles.EXPERMENT_MANAGER (ja: 実験管理者   / en: Experiment Administrator)
 *   EXPERMENT_WORKER  → roleFunctionPermission.roles.EXPERMENT_WORKER  (ja: 実験作業者   / en: Experiment Worker)
 *   MI_ENGINEER     → roleFunctionPermission.roles.MI_ENGINEER     (ja: MI技術者          / en: MI Engineer)
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
 * - 機能名（DB格納値・日本語固定）
 *
 * フロントエンドでの表示は多言語対応済み（FunctionPermissionDialog.tsx）。
 * i18nキーマッピング（frontend/src/locales/*.json の roleFunctionPermission.functions.*）:
 *   "010000" → roleFunctionPermission.functions.010000 (ja: プロバイダーメニュー      / en: Provider Menu)
 *   "020000" → roleFunctionPermission.functions.020000 (ja: システム管理者メニュー    / en: System Administrator Menu)
 *   "030000" → roleFunctionPermission.functions.030000 (ja: データ管理者メニュー      / en: Data Administrator Menu)
 *   "040000" → roleFunctionPermission.functions.040000 (ja: 実験管理者メニュー        / en: Experiment Administrator Menu)
 *   "050000" → roleFunctionPermission.functions.050000 (ja: 実験作業者メニュー        / en: Experiment Worker Menu)
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
 *
 * i18nキーマッピング（frontend/src/locales/*.json の roleFunctionPermission.permissions.*）:
 *   WRITER → roleFunctionPermission.permissions.WRITER (ja: 書込可 / en: Writable)
 *   READER → roleFunctionPermission.permissions.READER (ja: 読取専用 / en: Read Only)
 */
export enum PermissionList {
  WRITER = "Ⓦ",
  READER = "Ⓡ",
}
