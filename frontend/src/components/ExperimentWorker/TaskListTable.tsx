'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Space, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus } from '@/types/experimentWorker';
import TaskActionButtons from './TaskActionButtons';

const { Text } = Typography;

interface TaskListTableProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: string) => void;
}

/**
 * タスク一覧テーブル
 * タスクのリストをテーブル形式で表示する
 */
export default function TaskListTable({ tasks, onTaskAction }: TaskListTableProps) {
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
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
        task.taskName.toLowerCase().includes(searchText.toLowerCase()) ||
        getStatusConfig(task.status).label.includes(searchText) ||
        task.progressRate.toString().includes(searchText);
      
      // タスク名フィルタ
      const matchesTaskName = !selectedTaskName || task.taskName === selectedTaskName;
      
      // ステータスフィルタ
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      
      return matchesSearch && matchesTaskName && matchesStatus;
    });
  }, [tasks, searchText, selectedTaskName, selectedStatus]);

  // テーブルの列定義
  const columns: ColumnsType<Task> = [
    {
      title: 'タスク名',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px' }}>
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
      render: (rate: number) => (
        <Text strong style={{ fontSize: '14px', color: '#0093CF' }}>
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
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="start"
        />
      )
    },
    {
      title: '結果記録',
      key: 'record',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="record"
        />
      )
    },
    {
      title: '進捗報告',
      key: 'progress',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="progress"
        />
      )
    },
    {
      title: '終了',
      key: 'complete',
      width: 80,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="complete"
        />
      )
    }
  ];

  return (
    <div>
      {/* 絞り込みUI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="タスク名、ステータス、進捗率..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            aria-label="全カラム検索"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
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
        <Col xs={24} sm={12} md={8}>
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
      scroll={{ x: 1200 }}
      size="middle"
      bordered
      aria-label="タスク一覧"
      aria-describedby="task-list-description"
      rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
      style={{
        background: '#ffffff',
        borderRadius: '8px'
      }}
      // カスタムスタイリング
      className="task-list-table"
      />
    </div>
  );
}
