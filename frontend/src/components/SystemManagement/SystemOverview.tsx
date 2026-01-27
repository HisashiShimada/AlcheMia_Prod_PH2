'use client';

import React from 'react';
import { Card, Row, Col, Flex, theme } from 'antd';
import {
  UserOutlined,
  DesktopOutlined,
  ExperimentOutlined,
  FolderOutlined,
  DatabaseOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import systemOverviewData from '../../../mock/data/system-overview.json';

/**
 * システム概要画面モック
 * システム全体の統計情報を表示するダッシュボード
 */
const SystemOverviewMock: React.FC = () => {
  const { token } = theme.useToken();
  const { users, sessions, experimentSystem, projects, storage, loginLast7Days } =
    systemOverviewData;

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
              <div style={statRowStyle}>
                <span style={labelStyle}>管理者</span>
                <span style={valueStyle}>{users.managers}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>作業者</span>
                <span style={valueStyle}>{users.workers}</span>
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
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle}>{sessions.active}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>今日のセッション</span>
                <span style={valueStyle}>{sessions.today}</span>
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
                <span style={labelStyle}>割当ファイル</span>
                <span style={valueStyle}>{experimentSystem.assignedFiles}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>指示</span>
                <span style={valueStyle}>{experimentSystem.instructions}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>進捗レポート</span>
                <span style={valueStyle}>{experimentSystem.progressReports}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ作業者</span>
                <span style={valueStyle}>{experimentSystem.activeWorkers}</span>
              </div>
            </Flex>
          </Card>
        </Col>

        {/* プロジェクト */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} variant="borderless">
            <div style={titleStyle}>
              <FolderOutlined style={{ fontSize: token.fontSizeHeading4 }} />
              プロジェクト
            </div>
            <Flex vertical gap={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総プロジェクト数</span>
                <span style={valueStyle}>{projects.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle}>{projects.active}</span>
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
                <span style={valueStyle}>{storage.usedCapacityGB} GB</span>
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

export default SystemOverviewMock;
