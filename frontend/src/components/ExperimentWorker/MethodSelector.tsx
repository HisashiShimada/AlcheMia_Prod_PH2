'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { Method } from '@/types/experimentWorker';

const { Text } = Typography;

interface MethodSelectorProps {
  methods: Method[];
  selectedMethodId: string | null;
  onSelectMethod?: (methodId: string) => void;
  disabled?: boolean;
}

/**
 * メソッド選択コンポーネント
 * カード形式で選択中のメソッド情報を表示
 */
export default function MethodSelector({
  methods,
  selectedMethodId,
  disabled = false,
}: MethodSelectorProps) {
  const { token } = theme.useToken();

  // 選択中のメソッド情報を取得
  const selectedMethod = methods.find((m) => m.methodId === selectedMethodId);

  return (
    <Card
      size="small"
      style={{
        backgroundColor: selectedMethodId ? token.colorPrimaryBg : token.colorBgContainer,
        borderColor: selectedMethodId ? token.colorPrimary : token.colorBorder,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Space>
          <ToolOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>メソッド</Text>
        </Space>

        {/* 選択中の情報 */}
        {selectedMethod ? (
          <Space orientation="vertical" size={0} style={{ paddingLeft: 24 }}>
            <Text strong style={{ fontSize: 14 }}>
              {selectedMethod.methodName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedMethod.methodId} • {selectedMethod.transitions?.length || 0} トランジション
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ paddingLeft: 24, fontSize: 12 }}>
            {disabled ? 'プロジェクトを選択してください' : 'メソッドが選択されていません'}
          </Text>
        )}
      </Space>
    </Card>
  );
}
