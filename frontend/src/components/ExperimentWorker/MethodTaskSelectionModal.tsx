'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Table, Tag, Typography, Input, Select, Space, Row, Col, theme } from 'antd';
import { SearchOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus, Method } from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';

const { Text } = Typography;

// 集約行の型定義
interface AggregatedRow {
  isAggregated: true;
  methodName: string;
  methodId: string;
  taskCount: number;
  // rowKey用の一意ID
  id: string;
}

// テーブル行の型（通常タスク or 集約行）
type TableRow = Task | AggregatedRow;

// 型ガード関数
function isAggregatedRow(row: TableRow): row is AggregatedRow {
  return 'isAggregated' in row && row.isAggregated === true;
}

/**
 * メソッド・タスク選択モーダルのProps
 */
interface MethodTaskSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onSelect: (methodId: string, taskId: string) => void;
}

/**
 * メソッド・タスク選択モーダル
 * 進捗確認タブのテーブルと同様の構造で、メソッドとタスクを選択可能
 */
export default function MethodTaskSelectionModal({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  selectedTaskId,
  onSelect,
}: MethodTaskSelectionModalProps) {
  const { token } = theme.useToken();
  
  // 一時選択状態（モーダル内での選択状態）
  const [tempSelectedMethodId, setTempSelectedMethodId] = useState<string | null>(null);
  const [tempSelectedTaskId, setTempSelectedTaskId] = useState<string | null>(null);
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
  // メソッド集約の状態管理（集約されているメソッドIDのSet）
  const [collapsedMethodIds, setCollapsedMethodIds] = useState<Set<string>>(new Set());
  
  // 初回レンダリング時に全メソッドを集約状態にする
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // モーダルが開かれた時に現在の選択状態を一時変数に設定
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTempSelectedMethodId(selectedMethodId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTempSelectedTaskId(selectedTaskId);
      // フィルタをリセット
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSearchText('');
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSelectedMethodName(undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSelectedTaskName(undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSelectedStatus(undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setIsInitialized(false);
    }
  }, [open, selectedMethodId, selectedTaskId]);
  
  // プロジェクトデータを取得
  const projectData = selectedProject ? projectsData[selectedProject] : null;
  
  // プロジェクト内の全タスクを取得
  const allTasks = useMemo(() => {
    if (!projectData?.methods) return [];
    
    const tasks: Task[] = [];
    projectData.methods.forEach((method: Method) => {
      if (method.tasks) {
        // プロジェクトIDとメソッドIDを各タスクに付与
        const tasksWithIds = method.tasks.map((task: Task) => ({
          ...task,
          projectId: selectedProject,
          methodId: method.methodId,
          methodName: method.methodName,
        }));
        tasks.push(...tasksWithIds);
      }
    });
    
    return tasks;
  }, [projectData, selectedProject]);
  
  // メソッド名クリックハンドラー（集約/展開のトグル）
  const handleMethodNameClick = (methodId: string) => {
    setCollapsedMethodIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(methodId)) {
        // すでに集約されている場合は展開
        newSet.delete(methodId);
      } else {
        // 集約する
        newSet.add(methodId);
      }
      return newSet;
    });
  };
  
  // メソッド名の選択肢を生成
  const methodNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTasks.map(task => task.methodName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [allTasks]);
  
  // タスク名の選択肢を生成
  const taskNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTasks.map(task => task.taskName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [allTasks]);
  
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
    return allTasks.filter(task => {
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
  }, [allTasks, searchText, selectedMethodName, selectedTaskName, selectedStatus]);
  
  // 初回レンダリング時に全メソッドを集約状態にする
  useEffect(() => {
    if (!isInitialized && filteredTasks.length > 0) {
      // 全メソッドIDを取得
      const allMethodIds = new Set<string>();
      filteredTasks.forEach(task => {
        const methodId = task.methodId || task.methodName;
        allMethodIds.add(methodId);
      });
      
      // 初期状態として全メソッドを集約
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setCollapsedMethodIds(allMethodIds);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setIsInitialized(true);
    }
  }, [filteredTasks, isInitialized]);
  
  // テーブルデータソース（集約処理を適用）
  const tableDataSource = useMemo<TableRow[]>(() => {
    // メソッドIDでグループ化
    const methodGroups = new Map<string, Task[]>();
    
    filteredTasks.forEach(task => {
      const methodId = task.methodId || task.methodName;
      if (!methodGroups.has(methodId)) {
        methodGroups.set(methodId, []);
      }
      methodGroups.get(methodId)!.push(task);
    });
    
    // 各メソッドグループを処理
    const result: TableRow[] = [];
    
    methodGroups.forEach((tasksInMethod, methodId) => {
      if (collapsedMethodIds.has(methodId)) {
        // 集約モード: 1行の集約行を追加
        const aggregatedRow: AggregatedRow = {
          isAggregated: true,
          methodName: tasksInMethod[0].methodName,
          methodId: methodId,
          taskCount: tasksInMethod.length,
          id: `aggregated-${methodId}`
        };
        result.push(aggregatedRow);
      } else {
        // 通常モード: すべてのタスクを追加
        result.push(...tasksInMethod);
      }
    });
    
    return result;
  }, [filteredTasks, collapsedMethodIds]);
  
  // 行クリックハンドラー（タスク選択）
  const handleRowClick = (record: TableRow) => {
    if (isAggregatedRow(record)) {
      // 集約行の場合は選択不可（展開のみ）
      return;
    }
    
    // タスク行の場合は選択
    setTempSelectedMethodId(record.methodId || null);
    setTempSelectedTaskId(record.taskId);
  };
  
  // 決定ボタンの処理
  const handleOk = () => {
    if (tempSelectedMethodId && tempSelectedTaskId) {
      onSelect(tempSelectedMethodId, tempSelectedTaskId);
    }
    onClose();
  };
  
  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempSelectedMethodId(selectedMethodId);
    setTempSelectedTaskId(selectedTaskId);
    onClose();
  };
  
  // テーブルの列定義
  const columns: ColumnsType<TableRow> = [
    {
      title: 'メソッドの名称',
      dataIndex: 'methodName',
      key: 'methodName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.methodName.localeCompare(b.methodName),
      render: (text: string, record: TableRow) => {
        const methodId = isAggregatedRow(record) 
          ? record.methodId 
          : (record.methodId || record.methodName);
        
        // 集約行の場合は件数を表示
        const displayText = isAggregatedRow(record)
          ? `${text} (${record.taskCount}件)`
          : text;
        
        return (
          <Text 
            style={{ 
              fontSize: '14px',
              cursor: 'pointer',
              color: '#0093CF',
              textDecoration: 'underline'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleMethodNameClick(methodId);
            }}
            aria-label={`メソッド名: ${displayText} - クリックして集約/展開`}
          >
            {displayText}
          </Text>
        );
      }
    },
    {
      title: 'タスクの名称',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => {
        const aName = isAggregatedRow(a) ? '' : a.taskName;
        const bName = isAggregatedRow(b) ? '' : b.taskName;
        return aName.localeCompare(bName);
      },
      render: (text: string, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return <Text style={{ fontSize: '14px', color: '#9e9e9e' }}>-</Text>;
        }
        return <Text style={{ fontSize: '14px' }}>{text}</Text>;
      }
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      sorter: (a, b) => {
        const aStatus = isAggregatedRow(a) ? '' : a.status;
        const bStatus = isAggregatedRow(b) ? '' : b.status;
        return aStatus.localeCompare(bStatus);
      },
      render: (status: TaskStatus, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return <Text style={{ fontSize: '14px', color: '#9e9e9e' }}>-</Text>;
        }
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
      sorter: (a, b) => {
        const aRate = isAggregatedRow(a) ? -1 : a.progressRate;
        const bRate = isAggregatedRow(b) ? -1 : b.progressRate;
        return aRate - bRate;
      },
      render: (rate: number, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return <Text style={{ fontSize: '14px', color: '#9e9e9e' }}>-</Text>;
        }
        return (
          <Text
            strong
            style={{
              fontSize: '14px',
              color: '#212121'
            }}
            aria-label={`進捗率 ${rate}%`}
          >
            {rate}%
          </Text>
        );
      }
    }
  ];
  
  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      width={900}
      title={
        <Space>
          <CheckOutlined style={{ color: token.colorPrimary }} />
          <Text strong>メソッド・タスク選択</Text>
        </Space>
      }
      okText="決定"
      cancelText="キャンセル"
      okButtonProps={{
        disabled: !tempSelectedMethodId || !tempSelectedTaskId,
        icon: <CheckOutlined />,
      }}
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
    >
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
        dataSource={tableDataSource}
        rowKey={(record) => isAggregatedRow(record) ? record.id : record.taskId}
        rowClassName={(record) => {
          if (isAggregatedRow(record)) {
            return 'aggregated-row';
          }
          // 選択されたタスク行をハイライト
          if (record.taskId === tempSelectedTaskId) {
            return 'selected-row';
          }
          return '';
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: isAggregatedRow(record) ? 'default' : 'pointer' }
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: (total, range) => `全${total}件`,
          pageSizeOptions: ['10', '20', '50'],
          position: ['bottomRight'],
          locale: {
            items_per_page: '件/ページ',
            jump_to: 'ページ',
            page: ''
          }
        }}
        scroll={{ x: 800 }}
        size="middle"
        bordered
        aria-label="メソッド・タスク一覧"
        style={{
          background: '#ffffff',
          borderRadius: '8px'
        }}
      />
      
      {/* スタイル */}
      <style jsx>{`
        :global(.aggregated-row) {
          background-color: #f5f5f5 !important;
        }
        :global(.aggregated-row:hover) {
          background-color: #eeeeee !important;
        }
        :global(.selected-row) {
          background-color: #e6f7ff !important;
        }
        :global(.selected-row:hover) {
          background-color: #bae7ff !important;
        }
      `}</style>
    </Modal>
  );
}
