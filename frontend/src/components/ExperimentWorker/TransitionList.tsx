'use client';

import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Input, Select, Row, Col, message } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressStatus } from '@/types/experimentWorker';
import { Transition, ExperimentDataValue, ProjectStatus, isRecordViewableStatus, Issue, IssueReportFormData } from '@/types/experimentWorker';
import { getIssues, createIssue, addComment, updateIssueStatus } from '@/services/issueApiService';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueLoading, setIssueLoading] = useState<boolean>(false);
  const { t } = useLanguage();

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
    message.success(t('worker.experimentDataSaved'));
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
      not_started: { color: 'default', icon: <MinusCircleOutlined />, text: t('experimentWork.status.notStarted') },
      in_progress: { color: 'processing', icon: <ClockCircleOutlined />, text: t('experimentWork.status.working') },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: t('experimentWork.status.completed') },
      on_hold: { color: 'warning', icon: <ExclamationCircleOutlined />, text: t('experimentWork.status.onHold') },
      issue: { color: 'error', icon: <ExclamationCircleOutlined />, text: t('experimentWork.status.issue') }
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
      message.error(t('project.selectProjectWarning'));
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

      message.success(t('worker.issueReported'));

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
      message.error(t('project.selectProjectWarning'));
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
      message.error(t('project.selectProjectWarning'));
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
      title: t('experimentWork.table.transitionName'),
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
      title: t('experimentWork.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'left',
      align: 'center',
      render: (status: ProgressStatus | undefined) => getStatusDisplay(status)
    },
    {
      title: t('experimentWork.table.progressRate'),
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
        title: t('experimentWork.table.materials'),
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
        title: t('experimentWork.table.conditions'),
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
        title: t('experimentWork.table.results'),
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
        title: t('experimentWork.table.record'),
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
              {t('experimentWork.actions.recordData')}
            </button>
          );
        }
      },
      {
        title: t('experimentWork.table.issueReport'),
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
              {t('experimentWork.actions.report')}
            </button>
          );
        }
      },
    {
      title: t('experimentWork.table.description'),
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
              placeholder={t('experimentWork.table.transitionName') + '、' + t('experimentWork.table.description') + t('common.searchJoiner') + '...'}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              aria-label={t('common.search')}
              data-testid="transition-list-search-input"
            />
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Select
              placeholder={t('experimentWork.table.transitionName')}
              style={{ width: '100%' }}
              value={selectedTransitionName}
              onChange={(value) => setSelectedTransitionName(value)}
              allowClear
              options={transitionNameOptions}
              aria-label={t('experimentWork.table.transitionName')}
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
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: false,
            showTotal: (total) => `${t('common.total')}${total}${t('common.items')}`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); },

            locale: {
              items_per_page: t('common.itemsPerPage'),
              jump_to: t('common.jumpToPage'),
              page: t('common.page')
            }
          }}
          scroll={{ 
            x: 976,
            y: 'calc(100vh - 650px)' 
          }}
          size="middle"
          bordered
          aria-label={t('experimentWork.table.transitionName')}
          aria-describedby="transition-list-description"
          data-testid="transition-list-table"
          rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          style={{
            background: '#ffffff',
            borderRadius: '8px'
          }}
          className="transition-list-table"
          locale={{
            emptyText: t('taskRegistration.emptyState')
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
