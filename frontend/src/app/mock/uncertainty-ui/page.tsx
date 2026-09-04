'use client';

/**
 * モックページ: Uncertainty記録UI修正 確認用
 *
 * アクセス: http://localhost:3000/mock/uncertainty-ui
 *
 * Phase 1-A: WorkRecordPanel PropertyCard の複数定量評価表示モック
 * Phase 1-B: 実験指示タブ 定量評価列（複数件→ボタン→ダイアログ）モック
 */

import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
import MockPropertyCardSection from './MockPropertyCardSection';
import MockExperimentInstructionSection from './MockExperimentInstructionSection';

const { Title } = Typography;

export default function UncertaintyUiMockPage() {
  const [activeTab, setActiveTab] = useState('1a');

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        🔬 Uncertainty 記録 UI 修正 確認用モック
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '1a',
            label: 'Phase 1-A: PropertyCard（複数定量評価）',
            children: <MockPropertyCardSection />,
          },
          {
            key: '1b',
            label: 'Phase 1-B: 実験指示タブ（定量評価列）',
            children: <MockExperimentInstructionSection />,
          },
        ]}
      />
    </div>
  );
}
