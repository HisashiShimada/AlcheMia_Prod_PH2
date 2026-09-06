/**
 * renameService
 *
 * プロジェクト名変更・ファイルリネームのビジネスロジック
 * - S3上でのコピー → 削除による実質的なリネーム
 * - file_metadata テーブルの更新
 * - バリデーション（拡張子変更禁止・同名ファイル重複チェック）
 * - project テーブルの更新
 * - maiml_asset / transition_set など関連テーブルの更新
 */

import { getStorageService } from './storageService';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import { getPool } from '../database/db';
import * as projectRepository from '../repositories/projectRepository';

// ============================================================
// renameProject
// ============================================================

export interface RenameProjectParams {
  organizationId: string;
  /** 現在のプロジェクト名 */
  oldProjectName: string;
  /** 新しいプロジェクト名 */
  newProjectName: string;
  userId: string;
}

export interface RenameProjectResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * プロジェクト名を変更する
 *
 * 以下のリソースを一括更新する：
 * 1. S3 `projects/{oldName}/` 配下を `projects/{newName}/` へ移動
 * 2. `project.project_name` 更新
 * 3. `file_metadata.file_key` 一括更新
 * 4. `maiml_asset.file_uri` 更新（存在する場合）
 * 5. `transition_set.project_name` 更新（存在する場合）
 *
 * @param params - リネームパラメータ
 * @returns リネーム結果
 */
export async function renameProject(params: RenameProjectParams): Promise<RenameProjectResult> {
  const { organizationId, oldProjectName, newProjectName, userId } = params;

  try {
    // 1. バリデーション: 変更前後が同じ場合は早期リターン
    if (oldProjectName === newProjectName) {
      return { success: true };
    }

    // 2. バリデーション: 新プロジェクト名が空でないか確認
    if (!newProjectName || newProjectName.trim() === '') {
      return {
        success: false,
        error: { code: 'E1003', message: '新しいプロジェクト名が指定されていません' },
      };
    }

    // 3. 既存プロジェクトの存在確認
    const existing = await projectRepository.findByName(organizationId, oldProjectName);
    if (!existing) {
      return {
        success: false,
        error: { code: 'E6001', message: `プロジェクトが見つかりません: ${oldProjectName}` },
      };
    }

    // 4. 新プロジェクト名の重複チェック
    const duplicate = await projectRepository.findByName(organizationId, newProjectName);
    if (duplicate) {
      return {
        success: false,
        error: { code: 'E7001', message: `同名のプロジェクトが既に存在します: ${newProjectName}` },
      };
    }

    const projectId = existing.project_id;
    const storageService = getStorageService();
    const pool = getPool();

    // ── S3 物理移動 ──────────────────────────────────────────
    // 5. 旧フォルダ配下のファイル一覧を取得
    const oldPrefix = `projects/${oldProjectName}`;
    const files = await storageService.listFiles(organizationId, oldPrefix);
    console.log(`✅ [RenameService] S3ファイル一覧取得: ${files.length}件`);

    // 6. 各ファイルを新パスへコピー → 削除
    // listFiles が返す file.key は S3 のフルキー（"{organizationId}/projects/..."）のため、
    // organizationId プレフィックスを除去して相対パスに変換してから処理する
    // （storageService.deleteFolderRecursive と同一パターン）
    const renamedFiles: Array<{ oldKey: string; newKey: string }> = [];
    for (const file of files) {
      // organizationId プレフィックスを除去して相対パスに変換
      let oldKey = file.key;
      if (oldKey.startsWith(`${organizationId}/`)) {
        oldKey = oldKey.substring(organizationId.length + 1);
      }
      const newKey = oldKey.replace(
        new RegExp(`^projects/${escapeRegExp(oldProjectName)}/`),
        `projects/${newProjectName}/`
      );
      // 同じキーへのコピーは S3 でエラーになるためスキップ
      if (oldKey === newKey) {
        console.warn(`⚠️ [RenameService] コピー元と先が同じためスキップ: ${oldKey}`);
        continue;
      }
      await storageService.copyFile(organizationId, oldKey, newKey);
      renamedFiles.push({ oldKey, newKey });
    }

    // コピーが全て成功した後に削除
    for (const { oldKey } of renamedFiles) {
      await storageService.deleteFile(organizationId, oldKey);
    }
    console.log(`✅ [RenameService] S3移動完了: ${renamedFiles.length}件`);

    // ── DB 更新（S3完了後はロールバック不可。エラーはログのみ） ────
    // 7. project.project_name 更新
    try {
      const updatedProject = {
        ...existing,
        project_name: newProjectName,
        update_user_id: userId,
      };
      await projectRepository.update(updatedProject);
      console.log(`✅ [RenameService] project テーブル更新完了`);
    } catch (err) {
      console.error(`❌ [RenameService] project テーブル更新失敗:`, err);
    }

    // 8. file_metadata.file_key 一括更新
    try {
      const oldKeyPrefix = `${organizationId}/projects/${oldProjectName}/`;
      const newKeyPrefix = `${organizationId}/projects/${newProjectName}/`;
      await pool.query(
        `UPDATE file_metadata
           SET file_key = REPLACE(file_key, $1, $2),
               parent_folder_path = REPLACE(COALESCE(parent_folder_path, ''), $1, $2),
               update_user_id = $3,
               updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = $4
           AND file_key LIKE $5`,
        [oldKeyPrefix, newKeyPrefix, userId, organizationId, `${oldKeyPrefix}%`]
      );
      console.log(`✅ [RenameService] file_metadata テーブル更新完了`);
    } catch (err) {
      console.warn(`⚠️ [RenameService] file_metadata テーブル更新失敗（処理続行）:`, err);
    }

    // 9. maiml_publish_job.project_name 更新（カラムが存在する場合）
    try {
      await pool.query(
        `UPDATE maiml_publish_job
           SET project_name = $1
         WHERE organization_id = $2
           AND project_id = $3`,
        [newProjectName, organizationId, projectId]
      );
      console.log(`✅ [RenameService] maiml_publish_job テーブル更新完了`);
    } catch (err) {
      console.warn(`⚠️ [RenameService] maiml_publish_job テーブル更新失敗（処理続行）:`, err);
    }

    // 10. maiml_asset.file_uri 更新（組織スキーマ配下）
    try {
      const oldUriPrefix = `projects/${oldProjectName}/`;
      const newUriPrefix = `projects/${newProjectName}/`;
      // 組織スキーマ（organizationId がスキーマ名）を使用
      await pool.query(
        `UPDATE "${organizationId}".maiml_asset
           SET file_uri = REPLACE(file_uri, $1, $2)
         WHERE file_uri LIKE $3`,
        [oldUriPrefix, newUriPrefix, `${oldUriPrefix}%`]
      );
      console.log(`✅ [RenameService] maiml_asset テーブル更新完了`);
    } catch (err) {
      console.warn(`⚠️ [RenameService] maiml_asset テーブル更新失敗（処理続行）:`, err);
    }

    // 11. transition_set.project_name 更新
    try {
      await pool.query(
        `UPDATE transition_set
           SET project_name = $1
         WHERE organization_id = $2
           AND project_name = $3`,
        [newProjectName, organizationId, oldProjectName]
      );
      console.log(`✅ [RenameService] transition_set テーブル更新完了`);
    } catch (err) {
      console.warn(`⚠️ [RenameService] transition_set テーブル更新失敗（処理続行）:`, err);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [RenameService] プロジェクトリネームエラー:`, error);
    return {
      success: false,
      error: {
        code: 'E4006',
        message: error.message ?? 'プロジェクト名の変更に失敗しました',
      },
    };
  }
}

/**
 * 正規表現のメタ文字をエスケープする
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export interface RenameFileParams {
  organizationId: string;
  /** 変更対象ファイルの相対パス（organizationId なし） */
  fileKey: string;
  /** 新しいファイル名（拡張子込み） */
  newFileName: string;
  userId: string;
}

export interface RenameFileResult {
  success: boolean;
  newFileKey?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * ファイルをリネームする
 *
 * @param params - リネームパラメータ
 * @returns リネーム結果
 */
export async function renameFile(params: RenameFileParams): Promise<RenameFileResult> {
  const { organizationId, fileKey, newFileName, userId } = params;

  try {
    // 1. バリデーション: ファイル名が空でないか確認
    if (!newFileName || newFileName.trim() === '') {
      return {
        success: false,
        error: {
          code: 'E1003',
          message: '新しいファイル名が指定されていません',
        },
      };
    }

    // 2. バリデーション: 拡張子の変更禁止
    const oldExt = fileKey.includes('.') ? fileKey.substring(fileKey.lastIndexOf('.')) : '';
    const newExt = newFileName.includes('.') ? newFileName.substring(newFileName.lastIndexOf('.')) : '';
    if (oldExt.toLowerCase() !== newExt.toLowerCase()) {
      return {
        success: false,
        error: {
          code: 'E1003',
          message: `ファイルの拡張子は変更できません（変更前: ${oldExt || 'なし'}、変更後: ${newExt || 'なし'}）`,
        },
      };
    }

    // 3. バリデーション: ファイル名に不正な文字が含まれていないか
    // スラッシュ、バックスラッシュ、制御文字などを禁止
    const invalidChars = /[/\\<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(newFileName)) {
      return {
        success: false,
        error: {
          code: 'E1003',
          message: 'ファイル名に使用できない文字が含まれています',
        },
      };
    }

    // 4. 新しいファイルキーを構築（同じディレクトリ、ファイル名のみ変更）
    const dirPath = fileKey.includes('/') ? fileKey.substring(0, fileKey.lastIndexOf('/')) : '';
    const newFileKey = dirPath ? `${dirPath}/${newFileName}` : newFileName;

    // 変更がない場合は成功として返す
    if (fileKey === newFileKey) {
      return { success: true, newFileKey };
    }

    const storageService = getStorageService();

    // 5. 元ファイルの存在確認
    const sourceExists = await storageService.fileExists(organizationId, fileKey);
    if (!sourceExists) {
      return {
        success: false,
        error: {
          code: 'E6002',
          message: `ファイルが見つかりません: ${fileKey}`,
        },
      };
    }

    // 6. 同名ファイルの重複チェック
    const destExists = await storageService.fileExists(organizationId, newFileKey);
    if (destExists) {
      return {
        success: false,
        error: {
          code: 'E6005',
          message: `同名のファイルが既に存在します: ${newFileName}`,
        },
      };
    }

    // 7. S3: コピー → 削除（実質的なリネーム）
    await storageService.copyFile(organizationId, fileKey, newFileKey);
    await storageService.deleteFile(organizationId, fileKey);

    console.log(`✅ [RenameService] S3リネーム完了: ${fileKey} → ${newFileKey}`);

    // 8. file_metadata テーブルの更新（存在する場合のみ）
    try {
      const repository = new FileMetadataRepository();
      await repository.updateFileMetadata(fileKey, {
        file_key: newFileKey,
        original_filename: newFileName,
        update_user_id: userId,
        updated_at: new Date(),
      });
      console.log(`✅ [RenameService] file_metadata更新完了: ${fileKey} → ${newFileKey}`);
    } catch (dbError) {
      // file_metadata の更新失敗は警告のみ（S3の変更は完了しているため処理続行）
      console.warn(`⚠️ [RenameService] file_metadata更新失敗（処理続行）:`, dbError);
    }

    return {
      success: true,
      newFileKey,
    };
  } catch (error: any) {
    console.error(`❌ [RenameService] リネームエラー:`, error);
    return {
      success: false,
      error: {
        code: 'E4006',
        message: error.message ?? 'ファイルのリネームに失敗しました',
      },
    };
  }
}
