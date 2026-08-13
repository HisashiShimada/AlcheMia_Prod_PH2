/**
 * User（ユーザー）リポジトリ
 * データベースアクセス層
 * 
 * ※注意: 既存のorganizationUserRepository.tsとは別のファイル
 * こちらはユーザー管理画面専用のリポジトリ
 */

import { ITask } from 'pg-promise';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import bcrypt from 'bcrypt';
import { User, UserSearchFilters } from '../types/database';

/**
 * ランダムパスワードを生成（12文字、英大文字・英小文字・数字・記号を含む）
 */
function generateRandomPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  let password =
    upper.charAt(Math.floor(Math.random() * upper.length)) +
    lower.charAt(Math.floor(Math.random() * lower.length)) +
    digits.charAt(Math.floor(Math.random() * digits.length)) +
    symbols.charAt(Math.floor(Math.random() * symbols.length));
  for (let i = 0; i < 8; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Userのデータ型定義（互換性のためのエイリアス）
 * @deprecated User型を直接使用してください
 */
export type UserRow = User;

/**
 * User一覧を取得
 * 
 * @param organizationId 組織ID
 * @param filters 検索フィルター
 * @returns Userの配列
 */
export async function findAll(
  organizationId: string,
  filters: UserSearchFilters = {}
): Promise<UserRow[]> {
  const pgp = getPgp();

  // ベースクエリを外部ファイルから読み込み
  let sqlQuery = await loadSqlFile('users/findAll.sql');

  const params: any[] = [organizationId];
  let paramIndex = 2;

  // 検索フィルター
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (ou.user_name ILIKE $${paramIndex} OR ou.mail_address ILIKE $${paramIndex})
ORDER BY`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // アクティブ状態フィルター
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND ou.is_active = $${paramIndex}
ORDER BY`
    );
    params.push(filters.isActive);
    paramIndex++;
  }

  // ロールフィルター
  if (filters.roleCd) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND ou.role_cd = $${paramIndex}
ORDER BY`
    );
    params.push(filters.roleCd);
    paramIndex++;
  }

  // ソート順
  const sortBy = filters.sortBy === 'user_name' ? 'ou.user_name' :
                 filters.sortBy === 'update_at' ? 'ou.update_at' :
                 'ou.user_id';
  const sortOrder = (filters.sortOrder || 'asc').toUpperCase();
  sqlQuery = sqlQuery.replace(
    'ORDER BY ou.user_id ASC',
    `ORDER BY ${sortBy} ${sortOrder}`
  );

  return await pgp.any<UserRow>(sqlQuery, params);
}

/**
 * ユーザーIDで1件取得
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns User（見つからない場合はnull）
 */
export async function findById(
  organizationId: string,
  userId: string
): Promise<UserRow | null> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const query = await loadSqlFile('users/findById.sql');
  
  return await pgp.oneOrNone<UserRow>(query, [organizationId, userId]);
}

/**
 * ユーザーIDが既に存在するかチェック
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const query = await loadSqlFile('users/existsById.sql');
  
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, userId]);
  return result.exists;
}

/**
 * Userを新規作成（トランザクション内で実行）
 *
 * 外部トランザクション（t）が渡された場合はそのトランザクション内で実行する。
 * 渡されない場合は内部でトランザクションを生成する（下位互換）。
 * 
 * @param organizationId 組織ID
 * @param data User情報
 * @param password 初期パスワード（平文）
 * @param createUserId 作成者ユーザーID
 * @param t 外部トランザクションオブジェクト（省略可）
 * @returns 作成されたUser
 */
export async function create(
  organizationId: string,
  data: {
    userId: string;
    userName: string;
    mailAddress: string;
    roleCd: string;
    isActive?: boolean;
  },
  passwordOrUserId: string,
  createUserIdOrUndefined?: string,
  externalTx?: ITask<unknown>
): Promise<UserRow> {
  // 引数の解釈: password が省略された場合（旧インターフェース互換）
  const password = createUserIdOrUndefined !== undefined ? passwordOrUserId : generateRandomPassword();
  const createUserId = createUserIdOrUndefined !== undefined ? createUserIdOrUndefined : passwordOrUserId;
  const pgp = getPgp();

  /**
   * トランザクション内での実際の挿入処理
   */
  const executeInTx = async (t: ITask<unknown>): Promise<UserRow> => {
    try {
      // 1. organization_userテーブルにINSERT
      const userQuery = await loadSqlFile('users/createUser.sql');

      const userValues = [
        data.userId,
        organizationId,
        data.userName,
        data.mailAddress,
        data.roleCd,
        data.isActive !== undefined ? data.isActive : true,
        createUserId,
        createUserId,
      ];
      
      console.log('=== organization_user INSERT ===');
      console.log('Query:', userQuery);
      console.log('Values:', userValues);
      
      // RETURNING句があるのでt.one()を使用
      await t.one(userQuery, userValues);
      
      // 2. user_authenticationテーブルにINSERT（パスワードハッシュ化）
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // パスワード有効期限：保存/CSVアップロード時のタイムスタンプ（現在日時）
      const passwordExpiresAt = new Date();
      
      const authQuery = await loadSqlFile('users/createUserAuth.sql');
      
      const authValues = [
        data.userId,
        organizationId,
        passwordHash,
        true,             // is_temporary_flg（仮パスワード）
        passwordExpiresAt,
        createUserId,
        createUserId,
      ];
      
      console.log('=== user_authentication INSERT ===');
      console.log('Query:', authQuery);
      console.log('Values (パスワードハッシュは除外):', [
        authValues[0],
        authValues[1],
        '***',
        authValues[3],
        authValues[4],
        authValues[5],
        authValues[6],
      ]);
      
      await t.none(authQuery, authValues);
      
      // 作成したユーザーを取得して返す（トランザクション内で実行）
      const selectQuery = await loadSqlFile('users/findById.sql') as string;
      const result = await t.oneOrNone(selectQuery, [organizationId, data.userId]) as UserRow | null;
      
      if (!result) {
        throw new Error('Failed to retrieve created user');
      }
      
      return result;
    } catch (error) {
      console.error('=== DB挿入エラー（詳細） ===');
      console.error('エラー:', error);
      console.error('エラーコード:', (error as any).code);
      console.error('エラーメッセージ:', (error as any).message);
      console.error('エラー詳細:', (error as any).detail);
      console.error('エラーテーブル:', (error as any).table);
      console.error('エラーカラム:', (error as any).column);
      console.error('エラー制約:', (error as any).constraint);
      
      // PostgreSQLエラーコードに応じた処理
      if ((error as any).code === '23505') {  // unique_violation
        throw new Error('ユーザーIDが既に存在します');
      } else if ((error as any).code === '23503') {  // foreign_key_violation
        const constraint = (error as any).constraint || '';
        if (constraint.includes('role')) {
          throw new Error(`指定されたロールCD「${data.roleCd}」が存在しません`);
        }
        throw new Error('参照先のデータが存在しません');
      } else if ((error as any).code === '22001') {  // string_data_right_truncation
        throw new Error('入力データが最大長を超えています');
      }
      
      throw error;  // その他のエラーはそのまま
    }
  };

  // 外部トランザクションが渡された場合はそのまま使用（サブトランザクションを作成）
  // 渡されなかった場合は新しいトランザクションを開始
  if (externalTx) {
    return externalTx.tx(executeInTx);
  }
  return pgp.tx(executeInTx);
}

/**
 * Userを更新
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @param data 更新情報
 * @param updateUserId 更新者ユーザーID
 * @returns 更新されたUser（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  userId: string,
  data: {
    userName?: string;
    roleCd?: string;
    isActive?: boolean;
  },
  updateUserId: string
): Promise<UserRow | null> {
  const pgp = getPgp();
  
  const updates: string[] = [];
  const values: any[] = [organizationId, userId];
  let paramIndex = 3;
  
  if (data.userName !== undefined) {
    updates.push(`user_name = $${paramIndex}`);
    values.push(data.userName);
    paramIndex++;
  }
  
  if (data.roleCd !== undefined) {
    updates.push(`role_cd = $${paramIndex}`);
    values.push(data.roleCd);
    paramIndex++;
  }
  
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(data.isActive);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    // 更新対象がない場合は現在のデータを返す
    return await findById(organizationId, userId);
  }
  
  // update_user_id と update_at は常に更新
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(updateUserId);
  paramIndex++;
  updates.push(`update_at = NOW()`);
  
  const query = `
    UPDATE organization_user
    SET ${updates.join(', ')}
    WHERE organization_id = $1
      AND user_id = $2
    RETURNING *
  `;
  
  const result = await pgp.oneOrNone(query, values);
  
  if (!result) {
    return null;
  }
  
  // 更新後のユーザー情報を取得（JOINで全情報を取得）
  return await findById(organizationId, userId);
}

/**
 * Userのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @param isActive アクティブ状態
 * @param updateUserId 更新者ユーザーID
 * @returns 更新されたUser（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  userId: string,
  isActive: boolean,
  updateUserId: string
): Promise<UserRow | null> {
  const pgp = getPgp();
  
  // 外部SQLファイルを読み込み
  const query = await loadSqlFile('users/updateStatus.sql');
  
  const result = await pgp.oneOrNone(query, [isActive, updateUserId, organizationId, userId]);
  
  if (!result) {
    return null;
  }
  
  // 更新後のユーザー情報を取得（JOINで全情報を取得）
  return await findById(organizationId, userId);
}

/**
 * Userを削除（物理削除）
 * ※通常はupdateStatusで論理削除を使用することを推奨
 * 
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 削除された場合true
 */
export async function deleteById(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const pgp = getPgp();
  
  // SQLファイルをトランザクション外で事前読み込み
  const deleteAuthQuery = await loadSqlFile('users/deleteUserAuth.sql');
  const deleteUserQuery = await loadSqlFile('users/deleteUser.sql');

  return await pgp.tx(async (t) => {
    // 1. user_authenticationから削除
    await t.none(deleteAuthQuery, [organizationId, userId]);

    // 2. organization_userから削除
    const result = await t.result(deleteUserQuery, [organizationId, userId]);

    return (result.rowCount ?? 0) > 0;
  });
}
