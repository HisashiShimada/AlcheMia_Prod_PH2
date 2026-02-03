/**
 * ロール管理サービス
 * ビジネスロジック層
 */

import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as roleRepository from '../repositories/roleRepository';
import { getPool } from '../database/db';

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
 * ロールCDで1件取得
 * 
 * @param organizationId 組織ID
 * @param roleId ロールCD
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
 * ロール新規追加
 * 
 * @param organizationId 組織ID
 * @param roleData ロールデータ
 * @param userId ログインユーザーID
 */
export async function createRole(
  organizationId: string,
  roleData: {
    roleId: string;
    roleName: string;
    initialScreenFunctionName: string | null;
    isActive: boolean;
  },
  userId: string
): Promise<void> {
  await roleRepository.createRole(organizationId, roleData, userId);
}

/**
 * ロール更新
 * 
 * @param organizationId 組織ID
 * @param roleId ロールCD
 * @param roleData 更新データ
 * @param userId ログインユーザーID
 */
export async function updateRole(
  organizationId: string,
  roleId: string,
  roleData: {
    roleName?: string;
    initialScreenFunctionName?: string | null;
    isActive?: boolean;
  },
  userId: string
): Promise<void> {
  await roleRepository.updateRole(organizationId, roleId, roleData, userId);
}

/**
 * ロールの権限を更新
 * 
 * @param organizationId 組織ID
 * @param roleId ロールCD
 * @param functionName 機能名（スラッシュ区切り）
 * @param functionWritePermissions 書込可の機能名（スラッシュ区切り）
 * @param userId ログインユーザーID
 */
export async function updateRolePermissions(
  organizationId: string,
  roleId: string,
  functionName: string,
  functionWritePermissions: string,
  userId: string
): Promise<void> {
  console.log('=== roleService.updateRolePermissions called ===');
  console.log('organizationId:', organizationId);
  console.log('roleId:', roleId);
  console.log('functionName:', functionName);
  console.log('functionWritePermissions:', functionWritePermissions);
  console.log('userId:', userId);

  // 機能名をパース
  const functionNames = functionName
    .split('/')
    .map(name => name.trim())
    .filter(Boolean);

  const writePermissionNames = functionWritePermissions
    .split('/')
    .map(name => name.trim())
    .filter(Boolean);

  // 権限配列を構築
  const permissions = functionNames.map(name => ({
    functionName: name,
    writable: writePermissionNames.includes(name),
  }));

  console.log('Parsed permissions:', permissions);

  // リポジトリ層で更新
  await roleRepository.updateRolePermissions(organizationId, roleId, permissions, userId);
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
