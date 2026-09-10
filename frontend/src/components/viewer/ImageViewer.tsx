// frontend/src/components/viewer/ImageViewer.tsx
// 画像ファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Flex, Image as AntImage } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  FileImageOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { getFileViewUrl } from '@/services/fileAccessService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

interface ImageViewerProps {
  fileKey: string;
  fileName: string;
}

/**
 * ImageViewer コンポーネント
 * 画像ファイルの表示・拡大縮小機能
 */
const ImageViewer: React.FC<ImageViewerProps> = ({ fileKey, fileName }) => {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });

  useEffect(() => {
    if (!fileKey) return;

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setImageUrl(null);

      try {
        console.log('🔍 [ImageViewer] Fetching signed URL:', fileKey);
        const url = await getFileViewUrl(fileKey);
        if (!isMounted) return;

        // 画像読み込み確認
        const img = new Image();
        img.onload = () => {
          if (!isMounted) return;
          console.log('✅ [ImageViewer] Image loaded:', img.width, 'x', img.height);
          setImageUrl(url);
          setImageDimensions({ width: img.width, height: img.height });
          setLoading(false);
        };
        img.onerror = (e) => {
          if (!isMounted) return;
          console.error('❌ [ImageViewer] Image load error:', e);
          setError(t('viewer.imageViewer.loadError'));
          setLoading(false);
        };
        img.src = url;
      } catch (err) {
        if (!isMounted) return;
        console.error('❌ [ImageViewer] URL fetch error:', err);
        const errorMsg = err instanceof Error ? err.message : t('viewer.error');
        setError(t('viewer.imageViewer.fetchUrlError', { message: errorMsg }));
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fileKey, reloadTrigger]);

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

  /** 再読み込み */
  const handleReload = useCallback((): void => {
    setReloadTrigger(prev => prev + 1);
  }, []);

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
              {fileName || t('viewer.imageViewer.defaultFileName')}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={loading || !!error}
            >
              {t('viewer.imageViewer.zoomIn')}
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={loading || !!error}
            >
              {t('viewer.imageViewer.zoomOut')}
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading || !!error}
            >
              {t('viewer.imageViewer.reset')}
            </Button>
            {error && (
              <Button 
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleReload}
              >
                {t('viewer.imageViewer.reload')}
              </Button>
            )}
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
        {/* ローディング */}
        {loading && (
          <Space orientation="vertical" size="large" align="center">
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              size="large"
            />
            <Text type="secondary">{t('viewer.imageViewer.loading')}</Text>
          </Space>
        )}

        {/* エラー */}
        {error && (
          <Alert
            message={t('viewer.imageViewer.errorTitle')}
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleReload}>
                {t('viewer.imageViewer.retry')}
              </Button>
            }
          />
        )}

        {/* 画像表示 */}
        {imageUrl && !loading && !error && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400
            }}>
              <AntImage
                src={imageUrl}
                alt={fileName || t('viewer.imageViewer.defaultFileName')}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                preview={{
                  mask: t('viewer.imageViewer.preview')
                }}
              />
            </div>

            {/* 画像情報 */}
            <Card size="small" style={{ textAlign: 'center' }}>
              <Space orientation="vertical" size="small">
                {imageDimensions.width > 0 && (
                  <Text type="secondary">
                    {t('viewer.imageViewer.size', { width: String(imageDimensions.width), height: String(imageDimensions.height) })}
                  </Text>
                )}
                <Text type="secondary">
                  {t('viewer.imageViewer.zoom', { scale: scale.toFixed(2) })}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('viewer.imageViewer.fileKey', { key: fileKey })}
                </Text>
              </Space>
            </Card>
          </Space>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
