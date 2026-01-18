/**
 * ProjectService
 * 
 * @description プロジェクト一覧取得のビジネスロジック
 * Task: 1.1 データベースクエリ機能の実装
 */

import { getPool } from '../database/db';

interface Project {
  organizationId: string;
  projectId: string;
  projectName: string;
  description: string | null;
  departmentId: string | null;
  ownerUserId: string;
  projectStatus: number;
  projectStatusName?: string;
  projectMaimlFlg: boolean;
  checkoutStatus: number;
  checkoutStatusName?: string;
  createAt: string;
  taskCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ListOptions {
  page: number;
  limit: number;
  includeCompleted: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface ListResult {
  projects: Project[];
  pagination: Pagination;
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

      // Task 3.5: organization_prefix取得
      const orgQuery = `
        SELECT organization_name
        FROM organization
        WHERE organization_id = $1
      `;
      const orgResult = await client.query(orgQuery, [organizationId]);
      
      if (orgResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '組織情報が見つかりません',
          },
        };
      }

      const organizationPrefix = orgResult.rows[0].organization_name.replace(/\s+/g, '_');

      // Task 3.4: プロジェクトレコード登録
      const { v4: uuidv4 } = require('uuid');
      const projectId = uuidv4();
      const createAt = new Date().toISOString();

      const insertQuery = `
        INSERT INTO project (
          organization_id,
          project_id,
          project_name,
          description,
          department_id,
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
          organizationPrefix,
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

      // Task 3.7: ステータス名取得
      const statusQuery = `
        SELECT code_value, code_name
        FROM code_master
        WHERE code_class IN ('project_status', 'checkout_status')
      `;
      const statusResult = await client.query(statusQuery);

      const projectStatusName = statusResult.rows.find(
        (row: any) => row.code_class === 'project_status' && row.code_value === 0
      )?.code_name || '';
      
      const checkoutStatusName = statusResult.rows.find(
        (row: any) => row.code_class === 'checkout_status' && row.code_value === 0
      )?.code_name || '';

      // トランザクションコミット
      await client.query('COMMIT');

      // レスポンスデータ構築（キャメルケース変換）
      const projectData: Project = {
        organizationId: insertResult.rows[0].organization_id,
        projectId: insertResult.rows[0].project_id,
        projectName: insertResult.rows[0].project_name,
        description: insertResult.rows[0].description,
        departmentId: insertResult.rows[0].department_id,
        ownerUserId: insertResult.rows[0].owner_user_id,
        projectStatus: insertResult.rows[0].project_status,
        projectStatusName,
        projectMaimlFlg: insertResult.rows[0].project_maiml_flg,
        checkoutStatus: insertResult.rows[0].checkout_status,
        checkoutStatusName,
        createAt: new Date(insertResult.rows[0].create_at).toISOString(),
        taskCount: 0,
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
  ): Promise<ServiceResult<ListResult>> {
    try {
      const { page, limit, includeCompleted, sortBy = 'create_at', order = 'desc' } = options;
      const offset = (page - 1) * limit;

      // プロジェクト一覧取得クエリ
      const projectQuery = `
        SELECT 
          p.organization_id,
          p.project_id,
          p.project_name,
          p.description,
          p.department_id,
          p.owner_user_id,
          p.project_status,
          p.project_maiml_flg,
          p.checkout_status,
          p.create_at,
          COUNT(DISTINCT CASE 
            WHEN ptd.method_id IS NOT NULL AND ptd.task_no IS NOT NULL 
            THEN ptd.method_id || '_' || ptd.task_no::TEXT 
            ELSE NULL 
          END) as task_count
        FROM project p
        LEFT JOIN project_task_detail ptd
          ON ptd.project_id = p.project_id
          AND ptd.organization_id = p.organization_id
        WHERE p.organization_id = $1
          AND ($2::boolean IS NULL OR 
               ($2 = true OR p.project_status != 4))
        GROUP BY 
          p.organization_id,
          p.project_id,
          p.project_name,
          p.description,
          p.department_id,
          p.owner_user_id,
          p.project_status,
          p.project_maiml_flg,
          p.checkout_status,
          p.create_at
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

      // データを変換（スネークケース→キャメルケース）
      const formattedProjects: Project[] = projects.map((row: any) => ({
        organizationId: row.organization_id,
        projectId: row.project_id,
        projectName: row.project_name,
        description: row.description,
        departmentId: row.department_id,
        ownerUserId: row.owner_user_id,
        projectStatus: row.project_status,
        projectMaimlFlg: row.project_maiml_flg,
        checkoutStatus: row.checkout_status,
        createAt: row.create_at.toISOString(),
        taskCount: parseInt(row.task_count, 10)
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
   * プロジェクト詳細を取得
   * 
   * Task 1.1, 1.2, 1.3: プロジェクト詳細取得API実装
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param organizationPrefix - 組織プレフィックス
   * @returns プロジェクト詳細情報
   */
  async getById(
    organizationId: string,
    projectId: string,
    organizationPrefix: string
  ): Promise<ServiceResult<any>> {
    try {
      const pool = getPool();

      // Task 1.1: プロジェクト基本情報取得
      const projectQuery = `
        SELECT 
          p.organization_id,
          p.project_id,
          p.project_name,
          p.description,
          p.department_id,
          p.owner_user_id,
          ou.user_name as owner_user_name,
          p.project_status,
          ps.code_name as project_status_name,
          p.checkout_status,
          cs.code_name as checkout_status_name,
          p.project_maiml_flg,
          p.create_at
        FROM project p
        LEFT JOIN organization_user ou 
          ON ou.user_id = p.owner_user_id 
          AND ou.organization_id = p.organization_id
        LEFT JOIN code_master ps 
          ON ps.code_class = 'project_status' 
          AND ps.code_value = p.project_status
        LEFT JOIN code_master cs 
          ON cs.code_class = 'checkout_status' 
          AND cs.code_value = p.checkout_status
        WHERE p.organization_id = $1 AND p.project_id = $2
      `;

      const projectResult = await pool.query(projectQuery, [organizationId, projectId]);

      if (projectResult.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const projectRow = projectResult.rows[0];
      const projectName = projectRow.project_name;

      // Task 1.2: S3ファイル一覧取得（グレースフル処理）
      let files: any[] = [];
      try {
        const { getStorageService } = require('./storageService');
        const storageService = getStorageService();

        const [currentFiles, archiveFiles] = await Promise.all([
          storageService.listFiles(organizationPrefix, `projects/${projectName}/`).catch(() => []),
          storageService.listFiles(organizationPrefix, `projects/${projectName}/archive/`).catch(() => [])
        ]);

        const allFiles = [...currentFiles, ...archiveFiles];

        files = await Promise.all(
          allFiles.map(async (file: any) => {
            const signedUrl = await storageService.getSignedUrl(
              organizationPrefix,
              file.key.replace(`org_${organizationPrefix}/`, ''),
              3600
            );

            const versionMatch = file.key.match(/_v(\d+)\.maiml$/);
            const version = versionMatch ? parseInt(versionMatch[1], 10) : null;

            return {
              key: file.key,
              size: file.size,
              lastModified: file.lastModified.toISOString(),
              signedUrl,
              version,
            };
          })
        );
      } catch (s3Error) {
        console.error('S3 file listing failed:', s3Error);
        // S3エラーは無視してfilesは空配列のまま
      }

      // Task 1.3: タスク存在チェック
      const taskExistsQuery = `
        SELECT EXISTS(
          SELECT 1 
          FROM project_task_detail 
          WHERE organization_id = $1 AND project_id = $2
        ) as has_tasks
      `;

      const taskExistsResult = await pool.query(taskExistsQuery, [organizationId, projectId]);
      const hasTasks = taskExistsResult.rows[0].has_tasks;

      // Task 1.4: タスク詳細一覧取得（has_tasks=trueの場合のみ）
      let tasks: any[] = [];
      if (hasTasks) {
        const tasksQuery = `
          SELECT 
            ptd.organization_id,
            ptd.project_id,
            ptd.method_id,
            ptd.task_no,
            ptd.task_status,
            ts.code_name as task_status_name,
            ptd.experiment_start_at,
            ptd.experiment_end_at,
            ptd.experiment_user_id,
            eu.user_name as experiment_user_name,
            ptd.reviewed_at,
            ptd.review_user_id,
            ru.user_name as review_user_name
          FROM project_task_detail ptd
          LEFT JOIN organization_user eu 
            ON eu.user_id = ptd.experiment_user_id 
            AND eu.organization_id = ptd.organization_id
          LEFT JOIN organization_user ru 
            ON ru.user_id = ptd.review_user_id 
            AND ru.organization_id = ptd.organization_id
          LEFT JOIN code_master ts 
            ON ts.code_class = 'task_status' 
            AND ts.code_value = ptd.task_status
          WHERE ptd.organization_id = $1 AND ptd.project_id = $2
          ORDER BY ptd.method_id, ptd.task_no
        `;

        const tasksResult = await pool.query(tasksQuery, [organizationId, projectId]);

        tasks = tasksResult.rows.map((row: any) => ({
          organizationId: row.organization_id,
          projectId: row.project_id,
          methodId: row.method_id,
          taskNo: row.task_no,
          taskStatus: row.task_status,
          taskStatusName: row.task_status_name,
          experimentStartAt: row.experiment_start_at ? new Date(row.experiment_start_at).toISOString() : null,
          experimentEndAt: row.experiment_end_at ? new Date(row.experiment_end_at).toISOString() : null,
          experimentUserId: row.experiment_user_id,
          experimentUserName: row.experiment_user_name,
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
          reviewUserId: row.review_user_id,
          reviewUserName: row.review_user_name,
        }));
      }

      // レスポンスデータ構築（キャメルケース変換）
      const projectData = {
        organizationId: projectRow.organization_id,
        projectId: projectRow.project_id,
        projectName: projectRow.project_name,
        description: projectRow.description,
        departmentId: projectRow.department_id,
        ownerUserId: projectRow.owner_user_id,
        ownerUserName: projectRow.owner_user_name,
        projectStatus: projectRow.project_status,
        projectStatusName: projectRow.project_status_name,
        checkoutStatus: projectRow.checkout_status,
        checkoutStatusName: projectRow.checkout_status_name,
        projectMaimlFlg: projectRow.project_maiml_flg,
        createAt: new Date(projectRow.create_at).toISOString(),
      };

      // Task 1.5: サマリー情報生成
      const summary = {
        totalFiles: files.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.taskStatus === 3).length,
        inProgressTasks: tasks.filter((t: any) => t.taskStatus === 1).length,
        pendingTasks: tasks.filter((t: any) => t.taskStatus === 0).length,
      };

      return {
        success: true,
        data: {
          project: projectData,
          files,
          tasks,
          summary,
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
    projectId: string,
    userId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    const pool = getPool();
    let client;

    try {
      // トランザクション開始
      client = await pool.connect();
      await client.query('BEGIN');

      // SELECT ... FOR UPDATEで排他ロック取得
      const selectQuery = `
        SELECT 
          project_id,
          project_name,
          project_status,
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

      // 前提条件チェック: project_status != 0
      if (project.project_status === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'PROJECT_STATUS_INVALID',
            message: 'プロジェクトが計画中のため、チェックアウトできません',
          },
        };
      }

      // 前提条件チェック: project_instructionレコード存在確認
      const instructionQuery = `
        SELECT EXISTS(
          SELECT 1 
          FROM project_instruction 
          WHERE organization_id = $1 AND project_id = $2
        ) as has_instruction
      `;

      const instructionResult = await client.query(instructionQuery, [organizationId, projectId]);

      if (!instructionResult.rows[0].has_instruction) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'PROJECT_INSTRUCTION_NOT_FOUND',
            message: 'プロジェクト指示が登録されていません',
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
   * @param projectId - プロジェクトID
   * @param userId - ユーザーID
   * @returns チェックイン結果
   */
  async checkin(
    organizationId: string,
    projectId: string,
    _userId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    const pool = getPool();
    let client;

    try {
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

      // 前提条件チェック: task_status = 1のタスク存在確認
      const taskQuery = `
        SELECT COUNT(*) as count
        FROM project_task_detail
        WHERE organization_id = $1 AND project_id = $2 AND task_status = 1
      `;

      const taskResult = await client.query(taskQuery, [organizationId, projectId]);
      const runningTasksCount = parseInt(taskResult.rows[0].count, 10);

      if (runningTasksCount > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'TASK_IN_PROGRESS',
            message: '実行中のタスクが存在するため、チェックインできません',
            details: {
              runningTasksCount,
            },
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
}
