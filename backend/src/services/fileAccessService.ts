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
import { logDownloadHistory, logBulkDownloadHistory } from '../utils/downloadLogger';
import {
  ValidationError,
  NotFoundError,
  StorageError,
} from '../utils/errorClasses';

/**
 * ファイルアクセスレスポンス（ダウンロード用）
 */
export interface FileAccessResponse {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

/**
 * 一括ファイルアクセスレスポンス
 */
export interface BulkFileAccessResponse {
  files: FileAccessResponse[];
  totalFiles: number;
  totalSize: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 後方互換性のためのエイリアス
/** @deprecated Use FileAccessResponse instead */
export type FileDownloadResponse = FileAccessResponse;

/** @deprecated Use BulkFileAccessResponse instead */
export type BulkDownloadResponse = BulkFileAccessResponse;

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
   * @param organizationPrefix 組織プレフィックス
   * @param projectId プロジェクトID
   * @param fileName ファイル名
   * @returns ファイルメタデータ
   * @throws NotFoundError ファイルが存在しない場合
   * @throws StorageError メタデータは存在するがS3上にファイルがない場合
   */
  async verifyFileExists(
    organizationId: string,
    organizationPrefix: string,
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
      organizationPrefix,
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
   * 単一ファイルのダウンロード用署名付きURLを生成
   */
  async downloadFile(
    userId: string,
    projectId: string,
    organizationId: string,
    organizationPrefix: string,
    fileName: string
  ): Promise<FileDownloadResponse> {
    // 1. プロジェクトアクセス権限の検証
    await this.accessValidator.validateAccess(
      userId,
      projectId,
      organizationId
    );

    // 2. ファイル存在確認（メタデータとストレージ両方）
    const fileMetadata = await this.verifyFileExists(
      organizationId,
      organizationPrefix,
      projectId,
      fileName
    );

    // 3. S3パスの取得
    const filePath = fileMetadata.file_key;

    // 4. 署名付きURLの生成（有効期限: 3600秒 = 1時間）
    const signedUrl = await this.storageService.getSignedUrl(
      organizationPrefix,
      filePath,
      3600
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
      fileName: fileMetadata.original_filename,
      downloadUrl: signedUrl,
      fileSize: fileMetadata.file_size,
      contentType: fileMetadata.file_type || 'application/octet-stream',
      uploadedAt: fileMetadata.updated_at || fileMetadata.created_at || new Date(),
      uploadedBy: userId, // FileMetadataにはuploadedByがないため、現在のuserIdを使用
    };
  }

  /**
   * ファイルキーベースの汎用ダウンロード用署名付きURL生成
   * 
   * Task: S3ファイルダウンロード共通化
   * - ファイルキーを直接指定して署名付きURLを取得
   * - プロジェクト、フォーマット、その他のファイルで共通利用可能
   * 
   * @param organizationId 組織ID
   * @param organizationPrefix 組織プレフィックス
   * @param fileKey ファイルキー（相対パス）
   * @returns ファイルダウンロード情報
   * @throws ValidationError ファイルキーが不正な場合
   * @throws NotFoundError ファイルが存在しない場合
   * @throws StorageError ストレージエラーの場合
   */
  async getFileDownloadUrl(
    organizationId: string,
    organizationPrefix: string,
    fileKey: string
  ): Promise<FileAccessResponse> {
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
      organizationPrefix,
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
        organizationPrefix,
        fileKey
      );
    } catch (error) {
      throw new StorageError(
        `ファイルメタデータの取得に失敗しました: ${fileKey}`
      );
    }

    // 4. 署名付きURLの生成（有効期限: 3600秒 = 1時間）
    const signedUrl = await this.storageService.getSignedUrl(
      organizationPrefix,
      fileKey,
      3600
    );

    // 5. ファイル名を抽出
    const fileName = fileKey.split('/').pop() || fileKey;

    // 6. レスポンスオブジェクトの構築
    return {
      fileName,
      downloadUrl: signedUrl,
      fileSize: fileMetadata.size,
      contentType: fileMetadata.contentType || 'application/octet-stream',
      uploadedAt: fileMetadata.lastModified,
      uploadedBy: 'system', // メタデータにuploadedByがないため固定値
    };
  }

  /**
   * プロジェクト内全ファイルの一括ダウンロード用署名付きURLリスト生成
   * 
   * @param userId ユーザーID
   * @param projectId プロジェクトID
   * @param organizationId 組織ID
   * @param organizationPrefix 組織プレフィックス
   * @param page ページ番号（1から開始）
   * @param limit 1ページあたりの件数（最大100）
   * @returns ファイル一覧とページネーション情報
   */
  async downloadAllFiles(
    userId: string,
    projectId: string,
    organizationId: string,
    organizationPrefix: string,
    page: number = 1,
    limit: number = 20
  ): Promise<BulkDownloadResponse> {
    // 1. パラメータバリデーション
    if (page < 1) {
      throw new ValidationError('ページ番号は1以上である必要があります');
    }

    if (limit < 1) {
      throw new ValidationError('limit値は1以上である必要があります');
    }

    if (limit > 100) {
      throw new ValidationError('limit値は100以下である必要があります');
    }

    // 2. プロジェクトアクセス権限の検証
    await this.accessValidator.validateAccess(
      userId,
      projectId,
      organizationId
    );

    // 3. プロジェクト内全ファイルのメタデータを取得
    const result = await this.repository.listProjectFiles(
      organizationId,
      projectId,
      page,
      limit
    );

    // 4. totalPagesを計算
    const totalPages = Math.ceil(result.totalCount / limit);

    // 5. 各ファイルに対して署名付きURLを生成
    const filesWithUrls: FileDownloadResponse[] = [];
    let totalSize = 0;

    for (const fileMetadata of result.files) {
      const filePath = fileMetadata.file_key;

      // 署名付きURL生成（有効期限: 3600秒 = 1時間）
      const signedUrl = await this.storageService.getSignedUrl(
        organizationPrefix,
        filePath,
        3600
      );

      filesWithUrls.push({
        fileName: fileMetadata.original_filename,
        downloadUrl: signedUrl,
        fileSize: fileMetadata.file_size,
        contentType: fileMetadata.file_type || 'application/octet-stream',
        uploadedAt: fileMetadata.updated_at || fileMetadata.created_at || new Date(),
        uploadedBy: userId, // FileMetadataにはuploadedByがないため、現在のuserIdを使用
      });

      totalSize += fileMetadata.file_size;
    }

    // 6. 一括ダウンロード履歴のログ記録
    if (filesWithUrls.length > 0) {
      logBulkDownloadHistory({
        userId,
        organizationId,
        projectId,
        fileCount: result.totalCount,
        totalSize,
      });
    }

    // 7. レスポンスオブジェクトの構築
    return {
      files: filesWithUrls,
      totalFiles: result.totalCount,
      totalSize,
      page,
      limit,
      totalPages,
    };
  }
}
