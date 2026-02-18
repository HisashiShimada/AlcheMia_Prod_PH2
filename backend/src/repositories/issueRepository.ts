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
  IssueWithComments,
  IssueListFilters,
  IssueComment,
} from '../types/issue';
import { IssueCommentResponse } from '../types/issueComment';
import { NotFoundError } from '../utils/errorClasses';

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
   * 
   * @deprecated このメソッドはページネーション機能付きですが、
   * 現在のAPI設計書ではページネーションなしの仕様となっています。
   * 代わりに listIssuesWithComments() を使用してください。
   * 
   * このメソッドは将来的な拡張のために残されています。
   */
  async findByOrganization(
    organizationId: string,
    params: IssueQueryParams & {
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'severity' | 'status';
      order?: 'asc' | 'desc';
    }
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

    if (params.methodId) {
      conditions.push(`method_id = $${paramIndex}`);
      values.push(params.methodId);
      paramIndex++;
    }

    if (params.taskNo) {
      conditions.push(`task_no = $${paramIndex}`);
      values.push(params.taskNo);
      paramIndex++;
    }

    if (params.transitionId) {
      conditions.push(`transition_id = $${paramIndex}`);
      values.push(params.transitionId);
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
    userId: string,
    statusNumber: number
  ): Promise<Issue | null> {
    const pool = getPool();

    const query = `
      UPDATE issues
      SET status = $1, 
        issue_completer_id = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN $2 ELSE issue_completer_id END,
        issue_complate_at = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN CURRENT_TIMESTAMP ELSE issue_complate_at END,
        update_user_id = $2, 
        update_at = CURRENT_TIMESTAMP
      WHERE issue_id = $3 AND organization_id = $4
      RETURNING ${SELECT_COLUMNS}
    `;

    const result = await pool.query(query, [statusNumber, userId, issueId, organizationId]);
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

  /**
   * コメント付き問題一覧を取得する（タスク 3.1）
   * 2段階クエリでN+1問題を回避
   */
  async listIssuesWithComments(
    organizationId: string,
    filters: IssueListFilters
  ): Promise<IssueWithComments[]> {
    const pool = getPool();

    // Query 1: 問題一覧を取得（JOINでprojects、organization_userと結合）
    const conditions: string[] = ['i.organization_id = $1'];
    const values: any[] = [organizationId];
    let paramIndex = 2;

    // 必須フィルタ: projectId, methodId
    conditions.push(`i.project_id = $${paramIndex}`);
    values.push(filters.projectId);
    paramIndex++;

    conditions.push(`i.method_id = $${paramIndex}`);
    values.push(filters.methodId);
    paramIndex++;

    // issue_target別の動的フィルタリング
    // issue_target: 1=project, 2=task, 3=transition
    const targetConditions: string[] = [];
    
    // project: issue_target = 1
    targetConditions.push('(i.issue_target = 1)');
    
    // task: issue_target = 2 AND task_no = ?
    targetConditions.push(`(i.issue_target = 2 AND i.task_no = $${paramIndex})`);
    values.push(filters.taskNo);
    paramIndex++;
    
    // transition: issue_target = 3 AND transition_id = ?
    targetConditions.push(`(i.issue_target = 3 AND i.transition_id = $${paramIndex})`);
    values.push(filters.transitionId);
    paramIndex++;

    conditions.push(`(${targetConditions.join(' OR ')})`);

    // オプショナルフィルタ: status
    if (filters.status) {
      conditions.push(`i.status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    // オプショナルフィルタ: issueType
    if (filters.issueType) {
      conditions.push(`i.issue_type = $${paramIndex}`);
      values.push(filters.issueType);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const issuesQuery = `
      SELECT
        i.issue_id AS id,
        i.issue_type AS "issueType",
        CASE 
          WHEN i.issue_target = 1 THEN 'project'
          WHEN i.issue_target = 2 THEN 'task'
          WHEN i.issue_target = 3 THEN 'transition'
        END AS "targetType",
        i.project_id AS "projectId",
        p.project_name AS "projectName",
        i.method_id AS "methodId",
        i.task_no AS "taskNo",
        i.transition_id AS "transitionId",
        i.issue_title AS title,
        i.issue_contents AS contents,
        i.status,
        i.issue_reporter_id AS "reportedBy",
        reporter.user_name AS "reportedByName",
        i.issue_report_at AS "reportedAt",
        i.issue_completer_id AS "completedBy",
        completer.user_name AS "completedByName",
        i.issue_complate_at AS "completedAt"
      FROM issues i
      INNER JOIN projects p ON p.organization_id = i.organization_id AND p.project_id = i.project_id
      INNER JOIN organization_user reporter ON reporter.organization_id = i.organization_id AND reporter.user_id = i.issue_reporter_id
      LEFT JOIN organization_user completer ON completer.organization_id = i.organization_id AND completer.user_id = i.issue_completer_id
      WHERE ${whereClause}
      ORDER BY i.issue_report_at DESC
    `;

    const issuesResult = await pool.query(issuesQuery, values);
    const issues: IssueWithComments[] = issuesResult.rows.map(row => ({
      ...row,
      comments: [], // 初期化
    }));

    // 問題が0件の場合は空配列を返す
    if (issues.length === 0) {
      return [];
    }

    // Query 2: 全問題のコメントを一括取得（N+1問題回避）
    const issueIds = issues.map(issue => issue.id);
    
    const commentsQuery = `
      SELECT
        c.issue_id AS "issueId",
        c.sequence_no AS "sequenceNo",
        c.comment,
        c.author_id AS "authorId",
        u.user_name AS "authorName",
        c.commented_at AS "commentedAt"
      FROM issue_comment c
      INNER JOIN organization_user u ON u.organization_id = c.organization_id AND u.user_id = c.author_id
      WHERE c.organization_id = $1 AND c.issue_id = ANY($2)
      ORDER BY c.issue_id, c.sequence_no ASC
    `;

    const commentsResult = await pool.query(commentsQuery, [organizationId, issueIds]);

    // コメントをissue_idでグループ化して各問題に追加
    const commentsByIssueId: Record<string, IssueComment[]> = {};
    
    for (const row of commentsResult.rows) {
      if (!commentsByIssueId[row.issueId]) {
        commentsByIssueId[row.issueId] = [];
      }
      commentsByIssueId[row.issueId].push({
        sequenceNo: row.sequenceNo,
        comment: row.comment,
        authorId: row.authorId,
        authorName: row.authorName,
        commentedAt: row.commentedAt,
      });
    }

    // 各問題にコメントを追加
    for (const issue of issues) {
      issue.comments = commentsByIssueId[issue.id] || [];
    }

    return issues;
  }

  /**
   * プロジェクト名からプロジェクトIDを取得する
   */
  async getProjectIdByName(
    organizationId: string,
    projectName: string
  ): Promise<string | null> {
    const pool = getPool();

    const query = `
      SELECT project_id
      FROM projects
      WHERE project_name = $1 AND organization_id = $2
    `;

    const result = await pool.query(query, [projectName, organizationId]);
    return result.rows[0]?.project_id || null;
  }

  /**
   * コメントを追加する（タスク 3.1）
   * トランザクション制御とFOR UPDATEによる排他制御を実装
   */
  async addComment(
    organizationId: string,
    projectId: string,
    issueId: string,
    userId: string,
    comment: string
  ): Promise<IssueCommentResponse> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 問題存在確認とロック取得（FOR UPDATE）
      const issueQuery = `
        SELECT issue_id, organization_id, project_id
        FROM issues
        WHERE issue_id = $1 AND organization_id = $2
        FOR UPDATE
      `;
      const issueResult = await client.query(issueQuery, [issueId, organizationId]);

      if (issueResult.rows.length === 0) {
        throw new NotFoundError('Issue not found', 'Issue');
      }

      const issue = issueResult.rows[0];

      // シーケンス番号の採番
      const seqQuery = `
        SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_seq
        FROM issue_comment
        WHERE organization_id = $1 AND issue_id = $2
      `;
      const seqResult = await client.query(seqQuery, [organizationId, issueId]);
      const sequenceNo = seqResult.rows[0].next_seq;

      // コメントレコードの挿入
      const insertQuery = `
        INSERT INTO issue_comment (
          organization_id,
          project_id,
          issue_id,
          sequence_no,
          comment,
          author_id,
          commented_at,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), $6, NOW(), $6, NOW()
        )
        RETURNING 
          organization_id,
          project_id,
          issue_id,
          sequence_no,
          comment,
          author_id,
          commented_at
      `;
      const insertResult = await client.query(insertQuery, [
        organizationId,
        issue.project_id,
        issueId,
        sequenceNo,
        comment,
        userId,
      ]);

      const insertedComment = insertResult.rows[0];

      // 投稿者名の取得
      const userQuery = `
        SELECT user_name
        FROM organization_user
        WHERE organization_id = $1 AND user_id = $2
      `;
      const userResult = await client.query(userQuery, [organizationId, userId]);
      const authorName = userResult.rows[0]?.user_name || 'Unknown';

      // トランザクションコミット
      await client.query('COMMIT');

      // レスポンスの構築
      return {
        projectId: insertedComment.project_id,
        issueId: insertedComment.issue_id,
        sequenceNo: insertedComment.sequence_no,
        comment: insertedComment.comment,
        authorId: insertedComment.author_id,
        authorName,
        commentedAt: insertedComment.commented_at,
      };
    } catch (error) {
      // エラー時はロールバック
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // クライアントを解放
      client.release();
    }
  }
}
