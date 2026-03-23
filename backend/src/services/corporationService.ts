/**
 * 会社管理サービス
 * ビジネスロジック層
 */
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as corporationRepository from '../repositories/corporationRepository';
import { CorporationSearchFilters } from '../repositories/corporationRepository';
import { getPgp } from '../database/db';
import { getMessage } from '../utils/messages';

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
 * 
 * @param data Corporation情報
 * @param userId ログインユーザーID
 */
export async function createCorporation(
  data: {
    corporationName: string;
    isActive?: boolean;
  },
  userId: string,
  lang: string = 'ja'
): Promise<CorporationResponse> {
  // 会社名重複チェック
  const exists = await corporationRepository.existsByName(data.corporationName);
  if (exists) {
    const error: any = new Error(getMessage(lang, 'corporation.duplicateNameOnUpdate'));
    error.statusCode = 409;
    error.code = 'DUPLICATE_CORPORATION_NAME';
    throw error;
  }

  // UUIDを自動生成
  const corporationId = uuidv4();
  
  const corporation = await corporationRepository.create({
    corporationId,
    corporationName: data.corporationName,
    isActive: data.isActive,
  }, userId);
  
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
 * 
 * @param corporationId Corporation ID
 * @param data 更新情報
 * @param userId ログインユーザーID
 */
export async function updateCorporation(
  corporationId: string,
  data: {
    corporationName?: string;
    isActive?: boolean;
  },
  userId: string,
  lang: string = 'ja'
): Promise<CorporationResponse | null> {
  // 会社名が変更される場合は重複チェック（自身を除外）
  if (data.corporationName) {
    const exists = await corporationRepository.existsByName(data.corporationName, corporationId);
    if (exists) {
      const error: any = new Error(getMessage(lang, 'corporation.duplicateNameOnUpdate'));
      error.statusCode = 409;
      error.code = 'DUPLICATE_CORPORATION_NAME';
      throw error;
    }
  }

  const corporation = await corporationRepository.update(corporationId, data, userId);
  
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
 * 
 * @param corporationId Corporation ID
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 */
export async function updateCorporationStatus(
  corporationId: string,
  isActive: boolean,
  userId: string
): Promise<CorporationResponse | null> {
  const corporation = await corporationRepository.updateStatus(corporationId, isActive, userId);
  
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
 * CorporationCSVアップロード処理
 * 
 * 事前バリデーション方式：
 * 1. 全行をバリデーション（最初のエラーで停止）
 * 2. エラーがなければ全件をDB登録
 * 
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadCorporationsCsv(
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
  const corporationNameSet = new Set<string>(); // CSV内重複チェック用
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2; // ヘッダー行を考慮
    
    // 必須項目チェック
    const corporationName = row['corporation_name']?.trim();
    
    if (!corporationName) {
      validationErrors.push({
        row: rowNumber,
        field: 'corporation_name',
        message: getMessage(lang, 'corporation.csv.nameRequired', { row: String(rowNumber) }),
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
        message: getMessage(lang, 'corporation.csv.isActiveInvalid', { row: String(rowNumber) }),
      });
      break; // 最初のエラーで停止
    }
    
    // CSV内重複チェック（corporation_name）
    const lowerCaseName = corporationName.toLowerCase();
    if (corporationNameSet.has(lowerCaseName)) {
      validationErrors.push({
        row: rowNumber,
        field: 'corporation_name',
        message: getMessage(lang, 'corporation.csv.nameDuplicateInCsv', { row: String(rowNumber), name: corporationName }),
      });
      break; // 最初のエラーで停止
    }
    corporationNameSet.add(lowerCaseName);
    
    // 既存データチェック（corporation_name重複チェック）
    const exists = await corporationRepository.existsByName(corporationName);
    if (exists) {
      validationErrors.push({
        row: rowNumber,
        field: 'corporation_name',
        message: getMessage(lang, 'corporation.csv.nameAlreadyExists', { row: String(rowNumber), name: corporationName }),
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
  
  return await pgp.tx(async (_t) => {
    let successCount = 0;
    
    // 全行を新規作成（バリデーションで既存チェック済み）
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      
      // バリデーション済みなのでtrim()のみ実施
      const corporationName = row['corporation_name'].trim();
      
      // 状態の変換（boolean型対応）
      const isActiveStr = row['is_active']?.trim();
      const isActive = isActiveStr === 'true' || isActiveStr === 'TRUE' || isActiveStr === '1';
      
      // UUIDを自動生成して新規作成のみ（既存データは事前バリデーションでエラー）
      await corporationRepository.create({
        corporationId: uuidv4(),
        corporationName,
        isActive,
      }, userId);
      
      successCount++;
    }
    
    return {
      successCount,
      failureCount: 0,
      errors: [],
    };
  });
}
