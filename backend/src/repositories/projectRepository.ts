/**
 * Project（プロジェクト）リポジトリ
 * データベースアクセス層
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * プロジェクトの基本データ型定義
 */
export interface ProjectRow {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_status: number;
}

/**
 * ユーザー名データ型定義
 */
export interface UserNameRow {
  user_name: string;
}

/**
 * プロジェクトIDからプロジェクト詳細を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findByIdWithOrganization(
  organizationId: string,
  projectId: string
): Promise<ProjectRow | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findByIdWithOrganization called ===');
  console.log('organizationId:', organizationId);
  console.log('projectId:', projectId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/findByIdWithOrg.sql');
  
  console.log('Executing SQL query from file: projects/findByIdWithOrg.sql');
  console.log('With params:', [organizationId, projectId]);
  
  try {
    const result = await pgp.oneOrNone<ProjectRow>(sqlQuery, [organizationId, projectId]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * プロジェクト名からプロジェクトIDを取得
 * 
 * @param organizationId 組織ID
 * @param projectName プロジェクト名
 * @returns プロジェクト情報（見つからない場合はnull）
 */
export async function findProjectIdByName(
  organizationId: string,
  projectName: string
): Promise<ProjectRow | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findProjectIdByName called ===');
  console.log('organizationId:', organizationId);
  console.log('projectName:', projectName);
  
  // 外部SQLファイルを読み込み（既存のfindByName.sqlを活用）
  const sqlQuery = await loadSqlFile('projects/findByName.sql');
  
  console.log('Executing SQL query from file: projects/findByName.sql');
  console.log('With params:', [projectName, organizationId]);
  
  try {
    // findByName.sqlはprojectName, organizationIdの順なので注意
    const result = await pgp.oneOrNone<ProjectRow>(sqlQuery, [projectName, organizationId]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * プロジェクトステータスを承認待ちに更新
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param projectStatus 新しいステータス（2: waiting_approval）
 * @param updateAt 更新日時
 * @param updateUserId 更新ユーザーID
 * @returns 更新された行数
 */
export async function updateApprovalStatus(
  organizationId: string,
  projectId: string,
  projectStatus: number,
  updateAt: string,
  updateUserId: string
): Promise<number> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.updateApprovalStatus called ===');
  console.log('organizationId:', organizationId);
  console.log('projectId:', projectId);
  console.log('projectStatus:', projectStatus);
  console.log('updateUserId:', updateUserId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/updateApprovalStatus.sql');
  
  console.log('Executing SQL query from file: projects/updateApprovalStatus.sql');
  console.log('With params:', [projectStatus, updateAt, updateUserId, organizationId, projectId]);
  
  try {
    const result = await pgp.result(sqlQuery, [
      projectStatus,
      updateAt,
      updateUserId,
      organizationId,
      projectId
    ]);
    console.log('Query executed successfully, rows affected:', result.rowCount);
    return result.rowCount;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * ユーザーIDからユーザー名を取得
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns ユーザー名（見つからない場合はnull）
 */
export async function findUserNameById(
  organizationId: string,
  userId: string
): Promise<string | null> {
  const pgp = getPgp();
  
  console.log('=== projectRepository.findUserNameById called ===');
  console.log('organizationId:', organizationId);
  console.log('userId:', userId);
  
  // 外部SQLファイルを読み込み
  const sqlQuery = await loadSqlFile('projects/findUserName.sql');
  
  console.log('Executing SQL query from file: projects/findUserName.sql');
  console.log('With params:', [organizationId, userId]);
  
  try {
    const result = await pgp.oneOrNone<UserNameRow>(sqlQuery, [organizationId, userId]);
    console.log('Query executed successfully, result:', result ? 'found' : 'not found');
    return result ? result.user_name : null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
