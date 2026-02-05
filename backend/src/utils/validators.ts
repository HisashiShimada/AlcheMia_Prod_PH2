/**
 * 共通バリデーター関数集
 * 
 * @description 再利用可能なバリデーションルールを定義
 */

import { param, body, query, ValidationChain } from 'express-validator';

/**
 * UUID検証
 * 
 * @param field - フィールド名
 * @param location - パラメータの場所 ('param' | 'body' | 'query')
 * @param options - オプション設定
 * @returns ValidationChain
 */
export const validateUUID = (
  field: string,
  location: 'param' | 'body' | 'query' = 'param',
  options: { optional?: boolean } = {}
): ValidationChain => {
  const validator = location === 'param' ? param(field) :
                   location === 'body' ? body(field) :
                   query(field);

  let chain = validator;

  if (options.optional) {
    chain = chain.optional();
  }

  return chain
    .isUUID()
    .withMessage(`${field}はUUID形式である必要があります`);
};

/**
 * 必須文字列検証（長さ制限付き）
 * 
 * @param field - フィールド名
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @param location - パラメータの場所
 * @returns ValidationChain
 */
export const validateRequiredString = (
  field: string,
  minLength: number = 1,
  maxLength: number = 255,
  location: 'body' | 'query' = 'body'
): ValidationChain => {
  const validator = location === 'body' ? body(field) : query(field);

  return validator
    .notEmpty()
    .withMessage(`${field}は必須です`)
    .isString()
    .withMessage(`${field}は文字列である必要があります`)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field}は${minLength}〜${maxLength}文字である必要があります`);
};

/**
 * オプショナル文字列検証（長さ制限付き）
 * 
 * @param field - フィールド名
 * @param maxLength - 最大文字数
 * @param location - パラメータの場所
 * @returns ValidationChain
 */
export const validateOptionalString = (
  field: string,
  maxLength: number = 1000,
  location: 'body' | 'query' = 'body'
): ValidationChain => {
  const validator = location === 'body' ? body(field) : query(field);

  return validator
    .optional()
    .isString()
    .withMessage(`${field}は文字列である必要があります`)
    .isLength({ max: maxLength })
    .withMessage(`${field}は${maxLength}文字以内である必要があります`);
};

/**
 * 列挙型検証
 * 
 * @param field - フィールド名
 * @param allowedValues - 許可された値の配列
 * @param location - パラメータの場所
 * @param options - オプション設定
 * @returns ValidationChain
 */
export const validateEnum = (
  field: string,
  allowedValues: string[],
  location: 'query' | 'body' = 'query',
  options: { optional?: boolean } = { optional: true }
): ValidationChain => {
  const validator = location === 'query' ? query(field) : body(field);

  let chain = validator;

  if (options.optional) {
    chain = chain.optional();
  }

  return chain
    .isIn(allowedValues)
    .withMessage(`${field}は次のいずれかである必要があります: ${allowedValues.join(', ')}`);
};

/**
 * 整数範囲検証
 * 
 * @param field - フィールド名
 * @param min - 最小値
 * @param max - 最大値（オプション）
 * @param location - パラメータの場所
 * @param options - オプション設定
 * @returns ValidationChain
 */
export const validateIntRange = (
  field: string,
  min: number,
  max?: number,
  location: 'query' | 'body' = 'query',
  options: { optional?: boolean } = { optional: true }
): ValidationChain => {
  const validator = location === 'query' ? query(field) : body(field);

  let chain = validator;

  if (options.optional) {
    chain = chain.optional();
  }

  chain = chain.isInt({ min, ...(max && { max }) });

  if (max !== undefined) {
    chain = chain.withMessage(`${field}は${min}〜${max}の範囲の整数である必要があります`);
  } else {
    chain = chain.withMessage(`${field}は${min}以上の整数である必要があります`);
  }

  return chain;
};

/**
 * Boolean型検証
 * 
 * @param field - フィールド名
 * @param location - パラメータの場所
 * @returns ValidationChain
 */
export const validateBoolean = (
  field: string,
  location: 'query' | 'body' = 'query'
): ValidationChain => {
  const validator = location === 'query' ? query(field) : body(field);

  return validator
    .optional()
    .isBoolean()
    .withMessage(`${field}はtrueまたはfalseである必要があります`);
};

/**
 * 制御文字チェック付き文字列検証
 * 
 * @param field - フィールド名
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @returns ValidationChain
 */
export const validateStringNoControlChars = (
  field: string,
  minLength: number = 1,
  maxLength: number = 255
): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage(`${field}は必須です`)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field}は${minLength}〜${maxLength}文字である必要があります`)
    .matches(/^[^\x00-\x1F\x7F]*$/)
    .withMessage(`${field}に制御文字を含めることはできません`);
};

/**
 * 英数字+記号のみ検証
 * 
 * @param field - フィールド名
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @returns ValidationChain
 */
export const validateAlphanumericWithSymbols = (
  field: string,
  minLength: number = 1,
  maxLength: number = 100
): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage(`${field}は必須です`)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field}は${minLength}〜${maxLength}文字である必要があります`)
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(`${field}は英数字、ハイフン、アンダースコアのみ使用できます`);
};

/**
 * PINコード検証（6桁の数字）
 * 
 * @param field - フィールド名
 * @returns ValidationChain
 */
export const validatePinCode = (field: string = 'pinCode'): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage('PINコードは必須です')
    .matches(/^\d{6}$/)
    .withMessage('PINコードは6桁の数字である必要があります');
};

/**
 * パスワード検証
 * 
 * @param field - フィールド名
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @returns ValidationChain
 */
export const validatePassword = (
  field: string = 'password',
  minLength: number = 8,
  maxLength: number = 255
): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage('パスワードは必須です')
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`パスワードは${minLength}〜${maxLength}文字である必要があります`);
};