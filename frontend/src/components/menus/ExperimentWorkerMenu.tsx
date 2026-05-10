'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Space, Button, Tabs, theme, Select, App, Spin } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  ToolOutlined,
  CheckOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User, MenuType } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import { useInstructions } from '@/hooks/useInstructions';
import { useExpandState } from '@/hooks/useExpandState';
import InstructionConfirmationTab from '../ExperimentWorker/InstructionConfirmationTab';
import ExperimentRecordTab from '../ExperimentWorker/ExperimentRecordTab';
import ProgressCheckTab from '../ExperimentWorker/ProgressCheckTab';
import ProjectSelectionModal from '../ExperimentWorker/ProjectSelectionModal';
import { getWorkerAccessibleProjects, requestApproval, type WorkerProject } from '@/services/projectApiService';
import { useCodeMaster } from '@/hooks/useCodeMaster';
import { AxiosError } from 'axios';
import { extractErrorMessage } from '@/utils/errorUtils';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { mapErrorToMessage } from '@/utils/errorMapper';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * レイアウト定数（UIポリシー準拠）
 */
const HEADER_HEIGHT = 64;      // UIポリシー: Header高さ 64px
const SUBHEADER_HEIGHT = 48;   // UIポリシー: SubHeader高さ 48px（タブなし）
const SELECTION_AREA_HEIGHT = 56; // プロジェクト・メソッド選択エリア高さ
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT; // 合計 112px

/**
 * レスポンシブコンテナ（UIポリシー準拠）
 * ブレークポイント:
 * - xs, sm (< 768px): 100% 幅
 * - md (768px+): 最大768px
 * - lg (992px+): 最大992px
 * - xl (1200px+): 最大1200px
 * - xxl (1600px+): 最大1400px
 */
const ResponsiveContainer = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 0 8px;

  @media (min-width: 768px) {
    max-width: 768px;
    padding: 0 16px;
  }

  @media (min-width: 992px) {
    max-width: 992px;
  }

  @media (min-width: 1200px) {
    max-width: 1200px;
  }

  @media (min-width: 1600px) {
    max-width: 1400px;
  }
`;

/**
 * 実験作業者メニューのProps
 */
interface ExperimentWorkerMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
  /** true のとき Header/SubHeader を非表示にしてコンテンツのみ表示 */
  overlayMode?: boolean;
  /** 固定するプロジェクトID（指定時はプロジェクト選択を disabled にして初期選択） */
  fixedProjectId?: string;
  /** true のとき操作ボタン（選択・承認依頼）を disabled にする */
  readOnly?: boolean;
}

/**
 * 実験作業者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentWorkerMenu({
  user,
  onLogout,
  onNavigate,
  onMenuChange,
  overlayMode = false,
  fixedProjectId,
  readOnly = false,
}: ExperimentWorkerMenuProps) {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('4');
  const [isClient, setIsClient] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('new');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');

  // プロジェクト一覧の状態管理
  const [projects, setProjects] = useState<WorkerProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // コードマスタ: プロジェクトステータス
  const { options: projectStatusOptions } = useCodeMaster('project_status');

  // localStorageからpermissionsを取得（userInfo経由）
  const permissions = getPermissionsFromToken();

  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        const result = await getWorkerAccessibleProjects();
        if (result.success && result.data) {
          setProjects(result.data.projects);
        } else if (!result.success) {
          message.error(mapErrorToMessage(result.error?.code ?? '') || extractErrorMessage(null));
        }
      } catch (error) {
        console.error('プロジェクト一覧取得エラー:', error);
        message.error(extractErrorMessage(error));
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 承認依頼ハンドラー
  const handleApprovalRequest = async () => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    // 選択されたプロジェクトの情報を取得
    const selectedProjectData = projects.find(p => p.projectId === selectedProject);
    if (!selectedProjectData) {
      message.error(t('project.infoNotFound'));
      return;
    }

    setApprovalLoading(true);
    try {
      const result = await requestApproval(selectedProjectData.projectId);
      if (result.success) {
        message.success(t('worker.approvalRequestSent'));
      } else {
        message.error(mapErrorToMessage(result.error?.code ?? '') || extractErrorMessage(null));
      }
    } catch (error) {
      console.error('Approval request error:', error);
      const axiosError = error as AxiosError<{ error: { code: string; message: string } }>;
      
      if (axiosError.response?.status === HTTP_STATUS.CONFLICT) {
        message.error(t('worker.approvalRequestAlreadySent'));
      } else if (axiosError.response?.status === HTTP_STATUS.NOT_FOUND) {
        message.error(t('project.notFound'));
      } else {
        message.error(extractErrorMessage(error));
      }
    } finally {
      // 承認依頼の成功・失敗に関わらず、プロジェクト一覧を再取得してステータスを最新化する
      // （承認依頼が成功した場合: project_status が 3（タスク結果レビュー待ち）に更新される）
      // （409 Conflict の場合: 既に承認待ち状態のため再取得で最新ステータスを反映）
      try {
        const projectsResult = await getWorkerAccessibleProjects();
        if (projectsResult.success && projectsResult.data) {
          setProjects(projectsResult.data.projects);
        }
      } catch (fetchError) {
        console.error('プロジェクト一覧再取得エラー:', fetchError);
      }
      setApprovalLoading(false);
    }
  };

  // カスタムフック
  const {
    selectedProject,
    sortedInstructions,
    stats,
    handleProjectChange: originalHandleProjectChange,
    refetchInstructions,
  } = useInstructions();

  const {
    expandedGroups,
    toggleGroup,
  } = useExpandState();

  // クライアント側フラグ（ハイドレーションエラー防止）
  useEffect(() => {
    setIsClient(true);
  }, []);

  // overlayMode: fixedProjectId が指定されたら初期選択として設定
  useEffect(() => {
    if (fixedProjectId && projects.length > 0) {
      const project = projects.find(p => p.projectId === fixedProjectId);
      if (project) {
        handleProjectChange(fixedProjectId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedProjectId, projects]);

  // プロジェクト変更時のハンドラー（メソッドとタスクをリセット）
  const handleProjectChange = (value: string | undefined | null) => {
    // undefined/nullは空文字列として扱う
    const projectValue = value || '';
    
    // プロジェクト名を取得
    let projectName = '';
    if (projectValue) {
      const selectedProjectData = projects.find(p => p.projectId === projectValue);
      projectName = selectedProjectData?.projectName || '';
      setSelectedProjectName(projectName);
    } else {
      setSelectedProjectName('');
    }
    
    // useInstructionsフック（指示一覧取得）にprojectIdを渡す
    originalHandleProjectChange(projectValue);
    
    // プロジェクトが変更された場合、メソッドとタスクをリセット
    setSelectedMethodId(null);
    setSelectedTaskId('');
  };

  // メソッド選択ハンドラー（タスクをリセット）
  const handleSelectMethod = (methodId: string | null) => {
    // メソッドが実際に変更された場合のみタスクをリセット
    if (methodId !== selectedMethodId) {
      setSelectedTaskId('');
    }
    setSelectedMethodId(methodId);
  };

  // タスク選択ハンドラー
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  // タスク発行時のハンドラー
  const handleTaskCreated = (newTaskId: string) => {
    setSelectedTaskId(newTaskId);
  };

  // タスク選択とタブ切り替えを同時に実行するハンドラー
  const handleSelectTaskAndTab = (taskId: string, tabKey: string, methodId?: string) => {
    // methodId が渡された場合はメソッドも選択する
    if (methodId) {
      setSelectedMethodId(methodId);
    }
    // タスクを選択
    setSelectedTaskId(taskId);
    // タブを切り替え
    setCurrentTab(tabKey);
  };

  // 選択されたメソッドを取得
  // TODO: API化後、メソッド情報を取得するロジックを実装
  const selectedMethod = null;

  // 選択中プロジェクトのステータス（数値）を取得
  // worker-accessible APIのレスポンスから直接参照することで、不要なAPIコールを排除
  const selectedProjectStatus = projects.find(p => p.projectId === selectedProject)?.projectStatus ?? null;
  const selectedProjectUseDeemedProgress = projects.find(p => p.projectId === selectedProject)?.useDeemedProgress ?? true;

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
  };

  const handleMenuChange = (menuType: MenuType) => {
    if (onMenuChange) {
      onMenuChange(menuType);
    }
  };

  // 子コンポーネント用のプロジェクト変更ハンドラー（string型のみを受け取る）
  const handleProjectChangeForChild = (projectId: string) => {
    handleProjectChange(projectId);
  };

  // タブアイテムの定義
  const tabItems = [
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.progressCheck'),
      icon: <CheckSquareOutlined />,
      children: (
        <ProgressCheckTab
            selectedProject={selectedProject}
            selectedProjectName={selectedProjectName}
            onProjectChange={handleProjectChangeForChild}
            selectedMethodId={selectedMethodId}
            onSelectMethod={handleSelectMethod}
            onTabChange={handleTabChange}
            onSelectTaskAndTab={handleSelectTaskAndTab}
            readOnly={readOnly}
          />
      ),
    },
    {
      key: '2',
      label: t('menu.experiment_worker.tabs.workInstruction'),
      icon: <FileTextOutlined />,
      children: (
        <InstructionConfirmationTab
          selectedProject={selectedProject}
          onProjectChange={handleProjectChangeForChild}
          selectedMethodId={selectedMethodId}
          onSelectMethod={handleSelectMethod}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          sortedInstructions={sortedInstructions}
          stats={stats}
          isClient={isClient}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onInstructionsUpdated={refetchInstructions}
          readOnly={readOnly || (selectedProjectStatus !== null && selectedProjectStatus !== 1 && selectedProjectStatus !== 2)}
          projectStatusCode={selectedProjectStatus}
        />
      ),
    },
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
      children: (
        <ExperimentRecordTab
          selectedProject={selectedProject}
          selectedProjectName={selectedProjectName}
          onProjectChange={handleProjectChangeForChild}
          selectedMethodId={selectedMethodId}
          onSelectMethod={handleSelectMethod}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          onTaskCreated={handleTaskCreated}
          selectedMethod={selectedMethod}
          selectedProjectStatus={selectedProjectStatus}
          useDeemedProgress={selectedProjectUseDeemedProgress}
        />
      ),
    },
  ];

  /** コンテンツ部分（プロジェクト選択エリア + タブ） */
  const contentBody = (
    <div style={{ width: '100%', padding: 0 }}>
      {/* プロジェクト選択・選択ボタン */}
      <div style={{
        height: SELECTION_AREA_HEIGHT,
        marginBottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: token.marginXS,
        flexWrap: 'nowrap',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderLeft: 'none',
        borderRight: 'none',
        paddingLeft: token.paddingLG,
        paddingRight: token.paddingLG,
      }}>
        <Space size="middle" style={{ flex: '0 0 auto' }}>
          <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>{t('experimentWork.labels.project')}:</Text>
          <Select
            data-testid="project-select"
            value={selectedProject === '' ? undefined : selectedProject}
            placeholder="-"
            style={{ width: 280 }}
            onChange={handleProjectChange}
            loading={projectsLoading}
            /* overlayMode: fixedProjectId がある場合はプロジェクト変更不可 */
            disabled={projectsLoading || (overlayMode && !!fixedProjectId)}
            notFoundContent={projectsLoading ? <Spin size="small" /> : t('experimentWork.labels.noProjects')}
            options={[
              { value: '', label: '-' },
              ...projects.map((project) => {
                const statusLabel = projectStatusOptions.find(opt => String(opt.value) === String(project.projectStatus))?.label ?? String(project.projectStatus);
                return {
                  value: project.projectId,
                  label: `${project.projectName} - ${statusLabel}`
                };
              })
            ]}
            size="middle"
          />
          {/* 選択ボタン: readOnly時は disabled */}
          <Button
            data-testid="project-select-button"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => setDialogOpen(true)}
            size="large"
            disabled={readOnly}
          >
            {t('experimentWork.selectButton')}
          </Button>

          {/* 承認依頼ボタン（進捗確認タブ選択時のみ表示） */}
          {currentTab === '4' && (
            <Button
              type="default"
              onClick={handleApprovalRequest}
              size="large"
              /* readOnly時 or プロジェクト未選択時は disabled */
              disabled={readOnly || !selectedProject || selectedProject === '' || approvalLoading}
              loading={approvalLoading}
              icon={approvalLoading ? <LoadingOutlined /> : undefined}
            >
              {t('experimentWork.approvalRequest')}
            </Button>
          )}
        </Space>
      </div>

      {/* タブ */}
      <div style={{ borderRadius: 0 }}>
        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          style={{ marginBottom: 0 }}
          tabBarStyle={{
            padding: `0 ${token.paddingLG}px`,
            margin: 0,
            borderTop: `1px solid ${token.colorBorder}`,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: 0,
          }}
        />
      </div>

      {/* プロジェクト選択モーダル（readOnly時は不要だが、一応open=falseで無効化） */}
      <ProjectSelectionModal
        open={!readOnly && dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
        projects={projects}
        loading={projectsLoading}
      />
    </div>
  );

  // overlayMode のとき: Header/SubHeader なしでコンテンツのみ返す
  if (overlayMode) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: token.colorBgLayout }}>
        {contentBody}
      </div>
    );
  }

  // 通常モード: Header + SubHeader + Content で返す
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader
        title={t('menu.experiment_worker.title')}
        currentMenu="experiment_worker"
        onMenuChange={handleMenuChange}
        userPermissions={permissions}
      />
      <Content
        style={{
          marginTop: TOTAL_HEADER_HEIGHT,
          padding: 0,
        }}
      >
        {contentBody}
      </Content>
    </Layout>
  );
}
