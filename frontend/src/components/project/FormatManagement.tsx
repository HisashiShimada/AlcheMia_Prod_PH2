'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
  theme,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  PlusOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import FormatFolderTree from './FormatFolderTree';
import FormatFileListTable, { type FormatFileData } from './FormatFileListTable';
import FormatSearchModal from './FormatSearchModal';
import FormatUploadDialog from './FormatUploadDialog';
import CreateFormatFileModal, { CreateFormatFileData } from './CreateFormatFileModal';
import CreateFormatFolderModal, { CreateFormatFolderData } from './CreateFormatFolderModal';
import CreateFormatModal from './CreateFormatModal';
import FormatFileDetailModal, { FormatFileDetailData } from './FormatFileDetailModal';
import PetriNetEditorScreen from '@/components/editorv2/PetriNetEditorScreen';
import type { MaimlEditorParams } from '@/types/maimlEditor';
import FormatEditorDialog from '@/components/editorv2/components/FormatEditorDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { App } from 'antd';
import { User } from '@/types/auth';
import { useApi } from '@/hooks/useApi';
import { fetchFormats, fetchFormatFiles, createFormatFile, createFormatSubfolder, createFormatFolder, updateFormatFileContent } from '@/utils/formatApi';
import type { ApiResponse } from '@/types/api';
import type { FormatListResponse } from '@/types/format';
import type { ProjectFile } from '@/types/file';
import { getFileDownloadUrlByKey, deleteFileByKey } from '@/services/fileAccessService';
import { createApiClient } from '@/utils/authUtils';
import { 
  buildPropertyXML, 
  buildContentXML,
  escapeXml
} from '@/components/editorv2/utils/converters/reactFlowToMaiml';
import { Property, Content } from '@/types/maiml-unified';
import { PropertyData } from '@/components/editorv2/components/NestedPropertyEditor';

const { Title, Text } = Typography;

/**
 * フォーマットの型定義
 */
interface Format {
  id: string;
  name: string;
  folderName: string;
  description: string;
  fileCount: number;
  fileType: 'xml' | 'maiml';
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * フォーマットファイルの型定義
 */
interface FormatFile {
  root: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    lastModified: string;
    type: string;
    version?: string;
    description?: string;
  }>;
}

/**
 * FormatManagementのProps型定義
 */
interface FormatManagementProps {
  user: User;
}

/**
 * フォーマット管理画面メインコンポーネント
 * XMLフォーマットファイルの管理に特化
 */
const FormatManagement: React.FC<FormatManagementProps> = ({ user }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const [formats, setFormats] = useState<Format[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'xml' | 'maiml'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFileModalOpen, setCreateFileModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [createFormatModalOpen, setCreateFormatModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FormatFileDetailData | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'updatedAt' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentFolderPath, setCurrentFolderPath] = useState<string[]>([]);
  const [formatFilesData, setFormatFilesData] = useState<Record<string, { allFiles: FormatFileData[] }>>({});
  
  // PetriNetEditor表示用State
  const [showPetriNetEditor, setShowPetriNetEditor] = useState(false);
  const [editingMaimlFile, setEditingMaimlFile] = useState<FormatFileDetailData | null>(null);
  const [maimlFileContent, setMaimlFileContent] = useState<string | null>(null);
  const [isLoadingMaimlContent, setIsLoadingMaimlContent] = useState(false);
  
  // TemplateEditorDialog表示用State
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingXmlFile, setEditingXmlFile] = useState<FormatFileDetailData | null>(null);

  // フォーマット一覧をAPI経由で取得
  const { 
    data: formatsData, 
    isLoading: isLoadingFormats, 
    error: formatsError, 
    refetch: refetchFormats 
  } = useApi<ApiResponse<FormatListResponse>>(
    fetchFormats,
    []
  );

  // フォーマットデータが取得できたらstateを更新
  React.useEffect(() => {
    if (formatsData?.data.folders) {
      // Data synchronization in useEffect is a valid pattern
       
      setFormats(formatsData.data.folders as Format[]);
    }
  }, [formatsData]);

  // ソート処理
  const handleSortChange = useCallback((newSortBy: 'name' | 'category' | 'updatedAt') => {
    if (sortBy === newSortBy) {
      // 同じ項目をクリックした場合、順序を反転
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 異なる項目をクリックした場合、昇順でソート
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // フィルタリングとソート
  const filteredAndSortedFormats = useMemo(() => {
    const filtered = formats.filter((format) => {
      // カテゴリの表示値を取得
      const getCategoryLabel = (category: string) => {
        const key = `formatManagement.${category}`;
        return t(key) || category;
      };
      
      // ファイルタイプの表示値（そのまま大文字）
      const fileTypeLabel = format.fileType.toUpperCase();
      
      // 検索クエリでフィルタリング - すべての項目を対象（表示値も含む）
      const matchesSearch =
        searchQuery === '' ||
        format.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.fileType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fileTypeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryLabel(format.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.createdAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.updatedAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // カテゴリフィルタリング
      const matchesCategory = categoryFilter === 'all' || format.category === categoryFilter;

      // ファイルタイプフィルタリング
      const matchesFileType = fileTypeFilter === 'all' || format.fileType === fileTypeFilter;

      return matchesSearch && matchesCategory && matchesFileType;
    });

    // ソート処理（sortByがnullの場合はバックエンドの順序をそのまま使用）
    if (!sortBy) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [formats, searchQuery, categoryFilter, fileTypeFilter, sortBy, sortOrder, t]);

  // フォーマット選択時
  const handleFormatSelect = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
  }, []);

  // リフレッシュ
  const handleRefresh = React.useCallback(() => {
    console.log('Refreshing format list...');
    refetchFormats();
  }, [refetchFormats]);

  // 新規ファイル作成モーダルを開く
  const handleOpenCreateFileModal = useCallback(() => {
    if (!selectedFormatId) {
      message.warning(t('formatManagement.select_format') || 'フォーマットを選択してください');
      return;
    }
    setCreateFileModalOpen(true);
  }, [selectedFormatId, t]);

  // 新規ファイル作成モーダルを閉じる
  const handleCloseCreateFileModal = useCallback(() => {
    setCreateFileModalOpen(false);
  }, []);

  // 新規フォルダ作成モーダルを開く
  const handleOpenCreateFolderModal = useCallback(() => {
    if (!selectedFormatId) {
      message.warning(t('formatManagement.select_format') || 'フォーマットを選択してください');
      return;
    }
    setCreateFolderModalOpen(true);
  }, [selectedFormatId, t]);

  // 新規フォルダ作成モーダルを閉じる
  const handleCloseCreateFolderModal = useCallback(() => {
    setCreateFolderModalOpen(false);
  }, []);

  // ファイル編集ハンドラ
  const handleFileEdit = useCallback(async (file: FormatFileDetailData) => {
    console.log('ファイル編集:', file);
    
    // ファイル拡張子で判定
    const fileName = file.name.toLowerCase();
    const isMaimlFile = fileName.endsWith('.maiml');
    const isXmlFile = fileName.endsWith('.xml');
    
    if (isMaimlFile) {
      // MAIMLファイル: PetriNetEditorを開く
      console.log('📝 [FormatManagement] MAIMLファイル編集:', file.name);
      setEditingMaimlFile(file);
      
      // ファイル内容を読み込む
      setIsLoadingMaimlContent(true);
      setMaimlFileContent(null);
      
      try {
        // ファイルパスがある場合は読み込みを試みる
        if (file.path && file.path.trim() !== '') {
          console.log('📂 [FormatManagement] ファイル内容読み込み開始:', file.path);
          
          try {
            // プロキシ方式: バックエンド経由でファイル内容を取得
            console.log('📂 [FormatManagement] ファイル内容取得開始（プロキシ方式）:', file.path);
            const client = createApiClient();
            
            // responseType: 'blob'でファイル内容をBlobとして取得
            const response = await client.post('/files/download-url', 
              { fileKey: file.path },
              { responseType: 'blob' }
            );
            
            // BlobをTextに変換
            const blob = response.data as Blob;
            const maimlContent = await blob.text();
            
            // 中身が実質空（空白のみ、非常に短い）の場合は新規扱い
            if (maimlContent.trim().length > 0) {
              console.log('✅ [FormatManagement] ファイル内容読み込み完了（既存ファイル）');
              setMaimlFileContent(maimlContent);
            } else {
              console.log('🆕 [FormatManagement] ファイルは存在するが中身が空 - 新規扱い');
              setMaimlFileContent(null);
            }
          } catch (fetchError) {
            // ネットワークエラーまたはファイルが存在しない場合は新規扱い
            console.log('🆕 [FormatManagement] ファイル読み込みエラー - 新規扱い:', fetchError);
            setMaimlFileContent(null);
          }
        } else {
          // パスがない場合は新規作成
          console.log('🆕 [FormatManagement] パス未設定 - 新規作成モード');
          setMaimlFileContent(null);
        }
        
        setShowPetriNetEditor(true);
        } catch (error) {
          console.error('❌ [FormatManagement] ファイル読み込みエラー:', error);
          message.error(t('formatManagement.messages.file_load_failed') + ': ' + (error as Error).message);
          setEditingMaimlFile(null);
        } finally {
        setIsLoadingMaimlContent(false);
      }
    } else if (isXmlFile) {
      // ✅ Phase 1-1: XMLファイル編集 - 空ファイル検出とデフォルトXML生成
      console.log('📝 [FormatManagement] XMLファイル編集:', file.name);
      
      // ファイル内容を読み込む
      let xmlContent = '';
      
      if (file.path && file.path.trim() !== '') {
        try {
          console.log('📂 [FormatManagement] XMLファイル内容読み込み開始:', file.path);
          const client = createApiClient();
          
          const response = await client.post('/files/download-url', 
            { fileKey: file.path },
            { responseType: 'blob' }
          );
          
          const blob = response.data as Blob;
          xmlContent = await blob.text();
          
          console.log('✅ [FormatManagement] XMLファイル内容読み込み完了');
        } catch (error) {
          console.log('🆕 [FormatManagement] XMLファイル読み込みエラー - 新規扱い:', error);
          xmlContent = '';
        }
      }
      
      // ✅ Phase 2: XMLをPropertyData形式にパース（直接実装）
      const parsedProperties: Record<string, PropertyData> = {};
      const parsedContents: Record<string, PropertyData> = {};
      let isNewFile = false;
      
      // 空ファイル検出
      if (!xmlContent || xmlContent.trim() === '') {
        console.log('🆕 [FormatManagement] 空XMLファイル検出 - 新規作成モード');
        isNewFile = true;
      } else {
        // 既存XMLをパース（FormatManagement.tsx内で直接実装）
        try {
          // DOMParserでXMLをパース
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
          
          // パースエラーをチェック
          const parserError = xmlDoc.querySelector('parsererror');
          if (parserError) {
            throw new Error('XMLパースエラー: ' + (parserError.textContent || '不明なエラー'));
          }
          
          // ルート要素を取得
          const rootElement = xmlDoc.documentElement;
          
          if (rootElement.tagName !== 'keyDictionary') {
            throw new Error(`期待しないルート要素: ${rootElement.tagName}（keyDictionaryである必要があります）`);
          }
          
          // properties を解析
          const propertyElements = rootElement.querySelectorAll(':scope > property');
          propertyElements.forEach(propElement => {
            const propertyData = parsePropertyElement(propElement as Element);
            if (propertyData) {
              parsedProperties[propertyData.key] = propertyData;
            }
          });
          
          // contents を解析
          const contentElements = rootElement.querySelectorAll(':scope > content');
          contentElements.forEach(contentElement => {
            const contentData = parsePropertyElement(contentElement as Element);
            if (contentData) {
              parsedContents[contentData.key] = contentData;
            }
          });
          
          console.log('✅ [FormatManagement] keyDictionary XMLパース成功:', {
            propertiesCount: Object.keys(parsedProperties).length,
            contentsCount: Object.keys(parsedContents).length
          });
        } catch (parseError) {
          console.error('❌ [FormatManagement] XMLパースエラー:', parseError);
          message.error(t('formatManagement.messages.xml_parse_failed') + ': ' + (parseError as Error).message);
          return;
        }
      }
      
      /**
       * property要素またはcontent要素をPropertyData形式にパース（再帰的）
       */
      function parsePropertyElement(element: Element): PropertyData | null {
        const key = element.getAttribute('key');
        if (!key) {
          return null;
        }
        
        const tagName = element.tagName;
        const attributes: Record<string, string> = {};
        Array.from(element.attributes).forEach(attr => {
          if (attr.name !== 'key') {
            attributes[attr.name] = attr.value;
          }
        });
        
        const elements: Record<string, string> = {};
        const elementChildren = Array.from(element.children).filter(
          child => child.tagName !== 'property' && child.tagName !== 'content'
        );
        elementChildren.forEach(child => {
          elements[child.tagName] = child.textContent || '';
        });
        
        const children: PropertyData[] = [];
        const childPropertyElements = Array.from(element.children).filter(
          child => child.tagName === 'property' || child.tagName === 'content'
        );
        childPropertyElements.forEach(childElement => {
          const childData = parsePropertyElement(childElement as Element);
          if (childData) {
            children.push(childData);
          }
        });
        
        return {
          key,
          tagName,
          attributes,
          elements,
          children
        };
      }
      
      // XMLコンテンツとパース結果をファイル情報に追加してTemplateEditorDialogを開く
      setEditingXmlFile({
        ...file,
        content: xmlContent,
        parsedProperties,
        parsedContents,
        isNewFile
      });
      setShowTemplateEditor(true);
    } else {
      // その他のファイル: エラーメッセージ
      message.error(t('formatManagement.messages.unsupported_file_type'));
    }
  }, [t, message]);
  
  // ファイルダウンロードハンドラ
  const handleFileDownload = useCallback(async (file: FormatFileData) => {
    try {
      console.log('📥 ファイルダウンロード開始:', file.name);
      
      // ファイルパスが存在するか確認
      if (!file.path || file.path.trim() === '') {
        throw new Error('ファイルパスが指定されていません');
      }

      // 既存APIを使用してダウンロード
      await getFileDownloadUrlByKey(file.path);

      // 成功メッセージ表示
      message.success(t('formatManagement.messages.download_started').replace('{{fileName}}', file.name));
    } catch (error) {
      console.error('❌ ダウンロードエラー:', error);
      message.error(
        t('formatManagement.messages.download_failed') + `: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      );
    }
  }, [t, message]);

  // ファイル削除ハンドラ
  const handleFileDelete = useCallback(async (file: FormatFileData) => {
    // 削除確認モーダルを表示
    modal.confirm({
      title: t('formatManagement.dialog.delete_title'),
      content: t('formatManagement.dialog.delete_confirm').replace('{{fileName}}', file.name),
      okText: t('formatManagement.dialog.delete_ok'),
      okButtonProps: { danger: true },
      cancelText: t('formatManagement.dialog.delete_cancel'),
      onOk: async () => {
        try {
          console.log('🗑️ ファイル削除開始:', file.name);
          
          // 削除API呼び出し（共通化されたdeleteFileByKeyを使用）
          await deleteFileByKey(file.path);
          
          message.success(t('formatManagement.dialog.delete_success').replace('{{fileName}}', file.name));
          
          // ファイル一覧を更新
          if (selectedFormatId) {
            try {
              const currentPath = currentFolderPath.length > 0 
                ? currentFolderPath.join('/')
                : undefined;
              
              const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
              
              const cacheKey = currentPath 
                ? `${selectedFormatId}/${currentPath}`
                : selectedFormatId;
              
              setFormatFilesData(prev => ({
                ...prev,
                [cacheKey]: {
                  allFiles: (fileResponse.success && fileResponse.data?.files) 
                    ? fileResponse.data.files as FormatFileData[] 
                    : [],
                }
              }));
              
              console.log('✅ ファイル一覧更新完了');
            } catch (refreshError) {
              console.error('❌ ファイル一覧更新エラー:', refreshError);
            }
          }
          
          // フォーマット一覧も更新（ファイル数が変わる可能性があるため）
          handleRefresh();
        } catch (error) {
          console.error('❌ 削除エラー:', error);
          message.error(
            `ファイルの削除に失敗しました: ${
              error instanceof Error ? error.message : '不明なエラー'
            }`
          );
        }
      },
    });
  }, [selectedFormatId, currentFolderPath, handleRefresh, message]);

  // ファイル詳細表示ハンドラ
  const handleFileDetail = useCallback((file: FormatFileDetailData) => {
    console.log('ファイル詳細表示:', file);
    // 作成者情報を付与（現在はログインユーザー情報を使用）
    const fileWithCreator: FormatFileDetailData = {
      ...file,
      createdBy: user.id,
      createdByName: user.displayName,
      createdAt: file.createdAt || file.lastModified, // 作成日がない場合は最終更新日を使用
    };
    setSelectedFile(fileWithCreator);
    setDetailModalOpen(true);
  }, [user]);

  // 詳細モーダルを閉じる
  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedFile(null);
  }, []);

  // 選択したフォーマットとそのファイル一覧を取得
  const selectedFormat = useMemo(() => {
    return formats.find((f) => f.id === selectedFormatId) || null;
  }, [formats, selectedFormatId]);

  // 選択されたフォーマットのファイルタイプ
  const selectedFileType = selectedFormat?.fileType || null;

  // フォーマット選択時、またはフォルダ移動時にファイルを取得
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  
  React.useEffect(() => {
    const loadFormatFiles = async () => {
      if (!selectedFormatId || !selectedFormat) {
        console.log('⏳ [FormatManagement] No format selected, skipping file load');
        return;
      }
      
      try {
        setIsLoadingFiles(true);
        
        // 現在のフォルダパスを取得
        const currentPath = currentFolderPath.length > 0 
          ? currentFolderPath.join('/')
          : undefined;
        
        console.log('📂 [FormatManagement] Loading files for format:', selectedFormat.name, 'path:', currentPath || 'root');
        
        // 現在のフォルダの直下のファイル・フォルダのみを取得
        const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
        
        const files = (fileResponse.success && fileResponse.data?.files) ? fileResponse.data.files as FormatFileData[] : [];
        
        console.log('✅ [FormatManagement] Files loaded:', files.length);
        
        // キャッシュキーを生成（フォーマットID + パス）
        const cacheKey = currentPath 
          ? `${selectedFormatId}/${currentPath}`
          : selectedFormatId;
        
        setFormatFilesData(prev => ({
          ...prev,
          [cacheKey]: { allFiles: files }
        }));
      } catch (error) {
        console.error('❌ [FormatManagement] Failed to fetch format files:', error);
        message.error(t('formatManagement.messages.file_list_load_failed'));
      } finally {
        setIsLoadingFiles(false);
      }
    };
    
    loadFormatFiles();
  }, [selectedFormatId, selectedFormat, currentFolderPath]);

  // 新規ファイル作成ハンドラ
  const handleCreateFormatFile = useCallback(async (data: CreateFormatFileData) => {
    try {
      console.log('📝 [FormatManagement] 新規フォーマットファイル作成:', data);
      
      // XMLファイルの場合、templateTypeに応じたメッセージ
      if (data.fileType === 'xml' && data.templateType) {
        console.log(`✅ [FormatManagement] テンプレートタイプ: ${data.templateType}`);
      }
      
      // formatApi.tsから直接呼び出し
      const apiRequestData = {
        fileName: data.fileNameWithExtension,
        currentPath: data.currentPath,
      };
      
      console.log('🚀 [FormatManagement] Calling createFormatFile API:', {
        formatId: data.formatId,
        apiRequestData,
      });
      
      const response = await createFormatFile(data.formatId, apiRequestData);
      
      // 型ガード: success === true の場合のみ data にアクセス
      if (response.success) {
        console.log('✅ [FormatManagement] ファイル作成成功:', response.data);
      }
      
      // 成功メッセージを表示（テンプレートタイプを含む）
      const successMessage = data.fileType === 'xml' && data.templateType
        ? `${data.templateType}テンプレートが作成されました`
        : 'ファイルが正常に作成されました';
      
      message.success({
        content: t('formatManagement.create.success') || successMessage,
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateFileModal();
      
      // ファイル一覧を最新化（現在のパスのファイルを再取得）
      if (selectedFormatId && selectedFormat) {
        try {
          const currentPath = currentFolderPath.length > 0 
            ? currentFolderPath.join('/')
            : undefined;
          
          const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
          
          const cacheKey = currentPath 
            ? `${selectedFormatId}/${currentPath}`
            : selectedFormatId;
          
          setFormatFilesData(prev => ({
            ...prev,
            [cacheKey]: {
              allFiles: (fileResponse.success && fileResponse.data?.files) 
                ? fileResponse.data.files as FormatFileData[] 
                : [],
            }
          }));
          
          console.log('✅ ファイル一覧更新完了');
          
          // 強制的に再レンダリングを促す
          setFormatFilesData(prev => ({ ...prev }));
        } catch (error) {
          console.error('❌ [FormatManagement] Failed to refresh files after creation:', error);
        }
      }
      
      // フォーマット一覧を更新
      handleRefresh();
    } catch (error) {
      console.error('❌ [FormatManagement] ファイル作成エラー:', error);
      
      // Axiosエラーからメッセージを抽出
      let errorMessage = 'ファイルの作成に失敗しました';
      
      // 型ガードでAxiosエラーかチェック
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { code?: string; message?: string } } }; message?: string };
        if (axiosError.response?.data?.error?.message) {
          // バックエンドからのエラーメッセージ（error.message）
          errorMessage = axiosError.response.data.error.message;
        } else if (axiosError.message) {
          // その他のエラー
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      message.error({
        content: errorMessage,
        duration: 3,
      });
      
      // エラーオブジェクトにメッセージを設定してthrow
      const enrichedError = new Error(errorMessage);
      throw enrichedError;
    }
  }, [t, handleCloseCreateFileModal, handleRefresh, selectedFormatId, selectedFormat]);

  // 新規フォルダ作成ハンドラ（フォーマット内サブフォルダ作成）
  const handleCreateFormatFolder = useCallback(async (data: CreateFormatFolderData) => {
    try {
      console.log('📁 [FormatManagement] フォーマット内サブフォルダ作成:', data);
      
      // formatApi.tsから直接呼び出し
      const response = await createFormatSubfolder(
        data.formatId,        // formatName
        data.folderName,      // subfolderName
        data.currentPath || '' // parentPath（現在のパス、未指定時はルート直下）
      );
      
      // 型ガード: success === true の場合のみ data にアクセス
      if (response.success) {
        console.log('✅ [FormatManagement] サブフォルダ作成成功:', response.data);
      }
      
      // 成功メッセージを表示
      message.success({
        content: t('formatManagement.folder_create_success') || 'フォルダが正常に作成されました',
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateFolderModal();
      
      // ファイル一覧を最新化（現在のパスのファイルを再取得）
      if (selectedFormatId && selectedFormat) {
        try {
          const currentPath = currentFolderPath.length > 0 
            ? currentFolderPath.join('/')
            : undefined;
          
          const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
          
          const cacheKey = currentPath 
            ? `${selectedFormatId}/${currentPath}`
            : selectedFormatId;
          
          setFormatFilesData(prev => ({
            ...prev,
            [cacheKey]: {
              allFiles: (fileResponse.success && fileResponse.data?.files) 
                ? fileResponse.data.files as FormatFileData[] 
                : [],
            }
          }));
          
          console.log('✅ ファイル一覧更新完了');
          
          // 強制的に再レンダリングを促す
          setFormatFilesData(prev => ({ ...prev }));
        } catch (error) {
          console.error('❌ [FormatManagement] Failed to refresh files after folder creation:', error);
        }
      }
    } catch (error) {
      console.error('❌ [FormatManagement] フォルダ作成エラー:', error);
      message.error({
        content: (error as Error).message || t('formatManagement.folder_create_error') || 'フォルダの作成に失敗しました',
        duration: 3,
      });
      throw error;
    }
  }, [t, handleCloseCreateFolderModal, selectedFormatId, selectedFormat]);

  // 新規フォーマットフォルダ作成ハンドラ（部門直下）
  const handleCreateFormat = useCallback(async (folderName: string) => {
    try {
      console.log('📁 [FormatManagement] 新規フォーマットフォルダ作成（部門直下）:', folderName);
      
      // API呼び出し（共通化されたcreateFormatFolderを使用）
      const response = await createFormatFolder(folderName);
      
      // 型ガード: success === true の場合のみ data にアクセス
      if (response.success) {
        console.log('✅ [FormatManagement] フォルダ作成成功:', response.data);
      }
      
      // モーダルを閉じる
      setCreateFormatModalOpen(false);
      
      // フォーマット一覧を更新（成功はモーダルが閉じて一覧が更新されることで確認できる）
      handleRefresh();
    } catch (error) {
      console.error('❌ [FormatManagement] フォルダ作成エラー:', error);
      
      // エラーをthrow（CreateFormatModalでcatchされる）
      throw error;
    }
  }, [handleRefresh]);

  // フォルダクリックハンドラ
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      // 戻るボタン - 1階層だけ戻る
      setCurrentFolderPath(currentFolderPath.slice(0, -1));
    } else {
      // フォルダIDからフォルダ名を抽出（パスの最後の部分）
      const folderName = folderId.includes('/') 
        ? folderId.split('/').pop() || folderId 
        : folderId;
      
      setCurrentFolderPath([...currentFolderPath, folderName]);
    }
  }, [currentFolderPath]);

  // パンくずリストクリックハンドラ
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      // ルートに戻る
      setCurrentFolderPath([]);
    } else {
      // 指定されたフォルダまで戻る
      setCurrentFolderPath(currentFolderPath.slice(0, index + 1));
    }
  }, [currentFolderPath]);

  // フォーマット選択時にパスをリセット
  const handleFormatSelectWithReset = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
    setCurrentFolderPath([]);
  }, []);

  const formatFiles = useMemo((): FormatFileData[] => {
    if (!selectedFormatId) {
      return [];
    }
    
    // キャッシュキーを生成（フォーマットID + パス）
    const currentPath = currentFolderPath.length > 0 
      ? currentFolderPath.join('/')
      : undefined;
    const cacheKey = currentPath 
      ? `${selectedFormatId}/${currentPath}`
      : selectedFormatId;
    
    const formatData = formatFilesData[cacheKey];
    if (!formatData || !formatData.allFiles) {
      return [];
    }
    
    console.log('📂 [FormatManagement] Showing files:', {
      cacheKey,
      totalFiles: formatData.allFiles.length,
      currentFolderPath,
      samplePaths: formatData.allFiles.slice(0, 5).map(f => f.path)
    });
    
    // APIから取得したファイル一覧をそのまま表示（フィルタリング不要）
    const files = formatData.allFiles;
    
    // 戻るボタンを追加（サブフォルダ内の場合）
    if (currentFolderPath.length > 0) {
      return [
        {
          id: 'back',
          name: '↑ 戻る',
          path: '',
          size: 0,
          lastModified: '',
          type: 'folder',
          isFolder: true,
          fileCount: undefined,
        },
        ...files
      ];
    }
    
    return files;
  }, [selectedFormatId, currentFolderPath, formatFilesData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: token.colorBgLayout }}>
      {/* ツールバー */}
      <Card
        variant="borderless"
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 0,
        }}
        styles={{ body: { padding: `${token.margin}px ${token.paddingLG}px` } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 上段: 検索・フィルタ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Space orientation="horizontal" size="small" wrap>
              {/* カテゴリ絞込 */}
              <Space size={4} orientation="horizontal">
                <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                  {t('formatManagement.filter_labels.category')}
                </Text>
                <Select
                  style={{ width: 150 }}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: 'all', label: t('formatManagement.all') },
                    { value: 'protocol', label: t('formatManagement.protocol') },
                    { value: 'material', label: t('formatManagement.material') },
                    { value: 'measurement', label: t('formatManagement.measurement') },
                    { value: 'analysis', label: t('formatManagement.analysis') },
                    { value: 'sample', label: t('formatManagement.sample') },
                    { value: 'device', label: t('formatManagement.device') },
                  ]}
                />
              </Space>

              {/* ファイルタイプ絞込 */}
              <Space size={4} orientation="horizontal">
                <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                  {t('formatManagement.filter_labels.file_type')}
                </Text>
                <Select
                  style={{ width: 150 }}
                  value={fileTypeFilter}
                  onChange={(value) => setFileTypeFilter(value as 'all' | 'xml' | 'maiml')}
                  options={[
                    { value: 'all', label: t('formatManagement.all') },
                    { value: 'xml', label: 'XML' },
                    { value: 'maiml', label: 'MaiML' },
                  ]}
                />
              </Space>

              {/* 検索バー */}
              <Space size={4} orientation="horizontal">
                <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                  {t('formatManagement.filter_labels.search')}
                </Text>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder={t('formatManagement.filter_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
              </Space>

              {/* 詳細検索ボタン */}
              <Button 
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => setSearchModalOpen(true)}
              >
                {t('formatManagement.advanced_search')}
              </Button>
            </Space>

            {/* 右側: リフレッシュボタン */}
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              {t('progress.refresh')}
            </Button>
          </div>

          {/* 下段: 新規フォーマットフォルダボタン */}
          <div>
            <Button
              type="primary"
              icon={<FolderAddOutlined />}
              style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
              onClick={() => setCreateFormatModalOpen(true)}
            >
              {t('formatManagement.buttons.new_format_folder')}
            </Button>
          </div>
        </div>
      </Card>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: フォーマット一覧（画面の約1/3） */}
        <div style={{ width: '33%', minWidth: 350, maxWidth: 500, flexShrink: 0 }}>
          <FormatFolderTree
            formats={filteredAndSortedFormats}
            selectedFormatId={selectedFormatId}
            onFormatSelect={handleFormatSelectWithReset}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </div>

        {/* 右側: XMLファイル一覧 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedFormat ? (
            <>
              {/* フォーマット情報ヘッダー */}
              <Card
                variant="borderless"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                styles={{ body: { padding: token.margin } }}
              >
                <div>
                  <Title level={5} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>
                    {selectedFormat.name}
                  </Title>
                  <Text type="secondary" style={{ marginTop: token.marginXS, display: 'block' }}>
                    {selectedFormat.description}
                  </Text>
                </div>
              </Card>

              {/* フォーマット操作ツールバー */}
              <Card
                variant="borderless"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                styles={{ body: { padding: token.margin } }}
              >
                <Space size="small">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    onClick={handleOpenCreateFileModal}
                  >
                    {selectedFileType === 'xml' ? t('formatManagement.new_xml_file') : t('formatManagement.new_maiml_file')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<FolderAddOutlined />}
                    style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    onClick={handleOpenCreateFolderModal}
                  >
                    {t('formatManagement.buttons.new_subfolder')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    {t('formatManagement.upload')}
                  </Button>
                </Space>
              </Card>

              {/* XMLファイル一覧 */}
              <div style={{ flex: 1, overflow: 'auto', padding: token.margin }}>
                {isLoadingFiles ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    minHeight: 300,
                    gap: token.margin
                  }}>
                    <Spin size="large" />
                    <Text type="secondary">{t('formatManagement.loading.loading')}</Text>
                  </div>
                ) : (
                <FormatFileListTable
                  files={formatFiles}
                  onFileClick={(file) => console.log('File clicked:', file.name)}
                  onFolderClick={handleFolderClick}
                  onEdit={handleFileEdit}
                  onDownload={handleFileDownload}
                  onDelete={handleFileDelete}
                />
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5} type="secondary">
                  {t('formatManagement.select_format')}
                </Title>
                <Text type="secondary">
                  {t('formatManagement.select_format_description')}
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フォーマットファイル検索モーダル */}
      <FormatSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onFileSelect={(file) => {
          console.log('検索結果からファイルが選択されました:', file);
          // TODO: ファイル選択時の処理を実装
          // 例: ファイルエディタを開く、ファイルダウンロードなど
        }}
      />

      {/* フォーマットファイルアップロードダイアログ */}
      <FormatUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        baseFolder={selectedFormat ? {
          id: selectedFormat.id,
          name: selectedFormat.name,
          folderName: selectedFormat.folderName,
          departmentCd: user.departmentCd,
        } : null}
        currentFolderPath={currentFolderPath}
        onUploadComplete={async (result) => {
          console.log('✅ [FormatManagement] アップロード完了:', result);
          
          // ファイル一覧を再読み込み
          if (selectedFormatId && selectedFormat) {
            try {
              const currentPath = currentFolderPath.length > 0 
                ? currentFolderPath.join('/')
                : undefined;
              
              const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
              
              const cacheKey = currentPath 
                ? `${selectedFormatId}/${currentPath}`
                : selectedFormatId;
              
              setFormatFilesData(prev => ({
                ...prev,
                [cacheKey]: {
                  allFiles: (fileResponse.success && fileResponse.data?.files) ? fileResponse.data.files as FormatFileData[] : [],
                }
              }));
              
              console.log('✅ [FormatManagement] ファイル一覧更新完了');
            } catch (error) {
              console.error('❌ [FormatManagement] ファイル一覧更新エラー:', error);
            }
          }
          
          // フォーマット一覧も更新（ファイル数が変わる可能性があるため）
          handleRefresh();
        }}
      />

      {/* 新規フォーマットファイル作成モーダル */}
      <CreateFormatFileModal
        open={createFileModalOpen}
        onCancel={handleCloseCreateFileModal}
        onSubmit={handleCreateFormatFile}
        formatId={selectedFormatId}
        formatName={selectedFormat?.name || null}
        fileType={selectedFileType}
        createdBy={user.id}
        createdByName={user.displayName}
        currentPath={currentFolderPath}
      />

      {/* 新規フォルダ作成モーダル */}
      <CreateFormatFolderModal
        open={createFolderModalOpen}
        onCancel={handleCloseCreateFolderModal}
        onSubmit={handleCreateFormatFolder}
        formatId={selectedFormatId}
        formatName={selectedFormat?.name || null}
        currentPath={currentFolderPath}
      />

      {/* 新規フォーマットフォルダ作成モーダル（部門直下） */}
      <CreateFormatModal
        open={createFormatModalOpen}
        onCancel={() => setCreateFormatModalOpen(false)}
        onSubmit={handleCreateFormat}
        departmentName={user.departmentCd}
      />

      {/* ファイル詳細表示モーダル */}
      <FormatFileDetailModal
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        file={selectedFile}
      />

      {/* PetriNetEditor表示エリア（フルスクリーンモーダル） */}
      {showPetriNetEditor && editingMaimlFile && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: token.colorBgLayout,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* ヘッダー: 閉じるボタン */}
          <div style={{ 
            padding: token.padding, 
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            backgroundColor: token.colorBgContainer,
          }}>
            <Space>
              <Button 
                onClick={() => {
                  setShowPetriNetEditor(false);
                  setEditingMaimlFile(null);
                }}
              >
                {t('formatManagement.buttons.close')}
              </Button>
              <Text strong>{t('formatManagement.loading.editing')}: {editingMaimlFile.name}</Text>
            </Space>
          </div>
          
          {/* PetriNetEditor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isLoadingMaimlContent ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%' 
              }}>
                <Spin size="large" tip={t('formatManagement.loading.file_loading')} >
              <div style={{ minHeight: 100 }} />
            </Spin>
              <div style={{ minHeight: 100 }} />
              </div>
            ) : (
              <PetriNetEditorScreen
                params={{
                  editMode: 'format',
                  editingFileName: editingMaimlFile.name,
                  originalFileName: editingMaimlFile.name.replace(/\.maiml$/i, ''),
                  sourceS3Key: editingMaimlFile.path && editingMaimlFile.path.trim() !== '' 
                    ? editingMaimlFile.path 
                    : '',
                  displayTitle: editingMaimlFile.name,
                  displaySubtitle: selectedFormat?.description,
                  documentId: selectedFormat?.id || editingMaimlFile.id,
                  description: selectedFormat?.description,
                }}
                onClose={() => {
                  setShowPetriNetEditor(false);
                  setEditingMaimlFile(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* TemplateEditorDialog表示エリア */}
      {showTemplateEditor && editingXmlFile && (() => {
        // 一時的なノードを作成（Date.now()の警告を回避するためuseMemoの代わりに即時関数を使用）
        const tempId = `temp_${editingXmlFile.id}_${editingXmlFile.lastModified}`;
        
        // ✅ フォーマットカテゴリからplaceTypeを判定
        // 優先順位: 1. parsedTemplate.category 2. folderName 3. category 4. fileName
        const parsedCategory = editingXmlFile.parsedTemplate?.category;
        const folderName = selectedFormat?.folderName?.toLowerCase() || '';
        const category = selectedFormat?.category?.toLowerCase() || '';
        const fileName = editingXmlFile.name.toLowerCase();
        
        const placeType = 
          // 0. parsedTemplate.categoryから判定（最優先）
          parsedCategory === 'material' ? 'material' as const :
          parsedCategory === 'condition' ? 'condition' as const :
          parsedCategory === 'result' ? 'result' as const :
          // 1. folderNameから判定
          folderName.includes('material') ? 'material' as const :
          folderName.includes('condition') ? 'condition' as const :
          folderName.includes('measurement') || folderName.includes('result') ? 'result' as const :
          // 2. categoryから判定
          category === 'material' ? 'material' as const :
          category === 'condition' ? 'condition' as const :
          category === 'measurement' || category === 'analysis' ? 'result' as const :
          // 3. ファイル名から判定（フォールバック）
          fileName.includes('material') ? 'material' as const :
          fileName.includes('condition') ? 'condition' as const :
          // デフォルト
          'result' as const;
        
        console.log('🔍 [FormatManagement] placeType判定:', {
          parsedCategory,
          folderName: selectedFormat?.folderName,
          category: selectedFormat?.category,
          fileName: editingXmlFile.name,
          determinedPlaceType: placeType,
          hasParsedTemplate: !!editingXmlFile.parsedTemplate
        });
        
        // ✅ Phase 2: parsedTemplateがあればtemplateRefとして設定
        const tempNode = {
          id: tempId,
          type: `${placeType}Template`,
          position: { x: 0, y: 0 },
          data: {
            id: tempId,
            name: editingXmlFile.name.replace('.xml', ''),
            description: '',
            placeType: placeType,
            nodeType: 'place' as const,
            // ✅ parsedPropertiesとparsedContentsを直接渡す（Template型経由なし）
            ...(editingXmlFile.parsedProperties && {
              parsedProperties: editingXmlFile.parsedProperties
            }),
            ...(editingXmlFile.parsedContents && {
              parsedContents: editingXmlFile.parsedContents
            }),
            // 新規ファイルフラグ
            isNewFile: editingXmlFile.isNewFile
          },
        };
        
        return (
          <FormatEditorDialog
            open={showTemplateEditor}
            onClose={() => {
              setShowTemplateEditor(false);
              setEditingXmlFile(null);
            }}
            node={tempNode}
            onSave={async (
              nodeId: string,
              properties: Property[],
              contents: Content[],
              templateId: string,
              name: string,
              description: string,
              category: string
            ) => {
              console.log('📝 [FormatManagement] XML保存開始:', {
                templateId,
                name,
                category,
                propertiesCount: properties.length,
                contentsCount: contents.length
              });
              
              try {
                // ✅ xmlns属性の構築（S3パスから拡張子とUUIDを除去）
                let s3PathWithoutExt = editingXmlFile.path.replace(/\.xml$/i, '');
                // パスの最初の部分がUUID形式（8-4-4-4-12）の場合は除去
                // 例: a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/... → formats/...
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
                s3PathWithoutExt = s3PathWithoutExt.replace(uuidPattern, '');
                const xmlns = `http://abc.com/schema/keyDictionary/${s3PathWithoutExt}`;
                
                // ✅ keyDictionary XML生成（直接実装）
                let xmlContent = `<keyDictionary xmlns="${escapeXml(xmlns)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
                
                // property要素群を出力
                properties.forEach(prop => {
                  xmlContent += buildPropertyXML(prop, 1);
                });
                
                // content要素群を出力
                contents.forEach(content => {
                  xmlContent += buildContentXML(content, 1);
                });
                
                xmlContent += `</keyDictionary>\n`;
                
                console.log('📄 [FormatManagement] 生成されたXML:', xmlContent.substring(0, 500) + '...');
                
                // バックエンドAPIに保存（共通化されたupdateFormatFileContentを使用）
                await updateFormatFileContent(editingXmlFile.path, xmlContent);
                
                console.log('✅ [FormatManagement] ファイル保存成功:', editingXmlFile.path);
                
                message.success('保存しました');
                
                // ファイル一覧を更新
                if (selectedFormatId && selectedFormat) {
                  const currentPath = currentFolderPath.length > 0 
                    ? currentFolderPath.join('/')
                    : undefined;
                  const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
                  const cacheKey = currentPath 
                    ? `${selectedFormatId}/${currentPath}`
                    : selectedFormatId;
                  setFormatFilesData(prev => ({
                    ...prev,
                    [cacheKey]: {
                      allFiles: (fileResponse.success && fileResponse.data?.files) 
                        ? fileResponse.data.files as FormatFileData[] 
                        : [],
                    }
                  }));
                }
                
                setShowTemplateEditor(false);
                setEditingXmlFile(null);
              } catch (error) {
                console.error('❌ [FormatManagement] デバッグエラー:', error);
                message.error('デバッグ処理でエラーが発生しました: ' + (error as Error).message);
              }
            }}
          />
        );
      })()}
    </div>
  );
};

export default FormatManagement;
