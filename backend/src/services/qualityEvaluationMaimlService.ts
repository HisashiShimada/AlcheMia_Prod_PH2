/**
 * qualityEvaluationMaimlService.ts
 *
 * 品質評価データを MAiML ファイルの <eventLog> セクションに書き込む
 * オーケストレーションサービス。
 *
 * @module qualityEvaluationMaimlService
 * @version 1.0.0
 */

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { extractUuidsFromMaiml } from '../utils/maimlUuidExtractor';
import { findNamespacesByOrganization } from '../repositories/namespaceTermRepository';
import {
  buildEventLogXML,
  replaceEventLogInMaiml,
  updateDocumentUuidAndParent,
  injectNamespaceDeclarations,
} from '../utils/maimlDataWriter';
import type { EventLogJsonRecord } from '../utils/maimlDataWriter';
import type { EventLogRow } from './maimlWriterService';
import {
  resolveTransitionToInstructionMap,
  resolveInstructionToResultsMap,
  buildQualityEvalLogEntries,
  removeUncertaintiesWrapper,
} from '../utils/maimlQualityWriter';
import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import * as projectOverallEvaluationRepository from '../repositories/projectOverallEvaluationRepository';
import * as projectRepository from '../repositories/projectRepository';
import type { ExportToMaimlResult } from '../types/projectOverallEvaluation';

/**
 * 品質評価データを MAiML ファイルの <eventLog> に書き込む
 *
 * 既存の作業進捗ログ（maiml_event_log テーブル）と品質評価ログをマージして
 * <eventLog> を更新する。MAiML ファイルが存在しない場合はスキップ（warning ログ）。
 *
 * @param organizationId - 組織ID（マルチテナント分離）
 * @param projectId      - プロジェクトID
 * @returns ExportToMaimlResult
 */
export async function exportQualityEvaluationToMaiml(
  organizationId: string,
  projectId: string
): Promise<ExportToMaimlResult> {
  const storageService = getStorageService();
  const pool = getPool();

  // 1. プロジェクト情報取得 & MAiML ファイルパス解決
  const projectInfo = await projectRepository.findNameAndUuidById(organizationId, projectId);
  if (!projectInfo) {
    const err = new Error('Project not found') as Error & { code: string };
    err.code = 'E6001';
    throw err;
  }

  const filePath = await resolveMaimlFilePath(organizationId, projectId, projectInfo.project_name);
  const fileExists = await storageService.fileExists(organizationId, filePath);

  if (!fileExists) {
    console.warn(
      `[qualityEvaluationMaimlService] MAiML ファイルが存在しないためスキップ: ${filePath}`
    );
    return { written: 0, message: 'MAiML file not found, skipped', skipped: true };
  }

  // 2. MAiML ファイルをダウンロード
  const fileBuffer = await storageService.downloadFile(organizationId, filePath);
  let maimlXml = fileBuffer.toString('utf-8');

  // 3. <Uncertainties> ラッパーを除去し <Uncertainty> を直置き
  maimlXml = removeUncertaintiesWrapper(maimlXml);

  // 4. transition → instruction / instruction → results の ref マッピング解決
  const transToInstMap = resolveTransitionToInstructionMap(maimlXml);
  const instToResultsMap = resolveInstructionToResultsMap(maimlXml);

  // 5. DB から評価データを取得
  const evaluations = await experimentEvaluationRepository.findByProject(organizationId, projectId);
  const overallEvals = await projectOverallEvaluationRepository.findByProject(organizationId, projectId);
  const latestOverallEval = overallEvals.length > 0 ? overallEvals[0] : null;

  // 6. 品質評価 EventLogJsonRecord[] を生成
  const qualityEntries = buildQualityEvalLogEntries(
    evaluations,
    latestOverallEval,
    transToInstMap,
    instToResultsMap
  );

  // 7. 既存 maiml_event_log エントリを取得してマージ
  const findAllEventLogSql = await loadSqlFile('event_log/findAllByProject.sql');
  const eventLogResult = await pool.query<EventLogRow>(findAllEventLogSql, [organizationId, projectId]);
  const existingLogEntries: EventLogJsonRecord[] = eventLogResult.rows.map((row) => row.log);
  const mergedLogEntries: EventLogJsonRecord[] = [...existingLogEntries, ...qualityEntries];

  // 8. <eventLog> ID を既存 XML から抽出
  const eventLogIdMatch = maimlXml.match(/<eventLog[^>]*\sid="([^"]+)"/);
  const eventLogId = eventLogIdMatch ? eventLogIdMatch[1] : 'eventLogID';

  // 9. 既存 UUID マッピングを抽出（UUID 再利用のため）
  const existingUuids = extractUuidsFromMaiml(maimlXml);

  // 10. <eventLog> XML を生成
  const eventLogXml = buildEventLogXML(mergedLogEntries, eventLogId, existingUuids);

  // 11. 既存 <eventLog> を置き換え
  let updatedMaiml = replaceEventLogInMaiml(maimlXml, eventLogXml);

  // 12. 名前空間宣言を注入
  const namespaces = await findNamespacesByOrganization(organizationId);
  updatedMaiml = injectNamespaceDeclarations(updatedMaiml, namespaces);

  // 13. document UUID を更新し旧 UUID を <parent> に記録
  updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);

  // 14. アーカイブ作成
  await _createArchive(storageService, organizationId, filePath, fileBuffer);

  // 15. 更新済み MAiML を保存
  await storageService.uploadFile(
    organizationId,
    filePath,
    Buffer.from(updatedMaiml, 'utf-8'),
    { contentType: 'application/xml', uploadedBy: 'system' }
  );

  const writtenCount = qualityEntries.length;
  console.log(
    `[qualityEvaluationMaimlService] MAiML 更新完了: ` +
      `organizationId=${organizationId}, projectId=${projectId}, ` +
      `品質評価エントリ=${writtenCount}件`
  );

  return {
    written: writtenCount,
    message: `${writtenCount} quality evaluation log entries written to MAiML eventLog`,
  };
}

/**
 * MAiML ファイルのアーカイブを作成する（内部ヘルパー）
 */
async function _createArchive(
  storageService: ReturnType<typeof getStorageService>,
  organizationId: string,
  filePath: string,
  fileBuffer: Buffer
): Promise<void> {
  try {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const dirPath = pathParts.slice(0, -1).join('/');
    const baseName = fileName.replace(/\.maiml$/i, '');
    const archivePath = `${dirPath}/archive`;

    let maxVersion = 0;
    try {
      const archiveFiles = await storageService.listFiles(organizationId, archivePath);
      const pattern = new RegExp(
        `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`
      );
      archiveFiles.forEach((file: { key: string }) => {
        const name: string = (file.key || '').split('/').pop() ?? '';
        const match = name.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxVersion) maxVersion = num;
        }
      });
    } catch (_listErr) {
      // archive フォルダが存在しない場合は v1 から開始
    }

    const newVersion = maxVersion + 1;
    const backupPath = `${archivePath}/${baseName}_v${newVersion}.maiml`;

    await storageService.uploadFile(organizationId, backupPath, fileBuffer, {
      contentType: 'application/xml',
      uploadedBy: 'system',
    });

    console.log(`[qualityEvaluationMaimlService] アーカイブ作成: ${backupPath}`);
  } catch (archiveError) {
    console.warn('[qualityEvaluationMaimlService] アーカイブ作成失敗（処理は継続）:', archiveError);
  }
}

