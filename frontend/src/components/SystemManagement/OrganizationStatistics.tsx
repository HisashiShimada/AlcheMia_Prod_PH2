'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Statistic, Row, Col, Spin, Alert } from 'antd';
import { ReloadOutlined, DatabaseOutlined, FolderOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { fetchOrganizationStatistics } from '@/services/organizationStatisticsApiService';
import type { OrganizationStatistics as OrganizationStatisticsData } from '@/services/organizationStatisticsApiService';

/**
 * 現在日時を表示用文字列にフォーマット
 */
function formatNow(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(
    now.getHours()
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
    now.getSeconds()
  ).padStart(2, '0')}`;
}

/**
 * 組織統計情報画面
 *
 * 機能:
 * - ストレージ使用量の表示
 * - プロジェクト数の表示
 * - アクティブユーザー数の表示
 * - 統計情報のリロード
 */
const OrganizationStatistics: React.FC = () => {
  const [statistics, setStatistics] = useState<OrganizationStatisticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 統計情報を取得
   */
  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizationStatistics();
      setStatistics(data);
      setLastUpdated(formatNow());
    } catch (err) {
      console.error('統計情報の取得に失敗しました:', err);
      setError('統計情報の取得に失敗しました。再度リロードしてください。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

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
              {lastUpdated ? `最終更新: ${lastUpdated}` : ''}
            </span>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              リロード
            </Button>
          </Space>
        }
        style={{
          marginTop: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {error && (
          <Alert
            type="error"
            title={error}
            style={{ marginBottom: '24px' }}
            showIcon
          />
        )}

        <Spin spinning={loading}>
          <Row gutter={[24, 24]} style={{ marginTop: '60px' }}>
            {/* ストレージ使用量 */}
            <Col xs={24} sm={24} md={8}>
              <Card
                variant="outlined"
                style={{
                  textAlign: 'center',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <DatabaseOutlined
                  style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }}
                />
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                  ストレージ使用量
                </div>
                <Statistic
                  value={statistics?.storage.used ?? 0}
                  precision={8}
                  suffix={`/ ${(statistics?.storage.total ?? 0).toFixed(4)} ${statistics?.storage.unit ?? 'GB'}`}
                  styles={{ content: { fontSize: '28px', fontWeight: 'bold', color: '#212121' } }}
                />
                <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                  利用率: {statistics ? (statistics.storage.usageRate * 100).toFixed(2) : '0.00'}%
                </div>
              </Card>
            </Col>

            {/* プロジェクト数 */}
            <Col xs={24} sm={24} md={8}>
              <Card
                variant="outlined"
                style={{
                  textAlign: 'center',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <FolderOutlined
                  style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }}
                />
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                  プロジェクト数
                </div>
                <Statistic
                  value={statistics?.projects.count ?? 0}
                  suffix={`/ ${statistics?.projects.total ?? 0}`}
                  styles={{ content: { fontSize: '28px', fontWeight: 'bold', color: '#212121' } }}
                />
                <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                  登録率:{' '}
                  {statistics && statistics.projects.total > 0
                    ? ((statistics.projects.count / statistics.projects.total) * 100).toFixed(2)
                    : '0.00'}
                  %
                </div>
              </Card>
            </Col>

            {/* アクティブユーザー */}
            <Col xs={24} sm={24} md={8}>
              <Card
                variant="outlined"
                style={{
                  textAlign: 'center',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <UsergroupAddOutlined
                  style={{ fontSize: '48px', color: '#757575', marginBottom: '16px' }}
                />
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>
                  アクティブユーザー
                </div>
                <Statistic
                  value={statistics?.activeUsers.count ?? 0}
                  suffix={`/ ${statistics?.activeUsers.total ?? 0}`}
                  styles={{ content: { fontSize: '28px', fontWeight: 'bold', color: '#212121' } }}
                />
                <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '8px' }}>
                  登録率:{' '}
                  {statistics && statistics.activeUsers.total > 0
                    ? ((statistics.activeUsers.count / statistics.activeUsers.total) * 100).toFixed(2)
                    : '0.00'}
                  %
                </div>
              </Card>
            </Col>
          </Row>
        </Spin>
      </Card>
    </div>
  );
};

export default OrganizationStatistics;
