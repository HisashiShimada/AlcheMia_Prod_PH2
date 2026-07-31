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
 * POST /api/v1/namespaces
 * body: prefix, uri は必須
 */
export const validateCreateNamespace = [
  body('prefix')
    .notEmpty()
    .withMessage('prefix は必須です')
    .isString()
    .withMessage('prefix は文字列で指定してください'),
  body('uri')
    .notEmpty()
    .withMessage('uri は必須です')
    .isString()
    .withMessage('uri は文字列で指定してください'),
];

// ─── 用語操作 ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/namespaces/terms
 * body: prefix, localName は必須
 */
export const validateCreateTerm = [
  body('prefix')
    .notEmpty()
    .withMessage('prefix は必須です')
    .isString()
    .withMessage('prefix は文字列で指定してください'),
  body('localName')
    .notEmpty()
    .withMessage('localName は必須です')
    .isString()
    .withMessage('localName は文字列で指定してください'),
];

/**
 * PUT /api/v1/namespaces/terms/:prefix/:localName
 * params: prefix, localName は必須（URLパラメータのため存在保証されるが明示的に検証）
 */
export const validateUpdateTerm = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
  param('localName')
    .notEmpty()
    .withMessage('localName は必須です'),
];

/**
 * DELETE /api/v1/namespaces/terms/:prefix/:localName
 * params: prefix, localName は必須
 */
export const validateDeleteTerm = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
  param('localName')
    .notEmpty()
    .withMessage('localName は必須です'),
];

/**
 * PATCH /api/v1/namespaces/terms/:prefix/:localName/active
 * params: prefix, localName は必須
 * body: isActive は boolean 必須
 */
export const validateToggleTermActive = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
  param('localName')
    .notEmpty()
    .withMessage('localName は必須です'),
  body('isActive')
    .exists()
    .withMessage('isActive は必須です')
    .isBoolean()
    .withMessage('isActive は boolean 型で指定してください'),
];

// ─── 名前空間宣言 ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/namespaces/project-declarations
 * query: projectId は必須
 */
export const validateGetDeclarationsByProject = [
  query('projectId')
    .notEmpty()
    .withMessage('projectId は必須です')
    .isString()
    .withMessage('projectId は文字列で指定してください'),
];
