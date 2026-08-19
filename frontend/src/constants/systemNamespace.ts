/**
 * システム共通名前空間定数（フロントエンド）
 *
 * Alchemia グローバル名前空間に関する定数を定義する。
 * - SYSTEM_NAMESPACE_URI: 保護判定に使用する URI
 * - SYSTEM_NAMESPACE_PREFIX: Alchemia 名前空間の prefix 文字列
 *
 * @remarks
 * バックエンドの backend/src/constants/systemNamespace.ts と値を同期すること。
 *
 * @module systemNamespace
 */

/** Alchemia システム名前空間の URI */
export const SYSTEM_NAMESPACE_URI = 'https://Alchemia.co.jp' as const;

/** Alchemia システム名前空間の prefix（UI 制御の判定に使用） */
export const SYSTEM_NAMESPACE_PREFIX = 'Alchemia' as const;
