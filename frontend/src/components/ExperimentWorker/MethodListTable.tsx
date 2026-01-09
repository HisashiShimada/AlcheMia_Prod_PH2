'use client';

import React, { useMemo, useState } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus } from '@/types/experimentWorker';

const { Text } = Typography;

/**
 * メソッドに紐づくタスクのステータスから、メソッド全体のステータスを計算
 * @param tasks メソッドに紐づくタスクの配列
 * @returns 計算されたメソッドステータス
 */
function calculateMethodStatus(tasks: Task[]): TaskStatus {
  if (tasks.length === 0) {
    return 'not_started';
  }
  
  // 1つでも「作業中」系のタスクがあれば「作業中」
  const hasInProgress = tasks.some(task => 
    task.status === 'started' || task.status === 'in_progress'
  );
  if (hasInProgress) {
    return 'in_progress';
  }
  
  // 全て「完了」であれば「完了」
  const allCompleted = tasks.every(task => task.status === 'completed');
  if (allCompleted) {
    return 'completed';
  }
  
  // それ以外は「開始前」
  return 'not_started';
}

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

// メソッド集約データの型定義
interface MethodData {
  methodId: string;
  methodName: string;
  status: TaskStatus;
  taskCount: number;
}

interface MethodListTableProps {
  tasks: Task[];
  selectedMethodId: string | null;
  onMethodSelect: (methodId: string) => void;
}

/**
 * メソッド一覧テーブル
 * プロジェクトに含まれるメソッドを一覧表示し、選択機能を提供
 */
export default function MethodListTable({ 
  tasks, 
  selectedMethodId, 
  onMethodSelect 
}: MethodListTableProps) {
  
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
  
  // メソッドごとにタスクをグループ化してメソッドデータを生成
  const methodDataList = useMemo<MethodData[]>(() => {
    const methodGroups = new Map<string, Task[]>();
    
    // タスクをメソッドIDでグループ化
    tasks.forEach(task => {
      const methodId = task.methodId || task.methodName;
      if (!methodGroups.has(methodId)) {
        methodGroups.set(methodId, []);
      }
      methodGroups.get(methodId)!.push(task);
    });
    
    // メソッドデータの配列を生成
    const result: MethodData[] = [];
    methodGroups.forEach((tasksInMethod, methodId) => {
      result.push({
        methodId: methodId,
        methodName: tasksInMethod[0].methodName,
        status: calculateMethodStatus(tasksInMethod),
        taskCount: tasksInMethod.length
      });
    });
    
    return result;
  }, [tasks]);
  
  // フィルタリングされたメソッドデータ
  const filteredMethodDataList = useMemo(() => {
    return methodDataList.filter(method => {
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
        method.methodName.toLowerCase().includes(searchText.toLowerCase()) ||
        getStatusLabel(method.status).includes(searchText) ||
        method.taskCount.toString().includes(searchText);
      
      // ステータスフィルタ
      const matchesStatus = !selectedStatus || method.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [methodDataList, searchText, selectedStatus]);
  
  // テーブルの列定義
  const columns: ColumnsType<MethodData> = [
    {
      title: 'No',
      key: 'no',
      width: 60,
      align: 'center',
      render: (_text: unknown, _record: MethodData, index: number) => (
        <Text style={{ fontSize: '14px' }}>{index + 1}</Text>
      )
    },
    {
      title: 'メソッドの名称',
      dataIndex: 'methodName',
      key: 'methodName',
      width: 250,
      ellipsis: true,
      sorter: (a, b) => a.methodName.localeCompare(b.methodName),
      render: (text: string) => (
        <Text style={{ fontSize: '14px' }}>{text}</Text>
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
      title: 'タスク数',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.taskCount - b.taskCount,
      render: (count: number) => (
        <Text style={{ fontSize: '14px' }}>{count}</Text>
      )
    }
  ];
  
  return (
    <div>
      {/* 絞り込みUI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Input
            placeholder="メソッド名、ステータス、タスク数で検索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            aria-label="メソッド一覧検索"
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
            aria-label="メソッドステータスで絞り込み"
          />
        </Col>
      </Row>
      
      {/* メソッド一覧テーブル */}
      <Table
        columns={columns}
        dataSource={filteredMethodDataList}
        rowKey="methodId"
        onRow={(record) => ({
          onClick: () => onMethodSelect(record.methodId),
          style: { 
            cursor: 'pointer',
            backgroundColor: selectedMethodId === record.methodId ? '#e6f7ff' : undefined
          }
        })}
        rowClassName={(record) => 
          selectedMethodId === record.methodId ? 'selected-row' : ''
        }
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: false,
        showTotal: (total) => `全${total}件`,
        pageSizeOptions: ['10', '20', '50'],
        position: ['bottomRight'],
        locale: {
          items_per_page: '件/ページ',
          jump_to: 'ページ',
          page: ''
        }
      }}
      scroll={{ x: 510 }}
      size="middle"
      bordered
      aria-label="メソッド一覧"
      style={{
        background: '#ffffff',
        borderRadius: '8px'
      }}
      />
    </div>
  );
}
