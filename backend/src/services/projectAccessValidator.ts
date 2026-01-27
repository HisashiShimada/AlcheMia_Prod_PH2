/**
 * プロジェクトアクセス権限検証サービス
 * 
 * Task 3.2: プロジェクトアクセス権限検証機能の実装
 * Requirements: 3 (プロジェクトアクセス権限の確認)
 */

import { getPool } from '../database/db';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../utils/errorClasses';

/**
 * アクセス検証結果
 */
export interface AccessValidationResult {
  hasAccess: boolean;
  userRole: string;
  projectId: string;
  organizationId: string;
}

/**
 * プロジェクトアクセス権限検証クラス
 */
export class ProjectAccessValidator {
  /**
   * ユーザーがプロジェクトにアクセス可能かを検証
   * 
   * @param userId ユーザーID
   * @param projectId プロジェクトID
   * @param organizationId 組織ID
   * @returns アクセス検証結果
   * @throws ValidationError - パラメータが無効な場合
   * @throws NotFoundError - プロジェクトまたはユーザーが存在しない場合
   * @throws AuthorizationError - アクセス権限がない場合
   */
  async validateAccess(
    userId: string,
    projectId: string,
    organizationId: string
  ): Promise<AccessValidationResult> {
    // 1. パラメータのバリデーション
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('ユーザーIDが無効です');
    }

    if (!projectId || projectId.trim().length === 0) {
      throw new ValidationError('プロジェクトIDが無効です');
    }

    if (!organizationId || organizationId.trim().length === 0) {
      throw new ValidationError('組織IDが無効です');
    }

    const pool = getPool();

    // 2. プロジェクトの存在確認と組織IDの検証
    const projectQuery = `
      SELECT 
        project_id,
        organization_id,
        project_name
      FROM projects
      WHERE project_id = $1 AND organization_id = $2
    `;

    const projectResult = await pool.query(projectQuery, [
      projectId,
      organizationId,
    ]);

    if (projectResult.rows.length === 0) {
      throw new NotFoundError(
        `プロジェクトが見つかりません: ${projectId}`
      );
    }

    const project = projectResult.rows[0];

    // 3. ユーザー情報とロールの取得
    const userQuery = `
      SELECT 
        ou.user_id,
        ou.organization_id,
        r.role_name
      FROM organization_user ou
      INNER JOIN role_permission rp ON ou.role_id = rp.role_id
      INNER JOIN code_master r ON rp.role_id = r.code_id
      WHERE ou.user_id = $1
    `;

    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      throw new NotFoundError(`ユーザーが見つかりません: ${userId}`);
    }

    const user = userResult.rows[0];
    const userRole = user.role_name;

    // 4. ロール別のアクセス権限検証
    
    // System Adminは全組織のプロジェクトにアクセス可能
    if (userRole === 'admin') {
      return {
        hasAccess: true,
        userRole,
        projectId: project.project_id,
        organizationId: project.organization_id,
      };
    }

    // Managerは自組織のプロジェクトにアクセス可能
    if (userRole === 'manager') {
      if (user.organization_id !== project.organization_id) {
        throw new AuthorizationError(
          'このプロジェクトへのアクセス権限がありません'
        );
      }

      return {
        hasAccess: true,
        userRole,
        projectId: project.project_id,
        organizationId: project.organization_id,
      };
    }

    // Workerは割り当てられたプロジェクトのみアクセス可能
    if (userRole === 'worker') {
      // まず組織が一致するか確認
      if (user.organization_id !== project.organization_id) {
        throw new AuthorizationError(
          'このプロジェクトへのアクセス権限がありません'
        );
      }

      // プロジェクト割り当ての確認
      const assignmentQuery = `
        SELECT 
          user_id,
          project_id
        FROM project_task
        WHERE user_id = $1 AND project_id = $2
        LIMIT 1
      `;

      const assignmentResult = await pool.query(assignmentQuery, [
        userId,
        projectId,
      ]);

      if (assignmentResult.rows.length === 0) {
        throw new AuthorizationError(
          'このプロジェクトは割り当てられていません'
        );
      }

      return {
        hasAccess: true,
        userRole,
        projectId: project.project_id,
        organizationId: project.organization_id,
      };
    }

    // その他のロールはアクセス不可
    throw new AuthorizationError(
      'このプロジェクトへのアクセス権限がありません'
    );
  }
}
