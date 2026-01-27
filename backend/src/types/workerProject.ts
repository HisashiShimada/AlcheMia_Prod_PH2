/**
 * 実験作業者用プロジェクト一覧API型定義
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクトの一覧取得機能に関する型定義。
 * ロールベースアクセス制御とマルチテナント分離を考慮した設計。
 * 
 * @module types/workerProject
 * @see {@link ../../docs/.kiro/specs/experiment-worker-project-list-api/design.md}
 */

import type { ProjectStatus } from './project';
import type { UserRole } from './auth';

/**
 * 実験作業者がアクセス可能なプロジェクト
 * 
 * @description
 * APIレスポンスで返却されるプロジェクトの基本情報。
 * 実験作業者が作業対象を選択するための必要最小限の情報を含む。
 * 
 * @property {string} projectId - プロジェクトID (UUID形式)
 * @property {string} projectName - プロジェクト名
 * @property {string} description - プロジェクトの説明
 * @property {ProjectStatus} projectStatus - プロジェクトステータス (pending, in_progress, review_waiting)
 * @property {string} createdAt - 作成日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss.sssZ)
 * @property {string} updatedAt - 更新日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss.sssZ)
 * 
 * @example
 * ```typescript
 * const project: WorkerAccessibleProject = {
 *   projectId: '123e4567-e89b-12d3-a456-426614174000',
 *   projectName: 'Sample Project',
 *   description: 'This is a sample project',
 *   projectStatus: 'pending',
 *   createdAt: '2026-01-27T10:00:00.000Z',
 *   updatedAt: '2026-01-27T11:00:00.000Z'
 * };
 * ```
 */
export interface WorkerAccessibleProject {
  projectId: string;
  projectName: string;
  description: string;
  projectStatus: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 実験作業者用プロジェクト一覧取得パラメータ
 * 
 * @description
 * listWorkerAccessibleメソッドに渡すパラメータ。
 * ページネーション、フィルタリング、ソート機能を提供。
 * 
 * @property {number} page - ページ番号 (1以上の整数)
 * @property {number} limit - 1ページあたりの件数 (1-100の範囲)
 * @property {'pending' | 'in_progress' | 'review_waiting'} [status] - ステータスフィルタ (オプション)
 * @property {'create_at' | 'project_name' | 'update_at'} sortBy - ソート項目
 * @property {'asc' | 'desc'} order - ソート順序
 * 
 * @example
 * ```typescript
 * const params: ListWorkerProjectsParams = {
 *   page: 1,
 *   limit: 20,
 *   status: 'pending',
 *   sortBy: 'create_at',
 *   order: 'desc'
 * };
 * ```
 */
export interface ListWorkerProjectsParams {
  page: number;
  limit: number;
  status?: 'pending' | 'in_progress' | 'review_waiting';
  sortBy: 'create_at' | 'project_name' | 'update_at';
  order: 'asc' | 'desc';
}

/**
 * ページネーション情報
 * 
 * @description
 * プロジェクト一覧のページネーション状態を表す。
 * 
 * @property {number} page - 現在のページ番号
 * @property {number} limit - 1ページあたりの件数
 * @property {number} totalItems - 総件数
 * @property {number} totalPages - 総ページ数
 * @property {boolean} hasNext - 次のページが存在するか
 * @property {boolean} hasPrev - 前のページが存在するか
 * 
 * @example
 * ```typescript
 * const pagination: WorkerProjectPagination = {
 *   page: 2,
 *   limit: 20,
 *   totalItems: 50,
 *   totalPages: 3,
 *   hasNext: true,
 *   hasPrev: true
 * };
 * ```
 */
export interface WorkerProjectPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 実験作業者用プロジェクト一覧取得結果
 * 
 * @description
 * listWorkerAccessibleメソッドの戻り値。
 * プロジェクトリストとページネーション情報を含む。
 * 
 * @property {WorkerAccessibleProject[]} items - プロジェクトリスト
 * @property {WorkerProjectPagination} pagination - ページネーション情報
 * 
 * @example
 * ```typescript
 * const result: WorkerProjectListResult = {
 *   items: [
 *     {
 *       projectId: '123e4567-e89b-12d3-a456-426614174000',
 *       projectName: 'Project 1',
 *       description: 'Description 1',
 *       projectStatus: 'pending',
 *       createdAt: '2026-01-27T10:00:00.000Z',
 *       updatedAt: '2026-01-27T11:00:00.000Z'
 *     }
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     totalItems: 1,
 *     totalPages: 1,
 *     hasNext: false,
 *     hasPrev: false
 *   }
 * };
 * ```
 */
export interface WorkerProjectListResult {
  items: WorkerAccessibleProject[];
  pagination: WorkerProjectPagination;
}

/**
 * 実験作業者用プロジェクトサービスインターフェース
 * 
 * @description
 * 実験作業者がアクセス可能なプロジェクト一覧を取得するサービスのインターフェース。
 * ロール別アクセス制御とマルチテナント分離を実装。
 * 
 * @interface WorkerProjectService
 * 
 * @example
 * ```typescript
 * class WorkerProjectServiceImpl implements WorkerProjectService {
 *   async listWorkerAccessible(
 *     userId: string,
 *     role: UserRole,
 *     organizationId: string,
 *     params: ListWorkerProjectsParams
 *   ): Promise<WorkerProjectListResult> {
 *     // 実装...
 *   }
 * }
 * ```
 */
export interface WorkerProjectService {
  /**
   * 実験作業者がアクセス可能なプロジェクト一覧を取得
   * 
   * @description
   * ユーザーのロールに応じてアクセス可能なプロジェクトを返却。
   * - experiment_worker: 自分に割り当てられたタスクがあるプロジェクトのみ
   * - experiment_admin: 所属組織内の全プロジェクト
   * - system_admin: システム管理目的で全プロジェクト（現在の組織コンテキストに限定）
   * 
   * @param {string} userId - ユーザーID (UUID形式)
   * @param {UserRole} role - ユーザーロール
   * @param {string} organizationId - 組織ID (UUID形式)
   * @param {ListWorkerProjectsParams} params - 取得パラメータ
   * 
   * @returns {Promise<WorkerProjectListResult>} プロジェクト一覧とページネーション情報
   * 
   * @throws {DatabaseError} データベースエラー時
   * @throws {ValidationError} パラメータが無効な場合
   * 
   * @precondition
   * - userIdとorganizationIdは有効なUUID形式である
   * - paramsはバリデーション済みである（コントローラー層で保証）
   * - ユーザーは認証済みである（ミドルウェアで保証）
   * 
   * @postcondition
   * - 返却されるプロジェクトは指定されたorganizationIdに属する
   * - experiment_workerの場合、自分に割り当てられたタスクを持つプロジェクトのみ
   * - ステータスがpending, in_progress, review_waitingのプロジェクトのみ
   * 
   * @invariant
   * - すべてのクエリにorganization_idフィルタが含まれる
   * - experiment_workerの場合、project_task_detailテーブルとのJOINが必須
   * 
   * @example
   * ```typescript
   * // experiment_workerの場合
   * const result = await service.listWorkerAccessible(
   *   'user-id-123',
   *   'experiment_worker',
   *   'org-id-456',
   *   { page: 1, limit: 20, status: 'pending', sortBy: 'create_at', order: 'desc' }
   * );
   * 
   * // experiment_adminの場合
   * const result = await service.listWorkerAccessible(
   *   'user-id-789',
   *   'experiment_admin',
   *   'org-id-456',
   *   { page: 1, limit: 20, sortBy: 'project_name', order: 'asc' }
   * );
   * ```
   * 
   * @see {@link WorkerAccessibleProject}
   * @see {@link ListWorkerProjectsParams}
   * @see {@link WorkerProjectListResult}
   */
  listWorkerAccessible(
    userId: string,
    role: UserRole,
    organizationId: string,
    params: ListWorkerProjectsParams
  ): Promise<WorkerProjectListResult>;
}

/**
 * 型エクスポート
 * 
 * @description
 * 他のモジュールで使用する型を再エクスポート。
 */
export type { UserRole, ProjectStatus };