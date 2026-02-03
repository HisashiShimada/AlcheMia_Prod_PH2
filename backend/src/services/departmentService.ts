/**
 * 部署管理サービス
 * ビジネスロジック層
 */

import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as departmentRepository from '../repositories/departmentRepository';
import { DepartmentSearchFilters } from '../repositories/departmentRepository';
import { getPool } from '../database/db';

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
  userId: string
): Promise<DepartmentResponse> {
  // ID重複チェック
  const exists = await departmentRepository.existsById(organizationId, data.departmentCd);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_DEPARTMENT_CD';
    throw error;
  }
  
  const department = await departmentRepository.create(organizationId, data, userId);
  
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
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadDepartmentsCsv(
  organizationId: string,
  csvContent: string,
  userId: string
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
          }, userId);
        } else {
          // 新規作成
          await departmentRepository.create(organizationId, {
            departmentCd,
            departmentName,
            isActive,
          }, userId);
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

