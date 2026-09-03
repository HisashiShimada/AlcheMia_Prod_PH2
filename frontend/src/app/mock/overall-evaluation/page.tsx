'use client';

/**
 * /mock/overall-evaluation
 *
 * 全体評価タブ レイアウト修正モック確認ページ
 *
 * @see docs/tasks/20260828_0000_全体評価タブレイアウト修正/PLAN.md
 */

import dynamic from 'next/dynamic';
import { ConfigProvider } from 'antd';
import ja_JP from 'antd/locale/ja_JP';

const OverallEvaluationTabMock = dynamic(
  () => import('../../../components/project/OverallEvaluationTabMock'),
  { ssr: false }
);

export default function OverallEvaluationMockPage() {
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
        <OverallEvaluationTabMock />
      </div>
    </ConfigProvider>
  );
}
