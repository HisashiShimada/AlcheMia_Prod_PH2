/**
 * Corporation（会社）リポジトリ
 * データベースアクセス層
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';
import { AnalysisResult } from '../types/maimlValidation';

interface maimlAnalysysResult {
  id: number;
  file_key : string;
  is_valid : boolean;
  version: number;
  namespace: string;
  errors : string;
  warnings: string;
  suggestions: string;
  statistics : string;
  processing_time: number;
  analysys_timestamp:string;
}

export async function insert(analysisResult : AnalysisResult) : Promise<maimlAnalysysResult> {
  
  const pool: Pool = getPool();
  // Step 1: Save to maiml_analysis_results table
  const analysisQuery = `
    INSERT INTO maiml_analysis_results (
      file_key, is_valid, version, namespace, 
      errors, warnings, suggestions, statistics,
      processing_time, analysis_timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (file_key) 
    DO UPDATE SET
      is_valid = EXCLUDED.is_valid,
      version = EXCLUDED.version,
      namespace = EXCLUDED.namespace,
      errors = EXCLUDED.errors,
      warnings = EXCLUDED.warnings,
      suggestions = EXCLUDED.suggestions,
      statistics = EXCLUDED.statistics,
      processing_time = EXCLUDED.processing_time,
      analysis_timestamp = EXCLUDED.analysis_timestamp,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id;
  `;

  const analysisValues = [
    analysisResult.fileKey,
    analysisResult.isValid,
    analysisResult.version,
    analysisResult.namespace,
    JSON.stringify(analysisResult.errors),
    JSON.stringify(analysisResult.warnings),
    JSON.stringify(analysisResult.suggestions),
    JSON.stringify(analysisResult.statistics),
    analysisResult.processingTime,
    analysisResult.timestamp
  ];

  try {
    const result = await pool.query<maimlAnalysysResult>(analysisQuery, analysisValues);
    console.log('Query executed successfully, rows:', result.rows.length);
    return result.rows[0];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}