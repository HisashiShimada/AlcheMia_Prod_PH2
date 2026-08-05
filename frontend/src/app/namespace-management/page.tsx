'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Tabs } from 'antd';
import ExperimentAdminNav from '../../components/namespace/ExperimentAdminNav';

// SSR を無効化（ブラウザ依存の clipboard API などのため）
const DepartmentTreeManagement = dynamic(
  () => import('../../components/namespace/DepartmentTreeManagement'),
  { ssr: false },
);

const PrefixManagement = dynamic(
  () => import('../../components/namespace/PrefixManagement'),
  { ssr: false },
);

const TermManagement = dynamic(
  () => import('../../components/namespace/TermManagement'),
  { ssr: false },
);

/** Header(64px) + SubHeader(76px) */
const HEADER_TOTAL = 140;

/** 左ペイン幅 (px) */
const LEFT_PANE_WIDTH = 340;

export default function NamespaceManagementPage() {
  const [selectedScopeKey, setSelectedScopeKey] = useState<string | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#fff' }}>
      <ExperimentAdminNav activeTab="namespace" />
      <div
        style={{
          marginTop: HEADER_TOTAL,
          height: `calc(100vh - ${HEADER_TOTAL}px)`,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ── 左ペイン: 階層ツリー ── */}
        <div
          style={{
            width: LEFT_PANE_WIDTH,
            minWidth: LEFT_PANE_WIDTH,
            borderRight: '1px solid #f0f0f0',
            overflowY: 'auto',
            padding: '12px 8px',
          }}
        >
          <DepartmentTreeManagement
            onNodeSelect={(scopeKey) => setSelectedScopeKey(scopeKey)}
          />
        </div>

        {/* ── 右ペイン: Prefix 管理 / 用語管理 ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            defaultActiveKey="prefix"
            style={{ height: '100%', padding: '0 8px' }}
            tabBarStyle={{ marginBottom: 0 }}
            items={[
              {
                key: 'prefix',
                label: 'Prefix 管理',
                children: (
                  <div style={{ height: `calc(100vh - ${HEADER_TOTAL + 46}px)`, overflow: 'auto' }}>
                     <PrefixManagement
                      selectedNsKey={selectedScopeKey ?? undefined}
                      scopeKey={selectedScopeKey ?? undefined}
                    />
                  </div>
                ),
              },
              {
                key: 'terms',
                label: '用語管理',
                children: (
                  <div style={{ height: `calc(100vh - ${HEADER_TOTAL + 46}px)`, overflow: 'hidden' }}>
                    <TermManagement
                      selectedNsKey={selectedScopeKey ?? undefined}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
