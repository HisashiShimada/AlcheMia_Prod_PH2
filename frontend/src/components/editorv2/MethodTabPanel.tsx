/**
 * MethodTabPanel - 複数method切り替えタブUI（EditorV2用）
 * 
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState } from 'react';
import { Tabs, Tag, Button, Tooltip, Modal, Input, Space, Flex, message } from 'antd';
import { PlusOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import type { Node } from 'reactflow';
import type { MethodData } from '../../types/editor';
import { useLanguage } from '@/contexts/LanguageContext';

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
  
  // MethodID・name編集時のコールバック
  onEditMethodId?: (index: number, newMethodId: string, newName: string) => void;
  
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
  const { t } = useLanguage();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMethodIndex, setEditingMethodIndex] = useState<number | null>(null);
  const [newMethodId, setNewMethodId] = useState('');
  const [newMethodName, setNewMethodName] = useState('');
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
    setNewMethodName(methods[index].name || '');
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
    setNewMethodName('');
    setIdError('');
  };

  /**
   * Method ID保存ハンドラー
   */
  const handleSaveMethodId = () => {
    // バリデーション
    if (!newMethodId || newMethodId.trim() === '') {
      setIdError(t('editor.method.idRequired'));
      return;
    }

    // ユニーク性チェック
    const isDuplicate = methods.some((m, idx) => 
      idx !== editingMethodIndex && m.methodId === newMethodId
    );

    if (isDuplicate) {
      setIdError(t('editor.method.idDuplicate'));
      return;
    }

    // 保存
    if (onEditMethodId && editingMethodIndex !== null) {
      onEditMethodId(editingMethodIndex, newMethodId, newMethodName);
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
      message.warning(`${t('editor.method.deleteHasNodes1')}${nodeCount}${t('editor.method.deleteHasNodes2')}`);
      return;
    }
    
    // 最後の1つは削除不可
    if (methods.length === 1) {
      message.warning(t('editor.method.deleteLastMethod'));
      return;
    }
    
    // 確認ダイアログ
    Modal.confirm({
      title: t('editor.method.deleteTitle'),
      content: `${t('editor.method.deleteConfirm1')} "${method.methodId}" ${t('editor.method.deleteConfirm2')}`,
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
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

      {/* Method 編集モーダル */}
      <Modal
        title={t('editor.method.editTitle')}
        open={editDialogOpen}
        onOk={handleSaveMethodId}
        onCancel={handleCloseEditDialog}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Flex vertical gap="middle">
          {/* Method ID */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Method ID
            </div>
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
                {t('editor.method.idHint')}
              </div>
            )}
          </div>

          {/* Method Name */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {t('editor.method.nameLabel')}
            </div>
            <Input
              placeholder={t('editor.method.namePlaceholder')}
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
            />
            <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
              {t('editor.method.nameHint')}
            </div>
          </div>
        </Flex>
      </Modal>
    </>
  );
};

export default MethodTabPanel;