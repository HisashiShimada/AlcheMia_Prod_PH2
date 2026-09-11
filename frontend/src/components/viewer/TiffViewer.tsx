// frontend/src/components/viewer/TiffViewer.tsx
// TIFFファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, Alert, Flex } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  DownloadOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import { getFileViewUrl } from '@/services/fileAccessService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

interface TiffViewerProps {
  fileKey: string;
  fileName: string;
}

/**
 * TiffViewer コンポーネント
 * TIFFファイルの表示（ブラウザ制限によりダウンロード推奨）
 */
const TiffViewer: React.FC<TiffViewerProps> = ({ fileKey, fileName }) => {
  const { t } = useLanguage();
  const [scale, setScale] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileKey) return;

    let isMounted = true;

    const fetchUrl = async () => {
      try {
        console.log('🔍 [TiffViewer] Fetching signed URL:', fileKey);
        const url = await getFileViewUrl(fileKey);
        if (isMounted) {
          setSignedUrl(url);
          setUrlError(null);
          console.log('✅ [TiffViewer] URL fetched successfully');
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ [TiffViewer] URL fetch error:', err);
          const errorMsg = err instanceof Error ? err.message : t('viewer.error');
          setUrlError(t('viewer.tiffViewer.fetchUrlError', { message: errorMsg }));
        }
      }
    };

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [fileKey]);

  /** 拡大 */
  const handleZoomIn = useCallback((): void => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  }, []);

  /** 縮小 */
  const handleZoomOut = useCallback((): void => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.1));
  }, []);

  /** リセット */
  const handleReset = useCallback((): void => {
    setScale(1);
  }, []);

  /**
   * ダウンロード（署名付きURLを使用）
   */
  const handleDownload = useCallback((): void => {
    if (!signedUrl) {
      console.warn('[TiffViewer] Download URL not yet available');
      return;
    }
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = fileName;
    link.click();
    console.log('✅ [TiffViewer] TIFF download started:', fileName);
  }, [signedUrl, fileName]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Card 
        size="small"
        style={{ borderRadius: 0 }}
      >
        <Flex justify="space-between" align="center">
          <Space>
            <FileImageOutlined style={{ fontSize: 20, color: '#CF0027' }} />
            <Title level={5} style={{ margin: 0 }}>
              {fileName || t('viewer.tiffViewer.defaultFileName')}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
            >
              {t('viewer.imageViewer.zoomIn')}
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
            >
              {t('viewer.imageViewer.zoomOut')}
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              {t('viewer.imageViewer.reset')}
            </Button>
            <Button 
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={!signedUrl}
            >
              {t('viewer.tiffViewer.download')}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* コンテンツエリア */}
      <div style={{ 
        flex: 1, 
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: '#f5f5f5'
      }}>
        <Space orientation="vertical" size="large" style={{ textAlign: 'center' }}>
          {urlError && (
            <Alert
              message={t('viewer.tiffViewer.urlErrorTitle')}
              description={urlError}
              type="error"
              showIcon
            />
          )}

          <Alert
            message={t('viewer.tiffViewer.selectedTitle')}
            description={
              <Space orientation="vertical" size="small">
                <Text>{fileName}</Text>
                <Text type="secondary">
                  {t('viewer.tiffViewer.browserLimitNote')}
                </Text>
                <Text type="secondary">
                  {t('viewer.tiffViewer.downloadRecommend')}
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />

          <Button 
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!signedUrl}
          >
            {t('viewer.tiffViewer.downloadButton')}
          </Button>

          <Card size="small" style={{ marginTop: 16 }}>
            <Space orientation="vertical" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('viewer.imageViewer.fileKey', { key: fileKey })}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('viewer.imageViewer.zoom', { scale: scale.toFixed(2) })}
              </Text>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default TiffViewer;
