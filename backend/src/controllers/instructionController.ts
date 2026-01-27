/**
 * InstructionController
 * 
 * 指示送信（タスク作成）APIのコントローラ層
 */

import { Request, Response, NextFunction } from 'express';
import { InstructionService } from '../services/instructionService';
import { CreateInstructionRequest } from '../types/instruction';
import { randomUUID } from 'crypto';

/**
 * InstructionControllerクラス
 */
export class InstructionController {
  constructor(private instructionService: InstructionService) {}

  /**
   * 指示とタスクを作成
   * 
   * POST /api/projects/:projectId/instructions
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. パラメータの抽出と検証
      const { projectId } = req.params;
      if (!projectId) {
        throw new Error('projectId is required');
      }

      // 2. リクエストボディの検証
      const { tasks, instructions } = req.body as CreateInstructionRequest;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('tasks array is required and must not be empty');
      }

      if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
        throw new Error('instructions array is required and must not be empty');
      }

      // 3. 認証情報の取得（ミドルウェアで設定済み）
      const organizationId = (req as any).organizationId;
      if (!organizationId) {
        throw new Error('organizationId is required (tenantIsolation middleware)');
      }

      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new Error('userId is required (auth middleware)');
      }

      // 4. サービス層の呼び出し
      const summary = await this.instructionService.createInstruction(
        projectId,
        { tasks, instructions },
        organizationId,
        userId
      );

      // 5. 201 Createdレスポンスの生成
      const requestId = req.headers['x-request-id'] as string || randomUUID();
      
      res.status(201).json({
        success: true,
        data: {
          summary,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    } catch (error) {
      // エラーをExpressのエラーハンドラに渡す
      next(error);
    }
  };
}
