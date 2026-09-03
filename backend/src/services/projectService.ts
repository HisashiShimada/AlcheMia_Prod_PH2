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
import * as organizationGroupRepository from '../repositories/organizationGroupRepository';
import * as projectTaskRepository from '../repositories/projectTaskRepository';
import * as projectTaskDetailRepository from '../repositories/projectTaskDetailRepository';
import { ProjectStatusEnum, CheckoutStatusEnum, TaskStatusEnum } from '../enums/codeMaster.enum';
import { TransitionStatusEnum } from '../types/transitionData';
import * as projectInstructionRepository from '../repositories/projectInstructionRepository';
import * as experimentPlanRepository from '../repositories/experimentPlanRepository';
import * as codeMasterRepository from '../repositories/codeMasterRepository';
import * as instructionRepository from '../repositories/instructionRepository';
import { EventLogRepository } from '../repositories/eventLogRepository';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { MaimlWriterService } from './maimlWriterService';
import { loadSqlFile } from '../sql/loader';
import { logError } from '../utils/logger';
import { XMLParser } from 'fast-xml-parser';
import type {
  Project,
  Pagination,
  ProjectListResponse,
  ListOptions,
  ServiceResult,
  ProjectCheckoutInfo,
  InstructionConfirmationData,
} from '../types/project';
import type { ProjectFileResponse, GetProjectFilesData, StorageFileEntry } from '../types/file';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

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
   * @param organizationGroupId - 組織グループID
   * @param data - プロジェクトデータ
   * @returns 作成されたプロジェクト情報
   */
  async create(
    organizationId: string,
    userId: string,
    organizationGroupId: string | null,
    data: { projectName: string; description?: string }
  ): Promise<ServiceResult<Project>> {
    const pool = getPool();
    let client;

    try {
      // Task 3.2: トランザクション開始
      client = await pool.connect();
      await client.query('BEGIN');

      // Task 3.3: 重複チェック（Repository層経由）
      const isDuplicate = await projectRepository.existsByName(
        organizationId,
        data.projectName,
        client
      );

      if (isDuplicate) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'BUSINESS_DUPLICATE_PROJECT_NAME',
            message: 'プロジェクト名が既に存在します',
          },
        };
      }

      // Task 3.4: プロジェクトレコード登録（Repository層経由）
      // project_id 形式: 'project_' (8文字) + nanoid(12) = 20文字固定
      const projectId = `project_${nanoid(12)}`;
      const createAt = new Date().toISOString();

      // project_uuid はプロジェクト作成時に uuidv4() で採番し、以降は変更しない
      const projectUuid = uuidv4();

      const insertResult = await projectRepository.insert({
        organization_id: organizationId,
        project_id: projectId,
        project_name: data.projectName,
        description: data.description || undefined,
        organization_group_cd: organizationGroupId ?? undefined,
        owner_user_id: userId,
        project_status: 0, // プロジェクト計画中
        checkout_status: 0, // チェックイン中
        project_maiml_flg: false,
        project_uuid: projectUuid,
        create_at: createAt as any,
        create_user_id: userId,
        update_user_id: userId,
        update_at: createAt as any,
      });

      // Task 3.6: S3フォルダ作成
      const storageService = getStorageService();
      const s3Path = `projects/${data.projectName}/.keep`;

      try {
        await storageService.uploadFile(organizationId, s3Path, '', { contentType: 'text/plain' });
      } catch (s3Error) {
        const errMsg = s3Error instanceof Error ? s3Error.message : String(s3Error);
        const errStack = s3Error instanceof Error ? s3Error.stack : undefined;
        console.error('[ProjectService.create] S3フォルダ作成エラー', {
          organizationId,
          s3Path,
          bucket: process.env.AWS_S3_BUCKET || process.env.SWIFT_CONTAINER || '(未設定)',
          region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '(未設定)',
          errorMessage: errMsg,
          errorStack: errStack,
        });
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
      // insert() は Project オブジェクトを直接返す（.rows[0] は不要）
      const projectData: Project = {
        id: insertResult.project_id ?? projectId,
        name: insertResult.project_name ?? data.projectName,
        folderName: insertResult.project_name ?? data.projectName,
        description: insertResult.description || '',
        status: insertResult.project_status ?? 0, // 数値のまま返す
        fileCount: 0,
        owner: insertResult.owner_user_id ?? '',
        ownerName: undefined,
        ownerEmail: undefined,
        organizationGroup: (insertResult as any).organization_group_cd || '',
        isCheckedOut: insertResult.checkout_status === CheckoutStatusEnum.CHECKED_OUT,
        checkedOutBy:
          insertResult.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? insertResult.owner_user_id ?? null : null,
        checkedOutAt: insertResult.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? new Date().toISOString() : null,
        createdAt: new Date(insertResult.create_at as any).toISOString(),
        updatedAt: new Date(insertResult.create_at as any).toISOString(),
      };

      return {
        success: true,
        data: projectData,
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      // ログ出力（今後の調査を容易にする）
      logError('Project create error', error as Error, {
        action: 'project_create',
        organizationId,
        projectName: data.projectName,
      });
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
   * プロジェクト削除
   *
   * Task: プロジェクト管理画面削除機能実装 - Phase 3-2
   * @description プロジェクトを削除する（DB + ストレージ）
   * @note project_maiml_flg=falseの場合のみ削除可能
   *
   * @param organizationId - 組織ID
   * @param projectName - プロジェクト名
   * @returns 削除結果
   */
  async deleteProject(
    organizationId: string,
    projectId: string
  ): Promise<ServiceResult<{ deletedCount: number; message: string }>> {
    const pool = getPool();
    let client;

    try {
      // 1. トランザクション開始（projectId を直接使用）
      client = await pool.connect();
      await client.query('BEGIN');

      // 3. 削除条件チェック: project_maiml_flg = false のみ削除可能（Repository層使用）
      const projectInfo = await projectRepository.findProjectForDelete(
        organizationId,
        projectId,
        client
      );

      if (!projectInfo) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      // project_maiml_flg = true の場合は削除不可
      if (projectInfo.project_maiml_flg === true) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'BUSINESS_MAIML_FILE_EXISTS',
            message: 'MAIMLファイルが存在するため削除できません',
            details: {
              projectId,
              projectName: projectInfo.project_name,
              maimlFileExists: true,
            },
          },
        };
      }

      // 4. 関連テーブルのデータを削除（Repository層使用）
      console.log('🗑️ [ProjectService.deleteProject] 関連テーブル削除開始');
      await projectRepository.deleteProjectRelatedData(organizationId, projectId, client);

      // 5. プロジェクトを削除（Repository層使用）
      await projectRepository.deleteProject(organizationId, projectId, client);

      console.log('✅ [ProjectService.deleteProject] DB削除完了');

      // 6. コミット
      await client.query('COMMIT');

      // 6. ストレージからプロジェクトフォルダを削除（トランザクション外）
      const deletedProjectName = projectInfo.project_name;
      let deletedFileCount = 0;
      try {
        // FileAccessServiceを使用してフォルダ削除
        const { FileAccessService } = await import('./fileAccessService');
        const fileAccessService = new FileAccessService();
        const folderPath = `projects/${deletedProjectName}`;

        deletedFileCount = await fileAccessService.deleteFolderRecursive(
          organizationId,
          folderPath
        );

        console.log(
          `✅ [ProjectService.deleteProject] ストレージ削除完了: ${deletedFileCount}ファイル`
        );
      } catch (storageError) {
        // ストレージエラーは警告のみ（DB削除は成功しているため）
        console.warn(
          '⚠️ [ProjectService.deleteProject] ストレージ削除エラー（続行）:',
          storageError
        );
      }

      return {
        success: true,
        data: {
          deletedCount: deletedFileCount,
          message: `Project "${deletedProjectName}" has been deleted`,
        },
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }

      console.error('❌ [ProjectService.deleteProject] エラー:', error);

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
   *
   * @remarks
   * - SystemAdmin（roleCd === 'ROLE002'）は全プロジェクトを閲覧・編集可能
   * - それ以外のユーザーは、自分が直接所属するグループとその配下グループのプロジェクトのみ閲覧可能
   * - 直接所属グループのプロジェクトのみ編集可能（is_editable = true）
   * - 将来的にSystemAdminの判定基準を変更する場合は roleCd === 'ROLE002' の条件を見直すこと
   */
  async list(
    organizationId: string,
    options: ListOptions
  ): Promise<ServiceResult<ProjectListResponse>> {
    try {
      const {
        includeCompleted,
        sortBy = 'create_at',
        order = 'desc',
        organizationGroupCds = [],
        roleCd,
        userId,
      } = options;

      // SystemAdmin（ROLE002）は全件・全編集可能（フィルタなし）
      const isSystemAdmin = roleCd === 'ROLE002';

      let visibleGroupCds: string[] | null = null;
      let editableGroupCds: string[] | null = null;

      if (!isSystemAdmin) {
        // 全グループ情報を取得してメモリ内で解決（findDescendantCds の前提）
        const allGroups = await organizationGroupRepository.findAll(organizationId);
        const allGroupMap = new Map(allGroups.map((g) => [g.organization_group_cd, g]));

        // 非アクティブグループ一覧
        const inactiveGroups = allGroups.filter((g) => !g.is_active);

        // あるグループCDが、他の所属グループの子孫かどうかを判定する関数
        const isDescendantOfAny = (cd: string, candidates: string[]): boolean => {
          let current = allGroupMap.get(cd);
          while (current?.parent_group_cd) {
            if (candidates.includes(current.parent_group_cd)) return true;
            current = allGroupMap.get(current.parent_group_cd);
          }
          return false;
        };

        /**
         * 非アクティブグループの祖先チェーンを辿り、有効（is_active=true）な祖先グループCDを
         * ルートまで全て返す（祖先が非アクティブの場合もさらに遡る）。
         * ルートが非アクティブ（parent_group_cd=null かつ is_active=false）の場合は空配列を返す。
         */
        const findActiveAncestorCds = (groupCd: string): string[] => {
          const activeCds: string[] = [];
          let current = allGroupMap.get(groupCd);
          // 最大深さを制限（循環参照防止）
          let depth = 0;
          const maxDepth = 50;
          while (current?.parent_group_cd && depth < maxDepth) {
            const parent = allGroupMap.get(current.parent_group_cd);
            if (!parent) break;
            if (parent.is_active) {
              activeCds.push(parent.organization_group_cd);
            }
            current = parent;
            depth++;
          }
          return activeCds;
        };

        // 直接所属グループが空の場合でも、非アクティブグループ経由で閲覧可能になる可能性があるため
        // 先に非アクティブグループの可視性・編集可能性を評価する

        // ─────────────────────────────────────────────────
        // 非アクティブグループへの閲覧権限・編集権限の追加判定
        // ─────────────────────────────────────────────────
        const inactiveVisibleCds: string[] = [];
        const inactiveEditableCds: string[] = [];

        for (const inactiveGroup of inactiveGroups) {
          // ルートチーム（parent_group_cd=null）が非アクティブ → SystemAdmin のみアクセス可能（スキップ）
          if (!inactiveGroup.parent_group_cd) {
            continue;
          }

          // 有効な祖先グループCD一覧を取得
          const activeAncestorCds = findActiveAncestorCds(inactiveGroup.organization_group_cd);

          // 閲覧権限: ログインユーザーが有効な祖先グループのいずれかに所属している場合
          const isVisible = activeAncestorCds.some((cd) => organizationGroupCds.includes(cd));
          if (isVisible) {
            inactiveVisibleCds.push(inactiveGroup.organization_group_cd);
          }

          // 編集権限: ログインユーザーが有効な祖先グループのいずれかの代表者（chief_user_id）である場合
          if (userId) {
            const isChiefOfAncestor = activeAncestorCds.some((cd) => {
              const ancestorGroup = allGroupMap.get(cd);
              return ancestorGroup?.chief_user_id === userId;
            });
            if (isChiefOfAncestor) {
              inactiveEditableCds.push(inactiveGroup.organization_group_cd);
            }
          }
        }

        // 直接所属グループが空の場合: 非アクティブグループ経由の閲覧のみ（アクティブグループ配下は0件）
        if (organizationGroupCds.length === 0) {
          if (inactiveVisibleCds.length === 0) {
            // 閲覧可能グループなし → 0件を返す
            return {
              success: true,
              data: {
                projects: [],
                pagination: { page: 1, limit: 0, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false },
              },
            };
          }
          visibleGroupCds = inactiveVisibleCds;
          editableGroupCds = inactiveEditableCds;
        } else {
          // 直接所属グループのうち最上位ルート群を算出（他の所属グループの子孫を除外）
          // 例: [A, A-1] が所属グループの場合、A-1 は A の子孫なので A のみをルートとする
          const rootCds = organizationGroupCds.filter(
            (cd) => !isDescendantOfAny(cd, organizationGroupCds)
          );

          // ルート群の配下（自身含む・is_active 無関係）を再帰取得 → 閲覧可能グループ（アクティブ分）
          const activeDescendantCds = await organizationGroupRepository.findDescendantCds(organizationId, rootCds);

          // 非アクティブグループも含めて閲覧可能グループを構築（重複除去）
          visibleGroupCds = Array.from(new Set([...activeDescendantCds, ...inactiveVisibleCds]));

          // 直接所属グループのうち is_active=true のもの ＋ 非アクティブグループ（祖先代表者として）= 編集可能グループ
          // ※ 非アクティブグループに直接所属しているだけでは編集権限は付与されない
          const activeOrganizationGroupCds = organizationGroupCds.filter(
            (cd) => allGroupMap.get(cd)?.is_active === true
          );
          editableGroupCds = Array.from(new Set([...activeOrganizationGroupCds, ...inactiveEditableCds]));
        }
      }

      // Repository層経由でプロジェクト一覧・総件数を並列取得
      const [projects, totalItems] = await Promise.all([
        projectRepository.findAllWithDetails(organizationId, includeCompleted, sortBy, order, visibleGroupCds, editableGroupCds),
        projectRepository.countAll(organizationId, includeCompleted, visibleGroupCds),
      ]);

      // データを変換（フロントエンドの型に合わせる）
      const formattedProjects: Project[] = projects.map((row: any) => ({
        id: row.project_id,
        name: row.project_name,
        folderName: row.project_name,
        description: row.description || '',
        status: row.project_status, // 数値のまま返す
        statusName: row.project_status_name || undefined, // code_masterから取得した日本語名
        fileCount: parseInt(row.file_count, 10) || 0,
        owner: row.owner_user_id,
        ownerName: row.owner_user_name || undefined,
        ownerEmail: row.owner_email || undefined,
        organizationGroup: row.organization_group_cd || '',
        organizationGroupName: row.organization_group_name || undefined,
        isCheckedOut: row.checkout_status === CheckoutStatusEnum.CHECKED_OUT,
        checkedOutBy: row.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? row.checkout_user_id : null,
        checkedOutAt: row.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? new Date().toISOString() : null,
        createdAt: row.create_at ? row.create_at.toISOString() : '',
        updatedAt: row.update_at ? row.update_at.toISOString() : '',
        totalTasks: parseInt(row.task_count, 10),
        completedTasks: parseInt(row.completed_task_count, 10),
        maimlFileKey: row.maiml_file_key || null,
        project_uuid: row.project_uuid || null,
        isEditable: isSystemAdmin ? true : (row.is_editable === true),
      }));

      // ページネーション情報を構築（後方互換のため残す）
      const pagination: Pagination = {
        page: 1,
        limit: totalItems,
        totalItems,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      };

      return {
        success: true,
        data: {
          projects: formattedProjects,
          pagination,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database query failed',
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

      // SELECT ... FOR UPDATEで排他ロック取得（Repository層経由）
      const project = await projectRepository.findForUpdate(client, organizationId, projectId);

      // プロジェクト存在確認
      if (!project) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

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

      // バリデーション2: プロジェクトステータスチェック（計画中=0、承認待ち=3、異常終了=5、レビュー差戻=6 のいずれかを許可）
      const allowedStatuses = [
        ProjectStatusEnum.PLANNING,
        ProjectStatusEnum.REVIEW_WAITING,
        ProjectStatusEnum.ERROR,
        ProjectStatusEnum.REVIEW_REJECTED,
      ];
      if (!allowedStatuses.includes((project.project_status ?? -1) as typeof ProjectStatusEnum.PLANNING)) {
        await client.query('ROLLBACK');
        // code_master から現在ステータスの日本語名称を取得（code_remark に日本語値を保存）
        const statusMaster = await codeMasterRepository.findByValue(
          organizationId,
          'project_status',
          String(project.project_status ?? -1)
        );
        const currentStatusName = statusMaster?.code_remark || statusMaster?.code_name || '不明';

        return {
          success: false,
          error: {
            code: 'CHECKOUT_INVALID_STATUS',
            message: `プロジェクトステータスが計画中、承認待ち、異常終了、レビュー差戻のいずれかではありません（現在: ${currentStatusName}）`,
            details: {
              projectId,
              projectName: project.project_name,
              currentStatus: project.project_status,
              currentStatusName,
              allowedStatuses: [
                ProjectStatusEnum.PLANNING,
                ProjectStatusEnum.REVIEW_WAITING,
                ProjectStatusEnum.ERROR,
                ProjectStatusEnum.REVIEW_REJECTED,
              ],
              allowedStatusNames: [
                'プロジェクト計画中',
                'タスク結果レビュー待ち',
                'タスク異常終了',
                'レビュー差戻',
              ],
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

      // チェックアウト状態確認
      if (project.checkout_status === CheckoutStatusEnum.CHECKED_OUT) {
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

          // チェックアウト保持者のユーザー名を取得（Repository層経由）
          const checkedOutUserName = await projectRepository.findCheckedOutUserName(
            client,
            organizationId,
            project.owner_user_id
          );
          const checkedOutByName = checkedOutUserName || project.owner_user_id;

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

      // チェックアウト実行: project_statusはタスク状況に応じて決定（Repository層経由）
      // - pending(0)タスクが存在する場合 → TASK_PENDING(1)
      // - NGタスクのみ・pendingタスクなし → REVIEW_REJECTED(6)
      const taskStatusCounts = await projectTaskDetailRepository.countByStatusInTransaction(
        client,
        organizationId,
        projectId
      );
      const taskStatusMap = new Map<number, number>(
        taskStatusCounts.map((row) => [row.task_status, row.count])
      );
      const pendingTaskCount = taskStatusMap.get(TaskStatusEnum.PENDING) ?? 0;
      const targetProjectStatus = pendingTaskCount > 0
        ? ProjectStatusEnum.TASK_PENDING
        : ProjectStatusEnum.REVIEW_REJECTED;

      await projectRepository.updateCheckoutStatus(client, organizationId, projectId, userId, targetProjectStatus);

      // project_taskのworker_linked_flgをtrueに更新
      const updatedTaskCount = await projectTaskRepository.updateWorkerLinkedFlgByProject(
        client,
        organizationId,
        projectId,
        true,
        userId
      );

      console.log(`[DEBUG] checkout - Updated worker_linked_flg for ${updatedTaskCount} tasks`);

      // transition_data: prerequisite_transition_ids = '{}' のトランジションを「2: 準備状態」に更新
      // prerequisite_transition_ids が設定されているトランジションは「1: 初期状態」のまま据え置く
      const transitionDataRepository = new TransitionDataRepository();
      await transitionDataRepository.updateStatusForCheckout(client, organizationId, projectId, userId);

      console.log(`[DEBUG] checkout - Updated transition_data status to PREPARING for prerequisite-less transitions`);

      // チェックアウト時イベントログ記録（COMMIT前・トランザクション内）
      // updateStatusForCheckout で PREPARING になったトランジションに対して Alchemia:lifecycleTransition を記録する
      try {
        const preparedTransitions = await transitionDataRepository.findPreparedForCheckout(
          client,
          organizationId,
          projectId
        );
        const eventLogRepository = new EventLogRepository();
        for (const preparedTransition of preparedTransitions) {
          await eventLogRepository.insertTransitionProgressLog(
            organizationId,
            projectId,
            preparedTransition.transition_id,
            userId,
            'preparing',
            0,
            null,
            client,
            preparedTransition.method_id,
            null,
            null,
            null,
            TransitionStatusEnum.INITIAL,   // fromStatus = 1(INITIAL): チェックアウト時は常に INITIAL → PREPARING
            TransitionStatusEnum.PREPARING  // toStatus   = 2(PREPARING)
          );
        }
        console.log(`[DEBUG] checkout - Inserted transition progress logs for ${preparedTransitions.length} transitions`);
      } catch (logError) {
        // イベントログ記録失敗はコンソール警告に留め、チェックアウト処理は続行する
        console.warn('[checkout] insertTransitionProgressLog failed (checkout continues):', logError);
      }

      // トランザクションコミット
      await client.query('COMMIT');

      // ★ MAIMLファイルへのイベントログ書き出し（COMMIT後・non-fatal）
      // <data> セクションは変更せず、<eventLog> セクションのみ更新する
      try {
        const maimlWriterService = new MaimlWriterService();
        await maimlWriterService.writeEventLogOnly(
          organizationId,
          projectId,
          project.project_name
        );
        console.log(`[checkout] MAIML eventLog write completed: projectId=${projectId}`);
      } catch (writeError) {
        // MAIML write failure does not block checkout success (warning log only)
        console.warn('[checkout] MAIML eventLog write failed (checkout succeeded):', writeError);
      }

      // ★ 実験計画データを MAIML の mgr-instruction: プロパティとして書き込み（non-fatal）
      try {
        const experimentPlans = await experimentPlanRepository.findByProject(
          organizationId,
          projectId
        );

        if (experimentPlans.length > 0) {
          const maimlWriterService = new MaimlWriterService();
          await maimlWriterService.writeExperimentPlanProperties(
            organizationId,
            projectId,
            project.project_name,
            experimentPlans
          );
          console.log(
            `[checkout] Experiment plan MAIML write completed: ${experimentPlans.length} records`
          );
        } else {
          console.log('[checkout] No experiment plans found, skipping MAIML write');
        }
      } catch (planWriteError) {
        // 実験計画書き込みエラーはチェックアウト処理をブロックしない
        console.warn(
          '[checkout] Experiment plan MAIML write failed (checkout succeeded):',
          planWriteError
        );
      }

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
    projectId: string,
    _userId: string
  ): Promise<ServiceResult<ProjectCheckoutInfo>> {
    const pool = getPool();
    let client;

    try {
      // トランザクション開始（projectId を直接使用）
      client = await pool.connect();
      await client.query('BEGIN');

      // SELECT ... FOR UPDATEで排他ロック取得（Repository層経由）
      const project = await projectRepository.findForUpdate(client, organizationId, projectId);

      // プロジェクト存在確認
      if (!project) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      // 前提条件チェック: task_status が 3 (completed) または 4 (error) 以外のタスク存在確認（Repository層経由）
      const hasIncomplete = await projectTaskRepository.hasIncompleteTasks(
        organizationId,
        projectId
      );

      if (hasIncomplete) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: {
            code: 'TASK_NOT_COMPLETED',
            message: 'チェックイン可能なタスクステータスではありません',
            details: {
              requiredStatus: 'すべてのタスクが完了(3)または異常終了(4)である必要があります',
              note: '未着手(0)、実行中(1)、レビュー待ち(2)のタスクが存在します',
            },
          },
        };
      }

      // チェックイン状態確認
      if (project.checkout_status === CheckoutStatusEnum.CHECKED_IN) {
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

      // チェックイン実行: checkout_status = 0に更新（Repository層経由）
      await projectRepository.updateCheckinStatus(client, organizationId, projectId);

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
      // プロジェクト情報取得（Repository層経由: owner_user_name を JOIN して取得）
      const project = await projectRepository.findWithOwner(organizationId, projectId);

      // プロジェクト存在確認
      if (!project) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      // レスポンスデータ構築
      const checkoutInfo: ProjectCheckoutInfo = {
        projectId: project.project_id,
        projectName: project.project_name,
        isCheckedOut: project.checkout_status === CheckoutStatusEnum.CHECKED_OUT,
        checkedOutBy: project.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? project.owner_user_id : null,
        checkedOutAt: project.checkout_status === CheckoutStatusEnum.CHECKED_OUT ? new Date().toISOString() : null,
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
  ): Promise<ServiceResult<GetProjectFilesData>> {
    try {
      // Repository層経由でプロジェクト情報を取得
      const project = await projectRepository.findProjectBasicInfo(organizationId, projectId);

      if (!project) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const projectName = project.project_name;

      // S3からファイル一覧を取得（グレースフル処理）
      let files: ProjectFileResponse[] = [];
      const subFolderFiles: Record<string, ProjectFileResponse[]> = {};

      try {
        const storageService = getStorageService();
        const chunkSize = 20;

        // プロジェクト配下の全ファイルを再帰的に取得
        const allFiles = await storageService
          .listFiles(organizationId, `projects/${projectName}/`)
          .catch(() => []);

        // .keepファイルを除外
        const validFiles = (allFiles as StorageFileEntry[]).filter((file) => {
          const fileName = file.key.split('/').pop() || '';
          return fileName !== '' && fileName !== '.keep';
        });

        // プロジェクトプレフィックスを除去して相対パスで分類
        // file.key 例: "{orgId}/projects/{projectName}/rawdata/measurement.csv"
        // projectPrefix = "{orgId}/projects/{projectName}/"
        const projectPrefix = `${organizationId}/projects/${projectName}/`;

        // ルート直下ファイル / サブフォルダ別ファイルに分類
        const rootOnlyFiles: StorageFileEntry[] = []; // ルート直下ファイル
        const subFolderMap: Record<string, StorageFileEntry[]> = {}; // サブフォルダ名 → ファイル一覧

        for (const file of validFiles) {
          // projectPrefix を除去してプロジェクト相対パスを取得
          const relativePath = file.key.startsWith(projectPrefix)
            ? file.key.substring(projectPrefix.length)
            : file.key;

          // 相対パスのセグメントを分割
          const segments = relativePath.split('/').filter(s => s !== '');

          if (segments.length === 1) {
            // ルート直下ファイル
            rootOnlyFiles.push(file);
          } else if (segments.length >= 2) {
            // サブフォルダ配下のファイル（1階層目のフォルダ名をキーとして分類）
            const topFolder = segments[0];
            if (!subFolderMap[topFolder]) {
              subFolderMap[topFolder] = [];
            }
            subFolderMap[topFolder].push(file);
            console.log(segments[0]);
            console.log(segments);
          }
        }

        // ルート直下ファイルに署名付きURLを生成
        const startTime = Date.now();
        files = [];

        for (let i = 0; i < rootOnlyFiles.length; i += chunkSize) {
          const chunk = rootOnlyFiles.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            chunk.map(async (file: StorageFileEntry) => {
              const signedUrl = await storageService.getSignedUrl(
                organizationId,
                file.key.replace(`${organizationId}/`, ''),
                3600
              );

              const fileName = file.key.split('/').pop() || '';
              const fileType = fileName.split('.').pop() || '';

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
              } satisfies ProjectFileResponse;
            })
          );
          files.push(...chunkResults);
        }

        const endTime = Date.now();
        console.log(
          `[Performance] ルートファイル署名付きURL生成完了: ${rootOnlyFiles.length}ファイル、処理時間: ${endTime - startTime}ms`
        );

        // サブフォルダ配下のファイルに署名付きURLを生成
        for (const [folderName, folderFiles] of Object.entries(subFolderMap)) {
          const isArchiveFolder = folderName === 'archive';
          subFolderFiles[folderName] = [];

          const folderStartTime = Date.now();

          for (let i = 0; i < folderFiles.length; i += chunkSize) {
            const chunk = folderFiles.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(
              chunk.map(async (file: StorageFileEntry) => {
                const signedUrl = await storageService.getSignedUrl(
                  organizationId,
                  file.key.replace(`${organizationId}/`, ''),
                  3600
                );

                const fileName = file.key.split('/').pop() || '';
                const fileType = fileName.split('.').pop() || '';

                // バージョン番号を抽出（archive配下の _v{number}.maiml パターン）
                const versionMatch = isArchiveFolder ? fileName.match(/_v(\d+)\.maiml$/) : null;
                const version = versionMatch ? parseInt(versionMatch[1], 10) : null;

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
                  isArchive: isArchiveFolder,
                  version,
                  signedUrl,
                  createdAt: file.lastModified.toISOString(),
                } satisfies ProjectFileResponse;
              })
            );
            subFolderFiles[folderName].push(...chunkResults);
          }

          console.log(
            `[Performance] サブフォルダ「${folderName}」署名付きURL生成完了: ${folderFiles.length}ファイル、処理時間: ${Date.now() - folderStartTime}ms`
          );
        }

        // ルート直下にサブフォルダエントリ（isFolder:true）を追加
        // ファイルが存在するサブフォルダのみエントリを作成
        for (const folderName of Object.keys(subFolderMap)) {
          const folderEntry = {
            id: `folder_${folderName}`,
            name: folderName,
            path: `projects/${projectName}/${folderName}`,
            size: 0,
            lastModified: '',
            type: 'folder',
            isFolder: true,
            isArchive: folderName === 'archive',
            version: null,
            signedUrl: null,
            createdAt: '',
            fileCount: subFolderMap[folderName].length,
          };
          files.push(folderEntry);
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
          subFolderFiles,
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
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      // プロジェクトステータス検証: task_in_progress (2) のみ許可
      if (project.project_status !== ProjectStatusEnum.TASK_IN_PROGRESS) {
      // ステータス名のマッピング
        const statusNames: { [key: number]: string } = {
          0: 'Planning',
          1: 'Task Pending',
          2: 'Task In Progress',
          3: 'Task Review Waiting',
          4: 'Project Completed',
          5: 'Task Error',
        };
        const currentStatusName = statusNames[project.project_status] || 'Unknown';

        // waiting_approval (3) の場合は特別なメッセージ
        const message =
          project.project_status === ProjectStatusEnum.REVIEW_WAITING
            ? 'Approval request has already been sent'
            : `Project status is not in progress. Current status: ${currentStatusName}`;

        return {
          success: false,
          error: {
            code: 'BUSINESS_STATUS_INVALID',
            message,
            details: {
              currentStatus: project.project_status,
              currentStatusName,
              requiredStatus: 2,
              requiredStatusName: 'タスク実行中',
            },
          },
        };
      }

      // Task 3.2: トランザクション管理とステータス更新（pg-promiseのtx使用）
      const currentTimestamp = new Date().toISOString();

      await pgp.tx(async (t: any) => {
        // プロジェクトステータス更新（リポジトリ層使用）
        const rowCount = await projectRepository.updateApprovalStatus(
          organizationId,
          projectId,
          3, // waiting_approval（タスク結果レビュー待ち）
          currentTimestamp,
          userId
        );

        if (rowCount === 0) {
          throw new Error('Failed to update project status');
        }

        // タスクステータス一括更新: IN_PROGRESS(1) → REVIEW_WAITING(2)
        // 承認依頼時にプロジェクト内の実行中タスクをレビュー待ちに変更する
        await projectTaskRepository.bulkUpdateTaskStatusByProject(
          t,
          organizationId,
          projectId,
          TaskStatusEnum.IN_PROGRESS, // fromStatus: 1（実行中）
          TaskStatusEnum.REVIEW_WAITING, // toStatus: 2（レビュー待ち）
          userId
        );

        winston.info('requestApproval - task_status updated IN_PROGRESS -> REVIEW_WAITING', {
          organizationId,
          projectId,
          userId,
        });
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
          comment: escapedComment, // エスケープ済みコメント（nullの場合はnull）
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
  ): Promise<
    ServiceResult<{
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
    }>
  > {
    try {
      // Repository層経由でプロジェクト情報を取得
      const project = await projectRepository.findProjectBasicInfo(organizationId, projectId);

      if (!project) {
        return {
          success: false,
          error: {
            code: 'E6001',
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
        2: 'review_waiting',
        3: 'completed',
        4: 'forced_terminated',
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
          completedAt: row.experiment_end_at ? new Date(row.experiment_end_at).toISOString() : null,
          progress: taskStatus === 'completed' ? 100 : taskStatus === 'in_progress' ? 50 : 0,

          // TaskResultsTable用の追加プロパティ
          workId: taskId,
          taskName: `Task ${row.task_no}`,
          methodName: row.method_id,
          assignedWorker: row.experiment_user_name || '',
          progressPercentage:
            taskStatus === 'completed' ? 100 : taskStatus === 'in_progress' ? 50 : 0,
          workCompletedAt: row.experiment_end_at
            ? new Date(row.experiment_end_at).toISOString()
            : null,
          reviewCompletedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,

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
            // review_waiting（レビュー待ち）
            break;
          case 3:
            statistics.completed = count;
            break;
          case 4:
            statistics.failed = count; // forced_terminated（強制終了）
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
    projectId: string;
    organizationId: string;
    userId: string;
    userRole: string;
    filters?: Record<string, never>;
  }): Promise<ServiceResult<any[]>> {
    const pgp = getPgp();

    try {
      const { projectId, organizationId, userId, userRole } = params;

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

      // 必須フィルタ: project_id
      conditions.push(`p.project_id = $${paramIndex++}`);
      queryParams.push(projectId);

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
        instruction_content: row.instruction_content,
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
  async getProjectMaiml(organizationId: string, projectId: string): Promise<ServiceResult<any>> {
    try {
      console.log('[DEBUG] getProjectMaiml - Service層開始', { organizationId, projectId });

      // ① project テーブルから project_name と project_uuid を取得
      const projectInfo = await projectRepository.findNameAndUuidById(organizationId, projectId);

      if (!projectInfo) {
        console.log('[DEBUG] getProjectMaiml - プロジェクトが見つかりません', { projectId });
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'プロジェクトが見つかりません',
          },
        };
      }

      const { project_name: projectName, project_uuid: projectUuid } = projectInfo;
      console.log('[DEBUG] getProjectMaiml - プロジェクト取得完了', {
        projectId,
        projectName,
        projectUuid: projectUuid ?? '(未設定)',
      });

      const storageService = getStorageService();
      const fileMetadataRepository = new FileMetadataRepository();

      // ② project_uuid が設定済みの場合: file_metadata 経由で file_key を取得
      if (projectUuid) {
        const maimlRecord = await fileMetadataRepository.findMaimlByProjectUuid(projectUuid);

        if (maimlRecord) {
          // file_key は "{organizationId}/projects/..." の形式 → storageService に渡す相対パスに変換
          const relativeFileKey = maimlRecord.file_key.startsWith(`${organizationId}/`)
            ? maimlRecord.file_key.substring(organizationId.length + 1)
            : maimlRecord.file_key;

          console.log('[DEBUG] getProjectMaiml - UUID経由でfile_key取得', {
            file_key: maimlRecord.file_key,
            relativeFileKey,
          });

          try {
            const fileBuffer = await storageService.downloadFile(organizationId, relativeFileKey);
            const content = fileBuffer.toString('utf-8');

            winston.info('MAIML file retrieved via project_uuid', {
              projectId,
              projectName,
              organizationId,
              fileSize: fileBuffer.length,
              filePath: relativeFileKey,
              timestamp: new Date().toISOString(),
            });

            return {
              success: true,
              data: { maimlContent: content },
            };
          } catch (s3Error: any) {
            // file_key が S3 に存在しない場合は旧方式にフォールバック
            console.warn('[DEBUG] getProjectMaiml - UUID経由のS3取得失敗、旧方式にフォールバック', {
              relativeFileKey,
              error: s3Error?.message,
            });
          }
        }
      }

      // ③ project_uuid 未設定（または file_metadata に該当なし）: 旧方式でダウンロード
      const filePath = `projects/${projectName}/${projectName}.maiml`;
      console.log('[DEBUG] getProjectMaiml - 旧方式S3パス構築', { filePath });

      const exists = await storageService.fileExists(organizationId, filePath);

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
          data: { maimlContent: '' },
        };
      }

      try {
        console.log('[DEBUG] getProjectMaiml - 旧方式S3からファイル取得開始');

        const fileBuffer = await storageService.downloadFile(organizationId, filePath);
        const content = fileBuffer.toString('utf-8');

        winston.info('MAIML file retrieved successfully (legacy path)', {
          projectId,
          projectName,
          organizationId,
          fileSize: fileBuffer.length,
          filePath,
          timestamp: new Date().toISOString(),
        });

        // ④ レイジーセット: XMLから <maiml id="..."> の id 属性を取得して DB に保存
        setImmediate(async () => {
          try {
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
            const parsed = parser.parse(content);
            // <maiml id="uuid-..."> の id 属性が project_uuid に対応する
            const documentUuid: string | null = parsed?.maiml?.['@_id'] ?? null;

            if (!documentUuid) {
              console.log('[DEBUG] getProjectMaiml - <maiml id> 未検出、レイジーセットスキップ');
              return;
            }

            console.log('[DEBUG] getProjectMaiml - レイジーセット開始', { documentUuid });

            // file_metadata.project_uuid をセット
            const fullFileKey = `${organizationId}/${filePath}`;
            try {
              await fileMetadataRepository.updateFileMetadata(fullFileKey, {
                project_uuid: documentUuid,
              });
              console.log('[DEBUG] getProjectMaiml - file_metadata.project_uuid セット完了', {
                fullFileKey,
                documentUuid,
              });
            } catch (fmError) {
              console.warn('[DEBUG] getProjectMaiml - file_metadata 更新失敗（続行）', fmError);
            }

            // project.project_uuid をセット（既存の update() を使用）
            try {
              await projectRepository.update({
                organization_id: organizationId,
                project_id: projectId,
                project_uuid: documentUuid,
              } as any);
              console.log('[DEBUG] getProjectMaiml - project.project_uuid セット完了', {
                projectId,
                documentUuid,
              });
            } catch (pjError) {
              console.warn('[DEBUG] getProjectMaiml - project 更新失敗（続行）', pjError);
            }
          } catch (lazyError) {
            console.warn('[DEBUG] getProjectMaiml - レイジーセット失敗（続行）', lazyError);
          }
        });

        console.log('[DEBUG] getProjectMaiml - 成功レスポンス返却（旧方式）');
        return {
          success: true,
          data: { maimlContent: content },
        };
      } catch (s3Error: any) {
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
   * maiml_event_log へのINSERTをトランザクション内で追加（2026-03-03）
   *
   * @param instructionId - 指示ID
   * @param projectName - プロジェクト名
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @param role - ユーザーロール
   * @returns 確認結果
   */
  async confirmInstruction(
    instructionId: string,
    projectId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<ServiceResult<InstructionConfirmationData>> {
    const pool = getPool();
    let client;

    try {
      // 1. 指示の存在確認（organization_idフィルタ付き）
      const instruction = await instructionRepository.findById(
        instructionId,
        projectId,
        organizationId
      );

      if (!instruction) {
        return {
          success: false,
          error: {
            code: 'E6001',
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
              code: 'E5015',
              message: '自分に割り当てられていない指示は確認できません',
            },
          };
        }
      }

      // 4. MAIMLファイルを解析して programId を取得
      //    トランジション（target=3）・タスク（target=2）の場合、
      //    <program id="..."> の id を trace @ref に使用する。
      let programId: string | null = null;
      const hasMethod = !!(instruction.method_id);
      const hasTransition = !!(instruction.transition_id);
      const hasTask = !!(instruction.task_no);

      if (hasMethod && (hasTransition || hasTask)) {
        try {
          // MAIMLファイル取得: project_uuid → file_metadata 経由で最新 file_key を取得
          const projectInfoForMaiml = await projectRepository.findNameAndUuidById(organizationId, projectId);
          const projectUuidForMaiml = projectInfoForMaiml?.project_uuid ?? null;

          if (!projectUuidForMaiml) {
            throw new Error('project_uuid が設定されていません');
          }

          const fileMetadataRepository = new FileMetadataRepository();
          const maimlRecord = await fileMetadataRepository.findMaimlByProjectUuid(projectUuidForMaiml);

          if (!maimlRecord) {
            throw new Error('MAIMLファイルのメタデータが見つかりません');
          }

          const relativeFileKey = maimlRecord.file_key.startsWith(`${organizationId}/`)
            ? maimlRecord.file_key.substring(organizationId.length + 1)
            : maimlRecord.file_key;

          const storageService = getStorageService();
          const fileBuffer = await storageService.downloadFile(organizationId, relativeFileKey);
          const maimlContent = fileBuffer.toString('utf-8');

          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
          });
          const parsed = parser.parse(maimlContent);

          // protocol.method は単一要素の場合もあるため配列に統一
          const methods = parsed?.maiml?.protocol?.method;
          const methodsArray = Array.isArray(methods) ? methods : methods ? [methods] : [];

          // method_id が一致するメソッドの program id を取得
          const targetMethod = methodsArray.find((m: any) => m['@_id'] === instruction.method_id);
          programId = targetMethod?.program?.['@_id'] ?? null;
        } catch (maimlError) {
          // MAIMLファイル取得・パース失敗時は null のまま続行（ログのみ）
          logError('Failed to parse MAIML for programId', maimlError as Error, {
            projectId,
            organizationId,
            methodId: instruction.method_id,
          });
        }
      }

      // 5. トランザクション開始
      //    - instruction_acknowledged_history に確認履歴を挿入
      //    - maiml_event_log にイベントログを挿入
      //    の2つを同一トランザクションで実行する
      client = await pool.connect();
      await client.query('BEGIN');

      // 5-1. 確認履歴の挿入（PoolClient版）
      const insertedHistory = await instructionRepository.insertAcknowledgedWithClient(
        instructionId,
        projectId,
        userId,
        organizationId,
        client
      );

      const acknowledgedAt = insertedHistory.acknowledged_at.toISOString();

      // 5-2. maiml_event_log にイベントログを挿入
      const eventLogRepository = new EventLogRepository();
      await eventLogRepository.insertInstructionConfirmLog(
        organizationId,
        projectId,
        {
          methodId: instruction.method_id ?? null,
          transitionId: instruction.transition_id ?? null,
          programId,
          taskNo: instruction.task_no ?? null,
          experimentInstructionId: instructionId,
          userId,
          acknowledgedAt,
        },
        client
      );

      // トランザクションコミット
      await client.query('COMMIT');

      // 5. ユーザー名の取得（トランザクション外）
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
      // エラー時はROLLBACK
      if (client) {
        await client.query('ROLLBACK');
      }

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
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * レビュー待ちタスクを一括完了に更新
   *
   * @param organizationId 組織ID
   * @param projectName プロジェクト名
   * @returns 更新件数
   */
  async completeReviewTasks(
    organizationId: string,
    projectId: string
  ): Promise<{
    success: boolean;
    data?: { updatedCount: number; message: string };
    error?: { code: string; message: string };
  }> {
    try {
      // projectId を直接使用
      const projectInfo = await projectRepository.findProjectBasicInfo(organizationId, projectId);
      if (!projectInfo) {
        return {
          success: false,
          error: { code: 'E6001', message: 'プロジェクトが見つかりません' },
        };
      }

      const updatedCount = await projectRepository.completeReviewTasks(
        organizationId,
        projectId
      );

      // MAIMLファイルへの data 層・eventLog 層書き出し
      try {
        const maimlWriterService = new MaimlWriterService();
        await maimlWriterService.writeDataAndEventLog(
          organizationId,
          projectId,
          projectInfo.project_name
        );
      } catch (maimlWriteError) {
        console.error(
          '[ProjectService.completeReviewTasks] MAIMLファイルへの書き出しに失敗しました（処理は継続）:',
          maimlWriteError
        );
      }

      return {
        success: true,
        data: {
          updatedCount,
          message: `${updatedCount} review-waiting tasks have been completed`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };
    }
  }

  /**
   * プロジェクト強制終了
   *
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @returns ServiceResult
   */
  async forceTerminate(
    organizationId: string,
    projectId: string
  ): Promise<ServiceResult<{ projectId: string }>> {
    const pool = getPool();
    try {
      const sql = await loadSqlFile('project/forceTerminate.sql');
      const result = await pool.query(sql, [ProjectStatusEnum.ERROR, organizationId, projectId]);

      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'Project not found',
          },
        };
      }

      return {
        success: true,
        data: { projectId },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'E4002',
          message: 'Database error occurred',
        },
      };
    }
  }
}
