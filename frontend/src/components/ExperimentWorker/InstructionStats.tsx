import React from 'react';
import { Card, Row, Col, Typography, theme } from 'antd';
import { FileTextOutlined, FileOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface InstructionStatsProps {
  stats: {
    total: number;
    file: number;
    method: number;
    transition: number;
    unread: number;
  };
}

/**
 * 統計カードコンポーネント
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  borderColor: string;
  iconColor: string;
}

function StatCard({ icon, label, value, borderColor, iconColor }: StatCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      style={{
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: token.borderRadius,
        height: '100%',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      bodyStyle={{ padding: '8px 24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            fontSize: 24,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </div>
        <Text
          type="secondary"
          style={{
            fontSize: 14,
          }}
        >
          {label}
        </Text>
        <Title
          level={3}
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            color: iconColor,
          }}
        >
          {value}
        </Title>
      </div>
    </Card>
  );
}

/**
 * 指示統計コンポーネント
 * 指示の件数サマリーを親カード内に4つの個別カードで表示
 */
export default function InstructionStats({ stats }: InstructionStatsProps) {
  const { token } = theme.useToken();

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
          <span>作業指示サマリー</span>
        </div>
      }
      style={{
        marginBottom: 24,
        borderRadius: token.borderRadius,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      headStyle={{ padding: '8px 24px' }}
      bodyStyle={{ padding: '8px 24px' }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<FileTextOutlined />}
            label="全指示数"
            value={stats.total}
            borderColor="#1890ff"
            iconColor="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<FileOutlined />}
            label="全体指示"
            value={stats.file}
            borderColor="#52c41a"
            iconColor="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<ToolOutlined />}
            label="メソッド指示"
            value={stats.method}
            borderColor="#fa8c16"
            iconColor="#fa8c16"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<AimOutlined />}
            label="トランジション指示"
            value={stats.transition}
            borderColor="#eb2f96"
            iconColor="#eb2f96"
          />
        </Col>
      </Row>
    </Card>
  );
}
