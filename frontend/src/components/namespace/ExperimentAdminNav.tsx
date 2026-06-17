'use client';

import React from 'react';
import {
  FolderAddOutlined,
  FileTextOutlined,
  LineChartOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import type { User } from '@/types/auth';

export type ExperimentAdminNavTab = 'project' | 'format' | 'progress' | 'namespace' | null;

interface ExperimentAdminNavProps {
  activeTab?: ExperimentAdminNavTab;
}

/** モックユーザー（名前空間画面はスタンドアロンのためダミーを使用） */
const MOCK_USER: User = {
  id: 'mock-user',
  username: 'demo',
  displayName: 'デモユーザー',
  roleName: '実験管理者',
  organizationName: 'CorpA',
  roleCd: '3',
  organizationId: 'org-demo',
  email: 'demo@example.com',
  departmentCd: '',
  initialScreenFunctionCd: '',
};

const TAB_ITEMS = [
  {
    key: 'project',
    label: 'プロジェクト管理',
    icon: <FolderAddOutlined />,
  },
  {
    key: 'format',
    label: 'フォーマット管理',
    icon: <FileTextOutlined />,
  },
  {
    key: 'progress',
    label: '進捗確認',
    icon: <LineChartOutlined />,
  },
  {
    key: 'namespace',
    label: '名前空間',
    icon: <GlobalOutlined />,
  },
];

/**
 * 実験管理者メニュー共通ナビゲーションバー
 * 名前空間管理・MaiMLファイルエディター画面の上部に表示
 * Header（64px）+ SubHeader（76px）で既存メニューと同一レイアウト
 */
const ExperimentAdminNav: React.FC<ExperimentAdminNavProps> = ({ activeTab }) => {
  const router = useRouter();

  const handleTabChange = (key: string) => {
    if (key === 'namespace') {
      router.push('/namespace-management');
    }
    // project / format / progress は本画面外のためモック（何もしない）
  };

  return (
    <>
      <Header user={MOCK_USER} onLogout={() => {}} />
      <SubHeader
        title="実験管理"
        tabs={TAB_ITEMS}
        activeTabKey={activeTab ?? undefined}
        onTabChange={handleTabChange}
        currentMenu="experiment_admin"
      />
    </>
  );
};

export default ExperimentAdminNav;
