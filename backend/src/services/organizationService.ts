/**
 * 組織管理サービス
 * ビジネスロジック層
 */
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import * as organizationRepository from '../repositories/organizationManagementRepository';
import * as codeMasterRepository from '../repositories/codeMasterRepository';
import { OrganizationSearchFilters } from '../repositories/organizationManagementRepository';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { generateAndSaveCertificate } from './certificateService';
import { EmailService } from './emailService';
import { getStorageService } from './storageService';
import { logger } from '../utils/logger';
import { getMessage } from '../utils/messages';
import { createSchemaIfNotExists, createSchemaTables, getSchemaStorageSizeBytes } from '../repositories/maimlAssetRepository';
import * as namespaceTermRepository from '../repositories/namespaceTermRepository';
import { generateNamespaceUri } from '../utils/namespaceUriGenerator';

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
  useDeemedProgress: boolean;
  isActive: boolean;
  contractCapacity: number | null;
  contractedUsers: number | null;
  contractedProjects: number | null;
  defaultRetentionDays: number;
  updatedAt: string;
}

/**
 * OrganizationRow を OrganizationResponse に変換するヘルパー関数
 *
 * @param org OrganizationRow（DBからの取得結果）
 * @returns OrganizationResponse（APIレスポンス用）
 */
function toOrganizationResponse(org: organizationRepository.OrganizationRow): OrganizationResponse {
  const response: OrganizationResponse = {
    organizationId: org.organization_id,
    organizationCd: org.organization_cd || '',
    organizationDisplayName: org.organization_display_name || '',
    organizationEmail: org.organization_email || '',
    chiefUserId: org.chief_user_id || '',
    chiefUserName: org.chief_user_name || '',
    corporationName: org.corporation_name || '',
    isEntry: org.is_entry,
    useDeemedProgress: org.use_deemed_progress,
    isActive: org.is_active,
    contractCapacity: org.contract_capacity ?? null,
    contractedUsers: org.contract_users ?? null,
    contractedProjects: org.contract_projects ?? null,
    defaultRetentionDays: org.default_retention_days,
    updatedAt: formatDateTime(org.update_at),
  };
  return response;
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
 * 組織CD重複チェック
 *
 * @param organizationCd チェック対象の組織CD
 * @returns 重複している場合は true
 */
export async function checkOrganizationCdExists(organizationCd: string): Promise<boolean> {
  return await organizationRepository.existsByCd(organizationCd);
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
  
  return organizations.map(org => toOrganizationResponse(org));
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
  
  return toOrganizationResponse(organization);
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
    useDeemedProgress?: boolean;
    isActive?: boolean;
    contractCapacity?: number | null;
    contractedUsers?: number | null;
    contractedProjects?: number | null;
    defaultRetentionDays?: number;
  },
  userId: string,
  lang: string = 'ja'
): Promise<OrganizationResponse> {
  // ID重複チェック
  const exists = await organizationRepository.existsById(data.organizationId);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'organization.duplicateId'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_ORGANIZATION_ID';
    throw error;
  }
  
  // 組織CD重複チェック
  const cdExists = await organizationRepository.existsByCd(data.organizationCd);
  if (cdExists) {
    const error: any = new Error(getMessage(lang, 'organization.duplicateCd'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_ORGANIZATION_CD';
    throw error;
  }
  
  // pg-promise トランザクション管理
  const pgp = getPgp();

  // トランザクション外で実行するデータを事前に準備
  // (bcryptはCPU負荷が高いためトランザクション外で実行)
  let plainPassword: string | null = null;
  let passwordHash: string | null = null;

  if (data.chiefUserEmail) {
    plainPassword = generateRandomPassword();
    const saltRounds = 12;
    passwordHash = await bcrypt.hash(plainPassword, saltRounds);
  }

  let fullOrganization;

  // ---------------------------------------------------------------
  // DB処理・証明書生成・S3フォルダ作成を1つのtry-catchで管理
  // どれか1つが失敗した場合はエラーをthrowして組織作成全体を失敗とする
  // ---------------------------------------------------------------
  try {
    // SQLファイルを事前に読み込み
    const insertOrgQuery = await loadSqlFile('organizations/create.sql');
    const authQuery = await loadSqlFile('organizations/createUserAuthentication.sql');

    // ① DBトランザクション
    // organization / user / role / permission / user_authentication /
    // code_master 初期データ / 組織スキーマ を一括登録
    await pgp.tx(async (t) => {
      // 1. organizationテーブルに挿入
      // default_retention_days: リクエストから指定があれば使用、なければ環境変数から取得
      const defaultRetentionDays = data.defaultRetentionDays
        ?? parseInt(process.env.RETENTION_DAYS_DEFAULT ?? '30', 10);

      const orgValues = [
        data.organizationId,                                              // $1
        data.organizationCd,                                              // $2
        data.organizationDisplayName,                                     // $3
        data.organizationEmail,                                           // $4
        data.chiefUserEmail || null,  // 代表者メールアドレスをchief_user_idに設定 // $5
        data.corporationId || null,                                       // $6
        data.isEntry !== undefined ? data.isEntry : 0,                   // $7
        data.useDeemedProgress !== undefined ? data.useDeemedProgress : true, // $8
        data.isActive !== undefined ? data.isActive : true,              // $9
        data.contractCapacity ?? null,                                    // $10
        data.contractedUsers ?? null,                                     // $11
        data.contractedProjects ?? null,                                  // $12
        defaultRetentionDays,                                             // $13
        userId,                                                           // $14
        userId,                                                           // $15
      ];

      await t.one(insertOrgQuery, orgValues);

      // 2. organization_userテーブルに挿入（代表システム管理者）
      if (data.chiefUserEmail && data.chiefUserName) {
        const orgUserData: Parameters<typeof organizationRepository.createOrganizationUser>[0] = {
          userId: data.chiefUserEmail,           // user_id = 代表者メールアドレス
          organizationId: data.organizationId,
          userName: data.chiefUserName,          // user_name = 代表システム管理者名
          roleCd: 'ROLE002',                     // システム管理者
          mailAddress: data.chiefUserEmail,      // mail_address = 代表者メールアドレス
          organizationGroupCds: null,            // Null
          isActive: true,                        // True
        };
        await organizationRepository.createOrganizationUser(
          orgUserData,
          userId,
          t                                      // pg-promiseトランザクションオブジェクト
        );
      }

      // 3. roleテーブルに挿入（ROLE002: システム管理者）
      const roleData: Parameters<typeof organizationRepository.createRole>[0] = {
        organizationId: data.organizationId,
        roleCd: 'ROLE002',
        roleName: 'システム管理者',
        initialScreenFunctionCd: '020000',       // システム管理メニュー
        isActive: true,
      };
      await organizationRepository.createRole(
        roleData,
        userId,
        t                                        // pg-promiseトランザクションオブジェクト
      );

      // 4. role_permissionテーブルに挿入（4つの機能権限）
      const permissions: Parameters<typeof organizationRepository.createRolePermissions>[0] = [
        {
          organizationId: data.organizationId,
          roleCd: 'ROLE002',
          functionCd: '020000',                  // システム管理者メニュー
          permission: 1,                         // 書込可
        },
        {
          organizationId: data.organizationId,
          roleCd: 'ROLE002',
          functionCd: '030000',                  // データ管理者メニュー
          permission: 1,                         // 書込可
        },
        {
          organizationId: data.organizationId,
          roleCd: 'ROLE002',
          functionCd: '040000',                  // 実験管理者メニュー
          permission: 1,                         // 書込可
        },
        {
          organizationId: data.organizationId,
          roleCd: 'ROLE002',
          functionCd: '050000',                  // 実験作業者メニュー
          permission: 1,                         // 書込可
        },
      ];

      await organizationRepository.createRolePermissions(permissions, userId, t);

      // 5. user_authenticationテーブルに挿入（パスワード認証情報）
      if (data.chiefUserEmail && passwordHash) {
        const authValues = [
          data.chiefUserEmail,         // user_id（代表者メールアドレス）
          data.organizationId,         // organization_id
          passwordHash,                // password（bcryptハッシュ）
          true,                        // is_temporary_flg（仮パスワード）
          userId,                      // create_user_id
          userId,                      // update_user_id
        ];

        await t.none(authQuery, authValues);
      }

      // 6. code_master 初期データを登録
      // code_masterが未登録の場合は実験が進められないためトランザクション内で登録
      logger.info(`[organizationService] code_master初期データを登録: organizationId=${data.organizationId}`);
      await codeMasterRepository.insertInitialData(data.organizationId, userId, t);
      logger.info(`[organizationService] code_master初期データ登録完了: organizationId=${data.organizationId}`);

      // 7. MaiML OpenData 用 組織スキーマ・テーブルの作成
      // 公開機能で使用する {org_<uuid>}.maiml_asset 等を初期化する
      logger.info(`[organizationService] 組織スキーマを作成: organizationId=${data.organizationId}`);
      await createSchemaIfNotExists(data.organizationId, data.organizationCd);
      await createSchemaTables(data.organizationId);
      logger.info(`[organizationService] 組織スキーマ作成完了: organizationId=${data.organizationId}`);

      // 8. namespace テーブルへ組織URIを自動登録
      // URI形式: https://{organizationCd}.Alchemia.co.jp
      // 失敗時はトランザクション全体をロールバックする（組織作成と原子性を保証）
      logger.info(`[organizationService] 組織URI自動登録を開始: organizationId=${data.organizationId}`);
      const orgUri = generateNamespaceUri(data.organizationCd);
      const existingUris = await namespaceTermRepository.findUrisByOrganization(data.organizationId, t);
      const uniqueUri = existingUris.includes(orgUri) ? `${orgUri}1` : orgUri;
      await namespaceTermRepository.createNamespaceUri(
        { organizationId: data.organizationId, uri: uniqueUri, userId },
        t
      );
      logger.info(`[organizationService] 組織URI自動登録完了: organizationId=${data.organizationId}, uri=${uniqueUri}`);
    });

    // JOINでchief_user_nameとcorporation_nameを取得
    fullOrganization = await organizationRepository.findById(data.organizationId);

    if (!fullOrganization) {
      throw new Error('Created organization not found');
    }

    // ② 証明書生成（DB完了後に実行）
    logger.info(`[organizationService] 証明書生成を開始: organizationId=${data.organizationId}`);
    const certResult = await generateAndSaveCertificate(data.organizationId);
    if (certResult.success) {
      logger.info(`[organizationService] 証明書生成成功: organizationId=${data.organizationId}`);
    } else {
      throw new Error(`証明書生成失敗: ${certResult.errorMessage}`);
    }

    // ③ 基本フォルダ構造の作成（S3/Swift）
    logger.info(`[organizationService] 基本フォルダ構造を作成: organizationId=${data.organizationId}`);
    const storageService = getStorageService();
    const organizationFolders = [
      'projects/',
      'formats/',
      'formats/default/',
      'formats/default/condition/',
      'formats/default/material/',
      'formats/default/result/',
    ];
    await storageService.createFolders(data.organizationId, organizationFolders);
    logger.info(`[organizationService] 基本フォルダ構造作成完了: organizationId=${data.organizationId}`);

  } catch (error) {
    logger.error(
      `[organizationService] 組織作成処理でエラー発生: organizationId=${data.organizationId}`,
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId: data.organizationId,
      }
    );
    throw error;
  }

  // ④ 組織登録完了メールを送信
  // 本番環境では常に送信、開発環境では EMAIL_ENABLED=true の場合のみ送信
  // メール失敗は組織作成のエラーとしない（インフラ都合で失敗する可能性があるため）
  try {
    const shouldSendEmail =
      process.env.NODE_ENV === 'production' ||
      process.env.EMAIL_ENABLED === 'true';

    if (shouldSendEmail && data.chiefUserEmail && plainPassword) {
      const emailService = new EmailService();
      const result = await emailService.sendOrganizationCreated(
        data.chiefUserEmail,
        data.chiefUserEmail,
        plainPassword
      );
      if (result.success) {
        logger.info(`[organizationService] 組織登録完了メール送信成功: userId=${data.chiefUserEmail}`);
      } else {
        logger.warn(`[organizationService] 組織登録完了メール送信失敗: userId=${data.chiefUserEmail}`, {
          error: result.error,
        });
      }
    } else if (!shouldSendEmail) {
      logger.info(`[organizationService] 組織登録完了メール（EMAIL_ENABLED=false スキップ）: userId=${data.chiefUserEmail}, password=${plainPassword}`);
    }
  } catch (emailError) {
    logger.warn(`[organizationService] 組織登録完了メール送信で例外発生`, {
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
  }

  return toOrganizationResponse(fullOrganization!);
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
    useDeemedProgress?: boolean;
    isActive?: boolean;
    contractCapacity?: number | null;
    contractedUsers?: number | null;
    contractedProjects?: number | null;
    defaultRetentionDays?: number;
  },
  userId: string
): Promise<OrganizationResponse | null> {
  const organization = await organizationRepository.update(organizationId, data, userId);
  
  if (!organization) {
    return null;
  }
  
  return toOrganizationResponse(organization);
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
  
  return toOrganizationResponse(organization);
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
  
  return systemAdmins.map(admin => {
    const response: SystemAdminResponse = {
      userId: admin.user_id,
      userName: admin.user_name,
    };
    return response;
  });
}

/**
 * 情報ダウンロード用CSVデータ型定義（日本語ヘッダー）
 */
export interface OrganizationInformationCsvRowJa {
  '組織CD': string;
  '組織表示名': string;
  '組織e-mail': string;
  '代表システム管理者': string;
  '会社名': string;
  '契約容量': string;
  '契約ユーザー数': string;
  '契約プロジェクト数': string;
  'ストレージ使用量': string;
  'プロジェクト数': string;
  'アクティブユーザー数': string;
}

/**
 * 情報ダウンロード用CSVデータ型定義（英語ヘッダー）
 */
export interface OrganizationInformationCsvRowEn {
  'Organization CD': string;
  'Organization Display Name': string;
  'Organization E-mail': string;
  'Chief System Administrator': string;
  'Corporation Name': string;
  'Contract Capacity': string;
  'Contracted Users': string;
  'Contracted Projects': string;
  'Storage Usage': string;
  'Projects': string;
  'Active Users': string;
}

/** 情報ダウンロード用CSVデータ型定義（言語共通） */
export type OrganizationInformationCsvRow = OrganizationInformationCsvRowJa | OrganizationInformationCsvRowEn;

/**
 * 情報ダウンロード用：全組織の統計情報を収集してCSVデータを返す
 *
 * @param lang 言語コード（'ja' または 'en'、デフォルト: 'ja'）
 * @returns 情報ダウンロード用CSVデータの配列
 */
export async function downloadOrganizationsInformation(lang: string = 'ja'): Promise<OrganizationInformationCsvRow[]> {
  // DB から組織統計情報を取得
  const orgs = await organizationRepository.findAllWithStats();

  // ストレージサービスの取得
  const storageService = getStorageService();

  // 各組織のストレージ使用量を取得
  const rows: OrganizationInformationCsvRow[] = [];

  for (const org of orgs) {
    // ストレージ使用量の計算
    // listFiles でルート配下の全ファイルを取得してサイズを合計
    // 注意: maxKeys=500 の制限があるため、大量ファイルがある組織では近似値になる場合がある
    let storageSizeBytes = 0;
    try {
      const files = await storageService.listFiles(org.organization_id, '', 1000);
      storageSizeBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    } catch (err) {
      logger.warn(`[organizationService] ストレージ使用量取得失敗: organizationId=${org.organization_id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 公開用スキーマ（PostgreSQL）の容量を加算
    const s3Bytes = storageSizeBytes;
    let schemaSizeBytes = 0;
    try {
      schemaSizeBytes = await getSchemaStorageSizeBytes(org.organization_id);
      storageSizeBytes += schemaSizeBytes;
    } catch (err) {
      logger.warn(`[organizationService] 公開用スキーマ容量取得失敗: organizationId=${org.organization_id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // デバッグ用: ストレージ使用量の内訳をコンソール出力
    console.info(
      `[downloadOrganizationsInformation] organizationId=${org.organization_id}\n` +
      `  swift/S3  : ${s3Bytes}B (${(s3Bytes / 1024).toFixed(2)}KB / ${(s3Bytes / 1048576).toFixed(2)}MB / ${(s3Bytes / 1073741824).toFixed(4)}GB)\n` +
      `  schema    : ${schemaSizeBytes}B (${(schemaSizeBytes / 1024).toFixed(2)}KB / ${(schemaSizeBytes / 1048576).toFixed(2)}MB / ${(schemaSizeBytes / 1073741824).toFixed(4)}GB)\n` +
      `  total     : ${storageSizeBytes}B (${(storageSizeBytes / 1024).toFixed(2)}KB / ${(storageSizeBytes / 1048576).toFixed(2)}MB / ${(storageSizeBytes / 1073741824).toFixed(4)}GB)\n` +
      `  storageSizeGb (toFixed 2) : ${(storageSizeBytes / 1073741824).toFixed(2)}`
    );

    // バイト → GB 変換（小数点2桁）
    const storageSizeGb = (storageSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    const storageDisplay = `${storageSizeGb}GB`;

    // プロジェクト数表示（分母なし）
    const projectDisplay = `${org.project_count}`;

    // アクティブユーザー数表示
    const activeUserDisplay = `${org.active_user_count}/${org.total_user_count}`;

    // 契約容量（nullの場合は空文字）
    const contractCapacityDisplay = org.contract_capacity !== null && org.contract_capacity !== undefined
      ? `${Number(org.contract_capacity).toFixed(2)}GB`
      : '';

    // 契約ユーザー数（nullの場合は空文字）
    const contractedUsersDisplay = org.contract_users !== null && org.contract_users !== undefined
      ? `${org.contract_users}`
      : '';

    // 契約プロジェクト数（nullの場合は空文字）
    const contractedProjectsDisplay = org.contract_projects !== null && org.contract_projects !== undefined
      ? `${org.contract_projects}`
      : '';

    if (lang === 'en') {
      (rows as OrganizationInformationCsvRowEn[]).push({
        'Organization CD': org.organization_cd || '',
        'Organization Display Name': org.organization_display_name || '',
        'Organization E-mail': org.organization_email || '',
        'Chief System Administrator': org.chief_user_name || '',
        'Corporation Name': org.corporation_name || '',
        'Contract Capacity': contractCapacityDisplay,
        'Contracted Users': contractedUsersDisplay,
        'Contracted Projects': contractedProjectsDisplay,
        'Storage Usage': storageDisplay,
        'Projects': projectDisplay,
        'Active Users': activeUserDisplay,
      });
    } else {
      (rows as OrganizationInformationCsvRowJa[]).push({
        '組織CD': org.organization_cd || '',
        '組織表示名': org.organization_display_name || '',
        '組織e-mail': org.organization_email || '',
        '代表システム管理者': org.chief_user_name || '',
        '会社名': org.corporation_name || '',
        '契約容量': contractCapacityDisplay,
        '契約ユーザー数': contractedUsersDisplay,
        '契約プロジェクト数': contractedProjectsDisplay,
        'ストレージ使用量': storageDisplay,
        'プロジェクト数': projectDisplay,
        'アクティブユーザー数': activeUserDisplay,
      });
    }
  }

  return rows;
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
        message: getMessage(lang, 'organization.csv.cdRequired', { row: String(rowNumber) }),
      });
      break;
    }
    
    if (!organizationDisplayName) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_display_name',
        message: getMessage(lang, 'organization.csv.displayNameRequired', { row: String(rowNumber) }),
      });
      break;
    }
    
    if (!organizationEmail) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_email',
        message: getMessage(lang, 'organization.csv.emailRequired', { row: String(rowNumber) }),
      });
      break;
    }
    
    if (!chiefUserName) {
      validationErrors.push({
        row: rowNumber,
        field: 'chief_user_name',
        message: getMessage(lang, 'organization.csv.chiefUserNameRequired', { row: String(rowNumber) }),
      });
      break;
    }
    
    if (!chiefUserEmail) {
      validationErrors.push({
        row: rowNumber,
        field: 'chief_user_email',
        message: getMessage(lang, 'organization.csv.chiefUserEmailRequired', { row: String(rowNumber) }),
      });
      break;
    }
    
    // 型チェック（is_entry）
    const isEntryStr = row['is_entry']?.trim();
    if (isEntryStr && !['0', '1', ''].includes(isEntryStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'is_entry',
        message: getMessage(lang, 'organization.csv.isEntryInvalid', { row: String(rowNumber) }),
      });
      break;
    }
    
    // 型チェック（use_deemed_progress）
    const useDeemedProgressStr = row['use_deemed_progress']?.trim();
    if (useDeemedProgressStr &&
        !['true', 'TRUE', '1', 'false', 'FALSE', '0', ''].includes(useDeemedProgressStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'use_deemed_progress',
        message: getMessage(lang, 'organization.csv.useDeemedProgressInvalid', { row: String(rowNumber) }),
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
        message: getMessage(lang, 'organization.csv.isActiveInvalid', { row: String(rowNumber) }),
      });
      break;
    }
    
    // CSV内重複チェック（organization_cd）
    const lowerCaseCd = organizationCd.toLowerCase();
    if (organizationCdSet.has(lowerCaseCd)) {
      validationErrors.push({
        row: rowNumber,
        field: 'organization_cd',
        message: getMessage(lang, 'organization.csv.cdDuplicateInCsv', { row: String(rowNumber), cd: organizationCd }),
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
        message: getMessage(lang, 'organization.csv.cdAlreadyExists', { row: String(rowNumber), cd: organizationCd }),
      });
      break;
    }
    
    // corporation_name存在チェック（指定されている場合のみ）
    const corporationName = row['corporation_name']?.trim();
    if (corporationName) {
      const pgp = getPgp();
      const findByNameQuery = await loadSqlFile('corporations/findByName.sql');
      const corpResult = await pgp.oneOrNone(findByNameQuery, [corporationName]);
      
      if (!corpResult) {
        validationErrors.push({
          row: rowNumber,
          field: 'corporation_name',
          message: getMessage(lang, 'organization.csv.corporationNotFound', { row: String(rowNumber), name: corporationName }),
        });
        break;
      }
    }

    // 数値チェック（contract_capacity）
    const contractCapacityStr = row['contract_capacity']?.trim();
    if (contractCapacityStr && !/^\d+$/.test(contractCapacityStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'contract_capacity',
        message: getMessage(lang, 'organization.csv.contractCapacityNotNumber', { row: String(rowNumber) }),
      });
      break;
    }

    // 数値チェック（contract_users）
    const contractedUsersStr = row['contract_users']?.trim();
    if (contractedUsersStr && !/^\d+$/.test(contractedUsersStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'contract_users',
        message: getMessage(lang, 'organization.csv.contractUsersNotNumber', { row: String(rowNumber) }),
      });
      break;
    }

    // 数値チェック（contract_projects）
    const contractedProjectsStr = row['contract_projects']?.trim();
    if (contractedProjectsStr && !/^\d+$/.test(contractedProjectsStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'contract_projects',
        message: getMessage(lang, 'organization.csv.contractProjectsNotNumber', { row: String(rowNumber) }),
      });
      break;
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
      
      // use_deemed_progressの変換
      const useDeemedProgressStr = row['use_deemed_progress']?.trim();
      const useDeemedProgress = useDeemedProgressStr === 'false' || useDeemedProgressStr === 'FALSE' || useDeemedProgressStr === '0' ? false : true;

      // is_activeの変換
      const isActiveStr = row['is_active']?.trim();
      const isActive = isActiveStr === 'true' || isActiveStr === 'TRUE' || isActiveStr === '1';
      
      // corporation_nameからcorporation_idを取得
      let corporationId: string | undefined = undefined;
      if (corporationName) {
        const pgp = getPgp();
        const findByNameQuery = await loadSqlFile('corporations/findByName.sql');
        const corpResult = await pgp.oneOrNone<{ corporation_id: string }>(findByNameQuery, [corporationName]);
        corporationId = corpResult?.corporation_id;
      }
      
      // 契約情報の変換（空文字・未入力はnull）
      const contractCapacityStr = row['contract_capacity']?.trim();
      const contractedUsersStr = row['contract_users']?.trim();
      const contractedProjectsStr = row['contract_projects']?.trim();
      const contractCapacity = contractCapacityStr ? Number(contractCapacityStr) : null;
      const contractedUsers = contractedUsersStr ? Number(contractedUsersStr) : null;
      const contractedProjects = contractedProjectsStr ? Number(contractedProjectsStr) : null;

      // createOrganization関数を使用（組織追加ダイアログと同じ処理）
      // パスワードはcreateOrganization内でランダム自動生成される
      const newOrgData: Parameters<typeof createOrganization>[0] = {
        organizationId: uuidv4(),
        organizationCd,
        organizationDisplayName,
        organizationEmail,
        chiefUserName,
        chiefUserEmail,
        corporationId,
        isEntry,
        useDeemedProgress,
        isActive,
        contractCapacity,
        contractedUsers,
        contractedProjects,
      };
      await createOrganization(newOrgData, userId, lang);
      
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
