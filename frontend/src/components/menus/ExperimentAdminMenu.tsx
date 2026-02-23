'use client';

import React, { useState } from 'react';
import { Layout, Card, Typography, theme } from 'antd';
import {
  LineChartOutlined,
  FileTextOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { MenuType } from '@/types/auth';
import ProjectManagement from '../project/ProjectManagement';
import FormatManagement from '../project/FormatManagement';
import ProgressMonitoring from '../progress/ProgressMonitoring';
import PetriNetEditorScreen from '../editorv2/PetriNetEditorScreen';
import { User } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import { ProjectEditParams } from '@/types/project';

const { Content } = Layout;
const { Title, Text } = Typography;

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
  const [editorProjectParams, setEditorProjectParams] = useState<ProjectEditParams | null>(null);

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
  const handleEditProject = (params: ProjectEditParams) => {
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

  const currentTabLabel = tabItems.find(item => item.key === currentTab)?.label || '';

  // タブ '1', '2', '3' は全幅表示
  const isFullWidthTab = currentTab === '1' || currentTab === '2' || currentTab === '3';

  // Header(64px) + SubHeader(タブ込みで約76px) = 140px
  const HEADER_HEIGHT = 64;
  const SUBHEADER_HEIGHT = 76;
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT;

  // Phase 6追加: エディタ表示時は専用画面を表示
  if (showEditor && editorProjectParams) {
    return (
      <PetriNetEditorScreen
        projectId={editorProjectParams.projectId}
        projectName={editorProjectParams.projectName}
        projectOverview={editorProjectParams.projectOverview}
        onClose={handleCloseEditor}
        sourceS3Key={editorProjectParams.sourceS3Key}
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
          padding: isFullWidthTab ? 0 : token.paddingLG,
          height: isFullWidthTab ? `calc(100vh - ${TOTAL_HEADER_HEIGHT}px)` : 'auto',
          overflow: isFullWidthTab ? 'hidden' : 'auto',
        }}
      >
        {currentTab === '1' ? (
          // プロジェクト管理: 全幅表示
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <ProjectManagement onEdit={handleEditProject} />
          </div>
        ) : currentTab === '2' ? (
          // フォーマット管理: 全幅表示
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <FormatManagement user={user} />
          </div>
        ) : currentTab === '3' ? (
          // 進捗確認: 全幅表示
          <div style={{ height: '100%', overflow: 'auto' }}>
            <ProgressMonitoring />
          </div>
        ) : (
          // その他のタブ: カード内に表示
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Card
              style={{
                minHeight: 400,
              }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG }}>
                {currentTabLabel}
              </Title>
              <Text type="secondary">
                {t('content.notImplemented') || 'コンテンツエリア（未実装）'}
              </Text>
            </Card>
          </div>
        )}
      </Content>
    </Layout>
  );
}
