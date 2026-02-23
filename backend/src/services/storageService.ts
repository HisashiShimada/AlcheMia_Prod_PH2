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
import { DatabaseError } from 'pg';
import { Readable } from 'stream';
import { parseStringPromise } from 'xml2js';
import { getPool } from '../database/db';

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

interface MetaData {
  document_uuid: string;
  document_name: string;
  document_description: string;
  measurement_values: string[];
  units: string[];
  section_types: string[];
  ids: string[];
  refs: string[];
  keys: string[];
  elements: string[];
  values: string[];
}

interface ExtractSingleFileResult {
  success: boolean;
  fileKey : string;
  metadata? : MetaData;
  error?: string;
  stack?: string;
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
  
  /**
   * 単一ファイルのメタデータ抽出処理
   */
  async extractSingleFile(fileKey: string, organizationId : string) :Promise<ExtractSingleFileResult> {
    console.log(`[🔍 Metadata Extractor] ファイル処理開始: ${fileKey}`);
    
    try {
      // S3からファイル内容取得
      const xmlContent = await this.getMaiMLContent(organizationId, fileKey);
      
      // メタデータ抽出
      const metadata = await this.extractMetadata(xmlContent);
      
      // DBに保存
      const updated = await this.updateFileMetadata(fileKey, organizationId, metadata);
      
      if (updated) {
        console.log(`[✅ Metadata Extractor] 成功: ${fileKey}`);
        return { success: true, fileKey, metadata };
      } else {
        console.log(`[⚠️ Metadata Extractor] DBレコードなし: ${fileKey}`);
        return { success: false, fileKey, error: 'No matching database record' };
      }
    } catch (error : any) {
      console.error(`[❌ Metadata Extractor] エラー: ${fileKey}`);
      console.error(`[❌ Metadata Extractor] エラーメッセージ:`, error.message);
      console.error(`[❌ Metadata Extractor] エラースタック:`, error.stack);
      console.error(`[❌ Metadata Extractor] エラー詳細:`, JSON.stringify(error, null, 2));
      
      // エラー状態を記録
      try {
        const pool = getPool();
        await pool.query(
          `UPDATE file_metadata 
            SET maiml_metadata_extraction_status = 'failed',
                maiml_metadata_extracted_at = CURRENT_TIMESTAMP
            WHERE file_key = $1 AND organization_id = $2`,
          [fileKey, organizationId]
        );
      } catch (dbError) {
        if (dbError instanceof DatabaseError) {
          console.error('[❌ Metadata Extractor] DB更新エラー:', dbError.message);
          console.error('[❌ Metadata Extractor] DB更新エラースタック:', dbError.stack);
        }
      }
      
      return { success: false, fileKey, error: error.message, stack: error.stack };
    }
  }
  
  /**
   * S3からMaiMLファイル内容を取得
   */
  async getMaiMLContent(organizationId: string, fileKey : string) {
    const bucketName = process.env.S3_BUCKET_NAME;
    const key = this.buildKey(organizationId,fileKey);
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    const response = await this.s3Client.send(command);
    const content = await response.Body!.transformToString();
    return content;
  }
  
  /**
   * MaiML XMLをパースしてメタデータ抽出
   */
  async extractMetadata(xmlContent: string) : Promise<MetaData> {
    try {
      const parsedXML = await parseStringPromise(xmlContent, {
        explicitArray: false,
        mergeAttrs: true,
        ignoreAttrs: false
      });

      const metadata : MetaData = {
        document_uuid: '',
        document_name: '',
        document_description: '',
        measurement_values: [],
        units: [],
        section_types: [],
        ids: [],
        refs: [],
        keys: [],
        elements: [],
        values: []
      };

      // Document情報抽出
      if (parsedXML.maiml?.document) {
        const doc = parsedXML.maiml.document;
        metadata.document_uuid = doc.uuid || doc['@_uuid'] || null;
        metadata.document_name = doc.name || doc['@_name'] || null;
        metadata.document_description = doc.description || null;
      }

      // 再帰的にXML全体を走査してメタデータ収集
      this._extractFromNode(parsedXML, metadata);

      // 重複削除
      metadata.measurement_values = [...new Set(metadata.measurement_values)];
      metadata.units = [...new Set(metadata.units)];
      metadata.section_types = [...new Set(metadata.section_types)];
      metadata.ids = [...new Set(metadata.ids)];
      metadata.refs = [...new Set(metadata.refs)];
      metadata.keys = [...new Set(metadata.keys)];
      metadata.elements = [...new Set(metadata.elements)];
      metadata.values = [...new Set(metadata.values)];

      return metadata;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[❌ Metadata Extractor] XMLパースエラー:', error.message);
        console.error('[❌ Metadata Extractor] スタックトレース:', error.stack);
      }
      throw error;
    }
  }

  /**
   * 再帰的にXMLノードを走査してメタデータ収集
   */
  _extractFromNode(node : any, metadata : MetaData, parentKey = '') {
    if (!node || typeof node !== 'object') {
      // プリミティブ値の場合、valuesに追加
      if (node && String(node).trim()) {
        metadata.values.push(String(node).trim());
      }
      return;
    }

    // 配列の場合
    if (Array.isArray(node)) {
      node.forEach(item => this._extractFromNode(item, metadata, parentKey));
      return;
    }

    // オブジェクトの場合、各プロパティを処理
    Object.keys(node).forEach(key => {
      const value = node[key];

      // Element名を収集（@_で始まらないキー）
      if (!key.startsWith('@_') && !key.startsWith('$')) {
        metadata.elements.push(key);
      }

      // 属性情報を収集
      if (key === '@_id' && value) {
        metadata.ids.push(String(value));
      }
      if (key === '@_ref' && value) {
        metadata.refs.push(String(value));
      }
      if (key === '@_key' && value) {
        metadata.keys.push(String(value));
      }

      // 測定値・単位を収集
      if ((key === 'value' || key === '@_value' || parentKey === 'measurement') && value) {
        const strValue = String(value).trim();
        if (strValue && !isNaN(parseInt(strValue))) {
          metadata.measurement_values.push(strValue);
        }
      }
      if ((key === 'unit' || key === '@_unit' || key === 'units') && value) {
        metadata.units.push(String(value));
      }

      // セクション種別を収集
      if ((key === 'section' || key === 'sectionType' || key === '@_type') && value) {
        metadata.section_types.push(String(value));
      }

      // 再帰的に子ノードを処理
      if (typeof value === 'object') {
        this._extractFromNode(value, metadata, key);
      }
    });
  }
  
  /**
   * file_metadataテーブルを更新（UPSERT）
   */
  async updateFileMetadata(fileKey: string, organizationId: string, metadata: MetaData) {
    const pool = getPool();
    // まず既存レコードを確認（file_keyのみで検索）
    // 理由: file_keyにユニーク制約があり、organization_idが異なる可能性があるため
    const checkQuery = `
      SELECT id, organization_id FROM file_metadata 
      WHERE file_key = $1
    `;
    const checkResult = await pool.query(checkQuery, [fileKey]);

    if (checkResult.rows.length > 0) {
      // 既存レコードのorganization_idをログ出力
      const existingOrgId = checkResult.rows[0].organization_id;
      if (existingOrgId !== organizationId) {
        console.log(`[⚠️ Metadata Extractor] organization_id不一致: ${fileKey}`);
        console.log(`[⚠️ Metadata Extractor] 既存=${existingOrgId}, 新=${organizationId}`);
      }
      
      // レコードが存在する場合はUPDATE
      // organization_idも更新対象に含める（ファイルの所属組織が変更された場合に対応）
      const updateQuery = `
        UPDATE file_metadata
        SET 
          organization_id = $1,
          maiml_document_uuid = $2,
          maiml_document_name = $3,
          maiml_document_description = $4,
          maiml_measurement_values = $5,
          maiml_units = $6,
          maiml_section_types = $7,
          maiml_ids = $8,
          maiml_refs = $9,
          maiml_keys = $10,
          maiml_elements = $11,
          maiml_values = $12,
          maiml_metadata_extracted_at = CURRENT_TIMESTAMP,
          maiml_metadata_extraction_status = 'success'
        WHERE file_key = $13
        RETURNING id
      `;

      const values = [
        organizationId,
        metadata.document_uuid,
        metadata.document_name,
        metadata.document_description,
        JSON.stringify(metadata.measurement_values),
        JSON.stringify(metadata.units),
        JSON.stringify(metadata.section_types),
        JSON.stringify(metadata.ids),
        JSON.stringify(metadata.refs),
        JSON.stringify(metadata.keys),
        JSON.stringify(metadata.elements),
        JSON.stringify(metadata.values),
        fileKey
      ];

      const result = await pool.query(updateQuery, values);
      console.log(`[✅ Metadata Extractor] レコード更新: ${fileKey}`);
      return  result.rowCount ? result.rowCount > 0 : false;
    } else {
      // レコードが存在しない場合はINSERT
      const insertQuery = `
        INSERT INTO file_metadata (
          file_key,
          organization_id,
          s3_bucket,
          original_filename,
          file_size,
          file_type,
          uploaded_by,
          is_maiml_file,
          maiml_document_uuid,
          maiml_document_name,
          maiml_document_description,
          maiml_measurement_values,
          maiml_units,
          maiml_section_types,
          maiml_ids,
          maiml_refs,
          maiml_keys,
          maiml_elements,
          maiml_values,
          maiml_metadata_extracted_at,
          maiml_metadata_extraction_status,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, 0, 'application/xml', 'system-metadata-extractor', true,
          $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          CURRENT_TIMESTAMP, 'success',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id
      `;

      // ファイル名を抽出
      const fileName = fileKey.split('/').pop();
      const s3Bucket = process.env.S3_BUCKET_NAME || 'maiml-storage';

      const values = [
        fileKey,
        organizationId,
        s3Bucket,
        fileName,
        metadata.document_uuid,
        metadata.document_name,
        metadata.document_description,
        JSON.stringify(metadata.measurement_values),
        JSON.stringify(metadata.units),
        JSON.stringify(metadata.section_types),
        JSON.stringify(metadata.ids),
        JSON.stringify(metadata.refs),
        JSON.stringify(metadata.keys),
        JSON.stringify(metadata.elements),
        JSON.stringify(metadata.values)
      ];

      const result = await pool.query(insertQuery, values);
      console.log(`[✅ Metadata Extractor] レコード新規作成: ${fileKey}`);
      return  result.rowCount ? result.rowCount > 0 : false;
    }
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