'use client';

import React, { useState } from 'react';
import { App, Modal, Button, Space, Upload, Alert, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import { importUncertaintyCriteria } from '@/services/uncertaintyCriteriaApiService';

const { Dragger } = Upload;
const { Text } = Typography;

/**
 * UncertaintyImportModalのProps型定義
 */
interface UncertaintyImportModalProps {
  open: boolean;
  onClose: () => void;
  /** インポート成功後に呼び出されるコールバック（一覧再取得用） */
  onImported?: () => void;
  /**
   * 画面で選択中のスコープキー（organization_group_cd または userId）。
   * 指定時: このスコープに対してインポートする（ファイル内 nameSpaceId を上書き）。
   * 省略時: ファイル内の nameSpaceId をそのまま使用する。
   */
  scopeKey?: string | null;
}

type ImportFormat = 'CSV' | 'JSON';

/**
 * 不確かさ基準インポートモーダルコンポーネント
 */
export default function UncertaintyImportModal({
  open,
  onClose,
  onImported,
  scopeKey,
}: UncertaintyImportModalProps) {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [importFormat, setImportFormat] = useState<ImportFormat>('CSV');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (fileList.length === 0 || !fileList[0].originFileObj) {
      message.warning(t('uncertaintyImport.noFileSelected'));
      return;
    }

    setLoading(true);
    try {
      const file = fileList[0].originFileObj;
      const result = await importUncertaintyCriteria(file, importFormat, scopeKey);
      message.success(
        t('uncertaintyImport.importSuccess', {
          inserted: String(result.insertedCount),
        })
      );
      setFileList([]);
      onClose();
      onImported?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? '';
      message.error(`${t('uncertaintyImport.importError')}${msg ? `: ${msg}` : ''}`);
    } finally {
      setLoading(false);
    }
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
          <Button type="primary" onClick={handleImport} loading={loading}>
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
            {(['CSV', 'JSON'] as ImportFormat[]).map((fmt) => (
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
          fileList={fileList}
          onChange={({ fileList: newFileList }) => {
            setFileList(newFileList.slice(-1));
            // ファイルが追加されたとき拡張子から自動判定
            const latestFile = newFileList[newFileList.length - 1];
            if (latestFile?.name) {
              const ext = latestFile.name.split('.').pop()?.toLowerCase();
              if (ext === 'csv')       setImportFormat('CSV');
              else if (ext === 'json') setImportFormat('JSON');
            }
          }}
          onRemove={() => setFileList([])}
          showUploadList={{ showRemoveIcon: true }}
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
      </div>
    </Modal>
  );
}
