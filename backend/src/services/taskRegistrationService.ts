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
import * as projectTaskRepository from '../repositories/projectTaskRepository';
import { TransitionDataRepository } from '../repositories/transitionDataRepository';
import { TemplateDataRepository } from '../repositories/templateDataRepository';
import type {
  GetTaskRegistrationResponse,
  TaskRegistrationData,
  SaveTaskRegistrationRequest,
  SaveTaskRegistrationResponse
} from '../types/taskRegistration';
import { getPool } from '../database/db';
import type { PoolClient } from 'pg';
import type { ProjectTask } from '../types/database';
import { getStorageService } from './storageService';
import { MaimlParserTyped } from '../utils/maimlParserTyped';

const transitionDataRepository = new TransitionDataRepository();
const templateDataRepository = new TemplateDataRepository();

/**
 * タスク登録情報を取得
 * 
 * @param projectName - プロジェクト名
 * @param organizationId - 組織ID
 * @returns {Promise<GetTaskRegistrationResponse>} タスク登録情報
 */
export async function getTaskRegistration(
  projectName: string,
  organizationId: string
): Promise<GetTaskRegistrationResponse> {
  // 1. プロジェクト情報を取得
  const project = await projectRepository.findByName(organizationId, projectName);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  // 2. チェックアウト状態とMAIMLファイル登録状態を確認
  const isCheckoutLocked = project.checkout_status === 1;
  const isMaimlRegistered = project.project_maiml_flg === true;
  
  // 3. タスク情報を取得（DBのみ）
  let tasks: TaskRegistrationData[] = [];
  
  // 4. project_taskテーブルから取得
  const dbTasks = await projectTaskRepository.findByProject(organizationId, project.project_id);
  
  if (dbTasks && dbTasks.length > 0) {
    // DBにデータがある場合のみtasksを設定
    tasks = dbTasks.map((task: ProjectTask, index: number): TaskRegistrationData => ({
      methodId: task.method_id,
      experimentCondition: task.experiment_condition || 0,
      trialCount: task.attempts_count || 1,
      experimentOrder: task.experiment_order || index + 1
    }));
  }
  // DBにデータがない場合は空配列のまま（フロントエンドで処理）
  
  return {
    tasks,
    isCheckoutLocked,
    isMaimlRegistered
  };
}

/**
 * タスク登録情報を保存
 * 
 * @param projectName - プロジェクト名
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @param requestData - 保存リクエストデータ
 * @returns {Promise<SaveTaskRegistrationResponse>} 保存結果
 */
export async function saveTaskRegistration(
  projectName: string,
  organizationId: string,
  userId: string,
  requestData: SaveTaskRegistrationRequest
): Promise<SaveTaskRegistrationResponse> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. プロジェクト情報を取得
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // 2. チェックアウト状態を確認
    if (project.checkout_status === 1) {
      throw new Error('Project is checked out. Cannot save task registration.');
    }
    
    // 3. MAIMLファイル登録状態を確認
    if (project.project_maiml_flg !== true) {
      throw new Error('MAIML file is not registered. Cannot save task registration.');
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
    
    // 5. project_taskテーブルへUPSERT
    await upsertProjectTasks(
      client,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks
    );
    
    // 6. project_task_detailテーブルへ削除＋INSERT
    await deleteAndInsertTaskDetails(
      client,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks
    );

    // 7. MAIMLファイルをパース
    const storageService = getStorageService();
    const maimlFilePath = `projects/${projectName}/${projectName}.maiml`;
    const maimlBuffer = await storageService.downloadFile(organizationId, maimlFilePath);
    const maimlContent = maimlBuffer.toString('utf-8');
    const parser = new MaimlParserTyped(maimlContent);

    // 8. transition_dataテーブルへ削除＋INSERT
    await deleteAndInsertTransitionData(
      client,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks,
      parser
    );

    // 9. template_dataテーブルへ削除＋INSERT
    await deleteAndInsertTemplateData(
      client,
      organizationId,
      project.project_id,
      userId,
      requestData.tasks,
      parser
    );

    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Task registration saved successfully'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to save task registration:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * project_taskテーブルへUPSERT
 * 
 * @param client - PostgreSQLクライアント
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param userId - ユーザーID
 * @param tasks - タスクデータ
 * @private
 */
async function upsertProjectTasks(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: SaveTaskRegistrationRequest['tasks']
): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    const query = `
      INSERT INTO project_task (
        organization_id,
        project_id,
        method_id,
        experiment_order,
        experiment_condition,
        attempts_count,
        create_user_id,
        create_at,
        update_user_id,
        update_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, project_id, method_id)
      DO UPDATE SET
        experiment_order = EXCLUDED.experiment_order,
        experiment_condition = EXCLUDED.experiment_condition,
        attempts_count = EXCLUDED.attempts_count,
        update_user_id = EXCLUDED.update_user_id,
        update_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(query, [
      organizationId,
      projectId,
      task.methodId,
      i + 1, // experiment_order
      task.experimentCondition,
      task.trialCount,
      userId,
      userId
    ]);
  }
}

/**
 * project_task_detailテーブルへ削除＋INSERT
 * 
 * @param client - PostgreSQLクライアント
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param userId - ユーザーID
 * @param tasks - タスクデータ
 * @private
 */
async function deleteAndInsertTaskDetails(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: SaveTaskRegistrationRequest['tasks']
): Promise<void> {
  // 1. 既存のproject_task_detailを削除
  const deleteQuery = `
    DELETE FROM project_task_detail
    WHERE organization_id = $1
      AND project_id = $2
  `;
  
  await client.query(deleteQuery, [organizationId, projectId]);
  
  // 2. 新規にproject_task_detailを作成
  for (const task of tasks) {
    for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
      const insertQuery = `
        INSERT INTO project_task_detail (
          organization_id,
          project_id,
          method_id,
          task_no,
          task_status,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP)
      `;
      
      await client.query(insertQuery, [
        organizationId,
        projectId,
        task.methodId,
        taskNo,
        0, // task_status: 0（初期状態）
        userId,
        userId
      ]);
    }
  }
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

  // 3. project_task_detail の各レコード分ループしてINSERT
  for (const task of tasks) {
    const transitionIds = methodTransitionMap.get(task.methodId) ?? [];
    if (transitionIds.length === 0) {
      // トランジションが存在しないメソッドはスキップ
      continue;
    }

    for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
      for (const transitionId of transitionIds) {
        await transitionDataRepository.insert(
          organizationId,
          projectId,
          task.methodId,
          taskNo,
          transitionId,
          userId,
          client
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

    // material / condition / result の3カテゴリを処理
    const templateCategories: Array<{
      templates: typeof method.materialTemplates;
      templateType: 'material' | 'condition' | 'result';
    }> = [
      { templates: method.materialTemplates, templateType: 'material' },
      { templates: method.conditionTemplates, templateType: 'condition' },
      { templates: method.resultTemplates, templateType: 'result' },
    ];

    for (const { templates, templateType } of templateCategories) {
      if (!templates) continue;

      // 単一要素・配列の両方に対応
      const templateArray = Array.isArray(templates) ? templates : [templates];

      for (const template of templateArray) {
        if (!template.placeRefs || template.placeRefs.length === 0) continue;

        // このテンプレートのプロパティ定義を構築
        const properties = (template.properties || []).map(p => ({
          key: p.key || '',
          xsiType: p.xsiType || 'stringType',
          value: null,
          units: p.units || null,
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
