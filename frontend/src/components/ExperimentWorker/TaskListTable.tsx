'use client';

import React, { useMemo, useState } from 'react';
import { Table, Tag, Typography, Button, Input, Select, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus, ProjectStatus, isEditableStatus } from '@/types/experimentWorker';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * ステータスバッジの色とラベルを取得
 */
function getStatusConfig(status: TaskStatus) {
  const configs = {
    not_started: { color: 'default', label: '開始前' },
    started: { color: 'blue', label: '開始' },
    in_progress: { color: 'orange', label: '作業中' },
    completed: { color: 'green', label: '完了' },
    forced_terminated: { color: 'red', label: '強制終了' },
    suspended: { color: 'default', label: '中断' }
  };
  return configs[status] || { color: 'default', label: '不明' };
}

interface TaskListTableProps {
  tasks: Task[];
  selectedMethodId: string | null;
  projectStatus: ProjectStatus | null;
  onTaskAction: (taskId: string, action: string) => void;
  onProgressRateClick: (task: Task) => void;
}

/**
 * タスク一覧テーブル
 * 選択されたメソッドに紐づくタスクを一覧表示
 */
export default function TaskListTable({ 
  tasks, 
  selectedMethodId,
  projectStatus,
  onTaskAction,
  onProgressRateClick
}: TaskListTableProps) {
  const { t } = useLanguage();
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
  // ステータスの選択肢
  const statusOptions = [
    { label: '開始前', value: 'not_started' },
    { label: '開始', value: 'started' },
    { label: '作業中', value: 'in_progress' },
    { label: '完了', value: 'completed' },
    { label: '強制終了', value: 'forced_terminated' },
    { label: '中断', value: 'suspended' }
  ];
  
  // 絞り込み条件を適用（tasksは既にメソッドでフィルタリング済み）
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // ステータスバッジの色とラベルを取得
      const getStatusLabel = (status: TaskStatus): string => {
        const configs = {
          not_started: '開始前',
          started: '開始',
          in_progress: '作業中',
          completed: '完了',
          forced_terminated: '強制終了',
          suspended: '中断'
        };
        return configs[status] || '不明';
      };
      
      // あいまい検索
      const matchesSearch = searchText === '' || 
        task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
        getStatusLabel(task.status).includes(searchText) ||
        task.progressRate.toString().includes(searchText);
      
      // ステータスフィルタ
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchText, selectedStatus]);
  
  // テーブルの列定義
  const columns: ColumnsType<Task> = useMemo(() => {
    const baseColumns: ColumnsType<Task> = [
      {
        title: 'タスクNo',
        dataIndex: 'taskNo',
        key: 'taskNo',
        width: 95,
        ellipsis: true,
        sorter: (a, b) => a.taskNo.localeCompare(b.taskNo),
        render: (text: string) => (
          <Text style={{ fontSize: '14px' }}>{text}</Text>
        )
      },
      {
        title: 'ステータス',
        dataIndex: 'status',
        key: 'status',
        width: 95,
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
        width: 75,
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
            onClick={() => onProgressRateClick(record)}
            aria-label={`進捗率 ${rate}% - クリックしてフロー図を表示`}
          >
            {rate}%
          </Text>
        )
      }
    ];

    const buttonColumns: ColumnsType<Task> = [
      {
        title: '指示確認',
        key: 'instruction',
        width: 85,
        align: 'center',
        render: (_, record: Task) => (
          <Button
            type="default"
            size="small"
            onClick={() => onTaskAction(record.taskId, 'instruction')}
            aria-label="作業指示を確認"
          >
            指示
          </Button>
        )
      },
      {
        title: '開始',
        key: 'start',
        width: 65,
        align: 'center',
        render: (_, record: Task) => {
          const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;
          const isDisabled = record.status !== 'not_started' || !isProjectEditable;
          
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => onTaskAction(record.taskId, 'start')}
              disabled={isDisabled}
              aria-label="タスクを開始"
            >
              開始
            </Button>
          );
        }
      },
      {
        title: t('experimentWork.progressCheck.issueCheck'),
        key: 'issue',
        width: 65,
        align: 'center',
        render: (_, record: Task) => (
          <Button
            type="default"
            size="small"
            onClick={() => onTaskAction(record.taskId, 'issueCheck')}
            aria-label={t('experimentWork.progressCheck.issueCheck')}
          >
            {t('experimentWork.progressCheck.checkButton')}
          </Button>
        )
      },
      {
        title: '実験記録',
        key: 'record',
        width: 85,
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
        width: 85,
        align: 'center',
        render: (_, record: Task) => {
          const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;
          const isDisabled = 
            record.status === 'completed' || 
            record.status === 'forced_terminated' || 
            !isProjectEditable;
          
          return (
            <Button
              danger
              size="small"
              onClick={() => onTaskAction(record.taskId, 'forceTerminate')}
              disabled={isDisabled}
              aria-label="タスクを強制終了"
            >
              終了
            </Button>
          );
        }
      }
    ];

    return [...baseColumns, ...buttonColumns];
  }, [projectStatus, t, onTaskAction, onProgressRateClick]);
  
  return (
    <div>
      {/* 絞り込みUI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Input
            placeholder="タスク名、ステータス、進捗率で検索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            aria-label="タスク一覧検索"
          />
        </Col>
        <Col xs={24} sm={12}>
          <Select
            placeholder="ステータス"
            style={{ width: '100%' }}
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value as TaskStatus)}
            allowClear
            options={statusOptions}
            aria-label="タスクステータスで絞り込み"
          />
        </Col>
      </Row>
      
      {/* タスク一覧テーブル */}
      <Table
      columns={columns}
      dataSource={filteredTasks}
      rowKey="taskId"
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: false,
        showTotal: (total) => `全${total}件`,
        pageSizeOptions: ['10', '20', '50', '100'],
        position: ['bottomRight'],
        locale: {
          items_per_page: '件/ページ',
          jump_to: 'ページ',
          page: ''
        }
      }}
      scroll={{ x: 750 }}
      size="middle"
      bordered
      aria-label="タスク一覧"
      style={{
        background: '#ffffff',
        borderRadius: '8px'
      }}
      locale={{
        emptyText: 'タスクがありません'
      }}
      />
    </div>
  );
}
