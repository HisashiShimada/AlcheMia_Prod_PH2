'use client';

import React, { useState } from 'react';
import { App, Modal, Button, Space, Checkbox, Alert } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  exportUncertaintyCriteria,
} from '@/services/uncertaintyCriteriaApiService';
import type { ExportUncertaintyCriteriaOptions } from '@/services/uncertaintyCriteriaApiService';

/**
 * UncertaintyExportModalのProps型定義
 */
interface UncertaintyExportModalProps {
  open: boolean;
  selectedCount: number;
  /** エクスポート対象の uncertaintyKey 配列 */
  selectedKeys: string[];
  onClose: () => void;
}

type ExportFormat = 'XML' | 'JSON';

/**
 * 不確かさ基準エクスポートモーダルコンポーネント
 */
export default function UncertaintyExportModal({
  open,
  selectedCount,
  selectedKeys,
  onClose,
}: UncertaintyExportModalProps) {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('XML');
  const [includeDesc, setIncludeDesc] = useState(true);
  const [includeExtends, setIncludeExtends] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (selectedKeys.length === 0) {
      message.warning(t('uncertaintyExport.noSelection'));
      return;
    }

    setLoading(true);
    try {
      const options: ExportUncertaintyCriteriaOptions = {
        uncertaintyKeys: selectedKeys,
        format:          exportFormat,
        includeDesc,
        includeExtends,
        includeHistory,
      };

      await exportUncertaintyCriteria(options);
      message.success(t('uncertaintyExport.exportSuccess'));
      onClose();
    } catch {
      message.error(t('uncertaintyExport.exportError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={460}
      title={t('uncertaintyExport.title')}
      footer={
        <Space>
          <Button onClick={onClose}>{t('uncertaintyExport.btnCancel')}</Button>
          <Button type="primary" onClick={handleExport} loading={loading}>
            {t('uncertaintyExport.btnDownload')}
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Alert
          type="info"
          showIcon={false}
          message={t('uncertaintyExport.alertMessage', { count: String(selectedCount) })}
          style={{ background: '#e6f0ff', borderColor: '#91caff', color: '#2c5282' }}
        />

        {/* エクスポート形式 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            {t('uncertaintyExport.formatLabel')}
          </div>
          <Space>
            {(['XML', 'JSON'] as ExportFormat[]).map((fmt) => (
              <Button
                key={fmt}
                size="small"
                type={exportFormat === fmt ? 'primary' : 'default'}
                onClick={() => setExportFormat(fmt)}
              >
                {fmt}
              </Button>
            ))}
          </Space>
        </div>

        {/* オプション */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            {t('uncertaintyExport.optionsLabel')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Checkbox
              checked={includeDesc}
              onChange={(e) => setIncludeDesc(e.target.checked)}
            >
              {t('uncertaintyExport.optionIncludeDesc')}
            </Checkbox>
            <Checkbox
              checked={includeExtends}
              onChange={(e) => setIncludeExtends(e.target.checked)}
            >
              {t('uncertaintyExport.optionIncludeExtends')}
            </Checkbox>
            <Checkbox
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
            >
              {t('uncertaintyExport.optionIncludeHistory')}
            </Checkbox>
          </div>
        </div>
      </div>
    </Modal>
  );
}
