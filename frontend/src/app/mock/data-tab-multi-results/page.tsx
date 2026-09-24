'use client';

/**
 * /mock/data-tab-multi-results
 *
 * PropertyViewer データタブ 複数Results対応 - 変更後の表示見本
 *
 * アクセス: http://localhost:3000/mock/data-tab-multi-results
 *
 * @see docs/tasks/20260918_0000_データタブ複数Results対応/PLAN.md
 */

import React from 'react';
import { ConfigProvider, Typography } from 'antd';
import ja_JP from 'antd/locale/ja_JP';
import PropertyViewerDataTabMock from './PropertyViewerDataTabMock';

const { Title, Text } = Typography;

export default function DataTabMultiResultsMockPage() {
  return (
    <ConfigProvider locale={ja_JP}>
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '24px 16px',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        {/* ページヘッダー */}
        <div style={{ marginBottom: 20 }}>
          <Title level={4} style={{ marginBottom: 4 }}>
            🔬 PropertyViewer データタブ 複数Results対応 — 表示見本
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            修正後のデータタブ表示イメージを確認するモックページです。
            上部のセレクタでシナリオを切り替えてください。
          </Text>
        </div>

        {/* モックコンポーネント本体 */}
        <PropertyViewerDataTabMock />
      </div>
    </ConfigProvider>
  );
}
