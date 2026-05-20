'use client';

import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import {
  LineChartOutlined,
  FileTextOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { MenuType } from '@/types/auth';
import ProjectManagement from '../project/ProjectManagement';
import WorkerScreenOverlay from '../project/WorkerScreenOverlay';
import FormatManagement from '../format/FormatManagement';
import ProgressMonitoring from '../progress/ProgressMonitoring';
import PetriNetEditorScreen from '../editorv2/PetriNetEditorScreen';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import type { MaimlEditorParams } from '@/types/maimlEditor';

const { Content } = Layout;

/**
 * 実験管理者メニューのProps
 */
interface ExperimentAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}

/**
 * 実験管理者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentAdminMenu({ 
  user, 
  onLogout, 
  onNavigate, 
  onMenuChange 
}: ExperimentAdminMenuProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('1');
  
  // localStorageからpermissionsを取得（userInfo経由）
  const permissions = getPermissionsFromToken();
  
  // Phase 6追加: エディタ表示用のステート
  const [showEditor, setShowEditor] = useState(false);
  const [editorProjectParams, setEditorProjectParams] = useState<MaimlEditorParams | null>(null);

  // 作業者画面オーバーレイのステート
  const [workerOverlayOpen, setWorkerOverlayOpen] = useState(false);
  const [workerOverlayProjectId, setWorkerOverlayProjectId] = useState<string | undefined>(undefined);
  const [workerOverlayProjectName, setWorkerOverlayProjectName] = useState<string | undefined>(undefined);

  // 作業者画面オーバーレイを開くハンドラー
  const handleOpenWorkerScreen = (projectId: string, projectName: string) => {
    setWorkerOverlayProjectId(projectId);
    setWorkerOverlayProjectName(projectName);
    setWorkerOverlayOpen(true);
  };

  // 作業者画面オーバーレイを閉じるハンドラー
  const handleCloseWorkerScreen = () => {
    setWorkerOverlayOpen(false);
  };

  const tabItems = [
    {
      key: '1',
      label: t('menu.experiment_admin.tabs.projectManagement') || 'プロジェクト管理',
      icon: <FolderAddOutlined />,
    },
    {
      key: '2',
      label: t('menu.experiment_admin.tabs.formatManagement') || 'フォーマット管理',
      icon: <FileTextOutlined />,
    },
    {
      key: '3',
      label: t('menu.experiment_admin.tabs.progressMonitoring') || '進捗確認',
      icon: <LineChartOutlined />,
    },
  ];

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
  };

  const handleMenuChange = (menuType: MenuType) => {
    if (onMenuChange) {
      onMenuChange(menuType);
    }
  };

  // Phase 6追加: 編集画面表示ハンドラー
  const handleEditProject = (params: MaimlEditorParams) => {
    console.log('✏️ [ExperimentAdminMenu] Edit project:', params);
    setEditorProjectParams(params);
    setShowEditor(true);
  };

  // Phase 6追加: 編集画面を閉じるハンドラー
  const handleCloseEditor = () => {
    console.log('🔙 [ExperimentAdminMenu] Close editor');
    setShowEditor(false);
    setEditorProjectParams(null);
  };

  // Header(64px) + SubHeader(タブ込みで約76px) = 140px
  const HEADER_HEIGHT = 64;
  const SUBHEADER_HEIGHT = 76;
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT;

  // Phase 6追加: エディタ表示時は専用画面を表示
  if (showEditor && editorProjectParams) {
    return (
      <PetriNetEditorScreen
        params={editorProjectParams}
        onClose={handleCloseEditor}
      />
    );
  }

  // 通常の管理画面
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader 
        title={t('menu.experiment_admin.title') || '実験管理'}
        tabs={tabItems}
        activeTabKey={currentTab}
        onTabChange={handleTabChange}
        currentMenu="experiment_admin"
        onMenuChange={handleMenuChange}
        userPermissions={permissions}
      />

      {/* コンテンツエリア */}
      <Content
        style={{
          marginTop: TOTAL_HEADER_HEIGHT,
          padding: 0,
          height: `calc(100vh - ${TOTAL_HEADER_HEIGHT}px)`,
          overflow: 'hidden',
        }}
      >
        {/* タブ1: プロジェクト管理 - display:none でマウント維持し state を保持 */}
        <div style={{ display: currentTab === '1' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
          <ProjectManagement
            onEdit={handleEditProject}
            onOpenWorkerScreen={handleOpenWorkerScreen}
          />
        </div>

        {/* タブ2: フォーマット管理 - display:none でマウント維持し state を保持 */}
        <div style={{ display: currentTab === '2' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
          <FormatManagement user={user} />
        </div>

        {/* タブ3: 進捗確認 - display:none でマウント維持し state を保持 */}
        <div style={{ display: currentTab === '3' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
          <ProgressMonitoring />
        </div>
      </Content>
      {/* 作業者画面オーバーレイ */}
      <WorkerScreenOverlay
        open={workerOverlayOpen}
        onClose={handleCloseWorkerScreen}
        user={user}
        fixedProjectId={workerOverlayProjectId}
        fixedProjectName={workerOverlayProjectName}
      />
    </Layout>
  );
}
