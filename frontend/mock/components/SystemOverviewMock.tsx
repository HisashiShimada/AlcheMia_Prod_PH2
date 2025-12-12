'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Space } from 'antd';
import {
  UserOutlined,
  DesktopOutlined,
  ExperimentOutlined,
  FolderOutlined,
  DatabaseOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import systemOverviewData from '../data/system-overview.json';

/**
 * システム概要画面モック
 * システム全体の統計情報を表示するダッシュボード
 */
const SystemOverviewMock: React.FC = () => {
  const { users, sessions, experimentSystem, projects, storage, loginLast7Days } =
    systemOverviewData;

  // 統計カードのスタイル
  const cardStyle: React.CSSProperties = {
    marginTop: 90,
    padding: 0,
    height: '100%',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#757575',
  };

  const valueStyle = (color: string): React.CSSProperties => ({
    fontSize: '20px',
    fontWeight: 600,
    color: color,
  });

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: 'calc(100vh - 112px)' }}>
      <Row gutter={[24, 24]}>
        {/* ユーザー */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <UserOutlined style={{ fontSize: '24px' }} />
              ユーザー
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ユーザー数</span>
                <span style={valueStyle('#212121')}>{users.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle('#212121')}>{users.active}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>管理者</span>
                <span style={valueStyle('#212121')}>{users.managers}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>作業者</span>
                <span style={valueStyle('#212121')}>{users.workers}</span>
              </div>
            </Space>
          </Card>
        </Col>

        {/* セッション */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <DesktopOutlined style={{ fontSize: '24px' }} />
              セッション
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総セッション</span>
                <span style={valueStyle('#212121')}>{sessions.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle('#212121')}>{sessions.active}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>今日のセッション</span>
                <span style={valueStyle('#212121')}>{sessions.today}</span>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 実験システム */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <ExperimentOutlined style={{ fontSize: '24px' }} />
              実験システム
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>割当ファイル</span>
                <span style={valueStyle('#212121')}>{experimentSystem.assignedFiles}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>指示</span>
                <span style={valueStyle('#212121')}>{experimentSystem.instructions}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>進捗レポート</span>
                <span style={valueStyle('#212121')}>{experimentSystem.progressReports}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ作業者</span>
                <span style={valueStyle('#212121')}>{experimentSystem.activeWorkers}</span>
              </div>
            </Space>
          </Card>
        </Col>

        {/* プロジェクト */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <FolderOutlined style={{ fontSize: '24px' }} />
              プロジェクト
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総プロジェクト数</span>
                <span style={valueStyle('#212121')}>{projects.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>アクティブ</span>
                <span style={valueStyle('#212121')}>{projects.active}</span>
              </div>
            </Space>
          </Card>
        </Col>

        {/* ストレージ */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <DatabaseOutlined style={{ fontSize: '24px' }} />
              ストレージ
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ファイル数</span>
                <span style={valueStyle('#212121')}>{storage.totalFiles}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>使用容量</span>
                <span style={valueStyle('#212121')}>{storage.usedCapacityGB} GB</span>
              </div>
            </Space>
          </Card>
        </Col>

        {/* ログイン（過去7日） */}
        <Col xs={24} md={12} lg={8}>
          <Card style={cardStyle} bordered={false}>
            <div style={titleStyle}>
              <LoginOutlined style={{ fontSize: '24px' }} />
              ログイン（過去7日）
            </div>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={statRowStyle}>
                <span style={labelStyle}>総ログイン</span>
                <span style={valueStyle('#212121')}>{loginLast7Days.total}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>成功</span>
                <span style={valueStyle('#212121')}>{loginLast7Days.success}</span>
              </div>
              <div style={statRowStyle}>
                <span style={labelStyle}>失敗</span>
                <span style={valueStyle('#212121')}>{loginLast7Days.failed}</span>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemOverviewMock;
