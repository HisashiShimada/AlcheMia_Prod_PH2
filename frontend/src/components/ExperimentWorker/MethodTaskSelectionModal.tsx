'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Table, Tag, Typography, Input, Select, Space, Row, Col, Button, Radio, Tabs, theme } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus, Method } from '@/types/experimentWorker';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

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
  methods: Method[];  // APIから取得したメソッド一覧
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
  methods: propsMethods,
}: MethodTaskSelectionModalProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  
  // 一時選択状態（モーダル内での選択状態）
  const [tempSelectedMethodId, setTempSelectedMethodId] = useState<string | null>(null);
  const [tempSelectedTaskId, setTempSelectedTaskId] = useState<string | null>(null);
  
  // 選択中のメソッドID（タブのactiveKey）
  const [activeMethodId, setActiveMethodId] = useState<string | null>(null);
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // モーダルが開かれた時に現在の選択状態を一時変数に設定
  useEffect(() => {
    if (open) {
      setTempSelectedMethodId(selectedMethodId);
      setTempSelectedTaskId(selectedTaskId);
      // フィルタをリセット
      setSearchText('');
      setSelectedTaskName(undefined);
      setSelectedStatus(undefined);
      // アクティブメソッドIDをリセット
      setActiveMethodId(null);
    }
  }, [open, selectedMethodId, selectedTaskId]);
  
  // メソッド一覧の取得（propsから）
  const methods = useMemo<Method[]>(() => {
    return propsMethods || [];
  }, [propsMethods]);
  
  // 初期化時に最初のメソッドを選択
  useEffect(() => {
    if (open && methods.length > 0 && !activeMethodId) {
      setActiveMethodId(methods[0].methodId);
    }
  }, [open, methods, activeMethodId]);
  
  // 選択されたメソッドに紐づくタスクを取得
  const allTasks = useMemo(() => {
    if (!activeMethodId || !methods) return [];
    
    const method = methods.find((m: Method) => m.methodId === activeMethodId);
    if (!method || !method.tasks) return [];
    
    // プロジェクトIDとメソッドIDを各タスクに付与
    return method.tasks.map((task: Task) => ({
      ...task,
      projectId: selectedProject,
      methodId: method.methodId,
      methodName: method.methodName,
    }));
  }, [methods, selectedProject, activeMethodId]);
  
  // タスク番号の選択肢を生成
  const taskNoOptions = useMemo(() => {
    const uniqueNos = Array.from(new Set(allTasks.map(task => task.taskNo)));
    uniqueNos.sort((a, b) => Number(a) - Number(b));
    return uniqueNos.map(no => ({ label: no, value: no }));
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
        task.taskNo.toString().includes(searchText) ||
        getStatusConfig(task.status).label.includes(searchText) ||
        task.progressRate.toString().includes(searchText);
      
      // タスク番号フィルタ
      const matchesTaskName = !selectedTaskName || task.taskNo === selectedTaskName;
      
      // ステータスフィルタ
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      
      return matchesSearch && matchesTaskName && matchesStatus;
    });
  }, [allTasks, searchText, selectedTaskName, selectedStatus]);
  
  // ラジオボタンクリックハンドラー（タスク選択）
  const handleRadioClick = (record: Task) => {
    setTempSelectedMethodId(record.methodId || null);
    setTempSelectedTaskId(record.taskId);
  };
  
  // 選択解除ハンドラー
  const handleClearSelection = () => {
    setTempSelectedMethodId(null);
    setTempSelectedTaskId(null);
  };
  
  // 決定ボタンの処理
  const handleOk = () => {
    if (tempSelectedMethodId && tempSelectedTaskId) {
      // 選択されている場合
      onSelect(tempSelectedMethodId, tempSelectedTaskId);
    } else {
      // 未選択の場合は、空文字列を渡して親コンポーネントの選択状態をクリア
      onSelect('', '');
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
  const columns: ColumnsType<Task> = [
    {
      title: '選択',
      key: 'radio',
      width: 60,
      align: 'center',
      render: (_, record: Task) => {
        return (
          <Radio
            checked={record.taskId === tempSelectedTaskId}
            onClick={(e) => {
              e.stopPropagation();
              handleRadioClick(record);
            }}
            aria-label={`タスク ${record.taskName} を選択`}
          />
        );
      }
    },
    {
      title: 'タスク番号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 100,
      align: 'center' as const,
      ellipsis: true,
      sorter: (a, b) => Number(a.taskNo) - Number(b.taskNo),
      render: (text: string) => {
        return <Text style={{ fontSize: '14px' }}>{text}</Text>;
      }
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 130,
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
      render: (rate: number) => {
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
      width={900}
      title={
        <Space>
          <CheckOutlined style={{ color: token.colorPrimary }} />
          <Text strong>メソッド・タスク選択</Text>
        </Space>
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={handleClearSelection}
            disabled={!tempSelectedTaskId}
            data-testid="method-task-selection-clear-button"
          >
            選択解除
          </Button>
          <Space>
            <Button onClick={handleCancel} data-testid="method-task-selection-cancel-button">
              キャンセル
            </Button>
            <Button 
              type="primary"
              onClick={handleOk}
              icon={<CheckOutlined />}
              data-testid="method-task-selection-ok-button"
            >
              決定
            </Button>
          </Space>
        </Space>
      }
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
      data-testid="method-task-selection-modal"
    >
      {/* メソッドタブ */}
      <Tabs
        activeKey={activeMethodId || undefined}
        onChange={setActiveMethodId}
        items={methods.map((method) => ({
          key: method.methodId,
          label: method.methodName,
          children: (
            <>
              {/* 絞り込みUI */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16, marginTop: 16 }}>
                <Col xs={24} sm={8}>
                  <Input
                    placeholder={t('experimentWork.methodTaskSelection.searchPlaceholder')}
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    aria-label="全カラム検索"
                    data-testid="method-task-selection-search-input"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Select
                    placeholder={t('experimentWork.methodTaskSelection.taskNoPlaceholder')}
                    style={{ width: '100%' }}
                    value={selectedTaskName}
                    onChange={(value) => setSelectedTaskName(value)}
                    allowClear
                    options={taskNoOptions}
                    aria-label="タスク番号で絞り込み"
                    data-testid="method-task-selection-task-name-filter"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Select
                    placeholder={t('experimentWork.table.status')}
                    style={{ width: '100%' }}
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value as TaskStatus)}
                    allowClear
                    options={statusOptions}
                    aria-label="ステータスで絞り込み"
                    data-testid="method-task-selection-status-filter"
                  />
                </Col>
              </Row>
              
              {/* テーブル */}
              <Table
                columns={columns}
                dataSource={filteredTasks}
                rowKey={(record) => record.taskId}
                rowClassName={(record) => {
                  if (record.taskId === tempSelectedTaskId) {
                    return 'selected-row';
                  }
                  return '';
                }}
                pagination={{
                  current: currentPage,
                  pageSize: pageSize,
                  showSizeChanger: true,
                  showQuickJumper: false,
                  showTotal: (total) => t('experimentWork.methodTaskSelection.showTotal').replace('{total}', String(total)),
                  pageSizeOptions: ['20', '50', '100'],
                  position: ['bottomRight'],
                  onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
                  onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); },
                  locale: {
                    items_per_page: '件/ページ',
                    jump_to: 'ページ',
                    page: ''
                  }
                }}
                scroll={{ x: 600 }}
                size="middle"
                bordered
                aria-label="タスク一覧"
                style={{
                  background: '#ffffff',
                  borderRadius: '8px'
                }}
                data-testid="method-task-selection-table"
              />
            </>
          ),
        }))}
        size="middle"
        type="card"
        style={{
          marginBottom: 0,
        }}
        tabBarStyle={{
          marginBottom: 0,
        }}
        data-testid="method-task-selection-tabs"
      />
      
      {/* スタイル */}
      <style jsx>{`
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
