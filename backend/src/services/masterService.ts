/**
 * マスタ管理サービス
 * ビジネスロジック層
 */

import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as creatorRepository from '../repositories/creatorRepository';
import { CreatorSearchFilters } from '../repositories/creatorRepository';
import * as instrumentRepository from '../repositories/instrumentRepository';
import * as vendorRepository from '../repositories/vendorRepository';
import * as corporationRepository from '../repositories/corporationRepository';
import { CorporationSearchFilters } from '../repositories/corporationRepository';
import * as departmentRepository from '../repositories/departmentRepository';
import { DepartmentSearchFilters } from '../repositories/departmentRepository';
import * as roleRepository from '../repositories/roleRepository';
import { Role } from '../repositories/roleRepository';
import { getPool } from '../database/db';

/**
 * Creatorマスタレスポンス型定義
 */
export interface CreatorMasterResponse {
  creatorId: string;
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
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * Corporationレスポンス型定義
 */
export interface CorporationResponse {
  corporationId: string; // UUID
  corporationName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Departmentレスポンス型定義
 */
export interface DepartmentResponse {
  departmentId: string; // フロントエンド側の期待値: departmentId
  organizationId: string;
  displayName: string; // フロントエンド側の期待値: displayName
  isActive: boolean;
  createdAt: string;
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
    vendorName?: string;
    instrumentName?: string;
    isActive?: boolean;
  }
): Promise<CreatorMasterResponse> {
  // ID重複チェック
  const exists = await creatorRepository.existsById(organizationId, data.creatorId);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_CREATOR_ID';
    throw error;
  }
  
  const creator = await creatorRepository.create(organizationId, data);
  
  // 作成後に再取得してvendor/instrumentのis_active情報も含める
  const createdCreator = await creatorRepository.findById(organizationId, creator.creator_id);
  
  if (!createdCreator) {
    throw new Error('作成したCreatorマスタが見つかりません');
  }
  
  return {
    creatorId: createdCreator.creator_id,
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
 * @param filters フィルタ条件
 * @returns Instrumentマスタの配列
 */
export async function getInstrumentMastersWithFilters(
  organizationId: string,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<InstrumentMasterResponse[]> {
  console.log('=== masterService.getInstrumentMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  // Repository層のWHERE句フィルタリングを使用（効率的）
  const instruments = await instrumentRepository.findAllWithFilters(organizationId, filters);
  
  console.log('Filtered count (from DB):', instruments.length);
  
  // レスポンス形式に変換
  return instruments.map(instrument => ({
    instrumentId: instrument.instrument_id,
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
 * @param filters フィルタ条件
 * @returns Vendorマスタの配列
 */
export async function getVendorMastersWithFilters(
  organizationId: string,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<VendorMasterResponse[]> {
  console.log('=== masterService.getVendorMastersWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  // Repository層のWHERE句フィルタリングを使用（効率的）
  const vendors = await vendorRepository.findAllWithFilters(organizationId, filters);
  
  console.log('Filtered count (from DB):', vendors.length);
  
  // レスポンス形式に変換
  return vendors.map(vendor => ({
    vendorId: vendor.vendor_id,
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
  }
): Promise<InstrumentMasterResponse> {
  // ID重複チェック
  const exists = await instrumentRepository.existsById(organizationId, data.instrumentId);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_INSTRUMENT_ID';
    throw error;
  }
  
  const instrument = await instrumentRepository.create(organizationId, data);
  
  return {
    instrumentId: instrument.instrument_id,
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
  }
): Promise<InstrumentMasterResponse | null> {
  const instrument = await instrumentRepository.update(organizationId, instrumentId, data);
  
  if (!instrument) {
    return null;
  }
  
  return {
    instrumentId: instrument.instrument_id,
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
  isActive: boolean
): Promise<InstrumentMasterResponse | null> {
  const instrument = await instrumentRepository.updateStatus(organizationId, instrumentId, isActive);
  
  if (!instrument) {
    return null;
  }
  
  return {
    instrumentId: instrument.instrument_id,
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
  }
): Promise<VendorMasterResponse> {
  // ID重複チェック
  const exists = await vendorRepository.existsById(organizationId, data.vendorId);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_VENDOR_ID';
    throw error;
  }
  
  const vendor = await vendorRepository.create(organizationId, data);
  
  return {
    vendorId: vendor.vendor_id,
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
  }
): Promise<VendorMasterResponse | null> {
  const vendor = await vendorRepository.update(organizationId, vendorId, data);
  
  if (!vendor) {
    return null;
  }
  
  return {
    vendorId: vendor.vendor_id,
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
  isActive: boolean
): Promise<VendorMasterResponse | null> {
  const vendor = await vendorRepository.updateStatus(organizationId, vendorId, isActive);
  
  if (!vendor) {
    return null;
  }
  
  return {
    vendorId: vendor.vendor_id,
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
  updateData: any
): Promise<any> {
  const updatedCreator = await creatorRepository.update(
    organizationId,
    creatorId,
    updateData
  );
  
  if (!updatedCreator) {
    throw new Error('入力されたIDは既に存在しています');
  }
  
  return updatedCreator;
}

/**
 * Creatorマスタのアクティブ状態を更新
 */
export async function updateCreatorStatus(
  organizationId: string,
  creatorId: string,
  isActive: boolean
): Promise<CreatorMasterResponse | null> {
  const creator = await creatorRepository.updateStatus(
    organizationId,
    creatorId,
    isActive
  );
  
  if (!creator) {
    return null;
  }
  
  return {
    creatorId: creator.creator_id,
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
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadCreatorsCsv(
  organizationId: string,
  csvContent: string
): Promise<CsvUploadResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CSVをパース
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const errors: CsvValidationError[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 各行を処理
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目チェック
        const creatorId = row['CreatorID']?.trim();
        const creatorName = row['Creator名称']?.trim();
        
        if (!creatorId) {
          errors.push({ row: rowNumber, field: 'CreatorID', message: 'CreatorIDは必須です' });
          failureCount++;
          continue;
        }
        
        if (!creatorName) {
          errors.push({ row: rowNumber, field: 'Creator名称', message: 'Creator名称は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // ID重複チェック
        const exists = await creatorRepository.existsById(organizationId, creatorId);
        
        if (exists) {
          // 既存レコードを更新
          await creatorRepository.update(organizationId, creatorId, {
            creatorName,
            creatorDescription: row['Creator説明']?.trim() || '',
            creatorAnnotation: row['Creatorアノテーション']?.trim() || '',
            vendorName: row['Vendor名称']?.trim() || '',
            instrumentName: row['Instrument名称']?.trim() || '',
            isActive,
          });
        } else {
          // 新規作成
          await creatorRepository.create(organizationId, {
            creatorId,
            creatorName,
            creatorDescription: row['Creator説明']?.trim() || '',
            creatorAnnotation: row['Creatorアノテーション']?.trim() || '',
            vendorName: row['Vendor名称']?.trim() || '',
            instrumentName: row['Instrument名称']?.trim() || '',
            isActive,
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: error instanceof Error ? error.message : 'エラーが発生しました',
        });
        failureCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      successCount,
      failureCount,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Roleレスポンス型定義
 */
export interface RoleResponse {
  roleId: string;
  roleName: string;
  isActive: boolean;
  functionName: string;
  functionWritePermissions: string;
  updatedAt: string | null;
}

/**
 * ロール一覧を取得
 * 
 * @param organizationId 組織ID
 * @returns ロールの配列
 */
export async function getRoles(
  organizationId: string
): Promise<RoleResponse[]> {
  console.log('=== masterService.getRoles called ===');
  console.log('organizationId:', organizationId);
  
  const roles = await roleRepository.getRoles(organizationId);
  console.log('Repository returned:', roles.length, 'records');
  
  // Role型はすでに整形済みなのでそのまま返す
  return roles;
}

/**
 * ロールIDで1件取得
 * 
 * @param organizationId 組織ID
 * @param roleId ロールID
 * @returns ロール（見つからない場合はnull）
 */
export async function getRoleById(
  organizationId: string,
  roleId: string
): Promise<RoleResponse | null> {
  const role = await roleRepository.getRoleById(organizationId, roleId);
  
  if (!role) {
    return null;
  }
  
  return role;
}

/**
 * Departmentを取得
 * 
 * @param organizationId 組織ID
 * @param filters 検索フィルター
 * @returns Departmentの配列
 */
export async function getDepartments(
  organizationId: string,
  filters: DepartmentSearchFilters = {}
): Promise<DepartmentResponse[]> {
  console.log('=== masterService.getDepartments called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  const departments = await departmentRepository.findAll(organizationId, filters);
  console.log('Repository returned:', departments.length, 'records');
  
  return departments.map(dept => ({
    departmentId: dept.department_cd,  // department_cd → departmentId
    organizationId: dept.organization_id,
    displayName: dept.department_name,  // department_name → displayName
    isActive: dept.is_active,
    createdAt: formatDateTime(dept.create_at),
    updatedAt: formatDateTime(dept.update_at),
  }));
}

/**
 * Department CDで1件取得
 * 
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @returns Department（見つからない場合はnull）
 */
export async function getDepartmentById(
  organizationId: string,
  departmentCd: string
): Promise<DepartmentResponse | null> {
  const department = await departmentRepository.findById(organizationId, departmentCd);
  
  if (!department) {
    return null;
  }
  
  return {
    departmentId: department.department_cd,  // department_cd → departmentId
    organizationId: department.organization_id,
    displayName: department.department_name,  // department_name → displayName
    isActive: department.is_active,
    createdAt: formatDateTime(department.create_at),
    updatedAt: formatDateTime(department.update_at),
  };
}

/**
 * Departmentを新規作成
 */
export async function createDepartment(
  organizationId: string,
  data: {
    departmentCd: string;
    departmentName: string;
    isActive?: boolean;
  }
): Promise<DepartmentResponse> {
  // ID重複チェック
  const exists = await departmentRepository.existsById(organizationId, data.departmentCd);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_DEPARTMENT_CD';
    throw error;
  }
  
  const department = await departmentRepository.create(organizationId, data);
  
  return {
    departmentId: department.department_cd,  // department_cd → departmentId
    organizationId: department.organization_id,
    displayName: department.department_name,  // department_name → displayName
    isActive: department.is_active,
    createdAt: formatDateTime(department.create_at),
    updatedAt: formatDateTime(department.update_at),
  };
}

/**
 * Departmentを更新
 */
export async function updateDepartment(
  organizationId: string,
  departmentCd: string,
  data: {
    departmentName?: string;
    isActive?: boolean;
  }
): Promise<DepartmentResponse | null> {
  const department = await departmentRepository.update(organizationId, departmentCd, data);
  
  if (!department) {
    return null;
  }
  
  return {
    departmentId: department.department_cd,  // department_cd → departmentId
    organizationId: department.organization_id,
    displayName: department.department_name,  // department_name → displayName
    isActive: department.is_active,
    createdAt: formatDateTime(department.create_at),
    updatedAt: formatDateTime(department.update_at),
  };
}

/**
 * Departmentのアクティブ状態を更新
 */
export async function updateDepartmentStatus(
  organizationId: string,
  departmentCd: string,
  isActive: boolean
): Promise<DepartmentResponse | null> {
  const department = await departmentRepository.updateStatus(organizationId, departmentCd, isActive);
  
  if (!department) {
    return null;
  }
  
  return {
    departmentId: department.department_cd,  // department_cd → departmentId
    organizationId: department.organization_id,
    displayName: department.department_name,  // department_name → displayName
    isActive: department.is_active,
    createdAt: formatDateTime(department.create_at),
    updatedAt: formatDateTime(department.update_at),
  };
}

/**
 * DepartmentCSVアップロード処理
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadDepartmentsCsv(
  organizationId: string,
  csvContent: string
): Promise<CsvUploadResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CSVをパース
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const errors: CsvValidationError[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 各行を処理
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目チェック
        const departmentCd = row['部署CD']?.trim();
        const departmentName = row['部署名']?.trim();
        
        if (!departmentCd) {
          errors.push({ row: rowNumber, field: '部署CD', message: '部署CDは必須です' });
          failureCount++;
          continue;
        }
        
        if (!departmentName) {
          errors.push({ row: rowNumber, field: '部署名', message: '部署名は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // ID重複チェック
        const exists = await departmentRepository.existsById(organizationId, departmentCd);
        
        if (exists) {
          // 既存レコードを更新
          await departmentRepository.update(organizationId, departmentCd, {
            departmentName,
            isActive,
          });
        } else {
          // 新規作成
          await departmentRepository.create(organizationId, {
            departmentCd,
            departmentName,
            isActive,
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: error instanceof Error ? error.message : 'エラーが発生しました',
        });
        failureCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      successCount,
      failureCount,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Corporationを取得
 * 
 * @param filters 検索フィルター
 * @returns Corporationの配列
 */
export async function getCorporation(
  filters: CorporationSearchFilters = {}
): Promise<CorporationResponse[]> {
  console.log('=== masterService.getCorporation called ===');
  console.log('filters:', filters);
  
  const corporations = await corporationRepository.findAll(filters);
  console.log('Repository returned:', corporations.length, 'records');
  
  return corporations.map(corp => ({
    corporationId: corp.corporation_id,
    corporationName: corp.corporation_name,
    isActive: corp.is_active,
    createdAt: formatDateTime(corp.create_at),
    updatedAt: formatDateTime(corp.update_at),
  }));
}

/**
 * Corporation IDで1件取得
 * 
 * @param corporationId Corporation ID (UUID)
 * @returns Corporation（見つからない場合はnull）
 */
export async function getCorporationById(
  corporationId: string
): Promise<CorporationResponse | null> {
  const corporation = await corporationRepository.findById(corporationId);
  
  if (!corporation) {
    return null;
  }
  
  return {
    corporationId: corporation.corporation_id,
    corporationName: corporation.corporation_name,
    isActive: corporation.is_active,
    createdAt: formatDateTime(corporation.create_at),
    updatedAt: formatDateTime(corporation.update_at),
  };
}

/**
 * Corporationを新規作成
 * UUIDはバックエンドで自動生成
 */
export async function createCorporation(
  data: {
    corporationName: string;
    isActive?: boolean;
  }
): Promise<CorporationResponse> {
  // UUIDを自動生成
  const corporationId = uuidv4();
  
  const corporation = await corporationRepository.create({
    corporationId,
    corporationName: data.corporationName,
    isActive: data.isActive,
  });
  
  return {
    corporationId: corporation.corporation_id,
    corporationName: corporation.corporation_name,
    isActive: corporation.is_active,
    createdAt: formatDateTime(corporation.create_at),
    updatedAt: formatDateTime(corporation.update_at),
  };
}

/**
 * Corporationを更新
 */
export async function updateCorporation(
  corporationId: string,
  data: {
    corporationName?: string;
    isActive?: boolean;
  }
): Promise<CorporationResponse | null> {
  const corporation = await corporationRepository.update(corporationId, data);
  
  if (!corporation) {
    return null;
  }
  
  return {
    corporationId: corporation.corporation_id,
    corporationName: corporation.corporation_name,
    isActive: corporation.is_active,
    createdAt: formatDateTime(corporation.create_at),
    updatedAt: formatDateTime(corporation.update_at),
  };
}

/**
 * Corporationのアクティブ状態を更新
 */
export async function updateCorporationStatus(
  corporationId: string,
  isActive: boolean
): Promise<CorporationResponse | null> {
  const corporation = await corporationRepository.updateStatus(corporationId, isActive);
  
  if (!corporation) {
    return null;
  }
  
  return {
    corporationId: corporation.corporation_id,
    corporationName: corporation.corporation_name,
    isActive: corporation.is_active,
    createdAt: formatDateTime(corporation.create_at),
    updatedAt: formatDateTime(corporation.update_at),
  };
}

/**
 * InstrumentマスタCSVアップロード処理
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadInstrumentsCsv(
  organizationId: string,
  csvContent: string
): Promise<CsvUploadResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CSVをパース
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const errors: CsvValidationError[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 各行を処理
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目チェック
        const instrumentId = row['実験装置ID']?.trim();
        const instrumentName = row['実験装置名称']?.trim();
        
        if (!instrumentId) {
          errors.push({ row: rowNumber, field: '実験装置ID', message: '実験装置IDは必須です' });
          failureCount++;
          continue;
        }
        
        if (!instrumentName) {
          errors.push({ row: rowNumber, field: '実験装置名称', message: '実験装置名称は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // ID重複チェック
        const exists = await instrumentRepository.existsById(organizationId, instrumentId);
        
        if (exists) {
          // 既存レコードを更新
          await instrumentRepository.update(organizationId, instrumentId, {
            instrumentName,
            instrumentDescription: row['説明']?.trim() || '',
            instrumentAnnotation: row['アノテーション']?.trim() || '',
            isActive,
          });
        } else {
          // 新規作成
          await instrumentRepository.create(organizationId, {
            instrumentId,
            instrumentName,
            instrumentDescription: row['説明']?.trim() || '',
            instrumentAnnotation: row['アノテーション']?.trim() || '',
            isActive,
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: error instanceof Error ? error.message : 'エラーが発生しました',
        });
        failureCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      successCount,
      failureCount,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * CorporationCSVアップロード処理
 * 
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadCorporationsCsv(
  csvContent: string
): Promise<CsvUploadResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CSVをパース
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const errors: CsvValidationError[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 各行を処理
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目チェック
        const corporationName = row['会社名']?.trim();
        
        if (!corporationName) {
          errors.push({ row: rowNumber, field: '会社名', message: '会社名は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // 会社IDがある場合は更新、ない場合は新規作成
        const corporationId = row['会社ID']?.trim();
        
        if (corporationId) {
          // UUIDが指定されている場合は既存レコード更新を試みる
          const existing = await corporationRepository.findById(corporationId);
          
          if (existing) {
            // 既存レコードを更新
            await corporationRepository.update(corporationId, {
              corporationName,
              isActive,
            });
          } else {
            // 指定されたUUIDで新規作成
            await corporationRepository.create({
              corporationId,
              corporationName,
              isActive,
            });
          }
        } else {
          // UUIDを自動生成して新規作成
          await corporationRepository.create({
            corporationId: uuidv4(),
            corporationName,
            isActive,
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: error instanceof Error ? error.message : 'エラーが発生しました',
        });
        failureCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      successCount,
      failureCount,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * VendorマスタCSVアップロード処理
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @returns アップロード結果
 */
export async function uploadVendorsCsv(
  organizationId: string,
  csvContent: string
): Promise<CsvUploadResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CSVをパース
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const errors: CsvValidationError[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 各行を処理
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目チェック
        const vendorId = row['実験装置VendorID']?.trim();
        const vendorName = row['実験装置Vendor名称']?.trim();
        
        if (!vendorId) {
          errors.push({ row: rowNumber, field: '実験装置VendorID', message: '実験装置VendorIDは必須です' });
          failureCount++;
          continue;
        }
        
        if (!vendorName) {
          errors.push({ row: rowNumber, field: '実験装置Vendor名称', message: '実験装置Vendor名称は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // ID重複チェック
        const exists = await vendorRepository.existsById(organizationId, vendorId);
        
        if (exists) {
          // 既存レコードを更新
          await vendorRepository.update(organizationId, vendorId, {
            vendorName,
            vendorDescription: row['説明']?.trim() || '',
            vendorAnnotation: row['アノテーション']?.trim() || '',
            isActive,
          });
        } else {
          // 新規作成
          await vendorRepository.create(organizationId, {
            vendorId,
            vendorName,
            vendorDescription: row['説明']?.trim() || '',
            vendorAnnotation: row['アノテーション']?.trim() || '',
            isActive,
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: error instanceof Error ? error.message : 'エラーが発生しました',
        });
        failureCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      successCount,
      failureCount,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
