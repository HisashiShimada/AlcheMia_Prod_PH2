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
  /**
   * パネルのモード
   * - 'encrypt'（デフォルト）: 暗号化前/暗号化後 のラベルを表示
   * - 'decrypt': 復号化前/復号化後 のラベルを表示
   */
  mode?: 'encrypt' | 'decrypt';
}

/** ダイアログ高さ基準のコードエリア高さ */
const CODE_STYLE: React.CSSProperties = {
  background: '#1e1e1e',
  color: '#d4d4d4',
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'Monaco, Menlo, Consolas, monospace',
  overflow: 'auto',
  whiteSpace: 'pre',
  /* ヘッダー(約90px) + アルゴリズム行(約28px) + パディング を引いた残り */
  height: 'calc(100vh - 240px)',
  minHeight: 200,
};

/** パネル全体をビューポート高さ一杯に */
const PANEL_STYLE: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const CARD_BODY_STYLE: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '12px',
};

const EncryptionPreviewPanel: React.FC<EncryptionPreviewPanelProps> = ({
  preview,
  loading,
  mode = 'encrypt',
}) => {
  const isDecrypt = mode === 'decrypt';
  const beforeLabel = isDecrypt ? '復号化前（暗号化状態）' : '暗号化前';
  const afterLabel = isDecrypt ? '復号化後（平文）' : '暗号化後（W3C XML Encryption 形式）';
  const emptyDescription = isDecrypt
    ? '復号化対象を選択してプレビューボタンを押してください'
    : '暗号化対象を選択すると自動的にプレビューが表示されます';

  if (loading) {
    return (
      <Card size="small" title="XMLプレビュー" style={PANEL_STYLE} bodyStyle={CARD_BODY_STYLE}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin tip="プレビュー生成中..." />
        </div>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card size="small" title="XMLプレビュー" style={PANEL_STYLE} bodyStyle={CARD_BODY_STYLE}>
        <Empty
          description={emptyDescription}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: 'auto' }}
        />
      </Card>
    );
  }

  return (
    <Card size="small" title="XMLプレビュー" style={PANEL_STYLE} bodyStyle={CARD_BODY_STYLE}>
      <Row gutter={12} style={{ flex: 1 }}>
        <Col span={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
            {beforeLabel}
          </Text>
          <div style={CODE_STYLE}>{preview.beforeXml}</div>
        </Col>
        <Col span={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
            {afterLabel}
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
