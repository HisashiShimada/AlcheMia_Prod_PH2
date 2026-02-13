/**
 * useNamespaceOperations - 名前空間テンプレート取り込み機能フック
 * 
 * V1の実装をV2アーキテクチャに最適化して移植
 * S3フォルダExplorer機能と名前空間XML解析機能を提供
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { useCallback, useState } from 'react';

/**
 * APIベースURL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * ファイル一覧取得（S3から）
 */
const fetchFileList = async (): Promise<S3File[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/s3/files`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`ファイル一覧取得失敗: ${response.status}`);
    }
    
    const result = await response.json();
    return Array.isArray(result) ? result : (result.files || []);
  } catch (error) {
    console.error('❌ [fetchFileList] エラー:', error);
    throw error;
  }
};

/**
 * ファイル内容取得（S3から）
 */
const fetchFileContent = async (fileKey: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/s3/file-content?key=${encodeURIComponent(fileKey)}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) {
      throw new Error(`ファイル内容取得失敗: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    let content: string;
    
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      content = result.success ? (result.data?.content || result.content || '') : '';
    } else {
      content = await response.text();
    }
    
    return content;
  } catch (error) {
    console.error('❌ [fetchFileContent] エラー:', error);
    throw error;
  }
};

/**
 * S3ファイル情報の型定義
 */
export interface S3File {
  key?: string;
  name?: string;
  size?: number;
  lastModified?: string;
}

/**
 * S3フォルダ情報の型定義
 */
export interface S3Folder {
  name: string;
  path: string;
  level: number;
  children: Record<string, S3Folder>;
  files: string[];
  xmlFileCount: number;
  totalFileCount: number;
  totalXmlFileCount?: number;
  totalAllFileCount?: number;
}

/**
 * 解析された要素の型定義
 */
export interface ParsedElement {
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: ParsedElement[];
  key?: string;
  namespaceOrigin?: boolean;
  namespaceSource?: {
    uri: string;
    hierarchyPath: string[];
    importedAt: string;
    originalKey?: string;
  };
}

/**
 * 要素コレクションアイテムの型定義
 */
interface CollectedElement {
  key: string;
  element: ParsedElement;
  path: string[];
  hierarchyScore: number;
  xsiType: string;
}

/**
 * 名前空間データの型定義
 */
export interface NamespaceData {
  namespaceURI: string;
  hierarchyPath: string[];
  properties: Record<string, ParsedElement>;
  contents: Record<string, ParsedElement>;
  totalElements: number;
}

/**
 * テンプレート型定義（setEditingTemplate用）
 */
interface Template {
  properties: Record<string, ParsedElement>;
  contents: Record<string, ParsedElement>;
  [key: string]: unknown;
}

/**
 * useNamespaceOperationsの返り値型
 */
export interface UseNamespaceOperationsReturn {
  // 状態
  namespaceFiles: S3File[];
  lastNamespaceFolder: string;
  s3FolderStructure: Record<string, S3Folder>;
  isLoadingFolderStructure: boolean;
  
  // S3フォルダExplorer機能
  loadS3FolderStructure: () => Promise<Record<string, S3Folder>>;
  getFolderNamespaceFileCount: (folderPath: string) => number;
  
  // 名前空間機能
  loadNamespaceFilesFromS3Folder: (folderPath: string) => Promise<S3File[]>;
  analyzeNamespaceFile: (fileKey: string) => Promise<NamespaceData>;
  replaceTemplateWithNamespace: (
    namespaceData: NamespaceData,
    templateType: 'properties' | 'contents',
    setEditingTemplate: React.Dispatch<React.SetStateAction<Template>>
  ) => void;
  replaceElementWithNamespace: (
    sectionType: 'properties' | 'contents',
    elementKey: string,
    namespaceData: NamespaceData,
    namespaceElementKey: string,
    setEditingTemplate: React.Dispatch<React.SetStateAction<Template>>
  ) => void;
}

/**
 * useNamespaceOperations - 名前空間テンプレート取り込み機能
 */
const useNamespaceOperations = (): UseNamespaceOperationsReturn => {
  
  // 名前空間機能用状態
  const [namespaceFiles, setNamespaceFiles] = useState<S3File[]>([]);
  const [namespaceCache, setNamespaceCache] = useState<Record<string, NamespaceData>>({});
  const [lastNamespaceFolder, setLastNamespaceFolder] = useState('');

  // S3フォルダ構造取得・Explorer機能用状態
  const [s3FolderStructure, setS3FolderStructure] = useState<Record<string, S3Folder>>({});
  const [isLoadingFolderStructure, setIsLoadingFolderStructure] = useState(false);

  /**
   * S3フォルダ構造を階層的に取得
   */
  const loadS3FolderStructure = useCallback(async (): Promise<Record<string, S3Folder>> => {
    try {
      setIsLoadingFolderStructure(true);
      
      const allFiles = await fetchFileList();
      
      const folderStructure: Record<string, S3Folder> = {};
      const folderFileCount: Record<string, { total: number; xml: number }> = {};
      
      allFiles.forEach((file: S3File) => {
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
                children: {},
                files: [],
                xmlFileCount: 0,
                totalFileCount: 0
              };
            }
            
            currentLevel = currentLevel[folderName].children;
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
      
      // フォルダカウント更新
      const updateFolderCounts = (folderObj: S3Folder, folderPath: string) => {
        const counts = folderFileCount[folderPath] || { total: 0, xml: 0 };
        folderObj.totalFileCount = counts.total;
        folderObj.xmlFileCount = counts.xml;
        
        Object.values(folderObj.children || {}).forEach(childFolder => {
          updateFolderCounts(childFolder, childFolder.path);
        });
      };
      
      Object.values(folderStructure).forEach(folder => {
        updateFolderCounts(folder, folder.path);
      });
      
      // 総計算
      const calculateTotalCounts = (folder: S3Folder): { totalXmlFileCount: number; totalAllFileCount: number } => {
        let totalXml = folder.xmlFileCount || 0;
        let totalFiles = folder.totalFileCount || 0;
        
        Object.values(folder.children || {}).forEach(childFolder => {
          const childCounts = calculateTotalCounts(childFolder);
          totalXml += childCounts.totalXmlFileCount;
          totalFiles += childCounts.totalAllFileCount;
        });
        
        folder.totalXmlFileCount = totalXml;
        folder.totalAllFileCount = totalFiles;
        
        return {
          totalXmlFileCount: totalXml,
          totalAllFileCount: totalFiles
        };
      };
      
      Object.values(folderStructure).forEach(calculateTotalCounts);
      
      setS3FolderStructure(folderStructure);
      
      return folderStructure;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[V2名前空間] S3フォルダ構造取得エラー:', error);
      throw new Error(`S3フォルダ構造取得エラー: ${errorMessage}`);
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
      
      let currentFolder: S3Folder | null = null;
      let currentLevel: Record<string, S3Folder> = s3FolderStructure;
      
      for (const part of pathParts) {
        if (currentLevel[part]) {
          currentFolder = currentLevel[part];
          currentLevel = currentFolder.children;
        } else {
          return 0;
        }
      }
      
      return currentFolder ? (currentFolder.totalXmlFileCount || 0) : 0;
    } catch (error) {
      console.error('[V2名前空間] ファイル数取得エラー:', error);
      return 0;
    }
  }, [s3FolderStructure]);

  /**
   * 統合要素解析関数（propertyListType仕様完全準拠）
   */
  const parseUnifiedElement = useCallback((element: Element): ParsedElement => {
    const elementKey = element.getAttribute('key') || 'unknown';
    const parentXsiType = element.getAttribute('xsi:type') || '';
    
    console.log('[V2名前空間] 要素解析開始:', elementKey);
    
    const result: ParsedElement = {
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
    const trueChildren: Element[] = [];
    const elementComponents: Element[] = [];
    
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
  const calculateHierarchyScore = (element: ParsedElement): number => {
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
  const collectAllElements = (element: Element, elementType: string, path: string[] = []): CollectedElement[] => {
    const collected: CollectedElement[] = [];
    
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
  const selectBestElement = (elementList: CollectedElement[]): Record<string, ParsedElement> => {
    const result: Record<string, ParsedElement> = {};
    const keyGroups: Record<string, CollectedElement[]> = {};
    
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
        console.log('[V2名前空間] 重複要素から最適選択:', key);
      }
    });
    
    return result;
  };

  /**
   * 名前空間XML解析
   */
  const parseNamespaceXML = useCallback((xmlContent: string): NamespaceData => {
    try {
      console.log('[V2名前空間] XML解析開始');

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
      
      const properties: Record<string, ParsedElement> = {};
      const contents: Record<string, ParsedElement> = {};
      
      // property要素解析
      try {
        const allProperties = collectAllElements(rootElement, 'property');
        const selectedProperties = selectBestElement(allProperties);
        Object.assign(properties, selectedProperties);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[V2名前空間] property解析エラー:', errorMessage);
      }
      
      // content要素解析
      try {
        const allContents = collectAllElements(rootElement, 'content');
        const selectedContents = selectBestElement(allContents);
        Object.assign(contents, selectedContents);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[V2名前空間] content解析エラー:', errorMessage);
      }
      
      const result: NamespaceData = {
        namespaceURI: namespaceURI || '',
        hierarchyPath: hierarchyPath || [],
        properties: properties || {},
        contents: contents || {},
        totalElements: Object.keys(properties).length + Object.keys(contents).length
      };
      
      console.log('[V2名前空間] XML解析完了:', {
        properties: Object.keys(result.properties).length,
        contents: Object.keys(result.contents).length
      });
      
      return result;
      
    } catch (error) {
      console.error('[V2名前空間] XML解析エラー:', error);
      
      return {
        namespaceURI: '',
        hierarchyPath: [],
        properties: {},
        contents: {},
        totalElements: 0
      };
    }
  }, [parseUnifiedElement]);

  /**
   * S3フォルダから名前空間ファイル一覧取得
   */
  const loadNamespaceFilesFromS3Folder = useCallback(async (folderPath: string): Promise<S3File[]> => {
    try {
      const allFiles = await fetchFileList();
      
      const namespaceFiles = allFiles.filter((file: S3File) => {
        const key = file.key || file.name || '';
        const isInFolder = key.startsWith(folderPath);
        const isXMLFile = key.toLowerCase().endsWith('.xml');
        
        return isInFolder && isXMLFile;
      });
      
      setNamespaceFiles(namespaceFiles);
      setLastNamespaceFolder(folderPath);
      
      return namespaceFiles;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[V2名前空間] ファイル一覧取得エラー:', error);
      throw new Error(`名前空間ファイル一覧取得エラー: ${errorMessage}`);
    }
  }, []);

  /**
   * 名前空間ファイル解析（キャッシュ対応）
   */
  const analyzeNamespaceFile = useCallback(async (fileKey: string): Promise<NamespaceData> => {
    try {
      if (namespaceCache[fileKey]) {
        console.log('[V2名前空間] キャッシュから取得:', fileKey);
        return namespaceCache[fileKey];
      }
      
      const xmlContent = await fetchFileContent(fileKey);
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('名前空間ファイル内容が空です');
      }
      
      console.log('[V2名前空間] ファイル解析開始:', fileKey);
      const parsedNamespace = parseNamespaceXML(xmlContent);
      
      setNamespaceCache(prev => ({
        ...prev,
        [fileKey]: parsedNamespace
      }));
      
      return parsedNamespace;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[V2名前空間] ファイル解析エラー:', error);
      throw new Error(`名前空間ファイル解析エラー: ${errorMessage}`);
    }
  }, [namespaceCache, parseNamespaceXML]);

  /**
   * パターン1: Template全体置き換え
   */
  const replaceTemplateWithNamespace = useCallback((
    namespaceData: NamespaceData,
    templateType: 'properties' | 'contents' = 'properties',
    setEditingTemplate: React.Dispatch<React.SetStateAction<Template>>
  ) => {
    try {
      setEditingTemplate((prev: Template) => {
        const updated = JSON.parse(JSON.stringify(prev));
        
        if (templateType === 'properties' && namespaceData.properties) {
          updated.properties = {};
          
          Object.entries(namespaceData.properties).forEach(([key, propData]) => {
            const processedPropData = JSON.parse(JSON.stringify(propData));
            
            if (!processedPropData.tagName) {
              processedPropData.tagName = 'property';
            }
            
            if (!Array.isArray(processedPropData.children)) {
              processedPropData.children = [];
            }
            
            if (!processedPropData.attributes) processedPropData.attributes = {};
            if (!processedPropData.elements) processedPropData.elements = {};
            
            updated.properties[key] = {
              ...processedPropData,
              namespaceOrigin: true,
              namespaceSource: {
                uri: namespaceData.namespaceURI,
                hierarchyPath: namespaceData.hierarchyPath,
                importedAt: new Date().toISOString()
              }
            };
          });
        }
        
        if (templateType === 'contents' && namespaceData.contents) {
          updated.contents = {};
          
          Object.entries(namespaceData.contents).forEach(([key, contentData]) => {
            const processedContentData = JSON.parse(JSON.stringify(contentData));
            
            if (!processedContentData.tagName) {
              processedContentData.tagName = 'content';
            }
            
            if (!Array.isArray(processedContentData.children)) {
              processedContentData.children = [];
            }
            
            if (!processedContentData.attributes) processedContentData.attributes = {};
            if (!processedContentData.elements) processedContentData.elements = {};
            
            updated.contents[key] = {
              ...processedContentData,
              namespaceOrigin: true,
              namespaceSource: {
                uri: namespaceData.namespaceURI,
                hierarchyPath: namespaceData.hierarchyPath,
                importedAt: new Date().toISOString()
              }
            };
          });
        }
        
        return updated;
      });
      
      console.log('[V2名前空間] Template全体置き換え完了:', templateType);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[V2名前空間] Template全体置き換えエラー:', error);
      throw new Error(`Template全体置き換えエラー: ${errorMessage}`);
    }
  }, []);

  /**
   * パターン2: property/content要素単体置き換え
   */
  const replaceElementWithNamespace = useCallback((
    sectionType: 'properties' | 'contents',
    elementKey: string,
    namespaceData: NamespaceData,
    namespaceElementKey: string,
    setEditingTemplate: React.Dispatch<React.SetStateAction<Template>>
  ) => {
    try {
      console.log('[V2名前空間] 要素単体置き換え開始:', {
        sectionType,
        elementKey,
        namespaceElementKey
      });
      
      const sourceData = sectionType === 'properties' ? namespaceData.properties : namespaceData.contents;
      
      if (!sourceData || !sourceData[namespaceElementKey]) {
        throw new Error(`名前空間に${namespaceElementKey}が見つかりません`);
      }
      
      const namespaceElement = sourceData[namespaceElementKey];
      
      setEditingTemplate((prev: Template) => {
        const updated = JSON.parse(JSON.stringify(prev));
        
        if (!updated[sectionType]) {
          updated[sectionType] = {};
        }
        
        // ディープコピー
        const processedElement = JSON.parse(JSON.stringify(namespaceElement));
        
        if (!processedElement.tagName) {
          processedElement.tagName = sectionType === 'properties' ? 'property' : 'content';
        }
        if (!Array.isArray(processedElement.children)) {
          processedElement.children = [];
        }
        if (!processedElement.attributes) processedElement.attributes = {};
        if (!processedElement.elements) processedElement.elements = {};
        
        updated[sectionType][elementKey] = {
          ...processedElement,
          namespaceOrigin: true,
          namespaceSource: {
            uri: namespaceData.namespaceURI,
            hierarchyPath: namespaceData.hierarchyPath,
            importedAt: new Date().toISOString(),
            originalKey: namespaceElementKey
          }
        };
        
        return updated;
      });
      
      console.log('[V2名前空間] 要素単体置き換え完了:', elementKey);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[V2名前空間] 要素単体置き換えエラー:', error);
      throw new Error(`要素単体置き換えエラー: ${errorMessage}`);
    }
  }, []);

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
    analyzeNamespaceFile,
    replaceTemplateWithNamespace,
    replaceElementWithNamespace
  };
};

export default useNamespaceOperations;