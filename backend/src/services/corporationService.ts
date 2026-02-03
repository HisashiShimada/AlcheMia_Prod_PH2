/**
 * 会社管理サービス
 * ビジネスロジック層
 */
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as corporationRepository from '../repositories/corporationRepository';
import { CorporationSearchFilters } from '../repositories/corporationRepository';
import { getPool } from '../database/db';

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
  userId: string
): Promise<CorporationResponse> {
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
  userId: string
): Promise<CorporationResponse | null> {
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
 * @param csvContent CSV文字列
 * @param userId ログインユーザーID
 * @returns アップロード結果
 */
export async function uploadCorporationsCsv(
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
        const corporationName = row['会社名']?.trim();
        
        if (!corporationName) {
          errors.push({ row: rowNumber, field: '会社名', message: '会社名は必須です' });
          failureCount++;
          continue;
        }
        
        // 状態の変換
        const statusStr = row['状態']?.trim() || 'アクティブ';
        const isActive = statusStr === 'アクティブ' || statusStr === 'true' || statusStr === '1';
        
        // 会社IDがある場合は更新、ない場合は新規作成
        const corporationId = row['会社ID']?.trim();
        
        if (corporationId) {
          // UUIDが指定されている場合は既存レコード更新を試みる
          const existing = await corporationRepository.findById(corporationId);
          
          if (existing) {
            // 既存レコードを更新
            await corporationRepository.update(corporationId, {
              corporationName,
              isActive,
            }, userId);
          } else {
            // 指定されたUUIDで新規作成
            await corporationRepository.create({
              corporationId,
              corporationName,
              isActive,
            }, userId);
          }
        } else {
          // UUIDを自動生成して新規作成
          await corporationRepository.create({
            corporationId: uuidv4(),
            corporationName,
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