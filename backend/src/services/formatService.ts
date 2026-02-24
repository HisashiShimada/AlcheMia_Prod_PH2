import { getStorageService } from './storageService';
import { FormatFolder, FormatFile, FileTypeFilter } from '../types/format';

/**
 * フォーマットフォルダ一覧を取得
 */
export async function getFormatFolders(
  organizationId: string,
  departmentCd: string,
  fileTypeFilter?: FileTypeFilter
): Promise<FormatFolder[]> {
  const storageService = getStorageService();

  try {
    // 1. S3の formats/{department_cd}/ 直下のすべてのファイル/フォルダを取得
    const basePath = `formats/${departmentCd}`;
    
    console.log('[formatService] getFormatFolders called:', {
      organizationId,
      departmentCd,
      basePath,
    });
    
    const allItems = await storageService.listFiles(organizationId, basePath);
    
    console.log('[formatService] listFiles result:', {
      itemCount: allItems.length,
      sampleItems: allItems.slice(0, 5).map(item => item.key),
    });

    // 2. フォルダのみを抽出（重複排除）
    const folderSet = new Set<string>();
    allItems.forEach((item) => {
      // {organizationId}/formats/{dept_cd}/xxx/... から xxx 部分（フォルダ名）を抽出
      const pathParts = item.key.split('/');
      // pathParts[0] = organizationId
      // pathParts[1] = 'formats'
      // pathParts[2] = departmentCd
      // pathParts[3] = folderName
      if (
        pathParts.length >= 4 &&
        pathParts[1] === 'formats' &&
        pathParts[2] === departmentCd &&
        pathParts[3] !== '' // 空文字列を除外（フォルダ自体のパスを除外）
      ) {
        folderSet.add(pathParts[3]);
      }
    });
    
    console.log('[formatService] Extracted folders:', {
      folderCount: folderSet.size,
      folders: Array.from(folderSet),
    });

    // 3. 各フォルダの情報を取得
    const folders: FormatFolder[] = await Promise.all(
      Array.from(folderSet).map(async (folderName) => {
        // フォルダ種別を判定
        const isTemplateFolder = ['material', 'condition', 'result'].includes(
          folderName.toLowerCase()
        );
        const fileType: 'xml' | 'maiml' = isTemplateFolder ? 'xml' : 'maiml';

        // ファイル数を取得
        let fileCount = 0;
        try {
          const files = await storageService.listFiles(
            organizationId,
            `formats/${departmentCd}/${folderName}`
          );
          // フォルダ自体のパス（末尾が'/'で終わるもの）を除外してカウント
          fileCount = files.filter(file => !file.key.endsWith('/')).length;
        } catch (error) {
          console.error(`Failed to count files in ${folderName}:`, error);
          fileCount = 0;
        }

        // 説明文を生成
        let description = '';
        const category: 'template' | 'workflow' = isTemplateFolder
          ? 'template'
          : 'workflow';

        if (isTemplateFolder) {
          const templateType =
            folderName.charAt(0).toUpperCase() + folderName.slice(1);
          description = `${templateType}テンプレート`;
        } else {
          description = `${folderName}ワークフロー`;
        }

        return {
          id: folderName,
          name: folderName,
          folderName: folderName,
          description,
          fileCount,
          fileType,
          category,
          department: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [category, folderName],
        };
      })
    );

    // 4. ファイルタイプでフィルタリング
    let filteredFolders = folders;
    if (fileTypeFilter && fileTypeFilter !== 'all') {
      filteredFolders = folders.filter((f) => f.fileType === fileTypeFilter);
    }

    // 5. ソート（material, condition, result を先頭、その後は名前順）
    filteredFolders.sort((a, b) => {
      // 優先順位を定義
      const priorityOrder: Record<string, number> = {
        'material': 1,
        'condition': 2,
        'result': 3,
      };
      
      const priorityA = priorityOrder[a.folderName.toLowerCase()] || 999;
      const priorityB = priorityOrder[b.folderName.toLowerCase()] || 999;
      
      // 優先順位が異なる場合は優先順位順
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 同じ優先順位（両方とも優先フォルダ、または両方とも通常フォルダ）の場合は名前順
      return a.name.localeCompare(b.name);
    });

    return filteredFolders;
  } catch (error) {
    console.error('Failed to get format folders:', error);
    throw new Error('フォーマットフォルダ一覧の取得に失敗しました');
  }
}

/**
 * フォーマットファイル一覧を取得
 */
export async function getFormatFiles(
  organizationId: string,
  departmentCd: string,
  folderName: string,
  subPath?: string
): Promise<FormatFile[]> {
  const storageService = getStorageService();

  try {
    // パスを構築
    const basePath = subPath
      ? `formats/${departmentCd}/${folderName}/${subPath}`
      : `formats/${departmentCd}/${folderName}`;

    console.log('[formatService] getFormatFiles called:', {
      organizationId,
      departmentCd,
      folderName,
      subPath,
      basePath,
    });

    // S3からファイル一覧を取得
    const allItems = await storageService.listFiles(organizationId, basePath);

    console.log('[formatService] listFiles result:', {
      itemCount: allItems.length,
      sampleItems: allItems.slice(0, 5).map(item => item.key),
    });

    // ファイルとフォルダを抽出
    const filesAndFolders: FormatFile[] = [];
    const processedFolders = new Set<string>();

    for (const item of allItems) {
      // パスを解析
      const pathParts = item.key.split('/');
      const basePathParts = `${organizationId}/${basePath}`.split('/');

      // basePath以降の部分を取得
      const relativeParts = pathParts.slice(basePathParts.length);

      if (relativeParts.length === 0 || relativeParts[0] === '') {
        // ベースパス自体はスキップ
        continue;
      }

      const firstPart = relativeParts[0];

      // フォルダの場合
      if (relativeParts.length > 1 || item.key.endsWith('/')) {
        if (!processedFolders.has(firstPart)) {
          processedFolders.add(firstPart);

          // サブフォルダ内のファイル数をカウント
          const subFolderPath = subPath
            ? `formats/${departmentCd}/${folderName}/${subPath}/${firstPart}`
            : `formats/${departmentCd}/${folderName}/${firstPart}`;

          let fileCount = 0;
          try {
            const subFiles = await storageService.listFiles(organizationId, subFolderPath);
            fileCount = subFiles.filter(f => !f.key.endsWith('/')).length;
          } catch (error) {
            console.error(`Failed to count files in ${firstPart}:`, error);
          }

          filesAndFolders.push({
            id: firstPart,
            name: firstPart,
            path: subPath ? `${subPath}/${firstPart}` : firstPart,
            size: 0,
            lastModified: new Date().toISOString(),
            type: 'folder',
            isFolder: true,
            fileCount,
          });
        }
      } else {
        // ファイルの場合
        const fileName = relativeParts[0];
        const fileExtension = fileName.split('.').pop() || '';

        filesAndFolders.push({
          id: item.key,
          name: fileName,
          path: item.key,
          size: item.size || 0,
          lastModified: item.lastModified 
            ? (typeof item.lastModified === 'string' ? item.lastModified : new Date(item.lastModified).toISOString())
            : new Date().toISOString(),
          type: fileExtension,
          isFolder: false,
        });
      }
    }

    // ソート: フォルダを先頭、その後ファイルを名前順
    filesAndFolders.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('[formatService] Extracted files and folders:', {
      count: filesAndFolders.length,
      folders: filesAndFolders.filter(f => f.isFolder).length,
      files: filesAndFolders.filter(f => !f.isFolder).length,
    });

    return filesAndFolders;
  } catch (error) {
    console.error('Failed to get format files:', error);
    throw new Error('フォーマットファイル一覧の取得に失敗しました');
  }
}

export const formatService = {
  getFormatFolders,
  getFormatFiles,
};
