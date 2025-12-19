'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Space, Row, Col, Button } from 'antd';
import { SearchOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus } from '@/types/experimentWorker';
import TaskActionButtons from './TaskActionButtons';

const { Text } = Typography;

interface TaskListTableProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: string) => void;
}

/**
 * グループヘッダー行の型定義
 */
interface GroupHeader {
  isGroupHeader: true;
  methodName: string;
  taskCount: number;
  key: string;
}

/**
 * タスク行の型定義
 */
interface TaskRow extends Task {
  isGroupHeader: false;
  key: string;
}

/**
 * テーブル行の型（グループヘッダーまたはタスク行）
 */
type TableRow = GroupHeader | TaskRow;

/**
 * タスク一覧テーブル
 * タスクのリストをメソッド名でグループ化して表示する
 * グループヘッダーをクリックすると展開/折りたたみ可能
 */
export default function TaskListTable({ tasks, onTaskAction }: TaskListTableProps) {
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
  // 折りたたみ状態管理（メソッド名ごと）
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  
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

  // メソッド名でグループ化し、グループヘッダーとタスク行を生成
  const tableData = useMemo(() => {
    // メソッド名でグループ化
    const groupedByMethod = filteredTasks.reduce((acc, task) => {
      if (!acc[task.methodName]) {
        acc[task.methodName] = [];
      }
      acc[task.methodName].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    // テーブル行を生成（グループヘッダー + タスク行）
    const rows: TableRow[] = [];
    
    Object.entries(groupedByMethod).forEach(([methodName, methodTasks]) => {
      // グループヘッダー行
      const groupHeader: GroupHeader = {
        isGroupHeader: true,
        methodName,
        taskCount: methodTasks.length,
        key: `group-${methodName}`
      };
      rows.push(groupHeader);
      
      // メソッドが展開されている場合のみタスク行を追加
      if (expandedMethods.has(methodName)) {
        methodTasks.forEach(task => {
          const taskRow: TaskRow = {
            ...task,
            isGroupHeader: false,
            key: task.taskId
          };
          rows.push(taskRow);
        });
      }
    });
    
    return rows;
  }, [filteredTasks, expandedMethods]);

  // グループヘッダーのクリックハンドラー
  const handleGroupHeaderClick = (methodName: string) => {
    setExpandedMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(methodName)) {
        newSet.delete(methodName);
      } else {
        newSet.add(methodName);
      }
      return newSet;
    });
  };

  // すべて展開/折りたたみ
  const handleExpandAll = () => {
    const allMethodNames = Array.from(new Set(filteredTasks.map(task => task.methodName)));
    setExpandedMethods(new Set(allMethodNames));
  };

  const handleCollapseAll = () => {
    setExpandedMethods(new Set());
  };

  // テーブルの列定義
  const columns: ColumnsType<TableRow> = [
    {
      title: 'メソッド名',
      key: 'methodName',
      width: 250,
      render: (_, record) => {
        if (record.isGroupHeader) {
          // グループヘッダー行
          const isExpanded = expandedMethods.has(record.methodName);
          return (
            <div
              onClick={() => handleGroupHeaderClick(record.methodName)}
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                color: '#212121'
              }}
            >
              {isExpanded ? (
                <DownOutlined style={{ fontSize: '12px', marginRight: '8px' }} />
              ) : (
                <RightOutlined style={{ fontSize: '12px', marginRight: '8px' }} />
              )}
              <Text strong style={{ fontSize: '14px' }}>
                {record.methodName} ({record.taskCount})
              </Text>
            </div>
          );
        } else {
          // タスク行（空白表示）
          return null;
        }
      }
    },
    {
      title: 'タスク名',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      render: (text: string, record) => {
        if (record.isGroupHeader) return null;
        return (
          <Text style={{ fontSize: '14px', paddingLeft: '24px' }}>
            {text}
          </Text>
        );
      }
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: TaskStatus | undefined, record) => {
        if (record.isGroupHeader || !status) return null;
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
      render: (rate: number | undefined, record) => {
        if (record.isGroupHeader || rate === undefined) return null;
        return (
          <Text strong style={{ fontSize: '14px', color: '#0093CF' }}>
            {rate}%
          </Text>
        );
      }
    },
    {
      title: '問題報告',
      key: 'issue',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record.isGroupHeader) return null;
        return (
          <TaskActionButtons
            task={record as Task}
            onAction={(action) => onTaskAction(record.key, action)}
            buttonType="issue"
          />
        );
      }
    },
    {
      title: '実験記録',
      key: 'record',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record.isGroupHeader) return null;
        return (
          <TaskActionButtons
            task={record as Task}
            onAction={(action) => onTaskAction(record.key, action)}
            buttonType="record"
          />
        );
      }
    },
    {
      title: '終了',
      key: 'complete',
      width: 80,
      align: 'center',
      render: (_, record) => {
        if (record.isGroupHeader) return null;
        return (
          <TaskActionButtons
            task={record as Task}
            onAction={(action) => onTaskAction(record.key, action)}
            buttonType="complete"
          />
        );
      }
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

      {/* 展開/折りたたみボタン */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Button size="small" onClick={handleExpandAll}>
          すべて展開
        </Button>
        <Button size="small" onClick={handleCollapseAll}>
          すべて折りたたみ
        </Button>
      </div>
      
      {/* テーブル */}
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey="key"
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
        rowClassName={(record) => {
          if (record.isGroupHeader) {
            return 'group-header-row';
          }
          return '';
        }}
        style={{
          background: '#ffffff',
          borderRadius: '8px'
        }}
        className="task-list-table"
      />
      
      {/* カスタムスタイル */}
      <style jsx global>{`
        .group-header-row {
          background-color: #f5f5f5 !important;
        }
        .group-header-row:hover {
          background-color: #e8e8e8 !important;
        }
      `}</style>
    </div>
  );
}
