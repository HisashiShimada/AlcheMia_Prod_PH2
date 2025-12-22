'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col, message, Progress } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressStatus } from '@/types/experimentWorker';
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

  // トランジション名の選択肢を生成
  const transitionNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(transitions.map(t => t.transitionName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [transitions]);

  // フィルタリングされたトランジションデータ
  const filteredTransitions = useMemo(() => {
    return transitions.filter(transition => {
      // あいまい検索（全カラム対象）
      const matchesSearch = searchText === '' || 
        transition.transitionName.toLowerCase().includes(searchText.toLowerCase()) ||
        (transition.description && transition.description.toLowerCase().includes(searchText.toLowerCase()));
      
      // トランジション名フィルタ
      const matchesTransitionName = !selectedTransitionName || transition.transitionName === selectedTransitionName;
      
      return matchesSearch && matchesTransitionName;
    });
  }, [transitions, searchText, selectedTransitionName]);

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

  // ステータス表示用のヘルパー関数
  const getStatusDisplay = (status?: ProgressStatus) => {
    if (!status) {
      return <Text type="secondary">-</Text>;
    }

    const statusConfig = {
      not_started: { color: 'default', icon: <MinusCircleOutlined />, text: '未開始' },
      in_progress: { color: 'processing', icon: <ClockCircleOutlined />, text: '作業中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '完了' },
      on_hold: { color: 'warning', icon: <ExclamationCircleOutlined />, text: '保留中' },
      issue: { color: 'error', icon: <ExclamationCircleOutlined />, text: '問題あり' }
    };

    const config = statusConfig[status] || statusConfig.not_started;
    return (
      <Tag icon={config.icon} color={config.color} style={{ margin: 0 }}>
        {config.text}
      </Tag>
    );
  };

  // テーブルの列定義
  const columns: ColumnsType<Transition> = [
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
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: ProgressStatus | undefined) => getStatusDisplay(status)
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 150,
      align: 'center',
      render: (progressRate: number | undefined) => {
        if (progressRate === undefined || progressRate === null) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Progress
            percent={progressRate}
            size="small"
            strokeColor={{
              '0%': '#CF0027',
              '100%': '#E63946'
            }}
            format={(percent) => `${percent}%`}
          />
        );
      }
    },
    {
      title: '材料',
      key: 'materials',
      width: 100,
      align: 'center',
      render: (_, record: Transition) => {
        const input = record.inputMaterialsCount ?? 0;
        const total = record.totalMaterialsCount ?? 0;
        if (total === 0) {
          return <Text type="secondary">-</Text>;
        }
        const isComplete = input === total;
        return (
          <Text strong style={{ color: isComplete ? '#2e7d32' : '#757575' }}>
            {input}/{total}
          </Text>
        );
      }
    },
    {
      title: '条件',
      key: 'ingredients',
      width: 100,
      align: 'center',
      render: (_, record: Transition) => {
        const input = record.inputIngredientsCount ?? 0;
        const total = record.totalIngredientsCount ?? 0;
        if (total === 0) {
          return <Text type="secondary">-</Text>;
        }
        const isComplete = input === total;
        return (
          <Text strong style={{ color: isComplete ? '#2e7d32' : '#757575' }}>
            {input}/{total}
          </Text>
        );
      }
    },
    {
      title: '結果',
      key: 'results',
      width: 100,
      align: 'center',
      render: (_, record: Transition) => {
        const input = record.inputResultsCount ?? 0;
        const total = record.totalResultsCount ?? 0;
        if (total === 0) {
          return <Text type="secondary">-</Text>;
        }
        const isComplete = input === total;
        return (
          <Text strong style={{ color: isComplete ? '#2e7d32' : '#757575' }}>
            {input}/{total}
          </Text>
        );
      }
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
          <Col xs={24} sm={12} md={12}>
            <Input
              placeholder="トランジション名、説明で検索..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              aria-label="全カラム検索"
            />
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Select
              placeholder="トランジション名で絞り込み"
              style={{ width: '100%' }}
              value={selectedTransitionName}
              onChange={(value) => setSelectedTransitionName(value)}
              allowClear
              options={transitionNameOptions}
              aria-label="トランジション名で絞り込み"
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
          scroll={{ x: 1300, y: 'calc(100vh - 650px)' }}
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
