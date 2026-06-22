'use client';

import dynamic from 'next/dynamic';
import ExperimentAdminNav from '../../components/namespace/ExperimentAdminNav';

// SSR を無効化（ブラウザ依存の clipboard API などのため）
const NamespaceMain = dynamic(
  () => import('../../components/namespace/NamespaceMain'),
  { ssr: false },
);

/** Header(64px) + SubHeader(76px) */
const HEADER_TOTAL = 140;

export default function NamespaceManagementPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#fff' }}>
      <ExperimentAdminNav activeTab="namespace" />
      <div style={{
        marginTop: HEADER_TOTAL,
        height: `calc(100vh - ${HEADER_TOTAL}px)`,
        overflow: 'hidden',
      }}>
        <NamespaceMain />
      </div>
    </div>
  );
}
