/**
 * ProjectService
 * 
 * @description プロジェクト一覧取得のビジネスロジック
 * Task: 1.1 データベースクエリ機能の実装
 */

import { getPool, getPgp } from '../database/db';
import { getStorageService } from './storageService';
import { escapeHtml } from '../utils/sanitize';
import { sanitizeForLog, sanitizeErrorForLog } from '../utils/sanitizeLog';
import winston from 'winston';
import * as projectRepository from '../repositories/projectRepository';
import * as projectTaskRepository from '../repositories/projectTaskRepository';
import * as projectInstructionRepository from '../repositories/projectInstructionRepository';
import type { 
  Project, 
  Pagination, 
  ProjectListResponse
} from '../types/project';
import {
  nanoid
} from 'nanoid'

interface ListOptions {
  page: number;
  limit: number;
  includeCompleted: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    originalError?: Error;
  };
}

/**
 * チェックアウト状態情報
 * Task 3.1, 3.2, 3.3: チェックアウト/チェックイン機能で使用
 */
interface ProjectCheckoutInfo {
  projectId: string;
  projectName: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
}

/**
 * 指示確認レスポンスデータ
 * Task: 2.1, 2.2 型定義（instructionConfirmation.tsから移植）
 */
interface InstructionConfirmationData {
  instruction_id: string;
  is_acknowledged: boolean;
  acknowledged_at: string;
  acknowledged_user_id: string;
  acknowledged_user_name: string;
}

/**
 * ProjectServiceクラス
 */
export class ProjectService {
  /**
   * プロジェクト作成
   * 
   * Task 3.1-3.7: Service層実装
   * @param organizationId - 組織ID
   * @param userId - ユーザーID
   * @param departmentId - 部門ID
   * @param data - プロジェクトデータ
   * @returns 作成されたプロジェクト情報
   */
  async create(
    organizationId: string,
    userId: string,
    departmentId: string | null,
    data: { projectName: string; description?: string }
  ): Promise<ServiceResult<Project>> {
    const pool = getPool();
    let client;

    try {
      // Task 3.2: トランザクション開始
      client = await pool.connect();
      await client.query('BEGIN');

      // Task 3.3: 重複チェック
      const duplicateCheckQuery = `
        SELECT COUNT(*) as count
        FROM project
        WHERE organization_id = $1 AND project_name = $2
      `;
      const duplicateResult = await client.query(duplicateCheckQuery, [
        organizationId,
        data.projectName,
      ]);

      if (parseInt(duplicateResult.rows[0].count, 10) > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'BUSINESS_DUPLICATE_PROJECT_NAME',
            message: 'プロジェクト名が既に存在します',
          },
        };
      }

      // Task 3.4: プロジェクトレコード登録
      // project_id 形式: 'project_' (8文字) + nanoid(12) = 20文字固定
      const projectId = `project_${nanoid(12)}`;
      const createAt = new Date().toISOString();

      const insertQuery = `
        INSERT INTO project (
          organization_id,
          project_id,
          project_name,
          description,
          department_cd,
          owner_user_id,
          project_status,
          checkout_status,
          project_maiml_flg,
          create_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        organizationId,
        projectId,
        data.projectName,
        data.description || null,
        departmentId,
        userId,
        0, // project_status: 0 (プロジェクト計画中)
        0, // checkout_status: 0 (チェックイン中)
        false, // project_maiml_flg
        createAt,
      ]);

      // Task 3.6: S3フォルダ作成
      const { getStorageService } = require('../services/storageService');
      const storageService = getStorageService();
      const s3Path = `projects/${data.projectName}/.keep`;

      try {
        await storageService.uploadFile(
          organizationId,
          s3Path,
          '',
          { contentType: 'text/plain' }
        );
      } catch (s3Error) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'SYSTEM_S3_ERROR',
            message: 'S3フォルダの作成に失敗しました',
            originalError: s3Error as Error,
          },
        };
      }

      // トランザクションコミット
      await client.query('COMMIT');

      // レスポンスデータ構築（フロントエンドの型に合わせる）
      const projectData: Project = {
        id: insertResult.rows[0].project_id,
        name: insertResult.rows[0].project_name,
        folderName: insertResult.rows[0].project_name,
        description: insertResult.rows[0].description || '',
        status: insertResult.rows[0].project_status, // 数値のまま返す
        fileCount: 0,
        totalSize: 0,
        owner: insertResult.rows[0].owner_user_id,
        ownerName: undefined,
        ownerEmail: undefined,
        department: insertResult.rows[0].department_cd || '',
        members: [],
        tags: [],
        isCheckedOut: insertResult.rows[0].checkout_status === 1,
        checkedOutBy: insertResult.rows[0].checkout_status === 1 ? insertResult.rows[0].owner_user_id : null,
        checkedOutAt: insertResult.rows[0].checkout_status === 1 ? new Date().toISOString() : null,
        createdAt: new Date(insertResult.rows[0].create_at).toISOString(),
        updatedAt: new Date(insertResult.rows[0].create_at).toISOString(),
        totalTasks: 0,
        completedTasks: 0,
      };

      return {
        success: true,
        data: projectData,
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * プロジェクト一覧を取得
   * 
   * @param organizationId - 組織ID
   * @param options - 取得オプション
   * @returns プロジェクト一覧とページネーション情報
   */
  async list(
    organizationId: string,
    options: ListOptions
  ): Promise<ServiceResult<ProjectListResponse>> {
    try {
      const { page, limit, includeCompleted, sortBy = 'create_at', order = 'desc' } = options;
      const offset = (page - 1) * limit;

      // プロジェクト一覧取得クエリ（ユーザー名、部署名、チェックアウト情報も取得）
      const projectQuery = `
        SELECT 
          p.organization_id,
          p.project_id,
          p.project_name,
          p.description,
          p.department_cd,
          d.department_name,
          p.owner_user_id,
          ou.user_name as owner_user_name,
          ou.mail_address as owner_email,
          p.project_status,
          ps.code_name as project_status_name,
          p.project_maiml_flg,
          p.checkout_status,
          p.create_at,
          checkout_user.user_id as checkout_user_id,
          COUNT(DISTINCT CASE 
            WHEN ptd.method_id IS NOT NULL AND ptd.task_no IS NOT NULL 
            THEN ptd.method_id || '_' || ptd.task_no::TEXT 
            ELSE NULL 
          END) as task_count,
          COUNT(DISTINCT CASE 
            WHEN ptd.task_status = 4 
            THEN ptd.method_id || '_' || ptd.task_no::TEXT 
            ELSE NULL 
          END) as completed_task_count
        FROM project p
        LEFT JOIN project_task_detail ptd
          ON ptd.project_id = p.project_id
          AND ptd.organization_id = p.organization_id
        LEFT JOIN organization_user ou
          ON ou.user_id = p.owner_user_id
          AND ou.organization_id = p.organization_id
        LEFT JOIN department d
          ON d.department_cd = p.department_cd
          AND d.organization_id = p.organization_id
        LEFT JOIN code_master ps
          ON ps.code_division = 'project_status'
          AND ps.code_value = CAST(p.project_status AS VARCHAR)
          AND ps.organization_id = p.organization_id
        LEFT JOIN organization_user checkout_user
          ON checkout_user.user_id = p.owner_user_id
          AND checkout_user.organization_id = p.organization_id
          AND p.checkout_status = 1
        WHERE p.organization_id = $1
          AND ($2::boolean IS NULL OR 
               ($2 = true OR p.project_status != 4))
        GROUP BY 
          p.organization_id,
          p.project_id,
          p.project_name,
          p.description,
          p.department_cd,
          d.department_name,
          p.owner_user_id,
          ou.user_name,
          ou.mail_address,
          p.project_status,
          ps.code_name,
          p.project_maiml_flg,
          p.checkout_status,
          p.create_at,
          checkout_user.user_id
        ORDER BY p.${sortBy} ${order.toUpperCase()}
        LIMIT $3 OFFSET $4
      `;

      const projectParams = [
        organizationId,
        includeCompleted,
        limit,
        offset
      ];

      // 総件数取得クエリ
      const countQuery = `
        SELECT COUNT(*) as total
        FROM project
        WHERE organization_id = $1
          AND ($2::boolean IS NULL OR 
               ($2 = true OR project_status != 4))
      `;

      const countParams = [organizationId, includeCompleted];

      // クエリ実行
      const pool = getPool();
      const [projectsResult, countResult] = await Promise.all([
        pool.query(projectQuery, projectParams),
        pool.query(countQuery, countParams)
      ]);

      const projects = projectsResult.rows;
      const totalItems = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // データを変換（フロントエンドの型に合わせる）
      const formattedProjects: Project[] = projects.map((row: any) => ({
        id: row.project_id,
        name: row.project_name,
        folderName: row.project_name, // プロジェクト名をフォルダ名としても使用
        description: row.description || '',
        status: row.project_status, // 数値のまま返す
        statusName: row.project_status_name || undefined, // code_masterから取得した日本語名
        fileCount: 0, // 後で実装予定
        totalSize: 0, // 後で実装予定
        owner: row.owner_user_id,
        ownerName: row.owner_user_name || undefined,
        ownerEmail: row.owner_email || undefined,
        department: row.department_cd || '',
        departmentName: row.department_name || undefined,
        members: [], // 後で実装予定
        tags: [], // 後で実装予定
        isCheckedOut: row.checkout_status === 1,
        checkedOutBy: row.checkout_status === 1 ? row.checkout_user_id : null,
        checkedOutAt: row.checkout_status === 1 ? new Date().toISOString() : null,
        createdAt: row.create_at ? row.create_at.toISOString() : '',
        updatedAt: row.update_at ? row.update_at.toISOString() : '', // 後で実装予定
        totalTasks: parseInt(row.task_count, 10),
        completedTasks: parseInt(row.completed_task_count, 10)
      }));

      // ページネーション情報を構築
      const pagination: Pagination = {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      return {
        success: true,
        data: {
          projects: formattedProjects,
          pagination
        }
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database query failed',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * プロジェクトチェックアウト
   * 
   * Task 3.1: チェックアウトビジネスロジックの実装
   * Requirements: FR-1.1, FR-1.2, NFR-1, NFR-2
   * 
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param userId - ユーザーID
   * @returns チェックアウト結果
   */
  async checkout(
    organizationId: string,
    projectNameOrId: string,
    userId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    const pool = getPool();
    let client;

    try {
      // projectNameからprojectIdを取得（Repository層経由）
      let projectId: string;
      
      // UUIDの場合はそのまま使用、それ以外はprojectNameとして扱う
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(projectNameOrId)) {
        projectId = projectNameOrId;
      } else {
        const projectRow = await projectRepository.findProjectIdByName(organizationId, projectNameOrId);
        if (!projectRow) {
          return {
            success: false,
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: 'プロジェクトが見つかりません',
            },
          };
        }
        projectId = projectRow.project_id;
      }
      
      // トランザクション開始
      client = await pool.connect();
      await client.query('BEGIN');

      // SELECT ... FOR UPDATEで排他ロック取得（project_maiml_flgを追加）
      const selectQuery = `
        SELECT
          project_id,
          project_name,
          project_status,
          project_maiml_flg,
          checkout_status,
          owner_user_id
        FROM project
        WHERE organization_id = $1 AND project_id = $2
        FOR UPDATE
      `;

      const selectResult = await client.query(selectQuery, [organizationId, projectId]);

      // プロジェクト存在確認
      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const project = selectResult.rows[0];

      // バリデーション1: MAIMLファイル存在チェック
      if (!project.project_maiml_flg) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'CHECKOUT_NO_MAIML_FILE',
            message: 'MAIMLファイルが存在しません',
            details: {
              projectId,
              projectName: project.project_name,
              maimlFlg: project.project_maiml_flg,
            },
          },
        };
      }

      // バリデーション2: プロジェクトステータスチェック（タスク実行待ち = 1 のみ許可）
      if (project.project_status !== 1) {
        await client.query('ROLLBACK');
        const statusNames: { [key: number]: string } = {
          0: 'プロジェクト計画中',
          1: 'タスク実行待ち',
          2: 'タスク実行中',
          3: 'タスク結果レビュー待ち',
          4: 'プロジェクト完了',
          5: 'タスク異常終了',
        };
        const currentStatusName = statusNames[project.project_status] || '不明';
        
        return {
          success: false,
          error: {
            code: 'CHECKOUT_INVALID_STATUS',
            message: `プロジェクトステータスがタスク実行待ちではありません（現在: ${currentStatusName}）`,
            details: {
              projectId,
              projectName: project.project_name,
              currentStatus: project.project_status,
              currentStatusName,
              requiredStatus: 1,
              requiredStatusName: 'タスク実行待ち',
            },
          },
        };
      }

      // バリデーション3: タスク登録完了チェック（Repository層経由）
      const taskCount = await projectTaskRepository.countByProject(organizationId, projectId);

      if (taskCount === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'CHECKOUT_NO_TASKS',
            message: 'タスクが登録されていません',
            details: {
              projectId,
              projectName: project.project_name,
              taskCount: 0,
            },
          },
        };
      }

      // バリデーション4: 未送信指示チェック（Repository層経由）
      const hasUnsent = await projectInstructionRepository.hasUnsentInstructions(organizationId, projectId);

      if (hasUnsent) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'CHECKOUT_UNSENT_INSTRUCTIONS',
            message: '未送信の指示が存在します',
            details: {
              projectId,
              projectName: project.project_name,
            },
          },
        };
      }

      // チェックアウト状態確認
      if (project.checkout_status === 1) {
        // 既にチェックアウト中
        if (project.owner_user_id === userId) {
          // 同一ユーザー: 冪等性を保つ（200 OK）
          await client.query('COMMIT');

          return {
            success: true,
            data: {
              projectId: project.project_id,
              projectName: project.project_name,
              isCheckedOut: true,
              checkedOutBy: userId,
              checkedOutAt: new Date().toISOString(), // 現在時刻を返す
            },
          };
        } else {
          // 別ユーザー: 409 Conflict
          await client.query('ROLLBACK');

          // チェックアウト保持者のユーザー名を取得
          const userQuery = `
            SELECT user_name 
            FROM organization_user 
            WHERE organization_id = $1 AND user_id = $2
          `;
          const userResult = await client.query(userQuery, [organizationId, project.owner_user_id]);
          const checkedOutByName = userResult.rows[0]?.user_name || project.owner_user_id;

          return {
            success: false,
            error: {
              code: 'PROJECT_ALREADY_CHECKED_OUT',
              message: 'このプロジェクトは既に他のユーザーによってチェックアウトされています',
              details: {
                checkedOutBy: checkedOutByName,
                checkedOutAt: new Date().toISOString(),
              },
            },
          };
        }
      }

      // チェックアウト実行: checkout_status = 1に更新
      const updateQuery = `
        UPDATE project
        SET checkout_status = 1, owner_user_id = $3
        WHERE organization_id = $1 AND project_id = $2
      `;

      await client.query(updateQuery, [organizationId, projectId, userId]);

      // トランザクションコミット
      await client.query('COMMIT');

      return {
        success: true,
        data: {
          projectId: project.project_id,
          projectName: project.project_name,
          isCheckedOut: true,
          checkedOutBy: userId,
          checkedOutAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * プロジェクトチェックイン
   * 
   * Task 3.2: チェックインビジネスロジックの実装
   * Requirements: FR-2.1, NFR-1, NFR-2
   * 
   * @param organizationId - 組織ID
   * @param projectName - プロジェクト名
   * @param userId - ユーザーID
   * @returns チェックイン結果
   */
  async checkin(
    organizationId: string,
    projectName: string,
    _userId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    const pool = getPool();
    let client;

    try {
      // projectNameからprojectIdを取得
      const projectRow = await projectRepository.findProjectIdByName(organizationId, projectName);
      if (!projectRow) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }
      const projectId = projectRow.project_id;

      // トランザクション開始
      client = await pool.connect();
      await client.query('BEGIN');

      // SELECT ... FOR UPDATEで排他ロック取得
      const selectQuery = `
        SELECT 
          project_id,
          project_name,
          checkout_status,
          owner_user_id
        FROM project
        WHERE organization_id = $1 AND project_id = $2
        FOR UPDATE
      `;

      const selectResult = await client.query(selectQuery, [organizationId, projectId]);

      // プロジェクト存在確認
      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const project = selectResult.rows[0];

      // 前提条件チェック: task_status = 1のタスク存在確認（Repository層経由）
      const hasRunning = await projectTaskRepository.hasRunningTasks(organizationId, projectId);

      if (hasRunning) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'TASK_IN_PROGRESS',
            message: '実行中のタスクが存在するため、チェックインできません',
          },
        };
      }

      // チェックイン状態確認
      if (project.checkout_status === 0) {
        // 既にチェックイン済み: 冪等性を保つ（200 OK）
        await client.query('COMMIT');

        return {
          success: true,
          data: {
            projectId: project.project_id,
            projectName: project.project_name,
            isCheckedOut: false,
            checkedOutBy: null,
            checkedOutAt: null,
          },
        };
      }

      // チェックイン実行: checkout_status = 0に更新
      const updateQuery = `
        UPDATE project
        SET checkout_status = 0
        WHERE organization_id = $1 AND project_id = $2
      `;

      await client.query(updateQuery, [organizationId, projectId]);

      // トランザクションコミット
      await client.query('COMMIT');

      return {
        success: true,
        data: {
          projectId: project.project_id,
          projectName: project.project_name,
          isCheckedOut: false,
          checkedOutBy: null,
          checkedOutAt: null,
        },
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * プロジェクトチェックアウト状態取得
   * 
   * Task 3.3: チェックアウト状態照会ビジネスロジックの実装
   * Requirements: FR-3.1, NFR-2
   * 
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @returns チェックアウト状態情報
   */
  async getCheckoutStatus(
    organizationId: string,
    projectId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    try {
      const pool = getPool();

      // プロジェクト情報取得
      const selectQuery = `
        SELECT 
          p.project_id,
          p.project_name,
          p.checkout_status,
          p.owner_user_id,
          ou.user_name as owner_user_name
        FROM project p
        LEFT JOIN organization_user ou 
          ON ou.user_id = p.owner_user_id 
          AND ou.organization_id = p.organization_id
        WHERE p.organization_id = $1 AND p.project_id = $2
      `;

      const result = await pool.query(selectQuery, [organizationId, projectId]);

      // プロジェクト存在確認
      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const project = result.rows[0];

      // レスポンスデータ構築
      const checkoutInfo: ProjectCheckoutInfo = {
        projectId: project.project_id,
        projectName: project.project_name,
        isCheckedOut: project.checkout_status === 1,
        checkedOutBy: project.checkout_status === 1 ? project.owner_user_id : null,
        checkedOutAt: project.checkout_status === 1 ? new Date().toISOString() : null,
      };

      return {
        success: true,
        data: checkoutInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * プロジェクトファイル一覧を取得
   * 
   * Task 2.1: ファイル一覧取得API - Service層実装
   * Requirements: 2, 3, 11
   * 
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @returns ファイル一覧（archiveファイルは常に取得）
   */
  async getProjectFiles(
    organizationId: string,
    projectId: string
  ): Promise<ServiceResult<{
    projectId: string;
    projectName: string;
    files: any[];
    archiveFiles: any[];
  }>> {
    try {
      // Repository層経由でプロジェクト情報を取得
      const project = await projectRepository.findProjectBasicInfo(organizationId, projectId);

      if (!project) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const projectName = project.project_name;

      // S3からファイル一覧を取得（グレースフル処理）
      let files: any[] = [];
      let archiveFiles: any[] = [];

      try {
        const storageService = getStorageService();

        // 現在のファイル一覧を取得
        const currentFiles = await storageService.listFiles(
          organizationId,
          `projects/${projectName}/`
        ).catch(() => []);

        // archive配下のファイルと.keepファイルを除外してフィルタリング
        const rootFiles = currentFiles.filter((file: any) => {
          console.log(file.key);
          // archive/配下のファイルは除外
          if (file.key.includes('/archive/')) {
            return false;
          }
          
          // .keepファイルを除外
          const fileName = file.key.split('/').pop() || '';
          if (fileName === '' || fileName === '.keep') {
            return false;
          }
          
          return true;
        });

        // 各ファイルに対して署名付きURLを生成（並列数制限: 20ファイルずつ）
        const startTime = Date.now();
        const chunkSize = 20;
        files = [];
        
        for (let i = 0; i < rootFiles.length; i += chunkSize) {
          const chunk = rootFiles.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            chunk.map(async (file: any) => {
              const signedUrl = await storageService.getSignedUrl(
                organizationId,
                file.key.replace(`${organizationId}/`, ''),
                3600
              );

              // ファイル名を抽出
              const fileName = file.key.split('/').pop() || '';
              const fileType = fileName.split('.').pop() || '';

              // organizationId プレフィックスを除去して相対パスとして返す
              // file.key 例: "550e8400.../projects/Sample_Project/Sample_Project.maiml"
              // 相対パス例: "projects/Sample_Project/Sample_Project.maiml"
              const relativePath = file.key.startsWith(`${organizationId}/`)
                ? file.key.substring(organizationId.length + 1)
                : file.key;

              return {
                id: file.key,
                name: fileName,
                path: relativePath,
                size: file.size,
                lastModified: file.lastModified.toISOString(),
                type: fileType,
                isArchive: false,
                version: null,
                signedUrl,
                createdAt: file.lastModified.toISOString(),
              };
            })
          );
          files.push(...chunkResults);
        }
        
        const endTime = Date.now();
        console.log(`[Performance] 署名付きURL生成完了: ${rootFiles.length}ファイル、処理時間: ${endTime - startTime}ms`);

        // archiveファイルを常に取得（include_archiveパラメータ削除）
        const archiveFilesList = await storageService.listFiles(
          organizationId,
          `projects/${projectName}/archive/`
        ).catch(() => []);

        // .keepファイルを除外
        const filteredArchiveFiles = archiveFilesList.filter((file: any) => {
          const fileName = file.key.split('/').pop() || '';
          return fileName !== '.keep';
        });

        // archiveファイルが存在する場合のみ署名付きURL生成（並列数制限: 20ファイルずつ）
        if (filteredArchiveFiles.length > 0) {
          const archiveStartTime = Date.now();
          archiveFiles = [];
          
          for (let i = 0; i < filteredArchiveFiles.length; i += chunkSize) {
            const chunk = filteredArchiveFiles.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(
              chunk.map(async (file: any) => {
                const signedUrl = await storageService.getSignedUrl(
                  organizationId,
                  file.key.replace(`${organizationId}/`, ''),
                  3600
                );

                const fileName = file.key.split('/').pop() || '';
                const fileType = fileName.split('.').pop() || '';

                // バージョン番号を抽出（_v{number}.maiml パターン）
                const versionMatch = fileName.match(/_v(\d+)\.maiml$/);
                const version = versionMatch ? parseInt(versionMatch[1], 10) : null;

                // organizationId プレフィックスを除去して相対パスとして返す
                const archiveRelativePath = file.key.startsWith(`${organizationId}/`)
                  ? file.key.substring(organizationId.length + 1)
                  : file.key;

                return {
                  id: file.key,
                  name: fileName,
                  path: archiveRelativePath,
                  size: file.size,
                  lastModified: file.lastModified.toISOString(),
                  type: fileType,
                  isArchive: true,
                  version,
                  signedUrl,
                  createdAt: file.lastModified.toISOString(),
                };
              })
            );
            archiveFiles.push(...chunkResults);
          }
          
          const archiveEndTime = Date.now();
          console.log(`[Performance] アーカイブファイル署名付きURL生成完了: ${filteredArchiveFiles.length}ファイル、処理時間: ${archiveEndTime - archiveStartTime}ms`);
        } else {
          // 空配列を明示的に設定
          archiveFiles = [];
        }
      } catch (s3Error) {
        // S3エラー時は空配列を返す（グレースフル処理）
        console.error('S3 file listing failed:', s3Error);
      }

      return {
        success: true,
        data: {
          projectId,
          projectName,
          files,
          archiveFiles,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 承認依頼
   * 
   * Task: 3.1-3.3 プロジェクト存在確認、ステータス検証、トランザクション管理、ステータス更新
   * Requirements: 3, 4, 5, 6, 7, 9, 10, 11
   * 
   * @param projectId - プロジェクトID
   * @param comment - コメント（オプション）
   * @param organizationId - 組織ID
   * @param userId - ユーザーID
   * @returns 承認依頼結果
   */
  async requestApproval(
    projectId: string,
    comment: string | null,
    organizationId: string,
    userId: string
  ): Promise<ServiceResult<any>> {
    const pgp = getPgp();
    
    // リポジトリ層のインポート
    const projectRepository = require('../repositories/projectRepository');

    // Task 5.2.4: ログ記録開始（機密情報フィルタリング）
    winston.info('Approval request initiated', {
      projectId,
      organizationId,
      userId,
      comment: sanitizeForLog(comment || ''),
      timestamp: new Date().toISOString(),
    });

    try {
      // Task 3.1: プロジェクト存在確認とステータス検証（トランザクション外）
      // リポジトリ層を使用してプロジェクト情報を取得
      const project = await projectRepository.findByIdWithOrganization(organizationId, projectId);

      // プロジェクト存在確認
      if (!project) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      // プロジェクトステータス検証: waiting_task (1) のみ許可
      if (project.project_status !== 1) {
        // ステータス名のマッピング
        const statusNames: { [key: number]: string } = {
          0: 'プロジェクト計画中',
          1: 'タスク実行待ち',
          2: 'タスク実行中',
          3: 'タスク結果レビュー待ち',
          4: 'プロジェクト完了',
          5: 'タスク異常終了',
        };
        const currentStatusName = statusNames[project.project_status] || '不明';
        
        // waiting_approval の場合は特別なメッセージ
        const message =
          project.project_status === 2
            ? '既に承認依頼が送信されています'
            : `プロジェクトステータスがタスク実行待ちではありません。現在のステータス: ${currentStatusName}`;

        return {
          success: false,
          error: {
            code: 'BUSINESS_STATUS_INVALID',
            message,
            details: {
              currentStatus: project.project_status,
              currentStatusName,
              requiredStatus: 1,
              requiredStatusName: 'タスク実行待ち',
            },
          },
        };
      }

      // Task 3.2: トランザクション管理とステータス更新（pg-promiseのtx使用）
      const currentTimestamp = new Date().toISOString();
      
      await pgp.tx(async () => {
        // プロジェクトステータス更新（リポジトリ層使用）
        const rowCount = await projectRepository.updateApprovalStatus(
          organizationId,
          projectId,
          2, // waiting_approval
          currentTimestamp,
          userId
        );
        
        if (rowCount === 0) {
          throw new Error('Failed to update project status');
        }
      });

      // commentをエスケープしてXSS攻撃を防ぐ（通知削除後も保持）
      const escapedComment = escapeHtml(comment);

      // Task 5.2.4: 承認依頼成功ログ
      winston.info('Approval request completed successfully', {
        projectId,
        projectName: project.project_name,
        organizationId,
        userId,
        previousStatus: 'active',
        newStatus: 'waiting_approval',
        timestamp: currentTimestamp,
      });

      // Task 3.4.1: ユーザー名を取得（トランザクション後、リポジトリ層使用）
      let requestedByName = userId; // デフォルトはuserIdをフォールバック
      
      try {
        const userName = await projectRepository.findUserNameById(organizationId, userId);
        
        if (userName) {
          requestedByName = userName;
        }
      } catch (userError) {
        // ユーザー名取得失敗時はフォールバック値を使用（ログのみ）
        console.warn('Failed to retrieve user name, using userId as fallback:', userError);
      }

      return {
        success: true,
        data: {
          project_id: projectId,
          project_name: project.project_name,
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: userId,
          requested_by_name: requestedByName,
          requested_at: currentTimestamp,
          comment: escapedComment,  // エスケープ済みコメント（nullの場合はnull）
        },
      };
    } catch (error) {
      // Task 5.2.4: エラーログ記録（機密情報フィルタリング）
      winston.error('Approval request failed', {
        projectId,
        organizationId,
        userId,
        error: sanitizeErrorForLog(error as Error),
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * プロジェクトに紐づくタスク一覧と統計情報を取得
   * 
   * Task 3.1: タスク一覧取得API - Service層実装
   * Requirements: 6, 7, 8, 11
   * 
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param status - タスクステータスフィルタ
   * @returns タスク一覧と統計情報
   */
  async getProjectTasks(
    organizationId: string,
    projectId: string,
    status: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed'
  ): Promise<ServiceResult<{
    projectId: string;
    projectName: string;
    tasks: any[];
    statistics: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      failed: number;
    };
  }>> {
    try {
      // Repository層経由でプロジェクト情報を取得
      const project = await projectRepository.findProjectBasicInfo(organizationId, projectId);

      if (!project) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const projectName = project.project_name;

      // Repository層経由でタスク一覧を取得
      const tasksResult = await projectRepository.findProjectTasks(
        organizationId,
        projectId,
        status
      );

      // タスクステータスマップ（数値 → 文字列）
      const TASK_STATUS_MAP: { [key: number]: string } = {
        0: 'pending',
        1: 'in_progress',
        2: 'failed',
        3: 'completed',
      };

      // タスクデータをフロントエンドの型に合わせて変換
      const tasks = tasksResult.map((row: any) => {
        const taskStatus = TASK_STATUS_MAP[row.task_status] || 'pending';
        const taskId = `${row.method_id}_${row.task_no}`;
        
        return {
          // フロントエンドの必須プロパティ
          taskId,
          workerId: row.experiment_user_id || '',
          workerName: row.experiment_user_name || '',
          transitionId: `${row.method_id}_${row.task_no}`,
          transitionName: `Task ${row.task_no}`,
          workStatus: taskStatus as any,
          assignedAt: row.experiment_start_at
            ? new Date(row.experiment_start_at).toISOString()
            : new Date().toISOString(),
          startedAt: row.experiment_start_at
            ? new Date(row.experiment_start_at).toISOString()
            : null,
          completedAt: row.experiment_end_at
            ? new Date(row.experiment_end_at).toISOString()
            : null,
          progress: taskStatus === 'completed' ? 100 : taskStatus === 'in_progress' ? 50 : 0,
          
          // TaskResultsTable用の追加プロパティ
          workId: taskId,
          taskName: `Task ${row.task_no}`,
          methodName: row.method_id,
          assignedWorker: row.experiment_user_name || '',
          progressPercentage: taskStatus === 'completed' ? 100 : taskStatus === 'in_progress' ? 50 : 0,
          workCompletedAt: row.experiment_end_at
            ? new Date(row.experiment_end_at).toISOString()
            : null,
          reviewCompletedAt: row.reviewed_at
            ? new Date(row.reviewed_at).toISOString()
            : null,
          
          // バックエンド固有のプロパティ（デバッグ用）
          organizationId: row.organization_id,
          projectId: row.project_id,
          methodId: row.method_id,
          taskNo: row.task_no,
          taskStatus: taskStatus,
          experimentUserId: row.experiment_user_id,
          reviewUserId: row.review_user_id,
          reviewUserName: row.review_user_name || null,
        };
      });

      // Repository層経由で統計情報を取得
      const statsResult = await projectRepository.countProjectTasksByStatus(
        organizationId,
        projectId
      );

      // 統計情報を集計
      const statistics = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
      };

      statsResult.forEach((row: any) => {
        const count = parseInt(row.count, 10);
        statistics.total += count;

        switch (row.task_status) {
          case 0:
            statistics.pending = count;
            break;
          case 1:
            statistics.inProgress = count;
            break;
          case 2:
            statistics.failed = count;
            break;
          case 3:
            statistics.completed = count;
            break;
        }
      });

      return {
        success: true,
        data: {
          projectId,
          projectName,
          tasks,
          statistics,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 作業指示一覧を取得
   * 
   * Task 2.1: Worker Instructions API - Service層実装
   * @param params - 取得パラメータ
   * @returns 作業指示一覧
   */
  async getWorkerInstructions(params: {
    projectName: string;
    organizationId: string;
    userId: string;
    userRole: string;
    filters?: {
      projectId?: string;
    };
  }): Promise<ServiceResult<any[]>> {
    const pgp = getPgp();
    const { loadSqlFile } = require('../sql/loader');
    
    try {
      const { projectName, organizationId, userId, userRole, filters = {} } = params;
      
      // 外部SQLファイルからベースクエリを読み込み
      let query = await loadSqlFile('instructions/findWorkerInstructions.sql');
      
      const queryParams: any[] = [userId]; // $1: acknowledged_user_id (LEFT JOIN用)
      const conditions: string[] = [];
      let paramIndex = 2; // userIdが$1なので、$2から開始
      
      // 実験作業者の場合は、自分に割り当てられたタスクに紐づく指示のみ取得
      if (userRole === 'experiment_worker') {
        // FROM句とWHERE句の間にINNER JOINを挿入
        query = query.trim(); // 末尾の改行を削除
        query += `\nINNER JOIN project_task pt ON pt.project_id = pi.project_id`;
        
        conditions.push(`pt.assign_user_id = $${paramIndex++}`);
        queryParams.push(userId);
        conditions.push(`pt.organization_id = $${paramIndex++}`);
        queryParams.push(organizationId);
      }
      
      // 必須フィルタ: organization_id（マルチテナント分離）
      conditions.push(`p.organization_id = $${paramIndex++}`);
      queryParams.push(organizationId);
      conditions.push(`pi.organization_id = $${paramIndex++}`);
      queryParams.push(organizationId);
      
      // 必須フィルタ: project_name
      conditions.push(`p.project_name = $${paramIndex++}`);
      queryParams.push(projectName);
      
      // オプショナルフィルタの適用
      if (filters.projectId) {
        conditions.push(`pi.project_id = $${paramIndex++}`);
        queryParams.push(filters.projectId);
      }
      
      // WHERE句の追加
      if (conditions.length > 0) {
        query += `\nWHERE ${conditions.join(' AND ')}`;
      }
      
      // ソート: create_atで降順
      query += `\nORDER BY pi.create_at DESC`;
      
      // pg-promiseを使用してクエリ実行
      const result = await pgp.any(query, queryParams);
      
      // TODO: タスク2.2実装時にMAIMLファイルからメソッド名・トランジション名を取得
      // 暫定対応: method_name, transition_nameは空文字列を返却
      const instructions = result.map((row: any) => ({
        id: row.id,
        project_id: row.project_id,
        project_name: row.project_name,
        method_id: row.method_id,
        method_name: '', // TODO: タスク2.2で実装
        transition_id: row.transition_id,
        transition_name: '', // TODO: タスク2.2で実装
        task_no: row.task_no,
        instruction_target: row.instruction_target,
        instruction_content: row.instruction_content,
        priority: row.priority,
        type: row.type,
        create_at: row.create_at.toISOString(),
        created_by: row.created_by,
        created_by_name: row.created_by_name || '',
        is_acknowledged: row.is_acknowledged,
      }));
      
      return {
        success: true,
        data: instructions,
      };
    } catch (error) {
      console.error('Error in getWorkerInstructions:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * プロジェクトMAIMLファイル取得
   * 
   * Task 3.1 (P): Service層実装（projectName版）
   * Requirements: 1, 3, 4, 6, 7
   * 
   * @param organizationId - 組織ID
   * @param projectName - プロジェクト名
   * @returns MAIMLファイルデータ
   */
  async getProjectMaiml(
    organizationId: string,
    projectName: string
  ): Promise<ServiceResult<any>> {
    let projectId: string | undefined; // スコープを拡大
    
    try {
      console.log('[DEBUG] getProjectMaiml - Service層開始', { organizationId, projectName });
      
      // Repository層を使用してprojectNameからprojectIdを取得
      const project = await projectRepository.findProjectIdByName(organizationId, projectName);
      
      // プロジェクト存在確認
      if (!project) {
        console.log('[DEBUG] getProjectMaiml - プロジェクトが見つかりません', { projectName });
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }
      
      projectId = project.project_id;
      console.log('[DEBUG] getProjectMaiml - プロジェクトID取得完了', { projectId, projectName });
      
      // Task 3.1: S3パスを構築
      const filePath = `projects/${projectName}/${projectName}.maiml`;
      console.log('[DEBUG] getProjectMaiml - S3パス構築完了', { filePath });
      
      // Task 3.1: storageService経由でファイル存在確認
      const storageService = getStorageService();
      const exists = await storageService.fileExists(organizationId, filePath);
      
      // ファイルが存在しない場合は空のcontentで成功レスポンスを返す（新規プロジェクト等）
      if (!exists) {
        console.log('[DEBUG] getProjectMaiml - ファイル不在、空のcontentを返却', { filePath });
        winston.info('MAIML file not found (new project), returning empty content', {
          projectId,
          projectName,
          organizationId,
          filePath,
          timestamp: new Date().toISOString(),
        });
        
        return {
          success: true,
          data: {
            maimlContent: '', // 空のcontentを返す
          },
        };
      }
      
      // Task 3.1: ファイルが存在する場合はS3から取得
      try {
        console.log('[DEBUG] getProjectMaiml - S3からファイル取得開始');
        
        const fileBuffer = await storageService.downloadFile(organizationId, filePath);
        console.log('[DEBUG] getProjectMaiml - S3からファイル取得完了', { size: fileBuffer.length });
        
        // Task 3.1: BufferをUTF-8文字列に変換
        const content = fileBuffer.toString('utf-8');
        
        // Task 3.1: レスポンスデータ構築（フロントエンドのProjectMaimlResponse型に合わせる）
        const maimlFileData = {
          maimlContent: content, // フロントエンドが期待するプロパティ名
        };
        
        // Task 3.1: 成功ログ記録
        winston.info('MAIML file retrieved successfully', {
          projectId,
          projectName,
          organizationId,
          fileSize: fileBuffer.length,
          filePath,
          timestamp: new Date().toISOString(),
        });
        
        console.log('[DEBUG] getProjectMaiml - 成功レスポンス返却');
        return {
          success: true,
          data: maimlFileData,
        };
      } catch (s3Error: any) {
        // Task 3.1: S3ファイル不在時の処理
        // ファイルが見つからない場合の判定を拡張（NotFound, NoSuchKey, 404ステータス, エラーメッセージに"not found"を含む）
        const isNotFound = 
          s3Error.name === 'NotFound' ||
          s3Error.name === 'NoSuchKey' ||
          s3Error.code === 'NoSuchKey' ||
          s3Error.$metadata?.httpStatusCode === 404 ||
          (s3Error.message && s3Error.message.toLowerCase().includes('not found')) ||
          (s3Error.message && s3Error.message.toLowerCase().includes('does not exist'));
        
        if (isNotFound) {
          winston.warn('MAIML file not found in S3', {
            projectId,
            projectName,
            organizationId,
            filePath,
            errorType: s3Error.name || s3Error.code || 'Unknown',
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'MAIMLファイルが見つかりません',
            },
          };
        }
        
        // Task 3.1: その他のS3エラー
        winston.error('S3 error during MAIML file retrieval', {
          projectId,
          projectName,
          organizationId,
          error: sanitizeErrorForLog(s3Error),
          timestamp: new Date().toISOString(),
        });
        
        return {
          success: false,
          error: {
            code: 'SYSTEM_S3_ERROR',
            message: 'ファイル取得に失敗しました',
            originalError: s3Error,
          },
        };
      }
    } catch (error) {
      // Task 3.1: データベースエラー
      winston.error('Database error during MAIML file retrieval', {
        projectId,
        organizationId,
        error: sanitizeErrorForLog(error as Error),
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 指示確認を記録する
   * 
   * @description instructionConfirmationService.tsから移植
   * Task: 2.1, 2.2 Service層実装
   * @param instructionId - 指示ID
   * @param projectName - プロジェクト名
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @param role - ユーザーロール
   * @returns 確認結果
   */
  async confirmInstruction(
    instructionId: string,
    projectName: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<ServiceResult<InstructionConfirmationData>> {
    // リポジトリ層のインポート
    const instructionRepository = require('../repositories/instructionRepository');
    const projectRepository = require('../repositories/projectRepository');

    try {
      // 0. projectNameからprojectIdを取得
      const project = await projectRepository.findProjectIdByName(organizationId, projectName);
      
      if (!project) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }
      
      const projectId = project.project_id;

      // 1. 指示の存在確認（organization_idフィルタ付き）
      const instruction = await instructionRepository.findById(instructionId, projectId, organizationId);

      if (!instruction) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指示が見つかりません',
          },
        };
      }

      // 2. 既確認チェック
      const acknowledgedHistory = await instructionRepository.checkAcknowledged(
        instructionId,
        projectId,
        organizationId
      );

      if (acknowledgedHistory) {
        return {
          success: false,
          error: {
            code: 'BUSINESS_ALREADY_ACKNOWLEDGED',
            message: 'この指示は既に確認済みです',
          },
        };
      }

      // 3. 権限チェック（experiment_workerの場合は自分のタスクか確認）
      if (role === 'experiment_worker') {
        const taskAssignments = await instructionRepository.checkWorkerAssignment(
          instructionId,
          projectId,
          userId,
          organizationId
        );

        if (taskAssignments.length === 0) {
          return {
            success: false,
            error: {
              code: 'PERMISSION_INSUFFICIENT',
              message: '自分に割り当てられていない指示は確認できません',
            },
          };
        }
      }

      // 4. 確認履歴の挿入
      const insertedHistory = await instructionRepository.insertAcknowledged(
        instructionId,
        projectId,
        userId,
        organizationId
      );

      const acknowledgedAt = insertedHistory.acknowledged_at.toISOString();

      // 5. ユーザー名の取得
      const userName = await instructionRepository.findUserNameFromAuth(userId, organizationId);

      // 6. レスポンスデータの整形
      const responseData: InstructionConfirmationData = {
        instruction_id: instructionId,
        is_acknowledged: true,
        acknowledged_at: acknowledgedAt,
        acknowledged_user_id: userId,
        acknowledged_user_name: userName || '',
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      const { logError } = require('../utils/logger');
      logError('Instruction confirmation error', error as Error, {
        instructionId,
        userId,
        organizationId,
      });

      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };
    }
  }
}
  