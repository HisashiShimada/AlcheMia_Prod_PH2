/**
 * PropertyPanel - ノードプロパティ編集パネル（EditorV2用）
 * 
 * ノード/エッジ選択時に表示される右側パネル
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState, useMemo } from 'react';
import { 
  Input, 
  Typography, 
  Button, 
  Divider, 
  Modal, 
  Select, 
  Checkbox, 
  Space,
  message,
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
  ValidationError,
} from '../types';

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteEdgeConfirmOpen, setDeleteEdgeConfirmOpen] = useState(false);

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

  // 共通テンプレート一覧（全methodから）
  const availableCommonTemplates = useMemo(() => {
    if (!selectedNode || !isPlace || !methods || methods.length <= 1) return [];
    
    const commonTemplates: Array<{
      id: string;
      name: string;
      methodIndex: number;
      methodName: string;
    }> = [];
    
    methods.forEach((method, index) => {
      if (!method.nodes) return;
      
      const templates = method.nodes
        .filter(node => 
          node.data.nodeType === 'place' &&
          node.data.placeType === placeType &&
          node.data.isCommonTemplate === true &&
          node.id !== selectedNode.id
        )
        .map(node => ({
          id: node.id,
          name: node.data.name || node.id,
          methodIndex: index,
          methodName: method.name || `Method ${index + 1}`,
        }));
      
      commonTemplates.push(...templates);
    });
    
    console.log('✅ [PropertyPanel] 共通テンプレート:', commonTemplates.length);
    return commonTemplates;
  }, [methods, isPlace, placeType, selectedNode]);

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
  const renderErrors = (errors?: ValidationError[]) => {
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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: '#ff9800' }}>
            <WarningOutlined /> {errors.length}件の警告
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
                    詳細: {String(error.details)}
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
          {isEdge ? 'Arc プロパティ' :
           isPlace ? 'Place プロパティ' : 'Transition プロパティ'}
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
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderErrors(selectedEdge.data?.errors)}
            
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>要素タイプ</Text>
              <br />
              <Text strong>Arc (エッジ)</Text>
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
                Arc IDを編集できます（重複チェックは保存時に行われます）
              </Text>
            </div>

            <div>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                接続情報
              </Text>
              <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
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
                Source/Targetは変更できません
              </Text>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteEdgeConfirmOpen(true)}
              block
            >
              エッジを削除
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              このエッジを完全に削除します
            </Text>
          </Space>
        )}

        {/* ノード選択時 */}
        {selectedNode && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderErrors(selectedNode.data?.errors)}
            
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>ノードタイプ</Text>
              <br />
              <Text strong>
                {isPlace ? `${placeType.charAt(0).toUpperCase() + placeType.slice(1)} Place` : 'Transition'}
              </Text>
            </Card>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Text strong style={{ fontSize: 12 }}>ノードID</Text>
              <Input
                value={selectedNode.id || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  
                  if (!newId.trim()) {
                    message.error('ノードIDは空にできません');
                    return;
                  }
                  
                  const isDuplicate = nodes.some(n => n.id === newId && n.id !== selectedNode.id);
                  if (isDuplicate) {
                    message.error(`ID "${newId}" は既に使用されています`);
                    return;
                  }
                  
                  if (onUpdateNodeId) {
                    onUpdateNodeId(selectedNode.id, newId);
                  }
                }}
                placeholder="ノードID"
                style={{ marginTop: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                ノードIDを変更できます（重複不可）
              </Text>
            </div>

            <div>
              <Text strong style={{ fontSize: 12 }}>名前</Text>
              <Input
                value={selectedNode.data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={`${placeType} の名前を入力`}
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <Text strong style={{ fontSize: 12 }}>説明</Text>
              <TextArea
                rows={4}
                value={selectedNode.data.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="ノードの説明を入力"
                style={{ marginTop: 4 }}
              />
            </div>

            {isPlace && (
              <>
                <Divider style={{ margin: '8px 0' }} />

                <div>
                  <Checkbox
                    checked={selectedNode.data.isCommonTemplate || false}
                    onChange={(e) => handleChange('isCommonTemplate', e.target.checked)}
                  >
                    共通テンプレート（全methodで共有）
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    チェックすると、このテンプレートを他のmethodからも参照できます
                  </Text>
                </div>

                {availableTemplatesForInheritance.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      テンプレート継承
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedNode.data.templateRef?.id || ''}
                      onChange={handleTemplateRefChange}
                      options={[
                        { value: '', label: 'なし（独立テンプレート）' },
                        ...availableTemplatesForInheritance.map(tmpl => ({
                          value: `#${tmpl.id}`,
                          label: tmpl.name,
                        })),
                      ]}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      同一method内のテンプレートからプロパティを継承
                    </Text>
                  </div>
                )}

                {availableCommonTemplates.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      共通テンプレート参照
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedNode.data.commonTemplateRef || ''}
                      onChange={(value) => handleChange('commonTemplateRef', value || null)}
                      options={[
                        { value: '', label: 'なし' },
                        ...availableCommonTemplates.map(tmpl => ({
                          value: tmpl.id,
                          label: `${tmpl.name} (from ${tmpl.methodName})`,
                        })),
                      ]}
                    />
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      共通テンプレートへのplaceRef参照を追加
                    </Text>
                  </div>
                )}

                <div>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    テンプレート情報
                  </Text>
                  <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>種類:</Text>
                        <Text style={{ fontSize: 12 }}>
                          {placeType === 'material' ? 'Material Template' :
                           placeType === 'condition' ? 'Condition Template' :
                           'Result Template'}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>プロパティ数:</Text>
                        <Text style={{ fontSize: 12 }}>
                          {selectedNode.data.templateRef?.properties?.length || 0}件
                        </Text>
                      </div>
                    </Space>
                  </Card>
                  <Button
                    type="default"
                    onClick={() => onOpenTemplateEditor(selectedNode)}
                    block
                  >
                    テンプレート編集
                  </Button>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    プロパティの追加・編集・削除
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
              ノードを削除
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              このノードを完全に削除します
            </Text>
          </Space>
        )}
      </div>

      {/* ノード削除確認モーダル */}
      {selectedNode && (
        <Modal
          title="ノード削除の確認"
          open={deleteConfirmOpen}
          onOk={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmOpen(false)}
          okText="削除"
          cancelText="キャンセル"
          okButtonProps={{ danger: true }}
        >
          <p>
            ノード &ldquo;{selectedNode.data.name || selectedNode.id}&rdquo; を削除してもよろしいですか？
            <br />
            この操作は元に戻せません。
          </p>
        </Modal>
      )}

      {/* エッジ削除確認モーダル */}
      {selectedEdge && (
        <Modal
          title="エッジ削除の確認"
          open={deleteEdgeConfirmOpen}
          onOk={() => {
            if (onDeleteEdge) {
              onDeleteEdge(selectedEdge.id);
            }
            setDeleteEdgeConfirmOpen(false);
            onClose();
          }}
          onCancel={() => setDeleteEdgeConfirmOpen(false)}
          okText="削除"
          cancelText="キャンセル"
          okButtonProps={{ danger: true }}
        >
          <p>
            エッジ &ldquo;{selectedEdge.id}&rdquo; を削除してもよろしいですか？
            <br />
            この操作は元に戻せません。
          </p>
        </Modal>
      )}
    </div>
  );
};

export default PropertyPanel;