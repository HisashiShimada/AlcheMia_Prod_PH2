'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Flex, theme, Spin, Alert } from 'antd';
import {
  UserOutlined,
  DesktopOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { getSystemOverview } from '../../services/systemOverviewApiService';
import { SystemOverviewData } from '../../types/systemOverview';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const SystemOverview: React.FC = () => {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [data, setData] = useState<SystemOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getSystemOverview();
        setData(result);
      } catch (err) {
        setError(extractErrorMessage(err, t('systemOverview.messages.fetchError')));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cardStyle: React.CSSProperties = {
    padding: 0,
    height: '100%',
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadow,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    marginBottom: token.marginMD,
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${token.paddingXS}px 0`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: token.fontSize,
    color: token.colorTextSecondary,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: token.fontSizeHeading5,
    fontWeight: token.fontWeightStrong,
    color: token.colorText,
  };

  if (loading) {
    return (
      <div style={{
        padding: token.paddingLG,
        background: token.colorBgLayout,
        minHeight: 'calc(100vh - 112px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        padding: token.paddingLG,
        background: token.colorBgLayout,
        minHeight: 'calc(100vh - 112px)',
      }}>
        <Alert
          type="error"
          title={t('systemOverview.errorTitle')}
          description={error || t('systemOverview.errorFallback')}
          showIcon
        />
      </div>
    );
  }

  const { users, sessions, experimentSystem, storage, loginLast7Days } = data;

  return (
    <div style={{
      padding: token.paddingLG,
      background: token.colorBgLayout,
      minHeight: 'calc(100vh - 112px)',
    }}>
      <Row gutter={[24, 24]}>
        {/* ユーザー */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <UserOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              {t('systemOverview.sections.users')}
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.totalUsers')}</span>
                <span style={valueStyle}>{users.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.activeUsers')}</span>
                <span style={valueStyle}>{users.active}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.contractedUsers')}</span>
                <span style={valueStyle}>
                  {users.contractedUsers !== null ? users.contractedUsers : '-'}
                </span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* セッション */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <DesktopOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              {t('systemOverview.sections.sessions')}
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.totalSessions')}</span>
                <span style={valueStyle}>{sessions.total}</span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* 実験システム */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <ExperimentOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              {t('systemOverview.sections.experimentSystem')}
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.totalProjects')}</span>
                <span style={valueStyle}>{experimentSystem.totalProjects}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.planning')}</span>
                <span style={valueStyle}>{experimentSystem.planning}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.inProgress')}</span>
                <span style={valueStyle}>{experimentSystem.inProgress}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.completed')}</span>
                <span style={valueStyle}>{experimentSystem.completed}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.contractedProjects')}</span>
                <span style={valueStyle}>
                  {experimentSystem.contractedProjects !== null ? experimentSystem.contractedProjects : '-'}
                </span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* ストレージ */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <DatabaseOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              {t('systemOverview.sections.storage')}
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.totalFiles')}</span>
                <span style={valueStyle}>{storage.totalFiles}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.usedCapacity')}</span>
                <span style={valueStyle}>{storage.usedCapacityGB.toFixed(3)} GB</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.contractCapacity')}</span>
                <span style={valueStyle}>
                  {storage.contractCapacityGB !== null ? `${storage.contractCapacityGB.toFixed(3)} GB` : '-'}
                </span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* ログイン（過去7日） */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <LoginOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              {t('systemOverview.sections.loginLast7Days')}
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.totalLogins')}</span>
                <span style={valueStyle}>{loginLast7Days.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.success')}</span>
                <span style={valueStyle}>{loginLast7Days.success}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>{t('systemOverview.labels.failed')}</span>
                <span style={valueStyle}>{loginLast7Days.failed}</span>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemOverview;
