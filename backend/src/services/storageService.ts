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
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
  HeadObjectCommandInput,
  CopyObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// ストレージ設定の型定義
interface StorageConfig {
  type: 'swift' | 's3';
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
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
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
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
   * @returns org_{organizationId}/{filePath} 形式のキー
   */
  private buildKey(organizationId: string, filePath: string): string {
    // organizationIdの検証
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    // filePathの正規化（先頭のスラッシュを除去）
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    // プレフィックスベース分離
    return `org_${organizationId}/${normalizedPath}`;
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