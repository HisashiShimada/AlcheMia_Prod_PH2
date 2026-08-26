/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジックを提供します。
 * 
 * @note トランジションステータス更新機能はprogressService.tsに移動しました（2026-02-18）
 */

import { TemplateDataRepository, TemplateDataRecord, TemplateDataRow, PropertySet } from '../repositories/templateDataRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { EventLogRepository } from '../repositories/eventLogRepository';
import * as experimentInstructionDetailRepository from '../repositories/experimentInstructionDetailRepository';
import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { getUseDeemedProgress } from '../repositories/organizationRepository';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { TransitionStatusEnum } from '../types/transitionData';
import { logger } from '../utils/logger';
import type { Pool, PoolClient } from 'pg';
import type { Property, Content } from '../types/maiml-unified';
import { findByKeysWithDetails, UncertaintyKeyDetail, QualitativeOptionRow } from '../repositories/uncertaintyCriteriaRepository';
import { runJudge, UncertaintyValueInput, UncertaintyJudgeResult } from './uncertaintyJudgeService';

/**
 * プロジェクト編集不可エラー
 */
export class ProjectNotEditableError extends Error {
  constructor(projectStatus: string) {
    super(`Project is not editable. Current status: ${projectStatus}. Editable statuses are: draft, active, waiting_approval.`);
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
      placeId: string;
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

      // 編集可能なステータスかチェック（2:タスク実行中）
      const editableStatuses = [2];
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

      // 4. みなし進捗の更新（use_deemed_progress = true の組織のみ）
      await updateDeemedProgress(
        organizationId,
        projectId,
        projectName,
        methodId,
        taskNo,
        savedRecords,
        recordedBy,
        pool,
        client
      );

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
      propKey: string; placeId: string; value: string;
      uncertaintyKey?: string | null; nameSpaceId?: string | null;
    }> | undefined,
    updateUserId: string
  ): Promise<void> {
    // placeId → 定量不確かさ情報マップ（propKey → 最新1件）
    const quantMap = new Map<string, UncertaintyValueInput>();
    for (const uv of (uncertaintyValues ?? [])) {
      quantMap.set(`${uv.placeId}__${uv.propertyKey}`, uv);
    }

    // placeId → 定性評価マップ（propKey → 値）
    const qualMap = new Map<string, { value: string; uncertaintyKey?: string | null; nameSpaceId?: string | null }>();
    for (const qv of (qualitativeValues ?? [])) {
      qualMap.set(`${qv.placeId}__${qv.propKey}`, qv);
    }

    for (const row of savedRecords) {
      const ps = row.property_set;
      if (!ps) continue;
      const templateName = ps.templateName ?? ps.templateId ?? '';
      if (!templateName) continue;

      for (const prop of (ps.properties ?? [])) {
        const propKey = (prop as unknown as Record<string, unknown>)['key'] as string | undefined;
        if (!propKey) continue;

        const actualValue = (() => {
          const content = (prop as unknown as Record<string, unknown>)['content'] as Record<string, unknown> | undefined;
          if (!content) return null;
          const v = content['value'];
          return v != null ? String(v) : null;
        })();

        const mapKey = `${row.place_id}__${propKey}`;
        const quant = quantMap.get(mapKey);
        const qual = qualMap.get(mapKey);

        await experimentInstructionDetailRepository.updateActualAndUncertainty({
          organizationId,
          projectId,
          methodId,
          taskNo,
          transitionId,
          templateName,
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

    // 8b. placeId ごとに DB実績 or フォールバックを選択
    // （一部のみ保存済みの場合に、未保存のplaceIdがレスポンスから欠損しないようにするため）
    const fallbackAll = buildFallbackTemplates(parser, methodId, adjacentPlaceIds, uncertaintyDetailMap);

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
          (p) => convertPropertyForFallback(p, 0, uncertaintyDetailMap)
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

        const enrichedPs = ps != null
          ? { ...ps, properties: enrichedProperties }
          : { properties: enrichedProperties };
        return {
          placeId: dbRecord.place_id,
          templateType: ps?.templateType ?? '',
          templateId: ps?.templateId ?? '',
          data: enrichedPs as unknown as Record<string, unknown>,
          recordedBy: dbRecord.update_user_id ?? null,
          recordedAt: dbRecord.update_at instanceof Date
            ? dbRecord.update_at.toISOString()
            : (dbRecord.update_at != null ? String(dbRecord.update_at) : null),
        } as TemplateDataItem;
      } else {
        // 8-b. フォールバック: MAIMLテンプレート定義から初期値を使用
        const fallback = fallbackAll.find(f => f.placeId === placeId);
        return fallback ?? null;
      }
    }).filter((item): item is TemplateDataItem => item !== null);

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

  if (uncertaintyDetailMap && p.uncertainty && p.uncertainty.length > 0) {
    for (const unc of p.uncertainty) {
      const key = unc.key ?? '';
      const detail = uncertaintyDetailMap.get(key);
      // evaluationMethod 1=定量, 2=定性。DB に存在しないキーは定量として扱う
      const isQualitative = detail?.evaluationMethod === 2;

      if (!isQualitative && toleranceValue === null) {
        // 定量: 最初の1件（value は number | boolean の可能性もあるため String() で変換）
        toleranceValue   = unc.value     != null ? String(unc.value) : null;
        uncertaintyNote  = unc.description ?? null;
        uncertaintyName  = detail?.termDisplayName ?? null;
      } else if (isQualitative && qualitativeOptions.length === 0) {
        // 定性: 最初の1件
        qualitativeOptions = detail?.qualitativeOptions ?? [];
        qualitativeEval    = unc.value     != null ? String(unc.value) : null;
        qualitativeNote    = unc.description ?? null;
      }
    }
  }

  return {
    key: p.key || '',
    xsiType: p.xsiType || 'stringType',
    value: p.value ?? undefined,
    units: p.units || undefined,
    description: p.description ?? null,
    toleranceValue,
    uncertaintyNote,
    uncertaintyName,
    qualitativeOptions,
    qualitativeEval,
    qualitativeNote,
    // ネスト構造を再帰的に変換（深さ制限で無限ループ防止）
    properties: depth < MAX_DEPTH
      ? (p.properties || []).map(child => convertPropertyForFallback(child, depth + 1, uncertaintyDetailMap))
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

      // このテンプレートのプロパティ定義を構築
      // convertPropertyForFallback で子要素（properties/contents）を再帰的に変換する
      const properties = (template.properties || []).map(p =>
        convertPropertyForFallback(p, 0, uncertaintyDetailMap)
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
 * みなし進捗の更新処理
 *
 * @description
 * template_data の UPSERT 完了後に呼び出す。
 * 自組織の use_deemed_progress フラグが true の場合のみ動作する。
 * 保存されたプレースIDからMAIMLのアーク情報を用いてトランジションIDを解決し、
 * transition_data の status / progress_rate を自動更新する。
 *
 * ステータス決定ルール（バリデーションなし）:
 *   - 実績登録済み数 === 0         → スキップ（変更なし）
 *   - 実績登録済み数 < 総プレース数 → IN_PROGRESS (3)
 *   - 実績登録済み数 === 総プレース数 → COMPLETED (5)
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param projectName - プロジェクト名（MAIMLパス解決用）
 * @param methodId - メソッドID
 * @param taskNo - タスク番号
 * @param savedRecords - UPSERTで保存されたtemplate_dataレコード
 * @param updatedBy - 更新者ユーザーID
 * @param pool - データベース接続プール
 * @param client - トランザクション用PoolClient
 */
async function updateDeemedProgress(
  organizationId: string,
  projectId: string,
  projectName: string,
  methodId: string,
  taskNo: number,
  savedRecords: TemplateDataRow[],
  updatedBy: string,
  pool: Pool,
  client: PoolClient
): Promise<void> {
  // 1. みなし進捗フラグを確認
  let useDeemedProgress: boolean;
  try {
    useDeemedProgress = await getUseDeemedProgress(pool, organizationId);
  } catch (err) {
    logger.warn('[ExperimentDataService] みなし進捗フラグ取得失敗。スキップします。', { organizationId, err });
    return;
  }

  if (!useDeemedProgress) {
    return;
  }

  // 2. MAIMLをダウンロード＆パース
  // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
  let parser: MaimlParserTyped;
  try {
    const storageService = getStorageService();
    const maimlPath = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const maimlBuffer = await storageService.downloadFile(organizationId, maimlPath);
    parser = new MaimlParserTyped(maimlBuffer.toString('utf-8'));
  } catch (err) {
    logger.warn('[ExperimentDataService] MAIMLダウンロード/パース失敗。みなし進捗をスキップします。', { organizationId, projectName, err });
    return;
  }

  // 3. 対象メソッドのアーク情報を取得
  const methods = parser.getMethods();
  const targetMethod = methods.find(m => m.id === methodId);
  if (!targetMethod) {
    logger.warn('[ExperimentDataService] みなし進捗: メソッドが見つかりません。スキップします。', { methodId });
    return;
  }
  const pnmlArcs = targetMethod.pnml.arcs || [];

  // 4. 保存されたplaceIdのユニーク一覧を取得
  const savedPlaceIds = [...new Set(savedRecords.map(r => r.place_id))];

  // 5. placeId → transitionId のマッピングを構築（アーク経由）
  //    また transitionId → 接続全placeIds のマッピングも同時構築
  const transitionToAllPlaceIds = new Map<string, Set<string>>();

  for (const arc of pnmlArcs) {
    const source = arc.source || '';
    const target = arc.target || '';
    if (!source || !target) continue;

    // アークのsourceがtransition、targetがplaceの場合
    // アークのtargetがtransition、sourceがplaceの場合
    // transition_data のトランジションIDはpnmlのtransitionsから特定する
    const pnmlTransitions = targetMethod.pnml.transitions || [];
    const pnmlPlaces = targetMethod.pnml.places || [];

    const sourceIsTransition = pnmlTransitions.some(t => t.id === source);
    const targetIsTransition = pnmlTransitions.some(t => t.id === target);
    const sourceIsPlace = pnmlPlaces.some(p => p.id === source);
    const targetIsPlace = pnmlPlaces.some(p => p.id === target);

    let transitionId: string | null = null;
    let placeId: string | null = null;

    if (sourceIsTransition && targetIsPlace) {
      transitionId = source;
      placeId = target;
    } else if (targetIsTransition && sourceIsPlace) {
      transitionId = target;
      placeId = source;
    }

    if (transitionId && placeId) {
      if (!transitionToAllPlaceIds.has(transitionId)) {
        transitionToAllPlaceIds.set(transitionId, new Set());
      }
      transitionToAllPlaceIds.get(transitionId)!.add(placeId);
    }
  }

  // 6. 今回保存されたplaceIdが属するtransitionIdを特定
  const affectedTransitionIds = new Set<string>();
  for (const placeId of savedPlaceIds) {
    for (const [transitionId, placeIds] of transitionToAllPlaceIds.entries()) {
      if (placeIds.has(placeId)) {
        affectedTransitionIds.add(transitionId);
      }
    }
  }

  if (affectedTransitionIds.size === 0) {
    logger.warn('[ExperimentDataService] みなし進捗: 保存placeIdに対応するtransitionが見つかりません。', { savedPlaceIds });
    return;
  }

  // 7. 各transitionIdについてstatus/progress_rateを算出し更新
  const transitionRepo = new TransitionDataRepository();

  for (const transitionId of affectedTransitionIds) {
    const allPlaceIds = transitionToAllPlaceIds.get(transitionId);
    if (!allPlaceIds || allPlaceIds.size === 0) continue;

    const totalCount = allPlaceIds.size;
    const allPlaceIdsArray = [...allPlaceIds];

    // 実績登録済みplaceIdをDBからカウント（template_dataに実績があるもの）
    let registeredCount = 0;
    try {
      const countSql = await loadSqlFile('template_data/countActualByPlaceIds.sql');
      const countRows = await client.query<{ template_type: string; count: string }>(
        countSql,
        [organizationId, projectId, methodId, taskNo, allPlaceIdsArray]
      );
      // templateType関係なく全件合算
      registeredCount = countRows.rows.reduce((sum, row) => sum + Number(row.count), 0);
    } catch (err) {
      logger.error('[ExperimentDataService] みなし進捗: 実績数カウント失敗。スキップします。', { transitionId, err });
      continue;
    }

    // 実績0件はスキップ
    if (registeredCount === 0) {
      continue;
    }

    // status / progress_rate を決定
    const newStatus = registeredCount >= totalCount
      ? TransitionStatusEnum.COMPLETED
      : TransitionStatusEnum.IN_PROGRESS;
    const newProgressRate = Math.min(100, Math.round(registeredCount / totalCount * 100));

    // transition_data を更新し、イベントログを記録
    try {
      await transitionRepo.updateStatusDeemed(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        newStatus,
        newProgressRate,
        updatedBy,
        client
      );
      logger.info('[ExperimentDataService] みなし進捗: transition_data を更新しました。', {
        transitionId,
        newStatus,
        newProgressRate,
        registeredCount,
        totalCount,
      });

      // みなし進捗更新イベントログを記録
      // statusLabel: IN_PROGRESS(3) → "running", COMPLETED(5) → "completed"
      const deemedStatusLabelMap: Record<number, string> = {
        [TransitionStatusEnum.IN_PROGRESS]: 'running',
        [TransitionStatusEnum.COMPLETED]: 'completed',
      };
      const deemedStatusLabel = deemedStatusLabelMap[newStatus] ?? String(newStatus);

      // MAIMLパーサーからprogramId / instructionId を取得
      // log/@ref = methodId, trace/@ref = programId, event/@ref = instructionId
      let deemedProgramId: string | null = null;
      let deemedInstructionId: string | null = null;
      try {
        const parsedMethods = parser.getMethods();
        const targetMethodForLog = parsedMethods.find(m => m.id === methodId);
        if (targetMethodForLog) {
          const pnmlTransitionsForLog = targetMethodForLog.pnml.transitions || [];
          const transitionForLog = pnmlTransitionsForLog.find(t => t.id === transitionId);
          if (transitionForLog) {
            // pnml.transitions の各トランジションは program 属性を持つ場合がある
            deemedProgramId = (transitionForLog as any).program ?? null;
          }
          // instructionId は program 要素配下の instruction から取得
          const programElements = targetMethodForLog.program || [];
          const programArr = Array.isArray(programElements) ? programElements : [programElements];
          for (const prog of programArr) {
            if (!prog) continue;
            // program.id を programId として使用
            if (!deemedProgramId && prog.id) {
              deemedProgramId = prog.id;
            }
            // instruction を探してinstructionIdを取得
            const instructions = prog.instructions || [];
            const instructionArr = Array.isArray(instructions) ? instructions : [instructions];
            for (const instr of instructionArr) {
              // transitionRef は Reference 型（{ ref: string } または string）
              const instrTransitionRef = typeof instr?.transitionRef === 'string'
                ? instr.transitionRef
                : (instr?.transitionRef as any)?.ref ?? '';
              if (instr && instrTransitionRef === transitionId) {
                deemedInstructionId = instr.id ?? null;
                break;
              }
            }
            if (deemedInstructionId) break;
          }
        }
      } catch (maimlIdErr) {
        logger.warn('[ExperimentDataService] みなし進捗: programId/instructionId取得失敗。フォールバックを使用。', {
          transitionId, maimlIdErr,
        });
      }

      // result-type place IDs の収集（event/resultsRef に使用）
      // トランジションに接続する result-type プレースのIDを取得する
      let deemedResultsRefs: string[] | null = null;
      try {
        const allPlaceIds = transitionToAllPlaceIds.get(transitionId);
        if (allPlaceIds && allPlaceIds.size > 0) {
          const pnmlPlaces = targetMethod.pnml.places || [];
          const resultIds = [...allPlaceIds].filter(pid => {
            const place = pnmlPlaces.find((p: any) => p.id === pid);
            // placeのstereotype/type情報はpnml.placesの各要素のデータから取得
            // MAIMLパーサーによってstereotypeが設定される場合がある
            return place && (
              (place as any).stereotype === 'resultTemplate' ||
              (place as any).data?.stereotype === 'resultTemplate'
            );
          });
          if (resultIds.length > 0) {
            deemedResultsRefs = resultIds;
          }
        }
      } catch (resultRefErr2) {
        logger.warn('[ExperimentDataService] みなし進捗: resultsRefs 取得失敗。resultsRef なしで記録します。', {
          transitionId, resultRefErr2,
        });
      }

      try {
        const eventLogRepository = new EventLogRepository();
        await eventLogRepository.insertTransitionProgressLog(
          organizationId,
          projectId,
          transitionId,
          updatedBy,
          deemedStatusLabel,
          newProgressRate,
          null, // みなし進捗は自動更新のためコメントなし
          client,
          methodId,           // log/@ref = methodId
          deemedProgramId,    // trace/@ref = programId（MAIMLから取得）
          deemedInstructionId, // event/@ref = instructionId（MAIMLから取得）
          deemedResultsRefs   // event/resultsRef = result-type place IDs
        );
      } catch (logErr) {
        // イベントログ記録失敗はwarningログを出力し、メイン処理は継続
        logger.warn('[ExperimentDataService] みなし進捗: イベントログ記録失敗。処理は継続します。', {
          transitionId,
          logErr,
        });
      }
    } catch (err) {
      logger.error('[ExperimentDataService] みなし進捗: transition_data 更新失敗。スキップします。', { transitionId, err });
      // 1件の更新失敗はスキップ（トランザクション全体はロールバックしない）
    }
  }
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
    placeId: string;
    value: string;
    uncertaintyKey?: string | null;
    nameSpaceId?: string | null;
  }>
): Promise<{ savedRecords: TemplateDataRow[]; judgeResults: UncertaintyJudgeResult[] }> {
  const service = new ExperimentDataService();
  return service.saveBatchData(organizationId, projectId, methodId, taskNo, records, recordedBy, transitionId, uncertaintyValues, qualitativeValues);
}
