/**
 * PropertyPanel - ノードプロパティ編集パネル
 * 
 * ノード選択時に表示される右側パネル
 * Material-UI → Ant Design v6 変換版
 * 
 * @version 2.0.0
 * @date 2025-12-23
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
  Space
} from 'antd';
import { X, Trash2 } from 'lucide-react';
import { Node, Edge } from 'reactflow';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * Method型定義
 */
interface Method {
  name?: string;
  nodes: Node[];
  edges?: Edge[];
}

/**
 * PropertyPanelのProps型定義
 */
export interface PropertyPanelProps {
  /** 選択されたノード */
  selectedNode: Node | null;
  /** 選択されたエッジ */
  selectedEdge: Edge | null;
  /** ノード更新ハンドラー */
  onUpdate: (nodeId: string, data: any) => void;
  /** エッジ更新ハンドラー */
  onUpdateEdge?: (oldEdgeId: string, newEdgeId: string) => void;
  /** パネルクローズハンドラー */
  onClose: () => void;
  /** テンプレートエディタオープンハンドラー */
  onOpenTemplateEditor: (node: Node) => void;
  /** ノード削除ハンドラー */
  onDelete?: (nodeId: string) => void;
  /** エッジ削除ハンドラー */
  onDeleteEdge?: (edgeId: string) => void;
  /** 全ノードリスト */
  nodes: Node[];
  /** 全エッジリスト */
  edges: Edge[];
  /** 全Method情報 */
  methods?: Method[];
  /** アクティブなMethodインデックス */
  activeMethodIndex?: number;
}

/**
 * テンプレート情報型
 */
interface TemplateInfo {
  id: string;
  name: string;
  methodIndex?: number;
  methodName?: string;
}

/**
 * PropertyPanelコンポーネント
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
  nodes,
  edges,
  methods,
  activeMethodIndex
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteEdgeConfirmOpen, setDeleteEdgeConfirmOpen] = useState(false);
  
  // ノード・エッジの判定
  const isPlace = selectedNode?.data?.nodeType === 'place';
  const placeType = selectedNode?.data?.placeType || 'material';
  const isEdge = !!selectedEdge && !selectedNode;
  
  // 利用可能なテンプレート一覧（同一method内）
  const availableTemplatesForInheritance = useMemo((): TemplateInfo[] => {
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
    
    console.log('🔍 [PropertyPanel] テンプレート継承用:', templates.length, templates);
    return templates;
  }, [nodes, isPlace, placeType, selectedNode]);
  
  // 共通テンプレート一覧（全methodから）
  const availableCommonTemplates = useMemo((): TemplateInfo[] => {
    if (!selectedNode || !isPlace || !methods || methods.length <= 1) return [];
    
    console.log('🔍 [PropertyPanel] 共通テンプレート検索開始');
    
    const commonTemplates: TemplateInfo[] = [];
    
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
    
    console.log('✅ [PropertyPanel] 共通テンプレート:', commonTemplates.length, commonTemplates);
    return commonTemplates;
  }, [methods, isPlace, placeType, selectedNode]);
  
  // パネル非表示条件
  if (!selectedNode && !selectedEdge) return null;
  
  /**
   * ノードデータ更新ハンドラー
   */
  const handleChange = (field: string, value: any) => {
    if (!selectedNode) return;
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      [field]: value,
    });
  };
  
  /**
   * 削除ボタンクリックハンドラー
   */
  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };
  
  /**
   * 削除確認ハンドラー
   */
  const handleDeleteConfirm = () => {
    if (onDelete && selectedNode) {
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
    
    const updatedData = {
      ...selectedNode.data,
      templateRef: href ? { href } : null,
    };
    
    // 既存のtemplateにもhrefを追加
    if (updatedData.template) {
      updatedData.template = {
        ...updatedData.template,
        href: href || null,
      };
    }
    // templateがない場合は新規作成
    else if (href) {
      const templateType = placeType === 'material' ? 'MaterialTemplate' :
                           placeType === 'condition' ? 'ConditionTemplate' :
                           'ResultTemplate';
      
      updatedData.template = {
        type: templateType,
        href: href,
        properties: [],
      };
    }
    
    console.log('✅ [PropertyPanel] 更新後データ:', updatedData);
    onUpdate(selectedNode.id, updatedData);
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: 350,
        height: '100%',
        backgroundColor: '#ffffff',
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
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1890ff',
          color: '#ffffff',
        }}
      >
        <Typography.Title level={5} style={{ margin: 0, color: '#ffffff' }}>
          {isEdge ? 'Arc プロパティ' :
           isPlace ? 'Place プロパティ' : 'Transition プロパティ'}
        </Typography.Title>
        <Button
          type="text"
          shape="circle"
          size="small"
          icon={<X size={16} color="#ffffff" />}
          onClick={onClose}
          style={{ color: '#ffffff' }}
        />
      </div>

      {/* プロパティ編集エリア */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* エッジ選択時のUI */}
        {isEdge && selectedEdge && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* エッジタイプ表示 */}
            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                要素タイプ
              </Text>
              <div>
                <Text strong>Arc (エッジ)</Text>
              </div>
            </div>

            <Divider style={{ margin: 0 }} />

            {/* Arc ID（編集可能） */}
            <div>
              <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                Arc ID
              </Text>
              <Input
                value={selectedEdge.id || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  console.log('🔗 [PropertyPanel] Arc ID変更:', newId);
                  if (onUpdateEdge) {
                    onUpdateEdge(selectedEdge.id, newId);
                  }
                }}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                Arc IDを編集できます（重複チェックは保存時に行われます）
              </Text>
            </div>

            {/* Source/Target情報 */}
            <div>
              <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
                接続情報
              </Text>
              <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Source:</Text>
                  <Text strong style={{ fontSize: '12px' }}>{selectedEdge.source}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Target:</Text>
                  <Text strong style={{ fontSize: '12px' }}>{selectedEdge.target}</Text>
                </div>
              </div>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                Source/Targetは変更できません
              </Text>
            </div>

            {/* エッジ削除ボタン */}
            <Divider style={{ margin: 0 }} />
            <div>
              <Button
                danger
                icon={<Trash2 size={16} />}
                onClick={() => setDeleteEdgeConfirmOpen(true)}
                block
              >
                エッジを削除
              </Button>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                このエッジを完全に削除します
              </Text>
            </div>

            {/* デバッグ情報 */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: 16, padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px', fontSize: '11px' }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                  デバッグ情報:
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Edge ID: {selectedEdge.id}
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Source: {selectedEdge.source}
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Target: {selectedEdge.target}
                </Text>
              </div>
            )}
          </Space>
        )}

        {/* ノード選択時のUI */}
        {selectedNode && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* ノードタイプ表示 */}
            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ノードタイプ
              </Text>
              <div>
                <Text strong>
                  {isPlace ? `${placeType.charAt(0).toUpperCase() + placeType.slice(1)} Place` : 'Transition'}
                </Text>
              </div>
            </div>

            <Divider style={{ margin: 0 }} />

            {/* ID（読み取り専用） */}
            <div>
              <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                ID
              </Text>
              <Input
                value={selectedNode.data.id || ''}
                disabled
                size="small"
              />
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                ID は自動生成され、変更できません
              </Text>
            </div>

            {/* 名前 */}
            <div>
              <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                名前
              </Text>
              <Input
                value={selectedNode.data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                size="small"
                placeholder={`${placeType} の名前を入力`}
              />
            </div>

            {/* 説明 */}
            <div>
              <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                説明
              </Text>
              <TextArea
                value={selectedNode.data.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                size="small"
                placeholder="ノードの説明を入力"
              />
            </div>

            <Divider style={{ margin: 0 }} />

            {/* 共通テンプレートフラグ（Placeのみ） */}
            {isPlace && (
              <div>
                <Checkbox
                  checked={selectedNode.data.isCommonTemplate || false}
                  onChange={(e) => handleChange('isCommonTemplate', e.target.checked)}
                >
                  共通テンプレート（全methodで共有）
                </Checkbox>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginLeft: 24, marginTop: 4 }}>
                  チェックすると、このテンプレートを他のmethodからも参照できます
                </Text>
              </div>
            )}

            {/* テンプレート継承（同一method内） */}
            {isPlace && availableTemplatesForInheritance.length > 0 && (
              <div>
                <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                  テンプレート継承
                </Text>
                <Select
                  value={selectedNode.data.templateRef?.href || ''}
                  onChange={handleTemplateRefChange}
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="なし（独立テンプレート）"
                >
                  <Select.Option value="">
                    <em>なし（独立テンプレート）</em>
                  </Select.Option>
                  {availableTemplatesForInheritance.map((tmpl) => (
                    <Select.Option key={tmpl.id} value={`#${tmpl.id}`}>
                      {tmpl.name}
                    </Select.Option>
                  ))}
                </Select>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                  同一method内のテンプレートからプロパティを継承
                </Text>
              </div>
            )}

            {/* 共通テンプレート参照（全methodから） */}
            {isPlace && availableCommonTemplates.length > 0 && (
              <div>
                <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                  共通テンプレート参照
                </Text>
                <Select
                  value={selectedNode.data.commonTemplateRef || ''}
                  onChange={(value) => {
                    console.log('🔗 [PropertyPanel] 共通テンプレート参照変更:', value);
                    handleChange('commonTemplateRef', value || null);
                  }}
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="なし"
                >
                  <Select.Option value="">
                    <em>なし</em>
                  </Select.Option>
                  {availableCommonTemplates.map((tmpl) => (
                    <Select.Option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} (from {tmpl.methodName})
                    </Select.Option>
                  ))}
                </Select>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                  共通テンプレートへのplaceRef参照を追加
                </Text>
                {process.env.NODE_ENV === 'development' && (
                  <Text type="danger" style={{ fontSize: '10px', display: 'block', marginTop: 4 }}>
                    DEBUG: commonTemplateRef = "{selectedNode.data.commonTemplateRef || '(empty)'}"
                    <br />
                    Available: [{availableCommonTemplates.map(t => t.id).join(', ')}]
                  </Text>
                )}
              </div>
            )}

            {/* テンプレート情報（Placeのみ） */}
            {isPlace && (
              <div>
                <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
                  テンプレート情報
                </Text>
                <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>種類:</Text>
                    <Text strong style={{ fontSize: '12px' }}>
                      {placeType === 'material' ? 'Material Template' :
                       placeType === 'condition' ? 'Condition Template' :
                       'Result Template'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>プロパティ数:</Text>
                    <Text strong style={{ fontSize: '12px' }}>
                      {selectedNode.data.templateRef?.properties?.length || 0}件
                    </Text>
                  </div>
                  {selectedNode.data.templateRef?.properties && selectedNode.data.templateRef.properties.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                        登録済みプロパティ:
                      </Text>
                      {selectedNode.data.templateRef.properties.slice(0, 3).map((prop: any, index: number) => (
                        <Text key={index} style={{ fontSize: '11px', display: 'block', paddingLeft: 8 }}>
                          • {prop.name}: {prop.value || '(値なし)'}{prop.unit ? ` ${prop.unit}` : ''}
                        </Text>
                      ))}
                      {selectedNode.data.templateRef.properties.length > 3 && (
                        <Text type="secondary" style={{ fontSize: '11px', display: 'block', paddingLeft: 8, marginTop: 4 }}>
                          他 {selectedNode.data.templateRef.properties.length - 3}件
                        </Text>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  block
                  onClick={() => onOpenTemplateEditor(selectedNode)}
                >
                  テンプレート編集
                </Button>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                  プロパティの追加・編集・削除
                </Text>
              </div>
            )}

            {/* ノード削除ボタン */}
            <Divider style={{ margin: 0 }} />
            <div>
              <Button
                danger
                icon={<Trash2 size={16} />}
                onClick={handleDeleteClick}
                block
              >
                ノードを削除
              </Button>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                このノードを完全に削除します
              </Text>
            </div>

            {/* デバッグ情報 */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: 16, padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px', fontSize: '11px' }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                  デバッグ情報:
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Node ID: {selectedNode.id}
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Type: {selectedNode.type}
                </Text>
                <Text style={{ fontSize: '11px', display: 'block' }}>
                  Position: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </Text>
              </div>
            )}
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
            ノード "{selectedNode.data.name || selectedNode.id}" を削除してもよろしいですか？
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
            エッジ "{selectedEdge.id}" を削除してもよろしいですか？
            <br />
            この操作は元に戻せません。
          </p>
        </Modal>
      )}
    </div>
  );
};

export default PropertyPanel;
