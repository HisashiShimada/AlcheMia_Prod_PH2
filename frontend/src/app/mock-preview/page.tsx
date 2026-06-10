'use client';

/**
 * モックプレビューページ
 * 
 * URL: /mock-preview
 * 画面イメージ確認専用。本番では使用しない。
 */

import React from 'react';
import { Typography, Card, Divider, Alert, ConfigProvider } from 'antd';
import InstructionManagementTabMock from '@/components/project/mock/ExperimentInstructionMock';

const { Title, Text } = Typography;

export default function MockPreviewPage() {
  return (
    <ConfigProvider>
      <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Title level={3}>🖼️ モックプレビュー: 指示管理タブ（統合後イメージ）</Title>

        <Alert
          type="info"
          showIcon
          message="このページは画面イメージ確認専用です。固定データを使用しています。"
          style={{ marginBottom: 16 }}
        />

        {/* ─── 凡例 ─── */}
        <Card size="small" title="凡例・モックデータ内容" style={{ marginBottom: 16 }}>
          <Text>以下の2メソッド・4タスクのデータを表示しています：</Text>
          <ul style={{ marginTop: 8 }}>
            <li><Text strong>合成工程 / Task 1</Text>：4プロパティ（Cond-1×2, Result-1×2）… <Text type="warning">レビュー待ち</Text> → 「承認」「NG」ボタン活性</li>
            <li><Text strong>合成工程 / Task 2</Text>：2プロパティ（Cond-2×2）… <Text type="secondary">実行中</Text>（実績値未記録）</li>
            <li><Text strong>精製工程 / Task 1</Text>：3プロパティ（Cond-1×2, Material-1×1）… <Text style={{ color: '#52c41a' }}>完了</Text></li>
            <li><Text strong>精製工程 / Task 2</Text>：1プロパティ（Cond-1×1）… <Text type="secondary">実行待ち</Text></li>
          </ul>
          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ※ 承認・NG操作はモック内でステータスを変更するのみ（API未接続）
          </Text>
        </Card>

        {/* ─── 指示管理タブ モック ─── */}
        <Card
          title={
            <span>
              <Text strong>指示管理</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                ─ ProjectManagement Tab 3 の新レイアウト
              </Text>
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <InstructionManagementTabMock />
        </Card>
      </div>
    </ConfigProvider>
  );
}
