'use client';

import React, { useState, useMemo } from 'react';
import { Select, Button, Space, Typography, Tag, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { RefSectionProps } from '@/types/experimentPlanDialog';

const { Text } = Typography;
const { useToken } = theme;

/**
 * Ref追加エリアコンポーネント（Creator / Instrument / Owner 共通）
 */
const RefSection: React.FC<RefSectionProps> = ({
  title,
  options,
  selectedValues,
  onAdd,
  onRemove,
  disabled = false,
  testIdPrefix,
}) => {
  const { token } = useToken();
  const [selectValue, setSelectValue] = useState<string | undefined>(undefined);

  // 未選択のオプションのみ表示（既に追加済みのものは除く）
  const availableOptions = useMemo(
    () => options.filter((o) => !selectedValues.includes(o)),
    [options, selectedValues]
  );

  const handleAdd = () => {
    if (!selectValue) return;
    onAdd(selectValue);
    setSelectValue(undefined);
  };

  return (
    <div>
      <Text strong style={{ fontSize: 13 }}>
        {title}
      </Text>
      <Space style={{ marginTop: 6, width: '100%' }} orientation="vertical" size={6}>
        {/* 追加行 */}
        <Space>
          <Select
            value={selectValue}
            onChange={setSelectValue}
            options={availableOptions.map((o) => ({ label: o, value: o }))}
            style={{ minWidth: 220 }}
            placeholder={`${title}を選択`}
            disabled={disabled}
            data-testid={`${testIdPrefix}-select`}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled || !selectValue}
            data-testid={`${testIdPrefix}-add-button`}
          >
            追加
          </Button>
        </Space>
        {/* 追加済みリスト */}
        {selectedValues.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              border: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              backgroundColor: token.colorFillAlter,
              minHeight: 36,
            }}
          >
            <Space size={4} wrap>
              {selectedValues.map((v) => (
                <Tag
                  key={v}
                  closable={!disabled}
                  onClose={() => onRemove(v)}
                  color="blue"
                  style={{ margin: 2 }}
                >
                  {v}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
};

export default RefSection;
