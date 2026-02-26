/**
 * 組織管理サービス
 * ビジネスロジック層
 */
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import * as organizationRepository from '../repositories/organizationManagementRepository';
import { OrganizationSearchFilters } from '../repositories/organizationManagementRepository';
import { getPool } from '../database/db';
import { generateAndSaveCertificate } from './certificateService';
import { getStorageService } from './storageService';
import { logger } from '../utils/logger';

/**
 * ランダムパスワードを生成（12文字、英大文字・英小文字・数字・記号を含む）
 */
function generateRandomPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  // 各種別から最低1文字ずつ確保
  let password =
    upper.charAt(Math.floor(Math.random() * upper.length)) +
    lower.charAt(Math.floor(Math.random() * lower.length)) +
    digits.charAt(Math.floor(Math.random() * digits.length)) +
    symbols.charAt(Math.floor(Math.random() * symbols.length));
  // 残り8文字をランダムに追加
  for (let i = 0; i < 8; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Organizationレスポンス型定義（API型）
 */
export interface OrganizationResponse {
  organizationId: string;
  organizationCd: string;
  organizationDisplayName: string;
  organizationEmail: string;
  chiefUserId: string;
  chiefUserName: string;
  corporationName: string;
  isEntry: number;
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
 * Organizationを取得
 * 
 * @param filters 検索フィルター
 * @returns Organizationの配列
 */
export async function getOrganizations(
  filters: OrganizationSearchFilters = {}
): Promise<OrganizationResponse[]> {
  console.log('=== organizationService.getOrganizations called ===');
  console.log('filters:', filters);
  
  const organizations = await organizationRepository.findAll(filters);
  console.log('Repository returned:', organizations.length, 'records');
  
  return organizations.map(org => ({
    organizationId: org.organization_id,
    organizationCd: org.organization_cd || '',
    organizationDisplayName: org.organization_display_name || '',
    organizationEmail: org.organization_email || '',
    chiefUserId: org.chief_user_id || '',
    chiefUserName: org.chief_user_name || '',
    corporationName: org.corporation_name || '',
    isEntry: org.is_entry,
    isActive: org.is_active,
    updatedAt: formatDateTime(org.update_at),
  }));
}

/**
 * Organization IDで1件取得
 * 
 * @param organizationId 組織ID
 * @returns Organization（見つからない場合はnull）
 */
export async function getOrganizationById(
  organizationId: string
): Promise<OrganizationResponse | null> {
  const organization = await organizationRepository.findById(organizationId);
  
  if (!organization) {
    return null;
  }
  
  return {
    organizationId: organization.organization_id,
    organizationCd: organization.organization_cd || '',
    organizationDisplayName: organization.organization_display_name || '',
    organizationEmail: organization.organization_email || '',
    chiefUserId: organization.chief_user_id || '',
    chiefUserName: organization.chief_user_name || '',
    corporationName: organization.corporation_name || '',
    isEntry: organization.is_entry,
    isActive: organization.is_active,
    updatedAt: formatDateTime(organization.update_at),
  };
}

/**
 * Organizationを新規作成
 * 
 * 組織追加時に以下のテーブルにもデータを挿入：
 * 1. organization（組織）
 * 2. organization_user（組織利用者） - 代表システム管理者
 * 3. role（ロール） - ROLE002（システム管理者）
 * 4. role_permission（ロール権限） - 4つの機能権限
 * 5. user_authentication（利用者認証） - パスワード認証情報
 * 
 * @param data Organization情報
 * @param userId ログインユーザーID
 * @returns 作成されたOrganization
 */
export async function createOrganization(
  data: {
    organizationId: string;
    organizationCd: string;
    organizationDisplayName: string;
    organizationEmail: string;
    chiefUserId?: string;
    chiefUserName?: string;
    chiefUserEmail?: string;
    chiefUserPassword?: string;
    corporationId?: string;
    isEntry?: number;
    isActive?: boolean;
  },
  userId: string
): Promise<OrganizationResponse> {
  // ID重複チェック
  const exists = await organizationRepository.existsById(data.organizationId);
  if (exists) {
    const error: any = new Error('入力されたIDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_ORGANIZATION_ID';
    throw error;
  }
  
  // 組織CD重複チェック
  const cdExists = await organizationRepository.existsByCd(data.organizationCd);
  if (cdExists) {
    const error: any = new Error('入力された組織CDは既に存在しています');
    error.statusCode = 409;
    error.code = 'DUPLICATE_ORGANIZATION_CD';
    throw error;
  }
  
  // トランザクション管理
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. organizationテーブルに挿入
    const insertOrgQuery = `
      INSERT INTO organization (
        organization_id,
        organization_cd,
        organization_display_name,
        organization_email,
        chief_user_id,
        corporation_id,
        is_entry,
        is_active,
        create_user_id,
        update_user_id,
        create_at,
        update_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING organization_id
    `;
    
    const orgValues = [
      data.organizationId,
      data.organizationCd,
      data.organizationDisplayName,
      data.organizationEmail,
      data.chiefUserEmail || null,  // 代表者メールアドレスをchief_user_idに設定
      data.corporationId || null,
      data.isEntry !== undefined ? data.isEntry : 0,
      data.isActive !== undefined ? data.isActive : true,
      userId,
      userId,
    ];
    
    await client.query(insertOrgQuery, orgValues);
    
    // 2. organization_userテーブルに挿入（代表システム管理者）
    if (data.chiefUserEmail && data.chiefUserName) {
      await organizationRepository.createOrganizationUser(
        {
          userId: data.chiefUserEmail,           // user_id = 代表者メールアドレス
          organizationId: data.organizationId,
          userName: data.chiefUserName,          // user_name = 代表システム管理者名
          roleCd: 'ROLE002',                     // システム管理者
          mailAddress: data.chiefUserEmail,      // mail_address = 代表者メールアドレス
          departmentCd: null,                    // Null
          isActive: true,                        // True
        },
        userId,
        client
      );
    }
    
    // 3. roleテーブルに挿入（ROLE002: システム管理者）
    await organizationRepository.createRole(
      {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        roleName: 'システム管理者',
        initialScreenFunctionCd: '020000',     // システム管理メニュー
        isActive: true,
      },
      userId,
      client
    );
    
    // 4. role_permissionテーブルに挿入（4つの機能権限）
    const permissions = [
      {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        functionCd: '020000',                  // システム管理者メニュー
        permission: 1,                          // 書込可
      },
      {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        functionCd: '030000',                  // データ管理者メニュー
        permission: 1,                          // 書込可
      },
      {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        functionCd: '040000',                  // 実験管理者メニュー
        permission: 1,                          // 書込可
      },
      {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        functionCd: '050000',                  // 実験作業者メニュー
        permission: 1,                          // 書込可
      },
    ];
    
    await organizationRepository.createRolePermissions(permissions, userId, client);
    
    // 5. user_authenticationテーブルに挿入（パスワード認証情報）
    if (data.chiefUserEmail) {
      // ランダムパスワードを自動生成
      const plainPassword = generateRandomPassword();
      console.log(`Password:${plainPassword}`);
      
      // パスワードをbcryptでハッシュ化（12 rounds）
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(plainPassword, saltRounds);
      
      // パスワード有効期限：保存ボタン押下時のタイムスタンプ（現在日時）
      const passwordExpiresAt = new Date();
      
      const authQuery = `
        INSERT INTO user_authentication (
          user_id,
          organization_id,
          password,
          is_temporary_flg,
          password_expires_at,
          create_user_id,
          update_user_id,
          create_at,
          update_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
      `;
      
      const authValues = [
        data.chiefUserEmail,         // user_id（代表者メールアドレス）
        data.organizationId,         // organization_id
        passwordHash,                // password（bcryptハッシュ）
        true,                        // is_temporary_flg（仮パスワード）
        passwordExpiresAt,           // password_expires_at（有効期限）
        userId,                      // create_user_id
        userId,                      // update_user_id
      ];
      
      await client.query(authQuery, authValues);
    }
    
    await client.query('COMMIT');
    
    // JOINでchief_user_nameとcorporation_nameを取得
    const fullOrganization = await organizationRepository.findById(data.organizationId);
    
    if (!fullOrganization) {
      throw new Error('Created organization not found');
    }
    
    // 組織作成成功後、クライアント証明書を自動生成
    // 注意: トランザクション完了後に実行（DB整合性を保つため）
    // 証明書生成失敗時でも組織作成自体は成功とする
    try {
      logger.info(`[organizationService] 組織作成成功、証明書生成を開始: organizationId=${data.organizationId}`);
      const certResult = await generateAndSaveCertificate(data.organizationId);
      
      if (certResult.success) {
        logger.info(`[organizationService] 証明書生成成功: organizationId=${data.organizationId}`);
      } else {
        logger.warn(
          `[organizationService] 証明書生成失敗（組織作成は成功）: organizationId=${data.organizationId}`,
          {
            error: certResult.errorMessage,
            organizationId: data.organizationId,
          }
        );
      }
    } catch (certError) {
      // 証明書生成エラーはログに記録するが、組織作成自体は成功とする
      logger.error(
        `[organizationService] 証明書生成で例外発生（組織作成は成功）: organizationId=${data.organizationId}`,
        {
          error: certError instanceof Error ? certError.message : String(certError),
          organizationId: data.organizationId,
        }
      );
    }
    
    // 基本フォルダ構造の作成
    // 注意: トランザクション完了後に実行（DB整合性を保つため）
    // フォルダ作成失敗時でも組織作成自体は成功とする
    try {
      logger.info(`[organizationService] 基本フォルダ構造を作成: organizationId=${data.organizationId}`);
      const storageService = getStorageService();
      
      // 組織の基本フォルダ構造を定義（ビジネスロジック）
      const organizationFolders = [
        'projects/',
        'formats/',
      ];
      
      await storageService.createFolders(data.organizationId, organizationFolders);
      logger.info(`[organizationService] 基本フォルダ構造作成完了: organizationId=${data.organizationId}`);
    } catch (folderError) {
      // フォルダ作成エラーはログに記録するが、組織作成自体は成功とする
      logger.warn(
        `[organizationService] フォルダ作成失敗（組織作成は成功）: organizationId=${data.organizationId}`,
        {
          error: folderError instanceof Error ? folderError.message : String(folderError),
          organizationId: data.organizationId,
        }
      );
    }
    
    return {
      organizationId: fullOrganization.organization_id,
      organizationCd: fullOrganization.organization_cd || '',
      organizationDisplayName: fullOrganization.organization_display_name || '',
      organizationEmail: fullOrganization.organization_email || '',
      chiefUserId: fullOrganization.chief_user_id || '',
      chiefUserName: fullOrganization.chief_user_name || '',
      corporationName: fullOrganization.corporation_name || '',
      isEntry: fullOrganization.is_entry,
      isActive: fullOrganization.is_active,
      updatedAt: formatDateTime(fullOrganization.update_at),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error during organization creation:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Organizationを更新
 * 
 * @param organizationId 組織ID
 * @param data 更新情報
 * @param userId ログインユーザーID
 * @returns 更新されたOrganization（見つからない場合はnull）
 */
export async function updateOrganization(
  organizationId: string,
  data: {
    organizationDisplayName?: string;
    organizationPrefix?: string;
    organizationEmail?: string;
    chiefUserId?: string;
    corporationId?: string;
    isEntry?: number;
    isActive?: boolean;
  },
  userId: string
): Promise<OrganizationResponse | null> {
  const organization = await organizationRepository.update(organizationId, data, userId);
  
  if (!organization) {
    return null;
  }
  
  return {
    organizationId: organization.organization_id,
    organizationCd: organization.organization_cd || '',
    organizationDisplayName: organization.organization_display_name || '',
    organizationEmail: organization.organization_email || '',
    chiefUserId: organization.chief_user_id || '',
    chiefUserName: organization.chief_user_name || '',
    corporationName: organization.corporation_name || '',
    isEntry: organization.is_entry,
    isActive: organization.is_active,
    updatedAt: formatDateTime(organization.update_at),
  };
}

/**
 * Organizationのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 * @returns 更新されたOrganization（見つからない場合はnull）
 */
export async function updateOrganizationStatus(
  organizationId: string,
  isActive: boolean,
  userId: string
): Promise<OrganizationResponse | null> {
  const organization = await organizationRepository.updateStatus(organizationId, isActive, userId);
  
  if (!organization) {
    return null;
  }
  
  return {
    organizationId: organization.organization_id,
    organizationCd: organization.organization_cd || '',
    organizationDisplayName: organization.organization_display_name || '',
    organizationEmail: organization.organization_email || '',
    chiefUserId: organization.chief_user_id || '',
    chiefUserName: organization.chief_user_name || '',
    corporationName: organization.corporation_name || '',
    isEntry: organization.is_entry,
    isActive: organization.is_active,
    updatedAt: formatDateTime(organization.update_at),
  };
}
/**
 * システム管理者のレスポンス型定義
 */
export interface SystemAdminResponse {
  userId: string;
  userName: string;
}

/**
 * 組織のシステム管理者一覧を取得
 * 
 * @param organizationId 組織ID
 * @returns システム管理者の配列
 */
export async function getSystemAdminsByOrganizationId(
  organizationId: string
): Promise<SystemAdminResponse[]> {
  const systemAdmins = await organizationRepository.findSystemAdminsByOrganizationId(organizationId);
  
  return systemAdmins.map(admin => ({
    userId: admin.user_id,
    userName: admin.user_name,
  }));
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
 * OrganizationCSVアップロード処理
 * 
 * 組織追加ダイアログの「保存」ボタン押下時の処理を各レコードごとに実行
 * 
 * 事前バリデーション方式：
 * 1. 全行をバリデーション（最初のエラーで停止）
 * 2. エラーがなければ全件をDB登録（createOrganization関数を使用）
 * 
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadOrganizationsCsv(
  csvContent: string,
  userId: string
): Promise<CsvUploadResult> {
  // CSVをパース
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Phase 1: 事前バリデーション（DBアクセスあり - 既存チェック含む）
  const validationErrors: CsvValidationError[] = [];
  const organizationCdSet = new Set<string>(); // CSV内重複チェック用
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const organizationCd = row['organization_cd']?.trim();
    const organizationDisplayName = row['organization_display_name']?.trim();
    const organizationEmail = row['organization_email']?.trim();
    const chiefUserName = row['chief_user_name']?.trim();
    const chiefUserEmail = row['chief_user_email']?.trim();
    
    if (!organizationCd) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_cd',
        message: `${rowNumber}行目: 組織CDは必須です`
      });
      break;
    }
    
    if (!organizationDisplayName) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_display_name',
        message: `${rowNumber}行目: 組織表示名は必須です`
      });
      break;
    }
    
    if (!organizationEmail) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_email',
        message: `${rowNumber}行目: 組織e-mailは必須です`
      });
      break;
    }
    
    if (!chiefUserName) {
      validationErrors.push({
        row: rowNumber,
        field: 'chief_user_name',
        message: `${rowNumber}行目: 代表システム管理者は必須です`
      });
      break;
    }
    
    if (!chiefUserEmail) {
      validationErrors.push({
        row: rowNumber,
        field: 'chief_user_email',
        message: `${rowNumber}行目: 代表者メールアドレスは必須です`
      });
      break;
    }
    
    // 型チェック（is_entry）
    const isEntryStr = row['is_entry']?.trim();
    if (isEntryStr && !['0', '1', ''].includes(isEntryStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'is_entry',
        message: `${rowNumber}行目: is_entryは0または1である必要があります`
      });
      break;
    }
    
    // 型チェック（is_active）
    const isActiveStr = row['is_active']?.trim();
    if (isActiveStr && 
        !['true', 'TRUE', '1', 'false', 'FALSE', '0', ''].includes(isActiveStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'is_active',
        message: `${rowNumber}行目: is_activeは true/false/1/0 のいずれかである必要があります`
      });
      break;
    }
    
    // CSV内重複チェック（organization_cd）
    const lowerCaseCd = organizationCd.toLowerCase();
    if (organizationCdSet.has(lowerCaseCd)) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_cd',
        message: `${rowNumber}行目: 組織CD「${organizationCd}」はCSV内で重複しています`
      });
      break;
    }
    organizationCdSet.add(lowerCaseCd);
    
    // 既存データチェック（organization_cd重複チェック）
    const exists = await organizationRepository.existsByCd(organizationCd);
    if (exists) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_cd',
        message: `${rowNumber}行目: 組織CD「${organizationCd}」は既に存在します`
      });
      break;
    }
    
    // corporation_name存在チェック（指定されている場合のみ）
    const corporationName = row['corporation_name']?.trim();
    if (corporationName) {
      const pool = getPool();
      const result = await pool.query(
        'SELECT corporation_id FROM corporation WHERE corporation_name = $1 AND is_active = true',
        [corporationName]
      );
      
      if (result.rows.length === 0) {
        validationErrors.push({
          row: rowNumber,
          field: 'corporation_name',
          message: `${rowNumber}行目: 会社名「${corporationName}」は登録されていません`
        });
        break;
      }
    }
  }
  
  // エラーがあれば即座に終了（DB登録は行わない）
  if (validationErrors.length > 0) {
    return {
      successCount: 0,
      failureCount: parseResult.data.length,
      errors: validationErrors,
    };
  }
  
  // Phase 2: DB登録（バリデーション通過後のみ）
  // トランザクションは各createOrganization内で管理されるため、ここでは不要
  let successCount = 0;
  
  try {
    // 全行を新規作成（バリデーションで既存チェック済み）
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      
      // バリデーション済みなのでtrim()のみ実施
      const organizationCd = row['organization_cd'].trim();
      const organizationDisplayName = row['organization_display_name'].trim();
      const organizationEmail = row['organization_email'].trim();
      const chiefUserName = row['chief_user_name'].trim();
      const chiefUserEmail = row['chief_user_email'].trim();
      const corporationName = row['corporation_name']?.trim();
      
      // is_entryの変換
      const isEntryStr = row['is_entry']?.trim();
      const isEntry = isEntryStr === '1' ? 1 : 0;
      
      // is_activeの変換
      const isActiveStr = row['is_active']?.trim();
      const isActive = isActiveStr === 'true' || isActiveStr === 'TRUE' || isActiveStr === '1';
      
      // corporation_nameからcorporation_idを取得
      let corporationId: string | undefined = undefined;
      if (corporationName) {
        const pool = getPool();
        const result = await pool.query(
          'SELECT corporation_id FROM corporation WHERE corporation_name = $1 AND is_active = true',
          [corporationName]
        );
        corporationId = result.rows[0].corporation_id;
      }
      
      // createOrganization関数を使用（組織追加ダイアログと同じ処理）
      // パスワードはcreateOrganization内でランダム自動生成される
      await createOrganization({
        organizationId: uuidv4(),
        organizationCd,
        organizationDisplayName,
        organizationEmail,
        chiefUserName,
        chiefUserEmail,
        corporationId,
        isEntry,
        isActive,
      }, userId);
      
      successCount++;
    }
    
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  } catch (error) {
    console.error('CSV upload error:', error);
    throw error;
  }
}
