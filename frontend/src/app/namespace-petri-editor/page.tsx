'use client';

import dynamic from 'next/dynamic';

// SSR を無効化（ReactFlow など DOM 依存のため）
const NamespacePetriEditor = dynamic(
  () => import('@/components/namespace/NamespacePetriEditor'),
  { ssr: false },
);

export default function NamespacePetriEditorPage() {
  return <NamespacePetriEditor />;
}
