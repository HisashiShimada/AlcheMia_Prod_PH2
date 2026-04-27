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
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
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
import { logger, logError } from '../utils/logger';
import { EventLogRepository } from '../repositories/eventLogRepository';
import { getStorageService } from './storageService';
import { XMLParser } from 'fast-xml-parser';

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
 * 指示送信はどのステータスでも可能です。
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
  
  return {
    hasRegisteredTasks: true, // 常にtrue（タスク登録タブで管理されるため）
    taskCount: 0, // 使用しない
    projectStatus,
    canSendInstructions: true // 常にtrue（ステータスに関わらず送信可能）
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
  // 注意: methodId/transitionId が空文字列('')の場合も考慮し、明示的に空文字チェックを行う
  let instructionTarget = 0; // デフォルト: ファイル全体
  if (request.taskNumber !== null && request.taskNumber !== undefined) {
    instructionTarget = 3; // タスク
  } else if (request.transitionId && request.transitionId !== '') {
    instructionTarget = 2; // トランジション
  } else if (request.methodId && request.methodId !== '') {
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
 * 2. maiml_event_log に送信ログを記録（各指示ごと）
 * 
 * タスク作成は別途タスク登録タブで実施されるため、このAPIでは行いません。
 * プロジェクトステータスに関わらず指示送信が可能です。
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param projectName プロジェクト名（MAIMLファイルパス構築・programId取得に使用）
 * @returns 送信結果
 */
export async function sendInstructions(
  organizationId: string,
  projectId: string,
  userId: string,
  projectName: string,
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
    
    // 未送信指示を取得
    const unsentInstructions = await projectInstructionRepository.findByProject(
      organizationId,
      projectId,
      0 // 未送信のみ
    );
    
    if (unsentInstructions.length === 0) {
      throw new Error('未送信の指示がありません');
    }

    // MAIMLファイルをパースして method_id → program_id のマップを構築
    // パース失敗時は空マップで継続（programId は null として処理）
    const programIdMap = await buildProgramIdMap(organizationId, projectId, projectName);
    
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

    // 2. 各指示に対して maiml_event_log に送信ログを記録
    const sentAt = new Date().toISOString();
    const eventLogRepo = new EventLogRepository();
    for (const instruction of unsentInstructions) {
      const methodId = instruction.method_id ?? null;
      const programId = methodId ? (programIdMap[methodId] ?? null) : null;
      await eventLogRepo.insertInstructionSentLog(
        organizationId,
        projectId,
        {
          instructionTarget: instruction.instruction_target ?? 0,
          methodId,
          transitionId: instruction.transition_id ?? null,
          programId,
          taskNo: instruction.task_no ?? null,
          experimentInstructionId: instruction.experiment_instruction_id!,
          userId,
          sentAt,
        },
        client
      );
    }

    logger.info('指示送信ログを記録しました', {
      organizationId,
      projectId,
      logCount: unsentInstructions.length
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

/**
 * MAIMLファイルをパースして method_id → program_id のマップを構築する
 *
 * file_metadata テーブルから project_uuid でMAIMLファイルの file_key を取得し、
 * ストレージからダウンロードしてパースする。
 * project_uuid が未設定の場合は projectName によるパスフォールバックを使用する。
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param projectName プロジェクト名（フォールバック用）
 * @returns method_id をキー、program_id を値とするマップ
 *          パース失敗時は空のマップを返す
 */
async function buildProgramIdMap(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<Record<string, string>> {
  try {
    const storageService = getStorageService();

    // project_uuid を取得し、file_metadata からMAIMLファイルの file_key を解決する
    const nameRow = await projectRepository.findNameAndUuidById(organizationId, projectId);
    const projectUuid = nameRow?.project_uuid ?? null;

    let filePath: string;
    if (projectUuid) {
      const fileMetadataRepo = new FileMetadataRepository();
      const meta = await fileMetadataRepo.findMaimlByProjectUuid(projectUuid);
      if (meta) {
        // file_key は "{organizationId}/..." 形式のフルキー
        // storageService.downloadFile は組織プレフィックスを除いた相対パスを受け取る
        filePath = meta.file_key.startsWith(`${organizationId}/`)
          ? meta.file_key.slice(`${organizationId}/`.length)
          : meta.file_key;
        logger.info('[projectInstructionService] file_metadata からMAIMLパスを解決', {
          projectId,
          projectUuid,
          filePath,
        });
      } else {
        // file_metadata に未登録の場合は project_name でフォールバック
        filePath = `projects/${projectName}/${projectName}.maiml`;
        logger.warn('[projectInstructionService] file_metadata にMAIMLが未登録、project_name でフォールバック', {
          projectId,
          projectUuid,
          filePath,
        });
      }
    } else {
      // project_uuid 未設定の場合は project_name でフォールバック
      filePath = `projects/${projectName}/${projectName}.maiml`;
      logger.warn('[projectInstructionService] project_uuid 未設定、project_name でフォールバック', {
        projectId,
        filePath,
      });
    }

    const fileBuffer = await storageService.downloadFile(organizationId, filePath);
    const maimlContent = fileBuffer.toString('utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(maimlContent);

    // protocol.method は単一要素の場合もあるため配列に統一
    const methods = parsed?.maiml?.protocol?.method;
    const methodsArray = Array.isArray(methods)
      ? methods
      : methods
      ? [methods]
      : [];

    // method_id → program_id のマップを構築
    const map: Record<string, string> = {};
    for (const m of methodsArray) {
      const methodId: string | undefined = m['@_id'];
      const programId: string | undefined = m?.program?.['@_id'];
      if (methodId && programId) {
        map[methodId] = programId;
      }
    }

    return map;
  } catch (error) {
    // MAIMLファイル取得・パース失敗時は空マップで継続（ログのみ）
    logError('MAIMLファイルのパースに失敗しました（programIdMapは空で継続）', error as Error, {
      organizationId,
      projectId,
      projectName,
    });
    return {};
  }
}
