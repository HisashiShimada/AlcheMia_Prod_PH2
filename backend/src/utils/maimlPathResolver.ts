/**
 * MAIMLファイルパス解決ユーティリティ
 *
 * @description
 * project_uuid → file_metadata.file_key の順でMAIMLファイルのストレージ相対パスを解決する。
 * project_uuid が未設定、または file_metadata に該当レコードがない場合は
 * project_name ベースのパス（`projects/{projectName}/{projectName}.maiml`）にフォールバックする。
 *
 * 複数のサービスから共通利用できるよう utils/ に配置する。
 *
 * @module maimlPathResolver
 * @version 1.0.0
 * @date 2026-04-15
 */

import * as projectRepository from '../repositories/projectRepository';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { logger } from './logger';

/**
 * MAIMLファイルのストレージ相対パスを解決する
 *
 * project_uuid が設定されている場合は file_metadata テーブルから file_key を取得する。
 * project_uuid が未設定、または file_metadata に該当レコードがない場合は
 * project_name ベースのパス（`projects/{projectName}/{projectName}.maiml`）にフォールバックする。
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param projectName - プロジェクト名（フォールバック用）
 * @returns storageService.downloadFile に渡す相対パス
 */
export async function resolveMaimlFilePath(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<string> {
  const nameRow = await projectRepository.findNameAndUuidById(organizationId, projectId);
  const projectUuid = nameRow?.project_uuid ?? null;

  if (projectUuid) {
    const fileMetadataRepo = new FileMetadataRepository();
    const meta = await fileMetadataRepo.findMaimlByProjectUuid(projectUuid);
    if (meta) {
      // file_key は "{organizationId}/..." 形式のフルキー
      // storageService.downloadFile は組織プレフィックスを除いた相対パスを受け取る
      const filePath = meta.file_key.startsWith(`${organizationId}/`)
        ? meta.file_key.slice(`${organizationId}/`.length)
        : meta.file_key;
      logger.info('[maimlPathResolver] file_metadata からMAIMLパスを解決', {
        projectId,
        projectUuid,
        filePath,
      });
      return filePath;
    }
    // file_metadata に未登録の場合はフォールバック
    logger.warn('[maimlPathResolver] file_metadata にMAIMLが未登録、project_name でフォールバック', {
      projectId,
      projectUuid,
    });
  } else {
    // project_uuid 未設定の場合はフォールバック
    logger.warn('[maimlPathResolver] project_uuid 未設定、project_name でフォールバック', {
      projectId,
    });
  }

  return `projects/${projectName}/${projectName}.maiml`;
}
