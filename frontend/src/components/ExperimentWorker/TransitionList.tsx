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
import ExperimentRecordDialog from './ExperimentRecordDialog';
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
  /** 螳滄ｨ薙ョ繝ｼ繧ｿ菫晏ｭ伜ｮ御ｺ・ｾ後・繧ｳ繝ｼ繝ｫ繝舌ャ繧ｯ・郁ｦｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医・騾ｲ謐励ョ繝ｼ繧ｿ蜀榊叙蠕励↓菴ｿ逕ｨ・・*/
  onDataSaveComplete?: () => void;
  /** 縺ｿ縺ｪ縺鈴ｲ謐嶺ｽｿ逕ｨ繝輔Λ繧ｰ・・rganization.use_deemed_progress・・ false 縺ｮ蝣ｴ蜷医・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ繧帝撼陦ｨ遉ｺ縺ｫ縺励※繧ｹ繝・・繧ｿ繧ｹ譖ｴ譁ｰ繧貞ｸｸ譎り｡ｨ遉ｺ */
  useDeemedProgress?: boolean;
}

/**
 * 繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ荳隕ｧ陦ｨ遉ｺ繧ｳ繝ｳ繝昴・繝阪Φ繝・
 * 驕ｸ謚槭＆繧後◆繝｡繧ｽ繝・ラ縺ｫ蜷ｫ縺ｾ繧後ｋ繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ繧剃ｸ隕ｧ陦ｨ遉ｺ
 * 繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ繧ｯ繝ｪ繝・け譎ゅ↓螳滄ｨ薙ョ繝ｼ繧ｿ險倬鹸繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
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
  
  // 邨槭ｊ霎ｼ縺ｿ逕ｨ縺ｮstate
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTransitionName, setSelectedTransitionName] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueLoading, setIssueLoading] = useState<boolean>(false);
  const { t } = useLanguage();

  // 繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ蜷阪・驕ｸ謚櫁い繧堤函謌・
  const transitionNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(transitions.map(t => t.transitionName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [transitions]);

  // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縺輔ｌ縺溘ヨ繝ｩ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ繝・・繧ｿ
  const filteredTransitions = useMemo(() => {
    return transitions.filter(transition => {
      // 縺ゅ＞縺ｾ縺・､懃ｴ｢・亥・繧ｫ繝ｩ繝蟇ｾ雎｡・・
      const matchesSearch = searchText === '' || 
        (transition.transitionName ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
        (transition.description ?? '').toLowerCase().includes(searchText.toLowerCase());
      
      // 繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ蜷阪ヵ繧｣繝ｫ繧ｿ
      const matchesTransitionName = !selectedTransitionName || transition.transitionName === selectedTransitionName;
      
      return matchesSearch && matchesTransitionName;
    });
  }, [transitions, searchText, selectedTransitionName]);

  // 繝・・繧ｿ險倬鹸繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ
  const handleDataRecordModalClose = () => {
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
  };

  // 繝・・繧ｿ菫晏ｭ倥ワ繝ｳ繝峨Λ
  const handleDataSave = (_data: ExperimentDataValue[]) => {
    message.success(t('worker.experimentDataSaved'));
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
    // 菫晏ｭ伜ｾ後↓隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医・騾ｲ謐励ョ繝ｼ繧ｿ繧貞・蜿門ｾ励＠縺ｦ繝医Λ繝ｳ繧ｸ繧ｷ繝ｧ繝ｳ荳隕ｧ繧呈怙譁ｰ迥ｶ諷九↓譖ｴ譁ｰ
    onDataSaveComplete?.();
  };

  // 繧ｹ繝・・繧ｿ繧ｹ陦ｨ遉ｺ逕ｨ縺ｮ繝倥Ν繝代・髢｢謨ｰ
  const getStatusDisplay = (status?: ProgressStatus) => {
    if (!status) {
      return <Text type="secondary">-</Text>;
    }

    const statusConfig = {
      not_started: { color: 'default', icon: <MinusCircleOutlined />, text: t('experimentWork.transitionStatus.notStarted') },
      in_progress: { color: 'processing', icon: <ClockCircleOutlined />, text: t('experimentWork.transitionStatus.working') },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: t('experimentWork.transitionStatus.completed') },
      on_hold: { color: 'warning', icon: <ExclamationCircleOutlined />, text: t('experimentWork.transitionStatus.onHold') },
      issue: { color: 'error', icon: <ExclamationCircleOutlined />, text: t('experimentWork.transitionStatus.issue') }
    };

    const config = statusConfig[status] || statusConfig.not_started;
    return (
      <Tag icon={config.icon} color={config.color} style={{ margin: 0 }}>
        {config.text}
      </Tag>
    );
  };

  // 險倬鹸繝懊ち繝ｳ繧ｯ繝ｪ繝・け繝上Φ繝峨Λ - 逶ｴ謗･繝・・繧ｿ險倬鹸繝｢繝ｼ繝繝ｫ繧帝幕縺・
  const handleRecord = (transition: Transition) => {
    setSelectedTransition(transition);
    setDataRecordModalOpen(true);
  };

  // 蝠城｡悟ｱ蜻翫・繧ｿ繝ｳ繧ｯ繝ｪ繝・け繝上Φ繝峨Λ
  const handleIssueReport = async (transition: Transition) => {
    setSelectedTransition(transition);
    setIssues([]);
    setIssueModalOpen(true);

    // selectedTaskId 縺九ｉ taskNo 繧呈歓蜃ｺ・亥ｽ｢蠑・ {projectId}-{methodId}-{taskNo}・・
    // projectId 縺ｯ UUID・医ワ繧､繝輔Φ蜷ｫ繧・峨・縺溘ａ split('-') 縺ｮ譛ｫ蟆ｾ隕∫ｴ繧貞叙蠕励☆繧・
    const parts = (selectedTaskId ?? '').split('-');
    const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

    if (!projectId || !methodId || !selectedTaskId || isNaN(taskNo)) {
      console.warn('[handleIssueReport] 蠢・ｦ√↑繝代Λ繝｡繝ｼ繧ｿ縺御ｸ崎ｶｳ縺励※縺・∪縺・, {
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
      console.error('[handleIssueReport] 蝠城｡御ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ', error);
      message.error(extractErrorMessage(error));
    } finally {
      setIssueLoading(false);
    }
  };

  // 蝠城｡悟ｱ蜻翫Δ繝ｼ繝繝ｫ繧帝哩縺倥ｋ
  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setSelectedTransition(null);
  };

  // 譁ｰ隕丞撫鬘悟ｱ蜻企∽ｿ｡繝上Φ繝峨Λ
  const handleSubmitIssue = async (issue: IssueReportFormData) => {
    // selectedTaskId 縺九ｉ taskNo 繧呈歓蜃ｺ・亥ｽ｢蠑・ {projectId}-{methodId}-{taskNo}・・
    // projectId 縺ｯ UUID・医ワ繧､繝輔Φ蜷ｫ繧・峨・縺溘ａ split('-') 縺ｮ譛ｫ蟆ｾ隕∫ｴ繧貞叙蠕励☆繧・
    const parts = (selectedTaskId ?? '').split('-');
    const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

    if (!projectId) {
      console.warn('[handleSubmitIssue] projectId 縺梧悴險ｭ螳壹〒縺・);
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

      // 蝠城｡御ｸ隕ｧ繧貞・蜿門ｾ励＠縺ｦ譛譁ｰ迥ｶ諷九ｒ蜿肴丐
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
          console.error('[handleSubmitIssue] 蝠城｡御ｸ隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ', fetchError);
          // 蜀榊叙蠕怜､ｱ謨励・繧ｵ繧､繝ｬ繝ｳ繝医↓蜃ｦ逅・ｼ亥ｱ蜻願・菴薙・謌仙粥縺励※縺・ｋ縺溘ａ・・
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitIssue] 蝠城｡悟ｱ蜻翫お繝ｩ繝ｼ', error);
      message.error(extractErrorMessage(error));
    }
  };

  // 繧ｳ繝｡繝ｳ繝磯∽ｿ｡繝上Φ繝峨Λ
  const handleSubmitComment = async (issueId: string, comment: string) => {
    if (!projectName) {
      console.warn('[handleSubmitComment] projectName 縺梧悴險ｭ螳壹〒縺・);
      message.error(t('project.selectProjectWarning'));
      return;
    }

    try {
      await addComment({
        projectName,
        issueId,
        comment,
      });

      // 繧ｳ繝｡繝ｳ繝域兜遞ｿ蠕後↓蝠城｡御ｸ隕ｧ繧貞・蜿門ｾ励＠縺ｦ陦ｨ遉ｺ縺ｫ蜿肴丐
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
          console.error('[handleSubmitComment] 蝠城｡御ｸ隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ', fetchError);
          // 蜀榊叙蠕怜､ｱ謨励・繧ｵ繧､繝ｬ繝ｳ繝医↓蜃ｦ逅・ｼ医さ繝｡繝ｳ繝域兜遞ｿ閾ｪ菴薙・謌仙粥縺励※縺・ｋ縺溘ａ・・
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitComment] 繧ｳ繝｡繝ｳ繝域兜遞ｿ繧ｨ繝ｩ繝ｼ', error);
      message.error(extractErrorMessage(error));
    }
  };

  // 繧ｹ繝・・繧ｿ繧ｹ螟画峩繝上Φ繝峨Λ
  const handleUpdateStatus = async (issueId: string, status: Issue['status']) => {
    if (!projectName) {
      console.warn('[handleUpdateStatus] projectName 縺梧悴險ｭ螳壹〒縺・);
      message.error(t('project.selectProjectWarning'));
      return;
    }

    try {
      await updateIssueStatus({
        projectName,
        issueId,
        status,
      });

      // 繧ｹ繝・・繧ｿ繧ｹ譖ｴ譁ｰ蠕後↓蝠城｡御ｸ隕ｧ繧貞・蜿門ｾ励＠縺ｦ陦ｨ遉ｺ縺ｫ蜿肴丐
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
          console.error('[handleUpdateStatus] 蝠城｡御ｸ隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ', fetchError);
          // 蜀榊叙蠕怜､ｱ謨励・繧ｵ繧､繝ｬ繝ｳ繝医↓蜃ｦ逅・ｼ医せ繝・・繧ｿ繧ｹ譖ｴ譁ｰ閾ｪ菴薙・謌仙粥縺励※縺・ｋ縺溘ａ・・
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleUpdateStatus] 繧ｹ繝・・繧ｿ繧ｹ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ', error);
      message.error(extractErrorMessage(error));
    }
  };

  // 繝・・繝悶Ν縺ｮ蛻怜ｮ夂ｾｩ
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
          // 繝励Ο繧ｸ繧ｧ繧ｯ繝医・迥ｶ諷九′險倬鹸繧貞盾辣ｧ繝ｻ謫堺ｽ懷庄閭ｽ縺ｧ縺ｪ縺・ｴ蜷医・髱樊ｴｻ諤ｧ蛹・
          // waiting_task / executing_task / waiting_approval 縺ｮ蝣ｴ蜷医↓豢ｻ諤ｧ
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
        {/* 邨槭ｊ霎ｼ縺ｿUI */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }} data-testid="transition-list-filter-row">
          <Col xs={24} sm={12} md={12}>
            <Input
              placeholder={t('experimentWork.table.transitionName') + '縲・ + t('experimentWork.table.description') + t('common.searchJoiner') + '...'}
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
        
        {/* 繝・・繝悶Ν */}
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

      {/* 繝・・繧ｿ險倬鹸繝｢繝ｼ繝繝ｫ */}
      {dataRecordModalOpen && (
        <ExperimentRecordDialog
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

      {/* 蝠城｡檎ｮ｡逅・Δ繝ｼ繝繝ｫ */}
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
