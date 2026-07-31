'use client';

import React, { useState } from 'react';
import { Modal, Button, Space, Checkbox, Typography, Alert, message } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * UncertaintyExportModalのProps型定義
 */
interface UncertaintyExportModalProps {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
}

type ExportFormat = 'XML' | 'JSON';

/**
 * 不確かさ基準エクスポートモーダルコンポーネント
 */
export default function UncertaintyExportModal({
  open,
  selectedCount,
  onClose,
}: UncertaintyExportModalProps) {
  const { t } = useLanguage();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('XML');
  const [includeDesc, setIncludeDesc] = useState(true);
  const [includeExtends, setIncludeExtends] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);

  const handleExport = () => {
    message.success(t('uncertaintyExport.startDemo'));
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={460}
      title="不確かさ基準のエクスポート"
      footer={
        <Space>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="primary" onClick={handleExport}>
            ダウンロード
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Alert
          type="info"
          showIcon={false}
          message={
            <Text>
              <Text strong>{selectedCount}</Text> 件の不確かさ基準をエクスポートします。
            </Text>
          }
          style={{ background: '#e6f0ff', borderColor: '#91caff', color: '#2c5282' }}
        />

        {/* エクスポート形式 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            エクスポート形式
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
            オプション
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Checkbox
              checked={includeDesc}
              onChange={(e) => setIncludeDesc(e.target.checked)}
            >
              説明文を含める
            </Checkbox>
            <Checkbox
              checked={includeExtends}
              onChange={(e) => setIncludeExtends(e.target.checked)}
            >
              継承元不確かさ基準参照を含める
            </Checkbox>
            <Checkbox
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
            >
              バージョン履歴を含める
            </Checkbox>
          </div>
        </div>
      </div>
    </Modal>
  );
}
