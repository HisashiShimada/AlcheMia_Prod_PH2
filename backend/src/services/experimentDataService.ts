/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジックを提供します。
 * 
 * @note トランジションステータス更新機能はprogressService.tsに移動しました（2026-02-18）
 */

import { TemplateDataRepository, TemplateDataRecord, TemplateDataRow, PropertySet } from '../repositories/templateDataRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import * as experimentInstructionDetailRepository from '../repositories/experimentInstructionDetailRepository';
import * as projectTaskDetailRepository from '../repositories/projectTaskDetailRepository';
import * as projectRepository from '../repositories/projectRepository';
import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { toJSTIsoString } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import type { Property, Content } from '../types/maiml-unified';
import { findByKeysWithDetails, UncertaintyKeyDetail, QualitativeOptionRow } from '../repositories/uncertaintyCriteriaRepository';
import { runJudge, UncertaintyValueInput, UncertaintyJudgeResult } from './uncertaintyJudgeService';
import type { ToleranceValueEntry } from '../types/api';
import { ExperimentInstructionDetail } from '../types/database';
import { ExperimentUncertaintyJudgeRepository } from '../repositories/experimentUncertaintyJudgeRepository';

/**
 * プロジェクト編集不可エラー
 */
export class ProjectNotEditableError extends Error {
  constructor(projectStatus: string) {
    super(`Project is not editable. Current status: ${projectStatus}. Editable statuses are: 1 (task_pending), 2 (task_in_progress), 6 (review_rejected).`);
    this.name = 'ProjectNotEditableError';
  }
}

/**
 * タスク不存在エラー
 */
export class TaskNotFoundError extends Error {
  constructor(taskNo: number) {
    super(`Task not found: task_no=${taskNo}`);
    this.name = 'TaskNotFoundError';
  }
}

/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジック
 */
export class ExperimentDataService {
  private templateRepository: TemplateDataRepository;

  constructor(
    templateRepository?: TemplateDataRepository
  ) {
    this.templateRepository = templateRepository || new TemplateDataRepository();
  }

  /**
   * 実験データを一括保存
   * 
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param taskNo タスク番号
   * @param records 保存するレコード配列
   * @param recordedBy 記録者のユーザーID
   * @param transitionId 記録済みフラグ更新対象のトランジションID（省略可）
   * @param uncertaintyValues 不確かさ判定入力値（省略可）定量評価のみ
   * @param qualitativeValues 定性評価値（省略可）
   * @returns 保存されたレコード配列と判定結果
   */
  async saveBatchData(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    records: TemplateDataRecord[],
    recordedBy: string,
    transitionId?: string,
    uncertaintyValues?: UncertaintyValueInput[],
    qualitativeValues?: Array<{
      propKey: string;
      templateId: string;
      value: string;
      uncertaintyKey?: string | null;
      nameSpaceId?: string | null;
    }>
  ): Promise<{ savedRecords: TemplateDataRow[]; judgeResults: UncertaintyJudgeResult[] }> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 1. プロジェクトIDからステータス・プロジェクト名を取得して編集可否チェック（外部SQLファイル使用）
      const statusQuery = await loadSqlFile('projects/findByIdWithStatus.sql');
      const statusResult = await client.query(
        statusQuery,
        [organizationId, projectId]
      );

      if (statusResult.rows.length === 0) {
        const error: any = new Error('Project not found or does not belong to your organization');
        error.name = 'ProjectNotFoundError';
        throw error;
      }

      const projectStatus = statusResult.rows[0].project_status;
      const projectName: string = statusResult.rows[0].project_name;

      // 編集可能なステータスかチェック
      // 1: TASK_PENDING（タスク実行待ち）、2: TASK_IN_PROGRESS（タスク実行中）、6: REVIEW_REJECTED（レビュー差戻・訂正モード）
      const editableStatuses = [1, 2, 6];
      if (!editableStatuses.includes(projectStatus)) {
        throw new ProjectNotEditableError(projectStatus);
      }

      // 2. タスクが存在することを確認（外部SQLファイル使用）
      const taskQuery = await loadSqlFile('tasks/checkExists.sql');
      const taskResult = await client.query(
        taskQuery,
        [organizationId, projectId, methodId, taskNo]
      );

      if (taskResult.rows.length === 0) {
        throw new TaskNotFoundError(taskNo);
      }

      // 3. records配列の各要素をUPSERT（updateUserIdをrecordedByで補完）
      const savedRecords: TemplateDataRow[] = [];
      for (const record of records) {
        // updateUserId が未設定の場合は recordedBy を使用
        const recordWithUser: TemplateDataRecord = {
          ...record,
          updateUserId: record.updateUserId || recordedBy,
        };
        const savedRecord = await this.templateRepository.upsert(
          organizationId,
          projectId,
          methodId,
          taskNo,
          recordWithUser,
          client
        );
        savedRecords.push(savedRecord);
      }

      // 5. 記録済みフラグの更新（transitionId が指定されている場合のみ）
      if (transitionId) {
        const transitionDataRepository = new TransitionDataRepository();
        await transitionDataRepository.updateIsRecorded(
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          true,
          recordedBy,
          client
        );
      }

      // 5-2. 保存時: タスク・プロジェクトステータスを「実行中」に更新する
      //      プロジェクトステータスが TASK_PENDING(1)  → TASK_IN_PROGRESS(2)
      //      タスクステータスが     PENDING(0)         → IN_PROGRESS(1)
      //      既に実行中以上の場合は変更しない
      try {
        // タスクステータスが PENDING(0) のときのみ IN_PROGRESS(1) に更新
        await projectTaskDetailRepository.updateStatusIfPending(
          organizationId,
          projectId,
          methodId,
          taskNo,
          client
        );
        logger.info('[ExperimentDataService] task_status updated 0(PENDING) -> 1(IN_PROGRESS) on save (if applicable)', {
          organizationId,
          projectId,
          methodId,
          taskNo,
        });

        // プロジェクトステータスが TASK_PENDING(1) または REVIEW_REJECTED(6) のときのみ TASK_IN_PROGRESS(2) に更新
        // REVIEW_REJECTED(6): 承認NG後に作業者が訂正保存したとき project_status を IN_PROGRESS に戻す
        if (projectStatus === 1 || projectStatus === 6) { // TASK_PENDING or REVIEW_REJECTED
          await projectRepository.updateStatusIfPending(
            organizationId,
            projectId,
            client
          );
          logger.info('[ExperimentDataService] project_status updated -> 2(TASK_IN_PROGRESS) on save (if applicable)', {
            organizationId,
            projectId,
            previousStatus: projectStatus,
          });
        }
      } catch (statusUpdateErr) {
        // ステータス更新失敗はエラーをそのままスローしてトランザクションをロールバックする
        logger.error('[ExperimentDataService] タスク/プロジェクトステータス更新失敗（ROLLBACK）', {
          organizationId,
          projectId,
          methodId,
          taskNo,
          error: statusUpdateErr,
        });
        throw statusUpdateErr;
      }

      // 6. 不確かさ判定の実行（uncertaintyValues が指定されている場合のみ）
      //    トランザクション外で実行（runJudge 内部で pgp を使用するため）
      // NOTE: COMMIT 後に実行する（トランザクション外での DB 操作になるが、
      //       判定結果の INSERT は独立した操作として許容する）

      // トランザクションコミット
      await client.query('COMMIT');

      // 7. 不確かさ判定の実行（COMMIT 後・トランザクション外で実行）
      let judgeResults: UncertaintyJudgeResult[] = [];
      if (uncertaintyValues && uncertaintyValues.length > 0 && transitionId) {
        try {
          judgeResults = await runJudge(
            organizationId,
            projectId,
            methodId,
            taskNo,
            transitionId,
            uncertaintyValues,
            recordedBy
          );
        } catch (judgeError) {
          // 判定結果の保存エラーは実績値保存の成功には影響させない（ログのみ）
          logger.error('[ExperimentDataService] uncertaintyJudge error:', { error: judgeError });
        }
      }

      // 8. experiment_instruction_detail の actual_value と不確かさ情報を更新（COMMIT 後）
      //    transitionId が指定されている場合のみ実行する
      if (transitionId) {
        try {
          await this._updateInstructionDetails(
            organizationId,
            projectId,
            methodId,
            taskNo,
            transitionId,
            savedRecords,
            uncertaintyValues,
            qualitativeValues,
            recordedBy
          );
        } catch (detailErr) {
          // instruction_detail 更新失敗は実績値保存の成功には影響させない（ログのみ）
          logger.warn('[ExperimentDataService] instruction_detail 更新失敗（スキップ）', {
            error: String(detailErr),
            organizationId,
            transitionId,
          });
        }
      }

      return { savedRecords, judgeResults };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * experiment_instruction_detail の actual_value と不確かさ情報を更新する（内部メソッド）
   *
   * savedRecords（TemplateDataRow[]）から templateName / propKey / actualValue を抽出し、
   * uncertaintyValues（定量）と qualitativeValues（定性）を合わせて更新する。
   */
  private async _updateInstructionDetails(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    savedRecords: TemplateDataRow[],
    uncertaintyValues: UncertaintyValueInput[] | undefined,
    qualitativeValues: Array<{
      propKey: string; templateId: string; value: string;
      uncertaintyKey?: string | null; nameSpaceId?: string | null;
    }> | undefined,
    updateUserId: string
  ): Promise<void> {
    // templateId → 定量不確かさ情報マップ（propKey → 最新1件）
    const quantMap = new Map<string, UncertaintyValueInput>();
    for (const uv of (uncertaintyValues ?? [])) {
      quantMap.set(`${uv.templateId}__${uv.propertyKey}`, uv);
    }

    // templateId → 定性評価マップ（propKey → 値）
    const qualMap = new Map<string, { value: string; uncertaintyKey?: string | null; nameSpaceId?: string | null }>();
    for (const qv of (qualitativeValues ?? [])) {
      qualMap.set(`${qv.templateId}__${qv.propKey}`, qv);
    }

    for (const row of savedRecords) {
      const ps = row.property_set;
      if (!ps) continue;
      const templateId = ps.templateId ?? '';
      // template_id が空の場合はスキップ（主キーとして必須）
      if (!templateId) {
        logger.warn('[ExperimentDataService] templateId が空のためinstruction_detail更新をスキップ', {
          organizationId, projectId, methodId, taskNo, placeId: row.place_id,
        });
        continue;
      }

      for (const prop of (ps.properties ?? [])) {
        const propKey = (prop as unknown as Record<string, unknown>)['key'] as string | undefined;
        if (!propKey) continue;

        const actualValue = (() => {
          const v = (prop as unknown as Record<string, unknown>)['value'];
          return v != null ? String(v) : null;
        })();

        const mapKey = `${templateId}__${propKey}`;
        // qualMap のキーはフロントから placeId（WorkTemplate.id）で送信されるため、
        // ps.templateId（MAIMLのtemplate.id）でマッチしない場合は place_id でフォールバック
        const mapKeyByPlace = `${row.place_id}__${propKey}`;
        const quant = quantMap.get(mapKey);
        const qual = qualMap.get(mapKey) ?? qualMap.get(mapKeyByPlace);

        await experimentInstructionDetailRepository.updateActualAndUncertainty({
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          templateId,
          propKey,
          actualValue,
          nameSpaceId: qual?.nameSpaceId ?? quant ? null : null,
          uncertaintyKey: qual?.uncertaintyKey ?? null,
          uncertaintyAssignedValue: qual?.value ?? (quant ? String(quant.value) : null),
          uncertaintyAssignedBy: (quant || qual) ? updateUserId : null,
          uncertaintyAssignedAt: (quant || qual) ? new Date() : null,
          updateUserId,
        });
      }
    }
  }
}

/**
 * テンプレート実績一覧取得レスポンス
 */
export interface TemplateDataItem {
  placeId: string;
  templateType: string;
  templateId: string;
  data: Record<string, unknown>;
  recordedBy: string | null;
  recordedAt: string | null;
}

export interface GetTemplateDataResult {
  projectName: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  adjacentPlaceIds: string[];
  templates: TemplateDataItem[];
  totalCount: number;
}

/**
 * テンプレート実績一覧を取得する
 * 
 * @description
 * 指定したタスクの template_data を全件取得し、
 * MaiML ファイルのペトリネット構造を解析して
 * transitionId に隣接するプレースのレコードのみ返す。
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param taskNo タスク番号
 * @param transitionId トランジションID
 * @returns 隣接プレースの実績データ
 */
export async function getTemplateData(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  transitionId: string
): Promise<GetTemplateDataResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. project_name を project_id から取得（レスポンスおよびパス解決フォールバック用）
    const nameQuery = await loadSqlFile('projects/findNameById.sql');
    const nameResult = await client.query(nameQuery, [organizationId, projectId]);

    if (nameResult.rows.length === 0) {
      const error: any = new Error(`Project not found: ${projectId}`);
      error.name = 'ProjectNotFoundError';
      throw error;
    }
    const projectName: string = nameResult.rows[0].project_name;

    // 2. template_data テーブルから対象タスクの全レコードを取得
    const repository = new TemplateDataRepository();
    const allRecords = await repository.findByTaskNo(
      organizationId,
      projectId,
      methodId,
      taskNo,
      client
    );

    // 3. S3/Swift から MaiML ファイルをダウンロード
    // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
    const storageService = getStorageService();
    const maimlPath = await resolveMaimlFilePath(organizationId, projectId, projectName);
    let maimlBuffer: Buffer;
    try {
      maimlBuffer = await storageService.downloadFile(organizationId, maimlPath);
    } catch {
      const error: any = new Error(`MaiML file not found: ${maimlPath}`);
      error.name = 'MaimlNotFoundError';
      throw error;
    }
    const maimlContent = maimlBuffer.toString('utf-8');

    // 4. MaimlParserTyped でペトリネット構造解析
    let parser: MaimlParserTyped;
    try {
      parser = new MaimlParserTyped(maimlContent);
    } catch {
      const error: any = new Error('Failed to parse MaiML file');
      error.name = 'MaimlParseFailedError';
      throw error;
    }

    // 5. 指定 methodId の method を特定し transitionId の存在確認
    const methods = parser.getMethods();
    const targetMethod = methods.find(m => m.id === methodId);
    if (!targetMethod) {
      const error: any = new Error(`Method '${methodId}' not found in MaiML`);
      error.name = 'TransitionNotFoundError';
      throw error;
    }

    const pnmlTransitions = targetMethod.pnml.transitions || [];
    const transitionExists = pnmlTransitions.some(t => t.id === transitionId);
    if (!transitionExists) {
      const error: any = new Error(`Transition '${transitionId}' not found in MaiML method '${methodId}'`);
      error.name = 'TransitionNotFoundError';
      throw error;
    }

    // 6. arcs から隣接プレースID を特定（入力プレース・出力プレースの両方）
    const pnmlArcs = targetMethod.pnml.arcs || [];
    const adjacentPlaceIds: string[] = [];
    for (const arc of pnmlArcs) {
      if (arc.source === transitionId && arc.target) {
        // トランジション → プレース（出力プレース）
        if (!adjacentPlaceIds.includes(arc.target)) {
          adjacentPlaceIds.push(arc.target);
        }
      } else if (arc.target === transitionId && arc.source) {
        // プレース → トランジション（入力プレース）
        if (!adjacentPlaceIds.includes(arc.source)) {
          adjacentPlaceIds.push(arc.source);
        }
      }
    }

    // 7. template_data レコードを隣接プレースIDでフィルタリング
    const filteredRecords = allRecords.filter((r: TemplateDataRow) =>
      adjacentPlaceIds.includes(r.place_id)
    );

    // 8. uncertainty keys を MAIML から収集して DB 詳細を取得
    const allUncertaintyKeys = collectUncertaintyKeys(parser, methodId);
    const uncertaintyDetailMap = new Map<string, UncertaintyKeyDetail>();
    if (allUncertaintyKeys.length > 0) {
      const rawResult = await findByKeysWithDetails(organizationId, allUncertaintyKeys);
      for (const detail of rawResult) {
        uncertaintyDetailMap.set(detail.uncertaintyKey, detail);
      }
    }

    const experimentInstructionDetails = await experimentInstructionDetailRepository.findByProject(organizationId,projectId);
    const taskInstructions = experimentInstructionDetails.filter((e) => e.method_id == methodId && e.task_no == taskNo && e.transition_id == transitionId );

    // 8c. experiment_uncertainty_judge から最新の recorded_value を一括取得して judgeMap を構築
    // judgeMap キー: `${templateId}__${propertyKey}__${uncertaintyKey}`
    const judgeRepo = new ExperimentUncertaintyJudgeRepository();
    const judgeRows = await judgeRepo.findByTaskNo(
      organizationId, projectId, methodId, taskNo, transitionId
    );
    const judgeMap = new Map<string, number>();
    for (const jr of judgeRows) {
      judgeMap.set(`${jr.templateId}__${jr.propertyKey}__${jr.uncertaintyKey}`, jr.recordedValue);
    }

    // 8b. placeId ごとに DB実績 or フォールバックを選択
    // （一部のみ保存済みの場合に、未保存のplaceIdがレスポンスから欠損しないようにするため）
    const fallbackAll = buildFallbackTemplates(parser, methodId, adjacentPlaceIds,taskInstructions, uncertaintyDetailMap);

    // adjacentPlaceIds が空の場合（MAIML のアーク情報が取得できなかった場合）は
    // buildFallbackTemplates が全プレースを対象に返すため、そのまま使用する
    if (adjacentPlaceIds.length === 0) {
      return {
        projectName,
        methodId,
        taskNo,
        transitionId,
        adjacentPlaceIds,
        templates: fallbackAll,
        totalCount: fallbackAll.length,
      };
    }

    const templates: TemplateDataItem[] = adjacentPlaceIds.map(placeId => {
      // DBにそのplaceIdのレコードが存在するか確認
      const dbRecord = filteredRecords.find((r: TemplateDataRow) => r.place_id === placeId);

      if (dbRecord) {
        // 8-a. DB実績データを property_set から取り出してマッピング
        // property_set.properties[] は Property 型（uncertainty[] 配列のまま）で保存されているため、
        // convertPropertyForFallback を適用して toleranceValue / uncertaintyNote / uncertaintyName を
        // フラットフィールドとして展開する（フォールバックパスと同一のデータ構造にする）
        const ps: PropertySet | null = dbRecord.property_set;
        let enrichedProperties = (ps?.properties ?? []).map(
          (p) => convertPropertyForFallback(p, 0,experimentInstructionDetails, uncertaintyDetailMap)
        );

        // property_set.properties が空の場合（タスク登録時のバグ等で空保存された場合）、
        // MAIMLフォールバック定義から properties を補完する。
        // これにより DBレコードは存在するがプロパティが表示されない問題を防ぐ。
        if (enrichedProperties.length === 0) {
          const fallbackItem = fallbackAll.find(f => f.placeId === placeId);
          if (fallbackItem) {
            const fallbackProperties = fallbackItem.data.properties;
            if (Array.isArray(fallbackProperties) && fallbackProperties.length > 0) {
              enrichedProperties = fallbackProperties as ReturnType<typeof convertPropertyForFallback>[];
            }
          }
        }

        // ── 定性評価説明 / 定性評価理由の分離 ──
        // DB の uncertainty[].description には保存時に書き込まれた「定性評価理由」（作業者入力）が入っている。
        // 一方「定性評価説明」は実験管理者がチェックアウト時に設定したMAIMLの元の description であり、
        // フォールバックデータ（MAIML由来）の qualitativeNote から取得する。
        // enrichedProperties の各プロパティを以下のように書き換える:
        //   qualitativeReason = DB の qualitativeNote（作業者が入力した定性評価理由）
        //   qualitativeNote   = MAIML の qualitativeNote（管理者が設定した定性評価説明）
        const fallbackItemForDesc = fallbackAll.find(f => f.placeId === placeId);
        if (fallbackItemForDesc && Array.isArray(fallbackItemForDesc.data.properties)) {
          const fallbackPropMap = new Map<string, Record<string, unknown>>();
          for (const fp of fallbackItemForDesc.data.properties as Record<string, unknown>[]) {
            const fpKey = fp['key'] as string | undefined;
            if (fpKey) fallbackPropMap.set(fpKey, fp);
          }
          enrichedProperties = enrichedProperties.map((ep) => {
            const propKey = ep['key'] as string | undefined;
            if (!propKey) return ep;
            const fallbackProp = fallbackPropMap.get(propKey);
            if (!fallbackProp) return ep;
            return {
              ...ep,
              // DB由来の qualitativeNote を qualitativeReason として保持
              qualitativeReason: (ep['qualitativeNote'] as string | null) ?? null,
              // MAIML由来の qualitativeNote で上書き（管理者が設定した説明文）
              qualitativeNote:   (fallbackProp['qualitativeNote'] as string | null) ?? null,
            };
          });
        }

        const enrichedPs = ps != null
          ? { ...ps, properties: enrichedProperties }
          : { properties: enrichedProperties };
        const templateId = ps?.templateId ?? '';
        return {
          placeId: dbRecord.place_id,
          templateType: ps?.templateType ?? '',
          templateId,
          data: enrichedPs as unknown as Record<string, unknown>,
          recordedBy: dbRecord.update_user_id ?? null,
          recordedAt: dbRecord.update_at instanceof Date
            ? toJSTIsoString(dbRecord.update_at)
            : (dbRecord.update_at != null ? String(dbRecord.update_at) : null),
        } as TemplateDataItem;
      } else {
        // 8-b. フォールバック: MAIMLテンプレート定義から初期値を使用
        const fallback = fallbackAll.find(f => f.placeId === placeId);
        return fallback ?? null;
      }
    }).filter((item): item is TemplateDataItem => item !== null);

    // 8d. judgeMap の recorded_value を templates の toleranceValues[] に後付けで付与する
    // convertPropertyForFallback は templateId を持たないため、templates 構築後にプロパティキーで付与する
    for (const item of templates) {
      if (!Array.isArray(item.data.properties)) continue;
      for (const p of item.data.properties as Array<Record<string, unknown>>) {
        const propKey = String(p['key'] ?? '');
        if (!Array.isArray(p['toleranceValues'])) continue;
        p['toleranceValues'] = (p['toleranceValues'] as Array<Record<string, unknown>>).map((tv) => {
          const ucKey = String(tv['uncertaintyKey'] ?? '');
          const mapKey = `${item.templateId}__${propKey}__${ucKey}`;
          const recorded = judgeMap.get(mapKey);
          return recorded !== undefined ? { ...tv, recordedValue: recorded } : tv;
        });
      }
    }

    return {
      projectName,
      methodId,
      taskNo,
      transitionId,
      adjacentPlaceIds,
      templates,
      totalCount: templates.length,
    };
  } finally {
    client.release();
  }
}

/**
 * MAIML 内の全 uncertainty key を収集する
 *
 * @param parser - MaimlParserTyped インスタンス
 * @param methodId - メソッドID
 * @returns uncertainty key の配列（重複なし）
 */
function collectUncertaintyKeys(parser: MaimlParserTyped, methodId: string): string[] {
  const keys = new Set<string>();
  const methods = parser.getMethods();
  const method = methods.find(m => m.id === methodId);
  if (!method) return [];

  const allTemplates = [
    ...method.materialTemplates,
    ...method.conditionTemplates,
    ...method.resultTemplates,
    ...method.program.flatMap(p => [
      ...p.materialTemplates,
      ...p.conditionTemplates,
      ...p.resultTemplates,
    ]),
  ];

  function collectFromProperty(p: Property): void {
    if (p.uncertainty) {
      for (const unc of p.uncertainty) {
        if (unc.key) keys.add(unc.key);
      }
    }
    if (p.properties) {
      for (const child of p.properties) collectFromProperty(child);
    }
  }

  for (const tmpl of allTemplates) {
    if (!tmpl) continue;
    const tmplArray = Array.isArray(tmpl) ? tmpl : [tmpl];
    for (const t of tmplArray) {
      for (const p of (t.properties || [])) collectFromProperty(p);
    }
  }

  return [...keys];
}

/**
 * Property を再帰的に変換するヘルパー関数（モジュールスコープ）
 *
 * @description
 * getTemplateData（DB実績あり・なし両パス）および buildFallbackTemplates から共通利用する。
 * propertyListType の子 Property・子 Content を再帰的に変換して返す。
 * uncertaintyDetailMap があれば uncertainty を定量/定性に分類してフィールドに反映する。
 *
 * @param p - 変換対象の Property
 * @param depth - 再帰の深さ（無限ループ防止）
 * @param uncertaintyDetailMap - uncertainty key → DB詳細のマップ（省略可）
 */
function convertPropertyForFallback(
  p: Property,
  depth: number = 0,
  experimentInstructionDetails: ExperimentInstructionDetail[],
  uncertaintyDetailMap?: Map<string, UncertaintyKeyDetail>
): Record<string, unknown> {
  const MAX_DEPTH = 5;

  // uncertainty を定量/定性に分類する
  let toleranceValue: string | null = null;
  let uncertaintyNote: string | null = null;
  let uncertaintyName: string | null = null;
  let qualitativeOptions: QualitativeOptionRow[] = [];
  let qualitativeEval: string | null = null;
  let qualitativeNote: string | null = null;
  /** 定性評価の uncertainty キー（フロントから qualitativeValues.uncertaintyKey として送信するために必要） */
  let qualitativeKey: string | null = null;
  /**
   * 定量評価の全件リスト（複数の定量 uncertainty に対応）。
   * フロントエンドの WorkRecordPanel.convertRawProperty が
   * quantitativeUncertainties へマッピングするために使用する。
   */
  const toleranceValues: ToleranceValueEntry[] = [];

  if (uncertaintyDetailMap && p.uncertainty && p.uncertainty.length > 0) {
    for (const unc of p.uncertainty) {
      const key = unc.key ?? '';
      const detail = uncertaintyDetailMap.get(key);
      // evaluationMethod 1=定量, 2=定性。DB に存在しないキーは定量として扱う
      const isQualitative = detail?.evaluationMethod === 2;

      if (!isQualitative) {
        // 許容値はMAIML計画段階の<uncertainty>タグには<value>要素がないため、
        // DBの tolerance_upper / tolerance_lower から "{lower} ~ {upper}" 形式で生成する
        const toleranceLower = detail?.toleranceLower ?? null;
        const toleranceUpper = detail?.toleranceUpper ?? null;
        const tv = (toleranceLower !== null && toleranceUpper !== null)
          ? `${toleranceLower} ~ ${toleranceUpper}`
          : null;
        const tn   = unc.description ?? null;
        const name = detail?.termDisplayName ?? detail?.uncertaintyName ?? null;
        // 後方互換: 最初の1件を toleranceValue（単一フィールド）にも設定
        if (toleranceValue === null) {
          toleranceValue  = tv;
          uncertaintyNote = tn;
          uncertaintyName = name;
        }
        // 全件を toleranceValues[] に追加
        const toleranceEntry: ToleranceValueEntry = {
          uncertaintyKey:  key,
          toleranceValue:  tv,
          uncertaintyNote: tn,
          uncertaintyName: name,
        };
        toleranceValues.push(toleranceEntry);
      } else if (isQualitative && qualitativeOptions.length === 0) {
        // 定性: 最初の1件
        qualitativeKey     = key;
        qualitativeOptions = detail?.qualitativeOptions ?? [];
        qualitativeEval    = unc.value     != null ? String(unc.value) : null;
        qualitativeNote    = unc.description ?? null;
      }
    }
  }

  return {
    key: p.key || '',
    xsiType: p.xsiType || 'stringType',
    plannedValue : experimentInstructionDetails.find((e) => e.prop_key == p.key)?.expected_value ?? undefined,
    value: p.value ?? undefined,
    units: p.units || undefined,
    description: p.description ?? null,
    toleranceValue,
    uncertaintyNote,
    uncertaintyName,
    toleranceValues: toleranceValues.length > 0 ? toleranceValues : null,
    qualitativeOptions,
    qualitativeEval,
    qualitativeNote,
    qualitativeKey,
    // uncertainty[] 配列をそのまま保持する（フロントエンドの保存ロジックが
    // 定性評価選択値・理由を uncertainty[].value / description に書き込むために参照する）
    uncertainty: p.uncertainty ?? [],
    // ネスト構造を再帰的に変換（深さ制限で無限ループ防止）
    properties: depth < MAX_DEPTH
      ? (p.properties || []).map(child => convertPropertyForFallback(child, depth + 1,experimentInstructionDetails, uncertaintyDetailMap))
      : [],
    // Content 子要素も変換（Content はリーフノードとして扱うため properties/contents は空配列）
    contents: depth < MAX_DEPTH
      ? (p.contents || []).map(c => ({
          key: c.key || '',
          xsiType: c.xsiType || 'contentStringListType',
          value: c.value ?? undefined,
          units: c.units || undefined,
          properties: [] as Property[],
          contents: [] as Content[],
        }))
      : [],
  };
}

/**
 * 0件時フォールバック: MAIMLテンプレート定義からレスポンスを生成
 *
 * @description
 * filteredRecords が 0 件の場合に呼び出す。
 * taskRegistrationService.ts の deleteAndInsertTemplateData と同一ロジックで
 * MAIMLのテンプレート定義から初期値（value: null）のプロパティを生成して返す。
 *
 * @param parser - MaimlParserTyped インスタンス
 * @param methodId - メソッドID
 * @param adjacentPlaceIds - 隣接プレースIDの配列
 * @param uncertaintyDetailMap - uncertainty key → DB詳細のマップ
 * @returns フォールバック用 TemplateDataItem 配列
 */
function buildFallbackTemplates(
  parser: MaimlParserTyped,
  methodId: string,
  adjacentPlaceIds: string[],
  experimentInstructionDetails: ExperimentInstructionDetail[],
  uncertaintyDetailMap?: Map<string, UncertaintyKeyDetail>
): TemplateDataItem[] {
  const methods = parser.getMethods();
  const method = methods.find(m => m.id === methodId);
  if (!method) {
    // メソッドが見つからない場合は空配列を返す（呼び出し元で存在確認済みのため通常到達しない）
    return [];
  }

  // method直下 + program配下のテンプレートを統合
  // （MAIMLファイルではテンプレートが program 直下に定義される場合が多いため）
  const allMaterialTemplates = [
    ...method.materialTemplates,
    ...method.program.flatMap(p => p.materialTemplates),
  ];
  const allConditionTemplates = [
    ...method.conditionTemplates,
    ...method.program.flatMap(p => p.conditionTemplates),
  ];
  const allResultTemplates = [
    ...method.resultTemplates,
    ...method.program.flatMap(p => p.resultTemplates),
  ];

  console.log(allResultTemplates);

  const templateCategories: Array<{
    templates: typeof method.materialTemplates;
    templateType: 'material' | 'condition' | 'result';
  }> = [
    { templates: allMaterialTemplates, templateType: 'material' },
    { templates: allConditionTemplates, templateType: 'condition' },
    { templates: allResultTemplates,    templateType: 'result' },
  ];

  const fallbackTemplates: TemplateDataItem[] = [];

  for (const { templates, templateType } of templateCategories) {
    if (!templates) continue;

    // 単一要素・配列の両方に対応（taskRegistrationService.ts と同一パターン）
    const templateArray = Array.isArray(templates) ? templates : [templates];

    for (const template of templateArray) {
      if (!template.placeRefs || template.placeRefs.length === 0) continue;

      const templatesInstructions = experimentInstructionDetails.filter((e) => e.template_id = template.id);

      // このテンプレートのプロパティ定義を構築
      // convertPropertyForFallback で子要素（properties/contents）を再帰的に変換する
      const properties = (template.properties || []).map(p =>
        convertPropertyForFallback(p, 0,templatesInstructions, uncertaintyDetailMap)
      );

      // テンプレートトップレベルの contents を変換してフロントへ渡す
      // Content はリーフノードとして扱うため properties/contents は空配列
      const contents = (template.contents || []).map(c => ({
        key: c.key || '',
        xsiType: c.xsiType || 'contentStringListType',
        value: c.value ?? undefined,
        units: c.units || undefined,
        properties: [] as Property[],
        contents: [] as Content[],
      }));

      // insertion を insertions 配列に変換（単数→配列）
      const insertions = template.insertion ? [template.insertion] : [];

      const propertySet: PropertySet = {
        templateId: template.id || '',
        templateType,
        templateName: template.name ?? null,
        properties: properties as unknown as Property[],
        contents: contents as unknown as Content[],
        ...(insertions.length > 0 && { insertions }),
      };

      const data: Record<string, unknown> = propertySet as unknown as Record<string, unknown>;

      // 各 placeRef ごとに1エントリ生成
      // adjacentPlaceIds が空の場合はフィルタなし（全プレースを対象にする）
      for (const placeRef of template.placeRefs) {
        const placeId = placeRef.ref || '';
        if (!placeId) continue;
        if (adjacentPlaceIds.length > 0 && !adjacentPlaceIds.includes(placeId)) continue;

        fallbackTemplates.push({
          placeId,
          templateType,
          templateId: template.id || '',
          data,
          recordedBy: null,
          recordedAt: null,
        });
      }
    }
  }

  return fallbackTemplates;
}

/**
 * 実験データを一括保存する（関数版）
 */
export async function saveBatchData(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  records: TemplateDataRecord[],
  recordedBy: string,
  transitionId?: string,
  uncertaintyValues?: UncertaintyValueInput[],
  qualitativeValues?: Array<{
    propKey: string;
    templateId: string;
    value: string;
    uncertaintyKey?: string | null;
    nameSpaceId?: string | null;
  }>
): Promise<{ savedRecords: TemplateDataRow[]; judgeResults: UncertaintyJudgeResult[] }> {
  const service = new ExperimentDataService();
  return service.saveBatchData(organizationId, projectId, methodId, taskNo, records, recordedBy, transitionId, uncertaintyValues, qualitativeValues);
}
