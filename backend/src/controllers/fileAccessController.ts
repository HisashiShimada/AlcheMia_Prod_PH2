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
import { ChunkUploadService } from '../services/chunkUploadService';
import * as projectRepository from '../repositories/projectRepository';
import { ProjectService } from '../services/projectService';
import * as codeMasterRepository from '../repositories/codeMasterRepository';
import { renameFile } from '../services/renameService';
import { Project } from '../types/database';
import { AppError } from '../enums/errorCodes';

/**
 * AppError.code または日本語メッセージキーワードから HTTP ステータスとエラーコードを導出する
 * （fileAccessService が AppError に移行するまでのフォールバックを含む）
 */
function resolveFileError(error: unknown): { statusCode: number; errorCode: string; errorMessage: string } {
  const msg = error instanceof Error ? error.message : '';

  if (error instanceof AppError) {
    let statusCode = 500;
    if (error.code === 'E1003') statusCode = 400;
    else if (error.code === 'E5015') statusCode = 403;
    else if (error.code === 'E6001' || error.code === 'E6002') statusCode = 404;
    else if (error.code === 'E4006') statusCode = 500;
    return { statusCode, errorCode: error.code, errorMessage: msg };
  }

  // フォールバック: 日本語メッセージキーワードで分類（service 移行まで維持）
  if (msg.includes('パストラバーサル') || msg.includes('不正なファイルパス') ||
      msg.includes('ファイル名') || msg.includes('無効な') || msg.includes('ファイルキー') ||
      msg.includes('不正なフォルダパス') || msg.includes('フォルダパス') ||
      msg.includes('ファイルが選択されていません') || msg.includes('単一ファイルモード')) {
    return { statusCode: 400, errorCode: 'E1003', errorMessage: msg };
  }
  if (msg.includes('アクセス権限') || msg.includes('権限がありません')) {
    return { statusCode: 403, errorCode: 'E5015', errorMessage: msg };
  }
  if (msg.includes('見つかりません') || msg.includes('存在しません')) {
    return { statusCode: 404, errorCode: 'E6001', errorMessage: msg };
  }
  if (msg.includes('署名付きURL') || msg.includes('ストレージ') || msg.includes('メタデータ') ||
      msg.includes('ZIP生成') || msg.includes('ファイル一覧') || msg.includes('アップロード') ||
      msg.includes('削除')) {
    return { statusCode: 500, errorCode: 'E4006', errorMessage: msg };
  }
  return { statusCode: 500, errorCode: 'E4001', errorMessage: 'システムエラーが発生しました' };
}

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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * ファイル名変更エンドポイント
 * PATCH /api/v1/files/rename
 *
 * - fileKey: 対象ファイルの相対パス（organizationId なし）
 * - newFileName: 新しいファイル名（拡張子込み）
 * - 拡張子の変更は不可
 * - 同名ファイルが存在する場合はエラー
 * - S3 コピー→削除 + file_metadata 更新（アーカイブも含む）
 */
export async function renameFileHandler(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId, userId } = req.user!;
    // バリデーションはミドルウェア（fileAccessRoutes.ts）で実施済み
    const { fileKey, newFileName } = req.body;

    console.log('✏️ [File Rename] リクエスト開始:', { organizationId, fileKey, newFileName, requestId });

    const result = await renameFile({
      organizationId,
      fileKey,
      newFileName: newFileName.trim(),
      userId,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        E1003: 400,
        E6002: 404,
        E6005: 409,
        E4006: 500,
        E4001: 500,
      };
      const code = result.error?.code ?? 'E4001';
      const status = statusMap[code] ?? 500;

      console.warn('⚠️ [File Rename] リネーム失敗:', result.error);
      res.status(status).json({
        success: false,
        error: result.error,
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    console.log('✅ [File Rename] リネーム成功:', { fileKey, newFileKey: result.newFileKey });

    res.status(200).json({
      success: true,
      data: { newFileKey: result.newFileKey },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error: any) {
    logError('File rename error', error, {
      action: 'file_rename',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      newFileName: req.body?.newFileName,
      requestId,
    });
    res.status(500).json({
      success: false,
      error: { code: 'E4001', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
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

    // MAIMLバリデーションエラーのチェック（致命的エラー）- 特殊形式のため先行処理
    if (error.message?.startsWith('MAIML_VALIDATION_ERROR:')) {
      try {
        const payload = JSON.parse(error.message.slice('MAIML_VALIDATION_ERROR:'.length));
        res.status(400).json({
          success: false,
          error: {
            code: 'MAIML_VALIDATION_ERROR',
            message: `MAIMLファイルに致命的なエラーがあります: ${payload.fileName}`,
            details: {
              fileName: payload.fileName,
              errorCount: payload.errorCount,
              errors: payload.errors,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      } catch (_parseError) {
        // パース失敗時は resolveFileError() にフォールスルー
      }
    }

    // その他のエラーは resolveFileError() で統一処理（AppError 優先 + 日本語フォールバック）
    const { statusCode, errorCode, errorMessage } = resolveFileError(error);

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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * チャンクアップロードセッション開始
 * POST /api/v1/files/chunks/init
 *
 * uploadId（UUID）を発行し、一時ディレクトリを準備する。
 */
export async function initChunkUpload(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { fileName, totalChunks, filePath } = req.body;

    // MAIMLファイル名 × projectName バリデーション（通常アップロードと同一ロジック）
    // projects/ パスへの .maiml アップロード時、ファイル名（拡張子除く）がプロジェクト名と一致するか確認
    if (typeof fileName === 'string' && fileName.endsWith('.maiml') &&
        typeof filePath === 'string' && filePath.startsWith('projects/')) {
      const pathParts = filePath.split('/');
      if (pathParts.length >= 2) {
        const projectName = pathParts[1];
        const fileBaseName = fileName.replace(/\.maiml$/i, '');
        if (fileBaseName !== projectName) {
          console.error(`❌ [ChunkInit] MAIMLファイル名不一致: ファイル名=${fileName}, プロジェクト名=${projectName}`);
          res.status(400).json({
            success: false,
            error: {
              code: 'E1003',
              message: `ファイル名がプロジェクト名と一致しません（ファイル名: ${fileName}、プロジェクト名: ${projectName}）`,
            },
            meta: { timestamp: new Date().toISOString(), requestId },
          });
          return;
        }
      }
    }

    const service = new ChunkUploadService();
    const uploadId = service.initSession(fileName, filePath, Number(totalChunks));

    res.status(200).json({
      success: true,
      data: { uploadId },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error: any) {
    logError('Chunk upload init error', error, { action: 'chunk_upload_init', requestId });
    res.status(500).json({
      success: false,
      error: { code: 'E4001', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * チャンク受信
 * POST /api/v1/files/chunks/:uploadId
 *
 * チャンクデータを受け取り、一時ディレクトリに保存する。
 */
export async function uploadChunk(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { uploadId } = req.params;
    const chunkIndex = Number(req.body.chunkIndex);
    const chunk = req.file;

    if (!chunk) {
      res.status(400).json({
        success: false,
        error: { code: 'E1003', message: 'チャンクデータが存在しません' },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    const service = new ChunkUploadService();
    const received = service.saveChunk(uploadId, chunkIndex, chunk.buffer);

    res.status(200).json({
      success: true,
      data: { received },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error: any) {
    logError('Chunk upload error', error, { action: 'chunk_upload', requestId });

    const isNotFound = error.message?.includes('見つかりません');
    res.status(isNotFound ? 404 : 500).json({
      success: false,
      error: {
        code: isNotFound ? 'E6001' : 'E4001',
        message: isNotFound ? error.message : 'システムエラーが発生しました',
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * チャンクアップロード中断
 * DELETE /api/v1/files/chunks/:uploadId
 *
 * セッションを中断し、一時ファイルを削除する。
 * ダイアログを閉じたときなど、complete を呼ばずに終了するときに使用する。
 */
export async function abortChunkUpload(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { uploadId } = req.params;

    const service = new ChunkUploadService();
    service.abortSession(uploadId);

    res.status(200).json({
      success: true,
      data: { message: 'アップロードを中断しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error: any) {
    logError('Chunk abort error', error, { action: 'chunk_abort', requestId });
    res.status(500).json({
      success: false,
      error: { code: 'E4001', message: 'システムエラーが発生しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}

/**
 * チャンク結合・アップロード完了
 * POST /api/v1/files/chunks/:uploadId/complete
 *
 * 全チャンクを結合してストレージに保存し、一時ファイルを削除する。
 * - file_metadataテーブルへの保存
 * - MAIMLファイル かつ projects/ パスの場合に project_maiml_flg=true を更新
 *   ※ projectId を個別に渡さなくても filePath のプレフィックスで判定するため、
 *     フォーマットアップロード（projects/ 以外）は自動的にスキップされる
 */
export async function completeChunkUpload(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId, userId } = req.user!;
    const { uploadId } = req.params;
    const totalChunks = Number(req.body.totalChunks);
    const contentType: string = req.body.contentType || 'application/octet-stream';
    const batchId: string | undefined = req.body.batchId;

    // チャンク結合・ストレージ保存
    const chunkService = new ChunkUploadService();
    const result = await chunkService.completeUpload(uploadId, organizationId, totalChunks, contentType);

    // ──────────────────────────────────────────────────────────────────────
    // キャンセル競合チェック
    // completeUpload がストレージに書き込んだ後で batchId のステータスが
    // 'cancelled' になっている場合、アップロード済みファイルを即削除して
    // エラーを返す（「キャンセル → complete 完了」の競合状態を防ぐ）
    // ──────────────────────────────────────────────────────────────────────
    if (batchId) {
      const batch = await UploadBatchRepository.findById(batchId);
      if (batch?.status === 'cancelled') {
        // ストレージからファイルを削除（best-effort）
        try {
          const { getStorageService: _getStorage } = await import('../services/storageService');
          const _storageService = _getStorage();
          await _storageService.deleteFile(organizationId, result.fileKey);
          console.log(`🗑️ [ChunkComplete] キャンセル競合: アップロード済みファイルを削除: ${result.fileKey}`);
        } catch (deleteErr) {
          console.error(`⚠️ [ChunkComplete] キャンセル競合: ファイル削除失敗（処理続行）:`, deleteErr);
        }
        res.status(409).json({
          success: false,
          error: {
            code: 'E7005',
            message: 'アップロードはキャンセル済みのため、ファイルを保存できませんでした',
          },
          meta: { timestamp: new Date().toISOString(), requestId },
        });
        return;
      }
    }

    // file_metadata テーブルへ保存
    // - fileKey 例: "projects/sample_project/sample_project.maiml"
    //   （storageService が organizationId プレフィックスを付与して返す場合もある）
    // - saveFileMetadata は FileAccessService の private メソッドのため、
    //   同等処理を直接 FileMetadataRepository 経由で実行する
    const { FileMetadataRepository } = await import('../repositories/fileMetadataRepository');
    const { truncateField, FILE_METADATA_MAX_LENGTHS } = await import('../utils/stringValidator');
    const { getStorageService } = await import('../services/storageService');

    const repository = new FileMetadataRepository();
    const storageService = getStorageService();

    const fileName = result.fileKey.split('/').pop() || result.fileKey;
    const parentFolderPath = result.fileKey.includes('/')
      ? result.fileKey.substring(0, result.fileKey.lastIndexOf('/'))
      : undefined;
    const now = new Date();

    // フロントから渡された batchId を upload_batch_id として使用する。
    // これにより cancelBatch の findByBatchId でファイルが正しく検索される。
    // batchId がない場合のみ新規 UUID を生成（後方互換）。
    const effectiveBatchId = batchId ?? uuidv4();

    const isMaimlFile = result.contentType === 'application/xml' || fileName.endsWith('.maiml');

    // 全ファイルタイプで file_metadata へ保存する。
    // is_maiml_file フラグでMAIML/非MAIMLを区別する。
    // これにより cancelBatch がチャンクアップロード済みファイルを確実に削除できる。
    try {
      await repository.insertFileMetadata({
        organization_id: organizationId,
        file_key: truncateField(result.fileKey, FILE_METADATA_MAX_LENGTHS.file_key, 'file_key') || result.fileKey,
        original_filename: truncateField(fileName, FILE_METADATA_MAX_LENGTHS.original_filename, 'original_filename') || fileName,
        file_size: result.fileSize,
        file_type: result.contentType,
        uploaded_by: userId,
        is_maiml_file: isMaimlFile,
        s3_bucket: storageService.getBucketName(),
        upload_batch_id: effectiveBatchId,
        upload_source: 'web_upload',
        upload_method: 'multipart',
        create_user_id: userId,
        update_user_id: userId,
        file_hash: result.fileHash,
        ...(parentFolderPath && { parent_folder_path: parentFolderPath }),
        created_at: now,
        updated_at: now,
      } as any);
      console.log(`✅ [ChunkComplete] file_metadata保存成功: ${result.fileKey} (batchId=${effectiveBatchId})`);
    } catch (dbError) {
      // file_metadata INSERT失敗は警告ログのみ（ストレージへのロールバックなし・処理続行）
      console.error(`⚠️ [ChunkComplete] file_metadata INSERT失敗（処理続行）: ${result.fileKey}`, dbError);
    }

    // project_maiml_flg 更新
    // filePath が projects/ で始まる かつ MAIMLファイルの場合のみ実行
    // → フォーマットアップロード等は projects/ 以外のため自動的にスキップされる
    // ※ storageService.uploadFile() が返す fileKey には organizationId プレフィックスが付く場合があるため、
    //   相対パス（organizationId を除いた部分）に変換してから判定する
    const relativeFileKey = result.fileKey.startsWith(`${organizationId}/`)
      ? result.fileKey.slice(organizationId.length + 1)
      : result.fileKey;

    if (fileName.endsWith('.maiml') && relativeFileKey.startsWith('projects/')) {
      const pathParts = relativeFileKey.split('/');
      if (pathParts.length >= 2 && pathParts[0] === 'projects') {
        const projectName = pathParts[1];
        try {
          const existingProject = await projectRepository.findByName(organizationId, projectName);

          if (!existingProject) {
            console.warn(`⚠️ [ChunkComplete] プロジェクトが見つかりません: ${projectName}`);
          } else if (!existingProject.project_maiml_flg) {
            const updatedProject: Project = {
              ...existingProject,
              project_maiml_flg: true,
            };
            await projectRepository.update(updatedProject);
            console.log(`✅ [ChunkComplete] project_maiml_flg=true更新完了: ${projectName}`);
          } else {
            console.log(`ℹ️ [ChunkComplete] project_maiml_flgは既にtrue: ${projectName}`);
          }
        } catch (flagError) {
          // フラグ更新失敗は警告のみ（ファイルアップロードは成功しているため処理続行）
          console.error(`❌ [ChunkComplete] project_maiml_flg更新失敗（処理続行）:`, {
            projectName,
            error: flagError,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        fileKey: result.fileKey,
        fileSize: result.fileSize,
        contentType: result.contentType,
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (error: any) {
    logError('Chunk complete error', error, { action: 'chunk_complete', requestId });

    const isNotFound = error.message?.includes('見つかりません');
    const isMismatch = error.message?.includes('チャンク数が不一致');
    res.status(isNotFound || isMismatch ? 400 : 500).json({
      success: false,
      error: {
        code: isNotFound || isMismatch ? 'E1003' : 'E4001',
        message: isNotFound || isMismatch ? error.message : 'システムエラーが発生しました',
      },
      meta: { timestamp: new Date().toISOString(), requestId },
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
 * バッチ先行作成
 * POST /api/v1/files/batches/init
 *
 * アップロード開始前にバッチを in_progress 状態で先行作成し、batchId を返す。
 * フロントエンドはこの batchId を使ってアップロード途中でもキャンセルを実行できる。
 */
export async function initBatch(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();

  try {
    const { organizationId, userId } = req.user!;
    const { batchName, uploadType, totalFiles } = req.body as {
      batchName?: string;
      uploadType: 'single' | 'bulk' | 'folder';
      totalFiles?: number;
    };

    console.log(`📦 [Batch Init] リクエスト開始:`, {
      organizationId,
      uploadType,
      batchName,
      requestId,
    });

    const batch = await UploadBatchRepository.create({
      batchName: batchName || `Upload ${new Date().toISOString()}`,
      uploadType,
      organizationId,
      uploadedBy: userId,
      totalFiles: totalFiles ?? 0,
    });

    console.log(`✅ [Batch Init] バッチ先行作成成功: ${batch.batchId}`);

    res.status(201).json({
      success: true,
      data: {
        batchId: batch.batchId,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    logError('Batch init error', error, {
      action: 'batch_init',
      organizationId: req.user?.organizationId,
      requestId,
    });

    res.status(500).json({
      success: false,
      error: { code: 'E4001', message: 'バッチの作成に失敗しました' },
      meta: { timestamp: new Date().toISOString(), requestId },
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

    const { statusCode, errorCode, errorMessage } = resolveFileError(error);
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }
}
