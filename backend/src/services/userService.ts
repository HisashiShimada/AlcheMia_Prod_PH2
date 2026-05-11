/**
 * ユーザー管理サービス
 * ビジネスロジック層
 */

import * as userRepository from '../repositories/userRepository';
import { EmailService } from './emailService';
import { UserRow } from '../repositories/userRepository';
import { getMessage } from '../utils/messages';
import { UserSearchFilters } from '../types/database';
import Papa from 'papaparse';
import { getPgp } from '../database/db';
import { AppError, E1004, E1005 } from '../enums/errorCodes';

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
 * ユーザー一覧取得
 */
export async function getUsers(
  organizationId: string,
  filters: UserSearchFilters = {}
): Promise<UserRow[]> {
  try {
    return await userRepository.findAll(organizationId, filters);
  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error);
    throw new Error('ユーザー一覧の取得に失敗しました');
  }
}

/**
 * ユーザー詳細取得
 */
export async function getUserById(
  organizationId: string,
  userId: string
): Promise<UserRow | null> {
  try {
    return await userRepository.findById(organizationId, userId);
  } catch (error) {
    console.error('ユーザー詳細取得エラー:', error);
    throw new Error('ユーザー詳細の取得に失敗しました');
  }
}

/**
 * ユーザー新規作成
 */
export async function createUser(
  organizationId: string,
  data: {
    userId: string;
    userName: string;
    mailAddress: string;
    departmentCd?: string;
    roleCd: string;
    isActive?: boolean;
  },
  createUserId: string
): Promise<UserRow> {
  // バリデーション
  if (!data.userId || !data.userName || !data.mailAddress || !data.roleCd) {
    throw new AppError(E1004, 'Required fields are missing.');
  }

  // メールアドレス形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.userId) || !emailRegex.test(data.mailAddress)) {
    throw new AppError(E1005, 'Invalid email address format.');
  }

  // 重複チェック
  const exists = await userRepository.existsById(organizationId, data.userId);
  if (exists) {
    throw new AppError('USER_ALREADY_EXISTS', getMessage('ja', 'user.duplicateUserId'));
  }

  // ランダムパスワードを自動生成
  const plainPassword = generateRandomPassword();

  try {
    const user = await userRepository.create(
      organizationId,
      {
        userId: data.userId,
        userName: data.userName,
        mailAddress: data.mailAddress,
        departmentCd: data.departmentCd || null,
        roleCd: data.roleCd,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      plainPassword,
      createUserId
    );

    // アカウント作成完了メールを送信
    // 本番環境では常に送信、開発環境では EMAIL_ENABLED=true の場合のみ送信
    // 失敗してもユーザー作成自体は成功とする
    try {
      const shouldSendEmail =
        process.env.NODE_ENV === 'production' ||
        process.env.EMAIL_ENABLED === 'true';

      if (shouldSendEmail) {
        const emailService = new EmailService();
        const result = await emailService.sendUserCreated(
          data.mailAddress,
          data.mailAddress,
          plainPassword
        );
        if (result.success) {
          console.log(`[userService] アカウント作成完了メール送信成功: userId=${data.mailAddress}`);
        } else {
          console.warn(`[userService] アカウント作成完了メール送信失敗（ユーザー作成は成功）: userId=${data.mailAddress}`, result.error);
        }
      } else {
        console.log(`[userService] アカウント作成完了メール（EMAIL_ENABLED=false スキップ）: userId=${data.mailAddress}, password=${plainPassword}`);
      }
    } catch (emailError) {
      console.warn(`[userService] アカウント作成完了メール送信で例外発生（ユーザー作成は成功）`, emailError);
    }

    return user;
  } catch (error) {
    console.error('ユーザー作成エラー（詳細）:', error);
    console.error('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし');
    console.error('作成しようとしたデータ:', {
      userId: data.userId,
      userName: data.userName,
      departmentCd: data.departmentCd,
      roleCd: data.roleCd,
      organizationId,
    });
    
    // 元のエラーメッセージも含める
    if (error instanceof Error) {
      throw new Error(`ユーザーの作成に失敗しました: ${error.message}`);
    }
    throw error;
  }
}

/**
 * ユーザー更新
 */
export async function updateUser(
  organizationId: string,
  userId: string,
  data: {
    userName?: string;
    departmentCd?: string;
    roleCd?: string;
    isActive?: boolean;
  },
  updateUserId: string
): Promise<UserRow> {
  // 存在チェック
  const existsForUpdate = await userRepository.findById(organizationId, userId);
  if (!existsForUpdate) {
    throw new AppError('USER_NOT_FOUND', 'User not found');
  }

  try {
    const result = await userRepository.update(
      organizationId,
      userId,
      data,
      updateUserId
    );

    if (!result) {
      throw new Error('ユーザーの更新に失敗しました');
    }

    return result;
  } catch (error) {
    console.error('ユーザー更新エラー:', error);
    throw new Error('ユーザーの更新に失敗しました');
  }
}

/**
 * ユーザーアクティブ状態更新
 */
export async function updateUserStatus(
  organizationId: string,
  userId: string,
  isActive: boolean,
  updateUserId: string
): Promise<UserRow> {
  // 存在チェック
  const existsForStatus = await userRepository.findById(organizationId, userId);
  if (!existsForStatus) {
    throw new AppError('USER_NOT_FOUND', 'User not found');
  }

  try {
    const result = await userRepository.updateStatus(
      organizationId,
      userId,
      isActive,
      updateUserId
    );

    if (!result) {
      throw new Error('ユーザーステータスの更新に失敗しました');
    }

    return result;
  } catch (error) {
    console.error('ユーザーステータス更新エラー:', error);
    throw new Error('ユーザーステータスの更新に失敗しました');
  }
}

/**
 * CSVデータ生成
 */
export function generateCSV(users: UserRow[]): string {
  const headers = [
    'ユーザー名',
    'メールアドレス',
    '所属部署',
    'ロール',
    '最終ログイン',
    'アクティブ判定',
  ];

  const rows = users.map((user) => [
    user.user_name,
    user.mail_address,
    user.department_cd || '',
    user.role_cd,
    user.last_login_at ? new Date(user.last_login_at).toLocaleString('ja-JP') : '',
    user.is_active ? 'true' : 'false',
  ]);

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
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
 * UserCSVアップロード処理
 * 
 * 事前バリデーション方式（部署管理画面と同じパターン）：
 * 1. 全行をバリデーション（最初のエラーで停止）
 * 2. エラーがなければ全件をDB登録（トランザクション）
 * 
 * @param organizationId 組織ID
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadUsersFromCSV(
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
  const mailAddressSet = new Set<string>(); // CSV内重複チェック用
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const userName = row['ユーザー名']?.trim();
    const mailAddress = row['メールアドレス']?.trim();
    const roleCd = row['ロール']?.trim();
    
    if (!userName) {
      validationErrors.push({
        row: rowNumber,
        field: 'ユーザー名',
        message: getMessage(lang, 'user.csv.userNameRequired', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    if (!mailAddress) {
      validationErrors.push({
        row: rowNumber,
        field: 'メールアドレス',
        message: getMessage(lang, 'user.csv.mailAddressRequired', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    if (!roleCd) {
      validationErrors.push({
        row: rowNumber,
        field: 'ロール',
        message: getMessage(lang, 'user.csv.roleCdRequired', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mailAddress)) {
      validationErrors.push({
        row: rowNumber,
        field: 'メールアドレス',
        message: getMessage(lang, 'user.csv.mailAddressInvalid', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // アクティブ判定の型チェック
    const isActiveStr = row['アクティブ判定']?.trim();
    if (isActiveStr && 
        !['true', 'TRUE', '1', 'false', 'FALSE', '0', ''].includes(isActiveStr)) {
      validationErrors.push({
        row: rowNumber,
        field: 'アクティブ判定',
        message: getMessage(lang, 'user.csv.isActiveInvalid', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // CSV内重複チェック
    if (mailAddressSet.has(mailAddress)) {
      validationErrors.push({
        row: rowNumber,
        field: 'メールアドレス',
        message: getMessage(lang, 'user.csv.mailAddressDuplicateInCsv', { row: String(rowNumber), mail: mailAddress }),
      });
      break; // 最初のエラーで停止
    }
    mailAddressSet.add(mailAddress);
    
    // 既存データチェック（主キー重複チェック）
    const exists = await userRepository.existsById(organizationId, mailAddress);
    if (exists) {
      validationErrors.push({
        row: rowNumber,
        field: 'メールアドレス',
        message: getMessage(lang, 'user.csv.mailAddressAlreadyExists', { row: String(rowNumber), mail: mailAddress }),
      });
      break; // 最初のエラーで停止
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
  const pgp = getPgp();
  let successCount = 0;
  
  await pgp.tx(async (_t) => {
    // 全行を新規作成（バリデーションで既存チェック済み）
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      
      // バリデーション済みなのでtrim()のみ実施
      const userName = row['ユーザー名'].trim();
      const mailAddress = row['メールアドレス'].trim();
      const departmentCd = row['所属部署']?.trim() || null;
      const roleCd = row['ロール'].trim();
      
      // アクティブ判定の変換（boolean型対応）
      const isActiveStr = row['アクティブ判定']?.trim();
      const isActive = isActiveStr === 'true' || isActiveStr === 'TRUE' || isActiveStr === '1';
      
      // ランダムパスワードを自動生成
      const plainPassword = generateRandomPassword();
      
      // 新規作成（ユーザーIDはメールアドレスと同じ）
      await userRepository.create(
        organizationId,
        {
          userId: mailAddress,  // メールアドレスをユーザーIDとして使用
          userName,
          mailAddress,
          departmentCd,
          roleCd,
          isActive,
        },
        plainPassword,  // 自動生成したランダムパスワードを使用
        userId
      );

      // アカウント作成完了メールを送信
      // 本番環境では常に送信、開発環境では EMAIL_ENABLED=true の場合のみ送信
      // 失敗しても処理は継続する
      try {
        const shouldSendEmail =
          process.env.NODE_ENV === 'production' ||
          process.env.EMAIL_ENABLED === 'true';

        if (shouldSendEmail) {
          const emailService = new EmailService();
          const result = await emailService.sendUserCreated(mailAddress, mailAddress, plainPassword);
          if (result.success) {
            console.log(`[userService CSV] アカウント作成完了メール送信成功: userId=${mailAddress}`);
          } else {
            console.warn(`[userService CSV] アカウント作成完了メール送信失敗: userId=${mailAddress}`, result.error);
          }
        } else {
          console.log(`[userService CSV] アカウント作成完了メール（EMAIL_ENABLED=false スキップ）: userId=${mailAddress}, password=${plainPassword}`);
        }
      } catch (emailError) {
        console.warn(`[userService CSV] アカウント作成完了メール送信で例外発生（処理は継続）`, emailError);
      }

      successCount++;
    }
  });
  
  return {
    successCount,
    failureCount: 0,
    errors: [],
  };
}
