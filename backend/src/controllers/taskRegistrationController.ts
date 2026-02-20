/**
 * Task Registration Controller
 * 
 * タスク登録API のコントローラー
 * 
 * @module taskRegistrationController
 * @version 1.0.0
 * @date 2026-02-20
 */

import { Request, Response } from 'express';
import * as taskRegistrationService from '../services/taskRegistrationService';
import type {
  SaveTaskRegistrationRequest
} from '../types/taskRegistration';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * タスク登録情報を取得
 * 
 * GET /api/experiment_admin/projects/:projectName/task-registration
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @note バリデーションはミドルウェアで処理済み
 */
export async function getTaskRegistration(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // バリデーションはミドルウェアで処理済み
    const { projectName } = req.params;
    const { organizationId } = req.user!;
    
    const result = await taskRegistrationService.getTaskRegistration(
      projectName,
      organizationId
    );
    
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (error) {
    logError('Failed to get task registration', error as Error, {
      action: 'task_registration_get',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      requestId
    });
    
    const errorCode = error instanceof Error && error.message.includes('not found') 
      ? 'RESOURCE_NOT_FOUND' 
      : 'SYSTEM_ERROR';
    const statusCode = errorCode === 'RESOURCE_NOT_FOUND' ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}

/**
 * タスク登録情報を保存
 * 
 * POST /api/experiment_admin/projects/:projectName/task-registration
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @note バリデーションはミドルウェアで処理済み
 */
export async function saveTaskRegistration(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // バリデーションはミドルウェアで処理済み
    const { projectName } = req.params;
    const { organizationId, userId } = req.user!;
    const requestData = req.body as SaveTaskRegistrationRequest;
    
    const result = await taskRegistrationService.saveTaskRegistration(
      projectName,
      organizationId,
      userId,
      requestData
    );
    
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (error) {
    logError('Failed to save task registration', error as Error, {
      action: 'task_registration_save',
      organizationId: req.user?.organizationId,
      projectName: req.params.projectName,
      requestId
    });
    
    // エラーメッセージからエラーコードを判定
    const errorMessage = error instanceof Error ? error.message : '';
    let errorCode = 'SYSTEM_ERROR';
    let statusCode = 500;
    
    if (errorMessage.includes('not found')) {
      errorCode = 'RESOURCE_NOT_FOUND';
      statusCode = 404;
    } else if (errorMessage.includes('checked out')) {
      errorCode = 'BUSINESS_PROJECT_CHECKED_OUT';
      statusCode = 409;
    } else if (errorMessage.includes('not registered')) {
      errorCode = 'BUSINESS_MAIML_NOT_REGISTERED';
      statusCode = 400;
    } else if (errorMessage.includes('required') || errorMessage.includes('must be')) {
      errorCode = 'VALIDATION_ERROR';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage || 'Internal server error'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}
