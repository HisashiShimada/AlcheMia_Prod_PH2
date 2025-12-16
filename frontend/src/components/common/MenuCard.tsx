'use client';

import React from 'react';
import { Card, theme } from 'antd';
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
  const { token } = theme.useToken();
  
  // アイコン名から対応するAnt Designアイコンコンポーネントを取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (AntIcons as any)[icon] || AntIcons.AppstoreOutlined;

  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        height: '100%',
        borderRadius: token.borderRadiusLG,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: `all ${token.motionDurationMid} ease-out`,
      }}
      styles={{
        body: {
          padding: token.paddingLG,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = token.boxShadowSecondary;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = token.boxShadow;
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: token.marginLG,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: token.controlHeightLG * 1.4,
            height: token.controlHeightLG * 1.4,
            borderRadius: token.borderRadius,
            backgroundColor: disabled ? token.colorBgSpotlight : token.colorPrimary,
            color: 'white',
            marginRight: token.marginLG,
            transition: `all ${token.motionDurationMid} ease-out`,
          }}
        >
          <IconComponent style={{ fontSize: token.fontSizeHeading2 }} />
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: token.fontSizeLG,
            fontWeight: token.fontWeightStrong,
            color: token.colorText,
          }}
        >
          {label}
        </h2>
      </div>

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: token.fontSize,
            color: token.colorTextSecondary,
            lineHeight: token.lineHeight,
          }}
        >
          {description}
        </p>
      )}
    </Card>
  );
}
