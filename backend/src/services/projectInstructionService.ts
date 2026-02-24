/**
 * プロジェクト指示サービス
 * 
 * @remarks
 * 指示の保存・更新・削除・送信を担当します。
 * 送信時はトランザクション処理を行います。
 */

import * as projectRepository from '../repositories/projectRepository';
import * as projectTaskRepository from '../repositories/projectTaskRepository';
import * as projectTaskDetailRepository from '../repositories/projectTaskDetailRepository';
import * as projectInstructionRepository from '../repositories/projectInstructionRepository';
import { getPool } from '../database/db';
import { Project, ProjectInstruction, ProjectTask, ProjectTaskDetail } from '../types/database';
import {
  TaskRegistrationStatusResponse,
  SaveInstructionRequest,
  SaveInstructionResponse,
  UpdateInstructionRequest,
  UpdateInstructionResponse,
  DeleteInstructionResponse,
  SendInstructionsRequest,
  SendInstructionsResponse,
  TaskInput,
  InstructionData
} from '../types/api';
import { logger } from '../utils/logger';

/**
 * 指示一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 指示一覧（画面表示用形式）
 */
export async function getInstructions(
  organizationId: string,
  projectId: string
): Promise<InstructionData[]> {
  // プロジェクトの存在確認
  const project = await projectRepository.findByIdWithOrganization(organizationId, projectId);
  
  if (!project) {
    throw new Error('プロジェクトが見つかりません');
  }
  
  // 全ての指示を取得（送信済・未送信両方）
  const instructions = await projectInstructionRepository.findByProject(
    organizationId,
    projectId
  );
  
  // DB型から画面型に変換
  const instructionData: InstructionData[] = instructions.map(inst => ({
    id: inst.experiment_instruction_id || '',
    content: inst.instructions || '',
    priority: inst.priority ?? 1,
    type: inst.type ?? 0,
    methodId: inst.method_id || '',
    transitionId: inst.transition_id || '',
    taskNumber: inst.task_no ?? undefined,
    isSent: inst.instruction_status === 1
  }));
  
  logger.info('指示一覧を取得しました', {
    organizationId,
    projectId,
    count: instructionData.length
  });
  
  return instructionData;
}

/**
 * タスク登録状況を取得（ボタン活性制御用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns タスク登録状況
 */
export async function getTaskRegistrationStatus(
  organizationId: string,
  projectId: string
): Promise<TaskRegistrationStatusResponse> {
  // プロジェクト情報を取得
  const project = await projectRepository.findByIdWithOrganization(organizationId, projectId);
  
  if (!project) {
    throw new Error('プロジェクトが見つかりません');
  }
  
  // タスク数を取得
  const taskCount = await projectTaskRepository.countByProject(organizationId, projectId);
  
  const hasRegisteredTasks = taskCount > 0;
  const projectStatus = project.project_status ?? 0;
  const canSendInstructions = hasRegisteredTasks && projectStatus === 0;
  
  return {
    hasRegisteredTasks,
    taskCount,
    projectStatus,
    canSendInstructions
  };
}

/**
 * 指示を保存（未送信）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param request 指示保存リクエスト
 * @returns 保存された指示情報
 */
export async function saveInstruction(
  organizationId: string,
  projectId: string,
  userId: string,
  request: SaveInstructionRequest
): Promise<SaveInstructionResponse> {
  // プロジェクトの存在確認
  const project = await projectRepository.findByIdWithOrganization(organizationId, projectId);
  
  if (!project) {
    throw new Error('プロジェクトが見つかりません');
  }
  
  // 指示データを作成
  const instructionData: ProjectInstruction = {
    organization_id: organizationId,
    project_id: projectId,
    experiment_instruction_id: '', // Repository内でUUID生成
    method_id: request.methodId,
    transition_id: request.transitionId ?? null,
    task_no: request.taskNumber ?? null,
    priority: request.priority,
    type: request.type,
    instructions: request.content,
    instruction_status: 0, // 未送信
    create_user_id: userId,
    update_user_id: userId
  };
  
  // 指示を保存
  const savedInstruction = await projectInstructionRepository.insert(instructionData);
  
  logger.info('指示を保存しました', {
    organizationId,
    projectId,
    instructionId: savedInstruction.experiment_instruction_id,
    userId
  });
  
  return {
    instructionId: savedInstruction.experiment_instruction_id,
    instruction_status: savedInstruction.instruction_status ?? 0
  };
}

/**
 * 指示を更新（未送信のみ）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param instructionId 指示ID
 * @param userId ユーザーID
 * @param request 指示更新リクエスト
 * @returns 更新結果
 */
export async function updateInstruction(
  organizationId: string,
  projectId: string,
  instructionId: string,
  userId: string,
  request: UpdateInstructionRequest
): Promise<UpdateInstructionResponse> {
  // 指示データを作成
  const instructionData: ProjectInstruction = {
    organization_id: organizationId,
    project_id: projectId,
    experiment_instruction_id: instructionId,
    method_id: request.methodId,
    transition_id: request.transitionId ?? null,
    task_no: request.taskNumber ?? null,
    priority: request.priority,
    type: request.type,
    instructions: request.content,
    update_user_id: userId
  };
  
  // 指示を更新（未送信のみ）
  try {
    await projectInstructionRepository.update(instructionData);
    
    logger.info('指示を更新しました', {
      organizationId,
      projectId,
      instructionId,
      userId
    });
    
    return {
      instructionId,
      updated: true
    };
  } catch (error) {
    logger.error('指示の更新に失敗しました', {
      organizationId,
      projectId,
      instructionId,
      error
    });
    throw error;
  }
}

/**
 * 指示を削除（未送信のみ）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param instructionId 指示ID
 * @returns 削除結果
 */
export async function deleteInstruction(
  organizationId: string,
  projectId: string,
  instructionId: string
): Promise<DeleteInstructionResponse> {
  const deleted = await projectInstructionRepository.deleteById(
    organizationId,
    projectId,
    instructionId
  );
  
  if (deleted) {
    logger.info('指示を削除しました', {
      organizationId,
      projectId,
      instructionId
    });
  } else {
    logger.warn('指示が見つからないか、既に送信済です', {
      organizationId,
      projectId,
      instructionId
    });
  }
  
  return { deleted };
}

/**
 * 未送信指示を一括送信
 * 
 * @remarks
 * トランザクション処理:
 * 1. 未送信指示のステータスを送信済に更新
 * 2. タスク（project_task）をUPSERT
 * 3. タスク詳細（project_task_detail）を作成
 * 4. プロジェクトステータスを0→1に更新
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param request 指示送信リクエスト
 * @returns 送信結果
 */
export async function sendInstructions(
  organizationId: string,
  projectId: string,
  userId: string,
  request: SendInstructionsRequest
): Promise<SendInstructionsResponse> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // プロジェクト情報を取得
    const project = await projectRepository.findByIdWithOrganization(organizationId, projectId);
    
    if (!project) {
      throw new Error('プロジェクトが見つかりません');
    }
    
    // プロジェクトステータスが0（計画中）でない場合はエラー
    if (project.project_status !== 0) {
      throw new Error('プロジェクトステータスが計画中ではありません');
    }
    
    // 未送信指示を取得
    const unsentInstructions = await projectInstructionRepository.findByProject(
      organizationId,
      projectId,
      0 // 未送信のみ
    );
    
    if (unsentInstructions.length === 0) {
      throw new Error('未送信の指示がありません');
    }
    
    // 1. 未送信指示を送信済に更新
    const sentCount = await projectInstructionRepository.bulkUpdateStatus(
      organizationId,
      projectId,
      userId
    );
    
    logger.info('指示を送信済に更新しました', {
      organizationId,
      projectId,
      sentCount
    });
    
    // 2. タスク（project_task）をUPSERT（規約準拠: Service層でupsertロジック実装）
    let createdTasksCount = 0;
    
    for (const task of request.tasks) {
      const taskData: ProjectTask = {
        organization_id: organizationId,
        project_id: projectId,
        method_id: task.methodId,
        experiment_order: task.experimentOrder ?? null,
        experiment_condition: task.experimentCondition ?? null,
        attempts_count: task.attemptsCount ?? null,
        create_user_id: userId,
        update_user_id: userId
      };
      
      // 既存タスクを確認
      const existingTask = await projectTaskRepository.findByPrimaryKey(
        organizationId,
        projectId,
        task.methodId
      );
      
      if (existingTask) {
        // 既存レコードがあればupdate
        const updatedTask: ProjectTask = {
          ...existingTask,
          experiment_order: task.experimentOrder ?? existingTask.experiment_order,
          experiment_condition: task.experimentCondition ?? existingTask.experiment_condition,
          attempts_count: task.attemptsCount ?? existingTask.attempts_count,
          update_user_id: userId,
          update_at: new Date()
        };
        await projectTaskRepository.update(updatedTask);
      } else {
        // 新規レコードはinsert
        await projectTaskRepository.insert(taskData);
      }
      
      createdTasksCount++;
    }
    
    logger.info('タスクをUPSERTしました', {
      organizationId,
      projectId,
      createdTasksCount
    });
    
    // 3. タスク詳細（project_task_detail）を作成
    const taskDetails: ProjectTaskDetail[] = [];
    
    for (const task of request.tasks) {
      const attemptsCount = task.attemptsCount ?? 1;
      
      for (let i = 1; i <= attemptsCount; i++) {
        taskDetails.push({
          organization_id: organizationId,
          project_id: projectId,
          method_id: task.methodId,
          task_no: i,
          task_status: 0, // 実行待ち
          create_user_id: userId,
          update_user_id: userId
        });
      }
    }
    
    if (taskDetails.length > 0) {
      await projectTaskDetailRepository.bulkInsert(taskDetails);
      
      logger.info('タスク詳細を作成しました', {
        organizationId,
        projectId,
        taskDetailCount: taskDetails.length
      });
    }
    
    // 4. プロジェクトステータスを0→1（タスク実行待ち）に更新
    // 規約に従い: 既存レコード取得 → 更新パラメータ反映 → updateメソッド呼び出し
    const existingProject = await projectRepository.findByIdWithOrganization(organizationId, projectId);
    
    if (!existingProject) {
      throw new Error('プロジェクトが見つかりません');
    }
    
    const updatedProjectData: Project = {
      ...existingProject,
      project_status: 1,  // タスク実行待ち
      update_user_id: userId,
      update_at: new Date()
    };
    
    await projectRepository.update(updatedProjectData);
    
    logger.info('プロジェクトステータスを更新しました', {
      organizationId,
      projectId,
      newStatus: 1
    });
    
    await client.query('COMMIT');
    
    return {
      sentInstructionsCount: sentCount,
      createdTasksCount
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('指示送信に失敗しました（ロールバック）', {
      organizationId,
      projectId,
      error
    });
    
    throw error;
  } finally {
    client.release();
  }
}
