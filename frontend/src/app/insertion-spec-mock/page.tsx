'use client';

/**
 * Insertion管理・プロセス管理 モックプレビューページ
 *
 * URL: /insertion-spec-mock
 * 要件定義書:
 *   - MaiML insertion管理システム 要件定義書
 *   - MaiMLプロセス管理システム 要件定義書
 */

import React from 'react';
import { Typography, Card, Alert, ConfigProvider } from 'antd';
const { Title, Text } = Typography;

export default function InsertionSpecMockPage() {
  return (
    <ConfigProvider>
      <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          📎 Insertion管理 / プロセス管理 モックプレビュー
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          MaiML insertion管理システム 要件定義書 &amp; MaiMLプロセス管理システム 要件定義書 対応モック
        </Text>
        <Card>
          <Alert
            type="warning"
            showIcon
            message="モックコンポーネントは未実装です。"
          />
        </Card>
      </div>
    </ConfigProvider>
  );
}
