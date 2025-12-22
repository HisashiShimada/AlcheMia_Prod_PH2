'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Space, Row, Col, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus } from '@/types/experimentWorker';
import FlowDiagramModal from './FlowDiagramModal';

const { Text } = Typography;

interface ProgressCheckTableProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: string) => void;
}

/**
 * 進捗確認テーブル
 * サブタスクのリストを表示する（折りたたみなし）
 */
export default function ProgressCheckTable({ tasks, onTaskAction }: ProgressCheckTableProps) {
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
  // フロー図モーダルの状態
  const [flowDiagramVisible, setFlowDiagramVisible] = useState<boolean>(false);
  const [selectedTaskForFlow, setSelectedTaskForFlow] = useState<Task | null>(null);
  
  // メソッド名の選択肢を生成
  const methodNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(tasks.map(task => task.methodName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [tasks]);
  
  // タスク名の選択肢を生成
  const taskNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(tasks.map(task => task.taskName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [tasks]);
  
  // ステータスの選択肢
  const statusOptions = [
    { label: '開始前', value: 'not_started' },
    { label: '開始', value: 'started' },
    { label: '作業中', value: 'in_progress' },
    { label: '完了', value: 'completed' },
    { label: '強制終了', value: 'forced_terminated' },
    { label: '中断', value: 'suspended' }
  ];
  
  // ステータスバッジの色とラベルを取得
  const getStatusConfig = (status: TaskStatus) => {
    const configs = {
      not_started: { color: 'default', label: '開始前' },
      started: { color: 'blue', label: '開始' },
      in_progress: { color: 'orange', label: '作業中' },
      completed: { color: 'green', label: '完了' },
      forced_terminated: { color: 'red', label: '強制終了' },
      suspended: { color: 'default', label: '中断' }
    };
    return configs[status] || { color: 'default', label: '不明' };
  };
  
  // フィルタリングされたタスクデータ
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // あいまい検索（全カラム対象）
      const matchesSearch = searchText === '' || 
        task.methodName.toLowerCase().includes(searchText.toLowerCase()) ||
        task.taskName.toLowerCase().includes(searchText.toLowerCase()) ||
        getStatusConfig(task.status).label.includes(searchText) ||
        task.progressRate.toString().includes(searchText);
      
      // メソッド名フィルタ
      const matchesMethodName = !selectedMethodName || task.methodName === selectedMethodName;
      
      // タスク名フィルタ
      const matchesTaskName = !selectedTaskName || task.taskName === selectedTaskName;
      
      // ステータスフィルタ
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      
      return matchesSearch && matchesMethodName && matchesTaskName && matchesStatus;
    });
  }, [tasks, searchText, selectedMethodName, selectedTaskName, selectedStatus]);

  // 進捗率クリック時のハンドラー
  const handleProgressRateClick = (task: Task) => {
    setSelectedTaskForFlow(task);
    setFlowDiagramVisible(true);
  };

  // フロー図モーダルを閉じる
  const handleFlowDiagramClose = () => {
    setFlowDiagramVisible(false);
    setSelectedTaskForFlow(null);
  };

  // テーブルの列定義
  const columns: ColumnsType<Task> = [
    {
      title: 'メソッドの名称',
      dataIndex: 'methodName',
      key: 'methodName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.methodName.localeCompare(b.methodName),
      render: (text: string) => (
        <Text style={{ fontSize: '14px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'タスクの名称',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.taskName.localeCompare(b.taskName),
      render: (text: string) => (
        <Text style={{ fontSize: '14px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: TaskStatus) => {
        const config = getStatusConfig(status);
        return (
          <Tag
            color={config.color}
            style={{ margin: 0 }}
            aria-label={`ステータス: ${config.label}`}
          >
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.progressRate - b.progressRate,
      render: (rate: number, record: Task) => (
        <Text
          strong
          style={{
            fontSize: '14px',
            color: '#0093CF',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => handleProgressRateClick(record)}
          aria-label={`進捗率 ${rate}% - クリックしてフロー図を表示`}
        >
          {rate}%
        </Text>
      )
    },
    {
      title: '開始',
      key: 'start',
      width: 80,
      align: 'center',
      render: (_, record: Task) => (
        <Button
          type="primary"
          size="small"
          onClick={() => onTaskAction(record.taskId, 'start')}
          disabled={record.status !== 'not_started'}
          aria-label="タスクを開始"
        >
          開始
        </Button>
      )
    },
    {
      title: '問題報告',
      key: 'issue',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <Button
          type="default"
          size="small"
          onClick={() => onTaskAction(record.taskId, 'issue')}
          aria-label="問題を報告"
        >
          報告
        </Button>
      )
    },
    {
      title: '実験記録',
      key: 'record',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <Button
          type="default"
          size="small"
          onClick={() => onTaskAction(record.taskId, 'record')}
          aria-label="実験記録を入力"
        >
          記録
        </Button>
      )
    },
    {
      title: '強制終了',
      key: 'forceTerminate',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <Button
          danger
          size="small"
          onClick={() => onTaskAction(record.taskId, 'forceTerminate')}
          disabled={record.status === 'completed' || record.status === 'forced_terminated'}
          aria-label="タスクを強制終了"
        >
          終了
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* 絞り込みUI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="検索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            aria-label="全カラム検索"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="メソッド名"
            style={{ width: '100%' }}
            value={selectedMethodName}
            onChange={(value) => setSelectedMethodName(value)}
            allowClear
            options={methodNameOptions}
            aria-label="メソッド名で絞り込み"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="タスク名"
            style={{ width: '100%' }}
            value={selectedTaskName}
            onChange={(value) => setSelectedTaskName(value)}
            allowClear
            options={taskNameOptions}
            aria-label="タスク名で絞り込み"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="ステータス"
            style={{ width: '100%' }}
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value as TaskStatus)}
            allowClear
            options={statusOptions}
            aria-label="ステータスで絞り込み"
          />
        </Col>
      </Row>
      
      {/* テーブル */}
      <Table
        columns={columns}
        dataSource={filteredTasks}
        rowKey="taskId"
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
        scroll={{ x: 1300 }}
        size="middle"
        bordered
        aria-label="サブタスク一覧"
        aria-describedby="progress-check-description"
        style={{
          background: '#ffffff',
          borderRadius: '8px'
        }}
      />
      
      {/* フロー図モーダル */}
      {selectedTaskForFlow && (
        <FlowDiagramModal
          visible={flowDiagramVisible}
          onClose={handleFlowDiagramClose}
          methodName={selectedTaskForFlow.methodName}
        />
      )}
    </div>
  );
}
