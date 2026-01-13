'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Space, Row, Col, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus, ProjectStatus, isEditableStatus } from '@/types/experimentWorker';
import FlowDiagramModal from './FlowDiagramModal';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

// 集約行の型定義
interface AggregatedRow {
  isAggregated: true;
  methodName: string;
  methodId: string;
  taskCount: number;
  status: TaskStatus;  // メソッド全体のステータス
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

interface ProgressCheckTableProps {
  tasks: Task[];
  projectStatus: ProjectStatus | null;
  onTaskAction: (taskId: string, action: string) => void;
}

/**
 * 進捗確認テーブル
 * サブタスクのリストを表示する（折りたたみなし）
 */
export default function ProgressCheckTable({ tasks, projectStatus, onTaskAction }: ProgressCheckTableProps) {
  const { t } = useLanguage();
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  
  // フロー図モーダルの状態
  const [flowDiagramVisible, setFlowDiagramVisible] = useState<boolean>(false);
  const [selectedTaskForFlow, setSelectedTaskForFlow] = useState<Task | null>(null);
  
  // メソッド集約の状態管理（集約されているメソッドIDのSet）
  const [collapsedMethodIds, setCollapsedMethodIds] = useState<Set<string>>(new Set());
  
  // 初回レンダリング時に全メソッドを集約状態にする
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
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

  // 初回レンダリング時に全メソッドを集約状態にする
  React.useEffect(() => {
    if (!isInitialized && filteredTasks.length > 0) {
      // 全メソッドIDを取得
      const allMethodIds = new Set<string>();
      filteredTasks.forEach(task => {
        const methodId = task.methodId || task.methodName;
        allMethodIds.add(methodId);
      });
      
      // 初期状態として全メソッドを集約
      setCollapsedMethodIds(allMethodIds);
      setIsInitialized(true);
    }
  }, [filteredTasks, isInitialized]);

  // テーブルデータソース（集約処理を適用）
  const tableDataSource = useMemo<TableRow[]>(() => {
    // メソッドIDでグループ化
    const methodGroups = new Map<string, Task[]>();
    
    filteredTasks.forEach(task => {
      const methodId = task.methodId || task.methodName; // methodIdがない場合はmethodNameを使用
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
        const methodStatus = calculateMethodStatus(tasksInMethod);
        const aggregatedRow: AggregatedRow = {
          isAggregated: true,
          methodName: tasksInMethod[0].methodName,
          methodId: methodId,
          taskCount: tasksInMethod.length,
          status: methodStatus,
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
        const aStatus = a.status;
        const bStatus = b.status;
        return aStatus.localeCompare(bStatus);
      },
      render: (status: TaskStatus, record: TableRow) => {
        // 集約行の場合もステータスを表示
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
              color: '#0093CF',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => handleProgressRateClick(record)}
            aria-label={`進捗率 ${rate}% - クリックしてフロー図を表示`}
          >
            {rate}%
          </Text>
        );
      }
    },
    {
      title: '指示確認',
      key: 'instruction',
      width: 100,
      align: 'center',
      render: (_, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return null;
        }
        return (
          <Button
            type="default"
            size="small"
            onClick={() => onTaskAction(record.taskId, 'instruction')}
            aria-label="作業指示を確認"
          >
            指示
          </Button>
        );
      }
    },
    {
      title: '開始',
      key: 'start',
      width: 80,
      align: 'center',
      render: (_, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return null;
        }
        // プロジェクトの状態が編集可能でない場合は非活性化
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
      width: 100,
      align: 'center',
      render: (_, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return null;
        }
        return (
          <Button
            type="default"
            size="small"
            onClick={() => onTaskAction(record.taskId, 'issueCheck')}
            aria-label={t('experimentWork.progressCheck.issueCheck')}
          >
            {t('experimentWork.progressCheck.checkButton')}
          </Button>
        );
      }
    },
    {
      title: '実験記録',
      key: 'record',
      width: 100,
      align: 'center',
      render: (_, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return null;
        }
        return (
          <Button
            type="default"
            size="small"
            onClick={() => onTaskAction(record.taskId, 'record')}
            aria-label="実験記録を入力"
          >
            記録
          </Button>
        );
      }
    },
    {
      title: '強制終了',
      key: 'forceTerminate',
      width: 100,
      align: 'center',
      render: (_, record: TableRow) => {
        if (isAggregatedRow(record)) {
          return null;
        }
        // プロジェクトの状態が編集可能でない場合は非活性化
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
        dataSource={tableDataSource}
        rowKey={(record) => isAggregatedRow(record) ? record.id : record.taskId}
        rowClassName={(record) => {
          return isAggregatedRow(record) ? 'aggregated-row' : '';
        }}
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
      
      {/* 集約行のスタイル */}
      <style jsx>{`
        :global(.aggregated-row) {
          background-color: #f5f5f5 !important;
        }
        :global(.aggregated-row:hover) {
          background-color: #eeeeee !important;
        }
      `}</style>
      
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
