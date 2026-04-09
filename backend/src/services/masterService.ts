/**
 * マスタ管理(Creator、Vendor、Instrument)サービス
 * ビジネスロジック層
 */

import Papa from 'papaparse';
import * as creatorRepository from '../repositories/creatorRepository';
import { CreatorSearchFilters } from '../repositories/creatorRepository';
import * as instrumentRepository from '../repositories/instrumentRepository';
import * as vendorRepository from '../repositories/vendorRepository';
import * as attributeRepository from '../repositories/attributeRepository';
import { getPgp } from '../database/db';
import { getMessage } from '../utils/messages';

/**
 * Creatorマスタレスポンス型定義
 */
export interface CreatorMasterResponse {
  creatorId: string;
  creatorUuid: string;
  creatorName: string;
  creatorDescription: string;
  creatorAnnotation: string;
  isActive: boolean;
  vendorName: string;
  vendorIsActive: boolean | null;
  instrumentName: string;
  instrumentIsActive: boolean | null;
  updatedAt: string;
}

/**
 * Instrumentマスタレスポンス型定義
 */
export interface InstrumentMasterResponse {
  instrumentId: string;
  instrumentUuid: string;
  instrumentName: string;
  instrumentDescription: string;
  instrumentAnnotation: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * Vendorマスタレスポンス型定義
 */
export interface VendorMasterResponse {
  vendorId: string;
  vendorUuid: string;
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * 日時を YYYYMMDDhhmmss 形式にフォーマット
 * 
 * @param date 日時オブジェクト
 * @returns フォーマットされた文字列
 */
function formatDateTime(date: Date | null): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  } catch (error) {
    console.error('Date format error:', error);
    return '-';
  }
}

/**
 * Creatorマスタを取得
 * 
 * @param organizationId 組織ID
 * @param filters 検索フィルター
 * @returns Creatorマスタの配列
 */
export async function getCreatorMasters(
  organizationId: string,
  filters: CreatorSearchFilters = {}
): Promise<CreatorMasterResponse[]> {
  console.log('=== masterService.getCreatorMasters called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  // リポジトリからデータ取得
  console.log('Calling creatorRepository.findAll...');
  const creators = await creatorRepository.findAll(organizationId, filters);
  console.log('Repository returned:', creators.length, 'records');
  
  // レスポンス形式に変換
  return creators.map(creator => ({
    creatorId: creator.creator_id,
    creatorUuid: creator.creator_uuid,
    creatorName: creator.creator_name,
    creatorDescription: creator.creator_description || '',
    creatorAnnotation: creator.creator_annotation || '',
    isActive: creator.is_active,
    vendorName: creator.vendor_name || '',
    vendorIsActive: creator.vendor_is_active,
    instrumentName: creator.instrument_name || '',
    instrumentIsActive: creator.instrument_is_active,
    updatedAt: formatDateTime(creator.update_at),
  }));
}

/**
 * Creatorマスタをフィルタ付きで取得（CSV用）
 * Repository層のWHERE句フィルタリングを使用
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Creatorマスタの配列
 */
export async function getCreatorMastersWithFilters(
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<CreatorMasterResponse[]> {
  console.log('=== masterService.getCreatorMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('corporationId:', corporationId);
  console.log('filters:', filters);
  
  // Repository層のWHERE句フィルタリングを使用（効率的）
  const creators = await creatorRepository.findAllWithFilters(organizationId, corporationId, filters);
  
  console.log('Filtered count (from DB):', creators.length);
  
  // レスポンス形式に変換
  return creators.map(creator => ({
    creatorId: creator.creator_id,
    creatorUuid: creator.creator_uuid,
    creatorName: creator.creator_name,
    creatorDescription: creator.creator_description || '',
    creatorAnnotation: creator.creator_annotation || '',
    isActive: creator.is_active,
    vendorName: creator.vendor_name || '',
    vendorIsActive: creator.vendor_is_active,
    instrumentName: creator.instrument_name || '',
    instrumentIsActive: creator.instrument_is_active,
    updatedAt: formatDateTime(creator.update_at),
  }));
}

/**
 * Creator IDで1件取得
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @returns Creatorマスタ（見つからない場合はnull）
 */
export async function getCreatorById(
  organizationId: string,
  creatorId: string
): Promise<CreatorMasterResponse | null> {
  const creator = await creatorRepository.findById(organizationId, creatorId);
  
  if (!creator) {
    return null;
  }
  
  return {
    creatorId: creator.creator_id,
    creatorUuid: creator.creator_uuid,
    creatorName: creator.creator_name,
    creatorDescription: creator.creator_description || '',
    creatorAnnotation: creator.creator_annotation || '',
    isActive: creator.is_active,
    vendorName: creator.vendor_name || '',
    vendorIsActive: creator.vendor_is_active,
    instrumentName: creator.instrument_name || '',
    instrumentIsActive: creator.instrument_is_active,
    updatedAt: formatDateTime(creator.update_at),
  };
}

/**
 * Creatorマスタの件数を取得
 * 
 * @param organizationId 組織ID
 * @returns 件数
 */
export async function getCreatorCount(organizationId: string): Promise<number> {
  return await creatorRepository.count(organizationId);
}

/**
 * Creatorマスタを新規作成
 */
export async function createCreatorMaster(
  organizationId: string,
  data: {
    creatorId: string;
    creatorName: string;
    creatorDescription?: string;
    creatorAnnotation?: string;
    vendorId?: string;
    vendorName?: string;
    instrumentId?: string;
    instrumentName?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null,
  lang: string = 'ja'
): Promise<CreatorMasterResponse> {
  // ID重複チェック（法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で一意チェック）
  const exists = await creatorRepository.existsById(organizationId, data.creatorId, corporationId);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'master.duplicateCreatorId'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_CREATOR_ID';
    throw error;
  }
  
  const creator = await creatorRepository.create(organizationId, data, userId, corporationId);
  
  // 作成後に再取得してvendor/instrumentのis_active情報も含める
  const createdCreator = await creatorRepository.findById(organizationId, creator.creator_id);
  
  if (!createdCreator) {
    throw new Error('作成したCreatorマスタが見つかりません');
  }
  
  return {
    creatorId: createdCreator.creator_id,
    creatorUuid: createdCreator.creator_uuid,
    creatorName: createdCreator.creator_name,
    creatorDescription: createdCreator.creator_description || '',
    creatorAnnotation: createdCreator.creator_annotation || '',
    isActive: createdCreator.is_active,
    vendorName: createdCreator.vendor_name || '',
    vendorIsActive: createdCreator.vendor_is_active,
    instrumentName: createdCreator.instrument_name || '',
    instrumentIsActive: createdCreator.instrument_is_active,
    updatedAt: formatDateTime(createdCreator.update_at),
  };
}

/**
 * Instrumentマスタを取得
 * 
 * @param organizationId 組織ID
 * @returns Instrumentマスタの配列
 */
export async function getInstrumentMasters(
  organizationId: string
): Promise<InstrumentMasterResponse[]> {
  console.log('=== masterService.getInstrumentMasters called ===');
  console.log('organizationId:', organizationId);
  
  // リポジトリからデータ取得
  const instruments = await instrumentRepository.findAll(organizationId);
  console.log('Repository returned:', instruments.length, 'records');
  
  // レスポンス形式に変換
  return instruments.map(instrument => ({
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  }));
}

/**
 * Instrumentマスタをフィルタ付きで取得（CSV用）
 * Repository層のWHERE句フィルタリングを使用
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Instrumentマスタの配列
 */
export async function getInstrumentMastersWithFilters(
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<InstrumentMasterResponse[]> {
  console.log('=== masterService.getInstrumentMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('corporationId:', corporationId);
  console.log('filters:', filters);
  
  // Repository層のWHERE句フィルタリングを使用（効率的）
  const instruments = await instrumentRepository.findAllWithFilters(organizationId, corporationId, filters);
  
  console.log('Filtered count (from DB):', instruments.length);
  
  // レスポンス形式に変換
  return instruments.map(instrument => ({
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  }));
}

/**
 * Instrument IDで1件取得
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @returns Instrumentマスタ（見つからない場合はnull）
 */
export async function getInstrumentById(
  organizationId: string,
  instrumentId: string
): Promise<InstrumentMasterResponse | null> {
  const instrument = await instrumentRepository.findById(organizationId, instrumentId);
  
  if (!instrument) {
    return null;
  }
  
  return {
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  };
}

/**
 * Vendorマスタを取得
 * 
 * @param organizationId 組織ID
 * @returns Vendorマスタの配列
 */
export async function getVendorMasters(
  organizationId: string
): Promise<VendorMasterResponse[]> {
  console.log('=== masterService.getVendorMasters called ===');
  console.log('organizationId:', organizationId);
  
  // リポジトリからデータ取得
  const vendors = await vendorRepository.findAll(organizationId);
  console.log('Repository returned:', vendors.length, 'records');
  
  // レスポンス形式に変換
  return vendors.map(vendor => ({
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  }));
}

/**
 * Vendorマスタをフィルタ付きで取得（CSV用）
 * Repository層のWHERE句フィルタリングを使用
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Vendorマスタの配列
 */
export async function getVendorMastersWithFilters(
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<VendorMasterResponse[]> {
  console.log('=== masterService.getVendorMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('corporationId:', corporationId);
  console.log('filters:', filters);
  
  // Repository層のWHERE句フィルタリングを使用（効率的）
  const vendors = await vendorRepository.findAllWithFilters(organizationId, corporationId, filters);
  
  console.log('Filtered count (from DB):', vendors.length);
  
  // レスポンス形式に変換
  return vendors.map(vendor => ({
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  }));
}

/**
 * Vendor IDで1件取得
 * 
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @returns Vendorマスタ（見つからない場合はnull）
 */
export async function getVendorById(
  organizationId: string,
  vendorId: string
): Promise<VendorMasterResponse | null> {
  const vendor = await vendorRepository.findById(organizationId, vendorId);
  
  if (!vendor) {
    return null;
  }
  
  return {
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  };
}

/**
 * Instrumentマスタを新規作成
 */
export async function createInstrumentMaster(
  organizationId: string,
  data: {
    instrumentId: string;
    instrumentName: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null,
  lang: string = 'ja'
): Promise<InstrumentMasterResponse> {
  // ID重複チェック（法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で一意チェック）
  const exists = await instrumentRepository.existsById(organizationId, data.instrumentId, corporationId);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'master.duplicateInstrumentId'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_INSTRUMENT_ID';
    throw error;
  }
  
  const instrument = await instrumentRepository.create(organizationId, data, userId, corporationId);
  
  return {
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  };
}

/**
 * Instrumentマスタを更新
 */
export async function updateInstrumentMaster(
  organizationId: string,
  instrumentId: string,
  data: {
    instrumentName?: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMasterResponse | null> {
  const instrument = await instrumentRepository.update(organizationId, instrumentId, data, userId, corporationId);
  
  if (!instrument) {
    return null;
  }
  
  return {
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  };
}

/**
 * Instrumentマスタのアクティブ状態を更新
 */
export async function updateInstrumentStatus(
  organizationId: string,
  instrumentId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMasterResponse | null> {
  const instrument = await instrumentRepository.updateStatus(organizationId, instrumentId, isActive, userId, corporationId);
  
  if (!instrument) {
    return null;
  }
  
  return {
    instrumentId: instrument.instrument_id,
    instrumentUuid: instrument.instrument_uuid,
    instrumentName: instrument.instrument_name,
    instrumentDescription: instrument.instrument_description || '',
    instrumentAnnotation: instrument.instrument_annotation || '',
    isActive: instrument.is_active,
    updatedAt: formatDateTime(instrument.update_at),
  };
}

/**
 * Vendorマスタを新規作成
 */
export async function createVendorMaster(
  organizationId: string,
  data: {
    vendorId: string;
    vendorName: string;
    vendorDescription?: string;
    vendorAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null,
  lang: string = 'ja'
): Promise<VendorMasterResponse> {
  // ID重複チェック（法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で一意チェック）
  const exists = await vendorRepository.existsById(organizationId, data.vendorId, corporationId);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'master.duplicateVendorId'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_VENDOR_ID';
    throw error;
  }
  
  const vendor = await vendorRepository.create(organizationId, data, userId, corporationId);
  
  return {
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  };
}

/**
 * Vendorマスタを更新
 */
export async function updateVendorMaster(
  organizationId: string,
  vendorId: string,
  data: {
    vendorName?: string;
    vendorDescription?: string;
    vendorAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<VendorMasterResponse | null> {
  const vendor = await vendorRepository.update(organizationId, vendorId, data, userId, corporationId);
  
  if (!vendor) {
    return null;
  }
  
  return {
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  };
}

/**
 * Vendorマスタのアクティブ状態を更新
 */
export async function updateVendorStatus(
  organizationId: string,
  vendorId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<VendorMasterResponse | null> {
  const vendor = await vendorRepository.updateStatus(organizationId, vendorId, isActive, userId, corporationId);
  
  if (!vendor) {
    return null;
  }
  
  return {
    vendorId: vendor.vendor_id,
    vendorUuid: vendor.vendor_uuid,
    vendorName: vendor.vendor_name,
    vendorDescription: vendor.vendor_description || '',
    vendorAnnotation: vendor.vendor_annotation || '',
    isActive: vendor.is_active,
    updatedAt: formatDateTime(vendor.update_at),
  };
}

/**
 * Creatorマスタを更新
 */
export async function updateCreatorMaster(
  organizationId: string,
  creatorId: string,
  updateData: any,
  userId: string,
  corporationId?: string | null
): Promise<CreatorMasterResponse> {
  const updatedCreator = await creatorRepository.update(
    organizationId,
    creatorId,
    updateData,
    userId,
    corporationId
  );
  
  if (!updatedCreator) {
    throw new Error('Creatorマスタが見つかりません');
  }
  
  // 更新後のデータを完全な形式で返す
  return {
    creatorId: updatedCreator.creator_id,
    creatorUuid: updatedCreator.creator_uuid,
    creatorName: updatedCreator.creator_name,
    creatorDescription: updatedCreator.creator_description || '',
    creatorAnnotation: updatedCreator.creator_annotation || '',
    isActive: updatedCreator.is_active,
    vendorName: updatedCreator.vendor_name || '',
    vendorIsActive: updatedCreator.vendor_is_active,
    instrumentName: updatedCreator.instrument_name || '',
    instrumentIsActive: updatedCreator.instrument_is_active,
    updatedAt: formatDateTime(updatedCreator.update_at),
  };
}

/**
 * Creatorマスタのアクティブ状態を更新
 */
export async function updateCreatorStatus(
  organizationId: string,
  creatorId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<CreatorMasterResponse | null> {
  const creator = await creatorRepository.updateStatus(
    organizationId,
    creatorId,
    isActive,
    userId,
    corporationId
  );
  
  if (!creator) {
    return null;
  }
  
  return {
    creatorId: creator.creator_id,
    creatorUuid: creator.creator_uuid,
    creatorName: creator.creator_name,
    creatorDescription: creator.creator_description || '',
    creatorAnnotation: creator.creator_annotation || '',
    isActive: creator.is_active,
    vendorName: creator.vendor_name || '',
    vendorIsActive: creator.vendor_is_active,
    instrumentName: creator.instrument_name || '',
    instrumentIsActive: creator.instrument_is_active,
    updatedAt: formatDateTime(creator.update_at),
  };
}

/**
 * CSV型定義
 */
interface CsvRow {
  [key: string]: string;
}

interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

interface CsvUploadResult {
  successCount: number;
  failureCount: number;
  errors: CsvValidationError[];
}

/**
 * CreatorマスタCSVアップロード処理
 * All or Nothing方式: 1行でもエラーがあれば全てロールバック
 * 新規レコードのみ登録可能（既存レコードの更新は不可）
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadCreatorsCsv(
  organizationId: string,
  csvContent: string,
  userId: string,
  corporationId?: string | null
): Promise<CsvUploadResult> {
  // CSVをパース
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const errors: CsvValidationError[] = [];
  const validRows: Array<{
    creatorId: string;
    creatorName: string;
    creatorDescription: string;
    creatorAnnotation: string;
    vendorName: string;
    instrumentName: string;
    isActive: boolean;
  }> = [];
  
  // ====================================
  // Phase 1: CSV内の主キー重複チェック
  // ====================================
  const creatorIds = new Set<string>();
  const duplicateIds: string[] = [];
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const creatorId = row['creator_id']?.trim();
    
    if (creatorId) {
      if (creatorIds.has(creatorId)) {
        if (!duplicateIds.includes(creatorId)) {
          duplicateIds.push(creatorId);
        }
      } else {
        creatorIds.add(creatorId);
      }
    }
  }
  
  // 重複がある場合はエラー
  if (duplicateIds.length > 0) {
    throw new Error(
      `CSV内に重複したcreator_idが存在します: ${duplicateIds.join(', ')}`
    );
  }
  
  // ====================================
  // Phase 2: 事前バリデーション（全行スキャン）
  // ====================================
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const creatorId = row['creator_id']?.trim();
    const creatorName = row['creator_name']?.trim();
    
    if (!creatorId) {
      errors.push({ row: rowNumber, field: 'creator_id', message: 'creator_idは必須です' });
      continue;
    }
    
    if (!creatorName) {
      errors.push({ row: rowNumber, field: 'creator_name', message: 'creator_nameは必須です' });
      continue;
    }
    
    // is_activeの型チェック
    const isActiveStr = row['is_active']?.trim().toLowerCase();
    if (isActiveStr && !['true', 'false', '1', '0', ''].includes(isActiveStr)) {
      errors.push({
        row: rowNumber,
        field: 'is_active',
        message: `is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: ${row['is_active']}）`
      });
      continue;
    }
    
    // is_active の変換（boolean値として処理）
    const isActive = isActiveStr === 'true' || isActiveStr === '1';
    
    // DB既存チェック（既存レコードはエラー扱い）
    // 法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で重複チェック
    const exists = await creatorRepository.existsById(organizationId, creatorId, corporationId);
    if (exists) {
      errors.push({
        row: rowNumber,
        field: 'creator_id',
        message: `creator_id: ${creatorId} は既に存在します。既存レコードの編集は一覧から行ってください。`
      });
      continue;
    }
    
    // バリデーションOKの行を保存
    validRows.push({
      creatorId,
      creatorName,
      creatorDescription: row['creator_description']?.trim() || '',
      creatorAnnotation: row['creator_annotation']?.trim() || '',
      vendorName: row['vendor_name']?.trim() || '',
      instrumentName: row['instrument_name']?.trim() || '',
      isActive,
    });
  }
  
  // ====================================
  // Phase 3: エラー判定
  // ====================================
  if (errors.length > 0) {
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors,
    };
  }
  
  // ====================================
  // Phase 4: 全行一括登録（エラーがない場合のみ）
  // ====================================
  const pgp = getPgp();
  
  return await pgp.tx(async (_t) => {
    let successCount = 0;
    for (const validRow of validRows) {
      await creatorRepository.create(organizationId, validRow, userId, corporationId);
      successCount++;
    }
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  });
}

/**
 * InstrumentマスタCSVアップロード処理
 * All or Nothing方式: 1行でもエラーがあれば全てロールバック
 * 新規レコードのみ登録可能（既存レコードの更新は不可）
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadInstrumentsCsv(
  organizationId: string,
  csvContent: string,
  userId: string,
  corporationId?: string | null
): Promise<CsvUploadResult> {
  // CSVをパース
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const errors: CsvValidationError[] = [];
  const validRows: Array<{
    instrumentId: string;
    instrumentName: string;
    instrumentDescription: string;
    instrumentAnnotation: string;
    isActive: boolean;
  }> = [];
  
  // ====================================
  // Phase 1: CSV内の主キー重複チェック
  // ====================================
  const instrumentIds = new Set<string>();
  const duplicateIds: string[] = [];
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const instrumentId = row['instrument_id']?.trim();
    
    if (instrumentId) {
      if (instrumentIds.has(instrumentId)) {
        if (!duplicateIds.includes(instrumentId)) {
          duplicateIds.push(instrumentId);
        }
      } else {
        instrumentIds.add(instrumentId);
      }
    }
  }
  
  // 重複がある場合はエラー
  if (duplicateIds.length > 0) {
    throw new Error(
      `CSV内に重複したinstrument_idが存在します: ${duplicateIds.join(', ')}`
    );
  }
  
  // ====================================
  // Phase 2: 事前バリデーション（全行スキャン）
  // ====================================
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const instrumentId = row['instrument_id']?.trim();
    const instrumentName = row['instrument_name']?.trim();
    
    if (!instrumentId) {
      errors.push({ row: rowNumber, field: 'instrument_id', message: 'instrument_idは必須です' });
      continue;
    }
    
    if (!instrumentName) {
      errors.push({ row: rowNumber, field: 'instrument_name', message: 'instrument_nameは必須です' });
      continue;
    }
    
    // is_activeの型チェック
    const isActiveStr = row['is_active']?.trim().toLowerCase();
    if (isActiveStr && !['true', 'false', '1', '0', ''].includes(isActiveStr)) {
      errors.push({
        row: rowNumber,
        field: 'is_active',
        message: `is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: ${row['is_active']}）`
      });
      continue;
    }
    
    // is_active の変換（boolean値として処理）
    const isActive = isActiveStr === 'true' || isActiveStr === '1';
    
    // DB既存チェック（既存レコードはエラー扱い）
    // 法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で重複チェック
    const exists = await instrumentRepository.existsById(organizationId, instrumentId, corporationId);
    if (exists) {
      errors.push({
        row: rowNumber,
        field: 'instrument_id',
        message: `instrument_id: ${instrumentId} は既に存在します。既存レコードの編集は一覧から行ってください。`
      });
      continue;
    }
    
    // バリデーションOKの行を保存
    validRows.push({
      instrumentId,
      instrumentName,
      instrumentDescription: row['instrument_description']?.trim() || '',
      instrumentAnnotation: row['instrument_annotation']?.trim() || '',
      isActive,
    });
  }
  
  // ====================================
  // Phase 3: エラー判定
  // ====================================
  if (errors.length > 0) {
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors,
    };
  }
  
  // ====================================
  // Phase 4: 全行一括登録（エラーがない場合のみ）
  // ====================================
  const pgp = getPgp();
  
  return await pgp.tx(async (_t) => {
    let successCount = 0;
    for (const validRow of validRows) {
      await instrumentRepository.create(organizationId, validRow, userId, corporationId);
      successCount++;
    }
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  });
}

/**
 * VendorマスタCSVアップロード処理
 * All or Nothing方式: 1行でもエラーがあれば全てロールバック
 * 新規レコードのみ登録可能（既存レコードの更新は不可）
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadVendorsCsv(
  organizationId: string,
  csvContent: string,
  userId: string,
  corporationId?: string | null
): Promise<CsvUploadResult> {
  // CSVをパース
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const errors: CsvValidationError[] = [];
  const validRows: Array<{
    vendorId: string;
    vendorName: string;
    vendorDescription: string;
    vendorAnnotation: string;
    isActive: boolean;
  }> = [];
  
  // ====================================
  // Phase 1: CSV内の主キー重複チェック
  // ====================================
  const vendorIds = new Set<string>();
  const duplicateIds: string[] = [];
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const vendorId = row['vendor_id']?.trim();
    
    if (vendorId) {
      if (vendorIds.has(vendorId)) {
        if (!duplicateIds.includes(vendorId)) {
          duplicateIds.push(vendorId);
        }
      } else {
        vendorIds.add(vendorId);
      }
    }
  }
  
  // 重複がある場合はエラー
  if (duplicateIds.length > 0) {
    throw new Error(
      `CSV内に重複したvendor_idが存在します: ${duplicateIds.join(', ')}`
    );
  }
  
  // ====================================
  // Phase 2: 事前バリデーション（全行スキャン）
  // ====================================
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const vendorId = row['vendor_id']?.trim();
    const vendorName = row['vendor_name']?.trim();
    
    if (!vendorId) {
      errors.push({ row: rowNumber, field: 'vendor_id', message: 'vendor_idは必須です' });
      continue;
    }
    
    if (!vendorName) {
      errors.push({ row: rowNumber, field: 'vendor_name', message: 'vendor_nameは必須です' });
      continue;
    }
    
    // is_activeの型チェック
    const isActiveStr = row['is_active']?.trim().toLowerCase();
    if (isActiveStr && !['true', 'false', '1', '0', ''].includes(isActiveStr)) {
      errors.push({
        row: rowNumber,
        field: 'is_active',
        message: `is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: ${row['is_active']}）`
      });
      continue;
    }
    
    // is_active の変換（boolean値として処理）
    const isActive = isActiveStr === 'true' || isActiveStr === '1';
    
    // DB既存チェック（既存レコードはエラー扱い）
    // 法人スコープ優先: corporationId がある場合は法人内、ない場合は組織内で重複チェック
    const exists = await vendorRepository.existsById(organizationId, vendorId, corporationId);
    if (exists) {
      errors.push({
        row: rowNumber,
        field: 'vendor_id',
        message: `vendor_id: ${vendorId} は既に存在します。既存レコードの編集は一覧から行ってください。`
      });
      continue;
    }
    
    // バリデーションOKの行を保存
    validRows.push({
      vendorId,
      vendorName,
      vendorDescription: row['vendor_description']?.trim() || '',
      vendorAnnotation: row['vendor_annotation']?.trim() || '',
      isActive,
    });
  }
  
  // ====================================
  // Phase 3: エラー判定
  // ====================================
  if (errors.length > 0) {
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors,
    };
  }
  
  // ====================================
  // Phase 4: 全行一括登録（エラーがない場合のみ）
  // ====================================
  const pgp = getPgp();
  
  return await pgp.tx(async (_t) => {
    let successCount = 0;
    for (const validRow of validRows) {
      await vendorRepository.create(organizationId, validRow, userId, corporationId);
      successCount++;
    }
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  });
}

// =============================================================
// Attributeマスタ関連
// =============================================================

/**
 * Attributeマスタレスポンス型定義
 */
export interface AttributeMasterResponse {
  attributeName: string;
  attributeValue: string;
  attributeRemark: string;
  departmentCd: string;
  departmentName: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * Attributeマスタをフィルタ付きで取得
 *
 * @param organizationId 組織ID
 * @param filters フィルタ条件
 * @returns Attributeマスタの配列
 */
export async function getAttributeMastersWithFilters(
  organizationId: string,
  filters: {
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<AttributeMasterResponse[]> {
  console.log('=== masterService.getAttributeMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);

  const attributes = await attributeRepository.findAllWithFilters(organizationId, filters);

  console.log('Filtered count (from DB):', attributes.length);

  return attributes.map(attr => ({
    attributeName: attr.attribute_name,
    attributeValue: attr.attribute_value || '',
    attributeRemark: attr.attribute_remark || '',
    departmentCd: attr.department_cd || '',
    departmentName: attr.department_name || '',
    isActive: attr.is_active,
    updatedAt: formatDateTime(attr.update_at),
  }));
}

/**
 * 主キーで1件取得
 *
 * @param organizationId 組織ID
 * @param attributeName 属性名（主キー）
 * @param attributeValue 属性値（主キー）
 * @returns Attributeマスタ（見つからない場合はnull）
 */
export async function getAttributeById(
  organizationId: string,
  attributeName: string,
  attributeValue: string = ''
): Promise<AttributeMasterResponse | null> {
  const attr = await attributeRepository.findByPk(organizationId, attributeName, attributeValue);

  if (!attr) {
    return null;
  }

  return {
    attributeName: attr.attribute_name,
    attributeValue: attr.attribute_value || '',
    attributeRemark: attr.attribute_remark || '',
    departmentCd: attr.department_cd || '',
    departmentName: attr.department_name || '',
    isActive: attr.is_active,
    updatedAt: formatDateTime(attr.update_at),
  };
}

/**
 * Attributeマスタを新規作成
 * 主キーは (attribute_name, attribute_value) のため、重複チェックを行う
 */
export async function createAttributeMaster(
  organizationId: string,
  data: {
    attributeName: string;
    attributeValue?: string;
    attributeRemark?: string;
    departmentCd?: string;
    isActive?: boolean;
  },
  userId: string,
  lang: string = 'ja'
): Promise<AttributeMasterResponse> {
  // 主キー重複チェック
  const exists = await attributeRepository.existsByPk(organizationId, data.attributeName, data.attributeValue || '');
  if (exists) {
    const error: any = new Error(getMessage(lang, 'master.duplicateAttributeName') || 'このAttribute名・属性値の組み合わせは既に使用されています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_ATTRIBUTE_NAME';
    throw error;
  }

  const attr = await attributeRepository.create(organizationId, data, userId);
  // 作成後に再取得してdepartment_name も含める
  const created = await attributeRepository.findByPk(organizationId, attr.attribute_name, attr.attribute_value || '');

  if (!created) {
    throw new Error('作成したAttributeマスタが見つかりません');
  }

  return {
    attributeName: created.attribute_name,
    attributeValue: created.attribute_value || '',
    attributeRemark: created.attribute_remark || '',
    departmentCd: created.department_cd || '',
    departmentName: created.department_name || '',
    isActive: created.is_active,
    updatedAt: formatDateTime(created.update_at),
  };
}

/**
 * Attributeマスタを更新
 * 主キーは (attribute_name, attribute_value) のため、両方を引数で受け取る
 */
export async function updateAttributeMaster(
  organizationId: string,
  attributeName: string,
  data: {
    attributeValue?: string;
    attributeRemark?: string;
    departmentCd?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<AttributeMasterResponse | null> {
  const attributeValue = data.attributeValue || '';
  const attr = await attributeRepository.update(organizationId, attributeName, attributeValue, {
    attributeRemark: data.attributeRemark,
    departmentCd: data.departmentCd,
    isActive: data.isActive,
  }, userId);

  if (!attr) {
    return null;
  }

  // 更新後に再取得してdepartment_name も含める
  const updated = await attributeRepository.findByPk(organizationId, attr.attribute_name, attr.attribute_value || '');

  if (!updated) {
    return null;
  }

  return {
    attributeName: updated.attribute_name,
    attributeValue: updated.attribute_value || '',
    attributeRemark: updated.attribute_remark || '',
    departmentCd: updated.department_cd || '',
    departmentName: updated.department_name || '',
    isActive: updated.is_active,
    updatedAt: formatDateTime(updated.update_at),
  };
}

/**
 * Attributeマスタのアクティブ状態を更新
 * PKは (attribute_name, attribute_value) で識別
 * attributeName は "name__value" 形式でエンコードされて渡されることを想定
 */
export async function updateAttributeStatus(
  organizationId: string,
  attributeKey: string,  // "attributeName__attributeValue" 形式
  isActive: boolean,
  userId: string
): Promise<AttributeMasterResponse | null> {
  // "__" でセパレートしてattributeName / attributeValue に分割
  const separatorIdx = attributeKey.indexOf('__');
  const attributeName = separatorIdx >= 0 ? attributeKey.substring(0, separatorIdx) : attributeKey;
  const attributeValue = separatorIdx >= 0 ? attributeKey.substring(separatorIdx + 2) : '';

  const attr = await attributeRepository.updateStatus(organizationId, attributeName, attributeValue, isActive, userId);

  if (!attr) {
    return null;
  }

  return {
    attributeName: attr.attribute_name,
    attributeValue: attr.attribute_value || '',
    attributeRemark: attr.attribute_remark || '',
    departmentCd: attr.department_cd || '',
    departmentName: attr.department_name || '',
    isActive: attr.is_active,
    updatedAt: formatDateTime(attr.update_at),
  };
}

/**
 * AttributeマスタCSVアップロード処理
 * All or Nothing方式: 1行でもエラーがあれば全てロールバック
 * 新規レコードのみ登録可能（既存レコードの更新は不可）
 * ※ 主キーは attribute_name のため、名前重複チェックを行う
 *
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @param userId ユーザーID
 * @returns アップロード結果
 */
export async function uploadAttributesCsv(
  organizationId: string,
  csvContent: string,
  userId: string
): Promise<CsvUploadResult> {
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: CsvValidationError[] = [];
  const validRows: Array<{
    attributeName: string;
    attributeValue: string;
    attributeRemark: string;
    departmentCd: string;
    isActive: boolean;
  }> = [];

  // Phase 1: CSV内の主キー（attribute_name + attribute_value）重複チェック
  const pkSet = new Set<string>();
  const duplicateKeys: string[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const attributeName = row['attribute_name']?.trim();
    const attributeValue = row['attribute_value']?.trim() || '';
    const pkKey = `${attributeName}__${attributeValue}`;

    if (attributeName) {
      if (pkSet.has(pkKey)) {
        if (!duplicateKeys.includes(pkKey)) {
          duplicateKeys.push(pkKey);
        }
      } else {
        pkSet.add(pkKey);
      }
    }
  }

  if (duplicateKeys.length > 0) {
    throw new Error(`CSV内に重複した主キー（attribute_name + attribute_value）が存在します: ${duplicateKeys.join(', ')}`);
  }

  // Phase 2: 事前バリデーション（全行スキャン）
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2;

    const attributeName = row['attribute_name']?.trim();
    const attributeValue = row['attribute_value']?.trim() || '';

    if (!attributeName) {
      errors.push({ row: rowNumber, field: 'attribute_name', message: 'attribute_nameは必須です' });
      continue;
    }

    const isActiveStr = row['is_active']?.trim().toLowerCase();
    if (isActiveStr && !['true', 'false', '1', '0', ''].includes(isActiveStr)) {
      errors.push({
        row: rowNumber,
        field: 'is_active',
        message: `is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: ${row['is_active']}）`
      });
      continue;
    }

    // is_active 省略（列なし or 空文字）の場合はデフォルト true
    const isActive = isActiveStr === '' || isActiveStr === undefined
      ? true
      : (isActiveStr === 'true' || isActiveStr === '1');

    const exists = await attributeRepository.existsByPk(organizationId, attributeName, attributeValue);
    if (exists) {
      errors.push({
        row: rowNumber,
        field: 'attribute_name',
        message: `attribute_name: ${attributeName} / attribute_value: ${attributeValue} の組み合わせは既に存在します。既存レコードの編集は一覧から行ってください。`
      });
      continue;
    }

    validRows.push({
      attributeName,
      attributeValue: row['attribute_value']?.trim() || '',
      attributeRemark: row['attribute_remark']?.trim() || '',
      departmentCd: row['department_cd']?.trim() || '',
      isActive,
    });
  }

  // Phase 3: エラー判定
  if (errors.length > 0) {
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors,
    };
  }

  // Phase 4: 全行一括登録
  const pgp = getPgp();

  return await pgp.tx(async (_t) => {
    let successCount = 0;
    for (const validRow of validRows) {
      await attributeRepository.create(organizationId, validRow, userId);
      successCount++;
    }
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  });
}
