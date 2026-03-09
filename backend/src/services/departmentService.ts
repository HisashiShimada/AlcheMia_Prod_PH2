/**
 * 部署管理サービス
 * ビジネスロジック層
 */

import Papa from 'papaparse';
import * as departmentRepository from '../repositories/departmentRepository';
import { DepartmentSearchFilters } from '../repositories/departmentRepository';
import { getPgp } from '../database/db';
import { getStorageService } from './storageService';
import { getMessage } from '../utils/messages';

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
  },
  userId: string,
  lang: string = 'ja'
): Promise<DepartmentResponse> {
  // ID重複チェック
  const exists = await departmentRepository.existsById(organizationId, data.departmentCd);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'department.duplicateCd'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_DEPARTMENT_CD';
    throw error;
  }
  
  const department = await departmentRepository.create(organizationId, data, userId);
  
  // Swift/S3フォルダ自動生成
  try {
    const storageService = getStorageService();
    await storageService.createFolders(organizationId, [
      `formats/${data.departmentCd}/condition/`,
      `formats/${data.departmentCd}/material/`,
      `formats/${data.departmentCd}/result/`,
    ]);
    console.log(`✅ Department folders created: formats/${data.departmentCd}/ (condition, material, result)`);
  } catch (storageError) {
    // フォルダ作成失敗してもエラーとせず、ログ記録のみ
    // 理由: 部署データは既にDBに登録済みで、フォルダは後から手動で作成可能
    console.error(`⚠️ Failed to create department folders for ${data.departmentCd}:`, storageError);
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
 * Departmentを更新
 */
export async function updateDepartment(
  organizationId: string,
  departmentCd: string,
  data: {
    departmentName?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<DepartmentResponse | null> {
  const department = await departmentRepository.update(organizationId, departmentCd, data, userId);
  
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
  isActive: boolean,
  userId: string
): Promise<DepartmentResponse | null> {
  const department = await departmentRepository.updateStatus(organizationId, departmentCd, isActive, userId);
  
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
 * DepartmentCSVアップロード処理
 * 
 * 事前バリデーション方式：
 * 1. 全行をバリデーション（最初のエラーで停止）
 * 2. エラーがなければ全件をDB登録
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadDepartmentsCsv(
  organizationId: string,
  csvContent: string,
  userId: string,
  lang: string = 'ja'
): Promise<CsvUploadResult> {
  // CSVをパース
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Phase 1: 事前バリデーション（DBアクセスあり - 既存チェック含む）
  const validationErrors: CsvValidationError[] = [];
  const departmentCdSet = new Set<string>(); // CSV内重複チェック用
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const departmentCd = row['department_cd']?.trim();
    const departmentName = row['department_name']?.trim();
    
    if (!departmentCd) {
      validationErrors.push({
        row: rowNumber,
        field: 'department_cd',
        message: getMessage(lang, 'department.csv.cdRequired', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    if (!departmentName) {
      validationErrors.push({
        row: rowNumber,
        field: 'department_name',
        message: getMessage(lang, 'department.csv.nameRequired', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // 型チェック（is_active）
    const isActiveStr = row['is_active']?.trim();
    if (isActiveStr && 
        !['true', 'TRUE', '1', 'false', 'FALSE', '0', ''].includes(isActiveStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'is_active',
        message: getMessage(lang, 'department.csv.isActiveInvalid', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // CSV内重複チェック
    if (departmentCdSet.has(departmentCd)) {
      validationErrors.push({
        row: rowNumber,
        field: 'department_cd',
        message: getMessage(lang, 'department.csv.cdDuplicateInCsv', { row: String(rowNumber), cd: departmentCd }),
      });
      break; // 最初のエラーで停止
    }
    departmentCdSet.add(departmentCd);
    
    // 既存データチェック（主キー重複チェック）
    const exists = await departmentRepository.existsById(organizationId, departmentCd);
    if (exists) {
      validationErrors.push({
        row: rowNumber,
        field: 'department_cd',
        message: getMessage(lang, 'department.csv.cdAlreadyExists', { row: String(rowNumber), cd: departmentCd }),
      });
      break; // 最初のエラーで停止
    }
  }
  
  // エラーがあれば即座に終了（DB登録は行わない）
  if (validationErrors.length > 0) {
    // 例外を投げず、エラー情報を含むレスポンスを返す
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors: validationErrors,
    };
  }
  
  // Phase 2: DB登録（バリデーション通過後のみ）
  const pgp = getPgp();
  
  const createdDepartments: string[] = []; // 作成した部署CDを保存
  
  await pgp.tx(async (_t) => {
    // 全行を新規作成（バリデーションで既存チェック済み）
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      
      // バリデーション済みなのでtrim()のみ実施
      const departmentCd = row['department_cd'].trim();
      const departmentName = row['department_name'].trim();
      
      // 状態の変換（boolean型対応）
      const isActiveStr = row['is_active']?.trim();
      const isActive = isActiveStr === 'true' || isActiveStr === 'TRUE' || isActiveStr === '1';
      
      // 新規作成のみ（既存データは事前バリデーションでエラー）
      await departmentRepository.create(organizationId, {
        departmentCd,
        departmentName,
        isActive,
      }, userId);
      
      createdDepartments.push(departmentCd); // 作成した部署CDを記録
    }
  });
  
  // Swift/S3フォルダ一括生成（同期的）
  try {
    const storageService = getStorageService();
    for (const departmentCd of createdDepartments) {
      await storageService.createFolders(organizationId, [
        `formats/${departmentCd}/condition/`,
        `formats/${departmentCd}/material/`,
        `formats/${departmentCd}/result/`,
      ]);
    }
    console.log(`✅ CSV upload: Created folders for ${createdDepartments.length} departments`);
  } catch (storageError) {
    // フォルダ作成失敗してもエラーとせず、ログ記録のみ
    // 理由: 部署データは既にDBに登録済みで、フォルダは後から手動で作成可能
    console.error('⚠️ CSV upload: Failed to create some department folders:', storageError);
  }
  
  return {
    successCount: createdDepartments.length,
    failureCount: 0,
    errors: [],
  };
}

