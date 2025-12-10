'use client';

import React from 'react';
import { Select, Space, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { Method } from '@/types/experimentWorker';

const { Text } = Typography;

interface MethodSelectorProps {
  methods: Method[];
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  disabled?: boolean;
}

/**
 * メソッド選択コンポーネント
 * ドロップダウンリストでメソッドを選択可能にする
 * ProjectSelectorと同じスタイルで横一列に表示
 */
export default function MethodSelector({
  methods,
  selectedMethodId,
  onSelectMethod,
  disabled = false,
}: MethodSelectorProps) {
  return (
    <Space align="center" size="middle" style={{ width: '100%' }}>
      <ToolOutlined style={{ fontSize: 16, color: '#CF0027' }} />
      <Text strong style={{ minWidth: 100 }}>
        メソッド:
      </Text>
      <Select
        value={selectedMethodId || undefined}
        onChange={onSelectMethod}
        placeholder="メソッドを選択してください"
        disabled={disabled}
        style={{ minWidth: 300, flex: 1, maxWidth: 600 }}
        size="large"
      >
        {methods.map((method) => (
          <Select.Option key={method.methodId} value={method.methodId}>
            <Space>
              <Text strong>{method.methodName}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {method.methodId}
              </Text>
            </Space>
          </Select.Option>
        ))}
      </Select>
    </Space>
  );
}
