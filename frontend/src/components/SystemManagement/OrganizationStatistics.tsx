'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Statistic, Row, Col } from 'antd';
import { ReloadOutlined, DatabaseOutlined, FolderOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import statisticsData from '../../../mock/data/organization-statistics.json';

/**
 * 組織統計情報モック画面
 * 
 * 機能:
 * - ストレージ使用量の表示
 * - プロジェクト数の表示
 * - アクティブユーザー数の表示
 * - 統計情報のリロード
 */
const OrganizationStatisticsMock: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState<string>(statisticsData.lastUpdated);
  const [statistics, setStatistics] = useState(statisticsData.statistics);

  // リロードボタンのハンドラ
  const handleReload = () => {
    // 現在時刻を取得して更新
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${
      String(now.getHours()).padStart(2, '0')
    }:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    setLastUpdated(formattedDate);
    
    // ランダムに値を少し変更（リロード効果の表現）
    setStatistics({
      storage: {
        ...statistics.storage,
        used: Number((statistics.storage.used + Math.random() * 0.01).toFixed(4)),
        fileCount: statistics.storage.fileCount + Math.floor(Math.random() * 3)
      },
      projects: {
        ...statistics.projects,
        count: statistics.projects.count + Math.floor(Math.random() * 2)
      },
      activeUsers: {
        ...statistics.activeUsers,
        count: Math.max(1, statistics.activeUsers.count + Math.floor(Math.random() * 2) - 1)
      }
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            統計情報
          </div>
        }
        extra={
          <Space>
            <span style={{ color: '#757575', fontSize: '14px' }}>
              最終更新: {lastUpdated}
            </span>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleReload}
            >
              リロード
            </Button>
          </Space>
        }
        style={{ 
          marginTop: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Row gutter={[24, 24]} style={{ marginTop: '60px' }}>
          {/* ストレージ使用量 */}
          <Col xs={24} sm={24} md={8}>
            <Card
              bordered={true}
              style={{
                textAlign: 'center',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #d9d9d9'
              }}
            >
              <DatabaseOutlined style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                ストレージ使用量
              </div>
              <Statistic
                value={statistics.storage.used}
                precision={4}
                suffix={`/ ${statistics.storage.total.toFixed(4)} ${statistics.storage.unit}`}
                valueStyle={{ fontSize: '28px', fontWeight: 'bold', color: '#212121' }}
              />
              <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                利用率: {(statistics.storage.usageRate * 100).toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
                ファイル数: {statistics.storage.fileCount} (MaiML: {statistics.storage.maimlFileCount})
              </div>
            </Card>
          </Col>

          {/* プロジェクト数 */}
          <Col xs={24} sm={24} md={8}>
            <Card
              bordered={true}
              style={{
                textAlign: 'center',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #d9d9d9'
              }}
            >
              <FolderOutlined style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                プロジェクト数
              </div>
              <Statistic
                value={statistics.projects.count}
                suffix={`/ ${statistics.projects.total}`}
                valueStyle={{ fontSize: '28px', fontWeight: 'bold', color: '#212121' }}
              />
              <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                登録率: {statistics.projects.registrationRate.toFixed(2)}%
              </div>
            </Card>
          </Col>

          {/* アクティブユーザー */}
          <Col xs={24} sm={24} md={8}>
            <Card
              bordered={true}
              style={{
                textAlign: 'center',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px solid #d9d9d9'
              }}
            >
              <UsergroupAddOutlined style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                アクティブユーザー
              </div>
              <Statistic
                value={statistics.activeUsers.count}
                suffix={`/ ${statistics.activeUsers.total}`}
                valueStyle={{ fontSize: '28px', fontWeight: 'bold', color: '#212121' }}
              />
              <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                登録率: {statistics.activeUsers.registrationRate.toFixed(2)}%
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default OrganizationStatisticsMock;
