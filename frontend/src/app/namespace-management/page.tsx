'use client';

import dynamic from 'next/dynamic';

// SSR を無効化（ブラウザ依存の clipboard API などのため）
const NamespaceMain = dynamic(
  () => import('../../components/namespace/NamespaceMain'),
  { ssr: false },
);

export default function NamespaceManagementPage() {
  return <NamespaceMain />;
}
