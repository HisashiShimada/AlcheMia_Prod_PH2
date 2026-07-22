/**
 * experimentEvaluation Service
 *
 * 実験評価に関するビジネスロジック
 *
 * @remarks
 * experiment_evaluation テーブルへの読み書きおよび
 * MAiML ファイルへの評価データ書き出しロジックを提供する。
 *
 * @module experimentEvaluationService
 * @version 1.0.0
 */

import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import type { UpsertEvaluationInput, ExperimentEvaluation, ExperimentEvaluationRow } from '../repositories/experimentEvaluationRepository';
import * as projectRepository from '../repositories/projectRepository';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { getStorageService } from './storageService';

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveEvaluations の入力型（リクエストボディの評価1件分）
 */
export interface EvaluationInput {
  evaluationUnit: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  nameSpaceId: string;
  uncertaintyKey: string;
  ucVersion: number;
  evaluationValue?: string;
  comment?: string;
  uncertaintyXml?: Record<string, unknown>;
}

/**
 * exportToMaiml の戻り値型
 */
export interface ExportToMaimlResult {
  written: number;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * プロジェクトの評価結果一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 評価結果一覧
 */
export async function getByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentEvaluationRow[]> {
  return experimentEvaluationRepository.findByProject(organizationId, projectId);
}

/**
 * 評価結果を一括UPSERT（保存）する
 *
 * @param organizationId - 組織ID
 * @param userId - 操作ユーザーID
 * @param projectId - プロジェクトID
 * @param evaluations - 評価データ配列
 * @returns 保存後の評価結果配列
 */
export async function saveEvaluations(
  organizationId: string,
  userId: string | undefined,
  projectId: string,
  evaluations: EvaluationInput[]
): Promise<ExperimentEvaluation[]> {
  const now = new Date();

  const inputs: UpsertEvaluationInput[] = evaluations.map((e) => {
    const input: UpsertEvaluationInput = {
      organization_id: organizationId,
      project_id: projectId,
      evaluation_unit: e.evaluationUnit,
      method_id: e.methodId ?? null,
      task_no: e.taskNo ?? null,
      transition_id: e.transitionId ?? null,
      name_space_id: e.nameSpaceId,
      uncertainty_key: e.uncertaintyKey,
      uc_version: e.ucVersion,
      evaluation_value: e.evaluationValue ?? null,
      comment: e.comment ?? null,
      uncertainty_xml: e.uncertaintyXml ?? null,
      evaluated_by: userId ?? null,
      evaluated_at: now,
      user_id: userId ?? '',
    };
    return input;
  });

  return experimentEvaluationRepository.upsertEvaluations(inputs);
}

/**
 * DBの評価データを MAiML ファイルへ一括書き込み（プロジェクト完了処理）
 *
 * @remarks
 * 処理フロー:
 *   1. experiment_evaluation テーブルから対象プロジェクトの全評価データを取得
 *   2. project_uuid → file_metadata から MAiML ファイルの file_key を特定
 *   3. S3/Swift から既存の MAiML ファイルを読み込む
 *   4. 各評価レコードを <Uncertainty> タグ形式に変換して XML に追記/更新
 *   5. 更新済み XML を S3/Swift に保存（上書き）
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 書き込み結果
 * @throws MAiMLファイルが見つからない場合は Error をスロー（code: E6002）
 */
export async function exportToMaiml(
  organizationId: string,
  projectId: string
): Promise<ExportToMaimlResult> {
  // 1. 評価データを全件取得
  const evaluations = await experimentEvaluationRepository.findByProject(organizationId, projectId);
  if (evaluations.length === 0) {
    return { written: 0, message: '評価データがないため書き込みをスキップしました' };
  }

  // 2. projectId → project_uuid を取得
  const nameAndUuid = await projectRepository.findNameAndUuidById(organizationId, projectId);
  if (!nameAndUuid) {
    const err = new Error('プロジェクトが見つかりません') as Error & { code: string };
    err.code = 'E6001';
    throw err;
  }

  // 3. project_uuid → file_metadata から MAiML ファイルの file_key を特定
  const fileMetadataRepo = new FileMetadataRepository();
  let maimlFileKey: string;

  if (nameAndUuid.project_uuid) {
    // project_uuid が設定されている場合はそれで検索（正規ルート）
    const maimlFile = await fileMetadataRepo.findMaimlByProjectUuid(
      nameAndUuid.project_uuid
    );
    if (!maimlFile) {
      const err = new Error('MAiMLファイルが見つかりません') as Error & { code: string };
      err.code = 'E6002';
      throw err;
    }
    maimlFileKey = maimlFile.file_key;
  } else {
    // project_uuid が未設定の場合はプロジェクト名でフォールバック検索
    const maimlFile = await fileMetadataRepo.findMaimlByProjectName(
      organizationId,
      nameAndUuid.project_name
    );
    if (!maimlFile) {
      const err = new Error('MAiMLファイルが見つかりません') as Error & { code: string };
      err.code = 'E6002';
      throw err;
    }
    maimlFileKey = maimlFile.file_key;
  }

  // 4. MAiML ファイルを読み込む
  const storageService = getStorageService();
  let maimlBuffer: Buffer;
  try {
    maimlBuffer = await storageService.downloadFile(organizationId, maimlFileKey);
  } catch {
    const err = new Error('MAiMLファイルが見つかりません') as Error & { code: string };
    err.code = 'E6002';
    throw err;
  }

  let maimlXml = maimlBuffer.toString('utf-8');

  // 5. 評価データを <Uncertainty> タグに変換して XML に書き込む
  const uncertaintyTags = evaluations
    .filter((e) => e.evaluation_value)
    .map((e) => {
      const attrs: string = [
        `evaluationUnit="${e.evaluation_unit}"`,
        e.method_id     ? `methodId="${e.method_id}"`         : '',
        e.task_no       ? `taskNo="${e.task_no}"`             : '',
        e.transition_id ? `transitionId="${e.transition_id}"` : '',
        `nameSpaceId="${e.name_space_id}"`,
        `uncertaintyKey="${e.uncertainty_key}"`,
        `ucVersion="${e.uc_version}"`,
        `value="${e.evaluation_value}"`,
        e.evaluated_at  ? `evaluatedAt="${new Date(e.evaluated_at).toISOString()}"` : '',
      ].filter(Boolean).join(' ');

      const commentTag = e.comment
        ? `\n        <Comment>${escapeXml(e.comment)}</Comment>`
        : '';

      return `    <Uncertainty ${attrs}>${commentTag}\n    </Uncertainty>`;
    });

  if (uncertaintyTags.length > 0) {
    const uncertaintiesBlock = [
      '  <Uncertainties>',
      '    <!-- 評価処理によって書き込まれた定性評価データ -->',
      ...uncertaintyTags,
      '  </Uncertainties>',
    ].join('\n');

    // 既存の <Uncertainties> セクションがあれば置換、なければ </maiml> 直前に挿入
    if (/<Uncertainties[\s>]/i.test(maimlXml)) {
      maimlXml = maimlXml.replace(
        /<Uncertainties[\s\S]*?<\/Uncertainties>/i,
        uncertaintiesBlock
      );
    } else {
      maimlXml = maimlXml.replace(/<\/maiml>/i, `${uncertaintiesBlock}\n</maiml>`);
    }
  }

  // 6. 更新済み XML を保存（上書き）
  await storageService.uploadFile(
    organizationId,
    maimlFileKey,
    Buffer.from(maimlXml, 'utf-8'),
    { contentType: 'application/xml' }
  );

  return {
    written: uncertaintyTags.length,
    message: `${uncertaintyTags.length}件の評価データを MAiML ファイルに書き込みました`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

/** XML特殊文字エスケープ */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
