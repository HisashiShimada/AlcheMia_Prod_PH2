'use client';

import React, { useState } from 'react';
import { Card, Button, App, Typography, theme } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { createApiClient } from '@/utils/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const InformationDownload: React.FC = () => {
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const client = createApiClient();
      const response = await client.get(
        '/provider/organization/download-information-csv',
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/csv' });
      const contentDisposition =
        response.headers['content-disposition'] ||
        response.headers['Content-Disposition'];
      let filename = 'information.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else {
        const now = new Date();
        const ts = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
          String(now.getHours()).padStart(2, '0'),
          String(now.getMinutes()).padStart(2, '0'),
          String(now.getSeconds()).padStart(2, '0'),
        ].join('');
        filename = `information_${ts}.csv`;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      messageApi.success(t('informationDownload.messages.downloadSuccess', { filename: filename }));
    } catch (error) {
      console.error('CSV download error:', error);
      messageApi.error(extractErrorMessage(error, t('informationDownload.messages.downloadError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 0, minHeight: 'calc(100vh - 112px)' }}>
      <Card
        variant="borderless"
        style={{ borderRadius: 0, marginBottom: 0, boxShadow: 'none' }}
        styles={{
          body: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${token.paddingMD}px ${token.paddingLG}px`,
            background: token.colorBgContainer,
            borderBottom: `2px solid ${token.colorBorder}`,
            marginBottom: 0,
          },
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('informationDownload.title')}
        </Typography.Title>
        <Button
          type="default"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={loading}
          style={{ borderRadius: token.borderRadius }}
        >
          {t('informationDownload.csvDownload')}
        </Button>
      </Card>
    </div>
  );
};

export default InformationDownload;
