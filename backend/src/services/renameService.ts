/**
 * renameService
 *
 * ファイルリネームのビジネスロジック
 * - S3上でのコピー → 削除による実質的なリネーム
 * - file_metadata テーブルの更新
 * - バリデーション（拡張子変更禁止・同名ファイル重複チェック）
 */

import { getStorageService } from './storageService';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';

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
