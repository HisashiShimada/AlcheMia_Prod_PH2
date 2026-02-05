/**
 * バリデーション関連の型定義
 */

import { ValidationChain } from 'express-validator';

/**
 * バリデーションエラー詳細
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * バリデーションエラーレスポンス
 */
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationErrorDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * バリデーションルールセット
 */
export type ValidationRules = ValidationChain[];

/**
 * バリデーションオプション
 */
export interface ValidationOptions {
  optional?: boolean;
  custom?: (value: any) => boolean | Promise<boolean>;
  customErrorMessage?: string;
}

/**
 * フィールドバリデーション設定
 */
export interface FieldValidation {
  field: string;
  rules: ValidationRules;
  location?: 'body' | 'query' | 'param';
}