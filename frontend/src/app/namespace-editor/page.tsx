'use client';

/**
 * /namespace-editor ページ
 *
 * NamespaceMaimlEditor がモーダルコンポーネントになったため、
 * このページは /namespace-petri-editor にリダイレクトする。
 * （名前空間エディターはペトリネット画面のツールバーから開くモーダルに統一）
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NamespaceEditorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/namespace-petri-editor');
  }, [router]);

  return null;
}
