/**
 * MAIMLアーカイブ処理ヘルパー
 *
 * 既存MAIMLファイルをarchiveフォルダに連番バックアップする処理を提供。
 * maimlService.ts / fileAccessService.ts から共通利用する。
 *
 * アーカイブ命名規則: {baseName}_v{n}.maiml（s3_structure.md 準拠）
 */

import { getStorageService } from '../services/storageService';

/**
 * 既存MAIMLファイルをarchiveフォルダにバックアップする
 *
 * @param filePath     バックアップ元ファイルのストレージ相対パス（例: projects/sample/sample.maiml）
 * @param organizationId 組織ID
 * @returns バックアップ先パス（成功時）または null（ファイル不存在・失敗時）
 */
export async function createMaimlBackup(
  filePath: string,
  organizationId: string
): Promise<string | null> {
  const storageService = getStorageService();
  try {
    // 1. ファイル存在確認
    const exists = await storageService.fileExists(organizationId, filePath);
    console.log(filePath, exists);
    if (!exists) {
      return null;
    }

    // 2. パス解析
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop(); // sample_project.maiml
    const dirPath = pathParts.join('/'); // projects/sample_project

    if (!fileName) {
      console.warn('⚠️ [maimlArchiveHelper] ファイル名が取得できません:', filePath);
      return null;
    }

    const baseName = fileName.replace('.maiml', ''); // sample_project

    // 3. archiveフォルダパス生成
    const archivePath = `${dirPath}/archive`;

    // 4. archive内の既存バックアップファイルを取得して最大バージョン番号を算出
    // 命名規則: {baseName}_v{n}.maiml （s3_structure.md 規約準拠）
    let maxNumber = 0;
    try {
      const files = await storageService.listFiles(organizationId, archivePath);

      // baseName_v{n}.maiml パターンのファイルから最大バージョン番号を取得
      const pattern = new RegExp(
        `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`
      );
      files.forEach((file: any) => {
        const name = file.key.split('/').pop();
        if (name) {
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      console.log(`📊 [maimlArchiveHelper] archive内の既存バックアップ最大バージョン番号: ${maxNumber}`);
    } catch {
      // archiveフォルダが存在しない場合は v1 から開始
      console.log('📁 [maimlArchiveHelper] archiveフォルダが存在しないため、v1から開始');
    }

    // 5. 新しいバックアップファイル名生成（_v{n} 形式）
    const newNumber = maxNumber + 1;
    const backupFileName = `${baseName}_v${newNumber}.maiml`;
    const backupPath = `${archivePath}/${backupFileName}`;

    // 6. 既存ファイルを取得
    const buffer = await storageService.downloadFile(organizationId, filePath);

    // 7. バックアップ保存（uploadedBy: 'system' を渡して file_metadata を自動登録）
    await storageService.uploadFile(organizationId, backupPath, buffer, { uploadedBy: 'system' });

    console.log('📋 [maimlArchiveHelper] バックアップ作成:', backupPath);
    return backupPath;
  } catch (error) {
    console.warn('⚠️ [maimlArchiveHelper] バックアップ作成失敗:', error);
    // バックアップ失敗は警告のみ（保存処理は継続）
    return null;
  }
}
