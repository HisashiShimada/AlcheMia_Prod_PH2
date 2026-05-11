/**
 * FormatEditorDialog - Template編集ダイアログ（EditorV2用）
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
} from 'antd';
import {
  SaveOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlusOutlined,
  DownloadOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { fetchTemplateFiles, fetchTemplateContent, type FormatTemplateFile } from '@/services/templateApi';
import type { 
  NodeData, 
  TemplateError,
} from '../../types/editor';
import { Template, Insertion, PlaceRef, Property, Content } from '@/types/maiml-unified';
import NestedPropertyEditor, { type PropertyData } from '../editorv2/components/NestedPropertyEditor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttributeMasters } from '@/hooks/useAttributeMasters';
import {
  convertPropertiesArrayToNestedFormat,
  convertPropertiesArrayToNestedFormatRecursive,
  convertPropertyDataToPropertiesArray,
  convertPropertyDataToContentsArray,
  parseNamespacesFromXml,
  buildTreeData,
} from '../editorv2/utils/templateConverter';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface FormatEditorDialogProps {
  open: boolean;
  node: {
    id: string;
    data: NodeData;
  };
  onClose: () => void;
  // ✅ フォーマット管理専用: Template型を経由せず直接渡す
  onSave: (
    nodeId: string,
    properties: Property[],
    contents: Content[],
    templateId: string,
    name: string,
    description: string,
    category: string
  ) => void;
  allNodes?: Array<{ id: string; data: NodeData }>;
  templateErrors?: Record<string, TemplateError[]>;
}

/**
 * FormatEditorDialog - メインコンポーネント
 */
const FormatEditorDialog: React.FC<FormatEditorDialogProps> = ({
  open,
  node,
  onClose,
  onSave,
  allNodes = [],
  templateErrors = {},
}) => {
  const { t } = useLanguage();
  const [hasChanges, setHasChanges] = useState(false);
  // ✅ 初期化済みフラグ: open 中に node 参照が変わっても useEffect の再実行を防ぐ
  const [isInitialized, setIsInitialized] = useState(false);

  // 基本情報State（UI非表示だが保存時に必要なため残す）
  const [templateId, setTemplateId] = useState('');
  const [uuid, setUuid] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [placeRefs, setPlaceRefs] = useState<PlaceRef[]>([]);
  
  // Insertion State (MaterialTemplate・ResultTemplateのみ)（UI非表示だが保存時に必要なため残す）
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
  const [forceContentRenderKey, setForceContentRenderKey] = useState(0);

  // ✅ Phase 1-1: Place References編集用State（UI非表示だが保持）
  const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);

  // ✅ Phase 2-2: 名前空間取り込み用State（Reference版に統一）
  const [showNamespaceDialog, setShowNamespaceDialog] = useState(false);
  const [templateFiles, setTemplateFiles] = useState<FormatTemplateFile[]>([]);
  const [selectedNamespaceFile, setSelectedNamespaceFile] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [importedNamespaces, setImportedNamespaces] = useState<string[]>([]);
  const [namespaceImportMode, setNamespaceImportMode] = useState<'replace_all_properties' | 'replace_all_contents'>('replace_all_properties');

  // ✅ Phase 3: 高度な名前空間取り込みUI用State（Reference版に統一）
  const [namespaceData, setNamespaceData] = useState<{
    xml?: string;
    properties?: Record<string, PropertyData>;
    error?: string;
  }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);

  // ✅ Phase 4: バリデーション用State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
    // ✅ ダイアログが閉じたら初期化フラグをリセット
    if (!open) {
      setIsInitialized(false);
      return;
    }

    if (open && node) {
      // ✅ 既に初期化済みの場合はスキップ（node 参照変化による再実行を防ぐ）
      if (isInitialized) return;

      // ✅ Phase 3: parsedPropertiesとparsedContentsを優先的に使用（フォーマット管理専用）
      if ('parsedProperties' in node.data || 'parsedContents' in node.data) {
        console.log('📋 [FormatEditorDialog] parsedPropertiesとparsedContentsを直接読み込み');
        
        // 型安全にデータを取得
        const parsedProperties = ('parsedProperties' in node.data && node.data.parsedProperties) 
          ? node.data.parsedProperties as Record<string, PropertyData>
          : {};
        const parsedContents = ('parsedContents' in node.data && node.data.parsedContents)
          ? node.data.parsedContents as Record<string, PropertyData>
          : {};
        
        // 基本情報の初期化
        const defaultId = `${node.data.placeType}_template_${Date.now()}`;
        const defaultName = node.data.name || 'Untitled';
        
        setTemplateId(defaultId);
        setUuid('');
        setName(defaultName);
        setDescription('');
        setPlaceRefs([]);
        setInsertion({ uri: '', hash: { method: '', value: '' }, format: '' });
        
        // parsedPropertiesとparsedContentsを直接設定
        setProperties(parsedProperties);
        setContents(parsedContents);
        setExpandedNodes(new Set());
        setExpandedContentNodes(new Set());
        setForceRenderKey(Date.now());
        setForceContentRenderKey(Date.now());
        
        console.log('✅ [FormatEditorDialog] parsedProperties/Contents読み込み完了:', {
          propertiesCount: Object.keys(parsedProperties).length,
          contentsCount: Object.keys(parsedContents).length
        });

        setIsInitialized(true);
        return;
      }
      
      // ✅ Phase 1-2: 空テンプレート検出と初期化
      if (!mergedTemplate || 
          !mergedTemplate.id || 
          Object.keys(mergedTemplate).length === 0 ||
          (mergedTemplate.id === '' && mergedTemplate.name === '')) {
        
        console.log('🆕 [FormatEditorDialog] 空テンプレート検出 - デフォルト値を設定');
        
        // デフォルト値を設定
        const defaultId = `${node.data.placeType}_template_${Date.now()}`;
        const defaultName = node.data.name || 'Untitled';
        
        setTemplateId(defaultId);
        setUuid('');
        setName(defaultName);
        setDescription('');
        setProperties({});
        setContents({});
        setPlaceRefs([]);
        setInsertion({ uri: '', hash: { method: '', value: '' }, format: '' });
        setExpandedNodes(new Set());
        setExpandedContentNodes(new Set());
        setForceRenderKey(Date.now());
        setForceContentRenderKey(Date.now());
        
        console.log('✅ [FormatEditorDialog] デフォルト値設定完了:', {
          templateId: defaultId,
          name: defaultName,
          placeType: node.data.placeType
        });

        setIsInitialized(true);
        return;
      }
      
      // 既存の処理（データがある場合）
      console.log('📋 [FormatEditorDialog] 既存テンプレート読み込み:', mergedTemplate.id);
      
      // 基本情報の初期化（UI非表示だが保存時に必要）
      setTemplateId(mergedTemplate.id || '');
      setUuid(mergedTemplate.uuid || '');
      setName(mergedTemplate.name || '');
      setDescription(mergedTemplate.description || '');
      setInsertion(mergedTemplate.insertion || { uri: '', hash: {method : '', value: ''}, format: '' });
      
      // placeRefsの読み込み（UI非表示だが保存時に必要）
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
      setContents({});
      setExpandedNodes(new Set());
      setExpandedContentNodes(new Set());
      setForceRenderKey(Date.now());
      setForceContentRenderKey(Date.now());
      setIsInitialized(true);
    }
  }, [open, node, mergedTemplate, isInitialized]);

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
      message.error(t('formatEditor.propKeyRequired'));
      return;
    }

    if (properties[newPropertyKey.trim()]) {
      message.error(t('formatEditor.propKeyDuplicate'));
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
        // ✅ 子要素追加時に親のxsi:typeを自動的にpropertyListTypeに設定
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
        // ✅ 子要素追加時に親のxsi:typeを自動的にpropertyListTypeに設定
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
      message.error(t('formatEditor.propKeyDuplicate'));
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
      message.error(t('formatEditor.contentKeyRequired'));
      return;
    }

    if (contents[newContentKey.trim()]) {
      message.error(t('formatEditor.contentKeyDuplicate'));
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
      message.error(t('formatEditor.contentKeyDuplicate'));
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
   * UUID生成（UI非表示だが関数は保持）
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
    // カテゴリを判定（フィルタリング用）
    const category = node.data.placeType === 'material' ? 'material' :
                     node.data.placeType === 'condition' ? 'condition' : 'result';

    setNamespaceImportMode(mode);
    setIsLoadingTemplates(true);
    setShowNamespaceDialog(true);

    try {
      // fetchTemplateFiles は引数なし、ListFormatsResponse を返す
      const response = await fetchTemplateFiles();
      // カテゴリに一致するフォルダのファイルを抽出
      const allFiles: FormatTemplateFile[] = [];
      response.departments.forEach(dept => {
        dept.folders
          .filter(folder => folder.folderName === category)
          .forEach(folder => {
            allFiles.push(...folder.files);
          });
      });
      setTemplateFiles(allFiles);
    } catch (error) {
      console.error('テンプレートファイル一覧取得エラー:', error);
      message.error(t('formatManagement.messages.file_list_load_failed'));
      setTemplateFiles([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  /**
   * ✅ Phase 3-2: ファイル選択時のプレビュー取得（Reference版に統一）
   */
  const handleSelectNamespaceFile = async (filePath: string) => {
    setSelectedNamespaceFile(filePath);
    
    if (!filePath) {
      setNamespaceData({});
      return;
    }
    
    const organizationId = localStorage.getItem('organizationPrefix') || '';
    if (!organizationId) {
      setNamespaceData({ error: t('formatEditor.orgIdMissing') });
      return;
    }
    
    try {
      // XMLコンテンツを取得（fetchTemplateContent は fileKey 1引数）
      const fileKey = `${organizationId}/${filePath}`;
      const xmlContent = await fetchTemplateContent(fileKey);
      
      // プロパティを解析
      const parsedProperties = parseNamespacesFromXml(xmlContent);
      
      // 大きなXMLは最初の500行に制限
      const xmlLines = xmlContent.split('\n');
      const limitedXml = xmlLines.length > 500 
        ? xmlLines.slice(0, 500).join('\n') + '\n\n... (残り省略)'
        : xmlContent;
      
      setNamespaceData({
        xml: limitedXml,
        properties: parsedProperties
      });
    } catch (error) {
      console.error('プレビュー読み込みエラー:', error);
      setNamespaceData({
        error: t('formatEditor.previewLoadFailed')
      });
    }
  };

  /**
   * ✅ Phase 3-3: テンプレートファイルから名前空間を取り込み（重複チェック付き）（Reference版に統一）
   */
  const handleConfirmImportWithDuplicateCheck = async () => {
    if (!selectedNamespaceFile) {
      message.error(t('formatEditor.nsFileRequired'));
      return;
    }

    // プレビュー内容がある場合はそれを使用、なければ再取得
    let parsedNamespaces = namespaceData.properties;
    
    if (!parsedNamespaces) {
      const organizationId = localStorage.getItem('organizationPrefix') || '';
      if (!organizationId) {
        message.error(t('formatEditor.orgIdMissing'));
        return;
      }

      try {
        const fileKey = `${organizationId}/${selectedNamespaceFile}`;
        const xmlContent = await fetchTemplateContent(fileKey);
        parsedNamespaces = parseNamespacesFromXml(xmlContent);
      } catch (error) {
        console.error('名前空間取り込みエラー:', error);
        message.error(t('formatEditor.nsImportFailed'));
        return;
      }
    }

    // 重複チェック
    const duplicates = Object.keys(parsedNamespaces).filter(key => properties[key]);
    setDuplicateKeys(duplicates);

    // 確認ダイアログを表示
    setShowConfirmDialog(true);
  };

  /**
   * ✅ Phase 3-3: 取り込み確認後の実行（Reference版に統一）
   */
  const handleImportNamespace = () => {
    if (!namespaceData.properties) {
      message.error(t('formatEditor.noPropToImport'));
      return;
    }

    try {
      const fileName = selectedNamespaceFile.split('/').pop() || selectedNamespaceFile;
      
      // プロパティ取り込み処理（Contentsモードは削除）
      const processedProperties: Record<string, PropertyData> = {};
      
      Object.entries(namespaceData.properties).forEach(([key, propData]) => {
        processedProperties[key] = {
          ...propData,
          namespaceOrigin: true,
          namespaceSource: {
            fileName: fileName,
            importedAt: new Date().toISOString()
          }
        };
      });
      
      // 既存のプロパティにマージ（重複キーは上書き）
      setProperties(prev => ({
        ...prev,
        ...processedProperties
      }));
      
      setForceRenderKey(Date.now());
      message.success(
        `${fileName} から ${Object.keys(processedProperties).length} 個のプロパティを取り込みました`
      );

      // 取り込み済みリストに追加
      setImportedNamespaces(prev => [...prev, fileName]);
      
      // 状態をクリア
      setShowConfirmDialog(false);
      setShowNamespaceDialog(false);
      setSelectedNamespaceFile('');
      setNamespaceData({});
      setDuplicateKeys([]);
      setHasChanges(true);
    } catch (error) {
      console.error('[名前空間取り込み] エラー:', error);
      message.error(t('formatEditor.nsImportError', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  /**
   * 保存処理（フォーマット管理専用）
   */
  const handleSave = () => {
    // ✅ templateId が空の場合は自動生成
    // フォーマット管理画面では templateId 入力フィールドが非表示のため、
    // ユーザーが入力できない。空の場合は自動生成して処理を続行する。
    const effectiveTemplateId = templateId.trim() ||
      `${node.data.placeType}_template_${Date.now()}`;

    // PropertyData形式からProperty[]とContent[]に変換
    const convertedProperties = convertPropertyDataToPropertiesArray(properties);
    const convertedContents = convertPropertyDataToContentsArray(contents);

    console.log('📝 [FormatEditorDialog] 保存処理:', {
      effectiveTemplateId,
      name,
      category: nodeCategory,
      propertiesCount: convertedProperties.length,
      contentsCount: convertedContents.length
    });

    // ✅ Template型を経由せず直接渡す
    // 注意: onClose() は FormatManagement の onSave ハンドラ内で呼ばれるため、ここでは呼ばない
    onSave(
      node.id,
      convertedProperties,
      convertedContents,
      effectiveTemplateId,
      name,
      description,
      nodeCategory
    );

    setHasChanges(false);
  };

  if (!node) return null;

  return (
    <Modal
      title={
        <Space>
          {templateIcon}
          <span>{nodeCategory}を編集</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={960}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
      ]}
    >
      <div>
        {/* エラー表示 */}
        {mergedTemplate && templateErrors[mergedTemplate.id] && templateErrors[mergedTemplate.id].length > 0 && (
          <Alert
            title={`⚠️ バリデーション警告（${templateErrors[mergedTemplate.id].length}件）`}
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

        {/* 基本情報・PlaceRef・Insertionセクションは非表示（フォーマット管理画面では不要） */}
      </div>

      {/* Properties編集セクション */}
      <div style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginBottom: 8 }}>🏷️ Properties</Title>
        
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            {t('formatEditor.addPropTitle')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleOpenNamespaceImport('replace_all_properties')}>
            テンプレートから取り込み
          </Button>
        </Space>

          {Object.keys(properties).length === 0 ? (
            <Alert title={t('formatEditor.propsEmpty')} type="info" />
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
            <Divider style={{ margin: '12px 0' }} />
            <Collapse
              items={[
                {
                  key: 'inherited',
                  label: (
                    <Space>
                      <FileSearchOutlined />
                      <Text strong>
                        🔗 継承元プロパティ（親テンプレート: {inheritedTemplate.id}）
                      </Text>
                      <Tag color="blue">{t('common.readOnly')}</Tag>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: 16, backgroundColor: '#f0f5ff' }}>
                      <Alert
                        title={t('formatEditor.inheritedAlert')}
                        description="編集する場合は、親テンプレート側で変更してください"
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
                          title={t('formatEditor.parentPropsEmpty')}
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
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ marginBottom: 8 }}>🏷️ Contents</Title>
              
              <Space style={{ marginBottom: 12 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowContentAddModal(true)}>
                  {t('formatEditor.addContentTitle')}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleOpenNamespaceImport('replace_all_contents')}>
                  テンプレートから取り込み
                </Button>
              </Space>

              {Object.keys(contents).length === 0 ? (
                <Alert title={t('formatEditor.contentsEmpty')} type="info" />
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
            <span>テンプレートから名前空間を取り込み</span>
          </Space>
        }
        open={showNamespaceDialog}
        onCancel={() => {
          setShowNamespaceDialog(false);
          setSelectedNamespaceFile('');
        }}
        onOk={handleConfirmImportWithDuplicateCheck}
        width={900}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }
        }}
        okText={t('formatEditor.nsModalOk')}
        cancelText={t('formatEditor.nsModalCancel')}
        okButtonProps={{ disabled: !selectedNamespaceFile }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Alert
            title="テンプレートファイルから名前空間（properties定義）を取り込みます"
            description={
              <div>
                <p>・選択したテンプレートファイルのproperties定義を現在のテンプレートに追加します</p>
                <p>・同じキーのプロパティは上書きされます</p>
                <p>・複数のテンプレートから取り込むことができます</p>
              </div>
            }
            type="info"
          />

          {/* ✅ Phase 3-1 & 3-2: テンプレートファイル選択（TreeSelect版 + プレビュー連動） */}
          <Form.Item label={t('formatEditor.nsFileLabel')}>
            <TreeSelect
              placeholder={t('formatEditor.nsFilePlaceholder')}
              value={selectedNamespaceFile}
              onChange={handleSelectNamespaceFile}
              loading={isLoadingTemplates}
              style={{ width: '100%' }}
              showSearch
              treeDefaultExpandAll={false}
              treeData={buildTreeData(templateFiles)}
              filterTreeNode={(input, node) =>
                (node?.title?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* ✅ Phase 3-2: プレビュー表示 */}
          {selectedNamespaceFile && (
            <>
              {namespaceData.error && (
                <Alert
                  title={t('formatEditor.previewError')}
                  description={namespaceData.error}
                  type="error"
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {namespaceData.properties && (
                <Alert
                  title={
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>📊 プロパティプレビュー ({Object.keys(namespaceData.properties).length}件)</Text>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {Object.entries(namespaceData.properties).map(([key, data]) => (
                          <div key={key} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f5ff', borderRadius: 4 }}>
                            <Text strong>{key}</Text>
                            {data.attributes?.['xsi:type'] && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {data.attributes['xsi:type']}
                              </Tag>
                            )}
                            {data.elements?.value && (
                              <div style={{ marginLeft: 16, fontSize: 12 }}>
                                値: {data.elements.value}
                              </div>
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
              
              {namespaceData.xml && (
                <Collapse
                  items={[
                    {
                      key: 'xml',
                      label: t('formatEditor.xmlPreviewLabel'),
                      children: (
                        <pre style={{
                          maxHeight: 300,
                          overflowY: 'auto',
                          backgroundColor: '#f5f5f5',
                          padding: 12,
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          {namespaceData.xml}
                        </pre>
                      )
                    }
                  ]}
                />
              )}
            </>
          )}

          {/* テンプレートファイル一覧 */}
          {!isLoadingTemplates && templateFiles.length === 0 && (
            <Alert
              title={t('formatEditor.nsFileNotFound')}
              description={t('formatEditor.nsFileNotFoundDesc')}
              type="warning"
            />
          )}
        </Space>
      </Modal>

      {/* プロパティ追加モーダル */}
      <Modal
        title={t('formatEditor.addPropTitle')}
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddProperty}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={t('formatEditor.propKeyPlaceholder')}
            value={newPropertyKey}
            onChange={(e) => setNewPropertyKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder={t('formatEditor.tagNamePlaceholder')}
            value={newPropertyTagName}
            onChange={setNewPropertyTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* Phase 3.2: Content追加モーダル */}
      <Modal
        title={t('formatEditor.addContentTitle')}
        open={showContentAddModal}
        onCancel={() => setShowContentAddModal(false)}
        onOk={handleAddContent}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={t('formatEditor.contentKeyPlaceholder')}
            value={newContentKey}
            onChange={(e) => setNewContentKey(e.target.value)}
          />
          <Select
            style={{ width: '100%' }}
            placeholder={t('formatEditor.tagNamePlaceholder')}
            value={newContentTagName}
            onChange={setNewContentTagName}
          >
            <Option value="property">property</Option>
            <Option value="content">content</Option>
            <Option value="parameter">parameter</Option>
          </Select>
        </Space>
      </Modal>

      {/* ✅ Phase 3-3: 取り込み確認ダイアログ */}
      <Modal
        title={t('formatEditor.confirmImportTitle')}
        open={showConfirmDialog}
        onCancel={() => {
          setShowConfirmDialog(false);
          setDuplicateKeys([]);
        }}
        onOk={handleImportNamespace}
        okText={t('formatEditor.confirmImportOk')}
        cancelText={t('formatEditor.confirmImportCancel')}
        width={720}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {duplicateKeys.length > 0 ? (
            <Alert
              title={t('formatEditor.confirmImportTitle') + ` (${duplicateKeys.length})`}
              description={
                <div>
                  <p>{t('formatEditor.propsEmpty')}</p>
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
              title={t('formatEditor.noDuplicateTitle')}
              description={t('formatEditor.noDuplicateDesc')}
              type="success"
              showIcon
            />
          )}
          
          {namespaceData.properties && (
            <div>
              <Text strong>{t('formatEditor.addPropTitle')}: {Object.keys(namespaceData.properties).length}</Text>
              <div style={{ 
                maxHeight: 300, 
                overflowY: 'auto', 
                marginTop: 8,
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 4
              }}>
                {Object.keys(namespaceData.properties).map(key => (
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
          )}
        </Space>
      </Modal>
      
      {/* Place Reference追加ダイアログは非表示（フォーマット管理画面では不要） */}
    </Modal>
  );
};

export default FormatEditorDialog;
