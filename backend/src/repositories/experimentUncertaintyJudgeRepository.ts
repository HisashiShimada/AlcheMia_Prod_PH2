/**
 * ExperimentUncertaintyJudgeRepository
 *
 * experiment_uncertainty_judge テーブルへのデータアクセスを担当するリポジトリ。
 * WorkRecordPanel での手入力値と tolerance による良好/不良判定結果を管理する。
 *
 * @remarks
 * DDL: docs/design/db/ddl/experiment_uncertainty_judge.sql
 * 主キー: judge_seq（SERIAL）
 *
 * @module experimentUncertaintyJudgeRepository
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { DatabaseError } from '../utils/errorClasses';

/**
 * experiment_uncertainty_judge テーブルの行型
 */
export interface ExperimentUncertaintyJudgeRow {
  judgeSeq: number;
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  templateId: string;
  propertyKey: string;
  uncertaintyKey: string;
  uncertaintyVersion: number;
  toleranceUpper: number | null;
  toleranceLower: number | null;
  recordedValue: number;
  judgeResult: '良好' | '不良';
  createUserId: string | null;
  createAt: Date;
  updateUserId: string | null;
  updateAt: string | null;
}

/**
 * 判定結果 INSERT リクエストの型
 */
export interface InsertUncertaintyJudgeRequest {
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  templateId: string;
  propertyKey: string;
  uncertaintyKey: string;
  uncertaintyVersion: number;
  toleranceUpper: number | null;
  toleranceLower: number | null;
  recordedValue: number;
  judgeResult: '良好' | '不良';
  createUserId: string;
  updateUserId?: string;
}

export class ExperimentUncertaintyJudgeRepository {

  /**
   * 判定結果を INSERT する
   *
   * @param data - INSERT リクエストデータ
   * @returns 新規採番された id
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insert(data: InsertUncertaintyJudgeRequest): Promise<number> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('experiment_uncertainty_judge/insert.sql');
      const params = [
        data.organizationId,                   // $1
        data.projectId,                        // $2
        data.methodId,                         // $3
        data.taskNo,                           // $4
        data.transitionId,                     // $5
        data.templateId,                       // $6
        data.propertyKey,                      // $7
        data.uncertaintyKey,                   // $8
        data.uncertaintyVersion,               // $9
        data.toleranceUpper,                   // $10
        data.toleranceLower,                   // $11
        data.recordedValue,                    // $12
        data.judgeResult,                      // $13
        data.createUserId,                     // $14
        data.updateUserId ?? data.createUserId, // $15
      ];
      const row = await pgp.one<{ judge_seq: number }>(query, params);
      return row.judge_seq;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting experiment_uncertainty_judge',
        error as Error
      );
    }
  }

  /**
   * 指定プロパティの最新判定結果を1件取得する
   *
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @param templateId - Template ID（MAIMLの template.id）
   * @param propertyKey - プロパティKey
   * @param uncertaintyKey - 不確かさ基準Key
   * @returns 最新判定結果（見つからない場合は null）
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findLatestByProjectAndProp(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    templateId: string,
    propertyKey: string,
    uncertaintyKey: string
  ): Promise<ExperimentUncertaintyJudgeRow | null> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('experiment_uncertainty_judge/findLatestByProjectAndProp.sql');
      const params = [
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        templateId,
        propertyKey,
        uncertaintyKey,
      ];
      const row = await pgp.oneOrNone<ExperimentUncertaintyJudgeRow>(query, params);
      return row;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding experiment_uncertainty_judge',
        error as Error
      );
    }
  }

  /**
   * プロジェクト内の全判定結果を取得する（承認時 MAiML 書き込み用）
   * 各プロパティの最新判定のみを返す。
   *
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @returns 判定結果一覧
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findAllByProject(
    organizationId: string,
    projectId: string,
    methodId: string
  ): Promise<ExperimentUncertaintyJudgeRow[]> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('experiment_uncertainty_judge/findAllByProject.sql');
      const params = [organizationId, projectId, methodId];
      return await pgp.any<ExperimentUncertaintyJudgeRow>(query, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding all experiment_uncertainty_judge records',
        error as Error
      );
    }
  }

  /**
   * プロジェクトの判定結果を集計する（最新判定のみカウント）
   *
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @returns 総件数・良好件数・不良件数
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findSummaryByProject(
    organizationId: string,
    projectId: string
  ): Promise<{ total: number; good: number; bad: number }> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('experiment_uncertainty_judge/findSummaryByProject.sql');
      const params = [organizationId, projectId];
      const row = await pgp.one<{ total: string; good: string; bad: string }>(query, params);
      return {
        total: parseInt(row.total, 10),
        good:  parseInt(row.good,  10),
        bad:   parseInt(row.bad,   10),
      };
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while aggregating experiment_uncertainty_judge',
        error as Error
      );
    }
  }
}
