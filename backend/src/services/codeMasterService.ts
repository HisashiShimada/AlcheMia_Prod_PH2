/**
 * code_master Service
 * 
 * コードマスター関連のビジネスロジックを提供
 * 
 * @module codeMasterService
 * @version 1.0.0
 * @date 2026-02-20
 */

import * as codeMasterRepository from '../repositories/codeMasterRepository';
import { logger } from '../utils/logger';

/**
 * Selectオプション型定義（フロントエンド用）
 */
export interface SelectOption {
  value: number | string;
  label: string;
}

/**
 * code_division別にSelectオプションを取得
 * 
 * @param organizationId - 組織ID
 * @param codeDivision - コード区分（例: 'experiment_condition'）
 * @returns {Promise<SelectOption[]>} Selectオプション配列
 */
export async function getSelectOptions(
  organizationId: string,
  codeDivision: string
): Promise<SelectOption[]> {
  try {
    const codeMasters = await codeMasterRepository.findByDivision(
      organizationId,
      codeDivision
    );

    // code_masterのデータをSelectOption形式に変換
    const options: SelectOption[] = codeMasters.map((cm) => ({
      value: isNaN(Number(cm.code_value)) ? cm.code_value : Number(cm.code_value),
      label: cm.code_name,
    }));

    logger.info('Code master options retrieved', {
      organizationId,
      codeDivision,
      optionsCount: options.length,
    });

    return options;
  } catch (error) {
    logger.error('Failed to retrieve code master options', {
      organizationId,
      codeDivision,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 複数のcode_divisionのSelectオプションを一括取得
 * 
 * @param organizationId - 組織ID
 * @param codeDivisions - コード区分の配列
 * @returns {Promise<Record<string, SelectOption[]>>} コード区分をキーとしたSelectオプションのマップ
 * 
 * @example
 * const options = await getMultipleSelectOptions(orgId, ['experiment_condition', 'task_status']);
 * // => { experiment_condition: [...], task_status: [...] }
 */
export async function getMultipleSelectOptions(
  organizationId: string,
  codeDivisions: string[]
): Promise<Record<string, SelectOption[]>> {
  try {
    const result: Record<string, SelectOption[]> = {};

    await Promise.all(
      codeDivisions.map(async (codeDivision) => {
        result[codeDivision] = await getSelectOptions(organizationId, codeDivision);
      })
    );

    logger.info('Multiple code master options retrieved', {
      organizationId,
      codeDivisions,
    });

    return result;
  } catch (error) {
    logger.error('Failed to retrieve multiple code master options', {
      organizationId,
      codeDivisions,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
