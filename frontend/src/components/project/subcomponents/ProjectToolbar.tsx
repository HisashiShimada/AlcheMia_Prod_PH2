'use client';

import React from 'react';
import { Card, Input, Button, Select, Space, Typography, theme } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface ProjectToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  groupFilter: string;
  setGroupFilter: (v: string) => void;
  checkoutFilter: string;
  setCheckoutFilter: (v: string) => void;
  projectStatusFilter: string;
  setProjectStatusFilter: (v: string) => void;
  visibleGroups: Array<{ cd: string; name: string; isActive: boolean }>;
  isReloadingProject: boolean;
  onCreateProject: () => void;
  onReload: () => void;
  onSemanticSearch: () => void;
}

const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
  searchQuery, setSearchQuery, ownerFilter, setOwnerFilter,
  groupFilter, setGroupFilter, checkoutFilter, setCheckoutFilter,
  projectStatusFilter, setProjectStatusFilter, visibleGroups,
  isReloadingProject, onCreateProject, onReload, onSemanticSearch,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, borderRadius: 0 }}
      styles={{ body: { padding: `${token.margin}px ${token.paddingLG}px` } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Space orientation="horizontal" size="small" wrap>
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{t('projectManagement.filter_labels.owner')}</Text>
            <Select style={{ width: 150 }} value={ownerFilter} onChange={setOwnerFilter}
              options={[{ value: 'my_only', label: t('projectManagement.my_only') }, { value: 'all', label: t('projectManagement.all_projects') }]}
            />
          </Space>
          {visibleGroups.length > 0 && (
            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{t('projectManagement.filter_labels.organization_group')}</Text>
              <Select style={{ width: 180 }} value={groupFilter} onChange={setGroupFilter} data-testid="group-filter"
                options={[{ value: 'all', label: t('projectManagement.all') }, ...visibleGroups.map((g) => ({ value: g.cd, label: g.isActive ? g.name : `${g.name}${t('projectManagement.inactiveGroupSuffix')}` }))]}
              />
            </Space>
          )}
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{t('projectManagement.filter_labels.project_status')}</Text>
            <Select style={{ width: 200 }} value={projectStatusFilter} onChange={setProjectStatusFilter} data-testid="project-status-filter"
              options={[
                { value: 'all', label: t('projectManagement.all') },
                { value: '0', label: t('projectManagement.status_planning') },
                { value: '1', label: t('projectManagement.status_pending') },
                { value: '2', label: t('projectManagement.status_in_progress') },
                { value: '3', label: t('projectManagement.status_review_waiting') },
                { value: '4', label: t('projectManagement.status_completed') },
                { value: '5', label: t('projectManagement.status_error') },
                { value: '6', label: t('projectManagement.status_review_rejected') },
              ]}
            />
          </Space>
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{t('projectManagement.filter_labels.checkout_status')}</Text>
            <Select style={{ width: 150 }} value={checkoutFilter} onChange={setCheckoutFilter} data-testid="checkout-status-filter"
              options={[{ value: 'all', label: t('projectManagement.all') }, { value: 'checked_in', label: t('projectManagement.checked_in') }, { value: 'checked_out', label: t('projectManagement.checked_out') }]}
            />
          </Space>
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{t('projectManagement.filter_labels.search')}</Text>
            <Input prefix={<SearchOutlined />} placeholder={t('projectManagement.filter_placeholder')} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 250 }} allowClear data-testid="project-search-input"
            />
          </Space>
        </Space>
        <Space size="small">
          <Button type="primary" icon={<PlusOutlined />} style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }} onClick={onCreateProject} data-testid="create-project-button">
            {t('projectManagement.new_project')}
          </Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={onReload} loading={isReloadingProject} disabled={isReloadingProject}>
            {isReloadingProject ? t('common.reloading') : t('common.reload')}
          </Button>
          <Button icon={<SearchOutlined />} onClick={onSemanticSearch}>{t('projectManagement.transitionSearch')}</Button>
        </Space>
      </div>
    </Card>
  );
};

export default ProjectToolbar;
