/**
 * ExperimentDataService
 * 
 * 実験データ管理のビジネスロジックを提供します。
 * 
 * @note トランジションステータス更新機能はprogressService.tsに移動しました（2026-02-18）
 */

import { TemplateDataRepository, TemplateDataRecord, TemplateDataRow, PropertySet } from '../repositories/templateDataRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { getUseDeemedProgress } from '../repositories/organizationRepository';
import { TransitionStatusEnum } from '../types/transitionData';
import { logger } from '../utils/logger';

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
   * @param projectName プロジェクト名
   * @param methodId メソッドID
   * @param taskNo タスク番号
   * @param records 保存するレコード配列
   * @param recordedBy 記録者のユーザーID
   * @returns 保存されたレコード配列
   */
  async saveBatchData(
    organizationId: string,
    projectName: string,
    methodId: string,
    taskNo: number,
    records: TemplateDataRecord[],
    recordedBy: string
  ): Promise<TemplateDataRow[]> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query('BEGIN');

      // 1. プロジェクト名からプロジェクトIDとステータスを取得（外部SQLファイル使用）
      const projectQuery = await loadSqlFile('projects/findByNameWithStatus.sql');
      const projectResult = await client.query(
        projectQuery,
        [organizationId, projectName]
      );

      if (projectResult.rows.length === 0) {
        const error: any = new Error('Project not found or does not belong to your organization');
        error.name = 'ProjectNotFoundError';
        throw error;
      }

      const projectId = projectResult.rows[0].project_id;
      const projectStatus = projectResult.rows[0].project_status;

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

      // トランザクションコミット
      await client.query('COMMIT');

      return savedRecords;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param taskNo タスク番号
 * @param transitionId トランジションID
 * @returns 隣接プレースの実績データ
 */
export async function getTemplateData(
  organizationId: string,
  projectName: string,
  methodId: string,
  taskNo: number,
  transitionId: string
): Promise<GetTemplateDataResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. project_id を解決
    const projectIdQuery = await loadSqlFile('projects/findIdByName.sql');
    const projectResult = await client.query(projectIdQuery, [organizationId, projectName]);

    if (projectResult.rows.length === 0) {
      const error: any = new Error(`Project not found: ${projectName}`);
      error.name = 'ProjectNotFoundError';
      throw error;
    }
    const projectId: string = projectResult.rows[0].project_id;

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
    const storageService = getStorageService();
    const maimlPath = `projects/${projectName}/${projectName}.maiml`;
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

    // 8. placeId ごとに DB実績 or フォールバックを選択
    // （一部のみ保存済みの場合に、未保存のplaceIdがレスポンスから欠損しないようにするため）
    const fallbackAll = buildFallbackTemplates(parser, methodId, adjacentPlaceIds);

    const templates: TemplateDataItem[] = adjacentPlaceIds.map(placeId => {
      // DBにそのplaceIdのレコードが存在するか確認
      const dbRecord = filteredRecords.find((r: TemplateDataRow) => r.place_id === placeId);

      if (dbRecord) {
        // 8-a. DB実績データを property_set から取り出してマッピング
        const ps: PropertySet | null = dbRecord.property_set;
        return {
          placeId: dbRecord.place_id,
          templateType: ps?.templateType ?? '',
          templateId: ps?.templateId ?? '',
          data: ps as unknown as Record<string, unknown> ?? {},
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
 * @returns フォールバック用 TemplateDataItem 配列
 */
function buildFallbackTemplates(
  parser: MaimlParserTyped,
  methodId: string,
  adjacentPlaceIds: string[]
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

      // このテンプレートのプロパティ定義を構築（MAIMLのvalue要素から値を取得）
      const properties = (template.properties || []).map(p => ({
        key: p.key || '',
        xsiType: p.xsiType || 'stringType',
        value: p.value ?? null,
        units: p.units || null,
      }));

      const propertySet: PropertySet = {
        templateId: template.id || '',
        templateType,
        properties,
      };

      const data: Record<string, unknown> = propertySet as unknown as Record<string, unknown>;

      // 各 placeRef ごとに1エントリ生成（隣接プレースIDに一致するもののみ）
      for (const placeRef of template.placeRefs) {
        const placeId = placeRef.ref || '';
        if (!placeId) continue;
        if (!adjacentPlaceIds.includes(placeId)) continue;

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
  pool: import('pg').Pool,
  client: import('pg').PoolClient
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
  let parser: MaimlParserTyped;
  try {
    const storageService = getStorageService();
    const maimlPath = `projects/${projectName}/${projectName}.maiml`;
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

    // transition_data を更新
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
  projectName: string,
  methodId: string,
  taskNo: number,
  records: TemplateDataRecord[],
  recordedBy: string
): Promise<TemplateDataRow[]> {
  const service = new ExperimentDataService();
  return service.saveBatchData(organizationId, projectName, methodId, taskNo, records, recordedBy);
}
