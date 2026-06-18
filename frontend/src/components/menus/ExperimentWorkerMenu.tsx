'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Space, Button, Tabs, theme, Select, App, Spin } from 'antd';
import {
  FormOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  CheckOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User, MenuType } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import { useInstructions } from '@/hooks/useInstructions';
import { useExpandState } from '@/hooks/useExpandState';
import WorkRecordPanel from '../ExperimentWorker/WorkRecordPanel';
import ProgressOverviewTab from '../ExperimentWorker/ProgressOverviewTab';
import type { ProgressRow } from '../ExperimentWorker/ProgressOverviewTab';
import ProjectSelectionModal from '../ExperimentWorker/ProjectSelectionModal';
import type { WorkerProject } from '@/types/project';
import { getWorkerAccessibleProjects, requestApproval } from '@/services/projectApiService';
import { useCodeMaster } from '@/hooks/useCodeMaster';
import { AxiosError } from 'axios';
import { extractErrorMessage } from '@/utils/errorUtils';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { mapErrorToMessage } from '@/utils/errorUtils';

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
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('new');
  const [dialogOpen, setDialogOpen] = useState(false);
  /** 問題報告モーダル（フェーズB: IssueManagementModal を接続） */
  const [issueModalOpen, setIssueModalOpen] = useState(false);
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
    handleProjectChange: originalHandleProjectChange,
  } = useInstructions();


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

  // タスクステータス変更後にプロジェクト一覧を再取得するハンドラー
  // ProgressCheckTabで実験開始・強制終了が成功したときに呼び出される。
  // プロジェクトステータスが変化するため、指示確認・実験記録タブのボタン活性状態を即座に更新する。
  const handleTaskStatusChanged = async () => {
    try {
      const result = await getWorkerAccessibleProjects();
      if (result.success && result.data) {
        setProjects(result.data.projects);
      }
    } catch (error) {
      console.error('プロジェクト一覧再取得エラー（タスクステータス変更後）:', error);
    }
  };

  // ━━━ スキップ状態の管理 ━━━
  // フェーズB: WorkRecordPanel の onSkip コールバックで更新する
  const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);

  // フェーズB: WorkRecordPanel の onSkip コールバックから呼び出す
  // const handleTransitionSkipped = (transitionId: string) => {
  //   setSkippedTransitionIds((prev) =>
  //     prev.includes(transitionId) ? prev : [...prev, transitionId]
  //   );
  // };

  const handleTransitionResumed = (transitionId: string) => {
    setSkippedTransitionIds((prev) => prev.filter((id) => id !== transitionId));
  };

  // ━━━ フェーズA: ProgressOverviewTab 用モックデータ ━━━
  // フェーズBで API から取得したデータに置き換える
  //
  // 構造の前提:
  //   - タスクは同一 MAIML ファイルを繰り返す → 全タスクが同じ methodId・transitionId を持つ
  //   - prerequisiteTransitionIds はトランジション自体の属性（MAIML 定義）であり、タスク横断で共通
  //   - isSkipped は UI 側で管理し、skippedTransitionIds と同期
  //   - prerequisiteTransitionIds は「直接の依存先のみ」を格納する（推移的依存は格納しない）
  //
  // モック構成: タスク1〜3、各タスクにトランジション A〜E の5本
  //   依存グラフ:
  //     TR_A（材料準備A）─┐
  //                       ├─→ TR_C（混合）─→ TR_D（加熱）─→ TR_E（測定）
  //     TR_B（材料準備B）─┘
  //
  //   - TR_A: prereqs=[]     （独立・並列実行可能）
  //   - TR_B: prereqs=[]     （独立・並列実行可能）
  //   - TR_C: prereqs=[A, B] （A・B 両方完了後に開始可能）← 直接依存のみ
  //   - TR_D: prereqs=[C]    （C 完了後に開始可能）← 直接依存のみ
  //   - TR_E: prereqs=[D]    （D 完了後に開始可能）← 直接依存のみ
  //
  // スキップシナリオ例（タスク2）:
  //   TR_A は材料待ちでスキップ → TR_B を先に完了
  //   → 後で TR_A に戻って完了 → A/B 完了で TR_C が開始可能に
  //   → TR_C → TR_D → TR_E と順次進行
  const MOCK_METHOD_ID = 'method_SampleSynthesis_a1b2c3d4';
  const MOCK_TR_A = 'transition-1781057805603'; // 材料準備A（prereqs=[]）
  const MOCK_TR_B = 'transition-1781057812047'; // 材料準備B（prereqs=[]）
  const MOCK_TR_C = 'transition-1781057819834'; // 混合（prereqs=[A, B]）
  const MOCK_TR_D = 'transition-1781057826501'; // 加熱（prereqs=[C]）
  const MOCK_TR_E = 'transition-1781057833218'; // 測定（prereqs=[D]）

  // 各トランジションの直接依存（直前のトランジションIDのみ）
  const MOCK_TR_C_PREREQS = [MOCK_TR_A, MOCK_TR_B]; // 混合: A・B 両方完了後
  const MOCK_TR_D_PREREQS = [MOCK_TR_C];             // 加熱: 混合完了後
  const MOCK_TR_E_PREREQS = [MOCK_TR_D];             // 測定: 加熱完了後

  const mockProgressRows: ProgressRow[] = selectedProject
    ? [
        // ─── タスク1（全完了済み）────────────────────────────
        { rowKey: `1-${MOCK_TR_A}`, taskNo: 1, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_A, status: 'completed',   hasRecord: true,  order: 1, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_A) },
        { rowKey: `1-${MOCK_TR_B}`, taskNo: 1, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_B, status: 'completed',   hasRecord: true,  order: 2, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_B) },
        { rowKey: `1-${MOCK_TR_C}`, taskNo: 1, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_C, status: 'completed',   hasRecord: true,  order: 3, prerequisiteTransitionIds: MOCK_TR_C_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_C) },
        { rowKey: `1-${MOCK_TR_D}`, taskNo: 1, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_D, status: 'completed',   hasRecord: true,  order: 4, prerequisiteTransitionIds: MOCK_TR_D_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_D) },
        { rowKey: `1-${MOCK_TR_E}`, taskNo: 1, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_E, status: 'completed',   hasRecord: true,  order: 5, prerequisiteTransitionIds: MOCK_TR_E_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_E) },
        // ─── タスク2（TR_B 完了・TR_A 作業中: スキップ可能なシナリオ）
        //   材料準備B は完了、材料準備A は材料待ちで作業中
        //   → TR_A をスキップして TR_B を先に完了済み
        //   → TR_A に戻って完了させれば TR_C（混合）が開始可能に
        { rowKey: `2-${MOCK_TR_A}`, taskNo: 2, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_A, status: 'in_progress', hasRecord: false, order: 1, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_A) },
        { rowKey: `2-${MOCK_TR_B}`, taskNo: 2, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_B, status: 'completed',   hasRecord: true,  order: 2, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_B) },
        { rowKey: `2-${MOCK_TR_C}`, taskNo: 2, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_C, status: 'not_started', hasRecord: false, order: 3, prerequisiteTransitionIds: MOCK_TR_C_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_C) },
        { rowKey: `2-${MOCK_TR_D}`, taskNo: 2, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_D, status: 'not_started', hasRecord: false, order: 4, prerequisiteTransitionIds: MOCK_TR_D_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_D) },
        { rowKey: `2-${MOCK_TR_E}`, taskNo: 2, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_E, status: 'not_started', hasRecord: false, order: 5, prerequisiteTransitionIds: MOCK_TR_E_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_E) },
        // ─── タスク3（全未着手）──────────────────────────────
        { rowKey: `3-${MOCK_TR_A}`, taskNo: 3, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_A, status: 'not_started', hasRecord: false, order: 1, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_A) },
        { rowKey: `3-${MOCK_TR_B}`, taskNo: 3, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_B, status: 'not_started', hasRecord: false, order: 2, prerequisiteTransitionIds: [],              isSkipped: skippedTransitionIds.includes(MOCK_TR_B) },
        { rowKey: `3-${MOCK_TR_C}`, taskNo: 3, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_C, status: 'not_started', hasRecord: false, order: 3, prerequisiteTransitionIds: MOCK_TR_C_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_C) },
        { rowKey: `3-${MOCK_TR_D}`, taskNo: 3, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_D, status: 'not_started', hasRecord: false, order: 4, prerequisiteTransitionIds: MOCK_TR_D_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_D) },
        { rowKey: `3-${MOCK_TR_E}`, taskNo: 3, methodId: MOCK_METHOD_ID, transitionId: MOCK_TR_E, status: 'not_started', hasRecord: false, order: 5, prerequisiteTransitionIds: MOCK_TR_E_PREREQS, isSkipped: skippedTransitionIds.includes(MOCK_TR_E) },
      ]
    : [];

  // タブアイテムの定義（リデザイン後: 作業記録 / 全体進捗 の2タブ）
  const tabItems = [
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
      children: (
        <div style={{ padding: 12, height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <WorkRecordPanel />
        </div>
      ),
    },
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.progressCheck'),
      icon: <CheckSquareOutlined />,
      children: (
        <ProgressOverviewTab
          rows={mockProgressRows}
          onGoToWork={(taskNo, transitionId) => {
            // 作業へ: スキップ中だった場合は解除してから作業記録タブに遷移
            console.info('[ProgressOverviewTab] 作業へ:', taskNo, transitionId);
            handleTransitionResumed(transitionId);
            handleTabChange('3');
          }}
          onViewDetail={(taskNo, transitionId) => {
            console.info('[ProgressOverviewTab] 詳細確認:', taskNo, transitionId);
            handleTabChange('3');
          }}
          onStartWork={(taskNo, transitionId) => {
            // 開始: 未着手トランジションをスキップ解除（念のため）してから作業記録タブに遷移
            console.info('[ProgressOverviewTab] 開始:', taskNo, transitionId);
            handleTransitionResumed(transitionId);
            handleTabChange('3');
          }}
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

          {/* 問題報告ボタン（フェーズB: IssueManagementModal に接続） */}
          <Button
            danger
            type="default"
            icon={<ExclamationCircleOutlined />}
            size="large"
            disabled={!selectedProject || selectedProject === ''}
            onClick={() => setIssueModalOpen(true)}
          >
            問題報告
          </Button>
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
