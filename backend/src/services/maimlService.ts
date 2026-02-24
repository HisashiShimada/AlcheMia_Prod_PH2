/**
 * MAIMLサービス
 * 
 * @description MAIML編集、解析、バリデーション等のビジネスロジック
 * @reference Reference版: reference/backend/services/editService.js
 * @task Phase 6 Step 3: サービス層実装
 */

import { DOMParser } from '@xmldom/xmldom';
import { getStorageService } from './storageService';
import * as crypto from 'crypto';
import * as validationHistoryRepository from '../repositories/validationHistoryRepository';
import { EditSession, ParseResult,AnalysisResult  } from '../types/maimlValidation';
import * as maimlParser from '../utils/maimlParser';
import { maimlSaveResult} from '../types/maimlEditor';
import { FileMetadataRepository, FileMetadata } from '../repositories/fileMetadataRepository';
import { MaimlDraftsRepository, MaimlDraftsRow } from '../repositories/maimlDraftsRepository';
import * as projectRepository from '../repositories/projectRepository';
import { Project } from '../types/database';
import type { Draft } from '../types/editor';
import * as maimlMetadataExtractor from '../utils/maimlMetadataExtractor';
import {
  ListFilesResponse,
  StorageFile,
  FileContentResponse,
  AutoCorrectResponse,
  CorrectionResult,
} from '../types/storage';

const storageService = getStorageService();
const maimlDraftsRepository = new MaimlDraftsRepository();

/**
 * 編集セッション管理用Map
 */
const editSessions = new Map<string, EditSession>();

/**
 * MAIMLファイル解析
 * ペトリネット構造を抽出
 */
export async function parseMaiML(content: string): Promise<ParseResult> {
  try {
    console.log('🔍 [maimlService] MAIML解析開始');

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // maiml要素取得
    const maimlElement = doc.getElementsByTagName('maiml')[0];
    if (!maimlElement) {
      throw new Error('Invalid MAIML format: maiml element not found');
    }

    // メタデータ抽出
    const metadata = extractMetadata(doc);

    // ペトリネット構造抽出
    const places = extractPlaces(doc);
    const transitions = extractTransitions(doc);
    const arcs = extractArcs(doc);

    console.log('✅ [maimlService] MAIML解析完了');

    return {
      metadata,
      places,
      transitions,
      arcs,
      statistics: {
        placeCount: places.length,
        transitionCount: transitions.length,
        arcCount: arcs.length,
      },
    };
  } catch (error) {
    console.error('❌ [maimlService] MAIML解析エラー:', error);
    throw error;
  }
}

/**
 * MAIMLファイル保存
 * Reference版のロジックを統合
 */
export async function saveMaiML(
  fileKey: string,
  content: string,
  organizationId: string,
): Promise<maimlSaveResult> {
  try {

    // 1. バリデーション
    const validation = await validateMaiML(organizationId,content, '');
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // ファイルのバックアップ
    await createBackup(fileKey, organizationId);

    // 4. S3/Swiftアップロード
    await storageService.uploadFile(organizationId, fileKey, Buffer.from(content, 'utf-8'), {
      contentType: 'application/xml',
      metadata: {
        'edit-timestamp': new Date().toISOString(),
        'validation-status': validation.isValid ? 'valid' : 'warning',
      },
    });

    // 5. コンテンツハッシュ計算
    const contentHash = calculateContentHash(content);

    console.log('✅ [maimlService] MAIML保存完了:', fileKey);

    const fileMetadataRepository = new FileMetadataRepository();

    const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(fileKey);
    if (existingMetadata) {
      const updateData = {
        file_size: Buffer.byteLength(content, 'utf-8'),
        updated_at: new Date(),
        last_edit_timestamp: new Date()
      };
      await fileMetadataRepository.updateFileMetadata(fileKey,updateData);
    } else {
      // 新規ファイル: 作成（maimlMetadataExtractorが後で作成するのでスキップ）
      console.log('ℹ️ [S3 Save] 新規ファイルのためDB作成はメタデータ抽出時に実行');
    }
    
    // MaiMLファイルの場合、メタデータ自動抽出
    if (fileKey.toLowerCase().endsWith('.maiml')) {
      try {
        console.log('🔍 [MAIML Save] MaiMLメタデータ抽出開始:', fileKey);
        
        // 1. S3/SwiftからXML取得
        const xmlBuffer = await storageService.downloadFile(organizationId, fileKey);
        const xmlContent = xmlBuffer.toString('utf-8');
        
        // 2. メタデータ抽出（Utility）
        const metadata = await maimlMetadataExtractor.extractMetadataFromXML(xmlContent);
        
        // 3. DB更新（Repository - 既存メソッド使用）
        const fileMetadataRepository = new FileMetadataRepository();
        const existingRecord = await fileMetadataRepository.getFileMetadataByFileKey(fileKey);
        
        if (existingRecord) {
          // 既存レコードの更新（既存のupdateFileMetadataを使用）
          const updateData = {
            organization_id: organizationId,
            maiml_document_uuid: metadata.document_uuid,
            maiml_document_name: metadata.document_name,
            maiml_document_description: metadata.document_description,
            maiml_measurement_values: JSON.stringify(metadata.measurement_values),
            maiml_units: JSON.stringify(metadata.units),
            maiml_section_types: JSON.stringify(metadata.section_types),
            maiml_ids: JSON.stringify(metadata.ids),
            maiml_refs: JSON.stringify(metadata.refs),
            maiml_keys: JSON.stringify(metadata.keys),
            maiml_elements: JSON.stringify(metadata.elements),
            maiml_values: JSON.stringify(metadata.values),
            maiml_metadata_extracted_at: new Date(),
            maiml_metadata_extraction_status: 'success'
          };
          
          await fileMetadataRepository.updateFileMetadata(fileKey, updateData);
          console.log('✅ [MAIML Save] MaiMLメタデータ抽出成功（更新）');
        } else {
          // 新規レコードの作成（既存のinsertFileMetadataを使用）
          const insertData: Partial<FileMetadata> = {
            file_key: fileKey,
            organization_id: organizationId,
            s3_bucket: process.env.S3_BUCKET_NAME || 'mmdpf-files',
            original_filename: fileKey.split('/').pop(),
            file_size: Buffer.byteLength(content, 'utf-8'),
            file_type: 'application/xml',
            uploaded_by: 'system-metadata-extractor',
            is_maiml_file: true,
            maiml_document_uuid: metadata.document_uuid,
            maiml_document_name: metadata.document_name,
            maiml_document_description: metadata.document_description,
            maiml_measurement_values: JSON.stringify(metadata.measurement_values),
            maiml_units: JSON.stringify(metadata.units),
            maiml_section_types: JSON.stringify(metadata.section_types),
            maiml_ids: JSON.stringify(metadata.ids),
            maiml_refs: JSON.stringify(metadata.refs),
            maiml_keys: JSON.stringify(metadata.keys),
            maiml_elements: JSON.stringify(metadata.elements),
            maiml_values: JSON.stringify(metadata.values),
            maiml_metadata_extracted_at: new Date(),
            maiml_metadata_extraction_status: 'success',
            created_at: new Date(),
            updated_at: new Date()
          };
          
          await fileMetadataRepository.insertFileMetadata(insertData);
          console.log('✅ [MAIML Save] MaiMLメタデータ抽出成功（新規作成）');
        }
      } catch (metadataError) {
        console.error('❌ [MAIML Save] MaiMLメタデータ抽出エラー:', metadataError);
        
        // エラー状態を記録
        try {
          const fileMetadataRepository = new FileMetadataRepository();
          const existingRecord = await fileMetadataRepository.getFileMetadataByFileKey(fileKey);
          if (existingRecord) {
            await fileMetadataRepository.updateFileMetadata(fileKey, {
              maiml_metadata_extraction_status: 'failed',
              maiml_metadata_extracted_at: new Date()
            });
          }
        } catch (dbError) {
          console.error('❌ [MAIML Save] DB更新エラー:', dbError);
        }
        
        // メタデータ抽出失敗しても保存は成功とする
      }
      
      // project_maiml_flgをtrueに更新（必須処理）
      console.log('🔍 [MAIML Save] project_maiml_flg更新開始:', fileKey);
      
      // fileKeyからproject_nameを抽出
      // 想定形式: projects/sample_project/sample_project.maiml
      const pathParts = fileKey.split('/');
      console.log('🔍 [MAIML Save] pathParts:', pathParts);
      
      // 'projects'の位置を探す
      const projectsIndex = pathParts.findIndex(part => part === 'projects');
      
      if (projectsIndex !== -1 && pathParts.length > projectsIndex + 1) {
        const projectName = pathParts[projectsIndex + 1];
        console.log('🔍 [MAIML Save] 抽出されたプロジェクト名:', projectName);
        
        // プロジェクト情報を取得
        const existingProject = await projectRepository.findByName(organizationId, projectName);
        
        if (!existingProject) {
          // プロジェクトが見つからない場合はエラー
          const errorMsg = `Project not found: ${projectName} (organizationId: ${organizationId})`;
          console.error('❌ [MAIML Save] プロジェクトが見つかりません:', {
            projectName,
            organizationId,
            fileKey,
            pathParts,
          });
          throw new Error(errorMsg);
        }
        
        // project_maiml_flgがfalseまたはnullの場合のみ更新
        if (!existingProject.project_maiml_flg) {
          // 既存のプロジェクトObjectのproject_maiml_flgをtrueに更新
          // 注: update_atはprojectRepository.update()内で自動設定されるため、明示的に設定しない
          const updatedProject: Project = {
            ...existingProject,
            project_maiml_flg: true,
          };
          
          try {
            // 共通のupdateメソッドで更新
            await projectRepository.update(updatedProject);
            console.log('✅ [MAIML Save] project_maiml_flg更新完了:', projectName);
          } catch (updateError) {
            // フラグ更新失敗時はエラーをthrow（保存処理全体が失敗）
            console.error('❌ [MAIML Save] project_maiml_flg更新失敗:', {
              projectName,
              error: updateError,
            });
            throw new Error(`Failed to update project_maiml_flg: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
          }
        } else {
          console.log('ℹ️ [MAIML Save] project_maiml_flgは既にtrue:', projectName);
        }
      } else {
        // fileKeyの形式が不正な場合はエラー
        const errorMsg = `Invalid fileKey format: ${fileKey} (pathParts: ${JSON.stringify(pathParts)})`;
        console.error('❌ [MAIML Save] fileKeyからproject_nameを抽出できません:', {
          fileKey,
          pathParts,
          projectsIndex,
        });
        throw new Error(errorMsg);
      }
    }

    return {
      fileKey,
      size: Buffer.byteLength(content, 'utf-8'),
      lastModified: new Date().toISOString(),
      contentHash,
      validationResult: validation,
    };
  } catch (error) {
    console.error('❌ [maimlService] MAIML保存エラー:', error);
    throw error;
  }
}

/**
 * MAIMLファイル読込
 */
export async function loadMaiML(filePath: string, organizationId: string): Promise<any> {
  try {
    console.log('📂 [maimlService] MAIMLファイル読込開始:', filePath);

    // storageServiceでS3/Swiftから取得
    const buffer = await storageService.downloadFile(organizationId, filePath);

    // 文字列に変換
    const content = buffer.toString('utf-8');

    console.log('✅ [maimlService] MAIMLファイル読込完了');

    return {
      content,
      filePath,
      size: Buffer.byteLength(content, 'utf-8'),
    };
  } catch (error) {
    console.error('❌ [maimlService] MAIMLファイル読込エラー:', error);
    throw error;
  }
}

/**
 * MAIMLファイル一覧取得
 */
export async function listMaiMLFiles(projectId: string, organizationId: string): Promise<any> {
  try {
    console.log('📋 [maimlService] MAIMLファイル一覧取得開始:', projectId);

    const projectPath = `projects/${projectId}`;

    // storageServiceで一覧取得
    const files = await storageService.listFiles(organizationId, projectPath);

    // .maimlファイルのみフィルタ
    const maimlFiles = files.filter((file: any) => file.key.endsWith('.maiml'));

    console.log('✅ [maimlService] MAIMLファイル一覧取得完了:', maimlFiles.length);

    return {
      files: maimlFiles.map((file: any) => ({
        key: file.key,
        fileName: file.key.split('/').pop(),
        size: file.size,
        lastModified: file.lastModified,
      })),
    };
  } catch (error) {
    console.error('❌ [maimlService] MAIMLファイル一覧取得エラー:', error);
    throw error;
  }
}

/**
 * MAIMLバリデーション（強化版）
 * Reference版のロジックを移植 + 重複ID検証追加
 * 
 * @param organizationId - 組織ID
 * @param content - デコード済みXML文字列（コントローラー層でbase64デコード済み）
 * @param fileKey - ファイルキー
 * @param skipAnalysisSave - 分析結果保存をスキップするか
 * @returns バリデーション結果
 */
export async function validateMaiML(organizationId : string, content: string, fileKey: string = '', skipAnalysisSave: boolean = true): Promise<AnalysisResult> {
    console.log('✔️ [maimlService] MAIMLバリデーション開始');
    
    const analysisResult = await maimlParser.analyzeMaiMLFile(
      organizationId,
      content,
      fileKey || (skipAnalysisSave ? 'realtime-validation' : 'temp-validation')
    );
    
    // Generate quick suggestions for real-time feedback
    analysisResult.autoCorrections = maimlParser.generateAutoCorrections(analysisResult);

    return analysisResult;
}

/**
 * MAIMLバリデーション with 履歴保存
 * バリデーション実行 + 履歴保存を一括で行う
 * 
 * @param content MAIMLファイルの内容
 * @param options バリデーションオプション
 * @returns バリデーション結果 + 履歴ID
 */
export async function validateMaiMLWithHistory(
  content: string,
  options: {
    organizationId: string;
    userId: string;
    projectId?: string;
    fileKey?: string;
    validationMode?: 'basic' | 'full';
  }
): Promise<AnalysisResult & { validationId?: string }> {
  const startTime = Date.now();

  try {
    console.log('✔️ [maimlService] MAIMLバリデーション（履歴保存付き）開始');

    // バリデーション実行
    const validation = await validateMaiML(content, '');

    // バリデーション時間計算
    const duration = Date.now() - startTime;

    // エラー・警告詳細をJSONB形式に変換
    const errorDetails = validation.errors.map((error, index) => ({
      type: 'ValidationError',
      severity: 'error',
      message: error,
      index,
    }));

    const warningDetails = validation.warnings.map((warning, index) => ({
      type: 'ValidationWarning',
      severity: 'warning',
      message: warning,
      index,
    }));

    // バリデーション履歴を保存
    const historyRecord = await validationHistoryRepository.createValidationHistory({
      organization_id: options.organizationId,
      user_id: options.userId,
      project_id: options.projectId || null,
      file_key: options.fileKey || null,
      validation_mode: options.validationMode || 'basic',
      is_valid: validation.isValid,
      total_errors: validation.errors.length,
      total_warnings: validation.warnings.length,
      error_details: errorDetails.length > 0 ? errorDetails : null,
      warning_details: warningDetails.length > 0 ? warningDetails : null,
      validation_duration_ms: duration,
      elements_validated: null, // XML要素数（必要に応じて実装）
      attributes_validated: null, // 属性数（必要に応じて実装）
      nodes_validated: validation.statistics?.totalElements || null,
      arcs_validated: validation.statistics?.arcsCount || null,
    });

    console.log('✅ [maimlService] バリデーション履歴保存完了:', historyRecord.validation_id);

    // バリデーション結果 + 履歴IDを返す
    return {
      ...validation,
      validationId: historyRecord.validation_id,
    };
  } catch (error) {
    console.error('❌ [maimlService] バリデーション履歴保存エラー:', error);

    // エラーが発生してもバリデーション結果は返す
    const validation = await validateMaiML(content, '');
    return validation;
  }
}

/**
 * バリデーション履歴一覧取得
 * 
 * @param organizationId 組織ID
 * @param options オプション
 * @returns バリデーション履歴一覧
 */
export async function getValidationHistory(
  organizationId: string,
  options: {
    projectId?: string;
    limit?: number;
    offset?: number;
    isValid?: boolean;
  } = {}
): Promise<any[]> {
  try {
    console.log('📋 [maimlService] バリデーション履歴取得:', organizationId);

    const history = await validationHistoryRepository.findByOrganizationId(
      organizationId,
      options
    );

    console.log('✅ [maimlService] バリデーション履歴取得完了:', history.length);

    return history;
  } catch (error) {
    console.error('❌ [maimlService] バリデーション履歴取得エラー:', error);
    throw error;
  }
}

/**
 * プロジェクト別バリデーション統計取得
 * 
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns 統計情報
 */
export async function getValidationStatistics(
  projectId: string,
  organizationId: string
): Promise<any> {
  try {
    console.log('📊 [maimlService] バリデーション統計取得:', projectId);

    const statistics = await validationHistoryRepository.getProjectStatistics(
      projectId,
      organizationId
    );

    console.log('✅ [maimlService] バリデーション統計取得完了');

    return statistics;
  } catch (error) {
    console.error('❌ [maimlService] バリデーション統計取得エラー:', error);
    throw error;
  }
}

/**
 * MAIML自動補正
 * 基本的なエラーを自動修正
 * 
 * @note 優先度低（Phase 7で実装予定）
 */
export async function correctMaiML(content: string): Promise<any> {
  console.log('⚠️ [maimlService] correctMaiML: Phase 7で実装予定');

  // 現時点では何もせず返す
  return {
    corrected: content,
    corrections: [],
    message: 'Auto-correction feature is not implemented yet (Phase 7)',
  };
}

/**
 * 編集セッション開始
 * Reference版のロジックを移植
 */
export async function startEditSession(sessionData: any): Promise<any> {
  const { sessionId, fileKey, fileName, userId = 'anonymous' } = sessionData;

  try {
    console.log('🔓 [maimlService] 編集セッション開始:', sessionId);

    // 既存セッションチェック
    if (editSessions.has(sessionId)) {
      throw new Error('Session ID is already in use');
    }

    // セッション情報作成
    const session: EditSession = {
      sessionId,
      fileKey,
      fileName,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      changes: [],
      locked: true,
    };

    editSessions.set(sessionId, session);

    // セッションタイムアウト設定（1時間）
    const timeout = parseInt(process.env.EDIT_SESSION_TIMEOUT || '3600000');
    setTimeout(() => {
      endEditSession({ sessionId });
    }, timeout);

    console.log('✅ [maimlService] 編集セッション開始完了');

    return {
      sessionId,
      expiresAt: new Date(Date.now() + timeout).toISOString(),
    };
  } catch (error) {
    console.error('❌ [maimlService] 編集セッション開始エラー:', error);
    throw error;
  }
}

/**
 * 編集セッション終了
 * Reference版のロジックを移植
 */
export async function endEditSession(sessionData: any): Promise<any> {
  const { sessionId } = sessionData;

  try {
    const session = editSessions.get(sessionId);
    if (session) {
      const duration = Date.now() - session.startTime.getTime();

      console.log('🔒 [maimlService] 編集セッション終了:', {
        sessionId,
        duration: `${Math.round(duration / 1000)}s`,
        changes: session.changes.length,
      });

      editSessions.delete(sessionId);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ [maimlService] 編集セッション終了エラー:', error);
    throw error;
  }
}

// ========== ヘルパー関数 ==========

/**
 * バックアップ作成
 * archive/サブフォルダに連番形式で保存
 */
async function createBackup(filePath: string, organizationId: string): Promise<string | null> {
  try {
    // 1. ファイル存在確認
    const exists = await storageService.fileExists(organizationId, filePath);
    
    console.log(filePath, exists);
    if (!exists) {
      return null;
    }

    // 2. パス解析
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop(); // sample_project.maiml
    const dirPath = pathParts.join('/'); // projects/sample_project
    
    if (!fileName) {
      console.warn('⚠️ [maimlService] ファイル名が取得できません:', filePath);
      return null;
    }
    
    const baseName = fileName.replace('.maiml', ''); // sample_project
    
    // 3. archiveフォルダパス生成
    const archivePath = `${dirPath}/archive`;

    // 4. archive内の既存バックアップファイルを取得して最大連番を算出
    let maxNumber = 0;
    try {
      const files = await storageService.listFiles(organizationId, archivePath);
      
      // baseName_数字.maiml パターンのファイルから最大連番を取得
      const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d{3})\\.maiml$`);
      files.forEach((file: any) => {
        const name = file.key.split('/').pop();
        if (name) {
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });
      
      console.log(`📊 [maimlService] archive内の既存バックアップ最大連番: ${maxNumber}`);
    } catch (error) {
      // archiveフォルダが存在しない場合は0から開始
      console.log('📁 [maimlService] archiveフォルダが存在しないため、001から開始');
    }

    // 5. 新しいバックアップファイル名生成（連番を3桁にゼロパディング）
    const newNumber = maxNumber + 1;
    const backupFileName = `${baseName}_${String(newNumber).padStart(3, '0')}.maiml`;
    const backupPath = `${archivePath}/${backupFileName}`;

    // 6. 既存ファイルを取得
    const buffer = await storageService.downloadFile(organizationId, filePath);

    // 7. バックアップ保存
    await storageService.uploadFile(organizationId, backupPath, buffer);

    console.log('📋 [maimlService] バックアップ作成:', backupPath);
    return backupPath;
  } catch (error) {
    console.warn('⚠️ [maimlService] バックアップ作成失敗:', error);
    // バックアップ失敗は警告のみ（保存処理は継続）
    return null;
  }
}

/**
 * コンテンツハッシュ計算
 */
function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * メタデータ抽出
 */
function extractMetadata(doc: Document): Record<string, any> {
  const metadata: Record<string, any> = {};

  // maiml要素の属性を取得
  const maimlElement = doc.getElementsByTagName('maiml')[0];
  if (maimlElement && maimlElement.attributes) {
    for (let i = 0; i < maimlElement.attributes.length; i++) {
      const attr = maimlElement.attributes[i];
      metadata[attr.name] = attr.value;
    }
  }

  return metadata;
}

/**
 * プレース抽出
 */
function extractPlaces(doc: Document): any[] {
  const places: any[] = [];
  const placeElements = doc.getElementsByTagName('place');

  for (let i = 0; i < placeElements.length; i++) {
    const place = placeElements[i];
    places.push({
      id: place.getAttribute('id'),
      name: place.getAttribute('name') || '',
      // 他の属性も必要に応じて追加
    });
  }

  return places;
}

/**
 * トランジション抽出
 */
function extractTransitions(doc: Document): any[] {
  const transitions: any[] = [];
  const transitionElements = doc.getElementsByTagName('transition');

  for (let i = 0; i < transitionElements.length; i++) {
    const transition = transitionElements[i];
    transitions.push({
      id: transition.getAttribute('id'),
      name: transition.getAttribute('name') || '',
      // 他の属性も必要に応じて追加
    });
  }

  return transitions;
}

/**
 * アーク抽出
 */
function extractArcs(doc: Document): any[] {
  const arcs: any[] = [];
  const arcElements = doc.getElementsByTagName('arc');

  for (let i = 0; i < arcElements.length; i++) {
    const arc = arcElements[i];
    arcs.push({
      id: arc.getAttribute('id'),
      source: arc.getAttribute('source'),
      target: arc.getAttribute('target'),
      // 他の属性も必要に応じて追加
    });
  }

  return arcs;
}

// ========== Draft機能 ==========

/**
 * Draft保存
 * 
 * @param draft - 保存するDraftデータ
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns 保存されたDraft情報
 */
export async function saveDraft(
  draft: Draft,
  organizationId: string,
  userId: string
): Promise<Draft> {
  try {
    console.log('💾 [maimlService] Draft保存開始:', draft.draftKey);

    // Repository呼び出し
    const savedRow = await maimlDraftsRepository.save(draft, organizationId, userId);

    // DB行をDraft型に変換
    const result = convertRowToDraft(savedRow);

    console.log('✅ [maimlService] Draft保存完了:', result.draftKey);

    return result;
  } catch (error) {
    console.error('❌ [maimlService] Draft保存エラー:', error);
    throw error;
  }
}

/**
 * Draft削除
 * 
 * @param draftKey - 削除するDraftのキーID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns 削除された行数
 */
export async function deleteDraft(
  draftKey: string,
  organizationId: string,
  userId: string
): Promise<number> {
  try {
    console.log('🗑️ [maimlService] Draft削除開始:', draftKey);

    // Repository呼び出し
    const deletedCount = await maimlDraftsRepository.delete(draftKey, organizationId, userId);

    if (deletedCount === 0) {
      console.warn('⚠️ [maimlService] 削除対象のDraftが見つかりません:', draftKey);
    } else {
      console.log('✅ [maimlService] Draft削除完了:', draftKey);
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ [maimlService] Draft削除エラー:', error);
    throw error;
  }
}

/**
 * Draft読み込み
 * 孤立アーククリーニング処理を含む
 * 
 * @param draftKey - DraftのキーID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns Draft情報、存在しない場合はnull
 */
export async function loadDraft(
  draftKey: string,
  organizationId: string,
  userId: string
): Promise<Draft | null> {
  try {
    console.log('📂 [maimlService] Draft読み込み開始:', draftKey);

    // Repository呼び出し
    const row = await maimlDraftsRepository.findByKey(draftKey, organizationId, userId);

    if (!row) {
      console.warn('⚠️ [maimlService] Draftが見つかりません:', draftKey);
      return null;
    }

    // DB行をDraft型に変換
    const draft = convertRowToDraft(row);

    // 孤立アーククリーニング
    const cleanedDraft = cleanOrphanedArcs(draft);

    console.log('✅ [maimlService] Draft読み込み完了:', cleanedDraft.draftKey);

    return cleanedDraft;
  } catch (error) {
    console.error('❌ [maimlService] Draft読み込みエラー:', error);
    throw error;
  }
}

/**
 * Draft一覧取得
 * 
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns Draft一覧
 */
export async function listDrafts(
  organizationId: string,
  userId: string
): Promise<Draft[]> {
  try {
    console.log('📋 [maimlService] Draft一覧取得開始');

    // Repository呼び出し
    const rows = await maimlDraftsRepository.findAll(organizationId, userId);

    // DB行をDraft型に変換
    const drafts = rows.map(row => convertRowToDraft(row));

    console.log('✅ [maimlService] Draft一覧取得完了:', drafts.length);

    return drafts;
  } catch (error) {
    console.error('❌ [maimlService] Draft一覧取得エラー:', error);
    throw error;
  }
}

/**
 * DB行（MaimlDraftsRow）をDraft型に変換
 * 
 * @param row - DB検索結果
 * @returns Draft型オブジェクト
 * 
 * @note PostgreSQLのJSONB型は自動的にパースされる場合があるため、
 * 文字列の場合のみJSON.parse()を実行する
 */
function convertRowToDraft(row: MaimlDraftsRow): Draft {
  // JSONB型カラムの安全なパース
  // - すでにオブジェクトの場合: そのまま使用
  // - 文字列の場合: JSON.parse()を実行
  const safeParseJson = (data: string | any): any => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('❌ [maimlService] JSON parse error:', error);
        return data; // パース失敗時は元データを返す
      }
    }
    return data; // すでにオブジェクトの場合はそのまま返す
  };

  return {
    draftKey: row.draft_key,
    draftName: row.draft_name,
    originalFileKey: row.original_file_key || undefined,
    lastSavedAt: row.last_saved_at.toISOString(),
    nodes: safeParseJson(row.nodes),
    edges: safeParseJson(row.arcs), // arcs → edges
    templates: safeParseJson(row.templates),
    documentData: safeParseJson(row.document_data),
  };
}

/**
 * 孤立アーク（edges）のクリーニング
 * ノードが削除された際にアークが残っている場合を想定
 * 
 * @param draft - Draft情報
 * @returns クリーニング済みDraft
 */
function cleanOrphanedArcs(draft: Draft): Draft {
  if (!draft.edges || draft.edges.length === 0) {
    return draft;
  }

  if (!draft.nodes || draft.nodes.length === 0) {
    // ノードがない場合はすべてのアークを削除
    console.log('🧹 [maimlService] ノードが存在しないため、すべてのアークを削除');
    return {
      ...draft,
      edges: [],
    };
  }

  // 存在するノードIDのセットを作成
  const nodeIds = new Set(draft.nodes.map(node => node.id));

  // 有効なアークのみをフィルタ
  const validEdges = draft.edges.filter(edge => {
    const isValid = nodeIds.has(edge.source) && nodeIds.has(edge.target);
    if (!isValid) {
      console.log(`🧹 [maimlService] 孤立アークを削除: ${edge.id} (source: ${edge.source}, target: ${edge.target})`);
    }
    return isValid;
  });

  const removedCount = draft.edges.length - validEdges.length;
  if (removedCount > 0) {
    console.log(`✅ [maimlService] 孤立アーククリーニング完了: ${removedCount}個削除`);
  }

  return {
    ...draft,
    edges: validEdges,
  };
}

// ========== 既存の関数 ==========

/**
 * 複数method対応のペトリネット構造解析
 * Reference版のparsePetriNetStructureロジックを移植
 * 
 * @param content MAIMLファイルの内容
 * @returns 解析結果（複数method対応 + 後方互換性）
 */
export async function parsePetriNetStructure(content: string): Promise<any> {
  try {
    console.log('🔍 [maimlService] 複数method対応ペトリネット構造解析開始');

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // Document metadata取得
    const documentElement = doc.getElementsByTagName('document')[0];
    const documentMetadata: Record<string, any> = {};
    if (documentElement) {
      documentMetadata.documentId = documentElement.getAttribute('id') || '';
      const nameElement = documentElement.getElementsByTagName('name')[0];
      if (nameElement) {
        documentMetadata.documentName = nameElement.textContent || '';
      }
    }

    // Protocol取得
    const protocolElements = doc.getElementsByTagName('protocol');
    if (protocolElements.length === 0) {
      console.warn('⚠️ [maimlService] Protocolセクションが見つかりません');
      return {
        success: true,
        isMultiMethod: false,
        methods: [],
        places: [],
        transitions: [],
        arcs: [],
        metadata: documentMetadata,
        message: 'No protocol section found in MAIML file',
      };
    }

    const protocol = protocolElements[0];

    // Method要素を取得（配列対応）
    const methodElements = protocol.getElementsByTagName('method');
    if (methodElements.length === 0) {
      console.warn('⚠️ [maimlService] Method要素が見つかりません');
      return {
        success: true,
        isMultiMethod: false,
        methods: [],
        places: [],
        transitions: [],
        arcs: [],
        metadata: documentMetadata,
        message: 'No method elements found in MAIML file',
      };
    }

    const methodArray = Array.from(methodElements);
    const isMultiMethod = methodArray.length > 1;

    console.log(`📊 [maimlService] 検出されたmethod数: ${methodArray.length}, 複数method: ${isMultiMethod}`);

    // 全体統計用（後方互換性）
    const allPlaces: any[] = [];
    const allTransitions: any[] = [];
    const allArcs: any[] = [];

    // Method別データ格納用
    const methods: any[] = [];

    // 各method要素を処理
    for (let methodIndex = 0; methodIndex < methodArray.length; methodIndex++) {
      const method = methodArray[methodIndex];
      const methodId = method.getAttribute('id') || `method_${methodIndex}`;

      console.log(`🔍 [maimlService] Method[${methodIndex}] 処理開始: ${methodId}`);

      const methodData: any = {
        methodId,
        methodName: '',
        methodIndex,
        places: [],
        transitions: [],
        arcs: [],
        metadata: {
          uuid: '',
          name: '',
          description: '',
        },
        statistics: {
          placeCount: 0,
          transitionCount: 0,
          arcCount: 0,
        },
      };

      // Method metadata取得
      const methodNameElement = method.getElementsByTagName('name')[0];
      if (methodNameElement) {
        methodData.methodName = methodNameElement.textContent || methodId;
        methodData.metadata.name = methodData.methodName;
      }

      const methodUuidElement = method.getElementsByTagName('uuid')[0];
      if (methodUuidElement) {
        methodData.metadata.uuid = methodUuidElement.textContent || '';
      }

      const methodDescElement = method.getElementsByTagName('description')[0];
      if (methodDescElement) {
        methodData.metadata.description = methodDescElement.textContent || '';
      }

      // PNML取得
      const pnmlElements = method.getElementsByTagName('pnml');
      if (pnmlElements.length === 0) {
        console.warn(`⚠️ [maimlService] Method[${methodIndex}] PNMLが見つかりません`);
        methods.push(methodData);
        continue;
      }

      const pnml = pnmlElements[0];
      methodData.metadata.pnmlId = pnml.getAttribute('id') || '';

      const pnmlNameElement = pnml.getElementsByTagName('name')[0];
      if (pnmlNameElement) {
        methodData.metadata.pnmlName = pnmlNameElement.textContent || '';
      }

      // Places（場所）の抽出
      const placeElements = pnml.getElementsByTagName('place');
      for (let i = 0; i < placeElements.length; i++) {
        const p = placeElements[i];
        const placeId = p.getAttribute('id') || '';
        const placeNameElement = p.getElementsByTagName('name')[0];
        const placeName = placeNameElement ? placeNameElement.textContent || '' : '';

        const place: any = {
          id: placeId,
          type: 'place',
          data: {
            name: placeName,
            label: placeName || placeId || 'Unnamed Place',
            methodId,
          },
        };

        const placeDescElement = p.getElementsByTagName('description')[0];
        if (placeDescElement) {
          place.data.description = placeDescElement.textContent || '';
        }

        const initialMarkingElement = p.getElementsByTagName('initialMarking')[0];
        if (initialMarkingElement) {
          place.data.initialMarking = initialMarkingElement.textContent || '';
        }

        methodData.places.push(place);
        allPlaces.push(place);
      }

      methodData.statistics.placeCount = placeElements.length;
      console.log(`✅ [maimlService] Method[${methodIndex}] Place抽出: ${placeElements.length}個`);

      // Transitions（遷移）の抽出
      const transitionElements = pnml.getElementsByTagName('transition');
      for (let i = 0; i < transitionElements.length; i++) {
        const t = transitionElements[i];
        const transitionId = t.getAttribute('id') || '';
        const transitionNameElement = t.getElementsByTagName('name')[0];
        const transitionName = transitionNameElement ? transitionNameElement.textContent || '' : '';

        const transition: any = {
          id: transitionId,
          type: 'transition',
          data: {
            label: transitionName || transitionId || 'Unnamed Transition',
            methodId,
          },
        };

        const stereotype = t.getAttribute('stereotype');
        if (stereotype) {
          transition.data.stereotype = stereotype;
        }

        const transitionDescElement = t.getElementsByTagName('description')[0];
        if (transitionDescElement) {
          transition.data.description = transitionDescElement.textContent || '';
        }

        const program = t.getAttribute('program');
        if (program) {
          transition.data.program = program;
        }

        methodData.transitions.push(transition);
        allTransitions.push(transition);
      }

      methodData.statistics.transitionCount = transitionElements.length;
      console.log(`✅ [maimlService] Method[${methodIndex}] Transition抽出: ${transitionElements.length}個`);

      // Instruction IDを読み込んでTransitionに紐付け
      const programElements = method.getElementsByTagName('program');
      if (programElements.length > 0) {
        const programElement = programElements[0];
        const instructionElements = programElement.getElementsByTagName('instruction');

        for (let i = 0; i < instructionElements.length; i++) {
          const instruction = instructionElements[i];
          const instructionId = instruction.getAttribute('id');
          const transitionRefElements = instruction.getElementsByTagName('transitionRef');

          if (instructionId && transitionRefElements.length > 0) {
            const transitionRef = transitionRefElements[0];
            const transitionId = transitionRef.getAttribute('ref');

            if (transitionId) {
              // このmethodのtransitionを検索
              const transition = methodData.transitions.find((t: any) => t.id === transitionId);
              if (transition) {
                transition.data.instructionId = instructionId;
              }

              // 後方互換性用
              const legacyTransition = allTransitions.find((t: any) => t.id === transitionId);
              if (legacyTransition) {
                legacyTransition.data.instructionId = instructionId;
              }
            }
          }
        }

        console.log(`✅ [maimlService] Method[${methodIndex}] InstructionID紐付け完了`);
      }

      // Arcs（アーク）の抽出
      const arcElements = pnml.getElementsByTagName('arc');
      for (let i = 0; i < arcElements.length; i++) {
        const a = arcElements[i];
        const arcId = a.getAttribute('id') || `arc_${methodData.arcs.length}`;
        const source = a.getAttribute('source') || '';
        const target = a.getAttribute('target') || '';

        const arc: any = {
          id: arcId,
          source,
          target,
          type: 'arc',
          methodId,
          data: {
            methodId,
          },
        };

        const arcNameElement = a.getElementsByTagName('name')[0];
        if (arcNameElement) {
          arc.data.name = arcNameElement.textContent || arcId;
        } else {
          arc.data.name = arcId;
        }

        const arcType = a.getAttribute('type');
        if (arcType) {
          arc.data.arcType = arcType;
        }

        const inscriptionElement = a.getElementsByTagName('inscription')[0];
        if (inscriptionElement) {
          arc.data.weight = inscriptionElement.textContent || '';
        }

        methodData.arcs.push(arc);
        allArcs.push(arc);
      }

      methodData.statistics.arcCount = arcElements.length;
      console.log(`✅ [maimlService] Method[${methodIndex}] Arc抽出: ${arcElements.length}個`);

      // このmethodのデータを結果に追加
      methods.push(methodData);
    }

    // テンプレート情報を取得してステレオタイプを判定
    console.log('🔍 [maimlService] テンプレートからステレオタイプを抽出開始');

    // Protocol直下の共通テンプレートを処理
    const processProtocolTemplates = (templateType: string, stereotype: string) => {
      const templateElements = protocol.getElementsByTagName(templateType);

      for (let i = 0; i < templateElements.length; i++) {
        const template = templateElements[i];
        const placeRefElements = template.getElementsByTagName('placeRef');

        for (let j = 0; j < placeRefElements.length; j++) {
          const placeRef = placeRefElements[j];
          const placeId = placeRef.getAttribute('ref');

          if (placeId) {
            // 全methodsから該当するplaceを検索
            for (const methodData of methods) {
              const place = methodData.places.find((p: any) => p.id === placeId);
              if (place) {
                place.data.stereotype = stereotype;
              }
            }

            // 後方互換性用
            const legacyPlace = allPlaces.find((p: any) => p.id === placeId);
            if (legacyPlace) {
              legacyPlace.data.stereotype = stereotype;
            }
          }
        }
      }
    };

    processProtocolTemplates('materialTemplate', 'materialTemplate');
    processProtocolTemplates('conditionTemplate', 'conditionTemplate');
    processProtocolTemplates('resultTemplate', 'resultTemplate');

    // 各methodのprogram内のテンプレートを処理
    for (let methodIndex = 0; methodIndex < methodArray.length; methodIndex++) {
      const method = methodArray[methodIndex];
      const methodData = methods[methodIndex];
      const programElements = method.getElementsByTagName('program');

      if (programElements.length > 0) {
        const programElement = programElements[0];

        const processMethodTemplates = (templateType: string, stereotype: string) => {
          const templateElements = programElement.getElementsByTagName(templateType);

          for (let i = 0; i < templateElements.length; i++) {
            const template = templateElements[i];
            const placeRefElements = template.getElementsByTagName('placeRef');

            for (let j = 0; j < placeRefElements.length; j++) {
              const placeRef = placeRefElements[j];
              const placeId = placeRef.getAttribute('ref');

              if (placeId) {
                const place = methodData.places.find((p: any) => p.id === placeId);
                if (place) {
                  place.data.stereotype = stereotype;
                }

                // 後方互換性用
                const legacyPlace = allPlaces.find((p: any) => p.id === placeId);
                if (legacyPlace) {
                  legacyPlace.data.stereotype = stereotype;
                }
              }
            }
          }
        };

        processMethodTemplates('materialTemplate', 'materialTemplate');
        processMethodTemplates('conditionTemplate', 'conditionTemplate');
        processMethodTemplates('resultTemplate', 'resultTemplate');
      }
    }

    console.log('✅ [maimlService] ステレオタイプ抽出完了');

    // 統計情報計算
    const statistics = {
      placeCount: allPlaces.length,
      transitionCount: allTransitions.length,
      arcCount: allArcs.length,
      methodCount: methods.length,
    };

    console.log(`✅ [maimlService] ペトリネット構造抽出完了:`, {
      isMultiMethod,
      methods: methods.length,
      totalPlaces: allPlaces.length,
      totalTransitions: allTransitions.length,
      totalArcs: allArcs.length,
    });

    // 新しいレスポンス形式（複数method対応 + 後方互換性）
    return {
      success: true,
      isMultiMethod,
      methods,
      // 後方互換性のため従来のフラット構造も返す
      places: allPlaces,
      transitions: allTransitions,
      arcs: allArcs,
      metadata: documentMetadata,
      statistics,
    };
  } catch (error) {
    console.error('❌ [maimlService] ペトリネット構造抽出エラー:', error);

    return {
      success: false,
      isMultiMethod: false,
      methods: [],
      places: [],
      transitions: [],
      arcs: [],
      metadata: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ========== S3/Swiftファイル操作 ==========

/**
 * S3/Swiftからファイル一覧取得
 * Reference版: listingRoutes.js - GET /api/s3/files
 * 
 * @param organizationId - 組織ID
 * @returns ファイル一覧とメタデータ
 */
export async function listMaimlFilesFromStorage(
  organizationId: string
): Promise<ListFilesResponse> {
  try {
    console.log('📁 [maimlService] S3/Swiftファイル一覧取得開始:', organizationId);

    // storageService.listFiles()を使用（組織プレフィックス自動付与）
    const files = await storageService.listFiles(organizationId, '');

    // ファイル情報をStorageFile型にマッピング
    const processedFiles: StorageFile[] = files.map((file: any) => ({
      key: file.key,
      name: file.key.split('/').pop() || file.key,
      size: file.size,
      lastModified: file.lastModified,
      isFolder: file.isFolder || false,
      organizationId: organizationId,
      isCheckedOut: false, // TODO: チェックアウト状態の取得（Phase 7で実装）
      checkedOutBy: null,
      managerId: null,
      checkoutTime: null,
      workId: null,
      workUuid: null,
      workerId: null,
      assignedWorkerId: null,
      assignedTo: null,
    }));

    console.log('✅ [maimlService] ファイル一覧取得完了:', processedFiles.length);

    const response: ListFilesResponse = {
      files: processedFiles,
      hierarchicalData: [], // TODO: 階層構造の構築（Phase 7で実装）
      totalCount: processedFiles.length,
      organizationId: organizationId,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    return response;
  } catch (error) {
    console.error('❌ [maimlService] ファイル一覧取得エラー:', error);
    throw error;
  }
}

/**
 * S3/Swiftからファイル内容取得
 * Reference版: retrievalRoutes.js - GET /api/s3/file-content
 * 
 * @param fileKey - ファイルキー
 * @returns ファイル内容
 */
export async function getMaimlFileContent(fileKey: string): Promise<FileContentResponse> {
  try {
    console.log('📄 [maimlService] ファイル内容取得開始:', fileKey);

    // fileKeyから組織IDを抽出（org_xxx/ プレフィックスから）
    const orgMatch = fileKey.match(/^org_([^/]+)\//);
    if (!orgMatch) {
      throw new Error('Invalid file key format: organization prefix not found');
    }

    const organizationPrefix = orgMatch[0]; // org_xxx/
    const relativePath = fileKey.substring(organizationPrefix.length); // org_xxx/を除いた相対パス

    // TODO: DBからorganization_idを取得する処理が必要
    // 現時点では組織プレフィックスをそのまま使用
    const buffer = await storageService.downloadFile(organizationPrefix.replace('/', ''), relativePath);

    const content = buffer.toString('utf-8');

    if (!content || content.trim().length === 0) {
      throw new Error('File content is empty');
    }

    console.log('✅ [maimlService] ファイル内容取得完了:', {
      fileKey,
      contentLength: content.length,
    });

    // TODO: Content-Typeの自動判定（Phase 7で実装）
    const contentType = fileKey.endsWith('.maiml') ? 'application/xml' : 'text/plain';

    const response: FileContentResponse = {
      data: {
        content: content,
        fileKey: fileKey,
        contentLength: content.length,
        lastModified: new Date().toISOString(),
        contentType: contentType,
      },
    };

    return response;
  } catch (error) {
    console.error('❌ [maimlService] ファイル内容取得エラー:', error);
    throw error;
  }
}

/**
 * MAIML自動補正（リアルタイム版）
 * Reference版: validationRoutes.js - POST /api/s3/maiml-auto-correct-realtime
 * 
 * @param maimlContent - デコード済みMAIMLコンテンツ（コントローラー層でbase64デコード済み）
 * @param selectedErrors - 選択されたエラーのインデックス配列
 * @param organizationId - 組織ID
 * @returns 補正結果
 */
export async function autoCorrectMaiml(
  maimlContent: string,
  selectedErrors: number[],
  organizationId: string
): Promise<AutoCorrectResponse> {
  try {
    console.log('🔧 [maimlService] 自動補正開始:', {
      contentLength: maimlContent.length,
      selectedErrorCount: selectedErrors.length,
    });

    // バリデーション実行してエラーを取得
    const analysisResult = await maimlParser.analyzeMaiMLFile(
      organizationId,
      maimlContent,
      'realtime-autocorrect'
    );

    if (!analysisResult || !analysisResult.errors) {
      throw new Error('Failed to analyze MaiML content');
    }

    // 3. 自動修正可能なエラーをフィルタリング
    const correctableErrors: Array<{ index: number; error: any }> = [];
    for (const errorIndex of selectedErrors) {
      if (errorIndex >= 0 && errorIndex < analysisResult.errors.length) {
        const error = analysisResult.errors[errorIndex];
        if (error && error.suggestion) {
          correctableErrors.push({ index: errorIndex, error });
        }
      }
    }

    if (correctableErrors.length === 0) {
      const response: AutoCorrectResponse = {
        correctedContent: maimlContent,
        appliedCorrections: [],
        correctionCount: 0,
        totalAttempted: 0,
        message: '自動修正可能なエラーがありません',
        timestamp: new Date().toISOString(),
      };
      return response;
    }

    // 自動修正を適用
    let correctedContent = maimlContent;
    const appliedCorrections: CorrectionResult[] = [];

    for (const { index, error } of correctableErrors) {
      try {
        // エラータイプに応じた修正ロジック
        if (error.type === 'missing_attribute' && error.element && error.attribute) {
          // 属性追加の修正
          const elementPattern = new RegExp(
            `<${error.element}([^>]*)>`,
            'g'
          );
          const replacement = `<${error.element}$1 ${error.attribute}="${error.value || ''}">`;

          const newContent = correctedContent.replace(elementPattern, replacement);

          if (newContent !== correctedContent) {
            correctedContent = newContent;
            appliedCorrections.push({
              errorIndex: index,
              type: error.type,
              description: `${error.element}要素に${error.attribute}属性を追加`,
              applied: true,
            });
          }
        } else if (error.type === 'invalid_value' && error.xpath) {
          // 値の修正（簡易版）
          console.log(`⚠️ [maimlService] Value correction not fully implemented for: ${error.xpath}`);
          appliedCorrections.push({
            errorIndex: index,
            type: error.type,
            description: error.message,
            applied: false,
            reason: '値の自動修正は未実装',
          });
        }
      } catch (correctionError) {
        console.error(`❌ [maimlService] Error applying correction ${index}:`, correctionError);
        appliedCorrections.push({
          errorIndex: index,
          type: error.type,
          description: error.message,
          applied: false,
          reason: correctionError instanceof Error ? correctionError.message : 'Unknown error',
        });
      }
    }

    const successCount = appliedCorrections.filter((c) => c.applied).length;

    console.log(`✅ [maimlService] 自動補正完了: ${successCount}/${correctableErrors.length} corrections applied`);

    const response: AutoCorrectResponse = {
      correctedContent,
      appliedCorrections,
      correctionCount: successCount,
      totalAttempted: correctableErrors.length,
      message: `${successCount}件の修正を適用しました`,
      timestamp: new Date().toISOString(),
    };

    return response;
  } catch (error) {
    console.error('❌ [maimlService] 自動補正エラー:', error);
    throw error;
  }
}
