import { getStorageService } from './storageService';
import { FormatFolder, FormatFile } from '../types/format';
import { AppError, E1006, E1007, E1008, E1009, E4006, E6002, E6004, E6005, E6006 } from '../enums/errorCodes';
import { toJSTIsoString } from '../utils/dateUtils';

/**
 * フォーマットフォルダ一覧を取得
 */
export async function getFormatFolders(
  organizationId: string,
  organizationGroupCd: string | null | undefined
): Promise<FormatFolder[]> {
  const storageService = getStorageService();

  // organizationGroupCd が未設定（null / '' / undefined）の場合は 'default' フォルダを参照
  const effectiveOrganizationGroupCd = organizationGroupCd || 'default';

  try {
    // 1. S3の formats/{organization_group_cd}/ 直下のすべてのファイル/フォルダを取得
    const basePath = `formats/${effectiveOrganizationGroupCd}`;
    
    const allItems = await storageService.listFiles(organizationId, basePath);

    // 2. フォルダのみを抽出（重複排除）
    const folderSet = new Set<string>();
    allItems.forEach((item) => {
      // {organizationId}/formats/{organization_group_cd}/xxx/... から xxx 部分（フォルダ名）を抽出
      const pathParts = item.key.split('/');
      // pathParts[0] = organizationId
      // pathParts[1] = 'formats'
      // pathParts[2] = organizationGroupCd
      // pathParts[3] = folderName
      if (
        pathParts.length >= 4 &&
        pathParts[1] === 'formats' &&
        pathParts[2] === effectiveOrganizationGroupCd &&
        pathParts[3] !== '' // 空文字列を除外（フォルダ自体のパスを除外）
      ) {
        folderSet.add(pathParts[3]);
      }
    });

    // 3. 各フォルダの情報を取得
    const folders: FormatFolder[] = await Promise.all(
      Array.from(folderSet).map(async (folderName) => {
        // フォルダ種別を判定
        const isTemplateFolder = ['material', 'condition', 'result'].includes(
          folderName.toLowerCase()
        );
        const fileType: 'xml' | 'maiml' = isTemplateFolder ? 'xml' : 'maiml';

        // ファイル数を取得（サブフォルダ内のファイルも含む）
        let fileCount = 0;
        try {
          const files = await storageService.listFiles(
            organizationId,
            `formats/${effectiveOrganizationGroupCd}/${folderName}`
          );
          // ディレクトリマーカー（末尾が'/'で終わるもの）を除外してカウント
          // 実際のファイルのみをカウント
          fileCount = files.filter(file => {
            // 末尾が'/'の場合はディレクトリマーカーなので除外
            if (file.key.endsWith('/')) return false;
            
            // ファイル名がない場合も除外（パスのみの場合）
            const pathParts = file.key.split('/');
            const fileName = pathParts[pathParts.length - 1];
            if (!fileName || fileName === '') return false;
            
            return true;
          }).length;
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
          organizationGroup: '',
          createdAt: toJSTIsoString(new Date()),
          updatedAt: toJSTIsoString(new Date()),
          tags: [category, folderName],
        };
      })
    );

    // 4. ソート（material, condition, result を先頭、その後は名前順）
    folders.sort((a, b) => {
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

    return folders;
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
  organizationGroupCd: string,
  folderName: string,
  subPath?: string
): Promise<FormatFile[]> {
  const storageService = getStorageService();

  try {
    // パスを構築（subPathが指定されている場合はそれを含める）
    const basePath = subPath
      ? `formats/${organizationGroupCd}/${folderName}/${subPath}`
      : `formats/${organizationGroupCd}/${folderName}`;

    // S3からファイル一覧を取得
    const allItems = await storageService.listFiles(organizationId, basePath);

    console.log('[formatService] Retrieved items:', {
      total: allItems.length,
      sampleKeys: allItems.slice(0, 5).map(item => item.key),
    });

    // ファイルとフォルダを抽出（直下のみ）
    const filesAndFolders: FormatFile[] = [];
    const processedFolders = new Set<string>();

    for (const item of allItems) {
      // パスを解析
      const pathParts = item.key.split('/');
      const basePathParts = `${organizationId}/${basePath}`.split('/');

      // basePath以降の部分を取得（現在のフォルダ配下の相対パス）
      const relativeParts = pathParts.slice(basePathParts.length);

      if (relativeParts.length === 0 || relativeParts[0] === '') {
        // ベースパス自体はスキップ
        continue;
      }

      // ディレクトリマーカー（末尾が'/'）の場合はフォルダとして処理
      if (item.key.endsWith('/')) {
        // 直下のフォルダのみを対象
        const subFolderName = relativeParts[0]; // 直下のフォルダ名
        
        if (subFolderName && !processedFolders.has(subFolderName)) {
          processedFolders.add(subFolderName);

          // サブフォルダ内のファイル数をカウント
          const subFolderPath = subPath
            ? `${subPath}/${subFolderName}`
            : subFolderName;
          const subFolderFullPath = `formats/${organizationGroupCd}/${folderName}/${subFolderPath}`;
          const subFolderPrefix = `${organizationId}/${subFolderFullPath}/`;
          
          const fileCount = allItems.filter(f => {
            if (!f.key.startsWith(subFolderPrefix)) return false;
            if (f.key.endsWith('/')) return false;
            return true;
          }).length;

          filesAndFolders.push({
            id: subFolderName,
            name: subFolderName,
            path: subFolderFullPath,
            size: 0,
            lastModified: toJSTIsoString(new Date()),
            type: 'folder',
            isFolder: true,
            fileCount,
          });
        }
      } else if (relativeParts.length > 1) {
        // サブフォルダ内のファイル（ディレクトリマーカーがない場合）
        // → サブフォルダを暗黙的にフォルダとして認識
        const subFolderName = relativeParts[0]; // 直下のフォルダ名
        
        if (subFolderName && !processedFolders.has(subFolderName)) {
          processedFolders.add(subFolderName);

          // サブフォルダ内のファイル数をカウント
          const subFolderPath = subPath
            ? `${subPath}/${subFolderName}`
            : subFolderName;
          const subFolderFullPath = `formats/${organizationGroupCd}/${folderName}/${subFolderPath}`;
          const subFolderPrefix = `${organizationId}/${subFolderFullPath}/`;
          
          const fileCount = allItems.filter(f => {
            if (!f.key.startsWith(subFolderPrefix)) return false;
            if (f.key.endsWith('/')) return false;
            return true;
          }).length;

          console.log('[formatService] Detected implicit folder:', subFolderName, 'fileCount:', fileCount);

          filesAndFolders.push({
            id: subFolderName,
            name: subFolderName,
            path: subFolderFullPath,
            size: 0,
            lastModified: toJSTIsoString(new Date()),
            type: 'folder',
            isFolder: true,
            fileCount,
          });
        }
      } else {
        // ファイルの場合 - 直下のファイルのみ
        if (relativeParts.length === 1) {
          const fileName = relativeParts[0];
          const fileExtension = fileName.split('.').pop() || '';

          filesAndFolders.push({
            id: item.key,
            name: fileName,
            path: item.key,
            size: item.size || 0,
            lastModified: item.lastModified 
              ? (typeof item.lastModified === 'string' ? item.lastModified : toJSTIsoString(new Date(item.lastModified)))
              : toJSTIsoString(new Date()),
            type: fileExtension,
            isFolder: false,
          });
        }
      }
    }

    // ソート: フォルダを先頭、その後ファイルを名前順
    filesAndFolders.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return filesAndFolders;
  } catch (error) {
    console.error('Failed to get format files:', error);
    throw new Error('フォーマットファイル一覧の取得に失敗しました');
  }
}

/**
 * 新規フォーマットフォルダ作成
 * 
 * @param organizationId 組織ID
 * @param organizationGroupCd 組織グループCD
 * @param folderName フォルダ名
 * @returns 作成されたフォルダ情報
 */
export async function createFormatFolder(
  organizationId: string,
  organizationGroupCd: string,
  folderName: string
): Promise<{
  folder_name: string;
  folder_path: string;
  organization_group_cd: string;
  created_at: string;
}> {
  const storageService = getStorageService();

  try {
    // 1. フォルダ名のバリデーション
    const folderNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!folderNameRegex.test(folderName)) {
      throw new AppError(E1006, 'Folder name must contain only alphanumeric characters and underscores.');
    }

    if (folderName.length < 1 || folderName.length > 255) {
      throw new AppError(E1006, 'Folder name must be between 1 and 255 characters.');
    }

    // 2. 重複チェック
    const basePath = `formats/${organizationGroupCd}`;
    const existingFolders = await storageService.listFiles(organizationId, basePath);
    
    const folderExists = existingFolders.some(file => {
      const pathParts = file.key.split('/');
      // pathParts[0] = organizationId
      // pathParts[1] = 'formats'
      // pathParts[2] = organizationGroupCd
      // pathParts[3] = folderName (重複チェック対象)
      return pathParts.length >= 4 && pathParts[3] === folderName;
    });

    if (folderExists) {
      throw new AppError(E6006, 'A folder with the same name already exists.');
    }

    // 3. フォルダパスを生成
    const folderPath = `formats/${organizationGroupCd}/${folderName}`;
    const fullPath = `${organizationId}/${folderPath}`;

    // 4. Swiftに空のフォルダを作成（ディレクトリマーカー）
    // Cyberduckと同じ方式: 末尾にスラッシュを付けた0バイトのオブジェクト
    const directoryMarker = `${folderPath}/`; // 末尾にスラッシュ
    try {
      await storageService.uploadFile(
        organizationId,
        directoryMarker,
        Buffer.from('', 'utf-8'),
        { contentType: 'application/directory' }
      );
      console.log('[formatService] 空フォルダ作成成功:', directoryMarker);
    } catch (uploadError) {
      console.error('[formatService] フォルダ作成エラー:', uploadError);
      throw new AppError(E4006, 'Failed to create folder in storage.');
    }

    // 5. レスポンスを返す
    return {
      folder_name: folderName,
      folder_path: fullPath,
      organization_group_cd: organizationGroupCd,
      created_at: toJSTIsoString(new Date()),
    };
  } catch (error) {
    console.error('[formatService] Failed to create format folder:', error);
    throw error;
  }
}

/**
 * フォーマット内にサブフォルダを作成
 * 
 * @param organizationId 組織ID
 * @param organizationGroupCd 組織グループCD
 * @param formatName フォーマット名（chemistry, materials等）
 * @param subfolderName サブフォルダ名
 * @param parentPath 親フォルダのパス（オプション）
 * @returns 作成されたサブフォルダ情報
 */
export async function createFormatSubfolder(
  organizationId: string,
  organizationGroupCd: string,
  formatName: string,
  subfolderName: string,
  parentPath?: string
): Promise<{
  folder_name: string;
  folder_path: string;
  full_swift_path: string;
  created_at: string;
}> {
  const storageService = getStorageService();

  try {
    // 1. サブフォルダ名のバリデーション
    const subfolderNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!subfolderNameRegex.test(subfolderName)) {
      throw new AppError(E1007, 'Subfolder name must contain only alphanumeric characters, underscores, and hyphens.');
    }

    if (subfolderName.length < 1 || subfolderName.length > 255) {
      throw new AppError(E1007, 'Subfolder name must be between 1 and 255 characters.');
    }

    // 2. フォーマット名のバリデーション
    if (!formatName || formatName.length === 0) {
      throw new AppError(E1009, 'Format name is required.');
    }

    // 3. パスを構築
    const folderPath = parentPath 
      ? `${parentPath}/${subfolderName}`
      : `${subfolderName}`;
    
    const fullFormatPath = `formats/${organizationGroupCd}/${formatName}/${folderPath}`;

    // 4. 重複チェック（同じパスに既にフォルダが存在するか）
    const existingFiles = await storageService.listFiles(
      organizationId, 
      `formats/${organizationGroupCd}/${formatName}`
    );
    
    const folderExists = existingFiles.some(file => {
      const pathParts = file.key.split('/');
      // pathParts[0] = organizationId
      // pathParts[1] = 'formats'
      // pathParts[2] = organizationGroupCd
      // pathParts[3] = formatName
      // pathParts[4以降] = サブフォルダパス
      
      if (pathParts.length < 5) return false;
      
      const subPath = pathParts.slice(4).join('/');
      // フォルダパスまたはフォルダマーカー（末尾に/がある）と一致するか
      return subPath === folderPath || subPath.startsWith(`${folderPath}/`);
    });

    if (folderExists) {
      throw new AppError(E6006, 'A folder with the same name already exists.');
    }

    // 5. 親フォルダの存在確認（parentPathが指定されている場合）
    if (parentPath && parentPath.length > 0) {
      const parentExists = existingFiles.some(file => {
        const pathParts = file.key.split('/');
        if (pathParts.length < 5) return false;
        const subPath = pathParts.slice(4).join('/');
        return subPath === parentPath || subPath.startsWith(`${parentPath}/`);
      });

      if (!parentExists) {
        throw new AppError(E6004, 'Parent folder does not exist.');
      }
    }

    const fullSwiftPath = `${organizationId}/${fullFormatPath}`;

    // 6. Swiftに空のフォルダマーカーを作成
    const directoryMarker = `${fullFormatPath}/`; // 末尾にスラッシュ
    try {
      await storageService.uploadFile(
        organizationId,
        directoryMarker,
        Buffer.from('', 'utf-8'),
        { contentType: 'application/directory' }
      );
      console.log('[formatService] サブフォルダ作成成功:', directoryMarker);
    } catch (uploadError) {
      console.error('[formatService] サブフォルダ作成エラー:', uploadError);
      throw new AppError(E4006, 'Failed to create subfolder in storage.');
    }

    // 7. レスポンスを返す
    return {
      folder_name: subfolderName,
      folder_path: folderPath,
      full_swift_path: fullSwiftPath,
      created_at: toJSTIsoString(new Date()),
    };
  } catch (error) {
    console.error('[formatService] Failed to create format subfolder:', error);
    throw error;
  }
}

/**
 * フォーマットファイルを作成
 * 
 * @param organizationId 組織ID
 * @param organizationGroupCd 組織グループCD
 * @param folderName フォーマットフォルダ名
 * @param fileName ファイル名（拡張子を含む。例: "test.xml", "workflow.maiml"）
 * @param subPath サブフォルダパス（オプション）
 * @returns 作成されたファイル情報
 */
export async function createFormatFile(
  organizationId: string,
  organizationGroupCd: string,
  folderName: string,
  fileName: string,
  subPath?: string,
  userId?: string
): Promise<{
  filePath: string;
  fileName: string;
  fileType: string;
  size: number;
  createdAt: string;
}> {
  const storageService = getStorageService();

  try {
    // 1. ファイル名から拡張子を判定
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['xml', 'maiml'].includes(fileExtension)) {
      throw new AppError(E1008, 'File name must end with .xml or .maiml.');
    }
    const fileType = fileExtension as 'xml' | 'maiml';

    // 2. ファイル名のサニタイゼーション（拡張子を除く）
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const sanitizedFileName = sanitizeFileName(fileNameWithoutExt);
    const fullFileName = `${sanitizedFileName}.${fileExtension}`;

    // 3. ファイルパスの構築（folderName配下に配置）
    const filePath = subPath
      ? `formats/${organizationGroupCd}/${folderName}/${subPath}/${fullFileName}`
      : `formats/${organizationGroupCd}/${folderName}/${fullFileName}`;

    // 4. ファイルの重複チェック
    const exists = await storageService.fileExists(organizationId, filePath);
    if (exists) {
      throw new AppError(E6005, 'A file with the same name already exists.');
    }

    // 5. 空のファイルコンテンツを生成
    const content = '';

    // 6. S3へアップロード（uploadedBy を渡して file_metadata を自動登録）
    await storageService.uploadFile(
      organizationId,
      filePath,
      Buffer.from(content, 'utf-8'),
      {
        contentType: 'application/xml',
        uploadedBy: userId,
        uploadSource: 'format',
        uploadMethod: 'single',
      }
    );

    console.log('[formatService] File upload success:', filePath);

    // 7. レスポンスを返す
    const fileSize = 0; // 空のファイル

    return {
      filePath,
      fileName: fullFileName,
      fileType,
      size: fileSize,
      createdAt: toJSTIsoString(new Date()),
    };
  } catch (error) {
    console.error('[formatService] Failed to create format file:', error);
    throw error;
  }
}

/**
 * ファイル名をサニタイズ
 * 不正な文字を_に変換
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, '_')          // スペースを_に変換
    .replace(/[^a-zA-Z0-9_-]/g, '_'); // 英数字・_・-以外を_に変換
}

/**
 * フォーマットファイルの内容を更新
 * 
 * @param organizationId 組織ID
 * @param filePath ファイルパス（formats/{organization_group_cd}/{folder}/{file}形式）
 * @param content 更新するXMLコンテンツ
 * @returns 更新されたファイル情報
 */
export async function updateFormatFile(
  organizationId: string,
  filePath: string,
  content: string,
  userId?: string
): Promise<{
  filePath: string;
  size: number;
  updatedAt: string;
}> {
  const storageService = getStorageService();

  try {
    // 1. ファイルの存在確認
    const exists = await storageService.fileExists(organizationId, filePath);
    if (!exists) {
      throw new AppError(E6002, 'File not found.');
    }

    // 2. コンテンツのバリデーション
    if (typeof content !== 'string') {
      throw new AppError(E1008, 'File content is invalid.');
    }

    // 3. S3へアップロード（上書き・uploadedBy を渡して file_metadata を自動登録）
    await storageService.uploadFile(
      organizationId,
      filePath,
      Buffer.from(content, 'utf-8'),
      {
        contentType: 'application/xml',
        uploadedBy: userId,
        uploadSource: 'format',
        uploadMethod: 'single',
      }
    );

    console.log('[formatService] File update success:', filePath);

    // 4. レスポンスを返す
    const fileSize = Buffer.from(content, 'utf-8').length;

    return {
      filePath,
      size: fileSize,
      updatedAt: toJSTIsoString(new Date()),
    };
  } catch (error) {
    console.error('[formatService] Failed to update format file:', error);
    throw error;
  }
}

export const formatService = {
  getFormatFolders,
  getFormatFiles,
  createFormatFolder,
  createFormatSubfolder,
  createFormatFile,
  updateFormatFile,
};
