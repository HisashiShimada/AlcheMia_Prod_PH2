/**
 * ファイルアクセスサービス
 * 
 * ファイルのダウンロード、アップロード、削除などのファイルアクセス処理を提供
 * - プロジェクトアクセス権限チェック
 * - file_metadataテーブルとの連携
 * - ダウンロード履歴記録
 * - ファイル存在確認（メタデータ + ストレージ）
 * 
 * Task 3.1: 単一ファイルダウンロード用署名付きURL生成機能
 * Task 3.3: プロジェクト一括ダウンロード用署名付きURLリスト生成機能
 * Requirements: 1, 2, 4, 5, 8, 11, 12
 */

import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { getStorageService } from './storageService';
import { ProjectAccessValidator } from './projectAccessValidator';
import { sanitizeFileName } from '../utils/filePathValidator';
import { logDownloadHistory } from '../utils/downloadLogger';
import {
  ValidationError,
  NotFoundError,
  StorageError,
} from '../utils/errorClasses';
import archiver from 'archiver';
import {
  UploadMetadata,
  FileUploadResult,
  MulterFile,
  PlaceholderResult,
} from '../types/file';
import uploadBatchRepository from '../repositories/UploadBatchRepository';
import { UploadType, BatchStatus } from '../types/uploadBatch';
import { processConcurrently, getConcurrency } from '../utils/concurrencyControl';
import { analyzeMaimlFile, isMaimlFile } from '../utils/maimlAnalyzer';
import { truncateField, FILE_METADATA_MAX_LENGTHS } from '../utils/stringValidator';

/**
 * ファイルストリームレスポンス（プロキシ方式）
 */
export interface FileStreamResponse {
  buffer: Buffer;
  metadata: {
    fileName: string;
    contentType: string;
    fileSize: number;
    uploadedAt: Date;
    uploadedBy: string;
  };
}

/**
 * ファイルアクセスサービスクラス
 * 
 * ファイルのダウンロード、アップロード、削除などのアクセス処理を統合管理
 */
export class FileAccessService {
  private repository: FileMetadataRepository;
  private storageService: any;
  private accessValidator: ProjectAccessValidator;

  constructor(
    repository?: FileMetadataRepository,
    accessValidator?: ProjectAccessValidator
  ) {
    this.repository = repository || new FileMetadataRepository();
    this.storageService = getStorageService();
    this.accessValidator = accessValidator || new ProjectAccessValidator();
  }

  /**
   * ファイルが存在するか確認する
   * 
   * Task 3.4: ファイル存在確認機能
   * - file_metadataテーブルでメタデータの存在を確認
   * - storageService.fileExists()でS3/Swift上のファイル存在を確認
   * - ファイルが存在しない場合はNotFoundErrorをスロー
   * - メタデータはあるがS3上にない場合はStorageErrorをスロー
   * 
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param fileName ファイル名
   * @returns ファイルメタデータ
   * @throws NotFoundError ファイルが存在しない場合
   * @throws StorageError メタデータは存在するがS3上にファイルがない場合
   */
  async verifyFileExists(
    organizationId: string,
    projectId: string,
    fileName: string
  ) {
    // 1. ファイル名のサニタイゼーション
    const sanitizedFileName = sanitizeFileName(fileName);

    // 2. file_metadataテーブルでメタデータの存在を確認
    const fileMetadata = await this.repository.getFileMetadata(
      organizationId,
      projectId,
      sanitizedFileName
    );

    if (!fileMetadata) {
      throw new NotFoundError(
        `ファイルメタデータが見つかりません: ${sanitizedFileName}`
      );
    }

    // 3. S3/Swift上のファイル存在を確認
    const filePath = fileMetadata.file_key;
    const existsInStorage = await this.storageService.fileExists(
      organizationId,
      filePath
    );

    if (!existsInStorage) {
      throw new StorageError(
        `ファイルメタデータは存在しますが、ストレージ上にファイルが見つかりません: ${sanitizedFileName}`
      );
    }

    return fileMetadata;
  }


  /**
   * 単一ファイルをストリームとして取得（プロキシ方式）
   * 
   * @param userId ユーザーID
   * @param projectId プロジェクトID
   * @param organizationId 組織ID
   * @param fileName ファイル名
   * @returns ファイルストリーム情報（Buffer + メタデータ）
   * @throws ValidationError バリデーションエラー
   * @throws AuthorizationError 権限不足
   * @throws NotFoundError ファイルが存在しない場合
   * @throws StorageError ストレージエラーの場合
   */
  async streamFile(
    userId: string,
    projectId: string,
    organizationId: string,
    fileName: string
  ): Promise<FileStreamResponse> {
    // 1. プロジェクトアクセス権限の検証
    await this.accessValidator.validateAccess(
      userId,
      projectId,
      organizationId
    );

    // 2. ファイル存在確認（メタデータとストレージ両方）
    const fileMetadata = await this.verifyFileExists(
      organizationId,
      projectId,
      fileName
    );

    // 3. S3パスの取得
    const filePath = fileMetadata.file_key;

    // 4. ストレージからファイルをダウンロード（Buffer取得）
    const buffer = await this.storageService.downloadFile(
      organizationId,
      filePath
    );

    // 5. ダウンロード履歴のログ記録
    logDownloadHistory({
      userId,
      organizationId,
      projectId,
      fileName: fileMetadata.original_filename,
    });

    // 6. レスポンスオブジェクトの構築
    return {
      buffer,
      metadata: {
        fileName: fileMetadata.original_filename,
        contentType: fileMetadata.file_type || 'application/octet-stream',
        fileSize: fileMetadata.file_size,
        uploadedAt: fileMetadata.updated_at || fileMetadata.created_at || new Date(),
        uploadedBy: userId, // FileMetadataにはuploadedByがないため、現在のuserIdを使用
      },
    };
  }

  /**
   * ファイルキーベースでファイルをストリームとして取得（プロキシ方式）
   * 
   * Task: S3ファイルダウンロード共通化 - プロキシ版
   * - ファイルキーを直接指定してファイルをストリームで取得
   * - プロジェクト、フォーマット、その他のファイルで共通利用可能
   * 
   * @param organizationId 組織ID
   * @param fileKey ファイルキー（相対パス）
   * @returns ファイルストリーム情報（Buffer + メタデータ）
   * @throws ValidationError ファイルキーが不正な場合
   * @throws NotFoundError ファイルが存在しない場合
   * @throws StorageError ストレージエラーの場合
   */
  /**
   * ファイル表示用署名付きURL取得
   * Task: ビューアボタン修正 - 画像・TIFFファイルの表示用URL取得
   * - Content-Dispositionを付与しない（インライン表示用）
   * - 有効期限1時間
   */
  async getSignedViewUrl(
    organizationId: string,
    fileKey: string
  ): Promise<{ url: string; expiresAt: string; expiresIn: number }> {
    // ファイル存在確認
    const exists = await this.storageService.fileExists(organizationId, fileKey);
    if (!exists) {
      throw new Error(`ファイルが見つかりません: ${fileKey}`);
    }

    const expiresIn = 3600;
    const url = await this.storageService.getSignedUrl(organizationId, fileKey, expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { url, expiresAt, expiresIn };
  }

  async streamFileByKey(
    organizationId: string,
    fileKey: string
  ): Promise<FileStreamResponse> {
    // 1. ファイルキーのバリデーション
    if (!fileKey || fileKey.trim().length === 0) {
      throw new ValidationError('ファイルキーは必須です');
    }

    // パストラバーサル攻撃対策
    if (fileKey.includes('..') || fileKey.includes('//')) {
      throw new ValidationError('不正なファイルパスが検出されました');
    }

    // 2. ストレージ上のファイル存在確認
    const existsInStorage = await this.storageService.fileExists(
      organizationId,
      fileKey
    );

    if (!existsInStorage) {
      throw new NotFoundError(
        `ファイルが見つかりません: ${fileKey}`
      );
    }

    // 3. ファイルメタデータを取得
    let fileMetadata;
    try {
      fileMetadata = await this.storageService.getFileMetadata(
        organizationId,
        fileKey
      );
    } catch (error) {
      throw new StorageError(
        `ファイルメタデータの取得に失敗しました: ${fileKey}`
      );
    }

    // 4. ストレージからファイルをダウンロード（Buffer取得）
    const buffer = await this.storageService.downloadFile(
      organizationId,
      fileKey
    );

    // 5. ファイル名を抽出
    const fileName = fileKey.split('/').pop() || fileKey;

    // 6. レスポンスオブジェクトの構築
    return {
      buffer,
      metadata: {
        fileName,
        contentType: fileMetadata.contentType || 'application/octet-stream',
        fileSize: fileMetadata.size,
        uploadedAt: fileMetadata.lastModified,
        uploadedBy: 'system', // メタデータにuploadedByがないため固定値
      },
    };
  }

  /**
   * ファイルをアップロード（単一または複数）
   * 
   * Task: S3ファイルアップロード統一化
   * - 各画面で生成された完全なパスを使用してファイルをアップロード
   * - プロジェクト、フォーマット、その他のファイルで共通利用可能
   * 
   * Phase1-3: 空フォルダプレースホルダー対応（2026-02-18）
   * Phase2-1: バッチ管理機能統合（2026-02-18）
   * 
   * @param organizationId 組織ID
   * @param userId ユーザーID
   * @param uploadMode アップロードモード（single, bulk, folder）
   * @param targetPath ターゲットパス（各画面で完全なパスを生成、相対パス）
   * @param files アップロードするファイル配列
   * @param metadata 追加メタデータ
   * @param emptyFolders 空フォルダパスの配列（Phase1-3）
   * @returns アップロード結果
   * @throws ValidationError バリデーションエラー
   * @throws StorageError ストレージエラー
   */
  async uploadFiles(
    organizationId: string,
    userId: string,
    uploadMode: 'single' | 'bulk' | 'folder',
    targetPath: string,
    files: MulterFile[],
    metadata?: UploadMetadata,
    emptyFolders?: string[],
    filePaths?: string[]
  ): Promise<FileUploadResult> {
    // 1. バリデーション
    if (!files || files.length === 0) {
      throw new ValidationError('ファイルが選択されていません');
    }

    if (uploadMode === 'single' && files.length > 1) {
      throw new ValidationError('単一ファイルモードでは1つのファイルのみアップロード可能です');
    }

    // パストラバーサル攻撃対策
    if (targetPath.includes('..') || targetPath.includes('//')) {
      throw new ValidationError('不正なファイルパスが検出されました');
    }

    // 2. Phase2-1: バッチ作成
    const uploadType: UploadType = uploadMode as UploadType;
    const batchName = metadata?.batchName || `${uploadMode} upload - ${new Date().toISOString()}`;
    
    const batch = await uploadBatchRepository.create({
      batchName,
      uploadType,
      organizationId,
      uploadedBy: userId,
      totalFiles: files.length,
    });

    console.log(`📦 [Upload] バッチ作成完了: ${batch.batchId}`);

    // 3. ターゲットパスの正規化
    const normalizedPath = targetPath.replace(/^\/+|\/+$/g, '');

    // 4. Phase2-2: 並列処理制御でファイルをアップロード
    const concurrency = getConcurrency();
    console.log(`🔄 [Upload] 並列処理開始: ${files.length}ファイル (並列数: ${concurrency})`);

    const uploadResults = await processConcurrently(
      files,
      async (file, index) => {
        // filePathsが提供されている場合はそちらを優先使用（フォルダアップロード対応）
        const originalPath = filePaths && filePaths[index] ? filePaths[index] : file.originalname;
        
        console.log(`📁 [Upload] ファイル${index}: ${originalPath}`);
        
        // パスとファイル名を分離してサニタイズ
        const pathParts = originalPath.split('/');
        const sanitizedParts = pathParts.map(part => {
          // 各パート（フォルダ名/ファイル名）を個別にサニタイズ
          return sanitizeFileName(part);
        });
        const sanitizedRelativePath = sanitizedParts.join('/');
        
        // ファイル名を抽出（パスの最後の要素）
        const sanitizedFileName = sanitizedParts[sanitizedParts.length - 1];
        
        // ファイルパスの構築
        const filePath = `${normalizedPath}/${sanitizedRelativePath}`;
        console.log(`✅ [Upload] アップロード先: ${filePath}`);

        // storageServiceを使用してS3/Swiftにアップロード
        const s3Key = await this.storageService.uploadFile(
          organizationId,
          filePath,
          file.buffer,
          { contentType: file.mimetype }
        );

        // file_metadataテーブルに保存（Phase2-1: バッチIDを紐付け）
        const fileId = await this.saveFileMetadata({
          organizationId,
          userId,
          fileName: sanitizedFileName,
          filePath,
          s3Key,
          fileSize: file.size,
          contentType: file.mimetype,
          projectId: metadata?.projectId,
          formatId: metadata?.formatId,
          batchName: batch.batchId, // Phase2-1: バッチIDを設定
        });

        // Phase2-3: MAIMLファイルの場合は簡易解析
        let maimlAnalysis;
        if (isMaimlFile(sanitizedFileName, file.mimetype)) {
          try {
            const content = file.buffer.toString('utf-8');
            maimlAnalysis = analyzeMaimlFile(content);
            console.log(`📊 [MAIML Analysis] ${sanitizedFileName}:`, {
              isValid: maimlAnalysis.isValid,
              transitions: maimlAnalysis.transitionsCount,
              places: maimlAnalysis.placesCount,
            });
          } catch (error) {
            console.warn(`⚠️ [MAIML Analysis] 解析失敗: ${sanitizedFileName}`, error);
            // 解析失敗してもアップロードは成功とする
          }
        }

        return {
          fileId,
          fileName: sanitizedFileName,
          filePath,
          s3Key,
          fileSize: file.size,
          contentType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          maimlAnalysis, // Phase2-3: MAIML解析結果を追加
        };
      },
      concurrency
    );

    // 5. 結果を集計
    const uploadedFiles = uploadResults
      .filter(r => r.success)
      .map(r => r.data!);
    
    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.filter(r => !r.success).length;
    const totalSize = uploadedFiles.reduce((sum, f) => sum + f.fileSize, 0);

    // 5. Phase2-1: バッチ完了
    const finalStatus: BatchStatus = 
      failCount === 0 ? 'completed' :
      successCount === 0 ? 'failed' : 'completed_with_errors';

    await uploadBatchRepository.update(batch.batchId, {
      status: finalStatus,
      endTime: new Date(),
    });

    console.log(`🎉 [Upload] バッチ完了: ${batch.batchId} (成功: ${successCount}, 失敗: ${failCount})`);

    return {
      uploadMode,
      files: uploadedFiles,
      summary: {
        totalFiles: files.length,
        successfulFiles: successCount,
        failedFiles: failCount,
        totalSize,
      },
      // Phase1-3: 空フォルダプレースホルダー結果を追加
      emptyFolders: emptyFolders && emptyFolders.length > 0 
        ? await this.createEmptyFolderPlaceholders(organizationId, emptyFolders)
        : undefined,
      // Phase2-1: バッチ情報を追加
      batch: {
        batchId: batch.batchId,
        batchName: batch.batchName,
        status: finalStatus,
      },
    };
  }

  /**
   * ファイルメタデータをDBに保存
   * 
   * @param data ファイルメタデータ
   * @returns 保存されたファイルキー
   */
  private async saveFileMetadata(data: {
    organizationId: string;
    userId: string;
    fileName: string;
    filePath: string;
    s3Key: string;
    fileSize: number;
    contentType: string;
    projectId?: string;
    formatId?: string;
    batchName?: string;
  }): Promise<string> {
    const now = new Date();
    
    // Phase3-4: VARCHAR長制限対応
    // FileMetadata型に従ってオブジェクトを構築
    const fileMetadata = {
      organization_id: data.organizationId,
      file_key: truncateField(
        data.s3Key,
        FILE_METADATA_MAX_LENGTHS.file_key,
        'file_key'
      ) || data.s3Key, // nullの場合は元の値を使用
      original_filename: truncateField(
        data.fileName,
        FILE_METADATA_MAX_LENGTHS.original_filename,
        'original_filename'
      ) || data.fileName, // nullの場合は元の値を使用
      file_size: data.fileSize,
      file_type: data.contentType,
      uploaded_by: data.userId,
      is_maiml_file: data.contentType === 'application/xml' || data.fileName.endsWith('.maiml'),
      s3_bucket: this.storageService.getBucketName(),
      upload_batch_id: data.batchName,
      upload_source: 'web_upload',  // アップロード元
      upload_method: 'single',      // アップロード方法: single, multipart, resumable
      created_at: now,
      updated_at: now,
    };

    // repositoryのinsertFileMetadataを使用してINSERT
    const result = await this.repository.insertFileMetadata(fileMetadata);
    
    return result.file_key;
  }

  /**
   * 空フォルダにプレースホルダーファイルを作成
   * 
   * Phase1-3: 空フォルダプレースホルダー機能（2026-02-18）
   * - S3/Swiftは空フォルダを保持できないため、.folder_placeholderファイルを作成
   * - フォルダ構造の完全な再現が可能になる
   * 
   * @param organizationId 組織ID
   * @param emptyFolders 空フォルダパスの配列
   * @returns プレースホルダー作成結果の配列
   */
  async createEmptyFolderPlaceholders(
    organizationId: string,
    emptyFolders: string[]
  ): Promise<PlaceholderResult[]> {
    const results: PlaceholderResult[] = [];

    if (!emptyFolders || emptyFolders.length === 0) {
      return results;
    }

    console.log(`📁 [Placeholder] 空フォルダプレースホルダー作成開始: ${emptyFolders.length}個`);

    for (const folderPath of emptyFolders) {
      try {
        // 1. プレースホルダーファイルキーを生成
        const placeholderKey = `${folderPath}/.folder_placeholder`;

        console.log(`📝 [Placeholder] 処理中: ${placeholderKey}`);

        // 2. 既存ファイルの重複チェック
        const exists = await this.storageService.fileExists(
          organizationId,
          placeholderKey
        );

        if (exists) {
          console.log(`⚠️ [Placeholder] スキップ（既存）: ${placeholderKey}`);
          results.push({
            folderPath,
            placeholderKey,
            success: true,
            skipped: true,
          });
          continue;
        }

        // 3. プレースホルダーファイル内容を生成
        const placeholderContent = Buffer.from(
          `# Folder Placeholder\nCreated: ${new Date().toISOString()}\nFolder: ${folderPath}\n\nThis file is a placeholder to preserve empty folder structure in S3/Swift storage.`,
          'utf-8'
        );

        // 4. S3/Swiftにプレースホルダーファイルを作成
        await this.storageService.uploadFile(
          organizationId,
          placeholderKey,
          placeholderContent,
          { contentType: 'text/plain' }
        );

        // 5. file_metadataテーブルに保存
        try {
          await this.saveFileMetadata({
            organizationId,
            userId: 'system', // システム自動作成
            fileName: '.folder_placeholder',
            filePath: placeholderKey,
            s3Key: placeholderKey,
            fileSize: placeholderContent.length,
            contentType: 'text/plain',
            batchName: 'empty_folder_placeholder',
          });
        } catch (dbError) {
          // DBエラーは警告のみ（S3上にファイルは作成されているので続行）
          console.warn(`⚠️ [Placeholder] DB保存エラー（続行）: ${placeholderKey}`, dbError);
        }

        console.log(`✅ [Placeholder] 作成成功: ${placeholderKey}`);
        results.push({
          folderPath,
          placeholderKey,
          success: true,
        });
      } catch (error) {
        console.error(`❌ [Placeholder] 作成失敗: ${folderPath}`, error);
        results.push({
          folderPath,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`📊 [Placeholder] 完了: 成功=${results.filter(r => r.success).length}/${results.length}`);

    return results;
  }

  /**
   * フォルダ配下のすべてのファイルをZIP形式でダウンロード
   * 
   * Task: 汎用フォルダZIPダウンロード機能
   * - 指定されたフォルダパス配下のファイルをZIPアーカイブに圧縮
   * - プロジェクト、フォーマット、その他あらゆるフォルダで利用可能
   * 
   * @param organizationId 組織ID
   * @param folderPath フォルダパス（相対パス、例: "projects/sample_project"）
   * @returns ZIPストリームとフォルダ名
   * @throws ValidationError フォルダパスが不正な場合
   * @throws NotFoundError フォルダが存在しない、またはファイルがない場合
   * @throws StorageError ストレージエラーの場合
   */
  async downloadFolderAsZip(
    organizationId: string,
    folderPath: string
  ): Promise<{ zipStream: archiver.Archiver; folderName: string }> {
    // 1. フォルダパスのバリデーション
    if (!folderPath || folderPath.trim().length === 0) {
      throw new ValidationError('フォルダパスは必須です');
    }

    // パストラバーサル攻撃対策
    if (folderPath.includes('..') || folderPath.includes('//')) {
      throw new ValidationError('不正なフォルダパスが検出されました');
    }

    // 末尾のスラッシュを削除
    const normalizedFolderPath = folderPath.replace(/\/$/, '');

    // 2. フォルダ配下のファイル一覧を取得
    let files;
    try {
      files = await this.storageService.listFiles(
        organizationId,
        normalizedFolderPath
      );
      
      console.log(`📋 [ZIP] フォルダパス: ${normalizedFolderPath}`);
      console.log(`📋 [ZIP] 取得ファイル数: ${files.length}`);
      console.log(`📋 [ZIP] ファイル一覧:`, files.map((f: { key: string; size: number }) => ({
        key: f.key,
        size: f.size,
        isFolder: f.key.endsWith('/')
      })));
    } catch (error) {
      throw new StorageError(
        `フォルダ内のファイル一覧取得に失敗しました: ${normalizedFolderPath}`
      );
    }

    // 3. ファイルが存在しない場合はエラー
    if (!files || files.length === 0) {
      throw new NotFoundError(
        `フォルダにファイルが見つかりません: ${normalizedFolderPath}`
      );
    }

    // 4. ZIPアーカイブを作成
    const archive = archiver('zip', {
      zlib: { level: 6 }, // 圧縮レベル（0-9、6=デフォルト）
    });

    // エラーハンドリング
    archive.on('error', (err) => {
      throw new StorageError(`ZIP生成エラー: ${err.message}`);
    });

    // 5. 各ファイルをZIPに追加
    for (const file of files) {
      try {
        // フォルダは除外（ファイルのみ追加）
        if (file.key.endsWith('/')) {
          console.log(`📁 [ZIP] フォルダをスキップ: ${file.key}`);
          continue;
        }

        // サイズが0のファイルもスキップ（空のフォルダマーカーの可能性）
        if (file.size === 0) {
          console.log(`⚠️ [ZIP] サイズ0のファイルをスキップ: ${file.key}`);
          continue;
        }

        console.log(`📦 [ZIP] 処理開始: ${file.key}`);
        console.log(`   - normalizedFolderPath: ${normalizedFolderPath}`);
        console.log(`   - organizationId: ${organizationId}`);

        // organizationIdプレフィックスを除去
        // 例: 550e8400-e29b-41d4-a716-446655440000/projects/sample_project/file.maiml
        //  → projects/sample_project/file.maiml
        let keyWithoutOrgPrefix = file.key;
        if (file.key.startsWith(`${organizationId}/`)) {
          keyWithoutOrgPrefix = file.key.substring(organizationId.length + 1);
          console.log(`   - organizationIdを除去: ${keyWithoutOrgPrefix}`);
        }

        // フォルダパスを除いた相対パスを生成
        // 例: projects/sample_project/archive/file_v1.maiml → archive/file_v1.maiml
        let relativeFileName: string;
        if (keyWithoutOrgPrefix.startsWith(normalizedFolderPath + '/')) {
          relativeFileName = keyWithoutOrgPrefix.substring(normalizedFolderPath.length + 1);
          console.log(`   - 相対パス生成成功: ${relativeFileName}`);
        } else {
          // フォールバック: 最後のファイル名のみ
          relativeFileName = keyWithoutOrgPrefix.split('/').pop() || keyWithoutOrgPrefix;
          console.log(`   - フォールバック（ファイル名のみ）: ${relativeFileName}`);
        }

        // ファイルをダウンロード
        const buffer = await this.storageService.downloadFile(
          organizationId,
          file.key
        );

        console.log(`✅ [ZIP] ZIP追加: ${relativeFileName} (${buffer.length} bytes)`);

        // ZIPにファイルを追加
        archive.append(buffer, { name: relativeFileName });
      } catch (error) {
        console.error(`❌ [ZIP] ファイル追加エラー: ${file.key}`, error);
        // 個別ファイルのエラーは警告してスキップ
        continue;
      }
    }

    // 6. ZIPを確定
    archive.finalize();

    // 7. フォルダ名を抽出（最後のフォルダ名）
    const folderName = normalizedFolderPath.split('/').pop() || 'download';

    return {
      zipStream: archive,
      folderName,
    };
  }
}
