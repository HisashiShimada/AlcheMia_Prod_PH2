/**
 * ロール管理サービス
 * ビジネスロジック層
 */

import * as roleRepository from '../repositories/roleRepository';
import Papa from 'papaparse';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getMessage } from '../utils/messages';

/**
 * 機能情報の型
 */
export interface FunctionInfo {
  name: string;           // 機能名（例: "会社管理"）
  permission: string;     // 権限（"WRITER" or "READER"）
  color: string;          // 色コード（"#52c41a" or "#1890ff"）
  icon: string;           // アイコン（"Ⓦ" or "Ⓡ"）
}

/**
 * Roleレスポンス型定義
 */
export interface RoleResponse {
  roleId: string;
  roleName: string;
  isActive: boolean;
  initialScreenFunctionName: string | null;  // 初期画面機能名
  functionName: string;
  functionWritePermissions: string;
  functionIds: string[];  // 機能IDのリスト
  writableFunctionIds: string[];  // 書込可能な機能IDのリスト
  functions: FunctionInfo[];  // 機能情報の配列（色とアイコン付き）
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
 * ロールCSVアップロード
 */
export async function uploadRolesCsv(
  organizationId: string,
  userId: string,
  csvContent: string,
  lang: string = 'ja'
): Promise<void> {
  // CSVパース
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    throw {
      statusCode: 400,
      code: 'CSV_PARSE_ERROR',
      message: getMessage(lang, 'role.csv.parseError'),
      details: parseResult.errors,
    };
  }

  const rows = parseResult.data as any[];

  if (rows.length === 0) {
    throw {
      statusCode: 400,
      code: 'EMPTY_CSV',
      message: getMessage(lang, 'role.csv.emptyData'),
    };
  }

  // バリデーション
  const errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // ヘッダー行を除く

    // 必須項目チェック（role_cd）
    if (!row['role_cd']?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'role_cd',
        message: getMessage(lang, 'role.csv.cdRequired', { row: String(rowNumber) }),
      });
    }

    // 型チェック（is_active）
    const isActiveStr = row['is_active']?.trim();
    if (
      isActiveStr &&
      !['true', 'TRUE', '1', 'false', 'FALSE', '0', ''].includes(isActiveStr)
    ) {
      errors.push({
        row: rowNumber,
        field: 'is_active',
        message: getMessage(lang, 'role.csv.isActiveInvalid', { row: String(rowNumber) }),
      });
    }
  }

  // CSV内重複チェック（同じrole_cdで異なるrole_nameがないかチェック）
  const roleCdMap = new Map<string, string>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const roleCd = row['role_cd']?.trim();
    const roleName = row['role_name']?.trim();

    if (!roleCd) continue; // role_cdがない場合はスキップ（既にエラー登録済み）

    if (roleCdMap.has(roleCd)) {
      const existingRoleName = roleCdMap.get(roleCd);
      if (existingRoleName !== roleName) {
        errors.push({
          row: rowNumber,
          field: 'role_cd',
          message: getMessage(lang, 'role.csv.roleNameMismatch', { row: String(rowNumber), roleCd, existing: existingRoleName!, newName: roleName }),
        });
      }
    } else {
      roleCdMap.set(roleCd, roleName);
    }
  }

  // initial_screen_function_cdとfunction_cdの整合性チェック
  // role_cdごとにグループ化して、initial_screen_function_cdがいずれかのfunction_cdに含まれているかチェック
  const roleGroupMap = new Map<string, any[]>();
  for (const row of rows) {
    const roleCd = row['role_cd']?.trim();
    if (!roleCd) continue;

    if (!roleGroupMap.has(roleCd)) {
      roleGroupMap.set(roleCd, []);
    }
    roleGroupMap.get(roleCd)!.push(row);
  }

  for (const [roleCd, roleRows] of roleGroupMap) {
    const firstRow = roleRows[0];
    const initialScreenFunctionName = firstRow['initial_screen_function_cd']?.trim();

    // initial_screen_function_cdが指定されている場合のみチェック
    if (initialScreenFunctionName) {
      // 同じrole_cdの全行のfunction_cdを収集
      const functionNames = roleRows
        .map(row => row['function_cd']?.trim())
        .filter(Boolean);

      // initial_screen_function_cdがいずれかのfunction_cdに含まれているかチェック
      if (!functionNames.includes(initialScreenFunctionName)) {
        const rowNumber = rows.indexOf(firstRow) + 2;
        errors.push({
          row: rowNumber,
          field: 'initial_screen_function_cd',
          message: getMessage(lang, 'role.csv.initialScreenNotInRole', { row: String(rowNumber), screen: initialScreenFunctionName, roleCd }),
        });
      }
    }
  }

  if (errors.length > 0) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: getMessage(lang, 'role.csv.validationError'),
      details: errors,
    };
  }

  // DB既存チェック（重複チェックを避けるためSetを使用）
  const uniqueRoleCds = new Set(rows.map(row => row['role_cd']?.trim()).filter(Boolean));
  
  for (const roleCd of uniqueRoleCds) {
    const exists = await roleRepository.existsById(organizationId, roleCd);
    if (exists) {
      throw {
        statusCode: 400,
        code: 'DUPLICATE_ROLE_CD',
        message: getMessage(lang, 'role.csv.alreadyExists', { roleCd }),
        details: [
          {
            field: 'role_cd',
            message: getMessage(lang, 'role.csv.alreadyExists', { roleCd }),
          },
        ],
      };
    }
  }

  // role_cdでグループ化
  const groupedByRole = new Map<string, any[]>();
  for (const row of rows) {
    const roleCd = row['role_cd']?.trim();
    if (!groupedByRole.has(roleCd)) {
      groupedByRole.set(roleCd, []);
    }
    groupedByRole.get(roleCd)!.push(row);
  }

  console.log('=== CSV Upload Debug ===');
  console.log('Parsed rows:', JSON.stringify(rows, null, 2));
  console.log('Grouped by role:', Array.from(groupedByRole.entries()));

  // トランザクション開始
  const pgp = getPgp();
  
  // SQLファイルを事前に読み込む
  const roleInsertSql = await loadSqlFile('roles/create.sql');
  const permissionInsertSql = await loadSqlFile('roles/insertPermission.sql');

  try {
    await pgp.tx(async (t) => {
      // 各ロールごとに処理
      for (const [roleCd, roleRows] of groupedByRole) {
        const firstRow = roleRows[0];
        console.log('Processing role:', roleCd);
        console.log('First row:', JSON.stringify(firstRow, null, 2));

        // initial_screen_function_cd を機能名からCDに変換
        const initialScreenFunctionName = firstRow['initial_screen_function_cd']?.trim();
        console.log('Initial screen function name:', initialScreenFunctionName);
        
        const initialScreenFunctionCd = roleRepository.getFunctionIdByName(initialScreenFunctionName);
        console.log('Initial screen function CD:', initialScreenFunctionCd);

        if (initialScreenFunctionName && !initialScreenFunctionCd) {
          const errorMsg = `初期画面機能「${initialScreenFunctionName}」が見つかりません`;
          console.error(errorMsg);
          throw {
            statusCode: 400,
            code: 'FUNCTION_NOT_FOUND',
            message: errorMsg,
            details: [{
              field: 'initial_screen_function_cd',
              message: errorMsg,
            }],
          };
        }

        // is_active の変換
        const isActiveStr = firstRow['is_active']?.trim().toLowerCase();
        const isActive =
          isActiveStr === 'true' || isActiveStr === '1' || isActiveStr === '';

        // roleテーブルにinsert（外部SQLファイル使用）
        await t.none(roleInsertSql, [
          organizationId,
          roleCd,
          firstRow['role_name']?.trim(),
          initialScreenFunctionCd,
          isActive,
          userId,
          userId,
        ]);

        // role_permissionテーブルにinsert（各行の権限情報）
        for (const row of roleRows) {
          const functionName = row['function_cd']?.trim();
          
          // function_cdが空の場合はスキップ（roleテーブルのみ登録）
          if (!functionName) {
            console.log('Skipping role_permission insert: function_cd is empty');
            continue;
          }
          
          console.log('Processing function name:', functionName);
          
          const functionCd = roleRepository.getFunctionIdByName(functionName);
          console.log('Function CD:', functionCd);

          if (!functionCd) {
            const errorMsg = `機能「${functionName}」が見つかりません`;
            console.error(errorMsg);
            throw {
              statusCode: 400,
              code: 'FUNCTION_NOT_FOUND',
              message: errorMsg,
              details: [{
                field: 'function_cd',
                message: errorMsg,
              }],
            };
          }

          const permissionSymbol = row['permission']?.trim();
          const permission = permissionSymbol === 'Ⓦ' ? 0 : 1;

          // role_permissionテーブルにinsert（外部SQLファイル使用）
          await t.none(permissionInsertSql, [
            organizationId,
            roleCd,
            functionCd,
            permission,
            userId,
            userId,
          ]);
        }
      }
    });
    console.log('Transaction committed successfully');
  } catch (error: any) {
    console.error('ロールCSVアップロードトランザクションエラー:', error);
    
    // カスタムエラーの場合はそのまま投げる
    if (error.statusCode) {
      throw error;
    }
    
    // それ以外のエラーは500エラーとして処理
    throw {
      statusCode: 500,
      code: 'TRANSACTION_ERROR',
      message: getMessage(lang, 'role.csv.transactionError'),
      details: [{
        message: error.message || String(error),
      }],
    };
  }
}


