/**
 * MultiObjectEditor.tsx - 複数オブジェクト編集コンポーネント
 * 
 * Creator、Vendor、Owner、Instrumentなどの複数登録・編集機能を提供
 * - 追加/削除/並び替え機能
 * - UUID自動生成
 * - 参照プロパティ対応
 * 
 * @version 2.0.0 (TypeScript + Ant Design)
 * @date 2026-02-02
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Collapse,
  Alert,
  Tag,
  Space,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { DocumentTagData, Reference } from '@/types/maiml-unified';

const { TextArea } = Input;

interface SingleObjectEditorProps {
  index: number;
  objectData: DocumentTagData;
  objectKey: 'creators' | 'vendors' | 'owners' | 'instruments';
  includeReferences?: boolean;
  onUpdate: (index: number, property: string, value: string | Reference | null, type?: string) => void;
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

interface MultiObjectEditorProps {
  objectKey: 'creators' | 'vendors' | 'owners' | 'instruments';
  title: string;
  icon: React.ReactNode;
  includeReferences?: boolean;
  initialData: DocumentTagData[];
  onDataChange: (key: 'creators' | 'vendors' | 'owners' | 'instruments', data: DocumentTagData[]) => void;
  minItems?: number;
  isExpanded: boolean;
  onToggleExpanded: (key: string) => void;
  vendorIds?: string[];
  instrumentIds?: string[];
  masterData: DocumentTagData[],
}

// ========================================
// SingleObjectEditor Component
// ========================================

const SingleObjectEditor: React.FC<SingleObjectEditorProps> = ({
  index,
  objectData,
  objectKey,
  includeReferences = false,
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
  instrumentIds = [],
}) => {
  const [internalData, setInternalData] = useState<DocumentTagData>(objectData);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 親からの初期データ同期（Ref使用で変更検出）
  const prevObjectDataRef = useRef<string>('');
  useEffect(() => {
    const currentData = JSON.stringify(objectData);
    if (prevObjectDataRef.current !== currentData) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setInternalData(objectData);
      prevObjectDataRef.current = currentData;
    }
  }, [objectData]);

  // 遅延更新機能（500ms debounce）
  const handleInternalUpdate = useCallback((property: string, value: string) => {
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
  const generateReferenceId = useCallback((refType: 'vendorRef' | 'instrumentRef') => {
    const existingRefs = internalData[refType] ? 1 : 0;
    const basePrefix = refType === 'vendorRef' ? 'vendorRef' : 'instrumentRef';
    const nextNumber = existingRefs + 1;
    return `${basePrefix}_${nextNumber}`;
  }, [internalData]);

  // 参照プロパティ用の遅延更新
  const handleReferenceUpdate = useCallback((
    refKey: 'vendorRef' | 'instrumentRef',
    property: 'id' | 'ref',
    value: string
  ) => {
    if (!value || value.trim() === '') {
      setInternalData(prev => {
        const newData = { ...prev };
        if (newData[refKey]) {
          // プロパティを削除するのではなく、undefinedを設定
          const updatedRef : Reference= { ...newData[refKey] };
          if (property === 'id') {
            updatedRef.id = '';
          } else {
            updatedRef.ref = '';
          }
          
          // 両方undefinedなら、refKeyごと削除
          if (!updatedRef.id && !updatedRef.ref) {
            const { [refKey]: _, ...rest } = newData;
            return rest;
          }
          
          newData[refKey] = updatedRef;
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
        ...(prev[refKey] || { id: '', ref: '' }),
        [property]: value
      }
    }));

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      const updatedRef: Reference = {
        ...(internalData[refKey] || { id: '', ref: '' }),
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
  const shouldShowReference = useCallback((refKey: 'vendorRef' | 'instrumentRef') => {
    return internalData[refKey] && (internalData[refKey]?.id || internalData[refKey]?.ref);
  }, [internalData]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // パネルヘッダー
  const panelHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
      <Space>
        <Typography.Text strong>#{index + 1}</Typography.Text>
        {internalData.name && (
          <Tag>{internalData.name}</Tag>
        )}
        {internalData.id && (
          <Tag color="blue">ID: {internalData.id}</Tag>
        )}
      </Space>
      <Space onClick={(e) => e.stopPropagation()}>
        <Button
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
          size="small"
          icon={<DeleteOutlined />}
          danger
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('この要素を削除しますか？')) {
              onDelete(index);
            }
          }}
          disabled={!canDelete}
          title="削除"
        />
      </Space>
    </div>
  );

  const singlePanelContent = (
    <div>
      {/* マスタから追加された項目のAlert */}
      {internalData.fromMaster && (
        <Alert
          title={objectKey === 'owners' ? '📌 ユーザーから追加された項目' : '📌 マスタデータから追加された項目'}
          description={
            objectKey === 'owners'
              ? 'ID・UUID・名前はユーザー情報から自動設定されており変更できません。Description・Annotationは編集可能です。'
              : 'この項目はマスタデータから追加されたため、編集できません。'
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <div>
            <Typography.Text type="secondary">ID</Typography.Text>
            <Input
              value={internalData.id || ''}
              onChange={(e) => handleInternalUpdate('id', e.target.value)}
              size="small"
              style={{ marginTop: 4 }}
              disabled={internalData.fromMaster}
            />
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div>
            <Typography.Text type="secondary">UUID</Typography.Text>
            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
              <Input
                value={internalData.uuid || ''}
                onChange={(e) => handleInternalUpdate('uuid', e.target.value)}
                size="small"
                disabled={internalData.fromMaster}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleUUIDGenerate}
                size="small"
                title="Generate UUID"
                disabled={internalData.fromMaster}
              />
            </Space.Compact>
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div>
            <Typography.Text type="secondary">Name</Typography.Text>
            <Input
              value={internalData.name || ''}
              onChange={(e) => handleInternalUpdate('name', e.target.value)}
              size="small"
              style={{ marginTop: 4 }}
              disabled={internalData.fromMaster}
            />
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div>
            <Typography.Text type="secondary">Description</Typography.Text>
            <Input
              value={internalData.description || ''}
              onChange={(e) => handleInternalUpdate('description', e.target.value)}
              size="small"
              style={{ marginTop: 4 }}
              disabled={internalData.fromMaster && objectKey !== 'owners'}
            />
          </div>
        </Col>

        <Col xs={24}>
          <div>
            <Typography.Text type="secondary">Annotation</Typography.Text>
            <TextArea
              value={internalData.annotation || ''}
              onChange={(e) => handleInternalUpdate('annotation', e.target.value)}
              rows={2}
              size="small"
              style={{ marginTop: 4 }}
              disabled={internalData.fromMaster && objectKey !== 'owners'}
            />
          </div>
        </Col>

        {includeReferences && (
          <>
            <Col xs={24}>
              <Typography.Text strong>📋 References</Typography.Text>
            </Col>

            {shouldShowReference('vendorRef') ? (
              <>
                <Col xs={24} sm={12}>
                  <div>
                    <Typography.Text type="secondary">Vendor Reference ID</Typography.Text>
                    <Input
                      value={internalData.vendorRef?.id || ''}
                      onChange={(e) => handleReferenceUpdate('vendorRef', 'id', e.target.value)}
                      size="small"
                      placeholder="vendorRef_example"
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div>
                    <Typography.Text type="secondary">Vendor Reference Target</Typography.Text>
                    <Select
                      value={internalData.vendorRef?.ref || undefined}
                      onChange={(value) => handleReferenceUpdate('vendorRef', 'ref', value)}
                      size="small"
                      style={{ width: '100%', marginTop: 4 }}
                      placeholder="Select vendor"
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
                  </div>
                </Col>
              </>
            ) : (
              <Col xs={24}>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleReferenceUpdate('vendorRef', 'id', generateReferenceId('vendorRef'))}
                  size="small"
                  block
                >
                  Vendor Reference を追加
                </Button>
              </Col>
            )}

            {shouldShowReference('instrumentRef') ? (
              <>
                <Col xs={24} sm={12}>
                  <div>
                    <Typography.Text type="secondary">Instrument Reference ID</Typography.Text>
                    <Input
                      value={internalData.instrumentRef?.id || ''}
                      onChange={(e) => handleReferenceUpdate('instrumentRef', 'id', e.target.value)}
                      size="small"
                      placeholder="instrumentRef_example"
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div>
                    <Typography.Text type="secondary">Instrument Reference Target</Typography.Text>
                    <Select
                      value={internalData.instrumentRef?.ref || undefined}
                      onChange={(value) => handleReferenceUpdate('instrumentRef', 'ref', value)}
                      size="small"
                      style={{ width: '100%', marginTop: 4 }}
                      placeholder="Select instrument"
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
                  </div>
                </Col>
              </>
            ) : (
              <Col xs={24}>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleReferenceUpdate('instrumentRef', 'id', generateReferenceId('instrumentRef'))}
                  size="small"
                  block
                >
                  Instrument Reference を追加
                </Button>
              </Col>
            )}
          </>
        )}
      </Row>
    </div>
  );

  return (
    <Collapse
      activeKey={isExpanded ? ['1'] : []}
      onChange={() => onToggleExpanded(index)}
      style={{ marginBottom: 8 }}
      items={[{ key: '1', label: panelHeader, children: singlePanelContent }]}
    />
  );
};

// ========================================
// MultiObjectEditor Main Component
// ========================================

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
}) => {
  const [objects, setObjects] = useState<DocumentTagData[]>(initialData);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [selectedMasterId, setSelectedMasterId] = useState<string | undefined>(undefined);

  // 親からの初期データ同期（Ref使用で変更検出）
  const prevInitialDataRef = useRef<string>('');
  useEffect(() => {
    const currentData = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentData) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setObjects(initialData);
      // 最初のアイテムを展開
      if (initialData.length > 0 && Object.keys(expandedItems).length === 0) {
        setExpandedItems({ 0: true });
      }
      prevInitialDataRef.current = currentData;
    }
  }, [initialData, expandedItems]);

  // マスタデータから追加
  const handleAddFromMaster = useCallback(() => {
    if (!selectedMasterId) return;
    
    const masterItem = masterData.find(m => m.id === selectedMasterId);
    if (!masterItem) return;
    
    const newObject: DocumentTagData = {
      tagName: objectKey === 'creators' ? 'Creator' : objectKey === 'vendors' ? 'Vendor' : objectKey === 'owners' ? 'Owner' : 'Instrument',
      id: masterItem.id,
      uuid: masterItem.uuid || '',
      name: masterItem.name || '',
      description: masterItem.description || '',
      annotation: masterItem.annotation || '',
      fromMaster: true  // マスタから追加されたことをマーク
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
  const handleAdd = useCallback(() => {
    // 既存IDの末尾数値の最大値を取得し、次の連番を算出（削除後の重複防止）
    const existingNumbers = objects.map(obj => {
      const match = obj.id?.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    const newObject: DocumentTagData = {
      tagName: objectKey === 'creators' ? 'Creator' : objectKey === 'vendors' ? 'Vendor' : objectKey === 'owners' ? 'Owner' : 'Instrument',
      id: `${objectKey}${nextNumber}`,
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
  }, [objects, objectKey, onDataChange]);

  // オブジェクト削除
  const handleDelete = useCallback((index: number) => {
    const newObjects = objects.filter((_, i) => i !== index);
    setObjects(newObjects);
    onDataChange(objectKey, newObjects);
  }, [objects, objectKey, onDataChange]);

  // オブジェクト更新
  const handleUpdate = useCallback((index: number, property: string, value: string | Reference | null, type: string = 'simple') => {
    const newObjects = [...objects];
    
    if (type === 'reference_delete') {
      if (newObjects[index][property as keyof DocumentTagData]) {
        delete newObjects[index][property as keyof DocumentTagData];
      }
    } else if (type === 'reference') {
      newObjects[index] = {
        ...newObjects[index],
        [property]: value
      };
    } else {
      newObjects[index] = {
        ...newObjects[index],
        [property]: value
      };
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

  // パネルヘッダー
  const panelHeader = (
    <Space>
      <span>{icon}</span>
      <Typography.Text strong>{title}</Typography.Text>
      <Tag color={objects.length >= minItems ? 'success' : 'error'}>
        {objects.length}件
      </Tag>
      {objects.length < minItems && (
        <Tag color="warning">最低{minItems}件必要</Tag>
      )}
    </Space>
  );

  const multiPanelContent = (
    <div>
      {/* マスタデータから追加 */}
      {masterData.length > 0 && (
        <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
          <Typography.Text type="secondary">
            マスタデータから{title}を追加:
          </Typography.Text>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ flex: 1 }}
              placeholder={`${title}を選択してください`}
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
          style={{ marginBottom: 16 }}
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
          canDelete={objects.length > minItems}
          isExpanded={expandedItems[index] || false}
          onToggleExpanded={handleToggleItem}
          vendorIds={vendorIds}
          instrumentIds={instrumentIds}
        />
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        block
        style={{ marginTop: 16 }}
      >
        空の{title}を追加
      </Button>
    </div>
  );

  return (
    <Collapse
      activeKey={isExpanded ? ['1'] : []}
      onChange={() => onToggleExpanded(objectKey)}
      items={[{ key: '1', label: panelHeader, children: multiPanelContent }]}
    />
  );
};

export default MultiObjectEditor;
export type { DocumentTagData, Reference, MultiObjectEditorProps };