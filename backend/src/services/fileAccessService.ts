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
import archiver from 'archiver';

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
        // ファイルをダウンロード
        const buffer = await this.storageService.downloadFile(
          organizationId,
          file.key
        );

        // フォルダパスを除いたファイル名のみをZIPに含める
        const relativeFileName = file.key.startsWith(normalizedFolderPath + '/')
          ? file.key.substring(normalizedFolderPath.length + 1)
          : file.key.split('/').pop() || file.key;

        // ZIPにファイルを追加
        archive.append(buffer, { name: relativeFileName });
      } catch (error) {
        console.error(`ファイル追加エラー: ${file.key}`, error);
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
