'use client';

/**
 * 暗号化プレビューパネル
 *
 * @description
 * 暗号化前後のXMLを並べて表示するプレビューパネル。
 */

import React from 'react';
import { Card, Row, Col, Typography, Spin, Empty } from 'antd';
import type { EncryptionPreviewResponse } from '@/types/encryption';

const { Text } = Typography;

interface EncryptionPreviewPanelProps {
  preview: EncryptionPreviewResponse | null;
  loading: boolean;
}

const CODE_STYLE: React.CSSProperties = {
  background: '#1e1e1e',
  color: '#d4d4d4',
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'Monaco, Menlo, Consolas, monospace',
  overflow: 'auto',
  whiteSpace: 'pre',
  maxHeight: 280,
  minHeight: 100,
};

const EncryptionPreviewPanel: React.FC<EncryptionPreviewPanelProps> = ({ preview, loading }) => {
  if (loading) {
    return (
      <Card size="small" title="XMLプレビュー">
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin tip="プレビュー生成中..." />
        </div>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card size="small" title="XMLプレビュー">
        <Empty
          description="暗号化対象を選択し「プレビュー」ボタンを押してください"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card size="small" title="XMLプレビュー">
      <Row gutter={12}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            暗号化前
          </Text>
          <div style={CODE_STYLE}>{preview.beforeXml}</div>
        </Col>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            暗号化後（W3C XML Encryption 形式）
          </Text>
          <div style={CODE_STYLE}>{preview.afterXml}</div>
        </Col>
      </Row>
      {preview.algorithmUri && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            アルゴリズム URI：{preview.algorithmUri}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default EncryptionPreviewPanel;
