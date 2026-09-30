/**
 * namespace バリデーションミドルウェア
 *
 * express-validator を使用したリクエストパラメータの検証ルール定義。
 * Routes でハンドラー前に配置し、handleValidationErrors と組み合わせて使用する。
 *
 * @module namespaceValidation
 */

import { body, query, param } from 'express-validator';

/** xs:NCName 正規表現: 英字・アンダースコア始まり、英数字・`_`・`-`・`.` のみ */
const NCNAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;

// ─── 名前空間（Prefix）操作 ───────────────────────────────────────────────────

/**
 * GET /api/v1/namespaces
 * query: scopeKey は任意・文字列
 */
export const validateGetNamespaces = [
  query('scopeKey')
    .optional()
    .isString()
    .withMessage('scopeKeyが文字列ではありません'),
];

/**
 * POST /api/v1/namespaces
 * body: prefix, uri は必須
 */
export const validateCreateNamespace = [
  body('prefix')
    .notEmpty()
    .withMessage('prefix は必須です')
    .isString()
    .withMessage('prefix が文字列ではありません')
    .matches(NCNAME_REGEX)
    .withMessage('prefix は有効な NCName（xs:NCName 形式）を入力してください'),
  body('uri')
    .notEmpty()
    .withMessage('URI は必須です')
    .isString()
    .withMessage('URI が文字列ではありません'),
];

/**
 * PATCH /api/v1/namespaces/:prefix
 * params: prefix は必須
 * body: newPrefix / description はどちらも任意
 */
export const validateUpdateNamespace = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
  body('newPrefix')
    .optional()
    .isString()
    .withMessage('newPrefix が文字列ではありません')
    .matches(NCNAME_REGEX)
    .withMessage('newPrefix は有効な NCName（xs:NCName 形式）を入力してください'),
  body('description')
    .optional()
    .isString()
    .withMessage('説明が文字列ではありません'),
];

/**
 * DELETE /api/v1/namespaces/:prefix
 * params: prefix は必須
 */
export const validateDeleteNamespace = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
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
    .withMessage('prefix が文字列ではありません'),
  body('localName')
    .notEmpty()
    .withMessage('ローカル名は必須です')
    .isString()
    .withMessage('ローカル名が文字列ではありません')
    .matches(NCNAME_REGEX)
    .withMessage('ローカル名は有効な NCName（xs:NCName 形式）を入力してください'),
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
    .withMessage('ローカル名は必須です'),
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
    .withMessage('ローカル名は必須です'),
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
    .withMessage('ローカル名は必須です'),
  body('isActive')
    .exists()
    .withMessage('状態は必須です')
    .isBoolean()
    .withMessage('状態が boolean（真偽値）ではありません'),
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
    .withMessage('scopeKeyが文字列ではありません'),
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
    .withMessage('projectIdは必須です')
    .isString()
    .withMessage('projectIdが文字列ではありません'),
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

// ─── Prefix アクティブ切替 ────────────────────────────────────────────────────

/**
 * PATCH /api/v1/namespaces/:prefix/active
 * params: prefix は必須
 * body: isActive は必須・boolean
 */
export const validateToggleNamespaceActive = [
  param('prefix')
    .notEmpty()
    .withMessage('prefix は必須です'),
  body('isActive')
    .notEmpty()
    .withMessage('状態は必須です')
    .isBoolean()
    .withMessage('状態が boolean（真偽値）ではありません'),
];

// ─── 用語共有 ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/namespaces/terms/share
 * body: sourceScopeKey, targetScopeKey は必須文字列、termIds は必須配列
 */
export const validateShareTerms = [
  body('sourceScopeKey')
    .notEmpty()
    .withMessage('sourceScopeKey は必須です')
    .isString()
    .withMessage('sourceScopeKey が文字列ではありません'),
  body('targetScopeKey')
    .notEmpty()
    .withMessage('targetScopeKey は必須です')
    .isString()
    .withMessage('targetScopeKey が文字列ではありません'),
  body('termIds')
    .isArray({ min: 1 })
    .withMessage('termIds が0件です'),
  body('termIds.*')
    .isString()
    .withMessage('各 termId が文字列ではありません'),
];
