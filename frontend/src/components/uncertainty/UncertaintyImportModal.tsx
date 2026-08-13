'use client';

import React, { useState } from 'react';
import { Modal, Button, Space, Select, Upload, Alert, Typography, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Dragger } = Upload;
const { Text } = Typography;

/**
 * UncertaintyImportModalのProps型定義
 */
interface UncertaintyImportModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportFormat = 'CSV' | 'JSON' | 'XML';

/**
 * 不確かさ基準インポートモーダルコンポーネント
 */
export default function UncertaintyImportModal({
  open,
  onClose,
}: UncertaintyImportModalProps) {
  const { t } = useLanguage();
  const [importFormat, setImportFormat] = useState<ImportFormat>('CSV');
  const [targetScope, setTargetScope] = useState<string>('rd-measurement');

  const handleImport = () => {
    message.success(t('uncertaintyImport.startDemo'));
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={520}
      title={t('uncertaintyImport.title')}
      footer={
        <Space>
          <Button onClick={onClose}>{t('uncertaintyImport.btnCancel')}</Button>
          <Button type="primary" onClick={handleImport}>
            {t('uncertaintyImport.btnExecute')}
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Text style={{ fontSize: 13, color: '#555' }}>
          {t('uncertaintyImport.description')}
        </Text>

        {/* インポート形式 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            {t('uncertaintyImport.formatLabel')}
          </div>
          <Space>
            {(['CSV', 'JSON', 'XML'] as ImportFormat[]).map((fmt) => (
              <Button
                key={fmt}
                size="small"
                type={importFormat === fmt ? 'primary' : 'default'}
                onClick={() => setImportFormat(fmt)}
              >
                {fmt}
              </Button>
            ))}
          </Space>
        </div>

        {/* ドロップエリア */}
        <Dragger
          beforeUpload={() => false}
          showUploadList={false}
          style={{ background: '#fafafa' }}
        >
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
            {t('uncertaintyImport.dropText')}
          </p>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            {t('uncertaintyImport.dropHint')}
          </p>
        </Dragger>

        <Alert
          type="warning"
          showIcon
          message={t('uncertaintyImport.alertTitle')}
          description={t('uncertaintyImport.alertDesc')}
        />

        {/* 取り込み先スコープ */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 6 }}>
            {t('uncertaintyImport.scopeLabel')}
          </div>
          <Select
            style={{ width: '100%' }}
            value={targetScope}
            onChange={setTargetScope}
            options={[
              { value: 'rd-measurement', label: t('uncertaintyImport.scopeOptionMeasurement') },
              { value: 'rd-material', label: t('uncertaintyImport.scopeOptionMaterial') },
              { value: 'company', label: t('uncertaintyImport.scopeOptionCompany') },
              { value: 'personal', label: t('uncertaintyImport.scopeOptionPersonal') },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
