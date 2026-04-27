'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col, message, Progress, Button } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressStatus } from '@/types/experimentWorker';
import { Transition, ExperimentDataValue, ProjectStatus, isRecordViewableStatus, Issue, IssueReportFormData } from '@/types/experimentWorker';
import { getIssues, createIssue, addComment, updateIssueStatus } from '@/services/issueApiService';
import { extractErrorMessage } from '@/utils/errorUtils';
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
  projectName?: string;
  /** 実験データ保存完了後のコールバック（親コンポーネントの進捗データ再取得に使用） */
  onDataSaveComplete?: () => void;
  /** みなし進捗使用フラグ（organization.use_deemed_progress）: false の場合はチェックボックスを非表示にしてステータス更新を常時表示 */
  useDeemedProgress?: boolean;
}

/**
 * トランジション一覧表示コンポーネント
 * 選択されたメソッドに含まれるトランジションを一覧表示
 * トランジションクリック時に実験データ記録ダイアログを表示
 */
export default function TransitionList({
  transitions,
  projectStatus,
  selectedTaskId,
  projectId,
  methodId,
  projectName,
  onDataSaveComplete,
  useDeemedProgress = true,
}: TransitionListProps) {
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [dataRecordModalOpen, setDataRecordModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  
  // 絞り込み用のstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTransitionName, setSelectedTransitionName] = useState<string | undefined>(undefined);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueLoading, setIssueLoading] = useState<boolean>(false);

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
        (transition.transitionName ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
        (transition.description ?? '').toLowerCase().includes(searchText.toLowerCase());
      
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
  const handleDataSave = (_data: ExperimentDataValue[]) => {
    message.success('実験データを保存しました');
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
    // 保存後に親コンポーネントの進捗データを再取得してトランジション一覧を最新状態に更新
    onDataSaveComplete?.();
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
  const handleIssueReport = async (transition: Transition) => {
    setSelectedTransition(transition);
    setIssues([]);
    setIssueModalOpen(true);

    // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
    // projectId は UUID（ハイフン含む）のため split('-') の末尾要素を取得する
    const parts = (selectedTaskId ?? '').split('-');
    const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

    if (!projectId || !methodId || !selectedTaskId || isNaN(taskNo)) {
      console.warn('[handleIssueReport] 必要なパラメータが不足しています', {
        projectId, methodId, selectedTaskId, taskNo,
      });
      return;
    }

    setIssueLoading(true);
    try {
      const fetchedIssues = await getIssues({
        projectId,
        methodId,
        taskNo,
        transitionId: transition.transitionId,
      });
      setIssues(fetchedIssues);
    } catch (error) {
      console.error('[handleIssueReport] 問題一覧取得エラー', error);
      message.error(extractErrorMessage(error));
    } finally {
      setIssueLoading(false);
    }
  };

  // 問題報告モーダルを閉じる
  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setSelectedTransition(null);
  };

  // 新規問題報告送信ハンドラ
  const handleSubmitIssue = async (issue: IssueReportFormData) => {
    // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
    // projectId は UUID（ハイフン含む）のため split('-') の末尾要素を取得する
    const parts = (selectedTaskId ?? '').split('-');
    const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

    if (!projectId) {
      console.warn('[handleSubmitIssue] projectId が未設定です');
      message.error('プロジェクトが選択されていません');
      return;
    }

    try {
      await createIssue({
        projectId,
        methodId: methodId ?? undefined,
        issueType: issue.issueType,
        targetType: issue.targetType,
        taskNo: !isNaN(taskNo) ? taskNo : undefined,
        transitionId: selectedTransition?.transitionId ?? undefined,
        title: issue.title,
        description: issue.content,
      });

      message.success('問題を報告しました');

      // 問題一覧を再取得して最新状態を反映
      if (projectId && methodId && !isNaN(taskNo) && selectedTransition) {
        setIssueLoading(true);
        try {
          const fetchedIssues = await getIssues({
            projectId,
            methodId,
            taskNo,
            transitionId: selectedTransition.transitionId,
          });
          setIssues(fetchedIssues);
        } catch (fetchError) {
          console.error('[handleSubmitIssue] 問題一覧再取得エラー', fetchError);
          // 再取得失敗はサイレントに処理（報告自体は成功しているため）
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitIssue] 問題報告エラー', error);
      message.error(extractErrorMessage(error));
    }
  };

  // コメント送信ハンドラ
  const handleSubmitComment = async (issueId: string, comment: string) => {
    if (!projectName) {
      console.warn('[handleSubmitComment] projectName が未設定です');
      message.error('プロジェクトが選択されていません');
      return;
    }

    try {
      await addComment({
        projectName,
        issueId,
        comment,
      });

      // コメント投稿後に問題一覧を再取得して表示に反映
      const parts = (selectedTaskId ?? '').split('-');
      const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

      if (projectId && methodId && !isNaN(taskNo) && selectedTransition) {
        setIssueLoading(true);
        try {
          const fetchedIssues = await getIssues({
            projectId,
            methodId,
            taskNo,
            transitionId: selectedTransition.transitionId,
          });
          setIssues(fetchedIssues);
        } catch (fetchError) {
          console.error('[handleSubmitComment] 問題一覧再取得エラー', fetchError);
          // 再取得失敗はサイレントに処理（コメント投稿自体は成功しているため）
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitComment] コメント投稿エラー', error);
      message.error(extractErrorMessage(error));
    }
  };

  // ステータス変更ハンドラ
  const handleUpdateStatus = async (issueId: string, status: Issue['status']) => {
    if (!projectName) {
      console.warn('[handleUpdateStatus] projectName が未設定です');
      message.error('プロジェクトが選択されていません');
      return;
    }

    try {
      await updateIssueStatus({
        projectName,
        issueId,
        status,
      });

      // ステータス更新後に問題一覧を再取得して表示に反映
      const parts = (selectedTaskId ?? '').split('-');
      const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

      if (projectId && methodId && !isNaN(taskNo) && selectedTransition) {
        setIssueLoading(true);
        try {
          const fetchedIssues = await getIssues({
            projectId,
            methodId,
            taskNo,
            transitionId: selectedTransition.transitionId,
          });
          setIssues(fetchedIssues);
        } catch (fetchError) {
          console.error('[handleUpdateStatus] 問題一覧再取得エラー', fetchError);
          // 再取得失敗はサイレントに処理（ステータス更新自体は成功しているため）
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleUpdateStatus] ステータス更新エラー', error);
      message.error(extractErrorMessage(error));
    }
  };

  // テーブルの列定義
  const columns: ColumnsType<Transition> = [
    {
      title: 'トランジション名',
      dataIndex: 'transitionName',
      key: 'transitionName',
      width: 160,
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
      width: 100,
      fixed: 'left',
      align: 'center',
      render: (status: ProgressStatus | undefined) => getStatusDisplay(status)
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 65,
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
    {
        title: '材料',
        key: 'materials',
        width: 55,
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
        width: 55,
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
        width: 55,
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
        width: 65,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
          // プロジェクトの状態が記録を参照・操作可能でない場合は非活性化
          // waiting_task / executing_task / waiting_approval の場合に活性
          const isProjectRecordable = projectStatus === null || isRecordViewableStatus(projectStatus);
          
          return (
            <button
              type="button"
              data-testid="transition-record-button"
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
        width: 65,
        align: 'center' as const,
        render: (_: unknown, record: Transition) => {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleIssueReport(record);
              }}
              data-testid="transition-issue-report-button"
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
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      width: 140,
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
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }} data-testid="transition-list-filter-row">
          <Col xs={24} sm={12} md={12}>
            <Input
              placeholder="トランジション名、説明で検索..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              aria-label="全カラム検索"
              data-testid="transition-list-search-input"
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
              data-testid="transition-list-name-filter"
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
            pageSizeOptions: ['20', '50', '100'],
            locale: {
              items_per_page: '件/ページ',
              jump_to: 'ページ',
              page: ''
            }
          }}
          scroll={{ 
            x: 976,
            y: 'calc(100vh - 650px)' 
          }}
          size="middle"
          bordered
          aria-label="トランジション一覧"
          aria-describedby="transition-list-description"
          data-testid="transition-list-table"
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
      {dataRecordModalOpen && (
        <DataRecordDialog
          open={dataRecordModalOpen}
          transition={selectedTransition}
          projectStatus={projectStatus}
          onClose={handleDataRecordModalClose}
          onSave={handleDataSave}
          projectId={projectId}
          projectName={projectName}
          methodId={methodId}
          taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
          useDeemedProgress={useDeemedProgress}
        />
      )}

      {/* 問題管理モーダル */}
      {issueModalOpen && selectedTransition && (
        <IssueManagementModal
          open={issueModalOpen}
          targetName={selectedTransition.transitionName}
          projectId={projectId || ''}
          projectName={projectName || ''}
          methodId={methodId || undefined}
          taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
          transitionId={selectedTransition.transitionId}
          onClose={handleIssueModalClose}
          projectStatus={projectStatus}
        />
      )}
    </>
  );
}
