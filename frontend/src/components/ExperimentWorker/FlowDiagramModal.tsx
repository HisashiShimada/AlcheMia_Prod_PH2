'use client';

import React from 'react';
import { Modal, Typography, Space, Empty, theme } from 'antd';
import { CloseOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * フロー図モーダルのProps
 */
interface FlowDiagramModalProps {
  visible: boolean;
  onClose: () => void;
  projectName?: string;
  methodName?: string;
}

/**
 * フロー図表示モーダル
 * 実験ワークフローのフロー図を表示するモーダルコンポーネント
 */
export default function FlowDiagramModal({
  visible,
  onClose,
  projectName,
  methodName,
}: FlowDiagramModalProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      closeIcon={<CloseOutlined />}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>フロー図</span>
        </div>
      }
      styles={{
        body: {
          padding: token.paddingLG,
          minHeight: 600,
        },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* プロジェクト・メソッド情報 */}
        {(projectName || methodName) && (
          <div
            style={{
              padding: token.padding,
              backgroundColor: token.colorBgSpotlight,
              borderRadius: token.borderRadius,
              borderLeft: `4px solid ${token.colorPrimary}`,
            }}
          >
            <Space direction="vertical" size="small">
              {projectName && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    プロジェクト
                  </Text>
                  <Title level={5} style={{ margin: 0, marginTop: 4 }}>
                    {projectName}
                  </Title>
                </div>
              )}
              {methodName && (
                <div style={{ marginTop: token.marginXS }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    メソッド
                  </Text>
                  <Title level={5} style={{ margin: 0, marginTop: 4 }}>
                    {methodName}
                  </Title>
                </div>
              )}
            </Space>
          </div>
        )}

        {/* フロー図表示エリア（モック実装） */}
        <div
          style={{
            minHeight: 400,
            border: `1px dashed ${token.colorBorder}`,
            borderRadius: token.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: token.colorBgContainer,
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small" align="center">
                <Text type="secondary" style={{ fontSize: 16 }}>
                  フロー図は現在準備中です
                </Text>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Petri Netベースのワークフロー図がここに表示されます
                </Text>
              </Space>
            }
          />
        </div>
      </Space>
    </Modal>
  );
}
