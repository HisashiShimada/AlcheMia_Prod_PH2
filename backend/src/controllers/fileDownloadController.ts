/**
 * FileDownloadController
 * 
 * @description ファイルダウンロード関連のリクエスト処理
 * Task 4.1: 単一ファイルダウンロードAPIエンドポイントの実装
 * Task 4.2: プロジェクト一括ダウンロードAPIエンドポイントの実装
 */

import { Request, Response } from 'express';
import { FileDownloadService } from '../services/fileDownloadService';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { ProjectAccessValidator } from '../services/projectAccessValidator';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';

/**
 * 単一ファイルダウンロード用署名付きURL取得エンドポイント
 * GET /api/v1/projects/:projectId/files/:fileName/download
 * 
 * Task 4.1: Controller層実装
 * Requirements: 1, 2, 4, 5, 7, 8, 9, 11
 */
export async function downloadFile(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // 1. 認証チェック
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const { organizationId, userId } = req.user;
    const { projectId, fileName } = req.params;

    // 2. パラメータバリデーション
    // UUID形式バリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'projectIdはUUID形式である必要があります',
          details: [{
            field: 'projectId',
            message: 'UUID形式が必要です',
            code: 'INVALID_FORMAT',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // ファイル名の基本バリデーション
    if (!fileName || fileName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_REQUIRED_FIELD',
          message: 'fileNameは必須です',
          details: [{
            field: 'fileName',
            message: 'fileNameは必須です',
            code: 'REQUIRED_FIELD',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 3. organization_prefix取得
    const { getPool } = require('../database/db');
    const pool = getPool();
    const orgQuery = 'SELECT organization_name FROM organization WHERE organization_id = $1';
    const orgResult = await pool.query(orgQuery, [organizationId]);
    
    if (orgResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '組織情報が見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const organizationPrefix = orgResult.rows[0].organization_name.replace(/\s+/g, '_');

    // 4. Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileDownloadService(repository, accessValidator);

    const result = await service.downloadFile(
      userId,
      projectId,
      fileName,
      organizationId,
      organizationPrefix
    );

    // 5. 成功レスポンス
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    // 6. エラーハンドリング
    logError('File download error', error, {
      action: 'file_download',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
      fileName: req.params.fileName,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'SYSTEM_ERROR';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイル名') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorMessage = error.message;
      }
      // AuthorizationErrorのチェック
      else if (error.message.includes('アクセス権限') || 
               error.message.includes('権限がありません')) {
        statusCode = 403;
        errorCode = 'PERMISSION_INSUFFICIENT';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('署名付きURL') || 
               error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'STORAGE_ERROR';
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * プロジェクト一括ダウンロード用署名付きURLリスト取得エンドポイント
 * GET /api/v1/projects/:projectId/files/download-all
 * 
 * Task 4.2: Controller層実装
 * Requirements: 1, 4, 7, 8, 9, 12
 */
export async function downloadAllFiles(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    // 1. 認証チェック
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const { organizationId, userId } = req.user;
    const { projectId } = req.params;

    // 2. パラメータバリデーション
    // UUID形式バリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'projectIdはUUID形式である必要があります',
          details: [{
            field: 'projectId',
            message: 'UUID形式が必要です',
            code: 'INVALID_FORMAT',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // クエリパラメータの取得とバリデーション
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // ページ番号バリデーション
    if (page < 1 || !Number.isInteger(page)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ページ番号は1以上の整数である必要があります',
          details: [{
            field: 'page',
            message: 'ページ番号は正の整数です',
            code: 'INVALID_VALUE',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // limit値バリデーション
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'limitは1〜100の範囲内の整数である必要があります',
          details: [{
            field: 'limit',
            message: 'limitは1〜100の範囲です',
            code: 'OUT_OF_RANGE',
          }],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // 3. organization_prefix取得
    const { getPool } = require('../database/db');
    const pool = getPool();
    const orgQuery = 'SELECT organization_name FROM organization WHERE organization_id = $1';
    const orgResult = await pool.query(orgQuery, [organizationId]);
    
    if (orgResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '組織情報が見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    const organizationPrefix = orgResult.rows[0].organization_name.replace(/\s+/g, '_');

    // 4. Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileDownloadService(repository, accessValidator);

    const result = await service.downloadAllFiles(
      userId,
      projectId,
      organizationId,
      organizationPrefix,
      page,
      limit
    );

    // 5. 成功レスポンス
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    // 6. エラーハンドリング
    logError('File download all error', error, {
      action: 'file_download_all',
      organizationId: req.user?.organizationId,
      projectId: req.params.projectId,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'SYSTEM_ERROR';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('ページ') || 
          error.message.includes('limit') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorMessage = error.message;
      }
      // AuthorizationErrorのチェック
      else if (error.message.includes('アクセス権限') || 
               error.message.includes('権限がありません')) {
        statusCode = 403;
        errorCode = 'PERMISSION_INSUFFICIENT';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('署名付きURL') || 
               error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'STORAGE_ERROR';
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
