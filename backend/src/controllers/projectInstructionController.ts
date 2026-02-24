/**
 * プロジェクト指示コントローラー
 * 
 * @remarks
 * 指示送信タブのAPIエンドポイントを提供します。
 * バリデーションはミドルウェアで実施済みのため、ここではビジネスロジック呼び出しのみ。
 */

import { Request, Response, NextFunction } from 'express';
import * as projectInstructionService from '../services/projectInstructionService';
import * as projectRepository from '../repositories/projectRepository';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  SaveInstructionRequest,
  UpdateInstructionRequest,
  SendInstructionsRequest
} from '../types/api';

/**
 * 指示一覧を取得
 * 
 * GET /api/v1/projects/:projectName/instructions
 */
export async function getInstructions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const projectName = req.params.projectName;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const instructions = await projectInstructionService.getInstructions(
      organizationId,
      projectId
    );
    
    res.json({
      success: true,
      data: {
        instructions
      }
    });
  } catch (error) {
    logger.error('指示一覧の取得に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName
    });
    next(error);
  }
}

/**
 * タスク登録状況を取得（ボタン活性制御用）
 * 
 * GET /api/v1/projects/:projectName/instructions/status
 */
export async function getTaskRegistrationStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const projectName = req.params.projectName;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const status = await projectInstructionService.getTaskRegistrationStatus(
      organizationId,
      projectId
    );
    
    res.json(status);
  } catch (error) {
    logger.error('タスク登録状況の取得に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName
    });
    next(error);
  }
}

/**
 * 指示を保存（未送信）
 * 
 * POST /api/v1/projects/:projectName/instructions
 */
export async function saveInstruction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const projectName = req.params.projectName;
    const requestBody = req.body as SaveInstructionRequest;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const result = await projectInstructionService.saveInstruction(
      organizationId,
      projectId,
      userId,
      requestBody
    );
    
    res.status(201).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      }
    });
  } catch (error) {
    logger.error('指示の保存に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      userId: req.user?.userId
    });
    next(error);
  }
}

/**
 * 指示を更新（未送信のみ）
 * 
 * PUT /api/v1/projects/:projectName/instructions/:instructionId
 */
export async function updateInstruction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const projectName = req.params.projectName;
    const instructionId = req.params.instructionId;
    const requestBody = req.body as UpdateInstructionRequest;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const result = await projectInstructionService.updateInstruction(
      organizationId,
      projectId,
      instructionId,
      userId,
      requestBody
    );
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      }
    });
  } catch (error) {
    logger.error('指示の更新に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      userId: req.user?.userId,
      instructionId: req.params.instructionId
    });
    next(error);
  }
}

/**
 * 指示を削除（未送信のみ）
 * 
 * DELETE /api/v1/projects/:projectName/instructions/:instructionId
 */
export async function deleteInstruction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const projectName = req.params.projectName;
    const instructionId = req.params.instructionId;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const result = await projectInstructionService.deleteInstruction(
      organizationId,
      projectId,
      instructionId
    );
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      }
    });
  } catch (error) {
    logger.error('指示の削除に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      instructionId: req.params.instructionId
    });
    next(error);
  }
}

/**
 * 未送信指示を一括送信
 * 
 * POST /api/v1/projects/:projectName/instructions/send
 */
export async function sendInstructions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const projectName = req.params.projectName;
    const requestBody = req.body as SendInstructionsRequest;
    
    // projectNameからprojectを特定
    const project = await projectRepository.findByName(organizationId, projectName);
    
    if (!project) {
      res.status(404).json({
        error: 'プロジェクトが見つかりません'
      });
      return;
    }
    
    const projectId = project.project_id!;
    
    const result = await projectInstructionService.sendInstructions(
      organizationId,
      projectId,
      userId,
      requestBody
    );
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      }
    });
  } catch (error) {
    logger.error('指示の送信に失敗しました', {
      error,
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      userId: req.user?.userId
    });
    next(error);
  }
}
