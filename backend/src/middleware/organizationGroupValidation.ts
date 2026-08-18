/**
 * organizationGroup バリデーションミドルウェア
 *
 * express-validator を使用したリクエストパラメータの検証ルール定義。
 * Routes でハンドラー前に配置し、handleValidationErrors と組み合わせて使用する。
 *
 * @module organizationGroupValidation
 */

import { body, param, query } from 'express-validator';

// ─── 組織グループ操作 ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/organization-groups
 * query: search は任意・文字列
 * query: visibleOnly は任意・'true' または 'false'
 */
export const validateGetOrganizationGroups = [
  query('search')
    .optional()
    .isString()
    .withMessage('search は文字列で指定してください'),
  query('visibleOnly')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('visibleOnly は "true" または "false" で指定してください'),
];

/**
 * POST /api/v1/organization-groups
 * body: organization_group_cd, organization_group_name は必須
 * body: parent_group_cd は任意
 */
export const validateCreateOrganizationGroup = [
  body('organization_group_cd')
    .notEmpty()
    .withMessage('organization_group_cd は必須です')
    .isString()
    .withMessage('organization_group_cd は文字列で指定してください')
    .trim(),
  body('organization_group_name')
    .notEmpty()
    .withMessage('organization_group_name は必須です')
    .isString()
    .withMessage('organization_group_name は文字列で指定してください')
    .trim(),
];

/**
 * GET /api/v1/organization-groups/:groupCd
 * params: groupCd は必須
 */
export const validateGetOrganizationGroupById = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
];

/**
 * PUT /api/v1/organization-groups/:groupCd
 * params: groupCd は必須
 * body: organization_group_name は任意（指定する場合は空文字列不可）
 */
export const validateUpdateOrganizationGroup = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
  body('organization_group_name')
    .optional()
    .notEmpty()
    .withMessage('organization_group_name を指定する場合は空文字列にできません')
    .isString()
    .withMessage('organization_group_name は文字列で指定してください')
    .trim(),
];

/**
 * PATCH /api/v1/organization-groups/:groupCd/status
 * params: groupCd は必須
 * body: isActive は boolean 必須
 */
export const validateUpdateOrganizationGroupStatus = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive は boolean で指定してください'),
];

// ─── メンバー管理 ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/organization-groups/:groupCd/members
 * params: groupCd は必須
 */
export const validateGetOrganizationGroupMembers = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
];

/**
 * PUT /api/v1/organization-groups/:groupCd/members
 * params: groupCd は必須
 * body: userIds は配列 必須
 */
export const validateSetOrganizationGroupMembers = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
  body('userIds')
    .isArray()
    .withMessage('userIds は配列で指定してください'),
];

/**
 * PUT /api/v1/organization-groups/:groupCd/chief
 * params: groupCd は必須
 * body: chiefUserId は文字列 必須
 */
export const validateUpdateOrganizationGroupChief = [
  param('groupCd')
    .notEmpty()
    .withMessage('groupCd は必須です'),
  body('chiefUserId')
    .notEmpty()
    .withMessage('chiefUserId は必須です')
    .isString()
    .withMessage('chiefUserId は文字列で指定してください')
    .trim(),
];
