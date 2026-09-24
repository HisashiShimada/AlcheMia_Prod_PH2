/**
 * 実験作業者用プロジェクトサービス
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクト一覧を取得するサービス。
 * ロールベースアクセス制御とマルチテナント分離を実装。
 * 
 * @module services/workerProjectService
 */

import { logger } from '../utils/logger';
import * as workerProjectRepository from '../repositories/workerProjectRepository';
import * as organizationGroupRepository from '../repositories/organizationGroupRepository';
import type {
  WorkerProjectService as IWorkerProjectService,
  ListWorkerProjectsParams,
  WorkerProjectListResult,
  WorkerAccessibleProject,
  WorkerProjectPagination,
} from '../types/workerProject';
import { toJSTIsoString } from '../utils/dateUtils';

/**
 * データベースエラークラス
 */
class DatabaseError extends Error {
  originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * 実験作業者用プロジェクトサービス実装
 * 
 * @implements {IWorkerProjectService}
 */
export class WorkerProjectService implements IWorkerProjectService {
  /**
   * 実験作業者がアクセス可能なプロジェクト一覧を取得
   * 
   * ログインユーザーの所属グループ（organization_group_cd）に基づいてプロジェクトを絞り込む。
   * グループ階層を考慮し、所属グループの配下グループに属するプロジェクトも取得対象とする。
   * 非アクティブグループのプロジェクトは、有効な祖先グループへの所属に基づいて救済ロジックを適用する。
   * 
   * @param {string} userId - ユーザーID
   * @param {string} organizationId - 組織ID
   * @param {string[]} organizationGroupCds - ログインユーザーの直接所属グループCDs（JWTから取得）
   * @param {ListWorkerProjectsParams} params - 取得パラメータ
   * @returns {Promise<WorkerProjectListResult>} プロジェクト一覧とページネーション情報
   */
  async listWorkerAccessible(
    userId: string,
    organizationId: string,
    params: ListWorkerProjectsParams
  ): Promise<WorkerProjectListResult> {
    try {
      // ページネーション計算
      const offset = (params.page - 1) * params.limit;

      // ─────────────────────────────────────────────────
      // グループ絞り込みロジック（projectService.ts の list() と同様のアルゴリズム）
      // ─────────────────────────────────────────────────
      let visibleGroupCds: string[] | undefined = undefined;

      // JWT の organizationGroupCds は古い可能性があるため、DB から最新の所属グループCDを取得する
      // （グループ作成直後など JWT 更新前の操作でも正しい権限で動作させるため）
      const latestGroupRows = await organizationGroupRepository.findByUser(organizationId, userId);
      const organizationGroupCds = latestGroupRows.map((g) => g.organization_group_cd);

      // 全グループ情報を取得してメモリ内で解決
      const allGroups = await organizationGroupRepository.findAll(organizationId);
      const allGroupMap = new Map(allGroups.map((g) => [g.organization_group_cd, g]));

      // 非アクティブグループ一覧
      const inactiveGroups = allGroups.filter((g) => !g.is_active);

      // あるグループCDが、他の所属グループの子孫かどうかを判定するヘルパー関数
      const isDescendantOfAny = (cd: string, candidates: string[]): boolean => {
        let current = allGroupMap.get(cd);
        while (current?.parent_group_cd) {
          if (candidates.includes(current.parent_group_cd)) return true;
          current = allGroupMap.get(current.parent_group_cd);
        }
        return false;
      };

      // 非アクティブグループの祖先チェーンを辿り、有効な祖先グループCDを全て返すヘルパー関数
      const findActiveAncestorCds = (groupCd: string): string[] => {
        const activeCds: string[] = [];
        let current = allGroupMap.get(groupCd);
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

      // 非アクティブグループの救済ロジック
      const inactiveVisibleCds: string[] = [];
      for (const inactiveGroup of inactiveGroups) {
        // ルートチーム（parent_group_cd=null）が非アクティブ → スキップ
        if (!inactiveGroup.parent_group_cd) {
          continue;
        }
        const activeAncestorCds = findActiveAncestorCds(inactiveGroup.organization_group_cd);
        const isVisible = activeAncestorCds.some((cd) => organizationGroupCds.includes(cd));
        if (isVisible) {
          inactiveVisibleCds.push(inactiveGroup.organization_group_cd);
        }
      }

      // 直接所属グループが空の場合: 非アクティブグループ経由の閲覧のみ
      if (organizationGroupCds.length === 0) {
        if (inactiveVisibleCds.length === 0) {
          // 閲覧可能グループなし → 0件を即返却
          const emptyPagination: WorkerProjectPagination = {
            page: params.page,
            limit: params.limit,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          };
          return { items: [], pagination: emptyPagination };
        }
        visibleGroupCds = inactiveVisibleCds;
      } else {
        // 直接所属グループのうち最上位ルート群を算出（他の所属グループの子孫を除外）
        const rootCds = organizationGroupCds.filter(
          (cd) => !isDescendantOfAny(cd, organizationGroupCds)
        );

        // ルート群の配下（自身含む・is_active 無関係）を再帰取得
        const activeDescendantCds = await organizationGroupRepository.findDescendantCds(organizationId, rootCds);

        // 非アクティブグループも含めて閲覧可能グループを構築（重複除去）
        visibleGroupCds = Array.from(new Set([...activeDescendantCds, ...inactiveVisibleCds]));
      }

      // リポジトリフィルター構築
      const filters: workerProjectRepository.WorkerProjectFilters = {
        status: params.status,
        sortBy: params.sortBy,
        order: params.order,
        limit: params.limit,
        offset,
        visibleGroupCds,
      };

      // リポジトリ層からプロジェクト一覧を取得
      const projects = await workerProjectRepository.findWorkerAccessible(
        organizationId,
        userId,
        filters
      );

      // リポジトリ層から総件数を取得
      const totalItems = await workerProjectRepository.countWorkerAccessible(
        organizationId,
        userId,
        params.status,
        visibleGroupCds
      );

      // ページネーション情報の計算
      const totalPages = Math.ceil(totalItems / params.limit);

      // データ変換（DBの命名からAPIの命名へ）
      const items: WorkerAccessibleProject[] = projects.map((project) => ({
        projectId: project.project_id,
        projectName: project.project_name,
        description: project.description || '',
        projectStatus: project.project_status,
        organizationGroupCd: project.organization_group_cd ?? null,
        createdAt: toJSTIsoString(new Date(project.create_at)),
        updatedAt: toJSTIsoString(new Date(project.update_at)),
      }));

      // ページネーション情報
      const pagination: WorkerProjectPagination = {
        page: params.page,
        limit: params.limit,
        totalItems,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      };

      return {
        items,
        pagination,
      };
    } catch (error: any) {
      // エラーログの記録
      logger.error('Worker project list query failed', {
        userId,
        organizationId,
        params,
        error: error.message,
        stack: error.stack,
        originalError: {
          message: error.message,
          code: error.code,
          ...error,
        },
      });

      // タイムアウトエラーの特別処理
      if (error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout')) {
        throw new DatabaseError('クエリがタイムアウトしました', error);
      }

      // データベースエラーとして再スロー
      throw new DatabaseError('データベースエラーが発生しました', error);
    }
  }
}
