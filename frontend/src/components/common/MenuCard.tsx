'use client';

import React from 'react';
import { Card } from 'antd';
import * as AntIcons from '@ant-design/icons';

/**
 * メニューカードのProps
 */
interface MenuCardProps {
  label: string;
  icon: string;
  description?: string;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * メニューカードコンポーネント
 * UIポリシーに基づいたモダンなデザイン
 */
export default function MenuCard({
  label,
  icon,
  description,
  disabled = false,
  onClick,
}: MenuCardProps) {
  // アイコン名から対応するAnt Designアイコンコンポーネントを取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (AntIcons as any)[icon] || AntIcons.AppstoreOutlined;

  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        height: '100%',
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 200ms ease-out',
      }}
      styles={{
        body: {
          padding: 24,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0px 8px 16px rgba(0,0,0,0.16)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 8,
            backgroundColor: disabled ? '#f5f5f5' : '#1976d2',
            color: 'white',
            marginRight: 16,
            transition: 'all 200ms ease-out',
          }}
        >
          <IconComponent style={{ fontSize: 32 }} />
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#212121',
          }}
        >
          {label}
        </h2>
      </div>

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#757575',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </Card>
  );
}
