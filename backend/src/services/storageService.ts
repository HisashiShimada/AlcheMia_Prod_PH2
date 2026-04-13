/**
 * Storage Service
 * 
 * OpenStack Swift と AWS S3 の両方に対応した統一ストレージインターフェース
 * - 開発環境: OpenStack Swift（S3互換API経由）
 * - 本番環境: AWS S3
 * - マルチテナント: プレフィックスベース分離（org_{organization_id}）
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
  HeadObjectCommandInput,
  CopyObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import path from 'path';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';

// ストレージ設定の型定義
interface StorageConfig {
  type: 'swift' | 's3';
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName: string;
  forcePathStyle: boolean;
}

// ファイルメタデータの型定義
interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
}

// アップロードオプションの型定義
interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: string;
  /**
   * アップロードしたユーザーID。
   * 指定された場合かつフォルダマーカー（末尾 '/'）でない場合に file_metadata を自動登録する。
   * 実ファイルのアップロード時は必ず指定すること。
   * フォルダマーカー作成（createFolder等）では省略可。
   */
  uploadedBy?: string;
  /** 一括アップロード時のバッチID（任意） */
  uploadBatchId?: string;
  /** アップロード元（デフォルト: 'system'） */
  uploadSource?: string;
  /** アップロード方法（デフォルト: 'single'） */
  uploadMethod?: string;
}

/**
 * ストレージサービスクラス
 */
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private storageType: 'swift' | 's3';

  constructor() {
    const config = this.loadConfig();
    this.bucketName = config.bucketName;
    this.storageType = config.type;

    // S3Clientの初期化
    // AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY が設定されている場合のみ明示指定。
    // 未設定（ECS タスクロールなど）の場合は credentials を渡さず、
    // AWS SDK のデフォルト認証情報プロバイダーチェーン（IAM ロール等）に委ねる。
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      forcePathStyle: config.forcePathStyle,
      maxAttempts: 3,
    });

    console.log(`Storage Service initialized: ${config.type}`);
    console.log(`Bucket/Container: ${this.bucketName}`);
    if (config.endpoint) {
      console.log(`Endpoint: ${config.endpoint}`);
    }
  }

  /**
   * 環境変数から設定を読み込む
   */
  private loadConfig(): StorageConfig {
    const storageType = (process.env.STORAGE_TYPE || 's3') as 'swift' | 's3';

    if (storageType === 'swift' || process.env.USE_S3_COMPATIBLE_API === 'true') {
      // OpenStack Swift（S3互換API経由）
      return {
        type: 'swift',
        endpoint: process.env.S3_ENDPOINT || process.env.SWIFT_AUTH_URL,
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.SWIFT_USERNAME || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SWIFT_PASSWORD || '',
        bucketName: process.env.S3_BUCKET_NAME || process.env.SWIFT_CONTAINER || 'mmdpf-files',
        forcePathStyle: true, // 重要: パススタイルを強制
      };
    } else {
      // AWS S3
      return {
        type: 's3',
        region: process.env.AWS_REGION || 'ap-northeast-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucketName: process.env.AWS_S3_BUCKET || '',
        forcePathStyle: false,
      };
    }
  }

  /**
   * マルチテナント対応のキーを生成
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @returns {organizationId}/{filePath} 形式のキー
   */
  private buildKey(organizationId: string, filePath: string): string {
    // organizationIdの検証
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    // filePathの正規化（先頭のスラッシュを除去）
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    // 既にorganizationIdで始まっている場合はそのまま返す（二重設定を防ぐ）
    if (normalizedPath.startsWith(`${organizationId}/`)) {
      return normalizedPath;
    }

    // プレフィックスベース分離
    return `${organizationId}/${normalizedPath}`;
  }

  /**
   * ファイルをアップロード
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @param fileContent ファイル内容（Buffer, Stream, string）
   * @param options アップロードオプション
   * @returns アップロードされたファイルのキー
   */
  async uploadFile(
    organizationId: string,
    filePath: string,
    fileContent: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<string> {
    const key = this.buildKey(organizationId, filePath);

    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: options?.contentType || 'application/octet-stream',
      Metadata: options?.metadata,
    };

    const command = new PutObjectCommand(params);
    await this.s3Client.send(command);

    console.log(`File uploaded: ${key}`);

    // file_metadata 自動登録（uploadedBy が指定され、かつフォルダマーカーでない場合のみ）
    if (options?.uploadedBy && !filePath.endsWith('/')) {
      try {
        const fileSize = fileContent instanceof Buffer
          ? fileContent.length
          : typeof fileContent === 'string'
            ? Buffer.byteLength(fileContent, 'utf-8')
            : 0; // Readable Stream の場合は 0

        const repo = new FileMetadataRepository();
        await repo.insertIfNotExists({
          file_key: key,
          s3_bucket: this.bucketName,
          organization_id: organizationId,
          original_filename: path.basename(filePath),
          file_size: fileSize,
          file_type: options.contentType ?? 'application/octet-stream',
          uploaded_by: options.uploadedBy,
          is_maiml_file: filePath.endsWith('.maiml'),
          upload_batch_id: options.uploadBatchId,
          upload_source: options.uploadSource ?? 'system',
          upload_method: options.uploadMethod ?? 'single',
          parent_folder_path: key.substring(0, key.lastIndexOf('/')),
        });
        console.log(`[StorageService] file_metadata 登録完了: ${key}`);
      } catch (dbErr) {
        console.warn('[StorageService] file_metadata 登録失敗（処理続行）', dbErr);
      }
    }

    return key;
  }

  /**
   * ファイルをダウンロード
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @returns ファイル内容（Buffer）
   */
  async downloadFile(organizationId: string, filePath: string): Promise<Buffer> {
    const key = this.buildKey(organizationId, filePath);

    const params: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
    };

    const command = new GetObjectCommand(params);
    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error('File body is empty');
    }

    // StreamをBufferに変換
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * ファイルを削除
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   */
  async deleteFile(organizationId: string, filePath: string): Promise<void> {
    const key = this.buildKey(organizationId, filePath);

    const params: DeleteObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await this.s3Client.send(command);

    console.log(`File deleted: ${key}`);
  }

  /**
   * ファイル一覧を取得
   * @param organizationId 組織ID
   * @param prefix プレフィックス（オプション）
   * @param maxKeys 最大取得数（デフォルト: 500、タイムアウト対策）
   * @returns ファイルメタデータの配列
   */
  async listFiles(
    organizationId: string,
    prefix: string = '',
    maxKeys: number = 500
  ): Promise<FileMetadata[]> {
    const keyPrefix = this.buildKey(organizationId, prefix);

    const params: ListObjectsV2CommandInput = {
      Bucket: this.bucketName,
      Prefix: keyPrefix,
      MaxKeys: maxKeys,
    };

    const command = new ListObjectsV2Command(params);
    const response = await this.s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents.map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
      etag: item.ETag,
    }));
  }

  /**
   * ファイルが存在するか確認
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @returns 存在する場合 true
   */
  async fileExists(organizationId: string, filePath: string): Promise<boolean> {
    try {
      const key = this.buildKey(organizationId, filePath);

      const params: HeadObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new HeadObjectCommand(params);
      await this.s3Client.send(command);

      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * ファイルのメタデータを取得
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @returns ファイルメタデータ
   */
  async getFileMetadata(organizationId: string, filePath: string): Promise<FileMetadata> {
    const key = this.buildKey(organizationId, filePath);

    const params: HeadObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
    };

    const command = new HeadObjectCommand(params);
    const response = await this.s3Client.send(command);

    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType,
      etag: response.ETag,
    };
  }

  /**
   * 署名付きURL（Pre-signed URL）を生成
   * @param organizationId 組織ID
   * @param filePath ファイルパス
   * @param expiresIn 有効期限（秒、デフォルト: 3600 = 1時間）
   * @returns 署名付きURL
   */
  async getSignedUrl(
    organizationId: string,
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const key = this.buildKey(organizationId, filePath);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * ファイルをコピー
   * @param organizationId 組織ID
   * @param sourceFilePath コピー元ファイルパス
   * @param destinationFilePath コピー先ファイルパス
   */
  async copyFile(
    organizationId: string,
    sourceFilePath: string,
    destinationFilePath: string
  ): Promise<void> {
    const sourceKey = this.buildKey(organizationId, sourceFilePath);
    const destinationKey = this.buildKey(organizationId, destinationFilePath);

    const params: CopyObjectCommandInput = {
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    };

    const command = new CopyObjectCommand(params);
    await this.s3Client.send(command);

    console.log(`File copied: ${sourceKey} -> ${destinationKey}`);
  }

  /**
   * ファイルを移動（コピー後に元ファイルを削除）
   * @param organizationId 組織ID
   * @param sourceFilePath 移動元ファイルパス
   * @param destinationFilePath 移動先ファイルパス
   */
  async moveFile(
    organizationId: string,
    sourceFilePath: string,
    destinationFilePath: string
  ): Promise<void> {
    await this.copyFile(organizationId, sourceFilePath, destinationFilePath);
    await this.deleteFile(organizationId, sourceFilePath);

    console.log(`File moved: ${sourceFilePath} -> ${destinationFilePath}`);
  }

  /**
   * 単一フォルダを作成
   * 
   * S3/Swiftコンソールで「フォルダ」として表示されるよう、
   * トレーリングスラッシュ付きの0バイトオブジェクトを作成
   * 
   * @param organizationId 組織ID
   * @param folderPath フォルダパス（トレーリングスラッシュ付き推奨）
   * 
   * @example
   * // プロジェクトフォルダ作成
   * await storageService.createFolder(organizationId, 'projects/my_project/');
   * 
   * // フォーマットフォルダ作成
   * await storageService.createFolder(organizationId, 'formats/chemistry/');
   */
  async createFolder(organizationId: string, folderPath: string): Promise<void> {
    // トレーリングスラッシュが無ければ追加
    const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    await this.uploadFile(
      organizationId,
      normalizedPath,
      '',
      { contentType: 'application/x-directory' }
    );
    
    console.log(`Folder created: ${normalizedPath}`);
  }

  /**
   * 複数フォルダを一括作成
   * 
   * @param organizationId 組織ID
   * @param folderPaths フォルダパスの配列
   * 
   * @example
   * // プロジェクトとアーカイブフォルダを一括作成
   * await storageService.createFolders(organizationId, [
   *   'projects/my_project/',
   *   'projects/my_project/archive/',
   * ]);
   */
  async createFolders(organizationId: string, folderPaths: string[]): Promise<void> {
    for (const folderPath of folderPaths) {
      await this.createFolder(organizationId, folderPath);
    }
    
    console.log(`${folderPaths.length} folder(s) created`);
  }

  /**
   * バケット/コンテナの存在確認・自動作成
   * 
   * Swift 起動直後（バケット未作成状態）でも自動で指定コンテナを作成する。
   * Swift/S3 どちらの環境でも動作する。
   * 
   * @remarks
   * - バケットが存在する場合: 何もしない
   * - バケットが存在しない場合: 自動作成する
   * - Swift/S3 が未起動の場合: 警告ログを出力して続行（起動を妨げない）
   */
  async ensureBucketExists(): Promise<void> {
    try {
      // バケット/コンテナの存在確認
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`✅ Bucket/Container already exists: ${this.bucketName}`);
    } catch (error: any) {
      const statusCode = error.$metadata?.httpStatusCode;

      if (statusCode === 404 || error.name === 'NotFound' || error.name === 'NoSuchBucket') {
        // バケットが存在しない → 作成する
        console.log(`⚠️  Bucket/Container not found. Creating: ${this.bucketName}`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          console.log(`✅ Bucket/Container created: ${this.bucketName}`);
        } catch (createError: any) {
          console.warn(`⚠️  Failed to create bucket/container "${this.bucketName}": ${createError.message}`);
        }
      } else {
        // 接続エラー等（Swift/S3未起動含む）→ 警告のみでサーバー起動は続行
        console.warn(`⚠️  Could not verify bucket/container "${this.bucketName}": ${error.message}`);
      }
    }
  }

  /**
   * フォルダを再帰的に削除
   * 
   * Task: プロジェクト管理画面削除機能実装 - storageService層実装
   * @description フォルダパス配下のすべてのファイルを削除する
   * 
   * @param organizationId 組織ID
   * @param folderPath フォルダパス（相対パス）
   * @returns 削除されたファイル数
   * 
   * @example
   * // プロジェクトフォルダを削除
   * const deletedCount = await storageService.deleteFolderRecursive(
   *   organizationId,
   *   'projects/sample_project'
   * );
   * console.log(`${deletedCount}ファイルを削除しました`);
   */
  async deleteFolderRecursive(
    organizationId: string,
    folderPath: string
  ): Promise<number> {
    // 1. フォルダパスの正規化（末尾のスラッシュを削除）
    const normalizedFolderPath = folderPath.replace(/\/$/, '');

    console.log(`🗑️ [StorageService] フォルダ削除開始: ${normalizedFolderPath}`);

    try {
      // 2. フォルダ配下のファイル一覧を取得
      const files = await this.listFiles(organizationId, normalizedFolderPath);

      if (!files || files.length === 0) {
        console.log(`📭 [StorageService] 削除対象ファイルなし: ${normalizedFolderPath}`);
        return 0;
      }

      console.log(`📋 [StorageService] 削除対象ファイル数: ${files.length}`);

      // 3. 各ファイルを削除
      let deletedCount = 0;
      let failedCount = 0;

      for (const file of files) {
        try {
          // フォルダは除外（キーが'/'で終わるもの）
          if (file.key.endsWith('/')) {
            console.log(`📁 [StorageService] フォルダをスキップ: ${file.key}`);
            continue;
          }

          // organizationIdプレフィックスを除去して相対パスを生成
          // 例: "550e8400.../projects/sample/file.maiml" → "projects/sample/file.maiml"
          let relativePath = file.key;
          if (file.key.startsWith(`${organizationId}/`)) {
            relativePath = file.key.substring(organizationId.length + 1);
          }

          // ファイルを削除（deleteFileメソッドを使用）
          await this.deleteFile(organizationId, relativePath);
          deletedCount++;

          if (deletedCount % 10 === 0) {
            console.log(`🗑️ [StorageService] 削除進捗: ${deletedCount}/${files.length}`);
          }
        } catch (error) {
          // 個別ファイルの削除エラーはログに記録して続行
          console.error(`❌ [StorageService] ファイル削除エラー: ${file.key}`, error);
          failedCount++;
        }
      }

      console.log(`✅ [StorageService] フォルダ削除完了: 成功=${deletedCount}, 失敗=${failedCount}`);

      return deletedCount;
    } catch (error) {
      console.error(`❌ [StorageService] フォルダ削除エラー: ${normalizedFolderPath}`, error);
      throw new Error(`Failed to delete folder recursively: ${normalizedFolderPath}`);
    }
  }

  /**
   * ストレージタイプを取得
   * @returns 'swift' または 's3'
   */
  getStorageType(): 'swift' | 's3' {
    return this.storageType;
  }

  /**
   * バケット/コンテナ名を取得
   * @returns バケット/コンテナ名
   */
  getBucketName(): string {
    return this.bucketName;
  }
}

// シングルトンインスタンス
let storageServiceInstance: StorageService | null = null;

/**
 * StorageServiceのシングルトンインスタンスを取得
 * @returns StorageServiceインスタンス
 */
export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

// デフォルトエクスポート
export default getStorageService;
