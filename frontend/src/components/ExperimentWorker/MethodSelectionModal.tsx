'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Typography, Space, Button, theme, Input, Select, Row, Col } from 'antd';
import { ToolOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { projectsData } from '@/data/projectsData';

const { Text } = Typography;

/**
 * メソッド選択モーダルのProps
 */
interface MethodSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  onMethodChange: (methodId: string | null) => void;
}

/**
 * テーブルデータの型定義
 */
interface MethodTableData {
  key: string;
  methodId: string;
  methodName: string;
  description: string;
  owner: string;
  isCurrentlySelected: boolean;
}

/**
 * メソッド選択モーダルコンポーネント
 * プロジェクトに紐づくメソッドをテーブル形式で選択するためのモーダル
 */
export default function MethodSelectionModal({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  onMethodChange,
}: MethodSelectionModalProps) {
  const { token } = theme.useToken();
  const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);
  
  // フィルター状態
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
  const [selectedOwner, setSelectedOwner] = useState<string | undefined>(undefined);

  // ダイアログが開かれた時に現在の選択状態とフィルターをリセット
  useEffect(() => {
    if (open) {
      setTempMethodId(selectedMethodId);
      setSearchText('');
      setSelectedMethodName(undefined);
      setSelectedOwner(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 選択されたプロジェクトのメソッド一覧を取得
  const methods = useMemo(() => {
    if (!selectedProject) return [];
    const project = projectsData[selectedProject];
    return project?.methods || [];
  }, [selectedProject]);

  // プロジェクト情報を取得（所有者情報用）
  const projectInfo = useMemo(() => {
    if (!selectedProject) return null;
    return projectsData[selectedProject];
  }, [selectedProject]);

  // テーブルデータの作成
  const allTableData: MethodTableData[] = useMemo(() => {
    const owner = projectInfo?.workAssignment?.assignedBy?.userName || '不明';
    
    return methods.map((method) => ({
      key: method.methodId,
      methodId: method.methodId,
      methodName: method.methodName,
      description: method.description || '',
      owner,
      isCurrentlySelected: selectedMethodId === method.methodId,
    }));
  }, [methods, projectInfo, selectedMethodId]);

  // メソッド名の選択肢
  const methodNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTableData.map(item => item.methodName)));
    return uniqueNames.sort().map(name => ({ label: name, value: name }));
  }, [allTableData]);

  // 所有者の選択肢
  const ownerOptions = useMemo(() => {
    const uniqueOwners = Array.from(new Set(allTableData.map(item => item.owner)));
    return uniqueOwners.sort().map(owner => ({ label: owner, value: owner }));
  }, [allTableData]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    return allTableData.filter(item => {
      // あいまい検索（メソッド名、説明）
      const matchesSearch = !searchText || 
        item.methodName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase());
      
      // メソッド名フィルター
      const matchesMethodName = !selectedMethodName || item.methodName === selectedMethodName;
      
      // 所有者フィルター
      const matchesOwner = !selectedOwner || item.owner === selectedOwner;
      
      return matchesSearch && matchesMethodName && matchesOwner;
    });
  }, [allTableData, searchText, selectedMethodName, selectedOwner]);

  // テーブルカラムの定義
  const columns: ColumnsType<MethodTableData> = [
    {
      title: 'メソッド名',
      dataIndex: 'methodName',
      key: 'methodName',
      width: 200,
      sorter: (a, b) => a.methodName.localeCompare(b.methodName),
      render: (text: string) => (
        <Space>
          <ToolOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary">{text || '-'}</Text>
      ),
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      width: 150,
      sorter: (a, b) => a.owner.localeCompare(b.owner),
      render: (text: string) => (
        <Text>{text}</Text>
      ),
    },
  ];

  // 決定ボタンの処理
  const handleOk = () => {
    onMethodChange(tempMethodId);
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempMethodId(selectedMethodId);
    onClose();
  };

  // 選択解除ボタンの処理
  const handleClearSelection = () => {
    setTempMethodId(null);
  };

  // 行選択の設定
  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: tempMethodId ? [tempMethodId] : [],
    onChange: (selectedRowKeys: React.Key[]) => {
      setTempMethodId((selectedRowKeys[0] as string) || null);
    },
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={900}
      title={
        <Space>
          <ToolOutlined style={{ color: token.colorPrimary }} />
          <Text strong>メソッド選択</Text>
        </Space>
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={handleClearSelection}
            disabled={!tempMethodId}
            data-testid="method-selection-clear-button"
          >
            選択解除
          </Button>
          <Space>
            <Button onClick={handleCancel} data-testid="method-selection-cancel-button">
              キャンセル
            </Button>
            <Button
              type="primary"
              onClick={handleOk}
              icon={<CheckOutlined />}
              data-testid="method-selection-ok-button"
            >
              決定
            </Button>
          </Space>
        </Space>
      }
      data-testid="method-selection-modal"
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* フィルタリングコントロール */}
        <Row gutter={16}>
          <Col flex="400px">
            <Input
              placeholder="メソッド名、説明で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              data-testid="method-selection-search-input"
            />
          </Col>
          <Col flex="150px">
            <Select
              placeholder="メソッド名"
              value={selectedMethodName}
              onChange={setSelectedMethodName}
              allowClear
              style={{ width: '100%' }}
              options={methodNameOptions}
              data-testid="method-selection-method-name-filter"
            />
          </Col>
          <Col flex="150px">
            <Select
              placeholder="所有者"
              value={selectedOwner}
              onChange={setSelectedOwner}
              allowClear
              style={{ width: '100%' }}
              options={ownerOptions}
              data-testid="method-selection-owner-filter"
            />
          </Col>
        </Row>

        {/* テーブル */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
            pageSizeOptions: ['20', '50', '100'],
            showQuickJumper: true,
          }}
          scroll={{ y: 350 }}
          size="middle"
          locale={{
            emptyText: 'メソッドがありません',
          }}
          data-testid="method-selection-table"
        />
      </Space>
    </Modal>
  );
}
