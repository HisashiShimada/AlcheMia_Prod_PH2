/**
 * MAIMLサービス
 * 
 * @description MAIML編集、解析、バリデーション等のビジネスロジック
 * @reference Reference版: reference/backend/services/editService.js
 * @task Phase 6 Step 3: サービス層実装
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { getStorageService } from './storageService';
import * as crypto from 'crypto';
import * as validationHistoryRepository from '../repositories/validationHistoryRepository';

const storageService = getStorageService();

/**
 * 編集セッション管理用Map
 */
const editSessions = new Map<string, EditSession>();

/**
 * 編集セッション型定義
 */
interface EditSession {
  sessionId: string;
  fileKey: string;
  fileName: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  changes: any[];
  locked: boolean;
}

/**
 * MAIML解析結果型定義
 */
interface ParseResult {
  metadata: Record<string, any>;
  places: any[];
  transitions: any[];
  arcs: any[];
  statistics: {
    placeCount: number;
    transitionCount: number;
    arcCount: number;
  };
}

/**
 * バリデーション結果型定義
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  statistics?: {
    places: number;
    transitions: number;
    arcs: number;
    totalNodes: number;
  };
}

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
  projectId: string,
  content: string,
  organizationId: string,
  options: any = {}
): Promise<any> {
  try {
    console.log('💾 [maimlService] MAIML保存開始:', projectId);

    // 1. バリデーション
    const validation = await validateMaiML(content);
    if (!validation.isValid && options.strictValidation !== false) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. ファイルパス生成
    const filePath = `projects/${projectId}/${projectId}.maiml`;

    // 3. バックアップ作成（既存ファイルがあれば）
    if (options.createBackup !== false) {
      await createBackup(filePath, organizationId);
    }

    // 4. S3/Swiftアップロード
    await storageService.uploadFile(organizationId, filePath, Buffer.from(content, 'utf-8'), {
      contentType: 'application/xml',
      metadata: {
        'edit-timestamp': new Date().toISOString(),
        'validation-status': validation.isValid ? 'valid' : 'warning',
      },
    });

    // 5. コンテンツハッシュ計算
    const contentHash = calculateContentHash(content);

    console.log('✅ [maimlService] MAIML保存完了:', filePath);

    return {
      filePath,
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
 */
export async function validateMaiML(content: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  try {
    console.log('✔️ [maimlService] MAIMLバリデーション開始');

    // XML構文チェック
    const parser = new DOMParser({
      errorHandler: {
        warning: (msg: string) => warnings.push(`XML警告: ${msg}`),
        error: (msg: string) => errors.push(`XML構文エラー: ${msg}`),
        fatalError: (msg: string) => errors.push(`XML致命的エラー: ${msg}`),
      },
    });

    const doc = parser.parseFromString(content, 'text/xml');

    // maiml要素チェック
    const maimlElement = doc.getElementsByTagName('maiml')[0];
    if (!maimlElement) {
      errors.push('maiml要素が見つかりません');
      return { isValid: false, errors, warnings, info };
    }

    // pnml構造チェック
    const pnmlElements = doc.getElementsByTagName('pnml');
    if (pnmlElements.length === 0) {
      warnings.push('pnml要素が見つかりません');
    }

    // 🆕 重複ID検証（詳細版）
    const duplicateValidation = validateDuplicateIds(doc);
    errors.push(...duplicateValidation.errors);
    warnings.push(...duplicateValidation.warnings);

    // ノード参照チェック
    const nodeIds = new Set<string>();
    const places = doc.getElementsByTagName('place');
    const transitions = doc.getElementsByTagName('transition');

    // ID収集
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const id = place.getAttribute('id');
      if (id) {
        nodeIds.add(id);
      }
    }

    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      const id = transition.getAttribute('id');
      if (id) {
        nodeIds.add(id);
      }
    }

    // アーク参照チェック
    const arcs = doc.getElementsByTagName('arc');
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const source = arc.getAttribute('source');
      const target = arc.getAttribute('target');

      if (source && !nodeIds.has(source)) {
        errors.push(`存在しないソースノード参照: ${source}`);
      }
      if (target && !nodeIds.has(target)) {
        errors.push(`存在しないターゲットノード参照: ${target}`);
      }
    }

    // 統計情報
    info.push(`プレース数: ${places.length}`);
    info.push(`トランジション数: ${transitions.length}`);
    info.push(`アーク数: ${arcs.length}`);
    info.push(`ユニークID数: ${duplicateValidation.info[0] || '0'}`);

    const isValid = errors.length === 0;

    console.log('✅ [maimlService] MAIMLバリデーション完了:', isValid ? '有効' : '無効');

    return {
      isValid,
      errors,
      warnings,
      info,
      statistics: {
        places: places.length,
        transitions: transitions.length,
        arcs: arcs.length,
        totalNodes: places.length + transitions.length,
      },
    };
  } catch (error) {
    console.error('❌ [maimlService] MAIMLバリデーションエラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`検証エラー: ${errorMessage}`);
    return { isValid: false, errors, warnings, info };
  }
}

/**
 * 重複ID検証機能
 * Reference版のvalidateDuplicateIdsロジックを移植
 * 
 * @param doc XMLドキュメント
 * @returns バリデーション結果
 */
export function validateDuplicateIds(doc: Document): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  try {
    console.log('🔍 [maimlService] 重複ID検証開始');

    // IDマップ: id -> [{ elementType, path }]
    const idMap = new Map<string, Array<{ elementType: string; path: string }>>();

    /**
     * 全要素をトラバースしてID収集
     */
    const collectIds = (element: Element, path: string = ''): void => {
      const id = element.getAttribute('id');
      if (id) {
        const elementType = element.tagName;

        if (!idMap.has(id)) {
          idMap.set(id, []);
        }
        idMap.get(id)!.push({ elementType, path });
      }

      // 子要素を再帰的に処理
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const newPath = path ? `${path}.${child.tagName}[${i}]` : `${child.tagName}[${i}]`;
        collectIds(child, newPath);
      }
    };

    // ルート要素から開始
    collectIds(doc.documentElement);

    // 重複チェック
    let duplicateCount = 0;
    for (const [id, occurrences] of idMap) {
      if (occurrences.length > 1) {
        duplicateCount++;
        const elementTypes = occurrences.map((o) => o.elementType).join(', ');
        const paths = occurrences.map((o) => o.path).join('; ');

        errors.push(
          `重複ID "${id}" が ${occurrences.length} 箇所で使用されています (${elementTypes})`
        );

        console.log(`⚠️ [maimlService] 重複ID検出: ${id} (${occurrences.length}回, 要素: ${elementTypes})`);
      }
    }

    info.push(`${idMap.size}`);

    console.log(`✅ [maimlService] 重複ID検証完了: ${duplicateCount}個の重複を検出（全${idMap.size}個のID）`);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  } catch (error) {
    console.error('❌ [maimlService] 重複ID検証エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    warnings.push(`重複ID検証が部分的に失敗しました: ${errorMessage}`);

    return {
      isValid: true, // 検証失敗は警告として扱う
      errors: [],
      warnings,
      info,
    };
  }
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
): Promise<ValidationResult & { validationId?: string }> {
  const startTime = Date.now();

  try {
    console.log('✔️ [maimlService] MAIMLバリデーション（履歴保存付き）開始');

    // バリデーション実行
    const validation = await validateMaiML(content);

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
      nodes_validated: validation.statistics?.totalNodes || null,
      arcs_validated: validation.statistics?.arcs || null,
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
    const validation = await validateMaiML(content);
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
 */
async function createBackup(filePath: string, organizationId: string): Promise<string | null> {
  try {
    // 既存ファイル確認
    const exists = await storageService.fileExists(organizationId, filePath);

    if (exists) {
      // 既存ファイルを取得
      const buffer = await storageService.downloadFile(organizationId, filePath);

      // バックアップパス生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = filePath.replace('.maiml', `.backup.${timestamp}.maiml`);

      // バックアップ保存
      await storageService.uploadFile(organizationId, backupPath, buffer);

      console.log('📋 [maimlService] バックアップ作成:', backupPath);
      return backupPath;
    }

    return null;
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
