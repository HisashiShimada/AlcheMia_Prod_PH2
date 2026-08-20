/**
 * Task Registration Service
 * 
 * タスク登録のビジネスロジック
 * 
 * @module taskRegistrationService
 * @version 1.0.0
 * @date 2026-02-20
 */

import * as projectRepository from '../repositories/projectRepository';
import { Project } from '../types/database';
import * as instructionRepository from '../repositories/instructionRepository';
import * as projectTaskRepository from '../repositories/projectTaskRepository';
import * as projectTaskDetailRepository from '../repositories/projectTaskDetailRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { TemplateDataRepository } from '../repositories/templateDataRepository';
import * as experimentPlanRepository from '../repositories/experimentPlanRepository';
import type {
  GetTaskRegistrationResponse,
  TaskRegistrationData,
  SaveTaskRegistrationRequest,
  SaveTaskRegistrationResponse
} from '../types/taskRegistration';
import { getPgp } from '../database/db';
import type { PoolClient } from 'pg';
import type { ProjectTask } from '../types/database';
import { getStorageService } from './storageService';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { logger } from '../utils/logger';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { CheckoutStatusEnum } from '../enums/codeMaster.enum';

const transitionDataRepository = new TransitionDataRepository();
const templateDataRepository = new TemplateDataRepository();

/**
 * タスク登録情報を取得
 * 
 * @param projectId - プロジェクトID（UUID）
 * @param organizationId - 組織ID
 * @returns {Promise<GetTaskRegistrationResponse>} タスク登録情報
 */
export async function getTaskRegistration(
  projectId: string,
  organizationId: string
): Promise<GetTaskRegistrationResponse> {
  // 1. プロジェクト情報を取得（projectId で検索）
  const project = await projectRepository.findByIdFull(organizationId, projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  const projectName = project.project_name ?? '';
  
  // 2. チェックアウト状態を確認
  const isCheckoutLocked = project.checkout_status === CheckoutStatusEnum.CHECKED_OUT;

  // 3. MAIMLファイル登録状態をストレージ実態で確認（DBフラグは古い場合があるため）
  let isMaimlRegistered = project.project_maiml_flg === true;
  try {
    const maimlFilePathForCheck = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const storageService = getStorageService();
    const maimlExists = await storageService.fileExists(organizationId, maimlFilePathForCheck);
    if (maimlExists && !isMaimlRegistered) {
      // ストレージには存在するがDBフラグが false → 自動修復
      logger.warn('[TaskRegistrationService] project_maiml_flg不整合を検出。DBフラグを自動修復します。', {
        projectId,
        organizationId,
        dbFlag: isMaimlRegistered,
        storageExists: maimlExists,
      });
      const updatedProject: Project = {
        ...project,
        project_maiml_flg: true,
      };
      await projectRepository.update(updatedProject);
      isMaimlRegistered = true;
    } else if (!maimlExists) {
      // ストレージにも存在しない → フラグが true でも false に修復
      if (isMaimlRegistered) {
        logger.warn('[TaskRegistrationService] ストレージにMAIMLなし。DBフラグをfalseに修復します。', {
          projectId,
          organizationId,
        });
        const updatedProject: Project = {
          ...project,
          project_maiml_flg: false,
        };
        await projectRepository.update(updatedProject);
      }
      isMaimlRegistered = false;
    }
  } catch (storageCheckError) {
    // ストレージ確認失敗時はDBフラグにフォールバック（処理は継続）
    logger.warn('[TaskRegistrationService] MAIMLストレージ確認失敗、DBフラグで判定継続:', { error: String(storageCheckError) });
  }

  // 4. project_taskテーブルから全タスクを取得
  const dbTasks = await projectTaskRepository.findByProject(organizationId, project.project_id);
  
  // 4. DBの全タスクをUI用の形式に変換
  let tasks: TaskRegistrationData[] = dbTasks.map((task: ProjectTask, index: number): TaskRegistrationData => ({
    methodId: task.method_id,
    experimentCondition: task.experiment_condition || 0,
    trialCount: task.attempts_count || 1,
    experimentOrder: task.experiment_order || index + 1,
    workerLinkedFlg: task.worker_linked_flg || false
  }));
  
  // 5. MAIMLファイルが登録されていて、かつチェックイン状態（編集可能）の場合のみ差分メソッドを検出して追加
  if (isMaimlRegistered && !isCheckoutLocked) {
    try {
      // MAIMLファイルを取得してパース
      // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
      const maimlFilePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
      const storageService = getStorageService();
      const maimlBuffer = await storageService.downloadFile(organizationId, maimlFilePath);
      const maimlContent = maimlBuffer.toString('utf-8');
      const parser = new MaimlParserTyped(maimlContent);
      
      // MAIMLから全メソッドを取得
      const maimlMethods = parser.getMethods();
      
      // DBのworker_linked_flg=falseメソッドIDセットを作成
      const falseFlagMethodIds = new Set(
        dbTasks
          .filter(task => task.worker_linked_flg === false)
          .map(task => task.method_id)
      );
      
      // MAIMLにあるが、DBのFALSEメソッドに存在しないメソッドを検出
      // （TRUEメソッドと重複するものも差分として検出される）
      const newMethods = maimlMethods.filter(method => 
        method.id && !falseFlagMethodIds.has(method.id)
      );
      
      // 新規メソッドを初期データとして追加
      const newTasks: TaskRegistrationData[] = newMethods.map((method, index): TaskRegistrationData => ({
        methodId: method.id || '',
        experimentCondition: 0, // デフォルト値
        trialCount: 1, // デフォルト値
        experimentOrder: tasks.length + index + 1, // 既存タスクの後ろに追加
        workerLinkedFlg: false
      }));
      
      // 既存タスクと新規タスクを統合
      tasks = [...tasks, ...newTasks];
      
      console.log('[TaskRegistrationService] MAIML差分検出:', {
        maimlMethodCount: maimlMethods.length,
        dbTaskCount: dbTasks.length,
        dbFalseFlagCount: falseFlagMethodIds.size,
        newMethodCount: newMethods.length,
        totalTaskCount: tasks.length
      });
      
    } catch (error) {
      // MAIMLパースエラーは警告ログのみ（処理は継続）
      console.warn('[TaskRegistrationService] MAIML解析エラー（処理は継続）:', error);
    }
  }
  
  return {
    tasks,
    isCheckoutLocked,
    isMaimlRegistered
  };
}

/**
 * タスク登録情報を保存
 * 
 * @param projectId - プロジェクトID（UUID）
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @param requestData - 保存リクエストデータ
 * @returns {Promise<SaveTaskRegistrationResponse>} 保存結果
 */
export async function saveTaskRegistration(
  projectId: string,
  organizationId: string,
  userId: string,
  requestData: SaveTaskRegistrationRequest
): Promise<SaveTaskRegistrationResponse> {
  const pgp = getPgp();
  
  // 1. プロジェクト情報を取得（トランザクション外）
  const project = await projectRepository.findByIdFull(organizationId, projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  const projectName = project.project_name ?? '';
  
  // 2. チェックアウト状態を確認
  if (project.checkout_status === CheckoutStatusEnum.CHECKED_OUT) {
    throw new Error('Project is checked out. Cannot save task registration.');
  }
  
  // 3. MAIMLファイル登録状態をストレージ実態で確認（DBフラグは古い場合があるため）
  try {
    const maimlFilePathForCheck = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const storageService = getStorageService();
    const maimlExists = await storageService.fileExists(organizationId, maimlFilePathForCheck);
    if (!maimlExists) {
      throw new Error('MAIML file is not registered. Cannot save task registration.');
    }
    // ストレージに存在するがDBフラグが false → 自動修復
    if (maimlExists && project.project_maiml_flg !== true) {
      logger.warn('[TaskRegistrationService][save] project_maiml_flg不整合を検出。DBフラグを自動修復します。', {
        projectId,
        organizationId,
      });
      const updatedProject: Project = {
        ...project,
        project_maiml_flg: true,
      };
      await projectRepository.update(updatedProject);
    }
  } catch (storageCheckError) {
    if ((storageCheckError as Error).message?.includes('Cannot save task registration')) {
      throw storageCheckError;
    }
    // ストレージ確認失敗時はDBフラグにフォールバック
    logger.warn('[TaskRegistrationService][save] MAIMLストレージ確認失敗、DBフラグで判定:', { error: String(storageCheckError) });
    if (project.project_maiml_flg !== true) {
      throw new Error('MAIML file is not registered. Cannot save task registration.');
    }
  }
  
  // 4. バリデーション
  if (!requestData.tasks || requestData.tasks.length === 0) {
    throw new Error('Tasks are required');
  }
  
  for (const task of requestData.tasks) {
    if (!task.methodId) {
      throw new Error('Method ID is required for all tasks');
    }
    if (task.trialCount < 1 || task.trialCount > 999) {
      throw new Error('Trial count must be between 1 and 999');
    }
  }
  
  // 5. MAIMLファイルをパース（トランザクション外）
  // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
  const storageService = getStorageService();
  const maimlFilePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
  const maimlBuffer = await storageService.downloadFile(organizationId, maimlFilePath);
  const maimlContent = maimlBuffer.toString('utf-8');
  const parser = new MaimlParserTyped(maimlContent);
  
  // 6. トランザクション内でDB操作を実行
  return await pgp.tx(async (t) => {
    // 6-1. project_taskテーブルへ削除→INSERT
    // 6-1-1. worker_linked_flg=falseのタスクを削除
    await projectTaskRepository.deleteByProjectAndWorkerLinkedFlg(
      t,
      organizationId,
      project.project_id,
      false
    );
    
    // 6-1-2. リクエストのタスクを新規INSERT
    await projectTaskRepository.batchInsertTasks(
      t,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks.map(task => ({
        methodId: task.methodId,
        experimentOrder: task.experimentOrder,
        experimentCondition: task.experimentCondition,
        trialCount: task.trialCount,
        workerLinkedFlg: task.workerLinkedFlg || false
      }))
    );
    
    // 6-2. project_task_detailテーブルへの処理
    // task_status=0（未着手）のレコードのみ削除 → 連番で追加
    // batchInsert内で既存の最大task_no+1から採番される
    await projectTaskDetailRepository.deleteByProjectAndStatus(
      t,
      organizationId,
      project.project_id,
      0 // task_status=0（未着手）のみ削除
    );
    await projectTaskDetailRepository.batchInsert(
      t,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks.map(task => ({
        methodId: task.methodId,
        trialCount: task.trialCount
      }))
    );
    
    // 6-3. transition_dataテーブルへ削除＋INSERT
    await deleteAndInsertTransitionData(
      t as any, // 既存のRepositoryがPoolClientを期待しているため、一時的にany
      organizationId,
      project.project_id,
      userId,
      requestData.tasks,
      parser
    );
    
    // 6-4. template_dataテーブルへ削除＋INSERT
    await deleteAndInsertTemplateData(
      t as any, // 既存のRepositoryがPoolClientを期待しているため、一時的にany
      organizationId,
      project.project_id,
      userId,
      requestData.tasks,
      parser
    );
    
    // 6-5. experiment_planテーブルへの初期レコードINSERT
    //      （既存データは ON CONFLICT DO NOTHING で保護）
    for (const task of requestData.tasks) {
      for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
        await experimentPlanRepository.initInsertForTransaction(
          t as any,
          organizationId,
          project.project_id,
          task.methodId,
          taskNo,
          userId
        );
      }
    }

    // 6-6. 指示データの保存（instructions配列が指定されている場合のみ）
    if (requestData.instructions && requestData.instructions.length > 0) {
      await instructionRepository.batchInsert(
        t as any, // instructionRepository.batchInsertがany型を期待
        organizationId,
        project.project_id,
        userId,
        requestData.instructions
      );
    }
    
    return {
      success: true,
      message: 'Task registration saved successfully'
    };
  });
}

/**
 * transition_dataテーブルへ削除＋INSERT
 *
 * MAIMLの各メソッドに含まれるトランジションを、
 * project_task_detailの各レコード（method_id × task_no）に対して初期登録する。
 *
 * @param client - PostgreSQLクライアント（トランザクション内）
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param userId - ユーザーID
 * @param tasks - タスクデータ
 * @param parser - MAIMLパーサー
 * @private
 */
async function deleteAndInsertTransitionData(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: SaveTaskRegistrationRequest['tasks'],
  parser: MaimlParserTyped
): Promise<void> {
  // 1. 既存レコードを全削除
  await transitionDataRepository.deleteByProject(organizationId, projectId, client);

  // 2. MAIMLのメソッドごとにトランジション情報を取得
  const methodList = parser.getMethodList();
  // methodList[i] = { methodId, methodName, transitions: [{id, name}], transitionCount }

  // メソッドIDをキーにトランジション一覧を引けるマップを作成
  const methodTransitionMap = new Map<string, string[]>();
  for (const method of methodList) {
    const transitionIds = method.transitions.map(t => t.id).filter(id => id !== '');
    methodTransitionMap.set(method.methodId, transitionIds);
  }

  // 3. 各メソッドの experiment_plan から __meta__.transitionOrder を読み取り、
  //    methodId → (transitionId → { order, prerequisiteTransitionIds }) のマップを構築する。
  //    実験計画が未保存の場合はマップは空のまま（デフォルト値 work_order=0, prerequisite_transition_ids=[] で登録）。
  type TransitionOrderInfo = {
    order: number;
    prerequisiteTransitionIds: string[];
  };
  const methodOrderMap = new Map<string, Map<string, TransitionOrderInfo>>();
  const processedMethods = new Set<string>();

  for (const task of tasks) {
    if (processedMethods.has(task.methodId)) continue;
    processedMethods.add(task.methodId);

    try {
      const plans = await experimentPlanRepository.findByMethodForTransaction(
        client,
        organizationId,
        projectId,
        task.methodId
      );
      console.log(plans.length);

      // 最初に見つかった plan の __meta__ を使用（全タスク共通の順序情報）
      for (const plan of plans) {
        if (!plan.planned_values) continue;
        // ★追加: __meta__ の中身を確認
        console.log('[DEBUG] planned_values:', JSON.stringify(plan.planned_values, null, 2));
        
        const meta = (plan.planned_values as Record<string, unknown>)['__meta__'];
        console.log('[DEBUG] meta:', JSON.stringify(meta, null, 2));
        
        if (!meta || typeof meta !== 'object') continue;
        const metaObj = meta as Record<string, unknown>;
        
        console.log('[DEBUG] transitionOrder:', metaObj['transitionOrder']);
        console.log('[DEBUG] isArray:', Array.isArray(metaObj['transitionOrder']));
        if (!Array.isArray(metaObj['transitionOrder'])) continue;

        const orderMap = new Map<string, TransitionOrderInfo>();
        for (const item of metaObj['transitionOrder'] as Record<string, unknown>[]) {
          if (typeof item['id'] !== 'string') continue;
          orderMap.set(item['id'], {
            order: typeof item['order'] === 'number' ? item['order'] : 0,
            prerequisiteTransitionIds: Array.isArray(item['prerequisiteTransitionIds'])
              ? (item['prerequisiteTransitionIds'] as unknown[]).filter((v): v is string => typeof v === 'string')
              : [],
          });
        }
        methodOrderMap.set(task.methodId, orderMap);
        break; // 最初の1件で十分
      }
    } catch (err) {
      // experiment_plan 取得失敗時はデフォルト値（work_order=0）で継続
      logger.warn('[deleteAndInsertTransitionData] experiment_plan 取得失敗（デフォルト値で継続）:', {
        methodId: task.methodId,
        error: String(err),
      });
    }
  }

  // 4. project_task_detail の各レコード分ループしてINSERT
  for (const task of tasks) {
    const transitionIds = methodTransitionMap.get(task.methodId) ?? [];
    if (transitionIds.length === 0) {
      // トランジションが存在しないメソッドはスキップ
      continue;
    }

    const orderMap = methodOrderMap.get(task.methodId);

    for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
      for (const transitionId of transitionIds) {
        const orderInfo = orderMap?.get(transitionId);
        await transitionDataRepository.insert(
          organizationId,
          projectId,
          task.methodId,
          taskNo,
          transitionId,
          userId,
          client,
          orderInfo?.order ?? 0,
          orderInfo?.prerequisiteTransitionIds ?? []
        );
      }
    }
  }
}

/**
 * template_dataテーブルへ削除＋INSERT
 *
 * MAIMLの各メソッドに含まれるテンプレートのplaceRefを、
 * project_task_detailの各レコード（method_id × task_no）に対して初期登録する。
 * property_setには、テンプレートのプロパティ定義（key・xsiType・units）を格納する。
 *
 * @param client - PostgreSQLクライアント（トランザクション内）
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param userId - ユーザーID
 * @param tasks - タスクデータ
 * @param parser - MAIMLパーサー
 * @private
 */
async function deleteAndInsertTemplateData(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: SaveTaskRegistrationRequest['tasks'],
  parser: MaimlParserTyped
): Promise<void> {
  // 1. 既存レコードを全削除
  await templateDataRepository.deleteByProject(organizationId, projectId, client);

  // 2. MAIMLのメソッドごとに place_id → property_set のマッピングを構築
  // getMethods() でメソッドオブジェクトを取得し、各メソッドのテンプレートとplaceRefを抽出する
  const methods = parser.getMethods();

  // メソッドIDをキーに { placeId, propertySet }[] を引けるマップを作成
  type PlacePropertyEntry = {
    placeId: string;
    propertySet: Record<string, unknown>;
  };
  const methodPlaceMap = new Map<string, PlacePropertyEntry[]>();

  for (const method of methods) {
    const methodId = method.id || '';
    if (!methodId) continue;

    const entries: PlacePropertyEntry[] = [];

    // program 配下のテンプレートをフラットに集約するヘルパー
    // MAIMLではテンプレートは method.program[].materialTemplates に格納されることが多いため、
    // method 直下と program 配下の両方を収集する
    const programs = (method.program && method.program.length > 0) ? method.program : [];

    const collectTemplates = <T extends { placeRefs?: { ref?: string }[]; properties?: unknown[]; id?: string }>(
      methodLevel: T[] | T | undefined,
      programLevel: (T[] | T | undefined)[]
    ): T[] => {
      const result: T[] = [];
      // method 直下
      if (methodLevel) {
        const arr = Array.isArray(methodLevel) ? methodLevel : [methodLevel];
        result.push(...arr);
      }
      // program 配下
      for (const progTemplates of programLevel) {
        if (!progTemplates) continue;
        const arr = Array.isArray(progTemplates) ? progTemplates : [progTemplates];
        result.push(...arr);
      }
      return result;
    };

    // material / condition / result の3カテゴリを処理
    const templateCategories: Array<{
      templates: ReturnType<typeof collectTemplates>;
      templateType: 'material' | 'condition' | 'result';
    }> = [
      {
        templates: collectTemplates(method.materialTemplates, programs.map(p => p.materialTemplates)),
        templateType: 'material',
      },
      {
        templates: collectTemplates(method.conditionTemplates, programs.map(p => p.conditionTemplates)),
        templateType: 'condition',
      },
      {
        templates: collectTemplates(method.resultTemplates, programs.map(p => p.resultTemplates)),
        templateType: 'result',
      },
    ];

    for (const { templates, templateType } of templateCategories) {
      if (!templates) continue;

      // 単一要素・配列の両方に対応
      const templateArray = Array.isArray(templates) ? templates : [templates];

      for (const template of templateArray) {
        if (!template.placeRefs || template.placeRefs.length === 0) continue;

        // このテンプレートのプロパティ定義を構築
        // { ...p, value: null } でMAIMLの全フィールド（description・attributes等）を保持しつつ
        // value のみを null（未記録）で初期化する
        const properties = (template.properties || []).map(p => ({
          ...(p as Record<string, unknown>),
          value: null,
        }));


        const propertySet: Record<string, unknown> = {
          templateId: template.id || '',
          templateType,
          properties,
        };

        // 各 placeRef ごとに1レコード生成
        for (const placeRef of template.placeRefs) {
          const placeId = placeRef.ref || '';
          if (!placeId) continue;
          entries.push({ placeId, propertySet });
        }
      }
    }

    if (entries.length > 0) {
      methodPlaceMap.set(methodId, entries);
    }
  }

  // 3. project_task_detail の各レコード分ループしてINSERT
  for (const task of tasks) {
    const entries = methodPlaceMap.get(task.methodId) ?? [];
    if (entries.length === 0) {
      // テンプレートが存在しないメソッドはスキップ
      continue;
    }

    for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
      for (const { placeId, propertySet } of entries) {
        await templateDataRepository.insert(
          organizationId,
          projectId,
          task.methodId,
          taskNo,
          placeId,
          propertySet,
          userId,
          client
        );
      }
    }
  }
}
