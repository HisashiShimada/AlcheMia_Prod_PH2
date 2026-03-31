/**
 * FileDownloadController
 * 
 * @description ファイルダウンロード関連のリクエスト処理
 * Task 4.1: 単一ファイルダウンロードAPIエンドポイントの実装
 * Task 4.2: プロジェクト一括ダウンロードAPIエンドポイントの実装
 */

import { Request, Response } from 'express';
import { FileAccessService } from '../services/fileAccessService';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { ProjectAccessValidator } from '../services/projectAccessValidator';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '../utils/logger';
import { ingestSingleFileAsync } from '../services/singleFileIngestService';
import UploadBatchRepository from '../repositories/UploadBatchRepository';
import * as projectRepository from '../repositories/projectRepository';
import { ProjectService } from '../services/projectService';
import * as codeMasterRepository from '../repositories/codeMasterRepository';
import { Project } from '../types/database';

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
    const { organizationId, userId } = req.user!;
    const { projectId, fileName } = req.params;

    // Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const result = await service.streamFile(
      userId,
      projectId,
      organizationId,
      fileName
    );

    // 4. レスポンスヘッダーを設定
    const encodedFileName = encodeURIComponent(result.metadata.fileName);
    res.setHeader('Content-Type', result.metadata.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Length', result.buffer.length.toString());

    // 5. ファイルバッファをレスポンスとして送信
    res.status(200).send(result.buffer);

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
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイル名') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // AuthorizationErrorのチェック
      else if (error.message.includes('アクセス権限') || 
               error.message.includes('権限がありません')) {
        statusCode = 403;
        errorCode = 'E5015';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('署名付きURL') || 
               error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'E4006';
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
 * フォルダZIPダウンロードエンドポイント
 * POST /api/v1/files/download-folder-as-zip
 * 
 * Task: 汎用フォルダZIPダウンロード機能
 * - 指定されたフォルダパス配下のファイルをZIP形式でダウンロード
 * - プロジェクト、フォーマット、その他あらゆるフォルダで利用可能
 */
export async function downloadFolderAsZip(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { organizationId } = req.user!;
    const { folderPath } = req.body;

    // Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const { zipStream, folderName } = await service.downloadFolderAsZip(
      organizationId,
      folderPath
    );

    // 4. レスポンスヘッダーを設定
    const encodedFileName = encodeURIComponent(`${folderName}.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);

    // 5. ZIPストリームをレスポンスとしてパイプ
    zipStream.pipe(res);

  } catch (error: any) {
    // 6. エラーハンドリング
    logError('Folder ZIP download error', error, {
      action: 'folder_zip_download',
      organizationId: req.user?.organizationId,
      folderPath: req.body?.folderPath,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なフォルダパス') ||
          error.message.includes('フォルダパス') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('ZIP生成') || 
               error.message.includes('ストレージ') ||
               error.message.includes('ファイル一覧')) {
        statusCode = 500;
        errorCode = 'E4006';
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
 * ファイルアップロードエンドポイント
 * POST /api/v1/files/upload
 * 
 * Task: S3ファイルアップロード統一化
 * - 各画面で生成された完全なパスを使用してファイルをアップロード
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * 
 * Phase1-3: 空フォルダプレースホルダー対応（2026-02-18）
 */
export async function uploadFiles(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { organizationId, userId } = req.user!;
    const { uploadMode, targetPath, emptyFolders } = req.body;
    const files = req.files as Express.Multer.File[];
    files.forEach((file) => {
      console.log(file.originalname);
    })

    // metadataがJSON文字列の場合はパース
    let metadata = req.body.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        throw new Error('metadataのパースに失敗しました');
      }
    }

    // filePathsがJSON文字列の場合はパース
    let filePaths: string[] | undefined;
    if (req.body.filePaths) {
      try {
        filePaths = JSON.parse(req.body.filePaths);
        console.log('📁 [FilePaths] パース成功:', filePaths);
      } catch (error) {
        throw new Error('ファイルパス情報のパースに失敗しました');
      }
    }

    // Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const result = await service.uploadFiles(
      organizationId,
      userId,
      uploadMode,
      targetPath,
      files,
      metadata,
      emptyFolders,  // Phase1-3: 空フォルダプレースホルダー
      filePaths      // フォルダ構造を保持するためのパス情報
    );

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

    // セマンティック検索インデックス更新（fire-and-forget）
    // アップロード成功後、MAIMLファイルのみバックグラウンドでEmbedding生成・DB保存する
    if (result?.files) {
      const maimlFiles = result.files.filter(
        (f: { filePath: string }) => f.filePath.endsWith('.maiml')
      );
      for (const f of maimlFiles) {
        ingestSingleFileAsync(organizationId, f.filePath);
        console.log(`🔍 [fileAccessController] セマンティック検索インデックス更新をキューに追加: ${f.filePath}`);
      }
    }

  } catch (error: any) {
    // エラーハンドリング
    logError('File upload error', error, {
      action: 'file_upload',
      organizationId: req.user?.organizationId,
      uploadMode: req.body?.uploadMode,
      targetPath: req.body?.targetPath,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイルが選択されていません') ||
          error.message.includes('単一ファイルモード') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('アップロード') || 
               error.message.includes('ストレージ') ||
               error.message.includes('メタデータの保存')) {
        statusCode = 500;
        errorCode = 'E4006';
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
 * ファイルキーベースの汎用ダウンロード用署名付きURL取得エンドポイント
 * POST /api/v1/files/download-url
 * 
 * Task: S3ファイルダウンロード共通化
 * - ファイルキーを直接指定して署名付きURLを取得
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * Requirements: 認証、マルチテナント分離、ファイル存在確認、署名付きURL生成
 */
export async function getFileDownloadUrl(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { organizationId } = req.user!;
    const { fileKey } = req.body;

    // Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const result = await service.streamFileByKey(
      organizationId,
      fileKey
    );

    // 4. レスポンスヘッダーを設定
    const encodedFileName = encodeURIComponent(result.metadata.fileName);
    res.setHeader('Content-Type', result.metadata.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Length', result.buffer.length.toString());

    // 5. ファイルバッファをレスポンスとして送信
    res.status(200).send(result.buffer);

  } catch (error: any) {
    // 6. エラーハンドリング
    logError('Generic file download error', error, {
      action: 'file_download_by_key',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイルキー') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('署名付きURL') || 
               error.message.includes('ストレージ') ||
               error.message.includes('メタデータ')) {
        statusCode = 500;
        errorCode = 'E4006';
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
 * ファイルテキスト内容プロキシ取得エンドポイント
 * POST /api/v1/files/content-as-text
 *
 * ファイルキーを指定してバックエンドがストレージから直接取得し、
 * テキスト文字列としてレスポンスする（署名付きURL経由のfetchを不要にする）
 */
export async function getFileContentAsText(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { fileKey } = req.body;

    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const result = await service.streamFileByKey(organizationId, fileKey);

    const text = result.buffer.toString('utf-8');

    res.status(200).json({
      success: true,
      data: { content: text },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error: any) {
    logError('File content as text error', error, {
      action: 'file_content_as_text',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      requestId,
    });

    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      if (error.message.includes('見つかりません') || error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      } else if (error.message.includes('パストラバーサル') || error.message.includes('不正な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * ファイル表示用署名付きURL取得エンドポイント
 * POST /api/v1/files/view-url
 *
 * Task: ビューアボタン修正 - 画像・TIFFファイルの表示用URL取得
 * - ファイルキーを直接指定して表示用の署名付きURLを返す
 * - Content-Dispositionを付与しない（ブラウザでインライン表示可能）
 */
export async function getFileViewUrl(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId } = req.user!;
    const { fileKey } = req.body;

    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    const result = await service.getSignedViewUrl(organizationId, fileKey);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error: any) {
    logError('File view URL error', error, {
      action: 'file_view_url',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      requestId,
    });

    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      if (error.message.includes('見つかりません') || error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}


/**
 * ファイル削除エンドポイント
 * DELETE /api/v1/files/delete
 * 
 * Task: ファイル削除API共通化
 * - ファイルキー（相対パス）を指定してファイルを削除
 * - フォーマット、プロジェクト、その他のファイルで共通利用可能
 * 
 * Task: プロジェクト管理画面maimlファイル削除時project_status確認（2026-03-27）
 * - オプショナルパラメータ: checkProjectStatus
 * - checkProjectStatus=trueかつmaimlファイルの場合、project_status=0をチェック
 * - maimlファイル削除後、project_maiml_flg=falseに更新
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { organizationId } = req.user!;
    const { fileKey, checkProjectStatus } = req.body;

    console.log('🗑️ [File Delete] リクエスト開始:', {
      organizationId,
      fileKey,
      checkProjectStatus,
      requestId,
    });

    // ① オプショナル: project_statusチェック（checkProjectStatus === true の場合のみ）
    if (checkProjectStatus === true) {
      const fileName = fileKey.split('/').pop() || '';
      const isMaimlFile = fileName.endsWith('.maiml');

      if (isMaimlFile) {
        console.log('📝 [File Delete] maimlファイル検出、project_statusチェック開始');

        // fileKeyからプロジェクト名を抽出 (projects/{projectName}/...)
        const pathParts = fileKey.split('/');
        if (pathParts.length >= 2 && pathParts[0] === 'projects') {
          const projectName = pathParts[1];

          // プロジェクト情報を取得
          const project = await projectRepository.findProjectIdByName(
            organizationId,
            projectName
          );

          if (!project) {
            res.status(404).json({
              success: false,
              error: {
                code: 'E6001',
                message: 'プロジェクトが見つかりません',
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId,
              },
            });
            return;
          }

          // プロジェクトの詳細情報を取得（project_statusを含む）
          const projectInfo = await projectRepository.findByIdWithOrganization(
            organizationId,
            project.project_id
          );

          // project_status != 0 の場合はエラー
          if (projectInfo && projectInfo.project_status !== 0) {
            // code_masterテーブルからステータス名を取得
            const currentStatusMaster = await codeMasterRepository.findByValue(
              organizationId,
              'project_status',
              String(projectInfo.project_status)
            );
            const requiredStatusMaster = await codeMasterRepository.findByValue(
              organizationId,
              'project_status',
              '0'
            );

            const currentStatusName = currentStatusMaster?.code_name;
            const requiredStatusName = requiredStatusMaster?.code_name;

            console.log('❌ [File Delete] project_statusチェック失敗:', {
              currentStatus: projectInfo.project_status,
              currentStatusName,
            });

            res.status(400).json({
              success: false,
              error: {
                code: 'E7005',
                message: `プロジェクトステータスが計画中ではないため、MAIMLファイルを削除できません（現在のステータス: ${currentStatusName}）`,
                details: {
                  projectName,
                  currentStatus: projectInfo.project_status,
                  currentStatusName,
                  requiredStatus: 0,
                  requiredStatusName,
                },
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId,
              },
            });
            return;
          }

          console.log('✅ [File Delete] project_statusチェック通過（status=0）');
        } else {
          console.log('⚠️ [File Delete] fileKeyがprojects/配下ではないため、project_statusチェックスキップ');
        }
      } else {
        console.log('ℹ️ [File Delete] maimlファイル以外のため、project_statusチェックスキップ');
      }
    }

    // ② 削除処理（Service層で project_maiml_flg 更新も実行）
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    await service.deleteFileByKey(
      organizationId,
      fileKey,
      { updateProjectFlag: checkProjectStatus === true }  // オプション渡す
    );

    console.log('✅ [File Delete] ファイル削除成功:', fileKey);

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'ファイルを削除しました',
        fileKey,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    // エラーハンドリング
    logError('File delete error', error, {
      action: 'file_delete',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // ValidationErrorのチェック
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイルキー') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // NotFoundErrorのチェック
      else if (error.message.includes('見つかりません') || 
               error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('削除') || 
               error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'E4006';
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
 * バッチ履歴取得
 * GET /api/v1/files/batches
 * 
 * Phase2-1: バッチ管理機能（2026-02-18）
 */
export async function getBatchHistory(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    console.log(`📦 [Batch History] リクエスト開始:`, {
      organizationId: req.organizationId,
      query: req.query,
      requestId,
    });

    const { organizationId } = req as any;
    const { status, startDate, endDate, limit, offset } = req.query;

    const batches = await UploadBatchRepository.search({
      organizationId,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    console.log(`✅ [Batch History] 取得成功: ${batches.length}件`);

    res.json({
      success: true,
      data: batches,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        count: batches.length,
      },
    });

  } catch (error: any) {
    console.error(`❌ [Batch History] エラー:`, {
      error: error.message,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'E4002',
        message: 'バッチ履歴の取得に失敗しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * バッチ進捗取得
 * GET /api/v1/files/batches/:batchId/progress
 * 
 * Phase2-1: バッチ管理機能（2026-02-18）
 */
export async function getBatchProgress(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { batchId } = req.params;

    console.log(`📊 [Batch Progress] リクエスト開始:`, {
      batchId,
      requestId,
    });

    const progress = await UploadBatchRepository.getProgress(batchId);

    if (!progress) {
      console.log(`⚠️ [Batch Progress] バッチが見つかりません: ${batchId}`);
      
      res.status(404).json({
        success: false,
        error: {
          code: 'E6001',
          message: 'バッチが見つかりません',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    console.log(`✅ [Batch Progress] 取得成功:`, progress);

    res.json({
      success: true,
      data: progress,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    console.error(`❌ [Batch Progress] エラー:`, {
      error: error.message,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'E4002',
        message: 'バッチ進捗の取得に失敗しました',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

/**
 * バッチキャンセル
 * POST /api/v1/files/batches/:batchId/cancel
 * 
 * Task: アップロードキャンセル機能実装
 * - 指定されたバッチのアップロード処理をキャンセル
 * - 既にアップロードされたファイルを削除
 * - バッチステータスを'cancelled'に更新
 */
export async function cancelBatch(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  
  try {
    const { organizationId } = req.user!;
    const { batchId } = req.params;

    console.log(`🚫 [Batch Cancel] リクエスト開始:`, {
      organizationId,
      batchId,
      requestId,
    });

    // Service層の初期化と呼び出し
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    await service.cancelBatch(organizationId, batchId);

    console.log(`✅ [Batch Cancel] キャンセル成功: ${batchId}`);

    res.json({
      success: true,
      data: {
        message: 'バッチをキャンセルしました',
        batchId,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    logError('Batch cancel error', error, {
      action: 'batch_cancel',
      organizationId: req.user?.organizationId,
      batchId: req.params?.batchId,
      requestId,
    });

    // エラータイプに応じたステータスコードとレスポンス
    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      // NotFoundErrorのチェック
      if (error.message.includes('見つかりません') || 
          error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      }
      // ValidationErrorのチェック
      else if (error.message.includes('既に') || 
               error.message.includes('キャンセル') ||
               error.message.includes('完了')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      }
      // StorageErrorのチェック
      else if (error.message.includes('削除') || 
               error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'E4006';
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
