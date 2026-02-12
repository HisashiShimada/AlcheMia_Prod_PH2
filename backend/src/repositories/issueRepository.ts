/**
 * IssueRepository
 * 
 * 問題報告のデータベース操作を担当するリポジトリクラス
 */

import { getPool } from '../database/db';
import {
  Issue,
  NewIssue,
  IssueUpdateData,
  IssueQueryParams,
  IssueListResponse,
  IssuePagination,
  IssueStatus,
} from '../types/issue';

/**
 * 定数定義
 */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * SELECT句の共通カラムリスト（AS句を含む）
 * ER図のissueテーブル構造に基づく
 */
const SELECT_COLUMNS = `
  organization_id AS "organizationId",
  project_id AS "projectId",
  issue_id AS "issueId",
  method_id AS "methodId",
  issue_target AS "issueTarget",
  task_no AS "taskNo",
  transition_id AS "transitionId",
  issue_title AS "issueTitle",
  issue_type AS "issueType",
  issue_contents AS "issueContents",
  status,
  issue_reporter_id AS "issueReporterId",
  issue_report_at AS "issueReportAt",
  issue_completer_id AS "issueCompleterId",
  issue_complate_at AS "issueComplateAt",
  create_user_id AS "createUserId",
  create_at AS "createAt",
  update_user_id AS "updateUserId",
  update_at AS "updateAt"
`;

/**
 * IssueRepositoryクラス
 */
export class IssueRepository {
  /**
   * 新しい問題を作成する
   * API設計書とER図のissueテーブル構造に基づく
   */
  async create(newIssue: NewIssue): Promise<Issue> {
    const pool = getPool();

    const query = `
      INSERT INTO issues (
        organization_id,
        project_id,
        issue_id,
        method_id,
        issue_target,
        task_no,
        transition_id,
        issue_title,
        issue_type,
        issue_contents,
        status,
        issue_reporter_id,
        issue_report_at,
        issue_completer_id,
        issue_complate_at,
        create_user_id,
        create_at,
        update_user_id,
        update_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unresolved',
        $11, NOW(), null, null,
        $11, NOW(), $11, NOW()
      )
      RETURNING ${SELECT_COLUMNS}
    `;

    const values = [
      newIssue.organizationId,
      newIssue.projectId,
      newIssue.issueId,
      newIssue.methodId || null,
      newIssue.issueTarget,
      newIssue.taskNo || null,
      newIssue.transitionId || null,
      newIssue.issueTitle,
      newIssue.issueType,
      newIssue.issueContents,
      newIssue.issueReporterId,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * IDで問題を取得する（マルチテナント分離必須）
   */
  async findById(issueId: string, organizationId: string): Promise<Issue | null> {
    const pool = getPool();

    const query = `
      SELECT ${SELECT_COLUMNS}
      FROM issues
      WHERE issue_id = $1 AND organization_id = $2
    `;

    const result = await pool.query(query, [issueId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * 組織の問題一覧を取得する（フィルタ・ソート・ページネーション対応）
   */
  async findByOrganization(
    organizationId: string,
    params: IssueQueryParams
  ): Promise<IssueListResponse> {
    const pool = getPool();

    // デフォルト値
    const page = params.page || 1;
    const limit = Math.min(params.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'createdAt';
    const order = params.order || 'desc';

    // WHERE句の構築
    const conditions: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let paramIndex = 2;

    if (params.projectId) {
      conditions.push(`project_id = $${paramIndex}`);
      values.push(params.projectId);
      paramIndex++;
    }

    if (params.taskDetailId) {
      conditions.push(`task_detail_id = $${paramIndex}`);
      values.push(params.taskDetailId);
      paramIndex++;
    }

    if (params.reporterId) {
      conditions.push(`reporter_id = $${paramIndex}`);
      values.push(params.reporterId);
      paramIndex++;
    }

    if (params.assigneeId) {
      conditions.push(`assignee_id = $${paramIndex}`);
      values.push(params.assigneeId);
      paramIndex++;
    }

    if (params.issueType) {
      conditions.push(`issue_type = $${paramIndex}`);
      values.push(params.issueType);
      paramIndex++;
    }

    if (params.severity) {
      conditions.push(`severity = $${paramIndex}`);
      values.push(params.severity);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // ソートカラムのマッピング
    const sortColumnMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      severity: 'severity',
      status: 'status',
    };
    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const orderClause = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // データ取得クエリ
    const dataQuery = `
      SELECT ${SELECT_COLUMNS}
      FROM issues
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await pool.query(dataQuery, [
      ...values,
      limit,
      offset,
    ]);

    // 総件数取得クエリ
    const countQuery = `
      SELECT COUNT(*) as count
      FROM issues
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    const pagination: IssuePagination = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      issues: dataResult.rows,
      pagination,
    };
  }

  /**
   * プロジェクトの問題一覧を取得する（マルチテナント分離必須）
   */
  async findByProject(
    projectId: string,
    organizationId: string,
    params: IssueQueryParams
  ): Promise<IssueListResponse> {
    return this.findByOrganization(organizationId, {
      ...params,
      projectId,
    });
  }

  /**
   * 問題情報を更新する（部分更新対応）
   */
  async update(
    issueId: string,
    organizationId: string,
    updateData: IssueUpdateData
  ): Promise<Issue | null> {
    const pool = getPool();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.title !== undefined) {
      updates.push(`issue_title = $${paramIndex}`);
      values.push(updateData.title);
      paramIndex++;
    }

    if (updateData.description !== undefined) {
      updates.push(`issue_contents = $${paramIndex}`);
      values.push(updateData.description);
      paramIndex++;
    }

    if (updateData.issueType !== undefined) {
      updates.push(`issue_type = $${paramIndex}`);
      values.push(updateData.issueType);
      paramIndex++;
    }

    if (updateData.severity !== undefined) {
      updates.push(`severity = $${paramIndex}`);
      values.push(updateData.severity);
      paramIndex++;
    }

    if (updateData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(updateData.status);
      paramIndex++;
    }

    if (updateData.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex}`);
      values.push(updateData.assigneeId);
      paramIndex++;
    }

    // 更新がない場合
    if (updates.length === 0) {
      return this.findById(issueId, organizationId);
    }

    // update_atを自動更新
    updates.push(`update_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE issues
      SET ${updates.join(', ')}
      WHERE issue_id = $${paramIndex} AND organization_id = $${paramIndex + 1}
      RETURNING ${SELECT_COLUMNS}
    `;

    values.push(issueId, organizationId);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * ステータスを更新する
   */
  async updateStatus(
    issueId: string,
    organizationId: string,
    status: IssueStatus
  ): Promise<Issue | null> {
    const pool = getPool();

    const query = `
      UPDATE issues
      SET status = $1, update_at = CURRENT_TIMESTAMP
      WHERE issue_id = $2 AND organization_id = $3
      RETURNING ${SELECT_COLUMNS}
    `;

    const result = await pool.query(query, [status, issueId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * 担当者を更新する
   */
  async updateAssignee(
    issueId: string,
    organizationId: string,
    assigneeId: string | null
  ): Promise<Issue | null> {
    const pool = getPool();

    const query = `
      UPDATE issues
      SET assignee_id = $1, update_at = CURRENT_TIMESTAMP
      WHERE issue_id = $2 AND organization_id = $3
      RETURNING ${SELECT_COLUMNS}
    `;

    const result = await pool.query(query, [assigneeId, issueId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * 問題を削除する（物理削除）
   */
  async delete(issueId: string, organizationId: string): Promise<boolean> {
    const pool = getPool();

    const query = `
      DELETE FROM issues
      WHERE issue_id = $1 AND organization_id = $2
    `;

    const result = await pool.query(query, [issueId, organizationId]);
    return (result.rowCount || 0) > 0;
  }
}