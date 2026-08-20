/**
 * バックエンド向け i18n ユーティリティ
 *
 * フロントエンドの locale JSON（ja.json / en.json）を読み込み、
 * Accept-Language ヘッダーに応じてメッセージを返す。
 */

import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

type LocaleData = Record<string, unknown>;

let jaLocale: LocaleData = {};
let enLocale: LocaleData = {};
let initialized = false;

/**
 * locale JSON を初期化（起動時に一度だけ実行）
 */
function init(): void {
  if (initialized) return;
  try {
    const localesDir = path.resolve(__dirname, '../../../frontend/src/locales');
    jaLocale = JSON.parse(
      fs.readFileSync(path.join(localesDir, 'ja.json'), 'utf-8')
    ) as LocaleData;
    enLocale = JSON.parse(
      fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8')
    ) as LocaleData;
  } catch {
    // locale ファイルが読めない場合は空のまま（フォールバックで日本語文字列が使われる）
  }
  initialized = true;
}

/**
 * ドット区切りのキーでネストされたオブジェクトを掘り下げる
 */
function resolve(obj: LocaleData, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * リクエストの Accept-Language から言語コードを判定する
 */
export function getLang(req: Request): 'ja' | 'en' {
  const accept = req.headers['accept-language'] ?? '';
  // "en", "en-US", "en-GB" などで始まれば英語
  return accept.startsWith('en') ? 'en' : 'ja';
}

/**
 * locale キーからメッセージを返す
 *
 * @param key  ドット区切りの locale キー（例: "projectManagement.rename.required"）
 * @param lang 言語コード
 * @param fallback キーが見つからなかった場合のフォールバック文字列
 */
export function t(key: string, lang: 'ja' | 'en', fallback: string): string {
  init();
  const locale = lang === 'en' ? enLocale : jaLocale;
  return resolve(locale, key) ?? fallback;
}

/**
 * express-validator の withMessage() に渡すコールバックを生成するヘルパー
 *
 * @param key      locale キー
 * @param fallback フォールバック文字列（日本語）
 */
export function msg(
  key: string,
  fallback: string
): (value: unknown, meta: { req: Request }) => string {
  return (_value, { req }) => t(key, getLang(req), fallback);
}
