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
import { Typography, Card, Alert, ConfigProvider, Tabs } from 'antd';
import InsertionWizardMock from '@/components/insertion/mock/InsertionWizardMock';
import ReferenceFileEditorMock from '@/components/insertion/mock/ReferenceFileEditorMock';
import RefinementManagerMock from '@/components/insertion/mock/RefinementManagerMock';
import ValidationReportMock from '@/components/insertion/mock/ValidationReportMock';
import ProcessExecutionMock from '@/components/insertion/mock/ProcessExecutionMock';
import HorizontalSplitManagerMock from '@/components/insertion/mock/HorizontalSplitManagerMock';
import PetriNetEditorMock from '@/components/insertion/mock/PetriNetEditorMock';
import MimeTypeSuggestMock from '@/components/insertion/mock/MimeTypeSuggestMock';
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

        <Tabs
          type="card"
          defaultActiveKey="insertion_wizard"
          items={[
            {
              key: 'insertion_wizard',
              label: '🗂️ 親ファイル編集機能',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <InsertionWizardMock />
                </Card>
              ),
            },
            {
              key: 'reference_file_editor',
              label: '📄 参照ファイル編集機能',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <ReferenceFileEditorMock />
                </Card>
              ),
            },
            {
              key: 'horizontal_split',
              label: '🔗 水平分割マネージャ',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <HorizontalSplitManagerMock />
                </Card>
              ),
            },
            {
              key: 'refinement_manager',
              label: '🔀 Refinement管理',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <RefinementManagerMock />
                </Card>
              ),
            },
            {
              key: 'validation_report',
              label: '🔍 整合性検証レポート',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <ValidationReportMock />
                </Card>
              ),
            },
            {
              key: 'process_execution',
              label: '▶️ プロセス実行エンジン',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <ProcessExecutionMock />
                </Card>
              ),
            },
            {
              key: 'petri_net_editor',
              label: '🕸️ ペトリネット編集',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <PetriNetEditorMock />
                </Card>
              ),
            },
            {
              key: 'mime_type_suggest',
              label: '🏷️ MIME型自動推定',
              children: (
                <Card style={{ marginBottom: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <MimeTypeSuggestMock />
                </Card>
              ),
            },
          ]}
        />
      </div>
    </ConfigProvider>
  );
}
