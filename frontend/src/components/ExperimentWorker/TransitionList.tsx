'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Transition, ExperimentDataValue } from '@/types/experimentWorker';
import DataRecordDialog from './DataRecordDialog';

const { Text } = Typography;

interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  onTaskCreated?: (taskId: string) => void;
}

/**
 * トランジション一覧表示コンポーネント
 * 選択されたメソッドに含まれるトランジションを一覧表示
 * トランジションクリック時に実験データ記録ダイアログを表示
 */
export default function TransitionList({
  transitions,
}: TransitionListProps) {
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTransitionName, setSelectedTransitionName] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // トランジション名の選択肢を生成
  const transitionNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(transitions.map(t => t.transitionName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [transitions]);

  // カテゴリの選択肢を生成
  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(transitions.map(t => t.category).filter(Boolean))
    ) as string[];
    return uniqueCategories.map(category => ({ label: category, value: category }));
  }, [transitions]);

  // フィルタリングされたトランジションデータ
  const filteredTransitions = useMemo(() => {
    return transitions.filter(transition => {
      // あいまい検索（全カラム対象）
      const matchesSearch = searchText === '' || 
        transition.transitionName.toLowerCase().includes(searchText.toLowerCase()) ||
        (transition.transitionId && transition.transitionId.toLowerCase().includes(searchText.toLowerCase())) ||
        (transition.category && transition.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (transition.description && transition.description.toLowerCase().includes(searchText.toLowerCase()));
      
      // トランジション名フィルタ
      const matchesTransitionName = !selectedTransitionName || transition.transitionName === selectedTransitionName;
      
      // カテゴリフィルタ
      const matchesCategory = !selectedCategory || transition.category === selectedCategory;
      
      return matchesSearch && matchesTransitionName && matchesCategory;
    });
  }, [transitions, searchText, selectedTransitionName, selectedCategory]);

  // トランジションをクリックしてダイアログを開く
  const handleTransitionClick = (transition: Transition) => {
    setSelectedTransition(transition);
    setDialogOpen(true);
  };

  // ダイアログを閉じる
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTransition(null);
  };

  // データ保存ハンドラ
  const handleDataSave = (data: ExperimentDataValue[]) => {
    console.log('保存されたデータ:', data);
    // TODO: バックエンドAPIへの保存処理を実装
    message.success('実験データを保存しました');
  };

  // テーブルの列定義
  const columns: ColumnsType<Transition> = [
    {
      title: 'No.',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <Text strong style={{ fontSize: '14px' }}>
          {index + 1}
        </Text>
      )
    },
    {
      title: 'トランジション名',
      dataIndex: 'transitionName',
      key: 'transitionName',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px', color: '#CF0027' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'トランジションID',
      dataIndex: 'transitionId',
      key: 'transitionId',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'カテゴリ',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      align: 'center',
      render: (category: string | undefined) => 
        category ? (
          <Tag color="blue" style={{ margin: 0 }}>
            {category}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string | undefined) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {text || '-'}
        </Text>
      )
    }
  ];

  return (
    <>
      <div>
        {/* 絞り込みUI */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="トランジション名、ID、カテゴリ..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              aria-label="全カラム検索"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="トランジション名"
              style={{ width: '100%' }}
              value={selectedTransitionName}
              onChange={(value) => setSelectedTransitionName(value)}
              allowClear
              options={transitionNameOptions}
              aria-label="トランジション名で絞り込み"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="カテゴリ"
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              allowClear
              options={categoryOptions}
              aria-label="カテゴリで絞り込み"
            />
          </Col>
        </Row>
        
        {/* テーブル */}
        <Table
          columns={columns}
          dataSource={filteredTransitions}
          rowKey="transitionId"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: false,
            showTotal: (total, range) => `全${total}件`,
            pageSizeOptions: ['10', '20', '50', '100'],
            position: ['bottomRight'],
            locale: {
              items_per_page: '件/ページ',
              jump_to: 'ページ',
              page: ''
            }
          }}
          scroll={{ x: 1200 }}
          size="middle"
          bordered
          aria-label="トランジション一覧"
          aria-describedby="transition-list-description"
          rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          style={{
            background: '#ffffff',
            borderRadius: '8px'
          }}
          className="transition-list-table"
          onRow={(record) => ({
            onClick: () => handleTransitionClick(record),
            style: { cursor: 'pointer' }
          })}
          locale={{
            emptyText: 'トランジションが登録されていません'
          }}
        />
      </div>

      {/* データ記録ダイアログ */}
      <DataRecordDialog
        open={dialogOpen}
        transition={selectedTransition}
        onClose={handleDialogClose}
        onSave={handleDataSave}
      />
    </>
  );
}
