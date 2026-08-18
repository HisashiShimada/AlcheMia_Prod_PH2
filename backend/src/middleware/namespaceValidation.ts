/**
 * namespace バリデーションミドルウェア
 *
 * express-validator を使用したリクエストパラメータの検証ルール定義。
 * Routes でハンドラー前に配置し、handleValidationErrors と組み合わせて使用する。
 *
 * @module namespaceValidation
 */

import { body, query, param } from 'express-validator';

// ─── 名前空間（Prefix）操作 ───────────────────────────────────────────────────

/**
 * GET /api/v1/namespaces
 * query: scopeKey は任意・文字列
 */
export const validateGetNamespaces = [
  query('scopeKey')
    .optional()
    .isString()
    .withMessage('scopeKey must be a string'),
];

/**
 * POST /api/v1/namespaces
 * body: prefix, uri は必須
 */
export const validateCreateNamespace = [
  body('prefix')
    .notEmpty()
    .withMessage('prefix is required')
    .isString()
    .withMessage('prefix must be a string'),
  body('uri')
    .notEmpty()
    .withMessage('uri is required')
    .isString()
    .withMessage('uri must be a string'),
];

/**
 * PATCH /api/v1/namespaces/:prefix
 * params: prefix は必須
 * body: uri は必須・文字列
 */
export const validateUpdateNamespace = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix is required'),
  body('uri')
    .notEmpty()
    .withMessage('uri is required')
    .isString()
    .withMessage('uri must be a string'),
];

/**
 * DELETE /api/v1/namespaces/:prefix
 * params: prefix は必須
 */
export const validateDeleteNamespace = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix is required'),
];

// ─── 用語操作 ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/namespaces/terms
 * body: prefix, localName は必須
 */
export const validateCreateTerm = [
  body('prefix')
    .notEmpty()
    .withMessage('prefix is required')
    .isString()
    .withMessage('prefix must be a string'),
  body('localName')
    .notEmpty()
    .withMessage('localName is required')
    .isString()
    .withMessage('localName must be a string'),
];

/**
 * PUT /api/v1/namespaces/terms/:prefix/:localName
 * params: prefix, localName は必須（URLパラメータのため存在保証されるが明示的に検証）
 */
export const validateUpdateTerm = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix is required'),
  param('localName')
    .notEmpty()
    .withMessage('localName is required'),
];

/**
 * DELETE /api/v1/namespaces/terms/:prefix/:localName
 * params: prefix, localName は必須
 */
export const validateDeleteTerm = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix is required'),
  param('localName')
    .notEmpty()
    .withMessage('localName is required'),
];

/**
 * PATCH /api/v1/namespaces/terms/:prefix/:localName/active
 * params: prefix, localName は必須
 * body: isActive は boolean 必須
 */
export const validateToggleTermActive = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix is required'),
  param('localName')
    .notEmpty()
    .withMessage('localName is required'),
  body('isActive')
    .exists()
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ─── 用語一覧取得 ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/namespaces/terms
 * query: scopeKey は任意・文字列
 * （global_flg 廃止により globalFlg クエリパラメータを削除）
 */
export const validateGetTerms = [
  query('scopeKey')
    .optional()
    .isString()
    .withMessage('scopeKey must be a string'),
];

// ─── 名前空間宣言 ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/namespaces/declarations
 * パラメータなし（認証・テナント分離のみ必要）
 */
export const validateGetDeclarations: never[] = [];

/**
 * GET /api/v1/namespaces/project-declarations
 * query: projectId は必須
 */
export const validateGetDeclarationsByProject = [
  query('projectId')
    .notEmpty()
    .withMessage('projectId is required')
    .isString()
    .withMessage('projectId must be a string'),
];

// ─── グローバル名前空間宣言（ファイルサーバ管理） ─────────────────────────────

/**
 * POST /api/v1/namespaces/global-declarations/import
 * multipart/form-data: file（CSV）は必須
 *
 * @remarks
 * ファイルの存在確認はコントローラー側で実施するため、
 * バリデーションルールは空配列（ファイルは express-validator では検証不可）
 */
export const validateImportGlobalDeclarations: never[] = [];
