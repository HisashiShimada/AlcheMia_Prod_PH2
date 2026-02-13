/**
 * MethodTabPanel - 複数method切り替えタブUI（EditorV2用）
 * 
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState } from 'react';
import { Tabs, Tag, Button, Tooltip, Modal, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import type { Node } from 'reactflow';
import type { MethodData } from '../../../types/editor';

/**
 * MethodTabPanelProps - MethodTabPanelコンポーネントのProps型定義
 */
export interface MethodTabPanelProps {
  // methodデータ配列
  methods: MethodData[];
  
  // 現在アクティブなmethodのindex
  activeMethodIndex: number;
  
  // 現在編集中のノード配列（リアルタイム更新用）
  currentNodes?: Node[];
  
  // タブ切り替え時のコールバック
  onChange?: (index: number) => void;
  
  // Method追加時のコールバック
  onAddMethod?: () => void;
  
  // MethodID編集時のコールバック
  onEditMethodId?: (index: number, newMethodId: string) => void;
  
  // Method削除時のコールバック
  onDeleteMethod?: (index: number) => void;
}

/**
 * MethodTabPanel - Method切り替えタブUI
 */
const MethodTabPanel: React.FC<MethodTabPanelProps> = ({
  methods,
  activeMethodIndex,
  currentNodes,
  onChange,
  onAddMethod,
  onEditMethodId,
  onDeleteMethod,
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
    if (onChange) {
      onChange(index);
    }
  };

  /**
   * Method追加ハンドラー
   */
  const handleAddMethod = () => {
    if (onAddMethod) {
      onAddMethod();
    }
  };

  /**
   * Method ID編集ダイアログを開く
   */
  const handleOpenEditDialog = (index: number, event: React.MouseEvent) => {
    event.stopPropagation(); // タブ切り替えを防止
    setEditingMethodIndex(index);
    setNewMethodId(methods[index].methodId);
    setIdError('');
    setEditDialogOpen(true);
  };

  /**
   * 編集ダイアログを閉じる
   */
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingMethodIndex(null);
    setNewMethodId('');
    setIdError('');
  };

  /**
   * Method ID保存ハンドラー
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
    if (onEditMethodId && editingMethodIndex !== null) {
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
      message.warning(`このMethodには${nodeCount}個のノードが含まれています。削除するには、まずすべてのノードを削除してください。`);
      return;
    }
    
    // 最後の1つは削除不可
    if (methods.length === 1) {
      message.warning('最後のMethodは削除できません。');
      return;
    }
    
    // 確認ダイアログ
    Modal.confirm({
      title: 'Method削除',
      content: `Method "${method.methodId}" を削除しますか？`,
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      onOk: () => {
        if (onDeleteMethod) {
          onDeleteMethod(index);
        }
      },
    });
  };

  // methodsが空の場合は「Add Method」ボタンのみ表示
  if (!methods || methods.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
      }}>
        <Tooltip title="Add new method">
          <Button 
            type="text"
            icon={<PlusOutlined />}
            onClick={handleAddMethod}
          />
        </Tooltip>
      </div>
    );
  }

  // タブアイテムの生成
  const tabItems = methods.map((method, index) => {
    // アクティブなタブは現在のノード数を使用、それ以外はmethod.nodesを使用
    const nodeCount = index === activeMethodIndex 
      ? (currentNodes?.length || 0) 
      : (method.nodes?.length || 0);
    
    return {
      key: String(index),
      label: (
        <Space size={4}>
          <span>{method.methodId}</span>
          <Tag 
            color={index === activeMethodIndex ? 'blue' : 'default'}
            style={{ fontSize: 11, lineHeight: '16px' }}
          >
            {nodeCount} nodes
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ fontSize: 12 }} />}
            onClick={(e) => handleOpenEditDialog(index, e)}
            style={{ padding: '0 4px', height: 20 }}
          />
          {nodeCount === 0 && methods.length > 1 && (
            <Button
              type="text"
              size="small"
              danger
              icon={<CloseOutlined style={{ fontSize: 12 }} />}
              onClick={(e) => handleDeleteMethod(index, e)}
              style={{ padding: '0 4px', height: 20 }}
            />
          )}
        </Space>
      ),
    };
  });

  return (
    <>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <Tabs
          activeKey={String(activeMethodIndex)}
          onChange={handleChange}
          type="card"
          size="small"
          style={{ flex: 1, margin: 0 }}
          items={tabItems}
        />
        
        {/* Add Method Button */}
        <div style={{ 
          padding: '0 8px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fff',
        }}>
          <Tooltip title="Add new method">
            <Button 
              type="text"
              icon={<PlusOutlined />}
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
      >
        <Input
          autoFocus
          placeholder="Method ID"
          value={newMethodId}
          onChange={(e) => {
            setNewMethodId(e.target.value);
            setIdError('');
          }}
          status={idError ? 'error' : ''}
        />
        {idError && (
          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
            {idError}
          </div>
        )}
        {!idError && (
          <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
            MaiMLファイル内で一意のIDを指定してください
          </div>
        )}
      </Modal>
    </>
  );
};

export default MethodTabPanel;