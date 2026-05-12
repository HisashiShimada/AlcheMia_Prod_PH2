/**
 * TemplateEditorDialog - Template編集ダイアログ（EditorV2用）
 * 
 * Material-UI → Ant Design変換版
 * Phase 2-1: NestedPropertyEditor実装完了
 * 
 * @version 2.1.0
 * @date 2026-01-30
 */

import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Modal,
  Button,
  Input,
  Form,
  Alert,
  Space,
  Typography,
  Select,
  TreeSelect,
  Divider,
  Tag,
  message,
  Collapse,
  Tabs,
} from 'antd';
import {
  SaveOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { fetchTemplateFiles, type ListFormatsResponse } from '@/services/templateApi';
import { useLanguage } from '@/contexts/LanguageContext';
import type { 
  NodeData, 
  TemplateError,
} from '../../types/editor';
import { Template, Insertion, PlaceRef} from '@/types/maiml-unified';
import NestedPropertyEditor, { type PropertyData } from './NestedPropertyEditor';
import useNamespaceOperations, { type NamespaceData } from '../../hooks/useNamespaceOperations';
import { useAttributeMasters } from '@/hooks/useAttributeMasters';
import {
  convertPropertiesArrayToNestedFormat,
  convertPropertiesArrayToNestedFormatRecursive,
  convertPropertyDataToPropertiesArray,
  convertPropertyDataToContentsArray,
  convertContentsArrayToNestedFormat,
} from '../../utils/templateConverter';
import {
  convertTemplateToXML,
  parseXMLToTemplate,
  validateTemplateXML,
  type ParseError,
  type NestedPropertyData,
  type NestedContentData,
} from '../../utils/templateToXML';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TemplateEditorDialogProps {
  open: boolean;
  node: {
    id: string;
    data: NodeData;
  };
  onClose: () => void;
  onSave: (
    nodeId: string,
    templateRef: Template,
    isNewTemplate: boolean,
    templateCategory: string,
    isCommonTemplate: boolean,
    methodId: string | null
  ) => void;
  allNodes?: Array<{ id: string; data: NodeData }>;
  templateErrors?: Record<string, TemplateError[]>;
}

/**
 * TemplateEditorDialog - メインコンポーネント
 */
const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
  open,
  node,
  onClose,
  onSave,
  allNodes = [],
  templateErrors = {},
}) => {
  const { t } = useLanguage();
  const [hasChanges, setHasChanges] = useState(false);

  // 基本情報State
  const [templateId, setTemplateId] = useState('');
  const [uuid, setUuid] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [placeRefs, setPlaceRefs] = useState<PlaceRef[]>([]);
  
  // Insertion State (MaterialTemplate・ResultTemplateのみ)
  const [insertion, setInsertion] = useState<Insertion>({ uri: '', hash: { method: '', value: ''}, format: '' });

  // ✅ Phase 2-1: NestedPropertyEditor用State
  const [properties, setProperties] = useState<Record<string, PropertyData>>({});
  const [contents, setContents] = useState<Record<string, PropertyData>>({});
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set<string>());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContentAddModal, setShowContentAddModal] = useState(false);
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyTagName, setNewPropertyTagName] = useState('property');
  const [newContentKey, setNewContentKey] = useState('');
  const [newContentTagName, setNewContentTagName] = useState('content');
  const [forceRenderKey, setForceRenderKey] = useState(0);
  // Bug Fix: V1のforceRenderKeyパターンを適用（Contents用）
  const [forceContentRenderKey, setForceContentRenderKey] = useState(0);

  // ✅ XMLビュー用State
  const [activeTabKey, setActiveTabKey] = useState<string>('ui');
  const [xmlContent, setXmlContent] = useState('');
  const [xmlErrors, setXmlErrors] = useState<ParseError[]>([]);
  const [hasUnsyncedXmlChanges, setHasUnsyncedXmlChanges] = useState(false);

  // ✅ Phase 1-1: Place References編集用State
  const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);

  // ✅ Phase 2-2: 名前空間取り込み用State（Reference版に統一）
  const [showNamespaceDialog, setShowNamespaceDialog] = useState(false);
  const [formatsResponse, setFormatsResponse] = useState<ListFormatsResponse>({ departments: [] });
  const [selectedNamespaceFile, setSelectedNamespaceFile] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [importedNamespaces, setImportedNamespaces] = useState<string[]>([]);
  const [namespaceImportMode, setNamespaceImportMode] = useState<'replace_all_properties' | 'replace_all_contents'>('replace_all_properties');

  // ✅ Phase 3: 高度な名前空間取り込みUI用State（Reference版に統一）
  const [namespacePreview, setNamespacePreview] = useState<{
    parsedData?: NamespaceData;
    xmlPreview?: string;
    error?: string;
  }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);

  // ✅ Phase 4: バリデーション用State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // useNamespaceOperations フック
  const { analyzeNamespaceFile, replaceTemplateWithNamespace } = useNamespaceOperations();

  // Attributeマスタ取得（属性追加ダイアログの選択肢用）
  const { attributeRecords } = useAttributeMasters();

  /**
   * テンプレートタイプ判定
   */
  const nodeCategory = useMemo(() => {
    if (!node) return '';
    return node.data.placeType;
  }, [node]);

  /**
   * テンプレートアイコン
   */
  const templateIcon = useMemo(() => {
    if (!node) return <ExperimentOutlined />;
    return node.data.placeType === 'material' ? <ExperimentOutlined /> :
           node.data.placeType === 'condition' ? <SettingOutlined /> :
           <BarChartOutlined />;
  }, [node]);

  /**
   * マージされたテンプレートデータ
   */
  const mergedTemplate: Template | null = useMemo((): Template | null => {
    if (!node) return null;
    
    const template = (node.data.template || {}) as Partial<Template>;
    const templateRef = (node.data.templateRef || {}) as Partial<Template>;
    
    return {
      id: template.id || templateRef.id || '',
      uuid: template.uuid || templateRef.uuid || '',
      name: template.name || templateRef.name || '',
      description: template.description || templateRef.description,
      category: template.category || templateRef.category || '',
      properties: template.properties || templateRef.properties || [],
      contents: template.contents || templateRef.contents || [],
      insertion: template.insertion || templateRef.insertion,
      placeRefs: template.placeRefs || templateRef.placeRefs || [],
      templateRef: template.templateRef,
    };
  }, [node]);

  /**
   * ✅ Phase 2-1: 継承元テンプレートの計算
   */
  const inheritedTemplate = useMemo((): Template | null => {
    if (!mergedTemplate?.templateRef) {
      return null;
    }
    
    // templateRefsから親テンプレートIDを取得（配列または文字列に対応）
    const parentTemplateId = mergedTemplate.templateRef.ref;
    
    if (!parentTemplateId || typeof parentTemplateId !== 'string') {
      return null;
    }
    
    // window.clineAllTemplatesから検索
    if (window.clineAllTemplates) {
      const category = node.data.placeType === 'material' ? 'material' :
                       node.data.placeType === 'condition' ? 'condition' : 'result';
      const templates = window.clineAllTemplates[category];
      
      if (templates.length > 0) {
        const found = templates.find((t: Template) => 
          t.id === parentTemplateId
        );
        if (found) return found as Template;
      }
    }
    
    // allNodesから検索（フォールバック）
    const parentNode = allNodes.find(n => 
      n.id === parentTemplateId || 
      n.data?.template?.id === parentTemplateId ||
      n.data?.templateRef?.id === parentTemplateId
    );
    
    if (parentNode) {
      return (parentNode.data.template || parentNode.data.templateRef) as Template;
    }
    
    return null;
  }, [mergedTemplate, allNodes, node]);

  /**
   * 初期化: ノードデータからStateを設定
   */
  useEffect(() => {
    if (open && node && mergedTemplate) {
      setTemplateId(mergedTemplate.id || '');
      setUuid(mergedTemplate.uuid || '');
      setName(mergedTemplate.name || '');
      setDescription(mergedTemplate.description || '');
      setInsertion(mergedTemplate.insertion || { uri: '', hash: {method : '', value: ''}, format: '' });
      
      // placeRefsの読み込み（文字列配列に正規化）
      const loadedPlaceRefs = mergedTemplate.placeRefs || [];
      setPlaceRefs(loadedPlaceRefs);
      
      // Properties変換
      let convertedProperties: Record<string, PropertyData> = {};
      if (mergedTemplate.properties) {
        if (Array.isArray(mergedTemplate.properties)) {
          convertedProperties = convertPropertiesArrayToNestedFormat(mergedTemplate.properties);
        } else if (typeof mergedTemplate.properties === 'object') {
          // 既にNestedPropertyEditor形式かチェック
          const firstKey = Object.keys(mergedTemplate.properties)[0];
          const firstProp = mergedTemplate.properties[firstKey] as Record<string, unknown>;
          const isAlreadyNestedFormat = firstProp && 
            typeof firstProp === 'object' &&
            ('attributes' in firstProp || 'elements' in firstProp || 'children' in firstProp);
          
          if (isAlreadyNestedFormat) {
            convertedProperties = mergedTemplate.properties as Record<string, PropertyData>;
          }
        }
      }
      
      setProperties(convertedProperties);

      // ✅ Contents変換（useEffectで初期化されていなかったバグを修正）
      let convertedContents: Record<string, PropertyData> = {};
      if (mergedTemplate.contents) {
        if (Array.isArray(mergedTemplate.contents) && mergedTemplate.contents.length > 0) {
          convertedContents = convertContentsArrayToNestedFormat(mergedTemplate.contents);
        }
      }
      setContents(convertedContents);

      setExpandedNodes(new Set());
      setExpandedContentNodes(new Set());
      setForceRenderKey(Date.now());
      setForceContentRenderKey(Date.now());
    }
  }, [open, node, mergedTemplate]);

  /**
   * NestedPropertyEditor用ハンドラー
   */
  const handleToggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddProperty = () => {
    if (!newPropertyKey.trim()) {
      message.error(t('editor.template.propKeyRequired'));
      return;
    }

    if (properties[newPropertyKey.trim()]) {
      message.error(t('editor.template.propKeyDuplicate'));
      return;
    }

    setProperties({
      ...properties,
      [newPropertyKey.trim()]: {
        key: newPropertyKey.trim(),
        tagName: newPropertyTagName,
        attributes: {},
        elements: {},
        children: []
      }
    });

    setNewPropertyKey('');
    setNewPropertyTagName('property');
    setShowAddModal(false);
  };

  const handleAddNestedChild = (parentKey: string, childTagName: string, specifiedKey?: string) => {
    // Bug Fix: ユーザー指定のkeyを優先、なければランダム生成
    const childKey = specifiedKey && specifiedKey.trim() 
      ? specifiedKey.trim() 
      : `${childTagName}_${Date.now()}`;
    
    console.log('🔧 [handleAddNestedChild] 開始:', {
      parentKey,
      childTagName,
      specifiedKey,
      childKey,
      currentPropertiesKeys: Object.keys(properties)
    });
    
    // ✅ バリデーション: 同一階層での重複keyチェック
    const checkDuplicateKey = (obj: Record<string, PropertyData>, targetKey: string, newKey: string): boolean | null => {
      // トップレベルで見つかった場合
      if (obj[targetKey]) {
        const existingKeys = obj[targetKey].children?.map(child => child.key) || [];
        return existingKeys.includes(newKey);
      }
      
      // 再帰的に子要素を探索
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              const existingKeys = child.children?.map(c => c.key) || [];
              return existingKeys.includes(newKey);
            }
            // さらに深く探索
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              const hasDuplicate = checkDuplicateKey(tempObj, targetKey, newKey);
              if (hasDuplicate !== null) {
                return hasDuplicate;
              }
            }
          }
        }
      }
      return null;
    };
    
    // 重複チェック実行
    const hasDuplicate = checkDuplicateKey(properties, parentKey, childKey);
    if (hasDuplicate) {
      message.error(t('editor.template.childKeyDuplicate', { key: childKey }));
      console.error('❌ [handleAddNestedChild] 重複キーエラー:', { parentKey, childKey });
      return;
    }
    
    // Bug Fix: 再帰的検索で深いネストに対応
    const findAndUpdateParent = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      // トップレベルで見つかった場合
      if (obj[targetKey]) {
        if (!obj[targetKey].children) {
          obj[targetKey].children = [];
        }
        obj[targetKey].children.push({
          key: childKey,
          tagName: childTagName,
          attributes: {},
          elements: {},
          children: []
        });
        if (!obj[targetKey].attributes) {
          obj[targetKey].attributes = {};
        }
        obj[targetKey].attributes['xsi:type'] = 'propertyListType';
        return true;
      }
      
      // 再帰的に子要素を探索
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              // 見つかった！
              if (!child.children) {
                child.children = [];
              }
              child.children.push({
                key: childKey,
                tagName: childTagName,
                attributes: {},
                elements: {},
                children: []
              });
              if (!child.attributes) {
                child.attributes = {};
              }
              child.attributes['xsi:type'] = 'propertyListType';
              return true;
            }
            // さらに深く探索（再帰）
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdateParent(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevProperties));
      const found = findAndUpdateParent(updated, parentKey);
      
      if (found) {
        console.log('✅ [handleAddNestedChild] 子要素追加成功');
      } else {
        console.error('❌ [handleAddNestedChild] 親が見つかりません:', parentKey);
      }
      
      return updated;
    });
    
    // Bug Fix: V1パターン - 強制再レンダリング
    setForceRenderKey(Date.now());
    
    // UX改善: 子要素追加後、自動的に展開
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
    setHasChanges(true);
  };

  const handleAddSameLevelCopy = (sourceData: PropertyData, newKey: string) => {
    if (properties[newKey]) {
      message.error(t('editor.template.propKeyDuplicate'));
      return;
    }

    const deepCopy = JSON.parse(JSON.stringify(sourceData));
    deepCopy.key = newKey;
    
    setProperties({
      ...properties,
      [newKey]: deepCopy
    });
    setHasChanges(true);
  };

  const handleUpdateNestedAttribute = (propertyKey: string, attrName: string, attrValue: string) => {
    const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]) {
        if (!obj[targetKey].attributes) {
          obj[targetKey].attributes = {};
        }
        obj[targetKey].attributes[attrName] = attrValue;
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              if (!child.attributes) {
                child.attributes = {};
              }
              child.attributes[attrName] = attrValue;
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdate(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevProperties));
      findAndUpdate(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleUpdateNestedElement = (propertyKey: string, elemName: string, elemValue: string) => {
    const findAndUpdate = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]) {
        if (!obj[targetKey].elements) {
          obj[targetKey].elements = {};
        }
        obj[targetKey].elements[elemName] = elemValue;
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey) {
              if (!child.elements) {
                child.elements = {};
              }
              child.elements[elemName] = elemValue;
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndUpdate(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevProperties));
      findAndUpdate(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteNestedAttribute = (propertyKey: string, attrName: string) => {
    const findAndDelete = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]?.attributes?.[attrName]) {
        delete obj[targetKey].attributes[attrName];
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey && child.attributes?.[attrName]) {
              delete child.attributes[attrName];
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndDelete(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevProperties));
      findAndDelete(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteNestedElement = (propertyKey: string, elemName: string) => {
    const findAndDelete = (obj: Record<string, PropertyData>, targetKey: string): boolean => {
      if (obj[targetKey]?.elements?.[elemName]) {
        delete obj[targetKey].elements[elemName];
        return true;
      }
      
      for (const key in obj) {
        if (obj[key] && obj[key].children && Array.isArray(obj[key].children)) {
          for (let i = 0; i < obj[key].children.length; i++) {
            const child = obj[key].children[i];
            if (child.key === targetKey && child.elements?.[elemName]) {
              delete child.elements[elemName];
              return true;
            }
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
              const tempObj = { [child.key]: child };
              if (findAndDelete(tempObj, targetKey)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    setProperties(prevProperties => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevProperties));
      findAndDelete(updated, propertyKey);
      return updated;
    });
    
    setForceRenderKey(Date.now());
    setHasChanges(true);
  };

  const handleDeleteProperty = (propertyKey: string) => {
    const updated : Record<string, PropertyData> = { ...properties };
    delete updated[propertyKey];
    setProperties(updated);
    setHasChanges(true);
  };

  // Phase 3.2: Contents用ハンドラー群
  const handleToggleContentExpanded = (nodeId : string) => {
    setExpandedContentNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddContent = () => {
    if (!newContentKey.trim()) {
      message.error(t('editor.template.propKeyRequired'));
      return;
    }

    if (contents[newContentKey.trim()]) {
      message.error(t('editor.template.propKeyDuplicate'));
      return;
    }

    setContents({
      ...contents,
      [newContentKey.trim()]: {
        key: newContentKey.trim(),
        tagName: newContentTagName,
        attributes: {},
        elements: {},
        children: []
      }
    });

    setNewContentKey('');
    setNewContentTagName('content');
    setShowContentAddModal(false);
  };

  const handleAddNestedContentChild = (parentKey : string, childTagName : string) => {
    const childKey = `${childTagName}_${Date.now()}`;
    
    // Bug Fix: 深いコピー + 関数型setStateで不変性を保持
    setContents(prevContents => {
      const updated = JSON.parse(JSON.stringify(prevContents));
      if (updated[parentKey]) {
        if (!updated[parentKey].children) {
          updated[parentKey].children = [];
        }
        updated[parentKey].children.push({
          key: childKey,
          tagName: childTagName,
          attributes: {},
          elements: {},
          children: []
        });
        if (!updated[parentKey].attributes) {
          updated[parentKey].attributes = {};
        }
        updated[parentKey].attributes['xsi:type'] = 'propertyListType';
      }
      return updated;
    });
    
    // UX改善: 子要素追加後、自動的に展開
    setExpandedContentNodes(prev => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
  };

  const handleAddContentSameLevelCopy = (sourceData: PropertyData, newKey: string) => {
    if (contents[newKey]) {
      message.error(t('editor.template.propKeyDuplicate'));
      return;
    }

    const deepCopy = JSON.parse(JSON.stringify(sourceData));
    deepCopy.key = newKey;
    
    setContents({
      ...contents,
      [newKey]: deepCopy
    });
  };

  const handleUpdateContentAttribute = (contentKey : string, attrName: string, attrValue: string) => {
    // Bug Fix: 深いコピーで不変性を保持
    setContents(prevContents => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevContents));
      if (updated[contentKey]) {
        if (!updated[contentKey].attributes) {
          updated[contentKey].attributes = {};
        }
        updated[contentKey].attributes[attrName] = attrValue;
      }
      return updated;
    });
  };

  const handleUpdateContentElement = (contentKey: string, elemName : string, elemValue: string) => {
    // Bug Fix: 深いコピーで不変性を保持
    setContents(prevContents => {
      const updated : Record<string, PropertyData> = JSON.parse(JSON.stringify(prevContents));
      if (updated[contentKey]) {
        if (!updated[contentKey].elements) {
          updated[contentKey].elements = {};
        }
        updated[contentKey].elements[elemName] = elemValue;
      }
      return updated;
    });
  };

  const handleDeleteContentAttribute = (contentKey: string, attrName: string) => {
    const updated : Record<string, PropertyData> = { ...contents };
    if (updated[contentKey]?.attributes) {
      delete updated[contentKey].attributes[attrName];
      setContents(updated);
    }
  };

  const handleDeleteContentElement = (contentKey: string, elemName: string) => {
    const updated : Record<string, PropertyData> = { ...contents };
    if (updated[contentKey]?.elements) {
      delete updated[contentKey].elements[elemName];
      setContents(updated);
    }
  };

  const handleDeleteContent = (contentKey : string) => {
    const updated : Record<string, PropertyData> = { ...contents };
    delete updated[contentKey];
    setContents(updated);
  };
  /**
   * UUID生成
   */
  const handleGenerateUuid = () => {
    const newUuid = uuidv4();
    setUuid(newUuid);
    setHasChanges(true);
  };

  /**
   * ✅ Phase 2-2: テンプレートファイル一覧を取得
   * @param mode - 'replace_all_properties' または 'replace_all_contents'
   */
  const handleOpenNamespaceImport = async (mode: 'replace_all_properties' | 'replace_all_contents' = 'replace_all_properties') => {
    setNamespaceImportMode(mode);
    setIsLoadingTemplates(true);
    setShowNamespaceDialog(true);

    try {
      const result = await fetchTemplateFiles();
      setFormatsResponse(result);
    } catch (error) {
      console.error('テンプレートファイル一覧取得エラー:', error);
      message.error(t('formatManagement.messages.file_list_load_failed'));
      setFormatsResponse({ departments: [] });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  /**
   * ✅ Phase 3-2: ファイル選択時のプレビュー取得（analyzeNamespaceFile を使用）
   */
  const handleSelectNamespaceFile = async (fileKey: string) => {
    setSelectedNamespaceFile(fileKey);

    if (!fileKey) {
      setNamespacePreview({});
      return;
    }

    try {
      const parsed = await analyzeNamespaceFile(fileKey);
      setNamespacePreview({ parsedData: parsed });
    } catch (error) {
      console.error('プレビュー読み込みエラー:', error);
      setNamespacePreview({ error: t('editor.template.previewFailed') });
    }
  };

  /**
   * ✅ Phase 3-3: 重複チェックして確認ダイアログを表示
   */
  const handleConfirmImportWithDuplicateCheck = async () => {
    if (!selectedNamespaceFile) {
      message.error(t('editor.template.nsFileRequired'));
      return;
    }

    let parsed = namespacePreview.parsedData;
    if (!parsed) {
      try {
        parsed = await analyzeNamespaceFile(selectedNamespaceFile);
        setNamespacePreview({ parsedData: parsed });
      } catch (error) {
        console.error('名前空間取り込みエラー:', error);
        message.error(t('editor.template.nsImportFailed'));
        return;
      }
    }

    const sourceData = namespaceImportMode === 'replace_all_properties'
      ? parsed.properties
      : parsed.contents;

    const duplicates = Object.keys(sourceData).filter(key =>
      namespaceImportMode === 'replace_all_properties' ? properties[key] : contents[key]
    );
    setDuplicateKeys(duplicates);
    setShowConfirmDialog(true);
  };

  /**
   * ✅ Phase 3-3: 取り込み確認後の実行
   *   replaceTemplateWithNamespace() を使い全置き換え＋namespaceSource付与
   */
  const handleImportNamespace = () => {
    const parsed = namespacePreview.parsedData;
    if (!parsed) {
      message.error(t('editor.template.noDataToImport'));
      return;
    }

    try {
      const templateType = namespaceImportMode === 'replace_all_properties' ? 'properties' : 'contents';

      if (templateType === 'properties') {
        replaceTemplateWithNamespace(
          parsed,
          'properties',
          // setEditingTemplate として setProperties をラップ
          (updater) => {
            if (typeof updater === 'function') {
              setProperties(prev => {
                const fakeTemplate = { properties: prev, contents };
                const next = updater(fakeTemplate as never);
                return (next as { properties: Record<string, PropertyData> }).properties;
              });
            }
          }
        );
        setForceRenderKey(Date.now());
        message.success(t('editor.template.nsPropsImported', { count: String(Object.keys(parsed.properties).length) }));
      } else {
        replaceTemplateWithNamespace(
          parsed,
          'contents',
          (updater) => {
            if (typeof updater === 'function') {
              setContents(prev => {
                const fakeTemplate = { properties, contents: prev };
                const next = updater(fakeTemplate as never);
                return (next as { contents: Record<string, PropertyData> }).contents;
              });
            }
          }
        );
        setForceContentRenderKey(Date.now());
        message.success(t('editor.template.nsContentsImported', { count: String(Object.keys(parsed.contents).length) }));
      }

      const fileName = selectedNamespaceFile.split('/').pop() || selectedNamespaceFile;
      setImportedNamespaces(prev => [...prev, fileName]);

      setShowConfirmDialog(false);
      setShowNamespaceDialog(false);
      setSelectedNamespaceFile('');
      setNamespacePreview({});
      setDuplicateKeys([]);
      setHasChanges(true);
    } catch (error) {
      console.error('[名前空間取り込み] エラー:', error);
      message.error(t('editor.template.importFailed', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  /**
   * XMLビュー: UI → XML 変換して xmlContent を更新
   */
  const buildXmlFromCurrentState = (): string => {
    const placeType = node.data.placeType || 'material';
    const templateData = {
      id: templateId,
      templateId: templateId,
      uuid: uuid,
      name: name,
      description: description,
      insertion: insertion,
      properties: properties as Record<string, NestedPropertyData>,
      contents: contents as Record<string, NestedContentData>,
      placeRefs: placeRefs.map(pr => pr.ref),
      href: node.data.templateRef?.templateRef?.ref
        ? `#${node.data.templateRef.templateRef.ref}`
        : undefined,
    };
    return convertTemplateToXML(templateData, placeType);
  };

  /**
   * XMLビュー: タブ切り替えハンドラー
   */
  const handleTabChange = (key: string) => {
    console.log('🔄 [XMLビュー] タブ切り替え:', { from: activeTabKey, to: key });

    // UI → XML
    if (key === 'xml') {
      try {
        const xml = buildXmlFromCurrentState();
        setXmlContent(xml);
        setXmlErrors([]);
        setHasUnsyncedXmlChanges(false);
        console.log('✅ [XMLビュー] UI→XML変換成功');
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        console.error('❌ [XMLビュー] UI→XML変換エラー:', e);
        setXmlErrors([{ type: 'conversion_error', message: t('editor.template.xmlConvFailed'), details: e.message }]);
      }
    }

    // XML → UI （変更あり時のみ同期）
    if (activeTabKey === 'xml' && key === 'ui' && hasUnsyncedXmlChanges) {
      const parseResult = parseXMLToTemplate(xmlContent);
      if (parseResult.success && parseResult.data) {
        const d = parseResult.data;
        setTemplateId(d.id || templateId);
        setUuid(d.uuid || '');
        setName(d.name || '');
        setDescription(d.description || '');
        setProperties((d.properties || {}) as Record<string, PropertyData>);
        setContents((d.contents || {}) as Record<string, PropertyData>);
        setPlaceRefs((d.placeRefs || []).map(ref => ({ id: '', ref })));
        setForceRenderKey(Date.now());
        setForceContentRenderKey(Date.now());
        setXmlErrors([]);
        setHasUnsyncedXmlChanges(false);
        console.log('✅ [XMLビュー] XML→UI同期成功');
      } else {
      message.warning(t('editor.template.xmlParseFailed'));
        setXmlErrors(parseResult.errors);
        setHasUnsyncedXmlChanges(false);
      }
    }

    setActiveTabKey(key);
  };

  /**
   * XMLビュー: バリデーション実行
   */
  const handleValidateXml = () => {
    const result = validateTemplateXML(xmlContent);
    setXmlErrors(result.errors);
    if (result.isValid) {
      message.success(t('editor.template.xmlValid'));
    } else {
      message.error(t('editor.template.xmlErrors', { count: String(result.errors.length) }));
    }
  };

  /**
   * 保存処理
   */
  const handleSave = () => {
    // XMLビューから保存する場合、先にUI状態に同期
    if (activeTabKey === 'xml' && hasUnsyncedXmlChanges) {
      const validationResult = validateTemplateXML(xmlContent);
      if (!validationResult.isValid) {
        message.error(
          `XMLにエラーがあるため保存できません: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
        return;
      }
      const parseResult = parseXMLToTemplate(xmlContent);
      if (!parseResult.success || !parseResult.data) {
        message.error(
          `XMLのパースに失敗しました: ${parseResult.errors.map(e => e.message).join(', ')}`
        );
        return;
      }
      const d = parseResult.data;
      setTemplateId(d.id || templateId);
      setUuid(d.uuid || '');
      setName(d.name || '');
      setDescription(d.description || '');
      setProperties((d.properties || {}) as Record<string, PropertyData>);
      setContents((d.contents || {}) as Record<string, PropertyData>);
      setPlaceRefs((d.placeRefs || []).map(ref => ({ id: '', ref })));
      setHasUnsyncedXmlChanges(false);
    }

    // ✅ Phase 1-2: 基本チェック
    if (!templateId.trim()) {
      message.error(t('editor.template.idRequired'));
      return;
    }
    
    // ✅ Phase 1-2: ノードIDとの重複チェック
    const nodeIds = allNodes.map(n => n.id);
    if (nodeIds.includes(templateId) && templateId !== node.id) {
      message.error(t('template.idDuplicateNodeId', { id: templateId }));
      return;
    }
    
    // ✅ Phase 1-2: 他のテンプレートIDとの重複チェック
    // window.clineAllTemplatesがグローバルに存在する場合のみチェック
    if (window.clineAllTemplates) {
      const allTemplateIds: string[] = [];
      (['material', 'condition', 'result'] as const).forEach(category => {
        const templates = window.clineAllTemplates[category];
        if (templates && Array.isArray(templates)) {
          templates.forEach((t: Template) => {
            // 自分自身のテンプレートは除外
            const currentTemplateId = node.data.template?.id || node.data.templateRef?.id;
            const templateId = t.id;
            if (templateId && templateId !== currentTemplateId) {
              allTemplateIds.push(templateId);
            }
          });
        }
      });
      
      if (allTemplateIds.includes(templateId)) {
        message.error(t('template.idDuplicateTemplate', { id: templateId }));
        return;
      }
    }
    
    // PropertyData形式からProperty[]とContent[]に変換
    const convertedProperties = convertPropertyDataToPropertiesArray(properties);
    const convertedContents = convertPropertyDataToContentsArray(contents);
    
    const templateRef: Template = {
      ...(node.data.templateRef || {}),
      id: templateId,
      uuid: uuid,
      name: name,
      category : nodeCategory,
      description: description,
      properties: convertedProperties,
      contents: convertedContents,
      placeRefs: placeRefs,
    };
    
    if (node.data.templateRef?.templateRef) {
      templateRef.templateRef = node.data.templateRef?.templateRef;
    }
    
    if ((node.data.placeType === 'material' || node.data.placeType === 'result') && 
        (insertion.uri || insertion.hash || insertion.format)) {
      templateRef.insertion = insertion;
    }
    
    const isNewTemplate = node.data.isNewTemplate || false;
    const templateCategory = node.data.templateCategory || node.data.placeType || 'material';
    const isCommonTemplate = node.data.isCommonTemplate || false;
    const methodId = node.data.methodId || null;
    
    onSave(node.id, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId);
    onClose();
    setHasChanges(false);
  };

  if (!node) return null;

  return (
    <Modal
      title={
        <Space>
          {templateIcon}
          <span>{t('template.editTitle', { category: nodeCategory })}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('template.cancelButton')}
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          {t('template.saveButton')}
        </Button>
      ]}
    >
      <Tabs
        activeKey={activeTabKey}
        onChange={handleTabChange}
        items={[
          { key: 'ui', label: t('template.tabUiEdit') },
          { key: 'xml', label: t('template.tabXmlView') },
        ]}
        style={{ marginBottom: 8 }}
      />

      {/* ===== XMLビュータブ ===== */}
      {activeTabKey === 'xml' && (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* XMLエラー表示 */}
          {xmlErrors.length > 0 && (
            <Alert
              message={t('template.xmlErrorsAlert', { count: String(xmlErrors.length) })}
              description={
                <div>
                  {xmlErrors.map((error, index) => (
                    <div key={index} style={{ marginBottom: 4 }}>
                      <Text strong>{error.type}:</Text> {error.message}
                      {error.details && (
                        <div style={{ fontSize: 12, color: '#888' }}>{error.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              }
              type="error"
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 未保存変更の警告 */}
          {hasUnsyncedXmlChanges && (
            <Alert
              message={t('template.xmlUnsavedAlert')}
              description={t('template.xmlUnsavedDesc')}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* バリデーションボタン */}
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleValidateXml}>{t('template.validateXmlButton')}</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('template.xmlEditHint')}
            </Text>
          </Space>

          {/* XMLエディタ */}
          <TextArea
            rows={28}
            value={xmlContent}
            onChange={(e) => {
              setXmlContent(e.target.value);
              setHasUnsyncedXmlChanges(true);
            }}
            placeholder={t('template.xmlPlaceholder')}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />

          {/* XML情報 */}
          <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>{t('template.xmlInfoFormat')}</strong> MaiML {node.data.placeType}Template　　
              <strong>{t('template.xmlInfoChars')}</strong> {xmlContent.length}　　
              <strong>{t('template.xmlInfoLines')}</strong> {xmlContent.split('\n').length}
            </Text>
          </div>
        </div>
      )}

      {/* ===== UI編集タブ ===== */}
      {activeTabKey === 'ui' && (
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* エラー表示 */}
          {mergedTemplate && templateErrors[mergedTemplate.id] && templateErrors[mergedTemplate.id].length > 0 && (
          <Alert
            message={t('template.validationWarning', { count: String(templateErrors[mergedTemplate.id].length) })}
            description={
              <div>
                {templateErrors[mergedTemplate.id].map((error, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Text strong>{error.type || 'validation_error'}</Text>: {error.message}
                  </div>
                ))}
              </div>
            }
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 基本情報・PlaceRef・Insertion を1つの枠で囲む */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f0f5ff', borderRadius: 8 }}>
          {/* 基本情報 */}
          <Title level={5}>{t('template.sectionBasicInfo')}</Title>
          
          <Form.Item label={t('template.labelTemplateId')}>
            <Input
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: materialTemplate_12345"
            />
          </Form.Item>

          <Form.Item label={t('template.labelUuid')}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={uuid}
                onChange={(e) => {
                  setUuid(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="例: urn:uuid:12345678-1234-1234-1234-123456789abc"
              />
              <Button icon={<ThunderboltOutlined />} onClick={handleGenerateUuid}>
                {t('template.generateButton')}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Name">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: Sample Name"
            />
          </Form.Item>

          <Form.Item label="Description">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setHasChanges(true);
              }}
              placeholder="例: Sample description"
            />
          </Form.Item>
          
          {/* ✅ Place References編集セクション */}
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={5}>
              🔗 Place References
            </Title>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowPlaceRefAddDialog(true)}
            >
              {t('template.addButton')}
            </Button>
          </div>
          
          {placeRefs.length === 0 ? (
            <Alert
              message={t('template.placeRefEmpty')}
              type="info"
              showIcon
            />
          ) : (
            placeRefs.map((placeRef, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: 12, 
                  marginBottom: 8, 
                  backgroundColor: '#f0f8ff', 
                  borderRadius: 4, 
                  border: '1px solid #90caf9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <Text strong style={{ marginBottom: 4, display: 'block' }}>
                    Place Ref #{index + 1}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>Ref:</strong> {placeRef.ref}
                  </Text>
                </div>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const updated = placeRefs.filter((_, i) => i !== index);
                    setPlaceRefs(updated);
                    setHasChanges(true);
                  }}
                />
              </div>
            ))
          )}
          
          {/* Insertion（MaterialTemplate・ResultTemplateの場合表示） */}
              {(node.data.placeType === 'material' || node.data.placeType === 'result') && (
            <>
              <Divider />
              <Title level={5} style={{ marginBottom: 16 }}>
                {t('template.sectionInsertion')}
              </Title>
              
              <Form.Item label="URI">
                <Input
                  value={insertion.uri}
                  onChange={(e) => {
                    setInsertion({ ...insertion, uri: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="例: s3://bucket/path/to/file"
                />
              </Form.Item>

              <Form.Item label="Hash Method">
                <Input
                  value={insertion.hash?.method || ''}
                  onChange={(e) => {
                    setInsertion({ 
                      ...insertion, 
                      hash: { ...insertion.hash, method: e.target.value } 
                    });
                    setHasChanges(true);
                  }}
                  placeholder="例: sha256"
                />
              </Form.Item>

              <Form.Item label="Hash Value">
                <Input
                  value={insertion.hash?.value || ''}
                  onChange={(e) => {
                    setInsertion({ 
                      ...insertion, 
                      hash: { ...insertion.hash, value: e.target.value } 
                    });
                    setHasChanges(true);
                  }}
                  placeholder="例: abc123..."
                />
              </Form.Item>

              <Form.Item label="Format">
                <Input
                  value={insertion.format}
                  onChange={(e) => {
                    setInsertion({ ...insertion, format: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="例: application/xml"
                />
              </Form.Item>
            </>
          )}
        </div>

        {/* Properties編集セクション */}
        <Divider />
        <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Title level={5}>{t('template.sectionProperties')}</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
              {t('template.addPropertyButton')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleOpenNamespaceImport('replace_all_properties')}>
              {t('template.importFromTemplateButton')}
            </Button>
          </Space>

          {Object.keys(properties).length === 0 ? (
            <Alert title={t('template.propertiesEmpty')} type="info" />
          ) : (
            Object.entries(properties).map(([key, data]) => (
              <NestedPropertyEditor
                key={`${key}_${forceRenderKey}`}
                propertyData={data}
                propertyKey={key}
                level={0}
                expandedNodes={expandedNodes}
                onToggleExpanded={handleToggleExpanded}
                onAddNestedChild={handleAddNestedChild}
                onAddSameLevelCopy={handleAddSameLevelCopy}
                onUpdateNestedAttribute={handleUpdateNestedAttribute}
                onUpdateNestedElement={handleUpdateNestedElement}
                onDeleteNestedAttribute={handleDeleteNestedAttribute}
                onDeleteNestedElement={handleDeleteNestedElement}
                onDeleteProperty={handleDeleteProperty}
                forceRenderKey={forceRenderKey}
                attributeRecords={attributeRecords}
              />
            ))
          )}
        </div>

        {/* ✅ Phase 2-1: 継承元プロパティ表示セクション */}
        {inheritedTemplate && (
          <>
            <Divider />
            <Collapse
              items={[
                {
                  key: 'inherited',
                  label: (
                    <Space>
                      <FileSearchOutlined />
                      <Text strong>
                        🔗 {t('template.inheritedProps', { id: inheritedTemplate.id })}
                      </Text>
                      <Tag color="blue">{t('common.readOnly')}</Tag>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: 16, backgroundColor: '#f0f5ff' }}>
                      <Alert
                        message={t('template.inheritedPropsMessage')}
                        description={t('template.inheritedPropsDesc')}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      
                      {inheritedTemplate.properties && typeof inheritedTemplate.properties === 'object' && 
                       Object.keys(inheritedTemplate.properties).length > 0 ? (
                        Object.entries(convertPropertiesArrayToNestedFormatRecursive(inheritedTemplate.properties)).map(([key, data]) => (
                          <div
                            key={key}
                            style={{
                              marginBottom: 16,
                              padding: 12,
                              border: '1px solid #91d5ff',
                              borderRadius: 8,
                              backgroundColor: '#e6f7ff'
                            }}
                          >
                            <Text strong style={{ color: '#0958d9' }}>
                              {data.tagName || 'property'}: {key}
                            </Text>
                            
                            {/* 属性表示 */}
                            {data.attributes && Object.keys(data.attributes).length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" strong style={{ fontSize: 12 }}>
                                  📋 属性
                                </Text>
                                {Object.entries(data.attributes).map(([attrName, attrValue]) => (
                                  <div key={attrName} style={{ marginLeft: 16 }}>
                                    <Text style={{ fontSize: 12 }}>
                                      {attrName}: <Tag>{attrValue}</Tag>
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* 要素表示 */}
                            {data.elements && Object.keys(data.elements).length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" strong style={{ fontSize: 12 }}>
                                  📄 要素
                                </Text>
                                {Object.entries(data.elements).map(([elemName, elemValue]) => (
                                  <div key={elemName} style={{ marginLeft: 16 }}>
                                    <Text style={{ fontSize: 12 }}>
                                      {elemName}: {elemValue}
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <Alert
                          message={t('template.inheritedPropsEmpty')}
                          type="warning"
                          showIcon
                        />
                      )}
                    </div>
                  )
                }
              ]}
            />
          </>
        )}
        
        {/* Phase 3.2: Contents編集セクション（ResultTemplateのみ） */}
        {node.data.placeType === 'result' && (
          <>
            <Divider />
            <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <Title level={5}>{t('template.sectionContents')}</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowContentAddModal(true)}>
                  {t('template.addContentButton')}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleOpenNamespaceImport('replace_all_contents')}>
                  {t('template.importFromTemplateButton')}
                </Button>
              </Space>

              {Object.keys(contents).length === 0 ? (
                <Alert title={t('template.contentsEmpty')} type="info" />
              ) : (
                Object.entries(contents).map(([key, data]) => (
                  <NestedPropertyEditor
                    key={`${key}_${forceContentRenderKey}`}
                    propertyData={data}
                    propertyKey={key}
                    level={0}
                    expandedNodes={expandedContentNodes}
                    onToggleExpanded={handleToggleContentExpanded}
                    onAddNestedChild={handleAddNestedContentChild}
                    onAddSameLevelCopy={handleAddContentSameLevelCopy}
                    onUpdateNestedAttribute={handleUpdateContentAttribute}
                    onUpdateNestedElement={handleUpdateContentElement}
                    onDeleteNestedAttribute={handleDeleteContentAttribute}
                    onDeleteNestedElement={handleDeleteContentElement}
                    onDeleteProperty={handleDeleteContent}
                    forceRenderKey={forceContentRenderKey}
                    attributeRecords={attributeRecords}
                  />
                ))
              )}
            </div>
          </>
        )}

      {/* ✅ Phase 2-2: 名前空間取り込みモーダル */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
        <span>{t('template.importNsLabel')}</span>
          </Space>
        }
        open={showNamespaceDialog}
        onCancel={() => {
          setShowNamespaceDialog(false);
          setSelectedNamespaceFile('');
          setNamespacePreview({});
        }}
        onOk={handleConfirmImportWithDuplicateCheck}
        width={800}
        okText={t('common.import')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !selectedNamespaceFile }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message={t('template.nsImportModalDesc')}
            description={
              <div>
                <p>・{t('template.nsImportDesc1')}</p>
                <p>・{t('template.nsImportDesc2')}</p>
                <p>・{t('template.nsImportDesc3')}</p>
              </div>
            }
            type="info"
          />

          {/* テンプレートファイル選択（TreeSelect） */}
          <Form.Item label={t('template.importNsLabel')}>
            <TreeSelect
              placeholder={t('template.nsFilePlaceholder')}
              value={selectedNamespaceFile}
              onChange={handleSelectNamespaceFile}
              loading={isLoadingTemplates}
              style={{ width: '100%' }}
              showSearch
              treeDefaultExpandAll={true}
              treeData={formatsResponse.departments.flatMap(dept =>
                dept.folders.map(folder => ({
                  title: `${dept.departmentCd} / ${folder.folderName}`,
                  value: `${dept.departmentCd}/${folder.folderName}`,
                  selectable: false,
                  children: folder.files.map(file => ({
                    title: file.fileName,
                    value: file.key,
                    isLeaf: true,
                  })),
                }))
              )}
              filterTreeNode={(input, treeNode) =>
                (treeNode?.title?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* プレビュー表示 */}
          {selectedNamespaceFile && (
            <>
              {namespacePreview.error && (
                <Alert
                  message={t('template.nsPreviewError')}
                  description={namespacePreview.error}
                  type="error"
                  style={{ marginBottom: 16 }}
                />
              )}

              {namespacePreview.parsedData && (
                <Alert
                  message={
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>
                        📊 プロパティ: {Object.keys(namespacePreview.parsedData.properties).length}件 ／
                        コンテンツ: {Object.keys(namespacePreview.parsedData.contents).length}件
                      </Text>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {Object.entries(
                          namespaceImportMode === 'replace_all_properties'
                            ? namespacePreview.parsedData.properties
                            : namespacePreview.parsedData.contents
                        ).map(([key, data]) => (
                          <div key={key} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f5ff', borderRadius: 4 }}>
                            <Text strong>{key}</Text>
                            {(data as PropertyData).attributes?.['xsi:type'] && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {(data as PropertyData).attributes['xsi:type']}
                              </Tag>
                            )}
                          </div>
                        ))}
                      </div>
                    </Space>
                  }
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}

          {/* ファイルなし警告 */}
          {!isLoadingTemplates && formatsResponse.departments.length === 0 && (
            <Alert
              message={t('template.nsNoFilesFound')}
              description={t('template.nsNoFilesDesc')}
              type="warning"
            />
          )}
        </Space>
      </Modal>

      {/* プロパティ追加モーダル */}
      <Modal
        title={t('template.addPropTitle')}
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddProperty}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={t('template.propKeyPlaceholder')}
            value={newPropertyKey}
            onChange={(e) => setNewPropertyKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder={t('template.tagNamePlaceholder')}
            value={newPropertyTagName}
            onChange={setNewPropertyTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* ✅ Phase 3-3: 取り込み確認ダイアログ */}
      <Modal
        title={t('template.nsConfirmTitle')}
        open={showConfirmDialog}
        onCancel={() => {
          setShowConfirmDialog(false);
          setDuplicateKeys([]);
        }}
        onOk={handleImportNamespace}
        okText={t('common.import')}
        cancelText={t('common.cancel')}
        width={600}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {duplicateKeys.length > 0 ? (
            <Alert
              message={t('template.nsDuplicateCount', { count: String(duplicateKeys.length) })}
              description={
                <div>
                    <p>{t('template.nsDuplicateKeys', { keys: duplicateKeys.join(', ') })}</p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                    {duplicateKeys.map(key => (
                      <Tag key={key} color="warning" style={{ marginBottom: 4 }}>
                        {key}
                      </Tag>
                    ))}
                  </div>
                </div>
              }
              type="warning"
              showIcon
            />
          ) : (
            <Alert
              message={t('template.nsNoDuplicates')}
              description={t('template.nsNoDuplicatesDesc')}
              type="success"
              showIcon
            />
          )}
          
          {namespacePreview.parsedData && (() => {
            const sourceData = namespaceImportMode === 'replace_all_properties'
              ? namespacePreview.parsedData.properties
              : namespacePreview.parsedData.contents;
            return (
              <div>
                <Text strong>取り込む要素: {Object.keys(sourceData).length}件</Text>
                <div style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4
                }}>
                  {Object.keys(sourceData).map(key => (
                    <div key={key} style={{ marginBottom: 4 }}>
                      <Tag color={duplicateKeys.includes(key) ? 'orange' : 'blue'}>
                        {key}
                      </Tag>
                      {duplicateKeys.includes(key) && (
                        <Text type="warning" style={{ marginLeft: 8, fontSize: 12 }}>
                          (上書き)
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </Space>
      </Modal>
      
      {/* Phase 3.2: Content追加モーダル */}
      <Modal
        title={t('template.addContentTitle')}
        open={showContentAddModal}
        onCancel={() => setShowContentAddModal(false)}
        onOk={handleAddContent}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={t('template.propKeyPlaceholder')}
            value={newContentKey}
            onChange={(e) => setNewContentKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder={t('template.tagNamePlaceholder')}
            value={newContentTagName}
            onChange={setNewContentTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* ✅ Phase 1-1: Place Reference追加ダイアログ */}
      <Modal
        title={t('template.addPlaceRefTitle')}
        open={showPlaceRefAddDialog}
        onCancel={() => setShowPlaceRefAddDialog(false)}
        footer={[
          <Button key="close" onClick={() => setShowPlaceRefAddDialog(false)}>
            {t('common.close')}
          </Button>
        ]}
        width={600}
      >
        <Alert
          message={t('template.placeRefSelectHint')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Space orientation="vertical" style={{ width: '100%' }}>
            {allNodes
              .filter(n => n.data?.nodeType === 'place')
              .filter(n => !placeRefs.some((pr) => pr.ref === n.id))
              .map(place => (
                <Button
                  key={place.id}
                  block
                  style={{ 
                    textAlign: 'left',
                    height: 'auto',
                    padding: '12px'
                  }}
                  onClick={() => {
                    setPlaceRefs([...placeRefs, {id: '', ref :place.id}]);
                    setShowPlaceRefAddDialog(false);
                    setHasChanges(true);
                    message.success(t('template.placeRefAdded'));
                  }}
                >
                  <div>
                    <Text strong>{place.id}</Text>
                    <br />
                    <Text type="secondary">
                      {place.data?.name || t('template.noName')} | {place.data?.placeType}
                    </Text>
                  </div>
                </Button>
              ))}
            
            {allNodes
              .filter(n => n.data?.nodeType === 'place')
              .filter(n => !placeRefs.some((pr) => pr.ref === n.id))
              .length === 0 && (
              <Alert
                message={t('template.placeRefNoPlaces')}
                description={t('template.placeRefNoPlacesDesc')}
                type="warning"
                showIcon
              />
            )}
          </Space>
        </div>
      </Modal>
      </div>
      )}
    </Modal>
  );
};

export default TemplateEditorDialog;
