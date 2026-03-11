/**
 * プロジェクト指示サービス
 * 
 * @remarks
 * 指示の保存・更新・削除・送信を担当します。
 * 送信時はトランザクション処理を行います。
 */

import * as projectRepository from '../repositories/projectRepository';
import * as projectInstructionRepository from '../repositories/projectInstructionRepository';
import { getPool } from '../database/db';
import { Project, ProjectInstruction } from '../types/database';
import {
  TaskRegistrationStatusResponse,
  SaveInstructionRequest,
  SaveInstructionResponse,
  UpdateInstructionRequest,
  UpdateInstructionResponse,
  DeleteInstructionResponse,
  SendInstructionsResponse,
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
    isSent: inst.instruction_status === 1,
    instruction_status: inst.instruction_status ?? 0
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
 * 
 * @remarks
 * タスク数のカウントは削除しました。
 * タスク登録は別途タスク登録タブで管理されるため、
 * ここではプロジェクトステータスのみを確認します。
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
  
  const projectStatus = project.project_status ?? 0;
  // タスク登録有無に関わらず、プロジェクトステータスが0,3,5なら送信可能
  // 0=計画中, 3=承認待ち, 5=異常終了
  const canSendInstructions = [0, 3, 5].includes(projectStatus);
  
  return {
    hasRegisteredTasks: true, // 常にtrue（タスク登録タブで管理されるため）
    taskCount: 0, // 使用しない
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
  
  const projectName = project.project_name || '';
  
  // 既存の指示数を取得して次のIDを生成
  const existingInstructions = await projectInstructionRepository.findByProject(
    organizationId,
    projectId
  );
  const nextNumber = existingInstructions.length + 1;
  const instructionId = `${projectName}_${String(nextNumber).padStart(3, '0')}`;
  
  // instruction_targetを決定（数値型）
  let instructionTarget = 0; // デフォルト: ファイル全体
  if (request.taskNumber !== null && request.taskNumber !== undefined) {
    instructionTarget = 3; // タスク
  } else if (request.transitionId) {
    instructionTarget = 2; // トランジション
  } else if (request.methodId) {
    instructionTarget = 1; // メソッド
  }
  
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
    instruction_target: instructionTarget,
    instruction_status: 0, // 未送信
    instruction_user_id: userId,
    create_user_id: userId,
    update_user_id: userId,
    create_at: new Date(),
    update_at: new Date()
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
    instructionId: savedInstruction.experiment_instruction_id || '',
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
 * 2. プロジェクトステータスを0→1に更新
 * 
 * タスク作成は別途タスク登録タブで実施されるため、このAPIでは行いません。
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param request 指示送信リクエスト（空のリクエストボディ）
 * @returns 送信結果
 */
export async function sendInstructions(
  organizationId: string,
  projectId: string,
  userId: string,
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

    // プロジェクトステータスが0（計画中）、3（承認待ち）、5（異常終了）のいずれかでない場合はエラー
    const allowedStatuses = [0, 3, 5];
    if (!allowedStatuses.includes(project.project_status ?? -1)) {
      const statusNames: Record<number, string> = {
        0: '計画中',
        1: 'タスク実行待ち',
        2: 'タスク実行中',
        3: '承認待ち',
        4: '完了',
        5: '異常終了'
      };
      const currentStatusName = statusNames[project.project_status ?? -1] || '不明';
      throw new Error(`指示送信は計画中、承認待ち、異常終了のステータスでのみ可能です（現在: ${currentStatusName}）`);
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
    
    // プロジェクトステータスの更新は行わない（チェックアウト時に実施）
    
    await client.query('COMMIT');
    
    return {
      sentInstructionsCount: sentCount
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
