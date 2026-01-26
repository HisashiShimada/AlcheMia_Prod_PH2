/**
 * MultiObjectEditor - 複数オブジェクト編集コンポーネント
 * 
 * Creator、Vendor、Owner、Instrumentなどの複数登録・編集機能を提供
 * - 追加/削除/並び替え機能
 * - UUID自動生成
 * - 参照プロパティ対応
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Space,
  Typography,
  Collapse,
  Alert,
  Tag,
  Select,
  Modal,
  Row,
  Col,
  theme
} from 'antd';
import {
  DownOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

/**
 * オブジェクトデータの型定義
 */
export interface ObjectData {
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  fromMaster?: boolean;  // マスタデータから追加されたかどうか
  vendorRef?: {
    id: string;
    ref: string;
  };
  instrumentRef?: {
    id: string;
    ref: string;
  };
}

/**
 * 単一オブジェクト編集コンポーネントのProps
 */
interface SingleObjectEditorProps {
  index: number;
  objectData: ObjectData;
  objectKey: string;
  includeReferences: boolean;
  onUpdate: (index: number, property: string, value: any, type?: string) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  isExpanded: boolean;
  onToggleExpanded: (index: number) => void;
  vendorIds?: string[];
  instrumentIds?: string[];
}

/**
 * 単一オブジェクト編集コンポーネント
 */
const SingleObjectEditor: React.FC<SingleObjectEditorProps> = ({
  index,
  objectData,
  objectKey,
  includeReferences,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
  isExpanded,
  onToggleExpanded,
  vendorIds = [],
  instrumentIds = []
}) => {
  const { token } = theme.useToken();
  const [internalData, setInternalData] = useState<ObjectData>(objectData);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 親からの初期データ同期
  useEffect(() => {
    setInternalData(objectData);
  }, [JSON.stringify(objectData)]);

  // 遅延更新機能
  const handleInternalUpdate = useCallback((property: string, value: any) => {
    setInternalData(prev => ({
      ...prev,
      [property]: value
    }));

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(index, property, value);
    }, 500);
  }, [index, onUpdate]);

  // Reference ID連番生成
  const generateReferenceId = useCallback((refType: string) => {
    const existingRefs = internalData[refType as keyof ObjectData] ? 1 : 0;
    const basePrefix = refType === 'vendorRef' ? 'vendorRef' : 'instrumentRef';
    const nextNumber = existingRefs + 1;
    return `${basePrefix}_${nextNumber}`;
  }, [internalData]);

  // 参照プロパティ用の遅延更新
  const handleReferenceUpdate = useCallback((refKey: string, property: string, value: string) => {
    if (!value || value.trim() === '') {
      setInternalData(prev => {
        const newData = { ...prev };
        const refData = newData[refKey as keyof ObjectData] as any;
        if (refData) {
          delete refData[property];
          
          if (!refData.id && !refData.ref) {
            delete (newData as any)[refKey];
          }
        }
        return newData;
      });

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        onUpdate(index, refKey, null, 'reference_delete');
      }, 500);
      
      return;
    }

    setInternalData(prev => ({
      ...prev,
      [refKey]: {
        ...(prev[refKey as keyof ObjectData] as any),
        [property]: value
      }
    }));

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      const refData = internalData[refKey as keyof ObjectData] as any;
      const updatedRef = {
        ...refData,
        [property]: value
      };
      onUpdate(index, refKey, updatedRef, 'reference');
    }, 500);
  }, [index, onUpdate, internalData]);

  // UUID生成処理
  const handleUUIDGenerate = useCallback(() => {
    const newUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    handleInternalUpdate('uuid', newUUID);
  }, [handleInternalUpdate]);

  // 参照プロパティ表示判定
  const shouldShowReference = useCallback((refKey: string) => {
    const refData = internalData[refKey as keyof ObjectData] as any;
    return refData && (refData.id || refData.ref);
  }, [internalData]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const panelHeader = (
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space>
        <Text strong>#{index + 1}</Text>
        {internalData.name && <Tag color="blue">{internalData.name}</Tag>}
        {internalData.id && <Tag>{`ID: ${internalData.id}`}</Tag>}
      </Space>
      <Space size="small" onClick={(e) => e.stopPropagation()}>
        <Button
          type="text"
          size="small"
          icon={<ArrowUpOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={!canMoveUp}
          title="上に移動"
        />
        <Button
          type="text"
          size="small"
          icon={<ArrowDownOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(index);
          }}
          disabled={!canMoveDown}
          title="下に移動"
        />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            Modal.confirm({
              title: '削除確認',
              content: 'この要素を削除しますか？',
              okText: '削除',
              okType: 'danger',
              cancelText: 'キャンセル',
              onOk: () => onDelete(index)
            });
          }}
          disabled={!canDelete}
          title="削除"
        />
      </Space>
    </Space>
  );

  return (
    <Collapse
      activeKey={isExpanded ? ['1'] : []}
      onChange={() => onToggleExpanded(index)}
      style={{ marginBottom: 8 }}
      items={[
        {
          key: '1',
          label: panelHeader,
          children: (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {internalData.fromMaster && (
            <Alert
              title="📌 マスタデータから追加された項目"
              description="この項目はマスタデータから追加されたため、編集できません。"
              type="info"
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">ID</Text>
              <Input
                value={internalData.id || ''}
                onChange={(e) => handleInternalUpdate('id', e.target.value)}
                size="small"
                disabled={internalData.fromMaster}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary">UUID</Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={internalData.uuid || ''}
                  onChange={(e) => handleInternalUpdate('uuid', e.target.value)}
                  size="small"
                  disabled={internalData.fromMaster}
                />
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={handleUUIDGenerate}
                  size="small"
                  title="UUID生成"
                  disabled={internalData.fromMaster}
                />
              </Space.Compact>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">Name</Text>
              <Input
                value={internalData.name || ''}
                onChange={(e) => handleInternalUpdate('name', e.target.value)}
                size="small"
                disabled={internalData.fromMaster}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary">Description</Text>
              <Input
                value={internalData.description || ''}
                onChange={(e) => handleInternalUpdate('description', e.target.value)}
                size="small"
                disabled={internalData.fromMaster}
              />
            </Col>
          </Row>

          <div>
            <Text type="secondary">Annotation</Text>
            <TextArea
              value={internalData.annotation || ''}
              onChange={(e) => handleInternalUpdate('annotation', e.target.value)}
              rows={2}
              size="small"
              disabled={internalData.fromMaster}
            />
          </div>

          {includeReferences && (
            <>
              <Text strong style={{ display: 'block', marginTop: 8 }}>
                📋 References
              </Text>

              {shouldShowReference('vendorRef') ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Vendor Reference ID</Text>
                    <Input
                      value={internalData.vendorRef?.id || ''}
                      onChange={(e) => handleReferenceUpdate('vendorRef', 'id', e.target.value)}
                      size="small"
                      placeholder="vendorRef_example"
                    />
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Vendor Reference Target</Text>
                    <Select
                      style={{ width: '100%' }}
                      value={internalData.vendorRef?.ref || undefined}
                      onChange={(value) => handleReferenceUpdate('vendorRef', 'ref', value)}
                      size="small"
                      placeholder="選択してください"
                    >
                      {vendorIds.length > 0 ? (
                        vendorIds.map((vendorId) => (
                          <Select.Option key={vendorId} value={vendorId}>
                            {vendorId}
                          </Select.Option>
                        ))
                      ) : (
                        <Select.Option value="" disabled>
                          No vendors registered
                        </Select.Option>
                      )}
                    </Select>
                  </Col>
                </Row>
              ) : (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleReferenceUpdate('vendorRef', 'id', generateReferenceId('vendorRef'))}
                  size="small"
                  block
                >
                  Vendor Reference を追加
                </Button>
              )}

              {shouldShowReference('instrumentRef') ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Instrument Reference ID</Text>
                    <Input
                      value={internalData.instrumentRef?.id || ''}
                      onChange={(e) => handleReferenceUpdate('instrumentRef', 'id', e.target.value)}
                      size="small"
                      placeholder="instrumentRef_example"
                    />
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Instrument Reference Target</Text>
                    <Select
                      style={{ width: '100%' }}
                      value={internalData.instrumentRef?.ref || undefined}
                      onChange={(value) => handleReferenceUpdate('instrumentRef', 'ref', value)}
                      size="small"
                      placeholder="選択してください"
                    >
                      {instrumentIds.length > 0 ? (
                        instrumentIds.map((instrumentId) => (
                          <Select.Option key={instrumentId} value={instrumentId}>
                            {instrumentId}
                          </Select.Option>
                        ))
                      ) : (
                        <Select.Option value="" disabled>
                          No instruments registered
                        </Select.Option>
                      )}
                    </Select>
                  </Col>
                </Row>
              ) : (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleReferenceUpdate('instrumentRef', 'id', generateReferenceId('instrumentRef'))}
                  size="small"
                  block
                >
                  Instrument Reference を追加
                </Button>
              )}
            </>
          )}
            </Space>
          )
        }
      ]}
    />
  );
};

/**
 * マスタデータアイテムの型定義
 */
export interface MasterDataItem {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  annotation?: string;
}

/**
 * 複数オブジェクト編集メインコンポーネントのProps
 */
export interface MultiObjectEditorProps {
  objectKey: string;
  title: string;
  icon: string;
  includeReferences?: boolean;
  initialData?: ObjectData[];
  onDataChange: (objectKey: string, objects: ObjectData[]) => void;
  minItems?: number;
  isExpanded: boolean;
  onToggleExpanded: (objectKey: string) => void;
  vendorIds?: string[];
  instrumentIds?: string[];
  masterData?: MasterDataItem[];  // マスタデータ（ドロップダウン用）
  isLoadingMasterData?: boolean;  // マスタデータ読み込み中フラグ
}

/**
 * 複数オブジェクト編集メインコンポーネント
 */
const MultiObjectEditor: React.FC<MultiObjectEditorProps> = ({
  objectKey,
  title,
  icon,
  includeReferences = false,
  initialData = [],
  onDataChange,
  minItems = 1,
  isExpanded,
  onToggleExpanded,
  vendorIds = [],
  instrumentIds = [],
  masterData = [],
  isLoadingMasterData = false
}) => {
  const { token } = theme.useToken();
  const [objects, setObjects] = useState<ObjectData[]>(initialData);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [selectedMasterId, setSelectedMasterId] = useState<string | undefined>(undefined);

  // 親からの初期データ同期
  useEffect(() => {
    setObjects(initialData);
    // 最初のアイテムを展開
    if (initialData.length > 0 && Object.keys(expandedItems).length === 0) {
      setExpandedItems({ 0: true });
    }
  }, [JSON.stringify(initialData)]);

  // マスタデータから追加
  const handleAddFromMaster = useCallback(() => {
    if (!selectedMasterId) return;
    
    const masterItem = masterData.find(m => m.id === selectedMasterId);
    if (!masterItem) return;
    
    const newObject: ObjectData = {
      id: masterItem.id,
      uuid: masterItem.uuid || '',  // マスタのUUIDをそのまま使用（なければ空）
      name: masterItem.name,
      description: masterItem.description || '',
      annotation: masterItem.annotation || '',
      fromMaster: true  // マスタデータから追加されたことをマーク
    };
    
    const newObjects = [...objects, newObject];
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
    
    // 新しいアイテムを展開
    setExpandedItems(prev => ({
      ...prev,
      [objects.length]: true
    }));
    
    // 選択をリセット
    setSelectedMasterId(undefined);
  }, [selectedMasterId, masterData, objects, objectKey, onDataChange]);

  // 空のオブジェクト追加
  const handleAddEmpty = useCallback(() => {
    const newObject: ObjectData = {
      id: `${title}${objects.length + 1}`,
      uuid: '',
      name: '',
      description: '',
      annotation: ''
    };
    
    const newObjects = [...objects, newObject];
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
    
    // 新しいアイテムを展開
    setExpandedItems(prev => ({
      ...prev,
      [objects.length]: true
    }));
  }, [objects, objectKey, title, onDataChange]);

  // オブジェクト削除
  const handleDelete = useCallback((index: number) => {
    const newObjects = objects.filter((_, i) => i !== index);
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
  }, [objects, objectKey, onDataChange]);

  // オブジェクト更新
  const handleUpdate = useCallback((index: number, property: string, value: any, type: string = 'simple') => {
    const newObjects = [...objects];
    
    if (type === 'reference_delete') {
      if ((newObjects[index] as any)[property]) {
        delete (newObjects[index] as any)[property];
      }
    } else if (type === 'reference') {
      (newObjects[index] as any)[property] = value;
    } else {
      (newObjects[index] as any)[property] = value;
    }
    
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
  }, [objects, objectKey, onDataChange]);

  // 上に移動
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    
    const newObjects = [...objects];
    [newObjects[index - 1], newObjects[index]] = [newObjects[index], newObjects[index - 1]];
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
  }, [objects, objectKey, onDataChange]);

  // 下に移動
  const handleMoveDown = useCallback((index: number) => {
    if (index === objects.length - 1) return;
    
    const newObjects = [...objects];
    [newObjects[index], newObjects[index + 1]] = [newObjects[index + 1], newObjects[index]];
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
  }, [objects, objectKey, onDataChange]);

  // アイテム展開切り替え
  const handleToggleItem = useCallback((index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const panelHeader = (
    <Space>
      <span>{icon}</span>
      <Text strong>{title}</Text>
      <Tag color={objects.length >= minItems ? 'success' : 'error'}>
        {`${objects.length}件`}
      </Tag>
      {objects.length < minItems && (
        <Tag color="warning">{`最低${minItems}件必要`}</Tag>
      )}
    </Space>
  );

  return (
    <Collapse
      activeKey={isExpanded ? ['1'] : []}
      onChange={() => onToggleExpanded(objectKey)}
      style={{ marginTop: 16 }}
      items={[
        {
          key: '1',
          label: panelHeader,
          children: (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* マスタデータから追加（最上部に配置） */}
          {masterData.length > 0 && (
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">マスタデータから{title}を追加:</Text>
              <Space.Compact style={{ width: '100%' }}>
                <Select
                  style={{ flex: 1 }}
                  placeholder={`${title}を選択してください`}
                  loading={isLoadingMasterData}
                  value={selectedMasterId}
                  onChange={setSelectedMasterId}
                  options={masterData.map(item => ({
                    label: `${item.name}${item.description ? ` (${item.description})` : ''}`,
                    value: item.id,
                  }))}
                  allowClear
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddFromMaster}
                  disabled={!selectedMasterId}
                >
                  追加
                </Button>
              </Space.Compact>
            </Space>
          )}

          {objects.length === 0 && (
            <Alert
              title={`${title}が登録されていません。最低${minItems}件必要です。`}
              type="warning"
              showIcon
            />
          )}
          
          {objects.map((obj, index) => (
            <SingleObjectEditor
              key={`${objectKey}-${index}`}
              index={index}
              objectData={obj}
              objectKey={objectKey}
              includeReferences={includeReferences}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < objects.length - 1}
              canDelete={true}
              isExpanded={expandedItems[index] || false}
              onToggleExpanded={handleToggleItem}
              vendorIds={vendorIds}
              instrumentIds={instrumentIds}
            />
          ))}
          
          {/* 空のオブジェクトを追加 */}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddEmpty}
            block
          >
            空の{title}を追加
          </Button>
            </Space>
          )
        }
      ]}
    />
  );
};

export default MultiObjectEditor;
