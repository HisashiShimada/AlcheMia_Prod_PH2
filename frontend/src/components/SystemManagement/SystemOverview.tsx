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

/**
 * システム概要画面
 * システム全体の統計情報を表示するダッシュボード
 */
const SystemOverview: React.FC = () => {
  const { token } = theme.useToken();
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
        setError(err instanceof Error ? err.message : 'システム概要情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 統計カードのスタイル
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
          title="データ取得エラー"
          description={error || 'データが取得できませんでした'}
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
      minHeight: 'calc(100vh - 112px)'
    }}>
      <Row gutter={[24, 24]}>
        {/* ユーザー */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <UserOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              ユーザー
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ユーザー数</span>
                <span style={valueStyle}>{users.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle}>{users.active}</span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* セッション */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <DesktopOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              セッション
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総セッション</span>
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
              実験システム
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総プロジェクト数</span>
                <span style={valueStyle}>{experimentSystem.totalProjects}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>プロジェクト計画中/タスク実行待ち</span>
                <span style={valueStyle}>{experimentSystem.planning}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>タスク実行中/タスク結果レビュー待ち</span>
                <span style={valueStyle}>{experimentSystem.inProgress}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>プロジェクト完了/タスク異常終了</span>
                <span style={valueStyle}>{experimentSystem.completed}</span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* ストレージ */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <DatabaseOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              ストレージ
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ファイル数</span>
                <span style={valueStyle}>{storage.totalFiles}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>使用容量</span>
                <span style={valueStyle}>{storage.usedCapacityGB.toFixed(3)} GB</span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* ログイン（過去7日） */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <LoginOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              ログイン（過去7日）
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ログイン</span>
                <span style={valueStyle}>{loginLast7Days.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>成功</span>
                <span style={valueStyle}>{loginLast7Days.success}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>失敗</span>
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
