'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col, message, Progress, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressStatus } from '@/types/experimentWorker';
import { Transition, ExperimentDataValue, ProjectStatus, isRecordableStatus, Issue, IssueReportFormData } from '@/types/experimentWorker';
import { getIssuesByTransitionId } from '@/data/projectsData';
import InstructionConfirmationModal from './InstructionConfirmationModal';
import DataRecordDialog from './DataRecordDialog';
import IssueManagementModal from './IssueManagementModal';

const { Text } = Typography;

interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
}

/**
 * トランジション一覧表示コンポーネント
 * 選択されたメソッドに含まれるトランジションを一覧表示
 * トランジションクリック時に実験データ記録ダイアログを表示
 */
export default function TransitionList({
  transitions,
  projectStatus,
  projectId,
  methodId,
}: TransitionListProps) {
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [dataRecordModalOpen, setDataRecordModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTransitionName, setSelectedTransitionName] = useState<string | undefined>(undefined);

  // レスポンシブデザイン用の画面幅監視
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  // 画面幅の監視
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth <= 1500);
    };

    // 初期化
    handleResize();
    
    // リサイズイベントの監視
    window.addEventListener('resize', handleResize);
    
    // クリーンアップ
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // TODO: モックデータ - 実際はpropsまたはAPIから取得
  const [issues, setIssues] = useState<Issue[]>([]);

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

  // データ記録モーダルを閉じる
  const handleDataRecordModalClose = () => {
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
  };

  // データ保存ハンドラ
  const handleDataSave = (data: ExperimentDataValue[]) => {
    console.log('保存されたデータ:', data);
    // TODO: バックエンドAPIへの保存処理を実装
    message.success('実験データを保存しました');
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
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

  // 記録ボタンクリックハンドラ - 直接データ記録モーダルを開く
  const handleRecord = (transition: Transition) => {
    setSelectedTransition(transition);
    setDataRecordModalOpen(true);
  };

  // 問題報告ボタンクリックハンドラ
  const handleIssueReport = (transition: Transition) => {
    setSelectedTransition(transition);
    // トランジションIDに関連する問題を取得
    const transitionIssues = getIssuesByTransitionId(transition.transitionId);
    setIssues(transitionIssues);
    setIssueModalOpen(true);
  };

  // 問題報告モーダルを閉じる
  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setSelectedTransition(null);
  };

  // 新規問題報告送信ハンドラ
  const handleSubmitIssue = (issue: IssueReportFormData) => {
    console.log('新規問題報告:', issue);
    // TODO: バックエンドAPIへの送信処理を実装
    message.success('問題を報告しました');
  };

  // コメント送信ハンドラ
  const handleSubmitComment = (issueId: string, comment: string) => {
    console.log('コメント投稿:', { issueId, comment });
    // TODO: バックエンドAPIへの送信処理を実装
    message.success('コメントを投稿しました');
  };

  // ケバブメニュー用のメニュー項目を生成
  const getMenuItems = (record: Transition): MenuProps['items'] => {
    const isProjectRecordable = projectStatus ? isRecordableStatus(projectStatus) : true;
    
    return [
      {
        key: 'record',
        label: '記録',
        disabled: !isProjectRecordable,
        onClick: () => handleRecord(record),
      },
      {
        key: 'report',
        label: '問題報告',
        onClick: () => handleIssueReport(record),
      },
    ];
  };

  // テーブルの列定義（レスポンシブ対応）
  const columns: ColumnsType<Transition> = [
    {
      title: 'トランジション名',
      dataIndex: 'transitionName',
      key: 'transitionName',
      width: isNarrowScreen ? 150 : 200,
      fixed: 'left',
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
      fixed: 'left',
      align: 'center',
      render: (status: ProgressStatus | undefined) => getStatusDisplay(status)
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 70,
      align: 'center',
      render: (progressRate: number | undefined) => {
        const rate = progressRate ?? 0;
        return (
          <Text strong>
            {rate}%
          </Text>
        );
      }
    },
    // レスポンシブ時は非表示にするカラム
    ...(!isNarrowScreen ? [
      {
        title: '材料',
        key: 'materials',
        width: 70,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
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
        key: 'conditions',
        width: 70,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
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
        width: 70,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
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
        title: '記録',
        key: 'record',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
          // プロジェクトの状態が記録可能でない場合は非活性化
          const isProjectRecordable = projectStatus ? isRecordableStatus(projectStatus) : true;
          
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRecord(record);
              }}
              disabled={!isProjectRecordable}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#ffffff',
                backgroundColor: isProjectRecordable ? '#CF0027' : '#d3d3d3',
                border: 'none',
                borderRadius: '4px',
                cursor: isProjectRecordable ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: isProjectRecordable ? 1 : 0.6
              }}
              onMouseOver={(e) => {
                if (isProjectRecordable) {
                  e.currentTarget.style.backgroundColor = '#a50020';
                }
              }}
              onMouseOut={(e) => {
                if (isProjectRecordable) {
                  e.currentTarget.style.backgroundColor = '#CF0027';
                }
              }}
            >
              記録
            </button>
          );
        }
      },
      {
        title: '問題報告',
        key: 'issue',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleIssueReport(record);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#CF0027',
                backgroundColor: '#ffffff',
                border: '1px solid #CF0027',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#fff5f7';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              報告
            </button>
          );
        }
      },
    ] : []),
    // レスポンシブ時の操作カラム（ケバブメニュー）
    ...(isNarrowScreen ? [
      {
        title: '操作',
        key: 'action',
        width: 60,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => (
          <Dropdown
            menu={{ items: getMenuItems(record) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              aria-label="操作メニュー"
            />
          </Dropdown>
        )
      },
    ] : []),
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      width: 200,
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
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
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
          scroll={{ 
            y: 'calc(100vh - 650px)' 
          }}
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
          locale={{
            emptyText: 'トランジションが登録されていません'
          }}
        />
      </div>

      {/* データ記録モーダル */}
      <DataRecordDialog
        open={dataRecordModalOpen}
        transition={selectedTransition}
        projectStatus={projectStatus}
        onClose={handleDataRecordModalClose}
        onSave={handleDataSave}
        projectId={projectId}
        methodId={methodId}
      />

      {/* 問題管理モーダル */}
      {selectedTransition && (
        <IssueManagementModal
          visible={issueModalOpen}
          transitionId={selectedTransition.transitionId}
          transitionName={selectedTransition.transitionName}
          issues={issues}
          onClose={handleIssueModalClose}
          onSubmitIssue={handleSubmitIssue}
          onSubmitComment={handleSubmitComment}
          projectStatus={projectStatus}
        />
      )}
    </>
  );
}
