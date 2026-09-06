/**
 * PropertyPanel - ノードプロパティ編集パネル（EditorV2用）
 * 
 * ノード/エッジ選択時に表示される右側パネル
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.2
 * @date 2026-02-16
 */

import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  App,
  Input, 
  Typography, 
  Button, 
  Divider, 
  Modal, 
  Select, 
  Checkbox, 
  Space,
  Card,
} from 'antd';
import { 
  CloseOutlined, 
  DeleteOutlined, 
  WarningOutlined,
} from '@ant-design/icons';
import type { Node, Edge } from 'reactflow';

const { Text, Title } = Typography;
const { TextArea } = Input;

import type { 
  MethodData, 
  NodeData, 
  EdgeData,
} from '../../types/editor';
import type { ErrorContent } from '../../types/maimlValidation';
import { useTemplates } from '../../contexts/TemplateContext';
import { Reference, Template } from '@/types/maiml-unified';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * PropertyPanelProps - PropertyPanelコンポーネントのProps型定義
 */
export interface PropertyPanelProps {
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  onUpdate: (nodeId: string, data: NodeData) => void;
  onUpdateEdge?: (oldEdgeId: string, newEdgeId: string) => void;
  onClose: () => void;
  onOpenTemplateEditor: (node: Node<NodeData>) => void;
  onDelete: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onUpdateNodeId?: (oldId: string, newId: string) => void;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  methods: MethodData[];
  activeMethodIndex: number;
}

/**
 * PropertyPanel - プロパティ編集パネル
 */
const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedEdge,
  onUpdate,
  onUpdateEdge,
  onClose,
  onOpenTemplateEditor,
  onDelete,
  onDeleteEdge,
  onUpdateNodeId,
  nodes,
  edges,
  methods,
  activeMethodIndex,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteEdgeConfirmOpen, setDeleteEdgeConfirmOpen] = useState(false);

  // ✅ TemplateContextから allTemplates と commonTemplates を取得
  const { allTemplates, commonTemplates } = useTemplates();

  // ノード/エッジの基本判定
  const isPlace = selectedNode?.data?.nodeType === 'place';
  const placeType = selectedNode?.data?.placeType || 'material';
  const isEdge = !!selectedEdge && !selectedNode;

  // 同一method内のテンプレート一覧
  const availableTemplatesForInheritance = useMemo(() => {
    if (!selectedNode || !isPlace || !nodes) return [];
    
    const templates = nodes
      .filter(node => 
        node.data.nodeType === 'place' && 
        node.data.placeType === placeType &&
        node.id !== selectedNode.id
      )
      .map(node => ({
        id: node.id,
        name: node.data.name || node.id,
      }));
    
    console.log('🔍 [PropertyPanel] テンプレート継承用:', templates.length);
    return templates;
  }, [nodes, isPlace, placeType, selectedNode]);

  // 共通テンプレート一覧（TemplateContextのcommonTemplatesから取得: methodId=nullのテンプレート）
  const availableCommonTemplates = useMemo(() => {
    if (!selectedNode || !isPlace || !commonTemplates) return [];

    // placeTypeに合致する共通テンプレートのみを抽出
    const categoryTemplates = commonTemplates[placeType as 'material' | 'condition' | 'result'] || [];

    const result = categoryTemplates
      .filter(template => template.id !== selectedNode.id)
      .map(template => ({
        id: template.id,
        name: template.name || template.id,
      }));

    console.log('✅ [PropertyPanel] 共通テンプレート (TemplateContext):', result.length);
    return result;
  }, [commonTemplates, isPlace, placeType, selectedNode]);

  // 早期リターン
  if (!selectedNode && !selectedEdge) return null;

  /**
   * プロパティ変更ハンドラー
   */
  const handleChange = (field: string, value: unknown) => {
    if (selectedNode) {
      onUpdate(selectedNode.id, {
        ...selectedNode.data,
        [field]: value,
      });
    }
  };

  /**
   * ノード削除確認ハンドラー
   */
  const handleDeleteConfirm = () => {
    if (selectedNode && onDelete) {
      onDelete(selectedNode.id);
    }
    setDeleteConfirmOpen(false);
    onClose();
  };

  /**
   * テンプレート継承変更ハンドラー
   */
  const handleTemplateRefChange = (href: string) => {
    if (!selectedNode) return;
    
    console.log('🔄 [PropertyPanel] テンプレート継承変更:', { href });
    
    const updatedData: NodeData = {
      ...selectedNode.data,
      templateRef: href ? {
        id: href,
        category: placeType,
        uuid: ``,
        name: '',
        placeRefs: [],
        templateRef: {id :'', ref: href},
        properties: [],
        contents: []
      } : undefined,
    };
    
    if (updatedData.template) {
      updatedData.template = {
        ...updatedData.template,
        templateRef: {id :'', ref: href},
      };
    } else if (href) {
      
      // TemplateRef型に準拠
      updatedData.template = {
        id: selectedNode.id,
        category: placeType,
        uuid: `template-${selectedNode.id}`,
        name: selectedNode.data.name || selectedNode.id,
        placeRefs: [],
        templateRef: {id :'', ref: href},
        properties: [],
        contents: []
      };
      updatedData.templateRef = {
        id: href,
        category: placeType,
        uuid: '',
        name: '',
        placeRefs: [],
        templateRef: {id :'', ref: href},
        properties: [],
        contents: []
      } ;
    }
    
    onUpdate(selectedNode.id, updatedData);
  };

  /**
   * エラー表示コンポーネント
   */
  const renderErrors = (errors?: ErrorContent[]) => {
    if (!errors || errors.length === 0) return null;
    
    return (
      <Card
        size="small"
        style={{ 
          marginBottom: 16, 
          backgroundColor: '#fff3e0',
          border: '1px solid #ff9800'
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: '#ff9800' }}>
            <WarningOutlined /> {t('editor.property.warningCount', { count: String(errors.length) })}
          </Text>
          {errors.map((error, idx) => (
            <div key={idx} style={{ paddingLeft: 8, borderLeft: '2px solid #ff9800' }}>
              <Text strong style={{ fontSize: 12 }}>{error.type}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{error.message}</Text>
              {error.details && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {t('editor.property.details')} {String(error.details)}
                  </Text>
                </>
              )}
            </div>
          ))}
        </Space>
      </Card>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: 350,
        height: '100%',
        backgroundColor: '#fff',
        borderLeft: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1890ff',
          color: '#fff',
        }}
      >
        <Title level={5} style={{ margin: 0, color: '#fff' }}>
          {isEdge ? t('property.arcProps') :
           isPlace ? t('property.placeProps') : t('property.transitionProps')}
        </Title>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: '#fff' }}
        />
      </div>

      {/* プロパティ編集エリア */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* エッジ選択時 */}
        {isEdge && selectedEdge && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {renderErrors(selectedEdge.data?.errors)}
            
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('editor.property.elementType')}</Text>
              <br />
              <Text strong>{t('editor.property.arcEdge')}</Text>
            </Card>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Text strong style={{ fontSize: 12 }}>Arc ID</Text>
              <Input
                value={selectedEdge.id || ''}
                onChange={(e) => {
                  if (onUpdateEdge) {
                    onUpdateEdge(selectedEdge.id, e.target.value);
                  }
                }}
                placeholder="Arc ID"
                style={{ marginTop: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                {t('editor.property.arcIdHint')}
              </Text>
            </div>

            <div>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {t('editor.property.connectionInfo')}
              </Text>
              <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Source:</Text>
                    <Text style={{ fontSize: 12 }}>{selectedEdge.source}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Target:</Text>
                    <Text style={{ fontSize: 12 }}>{selectedEdge.target}</Text>
                  </div>
                </Space>
              </Card>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                {t('editor.property.sourceTargetHint')}
              </Text>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteEdgeConfirmOpen(true)}
              block
            >
              {t('editor.property.deleteEdge')}
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {t('editor.property.deleteEdgeDesc')}
            </Text>
          </Space>
        )}

        {/* ノード選択時 */}
        {selectedNode && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {renderErrors(selectedNode.data?.errors)}
            
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('editor.property.nodeType')}</Text>
              <br />
              <Text strong>
                {isPlace ? `${placeType.charAt(0).toUpperCase() + placeType.slice(1)} Place` : 'Transition'}
              </Text>
            </Card>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Text strong style={{ fontSize: 12 }}>{t('editor.property.nodeId')}</Text>
              <Input
                value={selectedNode.id || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  
                  if (!newId.trim()) {
                    message.error(t('editor.property.nodeIdEmpty'));
                    return;
                  }
                  
                  const isDuplicate = nodes.some(n => n.id === newId && n.id !== selectedNode.id);
                  if (isDuplicate) {
                    message.error(t('editor.property.nodeIdDuplicate', { id: newId }));
                    return;
                  }
                  
                  if (onUpdateNodeId) {
                    onUpdateNodeId(selectedNode.id, newId);
                  }
                }}
                placeholder={t('editor.property.nodeId')}
                style={{ marginTop: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                {t('editor.property.nodeIdHint')}
              </Text>
            </div>

            <div>
              <Text strong style={{ fontSize: 12 }}>{t('editor.property.name')}</Text>
              <Input
                value={selectedNode.data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('editor.property.namePlaceholder', { placeType })}
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <Text strong style={{ fontSize: 12 }}>{t('editor.property.description')}</Text>
              <TextArea
                rows={4}
                value={selectedNode.data.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('editor.property.descriptionPlaceholder')}
                style={{ marginTop: 4 }}
              />
            </div>

            {isPlace && (
              <>
                <Divider style={{ margin: '8px 0' }} />

                <div>
                  <Checkbox
                    checked={selectedNode.data.isCommonTemplate || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (!checked) {
                        // ✅ チェックボックスOFF: commonTemplateRefもクリア + TemplateContextのplaceRefsから削除
                        const prevRef = selectedNode.data.commonTemplateRef;
                        if (prevRef && window.clineAllTemplates && window.clineUpdateTemplate) {
                          const category = placeType as 'material' | 'condition' | 'result';
                          const targetTemplate = window.clineAllTemplates[category]?.find((t) => t.id === prevRef);
                          if (targetTemplate) {
                            window.clineUpdateTemplate(prevRef, {
                              ...targetTemplate,
                              placeRefs: (targetTemplate.placeRefs || []).filter(
                                (pr) => pr.ref !== selectedNode.id
                              ),
                            });
                            console.log('✅ [PropertyPanel] チェックOFF: placeRefs削除:', {
                              templateId: prevRef,
                              nodeId: selectedNode.id,
                            });
                          }
                        }
                        onUpdate(selectedNode.id, {
                          ...selectedNode.data,
                          isCommonTemplate: false,
                          commonTemplateRef: undefined,
                          template: undefined,
                          templateRef: undefined,
                        });
                      } else {
                        handleChange('isCommonTemplate', true);
                      }
                    }}
                  >
                    {t('editor.property.commonTemplate')}
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    {t('editor.property.commonTemplateHint')}
                  </Text>
                </div>

                {availableTemplatesForInheritance.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {t('editor.property.templateInheritance')}
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedNode.data.templateRef?.id || ''}
                      onChange={handleTemplateRefChange}
                      options={[
                        { value: '', label: t('editor.property.noInheritance') },
                        ...availableTemplatesForInheritance.map(tmpl => ({
                          value: `#${tmpl.id}`,
                          label: tmpl.name,
                        })),
                      ]}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      {t('editor.property.templateInheritanceHint')}
                    </Text>
                  </div>
                )}

                {availableCommonTemplates.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {t('editor.property.commonTemplateRef')}
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedNode.data.commonTemplateRef || ''}
                      onChange={(value) => {
                        // 共通テンプレートRefを設定・解除する際に isCommonTemplate も連動して更新する
                        // value あり → isCommonTemplate = true（チェックボックスON）
                        // value なし → isCommonTemplate = false（チェックボックスOFF）、
                        //              継承した template / templateRef もクリアする
                        if (value) {
                          // 1. ノードデータを更新（チェックボックスON + refセット）
                          onUpdate(selectedNode.id, {
                            ...selectedNode.data,
                            commonTemplateRef: value,
                            isCommonTemplate: true,
                          });
                          // 2. TemplateContext の対象テンプレートの placeRefs にこのノードIDを追加
                          if (window.clineAllTemplates && window.clineUpdateTemplate) {
                            const allTemplates = window.clineAllTemplates;
                            const category = placeType as 'material' | 'condition' | 'result';
                            const targetTemplate = allTemplates[category]?.find((t) => t.id === value);
                            if (targetTemplate) {
                              const alreadyExists = targetTemplate.placeRefs?.some(
                                (pr) => pr.ref === selectedNode.id
                              );
                              if (!alreadyExists) {
                                window.clineUpdateTemplate(value, {
                                  ...targetTemplate,
                                  placeRefs: [
                                    ...(targetTemplate.placeRefs || []),
                                    { id: '', ref: selectedNode.id },
                                  ],
                                });
                                console.log('✅ [PropertyPanel] placeRefs追加:', {
                                  templateId: value,
                                  nodeId: selectedNode.id,
                                });
                              }
                            }
                          }
                        } else {
                          // 解除時: TemplateContext の placeRefs からこのノードIDを削除
                          const prevRef = selectedNode.data.commonTemplateRef;
                          if (prevRef && window.clineAllTemplates && window.clineUpdateTemplate) {
                            const allTemplates = window.clineAllTemplates;
                            const category = placeType as 'material' | 'condition' | 'result';
                            const targetTemplate = allTemplates[category]?.find((t) => t.id === prevRef);
                            if (targetTemplate) {
                              window.clineUpdateTemplate(prevRef, {
                                ...targetTemplate,
                                placeRefs: (targetTemplate.placeRefs || []).filter(
                                  (pr) => pr.ref !== selectedNode.id
                                ),
                              });
                              console.log('✅ [PropertyPanel] placeRefs削除:', {
                                templateId: prevRef,
                                nodeId: selectedNode.id,
                              });
                            }
                          }
                          onUpdate(selectedNode.id, {
                            ...selectedNode.data,
                            commonTemplateRef: undefined,
                            isCommonTemplate: false,
                            template: undefined,    // 継承テンプレートを解除
                            templateRef: undefined, // 継承テンプレートRefを解除
                          });
                        }
                      }}
                      options={[
                        { value: '', label: t('editor.property.none') },
                        ...availableCommonTemplates.map(tmpl => ({
                          value: tmpl.id,
                          label: tmpl.name,
                        })),
                      ]}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      {t('editor.property.commonTemplateRefHint')}
                    </Text>
                  </div>
                )}

                <div>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    {t('editor.property.templateInfo')}
                  </Text>
                  <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 8 }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('editor.property.kind')}</Text>
                        <Text style={{ fontSize: 12 }}>
                          {placeType === 'material' ? 'Material Template' :
                           placeType === 'condition' ? 'Condition Template' :
                           'Result Template'}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('editor.property.propertyCount')}</Text>
                        <Text style={{ fontSize: 12 }}>
                          {selectedNode.data.templateRef?.properties?.length || 0}{t('editor.property.propertyCountUnit')}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                  <Button
                    type="default"
                    onClick={() => {
                      console.log('🔍 [PropertyPanel] テンプレート編集ボタンクリック:', {
                        nodeId: selectedNode.id,
                        hasTemplate: !!selectedNode.data.template,
                        hasTemplateRef: !!selectedNode.data.templateRef,
                      });
                      
                      // ✅ reference版と同様: allTemplatesからテンプレートを復元
                      let latestTemplate = null;
                      const nodeId = selectedNode.id;
                      
                      const category = placeType as 'material' | 'condition' | 'result';
                      if (allTemplates && allTemplates[category]) {
                        // このノードをplaceRefsで参照しているテンプレートを検索
                        latestTemplate = allTemplates[category].find((t: Template) =>
                          t.placeRefs && t.placeRefs.some((ref: Reference) => ref.ref === nodeId)
                        );
                        
                        console.log('🔍 [PropertyPanel] TemplateContext検索:', {
                          placeType,
                          nodeId,
                          allTemplatesCount: allTemplates[category].length,
                          foundTemplate: !!latestTemplate,
                          templateId: latestTemplate?.id,
                        });
                      }
                      
                      // 最新のテンプレート情報をノードデータにマージ
                      const updatedNode: Node<NodeData> = {
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                        }
                      };
                      
                      // ✅ latestTemplateが見つかった場合は、それを使用
                      if (latestTemplate) {
                        console.log('✅ [PropertyPanel] 復元されたテンプレートを使用');
                        updatedNode.data.template = {
                          ...latestTemplate
                        };
                        updatedNode.data.templateRef = {
                          ...latestTemplate
                        };
                      }
                      
                      // 既存テンプレートがあるかチェック（ノード自身のtemplateまたは復元されたtemplate）
                      let hasExistingTemplate = false;
                      if (updatedNode.data.template && updatedNode.data.template.id) {
                        console.log('✅ [PropertyPanel] 既存テンプレートあり:', {
                          templateId: updatedNode.data.template.id,
                          uuid: updatedNode.data.template.uuid,
                        });
                        hasExistingTemplate = true;
                        
                        // ✅ 既存テンプレートの場合は、そのままデータを使用（ID・UUIDを保持）
                        updatedNode.data.template = {
                          ...updatedNode.data.template
                        };
                        if (updatedNode.data.templateRef) {
                          updatedNode.data.templateRef = {
                            ...updatedNode.data.templateRef
                          };
                        }
                      }
                      
                      // 新規テンプレートの場合のみ、初期データを設定
                      if (!hasExistingTemplate) {
                        console.log('⚠️ [PropertyPanel] 新規テンプレートとして初期データを設定');
                        
                        // ✅ テンプレートIDをノードIDとは異なるIDにする（重複ID回避）
                        const templateId = `${placeType}Template_${Date.now()}`;
                        
                        // ✅ 修正: ID、UUID、PlaceRefを明示的に設定
                        updatedNode.data.template = {
                          id: templateId,  // ✅ ノードIDとは異なる専用ID
                          category: placeType,
                          uuid: updatedNode.data.template?.uuid || uuidv4(),  // ✅ UUID生成
                          name: selectedNode.data.name || '',
                          description: selectedNode.data.description || '',
                          placeRefs: [{ id: '', ref: nodeId }],  // ✅ PlaceRef型で自ノードIDを設定
                          properties: updatedNode.data.template?.properties || [],
                          contents: []
                        };
                        
                        updatedNode.data.templateRef = {
                          ...updatedNode.data.template
                        };
                        
                        // 新規テンプレートフラグを設定
                        updatedNode.data.isNewTemplate = true;
                        updatedNode.data.templateCategory = placeType;
                        
                        // 共通テンプレートかメソッド内テンプレートかを判定
                        const isCommon = selectedNode.data.isCommonTemplate || false;
                        updatedNode.data.isCommonTemplate = isCommon;
                        
                        // methodIdを設定（共通テンプレートでない場合のみ）
                        if (!isCommon && methods && methods[activeMethodIndex]) {
                          updatedNode.data.methodId = methods[activeMethodIndex].methodId;
                          console.log('📋 [PropertyPanel] methodIdを設定:', {
                            methodId: updatedNode.data.methodId,
                            activeMethodIndex
                          });
                        } else {
                          updatedNode.data.methodId = null;
                          console.log('📋 [PropertyPanel] 共通テンプレートとして設定');
                        }
                        
                        console.log('✅ [PropertyPanel] 初期データ設定完了:', {
                          templateId: updatedNode.data.template.id,
                          uuid: updatedNode.data.template.uuid,
                          placeRefs: updatedNode.data.template.placeRefs,
                        });
                      }
                      
                      console.log('✅ [PropertyPanel] テンプレート編集画面を開く');
                      onOpenTemplateEditor(updatedNode);
                    }}
                    block
                  >
                    {t('editor.property.editTemplate')}
                  </Button>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    {t('editor.property.editTemplateDesc')}
                  </Text>
                </div>
              </>
            )}

            <Divider style={{ margin: '8px 0' }} />

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteConfirmOpen(true)}
              block
            >
              {t('editor.property.deleteNode')}
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {t('editor.property.deleteNodeDesc')}
            </Text>
          </Space>
        )}
      </div>

      {/* ノード削除確認モーダル */}
      {selectedNode && (
        <Modal
          title={t('editor.property.deleteNodeTitle')}
          open={deleteConfirmOpen}
          onOk={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmOpen(false)}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <p>
            {t('editor.property.deleteNodeContent', { name: selectedNode.data.name || selectedNode.id })}
            <br />
            {t('editor.property.irreversible')}
          </p>
        </Modal>
      )}

      {/* エッジ削除確認モーダル */}
      {selectedEdge && (
        <Modal
          title={t('editor.property.deleteEdgeTitle')}
          open={deleteEdgeConfirmOpen}
          onOk={() => {
            if (onDeleteEdge) {
              onDeleteEdge(selectedEdge.id);
            }
            setDeleteEdgeConfirmOpen(false);
            onClose();
          }}
          onCancel={() => setDeleteEdgeConfirmOpen(false)}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <p>
            {t('editor.property.deleteEdgeContent', { id: selectedEdge.id })}
            <br />
            {t('editor.property.irreversible')}
          </p>
        </Modal>
      )}
    </div>
  );
};

export default PropertyPanel;
