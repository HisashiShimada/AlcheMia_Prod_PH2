/**
 * useNamespaceOperations - 名前空間テンプレート取り込み機能
 * 
 * S3上の名前空間XMLファイルを読み込んで、PropertiesまたはContentsに取り込む機能を提供
 * 
 * @version 1.0.0 - TypeScript + Ant Design v6版
 * @date 2025-12-25
 */

import { useCallback, useState } from 'react';
import { fetchFileList, fetchFileContent } from '@/utils/apiClient';
import type { Folder, FileInfo, NamespaceData, PropertyData } from '@/types/format';

/**
 * useNamespaceOperations - 名前空間テンプレート取り込み機能フック
 */
const useNamespaceOperations = () => {
  
  // 名前空間機能用状態
  const [namespaceFiles, setNamespaceFiles] = useState<FileInfo[]>([]); 
  const [namespaceCache, setNamespaceCache] = useState<Record<string, NamespaceData>>({}); 
  const [lastNamespaceFolder, setLastNamespaceFolder] = useState<string>(''); 

  // S3フォルダ構造取得・Explorer機能用状態
  const [s3FolderStructure, setS3FolderStructure] = useState<Folder[]>([]);
  const [isLoadingFolderStructure, setIsLoadingFolderStructure] = useState<boolean>(false);

  /**
   * S3フォルダ構造を階層的に取得
   */
  const loadS3FolderStructure = useCallback(async (): Promise<Folder[]> => {
    try {
      setIsLoadingFolderStructure(true);
      
      const allFiles = await fetchFileList();
      
      const folderStructure: Record<string, Folder> = {};
      const folderFileCount: Record<string, { total: number; xml: number }> = {}; 
      
      allFiles.forEach(file => {
        const key = file.key || file.name || '';
        if (!key) return;
        
        const pathParts = key.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const isXmlFile = fileName.toLowerCase().endsWith('.xml');
        
        const folderParts = pathParts.slice(0, -1);
        
        if (folderParts.length > 0) {
          let currentLevel = folderStructure;
          let currentPath = '';
          
          folderParts.forEach((folderName, index) => {
            if (!folderName) return;
            
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            const fullPath = currentPath + '/';
            
            if (!currentLevel[folderName]) {
              currentLevel[folderName] = {
                name: folderName,
                path: fullPath,
                level: index,
                subfolders: [],
                files: [],
                xmlFileCount: 0,
                totalFileCount: 0,
                totalXmlFileCount: 0,
                totalAllFileCount: 0
              };
            }
            
            // subfoldersを配列として扱うための一時的な変換
            const subfoldersMap: Record<string, Folder> = {};
            if (currentLevel[folderName].subfolders) {
              currentLevel[folderName].subfolders.forEach((sf: Folder) => {
                subfoldersMap[sf.name] = sf;
              });
            }
            currentLevel = subfoldersMap;
          });
          
          // ファイル数カウント
          let pathAccumulator = '';
          folderParts.forEach((folderName, index) => {
            pathAccumulator = pathAccumulator ? `${pathAccumulator}/${folderName}` : folderName;
            const fullPath = pathAccumulator + '/';
            
            if (!folderFileCount[fullPath]) {
              folderFileCount[fullPath] = { total: 0, xml: 0 };
            }
            
            if (index === folderParts.length - 1) {
              folderFileCount[fullPath].total++;
              if (isXmlFile) {
                folderFileCount[fullPath].xml++;
              }
            }
          });
        }
      });
      
      // フォルダカウント更新（配列変換）
      const updateFolderCounts = (folderObj: Folder, folderPath: string) => {
        const counts = folderFileCount[folderPath] || { total: 0, xml: 0 };
        folderObj.totalFileCount = counts.total;
        folderObj.xmlFileCount = counts.xml;
        
        if (folderObj.subfolders && Array.isArray(folderObj.subfolders)) {
          folderObj.subfolders.forEach(childFolder => {
            updateFolderCounts(childFolder, childFolder.path);
          });
        }
      };
      
      // Record<string, Folder>からFolder[]に変換
      const convertToFolderArray = (folderMap: Record<string, Folder>): Folder[] => {
        return Object.values(folderMap).map(folder => {
          const subfoldersMap: Record<string, Folder> = {};
          if (folder.subfolders && Array.isArray(folder.subfolders)) {
            folder.subfolders.forEach((sf: Folder) => {
              subfoldersMap[sf.name] = sf;
            });
          }
          
          folder.subfolders = convertToFolderArray(subfoldersMap);
          return folder;
        });
      };
      
      const folderArray = convertToFolderArray(folderStructure);
      folderArray.forEach(folder => {
        updateFolderCounts(folder, folder.path);
      });
      
      // 総計算
      const calculateTotalCounts = (folder: Folder): { totalXmlFileCount: number; totalAllFileCount: number } => {
        let totalXml = folder.xmlFileCount || 0;
        let totalFiles = folder.totalFileCount || 0;
        
        if (folder.subfolders && Array.isArray(folder.subfolders)) {
          folder.subfolders.forEach(childFolder => {
            const childCounts = calculateTotalCounts(childFolder);
            totalXml += childCounts.totalXmlFileCount;
            totalFiles += childCounts.totalAllFileCount;
          });
        }
        
        folder.totalXmlFileCount = totalXml;
        folder.totalAllFileCount = totalFiles;
        
        return {
          totalXmlFileCount: totalXml,
          totalAllFileCount: totalFiles
        };
      };
      
      folderArray.forEach(calculateTotalCounts);
      
      setS3FolderStructure(folderArray);
      
      console.log('📂 [名前空間] S3フォルダ構造取得完了:', {
        folderCount: folderArray.length,
        structure: folderArray
      });
      
      return folderArray;
      
    } catch (error) {
      console.error('[名前空間] S3フォルダ構造取得エラー:', error);
      throw new Error(`S3フォルダ構造取得エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingFolderStructure(false);
    }
  }, []);

  /**
   * フォルダのXMLファイル数を取得
   */
  const getFolderNamespaceFileCount = useCallback((folderPath: string): number => {
    try {
      const pathParts = folderPath.replace(/\/$/, '').split('/').filter(part => part.length > 0);
      
      if (pathParts.length === 0) {
        return 0;
      }
      
      let currentFolders: Folder[] = s3FolderStructure;
      let currentFolder: Folder | null = null;
      
      for (const part of pathParts) {
        const found = currentFolders.find(f => f.name === part);
        if (found) {
          currentFolder = found;
          currentFolders = found.subfolders || [];
        } else {
          return 0;
        }
      }
      
      return currentFolder?.totalXmlFileCount || 0;
    } catch (error) {
      console.error('[名前空間] ファイル数取得エラー:', error);
      return 0;
    }
  }, [s3FolderStructure]);

  /**
   * 統合要素解析関数（propertyListType仕様完全準拠）
   */
  const parseUnifiedElement = useCallback((element: Element): PropertyData => {
    const elementKey = element.getAttribute('key') || 'unknown';
    const parentXsiType = element.getAttribute('xsi:type') || '';
    
    console.log('[名前空間] 要素解析開始:', elementKey);
    
    const result: PropertyData = {
      key: elementKey,
      tagName: element.tagName,
      attributes: {},
      elements: {},
      children: []
    };
    
    // 属性解析
    if (element.attributes && element.attributes.length > 0) {
      Array.from(element.attributes).forEach(attr => {
        result.attributes[attr.name] = attr.value;
      });
    }
    
    // 子要素分類
    const trueChildren: Element[] = [];        // 真の子要素
    const elementComponents: Element[] = [];   // 要素
    
    const isParentPropertyListType = parentXsiType === 'propertyListType';
    
    if (element.children && element.children.length > 0) {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const childTagName = child.tagName;
        
        const isPropertyOrContentElement = (childTagName === 'property' || childTagName === 'content');
        
        if (isParentPropertyListType && isPropertyOrContentElement) {
          trueChildren.push(child);
        } else {
          elementComponents.push(child);
        }
      }
    }
    
    // 要素処理
    if (elementComponents.length > 0) {
      elementComponents.forEach((componentElement) => {
        const elementName = componentElement.tagName;
        const elementContent = componentElement.textContent ? componentElement.textContent.trim() : '';
        
        result.elements[elementName] = elementContent || '';
      });
    }
    
    // 子要素処理（再帰的）
    if (trueChildren.length > 0) {
      trueChildren.forEach((child, index) => {
        const childKey = child.getAttribute('key') || `${child.tagName}_${Date.now()}_${index}`;
        
        const childData = parseUnifiedElement(child);
        childData.key = childKey;
        
        if (!Array.isArray(childData.children)) {
          childData.children = [];
        }
        
        result.children.push(childData);
      });
    }
    
    if (!Array.isArray(result.children)) {
      result.children = [];
    }
    
    return result;
  }, []);

  /**
   * 階層スコア計算
   */
  const calculateHierarchyScore = (element: PropertyData): number => {
    let score = 0;
    
    if (element.children && element.children.length > 0) {
      score += element.children.length * 10;
      
      element.children.forEach(child => {
        if (child.children && child.children.length > 0) {
          score += child.children.length * 5;
        }
      });
    }
    
    if (element.attributes && element.attributes['xsi:type'] === 'propertyListType') {
      score += 50;
    }
    
    return score;
  };

  /**
   * 全階層要素収集
   */
  const collectAllElements = (element: Element, elementType: string, path: string[] = []): Array<{
    key: string;
    element: PropertyData;
    path: string[];
    hierarchyScore: number;
    xsiType: string;
  }> => {
    const collected: Array<{
      key: string;
      element: PropertyData;
      path: string[];
      hierarchyScore: number;
      xsiType: string;
    }> = [];
    
    if (element.tagName === elementType) {
      const key = element.getAttribute('key');
      if (key) {
        const parsedElement = parseUnifiedElement(element);
        collected.push({
          key,
          element: parsedElement,
          path: [...path],
          hierarchyScore: calculateHierarchyScore(parsedElement),
          xsiType: element.getAttribute('xsi:type') || ''
        });
      }
    }
    
    if (element.children && element.children.length > 0) {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const childKey = child.getAttribute('key') || `element_${i}`;
        const childPath = [...path, childKey];
        const childCollected = collectAllElements(child, elementType, childPath);
        collected.push(...childCollected);
      }
    }
    
    return collected;
  };

  /**
   * 最適要素選択
   */
  const selectBestElement = (elementList: Array<{
    key: string;
    element: PropertyData;
    path: string[];
    hierarchyScore: number;
    xsiType: string;
  }>): Record<string, PropertyData> => {
    const result: Record<string, PropertyData> = {};
    const keyGroups: Record<string, Array<{
      key: string;
      element: PropertyData;
      path: string[];
      hierarchyScore: number;
      xsiType: string;
    }>> = {};
    
    elementList.forEach(item => {
      if (!keyGroups[item.key]) {
        keyGroups[item.key] = [];
      }
      keyGroups[item.key].push(item);
    });
    
    Object.entries(keyGroups).forEach(([key, items]) => {
      if (items.length === 1) {
        result[key] = items[0].element;
      } else {
        const sortedItems = items.sort((a, b) => {
          if (b.hierarchyScore !== a.hierarchyScore) {
            return b.hierarchyScore - a.hierarchyScore;
          }
          return b.path.length - a.path.length;
        });
        
        result[key] = sortedItems[0].element;
        console.log('[名前空間] 重複要素から最適選択:', key);
      }
    });
    
    return result;
  };

  /**
   * 名前空間XML解析
   */
  const parseNamespaceXML = useCallback((xmlContent: string): NamespaceData => {
    try {
      console.log('[名前空間] XML解析開始');

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
      
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error("XML解析エラー");
      }
      
      const rootElement = xmlDoc.documentElement;
      if (!rootElement) {
        throw new Error("ルート要素が見つかりません");
      }
      
      const namespaceURI = rootElement.getAttribute('xmlns') || '';
      const hierarchyPath = namespaceURI.split('/').filter(s => s.length > 0);
      
      const properties: Record<string, PropertyData> = {};
      const contents: Record<string, PropertyData> = {};
      
      // property要素解析
      try {
        const allProperties = collectAllElements(rootElement, 'property');
        const selectedProperties = selectBestElement(allProperties);
        Object.assign(properties, selectedProperties);
      } catch (e) {
        console.warn('[名前空間] property解析エラー:', e instanceof Error ? e.message : String(e));
      }
      
      // content要素解析
      try {
        const allContents = collectAllElements(rootElement, 'content');
        const selectedContents = selectBestElement(allContents);
        Object.assign(contents, selectedContents);
      } catch (e) {
        console.warn('[名前空間] content解析エラー:', e instanceof Error ? e.message : String(e));
      }
      
      const result: NamespaceData = {
        namespaceURI: namespaceURI || '',
        hierarchyPath: hierarchyPath || [],
        properties: properties || {},
        contents: contents || {},
        totalElements: Object.keys(properties).length + Object.keys(contents).length
      };
      
      console.log('[名前空間] XML解析完了:', {
        properties: Object.keys(result.properties).length,
        contents: Object.keys(result.contents).length
      });
      
      return result;
      
    } catch (error) {
      console.error('[名前空間] XML解析エラー:', error);
      
      return {
        namespaceURI: '',
        hierarchyPath: [],
        properties: {},
        contents: {},
        totalElements: 0
      };
    }
  }, []);

  /**
   * S3フォルダから名前空間ファイル一覧取得
   */
  const loadNamespaceFilesFromS3Folder = useCallback(async (folderPath: string): Promise<FileInfo[]> => {
    try {
      const allFiles = await fetchFileList();
      
      const namespaceFiles = allFiles.filter(file => {
        const key = file.key || file.name;
        const isInFolder = key.startsWith(folderPath);
        const isXMLFile = key.toLowerCase().endsWith('.xml');
        
        return isInFolder && isXMLFile;
      });
      
      setNamespaceFiles(namespaceFiles);
      setLastNamespaceFolder(folderPath);
      
      console.log('[名前空間] ファイル一覧取得完了:', {
        folderPath,
        fileCount: namespaceFiles.length
      });
      
      return namespaceFiles;
      
    } catch (error) {
      console.error('[名前空間] ファイル一覧取得エラー:', error);
      throw new Error(`名前空間ファイル一覧取得エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  /**
   * 名前空間ファイル解析（キャッシュ対応）
   */
  const analyzeNamespaceFile = useCallback(async (fileKey: string): Promise<NamespaceData> => {
    try {
      if (namespaceCache[fileKey]) {
        console.log('[名前空間] キャッシュから取得:', fileKey);
        return namespaceCache[fileKey];
      }
      
      const xmlContent = await fetchFileContent(fileKey);
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('名前空間ファイル内容が空です');
      }
      
      console.log('[名前空間] ファイル解析開始:', fileKey);
      const parsedNamespace = parseNamespaceXML(xmlContent);
      
      setNamespaceCache(prev => ({
        ...prev,
        [fileKey]: parsedNamespace
      }));
      
      return parsedNamespace;
      
    } catch (error) {
      console.error('[名前空間] ファイル解析エラー:', error);
      throw new Error(`名前空間ファイル解析エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [namespaceCache, parseNamespaceXML]);

  return {
    // 状態
    namespaceFiles,
    lastNamespaceFolder,
    s3FolderStructure,
    isLoadingFolderStructure,
    
    // S3フォルダExplorer機能
    loadS3FolderStructure,
    getFolderNamespaceFileCount,
    
    // 名前空間機能
    loadNamespaceFilesFromS3Folder,
    analyzeNamespaceFile
  };
};

export default useNamespaceOperations;
