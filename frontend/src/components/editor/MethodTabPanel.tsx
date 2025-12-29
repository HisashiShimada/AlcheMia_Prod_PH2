/**
 * MethodTabPanel - 複数method切り替えタブUI
 * 
 * Material-UI → Ant Design v6 変換版
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState } from 'react';
import { Tabs, Tag, Button, Tooltip, Modal, Input, Space } from 'antd';
import { Plus, Edit2, X } from 'lucide-react';
import { Node } from 'reactflow';

/**
 * Method型定義
 */
export interface Method {
  methodId: string;
  name?: string;
  nodes: Node[];
}

/**
 * MethodTabPanelのProps型定義
 */
export interface MethodTabPanelProps {
  /** methodデータ配列 */
  methods: Method[];
  /** 現在アクティブなmethodのindex */
  activeMethodIndex: number;
  /** 現在編集中のノード配列（リアルタイム更新用） */
  currentNodes: Node[];
  /** タブ切り替え時のコールバック */
  onChange: (index: number) => void;
  /** Method追加時のコールバック */
  onAddMethod: () => void;
  /** MethodID編集時のコールバック */
  onEditMethodId: (index: number, newMethodId: string) => void;
  /** Method削除時のコールバック */
  onDeleteMethod: (index: number) => void;
}

/**
 * MethodTabPanelコンポーネント
 */
const MethodTabPanel: React.FC<MethodTabPanelProps> = ({
  methods,
  activeMethodIndex,
  currentNodes,
  onChange,
  onAddMethod,
  onEditMethodId,
  onDeleteMethod
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMethodIndex, setEditingMethodIndex] = useState<number | null>(null);
  const [newMethodId, setNewMethodId] = useState('');
  const [idError, setIdError] = useState('');

  /**
   * タブ切り替えハンドラー
   */
  const handleChange = (activeKey: string) => {
    const index = parseInt(activeKey, 10);
    onChange(index);
  };

  /**
   * Method追加ハンドラー
   */
  const handleAddMethod = () => {
    onAddMethod();
  };

  /**
   * Method ID編集ダイアログオープン
   */
  const handleOpenEditDialog = (index: number, event: React.MouseEvent) => {
    event.stopPropagation(); // タブ切り替えを防止
    setEditingMethodIndex(index);
    setNewMethodId(methods[index].methodId);
    setIdError('');
    setEditDialogOpen(true);
  };

  /**
   * Method ID編集ダイアログクローズ
   */
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingMethodIndex(null);
    setNewMethodId('');
    setIdError('');
  };

  /**
   * Method ID保存
   */
  const handleSaveMethodId = () => {
    // バリデーション
    if (!newMethodId || newMethodId.trim() === '') {
      setIdError('Method IDは必須です');
      return;
    }

    // ユニーク性チェック
    const isDuplicate = methods.some((m, idx) => 
      idx !== editingMethodIndex && m.methodId === newMethodId
    );

    if (isDuplicate) {
      setIdError('このMethod IDは既に使用されています');
      return;
    }

    // 保存
    if (editingMethodIndex !== null) {
      onEditMethodId(editingMethodIndex, newMethodId);
    }

    handleCloseEditDialog();
  };

  /**
   * Method削除ハンドラー
   */
  const handleDeleteMethod = (index: number, event: React.MouseEvent) => {
    event.stopPropagation(); // タブ切り替えを防止
    
    const method = methods[index];
    
    // アクティブなタブの場合は現在のノード数を使用、それ以外はmethod.nodesを使用
    const nodeCount = index === activeMethodIndex 
      ? (currentNodes?.length || 0) 
      : (method.nodes?.length || 0);
    
    // 0 nodeの場合のみ削除可能
    if (nodeCount > 0) {
      Modal.warning({
        title: 'Method削除不可',
        content: `このMethodには${nodeCount}個のノードが含まれています。削除するには、まずすべてのノードを削除してください。`,
      });
      return;
    }
    
    // 最後の1つは削除不可
    if (methods.length === 1) {
      Modal.warning({
        title: 'Method削除不可',
        content: '最後のMethodは削除できません。',
      });
      return;
    }
    
    // 確認ダイアログ
    Modal.confirm({
      title: 'Method削除の確認',
      content: `Method "${method.methodId}" を削除しますか？`,
      okText: '削除',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        onDeleteMethod(index);
      },
    });
  };

  // methodsが空の場合は「Add Method」ボタンのみ表示
  if (!methods || methods.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#ffffff',
        }}
      >
        <Tooltip title="Add new method">
          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={<Plus size={16} />}
            onClick={handleAddMethod}
          />
        </Tooltip>
      </div>
    );
  }

  // Tabsのアイテムを生成
  const tabItems = methods.map((method, index) => {
    // アクティブなタブは現在のノード数を使用、それ以外はmethod.nodesを使用
    const nodeCount = index === activeMethodIndex 
      ? (currentNodes?.length || 0) 
      : (method.nodes?.length || 0);
    
    return {
      key: String(index),
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{method.methodId}</span>
          <Tag
            color={index === activeMethodIndex ? 'blue' : 'default'}
            style={{ margin: 0, fontSize: '11px' }}
          >
            {nodeCount} nodes
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<Edit2 size={12} />}
            onClick={(e) => handleOpenEditDialog(index, e)}
            style={{ padding: '0 4px', height: 20, minWidth: 20 }}
          />
          {nodeCount === 0 && methods.length > 1 && (
            <Button
              type="text"
              size="small"
              danger
              icon={<X size={12} />}
              onClick={(e) => handleDeleteMethod(index, e)}
              style={{ padding: '0 4px', height: 20, minWidth: 20 }}
            />
          )}
        </div>
      ),
    };
  });

  return (
    <>
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ flex: 1 }}>
          <Tabs
            activeKey={String(activeMethodIndex)}
            onChange={handleChange}
            type="card"
            size="small"
            items={tabItems}
            tabBarStyle={{
              margin: 0,
              border: 'none',
            }}
          />
        </div>
        
        {/* Add Method Button */}
        <div
          style={{
            padding: '0 8px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Tooltip title="Add new method">
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<Plus size={16} />}
              onClick={handleAddMethod}
            />
          </Tooltip>
        </div>
      </div>

      {/* Method ID編集モーダル */}
      <Modal
        title="Method ID編集"
        open={editDialogOpen}
        onOk={handleSaveMethodId}
        onCancel={handleCloseEditDialog}
        okText="保存"
        cancelText="キャンセル"
        width={480}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}>
              <label>Method ID</label>
            </div>
            <Input
              autoFocus
              value={newMethodId}
              onChange={(e) => {
                setNewMethodId(e.target.value);
                setIdError('');
              }}
              status={idError ? 'error' : ''}
              placeholder="Method IDを入力"
            />
            {idError ? (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: 4 }}>
                {idError}
              </div>
            ) : (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: 4 }}>
                MaiMLファイル内で一意のIDを指定してください
              </div>
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default MethodTabPanel;
