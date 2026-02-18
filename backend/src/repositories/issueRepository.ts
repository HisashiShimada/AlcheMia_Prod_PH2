/**
 * IssueRepository
 * 
 * 問題報告のデータベース操作を担当するリポジトリクラス
 */

import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
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
    const pgp = getPgp();
    const query = await loadSqlFile('issues/create.sql');

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

    return await pgp.one<Issue>(query, values);
  }

  /**
   * IDで問題を取得する（マルチテナント分離必須）
   */
  async findById(issueId: string, organizationId: string): Promise<Issue | null> {
    const pgp = getPgp();
    const query = await loadSqlFile('issues/findById.sql');

    return await pgp.oneOrNone<Issue>(query, [issueId, organizationId]);
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
    const pgp = getPgp();
    const query = await loadSqlFile('issues/updateStatus.sql');

    return await pgp.oneOrNone<Issue>(query, [statusNumber, userId, issueId, organizationId]);
  }

  /**
   * 担当者を更新する
   */
  async updateAssignee(
    issueId: string,
    organizationId: string,
    assigneeId: string | null
  ): Promise<Issue | null> {
    const pgp = getPgp();
    const query = await loadSqlFile('issues/updateAssignee.sql');

    return await pgp.oneOrNone<Issue>(query, [assigneeId, issueId, organizationId]);
  }

  /**
   * 問題を削除する（物理削除）
   */
  async delete(issueId: string, organizationId: string): Promise<boolean> {
    const pgp = getPgp();
    const query = await loadSqlFile('issues/delete.sql');

    const result = await pgp.result(query, [issueId, organizationId]);
    return result.rowCount > 0;
  }

  /**
   * コメント付き問題一覧を取得する（タスク 3.1）
   * 2段階クエリでN+1問題を回避
   */
  async listIssuesWithComments(
    organizationId: string,
    filters: IssueListFilters
  ): Promise<IssueWithComments[]> {
    const pgp = getPgp();

    // Query 1: 問題一覧を取得（外部SQLファイル + 動的フィルタ）
    let issuesQuery = await loadSqlFile('issues/listIssuesWithCommentsIssues.sql');
    const values: any[] = [organizationId, filters.projectId, filters.methodId, filters.taskNo, filters.transitionId];
    let paramIndex = 6;

    // オプショナルフィルタ: status
    if (filters.status) {
      issuesQuery = issuesQuery.replace(
        'ORDER BY',
        `AND i.status = $${paramIndex}\nORDER BY`
      );
      values.push(filters.status);
      paramIndex++;
    }

    // オプショナルフィルタ: issueType
    if (filters.issueType) {
      issuesQuery = issuesQuery.replace(
        'ORDER BY',
        `AND i.issue_type = $${paramIndex}\nORDER BY`
      );
      values.push(filters.issueType);
      paramIndex++;
    }

    const issues: IssueWithComments[] = await pgp.any(issuesQuery, values);
    
    // 初期化：各問題にcommentsプロパティを追加
    issues.forEach(issue => {
      issue.comments = [];
    });

    // 問題が0件の場合は空配列を返す
    if (issues.length === 0) {
      return [];
    }

    // Query 2: 全問題のコメントを一括取得（N+1問題回避）
    const issueIds = issues.map(issue => issue.id);
    const commentsQuery = await loadSqlFile('issues/listIssuesWithCommentsComments.sql');
    const commentsResult = await pgp.any(commentsQuery, [organizationId, issueIds]);

    // コメントをissue_idでグループ化して各問題に追加
    const commentsByIssueId: Record<string, IssueComment[]> = {};
    
    for (const row of commentsResult) {
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
    const pgp = getPgp();
    const query = await loadSqlFile('issues/getProjectIdByName.sql');

    const result = await pgp.oneOrNone<{ project_id: string }>(query, [projectName, organizationId]);
    return result?.project_id || null;
  }

  /**
   * コメントを追加する（タスク 3.1）
   * トランザクション制御とFOR UPDATEによる排他制御を実装
   * pg-promiseのtx()を使用
   */
  async addComment(
    organizationId: string,
    issueId: string,
    userId: string,
    comment: string
  ): Promise<IssueCommentResponse> {
    const pgp = getPgp();

    // 外部SQLファイルを読み込み
    const checkIssueQuery = await loadSqlFile('issue_comment/addCommentCheckIssue.sql');
    const getNextSeqQuery = await loadSqlFile('issue_comment/addCommentGetNextSeq.sql');
    const insertCommentQuery = await loadSqlFile('issue_comment/addCommentInsert.sql');
    const getAuthorNameQuery = await loadSqlFile('issue_comment/addCommentGetAuthorName.sql');

    return await pgp.tx(async (t) => {
      // 問題存在確認とロック取得（FOR UPDATE）
      const issue = await t.oneOrNone(
        checkIssueQuery,
        [issueId, organizationId]
      ) as { issue_id: string; organization_id: string; project_id: string } | null;

      if (!issue) {
        throw new NotFoundError('Issue not found', 'Issue');
      }

      // シーケンス番号の採番
      const seqResult = await t.one(
        getNextSeqQuery,
        [organizationId, issueId]
      ) as { next_seq: number };
      const sequenceNo = seqResult.next_seq;

      // コメントレコードの挿入
      const insertedComment = await t.one(insertCommentQuery, [
        organizationId,
        issue.project_id,
        issueId,
        sequenceNo,
        comment,
        userId,
      ]) as {
        organization_id: string;
        project_id: string;
        issue_id: string;
        sequence_no: number;
        comment: string;
        author_id: string;
        commented_at: Date;
      };

      // 投稿者名の取得
      const userResult = await t.oneOrNone(
        getAuthorNameQuery,
        [organizationId, userId]
      ) as { user_name: string } | null;
      const authorName = userResult?.user_name || 'Unknown';

      // レスポンスの構築
      return {
        projectId: insertedComment.project_id,
        issueId: insertedComment.issue_id,
        sequenceNo: insertedComment.sequence_no,
        comment: insertedComment.comment,
        authorId: insertedComment.author_id,
        authorName,
        commentedAt: insertedComment.commented_at.toISOString(),
      };
    });
  }
}
