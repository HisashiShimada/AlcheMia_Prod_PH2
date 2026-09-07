
'use client';

import React from 'react';
import { Modal, Typography, List } from 'antd';
import type { ShareScopeModalProps } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

// re-export（既存の import 側を壊さないため）
export type { ShareTarget, ScopeNode } from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const ShareScopeModal: React.FC<ShareScopeModalProps> = ({
  open,
  shareItems = [],
  onClose,
  onShare,
  targetScopeName,
}) => {
  const { t } = useLanguage();

  const handleOk = () => {
    onShare(shareItems.map((it) => it.id));
  };

  return (
    <Modal
      open={open}
      title={t('shareScopeModal.title')}
      okText={t('shareScopeModal.okText')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        style: { background: '#52c41a', borderColor: '#52c41a' },
      }}
      onOk={handleOk}
      onCancel={onClose}
      width={480}
    >
      <div>
        {/* 確認メッセージ */}
        <Text>
          {targetScopeName
            ? t('shareScopeModal.confirmMessageWithTarget', { targetScopeName })
            : t('shareScopeModal.confirmMessage', { count: String(shareItems.length) })}
        </Text>

        {/* 共有アイテム一覧 */}
        <List
          size="small"
          style={{
            marginTop: 12,
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            background: '#fafafa',
            maxHeight: 320,
            overflowY: 'auto',
          }}
          dataSource={shareItems}
          renderItem={(item) => (
            <List.Item style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.labelKey && (
                    <Text type="secondary" style={{ fontSize: 11, minWidth: 64, flexShrink: 0 }}>
                      {item.labelKey}
                    </Text>
                  )}
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                </div>
                {!!item.sublabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.sublabelKey && (
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 64, flexShrink: 0 }}>
                        {item.sublabelKey}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.sublabel}
                    </Text>
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
};

export default ShareScopeModal;
